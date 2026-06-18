import React from 'react';

/**
 * ContextChip — Small chip displaying contextScore and timeRiskLevel.
 * Shown next to the main risk badge.
 */
export default function ContextChip({ contextAnalysis, loading }) {
  if (loading) {
    return (
      <span className="context-chip context-chip--loading">
        <span className="context-chip__pulse" />
        Context…
      </span>
    );
  }

  if (!contextAnalysis) return null;

  const { contextScore, timeRiskLevel } = contextAnalysis;

  const levelColors = {
    low: 'var(--risk-safe)',
    medium: 'var(--risk-moderate)',
    high: 'var(--risk-high)',
    critical: 'var(--risk-high)',
  };

  const color = levelColors[timeRiskLevel] || levelColors.medium;

  return (
    <span
      className="context-chip"
      style={{ '--chip-color': color }}
      title={contextAnalysis.riskContext}
    >
      <span className="context-chip__dot" />
      <span className="context-chip__score">{contextScore}</span>
      <span className="context-chip__level">{timeRiskLevel}</span>
    </span>
  );
}
