const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const LINKEDIN_REGEX = /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|company)\/[^\s)\]"'<>]+/gi;

const FINANCIAL_QUERY_HINTS = [
  "annual report",
  "investor",
  "financial",
  "esg",
  "revenue",
  "ciro",
];
const FINANCIAL_CONTENT_HINTS = [
  /revenue/i,
  /ciro/i,
  /turnover/i,
  /employee/i,
  /çalışan/i,
  /investor/i,
  /yatırımcı/i,
  /annual report/i,
  /yıllık rapor/i,
  /financial statement/i,
  /finansal/i,
  /export/i,
  /ihracat/i,
];
const NEWS_QUERY_HINTS = ["news", "haber", "press", "sustainability", "factory", "production"];
const CONTACT_QUERY_HINTS = ["email", "contact", "careers", "linkedin", "management"];

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractEmailsFromText(text) {
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches.map((e) => e.toLowerCase()))];
}

function extractLinkedInFromText(text) {
  const matches = text.match(LINKEDIN_REGEX) || [];
  return [...new Set(matches)];
}

function isFinancialResult(result) {
  const q = (result.query || "").toLowerCase();
  const blob = `${result.title || ""} ${result.url || ""} ${result.content || ""}`;
  if (FINANCIAL_QUERY_HINTS.some((hint) => q.includes(hint))) return true;
  return FINANCIAL_CONTENT_HINTS.some((rx) => rx.test(blob));
}

function isNewsResult(result) {
  const q = (result.query || "").toLowerCase();
  const url = (result.url || "").toLowerCase();
  return (
    NEWS_QUERY_HINTS.some((hint) => q.includes(hint)) ||
    /news|haber|press/.test(url)
  );
}

function isContactResult(result) {
  const q = (result.query || "").toLowerCase();
  return CONTACT_QUERY_HINTS.some((hint) => q.includes(hint));
}

function guessWebsite(companyName, results) {
  const normalized = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (companyName.includes(".")) {
    const candidate = companyName.startsWith("http")
      ? companyName
      : `https://${companyName}`;
    return candidate;
  }

  for (const result of results) {
    const domain = (result.domain || "").toLowerCase();
    if (!domain) continue;
    if (
      domain.includes(normalized) &&
      !domain.includes("linkedin") &&
      !domain.includes("wikipedia") &&
      !domain.includes("bloomberg") &&
      !domain.includes("reuters")
    ) {
      return result.url;
    }
  }

  for (const result of results) {
    const domain = (result.domain || "").toLowerCase();
    if (
      domain &&
      !domain.includes("linkedin") &&
      !domain.includes("facebook") &&
      !domain.includes("twitter") &&
      !domain.includes("youtube") &&
      !domain.includes("wikipedia")
    ) {
      return result.url;
    }
  }

  return null;
}

function formatSnippetLines(results, limit = 8) {
  if (!results.length) return [];
  return results.slice(0, limit).map((r) => {
    const snippet = (r.content || "").replace(/\s+/g, " ").trim().slice(0, 280);
    return `• ${snippet}\n  [Kaynak: ${r.url}]`;
  });
}

function buildDecisionMakerLines(results) {
  const lines = [];

  for (const result of results) {
    const linkedinUrls = extractLinkedInFromText(`${result.content || ""} ${result.url || ""}`);
    for (const url of linkedinUrls) {
      lines.push(`• LinkedIn: ${url}\n  [Kaynak: ${result.url}]`);
    }

    const contentLines = (result.content || "").split("\n");
    for (const line of contentLines) {
      const trimmed = line.trim();
      if (trimmed.length < 8 || trimmed.length > 160) continue;
      if (
        /(ceo|cto|cfo|coo|director|müdür|genel müdür|president|chairman|vp |vice president|head of)/i.test(
          trimmed
        )
      ) {
        lines.push(`• ${trimmed}\n  [Kaynak: ${result.url}]`);
      }
    }
  }

  return uniqueBy(lines, (line) => line.toLowerCase()).slice(0, 12);
}

export function buildTavilyFindings(companyName, results) {
  const website = guessWebsite(companyName, results);
  const newsResults = results.filter(isNewsResult);
  const financialResults = results.filter(isFinancialResult);
  const contactResults = results.filter(isContactResult);
  const managementResults = results.filter(
    (r) =>
      (r.query || "").toLowerCase().includes("management") ||
      (r.query || "").toLowerCase().includes("linkedin") ||
      (r.query || "").toLowerCase().includes("careers")
  );

  const summaryParts = [];
  summaryParts.push(`Şirket: ${companyName}`);
  if (website) {
    summaryParts.push(`Web sitesi: ${website}`);
  } else {
    summaryParts.push("Web sitesi: Doğrulanabilir bilgi bulunamadı.");
  }

  const generalSnippets = formatSnippetLines(
    results.filter((r) => !isNewsResult(r)).slice(0, 6)
  );
  if (generalSnippets.length) {
    summaryParts.push("\nGenel Bulgular:");
    summaryParts.push(...generalSnippets);
  } else {
    summaryParts.push("\nDoğrulanabilir bilgi bulunamadı.");
  }

  if (newsResults.length) {
    summaryParts.push("\nHaberler / Güncel Kaynaklar:");
    summaryParts.push(...formatSnippetLines(newsResults, 5));
  }

  const emailHits = [];
  for (const result of contactResults.length ? contactResults : results) {
    for (const email of extractEmailsFromText(result.content || "")) {
      emailHits.push({ email, url: result.url });
    }
  }
  const uniqueEmails = uniqueBy(emailHits, (item) => item.email);

  let emailDiscovery = "";
  if (uniqueEmails.length) {
    emailDiscovery = uniqueEmails
      .map((item) => `• ${item.email}\n  [Kaynak: ${item.url}]`)
      .join("\n");
  } else {
    emailDiscovery = "E-posta adresi tespit edilemedi.";
  }

  let financialData = "";
  if (financialResults.length) {
    const financialLines = formatSnippetLines(financialResults, 10);
    financialData = financialLines.join("\n");
  } else {
    financialData = "Finansal veri bulunamadı.";
  }

  const dmLines = buildDecisionMakerLines(
    managementResults.length ? managementResults : results
  );
  const decisionMakers = dmLines.length
    ? dmLines.join("\n")
    : "Karar verici bilgisi bulunamadı.";

  const parsed = {
    companySummary: summaryParts.join("\n"),
    financialData,
    emailDiscovery,
    decisionMakers,
    opportunityAnalysis: "",
  };

  return parsed;
}

export function buildRawOutputFromParsed(parsed) {
  return `# Şirket Özeti
${parsed.companySummary}

# Finansal Veriler
${parsed.financialData}

# E-posta Keşfi
${parsed.emailDiscovery}

# Karar Vericiler
${parsed.decisionMakers}

# Fırsat Analizi
${parsed.opportunityAnalysis || ""}`;
}

export const GEMINI_UNAVAILABLE_MESSAGE =
  "Gemini sunucularında geçici yoğunluk tespit edildi.\nİnternet araştırma sonuçları aşağıda gösterilmektedir.\nAI yorumu şu anda oluşturulamadı.";
