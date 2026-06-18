import React from 'react';

/**
 * BestTimeWidget — Shows safest/riskiest travel windows and actionable forecast.
 * Only visible when a route is active and forecast data is loaded.
 */
export default function BestTimeWidget({ forecast, loading }) {
  if (loading) {
    return (
      <div className="best-time">
        <h3 className="best-time__title">🕐 Best Time to Travel</h3>
        <div className="best-time__loading">
          <div className="skeleton-line" style={{ width: '80%' }} />
          <div className="skeleton-line" style={{ width: '70%' }} />
          <div className="skeleton-line" style={{ width: '90%' }} />
        </div>
      </div>
    );
  }

  if (!forecast) return null;

  const { safestTimeWindow, riskiestTimeWindow, actionableForecast, trendSummary } = forecast;

  // Check if current time is in the safest window
  const currentHour = new Date().getHours();
  const isInSafestWindow = checkIfInWindow(currentHour, safestTimeWindow);

  // Determine current time risk level
  const currentPrediction = forecast.predictions?.find(p => Math.abs(p.hour - currentHour) <= 1);
  const currentRiskScore = currentPrediction?.predictedScore ?? 50;
  const currentRiskLabel = currentRiskScore <= 33 ? 'LOW' : currentRiskScore <= 66 ? 'MODERATE' : 'HIGH';
  const currentRiskColor = currentRiskScore <= 33 ? '#22c55e' : currentRiskScore <= 66 ? '#f59e0b' : '#ef4444';

  return (
    <div className="best-time">
      <h3 className="best-time__title">🕐 Best Time to Travel</h3>

      <div className="best-time__rows">
        <div className="best-time__row">
          <span className="best-time__label">Safest window:</span>
          <span className="best-time__value best-time__value--safe">
            {safestTimeWindow} ✅
          </span>
        </div>
        <div className="best-time__row">
          <span className="best-time__label">Riskiest window:</span>
          <span className="best-time__value best-time__value--risky">
            {riskiestTimeWindow} ⚠️
          </span>
        </div>
        <div className="best-time__row">
          <span className="best-time__label">Current time risk:</span>
          <span className="best-time__value" style={{ color: currentRiskColor, fontWeight: 700 }}>
            {currentRiskLabel}
          </span>
        </div>
      </div>

      <div className="best-time__advice">
        {isInSafestWindow ? (
          <p className="best-time__quote best-time__quote--safe">
            ✅ Good time to travel — you're in the safest window for this route
          </p>
        ) : (
          <p className="best-time__quote">
            "{actionableForecast || trendSummary}"
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Simple heuristic to check if current hour falls in a time window string.
 * e.g., "9 AM – 12 PM" checks if currentHour is between 9 and 12.
 */
function checkIfInWindow(currentHour, windowStr) {
  if (!windowStr) return false;
  try {
    const parts = windowStr.split(/[–\-]/);
    if (parts.length < 2) return false;

    const startHour = parseHourString(parts[0].trim());
    const endHour = parseHourString(parts[1].trim());

    if (startHour === null || endHour === null) return false;

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour <= endHour;
    } else {
      // Wraps around midnight
      return currentHour >= startHour || currentHour <= endHour;
    }
  } catch {
    return false;
  }
}

function parseHourString(str) {
  const match = str.match(/(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const isPM = match[2].toUpperCase() === 'PM';
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return h;
}
