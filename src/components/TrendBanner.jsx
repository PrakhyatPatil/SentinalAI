import React, { useState, useEffect } from 'react';

/**
 * TrendBanner — Dismissible info banner at bottom of map.
 * Shows once per session (sessionStorage flag).
 */
export default function TrendBanner({ trendAnalysis, loading }) {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('saferoute_trend_dismissed') === 'true';
  });

  if (dismissed || loading || !trendAnalysis || !trendAnalysis.trendInsight) {
    return null;
  }

  // Don't show fallback text
  if (trendAnalysis.trendInsight === 'Trend data is currently unavailable.') {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem('saferoute_trend_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="trend-banner">
      <span className="trend-banner__icon">📊</span>
      <span className="trend-banner__text">
        <strong>Trend Insight:</strong> {trendAnalysis.trendInsight}
      </span>
      <button className="trend-banner__dismiss" onClick={handleDismiss} aria-label="Dismiss">
        Dismiss
      </button>
    </div>
  );
}
