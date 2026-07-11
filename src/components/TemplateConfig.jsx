// frontend/src/components/TemplateConfig.jsx
import { useState, useEffect } from "react";
import { Settings, RefreshCw, Rocket } from "lucide-react";
import { useObtenerQR } from "../hooks/useObtenerQR";

export default function TemplateConfig() {
  const [intro, setIntro] = useState("");
  const [medio, setMedio] = useState("");
  const [cierre, setCierre] = useState("");

  // Llamamos al hook específico para el botón del QR
  const { obtenerQR, cargando, estado, setEstado } = useObtenerQR();

  // Efecto opcional: sincroniza el estado inicial de la conexión al montar la vista
  useEffect(() => {
    const chequearEstadoInicial = async () => {
      try {
        const res = await fetch("http://localhost:3000/status");
        const data = await res.json();
        if (data && data.estado) {
          setEstado(data.estado);
        }
      } catch (err) {
        console.error("Error al obtener estado inicial", err);
      }
    };
    chequearEstadoInicial();
  }, [setEstado]);

  // Traer la plantilla guardada inicialmente del backend
  useEffect(() => {
    const obtenerPlantillaInicial = async () => {
      try {
        const res = await fetch("http://localhost:3000/plantilla");
        const data = await res.json();
        if (data) {
          setIntro(data.introduccion || "");
          setMedio(data.medio || "");
          setCierre(data.cierre || "");
        }
      } catch (err) {
        console.error("Error al traer la plantilla", err);
      }
    };
    obtenerPlantillaInicial();
  }, []);

  // Función para guardar los cambios de los inputs de la plantilla
  const guardarPlantilla = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        "http://localhost:3000/actualizar-plantilla",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ introduccion: intro, medio, cierre }),
        },
      );

      if (response.ok) {
        alert("¡Plantilla del mensaje guardada con éxito!");
      } else {
        alert("Error al guardar la plantilla.");
      }
    } catch (err) {
      console.error("Error al conectar con el servidor", err);
    }
  };

  // Función para el botón de envíos masivos directos
  const enviarMensajes = async () => {
    try {
      const res = await fetch("http://localhost:3000/enviar-mensajes", {
        method: "POST",
      });
      const data = await res.json();
      alert(data.message || "Proceso de envío terminado.");
    } catch (err) {
      console.error("Error al enviar mensajes", err);
      alert("Error al conectar con el servidor para enviar los mensajes.");
    }
  };

  return (
    <div className="card">
      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
        <button
          className="btn-qr"
          onClick={obtenerQR}
          disabled={cargando || estado === "CONECTADO"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            opacity: cargando || estado === "CONECTADO" ? 0.6 : 1,
          }}
        >
          <RefreshCw size={16} className={cargando ? "animate-spin" : ""} />
          {cargando ? "CONSULTANDO..." : "MOSTRAR / ACTUALIZAR QR"}
        </button>

        <button
          className="btn-send"
          onClick={enviarMensajes}
          disabled={estado !== "CONECTADO"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            opacity: estado !== "CONECTADO" ? 0.5 : 1,
          }}
        >
          <Rocket size={16} /> ENVIAR MENSAJES CON UN CLICK
        </button>
      </div>

      <h3
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "20px",
        }}
      >
        <Settings size={20} /> Personalizar Plantilla del Mensaje
      </h3>

      <form onSubmit={guardarPlantilla}>
        <div className="form-group">
          <label>1. Inicio del Mensaje:</label>
          <input
            type="text"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            required
          />
        </div>
        <p
          style={{
            margin: "0 0 10px 0",
            color: "#7f8c8d",
            fontWeight: "bold",
            fontSize: "13px",
          }}
        >
          [Aquí se autocompletará el NOMBRE del cliente]
        </p>

        <div className="form-group">
          <label>2. Conector Medio:</label>
          <input
            type="text"
            value={medio}
            onChange={(e) => setMedio(e.target.value)}
            required
          />
        </div>
        <p
          style={{
            margin: "0 0 10px 0",
            color: "#7f8c8d",
            fontWeight: "bold",
            fontSize: "13px",
          }}
        >
          [Aquí se autocompletará el MONTO de la deuda]
        </p>

        <div className="form-group">
          <label>3. Cierre del Mensaje:</label>
          <input
            type="text"
            value={cierre}
            onChange={(e) => setCierre(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-template">
          🧡 ACEPTAR Y CONFIGURAR TEXTO
        </button>
      </form>

      <h4 style={{ marginBottom: "5px", marginTop: "20px" }}>
        Vista previa de cómo se enviará:
      </h4>
      <div className="preview-box">
        {intro || "..."} <strong>[Nombre Cliente]</strong> {medio || "..."}{" "}
        <strong>[$Monto]</strong>. {cierre || "..."}
      </div>
    </div>
  );
}
