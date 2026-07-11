import React, { useState, useEffect } from "react";
import "./Contactos.css"; // Asegúrate de apuntar correctamente a la ruta de tu archivo CSS

export default function Contactos() {
  // Estado para la lista de contactos
  const [contactos, setContactos] = useState(() => {
    const guardados = localStorage.getItem("contactos_whatsapp");
    return guardados ? JSON.parse(guardados) : [];
  });

  // Estados para el formulario de creación
  const [nombre, setNombre] = useState("");
  const [numero, setNumero] = useState("");
  const [monto, setMonto] = useState("");

  // ESTADOS PARA LA EDICIÓN
  const [idEditando, setIdEditando] = useState(null); // Guarda el ID del contacto que se está editando
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

    const nuevoContacto = {
      id: Date.now(),
      nombre,
      numero: numero.replace(/\s+/g, ""),
      monto: parseFloat(monto),
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

    const contactosActualizados = contactos.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          nombre: nombreEditado,
          numero: numeroEditado.replace(/\s+/g, ""),
          monto: parseFloat(montoEditado),
        };
      }
      return c;
    });

    setContactos(contactosActualizados);
    setIdEditando(null); // Cierra el modo edición
  };

  // Función para eliminar un contacto
  const handleEliminar = (id) => {
    const confirmar = window.confirm(
      "¿Estás seguro de que deseas eliminar este contacto?",
    );
    if (confirmar) {
      const filtrados = contactos.filter((c) => c.id !== id);
      setContactos(filtrados);
    }
  };

  // Función para redirigir a WhatsApp
  const enviarMensajeWhatsApp = (contacto) => {
    const mensaje = `Hola ${contacto.nombre}, te escribo para recordarte el pago pendiente de $${contacto.monto}.`;
    const url = `https://api.whatsapp.com/send?phone=${contacto.numero}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

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
          placeholder="Número (Ej: 5491122334455)"
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
      <h3 className="lista-titulo">Contactos Guardados ({contactos.length})</h3>
      <ul className="contactos-lista">
        {contactos.map((c) => (
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
                </div>
                <div className="contacto-acciones">
                  <button
                    onClick={() => enviarMensajeWhatsApp(c)}
                    className="btn-whatsapp"
                  >
                    📱 Mensaje
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
      </ul>
    </div>
  );
}
