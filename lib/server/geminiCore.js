import { GoogleGenAI } from "@google/genai";

// Shared Gemini client + helpers for both server.ts (local dev, Express) and
// the Vercel serverless functions under api/gemini/*.js. Keeping this logic
// in one place avoids the two entry points drifting apart — which is exactly
// what happened before: /api/gemini/assist and /api/gemini/company-search
// only existed inline in server.ts, so they worked locally but 404'd on
// Vercel (no matching file under api/), and CompanyDiscoveryView.tsx's
// `.json()` call on that HTML 404 page threw "Unexpected token 'T', \"The
// page c\"...".

let cachedClient = null;

export function getGeminiClient() {
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return cachedClient;
}

// Retries a Gemini generateContent call when it fails with a transient
// "high demand" / UNAVAILABLE (503) error, using short exponential backoff.
// Any other kind of error is re-thrown immediately (no point retrying those).
export async function generateWithRetry(params, maxRetries = 3, baseDelayMs = 1200) {
  const ai = getGeminiClient();
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      lastError = err;
      const errText = String(err?.message || err || "");
      const isTransient = /UNAVAILABLE|high demand|503|overloaded/i.test(errText);
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`Gemini call hit a transient error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// AI Strategy Assistant — email draft writer/polisher, shared by the
// campaign email composer's "write" / "polish" actions.
export async function runGeminiAssist({ action, bodyText, promptInstruction, prompt }) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      status: 400,
      body: { error: "GEMINI_API_KEY is not configured in environment variables. Please supply it under Settings > Secrets." },
    };
  }

  try {
    let systemInstruction = "You are an expert AI Email Copywriter and Strategy Assistant. You generate professional, engaging, highly targeted marketing or corporate communication emails. Always return email content as clean text, using standard HTML styling elements where appropriate (such as <p>, <br>, <strong>, <em>, <ul>, <li>, etc.) since this will be loaded into an HTML email visualizer. Make sure to embed placeholders matching the mail-merge system, e.g., {{FirstName}}, {{LastName}}, {{Company}}, {{Department}} where relevant. Ensure the response conforms exactly to JSON format.";

    let userPromptText = "";
    let isPlainPrompt = false;

    if (prompt) {
      userPromptText = prompt;
      systemInstruction = "You are an expert B2B Industrial Researcher. Generate raw, valid, minified JSON data matching the requested structure without any markdown container wrapping (no ```json).";
      isPlainPrompt = true;
    } else if (action === "write") {
      userPromptText = `Write an email draft from scratch.
Focus instructions/topic: "${promptInstruction || 'professional introductory reachout'}"

Embed standard placeholders like {{FirstName}}, {{LastName}}, {{Company}}, and/or {{Department}} naturally so it forms a fully ready merge template. Structure your entire response as a JSON object with strictly two keys: "subject" and "body". Return ONLY the raw parseable JSON string - do NOT wrap in markdown templates like \`\`\`json.`;
    } else if (action === "polish") {
      userPromptText = `Optimize, polish, and professionalize the following existing email text template.
Current Body: "${bodyText || ''}"
Focus directions/changes needed: "${promptInstruction || 'enhance reply rate and corporate clarity'}"

Preserve the existing placeholders like {{FirstName}}, {{LastName}}, {{Company}}, or {{Department}}. Structure your entire response as a JSON object with strictly two keys: "subject" and "body". Return ONLY the raw parseable JSON string - do NOT wrap in markdown.`;
    } else {
      return { status: 400, body: { error: "Invalid assistance action requested." } };
    }

    const aiRes = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: userPromptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const resultText = aiRes.text;
    if (!resultText) {
      throw new Error("Empty text response received from AI model.");
    }

    if (isPlainPrompt) {
      return { status: 200, body: { success: true, response: resultText } };
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (_) {
      const cleanJsonStr = resultText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJsonStr);
    }

    return {
      status: 200,
      body: {
        success: true,
        subject: parsedResult.subject || "",
        body: parsedResult.body || "",
      },
    };
  } catch (error) {
    console.error("Gemini Assistant error:", error);
    return { status: 500, body: { error: error.message || "Could not complete text generation with Gemini." } };
  }
}

