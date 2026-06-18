import React from 'react';

/**
 * GeminiPanel — Rebranded as "Saheli AI · Your Safety Companion"
 * Renders the NarrativeExplanation synthesized from all AI outputs.
 */
export default function GeminiPanel({ narrative, loading, error, riskScore }) {
  return (
    <div className="saheli-panel">
      {/* Header */}
      <div className="saheli-panel__header">
        <div className={`saheli-panel__avatar ${loading ? 'saheli-panel__avatar--loading' : ''}`}>
          🛡️
        </div>
        <div>
          <h3 className="saheli-panel__title">Saheli AI</h3>
          <p className="saheli-panel__subtitle">Your Safety Companion</p>
        </div>
      </div>

      {/* Body */}
      <div className="saheli-panel__body">
        {loading && (
          <div className="saheli-panel__loading">
            <div className="saheli-panel__skeleton">
              <div className="skeleton-line" style={{ width: '40%' }} />
              <div className="skeleton-line" style={{ width: '90%' }} />
              <div className="skeleton-line" style={{ width: '75%' }} />
              <div className="skeleton-line" style={{ width: '85%' }} />
              <div className="skeleton-line skeleton-line--short" style={{ width: '50%' }} />
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="saheli-panel__error-block">
            <p className="saheli-panel__error-title">⚠️ Saheli is momentarily unavailable</p>
            {riskScore !== null && (
              <p className="saheli-panel__error-score">Route score: {riskScore}/100</p>
            )}
            <p className="saheli-panel__error-detail">
              Your route risk score is still valid and calculated from local incident data.
            </p>
          </div>
        )}

        {!loading && !error && narrative && (
          <div className="saheli-panel__narrative">
            <p className="saheli-panel__greeting">{narrative.greeting},</p>
            <p className="saheli-panel__headline">{narrative.headline}</p>
            <p className="saheli-panel__body-text">{narrative.body}</p>

            {narrative.topWarning && (
              <div className="saheli-panel__warning">
                <span className="saheli-panel__warning-icon">⚠️</span>
                <span>{narrative.topWarning}</span>
              </div>
            )}

            <p className="saheli-panel__encouragement">{narrative.encouragement}</p>
          </div>
        )}

        {!loading && !error && !narrative && (
          <p className="saheli-panel__placeholder">
            Enter a route and tap <strong>Find Safe Route</strong> to get a personalized safety briefing from Saheli.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="saheli-panel__footer">
        <span className="saheli-panel__footer-dot" />
        <span className="saheli-panel__footer-text">
          {loading ? 'Saheli is analyzing your route…' : narrative ? 'Analysis updated just now' : 'Waiting for route'}
        </span>
      </div>
    </div>
  );
}
