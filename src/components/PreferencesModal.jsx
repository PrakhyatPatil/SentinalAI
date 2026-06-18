import React, { useState, useEffect } from 'react';
import { getUserProfile, saveUserProfile, sensitivityToThreshold } from '../lib/userProfile.js';

/**
 * PreferencesModal — User sensitivity/personalization settings.
 */
export default function PreferencesModal({ isOpen, onClose }) {
  const [profile, setProfile] = useState(getUserProfile());

  // Re-read profile when modal opens
  useEffect(() => {
    if (isOpen) setProfile(getUserProfile());
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSensitivity(level) {
    setProfile(prev => ({
      ...prev,
      sensitivityLevel: level,
      alertThreshold: sensitivityToThreshold(level),
    }));
  }

  function handlePriority(type) {
    setProfile(prev => ({ ...prev, priorityIncidentType: type === 'all' ? null : type }));
  }

  function handlePattern(pattern) {
    setProfile(prev => ({ ...prev, travelPattern: pattern }));
  }

  function handleSave() {
    saveUserProfile(profile);
    onClose();
  }

  const sensitivityLevels = ['low', 'medium', 'high'];
  const priorityTypes = [
    { value: 'all', label: 'All Equal' },
    { value: 'poor_lighting', label: 'Poor Lighting' },
    { value: 'isolated', label: 'Isolated Areas' },
    { value: 'harassment_history', label: 'Harassment History' },
  ];
  const travelPatterns = [
    { value: 'day', label: 'Mostly Day' },
    { value: 'night', label: 'Mostly Night' },
    { value: 'mixed', label: 'Mixed' },
  ];

  return (
    <div className="prefs-overlay" onClick={onClose}>
      <div className="prefs-modal" onClick={e => e.stopPropagation()}>
        <div className="prefs-modal__header">
          <h3 className="prefs-modal__title">⚙️ Preferences</h3>
          <button className="prefs-modal__close" onClick={onClose} aria-label="Close preferences">✕</button>
        </div>

        <div className="prefs-modal__body">
          {/* Sensitivity Level */}
          <div className="prefs-field">
            <label className="prefs-field__label">Sensitivity Level</label>
            <p className="prefs-field__hint">
              Alert threshold: Score above {profile.alertThreshold} triggers alerts
            </p>
            <div className="prefs-field__options">
              {sensitivityLevels.map(level => (
                <button
                  key={level}
                  className={`prefs-option ${profile.sensitivityLevel === level ? 'prefs-option--active' : ''}`}
                  onClick={() => handleSensitivity(level)}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Concern */}
          <div className="prefs-field">
            <label className="prefs-field__label">Priority Concern</label>
            <p className="prefs-field__hint">Which incident type matters most to you?</p>
            <div className="prefs-field__options prefs-field__options--vertical">
              {priorityTypes.map(({ value, label }) => (
                <button
                  key={value}
                  className={`prefs-option ${(profile.priorityIncidentType === value || (!profile.priorityIncidentType && value === 'all')) ? 'prefs-option--active' : ''}`}
                  onClick={() => handlePriority(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Travel Pattern */}
          <div className="prefs-field">
            <label className="prefs-field__label">Travel Pattern</label>
            <p className="prefs-field__hint">When do you usually travel?</p>
            <div className="prefs-field__options">
              {travelPatterns.map(({ value, label }) => (
                <button
                  key={value}
                  className={`prefs-option ${profile.travelPattern === value ? 'prefs-option--active' : ''}`}
                  onClick={() => handlePattern(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="prefs-modal__footer">
          <button className="prefs-modal__save" onClick={handleSave}>
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
