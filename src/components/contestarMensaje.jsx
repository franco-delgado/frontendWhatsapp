import React, { useState, useEffect, useRef } from 'react';
import './bandejaEntrada.css';
import { apiFetch } from '../api';

// Cuadro para escribir dentro de la conversación (abajo del chat).
// - numero: contacto al que se le responde.
// - citado: mensaje que se está respondiendo (opcional, se muestra arriba del cuadro).
export const ContestarMensaje = ({ numero, citado, previaCitado, alQuitarCita, alEnviarExitoso }) => {
  const [textoRespuesta, setTextoRespuesta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const textareaRef = useRef(null);

  // En PC se enfoca solo; en celular no, para que no salte el teclado al entrar al chat.
  useEffect(() => {
    if (window.matchMedia?.('(pointer: fine)').matches) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, []);

  // Al elegir un mensaje para responder, el cursor vuelve al cuadro.
  useEffect(() => {
    if (citado) textareaRef.current?.focus({ preventScroll: true });
  }, [citado]);

  const ajustarAltura = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const enviar = async () => {
    const texto = textoRespuesta.trim();
    if (!texto || enviando) return;

    setEnviando(true);
    setError(null);

    try {
      const response = await apiFetch('/api/mensajes/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: numero,
          messageText: texto,
          // Meta espera el id de WhatsApp (wamid), no el id de la base de datos.
          contextMessageId: citado?.wamid || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTextoRespuesta('');
        requestAnimationFrame(ajustarAltura);
        if (alEnviarExitoso) alEnviarExitoso();
      } else {
        setError(data.error || data.message || 'Error al enviar el mensaje.');
      }
    } catch (err) {
      console.error('Error al enviar la respuesta:', err);
      setError('Error de conexión al enviar.');
    } finally {
      setEnviando(false);
    }
  };

  const manejarEnvio = (e) => {
    e.preventDefault();
    enviar();
  };

  // Enter envía en PC (Shift+Enter = salto de línea). En celular Enter hace salto de línea.
  const alTeclear = (e) => {
    const esTactil = window.matchMedia?.('(pointer: coarse)').matches;
    if (e.key === 'Enter' && !e.shiftKey && !esTactil) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <form className="wa-composer" onSubmit={manejarEnvio}>
      {citado && (
        <div className="wa-composer-cita">
          <div className="wa-composer-cita-texto">
            <strong>Respondiendo a:</strong> {previaCitado}
          </div>
          <button type="button" onClick={alQuitarCita} title="Quitar cita" className="wa-composer-cita-x">
            ✕
          </button>
        </div>
      )}

      <div className="wa-composer-fila">
        <textarea
          ref={textareaRef}
          value={textoRespuesta}
          onChange={(e) => {
            setTextoRespuesta(e.target.value);
            ajustarAltura();
          }}
          onKeyDown={alTeclear}
          placeholder="Escribí un mensaje…"
          rows={1}
          disabled={enviando}
        />
        <button type="submit" className="wa-composer-enviar" disabled={enviando || !textoRespuesta.trim()} title="Enviar">
          {enviando ? '…' : '➤'}
        </button>
      </div>

      <small className="wa-composer-aviso">
        ⏸️ Al enviar, el bot automático deja de responder a este contacto por 1 hora.
      </small>
      {error && <p className="wa-composer-error">{error}</p>}
    </form>
  );
};
