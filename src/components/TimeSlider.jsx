import React, { useMemo } from 'react';

function isNight(h) { return h >= 21 || h < 6; }

export default function TimeSlider({ hour, onChange, sliderGradient, forecast, riskScore }) {
  const night = isNight(hour);
  const cls   = night ? 'night' : 'day';

  // Format: "12:00 PM"
  const ampm  = hour >= 12 ? 'PM' : 'AM';
  const h12   = hour % 12 || 12;
  const label = `${h12}:00 ${ampm}`;

  // Risk level text for tooltip
  const riskLevel = riskScore === null ? null
    : riskScore <= 33 ? 'low'
    : riskScore <= 66 ? 'moderate'
    : 'high';

  // Get AI prediction for nearest hour from forecast
  const aiPrediction = useMemo(() => {
    if (!forecast || !forecast.predictions || forecast.predictions.length === 0) return null;
    // Find the prediction closest to the current slider hour
    let closest = forecast.predictions[0];
    let minDiff = Math.abs(closest.hour - hour);
    for (const p of forecast.predictions) {
      const diff = Math.abs(p.hour - hour);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    return closest;
  }, [forecast, hour]);

  // Determine track background
  const trackStyle = sliderGradient
    ? { background: sliderGradient }
    : {};

  return (
    <div className="time-slider" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Brand purple differentiator badge */}
      <div style={{
        display: 'inline-block',
        backgroundColor: 'rgba(124, 58, 237, 0.15)',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        color: '#c084fc',
        fontSize: '11px',
        fontWeight: '600',
        padding: '3px 8px',
        borderRadius: '6px',
        marginBottom: '10px',
        alignSelf: 'flex-start',
        letterSpacing: '0.2px',
        boxShadow: '0 2px 8px rgba(124, 58, 237, 0.1)',
      }}>
        ✨ Time-aware AI scoring · Only SafeRoute adjusts risk by time of day
      </div>

      <div className="time-slider__header">
        <span className="time-slider__icon">{night ? '🌙' : '☀️'}</span>
        <span className="time-slider__label">TIME OF DAY</span>
        <span className={`time-slider__pill ${cls}`}>{label}</span>
      </div>

      {/* Slider with risk tooltip */}
      <div className="time-slider__track-wrap">
        {riskScore !== null && riskLevel && (
          <div
            className="time-slider__tooltip"
            style={{ left: `${(hour / 23) * 100}%` }}
          >
            Risk at {label}: {riskScore}/100 · {riskLevel}
          </div>
        )}
        <input
          id="time-slider"
          type="range"
          min={0} max={23} step={1}
          value={hour}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`time-slider__input ${sliderGradient ? 'gradient' : cls}`}
          style={sliderGradient ? trackStyle : {}}
          aria-label={`Time of day: ${label}`}
        />
      </div>

      <div className="time-slider__ticks">
        <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>11PM</span>
      </div>

      {/* AI Prediction label */}
      {aiPrediction && (
        <div className="time-slider__prediction">
          🧠 AI predicts <strong>{aiPrediction.predictedScore}/100</strong> risk at this hour based on incident history
        </div>
      )}
    </div>
  );
}
