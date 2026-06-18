import React from 'react';

export default function Legend({ incidentsCount = 0 }) {
  const showHonestyChip = incidentsCount <= 10;

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '16px',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none', // Allow clicking map through the transparent parts
    }}>
      {showHonestyChip && (
        <div style={{
          background: 'rgba(13, 10, 30, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '6px 10px',
          fontSize: '11px',
          color: '#94a3b8', // subtle grey
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          whiteSpace: 'nowrap',
          alignSelf: 'flex-start',
          pointerEvents: 'auto',
        }}>
          ℹ️ Demo includes 10 simulated incidents · Real users can report live
        </div>
      )}

      <div className="legend" style={{ position: 'static', pointerEvents: 'auto' }}>
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
    </div>
  );
}
