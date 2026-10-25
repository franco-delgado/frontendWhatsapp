import { useState, useEffect, useMemo } from "react";
import { useEnviarWhatsApp } from "../hooks/useEnviarWhatsApp";
import "./Invitar.css";
import useAgenda from "../hooks/useAgenda";

const formatearFecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

// ---------------------------------------------------------------------------
// Plantillas de Meta disponibles. Para agregar otra, sumá un objeto acá.
//  - templateName: nombre EXACTO en Meta (minúsculas y guiones bajos, sin espacios).
//  - cuerpo: texto de la plantilla. {{nombre}} = nombre del contacto, {{2}} y {{3}} = variables del cuerpo.
//  - tieneEncabezado: false si la plantilla no tiene variable en el encabezado.
// ---------------------------------------------------------------------------
const PLANTILLAS = [
  {
    id: "invitar",
    etiqueta: "Invitar",
    templateName: "invitacion2109",
    languageCode: "es_AR",
    tieneEncabezado: true,
    tituloPorDefecto: "¡Abrí tu cuenta FARMANOR PAY!",
    cuerpo: `Hola {{nombre}}, te saluda {{2}} de {{3}}. 👋

Queremos invitarte a abrir tu cuenta FARMANOR PAY y disfrutar de estos beneficios:
🔹 Compras en hasta 3 cuotas.
🔹 15% de descuento pagando antes del día 15.
🔹 Hasta 40% OFF en medicamentos seleccionados y promociones exclusivas.

¿Qué necesitas para abrirla?
Solo envianos por este medio foto de:
1️⃣ DNI (frente y dorso).
2️⃣ Un servicio (luz, agua, cable o internet).
3️⃣ Comprobante de ingresos (recibo de sueldo, AUH, pensión o últimas 3 facturas si sos monotributista).

¡Escribinos para cualquier consulta!`,
  },
  {
    id: "invitar_nueva_opcion",
    etiqueta: "Invitar nueva opción",
    templateName: "invitacion",
    languageCode: "es_AR",
    tieneEncabezado: true,
    tituloPorDefecto: "¡Abrí tu cuenta FARMANOR PAY!",
    // TODO: reemplazá este texto por el texto exacto de la plantilla en Meta.
    cuerpo: `Hola {{nombre}}, soy {{2}} de {{3}}. Para poder habilitar tu cuenta, solo necesitamos foto de tu DNI, un comprobante de servicio (luz o internet) y comprobante de ingresos (recibo de sueldo, AUH, pensión o las últimas 3 facturas si sos monotributista). Cualquier consulta, estoy a disposición. 👋`,
  },
];

// Reemplaza los {{...}} del texto por los valores (resaltados) para la vista previa.
const renderizarTexto = (texto, valores) =>
  texto.split(/(\{\{\w+\}\})/g).map((parte, i) => {
    const m = parte.match(/^\{\{(\w+)\}\}$/);
    if (!m) return parte;
    return (
      <strong key={i} style={{ color: "#2563eb" }}>
        {valores[m[1]] ?? parte}
      </strong>
    );
  });

