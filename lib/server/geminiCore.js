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
    const aiRes = await generateWithRetry({
      model: "gemini-3.5-flash",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

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
