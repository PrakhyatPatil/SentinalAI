import React, { useState } from 'react';

/**
 * AIReasoningPanel — Shows "AI Reasoned" badge and collapsible reasoning steps.
 */
export default function AIReasoningPanel({ riskReasoning, loading }) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="ai-reasoning ai-reasoning--loading">
        <div className="ai-reasoning__badge">
          <span className="ai-reasoning__badge-pulse" />
          AI Analyzing…
        </div>
      </div>
    );
  }

  if (!riskReasoning) return null;

  const { reasoning, confidenceLevel, dominantRiskType } = riskReasoning;

  const confidenceColors = {
    low: 'var(--text-muted)',
    medium: 'var(--risk-moderate)',
    high: 'var(--risk-safe)',
  };

  return (
    <div className="ai-reasoning">
      <div className="ai-reasoning__header">
        <span className="ai-reasoning__badge">
          <span className="ai-reasoning__badge-icon">🧠</span>
          AI Reasoned
        </span>
        <span
          className="ai-reasoning__confidence"
          style={{ color: confidenceColors[confidenceLevel] || confidenceColors.low }}
        >
          {confidenceLevel} confidence
        </span>
      </div>

      {dominantRiskType && dominantRiskType !== 'unknown' && (
        <div className="ai-reasoning__dominant">
          Primary risk factor: <strong>{dominantRiskType.replace(/_/g, ' ')}</strong>
        </div>
      )}

      <button
        className="ai-reasoning__toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        How we calculated this {expanded ? '▴' : '▾'}
      </button>

      {expanded && (
        <ul className="ai-reasoning__steps">
          {reasoning.map((step, i) => (
            <li key={i} className="ai-reasoning__step">
              <span className="ai-reasoning__step-num">{i + 1}</span>
              {step}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
