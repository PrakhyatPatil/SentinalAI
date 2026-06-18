import { useMemo } from 'react';
import { scoreRoute, scoreToColor, scoreToLabel } from '../lib/riskScore.js';
import { haversine } from '../lib/haversine.js';

const SEGMENT_SIZE = 20; // full path points per coloured polyline segment

/**
 * useRiskScore — computes the aggregate risk score and coloured segments.
 *
 * @param {Array} waypoints        Full road-accurate path (for drawing segments)
 * @param {Array} scoringWaypoints Sampled subset (for score + nearby-incidents)
 * @param {Array} incidents
 * @param {number} sliderHour
 */
export function useRiskScore(waypoints, scoringWaypoints, incidents, sliderHour) {
  // Overall score uses the lighter sampled array
  const riskScore = useMemo(
    () => scoreRoute(scoringWaypoints, incidents, sliderHour),
    [scoringWaypoints, incidents, sliderHour]
  );

  const riskLabel = useMemo(() => scoreToLabel(riskScore), [riskScore]);

  /**
   * Coloured polyline segments built from the FULL path so the line
   * follows roads precisely. Segment scoring uses a subset of each chunk.
   */
  const segmentColors = useMemo(() => {
    if (!waypoints || waypoints.length === 0) return [];

    const segments = [];
    for (let i = 0; i < waypoints.length; i += SEGMENT_SIZE) {
      const chunk = waypoints.slice(i, i + SEGMENT_SIZE + 1);
      // Sample every 4th point for scoring within the chunk
      const chunkSample = chunk.filter((_, idx) => idx % 4 === 0);
      const segScore = scoreRoute(chunkSample.length > 0 ? chunkSample : chunk, incidents, sliderHour);
      segments.push({
        waypoints: chunk,
        score: segScore,
        color: scoreToColor(segScore),
      });
    }
    return segments;
  }, [waypoints, incidents, sliderHour]);

  /**
   * Returns incidents within 150m of the route (for Gemini prompt).
   * Uses scoringWaypoints for efficiency.
   */
  const nearbyIncidents = useMemo(() => {
    if (!scoringWaypoints || scoringWaypoints.length === 0) return [];
    const seen = new Set();
    const result = [];
    for (const wp of scoringWaypoints) {
      for (const inc of incidents) {
        if (!seen.has(inc.id ?? inc.label) && haversine(wp, inc) <= 150) {
          seen.add(inc.id ?? inc.label);
          result.push(inc);
        }
      }
    }
    return result;
  }, [scoringWaypoints, incidents]);

  return { riskScore, riskLabel, segmentColors, nearbyIncidents };
}
