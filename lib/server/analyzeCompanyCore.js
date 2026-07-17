import { GoogleGenAI } from "@google/genai";
import {
  fetchCompanyResearch,
  formatTavilyContext,
} from "./tavilyCompanyResearch.js";
import {
  buildTavilyFindings,
  buildRawOutputFromParsed,
  GEMINI_UNAVAILABLE_MESSAGE,
} from "./tavilyFindingsBuilder.js";

// "gemini-2.5-flash" was retired for new API keys (Google now returns a 404
// NOT_FOUND for it — see runtime error logs from 2026-07-14 onward). All
// retry attempts now use "gemini-3.5-flash", matching the model already
// working in lib/server/geminiCore.js (assist/company-search).
const GEMINI_RETRY_PLAN = [
  { attempt: 1, model: "gemini-3.5-flash", waitAfter503Ms: 3000 },
  { attempt: 2, model: "gemini-3.5-flash", waitAfter503Ms: 5000 },
  { attempt: 3, model: "gemini-3.5-flash", waitAfter503Ms: 0 },
];

const TAVILY_KEY_MESSAGE =
  "Tavily API anahtarı bulunamadı. Lütfen Sistem Ayarları > API Anahtarları bölümünden Tavily API Key giriniz.";
const TAVILY_FAIL_MESSAGE = "İnternet araştırması gerçekleştirilemedi.";

function buildGeminiOpportunityPrompt(company, tavilyContextText) {
  return `Sen bir B2B Satış İstihbaratı analisti ve Operasyonel Mükemmellik (OpEx) danışmanısın.

KRİTİK KURAL: Yalnızca aşağıda sunulan Tavily arama sonuçlarını yorumlayacaksın. Yeni bilgi üretme, tahmin etme veya uydurma.

Şirket: "${company}"

--- TAVILY ARAMA SONUÇLARI ---
${tavilyContextText}
--- SON ---

Yalnızca aşağıdaki tek bölümü Türkçe olarak yaz:

# Fırsat Analizi
Kaynaklarda bulunan somut verileri yorumla (Lean yatırımı, ISO, sürdürülebilirlik, fabrika, otomasyon, OpEx, kalite vb.).
Her fırsat için kaynak belirt: [Kaynak: URL veya domain]
Yeterli veri yoksa yalnızca şunu yaz: "Yeterli veri bulunamadığı için fırsat analizi oluşturulamadı."`;
}

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

function logGeminiCallFailure(err, model) {
  const { message, stack, httpStatus, errorBody } = extractGeminiErrorInfo(err);

  console.error("[analyze-company] Gemini model:", model);
  console.error("[analyze-company] Gemini HTTP status:", httpStatus ?? "unknown");
  console.error("[analyze-company] Gemini error message:", message);
  if (errorBody) {
    console.error("[analyze-company] Gemini error body:", errorBody);
  }
  console.error("[analyze-company] Gemini stack trace:", stack ?? "no stack trace");

  return { message, httpStatus, errorBody };
}

function isRetryableGeminiOverload(err) {
  const { message, httpStatus, errorBody } = extractGeminiErrorInfo(err);
  const combined = `${message} ${errorBody || ""}`.toUpperCase();
  return (
    httpStatus === 503 ||
    combined.includes("UNAVAILABLE") ||
    combined.includes("HIGH DEMAND") ||
    combined.includes("RESOURCE_EXHAUSTED")
  );
}

function parseOpportunityFromGemini(text) {
  if (!text) return "";
  const match = text.match(/#\s*Fırsat Analizi\s*([\s\S]*)/i);
  if (match) return match[1].trim();
  return text.trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runGeminiOpportunityAnalysis(geminiApiKey, company, tavilyContextText) {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  const prompt = buildGeminiOpportunityPrompt(company, tavilyContextText);
  let lastError = null;

  for (let i = 0; i < GEMINI_RETRY_PLAN.length; i++) {
    const { attempt, model, waitAfter503Ms } = GEMINI_RETRY_PLAN[i];
    console.log("[analyze-company] Gemini retry attempt:", attempt, "model:", model);

    try {
      const aiRes = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = aiRes.text?.trim();
      if (!text) {
        throw new Error("Gemini returned an empty opportunity analysis");
      }
      console.log("[analyze-company] Gemini final status: success, model:", model);
      return { status: "success", text: parseOpportunityFromGemini(text), model };
    } catch (err) {
      lastError = err;
      logGeminiCallFailure(err, model);
      const canRetry =
        isRetryableGeminiOverload(err) && i < GEMINI_RETRY_PLAN.length - 1;
      if (!canRetry) break;
      if (waitAfter503Ms > 0) {
        console.log(
          "[analyze-company] Gemini retry waiting:",
          waitAfter503Ms,
          "ms before next attempt"
        );
        await sleep(waitAfter503Ms);
      }
    }
  }

  console.log("[analyze-company] Gemini final status: failed after retries");
  return { status: "failed", error: lastError };
}

/**
 * Run Tavily search (mandatory) + optional Gemini opportunity analysis.
 */
export async function runCompanyAnalysis({ companyInput, tavilyApiKey }) {
  if (!companyInput || !String(companyInput).trim()) {
    return {
      status: 400,
      body: { success: false, error: "Şirket adı gereklidir." },
    };
  }

  const resolvedTavilyKey = String(tavilyApiKey || process.env.TAVILY_API_KEY || "").trim();
  if (!resolvedTavilyKey) {
    return {
      status: 400,
      body: {
        success: false,
        code: "TAVILY_API_KEY_MISSING",
        error: TAVILY_KEY_MESSAGE,
      },
    };
  }

  const company = String(companyInput).trim();
  let research;

  try {
    console.log("[analyze-company] Tavily request:", {
      company,
      apiKeyProvided: true,
    });
    research = await fetchCompanyResearch(resolvedTavilyKey, company);
    console.log("[analyze-company] Tavily response:", {
      resultCount: research.results.length,
      sourceCount: research.sources.length,
    });
  } catch (tavilyErr) {
    console.error("[analyze-company] Tavily request failed:", tavilyErr?.message || tavilyErr);
    return {
      status: 502,
      body: {
        success: false,
        code: "TAVILY_SEARCH_FAILED",
        error: TAVILY_FAIL_MESSAGE,
      },
    };
  }

  const parsed = buildTavilyFindings(company, research.results);
  const tavilyContextText = formatTavilyContext(company, research.results);
  const geminiApiKey = process.env.GEMINI_API_KEY;
  let geminiStatus = "skipped";

  if (geminiApiKey) {
    const geminiResult = await runGeminiOpportunityAnalysis(
      geminiApiKey,
      company,
      tavilyContextText
    );

    if (geminiResult.status === "success") {
      parsed.opportunityAnalysis = geminiResult.text;
      geminiStatus = "success";
    } else {
      parsed.opportunityAnalysis = GEMINI_UNAVAILABLE_MESSAGE;
      geminiStatus = "failed";
    }
  } else {
    parsed.opportunityAnalysis = GEMINI_UNAVAILABLE_MESSAGE;
    geminiStatus = "skipped";
  }

  const rawOutput = buildRawOutputFromParsed(parsed);

  return {
    status: 200,
    body: {
      success: true,
      sources: research.sources,
      parsed,
      rawOutput,
      geminiStatus,
      partialGemini: geminiStatus !== "success",
    },
  };
}
