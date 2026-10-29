import { Component } from "react";

// Si algo falla al renderizar, en vez de dejar la pantalla en blanco se muestra un aviso
// con un botón para recargar.
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        translate="no"
        style={{
          maxWidth: 420,
          margin: "20vh auto 0",
          padding: 24,
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2>Algo salió mal</h2>
        <p>La pantalla tuvo un error inesperado. Recargá para seguir trabajando.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Recargar
        </button>
      </div>
    );
  }
}
