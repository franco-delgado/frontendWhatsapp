// Activa/desactiva las notificaciones push de este dispositivo.
import { useState, useEffect, useCallback } from 'react';

const API_URL =
  import.meta.env.VITE_API_URL || 'https://backend-whatsapp-docker.onrender.com';

// La clave pública VAPID viene en base64url; pushManager la necesita en bytes.
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function postJSON(ruta, cuerpo) {
  const res = await fetch(`${API_URL}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Error ${res.status}`);
  }
  return data;
}

const esIOS =
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const esAppInstalada = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true);

export function usePushNotifications() {
  const soportado =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [permiso, setPermiso] = useState(
    soportado ? Notification.permission : 'unsupported'
  );
  const [suscripto, setSuscripto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Al abrir la app: ¿este dispositivo ya está suscripto? Si sí, se reenvía la
  // suscripción al backend (upsert) por si la base se limpió o venció.
  useEffect(() => {
    if (!soportado) return;
    let cancelado = false;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        const activo = Boolean(sub) && Notification.permission === 'granted';
        if (cancelado) return;
        setSuscripto(activo);
        setPermiso(Notification.permission);
        if (activo) await postJSON('/api/push/subscribe', sub.toJSON()).catch(() => {});
      } catch (e) {
        console.error('[Push] No se pudo leer la suscripción:', e);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [soportado]);

  const activar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // requestPermission debe llamarse directo desde el toque del usuario.
      const resultado = await Notification.requestPermission();
      setPermiso(resultado);
      if (resultado !== 'granted') {
        throw new Error('No diste permiso para mostrar notificaciones.');
      }

      const reg = await navigator.serviceWorker.ready;

      const resClave = await fetch(`${API_URL}/api/push/public-key`);
      const dataClave = await resClave.json().catch(() => ({}));
      if (!resClave.ok || !dataClave.publicKey) {
        throw new Error(dataClave.error || 'El servidor no tiene push configurado.');
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(dataClave.publicKey),
        });
      }

      const json = sub.toJSON();
      await postJSON('/api/push/subscribe', json);
      setSuscripto(true);

      // Notificación de prueba: confirma que todo funciona y que suena.
      postJSON('/api/push/test', { endpoint: json.endpoint }).catch(() => {});
    } catch (e) {
      console.error('[Push] Error al activar:', e);
      setError(e.message || 'No se pudieron activar las notificaciones.');
      setSuscripto(false);
    } finally {
      setCargando(false);
    }
  }, []);

  const desactivar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await postJSON('/api/push/unsubscribe', { endpoint }).catch(() => {});
      }
      setSuscripto(false);
    } catch (e) {
      console.error('[Push] Error al desactivar:', e);
      setError(e.message || 'No se pudieron desactivar las notificaciones.');
    } finally {
      setCargando(false);
    }
  }, []);

  return {
    soportado,
    permiso, // 'default' | 'granted' | 'denied' | 'unsupported'
    suscripto,
    cargando,
    error,
    activar,
    desactivar,
    // iPhone/iPad: solo funciona con la app agregada a la pantalla de inicio.
    requiereInstalarEnIOS: esIOS && !esAppInstalada(),
  };
}
