import React, { useState, useEffect, useRef } from 'react';
import './bandejaEntrada.css';

export const ContestarMensaje = ({ mensajeSeleccionado, alCerrar, alEnviarExitoso }) => {
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
      const response = await fetch('https://backend-whatsapp-docker.onrender.com/api/mensajes/responder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: mensajeSeleccionado.from,
          messageText: textoRespuesta,
          contextMessageId: mensajeSeleccionado.wamid || mensajeSeleccionado.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTextoRespuesta('');
        if (alEnviarExitoso) alEnviarExitoso();
      } else {
        setError(data.message || 'Error al enviar el mensaje.');
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
            Responder a: <strong>{mensajeSeleccionado.nombre || mensajeSeleccionado.from}</strong>
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