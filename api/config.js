export default function handler(_request, response) {
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  response.status(200).json({
    hasClientKeys: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    redirectUri: `${appUrl}/auth/callback`,
    appUrl,
  });
}
