import React, { useState, useEffect } from 'react';

export const BotonInstalar = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mostrarBoton, setMostrarBoton] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Capturamos el evento de instalación para dispararlo manualmente
      e.preventDefault();
      setDeferredPrompt(e);
      setMostrarBoton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstalarClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('App instalada correctamente');
    }
    
    setDeferredPrompt(null);
    setMostrarBoton(false);
  };

  if (!mostrarBoton) return null;

  return (
    <button
      onClick={handleInstalarClick}
      style={{
        backgroundColor: '#2563eb', // Azul
        color: '#fff',
        padding: '7px 12px',
        borderRadius: '999px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        border: '1px solid rgba(255,255,255,0.6)'
      }}
    >
      📲 Instalar
    </button>
  );
};