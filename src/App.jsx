// src/App.jsx
import { useState, useEffect, useCallback } from "react";
import Invitar from "./invitar/Invitar.jsx";
import Contactos from "./contactos/Contactos.jsx";
import Cobrar from "./cobrar/Cobrar";
import Login from "./login/Login.jsx";
import Usuarios from "./admin/Usuarios.jsx";
import { BandejaEntrada } from './components/BandejaEntrada';
import { CambiarPassword } from './components/CambiarPassword.jsx';
import { BotIA } from './components/BotIA.jsx';
import { useAuth } from "./AuthContext.jsx";
import { apiFetch } from "./api.js";
import "./App.css";
import { BotonInstalar } from './components/BotonInstalar.jsx';

function Panel() {
  const { usuario, logout } = useAuth();
  const esAdmin = usuario.role === "admin";

  // Sección activa: "inicio" (chats), "cobrar", "invitar", "contactos", "usuarios", "clave"
  const [seccionActiva, setSeccionActiva] = useState("inicio");

  // Lo informa la bandeja: en el celular, con un chat abierto se oculta el resto del menú.
  const [chatAbierto, setChatAbierto] = useState(false);

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

  const pestanas = [
    { id: "inicio", icono: "💬", texto: "Chats" },
    { id: "cobrar", icono: "💰", texto: "Cobrar" },
    { id: "invitar", icono: "📩", texto: "Invitar" },
    { id: "contactos", icono: "👤", texto: "Contactos" },
    ...(esAdmin ? [{ id: "usuarios", icono: "👥", texto: "Usuarios" }] : []),
  ];

  const enInicio = seccionActiva === "inicio";

  return (
    <div className={`app-shell ${chatAbierto && enInicio ? "chat-abierto" : ""}`}>
      <header className="app-header">
        <div className="app-brand">
          <span>💬</span>
          <span>Panel WhatsApp</span>
        </div>

        {/* Pestañas: solo en pantallas anchas */}
        <nav className="app-tabs">
          {pestanas.map((p) => (
            <button
              key={p.id}
              onClick={() => setSeccionActiva(p.id)}
              className={`app-tab ${seccionActiva === p.id ? "activo" : ""}`}
            >
              <span>{p.icono}</span> {p.texto}
            </button>
          ))}
        </nav>

        <div className="app-actions">
          <BotIA />
          <BotonInstalar />
          <span className="app-user" title={esAdmin ? "Administrador" : "Usuario"}>
            {esAdmin ? "👑" : "👤"}
            <strong className="app-user-nombre">{usuario.username}</strong>
            {esAdmin && <small>(administrador)</small>}
          </span>
          <button className="app-hbtn" onClick={() => setSeccionActiva("clave")}>🔑 Clave</button>
          <button className="app-hbtn" onClick={logout}>Salir</button>
        </div>
      </header>

      {/* Solo administrador: elegir de quién ver la bandeja */}
      {esAdmin && usuarios.length > 1 && (
        <div className="app-toolbar">
          <label htmlFor="visor">👁️ Ver bandeja de:</label>
          <select
            id="visor"
            value={viendoTodos ? "todos" : usuarioVisto ? usuarioVisto.id : ""}
            onChange={(e) => setUsuarioVistoId(e.target.value || null)}
          >
            <option value="">Mi bandeja</option>
            <option value="todos">👥 Todos los usuarios</option>
            {usuarios.filter((u) => u.id !== usuario.id).map((u) => (
              <option key={u.id} value={u.id}>{u.username}{u.activo ? "" : " (desactivado)"}</option>
            ))}
          </select>

          {/* Mirando la bandeja de otro usuario: solo lectura */}
          {(usuarioVisto || viendoTodos) && (
            <span className="solo-lectura">
              Viendo {viendoTodos ? <strong>las bandejas de todos</strong> : <>la bandeja de <strong>{usuarioVisto.username}</strong></>} (solo lectura)
              <button onClick={() => setUsuarioVistoId(null)}>Volver a la mía</button>
            </span>
          )}
        </div>
      )}

      <main className="app-main">
        {/* Secciones: reemplazan a la bandeja mientras están abiertas */}
        {!enInicio && (
          <div className="app-section">
            <div className="app-section-inner">
              {seccionActiva === "cobrar" && <Cobrar />}
              {seccionActiva === "invitar" && <Invitar />}
              {seccionActiva === "contactos" && <Contactos />}
              {seccionActiva === "clave" && <CambiarPassword />}
              {esAdmin && seccionActiva === "usuarios" && (
                <Usuarios
                  usuarios={usuarios}
                  recargar={recargarUsuarios}
                  onVer={(id) => {
                    setUsuarioVistoId(id);
                    setSeccionActiva("inicio");
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* La bandeja queda siempre montada (solo se oculta): sigue recibiendo mensajes,
            avisando con sonido y recordando el chat abierto aunque cambies de sección.
            key: al cambiar de usuario se reinicia la bandeja y no se mezclan datos. */}
        <div className={`app-inbox-slot ${enInicio ? "" : "oculto"}`}>
          <BandejaEntrada
            key={viendoTodos ? "todos" : usuarioVisto ? usuarioVisto.id : "propia"}
            usuarioVistoId={viendoTodos ? "todos" : usuarioVisto ? usuarioVisto.id : null}
            soloLectura={viendoTodos || Boolean(usuarioVisto)}
            esAdmin={esAdmin}
            usuarios={usuarios}
            alCambiarChatAbierto={setChatAbierto}
          />
        </div>
      </main>

      {/* Navegación inferior: solo en celular */}
      <nav className="app-bottom-nav">
        {pestanas.map((p) => (
          <button
            key={p.id}
            onClick={() => setSeccionActiva(p.id)}
            className={`app-bottom-btn ${seccionActiva === p.id ? "activo" : ""}`}
          >
            <span className="icono">{p.icono}</span>
            {p.texto}
          </button>
        ))}
      </nav>
    </div>
  );
}

function App() {
  const { usuario } = useAuth();
  // key por usuario: si sale uno y entra otro, nada del estado anterior sobrevive.
  return usuario ? <Panel key={usuario.id} /> : <Login />;
}

export default App;
