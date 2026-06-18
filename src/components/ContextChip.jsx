import React from 'react';

/**
 * ContextChip — Small chip showing contextScore and timeRiskLevel.
 * Displayed next to the main risk badge.
 */
export default function ContextChip({ contextAnalysis, loading }) {
  if (loading) {
    return (
      <div className="context-chip context-chip--loading">
        <span className="context-chip__spinner" />
        <span>Context…</span>
      </div>
    );
  }

  if (!contextAnalysis) return null;

  const { contextScore, timeRiskLevel } = contextAnalysis;
  const levelClass = timeRiskLevel || 'medium';

  return (
    <div className={`context-chip context-chip--${levelClass}`} title={contextAnalysis.riskContext}>
      <span className="context-chip__score">{contextScore}</span>
      <span className="context-chip__label">{timeRiskLevel?.toUpperCase()}</span>
    </div>
  );
}
