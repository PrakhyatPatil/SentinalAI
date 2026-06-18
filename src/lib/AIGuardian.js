/**
 * AIGuardian.js — The single intelligence brain of SafeRoute.
 * All Gemini calls route through this module. No component should call Gemini directly.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseJSON(text) {
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function callGemini(systemPrompt, userPrompt) {
  const chat = model.startChat({
    systemInstruction: systemPrompt,
  });
  const result = await chat.sendMessage(userPrompt);
  return result.response.text();
}

// ── Fallback Objects ───────────────────────────────────────────────────────────

const FALLBACK_CONTEXT = {
  riskContext: 'Unable to analyze context at this time.',
  primaryRiskFactors: [],
  contextScore: 50,
  timeRiskLevel: 'medium',
  recommendation: 'Stay aware of your surroundings and trust your instincts.',
};

const FALLBACK_RISK_REASONING = {
  aiScore: 50,
  baseScoreAdjustment: 0,
  reasoning: ['AI analysis unavailable — using base score only.'],
  confidenceLevel: 'low',
  dominantRiskType: 'unknown',
};

const FALLBACK_RECOMMENDATIONS = [
  {
    type: 'awareness',
    priority: 'medium',
    title: 'Stay Alert & Aware',
    detail: 'Keep your phone charged and stay on well-lit main roads.',
    icon: '👁️',
  },
  {
    type: 'companion',
    priority: 'medium',
    title: 'Travel With Someone',
    detail: 'Consider walking with a friend or calling someone while walking.',
    icon: '👥',
  },
  {
    type: 'emergency',
    priority: 'low',
    title: 'Keep Emergency Ready',
    detail: 'Have your emergency contacts accessible and the SOS button ready.',
    icon: '🚨',
  },
];

const FALLBACK_TRENDS = {
  hotspots: [],
  risingAreas: [],
  calmerAreas: [],
  dominantIncidentType: 'unknown',
  weeklyTrend: 'stable',
  trendInsight: 'Trend data is currently unavailable.',
};

const FALLBACK_FORECAST = {
  predictions: [
    { hour: 6, predictedScore: 20, confidence: 'low' },
    { hour: 9, predictedScore: 15, confidence: 'low' },
    { hour: 12, predictedScore: 25, confidence: 'low' },
    { hour: 15, predictedScore: 30, confidence: 'low' },
    { hour: 18, predictedScore: 45, confidence: 'low' },
    { hour: 21, predictedScore: 65, confidence: 'low' },
    { hour: 23, predictedScore: 70, confidence: 'low' },
  ],
  safestTimeWindow: '9 AM – 12 PM',
  riskiestTimeWindow: '10 PM – 1 AM',
  trendSummary: 'Prediction data is currently unavailable.',
  actionableForecast: 'Consider travelling during daylight hours for lower risk.',
};

const FALLBACK_NARRATIVE = {
  greeting: 'Hello',
  headline: 'Route analysis is currently limited.',
  body: 'We could not fully analyze your route at this time. Your base safety score is still valid and calculated from local incident data. Please stay aware of your surroundings.',
  topWarning: null,
  encouragement: "You're taking a smart step by checking your route. Stay confident and trust your instincts.",
  voiceScript: 'Route analysis is currently limited, but your base safety score is still valid. Stay aware and trust your instincts.',
};

// ── System Prompts ─────────────────────────────────────────────────────────────

const CONTEXT_SYSTEM_PROMPT = `You are a urban safety context analyzer. Given route context, return ONLY JSON:
{
  "riskContext": "string (one sentence describing the overall context)",
  "primaryRiskFactors": ["string (top 3 factors elevating risk right now)"],
  "contextScore": "number (0-100, how risky is this context generally)",
  "timeRiskLevel": "low|medium|high|critical",
  "recommendation": "string (one actionable sentence)"
}
Return ONLY the JSON object, no markdown, no explanation.`;

const RISK_REASONING_SYSTEM_PROMPT = `You are a real-time safety risk reasoner for urban navigation.
Analyze the route, incidents, and context holistically.
Return ONLY JSON:
{
  "aiScore": "number (0-100 AI-reasoned risk score)",
  "baseScoreAdjustment": "number (-20 to +20, how much to shift the Haversine score)",
  "reasoning": ["string (array of 2-4 reasoning steps you took)"],
  "confidenceLevel": "low|medium|high",
  "dominantRiskType": "string (which incident type is driving the score)"
}
Return ONLY the JSON object, no markdown, no explanation.`;

const RECOMMENDATIONS_SYSTEM_PROMPT = `You are a proactive women's safety advisor. Based on risk analysis,
return ONLY a JSON array of 3 recommendations:
[{
  "type": "route|timing|companion|awareness|emergency",
  "priority": "high|medium|low",
  "title": "string (4-6 words)",
  "detail": "string (1 sentence, specific and actionable)",
  "icon": "string (single emoji that represents this recommendation)"
}]
Return ONLY the JSON array, no markdown, no explanation.`;

const TRENDS_SYSTEM_PROMPT = `You are a safety data analyst. Analyze incident patterns and return ONLY JSON:
{
  "hotspots": [{"lat": "number", "lng": "number", "radius": "number", "label": "string"}],
  "risingAreas": ["string (areas where incidents are increasing)"],
  "calmerAreas": ["string (areas with fewer recent incidents)"],
  "dominantIncidentType": "string",
  "weeklyTrend": "improving|stable|worsening",
  "trendInsight": "string (1 sentence, most important pattern found)"
}
Return only top 3 hotspots. Return ONLY the JSON object, no markdown, no explanation.`;

const FORECAST_SYSTEM_PROMPT = `You are a predictive safety analyst. Given historical incident patterns
and a current route, predict risk levels at different times.
Return ONLY JSON:
{
  "predictions": [
    {"hour": "number", "predictedScore": "number (0-100)", "confidence": "low|medium|high"}
  ],
  "safestTimeWindow": "string (e.g. '9 AM – 12 PM')",
  "riskiestTimeWindow": "string (e.g. '10 PM – 1 AM')",
  "trendSummary": "string (one sentence on the overall pattern)",
  "actionableForecast": "string (one sentence with a specific time-based action the user can take)"
}
Provide predictions for hours: 6, 9, 12, 15, 18, 21, 23.
Return ONLY the JSON object, no markdown, no explanation.`;

function buildNarrativeSystemPrompt(sensitivity) {
  const tone = sensitivity === 'high'
    ? 'Be especially cautious and thorough in your warnings. Use careful, protective language.'
    : sensitivity === 'low'
      ? 'Be balanced and neutral. Avoid being overly alarming. Focus on facts.'
      : 'Speak warmly, directly, and without alarm.';

  return `You are Saheli, a personal AI safety companion for women navigating Indian cities.
${tone} You have full context on this route.
Return ONLY JSON:
{
  "greeting": "string ('Good evening' | 'Good afternoon' etc based on hour)",
  "headline": "string (1 bold sentence summarizing the situation)",
  "body": "string (2-3 sentences: what the AI found, why it matters)",
  "topWarning": "string|null (most important specific warning, or null if safe)",
  "encouragement": "string (closing sentence, empowering not alarming)",
  "voiceScript": "string (a single natural-speech paragraph combining all above, for future text-to-speech use)"
}
Return ONLY the JSON object, no markdown, no explanation.`;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Analyze the contextual risk factors for a route.
 */
