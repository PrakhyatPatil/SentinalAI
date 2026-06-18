import { GoogleGenerativeAI } from '@google/generative-ai';

export const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const SYSTEM_PROMPT = `You are a women's safety advisor. Given a route and nearby reported incidents, give a 2–3 sentence safety assessment. Be specific, helpful, and not alarmist. Focus on practical advice.`;

const WEIGHTS_SYSTEM_PROMPT = `You are a safety risk analyst. Given a list of incidents with types and the current hour, return ONLY a JSON array: [{id, weight}] where weight is a float 1.0–5.0. Higher weight = more dangerous given the time context. No explanation, no markdown, only raw JSON.`;

export function buildPrompt({ origin, destination, time, incidents, score }) {
  const incidentList =
    incidents.length > 0
      ? incidents
          .map((i) => `${i.type.replace(/_/g, ' ')} (reported ${i.hour}:00)`)
          .join(', ')
      : 'No incidents reported nearby';

  return `Route from ${origin} to ${destination} at ${time}.\nNearby incidents: ${incidentList}.\nCurrent risk score: ${score}/100.\nIs this route safe?`;
}

/**
 * Calls Gemini to get dynamic per-incident weights based on time context.
 * Returns a Map<incidentId, weight> or null on failure.
 */
export async function getGeminiWeights(incidents, sliderHour) {
  if (!incidents || incidents.length === 0) return null;

  const incidentData = incidents.map((i) => ({
    id: i.id ?? i.label ?? `${i.lat},${i.lng}`,
    type: i.type,
    hour: i.hour,
  }));

  const userPrompt = `Hour: ${sliderHour}. Incidents near route: ${JSON.stringify(incidentData)}`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: WEIGHTS_SYSTEM_PROMPT,
    });

    const result = await model.generateContent(userPrompt);
    let text = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps the response
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return null;

    const weightMap = new Map();
    for (const entry of parsed) {
      if (entry.id != null && typeof entry.weight === 'number') {
        weightMap.set(String(entry.id), Math.max(1, Math.min(5, entry.weight)));
      }
    }
    console.log(`[Gemini Weights] Received ${weightMap.size} dynamic weights for hour ${sliderHour}`);
    return weightMap.size > 0 ? weightMap : null;
  } catch (err) {
    console.warn('[Gemini Weights] Failed to get dynamic weights, falling back to static:', err.message);
    return null;
  }
}

/**
 * Calls Gemini 1.5 Flash and returns a 2–3 sentence safety summary.
 * Returns a fallback string if the API is unavailable.
 */
export async function getSafetySummary(promptData) {
  const userPrompt = buildPrompt(promptData);

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    return text.trim();
  } catch (err) {
    console.error('Gemini API error:', err);
    const { score } = promptData;
    if (score <= 33) {
      return `This route appears relatively safe based on available incident data. Stay aware of your surroundings and keep your phone accessible. Trust your instincts — if something feels off, change your route.`;
    } else if (score <= 66) {
      return `This route has a moderate risk level with some reported incidents nearby. Consider travelling with a companion or staying on well-lit main roads. Let someone know your expected arrival time.`;
    } else {
      return `This route has a high risk score based on multiple reported incidents in the area. Consider an alternate route, travel with company if possible, and keep emergency contacts ready. The SOS button below can send your location instantly.`;
    }
  }
}
