// frontend/src/hooks/useObtenerQR.js
import { useState } from "react";

export function useObtenerQR() {
  const [estado, setEstado] = useState("disconnected"); // Coincide con tu backend
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
      // 1. Consultamos el estado usando los nombres correctos
      const resStatus = await fetch(`${API_URL}/status`);
      const dataStatus = await resStatus.json();

      // Sincronizamos con la propiedad '.status' del backend
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

      // 2. Si el estado es "qr", pegamos al endpoint correcto del backend ('/qr')
      const res = await fetch(`${API_URL}/qr`);
      const data = await res.json();

      if (!data.qr) {
        setQrMsg(
          "WhatsApp todavía no generó el código. Esperá unos segundos y reintentá.",
        );
        return;
      }

      setQrMsg("¡Listo! Escaneá este código:");
      setQrCode(data.qr); // data.qr contiene el string base64 o la url de la imagen
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
