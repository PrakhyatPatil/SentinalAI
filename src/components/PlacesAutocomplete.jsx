import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * PlacesAutocomplete — location search with Google Maps Places autocomplete.
 * Falls back to Geocoder-based search if AutocompleteService is unavailable.
 */
export default function PlacesAutocomplete({ placeholder, icon, value, onChange, id }) {
  const [inputVal, setInputVal] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const geocoderRef = useRef(null);

  // Initialise services once Google Maps has loaded
  function getAutocompleteService() {
    if (!autocompleteServiceRef.current) {
      try {
        if (window.google?.maps?.places?.AutocompleteService) {
          autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        }
      } catch (e) {
        console.warn('[PlacesAutocomplete] AutocompleteService unavailable:', e.message);
      }
    }
    return autocompleteServiceRef.current;
  }

  function getGeocoder() {
    if (!geocoderRef.current) {
      try {
        if (window.google?.maps?.Geocoder) {
          geocoderRef.current = new window.google.maps.Geocoder();
        }
      } catch (e) {
        console.warn('[PlacesAutocomplete] Geocoder unavailable:', e.message);
      }
    }
    return geocoderRef.current;
  }

  /**
   * Fetch suggestions using AutocompleteService (preferred) or Geocoder (fallback).
   */
  const fetchSuggestions = useCallback((query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const svc = getAutocompleteService();

    if (svc) {
      // ── AutocompleteService path ──────────────────────────────────────────
      setLoading(true);
      svc.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'in' },
          types: ['geocode', 'establishment'],
        },
        (results, status) => {
          setLoading(false);
          const OK = window.google?.maps?.places?.PlacesServiceStatus?.OK ?? 'OK';
          if (status === OK && results && results.length > 0) {
            setSuggestions(results.map((r) => ({
              place_id: r.place_id,
              description: r.description,
              main_text: r.structured_formatting?.main_text ?? r.description,
              secondary_text: r.structured_formatting?.secondary_text ?? '',
            })));
            setOpen(true);
          } else {
            // If Places API failed (quota / not enabled), fall to geocoder
            console.warn('[PlacesAutocomplete] AutocompleteService status:', status, '— falling back to Geocoder');
            fetchViaGeocoder(query);
          }
        }
      );
    } else {
      // ── Geocoder fallback path ────────────────────────────────────────────
      fetchViaGeocoder(query);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function fetchViaGeocoder(query) {
    const geocoder = getGeocoder();
    if (!geocoder) {
      setLoading(false);
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    geocoder.geocode(
      { address: query + ', India', region: 'IN' },
      (results, status) => {
        setLoading(false);
        if (status === 'OK' && results && results.length > 0) {
          const mapped = results.slice(0, 5).map((r) => {
            const parts = r.formatted_address.split(',');
            return {
              place_id: r.place_id,
              description: r.formatted_address,
              main_text: parts[0].trim(),
              secondary_text: parts.slice(1).join(',').trim(),
            };
          });
          setSuggestions(mapped);
          setOpen(true);
        } else {
          setSuggestions([]);
          setOpen(false);
        }
      }
    );
  }

  function handleInput(e) {
    const val = e.target.value;
    setInputVal(val);
    onChange(val);
    setActiveSuggestion(-1);

    clearTimeout(debounceRef.current);
    if (val.length >= 2) {
      debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  }

  function selectSuggestion(place) {
    const text = place.description;
    setInputVal(text);
    onChange(text);
    setSuggestions([]);
    setOpen(false);
    setActiveSuggestion(-1);
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion((p) => Math.min(p + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion((p) => Math.max(p - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestion >= 0) selectSuggestion(suggestions[activeSuggestion]);
      else setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Keep inputVal in sync if parent changes value externally (e.g. demo fill)
  useEffect(() => {
    if (value !== undefined && value !== inputVal) {
      setInputVal(value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight matching part of suggestion text
  function highlight(text, query) {
    if (!query) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <>
        <span>{text.slice(0, idx)}</span>
        <mark className="ac-highlight">{text.slice(idx, idx + query.length)}</mark>
        <span>{text.slice(idx + query.length)}</span>
      </>
    );
  }

  return (
    <div className="ac-wrapper" ref={containerRef}>
      <div className="ac-input-row">
        <span className="ac-icon">{icon}</span>
        <input
          id={id}
          type="text"
          value={inputVal}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => inputVal.length >= 2 && suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="ac-input"
          autoComplete="off"
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && <span className="ac-spinner" />}
        {inputVal && (
          <button
            className="ac-clear"
            onClick={() => { setInputVal(''); onChange(''); setSuggestions([]); setOpen(false); }}
            aria-label="Clear"
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="ac-dropdown" role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={s.place_id || i}
              className={`ac-item ${i === activeSuggestion ? 'ac-item--active' : ''}`}
              onMouseDown={() => selectSuggestion(s)}
              role="option"
              aria-selected={i === activeSuggestion}
            >
              <span className="ac-item-icon">📍</span>
              <div className="ac-item-text">
                <span className="ac-item-main">
                  {highlight(s.main_text || s.description, inputVal)}
                </span>
                {s.secondary_text && (
                  <span className="ac-item-sub">{s.secondary_text}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
