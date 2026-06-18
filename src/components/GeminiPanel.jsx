import React from 'react';

export default function GeminiPanel({ summary, loading, error }) {
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="gemini-panel">
      {/* Header */}
      <div className="gemini-panel__header">
        <div className="gemini-panel__icon">✨</div>
        <div>
          <h3 className="gemini-panel__title">AI Safety Summary</h3>
          <p className="gemini-panel__subtitle">Powered by Gemini 1.5 Flash</p>
        </div>
      </div>

      {/* Body */}
      <div className="gemini-panel__body">
        {loading && (
          <div className="gemini-panel__loading">
            <div className="gemini-panel__spinner" />
            <div className="gemini-panel__skeleton">
              <div className="skeleton-line" style={{ width: '90%' }} />
              <div className="skeleton-line" style={{ width: '75%' }} />
              <div className="skeleton-line" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        {!loading && error && (
          <p className="gemini-panel__error">
            ⚠️ Could not reach Gemini API. Route score is still valid.
          </p>
        )}

        {!loading && !error && summary && (
          <p className="gemini-panel__summary">{summary}</p>
        )}

        {!loading && !error && !summary && (
          <p className="gemini-panel__placeholder">
            Enter a route and tap <strong>Find Safe Route</strong> to get an AI safety assessment.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="gemini-panel__footer">
        <span className="gemini-panel__footer-dot" />
        <span className="gemini-panel__footer-text">Data updated just now</span>
        <button className="gemini-panel__refresh" aria-label="Refresh" title="Refresh data">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
