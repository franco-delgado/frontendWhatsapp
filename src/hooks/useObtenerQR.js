// frontend/src/hooks/useObtenerQR.js
import { useState } from "react";

export function useObtenerQR() {
  const [estado, setEstado] = useState("disconnected");
  const [qrCode, setQrCode] = useState("");
  const [qrMsg, setQrMsg] = useState("");
  const [cargando, setCargando] = useState(false);

  // Detecta automáticamente si estás en local o en producción 🚀
  const API_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://backend-whatsapp-docker.onrender.com";

  const obtenerQR = async () => {
    setCargando(true);
    setQrCode("");
    setQrMsg("Consultando código en el servidor...");

    try {
      // 1. Consultamos el estado general del backend
      const resStatus = await fetch(`${API_URL}/status`);
      const dataStatus = await resStatus.json();

      // Sincronizamos usando '.estado' tal cual viene de tu backend en Render
      setEstado(dataStatus.estado);

      // 2. Evaluamos según los strings reales de tu backend
      if (dataStatus.estado === "CONECTADO" || dataStatus.connected === true) {
        setQrMsg("¡WhatsApp ya está conectado de forma exitosa!");
        setCargando(false);
        return;
      }

      if (dataStatus.estado === "ESPERANDO_QR" && dataStatus.qr) {
        setQrMsg("¡Listo! Escaneá este código:");
        setQrCode(dataStatus.qr); // Asigna la URL de api.qrserver.com directamente
      } else {
        setQrMsg(
          "El servidor se está iniciando o WhatsApp aún no generó el código. Esperá un momento y reintentá.",
        );
      }
    } catch (err) {
      console.error(err);
      setQrMsg("Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return {
    obtenerQR,
    cargando,
    estado,
    setEstado,
    qrCode,
    qrMsg,
  };
}
