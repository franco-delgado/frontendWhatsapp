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
      : "https://backend-whatsapp-docker.onrender.com/api/mensajes";


  return {
    cargando,
    estado,
    setEstado,
    qrCode,
    qrMsg,
  };
}
