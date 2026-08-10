import { useState, useEffect } from "react";
import { useEnviarWhatsApp } from "../hooks/useEnviarWhatsApp";
import "./Invitar.css";

export default function Invitar() {
  const [contactos, setContactos] = useState(() => {
    const guardados = localStorage.getItem("contactos_whatsapp");
    return guardados ? JSON.parse(guardados) : [];
  });

  const [seleccionados, setSeleccionados] = useState([]);

  // Estados adaptados a la plantilla de Meta
  const [tituloVar, setTituloVar] = useState("");           // Corresponde a {{1}} del Título
  const [textoAdicional, setTextoAdicional] = useState("");  // Se concatena al nombre para el {{1}} del Cuerpo
  const [nombreNegocio, setNombreNegocio] = useState("");    // Corresponde al {{2}} del Cuerpo

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
      alert("Por favor, selecciona al menos un contacto de la lista.");
      return;
    }

    const valTitulo = tituloVar.trim() || "Aviso";
    const valCuerpo2 = nombreNegocio.trim() || "Farmanor";
    const textoBase = textoAdicional.trim();

    const contactsPayload = listaAEnviar.map((usuario) => {
      let numeroLimpio = usuario.numero.replace(/\D/g, "");

      if (!numeroLimpio.startsWith("54")) {
        numeroLimpio = `54${numeroLimpio}`;
      }

      const nombreCliente = usuario.nombre?.trim() || "Cliente";

      // Variable 1 del body: nombre agendado + texto ingresado (ej: "Franco soy Franco...")
      const valCuerpo1 = textoBase ? `${nombreCliente} ${textoBase}` : nombreCliente;

      return {
        number: numeroLimpio,
        type: "template",
        templateName: "alta",
        languageCode: "es_AR",
        parameters: {
          header: [valTitulo],            // {{1}} del header
          body: [valCuerpo1, valCuerpo2]  // {{1}} y {{2}} del body
        }
      };
    });

    try {
      const datos = await enviarMasivo(contactsPayload);

      if (datos?.success) {
        alert(`¡Mensajes enviados con éxito! Procesados: ${datos.processed} envíos. 🚀`);
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
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label
            htmlFor="tituloVar"
            style={{ display: "block", fontWeight: "bold", marginBottom: "5px", fontSize: "13px" }}
          >
            Título ({"{{1}}"}):
          </label>
          <input
            id="tituloVar"
            type="text"
            placeholder="ej: ¡Atención!"
            value={tituloVar}
            onChange={(e) => setTituloVar(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "14px" }}
          />
        </div>

        <div style={{ flex: 1, minWidth: "200px" }}>
          <label
            htmlFor="textoAdicional"
            style={{ display: "block", fontWeight: "bold", marginBottom: "5px", fontSize: "13px" }}
          >
            Mensaje adicional (se agrega al nombre, Cuerpo {"{{1}}"}):
          </label>
          <input
            id="textoAdicional"
            type="text"
            placeholder="ej: soy Franco..."
            value={textoAdicional}
            onChange={(e) => setTextoAdicional(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "14px" }}
          />
        </div>

        <div style={{ flex: 1, minWidth: "200px" }}>
          <label
            htmlFor="nombreNegocio"
            style={{ display: "block", fontWeight: "bold", marginBottom: "5px", fontSize: "13px" }}
          >
            Nombre Negocio/Local (Cuerpo {"{{2}}"}):
          </label>
          <input
            id="nombreNegocio"
            type="text"
            placeholder="ej: Farmanor"
            value={nombreNegocio}
            onChange={(e) => setNombreNegocio(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "14px" }}
          />
        </div>
      </div>

      {/* Vista previa de la Plantilla ajustada a Meta */}
      <div className="preview-box">
        <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>
          <strong>Vista previa de la Plantilla:</strong>
        </p>

        <h4 style={{ margin: "0 0 8px 0", color: "#007bff", fontStyle: "italic" }}>
          {tituloVar.trim() || "{{1}}"}
        </h4>

        <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.4", color: "#444" }}>
          Hola{" "}
          <strong style={{ color: "#28a745" }}>
            {"{Nombre}"}{textoAdicional.trim() ? ` ${textoAdicional.trim()}` : ""}
          </strong>
          , te comento que ya podés gestionar tu cuenta corriente en{" "}
          <strong style={{ color: "#28a745" }}>{nombreNegocio.trim() || "{{2}}"}</strong> presentando tu DNI, un
          comprobante de servicio y tu recibo de sueldo. Cualquier consulta, escribime
        </p>
        <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: "#999" }}>
          * "{"{Nombre}"}" se reemplaza automáticamente por el nombre agendado de cada contacto.
        </p>
      </div>

      <button
        onClick={enviarInvitaciones}
        disabled={cargando}
        className="btn-enviar-cobros"
        style={{ width: "100%", marginTop: "15px" }}
      >
        {cargando ? "Enviando..." : `Enviar Invitaciones (${seleccionados.length})`}
      </button>

      <div className="usuarios-section" style={{ marginTop: "20px" }}>
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
                {usuario.monto > 0 && (
                  <span
                    style={{
                      color: "#d9534f",
                      fontSize: "12px",
                      marginLeft: "8px",
                      fontWeight: "bold"
                    }}
                  >
                    Deuda: ${usuario.monto}
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
              No hay contactos guardados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
