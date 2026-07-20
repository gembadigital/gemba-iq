import { runCompanyAnalysis } from "../../lib/server/analyzeCompanyCore.js";
import {
  runGeminiAssist,
  runGeminiCompanySearch,
  runGembaLensChat,
  runGeminiSalesCoach,
  runGeminiCampaignAssist,
  runGeminiCustomPitch,
  runGeminiConvertTable,
} from "../../lib/server/geminiCore.js";

// Consolidated into a single Vercel catch-all route (covers
// /api/gemini/analyze-company, /api/gemini/assist, /api/gemini/company-search,
// /api/gemini/gemba-lens-chat) to stay under the Hobby plan's 12 Serverless
// Functions per deployment limit — each separate file under api/ used to
// count as its own function. Frontend URLs are unchanged.

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

export async function gembaLensChatHandler(request, response) {
  response.setHeader("Content-Type", "application/json");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history, context } = request.body || {};
    const result = await runGembaLensChat({ message, history, context });
    return response.status(result.status).json(result.body);
  } catch (error) {
    console.error("gemba-lens-chat handler error:", error);
    return response.status(500).json({ error: error.message || "Saha AI Danışmanı şu anda yanıt veremiyor." });
  }
}

export async function salesCoachHandler(request, response) {
  response.setHeader("Content-Type", "application/json");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { deals, query, activeSkills } = request.body || {};
    const result = await runGeminiSalesCoach({ deals, query, activeSkills });
    return response.status(result.status).json(result.body);
  } catch (error) {
    console.error("sales-coach handler error:", error);
    return response.status(500).json({ success: false, error: error.message || "Could not complete sales coaching request with Gemini." });
  }
}

export async function campaignAssistHandler(request, response) {
  response.setHeader("Content-Type", "application/json");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action, bodyText, promptInstruction, targetChannel, tags } = request.body || {};
    const result = await runGeminiCampaignAssist({ action, bodyText, promptInstruction, targetChannel, tags });
    return response.status(result.status).json(result.body);
  } catch (error) {
    console.error("campaign-assist handler error:", error);
    return response.status(500).json({ error: error.message || "Could not complete campaign copy generation with Gemini." });
  }
}

export async function generateCustomPitchHandler(request, response) {
  response.setHeader("Content-Type", "application/json");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { companyName, mailType, topic, tone, extraContext, researchContext } = request.body || {};
    const result = await runGeminiCustomPitch({ companyName, mailType, topic, tone, extraContext, researchContext });
    return response.status(result.status).json(result.body);
  } catch (error) {
    console.error("generate-custom-pitch handler error:", error);
    return response.status(500).json({ success: false, error: error.message || "Could not generate custom pitch with Gemini." });
  }
}

export async function convertTableHandler(request, response) {
  response.setHeader("Content-Type", "application/json");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { pastedContent } = request.body || {};
    const result = await runGeminiConvertTable({ pastedContent });
    return response.status(result.status).json(result.body);
  } catch (error) {
    console.error("convert-table handler error:", error);
    return response.status(500).json({ error: error.message || "Could not complete table conversion with Gemini." });
  }
}

export default async function handler(request, response) {
  const action = Array.isArray(request.query?.action) ? request.query.action[0] : request.query?.action;
  if (action === "analyze-company") return analyzeCompanyHandler(request, response);
  if (action === "assist") return assistHandler(request, response);
  if (action === "company-search") return companySearchHandler(request, response);
  if (action === "gemba-lens-chat") return gembaLensChatHandler(request, response);
  if (action === "sales-coach") return salesCoachHandler(request, response);
  if (action === "campaign-assist") return campaignAssistHandler(request, response);
  if (action === "generate-custom-pitch") return generateCustomPitchHandler(request, response);
  if (action === "convert-table") return convertTableHandler(request, response);
  return response.status(404).json({ error: "Unknown gemini endpoint." });
}
