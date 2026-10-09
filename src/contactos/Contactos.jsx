import React, { useState } from "react";
import "./Contactos.css";
import useRespuestasContactos from "../hooks/useRespuestasContactos";
import useAgenda from "../hooks/useAgenda";
import ImportarExcel from "./ImportarExcel";

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

const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");
const nombreCompleto = (c) => `${c.nombre} ${c.apellido || ""}`.trim();

// Quita tildes y pasa a minúsculas para que la búsqueda no distinga "María" de "maria".
const normalizar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// Decide si un contacto coincide con lo que se escribió en el buscador.
//  - Si lo escrito parece un número (dígitos con espacios, puntos, guiones, "+" o paréntesis),
//    se compara solo por dígitos contra el DNI y el teléfono: "27.345.678" o "+54 9 3825 12-3456"
//    encuentran al contacto aunque en la base estén guardados sin separadores.
//  - Si es texto, cada palabra debe aparecer en el nombre o apellido, en cualquier orden
//    ("perez juan" encuentra a "Juan Pérez") y sin distinguir tildes ni mayúsculas.
//  - Cada campo se revisa por separado, así no hay coincidencias falsas que "crucen" DNI y teléfono.
const SOLO_NUMERICO = /^[\d\s().+-]+$/;

function coincideBusqueda(c, busqueda) {
  const texto = busqueda.trim();
  if (!texto) return true;

  const dni = soloDigitos(c.dni);
  const tel = soloDigitos(c.numero);
  const nombre = normalizar(nombreCompleto(c));

  const coincideDigitos = (d) => {
    if (!d) return false;
    if (dni.includes(d) || tel.includes(d)) return true;
    // Un celular argentino puede estar como 549XXXXXXXXXX o 54XXXXXXXXXX (con/sin el 9):
    // si se escribió un número completo, se comparan los últimos 8 dígitos.
    return d.length >= 9 && tel.length >= 8 && tel.slice(-8) === d.slice(-8);
  };

  if (SOLO_NUMERICO.test(texto)) return coincideDigitos(soloDigitos(texto));

  return normalizar(texto)
    .split(/\s+/)
    .every((palabra) => {
      if (nombre.includes(palabra)) return true;
      const d = soloDigitos(palabra);
      return d.length > 0 && d.length === palabra.length && coincideDigitos(d);
    });
}

