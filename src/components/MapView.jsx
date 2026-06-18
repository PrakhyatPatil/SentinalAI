import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
import { haversine } from '../lib/haversine.js';

const MAP_CENTER = { lat: 22.7196, lng: 75.8577 };
const MAP_ZOOM   = 14;

const HEATMAP_GRADIENT = [
  'rgba(0, 255, 255, 0)',
  'rgba(0, 255, 255, 1)',
  'rgba(0, 191, 255, 1)',
  'rgba(0, 127, 255, 1)',
  'rgba(0, 63, 255, 1)',
  'rgba(0, 0, 255, 1)',
  'rgba(0, 0, 223, 1)',
  'rgba(0, 0, 191, 1)',
  'rgba(0, 0, 159, 1)',
  'rgba(0, 0, 127, 1)',
  'rgba(63, 0, 91, 1)',
  'rgba(127, 0, 63, 1)',
  'rgba(191, 0, 31, 1)',
  'rgba(255, 0, 0, 1)'
];

export const MAP_STYLES = [
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

// Days threshold for reduced opacity on heatmap
const EXPIRY_DAYS = 7;

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

/** Returns true if the incident is older than EXPIRY_DAYS */
function isExpired(inc) {
  if (!inc.timestamp) return false;
  let date;
  if (inc.timestamp?.toDate) date = inc.timestamp.toDate();
  else if (inc.timestamp instanceof Date) date = inc.timestamp;
  else if (typeof inc.timestamp?.seconds === 'number') date = new Date(inc.timestamp.seconds * 1000);
  else return false;
  const diffMs = Date.now() - date.getTime();
  return diffMs > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
}

export default function MapView({
  incidents,
  sliderHour,
  segmentColors,
  onLocalIncidentAdd,
  onDeleteIncident,
  mobileSheetOpen,
  onMapClick,
  panTo,
  waypoints,
  userPos,
  accuracy,
  heading,
  locLoading,
  isTracking,
  startTracking,
  stopTracking,
  centerOnUser,
}) {
  const [map, setMap] = useState(null);
  const [reportPosition, setReportPosition] = useState(null);
  const [viewportIncidentCount, setViewportIncidentCount] = useState(incidents.length);
  const [selectedIncidents, setSelectedIncidents] = useState([]);
  const [infoWindowPosition, setInfoWindowPosition] = useState(null);
  const mapRef = useRef(null);

  const startLocation = (waypoints && waypoints.length > 0) ? waypoints[0] : panTo;
  const locError = null;

  // Auto-center once on first GPS fix
  const centeredRef = useRef(false);
  useEffect(() => {
    if (userPos && mapRef.current && !centeredRef.current) {
      mapRef.current.panTo(userPos);
      mapRef.current.setZoom(16);
      centeredRef.current = true;
    }
  }, [userPos]);

  // Pan to external target (Feature 2: pan map to starting point)
  const prevPanRef = useRef(null);
  useEffect(() => {
    if (panTo && mapRef.current) {
      // Only pan if the target changed
      if (!prevPanRef.current || prevPanRef.current.lat !== panTo.lat || prevPanRef.current.lng !== panTo.lng) {
        mapRef.current.panTo(panTo);
        mapRef.current.setZoom(15);
        prevPanRef.current = panTo;
      }
    }
  }, [panTo]);

  const onMapLoad = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    setMap(mapInstance);
  }, []);

  const heatmapLayerRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google) return;

    const dataPoints = incidents
      .map((inc) => {
        const weight = heatmapWeight(inc, sliderHour) * (isExpired(inc) ? 0.5 : 1);
        if (weight <= 0) return null;
        return {
          location: new window.google.maps.LatLng(inc.lat, inc.lng),
          weight: weight,
        };
      })
      .filter(Boolean);

    if (!heatmapLayerRef.current) {
      heatmapLayerRef.current = new window.google.maps.visualization.HeatmapLayer({
        data: dataPoints,
        map: map,
        radius: 45,
        opacity: 0.85,
        gradient: HEATMAP_GRADIENT,
      });
    } else {
      heatmapLayerRef.current.setData(dataPoints);
      heatmapLayerRef.current.setOptions({
        gradient: HEATMAP_GRADIENT,
        radius: 45,
        opacity: 0.85,
      });
      heatmapLayerRef.current.setMap(map);
    }

    return () => {
      if (heatmapLayerRef.current) {
        heatmapLayerRef.current.setMap(null);
        heatmapLayerRef.current = null;
      }
    };
  }, [map, incidents, sliderHour]);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const handleMapClick = useCallback((e) => {
    const clickLat = e.latLng.lat();
    const clickLng = e.latLng.lng();
    const clickPos = { lat: clickLat, lng: clickLng };

    // Find all incidents within 100 meters
    const nearby = incidents.filter((inc) => haversine(clickPos, inc) <= 100);

    if (nearby.length > 0) {
      setSelectedIncidents(nearby);
      setInfoWindowPosition(clickPos);
      setReportPosition(null);
    } else {
      setSelectedIncidents([]);
      setInfoWindowPosition(null);
      setReportPosition(clickPos);
    }

    if (onMapClickRef.current) onMapClickRef.current();
  }, [incidents]);

  // ── Update viewport incident count on map bounds change ─────────────────
  const updateViewportCount = useCallback(() => {
    if (!mapRef.current) return;
    const bounds = mapRef.current.getBounds();
    if (!bounds) return;
    let count = 0;
    for (const inc of incidents) {
      if (bounds.contains(new window.google.maps.LatLng(inc.lat, inc.lng))) {
        count++;
      }
    }
    setViewportIncidentCount(count);
  }, [incidents]);

  // Update count when incidents change
  useEffect(() => {
    updateViewportCount();
  }, [incidents, updateViewportCount]);

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

  return (
    <div className="map-container">
      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        options={MAP_OPTIONS}
        onLoad={onMapLoad}
        onClick={handleMapClick}
        onBoundsChanged={updateViewportCount}
      >
        {/* Heatmap Managed via useEffect */}

        {/* Colour-coded route segments — overlap last point to eliminate gaps */}
        {segmentColors?.map((seg, idx) => (
          <Polyline
            key={`seg-${idx}`}
            path={seg.waypoints}
            options={{
              strokeColor: seg.color,
              strokeOpacity: 0.95,
              strokeWeight: 6,
              zIndex: 10,
            }}
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

        {/* Selected incidents details popup */}
        {infoWindowPosition && selectedIncidents.length > 0 && (
          <InfoWindow
            position={infoWindowPosition}
            onCloseClick={() => {
              setSelectedIncidents([]);
              setInfoWindowPosition(null);
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #0f0a23, #1a103a)',
              borderRadius: '8px',
              padding: '12px 14px',
              maxWidth: '250px',
              color: '#f1f5f9',
              fontFamily: "'Inter', sans-serif",
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '700',
                margin: '0 0 10px 0',
                color: '#fff',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '6px',
              }}>
                📍 Reported Incidents
              </h3>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxHeight: '180px',
                overflowY: 'auto',
                marginBottom: '12px',
              }}>
                {selectedIncidents.map((inc, i) => {
                  const icons = { harassment_history: '⚡', poor_lighting: '💡', isolated: '🚶' };
                  const labels = { harassment_history: 'Harassment', poor_lighting: 'Poor Lighting', isolated: 'Isolated Area' };
                  const formattedTime = inc.hour !== undefined ? `${inc.hour % 12 || 12} ${inc.hour >= 12 ? 'PM' : 'AM'}` : 'unknown time';
                  return (
                    <div key={inc.id ?? i} style={{
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontWeight: '600',
                        fontSize: '12px',
                        marginBottom: '4px',
                      }}>
                        <span style={{ color: inc.type === 'harassment_history' ? '#ef4444' : inc.type === 'poor_lighting' ? '#f59e0b' : '#a855f7' }}>
                          {icons[inc.type] ?? '⚠️'} {labels[inc.type] ?? inc.type}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{formattedTime}</span>
                      </div>
                      {inc.description && (
                        <p style={{
                          fontSize: '11px',
                          color: '#cbd5e1',
                          margin: '4px 0 0 0',
                          lineHeight: '1.4',
                        }}>
                          {inc.description}
                        </p>
                      )}
                      {onDeleteIncident && (
                        <button
                          onClick={() => {
                            onDeleteIncident(inc.id);
                            // Remove from local selection too
                            setSelectedIncidents((prev) => prev.filter((s) => s.id !== inc.id));
                            if (selectedIncidents.length <= 1) setInfoWindowPosition(null);
                          }}
                          style={{
                            marginTop: '6px',
                            padding: '3px 8px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Delete this incident"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setReportPosition(infoWindowPosition);
                  setSelectedIncidents([]);
                  setInfoWindowPosition(null);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ➕ Report New Incident Here
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* ── Feature 5: Incident count badge ──────────────────────────────── */}
      <div className="map-incident-badge" id="map-incident-badge">
        <span className="map-incident-badge__dot" />
        <span className="map-incident-badge__text">
          {viewportIncidentCount} incident{viewportIncidentCount !== 1 ? 's' : ''} in this area
        </span>
      </div>

      {/* ── Custom zoom + location controls ──────────────────────────────── */}
      <div className="map-controls">
        <button id="zoom-in-btn"  className="map-ctrl-btn" onClick={handleZoomIn}  aria-label="Zoom in"  title="Zoom in">+</button>
        <button id="zoom-out-btn" className="map-ctrl-btn" onClick={handleZoomOut} aria-label="Zoom out" title="Zoom out">−</button>
        
        {startLocation && (
          <button
            id="pan-to-start-btn"
            className="map-ctrl-btn map-ctrl-btn--start-loc"
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.panTo(startLocation);
                mapRef.current.setZoom(15);
              }
            }}
            aria-label="Pan to start location"
            title="Pan to start location"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </button>
        )}

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

      <Legend incidentsCount={incidents.length} />
    </div>
  );
}
