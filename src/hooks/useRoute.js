import { useState, useCallback } from 'react';

/**
 * useRoute — wraps the Google Maps Directions API.
 * Returns:
 *   - waypoints: full road-accurate path (all step polyline points) for display
 *   - scoringWaypoints: lightly-sampled subset used for risk scoring
 *   - directionsResult: raw DirectionsResult
 */
export function useRoute() {
  const [directionsResult, setDirectionsResult] = useState(null);
  const [waypoints, setWaypoints] = useState([]);          // full path for drawing
  const [scoringWaypoints, setScoringWaypoints] = useState([]); // sampled for scoring
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRoute = useCallback(async (origin, destination) => {
    if (!origin || !destination) return;

    setLoading(true);
    setError(null);

    try {
      const directionsService = new window.google.maps.DirectionsService();

      const result = await new Promise((resolve, reject) => {
        directionsService.route(
          {
            origin,
            destination,
            travelMode: window.google.maps.TravelMode.WALKING,
          },
          (result, status) => {
            if (status === 'OK') resolve(result);
            else reject(new Error(`Directions API: ${status}`));
          }
        );
      });

      setDirectionsResult(result);

      // Build the full road-snapped path by concatenating every step's polyline.
      // This gives a dense, road-accurate polyline rather than the simplified overview_path.
      const allPoints = [];
      const legs = result.routes[0].legs;
      for (const leg of legs) {
        for (const step of leg.steps) {
          const stepPoints = step.path; // google.maps.LatLng[]
          for (const p of stepPoints) {
            allPoints.push({ lat: p.lat(), lng: p.lng() });
          }
        }
      }

      setWaypoints(allPoints);

      // Lightly sample for risk scoring (every 4th point keeps accuracy while reducing work)
      const sampled = allPoints.filter((_, idx) => idx % 4 === 0);
      setScoringWaypoints(sampled);
    } catch (err) {
      setError(err.message);
      console.error('[useRoute]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRoute = useCallback(() => {
    setDirectionsResult(null);
    setWaypoints([]);
    setScoringWaypoints([]);
    setError(null);
  }, []);

  return { directionsResult, waypoints, scoringWaypoints, loading, error, fetchRoute, clearRoute };
}
