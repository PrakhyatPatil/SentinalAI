import React, { useState, useEffect, useRef } from 'react';

// Throttling variable to prevent multiple triggers from multiple instances
let lastTriggerTime = 0;

export default function SOSButton({ className, userLocation }) {
  const [toast, setToast] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  function handleSOS() {
    const now = Date.now();
    if (now - lastTriggerTime < 4000) return; // ignore triggers within 4 seconds
    lastTriggerTime = now;

    // Show confirmation overlay for 2 seconds
    setShowOverlay(true);
    setTimeout(() => {
      setShowOverlay(false);
    }, 2000);

    // 1. If we have live userLocation from parent, use it immediately
    if (userLocation) {
      openWhatsAppOrFallback(userLocation);
      return;
    }

    // 2. If we have a cached location in sessionStorage, use it immediately
    try {
      const cached = JSON.parse(sessionStorage.getItem('saferoute_last_location') || 'null');
      if (cached) {
        openWhatsAppOrFallback(cached);
        return;
      }
    } catch (e) {
      console.warn('[SOSButton] Failed to read cached location:', e);
    }

    // 3. Fallback to geolocation API with a 5-second timeout
    if (!navigator.geolocation) {
      openWhatsAppOrFallback(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        openWhatsAppOrFallback({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setToast({
          type: 'error',
          text: 'Location unavailable. Sending SOS without coordinates.',
        });
        openWhatsAppOrFallback(null);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
  }

  // Ref to prevent stale closures in event listener
  const handleSOSRef = useRef(handleSOS);
  useEffect(() => {
    handleSOSRef.current = handleSOS;
  });

  // Listen for voice trigger event
  useEffect(() => {
    const handleTrigger = () => {
      handleSOSRef.current();
    };
    window.addEventListener('trigger-sos', handleTrigger);
    return () => window.removeEventListener('trigger-sos', handleTrigger);
  }, []);

  function openWhatsAppOrFallback(coords) {
    // Attempt location fallback once more if coords is null
    const activeCoords = coords || userLocation || (() => {
      try {
        return JSON.parse(sessionStorage.getItem('saferoute_last_location') || 'null');
      } catch (e) {
        return null;
      }
    })();

    let msg;
    if (activeCoords) {
      msg = `🆘 SOS - I need help! My location: https://maps.google.com/?q=${activeCoords.lat},${activeCoords.lng}`;
    } else {
      msg = '🆘 SOS - I need help! Please contact me immediately.';
    }

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    const opened = window.open(url, '_blank');

    // If window.open returns null/undefined (popup blocked, or desktop without WhatsApp)
    if (!opened) {
      if (coords) {
        setToast({
          type: 'coords',
          text: `📍 ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
          fullMsg: msg,
        });
      } else {
        setToast({
          type: 'error',
          text: 'Could not open WhatsApp. Please call emergency services.',
        });
      }
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text).then(() => {
      setToast({ type: 'success', text: '✅ Copied to clipboard!' });
    }).catch(() => {
      // Fallback: select text from a temporary element
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setToast({ type: 'success', text: '✅ Copied to clipboard!' });
    });
  }

  const isFloating = className?.includes('floating-sos');
  const isHeader = className?.includes('header-sos');
  const isSidebar = className?.includes('sidebar-sos');

  const buttonStyle = {};
  if (isHeader) {
    buttonStyle.padding = '8px 14px';
    buttonStyle.fontSize = '12px';
    buttonStyle.minHeight = '36px';
    buttonStyle.minWidth = 'auto';
  } else if (isSidebar) {
    buttonStyle.width = '100%';
    buttonStyle.justifyContent = 'center';
    buttonStyle.padding = '12px 18px';
    buttonStyle.fontSize = '14px';
    buttonStyle.minHeight = '44px';
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', position: 'relative', width: isSidebar ? '100%' : 'auto' }}>
        <button
          id="sos-button"
          className={`sos-btn ${className || ''}`}
          style={buttonStyle}
          onClick={handleSOS}
          aria-label="🆘 Emergency Alert: Send emergency WhatsApp message with my location"
          title="Send Emergency Alert via WhatsApp"
        >
          <span className="sos-icon">🆘</span>
          <span className="sos-text">Emergency Alert</span>
        </button>

        {isSidebar && (
          <span
            className="sos-microcopy"
            style={{
              fontSize: '10px',
              color: 'var(--text-secondary)',
              marginTop: '2px',
              textAlign: 'center',
              whiteSpace: 'normal',
              pointerEvents: 'none',
              lineHeight: '1.4',
            }}
          >
            Opens WhatsApp with live GPS · No account needed · Works on any network
          </span>
        )}
      </div>

      {/* 2-second confirmation overlay */}
      {showOverlay && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(13, 10, 30, 0.95)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          color: '#fff',
          backdropFilter: 'blur(10px)',
          animation: 'fade-in 0.2s ease-out',
        }}>
          <span style={{ fontSize: '64px', animation: 'overlay-pulse 1s infinite' }}>🚨</span>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, textAlign: 'center', padding: '0 20px', letterSpacing: '-0.5px' }}>
            Alert sent · Coordinates shared · Stay on the line
          </h2>
          
          <style>{`
            @keyframes overlay-pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.15); opacity: 0.8; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Toast for fallback / copy coordinates */}
      {toast && (
        <div className="sos-toast" role="alert">
          <span className="sos-toast__text">{toast.text}</span>
          {toast.type === 'coords' && (
            <button
              className="sos-toast__copy"
              onClick={() => copyToClipboard(toast.fullMsg || toast.text)}
            >
              📋 Copy
            </button>
          )}
          <button className="sos-toast__close" onClick={() => setToast(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
    </>
  );
}
