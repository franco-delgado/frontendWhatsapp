import React, { useState, useEffect } from "react";
import "./Contactos.css";
import useRespuestasContactos from "../hooks/useRespuestasContactos";

const formatearFecha = (iso) =>
  iso
    ? new Date(iso).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export default function Contactos() {
  // Estado para la lista de contactos
  const [contactos, setContactos] = useState(() => {
    const guardados = localStorage.getItem("contactos_whatsapp");
    return guardados ? JSON.parse(guardados) : [];
  });

  // Limpieza automática de contactos viejos guardados en localStorage con símbolos (+, -, espacios)
  useEffect(() => {
    const contactosLimpios = contactos.map((c) => ({
      ...c,
      numero: String(c.numero).replace(/\D/g, ""),
    }));

    if (JSON.stringify(contactosLimpios) !== JSON.stringify(contactos)) {
      setContactos(contactosLimpios);
    }
  }, []);

  // Respuestas automáticas (según los mensajes entrantes del backend)
  const { obtenerRespuesta, cargando: cargandoRespuestas, error: errorRespuestas } =
    useRespuestasContactos();

  // Filtros
  const [filtroRespuesta, setFiltroRespuesta] = useState("todos"); // todos | respondieron | sinRespuesta
  const [filtroAlta, setFiltroAlta] = useState("todos"); // todos | conAlta | sinAlta

  // Estados para el formulario de creación
  const [nombre, setNombre] = useState("");
  const [numero, setNumero] = useState("");
  const [monto, setMonto] = useState("");

  // ESTADOS PARA LA EDICIÓN
  const [idEditando, setIdEditando] = useState(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [numeroEditado, setNumeroEditado] = useState("");
  const [montoEditado, setMontoEditado] = useState("");

  // Guardar automáticamente en localStorage
  useEffect(() => {
    localStorage.setItem("contactos_whatsapp", JSON.stringify(contactos));
  }, [contactos]);

  // Función para agregar un nuevo contacto
  const handleAgregar = (e) => {
    e.preventDefault();
    if (!nombre || !numero || !monto) {
      alert("Por favor, rellena todos los campos");
      return;
    }

    // Deja ÚNICAMENTE dígitos numéricos
    const numeroLimpio = numero.replace(/\D/g, "");

    const nuevoContacto = {
      id: Date.now(),
      nombre,
      numero: numeroLimpio,
      monto: parseFloat(monto),
      alta: false,
      fechaAlta: null,
    };

    setContactos([...contactos, nuevoContacto]);
    setNombre("");
    setNumero("");
    setMonto("");
  };

  // Función para activar el modo edición cargando los datos actuales del contacto
  const activarEdicion = (contacto) => {
    setIdEditando(contacto.id);
    setNombreEditado(contacto.nombre);
    setNumeroEditado(contacto.numero);
    setMontoEditado(contacto.monto);
  };

  // Función para guardar los cambios editados
  const handleGuardarEdicion = (id) => {
    if (!nombreEditado || !numeroEditado || !montoEditado) {
      alert("Los campos editados no pueden estar vacíos");
      return;
    }

    // Deja ÚNICAMENTE dígitos numéricos
    const numeroLimpio = numeroEditado.replace(/\D/g, "");

    const contactosActualizados = contactos.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          nombre: nombreEditado,
          numero: numeroLimpio,
          monto: parseFloat(montoEditado),
        };
      }
      return c;
    });

    setContactos(contactosActualizados);
    setIdEditando(null); // Cierra el modo edición
  };

  // Botón de alta: alterna entre "dada de alta" y "sin alta" y guarda la fecha
  const toggleAlta = (id) => {
    setContactos(
      contactos.map((c) =>
        c.id === id
          ? {
              ...c,
              alta: !c.alta,
              fechaAlta: !c.alta ? new Date().toISOString() : null,
            }
          : c
      )
    );
  };

  // Función para eliminar un contacto
  const handleEliminar = (id) => {
    const confirmar = window.confirm(
      "¿Estás seguro de que deseas eliminar este contacto?"
    );
    if (confirmar) {
      const filtrados = contactos.filter((c) => c.id !== id);
      setContactos(filtrados);
    }
  };

  // Contadores y lista filtrada
  const totalRespondieron = contactos.filter((c) => obtenerRespuesta(c.numero)).length;
  const totalConAlta = contactos.filter((c) => c.alta).length;

  const contactosFiltrados = contactos.filter((c) => {
    const respondio = Boolean(obtenerRespuesta(c.numero));
    if (filtroRespuesta === "respondieron" && !respondio) return false;
    if (filtroRespuesta === "sinRespuesta" && respondio) return false;
    if (filtroAlta === "conAlta" && !c.alta) return false;
    if (filtroAlta === "sinAlta" && c.alta) return false;
    return true;
  });

  const hayFiltros = filtroRespuesta !== "todos" || filtroAlta !== "todos";

  return (
    <div className="contactos-container">
      <h2 className="contactos-titulo">Gestión de Contactos y Cobros</h2>

      {/* Formulario de registro */}
      <form onSubmit={handleAgregar} className="contactos-form">
        <input
          type="text"
          placeholder="Nombre del contacto"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="form-input"
        />
        <input
          type="text"
          placeholder="Número (Ej: 5493827402013)"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          className="form-input"
        />
        <input
          type="number"
          placeholder="Monto a cobrar"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="form-input"
        />
        <button type="submit" className="btn-guardar">
          Guardar Contacto
        </button>
      </form>

      {/* Lista de Contactos */}
      <h3 className="lista-titulo">
        Contactos Guardados ({hayFiltros ? `${contactosFiltrados.length} de ` : ""}
        {contactos.length})
      </h3>

      {/* Filtros */}
      <div className="filtros">
        <div className="filtro-grupo">
          <span className="filtro-label">¿Respondió?</span>
          <div className="filtro-chips">
            {[
              ["todos", `Todos (${contactos.length})`],
              ["respondieron", `💬 Respondieron (${totalRespondieron})`],
              ["sinRespuesta", `Sin respuesta (${contactos.length - totalRespondieron})`],
            ].map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                className={`chip ${filtroRespuesta === valor ? "chip-activo" : ""}`}
                onClick={() => setFiltroRespuesta(valor)}
              >
                {texto}
              </button>
            ))}
          </div>
          {errorRespuestas && (
            <small className="filtro-aviso">
              ⚠️ No se pudo consultar los mensajes del servidor; el filtro de respuestas
              puede estar incompleto.
            </small>
          )}
          {cargandoRespuestas && !errorRespuestas && (
            <small className="filtro-aviso">Consultando respuestas…</small>
          )}
        </div>

        <div className="filtro-grupo">
          <span className="filtro-label">Alta</span>
          <div className="filtro-chips">
            {[
              ["todos", `Todos (${contactos.length})`],
              ["conAlta", `✅ Con alta (${totalConAlta})`],
              ["sinAlta", `⏳ Sin alta (${contactos.length - totalConAlta})`],
            ].map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                className={`chip ${filtroAlta === valor ? "chip-activo" : ""}`}
                onClick={() => setFiltroAlta(valor)}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ul className="contactos-lista">
        {contactosFiltrados.map((c) => (
          <React.Fragment key={c.id}>
            {idEditando === c.id ? (
              /* VISTA DE EDICIÓN */
              <li className="contacto-item-edit">
                <div className="edit-inputs">
                  <input
                    type="text"
                    value={nombreEditado}
                    onChange={(e) => setNombreEditado(e.target.value)}
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={numeroEditado}
                    onChange={(e) => setNumeroEditado(e.target.value)}
                    className="form-input"
                  />
                  <input
                    type="number"
                    value={montoEditado}
                    onChange={(e) => setMontoEditado(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="contacto-acciones">
                  <button
                    onClick={() => handleGuardarEdicion(c.id)}
                    className="btn-guardar"
                  >
                    ✓ Guardar
                  </button>
                  <button
                    onClick={() => setIdEditando(null)}
                    className="btn-cancelar"
                  >
                    Cancelar
                  </button>
                </div>
              </li>
            ) : (
              /* VISTA NORMAL DEL CONTACTO */
              <li className="contacto-item">
                <div className="contacto-info">
                  <strong>{c.nombre}</strong>
                  <span className="contacto-tel">Tel: {c.numero}</span>
                  <span className="contacto-monto">Deuda: ${c.monto}</span>
                  <div className="contacto-badges">
                    {(() => {
                      const r = obtenerRespuesta(c.numero);
                      return r ? (
                        <span
                          className="badge badge-respondio"
                          title={`Último mensaje: ${formatearFecha(r.ultima)}`}
                        >
                          💬 Respondió ({r.cantidad})
                        </span>
                      ) : (
                        <span className="badge badge-neutro">Sin respuesta</span>
                      );
                    })()}
                    {c.alta ? (
                      <span className="badge badge-alta">
                        ✅ Dada de alta{c.fechaAlta ? ` · ${formatearFecha(c.fechaAlta).split(",")[0]}` : ""}
                      </span>
                    ) : (
                      <span className="badge badge-sin-alta">⏳ Sin alta</span>
                    )}
                  </div>
                </div>
                <div className="contacto-acciones">
                  {/*<button
                    onClick={() => enviarMensajeWhatsApp(c)}
                    className="btn-whatsapp"
                  >
                    📱 Mensaje
                  </button>*/}
                  <button
                    onClick={() => toggleAlta(c.id)}
                    className={c.alta ? "btn-alta btn-alta-quitar" : "btn-alta"}
                  >
                    {c.alta ? "Quitar alta" : "Dar de alta"}
                  </button>
                  <button
                    onClick={() => activarEdicion(c)}
                    className="btn-cancelar"
                    style={{ backgroundColor: "#ffc107", color: "#000" }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(c.id)}
                    className="btn-eliminar"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            )}
          </React.Fragment>
        ))}
        {contactos.length === 0 && (
          <p className="sin-contactos">No hay contactos registrados todavía.</p>
        )}
        {contactos.length > 0 && contactosFiltrados.length === 0 && (
          <p className="sin-contactos">Ningún contacto coincide con los filtros.</p>
        )}
      </ul>
    </div>
  );
}