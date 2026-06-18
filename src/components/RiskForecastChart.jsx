import React from 'react';

/**
 * RiskForecastChart — Mini CSS-only bar chart for predicted risk levels.
 * 7 bars for hours 6, 9, 12, 15, 18, 21, 23.
 */
export default function RiskForecastChart({ forecast, loading }) {
  if (loading) {
    return (
      <div className="risk-forecast">
        <h3 className="risk-forecast__title">📊 Risk Forecast — This Route</h3>
        <div className="risk-forecast__loading">
          <div className="risk-forecast__skeleton-bars">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="risk-forecast__skeleton-bar" style={{ height: `${30 + Math.random() * 40}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!forecast || !forecast.predictions) return null;

  const predictions = forecast.predictions;
  const maxScore = Math.max(1, ...predictions.map(p => p.predictedScore));

  function formatHour(h) {
    if (h === 0) return '12AM';
    if (h === 12) return '12PM';
    if (h > 12) return `${h - 12}PM`;
    return `${h}AM`;
  }

  function getBarColor(score) {
    if (score <= 33) return '#22c55e';
    if (score <= 66) return '#f59e0b';
    return '#ef4444';
  }

  return (
    <div className="risk-forecast">
      <h3 className="risk-forecast__title">📊 Risk Forecast — This Route</h3>

      <div className="risk-forecast__chart">
        {predictions.map((pred, i) => {
          const heightPct = Math.max(5, (pred.predictedScore / maxScore) * 100);
          const color = getBarColor(pred.predictedScore);
          return (
            <div className="risk-forecast__bar-col" key={i}>
              <div className="risk-forecast__bar-value">{pred.predictedScore}</div>
              <div
                className="risk-forecast__bar"
                style={{
                  height: `${heightPct}%`,
                  background: `linear-gradient(180deg, ${color}, ${color}88)`,
                  animationDelay: `${i * 80}ms`,
                }}
                title={`${formatHour(pred.hour)}: ${pred.predictedScore}/100 (${pred.confidence} confidence)`}
              />
              <div className="risk-forecast__bar-label">{formatHour(pred.hour)}</div>
            </div>
          );
        })}
      </div>

      <div className="risk-forecast__summary">
        <span className="risk-forecast__safe">
          ✅ Safest: {forecast.safestTimeWindow}
        </span>
        <span className="risk-forecast__dot">·</span>
        <span className="risk-forecast__risky">
          ⚠️ Riskiest: {forecast.riskiestTimeWindow}
        </span>
      </div>
    </div>
  );
}
