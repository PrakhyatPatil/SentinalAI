import { haversine } from './haversine.js';

const BASE_WEIGHT = {
  harassment_history: 3,
  poor_lighting: 2,
  isolated: 1,
};

const NIGHT_MULTIPLIER = {
  harassment_history: 1.5,
  poor_lighting: 2.0,
  isolated: 1.8,
};

export function isNightHour(hour) {
  return hour >= 21 || hour < 6;
}

/**
 * Returns a risk score 0–100 for the given route waypoints
 * given the current list of incidents and the slider hour.
 */
export function scoreRoute(waypoints, incidents, sliderHour, geminiWeights = null) {
  if (!waypoints || waypoints.length === 0) return 0;

  const MAX_PER_WAYPOINT = 25;
  let total = 0;

  for (const wp of waypoints) {
    const nearby = incidents.filter((i) => haversine(wp, i) <= 150);
    let wpScore = nearby.reduce((sum, i) => {
      const id = i.id ?? i.label ?? `${i.lat},${i.lng}`;
      let weight = null;
      if (geminiWeights) {
        if (geminiWeights instanceof Map) {
          weight = geminiWeights.get(String(id));
        } else if (typeof geminiWeights === 'object') {
          weight = geminiWeights[id];
        }
      }

      if (weight != null) {
        return sum + weight;
      }

      const base = BASE_WEIGHT[i.type] ?? 1;
      const mult = isNightHour(sliderHour)
        ? NIGHT_MULTIPLIER[i.type] ?? 1
        : 1;
      return sum + base * mult;
    }, 0);
    total += Math.min(wpScore, MAX_PER_WAYPOINT);
  }

  const maxPossible = waypoints.length * MAX_PER_WAYPOINT;
  if (maxPossible === 0) return 0;
  return Math.round(Math.min((total / maxPossible) * 100, 100));
}

/**
 * Returns the stroke color string for a given segment score.
 */
export function scoreToColor(score) {
  if (score <= 33) return '#22c55e';
  if (score <= 66) return '#f59e0b';
  return '#ef4444';
}

/**
 * Returns "safe" | "moderate" | "high" label string.
 */
export function scoreToLabel(score) {
  if (score <= 33) return 'safe';
  if (score <= 66) return 'moderate';
  return 'high';
}

/**
 * Returns a time-weighted heatmap weight for a single incident.
 */
export function heatmapWeight(incident, sliderHour) {
  const base = BASE_WEIGHT[incident.type] ?? 1;
  const mult = isNightHour(sliderHour)
    ? NIGHT_MULTIPLIER[incident.type] ?? 1
    : 1;
  return base * mult;
}
