import React, { useMemo } from 'react';
import { buildSliderGradient, getScoreLevel } from '../lib/PredictiveEngine.js';

function isNight(h) { return h >= 21 || h < 6; }

export default function TimeSlider({ hour, onChange, hourlyRiskMap, predictions }) {
  const night = isNight(hour);
  const cls   = night ? 'night' : 'day';

  // Format: "12:00 PM"
  const ampm  = hour >= 12 ? 'PM' : 'AM';
  const h12   = hour % 12 || 12;
  const label = `${h12}:00 ${ampm}`;

  // Build slider gradient from hourlyRiskMap
  const sliderGradient = useMemo(() => {
    if (!hourlyRiskMap || Object.keys(hourlyRiskMap).length === 0) return null;
    return buildSliderGradient(hourlyRiskMap);
  }, [hourlyRiskMap]);

  // Get risk score at current hour from hourlyRiskMap
  const currentHourScore = hourlyRiskMap ? (hourlyRiskMap[hour] ?? 0) : null;
  const currentHourLevel = currentHourScore !== null ? getScoreLevel(currentHourScore) : null;

  // Get nearest prediction for AI prediction label
  const nearestPrediction = useMemo(() => {
    if (!predictions || predictions.length === 0) return null;
    let closest = predictions[0];
    let minDiff = Math.abs(predictions[0].hour - hour);
    for (const p of predictions) {
      const diff = Math.abs(p.hour - hour);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    return closest;
  }, [predictions, hour]);

  return (
    <div className="time-slider">
      <div className="time-slider__header">
        <span className="time-slider__icon">{night ? '🌙' : '☀️'}</span>
        <span className="time-slider__label">TIME OF DAY</span>
        <span className={`time-slider__pill ${cls}`}>{label}</span>
      </div>

      {/* Slider with tooltip */}
      <div className="time-slider__slider-wrap">
        {currentHourScore !== null && (
          <div
            className="time-slider__tooltip"
            style={{ left: `${(hour / 23) * 100}%` }}
          >
            Risk at {label}: {currentHourScore}/100 · {currentHourLevel}
          </div>
        )}
        <input
          id="time-slider"
          type="range"
          min={0} max={23} step={1}
          value={hour}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`time-slider__input ${cls}`}
          aria-label={`Time of day: ${label}`}
          style={sliderGradient ? { background: sliderGradient } : undefined}
        />
      </div>

      <div className="time-slider__ticks">
        <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>11PM</span>
      </div>

      {/* AI Prediction label */}
      {nearestPrediction && (
        <div className="time-slider__ai-prediction">
          <span className="time-slider__ai-icon">🤖</span>
          <span>
            AI predicts {nearestPrediction.predictedScore}/100 risk at this hour based on incident history
          </span>
        </div>
      )}
    </div>
  );
}
