import { runGeminiJsonPrompt } from "../../lib/server/proposalGeminiCore.js";

function buildPrompt({ companyName, contactPerson, proposalSubject, selectedServices, options, currency, language }) {
  const isTurkish = String(language || "TR").toUpperCase() !== "EN";
  const servicesText = Array.isArray(selectedServices) && selectedServices.length
    ? selectedServices.join(", ")
    : "belirtilmedi";

  return `Sen bir B2B satış danışmanısın ve bir müşteriye ticari teklif e-postası yazacaksın.

Şirket: ${companyName || "Bilinmiyor"}
Yetkili Kişi: ${contactPerson || "Bilinmiyor"}
Teklif Konusu: ${proposalSubject || "Bilinmiyor"}
Kapsanan Hizmetler: ${servicesText}
Para Birimi: ${currency || "TRY"}
Yanıt Dili: ${isTurkish ? "Türkçe" : "İngilizce"}

Kurallar:
- Profesyonel, kısa ve net bir B2B teklif sunum e-postası yaz.
- HTML gövdesi <p> etiketleri kullanarak biçimlendirilmeli (markdown kullanma).
- Fiyat veya rakam uydurma; ekli teklif dokümanına atıfta bulun.
- Yalnızca aşağıdaki JSON formatında yanıt ver, başka hiçbir metin ekleme:

{"subject": "e-posta konu satırı", "body": "<p>e-posta gövdesi html olarak</p>"}`;
}

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { companyName, contactPerson, proposalSubject, selectedServices, options, currency, language } =
      request.body || {};

    const prompt = buildPrompt({ companyName, contactPerson, proposalSubject, selectedServices, options, currency, language });
    const parsed = await runGeminiJsonPrompt(prompt, { logPrefix: "generate-proposal-email" });

    if (!parsed?.subject || !parsed?.body) {
      return response.status(502).json({ success: false, error: "Gemini did not return a usable subject/body." });
    }

    return response.status(200).json({ success: true, subject: parsed.subject, body: parsed.body });
  } catch (error) {
    console.error("generate-proposal-email handler error:", error);
    return response.status(error.status || 500).json({
      success: false,
      error: error.message || "Proposal email generation failed.",
    });
  }
}
