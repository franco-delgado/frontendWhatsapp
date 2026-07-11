// src/invitar/Invitar.jsx
import { useState, useEffect } from "react";
import "./Invitar.css"; // Importamos sus estilos

export default function Invitar() {
  const [primeraParte, setPrimeraParte] = useState("Hola ");
  const [segundaParte, setSegundaParte] = useState(
    ", te invitamos a nuestro próximo evento.",
  );

  // 1. Cargamos los contactos reales desde localStorage
  const [contactos, setContactos] = useState(() => {
    const guardados = localStorage.getItem("contactos_whatsapp");
    return guardados ? JSON.parse(guardados) : [];
  });

  // Guardamos las IDs de los usuarios seleccionados
  const [seleccionados, setSeleccionados] = useState([]);

  // 2. Sincronizamos los seleccionados cuando se cargan los contactos por primera vez
  useEffect(() => {
    setSeleccionados(contactos.map((c) => c.id));
  }, [contactos]);

  // Manejar el check/uncheck de cada usuario
  const manejarSeleccion = (id) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((item) => item !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  // Envío masivo real usando el backend
  const enviarInvitaciones = async () => {
    const listaAEnviar = contactos.filter((c) => seleccionados.includes(c.id));

    if (listaAEnviar.length === 0) {
      alert("Por favor, selecciona al menos un contacto de la lista.");
      return;
    }

    alert(
      `Iniciando el envío de ${listaAEnviar.length} mensajes a través de WhatsApp...`,
    );

    // Recorremos los seleccionados uno por uno
    for (const usuario of listaAEnviar) {
      const mensajeCompleto = `${primeraParte}${usuario.nombre}${segundaParte}`;

      console.log(`Enviando a ${usuario.numero}: "${mensajeCompleto}"`);

      try {
        // Hacemos el envío real al endpoint de Node.js
        const respuesta = await fetch("http://localhost:3000/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: usuario.numero, // Enviamos el número al backend
            message: mensajeCompleto, // Enviamos el mensaje armado
          }),
        });

        const datos = await respuesta.json();
        console.log(`Respuesta del servidor para ${usuario.nombre}:`, datos);

        // Agregamos una pequeña pausa de 3 segundos entre envíos para simular comportamiento humano
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (err) {
        console.error("Error de conexión al enviar a " + usuario.nombre, err);
      }
    }

    alert(
      "¡Proceso de envío terminado! Revisá tu WhatsApp o la consola de Node.js 🚀",
    );
  };

  return (
    <div className="invitar-container">
      <h2 className="invitar-title">📧 Enviar Invitaciones Masivas</h2>

      {/* INPUT 1 */}
      <div className="input-group">
        <label>Primera parte del mensaje:</label>
        <input
          type="text"
          value={primeraParte}
          onChange={(e) => setPrimeraParte(e.target.value)}
          className="input-text"
          placeholder="Ej: Hola "
        />
      </div>

      {/* INDICADOR VISUAL DEL NOMBRE */}
      <div className="input-group">
        <label>Variable intermedia:</label>
        <input
          type="text"
          value="[NOMBRE_USUARIO]"
          disabled
          className="input-text"
          style={{ backgroundColor: "#eee", fontStyle: "italic" }}
        />
      </div>

      {/* INPUT 2 */}
      <div className="input-group">
        <label>Segunda parte del mensaje:</label>
        <input
          type="text"
          value={segundaParte}
          onChange={(e) => setSegundaParte(e.target.value)}
          className="input-text"
          placeholder="Ej: , tenés un turno mañana."
        />
      </div>

      {/* VISTA PREVIA */}
      <div className="preview-box">
        <p>
          <strong>Ejemplo de cómo se verá:</strong>
        </p>
        <p>
          "{primeraParte}Juan{segundaParte}"
        </p>
      </div>

      {/* BOTÓN ENVIAR */}
      <button onClick={enviarInvitaciones} className="btn-enviar">
        Enviar Mensajes ({seleccionados.length})
      </button>

      {/* LISTADO DE USUARIOS CON CHECKBOX */}
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
                    {" "}
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
