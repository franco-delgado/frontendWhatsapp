// src/cobrar/Cobrar.jsx
import { useState, useEffect } from "react";
import "./Cobrar.css"; // Importamos sus estilos

export default function Cobrar() {
  const [primeraParte, setPrimeraParte] = useState("Hola ");
  const [segundaParte, setSegundaParte] = useState(
    ", te recordamos que tenés un saldo pendiente de $",
  );
  const [terceraParte, setTerceraParte] = useState(
    ". Por favor, realiza el pago lo antes posible.",
  );

  // Cargamos los contactos desde localStorage
  const [contactos, setContactos] = useState(() => {
    const guardados = localStorage.getItem("contactos_whatsapp");
    return guardados ? JSON.parse(guardados) : [];
  });

  // Estado para los IDs seleccionados
  const [seleccionados, setSeleccionados] = useState([]);

  // Al cargar, seleccionamos todos por defecto
  useEffect(() => {
    setSeleccionados(contactos.map((c) => c.id));
  }, [contactos]);

  // FILTRO: Seleccionar automáticamente solo a los que deben dinero (monto > 0)
  const filtrarSoloDeudores = () => {
    const deudores = contactos.filter((c) => c.monto > 0);
    setSeleccionados(deudores.map((c) => c.id));
  };

  // Manejar check individuales
  const manejarSeleccion = (id) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((item) => item !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  // Envío masivo real usando el backend de Baileys 🚀
  const enviarCobros = async () => {
    const listaAEnviar = contactos.filter((c) => seleccionados.includes(c.id));

    if (listaAEnviar.length === 0) {
      alert("Por favor, selecciona al menos un contacto.");
      return;
    }

    alert(
      `Iniciando el envío de ${listaAEnviar.length} recordatorios de cobro a través de WhatsApp...`,
    );

    // Recorremos los seleccionados uno por uno
    for (const usuario of listaAEnviar) {
      // Estructuramos el mensaje completo intercalando nombre y monto
      const mensajeCompleto = `${primeraParte}${usuario.nombre}${segundaParte}${usuario.monto}${terceraParte}`;

      console.log(`Enviando cobro a ${usuario.numero}: "${mensajeCompleto}"`);

      try {
        // Hacemos el envío real al endpoint de Node.js
        const respuesta = await fetch("http://localhost:3000/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: usuario.numero, // Mapea al 'number' del backend
            message: mensajeCompleto, // Envía el mensaje completo armado
          }),
        });

        const datos = await respuesta.json();
        console.log(`Respuesta del servidor para ${usuario.nombre}:`, datos);

        // Pausa preventiva de 3 segundos entre mensajes para simular comportamiento humano
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (err) {
        console.error(
          "Error de conexión al enviar cobro a " + usuario.nombre,
          err,
        );
      }
    }

    alert("¡Proceso de envío de cobros terminado con éxito! 💰🚀");
  };

  return (
    <div className="cobrar-container">
      <h2 className="cobrar-title">💰 Recordatorio de Cobros Masivos</h2>

      {/* CAJA DE FILTRO RÁPIDO */}
      <div className="filter-box">
        <span>¿Querés marcar solo a los que tienen deuda activa?</span>
        <button
          type="button"
          onClick={filtrarSoloDeudores}
          className="btn-filter"
        >
          Filtrar Monto &gt; 0
        </button>
      </div>

      {/* INPUT 1 */}
      <div className="input-group">
        <label>Parte 1 (Inicio del mensaje):</label>
        <input
          type="text"
          value={primeraParte}
          onChange={(e) => setPrimeraParte(e.target.value)}
          className="input-text"
        />
      </div>

      {/* VARIABLE NOMBRE */}
      <div className="input-group">
        <label>Variable Fija 1:</label>
        <input
          type="text"
          value="[NOMBRE_CONTACTO]"
          disabled
          className="input-text variable-badge"
        />
      </div>

      {/* INPUT 2 */}
      <div className="input-group">
        <label>Parte 2 (Conector intermedio):</label>
        <input
          type="text"
          value={segundaParte}
          onChange={(e) => setSegundaParte(e.target.value)}
          className="input-text"
        />
      </div>

      {/* VARIABLE MONTO */}
      <div className="input-group">
        <label>Variable Fija 2:</label>
        <input
          type="text"
          value="[MONTO_A_COBRAR]"
          disabled
          className="input-text variable-badge"
        />
      </div>

      {/* INPUT 3 */}
      <div className="input-group">
        <label>Parte 3 (Cierre del mensaje):</label>
        <input
          type="text"
          value={terceraParte}
          onChange={(e) => setTerceraParte(e.target.value)}
          className="input-text"
        />
      </div>

      {/* VISTA PREVIA CORREGIDA */}
      <div className="preview-box">
        <p>
          <strong>Ejemplo de mensaje resultante:</strong>
        </p>
        <p>
          "{primeraParte}Juan{segundaParte}15000${terceraParte}"
        </p>
      </div>

      {/* BOTÓN ENVIAR */}
      <button onClick={enviarCobros} className="btn-enviar-cobros">
        Enviar Recordatorios ({seleccionados.length})
      </button>

      {/* LISTADO DE SELECCIÓN */}
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
