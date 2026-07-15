import { runGeminiCompanySearch } from "../../lib/server/geminiCore.js";

export default async function handler(request, response) {
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
