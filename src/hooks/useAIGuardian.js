/**
 * useAIGuardian.js — React hook managing the full AI pipeline lifecycle.
 * Progressive loading: each section renders as its data arrives.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  analyzeContext,
  reasonRisk,
  getRecommendations,
  predictFutureRisk,
  explainInNaturalLanguage,
  analyzeTrends,
} from '../lib/AIGuardian.js';
import { extractPatterns } from '../lib/PredictiveEngine.js';

// ── User Profile Helpers ───────────────────────────────────────────────────────

const PROFILE_KEY = 'saferoute_profile';

const DEFAULT_PROFILE = {
  sensitivityLevel: 'medium',
  alertThreshold: 60,
  priorityIncidentType: null,
  travelPattern: 'mixed',
};

export function getUserProfile() {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_PROFILE };
}

export function saveUserProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch { /* ignore */ }
}

export function getUserSensitivity() {
  return getUserProfile().sensitivityLevel;
}

// ── Time Category Helper ───────────────────────────────────────────────────────

function getTimeCategory(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  if (hour >= 20 && hour < 23) return 'night';
  return 'late_night';
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAIGuardian() {
  // Individual AI outputs
  const [contextAnalysis, setContextAnalysis] = useState(null);
  const [riskReasoning, setRiskReasoning] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [trendAnalysis, setTrendAnalysis] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [narrative, setNarrative] = useState(null);

  // Individual loading states for progressive rendering
  const [contextLoading, setContextLoading] = useState(false);
  const [reasoningLoading, setReasoningLoading] = useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  // Abort pattern
  const abortRef = useRef(null);
  const trendCacheRef = useRef({ count: 0, result: null });

  /**
   * Build context payload from route data.
   */
  const buildContextPayload = useCallback((params) => {
    const { sliderHour, incidents, nearbyIncidents, routeDistanceKm, origin, destination } = params;
    const profile = getUserProfile();

    const incidentTypes = { poor_lighting: 0, isolated: 0, harassment_history: 0 };
    for (const inc of nearbyIncidents) {
      if (incidentTypes[inc.type] !== undefined) {
        incidentTypes[inc.type]++;
      }
    }

    const now = Date.now();
    const recentIncidents = nearbyIncidents.filter((i) => {
      if (!i.timestamp) return false;
      const ms = i.timestamp.toMillis ? i.timestamp.toMillis() :
        (i.timestamp instanceof Date ? i.timestamp.getTime() :
          (typeof i.timestamp?.seconds === 'number' ? i.timestamp.seconds * 1000 : 0));
      return now - ms < 86400000;
    }).length;

    return {
      hour: sliderHour,
      dayOfWeek: new Date().getDay(),
      isWeekend: [0, 6].includes(new Date().getDay()),
      timeCategory: getTimeCategory(sliderHour),
      incidentDensity: nearbyIncidents.length,
      incidentTypes,
      recentIncidents,
      routeDistanceKm: routeDistanceKm || 0,
      origin,
      destination,
      userSensitivity: profile.sensitivityLevel,
    };
  }, []);

  /**
   * Run the full AI pipeline on route submit.
   * Steps 1+4 parallel → Step 2 → Step 3 → Step 5
   */
  const runFullPipeline = useCallback(async (params) => {
    const thisCall = {};
    abortRef.current = thisCall;

    // Clear previous results
    setContextAnalysis(null);
    setRiskReasoning(null);
    setRecommendations(null);
    setForecast(null);
    setNarrative(null);

    // Set all loading states
    setContextLoading(true);
    setReasoningLoading(true);
    setRecommendationsLoading(true);
    setForecastLoading(true);
    setNarrativeLoading(true);

    const { sliderHour, incidents, nearbyIncidents, routeDistanceKm, origin, destination } = params;
    const contextPayload = buildContextPayload(params);
    const routeInfo = { origin, destination, distanceKm: routeDistanceKm };
    const patterns = extractPatterns(incidents);

    try {
      // Step 1 + Step 4 in parallel
      const [ctxResult, forecastResult] = await Promise.all([
        analyzeContext(contextPayload),
        predictFutureRisk(routeInfo, nearbyIncidents, patterns),
      ]);

      if (abortRef.current !== thisCall) return;

      setContextAnalysis(ctxResult);
      setContextLoading(false);
      setForecast(forecastResult);
      setForecastLoading(false);

      // Step 2: reasonRisk (needs context)
      const riskResult = await reasonRisk(routeInfo, nearbyIncidents, ctxResult);
      if (abortRef.current !== thisCall) return;

      setRiskReasoning(riskResult);
      setReasoningLoading(false);

      // Step 3: getRecommendations (needs risk reasoning)
      const recsResult = await getRecommendations(riskResult);
      if (abortRef.current !== thisCall) return;

      setRecommendations(recsResult);
      setRecommendationsLoading(false);

      // Step 5: explainInNaturalLanguage (needs all above)
      const profile = getUserProfile();
      const narrativeResult = await explainInNaturalLanguage({
        contextAnalysis: ctxResult,
        riskReasoning: riskResult,
        recommendations: recsResult,
        trendAnalysis: trendAnalysis,
        forecast: forecastResult,
        userSensitivity: profile.sensitivityLevel,
      });
      if (abortRef.current !== thisCall) return;

      setNarrative(narrativeResult);
      setNarrativeLoading(false);
    } catch (err) {
      console.error('[useAIGuardian] Pipeline error:', err);
      setContextLoading(false);
      setReasoningLoading(false);
      setRecommendationsLoading(false);
      setForecastLoading(false);
      setNarrativeLoading(false);
    }
  }, [buildContextPayload, trendAnalysis]);

  /**
   * Run only context + risk reasoning on slider change (Steps 1-2).
   */
  const runSliderUpdate = useCallback(async (params) => {
    const thisCall = {};
    abortRef.current = thisCall;

    setContextLoading(true);
    setReasoningLoading(true);

    const contextPayload = buildContextPayload(params);
    const { origin, destination, routeDistanceKm, nearbyIncidents } = params;
    const routeInfo = { origin, destination, distanceKm: routeDistanceKm };

    try {
      // Step 1: context
      const ctxResult = await analyzeContext(contextPayload);
      if (abortRef.current !== thisCall) return;

      setContextAnalysis(ctxResult);
      setContextLoading(false);

      // Step 2: risk reasoning
      const riskResult = await reasonRisk(routeInfo, nearbyIncidents, ctxResult);
      if (abortRef.current !== thisCall) return;

      setRiskReasoning(riskResult);
      setReasoningLoading(false);
    } catch (err) {
      console.error('[useAIGuardian] Slider update error:', err);
      setContextLoading(false);
      setReasoningLoading(false);
    }
  }, [buildContextPayload]);

  /**
   * Run trend analysis (called once on app load, cached until count changes by > 2).
   */
  const runTrendAnalysis = useCallback(async (incidents) => {
    const cachedCount = trendCacheRef.current.count;
    if (trendCacheRef.current.result && Math.abs(incidents.length - cachedCount) <= 2) {
      setTrendAnalysis(trendCacheRef.current.result);
      return;
    }

    setTrendLoading(true);
    try {
      const result = await analyzeTrends(incidents);
      trendCacheRef.current = { count: incidents.length, result };
      setTrendAnalysis(result);
    } catch (err) {
      console.error('[useAIGuardian] Trend analysis error:', err);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  /**
   * Clear all AI state (e.g. on route clear).
   */
  const clearAll = useCallback(() => {
    abortRef.current = null;
    setContextAnalysis(null);
    setRiskReasoning(null);
    setRecommendations(null);
    setForecast(null);
    setNarrative(null);
    setContextLoading(false);
    setReasoningLoading(false);
    setRecommendationsLoading(false);
    setForecastLoading(false);
    setNarrativeLoading(false);
  }, []);

  return {
    // Data
    contextAnalysis,
    riskReasoning,
    recommendations,
    trendAnalysis,
    forecast,
    narrative,

    // Loading states
    contextLoading,
    reasoningLoading,
    recommendationsLoading,
    trendLoading,
    forecastLoading,
    narrativeLoading,

    // Actions
    runFullPipeline,
    runSliderUpdate,
    runTrendAnalysis,
    clearAll,
    buildContextPayload,
  };
}
