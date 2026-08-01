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
        backgroundColor: '#25D366', // Verde estilo WhatsApp
        color: '#fff',
        padding: '10px 16px',
        border: 'none',
        borderRadius: '6px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
      }}
    >
      📲 Instalar Aplicación
    </button>
  );
};