export async function analyzeContext(contextPayload) {
  try {
    const userPrompt = `Analyze this route context:\n${JSON.stringify(contextPayload, null, 2)}`;
    const text = await callGemini(CONTEXT_SYSTEM_PROMPT, userPrompt);
    const parsed = parseJSON(text);
    if (!parsed || typeof parsed.contextScore !== 'number') return FALLBACK_CONTEXT;
    return {
      riskContext: parsed.riskContext || FALLBACK_CONTEXT.riskContext,
      primaryRiskFactors: Array.isArray(parsed.primaryRiskFactors) ? parsed.primaryRiskFactors : [],
      contextScore: Math.max(0, Math.min(100, parsed.contextScore)),
      timeRiskLevel: ['low', 'medium', 'high', 'critical'].includes(parsed.timeRiskLevel)
        ? parsed.timeRiskLevel : 'medium',
      recommendation: parsed.recommendation || FALLBACK_CONTEXT.recommendation,
    };
  } catch (err) {
    console.warn('[AIGuardian] analyzeContext failed:', err.message);
    return FALLBACK_CONTEXT;
  }
}

/**
 * AI-reasoned risk scoring that adjusts the Haversine base score.
 */
export async function reasonRisk(route, incidents, context) {
  try {
    const userPrompt = `Route: ${JSON.stringify(route)}
Nearby incidents: ${JSON.stringify(incidents.slice(0, 15).map(i => ({
  type: i.type, hour: i.hour, label: i.label,
  lat: i.lat?.toFixed(4), lng: i.lng?.toFixed(4),
})))}
Context analysis: ${JSON.stringify(context)}`;
    const text = await callGemini(RISK_REASONING_SYSTEM_PROMPT, userPrompt);
    const parsed = parseJSON(text);
    if (!parsed || typeof parsed.aiScore !== 'number') return FALLBACK_RISK_REASONING;
    return {
      aiScore: Math.max(0, Math.min(100, parsed.aiScore)),
      baseScoreAdjustment: Math.max(-20, Math.min(20, parsed.baseScoreAdjustment || 0)),
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.slice(0, 4) : FALLBACK_RISK_REASONING.reasoning,
      confidenceLevel: ['low', 'medium', 'high'].includes(parsed.confidenceLevel)
        ? parsed.confidenceLevel : 'low',
      dominantRiskType: parsed.dominantRiskType || 'unknown',
    };
  } catch (err) {
    console.warn('[AIGuardian] reasonRisk failed:', err.message);
    return FALLBACK_RISK_REASONING;
  }
}

