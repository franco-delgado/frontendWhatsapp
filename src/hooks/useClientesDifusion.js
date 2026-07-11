// frontend/src/hooks/useClientesDifusion.js
import { useState, useEffect } from "react";

export default function useClientesDifusion() {
  const [clientes, setClientes] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editNumero, setEditNumero] = useState("");

  // Cargar lista inicial desde el servidor
  const traerClientes = async () => {
    try {
      const res = await fetch("http://localhost:3000/clientes");
      const data = await res.json();
      setClientes(data || []);
    } catch (err) {
      console.error("Error al traer contactos:", err);
    }
  };

  useEffect(() => {
    traerClientes();
  }, []);

  // Función interna para formatear automáticamente el número con 549
  const formatearNumeroWhatsApp = (num) => {
    let limpio = num.replace(/\D/g, "");
    if (limpio.startsWith("549")) return limpio;
    if (limpio.startsWith("54") && !limpio.startsWith("549")) {
      return "549" + limpio.substring(2);
    }
    return "549" + limpio;
  };

  // POST: Forzamos el envío de monto: 0 para cumplir con el middleware original
  // frontend/src/hooks/useClientesDifusion.js

  const registrarCliente = async ({ nombre, numero }) => {
    // 1. Validación básica antes de mandar la petición
    if (!nombre.trim() || !numero.trim()) return false;

    // 2. Formatear el número con el prefijo correcto (ej: 549...)
    const numeroFormateada = formatearNumeroWhatsApp(numero);

    try {
      // 3. Petición POST al endpoint correcto de personas
      const res = await fetch("http://localhost:3000/actualizar-plantilla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          numero: numeroFormateada,
          monto: 0, // Enviamos 0 explícitamente para aprobar los middlewares del backend
        }),
      });

      // Si el servidor responde con un código de éxito (200-299)
      if (res.ok) {
        await traerClientes(); // Refrescamos la lista en pantalla
        return true;
      }
    } catch (err) {
      console.error("Error al registrar contacto en la lista:", err);
    }
    return false;
  };

  // DELETE
  const eliminarCliente = async (id) => {
    if (!confirm("¿Seguro que querés eliminar este contacto?")) return;
    try {
      const res = await fetch(`http://localhost:3000/clientes/${id}`, {
        method: "DELETE",
      });
      if (res.ok) traerClientes();
    } catch (err) {
      console.error("Error al eliminar contacto:", err);
    }
  };

  const activarEdicion = (cliente) => {
    setEditandoId(cliente.id);
    setEditNombre(cliente.nombre);
    setEditNumero(cliente.numero);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditNombre("");
    setEditNumero("");
  };

  // PUT: Forzamos el envío de monto: 0 al editar para el middleware original
  const guardarCambiosEdicion = async (id) => {
    const numeroFormateado = formatearNumeroWhatsApp(editNumero);
    try {
      const res = await fetch(`http://localhost:3000/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editNombre.trim(),
          numero: numeroFormateado,
          monto: 0, // <-- Valor automático asignado acá
        }),
      });
      if (res.ok) {
        setEditandoId(null);
        traerClientes();
      }
    } catch (err) {
      console.error("Error al editar contacto:", err);
    }
  };

  return {
    clientes,
    registrarCliente,
    eliminarCliente,
    editandoId,
    editNombre,
    editNumero,
    setEditNombre,
    setEditNumero,
    activarEdicion,
    cancelarEdicion,
    guardarCambiosEdicion,
  };
}
