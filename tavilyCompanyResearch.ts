export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
  domain: string;
  query: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  domain: string;
  publishedDate?: string;
}

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

export function buildSearchQueries(companyName: string): string[] {
  const trimmed = companyName.trim();
  return SEARCH_KEYWORDS.map((keyword) =>
    keyword ? `${trimmed} ${keyword}` : trimmed
  );
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function runTavilySearch(
  apiKey: string,
  query: string,
  maxResults = 3
): Promise<TavilySearchResult[]> {
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
    throw new Error(
      `Tavily API hatası (${resp.status}): ${errText || resp.statusText}`
    );
  }

  const data: {
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      published_date?: string;
    }>;
  } = await resp.json();

  if (!data.results?.length) return [];

  return data.results
    .filter((r) => r.url && r.content)
    .map((r) => ({
      title: r.title || r.url || "Kaynak",
      url: r.url!,
      content: r.content!,
      publishedDate: r.published_date || undefined,
      domain: extractDomain(r.url!),
      query,
    }));
}

export async function fetchCompanyResearch(
  apiKey: string,
  companyName: string
): Promise<{ results: TavilySearchResult[]; sources: ResearchSource[] }> {
  const queries = buildSearchQueries(companyName);
  const batchSize = 4;
  const allResults: TavilySearchResult[] = [];
  const seenUrls = new Set<string>();

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((q) =>
        runTavilySearch(apiKey, q).catch((err) => {
          console.warn(`Tavily search failed for "${q}":`, err.message);
          return [] as TavilySearchResult[];
        })
      )
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

  const sources: ResearchSource[] = allResults.map((r) => ({
    title: r.title,
    url: r.url,
    domain: r.domain,
    publishedDate: r.publishedDate,
  }));

  return { results: allResults, sources };
}

export function formatTavilyContext(
  companyName: string,
  results: TavilySearchResult[]
): string {
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