export default function Contactos() {
  // La agenda vive en el servidor (así el bot también puede consultar el DNI y el monto).
  const { contactos, cargando, error, crear, actualizar, eliminar, importarExcel } = useAgenda();

  // Respuestas automáticas (según los mensajes entrantes del backend)
  const { obtenerRespuesta, cargando: cargandoRespuestas, error: errorRespuestas } =
    useRespuestasContactos();

  // Filtros
  const [filtroRespuesta, setFiltroRespuesta] = useState("todos"); // todos | respondieron | sinRespuesta
  const [filtroAlta, setFiltroAlta] = useState("todos"); // todos | conAlta | sinAlta
  const [filtroInvitacion, setFiltroInvitacion] = useState("todos"); // todos | invitados | sinInvitar
  const [busqueda, setBusqueda] = useState("");

  // Estados para el formulario de creación
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [numero, setNumero] = useState("");
  const [monto, setMonto] = useState("");

  // ESTADOS PARA LA EDICIÓN
  const [idEditando, setIdEditando] = useState(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [apellidoEditado, setApellidoEditado] = useState("");
  const [dniEditado, setDniEditado] = useState("");
  const [numeroEditado, setNumeroEditado] = useState("");
  const [montoEditado, setMontoEditado] = useState("");

  // El DNI se valida igual que en el servidor: solo números, entre 6 y 8 dígitos (o vacío).
  const dniInvalido = (d) => d !== "" && (d.length < 6 || d.length > 8);

  // Función para agregar un nuevo contacto
  const handleAgregar = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !numero || monto === "") {
      alert("Completá al menos nombre, número y monto.");
      return;
    }
    const dniLimpio = soloDigitos(dni);
    if (dniInvalido(dniLimpio)) {
      alert("El DNI debe tener entre 6 y 8 números, sin puntos ni comas.");
      return;
    }

    try {
      await crear({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dniLimpio,
        numero: soloDigitos(numero), // ÚNICAMENTE dígitos numéricos
        monto: parseFloat(monto),
      });
      setNombre("");
      setApellido("");
      setDni("");
      setNumero("");
      setMonto("");
    } catch (err) {
      alert(err.message);
    }
  };

  // Función para activar el modo edición cargando los datos actuales del contacto
  const activarEdicion = (contacto) => {
    setIdEditando(contacto.id);
    setNombreEditado(contacto.nombre);
    setApellidoEditado(contacto.apellido || "");
    setDniEditado(contacto.dni || "");
    setNumeroEditado(contacto.numero);
    setMontoEditado(contacto.monto);
  };

  // Función para guardar los cambios editados
  const handleGuardarEdicion = async (id) => {
    if (!nombreEditado.trim() || !numeroEditado || montoEditado === "") {
      alert("Nombre, número y monto no pueden quedar vacíos.");
      return;
    }
    const dniLimpio = soloDigitos(dniEditado);
    if (dniInvalido(dniLimpio)) {
      alert("El DNI debe tener entre 6 y 8 números, sin puntos ni comas.");
      return;
    }

    try {
      await actualizar(id, {
        nombre: nombreEditado.trim(),
        apellido: apellidoEditado.trim(),
        dni: dniLimpio,
        numero: soloDigitos(numeroEditado),
        monto: parseFloat(montoEditado),
      });
      setIdEditando(null); // Cierra el modo edición
    } catch (err) {
      alert(err.message);
    }
  };

  // Botón de alta: alterna entre "dada de alta" y "sin alta" (el servidor guarda la fecha)
  const toggleAlta = async (c) => {
    try {
      await actualizar(c.id, { alta: !c.alta });
    } catch (err) {
      alert(err.message);
    }
  };

  // Función para eliminar un contacto
  const handleEliminar = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este contacto?")) return;
    try {
      await eliminar(id);
    } catch (err) {
      alert(err.message);
    }
  };

  // Contadores y lista filtrada
  const totalRespondieron = contactos.filter((c) => obtenerRespuesta(c.numero)).length;
  const totalConAlta = contactos.filter((c) => c.alta).length;
  const totalInvitados = contactos.filter((c) => c.invitado).length;

  const q = normalizar(busqueda.trim());
  const contactosFiltrados = contactos.filter((c) => {
    if (q && !coincideBusqueda(c, busqueda)) return false;
    const respondio = Boolean(obtenerRespuesta(c.numero));
    if (filtroRespuesta === "respondieron" && !respondio) return false;
    if (filtroRespuesta === "sinRespuesta" && respondio) return false;
    if (filtroAlta === "conAlta" && !c.alta) return false;
    if (filtroAlta === "sinAlta" && c.alta) return false;
    if (filtroInvitacion === "invitados" && !c.invitado) return false;
    if (filtroInvitacion === "sinInvitar" && c.invitado) return false;
    return true;
  });

  const hayFiltros =
    filtroRespuesta !== "todos" ||
    filtroAlta !== "todos" ||
    filtroInvitacion !== "todos" ||
    q !== "";

  return (
    <div className="contactos-container">
      <h2 className="contactos-titulo">Gestión de Contactos y Cobros</h2>

      {/* Formulario de registro */}
      <form onSubmit={handleAgregar} className="contactos-form">
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="form-input"
        />
        <input
          type="text"
          placeholder="Apellido"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          className="form-input"
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="DNI (sin puntos ni comas)"
          value={dni}
          onChange={(e) => setDni(soloDigitos(e.target.value).slice(0, 8))}
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
        <small className="filtro-aviso">
          El apellido y el DNI son solo para identificar al cliente: no se envían en el mensaje de
          la plantilla. El DNI lo usa el bot para informar cuánto debe cada cliente.
        </small>
        <button type="submit" className="btn-guardar">
          Guardar Contacto
        </button>
      </form>

      {/* Carga masiva desde Excel */}
      <ImportarExcel importar={importarExcel} />

      {/* Lista de Contactos */}
      <h3 className="lista-titulo">
        Contactos Guardados ({hayFiltros ? `${contactosFiltrados.length} de ` : ""}
        {contactos.length})
      </h3>

      {error && (
        <small className="filtro-aviso">
          ⚠️ No se pudo cargar la agenda desde el servidor: {error}
        </small>
      )}
      {cargando && !error && <small className="filtro-aviso">Cargando contactos…</small>}

      {/* Filtros */}
      <div className="filtros">
        <input
          type="search"
          className="form-input"
          placeholder="Buscar por nombre, apellido, DNI o teléfono"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
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

        <div className="filtro-grupo">
          <span className="filtro-label">Invitación</span>
          <div className="filtro-chips">
            {[
              ["todos", `Todos (${contactos.length})`],
              ["sinInvitar", `⏳ Sin invitar (${contactos.length - totalInvitados})`],
              ["invitados", `✉️ Ya invitados (${totalInvitados})`],
            ].map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                className={`chip ${filtroInvitacion === valor ? "chip-activo" : ""}`}
                onClick={() => setFiltroInvitacion(valor)}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tabla-wrapper">
        <table className="contactos-tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>DNI</th>
              <th>Teléfono</th>
              <th>Monto</th>
              <th>Invitación</th>
              <th>Alta</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contactosFiltrados.map((c) =>
              idEditando === c.id ? (
                /* FILA EN EDICIÓN */
                <tr key={c.id} className="fila-edicion">
                  <td>
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      className="form-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Apellido"
                      value={apellidoEditado}
                      onChange={(e) => setApellidoEditado(e.target.value)}
                      className="form-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="DNI"
                      value={dniEditado}
                      onChange={(e) => setDniEditado(soloDigitos(e.target.value).slice(0, 8))}
                      className="form-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Teléfono"
                      value={numeroEditado}
                      onChange={(e) => setNumeroEditado(e.target.value)}
                      className="form-input"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      placeholder="Monto"
                      value={montoEditado}
                      onChange={(e) => setMontoEditado(e.target.value)}
                      className="form-input"
                    />
                  </td>
                  <td>
                    {c.invitado ? (
                      <span className="badge badge-respondio">
                        ✉️ Invitado
                        {c.fechaInvitacion ? ` · ${formatearFecha(c.fechaInvitacion).split(",")[0]}` : ""}
                      </span>
                    ) : (
                      <span className="badge badge-neutro">Sin invitación</span>
                    )}
                  </td>
                  <td>
                    <span className={c.alta ? "badge badge-alta" : "badge badge-sin-alta"}>
                      {c.alta ? "C/Alta" : "S/Alta"}
                    </span>
                  </td>
                  <td>
                    <div className="contacto-acciones">
                      <button onClick={() => handleGuardarEdicion(c.id)} className="btn-guardar btn-chico">
                        ✓ Guardar
                      </button>
                      <button onClick={() => setIdEditando(null)} className="btn-cancelar">
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                /* FILA NORMAL */
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.apellido || "—"}</td>
                  <td>
                    {c.dni ? (
                      c.dni
                    ) : (
                      <span
                        className="badge badge-sin-alta"
                        title="Sin DNI el bot no puede informarle su saldo"
                      >
                        ⚠️ Sin DNI
                      </span>
                    )}
                  </td>
                  <td>
                    {c.numero}
                    {(() => {
                      const r = obtenerRespuesta(c.numero);
                      return r ? (
                        <span
                          className="icono-respondio"
                          title={`Respondió (${r.cantidad}) · Último mensaje: ${formatearFecha(r.ultima)}`}
                        >
                          {" "}
                          💬
                        </span>
                      ) : null;
                    })()}
                  </td>
                  <td className="celda-monto">${c.monto}</td>
                  <td>
                    {c.invitado ? (
                      <span
                        className="badge badge-respondio"
                        title="Ya recibió la plantilla de invitación"
                      >
                        ✉️ Invitado
                        {c.fechaInvitacion ? ` · ${formatearFecha(c.fechaInvitacion).split(",")[0]}` : ""}
                      </span>
                    ) : (
                      <span className="badge badge-neutro">Sin invitación</span>
                    )}
                  </td>
                  <td>
                    {c.alta ? (
                      <span
                        className="badge badge-alta"
                        title={c.fechaAlta ? `Dada de alta el ${formatearFecha(c.fechaAlta).split(",")[0]}` : "Dada de alta"}
                      >
                        C/Alta
                      </span>
                    ) : (
                      <span className="badge badge-sin-alta">S/Alta</span>
                    )}
                  </td>
                  <td>
                    <div className="contacto-acciones">
                      <button
                        onClick={() => toggleAlta(c)}
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
                      <button onClick={() => handleEliminar(c.id)} className="btn-eliminar">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        {contactos.length === 0 && (
          <p className="sin-contactos">No hay contactos registrados todavía.</p>
        )}
        {contactos.length > 0 && contactosFiltrados.length === 0 && (
          <p className="sin-contactos">Ningún contacto coincide con los filtros.</p>
        )}
      </div>
    </div>
  );
}