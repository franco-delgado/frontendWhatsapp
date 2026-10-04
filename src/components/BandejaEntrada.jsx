import React, { useState, useEffect, useRef, useMemo } from 'react';
import "./bandejaEntrada.css";
import { ContestarMensaje } from './contestarMensaje';
import { BotonNotificaciones } from './BotonNotificaciones';
import { apiFetch, API_URL } from '../api';
import { claveContactos } from '../contactosStorage';

// ---------- Helpers de formato (solo presentación) ----------
const COLORES_AVATAR = ['#5c6bc0', '#26a69a', '#ef6c00', '#8e24aa', '#00897b', '#d81b60', '#3949ab', '#6d4c41'];

const colorAvatar = (texto) => {
  let h = 0;
  for (const ch of String(texto)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORES_AVATAR[h % COLORES_AVATAR.length];
};

const inicial = (nombre) => {
  const m = String(nombre || '').match(/[A-Za-zÀ-ÿ0-9]/);
  return m ? m[0].toUpperCase() : '#';
};

const fechaValida = (ts) => {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
};

const mismoDia = (a, b) => a.toDateString() === b.toDateString();

const fmtHora = (ts) => {
  const d = fechaValida(ts);
  return d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
};

// Hora si es de hoy, "Ayer", o día/mes.
const fmtLista = (ts) => {
  const d = fechaValida(ts);
  if (!d) return '';
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  if (mismoDia(d, hoy)) return fmtHora(ts);
  if (mismoDia(d, ayer)) return 'Ayer';
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
};

const etiquetaDia = (ts) => {
  const d = fechaValida(ts);
  if (!d) return '';
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  if (mismoDia(d, hoy)) return 'Hoy';
  if (mismoDia(d, ayer)) return 'Ayer';
  return d.toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() !== hoy.getFullYear() ? 'numeric' : undefined,
  });
};

const tiempo = (ts) => (fechaValida(ts) ? fechaValida(ts).getTime() : 0);

