import React, { useState, useEffect, useRef } from 'react';
import "./bandejaEntrada.css";
import { ContestarMensaje } from './contestarMensaje';

export const BandejaEntrada = () => {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState(null);

  // URL del servidor Express conectado a MongoDB
  const URL_BACKEND = 'https://backend-whatsapp-docker.onrender.com';

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

  // Función auxiliar para obtener el nombre agendado desde localStorage
  const obtenerNombreAgendado = (msg) => {
    try {
      const contactosGuardados = JSON.parse(localStorage.getItem("contactos_whatsapp")) || [];
      const numeroLimpio = String(msg.from || "").replace(/\D/g, "");

      if (!numeroLimpio) return msg.nombre || msg.from;

      const contactoEncontrado = contactosGuardados.find((c) => {
        const telContacto = String(c.numero).replace(/\D/g, "");
        return numeroLimpio.endsWith(telContacto) || telContacto.endsWith(numeroLimpio);
      });

      return contactoEncontrado ? contactoEncontrado.nombre : (msg.nombre || msg.from);
    } catch (error) {
      console.error("Error al leer contactos de localStorage:", error);
      return msg.nombre || msg.from;
    }
  };

  // Helper para construir la URL completa hacia la carpeta de archivos multimedia
  const construirUrlMedia = (msg) => {
    const ruta = msg.mediaUrl || msg.text || '';
    if (!ruta) return '';
    if (ruta.startsWith('http://') || ruta.startsWith('https://')) {
      return ruta;
    }
    return `${URL_BACKEND}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
  };

  // Función para obtener los mensajes guardados en MongoDB desde el backend
  const obtenerMensajes = async () => {
    try {
      const response = await fetch(`${URL_BACKEND}/api/mensajes`);
      const data = await response.json();

      let nuevosMensajes = [];
      if (Array.isArray(data)) {
        nuevosMensajes = data;
      } else if (data.success && Array.isArray(data.data)) {
        nuevosMensajes = data.data;
      } else if (data.mensajes && Array.isArray(data.mensajes)) {
        nuevosMensajes = data.mensajes;
      }

      if (
        sonidoActivo &&
        nuevosMensajes.length > prevMensajesCountRef.current &&
        prevMensajesCountRef.current !== 0
      ) {
        reproducirSonidoNotificacion();
      }

      prevMensajesCountRef.current = nuevosMensajes.length;
      setMensajes(nuevosMensajes);
    } catch (error) {
      console.error('Error al obtener mensajes de MongoDB:', error);
    } finally {
      setCargando(false);
    }
  };

  // Eliminar un solo mensaje por ID
const eliminarMensajeIndividual = async (e, idMensaje) => {
  e.stopPropagation(); // Evita que se seleccione el mensaje al hacer clic en borrar

  if (!idMensaje) {
    alert("Error: No se encontró un ID válido para este mensaje.");
    return;
  }

  if (!window.confirm("¿Deseas eliminar este mensaje?")) {
    return;
  }

  try {
    const response = await fetch(`${URL_BACKEND}/api/mensajes/${idMensaje}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Validar si la respuesta no es 200/201 antes de intentar response.json()
    if (!response.ok) {
      const errorTexto = await response.text();
      console.error(`[DELETE Error ${response.status}]:`, errorTexto);
      alert(`No se pudo eliminar el mensaje (Código: ${response.status}). Revisa la consola.`);
      return;
    }

    const data = await response.json();

    if (data.success) {
      setMensajes((prev) => prev.filter((m) => (m._id || m.id) !== idMensaje));
      if (mensajeSeleccionado && (mensajeSeleccionado._id === idMensaje || mensajeSeleccionado.id === idMensaje)) {
        setMensajeSeleccionado(null);
      }
    } else {
      alert(`Error: ${data.error || 'No se pudo eliminar el mensaje'}`);
    }
  } catch (error) {
    console.error('Error de red al eliminar el mensaje:', error);
    alert('Ocurrió un error al intentar eliminar el mensaje.');
  }
};

  // Limpiar todo el historial de la base de datos
  const limpiarMensajes = async () => {
    if (!window.confirm("¿Estás seguro de que deseas borrar todo el historial de mensajes en MongoDB?")) {
      return;
    }

    try {
      const response = await fetch(`${URL_BACKEND}/api/mensajes`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success || response.ok) {
        setMensajes([]);
        setMensajeSeleccionado(null);
        prevMensajesCountRef.current = 0;
      }
    } catch (error) {
      console.error('Error al limpiar historial de la base de datos:', error);
    }
  };

  useEffect(() => {
    obtenerMensajes();

    const interval = setInterval(() => {
      obtenerMensajes();
    }, 3000);

    return () => clearInterval(interval);
  }, [sonidoActivo]);

  return (
    <div className="inbox-container">
      <div className="inbox-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>📩 Bandeja de Entrada Meta API</h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
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
            Vaciar Todo
          </button>
        </div>
      </div>

      {cargando ? (
        <p>Cargando mensajes desde MongoDB...</p>
      ) : mensajes.length === 0 ? (
        <p className="empty-message">No hay mensajes recibidos aún.</p>
      ) : (
        <div className="messages-list">
          {mensajes.map((msg) => {
            const idMensaje = msg._id || msg.id;
            const isSelected = mensajeSeleccionado && (mensajeSeleccionado._id === idMensaje || mensajeSeleccionado.id === idMensaje);
            const nombreMostrar = obtenerNombreAgendado(msg);

            return (
              <div
                key={idMensaje}
                className={`message-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setMensajeSeleccionado(msg)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <div className="message-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <strong>👤 {nombreMostrar} ({msg.from})</strong>
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <small className="message-time">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                    </small>
                    
                    {/* Botón para borrar un mensaje individual */}
                    <button
                      onClick={(e) => eliminarMensajeIndividual(e, idMensaje)}
                      title="Eliminar mensaje"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#dc3545',
                        padding: '2px 5px'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* DESPLIEGUE DINÁMICO SEGÚN TIPO DE MENSAJE */}
                <div className="message-body" style={{ marginTop: '8px' }}>
                  {msg.type === 'image' ? (
                    <div className="media-preview" onClick={(e) => e.stopPropagation()}>
                      <img 
                        src={construirUrlMedia(msg)} 
                        alt="Imagen de WhatsApp" 
                        style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', border: '1px solid #ddd' }}
                      />
                    </div>
                  ) : msg.type === 'audio' ? (
                    <div className="media-preview" onClick={(e) => e.stopPropagation()}>
                      <audio controls style={{ width: '100%', maxWidth: '300px' }}>
                        <source src={construirUrlMedia(msg)} type="audio/ogg" />
                        Tu navegador no soporta el reproductor de audio.
                      </audio>
                    </div>
                  ) : (
                    <span>💬 {msg.text}</span>
                  )}
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