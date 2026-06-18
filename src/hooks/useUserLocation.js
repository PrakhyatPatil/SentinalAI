import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useUserLocation — watches navigator.geolocation for live position updates.
 *
 * Returns:
 *   position   { lat, lng } | null
 *   accuracy   number (metres) | null
 *   heading    number (degrees) | null
 *   loading    bool  — true while waiting for first fix
 *   error      string | null
 *   isTracking bool  — whether watch is active
 *   startTracking  () => void
 *   stopTracking   () => void
 *   centerOnUser   () => void  — fires a one-shot getCurrentPosition
 */
export function useUserLocation() {
  const [position, setPosition]   = useState(null);
  const [accuracy, setAccuracy]   = useState(null);
  const [heading, setHeading]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef(null);

  const GEO_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
  };

  function onSuccess(pos) {
    const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    try {
      sessionStorage.setItem('saferoute_last_location', JSON.stringify(latlng));
    } catch (e) {
      console.warn('[useUserLocation] sessionStorage write failed:', e);
    }
    setPosition(latlng);
    setAccuracy(pos.coords.accuracy);
    setHeading(pos.coords.heading ?? null);
    setLoading(false);
    setError(null);
  }

  function onError(err) {
    setLoading(false);
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError('Location permission denied. Please enable it in your browser settings.');
        break;
      case err.POSITION_UNAVAILABLE:
        setError('Location unavailable. Please check your device GPS.');
        break;
      case err.TIMEOUT:
        setError('Location request timed out. Retrying…');
        break;
      default:
        setError('Unable to retrieve location.');
    }
    setIsTracking(false);
  }

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    setError(null);
    setIsTracking(true);

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      GEO_OPTIONS,
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setLoading(false);
  }, []);

  /** One-shot — get position without starting a continuous watch */
  const centerOnUser = useCallback((onGot) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try {
          sessionStorage.setItem('saferoute_last_location', JSON.stringify(latlng));
        } catch (e) {
          console.warn('[useUserLocation] sessionStorage write failed:', e);
        }
        setPosition(latlng);
        setAccuracy(pos.coords.accuracy);
        if (onGot) onGot(latlng);
      },
      onError,
      GEO_OPTIONS,
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    position,
    accuracy,
    heading,
    loading,
    error,
    isTracking,
    startTracking,
    stopTracking,
    centerOnUser,
  };
}
