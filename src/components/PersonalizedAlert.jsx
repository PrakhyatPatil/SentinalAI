import React from 'react';
import { getUserProfile } from '../hooks/useAIGuardian.js';

/**
 * PersonalizedAlert — Pulsing alert banner at top of sidebar
 * when finalScore exceeds user's alertThreshold and dominantRiskType matches.
 */
export default function PersonalizedAlert({ finalScore, dominantRiskType }) {
  const profile = getUserProfile();
  const { alertThreshold, priorityIncidentType } = profile;

  // Check if alert should show
  if (finalScore === null || finalScore === undefined) return null;
  if (finalScore <= alertThreshold) return null;

  // If user has a priority type set, only alert on that type
  if (priorityIncidentType && dominantRiskType && dominantRiskType !== 'unknown') {
    if (dominantRiskType !== priorityIncidentType) return null;
  }

  const typeLabel = dominantRiskType
    ? dominantRiskType.replace(/_/g, ' ')
    : 'general safety concerns';

  return (
    <div className="personal-alert">
      <span className="personal-alert__icon">⚠</span>
      <span className="personal-alert__text">
        Personal Alert: This route exceeds your safety threshold for <strong>{typeLabel}</strong>
      </span>
    </div>
  );
}
