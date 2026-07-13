const SEARCH_KEYWORDS = [
  "",
  "opex",
  "lean manufacturing",
  "kaizen",
  "operational excellence",
  "continuous improvement",
  "factory",
  "production",
  "sustainability",
  "annual report",
  "investor",
  "financial statements",
  "ESG",
  "email",
  "contact",
  "linkedin",
  "management",
  "careers",
  "automation",
  "digital transformation",
  "quality",
  "ISO",
  "TPM",
  "Six Sigma",
];

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function buildSearchQueries(companyName) {
  const trimmed = companyName.trim();
  return SEARCH_KEYWORDS.map((keyword) =>
    keyword ? `${trimmed} ${keyword}` : trimmed
  );
}

async function runTavilySearch(apiKey, query, maxResults = 3, propagateError = false) {
  const resp = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      include_answer: false,
      max_results: maxResults,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    const err = new Error(
      `Tavily API hatası (${resp.status}): ${errText || resp.statusText}`
    );
    if (propagateError) throw err;
    console.warn(`Tavily search failed for "${query}":`, err.message);
    return [];
  }

  const data = await resp.json();
  if (!data.results?.length) return [];

  return data.results
    .filter((r) => r.url && r.content)
    .map((r) => ({
      title: r.title || r.url || "Kaynak",
      url: r.url,
      content: r.content,
      publishedDate: r.published_date || undefined,
      domain: extractDomain(r.url),
      query,
    }));
}

export async function fetchCompanyResearch(apiKey, companyName) {
  const queries = buildSearchQueries(companyName);
  const batchSize = 4;
  const allResults = [];
  const seenUrls = new Set();

  // Primary company search must succeed for Tavily connectivity validation.
  const primaryResults = await runTavilySearch(apiKey, companyName.trim(), 5, true);
  for (const item of primaryResults) {
    const normalized = item.url.toLowerCase().split("#")[0];
    if (seenUrls.has(normalized)) continue;
    seenUrls.add(normalized);
    allResults.push(item);
  }

  const enrichmentQueries = queries.slice(1);
  for (let i = 0; i < enrichmentQueries.length; i += batchSize) {
    const batch = enrichmentQueries.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((q) => runTavilySearch(apiKey, q))
    );

    for (const results of batchResults) {
      for (const item of results) {
        const normalized = item.url.toLowerCase().split("#")[0];
        if (seenUrls.has(normalized)) continue;
        seenUrls.add(normalized);
        allResults.push(item);
      }
    }
  }

  const sources = allResults.map((r) => ({
    title: r.title,
    url: r.url,
    domain: r.domain,
    publishedDate: r.publishedDate,
  }));

  return { results: allResults, sources };
}

export function formatTavilyContext(companyName, results) {
  if (!results.length) {
    return `Tavily araması "${companyName}" için sonuç döndürmedi. Yalnızca aşağıdaki boş bağlamı kullanın; hiçbir bilgi uydurmayın.`;
  }

  return results
    .map(
      (r, idx) =>
        `[Kaynak ${idx + 1}]
URL: ${r.url}
Domain: ${r.domain}
Başlık: ${r.title}
Tarih: ${r.publishedDate || "Bilgi bulunamadı"}
Sorgu: ${r.query}
İçerik:
${r.content}`
    )
    .join("\n\n---\n\n");
}
