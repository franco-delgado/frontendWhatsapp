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

      // Sincronizamos usando '.status' que es la propiedad real de tu backend
      const statusActual = dataStatus.status || "disconnected";
      setEstado(statusActual);

      // 2. Evaluamos según los strings reales de tu backend en Render
      if (statusActual === "connected") {
        setQrMsg("¡WhatsApp ya está conectado de forma exitosa!");
        setCargando(false);
        return;
      }

      if (statusActual === "qr") {
        // Buscamos la imagen QR directamente desde el endpoint del backend
        setQrMsg("¡Listo! Escaneá este código:");
        setQrCode(`${API_URL}/qr/image`);
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
