import React, { useState, useEffect } from 'react';
import { getUserProfile, saveUserProfile } from '../hooks/useAIGuardian.js';

/**
 * PreferencesModal — User sensitivity profile settings.
 * Persisted to localStorage key "saferoute_profile".
 */
export default function PreferencesModal({ isOpen, onClose }) {
  const [profile, setProfile] = useState(getUserProfile);

  // Sync from localStorage when modal opens
  useEffect(() => {
    if (isOpen) {
      setProfile(getUserProfile());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sensitivityOptions = [
    { value: 'low', label: 'Low', threshold: 40, desc: 'Less alerts, neutral tone' },
    { value: 'medium', label: 'Medium', threshold: 60, desc: 'Balanced alerts' },
    { value: 'high', label: 'High', threshold: 75, desc: 'More alerts, cautious tone' },
  ];

  const concernOptions = [
    { value: null, label: 'All Equal' },
    { value: 'poor_lighting', label: 'Poor Lighting' },
    { value: 'isolated', label: 'Isolated Areas' },
    { value: 'harassment_history', label: 'Harassment History' },
  ];

  const patternOptions = [
    { value: 'day', label: 'Mostly Day' },
    { value: 'night', label: 'Mostly Night' },
    { value: 'mixed', label: 'Mixed' },
  ];

  const handleSensitivityChange = (opt) => {
    setProfile((p) => ({
      ...p,
      sensitivityLevel: opt.value,
      alertThreshold: opt.threshold,
    }));
  };

  const handleSave = () => {
    saveUserProfile(profile);
    onClose();
  };

  return (
    <div className="prefs-overlay" onClick={onClose}>
      <div className="prefs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prefs-modal__header">
          <h3 className="prefs-modal__title">⚙ Preferences</h3>
          <button className="prefs-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="prefs-modal__body">
          {/* Sensitivity */}
          <div className="prefs-modal__section">
            <label className="prefs-modal__label">Sensitivity Level</label>
            <div className="prefs-modal__options">
              {sensitivityOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`prefs-modal__option ${profile.sensitivityLevel === opt.value ? 'active' : ''}`}
                  onClick={() => handleSensitivityChange(opt)}
                >
                  <span className="prefs-modal__option-label">{opt.label}</span>
                  <span className="prefs-modal__option-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority Concern */}
          <div className="prefs-modal__section">
            <label className="prefs-modal__label">Priority Concern</label>
            <div className="prefs-modal__options">
              {concernOptions.map((opt) => (
                <button
                  key={opt.value ?? 'all'}
                  className={`prefs-modal__option ${profile.priorityIncidentType === opt.value ? 'active' : ''}`}
                  onClick={() => setProfile((p) => ({ ...p, priorityIncidentType: opt.value }))}
                >
                  <span className="prefs-modal__option-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Travel Pattern */}
          <div className="prefs-modal__section">
            <label className="prefs-modal__label">Travel Pattern</label>
            <div className="prefs-modal__options prefs-modal__options--row">
              {patternOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`prefs-modal__option ${profile.travelPattern === opt.value ? 'active' : ''}`}
                  onClick={() => setProfile((p) => ({ ...p, travelPattern: opt.value }))}
                >
                  <span className="prefs-modal__option-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="prefs-modal__footer">
          <button className="prefs-modal__cancel" onClick={onClose}>Cancel</button>
          <button className="prefs-modal__save" onClick={handleSave}>Save Preferences</button>
        </div>
      </div>
    </div>
  );
}
