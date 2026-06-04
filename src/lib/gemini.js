import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const SYSTEM_PROMPT = `You are a women's safety advisor. Given a route and nearby reported incidents, give a 2–3 sentence safety assessment. Be specific, helpful, and not alarmist. Focus on practical advice.`;

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
