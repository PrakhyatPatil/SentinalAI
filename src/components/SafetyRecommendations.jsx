import React from 'react';

/**
 * SafetyRecommendations — 3 stacked recommendation cards with staggered animation.
 */
export default function SafetyRecommendations({ recommendations, loading }) {
  if (loading) {
    return (
      <div className="safety-recs">
        <h3 className="safety-recs__title">🛡️ Safety Recommendations</h3>
        <div className="safety-recs__loading">
          <div className="skeleton-line" style={{ width: '85%' }} />
          <div className="skeleton-line" style={{ width: '70%' }} />
          <div className="skeleton-line" style={{ width: '60%' }} />
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) return null;

  const borderColors = {
    high: 'var(--risk-high)',
    medium: 'var(--risk-moderate)',
    low: 'var(--risk-safe)',
  };

  return (
    <div className="safety-recs">
      <h3 className="safety-recs__title">🛡️ Safety Recommendations</h3>
      <div className="safety-recs__list">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="safety-recs__card"
            style={{
              '--rec-border': borderColors[rec.priority] || borderColors.medium,
              animationDelay: `${i * 100}ms`,
            }}
          >
            <span className="safety-recs__icon">{rec.icon}</span>
            <div className="safety-recs__content">
              <p className="safety-recs__card-title">{rec.title}</p>
              <p className="safety-recs__detail">{rec.detail}</p>
            </div>
            <span className="safety-recs__priority" data-priority={rec.priority}>
              {rec.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
