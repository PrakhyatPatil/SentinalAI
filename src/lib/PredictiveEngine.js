/**
 * PredictiveEngine.js — Client-side pattern extraction from incident history.
 * No Gemini calls — pure JavaScript computation.
 */
import { haversine } from './haversine.js';

const BASE_WEIGHT = {
  harassment_history: 3,
  poor_lighting: 2,
  isolated: 1,
};

/**
 * Get the time category for a given hour.
 */
export function getTimeCategory(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  if (hour >= 20 && hour < 23) return 'night';
  return 'late_night';
}

/**
 * Build an hourly risk map: average weighted score per hour.
 * Returns { 0: avgScore, 1: avgScore, ... 23: avgScore }
 */
export function buildHourlyRiskMap(incidents) {
  const hourBuckets = {};
  const hourCounts = {};

  for (let h = 0; h < 24; h++) {
    hourBuckets[h] = 0;
    hourCounts[h] = 0;
  }

  for (const inc of incidents) {
    const h = inc.hour ?? 0;
    const weight = BASE_WEIGHT[inc.type] ?? 1;
    hourBuckets[h] += weight;
    hourCounts[h]++;
  }

  const result = {};
  for (let h = 0; h < 24; h++) {
    result[h] = hourCounts[h] > 0
      ? Math.round((hourBuckets[h] / hourCounts[h]) * 20) // scale to ~0-100
      : 0;
  }

  // Normalize so max is approximately 100
  const maxVal = Math.max(1, ...Object.values(result));
  if (maxVal > 0) {
    for (let h = 0; h < 24; h++) {
      result[h] = Math.round((result[h] / maxVal) * 100);
    }
  }

  return result;
}

/**
 * Get the hour with the highest average risk weight.
 */
export function getPeakRiskHour(hourlyRiskMap) {
  let maxHour = 0;
  let maxScore = -1;
  for (const [h, score] of Object.entries(hourlyRiskMap)) {
    if (score > maxScore) {
      maxScore = score;
      maxHour = Number(h);
    }
  }
  return maxHour;
}

/**
 * Get the hour with the lowest average risk weight.
 */
export function getSafestHour(hourlyRiskMap) {
  let minHour = 0;
  let minScore = Infinity;
  for (const [h, score] of Object.entries(hourlyRiskMap)) {
    if (score < minScore) {
      minScore = score;
      minHour = Number(h);
    }
  }
  return minHour;
}

/**
 * Build a weekday risk map: average score per day of week.
 * Returns { 0: score, 1: score, ... 6: score } (0=Sun)
 * Uses timestamp if available, otherwise returns uniform distribution.
 */
export function buildWeekdayRiskMap(incidents) {
  const dayBuckets = {};
  const dayCounts = {};

  for (let d = 0; d < 7; d++) {
    dayBuckets[d] = 0;
    dayCounts[d] = 0;
  }

  let hasTimestamps = false;

  for (const inc of incidents) {
    let day = null;
    if (inc.timestamp && typeof inc.timestamp.toMillis === 'function') {
      day = new Date(inc.timestamp.toMillis()).getDay();
      hasTimestamps = true;
    } else if (inc.timestamp && typeof inc.timestamp === 'number') {
      day = new Date(inc.timestamp).getDay();
      hasTimestamps = true;
    }

    if (day !== null) {
      const weight = BASE_WEIGHT[inc.type] ?? 1;
      dayBuckets[day] += weight;
      dayCounts[day]++;
    }
  }

  if (!hasTimestamps) {
    // Return uniform distribution
    const result = {};
    for (let d = 0; d < 7; d++) result[d] = 50;
    return result;
  }

  const result = {};
  for (let d = 0; d < 7; d++) {
    result[d] = dayCounts[d] > 0
      ? Math.round((dayBuckets[d] / dayCounts[d]) * 20)
      : 0;
  }

  // Normalize
  const maxVal = Math.max(1, ...Object.values(result));
  for (let d = 0; d < 7; d++) {
    result[d] = Math.round((result[d] / maxVal) * 100);
  }

  return result;
}

/**
 * Build the full pattern object to pass to AIGuardian.predictFutureRisk().
 */
export function extractPatterns(incidents) {
  const hourlyRiskMap = buildHourlyRiskMap(incidents);
  const weekdayRiskMap = buildWeekdayRiskMap(incidents);

  return {
    hourlyRiskMap,
    peakRiskHour: getPeakRiskHour(hourlyRiskMap),
    safestHour: getSafestHour(hourlyRiskMap),
    weekdayRiskMap,
    totalIncidents: incidents.length,
  };
}

/**
 * Get a score color for a given score.
 */
export function getScoreColor(score) {
  if (score <= 33) return '#22c55e';
  if (score <= 66) return '#f59e0b';
  return '#ef4444';
}

/**
 * Get a risk level label from a score.
 */
export function getScoreLevel(score) {
  if (score <= 25) return 'low';
  if (score <= 50) return 'moderate';
  if (score <= 75) return 'high';
  return 'critical';
}

/**
 * Build a CSS linear-gradient string for the slider track from hourlyRiskMap.
 */
export function buildSliderGradient(hourlyRiskMap) {
  const stops = [];
  for (let h = 0; h <= 23; h++) {
    const score = hourlyRiskMap[h] ?? 0;
    const color = getScoreColor(score);
    const pct = ((h / 23) * 100).toFixed(1);
    stops.push(`${color} ${pct}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

/**
 * Count incidents by type.
 */
export function countIncidentTypes(incidents) {
  const counts = { poor_lighting: 0, isolated: 0, harassment_history: 0 };
  for (const inc of incidents) {
    if (counts[inc.type] !== undefined) counts[inc.type]++;
  }
  return counts;
}

/**
 * Count recent incidents (within last 24 hours).
 */
export function countRecentIncidents(incidents) {
  const now = Date.now();
  const DAY_MS = 86400000;
  return incidents.filter(i => {
    if (i.timestamp && typeof i.timestamp.toMillis === 'function') {
      return now - i.timestamp.toMillis() < DAY_MS;
    }
    return false; // If no valid timestamp, don't count as recent
  }).length;
}