export default function Invitar() {
  // La agenda viene del servidor (igual que en Cobrar), no del localStorage.
  const { contactos: agenda, error: errorAgenda, recargar } = useAgenda();

  // Solo se invita a quienes todavía NO tienen cuenta. Los que tienen alta (por ejemplo los
  // cargados desde Excel, que ya son clientes) se cobran desde "Cobrar" y no aparecen acá.
  const contactos = useMemo(() => agenda.filter((c) => !c.alta), [agenda]);

  const [seleccionados, setSeleccionados] = useState([]);
  // sinInvitar | invitados | todos. Al elegir uno se seleccionan justo esos contactos.
  const [filtro, setFiltro] = useState("sinInvitar");

  // Plantilla de Meta elegida (se puede cambiar con los botones de arriba).
  const [plantillaId, setPlantillaId] = useState(PLANTILLAS[0].id);
  const plantilla = PLANTILLAS.find((p) => p.id === plantillaId) || PLANTILLAS[0];

  // Estados adaptados a las variables de la plantilla en Meta
  const [tituloVar, setTituloVar] = useState("");          // Header {{1}}
  const [textoAdicional, setTextoAdicional] = useState(""); // Body {{2}} (Quien saluda, ej: "Franco")
  const [nombreNegocio, setNombreNegocio] = useState("");   // Body {{3}} (Nombre de la empresa, ej: "FARMANOR")

  const { enviarMasivo, loading: cargando } = useEnviarWhatsApp();

  // Por defecto solo se seleccionan los que todavía no recibieron la invitación.
  // (También se ejecuta al recargar la agenda después de enviar: los recién invitados se destildan.)
  useEffect(() => {
    setFiltro("sinInvitar");
    setSeleccionados(contactos.filter((c) => !c.invitado).map((c) => c.id));
  }, [contactos]);

  const totalInvitados = contactos.filter((c) => c.invitado).length;
  const totalSinInvitar = contactos.length - totalInvitados;

  const contactosVisibles = contactos.filter((c) =>
    filtro === "todos" ? true : filtro === "invitados" ? c.invitado : !c.invitado
  );

  const elegirFiltro = (valor) => {
    setFiltro(valor);
    const visibles = contactos.filter((c) =>
      valor === "todos" ? true : valor === "invitados" ? c.invitado : !c.invitado
    );
    setSeleccionados(visibles.map((c) => c.id));
  };

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

    // Evita reenviar (y pagar) la plantilla a quienes ya la recibieron sin darse cuenta.
    const yaInvitados = listaAEnviar.filter((c) => c.invitado).length;
    if (
      yaInvitados > 0 &&
      !window.confirm(
        `${yaInvitados} de los ${listaAEnviar.length} contactos seleccionados ya recibieron la invitación.\n¿Querés enviársela de nuevo?`
      )
    ) {
      return;
    }

    const valTitulo = tituloVar.trim() || plantilla.tituloPorDefecto;
    const valCuerpo2 = textoAdicional.trim() || "el equipo";
    const valCuerpo3 = nombreNegocio.trim() || "FARMANOR";

    const contactsPayload = listaAEnviar.map((usuario) => {
      let numeroLimpio = usuario.numero.replace(/\D/g, "");

      if (!numeroLimpio.startsWith("54")) {
        numeroLimpio = `54${numeroLimpio}`;
      }

      const valCuerpo1 = usuario.nombre?.trim() || "Cliente";

      return {
        number: numeroLimpio,
        type: "template",
        templateName: plantilla.templateName,
        languageCode: plantilla.languageCode,
        marcarInvitacion: true, // el servidor marca al cliente como "invitado" si el envío sale bien
        parameters: {
          // Header {{1}} (solo si la plantilla lo tiene)
          ...(plantilla.tieneEncabezado ? { header: [valTitulo] } : {}),
          body: [valCuerpo1, valCuerpo2, valCuerpo3] // Body {{1}}, Body {{2}} y Body {{3}}
        }
      };
    });

    try {
      const datos = await enviarMasivo(contactsPayload);

      // Trae de nuevo la agenda para que los recién invitados queden marcados.
      await recargar();

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
    <div className="invitar-container">
      <h2 className="invitar-title">📧 Enviar Invitaciones Masivas</h2>

      {/* Selector de plantilla de Meta */}
      <div className="invitar-chips" role="group" aria-label="Plantilla de Meta">
        {PLANTILLAS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`invitar-chip ${plantillaId === p.id ? "invitar-chip-activo" : ""}`}
            onClick={() => setPlantillaId(p.id)}
            disabled={cargando}
          >
            📄 {p.etiqueta}
          </button>
        ))}
      </div>

      {/* Inputs para configurar las variables de la plantilla */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        {plantilla.tieneEncabezado && (
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
              placeholder="ej: ¡Abrí tu cuenta FARMANOR PAY!"
              value={tituloVar}
              onChange={(e) => setTituloVar(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "14px" }}
            />
          </div>
        )}

        <div style={{ flex: 1, minWidth: "200px" }}>
          <label
            htmlFor="textoAdicional"
            style={{ display: "block", fontWeight: "bold", marginBottom: "5px", fontSize: "13px" }}
          >
            Nombre de quien saluda (Cuerpo {"{{2}}"}):
          </label>
          <input
            id="textoAdicional"
            type="text"
            placeholder="ej: Franco"
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
            Nombre Negocio (Cuerpo {"{{3}}"}):
          </label>
          <input
            id="nombreNegocio"
            type="text"
            placeholder="ej: FARMANOR"
            value={nombreNegocio}
            onChange={(e) => setNombreNegocio(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "14px" }}
          />
        </div>
      </div>

      {/* Vista previa de la Plantilla */}
      <div className="preview-box">
        <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>
          <strong>Vista previa de la Plantilla:</strong> {plantilla.etiqueta}{" "}
          <code style={{ fontSize: "11px", color: "#999" }}>({plantilla.templateName})</code>
        </p>

        {plantilla.tieneEncabezado && (
          <h4 style={{ margin: "0 0 8px 0", color: "#007bff", fontStyle: "italic" }}>
            {tituloVar.trim() || "{{1}}"}
          </h4>
        )}

        <div style={{ margin: 0, fontSize: "13px", lineHeight: "1.4", color: "#444", whiteSpace: "pre-line" }}>
          {renderizarTexto(plantilla.cuerpo, {
            nombre: "{Nombre agendado}",
            2: textoAdicional.trim() || "{{2}}",
            3: nombreNegocio.trim() || "{{3}}",
          })}
        </div>

        <p style={{ margin: "10px 0 0 0", fontSize: "11px", color: "#999" }}>
          * "{"{Nombre agendado}"}" se reemplaza automáticamente por el nombre asignado a cada contacto.
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

        <div className="invitar-chips">
          {[
            ["sinInvitar", `⏳ Sin invitar (${totalSinInvitar})`],
            ["invitados", `✉️ Ya invitados (${totalInvitados})`],
            ["todos", `Todos (${contactos.length})`],
          ].map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              className={`invitar-chip ${filtro === valor ? "invitar-chip-activo" : ""}`}
              onClick={() => elegirFiltro(valor)}
            >
              {texto}
            </button>
          ))}
        </div>

        <div className="usuarios-lista">
          {contactosVisibles.map((usuario) => (
            <div key={usuario.id} className="usuario-item">
              <input
                type="checkbox"
                checked={seleccionados.includes(usuario.id)}
                onChange={() => manejarSeleccion(usuario.id)}
              />
              <div className="usuario-info">
                <strong>{`${usuario.nombre} ${usuario.apellido || ""}`.trim()}</strong> ({usuario.numero})
                {usuario.invitado ? (
                  <span
                    className="invitar-badge invitar-badge-invitado"
                    title="Ya recibió la plantilla de invitación"
                  >
                    ✉️ Invitado{usuario.fechaInvitacion ? ` · ${formatearFecha(usuario.fechaInvitacion)}` : ""}
                  </span>
                ) : (
                  <span className="invitar-badge invitar-badge-pendiente">⏳ Sin invitar</span>
                )}
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

          {errorAgenda && (<p style={{ color: "#d9534f", fontSize: "13px" }}>⚠️ No se pudo cargar la agenda: {errorAgenda}</p>)}
          {contactos.length > 0 && contactosVisibles.length === 0 && (
            <p style={{ fontSize: "14px", color: "#777", textAlign: "center", margin: "10px 0" }}>
              {filtro === "sinInvitar" ? "Todos tus contactos ya fueron invitados. 🎉" : "Ningún contacto en esta lista."}
            </p>
          )}
          {contactos.length === 0 && !errorAgenda && (
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