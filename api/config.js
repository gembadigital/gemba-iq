export default function handler(_request, response) {
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const hasAzureCredentials = Boolean(
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET &&
    process.env.AZURE_TENANT_ID
  );
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const hasTavilyKey = Boolean(process.env.TAVILY_API_KEY);
  response.status(200).json({
    hasClientKeys: hasAzureCredentials,
    clientId: process.env.AZURE_CLIENT_ID || "",
    tenantId: process.env.AZURE_TENANT_ID || "",
    redirectUri: "",
    appUrl,
    hasGeminiKey,
    hasTavilyKey,
  });
}
