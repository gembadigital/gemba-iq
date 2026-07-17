import { GoogleGenAI } from "@google/genai";

// "gemini-2.5-flash" was retired for new API keys (Google now returns a 404
// NOT_FOUND for it). All retry attempts now use "gemini-3.5-flash", matching
// the model already working in lib/server/geminiCore.js (assist/company-search).
const GEMINI_RETRY_PLAN = [
  { model: "gemini-3.5-flash", waitAfter503Ms: 3000 },
  { model: "gemini-3.5-flash", waitAfter503Ms: 5000 },
  { model: "gemini-3.5-flash", waitAfter503Ms: 0 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiOverload(err) {
  const message = `${err?.message || err || ""}`.toUpperCase();
  const status = err?.status ?? err?.statusCode ?? null;
  return (
    status === 503 ||
    message.includes("UNAVAILABLE") ||
    message.includes("HIGH DEMAND") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Runs a Gemini prompt with retry-on-overload and returns parsed JSON.
 * Throws on failure so callers can surface a real error to the UI instead of
 * silently pretending the call succeeded.
 */
export async function runGeminiJsonPrompt(prompt, { logPrefix = "gemini" } = {}) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    const error = new Error("GEMINI_API_KEY is not configured on the server.");
    error.status = 503;
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  let lastError = null;

  for (let i = 0; i < GEMINI_RETRY_PLAN.length; i++) {
    const { model, waitAfter503Ms } = GEMINI_RETRY_PLAN[i];
    try {
      const aiRes = await ai.models.generateContent({ model, contents: prompt });
      const text = aiRes.text?.trim();
      if (!text) throw new Error("Gemini returned an empty response.");
      const parsed = extractJson(text);
      if (!parsed) throw new Error("Gemini response could not be parsed as JSON.");
      return parsed;
    } catch (err) {
      lastError = err;
      console.error(`[${logPrefix}] Gemini call failed (model: ${model}):`, err?.message || err);
      const canRetry = isRetryableGeminiOverload(err) && i < GEMINI_RETRY_PLAN.length - 1;
      if (!canRetry) break;
      if (waitAfter503Ms > 0) await sleep(waitAfter503Ms);
    }
  }

  const error = new Error(lastError?.message || "Gemini request failed after retries.");
  error.status = 502;
  throw error;
}
