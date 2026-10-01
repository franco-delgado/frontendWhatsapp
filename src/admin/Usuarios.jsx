import { useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import './Usuarios.css';

const VACIO = { username: '', password: '', phone_number_id: '', meta_access_token: '', ia_activa: false, ia_permitida: true, role: 'user' };

async function llamar(ruta, metodo, cuerpo) {
  const res = await apiFetch(ruta, { method: metodo, body: JSON.stringify(cuerpo) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function FilaUsuario({ u, esYo, alGuardar, alVer }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ password: '', phone_number_id: u.phone_number_id || '', meta_access_token: '', ia_activa: u.ia_activa, ia_permitida: u.ia_permitida !== false });
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [eliminando, setEliminando] = useState(false); // muestra la confirmación de borrado

  const eliminar = async (mensajes) => {
    setOcupado(true);
    setError('');
    try {
      const res = await apiFetch(`/api/admin/usuarios/${u.id}?mensajes=${mensajes}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Error ${res.status}`);
      await alGuardar(); // recarga la lista (esta fila desaparece)
    } catch (e) {
      setError(e.message);
      setOcupado(false);
    }
  };

  const guardar = async (cambios) => {
    setOcupado(true);
    setError('');
    try {
      await llamar(`/api/admin/usuarios/${u.id}`, 'PATCH', cambios);
      await alGuardar();
      setEditando(false);
      setForm((f) => ({ ...f, password: '', meta_access_token: '' }));
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  };

  const guardarEdicion = (e) => {
    e.preventDefault();
    const cambios = { phone_number_id: form.phone_number_id, ia_activa: form.ia_activa && form.ia_permitida, ia_permitida: form.ia_permitida };
    if (form.password) cambios.password = form.password;
    if (form.meta_access_token) cambios.meta_access_token = form.meta_access_token;
    guardar(cambios);
  };

  return (
    <div className={`usr-card ${u.activo ? '' : 'usr-inactivo'}`}>
      <div className="usr-top">
        <strong>
          {u.role === 'admin' ? '👑' : '👤'} {u.username}
          {esYo && <small> (vos)</small>}
        </strong>
        <span className="usr-badges">
          {!u.activo && <span className="usr-badge usr-rojo">Desactivado</span>}
          {u.ia_permitida === false
            ? <span className="usr-badge usr-rojo">🔒 Bot bloqueado</span>
            : u.ia_activa && <span className="usr-badge">🤖 Bot activo</span>}
        </span>
      </div>
      <small className="usr-detalle">
        {u.usa_numero_compartido
          ? '📞 Usa el número compartido del servidor'
          : `📞 Número propio (ID): ${u.phone_number_id}`}
      </small>

      <div className="usr-acciones">
        {!esYo && <button onClick={() => alVer(u.id)}>👁️ Ver bandeja</button>}
        <button onClick={() => setEditando((v) => !v)}>{editando ? 'Cerrar' : '✏️ Editar'}</button>
        {!esYo && (
          <button onClick={() => guardar({ activo: !u.activo })} disabled={ocupado}>
            {u.activo ? '⛔ Desactivar' : '✅ Activar'}
          </button>
        )}
        {u.ia_permitida !== false && (
          <button onClick={() => guardar({ ia_activa: !u.ia_activa })} disabled={ocupado}>
            {u.ia_activa ? '🤖 Apagar bot' : '🤖 Encender bot'}
          </button>
        )}
        <button onClick={() => guardar({ ia_permitida: u.ia_permitida === false })} disabled={ocupado}>
          {u.ia_permitida === false ? '🔓 Permitir bot' : '🔒 Bloquear bot'}
        </button>
        {!esYo && (
          <button className="usr-peligro" onClick={() => setEliminando((v) => !v)} disabled={ocupado}>
            🗑️ Eliminar
          </button>
        )}
      </div>

      {eliminando && (
        <div className="usr-confirmar">
          <strong>¿Eliminar a «{u.username}»?</strong>
          <small>
            Se borran su acceso, sus dispositivos de notificaciones y sus pausas del bot. No se puede deshacer.
            ¿Qué hacemos con sus mensajes y contactos?
          </small>
          <button onClick={() => eliminar('transferir')} disabled={ocupado}>
            📥 Eliminar y pasar sus mensajes a mi bandeja
          </button>
          <button className="usr-peligro" onClick={() => eliminar('borrar')} disabled={ocupado}>
            🗑️ Eliminar también todos sus mensajes
          </button>
          <button onClick={() => setEliminando(false)} disabled={ocupado}>Cancelar</button>
        </div>
      )}

      {editando && (
        <form className="usr-form" onSubmit={guardarEdicion}>
          <input type="password" placeholder="Nueva contraseña (vacío = no cambiar)" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input type="text" inputMode="numeric" placeholder="Número propio: Phone Number ID (vacío = usa el compartido)" value={form.phone_number_id} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })} />
          <input type="password" placeholder={u.tiene_token ? 'Token propio cargado (vacío = no cambiar)' : 'Token de Meta propio (opcional)'} autoComplete="off" value={form.meta_access_token} onChange={(e) => setForm({ ...form, meta_access_token: e.target.value })} />
          <label className="usr-check">
            <input type="checkbox" checked={form.ia_permitida} onChange={(e) => setForm({ ...form, ia_permitida: e.target.checked, ia_activa: e.target.checked ? form.ia_activa : false })} />
            Puede usar el bot (si lo desmarcás, queda bloqueado)
          </label>
          <label className="usr-check">
            <input type="checkbox" checked={form.ia_activa && form.ia_permitida} disabled={!form.ia_permitida} onChange={(e) => setForm({ ...form, ia_activa: e.target.checked })} />
            Bot de IA responde automáticamente ahora
          </label>
          <button type="submit" className="button-primary" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar cambios'}</button>
        </form>
      )}
      {error && <p className="usr-error">{error}</p>}
    </div>
  );
}

