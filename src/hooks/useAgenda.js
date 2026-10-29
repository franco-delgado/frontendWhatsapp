// Agenda de clientes guardada ÚNICAMENTE en Supabase (a través del backend).
// Nombre, apellido, DNI, teléfono y monto: tanto los que se cargan de a uno como los que
// llegan por Excel. El bot de WhatsApp lee la misma tabla (por ejemplo, busca un DNI y le
// dice al cliente cuánto debe).
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api";

async function leer(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Error ${res.status} del servidor.`);
  }
  return data;
}

export default function useAgenda() {
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    try {
      const { data } = await leer(await apiFetch("/api/clientes"));
      setContactos(data);
      setError(null);
    } catch (e) {
      console.error("[useAgenda]", e.message);
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Las tres lanzan Error con el mensaje del servidor si algo falla.
  const crear = async (datos) => {
    const { data } = await leer(
      await apiFetch("/api/clientes", { method: "POST", body: JSON.stringify(datos) })
    );
    setContactos((prev) => [...prev, data]);
    return data;
  };

  const actualizar = async (id, cambios) => {
    const { data } = await leer(
      await apiFetch(`/api/clientes/${id}`, { method: "PUT", body: JSON.stringify(cambios) })
    );
    setContactos((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  };

  const eliminar = async (id) => {
    await leer(await apiFetch(`/api/clientes/${id}`, { method: "DELETE" }));
    setContactos((prev) => prev.filter((c) => c.id !== id));
  };

  // Carga masiva desde Excel. Devuelve { importados, omitidos, errores: [{ fila, motivo }] }.
  const importarExcel = async (filas) => {
    const data = await leer(
      await apiFetch("/api/clientes/importar-excel", {
        method: "POST",
        body: JSON.stringify({ filas }),
      })
    );
    await recargar();
    return data;
  };

  return { contactos, cargando, error, recargar, crear, actualizar, eliminar, importarExcel };
}
