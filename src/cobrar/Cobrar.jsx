import { useState, useEffect, useMemo } from "react";
import { useEnviarWhatsApp } from "../hooks/useEnviarWhatsApp";
import "./Cobrar.css";
import useAgenda from "../hooks/useAgenda";

export default function Cobrar() {
  // La agenda viene del servidor. El apellido y el DNI no se usan acá: la plantilla
  // solo lleva nombre y monto.
  const { contactos, error: errorAgenda } = useAgenda();

  // Solo se cobra a quienes tienen un monto mayor a 0. Los contactos sin monto
  // (vacío, null, 0 o inválido) no aparecen en esta plantilla ni reciben el mensaje.
  const contactosConMonto = useMemo(
    () =>
      contactos.filter((c) => {
        const monto = Number(String(c.monto ?? "").replace(",", "."));
        return Number.isFinite(monto) && monto > 0;
      }),
    [contactos]
  );

  const [seleccionados, setSeleccionados] = useState([]);
  
  // Estados para las variables de la plantilla de Meta
  const [tituloVar, setTituloVar] = useState("");          // Header {{1}}
  const [nombreNegocio, setNombreNegocio] = useState("");   // Body {{2}} (Nombre del negocio)

  const { enviarMasivo, loading: cargando } = useEnviarWhatsApp();

  useEffect(() => {
    setSeleccionados(contactosConMonto.map((c) => c.id));
  }, [contactosConMonto]);

  const manejarSeleccion = (id) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((item) => item !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  const enviarCobro = async () => {
    const listaAEnviar = contactosConMonto.filter((c) => seleccionados.includes(c.id));

    if (listaAEnviar.length === 0) {
      alert("Por favor, selecciona al menos un contacto de la lista.");
      return;
    }

    const valTitulo = tituloVar.trim() || "Resumen de Cuenta";
    const valNegocio = nombreNegocio.trim() || "Farmanor";

    const contactsPayload = listaAEnviar.map((usuario) => {
      // Limpieza del número de teléfono
      let numeroLimpio = usuario.numero.replace(/\D/g, "");
      if (!numeroLimpio.startsWith("54")) {
        numeroLimpio = `54${numeroLimpio}`;
      }

      const nombreCliente = usuario.nombre?.trim() || "Cliente";

      // {{1}} del cuerpo: Nombre agendado + texto adicional opcional
      const valCuerpo1 = nombreCliente;
      
      // {{3}} del cuerpo: Monto del cliente
      const valMonto = usuario.monto || 0;

      return {
        number: numeroLimpio,
        type: "template",
        templateName: "mensaje_mensual2109", // NOMBRE DE TU PLANTILLA
        languageCode: "es_AR",
        parameters: {
          header: [valTitulo],                   // {{1}} del Encabezado
          body: [valCuerpo1, valNegocio, valMonto] // {{1}}, {{2}} y {{3}} del Cuerpo
        }
      };
    });

    try {
      const datos = await enviarMasivo(contactsPayload);

      if (datos?.success) {
        const fallidos = datos.fallidos || 0;
        if (fallidos > 0) {
          // Por ejemplo, contactos que pertenecen a otro usuario del número compartido.
          const primero = (datos.results || []).find((r) => r.status === "error");
          alert(
            `Enviados: ${datos.enviados ?? datos.processed - fallidos}. No se pudieron enviar: ${fallidos}.` +
              (primero ? `\nEjemplo: ${primero.number} → ${primero.error}` : "")
          );
        } else {
          alert(`¡Mensajes enviados con éxito! Procesados: ${datos.processed} envíos. 🚀`);
        }
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

      {/* Inputs para configurar las variables de la plantilla */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label
            htmlFor="tituloVar"
            style={{ display: "block", fontWeight: "bold", marginBottom: "5px", fontSize: "13px" }}
          >
            Título (Encabezado {"{{1}}"}):
          </label>
          <input
            id="tituloVar"
            type="text"
            placeholder="ej: Resumen Mensual"
            value={tituloVar}
            onChange={(e) => setTituloVar(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "14px" }}
          />
        </div>

        

        <div style={{ flex: 1, minWidth: "200px" }}>
          <label
            htmlFor="nombreNegocio"
            style={{ display: "block", fontWeight: "bold", marginBottom: "5px", fontSize: "13px" }}
          >
            Nombre Negocio (Cuerpo {"{{2}}"}):
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

      {/* Vista previa de la Plantilla de Cobro */}
      <div className="preview-box">
        <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>
          <strong>Vista previa de la Plantilla:</strong>
        </p>

        <h4 style={{ margin: "0 0 8px 0", color: "#007bff", fontStyle: "italic" }}>
          {tituloVar.trim() || "{{1}}"}
        </h4>

        <div style={{ margin: 0, fontSize: "13px", lineHeight: "1.4", color: "#444" }}>
          <p style={{ margin: "0 0 8px 0" }}>
            Hola{" "}
            <strong style={{ color: "#28a745" }}>
              {"{Nombre agendado}"}
            </strong>
            . Le escribimos desde{" "}
            <strong style={{ color: "#28a745" }}>{nombreNegocio.trim() || "{{2}}"}</strong> para informarle que ya se encuentra disponible el resumen de su cuenta correspondiente al consumo del mes, por un monto de{" "}
            <strong style={{ color: "#d9534f" }}>${"{Monto a cobrar}"}</strong>.
          </p>

          <p style={{ margin: "0 0 8px 0" }}>
            Le recordamos realizar el pago antes del día 15 para evitar el recargo de intereses.
          </p>

          <p style={{ margin: 0 }}>
            Quedamos a su disposición ante cualquier duda o consulta. ¡Que tenga un excelente día!
          </p>
        </div>

        <p style={{ margin: "10px 0 0 0", fontSize: "11px", color: "#999" }}>
          * "{"{Nombre agendado}"}" y "{"{Monto a cobrar}"}" se completan automáticamente según los datos asignados a cada contacto.
        </p>
      </div>

      <button 
        onClick={enviarCobro} 
        disabled={cargando} 
        className="btn-enviar"
        style={{ width: "100%", marginTop: "15px" }}
      >
        {cargando ? "Enviando..." : `Enviar Mensajes de Cobro (${seleccionados.length})`}
      </button>

      <div className="usuarios-section" style={{ marginTop: "20px" }}>
        <h3>Seleccionar Destinatarios</h3>
        <div className="usuarios-lista">
          {contactosConMonto.map((usuario) => (
            <div key={usuario.id} className="usuario-item">
              <input
                type="checkbox"
                checked={seleccionados.includes(usuario.id)}
                onChange={() => manejarSeleccion(usuario.id)}
              />
              <div className="usuario-info">
                <strong>{`${usuario.nombre} ${usuario.apellido || ""}`.trim()}</strong> ({usuario.numero})
                <span
                  style={{
                    color: "#d9534f",
                    fontSize: "12px",
                    marginLeft: "8px",
                    fontWeight: "bold"
                  }}
                >
                  (Monto a cobrar: ${usuario.monto})
                </span>
              </div>
            </div>
          ))}

          {errorAgenda && (
            <p style={{ color: "#d9534f", fontSize: "13px" }}>
              ⚠️ No se pudo cargar la agenda: {errorAgenda}
            </p>
          )}
          {contactosConMonto.length === 0 && !errorAgenda && (
            <p
              style={{
                fontSize: "14px",
                color: "#777",
                textAlign: "center",
                margin: "10px 0",
              }}
            >
              {contactos.length === 0
                ? "No hay contactos guardados."
                : "No hay contactos con monto para cobrar."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}