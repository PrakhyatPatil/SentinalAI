import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

import MapView from './components/MapView.jsx';
import RoutePanel from './components/RoutePanel.jsx';
import TimeSlider from './components/TimeSlider.jsx';
import RiskVerdict from './components/RiskVerdict.jsx';
import SaheliPanel from './components/SaheliPanel.jsx';
import SOSButton from './components/SOSButton.jsx';
import Dashboard from './components/Dashboard.jsx';
import NavigationPanel from './components/NavigationPanel.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

// AI Intelligence Layer components
import SafetyRecommendations from './components/SafetyRecommendations.jsx';
import PersonalAlert from './components/PersonalAlert.jsx';
import RiskForecastChart from './components/RiskForecastChart.jsx';
import BestTimeWidget from './components/BestTimeWidget.jsx';
import TrendInsightBanner from './components/TrendInsightBanner.jsx';
import PreferencesModal from './components/PreferencesModal.jsx';

import { useIncidents } from './hooks/useIncidents.js';
import { useRoute } from './hooks/useRoute.js';
import { useRiskScore } from './hooks/useRiskScore.js';
import { useAIGuardian } from './hooks/useAIGuardian.js';
import { useUserLocation } from './hooks/useUserLocation.js';
import { seedIncidentsIfNeeded } from './lib/seedData.js';
import { FIREBASE_CONFIGURED } from './lib/firebase.js';
import { getUserProfile } from './lib/userProfile.js';
import { extractPatterns } from './lib/PredictiveEngine.js';

const GOOGLE_MAPS_LIBRARIES = ['visualization', 'places'];
const GOOGLE_MAPS_VERSION = '3.64'; // Pin to last version supporting HeatmapLayer (deprecated in 3.65)

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAPS_CONFIGURED =
  !!MAPS_KEY &&
  MAPS_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE' &&
  MAPS_KEY.length > 10;

// ── Setup Screen shown when keys are missing ──────────────────────────────────
function SetupScreen() {
  return (
    <div className="app-loading" style={{ background: 'radial-gradient(ellipse at 30% 60%, #1a0a3a 0%, #0d0d1a 70%)' }}>
      <div style={{ maxWidth: 480, width: '90%', textAlign: 'center', color: '#f1f5f9' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🛡️</div>
        <h1 style={{
          fontSize: 36, fontWeight: 800, letterSpacing: '-1px',
          background: 'linear-gradient(135deg, #a855f7, #fff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 8,
        }}>SafeRoute</h1>
        <p style={{ color: '#94a3b8', marginBottom: 32, fontSize: 15 }}>
          API keys are missing or empty in <code style={{ color: '#a855f7' }}>.env.local</code>
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: 24, textAlign: 'left', marginBottom: 24,
        }}>
          <p style={{ fontWeight: 700, marginBottom: 12, color: '#e2e8f0', fontSize: 14 }}>
            📝 Create <code style={{ color: '#a855f7' }}>.env.local</code> with:
          </p>
          <pre style={{
            background: '#0a0818', borderRadius: 8, padding: 16, fontSize: 12,
            color: '#7dd3fc', overflowX: 'auto', lineHeight: 1.8,
          }}>{`VITE_GOOGLE_MAPS_API_KEY=AIza...
VITE_GEMINI_API_KEY=AIza...
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:xxx:web:xxx`}</pre>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94a3b8' }}>
          <a href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com" target="_blank" rel="noreferrer"
            style={{ color: '#a855f7' }}>→ Get Google Maps API key</a>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
            style={{ color: '#a855f7' }}>→ Get Gemini API key</a>
          <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer"
            style={{ color: '#a855f7' }}>→ Create Firebase project</a>
        </div>

        <p style={{ marginTop: 24, fontSize: 12, color: '#64748b' }}>
          After saving .env.local, Vite will hot-reload automatically.
        </p>
      </div>
    </div>
  );
}

