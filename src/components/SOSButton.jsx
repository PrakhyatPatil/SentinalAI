import React from 'react';

export default function SOSButton({ className }) {
  function handleSOS() {
    if (!navigator.geolocation) {
      const url = `https://wa.me/?text=${encodeURIComponent('🆘 SOS - I need help! Please contact me immediately.')}`;
      window.open(url, '_blank');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const msg = `🆘 SOS - I need help! My location: https://maps.google.com/?q=${latitude},${longitude}`;
        const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
      },
      () => {
        // Geolocation denied — send without coordinates
        const url = `https://wa.me/?text=${encodeURIComponent('🆘 SOS - I need help! Please contact me immediately.')}`;
        window.open(url, '_blank');
      },
      { timeout: 5000 }
    );
  }

  return (
    <button
      id="sos-button"
      className={`sos-btn ${className || ''}`}
      onClick={handleSOS}
      aria-label="SOS: Send emergency WhatsApp message with my location"
      title="Send SOS via WhatsApp"
    >
      <span className="sos-icon">🆘</span>
      <span className="sos-text">SOS</span>
    </button>
  );
}
