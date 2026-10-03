// Agenda de clientes guardada en el servidor (Supabase).
// Reemplaza al localStorage: así el bot de WhatsApp también puede leer los datos
// (por ejemplo, buscar un DNI y decirle al cliente cuánto debe).
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api";
import { claveContactos } from "../contactosStorage";

async function leer(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Error ${res.status} del servidor.`);
  }
  return data;
}

// Si todavía tenés contactos en el navegador (versión anterior), se suben al servidor
// UNA sola vez. La copia local no se borra: queda como respaldo.
async function migrarDesdeLocalStorage() {
  const clave = claveContactos();
  if (localStorage.getItem(`${clave}_migrado`)) return false;

  let locales = [];
  try {
    locales = JSON.parse(localStorage.getItem(clave)) || [];
  } catch {
    return false;
  }
  if (!Array.isArray(locales) || locales.length === 0) return false;

  const data = await leer(
    await apiFetch("/api/clientes/importar", {
      method: "POST",
      body: JSON.stringify({ contactos: locales }),
    })
  );
  localStorage.setItem(`${clave}_migrado`, new Date().toISOString());
  console.log(`[Agenda] Migrados al servidor: ${data.importados} (omitidos: ${data.omitidos}).`);
  return true;
}

export default function useAgenda() {
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    try {
      let { data } = await leer(await apiFetch("/api/clientes"));
      if (data.length === 0 && (await migrarDesdeLocalStorage())) {
        ({ data } = await leer(await apiFetch("/api/clientes")));
      }
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
