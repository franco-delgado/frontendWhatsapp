import React, { useState } from 'react';
import './bandejaEntrada.css'; // Comparte los estilos o añade los tuyos

export const ContestarMensaje = ({ mensajeSeleccionado, alCerrar, alEnviarExitoso }) => {
  const [textoRespuesta, setTextoRespuesta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (!textoRespuesta.trim()) return;

    setEnviando(true);
    setError(null);

    try {
      // Ajusta la URL del endpoint según la ruta de tu backend
      const response = await fetch('http://localhost:3000/api/mensajes/responder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: mensajeSeleccionado.from,              // Número del destinatario
          messageText: textoRespuesta,               // Contenido del mensaje libre
          contextMessageId: mensajeSeleccionado.wamid || mensajeSeleccionado.id // ID para citar/responder
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
    <div className="reply-container">
      <div className="reply-header">
        <h4>
          Reponder a: <strong>{mensajeSeleccionado.nombre || mensajeSeleccionado.from}</strong>
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
          value={textoRespuesta}
          onChange={(e) => setTextoRespuesta(e.target.value)}
          placeholder="Escribe tu respuesta libre..."
          rows="3"
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
  );
};