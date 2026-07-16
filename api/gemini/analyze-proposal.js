import { runGeminiJsonPrompt } from "../../lib/server/proposalGeminiCore.js";

function buildPrompt({ companyName, proposalSubject, description, selectedServices, options, currency }) {
  const servicesText = Array.isArray(selectedServices) && selectedServices.length
    ? selectedServices.join(", ")
    : "belirtilmedi";

  return `Sen bir B2B satış stratejisti ve risk analistisin. Aşağıdaki teklif için kazanma olasılığını ve riskleri değerlendir.

Şirket: ${companyName || "Bilinmiyor"}
Teklif Konusu: ${proposalSubject || "Bilinmiyor"}
Açıklama: ${description || "Belirtilmedi"}
Kapsanan Hizmetler: ${servicesText}
Para Birimi: ${currency || "TRY"}

Yalnızca aşağıdaki JSON formatında, Türkçe olarak yanıt ver, başka hiçbir metin ekleme:

{
  "winProbability": "örn. 68%",
  "riskFactors": ["risk 1", "risk 2"],
  "missingInformation": ["eksik bilgi 1", "eksik bilgi 2"],
  "recommendedFollowUp": "önerilen takip stratejisi metni",
  "suggestedNextAction": "önerilen bir sonraki somut aksiyon",
  "potentialUpsell": ["ek satış fırsatı 1", "ek satış fırsatı 2"]
}`;
}

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { companyName, proposalSubject, description, selectedServices, options, currency } = request.body || {};

    const prompt = buildPrompt({ companyName, proposalSubject, description, selectedServices, options, currency });
    const parsed = await runGeminiJsonPrompt(prompt, { logPrefix: "analyze-proposal" });

    return response.status(200).json({ success: true, analysis: parsed });
  } catch (error) {
    console.error("analyze-proposal handler error:", error);
    return response.status(error.status || 500).json({
      success: false,
      error: error.message || "Proposal analysis failed.",
    });
  }
}
