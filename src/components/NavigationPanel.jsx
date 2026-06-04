import React, { useState, useMemo } from 'react';
import { haversine } from '../lib/haversine.js';

/* ── Maneuver icon mapping ───────────────────────────────────────────────── */
const MANEUVER_ICONS = {
  'turn-left':          '↰',
  'turn-right':         '↱',
  'turn-slight-left':   '↲',
  'turn-slight-right':  '↳',
  'turn-sharp-left':    '⮢',
  'turn-sharp-right':   '⮣',
  'uturn-left':         '⮌',
  'uturn-right':        '⮍',
  'straight':           '↑',
  'merge':              '⤨',
  'ramp-left':          '↲',
  'ramp-right':         '↳',
  'fork-left':          '⑂',
  'fork-right':         '⑂',
  'roundabout-left':    '↺',
  'roundabout-right':   '↻',
  'keep-left':          '←',
  'keep-right':         '→',
};

function getManeuverIcon(maneuver) {
  if (!maneuver) return '↑';
  return MANEUVER_ICONS[maneuver] ?? '↑';
}

/* ── Risk color for a step based on nearby incidents ─────────────────────── */
function getStepRisk(step, incidents, sliderHour) {
  if (!step?.start_location) return 'safe';
  const loc = { lat: step.start_location.lat(), lng: step.start_location.lng() };
  let count = 0;
  for (const inc of incidents) {
    if (haversine(loc, inc) <= 200) count++;
  }
  if (count >= 3) return 'high';
  if (count >= 1) return 'moderate';
  return 'safe';
}

/* ── Safety alert for high-risk steps ────────────────────────────────────── */
function SafetyAlert({ step, incidents }) {
  if (!step?.start_location) return null;
  const loc = { lat: step.start_location.lat(), lng: step.start_location.lng() };
  const nearby = incidents.filter((inc) => haversine(loc, inc) <= 200);
  if (nearby.length < 2) return null;

  const typeLabels = { harassment_history: 'harassment', poor_lighting: 'poor lighting', isolated: 'isolated area' };
  const types = [...new Set(nearby.map((i) => typeLabels[i.type] ?? i.type))];

  return (
    <div className="nav-alert">
      <span className="nav-alert__icon">⚠️</span>
      <div className="nav-alert__text">
        <strong>High risk area ahead</strong>
        <span>{nearby.length} reports ({types.join(', ')}) nearby — stay alert</span>
      </div>
    </div>
  );
}

/* ── Main NavigationPanel ────────────────────────────────────────────────── */
export default function NavigationPanel({
  directionsResult,
  incidents = [],
  sliderHour = 12,
  origin = '',
  destination = '',
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedStep, setExpandedStep] = useState(null);

  const leg = directionsResult?.routes?.[0]?.legs?.[0];
  if (!leg) return null;

  const steps = leg.steps || [];
  const totalDuration = leg.duration?.text ?? '—';
  const totalDistance = leg.distance?.text ?? '—';
  const arrivalTime = useMemo(() => {
    if (!leg.duration?.value) return '';
    const now = new Date();
    now.setSeconds(now.getSeconds() + leg.duration.value);
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [leg.duration?.value]);

  return (
    <div className="nav-panel" role="region" aria-label="Navigation directions">
      {/* ── ETA Header ───────────────────────────────────────────────────── */}
      <div className="nav-panel__header" onClick={() => setCollapsed((v) => !v)}>
        <div className="nav-panel__eta-row">
          <div className="nav-panel__eta-left">
            <span className="nav-panel__eta-time">{totalDuration}</span>
            <span className="nav-panel__eta-dist">{totalDistance}</span>
          </div>
          <div className="nav-panel__eta-right">
            <span className="nav-panel__eta-arrival">
              🏁 ETA {arrivalTime}
            </span>
            <span className="nav-panel__travel-mode">🚶 Walking</span>
          </div>
          <button
            className={`nav-panel__collapse-btn ${collapsed ? 'collapsed' : ''}`}
            aria-label={collapsed ? 'Expand directions' : 'Collapse directions'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Route summary pill */}
        <div className="nav-panel__route-summary">
          <span className="nav-panel__route-from" title={origin}>📍 {origin.split(',')[0]}</span>
          <span className="nav-panel__route-arrow">→</span>
          <span className="nav-panel__route-to" title={destination}>🏁 {destination.split(',')[0]}</span>
        </div>
      </div>

      {/* ── Steps List ───────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="nav-panel__steps">
          {steps.map((step, idx) => {
            const risk = getStepRisk(step, incidents, sliderHour);
            const isLast = idx === steps.length - 1;
            const isExpanded = expandedStep === idx;

            return (
              <React.Fragment key={idx}>
                {/* Safety alert between steps */}
                {risk === 'high' && (
                  <SafetyAlert step={step} incidents={incidents} />
                )}

                <div
                  className={`nav-step ${isExpanded ? 'nav-step--expanded' : ''}`}
                  onClick={() => setExpandedStep(isExpanded ? null : idx)}
                  role="button"
                  tabIndex={0}
                >
                  {/* Risk indicator bar */}
                  <div className={`nav-step__risk-bar nav-step__risk-bar--${risk}`} />

                  {/* Step number + icon */}
                  <div className="nav-step__icon-col">
                    <span className={`nav-step__maneuver nav-step__maneuver--${risk}`}>
                      {isLast ? '🏁' : getManeuverIcon(step.maneuver)}
                    </span>
                    {!isLast && <div className="nav-step__connector" />}
                  </div>

                  {/* Step content */}
                  <div className="nav-step__content">
                    <div
                      className="nav-step__instruction"
                      dangerouslySetInnerHTML={{ __html: step.instructions || 'Continue' }}
                    />
                    <div className="nav-step__meta">
                      <span className="nav-step__distance">{step.distance?.text}</span>
                      <span className="nav-step__dot">•</span>
                      <span className="nav-step__duration">{step.duration?.text}</span>
                      {risk !== 'safe' && (
                        <span className={`nav-step__risk-badge nav-step__risk-badge--${risk}`}>
                          {risk === 'high' ? '⚠ High Risk' : '⚡ Caution'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Arrival card */}
          <div className="nav-arrival">
            <span className="nav-arrival__icon">✓</span>
            <div className="nav-arrival__text">
              <strong>Arrive at destination</strong>
              <span>ETA {arrivalTime} — {totalDistance} total</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
