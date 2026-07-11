// frontend/src/components/ClientForm.jsx
import { useState } from "react";
import { UserPlus, Users, Trash2, Edit2, Check, X } from "lucide-react";
import useClientes from "../hooks/useClientes"; // <-- Importamos nuestro hook personalizado
import "../styles/ClientForm.css";

export default function ClientForm({ soloLista = false }) {
  // Consumimos toda la lógica persistente del hook
  const {
    clientes,
    registrarCliente,
    eliminarCliente,
    editandoId,
    editNombre,
    editMonto,
    editNumero,
    setEditNombre,
    setEditMonto,
    setEditNumero,
    activarEdicion,
    cancelarEdicion,
    guardarCambiosEdicion,
  } = useClientes();

  // Mantenemos como estados locales únicamente los campos de la tarjeta de registro
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [numero, setNumero] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Mandamos los datos locales al hook para que los guarde
    const guardadoExitoso = await registrarCliente({ nombre, monto, numero });

    if (guardadoExitoso) {
      // Si el hook guardó y actualizó la lista con éxito, limpiamos el formulario local
      setNombre("");
      setMonto("");
      setNumero("");
    }
  };

  return (
    <div className="client-form-container">
      {/* Tarjeta de Registro: Se oculta automáticamente si soloLista es true */}
      {!soloLista && (
        <div className="card">
          <h3 className="card-title-icon">
            <UserPlus size={20} /> Registrar Nuevo Deudor
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nombre del Cliente:</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Franco Delgado"
                required
              />
            </div>
            <div className="form-group">
              <label>Cuenta (Monto a cobrar):</label>
              <input
                type="text"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej: $15.500"
                required
              />
            </div>
            <div className="form-group">
              <label>Número de WhatsApp:</label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ej: 5493827402013"
                required
              />
            </div>
            <button type="submit" className="btn-add">
              💾 GUARDAR EN BASE DE DATOS
            </button>
          </form>
        </div>
      )}

      {/* Tarjeta de la Lista */}
      <div className="card">
        <h3 className="card-title-icon">
          <Users size={20} /> Lista de Deudores en Base de Datos:
        </h3>
        <ul className="deudores-list">
          {clientes.length === 0 ? (
            <li>No hay deudores cargados actualmente.</li>
          ) : (
            clientes.map((c) => (
              <li key={c.id} className="deudor-item">
                {editandoId === c.id ? (
                  /* MODO EDICIÓN */
                  <div className="deudor-edit-block">
                    <input
                      type="text"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                    />
                    <input
                      type="text"
                      value={editMonto}
                      onChange={(e) => setEditMonto(e.target.value)}
                    />
                    <input
                      type="text"
                      value={editNumero}
                      onChange={(e) => setEditNumero(e.target.value)}
                    />
                  </div>
                ) : (
                  /* MODO NORMAL */
                  <div className="deudor-info-block">
                    <strong className="deudor-name">{c.nombre}</strong>{" "}
                    <span className="deudor-phone">({c.numero})</span>
                    <div className="deudor-amount-wrapper">
                      Deuda: <span className="deudor-amount">{c.monto}</span>
                    </div>
                  </div>
                )}

                {/* BOTONERA DE ACCIONES */}
                <div className="deudor-actions">
                  {editandoId === c.id ? (
                    <>
                      <button
                        onClick={() => guardarCambiosEdicion(c.id)}
                        className="btn-action-confirm"
                        title="Confirmar Guardar"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={cancelarEdicion}
                        className="btn-action-cancel"
                        title="Cancelar Edición"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => activarEdicion(c)}
                        className="btn-action-edit"
                        title="Editar Datos"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => eliminarCliente(c.id)}
                        className="btn-action-delete"
                        title="Eliminar de la lista"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