/**
 * Get 3 actionable safety recommendations based on risk reasoning.
 */
export async function getRecommendations(riskReasoning) {
  try {
    const userPrompt = `Risk analysis:\n${JSON.stringify(riskReasoning, null, 2)}`;
    const text = await callGemini(RECOMMENDATIONS_SYSTEM_PROMPT, userPrompt);
    const parsed = parseJSON(text);
    if (!Array.isArray(parsed) || parsed.length === 0) return FALLBACK_RECOMMENDATIONS;
    return parsed.slice(0, 3).map((r) => ({
      type: r.type || 'awareness',
      priority: ['high', 'medium', 'low'].includes(r.priority) ? r.priority : 'medium',
      title: r.title || 'Stay Safe',
      detail: r.detail || 'Be aware of your surroundings.',
      icon: r.icon || '🛡️',
    }));
  } catch (err) {
    console.warn('[AIGuardian] getRecommendations failed:', err.message);
    return FALLBACK_RECOMMENDATIONS;
  }
}

/**
 * Analyze incident trends (called once on app load, cached).
 */
export async function analyzeTrends(incidents) {
  try {
    const summary = incidents.slice(0, 40).map((i) => ({
      type: i.type,
      hour: i.hour,
      lat: i.lat?.toFixed(4),
      lng: i.lng?.toFixed(4),
      label: i.label,
      timestamp: i.timestamp?.toMillis ? i.timestamp.toMillis() : null,
    }));
    const userPrompt = `Analyze these ${incidents.length} safety incidents:\n${JSON.stringify(summary, null, 2)}`;
    const text = await callGemini(TRENDS_SYSTEM_PROMPT, userPrompt);
    const parsed = parseJSON(text);
    if (!parsed || !parsed.trendInsight) return FALLBACK_TRENDS;
    return {
      hotspots: Array.isArray(parsed.hotspots) ? parsed.hotspots.slice(0, 3) : [],
      risingAreas: Array.isArray(parsed.risingAreas) ? parsed.risingAreas : [],
      calmerAreas: Array.isArray(parsed.calmerAreas) ? parsed.calmerAreas : [],
      dominantIncidentType: parsed.dominantIncidentType || 'unknown',
      weeklyTrend: ['improving', 'stable', 'worsening'].includes(parsed.weeklyTrend)
        ? parsed.weeklyTrend : 'stable',
      trendInsight: parsed.trendInsight,
    };
  } catch (err) {
    console.warn('[AIGuardian] analyzeTrends failed:', err.message);
    return FALLBACK_TRENDS;
  }
}

