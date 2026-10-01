import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, leerSesion, guardarSesion, borrarSesion } from './api';
import { migrarContactosLegacy } from './contactosStorage';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  // Arranca con la sesión guardada (la app abre al instante, también sin conexión)
  // y se verifica con el servidor en segundo plano.
  const [usuario, setUsuario] = useState(() => leerSesion()?.usuario || null);

  useEffect(() => {
    const sesion = leerSesion();
    if (!sesion?.token) return;
    apiFetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) return; // 401 ya cierra la sesión desde apiFetch
        const data = await res.json();
        guardarSesion({ ...sesion, usuario: data.usuario });
        migrarContactosLegacy(data.usuario);
        setUsuario(data.usuario);
      })
      .catch(() => {}); // sin conexión: se sigue con lo guardado
  }, []);

  useEffect(() => {
    const alVencer = () => setUsuario(null);
    window.addEventListener('wa:sesion-expirada', alVencer);
    return () => window.removeEventListener('wa:sesion-expirada', alVencer);
  }, []);

  const login = useCallback(async (nombre, password) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario: nombre, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo iniciar sesión.');
    guardarSesion({ token: data.token, usuario: data.usuario });
    migrarContactosLegacy(data.usuario);
    setUsuario(data.usuario);
  }, []);

  const logout = useCallback(async () => {
    // Este dispositivo deja de recibir las notificaciones del usuario que sale.
    // (Si el próximo usuario activa las suyas, el dispositivo se le reasigna.)
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        await apiFetch('/api/push/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
    } catch {
      /* no bloquea el cierre de sesión */
    }
    borrarSesion();
    setUsuario(null);
  }, []);

  // Tras cambiar la contraseña el servidor devuelve un token nuevo.
  const actualizarToken = useCallback((token) => {
    const s = leerSesion();
    if (s) guardarSesion({ ...s, token });
  }, []);

  return (
    <AuthCtx.Provider value={{ usuario, login, logout, actualizarToken }}>
      {children}
    </AuthCtx.Provider>
  );
}