// Company Search — grounded in real Google Search results (no hallucinated
// companies). Used by CompanyDiscoveryView.tsx's "Gemba Search" box.
export async function runGeminiCompanySearch({ query }) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      status: 400,
      body: { error: "GEMINI_API_KEY is not configured in environment variables. Please supply it under Settings > Secrets." },
    };
  }

  if (!query || !String(query).trim()) {
    return { status: 400, body: { error: "Search query is required." } };
  }

  try {
    const searchPrompt = `Using Google Search, find real, currently operating Turkish industrial companies / factories that match this search: "${String(query).trim()}".

Only include companies you can verify actually exist from the search results — do NOT invent, guess, or hallucinate any company, website, or address. If you cannot find enough real matches, return fewer results (even an empty array) rather than making any up.

For each real company found (maximum 8), return an object with exactly these fields (leave a field as an empty string "" if you are not confident about it from the search results — never guess):
{
  "id": "unique-string",
  "name": "Company legal/trade name as found in search results",
  "website": "domain from the actual search result (no https://)",
  "title": "Short descriptive title for the result",
  "snippet": "2-3 sentence Turkish description of what the company manufactures/does, grounded in the real search results",
  "address": "Address or OSB/industrial zone name if found in search results, else empty",
  "city": "City if found, else empty",
  "region": "Geographic region (Marmara, Ege, İç Anadolu, Karadeniz, Akdeniz, Doğu/Güneydoğu Anadolu) if determinable, else empty",
  "zone": "OSB (organize sanayi bölgesi) name if applicable, else empty",
  "industry": "Automotive" | "Machinery" | "Textile" | "Metallurgy" | "Plastic" | "Food" | "Electronics" | "Other",
  "size": "Employee size range if stated in search results, else empty",
  "description": "Manufacturing/facility description grounded in search results",
  "notes": ""
}

Return ONLY a raw valid JSON array, no markdown fencing, no commentary before or after it.`;

    // Gemini occasionally returns a transient 503 "model is currently experiencing
    // high demand" error. Retry a few times with backoff before giving up, since a
    // real search-grounded call is inherently slower than the old hallucinated one
    // and users shouldn't see a failure for a passing overload blip.
    // Item 12: 503/"high demand" oldu bittiler için tekrar deneme sayısı ve
    // gecikmesi arttırıldı (arama+grounding çağrısı diğer Gemini çağrılarından
    // daha ağır ve daha sık yoğunluğa denk geliyor).
    const aiRes = await generateWithRetry(
      {
        model: "gemini-3.5-flash",
        contents: searchPrompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      },
      5,
      1500
    );

    const resultText = aiRes.text;
    if (!resultText) {
      throw new Error("Empty text response received from AI model.");
    }

    const groundingChunks = aiRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk) => chunk.web)
      .filter((web) => web && web.uri)
      .map((web) => ({ title: web.title || web.uri, uri: web.uri }));

    return {
      status: 200,
      body: {
        success: true,
        response: resultText,
        grounded: true,
        sources,
      },
    };
  } catch (error) {
    console.error("Gemini Company Search error:", error);
    return { status: 500, body: { error: error.message || "Could not complete company search with Gemini." } };
  }
}

// Gemba Lens — Saha AI Danışmanı. A grounded coaching chat used inside the
// Gemba Lens field-assessment module: it only reasons over the actual
// field-data/scoring numbers passed in `context` (never invents factory
// figures), and answers in the same style as the source "Gemba Partner Saha
// Tespit" tool's assistant persona.
export async function runGembaLensChat({ message, history, context }) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      status: 400,
      body: { error: "GEMINI_API_KEY is not configured in environment variables. Please supply it under Settings > Secrets." },
    };
  }

  if (!message || !String(message).trim()) {
    return { status: 400, body: { error: "Message is required." } };
  }

  try {
    const systemInstruction = `Sen Gemba Digital'in Yapay Zeka Baş Danışmanısın. Saha tespiti yapan operasyonel mükemmellik (Lean/OpEx) danışmanlarına, aşağıda verilen GERÇEK saha verilerine ve olgunluk puanlama sonuçlarına dayanarak kısa, somut, sahaya dönük tavsiyelerde bulunursun.

KRİTİK KURAL: Yalnızca aşağıda verilen saha verilerini yorumla. Şirket hakkında yeni bilgi, rakam veya olay uydurma; verilmeyen bir şey sorulursa bunu bilmediğini belirt.

--- SAHA VERİLERİ VE PUANLAMA ---
${context || "(Henüz saha verisi girilmedi.)"}

Yanıtların Türkçe, 2-5 cümle uzunluğunda, doğrudan uygulanabilir ve saha diliyle olsun.`;

    const contents = [
      ...(Array.isArray(history) ? history : []).slice(-10).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content || "") }],
      })),
      { role: "user", parts: [{ text: String(message) }] },
    ];

    const aiRes = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents,
      config: { systemInstruction },
    });

    const resultText = aiRes.text;
    if (!resultText) {
      throw new Error("Empty text response received from AI model.");
    }

    return { status: 200, body: { success: true, reply: resultText } };
  } catch (error) {
    console.error("Gemba Lens chat error:", error);
    return { status: 500, body: { error: error.message || "Saha AI Danışmanı şu anda yanıt veremiyor." } };
  }
}

