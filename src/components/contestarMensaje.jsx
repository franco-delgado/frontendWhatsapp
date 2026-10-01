import React, { useState, useEffect, useRef } from 'react';
import './bandejaEntrada.css';
import { apiFetch } from '../api';

export const ContestarMensaje = ({ mensajeSeleccionado, alCerrar, alEnviarExitoso, nombreContacto }) => {
  const [textoRespuesta, setTextoRespuesta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const textareaRef = useRef(null);

  useEffect(() => {
    if (mensajeSeleccionado && textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, [mensajeSeleccionado]);

  useEffect(() => {
    document.body.classList.add('modal-abierto');
    return () => document.body.classList.remove('modal-abierto');
  }, []);


  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (!textoRespuesta.trim()) return;

    setEnviando(true);
    setError(null);

    try {
      const response = await apiFetch('/api/mensajes/responder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: mensajeSeleccionado.from,
          messageText: textoRespuesta,
          // Meta espera el id de WhatsApp (wamid), no el id de la base de datos.
          contextMessageId: mensajeSeleccionado.wamid || null
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTextoRespuesta('');
        if (alEnviarExitoso) alEnviarExitoso();
      } else {
        // El backend devuelve el motivo en "error"; antes solo se leía "message".
        setError(data.error || data.message || 'Error al enviar el mensaje.');
      }
    } catch (err) {
      console.error('Error al enviar la respuesta:', err);
      setError('Error de conexión al enviar.');
    } finally {
      setEnviando(false);
    }
  };

  if (!mensajeSeleccionado) return null;

  return (
    <div className="reply-overlay" onClick={alCerrar}>
      {/* e.stopPropagation() evita que al hacer clic dentro de la caja se cierre la ventana */}
      <div className="reply-container" onClick={(e) => e.stopPropagation()}>
        <div className="reply-header">
          <h4>
            Responder a: <strong>{nombreContacto || mensajeSeleccionado.from}</strong>
          </h4>
          <button type="button" onClick={alCerrar} className="btn-cerrar">
            ✕
          </button>
        </div>

        <div className="reply-original-preview">
          <small>Mensaje original:</small>
          <p>"{mensajeSeleccionado.text}"</p>
        </div>

        <form onSubmit={manejarEnvio} className="reply-form">
          <textarea
            ref={textareaRef}
            value={textoRespuesta}
            onChange={(e) => setTextoRespuesta(e.target.value)}
            placeholder="Escribe tu respuesta libre..."
            rows="4"
            disabled={enviando}
          />

          <small style={{ color: '#b26a00' }}>
            ⏸️ Al enviar, el bot automático deja de responder a este contacto por 1 hora.
          </small>

          {error && <p className="error-text">{error}</p>}

          <div className="reply-actions">
            <button type="button" onClick={alCerrar} className="btn-cancelar" disabled={enviando}>
              Cancelar
            </button>
            <button type="submit" className="btn-enviar" disabled={enviando || !textoRespuesta.trim()}>
              {enviando ? 'Enviando...' : 'Enviar Respuesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};