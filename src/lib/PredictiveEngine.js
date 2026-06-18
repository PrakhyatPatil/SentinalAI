/**
 * PredictiveEngine.js — Client-side pattern extraction from incident history.
 * Pure JS — no Gemini calls. Derives risk patterns for the AI Guardian.
 */

const BASE_WEIGHT = {
  harassment_history: 3,
  poor_lighting: 2,
  isolated: 1,
};

/**
 * Build an hourly risk map: { 0: avgScore, 1: avgScore, ..., 23: avgScore }
 * Groups incidents by their `hour` field and averages weights per hour.
 */
export function buildHourlyRiskMap(incidents) {
  if (!incidents || incidents.length === 0) return {};

  const hourBuckets = {};
  for (let h = 0; h < 24; h++) {
    hourBuckets[h] = [];
  }

  for (const inc of incidents) {
    const hour = typeof inc.hour === 'number' ? inc.hour : null;
    if (hour === null || hour < 0 || hour > 23) continue;
    const weight = BASE_WEIGHT[inc.type] ?? 1;
    hourBuckets[hour].push(weight);
  }

  const hourlyRiskMap = {};
  for (let h = 0; h < 24; h++) {
    const bucket = hourBuckets[h];
    if (bucket.length === 0) {
      hourlyRiskMap[h] = 0;
    } else {
      const avg = bucket.reduce((a, b) => a + b, 0) / bucket.length;
      // Normalize to 0-100 scale (max weight is 3 * count factor)
      hourlyRiskMap[h] = Math.round(Math.min(avg * 20, 100));
    }
  }

  return hourlyRiskMap;
}

/**
 * Build a weekday risk map: { 0: score, ..., 6: score } (0=Sun, 6=Sat)
 * Uses timestamps if available.
 */
export function buildWeekdayRiskMap(incidents) {
  if (!incidents || incidents.length === 0) return {};

  const dayBuckets = {};
  for (let d = 0; d < 7; d++) {
    dayBuckets[d] = [];
  }

  for (const inc of incidents) {
    let date = null;
    if (inc.timestamp?.toDate) {
      date = inc.timestamp.toDate();
    } else if (inc.timestamp instanceof Date) {
      date = inc.timestamp;
    } else if (typeof inc.timestamp?.seconds === 'number') {
      date = new Date(inc.timestamp.seconds * 1000);
    }

    if (!date) continue;
    const day = date.getDay();
    const weight = BASE_WEIGHT[inc.type] ?? 1;
    dayBuckets[day].push(weight);
  }

  const weekdayRiskMap = {};
  for (let d = 0; d < 7; d++) {
    const bucket = dayBuckets[d];
    if (bucket.length === 0) {
      weekdayRiskMap[d] = 0;
    } else {
      const avg = bucket.reduce((a, b) => a + b, 0) / bucket.length;
      weekdayRiskMap[d] = Math.round(Math.min(avg * 20, 100));
    }
  }

  return weekdayRiskMap;
}

/**
 * Get the hour with highest average weight.
 */
export function getPeakRiskHour(hourlyRiskMap) {
  let maxHour = 0;
  let maxScore = -1;
  for (const [hour, score] of Object.entries(hourlyRiskMap)) {
    if (score > maxScore) {
      maxScore = score;
      maxHour = Number(hour);
    }
  }
  return maxHour;
}

/**
 * Get the hour with lowest average weight.
 */
export function getSafestHour(hourlyRiskMap) {
  let minHour = 0;
  let minScore = Infinity;
  for (const [hour, score] of Object.entries(hourlyRiskMap)) {
    if (score < minScore) {
      minScore = score;
      minHour = Number(hour);
    }
  }
  return minHour;
}

/**
 * Build a CSS linear-gradient for the time slider track
 * based on hourly risk data. Green for low risk, red for high risk.
 */
export function getSliderGradient(hourlyRiskMap) {
  if (!hourlyRiskMap || Object.keys(hourlyRiskMap).length === 0) {
    return 'linear-gradient(90deg, #6d28d9, #a78bfa)';
  }

  const stops = [];
  for (let h = 0; h <= 23; h++) {
    const score = hourlyRiskMap[h] ?? 0;
    const pct = ((h / 23) * 100).toFixed(1);
    let color;
    if (score <= 33) {
      color = '#22c55e'; // green
    } else if (score <= 66) {
      color = '#f59e0b'; // amber
    } else {
      color = '#ef4444'; // red
    }
    stops.push(`${color} ${pct}%`);
  }

  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

/**
 * Get all pattern data as a single object for AIGuardian.
 */
export function extractPatterns(incidents) {
  const hourlyRiskMap = buildHourlyRiskMap(incidents);
  const weekdayRiskMap = buildWeekdayRiskMap(incidents);
  return {
    hourlyRiskMap,
    weekdayRiskMap,
    peakRiskHour: getPeakRiskHour(hourlyRiskMap),
    safestHour: getSafestHour(hourlyRiskMap),
  };
}
