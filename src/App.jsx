// src/App.jsx
import { useState } from "react";
import { useObtenerQR } from "./hooks/useObtenerQR";
import Invitar from "./invitar/Invitar"; // Ajustado a tu estructura de carpetas
import Contactos from "./contactos/Contactos.jsx";
import Cobrar from "./cobrar/Cobrar";
import "./App.css";

function App() {
  const { obtenerQR, cargando, estado, qrCode, qrMsg } = useObtenerQR();

  // Estado para controlar qué sección está activa en pantalla
  // Valores posibles: "inicio", "cobrar", "invitar", "contactos"
  const [seccionActiva, setSeccionActiva] = useState("inicio");

  return (
    <div className="container">
      {/* BOTÓN VOLVER ATRÁS (Solo se muestra si NO estás en el inicio) */}
      {seccionActiva !== "inicio" && (
        <button
          className="button-action"
          style={{
            width: "auto",
            padding: "6px 12px",
            fontSize: "14px",
            float: "left",
            marginBottom: "10px",
          }}
          onClick={() => setSeccionActiva("inicio")}
        >
          ⬅️ Volver
        </button>
      )}

      {/* Limpiamos el flotado del botón volver para que el título no se deskompagine */}
      <div style={{ clear: "both" }}></div>

      <h1
        className="title"
        style={{ cursor: "pointer" }}
        onClick={() => setSeccionActiva("inicio")}
      >
        Panel de Control WhatsApp
      </h1>

      {/* SECCIÓN DEL QR (Se muestra siempre arriba en la home) */}
      {seccionActiva === "inicio" && (
        <div className="qr-section">
          <button
            onClick={obtenerQR}
            disabled={cargando}
            className="button-primary"
          >
            {cargando ? "Conectando..." : "Obtener Código QR"}
          </button>

          <p className="status-text">
            Estado del servidor: <span className="badge">{estado}</span>
          </p>

          <p className="msg-text">{qrMsg}</p>

          {qrCode && (
            <div className="qr-container">
              <img src={qrCode} alt="Código QR WhatsApp" className="qr-image" />
            </div>
          )}
        </div>
      )}

      {/* RENDERIZADO CONDICIONAL DE SECCIONES */}
      {seccionActiva === "cobrar" && (
        <div>
          <Cobrar />
        </div>
      )}

      {seccionActiva === "invitar" && (
        <div>
          <Invitar />
        </div>
      )}

      {seccionActiva === "contactos" && (
        <div>
          <Contactos />
        </div>
      )}

      <hr className="divider" />

      {/* SECCIÓN DE BOTONES DE NAVEGACIÓN */}
      <div className="actions-section">
        <button
          onClick={() => setSeccionActiva("cobrar")}
          className={`button-action ${seccionActiva === "cobrar" ? "active" : ""}`}
        >
          💰 Cobrar
        </button>

        <button
          onClick={() => setSeccionActiva("invitar")}
          className={`button-action ${seccionActiva === "invitar" ? "active" : ""}`}
        >
          📩 Invitar
        </button>

        <button
          onClick={() => setSeccionActiva("contactos")}
          className={`button-action ${seccionActiva === "contactos" ? "active" : ""}`}
        >
          👤 Contactos
        </button>
      </div>
    </div>
  );
}

export default App;
