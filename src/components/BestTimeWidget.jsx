import React from 'react';

/**
 * BestTimeWidget — "Best Time to Travel" card.
 * Visible only when a route is active and ForecastData is loaded.
 */
export default function BestTimeWidget({ forecast, loading }) {
  if (loading) {
    return (
      <div className="best-time">
        <h3 className="best-time__title">🕐 Best Time to Travel</h3>
        <div className="best-time__loading">
          <div className="skeleton-line" style={{ width: '70%' }} />
          <div className="skeleton-line" style={{ width: '55%' }} />
        </div>
      </div>
    );
  }

  if (!forecast) return null;

  const currentHour = new Date().getHours();

  // Determine if current time is in the safest window
  // Parse "9 AM – 12 PM" style strings
  function parseWindow(windowStr) {
    if (!windowStr) return null;
    const match = windowStr.match(/(\d+)\s*(AM|PM)\s*[–-]\s*(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    let start = parseInt(match[1]);
    const startMeridiem = match[2].toUpperCase();
    let end = parseInt(match[3]);
    const endMeridiem = match[4].toUpperCase();
    if (startMeridiem === 'PM' && start !== 12) start += 12;
    if (startMeridiem === 'AM' && start === 12) start = 0;
    if (endMeridiem === 'PM' && end !== 12) end += 12;
    if (endMeridiem === 'AM' && end === 12) end = 0;
    return { start, end };
  }

  const safestWindow = parseWindow(forecast.safestTimeWindow);
  const isInSafestWindow = safestWindow &&
    ((safestWindow.start <= safestWindow.end)
      ? (currentHour >= safestWindow.start && currentHour < safestWindow.end)
      : (currentHour >= safestWindow.start || currentHour < safestWindow.end));

  // Determine current time risk level from predictions
  const currentPred = forecast.predictions?.reduce((closest, p) => {
    return Math.abs(p.hour - currentHour) < Math.abs(closest.hour - currentHour) ? p : closest;
  }, forecast.predictions[0]);

  const currentRiskLevel = !currentPred ? 'UNKNOWN'
    : currentPred.predictedScore <= 33 ? 'LOW'
      : currentPred.predictedScore <= 66 ? 'MODERATE'
        : 'HIGH';

  const riskLevelColor = {
    LOW: 'var(--risk-safe)',
    MODERATE: 'var(--risk-moderate)',
    HIGH: 'var(--risk-high)',
    UNKNOWN: 'var(--text-muted)',
  };

  return (
    <div className="best-time">
      <h3 className="best-time__title">🕐 Best Time to Travel</h3>

      <div className="best-time__rows">
        <div className="best-time__row">
          <span className="best-time__label">Safest window:</span>
          <span className="best-time__value best-time__value--safe">
            {forecast.safestTimeWindow} ✅
          </span>
        </div>
        <div className="best-time__row">
          <span className="best-time__label">Riskiest window:</span>
          <span className="best-time__value best-time__value--risky">
            {forecast.riskiestTimeWindow} ⚠️
          </span>
        </div>
        <div className="best-time__row">
          <span className="best-time__label">Current time risk:</span>
          <span
            className="best-time__value best-time__value--level"
            style={{ color: riskLevelColor[currentRiskLevel] }}
          >
            {currentRiskLevel}
          </span>
        </div>
      </div>

      <div className="best-time__quote">
        {isInSafestWindow
          ? "✅ Good time to travel — you're in the safest window for this route."
          : (forecast.actionableForecast || "Consider travelling during the safest window to minimize risk.")}
      </div>
    </div>
  );
}
