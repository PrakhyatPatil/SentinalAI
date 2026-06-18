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
          <span className="ai-reasoning__spinner" />
          <span>AI analyzing…</span>
        </div>
      </div>
    );
  }

  if (!riskReasoning) return null;

  const { reasoning, confidenceLevel, dominantRiskType } = riskReasoning;

  return (
    <div className="ai-reasoning">
      <div className="ai-reasoning__header">
        <span className="ai-reasoning__badge">
          <span className="ai-reasoning__badge-dot" />
          AI Reasoned
        </span>
        <span className={`ai-reasoning__confidence ai-reasoning__confidence--${confidenceLevel}`}>
          {confidenceLevel} confidence
        </span>
      </div>

      <button
        className="ai-reasoning__toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        How we calculated this {expanded ? '▴' : '▾'}
      </button>

      {expanded && reasoning && reasoning.length > 0 && (
        <div className="ai-reasoning__steps">
          {reasoning.map((step, i) => (
            <div className="ai-reasoning__step" key={i}>
              <span className="ai-reasoning__step-num">{i + 1}</span>
              <span className="ai-reasoning__step-text">{step}</span>
            </div>
          ))}
          {dominantRiskType && dominantRiskType !== 'unknown' && (
            <div className="ai-reasoning__dominant">
              Primary concern: <strong>{dominantRiskType.replace(/_/g, ' ')}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
