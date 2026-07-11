import { GoogleGenAI } from "@google/genai";
import {
  fetchCompanyResearch,
  formatTavilyContext,
} from "./tavilyCompanyResearch.js";

function buildGeminiPrompt(company, tavilyContextText) {
  return `Sen bir B2B Satış İstihbaratı analisti ve Operasyonel Mükemmellik (OpEx) danışmanısın.

KRİTİK KURAL: Yalnızca aşağıda sunulan Tavily arama sonuçlarını analiz edeceksin. Kendi genel bilgini, tahminini veya çıkarımını KULLANMA.

YASAKLAR (kesinlikle yapma):
- Dummy data, örnek veri, placeholder, lorem ipsum
- Tahmini çalışan sayısı, tahmini ciro, tahmini e-posta formatı
- Uydurulmuş kişi isimleri, sahte adresler, sahte telefon numaraları
- Kaynağı olmayan hiçbir bilgi
- Eksik alanları tahmin etme veya doldurma
- Google Search veya başka kaynak kullanma — sadece aşağıdaki Tavily içeriği

Şirket: "${company}"

--- TAVILY ARAMA SONUÇLARI (TEK VERİ KAYNAĞI) ---
${tavilyContextText}
--- SON ---

Aşağıdaki bölümleri Türkçe olarak, tam olarak bu markdown başlıklarıyla yaz:

# Şirket Özeti
Sadece kaynaklarda bulunan bilgileri özetle: sektör, ana ürün/hizmetler, web sitesi, lokasyonlar, üretim tesisleri.
Bulunamayan her alan için: "Bilgi bulunamadı"
Her bilgi satırının sonuna kaynak referansı ekle: [Kaynak: domain]

# Finansal Veriler
Kaynaklarda bulunan finansal bilgileri özetle: ciro, çalışan sayısı, ülkeler, yatırım, üretim tesisleri, ihracat.
Hiçbir finansal veri yoksa yalnızca şunu yaz: "Finansal bilgi bulunamadı"
Tahmin yapma. Her bulunan veri için [Kaynak: domain] ekle.

# E-posta Keşfi
Yalnızca kaynak metinlerinde açıkça geçen (yazılı olarak bulunan) e-posta adreslerini listele.
Format: e-posta | Kaynak: URL veya domain
E-posta bulunamazsa yalnızca şunu yaz: "Doğrulanmış e-posta bulunamadı"
E-posta formatı tahmin etme.

# Karar Vericiler
Yalnızca kaynaklarda ismi ve ünvanı açıkça geçen, doğrulanabilir kişileri listele.
Her kişi için: İsim | Ünvan | Kaynak: URL/domain | LinkedIn (varsa) | Şirket web sitesi (varsa)
Bulunamazsa yalnızca şunu yaz: "Karar verici bilgisi bulunamadı"

# Fırsat Analizi
Yalnızca kaynaklarda bulunan somut verileri yorumla (ör: Lean yatırımı, ISO sertifikası, sürdürülebilirlik raporu, yeni fabrika, otomasyon yatırımı, OpEx ekibi, kalite direktörü).
Bu verilerden satış fırsatı çıkar. Her fırsat için dayandığı kaynağı belirt: [Kaynak: domain]
Yeterli veri yoksa yalnızca şunu yaz: "Yeterli veri bulunamadığı için fırsat analizi oluşturulamadı."`;
}

const GEMINI_MODEL = "gemini-3.5-flash";

function extractGeminiErrorInfo(err) {
  const message = err?.message || String(err);
  const stack = err?.stack || null;

  let httpStatus = err?.status ?? err?.statusCode ?? null;
  let errorBody = err?.body ?? err?.errorDetails ?? null;

  if (err?.response) {
    httpStatus = httpStatus ?? err.response?.status ?? err.response?.statusCode ?? null;
    errorBody = errorBody ?? err.response?.data ?? err.response?.body ?? err.response;
  }

  if (err?.cause && typeof err.cause === "object") {
    httpStatus = httpStatus ?? err.cause?.status ?? err.cause?.statusCode ?? null;
    errorBody = errorBody ?? err.cause?.body ?? err.cause?.errorDetails ?? err.cause;
  }

  if (errorBody != null && typeof errorBody !== "string") {
    try {
      errorBody = JSON.stringify(errorBody);
    } catch {
      errorBody = String(errorBody);
    }
  }

  return { message, stack, httpStatus, errorBody };
}

function logGeminiCallFailure(err) {
  const { message, stack, httpStatus, errorBody } = extractGeminiErrorInfo(err);

  console.error("[analyze-company] Gemini model:", GEMINI_MODEL);
  console.error("[analyze-company] Gemini HTTP status:", httpStatus ?? "unknown");
  console.error("[analyze-company] Gemini error message:", message);
  if (errorBody) {
    console.error("[analyze-company] Gemini error body:", errorBody);
  }
  console.error("[analyze-company] Gemini stack trace:", stack ?? "no stack trace");

  return { message, httpStatus, errorBody };
}

/**
 * Run Tavily search + Gemini analysis.
 * Returns { status, body } where body is always JSON-serializable.
 */
export async function runCompanyAnalysis({ companyInput, tavilyApiKey }) {
  if (!companyInput || !String(companyInput).trim()) {
    return {
      status: 400,
      body: { success: false, error: "Company name is required" },
    };
  }

  const resolvedTavilyKey = String(tavilyApiKey || process.env.TAVILY_API_KEY || "").trim();
  if (!resolvedTavilyKey) {
    return {
      status: 400,
      body: {
        success: false,
        code: "TAVILY_API_KEY_MISSING",
        error: "Tavily API key missing",
      },
    };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return {
      status: 500,
      body: {
        success: false,
        error: "Gemini API key is not configured on the server",
      },
    };
  }

  const company = String(companyInput).trim();
  let research;

  try {
    console.log(`Tavily company research started for: ${company}`);
    research = await fetchCompanyResearch(resolvedTavilyKey, company);
  } catch (tavilyErr) {
    console.error("Tavily research failed:", tavilyErr);
    return {
      status: 502,
      body: {
        success: false,
        code: "TAVILY_SEARCH_FAILED",
        error: "Tavily search failed",
      },
    };
  }

  const tavilyContextText = formatTavilyContext(company, research.results);
  const userPromptText = buildGeminiPrompt(company, tavilyContextText);

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const aiRes = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: userPromptText,
    });

    const resultText = aiRes.text;
    if (!resultText) {
      return {
        status: 500,
        body: {
          success: false,
          code: "GEMINI_ANALYSIS_FAILED",
          error: "Gemini analysis failed",
          sources: research.sources,
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        rawOutput: resultText,
        sources: research.sources,
      },
    };
  } catch (geminiErr) {
    const { message, httpStatus, errorBody } = logGeminiCallFailure(geminiErr);
    const errStr = message;
    const isQuota =
      errStr.includes("429") ||
      errStr.toLowerCase().includes("quota") ||
      errStr.includes("RESOURCE_EXHAUSTED") ||
      httpStatus === 429;

    return {
      status: isQuota ? 429 : 500,
      body: {
        success: false,
        code: "GEMINI_ANALYSIS_FAILED",
        isQuotaExhausted: isQuota,
        error: message,
        sources: research.sources,
      },
    };
  }
}
