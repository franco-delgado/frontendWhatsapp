// Punto único de acceso al backend: agrega el token de sesión a cada llamada.
export const API_URL =
  import.meta.env.VITE_API_URL || 'https://backend-whatsapp-docker.onrender.com';

const CLAVE_SESION = 'wa_sesion';

export const leerSesion = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION)) || null;
  } catch {
    return null;
  }
};
export const guardarSesion = (sesion) => localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
export const borrarSesion = () => localStorage.removeItem(CLAVE_SESION);

// Igual que fetch, pero con la URL relativa al backend ("/api/mensajes") y
// el token de la sesión. Si el servidor dice 401 (sesión vencida o usuario
// desactivado) se cierra la sesión y se vuelve al login.
export async function apiFetch(ruta, { baseUrl = API_URL, headers, ...resto } = {}) {
  const sesion = leerSesion();
  const h = { ...(resto.body ? { 'Content-Type': 'application/json' } : {}), ...headers };
  if (sesion?.token) h.Authorization = `Bearer ${sesion.token}`;

  const res = await fetch(`${baseUrl}${ruta}`, { ...resto, headers: h });
  if (res.status === 401 && sesion?.token) {
    borrarSesion();
    window.dispatchEvent(new Event('wa:sesion-expirada'));
  }
  return res;
}
