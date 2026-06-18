import React from 'react';

/**
 * SaheliPanel — Replaces GeminiPanel with rich NarrativeExplanation.
 * Shows "Saheli AI · Your Safety Companion" with greeting, headline, body,
 * optional warning callout, and encouragement.
 */
export default function SaheliPanel({ narrative, loading }) {
  return (
    <div className="saheli-panel">
      {/* Header */}
      <div className="saheli-panel__header">
        <div className={`saheli-panel__icon ${loading ? 'saheli-panel__icon--loading' : ''}`}>
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
            <div className="saheli-panel__spinner" />
            <div className="saheli-panel__skeleton">
              <div className="skeleton-line" style={{ width: '60%' }} />
              <div className="skeleton-line" style={{ width: '90%' }} />
              <div className="skeleton-line" style={{ width: '75%' }} />
              <div className="skeleton-line" style={{ width: '85%' }} />
            </div>
          </div>
        )}

        {!loading && narrative && (
          <div className="saheli-panel__narrative">
            {/* Greeting + Headline */}
            <p className="saheli-panel__greeting">
              {narrative.greeting},{' '}
              <strong className="saheli-panel__headline">{narrative.headline}</strong>
            </p>

            {/* Body */}
            <p className="saheli-panel__text">{narrative.body}</p>

            {/* Warning callout (if present) */}
            {narrative.topWarning && (
              <div className="saheli-panel__warning">
                <span className="saheli-panel__warning-icon">⚠️</span>
                <span>{narrative.topWarning}</span>
              </div>
            )}

            {/* Encouragement */}
            <p className="saheli-panel__encouragement">
              <em>{narrative.encouragement}</em>
            </p>
          </div>
        )}

        {!loading && !narrative && (
          <p className="saheli-panel__placeholder">
            Enter a route and tap <strong>Find Safe Route</strong> to get your personalized safety briefing from Saheli AI.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="saheli-panel__footer">
        <span className="saheli-panel__footer-dot" />
        <span className="saheli-panel__footer-text">Powered by Gemini 1.5 Flash</span>
      </div>
    </div>
  );
}
