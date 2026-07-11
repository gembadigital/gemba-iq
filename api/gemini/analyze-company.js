import { runCompanyAnalysis } from "../lib/analyzeCompanyCore.js";

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({
      success: false,
      error: "Method not allowed",
    });
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
