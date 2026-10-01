// La agenda de contactos vive en localStorage. Se guarda con una clave por
// usuario, así dos personas que usan el mismo navegador no comparten agenda.
import { leerSesion } from './api';

export function claveContactos() {
  const id = leerSesion()?.usuario?.id;
  return id ? `contactos_whatsapp_${id}` : 'contactos_whatsapp';
}

// La agenda que ya tenías guardada (clave vieja) pasa al administrador una sola vez.
export function migrarContactosLegacy(usuario) {
  try {
    if (usuario?.role !== 'admin') return;
    const nueva = `contactos_whatsapp_${usuario.id}`;
    const vieja = localStorage.getItem('contactos_whatsapp');
    if (vieja !== null && localStorage.getItem(nueva) === null) {
      localStorage.setItem(nueva, vieja);
    }
  } catch (e) {
    console.error('No se pudo migrar la agenda de contactos:', e);
  }
}
