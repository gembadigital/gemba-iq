import { runGeminiAssist } from "../../lib/server/geminiCore.js";

export default async function handler(request, response) {
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
