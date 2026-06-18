/**
 * AIGuardian.js — The single intelligence brain of SafeRoute.
 * All Gemini calls route through this module. No component should call Gemini directly.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Single shared model instance
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * Safely parse JSON from Gemini response, stripping markdown fences.
 */
function safeParseJSON(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Send a prompt to Gemini with a system instruction and return parsed JSON.
 */
async function callGemini(systemInstruction, userPrompt) {
  const chat = model.startChat({
    systemInstruction: { parts: [{ text: systemInstruction }] },
  });
  const result = await chat.sendMessage(userPrompt);
  const text = result.response.text();
  return safeParseJSON(text);
}

// ── FALLBACK OBJECTS ────────────────────────────────────────────────────────────

const FALLBACK_CONTEXT = {
  riskContext: 'Unable to analyze context at this time.',
  primaryRiskFactors: [],
  contextScore: 50,
  timeRiskLevel: 'medium',
  recommendation: 'Stay alert and trust your instincts.',
};

const FALLBACK_RISK = {
  aiScore: 50,
  baseScoreAdjustment: 0,
  reasoning: ['AI risk analysis unavailable — using base score only.'],
  confidenceLevel: 'low',
  dominantRiskType: 'unknown',
};

const FALLBACK_RECOMMENDATIONS = [
  { type: 'awareness', priority: 'medium', title: 'Stay alert on your route', detail: 'Keep your phone charged and accessible at all times.', icon: '📱' },
  { type: 'companion', priority: 'medium', title: 'Share your live location', detail: 'Let a trusted contact know your route and ETA.', icon: '👥' },
  { type: 'emergency', priority: 'low', title: 'Know your emergency options', detail: 'Save the SOS button for quick access to help.', icon: '🆘' },
];

const FALLBACK_TRENDS = {
  hotspots: [],
  risingAreas: [],
  calmerAreas: [],
  dominantIncidentType: 'unknown',
  weeklyTrend: 'stable',
  trendInsight: 'Trend analysis is currently unavailable.',
};

const FALLBACK_FORECAST = {
  predictions: [
    { hour: 6, predictedScore: 20, confidence: 'low' },
    { hour: 9, predictedScore: 15, confidence: 'low' },
    { hour: 12, predictedScore: 25, confidence: 'low' },
    { hour: 15, predictedScore: 30, confidence: 'low' },
    { hour: 18, predictedScore: 45, confidence: 'low' },
    { hour: 21, predictedScore: 65, confidence: 'low' },
    { hour: 23, predictedScore: 75, confidence: 'low' },
  ],
  safestTimeWindow: '9 AM – 12 PM',
  riskiestTimeWindow: '10 PM – 1 AM',
  trendSummary: 'Risk prediction is currently unavailable.',
  actionableForecast: 'Consider travelling during daylight hours for the safest experience.',
};

const FALLBACK_NARRATIVE = {
  greeting: 'Hello',
  headline: 'Safety analysis is currently limited.',
  body: 'We could not complete a full analysis of this route. The risk score shown is based on incident data only.',
  topWarning: null,
  encouragement: 'Stay safe and trust your instincts — you\'ve got this.',
  voiceScript: 'Hello. Safety analysis is currently limited. The risk score shown is based on incident data only. Stay safe and trust your instincts.',
};

// ── PUBLIC METHODS ──────────────────────────────────────────────────────────────

/**
 * Feature 1 — Context Understanding
 */
export async function analyzeContext(contextPayload) {
  try {
    const systemPrompt = `You are a urban safety context analyzer. Given route context, return ONLY JSON:
{
  "riskContext": "string - one sentence describing the overall context",
  "primaryRiskFactors": ["string - top 3 factors elevating risk right now"],
  "contextScore": 0,
  "timeRiskLevel": "low|medium|high|critical",
  "recommendation": "string - one actionable sentence"
}
contextScore is 0-100, how risky is this context generally. Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Analyze this route context:\n${JSON.stringify(contextPayload, null, 2)}`;
    return await callGemini(systemPrompt, userPrompt);
  } catch (err) {
    console.error('[AIGuardian] analyzeContext error:', err);
    return { ...FALLBACK_CONTEXT };
  }
}

/**
 * Feature 2 — Real-Time Risk Reasoning
 */
export async function reasonRisk(route, incidents, context) {
  try {
    const systemPrompt = `You are a real-time safety risk reasoner for urban navigation.
Analyze the route, incidents, and context holistically.
Return ONLY JSON:
{
  "aiScore": 0,
  "baseScoreAdjustment": 0,
  "reasoning": ["string - array of 2-4 reasoning steps"],
  "confidenceLevel": "low|medium|high",
  "dominantRiskType": "string - which incident type is driving the score"
}
aiScore is 0-100. baseScoreAdjustment is -20 to +20. Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Route: ${JSON.stringify(route)}
Nearby incidents (${incidents.length} total): ${JSON.stringify(incidents.slice(0, 15))}
Context analysis: ${JSON.stringify(context)}`;

    return await callGemini(systemPrompt, userPrompt);
  } catch (err) {
    console.error('[AIGuardian] reasonRisk error:', err);
    return { ...FALLBACK_RISK };
  }
}

/**
 * Feature 3 — Safety Recommendations
 */
export async function getRecommendations(riskReasoning) {
  try {
    const systemPrompt = `You are a proactive women's safety advisor. Based on risk analysis,
return ONLY a JSON array of 3 recommendations:
[{
  "type": "route|timing|companion|awareness|emergency",
  "priority": "high|medium|low",
  "title": "string - 4-6 words",
  "detail": "string - 1 sentence, specific and actionable",
  "icon": "string - single emoji that represents this recommendation"
}]
Return ONLY valid JSON array, no markdown.`;

    const userPrompt = `Risk analysis:\n${JSON.stringify(riskReasoning, null, 2)}`;
    const result = await callGemini(systemPrompt, userPrompt);
    return Array.isArray(result) ? result : FALLBACK_RECOMMENDATIONS;
  } catch (err) {
    console.error('[AIGuardian] getRecommendations error:', err);
    return [...FALLBACK_RECOMMENDATIONS];
  }
}

/**
 * Feature 6 — Incident Trend Analysis
 */
export async function analyzeTrends(incidents) {
  try {
    const systemPrompt = `You are a safety data analyst. Analyze incident patterns and return ONLY JSON:
{
  "hotspots": [{"lat": 0, "lng": 0, "radius": 0, "label": "string"}],
  "risingAreas": ["string - areas where incidents are increasing"],
  "calmerAreas": ["string - areas with fewer recent incidents"],
  "dominantIncidentType": "string",
  "weeklyTrend": "improving|stable|worsening",
  "trendInsight": "string - 1 sentence, most important pattern found"
}
Return top 3 hotspots. Return ONLY valid JSON, no markdown.`;

    const summary = {
      total: incidents.length,
      byType: {},
      byHour: {},
      locations: incidents.slice(0, 30).map(i => ({
        lat: i.lat, lng: i.lng, type: i.type, hour: i.hour,
      })),
    };
    incidents.forEach(i => {
      summary.byType[i.type] = (summary.byType[i.type] || 0) + 1;
      summary.byHour[i.hour] = (summary.byHour[i.hour] || 0) + 1;
    });

    const userPrompt = `Analyze these incident patterns:\n${JSON.stringify(summary, null, 2)}`;
    return await callGemini(systemPrompt, userPrompt);
  } catch (err) {
    console.error('[AIGuardian] analyzeTrends error:', err);
    return { ...FALLBACK_TRENDS };
  }
}

/**
 * Feature 5 — Predictive Intelligence (AI layer)
 */
export async function predictFutureRisk(route, incidents, patterns) {
  try {
    const systemPrompt = `You are a predictive safety analyst. Given historical incident patterns
and a current route, predict risk levels at different times.
Return ONLY JSON:
{
  "predictions": [
    {"hour": 6, "predictedScore": 0, "confidence": "low|medium|high"},
    {"hour": 9, "predictedScore": 0, "confidence": "low|medium|high"},
    {"hour": 12, "predictedScore": 0, "confidence": "low|medium|high"},
    {"hour": 15, "predictedScore": 0, "confidence": "low|medium|high"},
    {"hour": 18, "predictedScore": 0, "confidence": "low|medium|high"},
    {"hour": 21, "predictedScore": 0, "confidence": "low|medium|high"},
    {"hour": 23, "predictedScore": 0, "confidence": "low|medium|high"}
  ],
  "safestTimeWindow": "string - e.g. '9 AM - 12 PM'",
  "riskiestTimeWindow": "string - e.g. '10 PM - 1 AM'",
  "trendSummary": "string - one sentence on the overall pattern",
  "actionableForecast": "string - one sentence with a specific time-based action the user can take"
}
predictedScore is 0-100. Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Route: ${JSON.stringify(route)}
Historical patterns: ${JSON.stringify(patterns)}
Incident count near route: ${incidents.length}`;

    return await callGemini(systemPrompt, userPrompt);
  } catch (err) {
    console.error('[AIGuardian] predictFutureRisk error:', err);
    return { ...FALLBACK_FORECAST };
  }
}

/**
 * Feature 9 — Natural Language Explanation (Saheli AI)
 */
export async function explainInNaturalLanguage(data) {
  try {
    const { contextAnalysis, riskReasoning, recommendations, trendAnalysis, forecast, userSensitivity } = data;

    const sensitivityTone = userSensitivity === 'high'
      ? 'Use very cautious, protective language. Emphasize safety measures strongly.'
      : userSensitivity === 'low'
        ? 'Use neutral, matter-of-fact language. Be informative without being alarming.'
        : 'Use warm, balanced language. Be helpful without causing unnecessary worry.';

    const systemPrompt = `You are Saheli, a personal AI safety companion for women navigating Indian cities.
Speak warmly, directly, and without alarm. You have full context on this route.
${sensitivityTone}
Return ONLY JSON:
{
  "greeting": "string - 'Good evening' | 'Good afternoon' etc based on hour",
  "headline": "string - 1 bold sentence summarizing the situation",
  "body": "string - 2-3 sentences: what the AI found, why it matters",
  "topWarning": "string|null - most important specific warning, or null if safe",
  "encouragement": "string - closing sentence, empowering not alarming",
  "voiceScript": "string - a single natural-speech paragraph combining all above, for future text-to-speech use"
}
Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Here is the full analysis for this route:
Context: ${JSON.stringify(contextAnalysis)}
Risk Reasoning: ${JSON.stringify(riskReasoning)}
Recommendations: ${JSON.stringify(recommendations)}
Trends: ${JSON.stringify(trendAnalysis)}
Forecast: ${JSON.stringify(forecast)}
User sensitivity: ${userSensitivity || 'medium'}`;

    return await callGemini(systemPrompt, userPrompt);
  } catch (err) {
    console.error('[AIGuardian] explainInNaturalLanguage error:', err);
    return { ...FALLBACK_NARRATIVE };
  }
}
