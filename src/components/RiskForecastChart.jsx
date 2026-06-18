import React from 'react';

/**
 * RiskForecastChart — Pure CSS mini bar chart showing predicted risk at 7 hours.
 */
export default function RiskForecastChart({ forecast, loading }) {
  if (loading) {
    return (
      <div className="risk-forecast">
        <h3 className="risk-forecast__title">📊 Risk Forecast — This Route</h3>
        <div className="risk-forecast__loading">
          <div className="skeleton-line" style={{ width: '100%', height: '80px' }} />
        </div>
      </div>
    );
  }

  if (!forecast || !forecast.predictions || forecast.predictions.length === 0) return null;

  const predictions = forecast.predictions;
  const maxScore = Math.max(...predictions.map((p) => p.predictedScore), 1);

  function scoreColor(score) {
    if (score <= 33) return 'var(--risk-safe)';
    if (score <= 66) return 'var(--risk-moderate)';
    return 'var(--risk-high)';
  }

  function formatHour(h) {
    if (h === 0) return '12A';
    if (h === 12) return '12P';
    if (h < 12) return `${h}A`;
    return `${h - 12}P`;
  }

  return (
    <div className="risk-forecast">
      <h3 className="risk-forecast__title">📊 Risk Forecast — This Route</h3>

      <div className="risk-forecast__chart">
        {predictions.map((p, i) => {
          const heightPct = Math.max((p.predictedScore / maxScore) * 100, 4);
          return (
            <div className="risk-forecast__bar-col" key={i}>
              <span className="risk-forecast__bar-val">{p.predictedScore}</span>
              <div
                className="risk-forecast__bar"
                style={{
                  height: `${heightPct}%`,
                  background: scoreColor(p.predictedScore),
                  animationDelay: `${i * 60}ms`,
                }}
              />
              <span className="risk-forecast__bar-label">{formatHour(p.hour)}</span>
            </div>
          );
        })}
      </div>

      <div className="risk-forecast__summary">
        <span className="risk-forecast__window risk-forecast__window--safe">
          Safest: {forecast.safestTimeWindow}
        </span>
        <span className="risk-forecast__dot">·</span>
        <span className="risk-forecast__window risk-forecast__window--risky">
          Riskiest: {forecast.riskiestTimeWindow}
        </span>
      </div>
    </div>
  );
}
