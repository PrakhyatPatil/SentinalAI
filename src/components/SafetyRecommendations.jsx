import React from 'react';

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

/**
 * SafetyRecommendations — Stacked cards with emoji, title, detail, colored left border.
 * 100ms stagger animation on load.
 */
export default function SafetyRecommendations({ recommendations, loading }) {
  if (loading) {
    return (
      <div className="safety-recs">
        <h3 className="safety-recs__title">🛡️ Safety Recommendations</h3>
        <div className="safety-recs__loading">
          <div className="safety-recs__skeleton" />
          <div className="safety-recs__skeleton" />
          <div className="safety-recs__skeleton" />
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="safety-recs">
      <h3 className="safety-recs__title">🛡️ Safety Recommendations</h3>
      <div className="safety-recs__list">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="safety-rec-card"
            style={{
              '--rec-color': PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.medium,
              animationDelay: `${i * 100}ms`,
            }}
          >
            <span className="safety-rec-card__icon">{rec.icon || '💡'}</span>
            <div className="safety-rec-card__content">
              <div className="safety-rec-card__title">{rec.title}</div>
              <div className="safety-rec-card__detail">{rec.detail}</div>
            </div>
            <span className={`safety-rec-card__priority safety-rec-card__priority--${rec.priority}`}>
              {rec.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
