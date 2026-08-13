import React, { useState, useEffect, useRef } from 'react';
import "./bandejaEntrada.css";
import { ContestarMensaje } from './contestarMensaje';

export const BandejaEntrada = () => {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Número (from) del contacto cuya conversación está abierta. null = se ve la lista de contactos.
  const [contactoActivo, setContactoActivo] = useState(null);

  // Mensaje concreto seleccionado dentro de la conversación (para responder)
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

  // Referencia al final de la conversación, para hacer scroll automático
  const finConversacionRef = useRef(null);

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

  // Eliminar toda la conversación con un contacto puntual
  const eliminarConversacion = async (from) => {
    if (!window.confirm("¿Deseas eliminar toda la conversación con este contacto?")) {
      return;
    }

    const idsAEliminar = mensajes
      .filter((m) => m.from === from)
      .map((m) => m._id || m.id)
      .filter(Boolean);

    try {
      await Promise.all(
        idsAEliminar.map((id) =>
          fetch(`${URL_BACKEND}/api/mensajes/${id}`, { method: 'DELETE' })
        )
      );
      setMensajes((prev) => prev.filter((m) => m.from !== from));
      setContactoActivo(null);
    } catch (error) {
      console.error('Error al eliminar la conversación:', error);
      alert('Ocurrió un error al intentar eliminar la conversación.');
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
        setContactoActivo(null);
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

  // Hace scroll hasta el final cada vez que cambian los mensajes de la conversación abierta
  useEffect(() => {
    if (contactoActivo && finConversacionRef.current) {
      finConversacionRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [contactoActivo, mensajes]);

  // ---------------------------------------------------------------------
  // Agrupa todos los mensajes por número de contacto (from), quedándose
  // con el último mensaje de cada uno para mostrar en la lista, ordenados
  // del más reciente al más antiguo.
  // ---------------------------------------------------------------------
  const obtenerContactos = () => {
    const mapa = new Map();

    mensajes.forEach((msg) => {
      const from = msg.from;
      if (!from) return;

      const existente = mapa.get(from);
      const timestampActual = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;

      if (!existente) {
        mapa.set(from, { from, ultimoMensaje: msg, cantidad: 1, timestampActual });
      } else {
        existente.cantidad += 1;
        const timestampExistente = existente.ultimoMensaje.timestamp
          ? new Date(existente.ultimoMensaje.timestamp).getTime()
          : 0;
        if (timestampActual >= timestampExistente) {
          existente.ultimoMensaje = msg;
        }
      }
    });

    return Array.from(mapa.values()).sort((a, b) => {
      const ta = a.ultimoMensaje.timestamp ? new Date(a.ultimoMensaje.timestamp).getTime() : 0;
      const tb = b.ultimoMensaje.timestamp ? new Date(b.ultimoMensaje.timestamp).getTime() : 0;
      return tb - ta;
    });
  };

  // Texto corto para la vista previa del último mensaje en la lista de contactos
  const obtenerPreviaMensaje = (msg) => {
    if (msg.type === 'image') return '📷 Imagen';
    if (msg.type === 'audio') return '🎵 Audio';
    return msg.text || '';
  };

  const contactos = obtenerContactos();

  // Mensajes de la conversación abierta, ordenados del más antiguo al más nuevo
  const mensajesConversacion = contactoActivo
    ? mensajes
        .filter((m) => m.from === contactoActivo)
        .sort((a, b) => {
          const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return ta - tb;
        })
    : [];

  const nombreContactoActivo = contactoActivo
    ? obtenerNombreAgendado(mensajesConversacion[mensajesConversacion.length - 1] || { from: contactoActivo })
    : '';

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
      ) : contactos.length === 0 ? (
        <p className="empty-message">No hay mensajes recibidos aún.</p>
      ) : contactoActivo === null ? (
        // ------------------------- LISTA DE CONTACTOS -------------------------
        <div className="contacts-list">
          {contactos.map((c) => {
            const nombreMostrar = obtenerNombreAgendado(c.ultimoMensaje);
            return (
              <div
                key={c.from}
                className="contact-card"
                onClick={() => setContactoActivo(c.from)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  borderBottom: '1px solid #eee'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                  <strong>👤 {nombreMostrar} ({c.from})</strong>
                  <span
                    style={{
                      color: '#666',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '320px'
                    }}
                  >
                    {obtenerPreviaMensaje(c.ultimoMensaje)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {c.cantidad > 1 && (
                    <span
                      style={{
                        background: '#25d366',
                        color: '#fff',
                        borderRadius: '999px',
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      {c.cantidad}
                    </span>
                  )}
                  <small className="message-time">
                    {c.ultimoMensaje.timestamp ? new Date(c.ultimoMensaje.timestamp).toLocaleTimeString() : ''}
                  </small>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ------------------------- CONVERSACIÓN ABIERTA -------------------------
        <div className="conversation-view">
          <div
            className="conversation-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 0',
              borderBottom: '1px solid #ddd',
              marginBottom: '10px'
            }}
          >
            <button
              onClick={() => setContactoActivo(null)}
              title="Volver a la lista de contactos"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px'
              }}
            >
              ←
            </button>
            <strong style={{ flex: 1 }}>👤 {nombreContactoActivo} ({contactoActivo})</strong>
            <button
              onClick={() => eliminarConversacion(contactoActivo)}
              title="Eliminar toda la conversación"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#dc3545'
              }}
            >
              🗑️ Eliminar conversación
            </button>
          </div>

          <div
            className="conversation-messages"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '55vh',
              overflowY: 'auto',
              padding: '4px'
            }}
          >
            {mensajesConversacion.map((msg) => {
              const idMensaje = msg._id || msg.id;
              const isSelected = mensajeSeleccionado && (mensajeSeleccionado._id === idMensaje || mensajeSeleccionado.id === idMensaje);

              return (
                <div
                  key={idMensaje}
                  className={`message-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setMensajeSeleccionado(msg)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <div className="message-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <small className="message-time">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                    </small>

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
            <div ref={finConversacionRef} />
          </div>
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