// usuarioVistoId: null = mi bandeja · <id> = bandeja de otro usuario · 'todos' = todas (solo admin).
// esAdmin + usuarios: permiten ver de quién es cada conversación y reasignarla.
// alCambiarChatAbierto: avisa a App si hay un chat abierto (en celular oculta el menú).
export const BandejaEntrada = ({
  usuarioVistoId = null,
  soloLectura = false,
  esAdmin = false,
  usuarios = [],
  alCambiarChatAbierto,
}) => {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Número (from) del contacto cuya conversación está abierta. null = ninguna.
  const [contactoActivo, setContactoActivo] = useState(null);

  // Mensaje al que se está respondiendo (se cita al enviar)
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState(null);

  // Buscador de la lista de chats
  const [busqueda, setBusqueda] = useState('');

  // Contactos con el bot de IA pausado (porque contestaste vos a mano).
  // Cada item: { numero: '3827402013', pausado_hasta: '2026-...' }
  const [pausasIA, setPausasIA] = useState([]);

  // URL del servidor Express
  const URL_BACKEND = API_URL;

  // Si el administrador mira la bandeja de otro usuario, se pide con ?userId=
  const qsUsuario = usuarioVistoId ? `?userId=${encodeURIComponent(usuarioVistoId)}` : '';

  // Estado para activar/desactivar la notificación sonora (persiste en localStorage)
  const [sonidoActivo, setSonidoActivo] = useState(() => {
    const guardado = localStorage.getItem("notificacion_sonora_activa");
    return guardado !== null ? JSON.parse(guardado) : true;
  });

  // Referencias para evitar problemas de scopes dentro del setInterval
  const prevMensajesCountRef = useRef(0);
  const sonidoActivoRef = useRef(sonidoActivo);
  const contenedorMensajesRef = useRef(null);
  const pegadoAbajoRef = useRef(true);

  useEffect(() => {
    sonidoActivoRef.current = sonidoActivo;
    localStorage.setItem("notificacion_sonora_activa", JSON.stringify(sonidoActivo));
  }, [sonidoActivo]);

  // ---------- Abrir / cerrar chat (con soporte del botón "atrás" del celular) ----------
  const abrirChat = (from) => {
    if (contactoActivo === null && !window.history.state?.waChat) {
      window.history.pushState({ waChat: true }, '');
    }
    setMensajeSeleccionado(null);
    setContactoActivo(from);
  };

  const cerrarChat = () => {
    if (window.history.state?.waChat) {
      window.history.back(); // dispara popstate, que limpia el chat activo
    } else {
      setContactoActivo(null);
    }
    setMensajeSeleccionado(null);
  };

  useEffect(() => {
    const alVolver = () => {
      setContactoActivo(null);
      setMensajeSeleccionado(null);
    };
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);

  useEffect(() => {
    alCambiarChatAbierto?.(contactoActivo !== null);
    return () => alCambiarChatAbierto?.(false);
  }, [contactoActivo]);

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

  // Nombre del perfil de WhatsApp: el del último mensaje ENTRANTE de ese contacto
  // (los salientes traen "Soporte" como nombre, que no sirve para identificar al cliente).
  // Se calcula una sola vez por cambio de mensajes.
  const perfiles = useMemo(() => {
    const mapa = new Map();
    mensajes.forEach((m) => {
      if (m.entrante && m.nombre && m.nombre !== 'Desconocido') mapa.set(m.from, m.nombre);
    });
    return mapa;
  }, [mensajes]);

  // Agenda guardada en este navegador (se lee una vez por render).
  // Si miro la bandeja de otro usuario, la agenda guardada acá es la mía, no la suya:
  // en ese caso se usa siempre el nombre del perfil.
  let agenda = [];
  if (!usuarioVistoId) {
    try {
      agenda = JSON.parse(localStorage.getItem(claveContactos())) || [];
    } catch (error) {
      console.error("Error al leer contactos de localStorage:", error);
    }
  }

  const obtenerNombreAgendado = (msg) => {
    const perfil = perfiles.get(msg.from) || msg.from;
    if (usuarioVistoId) return perfil;
    const numeroLimpio = String(msg.from || "").replace(/\D/g, "");
    if (!numeroLimpio) return perfil;

    const contactoEncontrado = agenda.find((c) => {
      const telContacto = String(c.numero).replace(/\D/g, "");
      return telContacto && (numeroLimpio.endsWith(telContacto) || telContacto.endsWith(numeroLimpio));
    });
    return contactoEncontrado ? contactoEncontrado.nombre : perfil;
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

  // Tildes estilo WhatsApp para los mensajes que mandó Soporte/bot.
  const tildesEstado = (estado) => {
    switch (estado) {
      case 'sent':
        return <span title="Enviado" style={{ color: '#8696a0' }}>✓</span>;
      case 'delivered':
        return <span title="Entregado" style={{ color: '#8696a0' }}>✓✓</span>;
      case 'read':
        return <span title="Leído" style={{ color: '#34b7f1' }}>✓✓</span>;
      case 'failed':
        return <span title="No se pudo enviar" style={{ color: '#dc3545' }}>⚠️ No enviado</span>;
      default:
        return null; // mensajes viejos, sin estado guardado
    }
  };

  // ---- Estado del bot de IA por contacto ----
  const obtenerPausasIA = async () => {
    try {
      const response = await apiFetch(`/api/ia/pausas${qsUsuario}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPausasIA((prev) =>
          JSON.stringify(prev) === JSON.stringify(data.data) ? prev : data.data
        );
      }
    } catch (error) {
      console.error('[Error al consultar pausas de IA]:', error.message);
    }
  };

  // El backend guarda los últimos 10 dígitos; comparamos igual acá.
  const pausaDeContacto = (numero) => {
    const k = String(numero || '').replace(/\D/g, '').slice(-10);
    if (!k) return null;
    const pausa = pausasIA.find(
      (p) => p.numero === k && new Date(p.pausado_hasta).getTime() > Date.now()
    );
    return pausa ? new Date(pausa.pausado_hasta) : null;
  };

  const reactivarBot = async (numero) => {
    try {
      const k = String(numero || '').replace(/\D/g, '').slice(-10);
      const response = await apiFetch(`/api/ia/pausas/${k}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Código ${response.status}`);
      await obtenerPausasIA();
    } catch (error) {
      console.error('[Error al reactivar el bot]:', error.message);
      alert('No se pudo reactivar el bot. Probá de nuevo.');
    }
  };

  // Función para obtener los mensajes guardados en el backend y normalizarlos
  const obtenerMensajes = async () => {
    obtenerPausasIA(); // se refresca junto con los mensajes
    try {
      const response = await apiFetch(`/api/mensajes${qsUsuario}`);

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
          // Se agrupa por el número limpio, que es igual para lo que escribe el cliente
          // y para lo que responde Soporte/la IA (así es UNA sola conversación).
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
          // sent | delivered | read | failed (solo mensajes salientes)
          estado: m.estado || m.status || null,
          // id de WhatsApp: se usa para citar el mensaje al responder
          wamid: m.wamid || null,
          // dueño de la conversación (solo lo informa el servidor al administrador)
          usuarioId: m.usuario_id || null,
          usuarioNombre: m.usuario || null,
          nombre: m.nombre || m.remitente || m.from || m.sender
        };
      });

      // Sonido: solo con mensajes ENTRANTES nuevos y no al mirar la bandeja de otro.
      const cantidadEntrantes = mensajesMapeados.filter((m) => m.entrante).length;
      if (
        sonidoActivoRef.current &&
        !soloLectura &&
        cantidadEntrantes > prevMensajesCountRef.current &&
        prevMensajesCountRef.current !== 0
      ) {
        reproducirSonidoNotificacion();
      }

      prevMensajesCountRef.current = cantidadEntrantes;

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
      const response = await apiFetch(`/api/mensajes/${idMensaje}`, {
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

    try {
      // Un solo pedido: el servidor borra todos los mensajes de ese contacto.
      const response = await apiFetch(`/api/mensajes/contacto/${encodeURIComponent(from)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`Código ${response.status}`);
      setMensajes((prev) => prev.filter((m) => m.from !== from));
      cerrarChat();
    } catch (error) {
      console.error('Error al eliminar la conversación:', error);
      alert('Ocurrió un error al intentar eliminar la conversación.');
    }
  };

  // Solo admin: pasa la conversación (con su historial) a otro usuario.
  const reasignarContacto = async (numero, userId) => {
    if (!userId) return;
    const destino = usuarios.find((u) => u.id === userId);
    if (
      !window.confirm(
        `¿Pasar esta conversación a ${destino?.username || 'ese usuario'}? Todo su historial pasa con ella.`
      )
    ) {
      return;
    }
    try {
      const response = await apiFetch('/api/admin/contactos/asignar', {
        method: 'POST',
        body: JSON.stringify({ numero, userId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || `Código ${response.status}`);
      cerrarChat();
      await obtenerMensajes();
    } catch (error) {
      console.error('[Error al reasignar]:', error.message);
      alert(`No se pudo reasignar: ${error.message}`);
    }
  };

  // Limpiar todo el historial de la base de datos
  const limpiarMensajes = async () => {
    if (!window.confirm("¿Estás seguro de que deseas borrar TODO tu historial de mensajes?")) {
      return;
    }

    try {
      const response = await apiFetch('/api/mensajes', {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success || response.ok) {
        setMensajes([]);
        setMensajeSeleccionado(null);
        cerrarChat();
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

  // Polling único y estable (el cuadro de respuesta guarda su propio texto,
  // así que actualizar mensajes no borra lo que estás escribiendo).
  useEffect(() => {
    obtenerMensajes();
    const interval = setInterval(obtenerMensajes, 8000);
    return () => clearInterval(interval);
  }, []); // Array de dependencias vacío para no reiniciar el timer en re-renders

  // ---------- Datos derivados ----------
  const contactos = useMemo(() => {
    const mapa = new Map();

    mensajes.forEach((msg) => {
      const from = msg.from;
      if (!from) return;

      const existente = mapa.get(from);
      if (!existente) {
        mapa.set(from, { from, ultimoMensaje: msg, cantidad: 1 });
      } else {
        existente.cantidad += 1;
        if (tiempo(msg.timestamp) >= tiempo(existente.ultimoMensaje.timestamp)) {
          existente.ultimoMensaje = msg;
        }
      }
    });

    return Array.from(mapa.values()).sort(
      (a, b) => tiempo(b.ultimoMensaje.timestamp) - tiempo(a.ultimoMensaje.timestamp)
    );
  }, [mensajes]);

  const obtenerPreviaMensaje = (msg) => {
    if (msg.type === 'image') return '📷 Imagen';
    if (msg.type === 'audio') return '🎵 Audio';
    return msg.text || '';
  };

  const mensajesConversacion = useMemo(
    () =>
      contactoActivo
        ? mensajes
            .filter((m) => m.from === contactoActivo)
            .sort((a, b) => tiempo(a.timestamp) - tiempo(b.timestamp))
        : [],
    [mensajes, contactoActivo]
  );

  // Búsqueda por nombre o número
  const consulta = busqueda.trim().toLowerCase();
  const consultaDigitos = consulta.replace(/\D/g, '');
  const contactosFiltrados = consulta
    ? contactos.filter(
        (c) =>
          obtenerNombreAgendado(c.ultimoMensaje).toLowerCase().includes(consulta) ||
          (consultaDigitos && c.from.includes(consultaDigitos))
      )
    : contactos;

  // Dueño de la conversación abierta (lo informa el servidor solo al administrador).
  const ultimoDeActiva = mensajesConversacion[mensajesConversacion.length - 1];
  const duenioActivoId = ultimoDeActiva?.usuarioId || null;
  const duenioActivoNombre = ultimoDeActiva?.usuarioNombre || null;

  const nombreContactoActivo = contactoActivo
    ? obtenerNombreAgendado(ultimoDeActiva || { from: contactoActivo })
    : '';

  const pausaActiva = contactoActivo ? pausaDeContacto(contactoActivo) : null;

  // ---------- Scroll del historial ----------
  const alHacerScroll = () => {
    const el = contenedorMensajesRef.current;
    if (!el) return;
    pegadoAbajoRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const irAbajoSiCorresponde = () => {
    const el = contenedorMensajesRef.current;
    if (el && pegadoAbajoRef.current) el.scrollTop = el.scrollHeight;
  };

  // Al cambiar de chat siempre se va al último mensaje.
  useEffect(() => {
    pegadoAbajoRef.current = true;
  }, [contactoActivo]);

  // Con mensajes nuevos baja solo si ya estabas leyendo lo último (no te mueve si subiste a leer).
  useEffect(() => {
    irAbajoSiCorresponde();
  }, [contactoActivo, mensajesConversacion]);

  const seleccionarParaResponder = (msg) => {
    if (soloLectura) return;
    setMensajeSeleccionado((prev) =>
      prev && (prev._id || prev.id) === (msg._id || msg.id) ? null : msg
    );
  };

  // ---------- Render ----------
  const renderItemContacto = (c) => {
    const nombreMostrar = obtenerNombreAgendado(c.ultimoMensaje);
    const pausado = pausaDeContacto(c.from);
    return (
      <button
        type="button"
        key={c.from}
        className={`wa-contacto ${contactoActivo === c.from ? 'activo' : ''}`}
        onClick={() => abrirChat(c.from)}
      >
        <span className="wa-avatar" style={{ background: colorAvatar(c.from) }}>
          {inicial(nombreMostrar)}
        </span>

        <span className="wa-contacto-cuerpo">
          <span className="wa-contacto-fila">
            <strong className="wa-contacto-nombre">{nombreMostrar}</strong>
            <span className="wa-contacto-hora">{fmtLista(c.ultimoMensaje.timestamp)}</span>
          </span>
          <span className="wa-contacto-numero">{c.from}</span>
          <span className="wa-contacto-fila">
            <span className="wa-contacto-previa">
              {!c.ultimoMensaje.entrante && <span className="wa-tilde-previa">Tú: </span>}
              {obtenerPreviaMensaje(c.ultimoMensaje)}
            </span>
            {c.cantidad > 1 && <span className="wa-contador">{c.cantidad}</span>}
          </span>
          {(pausado || (esAdmin && usuarioVistoId === 'todos' && c.ultimoMensaje.usuarioNombre)) && (
            <span className="wa-contacto-etiquetas">
              {esAdmin && usuarioVistoId === 'todos' && c.ultimoMensaje.usuarioNombre && (
                <span className="wa-etiqueta wa-etiqueta--azul" title="Usuario dueño de esta conversación">
                  de {c.ultimoMensaje.usuarioNombre}
                </span>
              )}
              {pausado && (
                <span className="wa-etiqueta wa-etiqueta--ambar" title="Contestaste vos: el bot no responde a este contacto por un rato">
                  ⏸️ bot pausado
                </span>
              )}
            </span>
          )}
        </span>
      </button>
    );
  };

  const renderMensajes = () => {
    let diaAnterior = '';
    return mensajesConversacion.map((msg) => {
      const idMensaje = msg._id || msg.id;
      const seleccionado =
        mensajeSeleccionado &&
        (mensajeSeleccionado._id === idMensaje || mensajeSeleccionado.id === idMensaje);

      const dia = etiquetaDia(msg.timestamp);
      const mostrarDia = dia && dia !== diaAnterior;
      diaAnterior = dia || diaAnterior;

      return (
        <React.Fragment key={idMensaje}>
          {mostrarDia && <div className="wa-dia"><span>{dia}</span></div>}

          <div
            className={`wa-msg ${msg.entrante ? 'wa-msg--in' : 'wa-msg--out'} ${seleccionado ? 'seleccionado' : ''} ${soloLectura ? 'solo-lectura' : ''}`}
            onClick={() => seleccionarParaResponder(msg)}
            title={soloLectura ? undefined : 'Tocá para responder a este mensaje'}
          >
            {msg.type === 'image' ? (
              <div className="wa-media" onClick={(e) => e.stopPropagation()}>
                <a href={construirUrlMedia(msg)} target="_blank" rel="noreferrer">
                  <img
                    src={construirUrlMedia(msg)}
                    alt="Imagen de WhatsApp"
                    onLoad={irAbajoSiCorresponde}
                  />
                </a>
              </div>
            ) : msg.type === 'audio' ? (
              <div className="wa-media" onClick={(e) => e.stopPropagation()}>
                <audio controls>
                  <source src={construirUrlMedia(msg)} type="audio/ogg" />
                  Tu navegador no soporta el reproductor de audio.
                </audio>
              </div>
            ) : (
              <span className="wa-msg-texto">{msg.text}</span>
            )}

            <span className="wa-msg-meta">
              {!soloLectura && (
                <button
                  type="button"
                  className="wa-msg-borrar"
                  onClick={(e) => eliminarMensajeIndividual(e, idMensaje)}
                  title="Eliminar mensaje"
                >
                  🗑️
                </button>
              )}
              {fmtHora(msg.timestamp)}
              {!msg.entrante && <span className="wa-msg-tildes">{tildesEstado(msg.estado)}</span>}
            </span>
          </div>
        </React.Fragment>
      );
    });
  };

  return (
    <div className={`wa-inbox ${contactoActivo !== null ? 'wa-inbox--chat' : ''}`}>
      {/* ============ Panel izquierdo: lista de clientes ============ */}
      <aside className="wa-sidebar">
        <div className="wa-sidebar-cabecera">
          <h2>
            Chats <small>{contactos.length}</small>
          </h2>
          {!soloLectura && contactos.length > 0 && (
            <button onClick={limpiarMensajes} className="btn-vaciar" title="Borrar todo el historial">
              Vaciar todo
            </button>
          )}
        </div>

        {!soloLectura && (
          <div className="wa-sidebar-herramientas">
            {/* Aviso push con la app cerrada (sonido del sistema) */}
            <BotonNotificaciones />
          </div>
        )}

        <div className="wa-buscador">
          <input
            type="search"
            placeholder="🔍 Buscar por nombre o número"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="wa-lista">
          {cargando ? (
            <p className="wa-vacio">Cargando conversaciones…</p>
          ) : contactos.length === 0 ? (
            <p className="wa-vacio">No hay mensajes recibidos aún.</p>
          ) : contactosFiltrados.length === 0 ? (
            <p className="wa-vacio">Ningún chat coincide con “{busqueda}”.</p>
          ) : (
            contactosFiltrados.map(renderItemContacto)
          )}
        </div>
      </aside>

      {/* ============ Panel derecho: conversación ============ */}
      <section className="wa-chat">
        {contactoActivo === null ? (
          <div className="wa-chat-vacio">
            <div className="wa-chat-vacio-icono">💬</div>
            <h3>Elegí un cliente</h3>
            <p>Hacé clic en un chat de la izquierda para ver y responder la conversación.</p>
          </div>
        ) : (
          <>
            <div className="wa-chat-cabecera">
              <button className="wa-volver" onClick={cerrarChat} title="Volver a la lista de chats">
                ←
              </button>
              <span className="wa-avatar" style={{ background: colorAvatar(contactoActivo) }}>
                {inicial(nombreContactoActivo)}
              </span>
              <div className="wa-chat-titulo">
                <strong>{nombreContactoActivo}</strong>
                <small>
                  {contactoActivo}
                  {esAdmin && duenioActivoNombre && <> · de {duenioActivoNombre}</>}
                </small>
              </div>

              <div className="wa-chat-acciones">
                {esAdmin && usuarios.length > 1 && (
                  <select
                    value=""
                    onChange={(e) => reasignarContacto(contactoActivo, e.target.value)}
                    title="Pasar esta conversación (con su historial) a otro usuario"
                  >
                    <option value="">↪ Asignar a…</option>
                    {usuarios
                      .filter((u) => u.activo && u.id !== duenioActivoId)
                      .map((u) => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                      ))}
                  </select>
                )}
                {!soloLectura && (
                  <button
                    onClick={() => eliminarConversacion(contactoActivo)}
                    title="Eliminar toda la conversación"
                    className="wa-btn-eliminar"
                  >
                    🗑️ <span>Eliminar conversación</span>
                  </button>
                )}
              </div>
            </div>

            {!soloLectura && pausaActiva && (
              <div className="wa-aviso-bot">
                <span>
                  ⏸️ Bot pausado hasta las {pausaActiva.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => reactivarBot(contactoActivo)}
                  title="Volver a activar las respuestas automáticas para este contacto"
                >
                  Reactivar bot
                </button>
              </div>
            )}

            <div
              ref={contenedorMensajesRef}
              onScroll={alHacerScroll}
              className="wa-mensajes"
            >
              {mensajesConversacion.length === 0 ? (
                <p className="wa-vacio">Esta conversación no tiene mensajes.</p>
              ) : (
                renderMensajes()
              )}
            </div>

            {!soloLectura ? (
              <ContestarMensaje
                key={contactoActivo}
                numero={contactoActivo}
                citado={mensajeSeleccionado}
                previaCitado={mensajeSeleccionado ? obtenerPreviaMensaje(mensajeSeleccionado) : ''}
                alQuitarCita={() => setMensajeSeleccionado(null)}
                alEnviarExitoso={() => {
                  setMensajeSeleccionado(null);
                  pegadoAbajoRef.current = true;
                  obtenerMensajes();
                }}
              />
            ) : (
              <div className="wa-solo-lectura">👁️ Estás mirando esta bandeja en modo solo lectura.</div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
