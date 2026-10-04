import { useState } from 'react';
import { useAuth } from '../AuthContext';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !password) return;
    setCargando(true);
    setError('');
    try {
      await login(nombre.trim(), password);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-form login-card" onSubmit={enviar}>
        <h1>💬 Panel WhatsApp</h1>
        <p className="login-sub">Ingresá con tu usuario</p>

        <input
          type="text"
          placeholder="Usuario"
          autoComplete="username"
          autoCapitalize="none"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          disabled={cargando}
        />
        <input
          type="password"
          placeholder="Contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={cargando}
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="button-primary" disabled={cargando || !nombre.trim() || !password}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
        {cargando && (
          <small className="login-sub">
            Si el servidor estaba dormido, la primera vez puede tardar hasta un minuto.
          </small>
        )}
      </form>
    </div>
  );
}
