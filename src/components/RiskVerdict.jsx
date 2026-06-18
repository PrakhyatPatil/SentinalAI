import React from 'react';
import { isNightHour } from '../lib/riskScore.js';
import ContextChip from './ContextChip.jsx';
import AIReasoningPanel from './AIReasoningPanel.jsx';

/* ── Config ─────────────────────────────────────────────────────────────────── */
const VERDICTS = {
  safe: {
    color: '#22c55e', bg: 'rgba(34,197,94,0.09)', border: 'rgba(34,197,94,0.32)',
    icon: '✓', title: 'Safe to Travel',
    sub: 'This route looks clear — go ahead with confidence.',
    label: 'SAFE',
  },
  moderate: {
    color: '#f59e0b', bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.32)',
    icon: '!', title: 'Proceed with Caution',
    sub: 'Some risk factors detected. Stay alert along this route.',
    label: 'MODERATE',
  },
  high: {
    color: '#ef4444', bg: 'rgba(239,68,68,0.09)', border: 'rgba(239,68,68,0.32)',
    icon: '✕', title: 'Avoid This Route',
    sub: 'High risk detected. Consider an alternate path or travel with company.',
    label: 'HIGH RISK',
  },
};

const INC_META = {
  harassment_history: { icon: '⚡', short: 'Harassment' },
  poor_lighting:      { icon: '💡', short: 'Poor lighting' },
  isolated:           { icon: '🚶', short: 'Isolated' },
};

const TIPS = {
  safe:     ['📱 Share live location with a trusted contact.', '🎧 Keep one earbud out to stay aware.'],
  moderate: ['📱 Share live location before you start.', '👥 Travel with a companion if possible.', '💡 Stick to well-lit main roads.'],
  high:     ['🚗 Take a taxi or rideshare instead.', '📞 Stay on the phone with someone while walking.', '🚨 Use the SOS button if you feel unsafe.'],
};

/* ── Component ───────────────────────────────────────────────────────────────── */
export default function RiskVerdict({
  score,
  label,
  nearbyIncidents = [],
  sliderHour,
  // AI Guardian props
  contextAnalysis,
  contextLoading,
  riskReasoning,
  riskLoading,
  aiAdjustedScore,
}) {
  if (score === null || score === undefined) return null;

  // Use AI-adjusted score if available, otherwise base score
  const displayScore = aiAdjustedScore !== null && aiAdjustedScore !== undefined
    ? aiAdjustedScore
    : score;

  // Determine label based on displayScore
  const displayLabel = displayScore <= 33 ? 'safe' : displayScore <= 66 ? 'moderate' : 'high';

  const cfg   = VERDICTS[displayLabel] ?? VERDICTS.safe;
  const tips  = TIPS[displayLabel]     ?? TIPS.safe;
  const night = isNightHour(sliderHour);

  // Deduplicate incidents
  const unique = [];
  const seen   = new Set();
  for (const inc of nearbyIncidents) {
    const key = inc.label ?? `${inc.lat},${inc.lng}`;
    if (!seen.has(key)) { seen.add(key); unique.push(inc); }
  }

  return (
    <div
      className="rv"
      style={{ '--rvc': cfg.color, '--rvb': cfg.border, '--rv-bg': cfg.bg }}
      role="region"
      aria-label="Route safety verdict"
    >
      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div className="rv__banner">
        <span className="rv__icon-badge">{cfg.icon}</span>
        <div className="rv__banner-text">
          <div className="rv__title">{cfg.title}</div>
          <div className="rv__sub">{cfg.sub}</div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="rv__body">
        {night && (
          <div className="rv__night-warn">
            🌙 Night-time risks are elevated — extra caution advised.
          </div>
        )}

        {/* Score + Context Chip row */}
        <div className="rv__score-row">
          <span className="rv__score-num">{displayScore}</span>
          <span className="rv__score-sep">/100</span>
          <span className="rv__score-badge">{cfg.label}</span>
          <ContextChip contextAnalysis={contextAnalysis} loading={contextLoading} />
        </div>

        <div className="rv__bar">
          <div className="rv__bar-fill" style={{ width: `${displayScore}%` }}
            role="meter" aria-valuenow={displayScore} aria-valuemin={0} aria-valuemax={100} />
        </div>

        {/* AI Reasoning Panel */}
        <AIReasoningPanel riskReasoning={riskReasoning} loading={riskLoading} />

        {/* Hazards */}
        <p className="rv__hazards-title">HAZARDS ON THIS ROUTE ({unique.length})</p>
        {unique.length === 0 ? (
          <div className="rv__no-hazards">✓&nbsp; No reported hazards found along this route.</div>
        ) : (
          <div className="rv__hazard-list">
            {unique.slice(0, 3).map((inc, i) => {
              const meta = INC_META[inc.type] ?? { icon: '⚠', short: inc.type };
              return (
                <div className="rv__hazard-row" key={i}>
                  <span className="rv__hazard-icon">{meta.icon}</span>
                  <span className="rv__hazard-label">{inc.label ?? 'Reported location'}</span>
                  <span className="rv__hazard-type">{meta.short}</span>
                </div>
              );
            })}
            {unique.length > 3 && (
              <p className="rv__more">+{unique.length - 3} more hazard{unique.length - 3 > 1 ? 's' : ''}</p>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="rv__tips">
          {tips.map((t, i) => <div className="rv__tip" key={i}>{t}</div>)}
        </div>
      </div>
    </div>
  );
}
