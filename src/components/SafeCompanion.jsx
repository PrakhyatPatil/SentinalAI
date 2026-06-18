import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, FIREBASE_CONFIGURED, authReady } from '../lib/firebase.js';

export default function SafeCompanion({ className, userLocation, startTracking, isMobileFloating = false, mobileSheetOpen = false }) {
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharingId, setSharingId] = useState(null);
  const [sharingDuration, setSharingDuration] = useState(15);
  const [toast, setToast] = useState(null);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const intervalRef = useRef(null);
  const locationRef = useRef(userLocation);
  
  useEffect(() => {
    locationRef.current = userLocation;
  }, [userLocation]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Immediately update Firestore when userLocation updates if sharing is active
  useEffect(() => {
    if (isSharing && sharingId && userLocation) {
      const docRef = doc(db, 'liveLocations', sharingId);
      updateDoc(docRef, {
        lat: userLocation.lat,
        lng: userLocation.lng,
        timestamp: serverTimestamp(),
      }).catch((e) => {
        console.warn('[SafeCompanion] Immediate location sync failed:', e);
      });
    }
  }, [userLocation, isSharing, sharingId]);

  const handleShareTap = async () => {
    if (!FIREBASE_CONFIGURED || !db) {
      setToast({ type: 'error', text: 'Firebase is not configured. Cannot share journey.' });
      return;
    }
    
    // Ensure we are signed in anonymised first
    await authReady;

    if (!locationRef.current) {
      // Start tracking location in the background
      startTracking();
    }

    setShowDurationModal(true);
  };

  const startSharing = async (minutes) => {
    setShowDurationModal(false);
    setSharingDuration(minutes);
    
    const ms = minutes * 60 * 1000;
    const expiresAt = Date.now() + ms;
    const randomId = Math.random().toString(36).substring(2, 15);
    const uid = auth?.currentUser?.uid || 'anonymous';

    try {
      const latVal = locationRef.current?.lat || 22.7196;
      const lngVal = locationRef.current?.lng || 75.8577;

      // Create Firestore doc in the background (does not block UI when offline)
      setDoc(doc(db, 'liveLocations', randomId), {
        lat: latVal,
        lng: lngVal,
        timestamp: serverTimestamp(),
        expiresAt,
        active: true,
        uid,
      }).catch((e) => {
        console.warn('[SafeCompanion] Live share initial database write failed (offline?):', e);
      });

      setSharingId(randomId);
      setIsSharing(true);
      setShowStatusModal(true); // Open the status modal where the user can click to share

      setToast({ type: 'success', text: `Journey sharing started for ${minutes} mins!` });

      // Start 10s interval
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(async () => {
        const now = Date.now();
        if (now > expiresAt) {
          stopSharing(randomId, true);
        } else {
          try {
            const docRef = doc(db, 'liveLocations', randomId);
            const currentLat = locationRef.current?.lat || latVal;
            const currentLng = locationRef.current?.lng || lngVal;
            await updateDoc(docRef, {
              lat: currentLat,
              lng: currentLng,
              timestamp: serverTimestamp(),
            });
          } catch (e) {
            console.warn('[SafeCompanion] Interval update failed:', e);
          }
        }
      }, 10000);

    } catch (e) {
      console.error('[SafeCompanion] Error starting share:', e);
      setToast({ type: 'error', text: 'Failed to start journey sharing. Check rules/network.' });
    }
  };

  const stopSharing = async (idToStop = sharingId, isExpired = false) => {
    const targetId = idToStop || sharingId;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsSharing(false);
    setSharingId(null);
    setShowStatusModal(false);

    if (targetId) {
      try {
        const docRef = doc(db, 'liveLocations', targetId);
        await updateDoc(docRef, { active: false });
      } catch (e) {
        console.warn('[SafeCompanion] Stop write failed:', e);
      }
    }

    setToast({
      type: 'info',
      text: isExpired ? 'Journey ended (timer expired).' : 'Journey sharing stopped.',
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Responsive display guards to prevent element collision
  if (isMobileFloating && !isMobile) return null;
  if (!isMobileFloating && isMobile) return null;

  const isHeader = className?.includes('header-companion');
  const isSidebar = className?.includes('sidebar-companion');

  const buttonStyle = isMobileFloating ? {
    display: 'flex',
    position: 'fixed',
    right: '16px',
    bottom: mobileSheetOpen ? 'calc(50vh + 84px)' : '140px',
    zIndex: 200,
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
    background: isSharing 
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
      : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    boxShadow: isSharing 
      ? '0 4px 16px rgba(245, 158, 11, 0.4)' 
      : '0 4px 16px var(--brand-glow)',
    transition: 'bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform var(--t-fast)',
  } : {
    display: 'flex',
    alignItems: 'center',
    justifyContent: isSidebar ? 'center' : 'flex-start',
    width: isSidebar ? '100%' : 'auto',
    gap: isHeader ? '4px' : '6px',
    padding: isHeader ? '8px 14px' : '12px 18px',
    background: isSharing 
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
      : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--r-full)',
    fontSize: isHeader ? '12px' : '14px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: isSharing 
      ? '0 4px 16px rgba(245, 158, 11, 0.4)' 
      : '0 4px 16px var(--brand-glow)',
    transition: 'all var(--t-fast)',
  };

  return (
    <>
      <button
        onClick={isSharing ? () => setShowStatusModal(true) : handleShareTap}
        style={buttonStyle}
        title={isSharing ? "View live journey status" : "Share live journey with companion"}
      >
        <span style={{ fontSize: '16px' }}>{isSharing ? '⏹' : '🤝'}</span>
        {!isMobileFloating && <span style={{ marginLeft: '4px' }}>{isSharing ? 'Sharing Link' : 'Share Journey'}</span>}
      </button>

      {/* Duration Selector Modal */}
      {showDurationModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1c1936 0%, #0d0d1a 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '28px',
            maxWidth: '360px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
            color: '#fff',
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>⏱️</span>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800', color: '#fff' }}>Share Live Journey</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>How long would you like to share your location for?</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => startSharing(15)}
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                15 Minutes
              </button>
              <button
                onClick={() => startSharing(30)}
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                30 Minutes
              </button>
              <button
                onClick={() => startSharing(60)}
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                60 Minutes
              </button>
            </div>

            <button
              onClick={() => setShowDurationModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Share Status Modal (Bypasses popup blocker & shows active url) */}
      {showStatusModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1c1936 0%, #0d0d1a 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '28px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
            color: '#fff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 8px #22c55e',
                display: 'inline-block',
              }} />
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#fff' }}>Journey Sharing Active</h3>
            </div>
            
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Your live location is being tracked. Share this tracking link with your companion to let them follow your journey.
            </p>

            <div style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '8px 12px',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              gap: '8px',
            }}>
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/track/${sharingId}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e2e8f0',
                  fontSize: '11px',
                  width: '100%',
                  outline: 'none',
                }}
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/track/${sharingId}`);
                  setToast({ type: 'success', text: '✅ Link copied to clipboard!' });
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '6px 12px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                }}
              >
                Copy
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <button
                onClick={() => {
                  const link = `${window.location.origin}/track/${sharingId}`;
                  const msg = `Track my live journey for the next ${sharingDuration} minutes on SafeRoute: ${link}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                style={{
                  padding: '12px',
                  background: '#22c55e',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: '800',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>💬</span> Share via WhatsApp
              </button>
              
              <button
                onClick={() => stopSharing()}
                style={{
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '12px',
                  color: '#f87171',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                🛑 Stop Journey Sharing
              </button>
            </div>

            <button
              onClick={() => setShowStatusModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Keep Tracking in Background
            </button>
          </div>
        </div>
      )}

      {/* Safe Companion Toast */}
      {toast && (
        <div
          className="sos-toast"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(13, 10, 30, 0.95)',
            border: `1px solid ${toast.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(124, 58, 237, 0.3)'}`,
            borderRadius: 'var(--r-md)',
            padding: '12px 20px',
            color: '#fff',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: '500' }}>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
