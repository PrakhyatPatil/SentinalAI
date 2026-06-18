/**
 * useAIGuardian.js — Central hook orchestrating all AI Guardian calls.
 * Manages individual loading states for progressive rendering.
 */
import { useState, useCallback, useRef } from 'react';
import * as AIGuardian from '../lib/AIGuardian.js';
import { extractPatterns, getTimeCategory, countIncidentTypes, countRecentIncidents } from '../lib/PredictiveEngine.js';
import { getUserSensitivity } from '../lib/userProfile.js';

export function useAIGuardian() {
  // ── Individual states for progressive loading ─────────────────────────────
  const [contextAnalysis, setContextAnalysis] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);

  const [riskReasoning, setRiskReasoning] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);

  const [recommendations, setRecommendations] = useState(null);
  const [recsLoading, setRecsLoading] = useState(false);

  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const [narrative, setNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const [trendAnalysis, setTrendAnalysis] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);

  // Abort tracking
  const abortRef = useRef(null);
  const trendIncidentCountRef = useRef(0);

  /**
   * Build the context payload from available data.
   */
  const buildContextPayload = useCallback((params) => {
    const { sliderHour, incidents, nearbyIncidents, routeDistanceKm, origin, destination } = params;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return {
      hour: sliderHour,
      dayOfWeek,
      isWeekend,
      timeCategory: getTimeCategory(sliderHour),
      incidentDensity: nearbyIncidents.length,
      incidentTypes: countIncidentTypes(nearbyIncidents),
      recentIncidents: countRecentIncidents(incidents),
      routeDistanceKm: routeDistanceKm || 0,
      origin,
      destination,
      userSensitivity: getUserSensitivity(),
    };
  }, []);

  /**
   * ON APP LOAD — Analyze trends (cached, re-called only if count changes by >2).
   */
  const runTrendAnalysis = useCallback(async (incidents) => {
    const countDiff = Math.abs(incidents.length - trendIncidentCountRef.current);
    if (trendAnalysis && countDiff <= 2) return; // Use cached

    trendIncidentCountRef.current = incidents.length;
    setTrendLoading(true);
    try {
      const result = await AIGuardian.analyzeTrends(incidents);
      setTrendAnalysis(result);
    } catch (err) {
      console.error('[useAIGuardian] trend analysis error:', err);
    } finally {
      setTrendLoading(false);
    }
  }, [trendAnalysis]);

  /**
   * ON ROUTE SUBMIT — Full 5-step orchestration pipeline.
   *
   * Step 1: analyzeContext + Step 4: predictFutureRisk  (parallel)
   * Step 2: reasonRisk (needs Step 1)
   * Step 3: getRecommendations (needs Step 2)
   * Step 5: explainInNaturalLanguage (needs all)
   */
  const runFullPipeline = useCallback(async (params) => {
    const { sliderHour, incidents, nearbyIncidents, routeDistanceKm, origin, destination } = params;

    // Abort tracking
    const thisCall = {};
    abortRef.current = thisCall;

    // Build context payload
    const contextPayload = buildContextPayload(params);

    // Extract patterns for predictions
    const patterns = extractPatterns(incidents);

    const routeInfo = { origin, destination, distanceKm: routeDistanceKm };

    // Reset all states
    setContextAnalysis(null);
    setRiskReasoning(null);
    setRecommendations(null);
    setForecast(null);
    setNarrative(null);

    // Set all loading
    setContextLoading(true);
    setRiskLoading(true);
    setRecsLoading(true);
    setForecastLoading(true);
    setNarrativeLoading(true);

    try {
      // ── Step 1 + Step 4 in parallel ─────────────────────────────────────
      const [ctxResult, forecastResult] = await Promise.all([
        AIGuardian.analyzeContext(contextPayload),
        AIGuardian.predictFutureRisk(routeInfo, nearbyIncidents, patterns),
      ]);

      if (abortRef.current !== thisCall) return;

      setContextAnalysis(ctxResult);
      setContextLoading(false);
      setForecast(forecastResult);
      setForecastLoading(false);

      // ── Step 2: reasonRisk (needs context) ──────────────────────────────
      const riskResult = await AIGuardian.reasonRisk(routeInfo, nearbyIncidents, ctxResult);

      if (abortRef.current !== thisCall) return;

      setRiskReasoning(riskResult);
      setRiskLoading(false);

      // ── Step 3: getRecommendations (needs risk) ─────────────────────────
      const recsResult = await AIGuardian.getRecommendations(riskResult);

      if (abortRef.current !== thisCall) return;

      setRecommendations(recsResult);
      setRecsLoading(false);

      // ── Step 5: explainInNaturalLanguage (needs all) ────────────────────
      const narrativeResult = await AIGuardian.explainInNaturalLanguage({
        contextAnalysis: ctxResult,
        riskReasoning: riskResult,
        recommendations: recsResult,
        trendAnalysis,
        forecast: forecastResult,
        userSensitivity: getUserSensitivity(),
      });

      if (abortRef.current !== thisCall) return;

      setNarrative(narrativeResult);
      setNarrativeLoading(false);

    } catch (err) {
      console.error('[useAIGuardian] pipeline error:', err);
      // Ensure loading states are cleared
      setContextLoading(false);
      setRiskLoading(false);
      setRecsLoading(false);
      setForecastLoading(false);
      setNarrativeLoading(false);
    }
  }, [buildContextPayload, trendAnalysis]);

  /**
   * ON TIME SLIDER CHANGE — Re-run Steps 1-2 only.
   */
  const runSliderUpdate = useCallback(async (params) => {
    const { sliderHour, incidents, nearbyIncidents, routeDistanceKm, origin, destination } = params;

    const thisCall = {};
    abortRef.current = thisCall;

    const contextPayload = buildContextPayload(params);
    const routeInfo = { origin, destination, distanceKm: routeDistanceKm };

    setContextLoading(true);
    setRiskLoading(true);

    try {
      // Step 1: analyzeContext
      const ctxResult = await AIGuardian.analyzeContext(contextPayload);
      if (abortRef.current !== thisCall) return;

      setContextAnalysis(ctxResult);
      setContextLoading(false);

      // Step 2: reasonRisk
      const riskResult = await AIGuardian.reasonRisk(routeInfo, nearbyIncidents, ctxResult);
      if (abortRef.current !== thisCall) return;

      setRiskReasoning(riskResult);
      setRiskLoading(false);

    } catch (err) {
      console.error('[useAIGuardian] slider update error:', err);
      setContextLoading(false);
      setRiskLoading(false);
    }
  }, [buildContextPayload]);

  /**
   * Clear all AI state (e.g., on route clear).
   */
  const clearAll = useCallback(() => {
    abortRef.current = null;
    setContextAnalysis(null);
    setRiskReasoning(null);
    setRecommendations(null);
    setForecast(null);
    setNarrative(null);
    setContextLoading(false);
    setRiskLoading(false);
    setRecsLoading(false);
    setForecastLoading(false);
    setNarrativeLoading(false);
  }, []);

  return {
    // State
    contextAnalysis, contextLoading,
    riskReasoning, riskLoading,
    recommendations, recsLoading,
    forecast, forecastLoading,
    narrative, narrativeLoading,
    trendAnalysis, trendLoading,

    // Actions
    runTrendAnalysis,
    runFullPipeline,
    runSliderUpdate,
    clearAll,
    buildContextPayload,
  };
}
