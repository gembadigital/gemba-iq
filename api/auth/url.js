export default function handler(_request, response) {
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const redirectUri = `${appUrl}/auth/callback`;

  if (!process.env.MICROSOFT_CLIENT_ID) {
    return response.status(400).json({ error: "MICROSOFT_CLIENT_ID is not configured in environment variables." });
  }

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: "offline_access user.read mail.send mail.readwrite",
    state: "organization_mailbox",
  });

  return response.status(200).json({
    url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`,
  });
}
