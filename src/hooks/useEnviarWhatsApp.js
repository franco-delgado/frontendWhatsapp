import { useState } from 'react';

// Lee la URL del backend desde el .env o usa localhost por defecto
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useEnviarWhatsApp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Función para envío individual de un mensaje (soporta tipo: template, text, image, document)
   * 
   * @param {Object|string} payloadOrNumber - Si es string se asume número (para compatibilidad).
   * Si es Objeto soporta: { number, type, text, mediaUrl, filename, caption, parameters, templateName, languageCode }
   * @param {Array} [parameters=[]] - Mantenido para retrocompatibilidad si usas enviarIndividual(numero, parametros)
   */
  const enviarIndividual = async (payloadOrNumber, parameters = []) => {
    setLoading(true);
    setError(null);

    // Permitir enviar tanto un objeto completo como la firma antigua (number, parameters)
    const bodyPayload = typeof payloadOrNumber === 'object'
      ? payloadOrNumber
      : { number: payloadOrNumber, parameters, type: 'template' };

    try {
      const response = await fetch(`${API_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar el envío individual.');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Función para realizar envíos masivos
   * 
   * @param {Array<Object>} contacts - Arreglo de objetos con datos de envío
   * Ej: [{ number: '...', type: 'template', parameters: [...] }, { number: '...', type: 'text', text: 'Hola' }]
   * @param {number} [delayMs=200] - Pausa opcional en milisegundos entre envíos
   */
  const enviarMasivo = async (contacts, delayMs = 200) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/send-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contacts, delayMs }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar el envío masivo.');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { enviarIndividual, enviarMasivo, loading, error };
}