import { useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';

export function CambiarPassword() {
  const { actualizarToken } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [mensaje, setMensaje] = useState(null); // { ok, texto }
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (nueva !== repetir) {
      setMensaje({ ok: false, texto: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await apiFetch('/api/auth/cambiar-password', {
        method: 'POST',
        body: JSON.stringify({ actual, nueva }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo cambiar la contraseña.');
      actualizarToken(data.token);
      setActual('');
      setNueva('');
      setRepetir('');
      setMensaje({ ok: true, texto: '✅ Contraseña actualizada.' });
    } catch (err) {
      setMensaje({ ok: false, texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const campo = { padding: 10, fontSize: 15, border: '1px solid #ccc', borderRadius: 8 };

  return (
    <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
      <h3 style={{ margin: 0 }}>🔑 Cambiar contraseña</h3>
      <input style={campo} type="password" placeholder="Contraseña actual" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
      <input style={campo} type="password" placeholder="Contraseña nueva (mín. 6)" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
      <input style={campo} type="password" placeholder="Repetir contraseña nueva" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />
      {mensaje && <small style={{ color: mensaje.ok ? '#2563eb' : '#b42318' }}>{mensaje.texto}</small>}
      <button type="submit" className="button-primary" disabled={guardando || !actual || !nueva || !repetir}>
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  );
}
