// src/App.jsx
import { useState, useEffect, useCallback } from "react";
import Invitar from "./invitar/Invitar.jsx";
import Contactos from "./contactos/Contactos.jsx";
import Cobrar from "./cobrar/Cobrar";
import Login from "./login/Login.jsx";
import Usuarios from "./admin/Usuarios.jsx";
import { BandejaEntrada } from './components/BandejaEntrada';
import { CambiarPassword } from './components/CambiarPassword.jsx';
import { useAuth } from "./AuthContext.jsx";
import { apiFetch } from "./api.js";
import "./App.css";
import { BotonInstalar } from './components/BotonInstalar.jsx';

function Panel() {
  const { usuario, logout } = useAuth();
  const esAdmin = usuario.role === "admin";

  // Estado para controlar qué sección está activa en pantalla
  // Valores posibles: "inicio", "cobrar", "invitar", "contactos", "usuarios", "clave"
  const [seccionActiva, setSeccionActiva] = useState("inicio");

  // Solo administrador: lista de usuarios y cuál bandeja se está mirando.
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioVistoId, setUsuarioVistoId] = useState(null);

  const recargarUsuarios = useCallback(async () => {
    if (!esAdmin) return;
    try {
      const res = await apiFetch("/api/admin/usuarios");
      const data = await res.json();
      if (data.success) setUsuarios(data.data);
    } catch (e) {
      console.error("No se pudo cargar la lista de usuarios:", e);
    }
  }, [esAdmin]);

  useEffect(() => {
    recargarUsuarios();
  }, [recargarUsuarios]);

  // "todos" = el administrador mira las conversaciones de todos los usuarios juntas.
  const viendoTodos = esAdmin && usuarioVistoId === "todos";
  const usuarioVisto = esAdmin ? usuarios.find((u) => u.id === usuarioVistoId) || null : null;

  return (
    <div className="container">
      <div className="app-container">
        <header style={{ display: 'flex', justifyContent: 'space-between', padding: '15px' }}>
          <h1>Exclusivo Para cuenta</h1>
          {/* Renderiza el botón aquí */}
          <BotonInstalar />
        </header>

        {/* Quién está conectado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '0 15px 10px', flexWrap: 'wrap' }}>
          <span>
            {esAdmin ? '👑' : '👤'} <strong>{usuario.username}</strong>
            {esAdmin && <small style={{ color: '#666' }}> (administrador)</small>}
          </span>
          <span style={{ display: 'flex', gap: 6 }}>
            <button className="button-action-volver" style={{ float: 'none', margin: 0 }} onClick={() => setSeccionActiva("clave")}>🔑 Clave</button>
            <button className="button-action-volver" style={{ float: 'none', margin: 0 }} onClick={logout}>Salir</button>
          </span>
        </div>

        {/* Solo administrador: elegir de quién ver la bandeja */}
        {esAdmin && usuarios.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 15px 10px' }}>
            <label htmlFor="visor">👁️ Ver bandeja de:</label>
            <select
              id="visor"
              value={viendoTodos ? "todos" : usuarioVisto ? usuarioVisto.id : ""}
              onChange={(e) => setUsuarioVistoId(e.target.value || null)}
              style={{ flex: 1, padding: 8, borderRadius: 8 }}
            >
              <option value="">Mi bandeja</option>
              <option value="todos">👥 Todos los usuarios</option>
              {usuarios.filter((u) => u.id !== usuario.id).map((u) => (
                <option key={u.id} value={u.id}>{u.username}{u.activo ? "" : " (desactivado)"}</option>
              ))}
            </select>
          </div>
        )}
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

      {/* Limpiamos el flotado del botón volver para que el título no se descompagine */}
      <div style={{ clear: "both" }}></div>

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

      {seccionActiva === "clave" && (
        <div>
          <CambiarPassword />
        </div>
      )}

      {esAdmin && seccionActiva === "usuarios" && (
        <div>
          <Usuarios
            usuarios={usuarios}
            recargar={recargarUsuarios}
            onVer={(id) => {
              setUsuarioVistoId(id);
              setSeccionActiva("inicio");
            }}
          />
        </div>
      )}

      <hr className="divider" />

      {/* SECCIÓN DE BOTONES DE NAVEGACIÓN */}
      <div className="actions-section" style={{ flexWrap: 'wrap' }}>
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

        {esAdmin && (
          <button
            onClick={() => setSeccionActiva("usuarios")}
            className={`button-action ${seccionActiva === "usuarios" ? "active" : ""}`}
          >
            👥 Usuarios
          </button>
        )}
      </div>
      <hr />

      {/* Mirando la bandeja de otro usuario: solo lectura */}
      {(usuarioVisto || viendoTodos) && (
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: 10, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span>
            👁️ Viendo {viendoTodos ? <strong>las bandejas de todos los usuarios</strong> : <>la bandeja de <strong>{usuarioVisto.username}</strong></>} (solo lectura)
          </span>
          <button className="button-action-volver" style={{ float: 'none', margin: 0 }} onClick={() => setUsuarioVistoId(null)}>
            Volver a la mía
          </button>
        </div>
      )}

      {/* key: al cambiar de usuario se reinicia la bandeja y no se mezclan datos */}
      <BandejaEntrada
        key={viendoTodos ? "todos" : usuarioVisto ? usuarioVisto.id : "propia"}
        usuarioVistoId={viendoTodos ? "todos" : usuarioVisto ? usuarioVisto.id : null}
        soloLectura={viendoTodos || Boolean(usuarioVisto)}
        esAdmin={esAdmin}
        usuarios={usuarios}
      />
    </div>
  );
}

function App() {
  const { usuario } = useAuth();
  // key por usuario: si sale uno y entra otro, nada del estado anterior sobrevive.
  return usuario ? <Panel key={usuario.id} /> : <Login />;
}

export default App;
