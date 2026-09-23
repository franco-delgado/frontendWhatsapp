// frontend/src/hooks/useRespuestasContactos.js
// Consulta los mensajes guardados en el backend y detecta, de forma automática,
// qué contactos ya respondieron (es decir, tienen al menos un mensaje ENTRANTE).
import { useState, useEffect, useCallback } from "react";

const URL_BACKEND =
  import.meta.env.VITE_API_URL || "https://backend-whatsapp-docker.onrender.com";

const INTERVALO_MS = 30000; // refresca cada 30 s

// Clave de comparación: últimos 8 dígitos. En Argentina el mismo celular puede
// llegar como 549XXXXXXXXXX o 54XXXXXXXXXX (con/sin el "9"), así que comparar
// el número completo falla. El backend hace lo mismo en coincideNumero().
export const claveNumero = (numero) =>
  String(numero || "").replace(/\D/g, "").slice(-8);

export default function useRespuestasContactos() {
  // { [claveNumero]: { cantidad, ultima } }
  const [respuestas, setRespuestas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${URL_BACKEND}/api/mensajes`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const lista = Array.isArray(json) ? json : json.data || [];

      const mapa = {};
      for (const m of lista) {
        const entrante =
          m.entrante !== undefined
            ? m.entrante
            : !String(m.remitente || m.sender || "").startsWith("Soporte (");
        if (!entrante) continue;

        const clave = claveNumero(m.numero || m.remitente || m.sender);
        if (!clave) continue;

        const fecha = m.created_at || m.timestamp || null;
        const previo = mapa[clave];
        mapa[clave] = {
          cantidad: (previo?.cantidad || 0) + 1,
          ultima:
            !previo?.ultima || (fecha && new Date(fecha) > new Date(previo.ultima))
              ? fecha
              : previo.ultima,
        };
      }

      setRespuestas(mapa);
      setError(false);
    } catch (e) {
      console.error("[useRespuestasContactos] No se pudieron traer los mensajes:", e.message);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  // Devuelve { cantidad, ultima } si el contacto respondió, o null si no.
  const obtenerRespuesta = useCallback(
    (numero) => respuestas[claveNumero(numero)] || null,
    [respuestas]
  );

  return { obtenerRespuesta, cargando, error, recargar: cargar };
}
