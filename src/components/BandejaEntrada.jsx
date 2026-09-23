import React, { useState, useEffect, useRef } from 'react';
import "./bandejaEntrada.css";
import { ContestarMensaje } from './contestarMensaje';
import { BotonNotificaciones } from './BotonNotificaciones';

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

  // Referencias para evitar problemas de scopes dentro del setInterval
  const prevMensajesCountRef = useRef(0);
  const sonidoActivoRef = useRef(sonidoActivo);
  const mensajeSeleccionadoRef = useRef(mensajeSeleccionado);
  const contenedorMensajesRef = useRef(null);

  // Sincronizamos referencias en cada cambio
  useEffect(() => {
    sonidoActivoRef.current = sonidoActivo;
    localStorage.setItem("notificacion_sonora_activa", JSON.stringify(sonidoActivo));
  }, [sonidoActivo]);

  useEffect(() => {
    mensajeSeleccionadoRef.current = mensajeSeleccionado;
  }, [mensajeSeleccionado]);

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

  // Función para obtener los mensajes guardados en el backend y normalizarlos
  const obtenerMensajes = async () => {
    try {
      const response = await fetch(`${URL_BACKEND}/api/mensajes`);

      // Validación estricta para respuestas de error (como HTTP 500)
      if (!response.ok) {
        throw new Error(`Servidor respondió con código ${response.status}`);
      }

      const data = await response.json();

      let nuevosMensajes = [];
      if (Array.isArray(data)) {
        nuevosMensajes = data;
      } else if (data.success && Array.isArray(data.data)) {
        nuevosMensajes = data.data;
      } else if (data.mensajes && Array.isArray(data.mensajes)) {
        nuevosMensajes = data.mensajes;
      }

      // Normalización de datos
      const mensajesMapeados = nuevosMensajes.map((m) => {
        let tipoCalculado = 'text';
        const mime = m.tipo_mime || m.mime_type || '';
        if (mime.includes('image')) {
          tipoCalculado = 'image';
        } else if (mime.includes('audio')) {
          tipoCalculado = 'audio';
        }

        return {
          _id: m.id || m._id,
          id: m.id || m._id,
          // ANTES esto era el string completo del remitente
          // ("Franco (549...)" o "Soporte (549...)"), así que cada número
          // aparecía como DOS conversaciones distintas: una para lo que
          // te escribían y otra para lo que respondía Soporte/la IA.
          // Agrupamos por el número limpio, que es igual para ambos lados.
          from:
            m.numero ||
            String(m.remitente || m.sender || m.from || '').replace(/\D/g, '') ||
            'Desconocido',
          // true = lo mandó el cliente, false = lo mandó Soporte (manual o IA).
          entrante:
            m.entrante !== undefined
              ? m.entrante
              : !String(m.remitente || m.sender || '').startsWith('Soporte ('),
          text: m.text || m.cuerpo || m.body || '',
          timestamp: m.timestamp || m.created_at,
          mediaUrl: m.mediaUrl || m.URL_de_medios || m.media_url || '',
          type: m.type || tipoCalculado,
          nombre: m.nombre || m.remitente || m.from || m.sender
        };
      });

      // Lógica de notificación por sonido
      if (
        sonidoActivoRef.current &&
        mensajesMapeados.length > prevMensajesCountRef.current &&
        prevMensajesCountRef.current !== 0
      ) {
        reproducirSonidoNotificacion();
      }

      prevMensajesCountRef.current = mensajesMapeados.length;

      // Evita re-renders innecesarios
      setMensajes((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(mensajesMapeados)) {
          return prev;
        }
        return mensajesMapeados;
      });
    } catch (error) {
      console.error('[Error al consultar API mensajes]:', error.message);
    } finally {
      setCargando(false);
    }
  };

  // Eliminar un solo mensaje por ID
  const eliminarMensajeIndividual = async (e, idMensaje) => {
    e.stopPropagation();

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

  // Al tocar una notificación push: abre directo la conversación.
  // - App cerrada: el service worker abre "/?chat=NUMERO".
  // - App ya abierta: el service worker manda un postMessage.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chat = params.get('chat');
    if (chat) {
      setContactoActivo(chat.replace(/\D/g, ''));
      window.history.replaceState({}, '', window.location.pathname);
    }

    const alMensaje = (event) => {
      if (event.data?.type === 'abrir-chat' && event.data.numero) {
        setContactoActivo(String(event.data.numero).replace(/\D/g, ''));
      }
    };
    navigator.serviceWorker?.addEventListener('message', alMensaje);
    return () => navigator.serviceWorker?.removeEventListener('message', alMensaje);
  }, []);

  // Polling único y estable
  useEffect(() => {
    obtenerMensajes();

    const interval = setInterval(() => {
      // Solo consulta si el modal de respuesta no está abierto
      if (!mensajeSeleccionadoRef.current) {
        obtenerMensajes();
      }
    }, 8000);

    return () => clearInterval(interval);
  }, []); // Array de dependencias vacío para no reiniciar el timer en re-renders

  // Scroll automático dentro del historial
  useEffect(() => {
    if (contactoActivo && contenedorMensajesRef.current) {
      contenedorMensajesRef.current.scrollTop = contenedorMensajesRef.current.scrollHeight;
    }
  }, [contactoActivo, mensajes]);

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

  const obtenerPreviaMensaje = (msg) => {
    if (msg.type === 'image') return '📷 Imagen';
    if (msg.type === 'audio') return '🎵 Audio';
    return msg.text || '';
  };

  const contactos = obtenerContactos();

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
      <div className="inbox-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h2>📩 Bandeja de Entrada Meta API</h2>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Aviso push con la app cerrada (sonido del sistema) */}
          <BotonNotificaciones />


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
            ref={contenedorMensajesRef}
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
                  style={{
                    cursor: 'pointer',
                    position: 'relative',
                    maxWidth: '75%',
                    alignSelf: msg.entrante ? 'flex-start' : 'flex-end',
                    backgroundColor: msg.entrante ? '#ffffff' : '#dcf8c6',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '8px 10px'
                  }}
                >
                  <div className="message-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <small style={{ fontWeight: 'bold', color: msg.entrante ? '#555' : '#2e7d32' }}>
                      {msg.entrante ? `👤 ${msg.nombre || 'Cliente'}` : '🎧 Soporte'}
                    </small>
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