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
      model: "gemini-3.5-flash",
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
    console.error("Gemini analysis failed:", geminiErr);
    const errStr = String(geminiErr?.message || geminiErr);
    const isQuota =
      errStr.includes("429") ||
      errStr.toLowerCase().includes("quota") ||
      errStr.includes("RESOURCE_EXHAUSTED");

    return {
      status: isQuota ? 429 : 500,
      body: {
        success: false,
        code: "GEMINI_ANALYSIS_FAILED",
        isQuotaExhausted: isQuota,
        error: isQuota
          ? "Gemini API quota exceeded"
          : "Gemini analysis failed",
        sources: research.sources,
      },
    };
  }
}