// Item: "Denetim Hatası: Unknown gemini endpoint" — /api/gemini/sales-coach,
// /api/gemini/campaign-assist, /api/gemini/generate-custom-pitch ve
// /api/gemini/convert-table hiçbir zaman [...action].js router'ında
// (veya ayrı bir dosya olarak) tanımlanmamıştı; bu dört uç nokta çağıran her
// ekranda (Ciro Yönetimi AI Denetimi, Satış Koçu chat/haftalık denetim,
// Yapay Zeka Satış Asistanı özel e-posta üretici, Teklif Sihirbazı/Teklif
// Yönetimi AI tablo dönüştürücü) her zaman 404 "Unknown gemini endpoint."
// almış oluyordu. Aşağıdaki 4 fonksiyon bu boşluğu dolduruyor.

// AI Sales Director / Coach — used by RevenueManagementView.tsx's
// "AI-Assisted Assessment" trigger and SalesCoachAI.tsx's weekly audit +
// chat box. Both callers send { deals, query?, activeSkills? } and expect
// { success: true, coachResponse: string }.
export async function runGeminiSalesCoach({ deals, query, activeSkills }) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      status: 400,
      body: { error: "GEMINI_API_KEY is not configured in environment variables. Please supply it under Settings > Secrets." },
    };
  }

  try {
    const systemInstruction = `Sen Gemba Partner'da kıdemli bir B2B Satış Direktörü ve Performans Koçusun. Sana verilen GERÇEK fırsat/pipeline verilerine ve (varsa) aktif satış yetkinlik modüllerine (skills) dayanarak somut, veri odaklı, doğrudan uygulanabilir tavsiyelerde bulunursun. Var olmayan rakam veya olay uydurma; yalnızca verilen veriye dayan. Aksi belirtilmedikçe Türkçe yanıt ver.`;

    const sections = [];
    if (query && String(query).trim()) {
      sections.push(String(query).trim());
    } else {
      sections.push(
        "Aşağıdaki pipeline verilerine dayanarak haftalık bir satış denetimi (audit) yap: zayıf noktaları, riskli/durağan fırsatları ve önceliklendirilmiş bir aksiyon planını Türkçe olarak özetle."
      );
    }
    if (Array.isArray(deals) && deals.length > 0) {
      sections.push(`\nMevcut Fırsat/Pipeline Verileri (JSON):\n${JSON.stringify(deals).slice(0, 12000)}`);
    }
    if (Array.isArray(activeSkills) && activeSkills.length > 0) {
      sections.push(`\nAktif Satış Yetkinlik Modülleri (Skills):\n${JSON.stringify(activeSkills).slice(0, 4000)}`);
    }

    const aiRes = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: sections.join("\n"),
      config: { systemInstruction },
    });

    const resultText = aiRes.text;
    if (!resultText) {
      throw new Error("Empty text response received from AI model.");
    }

    return { status: 200, body: { success: true, coachResponse: resultText } };
  } catch (error) {
    console.error("Gemini Sales Coach error:", error);
    return { status: 500, body: { success: false, error: error.message || "Could not complete sales coaching request with Gemini." } };
  }
}

// LinkedIn / Email campaign copy assistant — used by AISalesAssistant.tsx's
// "write"/"polish" actions for LinkedIn posts and campaign emails. Distinct
// from runGeminiAssist's {subject, body} shape: this one returns
// { postText, suggestedTags } to match what the caller reads.
export async function runGeminiCampaignAssist({ action, bodyText, promptInstruction, targetChannel, tags }) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      status: 400,
      body: { error: "GEMINI_API_KEY is not configured in environment variables. Please supply it under Settings > Secrets." },
    };
  }

  if (action !== "write" && action !== "polish") {
    return { status: 400, body: { error: "Invalid campaign assist action requested." } };
  }

  try {
    const systemInstruction = `You are an expert B2B social/email campaign copywriter for an industrial operational-excellence (Lean/OpEx) consultancy. Write in Turkish unless the source content is clearly in another language. Always respond with ONLY a raw parseable JSON object with exactly two keys: "postText" (the full post/email copy) and "suggestedTags" (an array of 3-6 short lowercase hashtag words, no # symbol). No markdown fencing.`;

    let userPromptText;
    if (action === "write") {
      userPromptText = `Write a brand-new ${targetChannel || "social media"} post from scratch.\nTopic/focus: "${promptInstruction || "operasyonel mükemmellik ve yalın dönüşüm"}"\nExisting tags to consider (optional, may extend): ${Array.isArray(tags) ? tags.join(", ") : ""}`;
    } else {
      userPromptText = `Polish and professionalize the following existing ${targetChannel || "social media"} content.\nCurrent content: "${bodyText || ""}"\nRequested changes/direction: "${promptInstruction || "enhance clarity and professionalism"}"\nExisting tags to consider (optional, may extend): ${Array.isArray(tags) ? tags.join(", ") : ""}`;
    }

    const aiRes = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: userPromptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const resultText = aiRes.text;
    if (!resultText) {
      throw new Error("Empty text response received from AI model.");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (_) {
      const cleanJsonStr = resultText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJsonStr);
    }

    return {
      status: 200,
      body: {
        postText: parsedResult.postText || "",
        suggestedTags: Array.isArray(parsedResult.suggestedTags) ? parsedResult.suggestedTags : [],
      },
    };
  } catch (error) {
    console.error("Gemini Campaign Assist error:", error);
    return { status: 500, body: { error: error.message || "Could not complete campaign copy generation with Gemini." } };
  }
}

