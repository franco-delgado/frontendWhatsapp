// frontend/src/components/Invitacion.jsx
import { useState } from "react";
import { UserPlus } from "lucide-react";

export default function Invitacion({ registrarCliente }) {
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoNumero, setNuevoNumero] = useState("");

  const handleAgregarPersona = async (e) => {
    e.preventDefault();

    // Ejecuta la función que viene del hook
    const guardado = await registrarCliente({
      nombre: nuevoNombre,
      numero: nuevoNumero,
    });

    if (guardado) {
      setNuevoNombre("");
      setNuevoNumero("");
      alert("¡Contacto agregado a la lista de difusión con éxito!");
    } else {
      alert(
        "Hubo un error al guardar el contacto. Revisá la consola del servidor.",
      );
    }
  };

  return (
    <div className="card" style={{ marginBottom: "20px" }}>
      <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <UserPlus size={20} /> Agregar Persona a Difusión
      </h3>
      <form onSubmit={handleAgregarPersona}>
        <div className="form-group">
          <label style={{ fontSize: "14px", fontWeight: "600" }}>
            Nombre Completo:
          </label>
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Ej: Juan Pérez"
            required
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "5px",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div className="form-group" style={{ marginTop: "10px" }}>
          <label style={{ fontSize: "14px", fontWeight: "600" }}>
            Número de WhatsApp:
          </label>
          <input
            type="text"
            value={nuevoNumero}
            onChange={(e) => setNuevoNumero(e.target.value)}
            placeholder="Ej: 3827402013"
            required
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "5px",
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          type="submit"
          className="btn-add"
          style={{
            marginTop: "15px",
            width: "100%",
            padding: "10px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          💾 GUARDAR EN LISTA DE DIFUSIÓN
        </button>
      </form>
    </div>
  );
}
