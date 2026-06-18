import React, { useState, useEffect } from 'react';

/**
 * TrendInsightBanner — Dismissible info banner at the bottom of the map.
 * Shows once per session (sessionStorage flag).
 */
export default function TrendInsightBanner({ trendAnalysis, loading }) {
  const [dismissed, setDismissed] = useState(false);

  // Check sessionStorage on mount
  useEffect(() => {
    if (sessionStorage.getItem('saferoute_trend_dismissed') === 'true') {
      setDismissed(true);
    }
  }, []);

  if (dismissed || loading || !trendAnalysis || !trendAnalysis.trendInsight) return null;

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem('saferoute_trend_dismissed', 'true');
  }

  return (
    <div className="trend-banner" role="status">
      <span className="trend-banner__icon">📊</span>
      <span className="trend-banner__text">
        <strong>Trend Insight:</strong> {trendAnalysis.trendInsight}
      </span>
      <button
        className="trend-banner__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss trend insight"
      >
        Dismiss
      </button>
    </div>
  );
}
