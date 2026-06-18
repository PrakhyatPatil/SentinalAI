import React from 'react';

const TYPE_LABELS = {
  harassment_history: 'Harassment History',
  poor_lighting: 'Poor Lighting',
  isolated: 'Isolated Areas',
};

/**
 * PersonalAlert — Pulsing alert banner when route exceeds user's threshold.
 */
export default function PersonalAlert({ finalScore, dominantRiskType, userProfile }) {
  if (!userProfile || finalScore === null || finalScore === undefined) return null;

  const { alertThreshold, priorityIncidentType } = userProfile;

  // Check if score exceeds threshold
  if (finalScore <= alertThreshold) return null;

  // Check if dominant risk type matches priority (null/'all' means any type triggers)
  const typeMatches =
    !priorityIncidentType ||
    priorityIncidentType === 'all' ||
    dominantRiskType === priorityIncidentType;

  if (!typeMatches) return null;

  const typeLabel = TYPE_LABELS[dominantRiskType] || dominantRiskType?.replace(/_/g, ' ') || 'general safety';

  return (
    <div className="personal-alert" role="alert">
      <span className="personal-alert__icon">⚠️</span>
      <div className="personal-alert__text">
        <strong>Personal Alert</strong>
        <span>This route exceeds your safety threshold for {typeLabel}</span>
      </div>
    </div>
  );
}