export default function Usuarios({ usuarios, recargar, onVer }) {
  const { usuario: yo } = useAuth();
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [creando, setCreando] = useState(false);

  const crear = async (e) => {
    e.preventDefault();
    setCreando(true);
    setError('');
    setOk('');
    try {
      const cuerpo = { ...form };
      if (!cuerpo.meta_access_token) delete cuerpo.meta_access_token;
      await llamar('/api/admin/usuarios', 'POST', cuerpo);
      setOk(`✅ Usuario "${form.username}" creado.`);
      setForm(VACIO);
      await recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="usr-panel">
      <h3>👥 Usuarios</h3>

      <form className="usr-form usr-nuevo" onSubmit={crear}>
        <strong>➕ Agregar usuario</strong>
        <input type="text" placeholder="Nombre de usuario" autoCapitalize="none" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input type="password" placeholder="Contraseña (mín. 6)" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input type="text" inputMode="numeric" placeholder="Número propio: Phone Number ID (vacío = usa el compartido)" value={form.phone_number_id} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })} />
        <input type="password" placeholder="Token de Meta propio (opcional)" autoComplete="off" value={form.meta_access_token} onChange={(e) => setForm({ ...form, meta_access_token: e.target.value })} />
        <label className="usr-check">
          <input type="checkbox" checked={form.ia_permitida} onChange={(e) => setForm({ ...form, ia_permitida: e.target.checked, ia_activa: e.target.checked ? form.ia_activa : false })} />
          Puede usar el bot (lo enciende/apaga él mismo)
        </label>
        <label className="usr-check">
          <input type="checkbox" checked={form.ia_activa && form.ia_permitida} disabled={!form.ia_permitida} onChange={(e) => setForm({ ...form, ia_activa: e.target.checked })} />
          Bot encendido desde el inicio
        </label>
        <label className="usr-check">
          <input type="checkbox" checked={form.role === 'admin'} onChange={(e) => setForm({ ...form, role: e.target.checked ? 'admin' : 'user' })} />
          Es administrador
        </label>
        <button type="submit" className="button-primary" disabled={creando || !form.username || !form.password}>
          {creando ? 'Creando…' : 'Crear usuario'}
        </button>
        {error && <p className="usr-error">{error}</p>}
        {ok && <p className="usr-ok">{ok}</p>}
        <small className="usr-detalle">
          Sin número propio, el usuario usa el número compartido: ve y responde solo a sus propios
          contactos (los que le escribe primero, o los que vos le asignes desde la bandeja).
          Con número propio (Phone Number ID de Meta) tiene una línea aparte.
        </small>
      </form>

      <div className="usr-lista">
        {usuarios.map((u) => (
          <FilaUsuario key={u.id} u={u} esYo={u.id === yo.id} alGuardar={recargar} alVer={onVer} />
        ))}
      </div>
    </div>
  );
}
