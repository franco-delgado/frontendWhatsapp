// Service Worker: PWA + notificaciones push.
const ICONO = '/icon-192.png';
const BADGE = '/badge-96.png';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Chrome exige un handler de fetch para considerar la app instalable.
self.addEventListener('fetch', () => {});

// ------------------------------------------------------------------
// PUSH: llega desde el backend aunque la app esté cerrada.
// ------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Nuevo mensaje';
  const options = {
    body: data.body || '',
    icon: ICONO,
    badge: BADGE,
    tag: data.tag || 'mensaje-nuevo',
    renotify: true, // vuelve a sonar/vibrar aunque ya haya una notificación con el mismo tag
    vibrate: [200, 100, 200],
    data: { url: data.url || '/', numero: data.numero || null },
  };

  event.waitUntil(
    (async () => {
      // Si la app está abierta y a la vista, ya suena el aviso interno de la
      // bandeja: no duplicamos. (La prueba de activación se muestra siempre.)
      if (!data.siempre) {
        const ventanas = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        if (ventanas.some((v) => v.visibilityState === 'visible')) return;
      }
      await self.registration.showNotification(title, options);
    })()
  );
});

// Al tocar la notificación: abre/enfoca la app y va a esa conversación.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url, numero } = event.notification.data || {};

  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const v of ventanas) {
        if ('focus' in v) {
          await v.focus();
          if (numero) v.postMessage({ type: 'abrir-chat', numero });
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url || '/');
    })()
  );
});
