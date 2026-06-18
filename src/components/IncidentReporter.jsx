import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, FIREBASE_CONFIGURED, authReady } from '../lib/firebase.js';
import { SEED_INCIDENTS } from '../lib/seedData.js';

const INCIDENT_TYPES = [
  { value: 'poor_lighting',      label: '🔦 Poor Lighting',       weight: 2 },
  { value: 'isolated',           label: '🚶 Isolated Area',        weight: 1 },
  { value: 'harassment_history', label: '⚠️ Harassment History',   weight: 3 },
];

// Local in-memory store for offline mode
let localIncidents = [...SEED_INCIDENTS];
export function getLocalIncidents() { return localIncidents; }

export default function IncidentReporter({ position, onClose, onLocalAdd }) {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [typeError, setTypeError] = useState(null);

  const MAX_DESC_LENGTH = 500;

  async function handleSubmit(e) {
    e.preventDefault();

    // Inline form validation: require incident type selection
    if (!type) {
      setTypeError('Please select an incident type before submitting.');
      return;
    }
    setTypeError(null);
    setSubmitting(true);
    setError(null);

    const selected = INCIDENT_TYPES.find((t) => t.value === type);
    const incident = {
      lat: position.lat,
      lng: position.lng,
      type,
      weight: selected.weight,
      hour: new Date().getHours(),
      label: `Reported near (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})`,
      description: description.trim() || null,
    };

    // Helper: race addDoc against a 5-second timeout so we never hang
    function addDocWithTimeout(ref, data, ms = 5000) {
      return Promise.race([
        addDoc(ref, data),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore write timed out')), ms)
        ),
      ]);
    }

    // Try Firestore first; fall back to local state
    if (FIREBASE_CONFIGURED && db) {
      try {
        // Ensure anonymous auth has completed before writing
        await authReady;
        const user = auth?.currentUser;
        if (!user) {
          console.warn('[IncidentReporter] No auth user after waiting, using local fallback.');
        } else {
          await addDocWithTimeout(collection(db, 'incidents'), {
            ...incident,
            timestamp: serverTimestamp(),
          });

          setSuccess(true);
          setTimeout(onClose, 1500);
          return;
        }
      } catch (err) {
        console.warn('[IncidentReporter] Firestore write failed:', err.message);
        // Show a brief error hint but still fall through to local mode
        if (err.message.includes('PERMISSION_DENIED') || err.message.includes('Missing or insufficient')) {
          setError('Firestore rules blocked write — saved locally instead.');
        } else if (err.message.includes('timed out')) {
          setError('Cloud save timed out — saved locally instead.');
        }
        // For all other errors, fall through silently
      }
    }

    // Local fallback — add to in-memory seed list so heatmap updates
    const localIncident = { ...incident, id: `local_${Date.now()}` };
    localIncidents = [...localIncidents, localIncident];
    if (onLocalAdd) onLocalAdd(localIncident);

    setSubmitting(false);
    setSuccess(true);
    setTimeout(onClose, 1500);
  }

  if (success) {
    return (
      <div className="incident-reporter incident-reporter--success">
        <div className="incident-reporter__success-icon">✅</div>
        <p>Incident reported! Map will update shortly.</p>
      </div>
    );
  }

  return (
    <div className="incident-reporter">
      <div className="incident-reporter__header">
        <h3 className="incident-reporter__title">Report Incident</h3>
        <button className="incident-reporter__close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <p className="incident-reporter__coords">
        📍 {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
      </p>

      {error && (
        <div style={{
          fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6,
          padding: '6px 8px', marginBottom: 8, lineHeight: 1.5,
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="incident-reporter__types">
          {INCIDENT_TYPES.map((t) => (
            <label key={t.value} className={`incident-type-option ${type === t.value ? 'selected' : ''}`}>
              <input
                type="radio"
                name="incident-type"
                value={t.value}
                checked={type === t.value}
                onChange={() => { setType(t.value); setTypeError(null); }}
              />
              <span>{t.label}</span>
            </label>
          ))}
        </div>

        {/* Inline validation error */}
        {typeError && (
          <div style={{
            fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
            padding: '5px 8px', marginTop: 4, marginBottom: 4, lineHeight: 1.4,
          }}>
            ⚠️ {typeError}
          </div>
        )}

        {/* Descriptive report textarea */}
        <div className="incident-reporter__desc-group">
          <label className="incident-reporter__desc-label" htmlFor="incident-desc">
            📝 Describe the incident <span className="incident-reporter__optional">(optional)</span>
          </label>
          <textarea
            id="incident-desc"
            className="incident-reporter__description"
            placeholder="What happened? Any details that could help others stay safe…"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC_LENGTH))}
            rows={3}
            maxLength={MAX_DESC_LENGTH}
          />
          <div className="incident-reporter__char-count">
            <span className={description.length >= MAX_DESC_LENGTH * 0.9 ? 'near-limit' : ''}>
              {description.length}
            </span>
            /{MAX_DESC_LENGTH}
          </div>
        </div>

        <button
          type="submit"
          className="incident-reporter__submit"
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}
