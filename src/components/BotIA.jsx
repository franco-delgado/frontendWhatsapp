import { useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';

// Interruptor del bot de IA del usuario conectado.
// - Cada usuario enciende/apaga el suyo.
// - Si el administrador se lo bloqueó (ia_permitida = false), no puede encenderlo.
export function BotIA() {
  const { usuario, actualizarUsuario } = useAuth();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  const permitido = usuario.ia_permitida !== false;
  const activo = Boolean(usuario.ia_activa) && permitido;

  const cambiar = async () => {
    setOcupado(true);
    setError('');
    try {
      const res = await apiFetch('/api/ia/mi-estado', {
        method: 'PATCH',
        body: JSON.stringify({ ia_activa: !activo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Error ${res.status}`);
      actualizarUsuario(data.usuario);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div style={{ padding: '0 15px 10px' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: '8px 12px',
        }}
      >
        <span>
          🤖 <strong>Bot de IA:</strong>{' '}
          <span style={{ color: activo ? '#2e7d32' : '#666' }}>
            {!permitido ? 'bloqueado por el administrador' : activo ? 'activado' : 'desactivado'}
          </span>
          <br />
          <small style={{ color: '#666' }}>
            {activo
              ? 'Responde solo a los mensajes de tus clientes.'
              : permitido
              ? 'No responde: contestás vos.'
              : 'Pedile al administrador que te lo habilite.'}
          </small>
        </span>
        <button
          onClick={cambiar}
          disabled={ocupado || !permitido}
          className="button-action-volver"
          style={{ float: 'none', margin: 0, whiteSpace: 'nowrap' }}
        >
          {ocupado ? '…' : activo ? 'Apagar' : 'Encender'}
        </button>
      </div>
      {error && <p style={{ color: '#b42318', margin: '6px 0 0', fontSize: 14 }}>{error}</p>}
    </div>
  );
}
