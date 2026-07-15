import { runCompanyAnalysis } from "../../lib/server/analyzeCompanyCore.js";
import { runGeminiAssist, runGeminiCompanySearch } from "../../lib/server/geminiCore.js";

// Consolidated into a single Vercel catch-all route (covers
// /api/gemini/analyze-company, /api/gemini/assist, /api/gemini/company-search)
// to stay under the Hobby plan's 12 Serverless Functions per deployment
// limit — each separate file under api/ used to count as its own function.
// Frontend URLs are unchanged.

export async function analyzeCompanyHandler(request, response) {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { companyInput, tavilyApiKey } = request.body || {};
    const headerTavilyKey = request.headers["x-tavily-api-key"];

    const result = await runCompanyAnalysis({
      companyInput,
      tavilyApiKey: tavilyApiKey || headerTavilyKey,
    });

    return response.status(result.status).json(result.body);
  } catch (error) {
    console.error("analyze-company handler error:", error);
    return response.status(500).json({
      success: false,
      error: "Araştırma tamamlanamadı. Lütfen tekrar deneyin.",
    });
  }
}

export async function assistHandler(request, response) {
  response.setHeader("Content-Type", "application/json");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action, bodyText, promptInstruction, prompt } = request.body || {};
    const result = await runGeminiAssist({ action, bodyText, promptInstruction, prompt });
    return response.status(result.status).json(result.body);
  } catch (error) {
    console.error("assist handler error:", error);
    return response.status(500).json({ error: error.message || "Could not complete text generation with Gemini." });
  }
}

export async function companySearchHandler(request, response) {
  response.setHeader("Content-Type", "application/json");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { query } = request.body || {};
    const result = await runGeminiCompanySearch({ query });
    return response.status(result.status).json(result.body);
  } catch (error) {
    console.error("company-search handler error:", error);
    return response.status(500).json({ error: error.message || "Could not complete company search with Gemini." });
  }
}

export default async function handler(request, response) {
  const action = Array.isArray(request.query?.action) ? request.query.action[0] : request.query?.action;
  if (action === "analyze-company") return analyzeCompanyHandler(request, response);
  if (action === "assist") return assistHandler(request, response);
  if (action === "company-search") return companySearchHandler(request, response);
  return response.status(404).json({ error: "Unknown gemini endpoint." });
}
