import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { GoogleMap, OverlayView } from '@react-google-maps/api';
import { MAP_STYLES } from './MapView.jsx';

function CompanionDot() {
  return (
    <div className="user-location-dot">
      <div className="user-location-dot__ring" style={{ borderColor: '#a855f7', width: '24px', height: '24px' }} />
      <div className="user-location-dot__core" style={{ backgroundColor: '#a855f7' }} />
    </div>
  );
}

export default function TrackJourney({ trackId }) {
  const [loading, setLoading] = useState(true);
  const [journey, setJourney] = useState(null);
  const [ended, setEnded] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setEnded(true);
      return;
    }

    const docRef = doc(db, 'liveLocations', trackId);
    const unsub = onSnapshot(
      docRef,
      (docSnap) => {
        setLoading(false);
        if (!docSnap.exists()) {
          setEnded(true);
          return;
        }

        const data = docSnap.data();
        const now = Date.now();
        if (!data.active || (data.expiresAt && now > data.expiresAt)) {
          setEnded(true);
        } else {
          setJourney(data);
          if (mapRef.current) {
            mapRef.current.panTo({ lat: data.lat, lng: data.lng });
          }
        }
      },
      (err) => {
        console.error('Error fetching live location:', err);
        setLoading(false);
        setEnded(true);
      }
    );

    return () => unsub();
  }, [trackId]);

  if (loading) {
    return (
      <div className="app-loading" style={{ background: 'radial-gradient(ellipse at 30% 60%, #1a0a3a 0%, #0d0d1a 70%)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#f1f5f9' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🛡️</div>
          <div className="btn-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px', margin: '0 auto 16px auto' }} />
          <p style={{ fontSize: '15px', fontWeight: '500' }}>Connecting to traveler's live stream...</p>
        </div>
      </div>
    );
  }

  if (ended || !journey) {
    return (
      <div className="app-loading" style={{ background: 'radial-gradient(ellipse at 30% 60%, #1a0a3a 0%, #0d0d1a 70%)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 400, width: '90%', textAlign: 'center', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '36px 24px', backdropFilter: 'blur(20px)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '12px', color: '#fff', letterSpacing: '-0.5px' }}>This journey has ended</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            The live location sharing session has expired or was stopped by the traveler.
          </p>
        </div>
      </div>
    );
  }

  const center = { lat: journey.lat, lng: journey.lng };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        zIndex: 10,
        background: 'rgba(13, 10, 30, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '14px 20px',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px' }}>SafeRoute Companion</h3>
            <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '11px' }}>
              Tracking live coordinates in real-time
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '5px 12px', borderRadius: '20px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
          <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: '700' }}>LIVE</span>
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={16}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
        }}
        onLoad={(map) => { mapRef.current = map; }}
      >
        <OverlayView position={center} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={(w, h) => ({ x: -12, y: -12 })}>
          <CompanionDot />
        </OverlayView>
      </GoogleMap>
    </div>
  );
}
