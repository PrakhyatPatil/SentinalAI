import React, { useState, useEffect, useMemo } from 'react';

/* ── Animated counter hook ─────────────────────────────────────────────────── */
function useAnimatedCount(target, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const step = Math.max(1, Math.floor(target / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

/* ── SVG Donut Chart ──────────────────────────────────────────────────────── */
function DonutChart({ segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg viewBox="0 0 100 100" className="dash-donut">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dashLen = pct * circumference;
        const dashOff = offset * circumference;
        offset += pct;
        return (
          <circle
            key={i}
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth="12"
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeDashoffset={-dashOff}
            className="dash-donut__segment"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        );
      })}
      <text x="50" y="48" textAnchor="middle" className="dash-donut__num">{total}</text>
      <text x="50" y="58" textAnchor="middle" className="dash-donut__label">total</text>
    </svg>
  );
}

/* ── Bar chart for hourly distribution ────────────────────────────────────── */
function HourlyChart({ incidents }) {
  const hours = useMemo(() => {
    const bins = new Array(24).fill(0);
    incidents.forEach((inc) => { bins[inc.hour ?? 0]++; });
    return bins;
  }, [incidents]);

  const max = Math.max(1, ...hours);

  return (
    <div className="dash-hourly">
      <div className="dash-hourly__bars">
        {hours.map((count, h) => {
          const pct = (count / max) * 100;
          const isNight = h >= 21 || h < 6;
          return (
            <div
              key={h}
              className="dash-hourly__bar-wrapper"
              title={`${h}:00 — ${count} incident${count !== 1 ? 's' : ''}`}
            >
              <div
                className={`dash-hourly__bar ${isNight ? 'night' : 'day'}`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="dash-hourly__labels">
        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
    </div>
  );
}

/* ── Main Dashboard Component ─────────────────────────────────────────────── */
export default function Dashboard({ incidents, routesAnalyzed = 0 }) {
  const totalIncidents = incidents.length;
  const peopleHelped = routesAnalyzed * 3 + totalIncidents * 2 + 128; // simulated metric

  // Breakdown by type
  const byType = useMemo(() => {
    const m = { harassment_history: 0, poor_lighting: 0, isolated: 0 };
    incidents.forEach((i) => { m[i.type] = (m[i.type] || 0) + 1; });
    return m;
  }, [incidents]);

  // Average risk per incident
  const avgWeight = useMemo(() => {
    if (incidents.length === 0) return 0;
    const sum = incidents.reduce((s, i) => s + (i.weight || 1), 0);
    return Math.round((sum / incidents.length) * 33);
  }, [incidents]);

  // Animated counts
  const aIncidents = useAnimatedCount(totalIncidents);
  const aRoutes = useAnimatedCount(routesAnalyzed);
  const aPeople = useAnimatedCount(peopleHelped);
  const aAvg = useAnimatedCount(avgWeight);

  const donutSegments = [
    { value: byType.harassment_history, color: '#ef4444', label: 'Harassment' },
    { value: byType.poor_lighting,      color: '#f59e0b', label: 'Poor Lighting' },
    { value: byType.isolated,           color: '#3b82f6', label: 'Isolated' },
  ];

  // Recent activity (latest 5 incidents)
  const recentIncidents = useMemo(() => {
    return [...incidents]
      .sort((a, b) => (b.hour ?? 0) - (a.hour ?? 0))
      .slice(0, 5);
  }, [incidents]);

  const typeIcons = { harassment_history: '⚡', poor_lighting: '💡', isolated: '🚶' };
  const typeLabels = { harassment_history: 'Harassment', poor_lighting: 'Poor Lighting', isolated: 'Isolated Area' };

  return (
    <div className="dashboard">
      <h2 className="dashboard__title">📊 Safety Dashboard</h2>
      <p className="dashboard__subtitle">Real-time safety analytics for Indore</p>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="dash-stats">
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>⚠️</div>
          <div className="dash-stat-card__body">
            <span className="dash-stat-card__num">{aIncidents}</span>
            <span className="dash-stat-card__label">Incidents Tracked</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'rgba(124,58,237,0.12)', color: '#a855f7' }}>🗺️</div>
          <div className="dash-stat-card__body">
            <span className="dash-stat-card__num">{aRoutes}</span>
            <span className="dash-stat-card__label">Routes Analyzed</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>👥</div>
          <div className="dash-stat-card__body">
            <span className="dash-stat-card__num">{aPeople}</span>
            <span className="dash-stat-card__label">People Helped</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>📈</div>
          <div className="dash-stat-card__body">
            <span className="dash-stat-card__num">{aAvg}<span className="dash-stat-card__unit">/100</span></span>
            <span className="dash-stat-card__label">Avg. Risk Score</span>
          </div>
        </div>
      </div>

      {/* ── Incident Breakdown ─────────────────────────────────────────────── */}
      <div className="dash-section">
        <h3 className="dash-section__title">Incident Breakdown</h3>
        <div className="dash-breakdown">
          <DonutChart segments={donutSegments} />
          <div className="dash-breakdown__legend">
            {donutSegments.map((seg) => (
              <div key={seg.label} className="dash-legend-item">
                <span className="dash-legend-item__dot" style={{ background: seg.color }} />
                <span className="dash-legend-item__label">{seg.label}</span>
                <span className="dash-legend-item__value">{seg.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hourly Distribution ────────────────────────────────────────────── */}
      <div className="dash-section">
        <h3 className="dash-section__title">Hourly Distribution</h3>
        <p className="dash-section__sub">Incidents by time of day</p>
        <HourlyChart incidents={incidents} />
      </div>

      {/* ── Recent Activity ────────────────────────────────────────────────── */}
      <div className="dash-section">
        <h3 className="dash-section__title">Recent Reports</h3>
        <div className="dash-activity">
          {recentIncidents.map((inc, i) => (
            <div className="dash-activity__item" key={inc.id ?? i}>
              <span className="dash-activity__icon">{typeIcons[inc.type] ?? '⚠️'}</span>
              <div className="dash-activity__info">
                <span className="dash-activity__label">{inc.label ?? 'Unknown location'}</span>
                <span className="dash-activity__meta">
                  {typeLabels[inc.type] ?? inc.type} • {inc.hour ?? '?'}:00
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
