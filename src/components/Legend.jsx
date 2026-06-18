import React from 'react';

export default function Legend() {
  return (
    <div className="legend">
      <h4 className="legend__title">Route Safety</h4>
      <div className="legend__items">
        <div className="legend__item">
          <span className="legend__dot" style={{ background: '#22c55e' }} />
          <span>Safe (0–33)</span>
        </div>
        <div className="legend__item">
          <span className="legend__dot" style={{ background: '#f59e0b' }} />
          <span>Moderate (34–66)</span>
        </div>
        <div className="legend__item">
          <span className="legend__dot" style={{ background: '#ef4444' }} />
          <span>High Risk (67–100)</span>
        </div>
      </div>
      <div className="legend__heatmap">
        <div className="legend__gradient" />
        <div className="legend__hm-labels">
          <span>Low</span>
          <span>High</span>
        </div>
        <p className="legend__hm-note">Heatmap — reported incidents</p>
      </div>
    </div>
  );
}
