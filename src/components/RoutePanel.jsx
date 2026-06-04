import React, { useState, useCallback } from 'react';
import PlacesAutocomplete from './PlacesAutocomplete.jsx';

export default function RoutePanel({ onFindRoute, loading, userLocation, onStartTracking, locationLoading }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [locating, setLocating] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (origin.trim() && destination.trim()) {
      onFindRoute(origin.trim(), destination.trim());
    }
  }

  function fillDemo() {
    setOrigin('AITR College, Indore');
    setDestination('Vijay Nagar Square, Indore');
  }

  const handleUseMyLocation = useCallback(() => {
    if (userLocation) {
      // Already have location — reverse geocode
      reverseGeocode(userLocation);
    } else {
      // Start tracking and wait for location
      setLocating(true);
      if (onStartTracking) {
        onStartTracking((latlng) => {
          reverseGeocode(latlng);
          setLocating(false);
        });
      }
    }
  }, [userLocation, onStartTracking]);

  function reverseGeocode(latlng) {
    if (!window.google?.maps?.Geocoder) {
      setOrigin(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`);
      return;
    }
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        setOrigin(results[0].formatted_address);
      } else {
        setOrigin(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`);
      }
    });
  }

  const canSubmit = origin.trim().length > 2 && destination.trim().length > 2;

  return (
    <form className="route-panel" onSubmit={handleSubmit}>
      <h2 className="route-panel__title">Plan Your Route</h2>

      <div className="route-panel__inputs">
        <div className="ac-wrapper--with-locate">
          <PlacesAutocomplete
            id="origin-input"
            placeholder="From — pick up location"
            icon="📍"
            value={origin}
            onChange={setOrigin}
          />
          <button
            type="button"
            className={`locate-btn ${locating || locationLoading ? 'loading' : ''} ${userLocation ? 'active' : ''}`}
            onClick={handleUseMyLocation}
            title="Use my current location"
            aria-label="Use my current location"
          >
            {locating || locationLoading ? (
              <span className="locate-btn__spinner" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <circle cx="12" cy="12" r="3" fill={userLocation ? 'currentColor' : 'none'} />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <circle cx="12" cy="12" r="8" />
              </svg>
            )}
          </button>
        </div>
        <div className="input-connector" />
        <PlacesAutocomplete
          id="destination-input"
          placeholder="To — destination"
          icon="🏁"
          value={destination}
          onChange={setDestination}
        />
      </div>

      <button
        id="find-route-btn"
        type="submit"
        className="route-panel__submit"
        disabled={loading || !canSubmit}
        aria-label="Find safe route"
      >
        {loading ? (
          <><span className="btn-spinner" /> Analysing Route…</>
        ) : (
          <>🛡️ Find Safe Route</>
        )}
      </button>

      <button
        type="button"
        className="route-panel__demo-btn"
        onClick={fillDemo}
        title="Load demo route: AITR → Vijay Nagar"
      >
        Load Demo Route
      </button>
    </form>
  );
}
