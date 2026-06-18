/**
 * userProfile.js — Manages user sensitivity profile in localStorage.
 * Key: "saferoute_profile"
 */

const STORAGE_KEY = 'saferoute_profile';

const DEFAULT_PROFILE = {
  sensitivityLevel: 'medium',
  alertThreshold: 60,
  priorityIncidentType: null, // null means "all equal"
  travelPattern: 'mixed',
};

/**
 * Get the user profile from localStorage, or return defaults.
 */
export function getUserProfile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PROFILE, ...parsed };
    }
  } catch (err) {
    console.warn('[userProfile] Error reading profile:', err);
  }
  return { ...DEFAULT_PROFILE };
}

/**
 * Save the user profile to localStorage.
 */
export function saveUserProfile(profile) {
  try {
    const toSave = { ...DEFAULT_PROFILE, ...profile };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return toSave;
  } catch (err) {
    console.warn('[userProfile] Error saving profile:', err);
    return profile;
  }
}

/**
 * Get the user's sensitivity level for context payload.
 */
export function getUserSensitivity() {
  return getUserProfile().sensitivityLevel;
}

/**
 * Map sensitivity level to alert threshold.
 */
export function sensitivityToThreshold(level) {
  switch (level) {
    case 'low': return 40;
    case 'high': return 75;
    default: return 60;
  }
}