// Custom cold/warm sales-pitch email generator — used by AISalesAssistant.tsx
// ("Yapay Zeka Satış Asistanı" > company research > "Özel E-posta Üret").
// Grounded in the real Tavily/Gemini research context already gathered for
// that company, so it doesn't invent facts about the prospect.
export async function runGeminiCustomPitch({ companyName, mailType, topic, tone, extraContext, researchContext }) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      status: 400,
      body: { error: "GEMINI_API_KEY is not configured in environment variables. Please supply it under Settings > Secrets." },
    };
  }

  try {
    const systemInstruction = `Sen Gemba Partner adlı bir operasyonel mükemmellik (Lean/OpEx) danışmanlık firması için kıdemli bir B2B satış metni yazarısın. Yalnızca sana verilen GERÇEK şirket araştırma verisine dayanarak yaz; şirket hakkında uydurma bilgi/rakam ekleme. Türkçe, profesyonel, kişiselleştirilmiş bir satış e-postası üret. Yanıtını "Konu: ..." satırıyla başlat, ardından boş satır ve e-posta gövdesiyle devam et. Markdown kod bloğu kullanma.`;

    const userPromptText = `Hedef Şirket: ${companyName || "Bilinmiyor"}
E-posta Türü: ${mailType === "warm" ? "Sıcak temas (daha önce iletişim kurulmuş)" : "Soğuk temas (ilk temas)"}
Odak Konu: ${topic || "Operasyonel Mükemmellik"}
Ton: ${tone || "Profesyonel & Danışmanlık Yaklaşımı"}
Ek Bağlam/İstekler: ${extraContext || "Yok"}

Şirket Araştırma Bağlamı (gerçek, önceden toplanmış veri):
${(researchContext || "(Araştırma verisi bulunamadı, genel ama profesyonel bir yaklaşım kullan.)").toString().slice(0, 8000)}`;

    const aiRes = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: userPromptText,
      config: { systemInstruction },
    });

    const resultText = aiRes.text;
    if (!resultText) {
      throw new Error("Empty text response received from AI model.");
    }

    return { status: 200, body: { success: true, text: resultText } };
  } catch (error) {
    console.error("Gemini Custom Pitch error:", error);
    return { status: 500, body: { success: false, error: error.message || "Could not generate custom pitch with Gemini." } };
  }
}

// Pasted Word/Excel table → clean structured HTML table converter — used by
// ServicesView.tsx's proposal wizard/service card editors and
// ProposalFormModal.tsx's methodology/plan/timeline/terms fields, whenever a
// paste isn't cleanly recognized as an HTML <table> by the local
// cleanWordHTML() heuristic (e.g. plain tab/newline-separated text pasted
// from Excel, or malformed nested tables).
export async function runGeminiConvertTable({ pastedContent }) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      status: 400,
      body: { error: "GEMINI_API_KEY is not configured in environment variables. Please supply it under Settings > Secrets." },
    };
  }

  if (!pastedContent || !String(pastedContent).trim()) {
    return { status: 400, body: { error: "Dönüştürülecek içerik boş." } };
  }

  try {
    const systemInstruction = `You convert messy pasted content (from Word/Excel, or malformed HTML) into a single, clean, well-structured HTML <table> element. Use inline styles only (border-collapse: collapse on the table, 1px solid #e2e8f0 borders on cells, padding 6px, font-size 11px, bold + light gray background #f1f5f9 for header rows). Preserve every row/column of real data — never drop or invent data. Respond with ONLY a raw parseable JSON object with exactly one key "htmlTable" containing the table's HTML as a string. No markdown fencing, no commentary.`;

    const aiRes = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: String(pastedContent).slice(0, 20000),
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const resultText = aiRes.text;
    if (!resultText) {
      throw new Error("Empty text response received from AI model.");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (_) {
      const cleanJsonStr = resultText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJsonStr);
    }

    if (!parsedResult.htmlTable) {
      throw new Error("Yapay zekadan geçerli bir tablo alınamadı.");
    }

    return { status: 200, body: { htmlTable: parsedResult.htmlTable } };
  } catch (error) {
    console.error("Gemini Convert Table error:", error);
    return { status: 500, body: { error: error.message || "Could not complete table conversion with Gemini." } };
  }
}
