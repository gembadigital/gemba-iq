function callbackHtml(payload) {
  return `
    <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; color: #0f172a; margin: 0; }
          .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 480px; text-align: center; }
          h1 { color: #10b981; font-size: 1.5rem; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Connected Successfully</h1>
          <p>Syncing your organization mailbox credentials...</p>
          <script>
            const payload = ${JSON.stringify(payload)};
            if (window.opener) {
              window.opener.postMessage(payload, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </div>
      </body>
    </html>
  `;
}

function errorHtml(message) {
  return `
    <html>
      <body style="font-family: sans-serif; padding: 2rem;">
        <h2>Authentication Error</h2>
        <p>${message}</p>
        <button onclick="window.close()">Close Window</button>
      </body>
    </html>
  `;
}

export default async function handler(request, response) {
  const { code, error, error_description } = request.query || {};
  if (error) {
    return response.status(400).send(errorHtml(error_description || error));
  }
  if (!code) {
    return response.status(400).send(errorHtml("Authorization code is missing."));
  }

  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const redirectUri = `${appUrl}/auth/callback`;

  try {
    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
        code: String(code),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokens.error_description || JSON.stringify(tokens));
    }

    const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = userResponse.ok
      ? await userResponse.json()
      : { displayName: "Microsoft 365 User", mail: "", userPrincipalName: "" };

    return response.status(200).send(callbackHtml({
      type: "OAUTH_AUTH_SUCCESS",
      tokens,
      user,
    }));
  } catch (err) {
    return response.status(500).send(errorHtml(err.message || "Token exchange failed."));
  }
}