// ── Inner app (only rendered when Maps is loaded) ─────────────────────────────
function AppInner() {
  const [sliderHour, setSliderHour] = useState(new Date().getHours());
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(true);
  const [localIncidents, setLocalIncidents] = useState([]);
  const [activeTab, setActiveTab] = useState('route');
  const [mapPanTarget, setMapPanTarget] = useState(null);
  const [routesAnalyzed, setRoutesAnalyzed] = useState(0);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(getUserProfile());

  // User location hook
  const {
    position: userLocation,
    loading: userLocationLoading,
    isTracking: userIsTracking,
    startTracking: userStartTracking,
    centerOnUser: userCenterOnUser,
  } = useUserLocation();

  const { incidents: firestoreIncidents } = useIncidents();
  // Merge Firestore incidents with locally-added ones
  const incidents = [...firestoreIncidents, ...localIncidents];

  const {
    directionsResult,
    waypoints,
    scoringWaypoints,
    loading: routeLoading,
    error: routeError,
    fetchRoute,
    clearRoute,
  } = useRoute(incidents, sliderHour);

  const { riskScore, riskLabel, segmentColors, nearbyIncidents } =
    useRiskScore(waypoints, scoringWaypoints, incidents, sliderHour);

  // AI Guardian hook
  const {
    contextAnalysis, contextLoading,
    riskReasoning, riskLoading,
    recommendations, recsLoading,
    forecast, forecastLoading,
    narrative, narrativeLoading,
    trendAnalysis, trendLoading,
    runTrendAnalysis,
    runFullPipeline,
    runSliderUpdate,
    clearAll: clearAI,
  } = useAIGuardian();

  // Seed demo data on first load
  useEffect(() => {
    seedIncidentsIfNeeded();
  }, []);

  // Run trend analysis on app load (Feature 6)
  useEffect(() => {
    if (incidents.length > 0) {
      runTrendAnalysis(incidents);
    }
  }, [incidents.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute route distance from Directions API
  const routeDistanceKm = useMemo(() => {
    const leg = directionsResult?.routes?.[0]?.legs?.[0];
    if (!leg?.distance?.value) return 0;
    return Math.round((leg.distance.value / 1000) * 10) / 10;
  }, [directionsResult]);

  // Extract patterns for TimeSlider gradient
  const incidentPatterns = useMemo(() => {
    return extractPatterns(incidents);
  }, [incidents]);

  // Compute AI-adjusted score: clamp(baseScore + baseScoreAdjustment, 0, 100)
  const aiAdjustedScore = useMemo(() => {
    if (riskScore === null || !riskReasoning) return null;
    const adj = riskReasoning.baseScoreAdjustment || 0;
    return Math.min(100, Math.max(0, riskScore + adj));
  }, [riskScore, riskReasoning]);

  // Final displayed score
  const finalScore = aiAdjustedScore !== null ? aiAdjustedScore : riskScore;

  // Fire AI pipeline after route+score are ready
  useEffect(() => {
    if (waypoints.length === 0 || riskScore === null) return;
    if (!origin || !destination) return;

    runFullPipeline({
      sliderHour,
      incidents,
      nearbyIncidents,
      routeDistanceKm,
      origin,
      destination,
    });
  }, [waypoints, riskScore]); // eslint-disable-line react-hooks/exhaustive-deps

  // On slider change: debounced re-run of Steps 1-2 only
  useEffect(() => {
    if (waypoints.length === 0 || !origin || !destination) return;

    const timer = setTimeout(() => {
      runSliderUpdate({
        sliderHour,
        incidents,
        nearbyIncidents,
        routeDistanceKm,
        origin,
        destination,
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [sliderHour]); // eslint-disable-line react-hooks/exhaustive-deps

  // Geocode an address to lat/lng for map panning
  const geocodeAndPan = useCallback((address) => {
    if (!address || !window.google?.maps?.Geocoder) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address, region: 'IN' }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        setMapPanTarget({ lat: loc.lat(), lng: loc.lng() });
      }
    });
  }, []);

  const handleFindRoute = useCallback(
    async (orig, dest) => {
      setOrigin(orig);
      setDestination(dest);
      clearRoute();
      clearAI();
      geocodeAndPan(orig);
      await fetchRoute(orig, dest);
      setRoutesAnalyzed((prev) => prev + 1);
      if (window.innerWidth < 768) {
        setMobileSheetOpen(false);
      }
    },
    [fetchRoute, clearRoute, clearAI, geocodeAndPan]
  );

  const handleMapClick = useCallback(() => {
    if (window.innerWidth < 768) {
      setMobileSheetOpen(false);
    }
  }, []);

  const handleLocalIncidentAdd = useCallback((inc) => {
    setLocalIncidents((prev) => [...prev, inc]);
  }, []);

  const handleStartTracking = useCallback((onGot) => {
    if (userLocation) {
      if (onGot) onGot(userLocation);
      setMapPanTarget(userLocation);
      return;
    }
    userCenterOnUser((latlng) => {
      if (onGot) onGot(latlng);
      setMapPanTarget(latlng);
    });
    if (!userIsTracking) userStartTracking();
  }, [userLocation, userCenterOnUser, userStartTracking, userIsTracking]);

  const handlePrefsClose = useCallback(() => {
    setPrefsOpen(false);
    setUserProfile(getUserProfile()); // Re-read after save
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__logo">🛡️</span>
          <div>
            <h1 className="app-header__title">SafeRoute</h1>
            <p className="app-header__tagline">Navigate with confidence</p>
          </div>
        </div>

        {/* Center tabs */}
        <div className="app-header__tabs">
          <button
            id="tab-route"
            className={`header-tab ${activeTab === 'route' ? 'header-tab--active' : ''}`}
            onClick={() => setActiveTab('route')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <circle cx="12" cy="8" r="4" />
              <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
            </svg>
            Plan Route
          </button>
          <button
            id="tab-incidents"
            className={`header-tab ${activeTab === 'incidents' ? 'header-tab--active' : ''}`}
            onClick={() => setActiveTab('incidents')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Incidents
          </button>
          <button
            id="tab-dashboard"
            className={`header-tab ${activeTab === 'dashboard' ? 'header-tab--active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <rect x="3" y="12" width="4" height="9" rx="1" />
              <rect x="10" y="6" width="4" height="15" rx="1" />
              <rect x="17" y="2" width="4" height="19" rx="1" />
            </svg>
            Dashboard
          </button>
        </div>

        <div className="app-header__actions">
          <div className="app-header__incident-count">
            <span className="incident-dot" />
            <span>{incidents.length} incidents tracked</span>
          </div>
          <SOSButton className="header-sos" />
        </div>
      </header>

      {/* Floating SOS for mobile */}
      <SOSButton className={`floating-sos ${mobileSheetOpen ? 'sheet-open' : 'sheet-closed'}`} />

      {/* Trend Insight Banner (Feature 6) */}
      <TrendInsightBanner trendAnalysis={trendAnalysis} loading={trendLoading} />

      {/* Main layout */}
      <main className="app-main">
        {/* Map */}
        <div className="app-map">
          <MapView
            incidents={incidents}
            sliderHour={sliderHour}
            segmentColors={segmentColors}
            onLocalIncidentAdd={handleLocalIncidentAdd}
            mobileSheetOpen={mobileSheetOpen}
            onMapClick={handleMapClick}
            panTo={mapPanTarget}
            waypoints={waypoints}
          />
        </div>

        {/* Sidebar / Bottom Sheet */}
        <aside className={`app-sidebar ${mobileSheetOpen ? 'open' : 'closed'}`}>
          {/* Mobile drag handle */}
          <button
            className="sidebar-handle"
            onClick={() => setMobileSheetOpen((v) => !v)}
            aria-label={mobileSheetOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <span className="sidebar-handle__bar" />
          </button>

          {/* Mobile collapsed summary */}
          {!mobileSheetOpen && (
            <div className="sidebar-collapsed-summary" onClick={() => setMobileSheetOpen(true)}>
              {riskScore !== null && waypoints.length > 0 ? (
                <div className="collapsed-score-row">
                  <span className="collapsed-score-badge" style={{ color: `var(--risk-${riskLabel})` }}>
                    🛡️ {finalScore ?? riskScore}/100 - {riskLabel.toUpperCase()}
                  </span>
                  <span className="collapsed-score-hint">Tap to expand safety details</span>
                </div>
              ) : (
                <div className="collapsed-title">
                  <span>🛡️ Plan Your Route</span>
                  <span className="collapsed-score-hint">Tap to expand</span>
                </div>
              )}
            </div>
          )}

          <div className="sidebar-scroll">
            {activeTab === 'route' ? (
              <>
                {!FIREBASE_CONFIGURED && (
                  <div style={{
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 12, color: '#fbbf24',
                  }}>
                    ⚠️ Firebase not configured — using local demo data.
                  </div>
                )}

                {/* Preferences button */}
                <div className="sidebar-prefs-row">
                  <button
                    className="sidebar-prefs-btn"
                    onClick={() => setPrefsOpen(true)}
                    title="Open safety preferences"
                  >
                    ⚙ Preferences
                  </button>
                </div>

                {/* Personal Alert (Feature 4) */}
                <PersonalAlert
                  finalScore={finalScore}
                  dominantRiskType={riskReasoning?.dominantRiskType}
                  userProfile={userProfile}
                />

                <RoutePanel
                  onFindRoute={handleFindRoute}
                  loading={routeLoading}
                  userLocation={userLocation}
                  onStartTracking={handleStartTracking}
                  locationLoading={userLocationLoading}
                />

                {routeError && (
                  <div className="route-error">⚠️ {routeError}. Try a different route.</div>
                )}

                <div className="sidebar-divider" />
                <TimeSlider
                  hour={sliderHour}
                  onChange={setSliderHour}
                  hourlyRiskMap={incidentPatterns.hourlyRiskMap}
                  predictions={forecast?.predictions}
                />

                {riskScore !== null && waypoints.length > 0 && (
                  <>
                    <div className="sidebar-divider" />
                    <RiskVerdict
                      score={riskScore}
                      label={riskLabel}
                      nearbyIncidents={nearbyIncidents}
                      sliderHour={sliderHour}
                      contextAnalysis={contextAnalysis}
                      contextLoading={contextLoading}
                      riskReasoning={riskReasoning}
                      riskLoading={riskLoading}
                      aiAdjustedScore={aiAdjustedScore}
                    />
                  </>
                )}

                {/* Safety Recommendations (Feature 3) */}
                {(recommendations || recsLoading) && waypoints.length > 0 && (
                  <>
                    <div className="sidebar-divider" />
                    <SafetyRecommendations
                      recommendations={recommendations}
                      loading={recsLoading}
                    />
                  </>
                )}

                {/* Navigation Panel */}
                {directionsResult && waypoints.length > 0 && (
                  <>
                    <div className="sidebar-divider" />
                    <NavigationPanel
                      directionsResult={directionsResult}
                      incidents={incidents}
                      sliderHour={sliderHour}
                      origin={origin}
                      destination={destination}
                    />
                  </>
                )}

                {/* Risk Forecast Chart (Feature 5) */}
                {(forecast || forecastLoading) && waypoints.length > 0 && (
                  <>
                    <div className="sidebar-divider" />
                    <RiskForecastChart forecast={forecast} loading={forecastLoading} />
                  </>
                )}

                {/* Best Time to Travel (Feature 8) */}
                {(forecast || forecastLoading) && waypoints.length > 0 && (
                  <>
                    <div className="sidebar-divider" />
                    <BestTimeWidget forecast={forecast} loading={forecastLoading} />
                  </>
                )}

                {/* Saheli AI Panel (Feature 9) — replaces old GeminiPanel */}
                <div className="sidebar-divider" />
                <SaheliPanel narrative={narrative} loading={narrativeLoading} />
              </>
            ) : activeTab === 'incidents' ? (
              /* ── Incidents tab ─────────────────────────────────────────── */
              <div className="incidents-list">
                <h2 className="incidents-list__title">📍 Reported Incidents</h2>
                <p className="incidents-list__count">{incidents.length} incident{incidents.length !== 1 ? 's' : ''} tracked in this area</p>
                {incidents.length === 0 ? (
                  <div className="incidents-list__empty">
                    <span style={{ fontSize: 32 }}>🛡️</span>
                    <p>No incidents reported yet.</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tap anywhere on the map to report one.</p>
                  </div>
                ) : (
                  incidents.map((inc, i) => {
                    const icons = { harassment_history: '⚡', poor_lighting: '💡', isolated: '🚶' };
                    const labels = { harassment_history: 'Harassment', poor_lighting: 'Poor Lighting', isolated: 'Isolated Area' };
                    return (
                      <div className="incident-card" key={inc.id ?? i}>
                        <span className="incident-card__icon">{icons[inc.type] ?? '⚠️'}</span>
                        <div className="incident-card__info">
                          <p className="incident-card__label">{inc.label ?? 'Reported location'}</p>
                          <p className="incident-card__type">{labels[inc.type] ?? inc.type}</p>
                          {inc.description && (
                            <p className="incident-card__desc">{inc.description}</p>
                          )}
                        </div>
                        <span className="incident-card__coords">
                          {inc.lat?.toFixed(4)}, {inc.lng?.toFixed(4)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* ── Dashboard tab ──────────────────────────────────────────── */
              <Dashboard incidents={incidents} routesAnalyzed={routesAnalyzed} />
            )}
          </div>
        </aside>
      </main>

      {/* Preferences Modal (Feature 4) */}
      <PreferencesModal isOpen={prefsOpen} onClose={handlePrefsClose} />
    </div>
  );
}

// ── Root with Maps loader ─────────────────────────────────────────────────────
export default function App() {
  // Show setup screen if keys are missing
  if (!MAPS_CONFIGURED) {
    return <SetupScreen />;
  }

  return <AppWithMaps />;
}

function AppWithMaps() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAPS_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    version: GOOGLE_MAPS_VERSION,
  });

  if (loadError) {
    return (
      <div className="load-error">
        <div className="load-error__card">
          <div className="load-error__icon">🗺️</div>
          <h2>Google Maps Failed to Load</h2>
          <p>Check that your <code>VITE_GOOGLE_MAPS_API_KEY</code> is valid and the Maps JavaScript API + Directions API + Visualization are enabled in Google Cloud Console.</p>
          <p className="load-error__detail">{loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="app-loading">
        <div className="app-loading__content">
          <div className="app-loading__logo">🛡️</div>
          <h1 className="app-loading__title">SafeRoute</h1>
          <div className="app-loading__spinner" />
          <p>Loading map…</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
