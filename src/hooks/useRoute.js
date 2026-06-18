import { useState, useCallback, useMemo } from 'react';
import { scoreRoute } from '../lib/riskScore.js';

/**
 * useRoute — wraps the Google Maps Directions API, queries alternative routes,
 * and dynamically selects the safest route based on safety incidents and the selected hour.
 *
 * Parameters:
 *   - incidents: array of all incident reports
 *   - sliderHour: currently selected slider hour
 *
 * Returns:
 *   - waypoints: full coordinates of the safest route option (for drawing segments)
 *   - scoringWaypoints: lightly-sampled coordinates of the safest route (for scoring)
 *   - directionsResult: DirectionsResult filtered to contain only the selected safest route
 */
export function useRoute(incidents, sliderHour) {
  const [rawResult, setRawResult] = useState(null);
  const [allRouteOptions, setAllRouteOptions] = useState([]);
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
            provideRouteAlternatives: true, // request all alternative walking routes
          },
          (result, status) => {
            if (status === 'OK') resolve(result);
            else reject(new Error(`Directions API: ${status}`));
          }
        );
      });

      setRawResult(result);

      // Extract waypoints and scoringWaypoints for each alternative route
      const options = result.routes.map((route, routeIdx) => {
        const allPoints = [];
        const legs = route.legs;
        for (const leg of legs) {
          for (const step of leg.steps) {
            const stepPoints = step.path;
            for (const p of stepPoints) {
              allPoints.push({ lat: p.lat(), lng: p.lng() });
            }
          }
        }
        const sampled = allPoints.filter((_, idx) => idx % 4 === 0);
        return {
          routeIndex: routeIdx,
          waypoints: allPoints,
          scoringWaypoints: sampled,
        };
      });

      setAllRouteOptions(options);
    } catch (err) {
      setError(err.message);
      console.error('[useRoute]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRoute = useCallback(() => {
    setRawResult(null);
    setAllRouteOptions([]);
    setError(null);
  }, []);

  // Dynamically evaluate and select the route option with the lowest risk score
  const selectedRouteIndex = useMemo(() => {
    if (allRouteOptions.length === 0) return 0;

    let bestIdx = 0;
    let minScore = Infinity;

    allRouteOptions.forEach((option, idx) => {
      const score = scoreRoute(option.scoringWaypoints, incidents, sliderHour);
      if (score < minScore) {
        minScore = score;
        bestIdx = idx;
      }
    });

    console.log(`[useRoute] Evaluated ${allRouteOptions.length} route options. Selected safest option at index ${bestIdx} (Risk Score: ${minScore})`);
    return bestIdx;
  }, [allRouteOptions, incidents, sliderHour]);

  const waypoints = useMemo(() => {
    return allRouteOptions[selectedRouteIndex]?.waypoints ?? [];
  }, [allRouteOptions, selectedRouteIndex]);

  const scoringWaypoints = useMemo(() => {
    return allRouteOptions[selectedRouteIndex]?.scoringWaypoints ?? [];
  }, [allRouteOptions, selectedRouteIndex]);

  // Expose a DirectionsResult containing only the selected safest route
  const directionsResult = useMemo(() => {
    if (!rawResult || rawResult.routes.length === 0) return null;
    return {
      ...rawResult,
      routes: [rawResult.routes[selectedRouteIndex]],
    };
  }, [rawResult, selectedRouteIndex]);

  return { directionsResult, waypoints, scoringWaypoints, loading, error, fetchRoute, clearRoute };
}
