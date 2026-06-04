import React from 'react';

const RISK_CONFIG = {
  safe:     { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  emoji: '✅', label: 'Safe' },
  moderate: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', emoji: '⚠️', label: 'Moderate' },
  high:     { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  emoji: '🔴', label: 'High Risk' },
};

export default function RiskBadge({ score, label }) {
  if (score === null || score === undefined) return null;

  const cfg = RISK_CONFIG[label] ?? RISK_CONFIG.safe;

  return (
    <div className="risk-badge" style={{ '--badge-color': cfg.color, '--badge-bg': cfg.bg }}>
      <div className="risk-badge__header">
        <span className="risk-badge__emoji">{cfg.emoji}</span>
        <span className="risk-badge__title">Risk Score</span>
      </div>
      <div className="risk-badge__score">
        <span className="risk-badge__number">{score}</span>
        <span className="risk-badge__max">/100</span>
      </div>
      <div className="risk-badge__bar-track">
        <div
          className="risk-badge__bar-fill"
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="risk-badge__label">{cfg.label}</div>
    </div>
  );
}
