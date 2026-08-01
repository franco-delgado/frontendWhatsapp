import { useState, useEffect } from "react";
import { useEnviarWhatsApp } from "../hooks/useEnviarWhatsApp";
import "./Cobrar.css";

export default function Cobrar() {
  const [contactos, setContactos] = useState(() => {
    const guardados = localStorage.getItem("contactos_whatsapp");
    return guardados ? JSON.parse(guardados) : [];
  });

  const [seleccionados, setSeleccionados] = useState([]);
  
  // Estado para el texto personalizado que se sumará al nombre del contacto
  const [textoPersonalizado, setTextoPersonalizado] = useState("");

  const { enviarMasivo, loading: cargando } = useEnviarWhatsApp();

  useEffect(() => {
    setSeleccionados(contactos.map((c) => c.id));
  }, [contactos]);

  const manejarSeleccion = (id) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((item) => item !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  const enviarCobro = async () => {
    const listaAEnviar = contactos.filter((c) => seleccionados.includes(c.id));

    if (listaAEnviar.length === 0) {
      alert("Por favor, selecciona al menos un contacto de la lista.");
      return;
    }

    const contactsPayload = listaAEnviar.map((usuario) => {
      let numeroLimpio = usuario.numero.replace(/\D/g, "");

      if (numeroLimpio.includes("3827402013")) {
        numeroLimpio = "54382715402013";
      }

      const nombreCliente = usuario.nombre?.trim() || "Cliente";
      const textoBase = textoPersonalizado.trim();

      // Si hay texto personalizado, lo une al nombre (ej: "Estimado Juan"); de lo contrario solo usa el nombre
      const variable1 = textoBase ? `${nombreCliente} ${textoBase}` : nombreCliente;

      return {
        number: numeroLimpio,
        type: "template",
        templateName: "mensaje_mensual",
        languageCode: "es_AR",
        parameters: [
          variable1,                  // Variable {{1}} (Texto opcional + Nombre)
          `$${usuario.monto || 0}`    // Variable {{2}} (Monto)
        ],
      };
    });

    try {
      const datos = await enviarMasivo(contactsPayload);

      if (datos.success) {
        alert(`¡Mensajes enviados con éxito! Procesados: ${datos.processed} envíos. 🚀`);
        console.log("Detalle del resultado:", datos.results);
      }
    } catch (err) {
      console.error("Error al procesar el envío:", err);
      alert(`Ocurrió un error en el envío: ${err.message}`);
    }
  };

  return (
    <div className="cobrar-container">
      <h2 className="cobrar-title">💰 Recordatorio de Cobros Masivos</h2>

      {/* Input para agregar texto previo al nombre del cliente */}
      <div className="input-texto-box" style={{ marginBottom: "15px" }}>
        <label
          htmlFor="textoPersonalizado"
          style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}
        >
          Texto adicional previo al nombre del cliente:
        </label>
        <input
          id="textoPersonalizado"
          type="text"
          placeholder="Ej: Estimado/a, Sr/a, Hola..."
          value={textoPersonalizado}
          onChange={(e) => setTextoPersonalizado(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "14px",
          }}
        />
      </div>

      <div className="preview-box">
        <p>
          <strong>Formato de Plantilla Meta (Business API):</strong>
        </p>
        <p>
          "Saludos{" "}
          <strong style={{ color: "#007bff" }}>
            {textoPersonalizado.trim() ? `[Nombre] ${textoPersonalizado.trim()}` : "[Nombre Del Cliente]"}
          </strong>{" "}
          le escribimos desde DFservice para informarle que su cuenta esta disponible con un monto de [<strong>$*****</strong>] para saldar. Recuerde saldarla antes del 15 para evitar intereses. Saludos☺️☺️"
        </p>
      </div>

      <button 
        onClick={enviarCobro} 
        disabled={cargando} 
        className="btn-enviar"
      >
        {cargando ? "Enviando invitaciones..." : `Enviar Mensajes (${seleccionados.length})`}
      </button>

      <div className="usuarios-section">
        <h3>Seleccionar Destinatarios</h3>
        <div className="usuarios-lista">
          {contactos.map((usuario) => (
            <div key={usuario.id} className="usuario-item">
              <input
                type="checkbox"
                checked={seleccionados.includes(usuario.id)}
                onChange={() => manejarSeleccion(usuario.id)}
              />
              <div className="usuario-info">
                <strong>{usuario.nombre}</strong> ({usuario.numero})
                {usuario.monto > 0 && (
                  <span
                    style={{
                      color: "#d9534f",
                      fontSize: "12px",
                      marginLeft: "8px",
                    }}
                  >
                    (Deuda: ${usuario.monto})
                  </span>
                )}
              </div>
            </div>
          ))}

          {contactos.length === 0 && (
            <p
              style={{
                fontSize: "14px",
                color: "#777",
                textAlign: "center",
                margin: "10px 0",
              }}
            >
              No hay contactos guardados. Andá a la pestaña "Contactos" para
              registrar el primero.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}