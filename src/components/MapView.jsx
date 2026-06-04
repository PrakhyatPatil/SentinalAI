import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  GoogleMap,
  HeatmapLayer,
  Polyline,
  InfoWindow,
  Circle,
  OverlayView,
} from '@react-google-maps/api';
import IncidentReporter from './IncidentReporter.jsx';
import Legend from './Legend.jsx';
import { heatmapWeight } from '../lib/riskScore.js';
import { useUserLocation } from '../hooks/useUserLocation.js';

const MAP_CENTER = { lat: 22.7196, lng: 75.8577 };
const MAP_ZOOM   = 14;

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
  { featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3C7680' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#023747' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'transit', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'transit.line', elementType: 'geometry.fill', stylers: [{ color: '#283d6a' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#3a4762' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
];

// Disable native zoom control — we render custom ones
const MAP_OPTIONS = {
  styles: MAP_STYLES,
  disableDefaultUI: false,
  mapTypeControl: false,
  streetViewControl: false,
  zoomControl: false,          // ← use custom buttons
  fullscreenControl: true,
  fullscreenControlOptions: { position: 3 }, // TOP_RIGHT
};

const CONTAINER_STYLE = { width: '100%', height: '100%' };

// ── Live-location pulsing dot ─────────────────────────────────────────────────
function UserDot({ heading }) {
  return (
    <div className="user-location-dot">
      <div className="user-location-dot__ring" />
      <div className="user-location-dot__core" />
      {heading !== null && (
        <div className="user-location-dot__arrow"
          style={{ transform: `rotate(${heading}deg)` }} />
      )}
    </div>
  );
}

export default function MapView({ incidents, sliderHour, segmentColors, onLocalIncidentAdd, mobileSheetOpen, onMapClick }) {
  const [reportPosition, setReportPosition] = useState(null);
  const mapRef = useRef(null);

  const {
    position: userPos, accuracy, heading,
    loading: locLoading, error: locError,
    isTracking, startTracking, stopTracking, centerOnUser,
  } = useUserLocation();

  // Auto-center once on first GPS fix
  const centeredRef = useRef(false);
  useEffect(() => {
    if (userPos && mapRef.current && !centeredRef.current) {
      mapRef.current.panTo(userPos);
      mapRef.current.setZoom(16);
      centeredRef.current = true;
    }
  }, [userPos]);

  const onMapLoad = useCallback((map) => { mapRef.current = map; }, []);

  const handleMapClick = useCallback((e) => {
    setReportPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    if (onMapClick) onMapClick();
  }, [onMapClick]);

  // ── Custom zoom controls ──────────────────────────────────────────────────
  const handleZoomIn  = () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? MAP_ZOOM) + 1);
  const handleZoomOut = () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? MAP_ZOOM) - 1);

  // ── Location button ───────────────────────────────────────────────────────
  function handleLocationBtn() {
    if (isTracking) {
      if (userPos && mapRef.current) {
        mapRef.current.panTo(userPos);
        mapRef.current.setZoom(16);
      }
    } else {
      centeredRef.current = false;
      startTracking();
      centerOnUser((latlng) => {
        if (mapRef.current) {
          mapRef.current.panTo(latlng);
          mapRef.current.setZoom(16);
        }
      });
    }
  }

  // ── Report banner click — open reporter at map centre ────────────────────
  function handleReportBanner() {
    if (mapRef.current) {
      const c = mapRef.current.getCenter();
      setReportPosition({ lat: c.lat(), lng: c.lng() });
    } else {
      setReportPosition(MAP_CENTER);
    }
  }

  // ── Heatmap ───────────────────────────────────────────────────────────────
  const heatmapData = incidents.map((inc) => ({
    location: new window.google.maps.LatLng(inc.lat, inc.lng),
    weight:   heatmapWeight(inc, sliderHour),
  }));

  return (
    <div className="map-container">
      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        options={MAP_OPTIONS}
        onLoad={onMapLoad}
        onClick={handleMapClick}
      >
        {/* Heatmap */}
        {heatmapData.length > 0 && (
          <HeatmapLayer
            data={heatmapData}
            options={{
              radius: 40,
              opacity: 0.75,
              gradient: [
                'rgba(0,255,255,0)', 'rgba(0,255,255,1)', 'rgba(0,191,255,1)',
                'rgba(0,127,255,1)', 'rgba(0,63,255,1)', 'rgba(0,0,255,1)',
                'rgba(0,0,223,1)', 'rgba(0,0,191,1)', 'rgba(0,0,159,1)',
                'rgba(0,0,127,1)', 'rgba(63,0,91,1)', 'rgba(127,0,63,1)',
                'rgba(191,0,31,1)', 'rgba(255,0,0,1)',
              ],
            }}
          />
        )}

        {/* Colour-coded route segments */}
        {segmentColors?.map((seg, idx) => (
          <Polyline
            key={idx}
            path={seg.waypoints}
            options={{ strokeColor: seg.color, strokeOpacity: 0.95, strokeWeight: 6, zIndex: 10 }}
          />
        ))}

        {/* Live location */}
        {userPos && (
          <>
            {accuracy && accuracy < 500 && (
              <Circle
                center={userPos} radius={accuracy}
                options={{ fillColor: '#4285F4', fillOpacity: 0.10, strokeColor: '#4285F4', strokeOpacity: 0.35, strokeWeight: 1, zIndex: 5 }}
              />
            )}
            <OverlayView position={userPos} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}>
              <UserDot heading={heading} />
            </OverlayView>
          </>
        )}

        {/* Incident reporter popup */}
        {reportPosition && (
          <InfoWindow position={reportPosition} onCloseClick={() => setReportPosition(null)}>
            <IncidentReporter
              position={reportPosition}
              onClose={() => setReportPosition(null)}
              onLocalAdd={onLocalIncidentAdd}
            />
          </InfoWindow>
        )}
      </GoogleMap>

      {/* ── Custom zoom + location controls ──────────────────────────────── */}
      <div className="map-controls">
        <button id="zoom-in-btn"  className="map-ctrl-btn" onClick={handleZoomIn}  aria-label="Zoom in"  title="Zoom in">+</button>
        <button id="zoom-out-btn" className="map-ctrl-btn" onClick={handleZoomOut} aria-label="Zoom out" title="Zoom out">−</button>
        <button
          id="my-location-btn"
          className={`map-ctrl-btn map-ctrl-btn--location ${isTracking ? 'active' : ''} ${locLoading ? 'loading' : ''}`}
          onClick={handleLocationBtn}
          aria-label="My location"
          title={isTracking ? 'Centre on my location' : 'Show my location'}
        >
          {locLoading ? (
            <span className="map-ctrl-spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <circle cx="12" cy="12" r="3" fill={isTracking ? 'currentColor' : 'none'} />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <circle cx="12" cy="12" r="8" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Report an incident banner ─────────────────────────────────────── */}
      <button className={`map-report-banner ${mobileSheetOpen ? 'sheet-open' : 'sheet-closed'}`} onClick={handleReportBanner} aria-label="Report an incident">
        <span className="map-report-banner__icon">⚠️</span>
        <div className="map-report-banner__text">
          <p className="map-report-banner__title">Report an incident</p>
          <p className="map-report-banner__sub">Help keep others safe</p>
        </div>
        <span className="map-report-banner__arrow">›</span>
      </button>

      {/* Stop-tracking pill */}
      {isTracking && (
        <button className="my-location-stop-btn" onClick={stopTracking} title="Stop tracking location">
          ✕ Stop tracking
        </button>
      )}

      {/* Location error toast */}
      {locError && (
        <div className={`location-error-toast ${mobileSheetOpen ? 'sheet-open' : 'sheet-closed'}`} role="alert">📍 {locError}</div>
      )}

      <Legend />
    </div>
  );
}
