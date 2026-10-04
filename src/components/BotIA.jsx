import { useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import './BotIA.css';

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

  const ayuda = activo
    ? 'Responde solo a los mensajes de tus clientes.'
    : permitido
    ? 'No responde: contestás vos.'
    : 'Pedile al administrador que te lo habilite.';

  return (
    <div className="bot-ia" title={ayuda}>
      <span className="bot-ia-texto">
        🤖 <strong>Bot IA</strong>{' '}
        <span className={`bot-ia-estado ${activo ? 'on' : ''}`}>
          {!permitido ? 'bloqueado' : activo ? 'activado' : 'apagado'}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        aria-label={activo ? 'Apagar bot de IA' : 'Encender bot de IA'}
        onClick={cambiar}
        disabled={ocupado || !permitido}
        className={`bot-ia-switch ${activo ? 'on' : ''}`}
      >
        <span className="bot-ia-bolita" />
      </button>
      {error && <small className="bot-ia-error">{error}</small>}
    </div>
  );
}
