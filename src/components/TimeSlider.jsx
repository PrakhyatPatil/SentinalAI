import React from 'react';

function isNight(h) { return h >= 21 || h < 6; }

export default function TimeSlider({ hour, onChange }) {
  const night = isNight(hour);
  const cls   = night ? 'night' : 'day';

  // Format: "12:00 PM"
  const ampm  = hour >= 12 ? 'PM' : 'AM';
  const h12   = hour % 12 || 12;
  const label = `${h12}:00 ${ampm}`;

  return (
    <div className="time-slider">
      <div className="time-slider__header">
        <span className="time-slider__icon">{night ? '🌙' : '☀️'}</span>
        <span className="time-slider__label">TIME OF DAY</span>
        <span className={`time-slider__pill ${cls}`}>{label}</span>
      </div>
      <input
        id="time-slider"
        type="range"
        min={0} max={23} step={1}
        value={hour}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`time-slider__input ${cls}`}
        aria-label={`Time of day: ${label}`}
      />
      <div className="time-slider__ticks">
        <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>11PM</span>
      </div>
    </div>
  );
}
