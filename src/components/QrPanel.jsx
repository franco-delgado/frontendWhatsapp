import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, Rocket } from "lucide-react";

export default function QrPanel() {
  const [estado, setEstado] = useState("INICIALIZANDO"); // Cambiado a string para manejar los 3 estados reales
  const [qrCode, setQrCode] = useState("");
  const [qrMsg, setQrMsg] = useState("");
  const [cargando, setCargando] = useState(false); // Evita el spam de clicks

  const chequearEstado = async () => {
    try {
      const res = await fetch("http://localhost:3000/status");
      const data = await res.json();

      // Guardamos el estado del texto directo ("CONECTADO", "ESPERANDO_QR", "INICIALIZANDO")
      setEstado(data.estado);

      if (data.estado === "CONECTADO") {
        setQrCode("");
        setQrMsg("");
      }
    } catch (err) {
      console.error("Error al conectar con el backend", err);
      setEstado("DESCONECTADO");
    }
  };

  /*
  const obtenerQR = async () => {
    setCargando(true);
    setQrCode("");
    setQrMsg("Consultando código en el servidor...");

    try {
      // Primero actualizamos el estado general
      const resStatus = await fetch("http://localhost:3000/status");
      const dataStatus = await resStatus.json();
      setEstado(dataStatus.estado);

      if (dataStatus.estado === "INICIALIZANDO") {
        setQrMsg(
          "El servidor está iniciando Puppeteer. Esperá a que cambie el estado arriba.",
        );
        setCargando(false);
        return;
      }

      if (dataStatus.estado === "CONECTADO") {
        setQrMsg("¡WhatsApp ya está conectado de forma exitosa!");
        setCargando(false);
        return;
      }

      // Si efectivamente está esperando el QR, lo traemos
      const res = await fetch("http://localhost:3000/qr-code");
      const data = await res.json();

      if (!data.qr) {
        setQrMsg(
          "WhatsApp todavía no generó el string del código. Esperá unos segundos.",
        );
        return;
      }

      setQrMsg("¡Listo! Escaneá este código:");
      setQrCode(data.qr);
    } catch (err) {
      setQrMsg("Error al obtener el QR.");
    } finally {
      setCargando(false);
    }
  };
  */

  const enviarMensajes = async () => {
    if (estado !== "CONECTADO") {
      alert("No podés enviar mensajes si el sistema no está conectado.");
      return;
    }

    alert("Iniciando proceso de envío masivo. Seguilo en la consola.");
    try {
      const res = await fetch("http://localhost:3000/enviar-mensajes", {
        method: "POST",
      });
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      alert("Error al enviar mensajes.");
    }
  };

  useEffect(() => {
    chequearEstado();
    const interval = setInterval(chequearEstado, 5000); // Polling cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  // Función auxiliar para renderizar el texto y color del badge de estado
  const renderInfoEstado = () => {
    switch (estado) {
      case "CONECTADO":
        return { texto: "CONECTADO ✅", color: "#25D366" };
      case "INICIALIZANDO":
        return { texto: "INICIALIZANDO SERVIDOR ⏳", color: "#f39c12" };
      case "ESPERANDO_QR":
        return { texto: "ESPERANDO ESCANEO QR 📲", color: "#3498db" };
      default:
        return { texto: "DESCONECTADO ❌", color: "#e74c3c" };
    }
  };

  const infoEstado = renderInfoEstado();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="card">
        <h3>
          Estado de WhatsApp:{" "}
          <span style={{ color: infoEstado.color }}>{infoEstado.texto}</span>
        </h3>

        {/* CARTEL INFORMATIVO SI EL SERVIDOR SE ESTÁ DESPERTANDO */}
        {estado === "INICIALIZANDO" && (
          <div
            style={{
              marginTop: "15px",
              background: "#fff9e6",
              borderLeft: "4px solid #f39c12",
              padding: "10px 15px",
              borderRadius: "4px",
              color: "#664d03",
              fontSize: "14px",
            }}
          >
            ℹ️{" "}
            <strong>
              El servidor está levantando el navegador en segundo plano.
            </strong>{" "}
            No hace falta que actualices la página, el QR estará disponible
            automáticamente en unos segundos.
          </div>
        )}
      </div>

      {(qrCode || qrMsg) && (
        <div
          id="qr-container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {estado !== "CONECTADO" && qrCode && (
            <QRCodeSVG
              value={qrCode}
              size={250}
              includeMargin={true}
              style={{ border: "4px solid white", borderRadius: "8px" }}
            />
          )}
          <p
            id="qr-mensaje"
            style={{ fontWeight: "bold", marginTop: "10px", color: "#fff" }}
          >
            {qrMsg}
          </p>
        </div>
      )}
    </div>
  );
}
