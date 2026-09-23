import React from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export const BotonNotificaciones = () => {
  const {
    soportado,
    permiso,
    suscripto,
    cargando,
    error,
    activar,
    desactivar,
    requiereInstalarEnIOS,
  } = usePushNotifications();

  const estiloBase = {
    padding: '6px 12px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    cursor: 'pointer',
    color: '#fff',
    fontWeight: 'bold',
    transition: 'background-color 0.2s ease',
  };

  let texto;
  let color;
  let alHacerClick;

  if (!soportado) {
    texto = '🔕 Notificaciones no disponibles';
    color = '#adb5bd';
    alHacerClick = () =>
      alert(
        requiereInstalarEnIOS
          ? 'En iPhone/iPad las notificaciones solo funcionan con la app instalada.\n\n' +
              'Tocá el botón Compartir de Safari → "Agregar a pantalla de inicio", ' +
              'abrí la app desde ese ícono y activá las notificaciones desde ahí. ' +
              '(Requiere iOS 16.4 o superior).'
          : 'Este navegador no permite notificaciones push. Probá con Chrome, Edge o Firefox actualizados.'
      );
  } else if (permiso === 'denied') {
    texto = '🚫 Notificaciones bloqueadas';
    color = '#dc3545';
    alHacerClick = () =>
      alert(
        'Bloqueaste las notificaciones para este sitio.\n\n' +
          'Para habilitarlas: tocá el candado (o los ⋮) junto a la dirección → ' +
          'Configuración del sitio → Notificaciones → Permitir. ' +
          'Después recargá la página y volvé a tocar este botón.\n\n' +
          'Si instalaste la app: Ajustes del celular → Apps → esta app → Notificaciones.'
      );
  } else if (suscripto) {
    texto = '🔔 Notificaciones activadas';
    color = '#28a745';
    alHacerClick = desactivar;
  } else {
    texto = '🔕 Activar notificaciones';
    color = '#6c757d';
    alHacerClick = activar;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button
        onClick={alHacerClick}
        disabled={cargando}
        style={{
          ...estiloBase,
          backgroundColor: color,
          opacity: cargando ? 0.6 : 1,
          cursor: cargando ? 'wait' : 'pointer',
        }}
        title={
          suscripto
            ? 'Tocá para dejar de recibir avisos fuera de la app'
            : 'Recibí un aviso con sonido cuando llegue un mensaje, aunque la app esté cerrada'
        }
      >
        {cargando ? 'Procesando…' : texto}
      </button>
      {error && (
        <small style={{ color: '#dc3545', maxWidth: '260px', textAlign: 'right' }}>{error}</small>
      )}
    </div>
  );
};
