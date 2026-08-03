// src/App.jsx
import { useState } from "react";
import { useObtenerQR } from "./hooks/useObtenerQR";
import Invitar from "./invitar/Invitar.jsx"; // Ajustado a tu estructura de carpetas
import Contactos from "./contactos/Contactos.jsx";
import Cobrar from "./cobrar/Cobrar";
import { BandejaEntrada } from './components/BandejaEntrada';
import "./App.css";
import { BotonInstalar } from './components/BotonInstalar.jsx';

function App() {
  const { obtenerQR, cargando, estado, qrCode, qrMsg } = useObtenerQR();

  // Estado para controlar qué sección está activa en pantalla
  // Valores posibles: "inicio", "cobrar", "invitar", "contactos"
  const [seccionActiva, setSeccionActiva] = useState("inicio");

  return (
    <div className="container">
      <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '15px' }}>
        <h1>Exclusivo Para cuenta</h1>
        {/* Renderiza el botón aquí */}
        <BotonInstalar />
      </header>
      
      {/* Resto de tus módulos (BandejaEntrada, Cobrar, Contactos, etc.) */}
    </div>
      {/* BOTÓN VOLVER ATRÁS (Solo se muestra si NO estás en el inicio) */}
      {seccionActiva !== "inicio" && (
        <button
          className="button-action-volver"
          
          onClick={() => setSeccionActiva("inicio")}
        >
          ⬅️ Volver
        </button>
      )}

      {/* Limpiamos el flotado del botón volver para que el título no se deskompagine */}
      <div style={{ clear: "both" }}></div>

      {/* SECCIÓN DEL QR (Se muestra siempre arriba en la home) */}
      {seccionActiva === "inicio" && (
        <div className="qr-section">
         
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
      <hr />
      <BandejaEntrada />
    </div>
  );
}

export default App;
