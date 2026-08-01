import React, { useState, useEffect, useRef } from 'react';
import "./bandejaEntrada.css";
import { ContestarMensaje } from './contestarMensaje';

export const BandejaEntrada = () => {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState(null);

  // Estado para activar/desactivar la notificación sonora (persiste en localStorage)
  const [sonidoActivo, setSonidoActivo] = useState(() => {
    const guardado = localStorage.getItem("notificacion_sonora_activa");
    return guardado !== null ? JSON.parse(guardado) : true;
  });

  // Referencia para guardar la cantidad de mensajes de la consulta anterior
  const prevMensajesCountRef = useRef(0);

  // Guardar preferencia de sonido en localStorage al cambiar
  useEffect(() => {
    localStorage.setItem("notificacion_sonora_activa", JSON.stringify(sonidoActivo));
  }, [sonidoActivo]);

  // Función para reproducir el tono de notificación
  const reproducirSonidoNotificacion = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      
      // Primer tono
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.1, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.2);

      // Segundo tono
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.error("No se pudo reproducir el sonido:", e);
    }
  };

  // Función auxiliar para obtener el nombre agendado
  const obtenerNombreAgendado = (msg) => {
    try {
      const contactosGuardados = JSON.parse(localStorage.getItem("contactos_whatsapp")) || [];
      const numeroLimpio = String(msg.from || "").replace(/\D/g, "");

      if (!numeroLimpio) return msg.nombre;

      const contactoEncontrado = contactosGuardados.find((c) => {
        const telContacto = String(c.numero).replace(/\D/g, "");
        return numeroLimpio.endsWith(telContacto) || telContacto.endsWith(numeroLimpio);
      });

      return contactoEncontrado ? contactoEncontrado.nombre : msg.nombre;
    } catch (error) {
      console.error("Error al leer contactos de localStorage:", error);
      return msg.nombre;
    }
  };

  // Función para obtener los mensajes del backend
  const obtenerMensajes = async () => {
    try {
      const response = await fetch('https://backend-whatsapp-docker.onrender.com');
      const data = await response.json();
      if (data.success) {
        const nuevosMensajes = data.data;

        // Reproduce sonido SOLO si el sonido está activado y hay nuevos mensajes
        if (
          sonidoActivo &&
          nuevosMensajes.length > prevMensajesCountRef.current &&
          prevMensajesCountRef.current !== 0
        ) {
          reproducirSonidoNotificacion();
        }

        prevMensajesCountRef.current = nuevosMensajes.length;
        setMensajes(nuevosMensajes);
      }
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
    } finally {
      setCargando(false);
    }
  };

  // Limpiar historial
  const limpiarMensajes = async () => {
    try {
      const response = await fetch('https://backend-whatsapp-docker.onrender.com', {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setMensajes([]);
        setMensajeSeleccionado(null);
        prevMensajesCountRef.current = 0;
      }
    } catch (error) {
      console.error('Error al limpiar historial:', error);
    }
  };

  useEffect(() => {
    obtenerMensajes();

    const interval = setInterval(() => {
      obtenerMensajes();
    }, 3000);

    return () => clearInterval(interval);
  }, [sonidoActivo]); // Re-suscribir cuando cambie el estado de sonido

  return (
    <div className="inbox-container">
      <div className="inbox-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>📩 Bandeja de Entrada Meta API</h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Botón de toggle para activar/desactivar sonido */}
          <button
            onClick={() => setSonidoActivo(!sonidoActivo)}
            style={{
              padding: '6px 12px',
              borderRadius: '5px',
              border: '1px solid #ccc',
              cursor: 'pointer',
              backgroundColor: sonidoActivo ? '#28a745' : '#6c757d',
              color: '#fff',
              fontWeight: 'bold',
              transition: 'background-color 0.2s ease'
            }}
          >
            {sonidoActivo ? '🔔 Sonido Activado' : '🔕 Sonido Silenciado'}
          </button>

          <button onClick={limpiarMensajes} className="btn-vaciar">
            Vaciar
          </button>
        </div>
      </div>

      {cargando ? (
        <p>Cargando mensajes...</p>
      ) : mensajes.length === 0 ? (
        <p className="empty-message">No hay mensajes recibidos aún.</p>
      ) : (
        <div className="messages-list">
          {mensajes.map((msg) => {
            const isSelected = mensajeSeleccionado?.id === msg.id;
            const nombreMostrar = obtenerNombreAgendado(msg);

            return (
              <div
                key={msg.id}
                className={`message-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setMensajeSeleccionado(msg)}
                style={{ cursor: 'pointer' }}
              >
                <div className="message-header">
                  <strong>👤 {nombreMostrar} ({msg.from})</strong>
                  <small className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </small>
                </div>
                <div className="message-body">
                  💬 {msg.text}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mensajeSeleccionado && (
        <ContestarMensaje
          mensajeSeleccionado={mensajeSeleccionado}
          alCerrar={() => setMensajeSeleccionado(null)}
          alEnviarExitoso={() => {
            alert('¡Mensaje enviado con éxito!');
            setMensajeSeleccionado(null);
            obtenerMensajes();
          }}
        />
      )}
    </div>
  );
};
