import { useState, useEffect } from "react";
import { useEnviarWhatsApp } from "../hooks/useEnviarWhatsApp";
import "./Invitar.css";

export default function Invitar() {
  const [contactos, setContactos] = useState(() => {
    const guardados = localStorage.getItem("contactos_whatsapp");
    return guardados ? JSON.parse(guardados) : [];
  });

  const [seleccionados, setSeleccionados] = useState([]);
  
  // Estados para las variables dinámicas de la plantilla
  const [headerTexto, setHeaderTexto] = useState(""); // Variable {{1}} (Header / Título)
  const [remitente, setRemitente] = useState("");     // Variable {{2}} (Cuerpo / Nombre de quien escribe)

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

  const enviarInvitaciones = async () => {
    const listaAEnviar = contactos.filter((c) => seleccionados.includes(c.id));

    if (listaAEnviar.length === 0) {
      alert("Por favor, selecciona al menos un contacto.");
      return;
    }

    // Validamos que los textos no estén vacíos
    const headerValido =
      headerTexto && String(headerTexto).trim() !== ""
        ? String(headerTexto).trim()
        : "FARMANOR";

    const remitenteValido =
      remitente && String(remitente).trim() !== ""
        ? String(remitente).trim()
        : "un representante";

    const contactsPayload = listaAEnviar.map((usuario) => {
      let numeroLimpio = usuario.numero.replace(/\D/g, "");

      if (numeroLimpio.includes("3827402013")) {
        numeroLimpio = "54382715402013";
      }

      return {
        number: numeroLimpio,
        type: "template",
        templateName: "invitacion",
        languageCode: "es_AR",
        // [{{1}} = Header / Título, {{2}} = Remitente en el texto]
        parameters: [headerValido, remitenteValido],
      };
    });

    try {
      const datos = await enviarMasivo(contactsPayload);

      if (datos.success) {
        alert(
          `¡Invitaciones enviadas con éxito! Procesados: ${datos.processed} envíos. 🚀`
        );
        console.log("Detalle del resultado:", datos.results);
      }
    } catch (err) {
      console.error("Error al procesar el envío:", err);
      alert(`Ocurrió un error en el envío: ${err.message}`);
    }
  };

  return (
    <div className="invitar-container">
      <h2 className="invitar-title">📧 Enviar Invitaciones Masivas</h2>

      {/* Inputs para configurar las variables de la plantilla */}
      <div className="inputs-variables-box" style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
        
        {/* Input Variable {{1}}: Header */}
        <div style={{ flex: 1 }}>
          <label
            htmlFor="headerTexto"
            style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}
          >
            Título / Header (headerValido):
          </label>
          <input
            id="headerTexto"
            type="text"
            placeholder="Ej: Novedades / FARMANOR"
            value={headerTexto}
            onChange={(e) => setHeaderTexto(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
          />
        </div>

        {/* Input Variable {{2}}: Remitente */}
        <div style={{ flex: 1 }}>
          <label
            htmlFor="remitente"
            style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}
          >
            Tu Nombre (headerTexto):
          </label>
          <input
            id="remitente"
            type="text"
            placeholder="Ej: Juan Pérez"
            value={remitente}
            onChange={(e) => setRemitente(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "14px",
            }}
          />
        </div>

      </div>

      {/* Vista Previa de la plantilla */}
      <div className="preview-box">
        <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>
          <strong>Vista previa de la Plantilla:</strong>
        </p>

        {/* Título en grande simulando la cabecera de Meta */}
        <h4 style={{ margin: "0 0 10px 0", color: "#007bff", fontSize: "16px" }}>
          {headerTexto.trim() || "[Texto del Título / Header]"}
        </h4>

        <p style={{ margin: 0, lineHeight: "1.5" }}>
          "Saludos mi nombre es{" "}
          <strong style={{ color: "#28a745" }}>
            {remitente.trim() || "[Tu Nombre]"}
          </strong>
          . Te escribo para contarte que en FARMANOR podes acceder a tu cuenta
          corriente solo con tu DNI, foto de algun servicio y recibo de sueldo.
          Con tu cuenta corriente podes comprar en cualquiera de nuestras 16
          sucursales, ademas tenes importantes descuento de hasta el 40% en
          medicamentos de nuestro vademecum."
        </p>
      </div>

      <button
        onClick={enviarInvitaciones}
        disabled={cargando}
        className="btn-enviar-cobros"
      >
        {cargando
          ? "Enviando invitaciones..."
          : `Enviar Recordatorios (${seleccionados.length})`}
      </button>

      <div className="usuarios-section">
        <h3>Contactos Disponibles</h3>
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
                <span
                  className="deuda-tag"
                  style={{
                    marginLeft: "10px",
                    fontWeight: "bold",
                    color: usuario.monto > 0 ? "#d9534f" : "#5cb85c",
                  }}
                >
                  Deuda: ${usuario.monto}
                </span>
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
              No hay contactos guardados en el sistema.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}