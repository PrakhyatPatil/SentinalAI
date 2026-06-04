import React, { useState } from 'react';
import PlacesAutocomplete from './PlacesAutocomplete.jsx';

export default function RoutePanel({ onFindRoute, loading }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

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

  const canSubmit = origin.trim().length > 2 && destination.trim().length > 2;

  return (
    <form className="route-panel" onSubmit={handleSubmit}>
      <h2 className="route-panel__title">Plan Your Route</h2>

      <div className="route-panel__inputs">
        <PlacesAutocomplete
          id="origin-input"
          placeholder="From — pick up location"
          icon="📍"
          value={origin}
          onChange={setOrigin}
        />
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
