import { useState, useCallback } from 'react';

// Lee la URL del backend desde el .env.production en Render o usa localhost por defecto
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useEnviarWhatsApp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Función para obtener la lista de mensajes recibidos/enviados
   */
  const obtenerMensajes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/mensajes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener los mensajes de la API.');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Función para envío individual de un mensaje
   */
  const enviarIndividual = async (payloadOrNumber, parameters = []) => {
    setLoading(true);
    setError(null);

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

  return { obtenerMensajes, enviarIndividual, enviarMasivo, loading, error };
}