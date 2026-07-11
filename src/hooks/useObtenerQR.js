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

      // Sincronizamos el estado con la propiedad '.status' que devuelve tu Node
      setEstado(dataStatus.status);

      if (dataStatus.status === "connecting") {
        setQrMsg(
          "El servidor está iniciando el navegador (Puppeteer). Esperá un momento...",
        );
        setCargando(false);
        return;
      }

      if (dataStatus.status === "connected") {
        setQrMsg("¡WhatsApp ya está conectado de forma exitosa!");
        setCargando(false);
        return;
      }

      // 2. Si el estado es "qr", procesamos la propiedad '.qr' que viene en el mismo JSON
      if (dataStatus.status === "qr" && dataStatus.qr) {
        setQrMsg("¡Listo! Escaneá este código:");
        setQrCode(dataStatus.qr); // Contiene el string base64 o url de la imagen
      } else {
        setQrMsg(
          "WhatsApp todavía no generó el código. Esperá unos segundos y reintentá.",
        );
      }
    } catch (err) {
      console.error(err);
      setQrMsg("Error al conectar con el servidor.");
    } finally {
      setCargando(false); // <-- Línea 56 corregida e impecable
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
