import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

import MapView from './components/MapView.jsx';
import RoutePanel from './components/RoutePanel.jsx';
import TimeSlider from './components/TimeSlider.jsx';
import RiskVerdict from './components/RiskVerdict.jsx';
import GeminiPanel from './components/GeminiPanel.jsx';
import SOSButton from './components/SOSButton.jsx';
import Dashboard from './components/Dashboard.jsx';
import NavigationPanel from './components/NavigationPanel.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import VoiceSOS from './components/VoiceSOS.jsx';
import SafeCompanion from './components/SafeCompanion.jsx';
import TrackJourney from './components/TrackJourney.jsx';

// New AI Guardian components
import SafetyRecommendations from './components/SafetyRecommendations.jsx';
import PreferencesModal from './components/PreferencesModal.jsx';
import PersonalizedAlert from './components/PersonalizedAlert.jsx';
import RiskForecastChart from './components/RiskForecastChart.jsx';
import BestTimeWidget from './components/BestTimeWidget.jsx';
import TrendBanner from './components/TrendBanner.jsx';

import { useIncidents } from './hooks/useIncidents.js';
import { useRoute } from './hooks/useRoute.js';
import { useRiskScore } from './hooks/useRiskScore.js';
import { useAIGuardian } from './hooks/useAIGuardian.js';
import { useUserLocation } from './hooks/useUserLocation.js';
import { seedIncidentsIfNeeded } from './lib/seedData.js';
import { FIREBASE_CONFIGURED } from './lib/firebase.js';
import { getGeminiWeights } from './lib/gemini.js';
import { haversine } from './lib/haversine.js';
import { extractPatterns, getSliderGradient } from './lib/PredictiveEngine.js';

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

  // Voice Activation & Dynamic Weights States
  const [voiceActive, setVoiceActive] = useState(true);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [geminiWeights, setGeminiWeights] = useState(null);
  const [showBanner, setShowBanner] = useState(() => {
    return !sessionStorage.getItem('saferoute_api_banner_dismissed');
  });

  useEffect(() => {
    setIsSpeechSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  const handleDismissBanner = () => {
    sessionStorage.setItem('saferoute_api_banner_dismissed', 'true');
    setShowBanner(false);
  };

  // User location hook for Feature 1
  const {
    position: userLocation,
    accuracy: userAccuracy,
    heading: userHeading,
    loading: userLocationLoading,
    isTracking: userIsTracking,
    startTracking: userStartTracking,
    stopTracking: userStopTracking,
    centerOnUser: userCenterOnUser,
  } = useUserLocation();

  const { incidents: firestoreIncidents, deletedIds, deleteIncident } = useIncidents();
  // Merge Firestore incidents with locally-added ones, then filter out deleted ones
  const incidents = useMemo(
    () => [...firestoreIncidents, ...localIncidents].filter(
      (inc) => !deletedIds.has(inc.id)
    ),
    [firestoreIncidents, localIncidents, deletedIds]
  );

  const {
    directionsResult,
    waypoints,
    scoringWaypoints,
    allRouteOptions,
    loading: routeLoading,
    error: routeError,
    fetchRoute,
    clearRoute,
  } = useRoute(incidents, sliderHour, geminiWeights);

  const { riskScore, riskLabel, segmentColors, nearbyIncidents } =
    useRiskScore(waypoints, scoringWaypoints, incidents, sliderHour, geminiWeights);

  // ── AI Guardian Hook ────────────────────────────────────────────────────────
  const {
    contextAnalysis,
    riskReasoning,
    recommendations,
    trendAnalysis,
    forecast,
    narrative,
    contextLoading,
    reasoningLoading,
    recommendationsLoading,
    trendLoading,
    forecastLoading,
    narrativeLoading,
    runFullPipeline,
    runSliderUpdate,
    runTrendAnalysis,
    clearAll: clearAIGuardian,
  } = useAIGuardian();

  // ── Compute final score with AI adjustment ──────────────────────────────────
  const finalScore = useMemo(() => {
    if (riskScore === null) return null;
    if (!riskReasoning) return riskScore;
    const adjusted = riskScore + (riskReasoning.baseScoreAdjustment || 0);
    return Math.max(0, Math.min(100, Math.round(adjusted)));
  }, [riskScore, riskReasoning]);

  // ── Slider gradient from PredictiveEngine ───────────────────────────────────
  const sliderGradient = useMemo(() => {
    if (!nearbyIncidents || nearbyIncidents.length === 0) return null;
    const patterns = extractPatterns(nearbyIncidents);
    return getSliderGradient(patterns.hourlyRiskMap);
  }, [nearbyIncidents]);

  // Get all incidents near any of the route options to fetch their dynamic weights stably
  const routeIncidents = useMemo(() => {
    if (!allRouteOptions || allRouteOptions.length === 0) return [];
    const seen = new Set();
    const result = [];
    for (const option of allRouteOptions) {
      if (!option.scoringWaypoints) continue;
      for (const wp of option.scoringWaypoints) {
        for (const inc of incidents) {
          const key = inc.id ?? `${inc.lat},${inc.lng}`;
          if (!seen.has(key) && haversine(wp, inc) <= 150) {
            seen.add(key);
            result.push(inc);
          }
        }
      }
    }
    return result;
  }, [allRouteOptions, incidents]);

  // Fetch weights when routeIncidents or sliderHour changes (with 300ms debounce)
  useEffect(() => {
    if (routeIncidents.length === 0) {
      setGeminiWeights(null);
      return;
    }
    let active = true;
    const fetchWeights = async () => {
      const weights = await getGeminiWeights(routeIncidents, sliderHour);
      if (active) {
        setGeminiWeights(weights);
      }
    };
    const timer = setTimeout(() => {
      fetchWeights();
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [routeIncidents, sliderHour]);

  // ── Trend Analysis on App Load (once) ───────────────────────────────────────
  const trendAnalyzedRef = useRef(false);
  useEffect(() => {
    if (!trendAnalyzedRef.current && incidents.length > 0) {
      trendAnalyzedRef.current = true;
      runTrendAnalysis(incidents);
    }
  }, [incidents, runTrendAnalysis]);

  // Seed demo data on first load
  useEffect(() => {
    seedIncidentsIfNeeded();
  }, []);

  // ── AI Pipeline on Route Submit ─────────────────────────────────────────────
  const initialPipelineDoneRef = useRef(false);
  const prevRouteKeyRef = useRef('');

  // Fire AI pipeline when route + score are first available
  useEffect(() => {
    if (!origin || !destination || waypoints.length === 0 || riskScore === null) return;

    const routeKey = `${origin}|${destination}|${waypoints.length}`;
    if (routeKey !== prevRouteKeyRef.current) {
      prevRouteKeyRef.current = routeKey;
      initialPipelineDoneRef.current = true;

      // Calculate route distance from Directions API
      let routeDistanceKm = 0;
      if (directionsResult?.routes?.[0]?.legs) {
        for (const leg of directionsResult.routes[0].legs) {
          routeDistanceKm += (leg.distance?.value || 0) / 1000;
        }
      }

      runFullPipeline({
        sliderHour,
        incidents,
        nearbyIncidents,
        routeDistanceKm,
        origin,
        destination,
      });
    }
  }, [origin, destination, waypoints.length, riskScore, sliderHour, nearbyIncidents,
      directionsResult, incidents, runFullPipeline]);

  // ── Slider Change: re-run Steps 1-2 only (800ms debounce) ──────────────────
  useEffect(() => {
    if (!initialPipelineDoneRef.current || !origin || !destination || waypoints.length === 0) return;

    let routeDistanceKm = 0;
    if (directionsResult?.routes?.[0]?.legs) {
      for (const leg of directionsResult.routes[0].legs) {
        routeDistanceKm += (leg.distance?.value || 0) / 1000;
      }
    }

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
      // Clear previous route before fetching new one
      clearRoute();
      clearAIGuardian();
      initialPipelineDoneRef.current = false;
      prevRouteKeyRef.current = '';
      // Pan to starting point
      geocodeAndPan(orig);
      await fetchRoute(orig, dest);
      setRoutesAnalyzed((prev) => prev + 1);
      if (window.innerWidth < 768) {
        setMobileSheetOpen(false); // Collapse sheet on mobile after route is found to show map
      }
    },
    [fetchRoute, clearRoute, clearAIGuardian, geocodeAndPan]
  );

  const handleMapClick = useCallback(() => {
    if (window.innerWidth < 768) {
      setMobileSheetOpen(false);
    }
  }, []);

  const handleLocalIncidentAdd = useCallback((inc) => {
    setLocalIncidents((prev) => [...prev, inc]);
  }, []);

  const handleDeleteIncident = useCallback(async (incidentId) => {
    // Remove from local list if it's a locally-added incident
    setLocalIncidents((prev) => prev.filter((inc) => inc.id !== incidentId));
    // Delegate to hook for Firestore/seed removal
    await deleteIncident(incidentId);
  }, [deleteIncident]);

  // Feature 1: Start tracking callback for RoutePanel
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

  // ── "Find Safer Route" handler (Feature 4 — handled in useRoute) ─────────
  const handleFindSaferRoute = useCallback(async () => {
    if (!origin || !destination) return;
    clearAIGuardian();
    initialPipelineDoneRef.current = false;
    prevRouteKeyRef.current = '';
    await fetchRoute(origin, destination);
  }, [origin, destination, fetchRoute, clearAIGuardian]);

  const headerTop = showBanner ? '56px' : '16px';
  const sidebarTop = showBanner 
    ? 'calc(56px + var(--header-h) + 12px)' 
    : 'calc(16px + var(--header-h) + 12px)';

  // Use finalScore for display (with AI adjustment)
  const displayScore = finalScore !== null ? finalScore : riskScore;

  return (
    <div className="app">
      {/* API Key Disclosure Banner */}
      {showBanner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '40px',
          background: 'rgba(59, 130, 246, 0.95)',
          color: '#fff',
          padding: '0 20px',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: '600',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
        }}>
          <span>ℹ️ Demo build: API keys are domain-restricted browser keys. Production deployment would proxy Gemini calls through Firebase Cloud Functions.</span>
          <button
            onClick={handleDismissBanner}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: '700',
              textTransform: 'uppercase',
            }}
          >
            Got it
          </button>
        </div>
      )}

      {/* Header */}
      <header className="app-header" style={{ top: headerTop }}>
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
          <SafeCompanion
            className="header-companion"
            userLocation={userLocation}
            startTracking={handleStartTracking}
          />
          <SOSButton className="header-sos" userLocation={userLocation} />
        </div>
      </header>

      {/* Floating Actions for mobile */}
      <SafeCompanion
        userLocation={userLocation}
        startTracking={handleStartTracking}
        isMobileFloating={true}
        mobileSheetOpen={mobileSheetOpen}
      />
      <SOSButton className={`floating-sos ${mobileSheetOpen ? 'sheet-open' : 'sheet-closed'}`} userLocation={userLocation} />

      {/* Preferences Modal */}
      <PreferencesModal isOpen={prefsOpen} onClose={() => setPrefsOpen(false)} />

      {/* Main layout */}
      <main className="app-main">
        {/* Map */}
        <div className="app-map">
          <MapView
            incidents={incidents}
            sliderHour={sliderHour}
            segmentColors={segmentColors}
            onLocalIncidentAdd={handleLocalIncidentAdd}
            onDeleteIncident={handleDeleteIncident}
            mobileSheetOpen={mobileSheetOpen}
            onMapClick={handleMapClick}
            panTo={mapPanTarget}
            waypoints={waypoints}
            userPos={userLocation}
            accuracy={userAccuracy}
            heading={userHeading}
            locLoading={userLocationLoading}
            isTracking={userIsTracking}
            startTracking={userStartTracking}
            stopTracking={userStopTracking}
            centerOnUser={userCenterOnUser}
          />
          <VoiceSOS voiceActive={voiceActive} />

          {/* Trend Insight Banner at bottom of map */}
          <TrendBanner trendAnalysis={trendAnalysis} loading={trendLoading} />
        </div>

        {/* Sidebar / Bottom Sheet */}
        <aside className={`app-sidebar ${mobileSheetOpen ? 'open' : 'closed'}`} style={{ top: sidebarTop }}>
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
              {displayScore !== null && waypoints.length > 0 ? (
                <div className="collapsed-score-row">
                  <span className="collapsed-score-badge" style={{ color: `var(--risk-${riskLabel})` }}>
                    🛡️ {displayScore}/100 - {riskLabel.toUpperCase()}
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

                {/* Preferences Button */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: '8px',
                }}>
                  <button
                    className="prefs-btn"
                    onClick={() => setPrefsOpen(true)}
                    title="Safety Preferences"
                  >
                    ⚙ Preferences
                  </button>
                </div>

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

                {/* Sidebar Safety Actions Panel */}
                <div style={{
                  margin: '12px 0 4px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border)',
                  padding: '16px 14px 12px 14px',
                  borderRadius: 'var(--r-md)',
                }}>
                  <p style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: 'var(--text-secondary)',
                    margin: '0 0 6px 0'
                  }}>🛡️ QUICK SAFETY ACTIONS</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <SOSButton className="sidebar-sos" userLocation={userLocation} />
                    <SafeCompanion
                      className="sidebar-companion"
                      userLocation={userLocation}
                      startTracking={handleStartTracking}
                    />
                  </div>
                </div>

                {/* Voice SOS Toggle */}
                {isSpeechSupported && (
                  <div className="voice-sos-toggle-container" style={{
                    margin: '12px 0 4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border)',
                    padding: '10px 14px',
                    borderRadius: 'var(--r-md)',
                  }}>
                    <input
                      type="checkbox"
                      id="voice-sos-checkbox"
                      checked={voiceActive}
                      onChange={(e) => setVoiceActive(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: '#a855f7',
                        cursor: 'pointer',
                      }}
                    />
                    <label htmlFor="voice-sos-checkbox" style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}>
                      Voice SOS active — say 'help me' anytime
                    </label>
                  </div>
                )}

                <div className="sidebar-divider" />
                <TimeSlider
                  hour={sliderHour}
                  onChange={setSliderHour}
                  sliderGradient={sliderGradient}
                  forecast={forecast}
                  riskScore={displayScore}
                />

                {displayScore !== null && waypoints.length > 0 && (
                  <>
                    {/* Personalized Alert */}
                    <PersonalizedAlert
                      finalScore={displayScore}
                      dominantRiskType={riskReasoning?.dominantRiskType}
                    />

                    <div className="sidebar-divider" />
                    <RiskVerdict
                      score={displayScore}
                      label={riskLabel}
                      nearbyIncidents={nearbyIncidents}
                      sliderHour={sliderHour}
                      contextAnalysis={contextAnalysis}
                      contextLoading={contextLoading}
                      riskReasoning={riskReasoning}
                      reasoningLoading={reasoningLoading}
                    />
                    {/* Feature 4: Find Safer Route button when risk is high */}
                    {displayScore > 66 && (
                      <button
                        className="find-safer-route-btn"
                        onClick={handleFindSaferRoute}
                        disabled={routeLoading}
                      >
                        {routeLoading ? (
                          <><span className="btn-spinner" /> Finding safer route…</>
                        ) : (
                          <>🔄 Find Safer Route</>
                        )}
                      </button>
                    )}
                  </>
                )}

                {/* Safety Recommendations */}
                {(recommendationsLoading || recommendations) && waypoints.length > 0 && (
                  <>
                    <div className="sidebar-divider" />
                    <SafetyRecommendations
                      recommendations={recommendations}
                      loading={recommendationsLoading}
                    />
                  </>
                )}

                {/* Risk Forecast Chart */}
                {(forecastLoading || forecast) && waypoints.length > 0 && (
                  <>
                    <div className="sidebar-divider" />
                    <RiskForecastChart
                      forecast={forecast}
                      loading={forecastLoading}
                    />
                  </>
                )}

                {/* Best Time to Travel Widget */}
                {(forecastLoading || forecast) && waypoints.length > 0 && (
                  <>
                    <div className="sidebar-divider" />
                    <BestTimeWidget
                      forecast={forecast}
                      loading={forecastLoading}
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

                <div className="sidebar-divider" />
                <GeminiPanel
                  narrative={narrative}
                  loading={narrativeLoading}
                  error={null}
                  riskScore={displayScore}
                />
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
                    const ageText = getIncidentAgeText(inc);
                    return (
                      <div className="incident-card" key={inc.id ?? i}>
                        <span className="incident-card__icon">{icons[inc.type] ?? '⚠️'}</span>
                        <div className="incident-card__info">
                          <p className="incident-card__label">{inc.label ?? 'Reported location'}</p>
                          <p className="incident-card__type">{labels[inc.type] ?? inc.type}</p>
                          {inc.description && (
                            <p className="incident-card__desc">{inc.description}</p>
                          )}
                          {ageText && (
                            <p className="incident-card__age">{ageText}</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                          <span className="incident-card__coords">
                            {inc.lat?.toFixed(4)}, {inc.lng?.toFixed(4)}
                          </span>
                          <button
                            className="incident-card__delete-btn"
                            onClick={() => handleDeleteIncident(inc.id)}
                            title="Delete this incident"
                            aria-label="Delete incident"
                          >
                            🗑️ Delete
                          </button>
                        </div>
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
    </div>
  );
}

/** Helper: returns "Reported X hours/days ago" text for an incident */
function getIncidentAgeText(inc) {
  if (!inc.timestamp) return null;
  // Firestore Timestamp has .toDate(), raw Date is already a Date
  let date;
  if (inc.timestamp?.toDate) {
    date = inc.timestamp.toDate();
  } else if (inc.timestamp instanceof Date) {
    date = inc.timestamp;
  } else if (typeof inc.timestamp?.seconds === 'number') {
    date = new Date(inc.timestamp.seconds * 1000);
  } else {
    return null;
  }
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'reported just now';
  if (diffHours < 24) return `reported ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'reported 1 day ago';
  return `reported ${diffDays} days ago`;
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

  const path = window.location.pathname;
  if (path.startsWith('/track/')) {
    const trackId = path.split('/track/')[1];
    return (
      <ErrorBoundary>
        <TrackJourney trackId={trackId} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