/**
 * Predict future risk at different hours using historical patterns.
 */
export async function predictFutureRisk(route, incidents, patterns) {
  try {
    const userPrompt = `Route: ${JSON.stringify(route)}
Historical incident patterns:
- Hourly risk map: ${JSON.stringify(patterns?.hourlyRiskMap || {})}
- Peak risk hour: ${patterns?.peakRiskHour ?? 'unknown'}
- Safest hour: ${patterns?.safestHour ?? 'unknown'}
- Weekday risk map: ${JSON.stringify(patterns?.weekdayRiskMap || {})}
Total incidents near route: ${incidents.length}`;
    const text = await callGemini(FORECAST_SYSTEM_PROMPT, userPrompt);
    const parsed = parseJSON(text);
    if (!parsed || !Array.isArray(parsed.predictions)) return FALLBACK_FORECAST;
    return {
      predictions: parsed.predictions.map((p) => ({
        hour: typeof p.hour === 'number' ? p.hour : 0,
        predictedScore: Math.max(0, Math.min(100, p.predictedScore || 50)),
        confidence: ['low', 'medium', 'high'].includes(p.confidence) ? p.confidence : 'low',
      })),
      safestTimeWindow: parsed.safestTimeWindow || FALLBACK_FORECAST.safestTimeWindow,
      riskiestTimeWindow: parsed.riskiestTimeWindow || FALLBACK_FORECAST.riskiestTimeWindow,
      trendSummary: parsed.trendSummary || FALLBACK_FORECAST.trendSummary,
      actionableForecast: parsed.actionableForecast || FALLBACK_FORECAST.actionableForecast,
    };
  } catch (err) {
    console.warn('[AIGuardian] predictFutureRisk failed:', err.message);
    return FALLBACK_FORECAST;
  }
}

/**
 * Synthesize all AI outputs into one cohesive natural language briefing.
 */
export async function explainInNaturalLanguage({
  contextAnalysis,
  riskReasoning,
  recommendations,
  trendAnalysis,
  forecast,
  userSensitivity,
}) {
  try {
    const systemPrompt = buildNarrativeSystemPrompt(userSensitivity || 'medium');
    const userPrompt = `Full safety analysis for this route:
Context: ${JSON.stringify(contextAnalysis)}
Risk Reasoning: ${JSON.stringify(riskReasoning)}
Recommendations: ${JSON.stringify(recommendations)}
Trend Analysis: ${JSON.stringify(trendAnalysis)}
Forecast: ${JSON.stringify(forecast)}
User sensitivity: ${userSensitivity || 'medium'}`;
    const text = await callGemini(systemPrompt, userPrompt);
    const parsed = parseJSON(text);
    if (!parsed || !parsed.headline) return FALLBACK_NARRATIVE;
    return {
      greeting: parsed.greeting || FALLBACK_NARRATIVE.greeting,
      headline: parsed.headline,
      body: parsed.body || FALLBACK_NARRATIVE.body,
      topWarning: parsed.topWarning || null,
      encouragement: parsed.encouragement || FALLBACK_NARRATIVE.encouragement,
      voiceScript: parsed.voiceScript || FALLBACK_NARRATIVE.voiceScript,
    };
  } catch (err) {
    console.warn('[AIGuardian] explainInNaturalLanguage failed:', err.message);
    return FALLBACK_NARRATIVE;
  }
}
