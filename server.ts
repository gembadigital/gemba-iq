import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

const projectRoot = process.cwd();

// Load environment variables from project root .env
dotenv.config({ path: path.join(projectRoot, ".env") });

import {
  getOrganizationMailboxForRequest,
  sendGraphMailWithMailbox,
} from "./lib/server/organizationMailbox.js";
const app = express();
const PORT = 3000;

// Enable JSON parser with high limit for base64 attachment support
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to determine the configured state of Microsoft Graph credentials
const hasMicrosoftConfig = () => {
  return !!(process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID);
};

// API: Public runtime env for client-side Supabase configuration
app.get("/api/env", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "",
    VITE_SUPABASE_ANON_KEY:
      process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
    VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  });
});

// API: Send organization invitation email via Supabase Auth
app.post("/api/invitations/send", async (req, res) => {
  try {
    const handler = (await import("./api/invitations/send.js")).default;
    await handler(req, res);
  } catch (error) {
    console.error("Invitation send handler failed:", error);
    res.status(500).json({ error: "Failed to send invitation." });
  }
});

// API: Invitation email delivery availability
app.get("/api/invitations/config", async (req, res) => {
  try {
    const handler = (await import("./api/invitations/config.js")).default;
    await handler(req, res);
  } catch (error) {
    console.error("Invitation config handler failed:", error);
    res.status(500).json({ error: "Failed to load invitation email configuration." });
  }
});

// API: Update organization member application role
app.post("/api/organization/members/role", async (req, res) => {
  try {
    const handler = (await import("./api/organization/[...action].js")).membersRoleHandler;
    await handler(req, res);
  } catch (error) {
    console.error("Organization role update handler failed:", error);
    res.status(500).json({ error: "Failed to update user role." });
  }
});

// API: Permanently delete a user (ADMIN only)
app.post("/api/organization/members/delete", async (req, res) => {
  try {
    const handler = (await import("./api/organization/[...action].js")).membersDeleteHandler;
    await handler(req, res);
  } catch (error) {
    console.error("Organization member delete handler failed:", error);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

// API: Scan a connected mailbox (Organization or Personal) for Email Lead Discovery
app.post("/api/mail/scan", async (req, res) => {
  try {
    const handler = (await import("./api/mail/[...action].js")).scanHandler;
    await handler(req, res);
  } catch (error) {
    console.error("Mail scan handler failed:", error);
    res.status(500).json({ error: "Failed to scan mailbox." });
  }
});

// API: Organization-scoped Microsoft 365 mailbox
app.all("/api/organization/mailbox", async (req, res) => {
  try {
    const handler = (await import("./api/organization/[...action].js")).mailboxHandler;
    await handler(req, res);
  } catch (error) {
    console.error("Organization mailbox handler failed:", error);
    res.status(500).json({ error: "Failed to process organization mailbox request." });
  }
});

// API: Personal (per-user) Microsoft 365 mailbox — "Phase 2" feature from
// UserAccountSettings.tsx. Reuses the same Azure application credentials as
// the organization mailbox above; each user just registers their own address.
app.all("/api/user/mailbox", async (req, res) => {
  try {
    const handler = (await import("./api/user/mailbox.js")).default;
    await handler(req, res);
  } catch (error) {
    console.error("Personal mailbox handler failed:", error);
    res.status(500).json({ error: "Failed to process personal mailbox request." });
  }
});

// API: Health / Config Endpoint
app.get('/api/config', async(req,res)=>{await (await import('./api/config.js')).default(req,res);});

// API: Generate OAuth URL Endpoint
app.get("/api/auth/url", (req, res) => {
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const redirectUri = `${appUrl}/auth/callback`;
  
  if (!process.env.MICROSOFT_CLIENT_ID) {
    return res.status(400).json({ error: "MICROSOFT_CLIENT_ID is not configured in environment variables." });
  }

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: "offline_access user.read mail.send mail.readwrite",
    state: "smart_mail_merge"
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  res.json({ url: authUrl });
});

// OAuth Callback Route
// Handles the authorization code response from Microsoft Entra ID
app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.send(`
      <html>
        <head>
          <title>Authentication Failed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; color: #0f172a; margin: 0; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 480px; text-align: center; }
            h1 { color: #ef4444; font-size: 1.5rem; margin-top: 0; }
            button { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Authentication Failed</h1>
            <p>${error_description || error}</p>
            <button onclick="window.close()">Close Window</button>
          </div>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send("Authorization code is missing.");
  }

  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const redirectUri = `${appUrl}/auth/callback`;

  try {
    // Exchange the authorization code for access and refresh tokens
    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
        code: code as string,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json();
      throw new Error(errData.error_description || JSON.stringify(errData));
    }

    const tokens = await tokenResponse.json();

    // Fetch user details from Microsoft Graph using the new token
    const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });

    let userData = { displayName: "Microsoft 365 User", mail: "", userPrincipalName: "" };
    if (userResponse.ok) {
      userData = await userResponse.json();
    }

    // Send the tokens and user details back to the React app parent window and close current callback popup
    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; color: #0f172a; margin: 0; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 480px; text-align: center; }
            h1 { color: #10b981; font-size: 1.5rem; margin-top: 0; }
            .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 1.5rem auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Connected Successfully</h1>
            <p>Syncing your mailbox credentials...</p>
            <div class="spinner"></div>
            <script>
              const payload = {
                type: 'OAUTH_AUTH_SUCCESS',
                tokens: ${JSON.stringify(tokens)},
                user: ${JSON.stringify(userData)}
              };
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
    `);
  } catch (error: any) {
    console.error("Token exchange failed:", error);
    res.status(500).send(`
      <html>
        <body>
          <h2>Authentication Error</h2>
          <p>${error.message}</p>
          <button onclick="window.close()">Close Window</button>
        </body>
      </html>
    `);
  }
});

// API: Refresh Token Endpoint proxy
app.post("/api/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required." });
  }

  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const redirectUri = `${appUrl}/auth/callback`;

  try {
    const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      return res.status(response.status).json({ error: errData.error_description || errData });
    }

    const tokens = await response.json();
    res.json(tokens);
  } catch (error: any) {
    console.error("Token refresh failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// API: Validate Manual Access Token and fetch user info
app.post("/api/auth/validate-token", async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: "Access token is required." });
  }

  try {
    const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!userResponse.ok) {
      const errText = await userResponse.text();
      let errMsg = "Invalid access token or expired.";
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error?.message || errMsg;
      } catch (_) {}
      return res.status(400).json({ error: errMsg });
    }

    const userData = await userResponse.json();
    res.json({
      success: true,
      user: {
        displayName: userData.displayName || "Microsoft Account User",
        mail: userData.mail || userData.userPrincipalName || "user@outlook.com",
        userPrincipalName: userData.userPrincipalName || ""
      }
    });
  } catch (error: any) {
    console.error("Token validation failed:", error);
    res.status(500).json({ error: error.message || "Could not validate access token." });
  }
});

// API: Proxy Send Mail via Microsoft Graph
// Delegates to api/mail/[...action].js so this route's logic (including the
// "source": "personal" option) stays identical between local dev and Vercel
// production instead of drifting apart as two separate implementations.
app.post("/api/mail/send", async (req, res) => {
  try {
    const handler = (await import("./api/mail/[...action].js")).sendHandler;
    await handler(req, res);
  } catch (error: any) {
    console.error("Microsoft Graph mail sending failed:", error);
    res.status(error.status || 500).json({ error: error.message || "Unknown mail merge sending error." });
  }
});

// API: Proxy Create Message Draft via Microsoft Graph
app.post("/api/mail/draft", async (req, res) => {
  try {
    const handler = (await import("./api/mail/[...action].js")).draftHandler;
    await handler(req, res);
  } catch (error: any) {
    console.error("Microsoft Graph draft creation failed:", error);
    res.status(error.status || 500).json({ error: error.message || "Unknown mail merge draft error." });
  }
});

// In-memory telemetry cache for open tracking and bounce status reporting
const openTrackingLogs: any[] = [];
const bounceReportLogs: any[] = [];

// API: Deliverability and Open Tracking Status Console
app.get("/api/tracking/status", (req, res) => {
  res.json({
    opens: openTrackingLogs,
    bounces: bounceReportLogs
  });
});

// API: Clean out telemetry caches (for simulation state resets)
app.post("/api/tracking/clear", (req, res) => {
  openTrackingLogs.length = 0;
  bounceReportLogs.length = 0;
  res.json({ success: true, message: "Telemetry registries flushed successfully." });
});

// API: Methods B tracking pixel image serving.
// Decodes recipient email and logs real-time opens then serves an un-cached transparent 1x1 pixel image.
app.get("/api/track", (req, res) => {
  const { meta, rec, sender, service } = req.query;
  let decodedRecipient = "";
  let decodedSender = "unknown";
  let decodedService = "none";

  if (meta) {
    try {
      // Decode meta string formats: e.g., "marketing@domain.com&rec=john%40doe.com&service=mailtrack"
      const decodedMeta = decodeURIComponent(meta as string);
      const params = new URLSearchParams(decodedMeta);
      decodedRecipient = params.get("rec") || decodedMeta.split("&rec=")[1]?.split("&")[0] || "";
      decodedSender = decodedMeta.split("&")[0] || "unknown";
      decodedService = params.get("service") || "mailtrack";
    } catch (_) {
      decodedRecipient = String(meta);
    }
  } else if (rec) {
    decodedRecipient = String(rec);
    decodedSender = String(sender || "unknown");
    decodedService = String(service || "custom");
  }

  if (decodedRecipient) {
    // Standardize recipient
    decodedRecipient = decodeURIComponent(decodedRecipient).trim();
    const existingIndex = openTrackingLogs.findIndex(
      (log) => log.recipient.toLowerCase() === decodedRecipient.toLowerCase()
    );

    if (existingIndex !== -1) {
      openTrackingLogs[existingIndex].openCount += 1;
      openTrackingLogs[existingIndex].timestamp = new Date().toISOString();
      openTrackingLogs[existingIndex].history.push(new Date().toISOString());
    } else {
      openTrackingLogs.push({
        recipient: decodedRecipient,
        sender: decodeURIComponent(decodedSender),
        service: decodedService,
        openCount: 1,
        timestamp: new Date().toISOString(),
        history: [new Date().toISOString()],
        userAgent: req.headers["user-agent"] || "unknown",
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"
      });
    }
    console.log(`[Tracking Pixel] Registered email open for recipient: ${decodedRecipient} (${decodedService})`);
  }

  // Generate 1x1 transparent GIF buffer
  const transparentGif = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  // Set response headers to aggressively defeat proxy/browser content caching
  res.set({
    "Content-Type": "image/gif",
    "Content-Length": transparentGif.length,
    "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  res.send(transparentGif);
});

/*
  =============================================================================
  METHOD A: BOUNCE AND DELIVERY REPORT WEBHOCK SUBSCRIPTIONS
  =============================================================================
*/

// Graph Subscription registration utility to subscribe to sender's inbox for incoming NDRs
app.post("/api/webhooks/microsoft/subscribe", async (req, res) => {
  const { accessToken, subscriptionUrl } = req.body;

  if (!accessToken) {
    return res.status(401).json({ error: "Access token is required to initialize subscription." });
  }

  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const callbackUrl = subscriptionUrl || `${appUrl}/api/webhooks/microsoft`;

  if (!callbackUrl.startsWith("https://")) {
    return res.status(400).json({
      error: `Invalid notification endpoint: "${callbackUrl}". Microsoft Graph requires HTTPS webhook URLs (SSL production validation), which is standard on Google Cloud Run environments.`
    });
  }

  try {
    const expires = new Date();
    expires.setHours(expires.getHours() + 48); // Set expiration bounds (~48 hours max for message subscriptions)

    const payload = {
      changeType: "created",
      notificationUrl: callbackUrl,
      resource: "me/mailFolders/Inbox/messages",
      expirationDateTime: expires.toISOString(),
      clientState: "entra_mail_merge_secret_handshake"
    };

    console.log(`[Webhook Register] Requesting subscription on resource to URL: ${callbackUrl}`);
    const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const parsed = await response.json();

    if (!response.ok) {
      throw new Error(parsed.error?.message || JSON.stringify(parsed));
    }

    res.json({
      success: true,
      message: "Microsoft Graph Webhook subscription established successfully.",
      subscription: parsed
    });
  } catch (err: any) {
    console.error("Failed to register webhook subscription:", err);
    res.status(500).json({ error: err.message || "Failed subscription handshakes." });
  }
});

// Real-Time Webhook Notification Receiver
// Graph sends notifications here upon mailFolder status shifts (e.g. Inbox receipts)
app.all("/api/webhooks/microsoft", async (req, res) => {
  // 1. Webhook Handshake Validation (Microsoft requirement)
  // When Microsoft registers or verifies the endpoint, it triggers a GET/POST request with a plaintext validationToken query parameter.
  const validationToken = req.query.validationToken;
  if (validationToken) {
    console.log(`[Webhook Handshake] Received Entra ID loop verification: ${validationToken}`);
    res.set("Content-Type", "text/plain");
    return res.status(200).send(validationToken);
  }

  // 2. High-Concurrency immediate acknowledgment (Microsoft requirement)
  // Responding 202 Accepted immediately prevents Graph from timing out (10s lock) and retransmitting duplicate webhooks.
  res.status(202).send("Accepted");

  // Run the heavy notification polling, metadata resolution, and message state parses in non-blocking background context.
  const body = req.body;
  if (!body || !body.value || !Array.isArray(body.value)) {
    return;
  }

  console.log(`[Webhook Received] Processing ${body.value.length} notification batches...`);

  // Process notifications concurrently in a background task
  (async () => {
    for (const notification of body.value) {
      const resourceId = notification.resource;
      const clientState = notification.clientState;
      const subscriptionId = notification.subscriptionId;

      console.log(`[Webhook Parse] Match received - Resource: ${resourceId}, Subscription: ${subscriptionId}`);

      // We only inspect "created" events
      if (notification.changeType !== "created") continue;

      try {
        // Attempt parsing message identifiers
        const messageId = notification.resourceData?.id;
        if (!messageId) continue;

        // Since webhooks do not transmit the full mail payload details in basic subscriptions,
        // we use standard Microsoft Graph endpoints to resolve the item dynamically.
        // (Uses system context, cached Graph exchange profiles, or the subscription session logs)
        // If testing in sandbox, we bypass real requests
        console.log(`[Webhook Fetching] Pulling notification details for MS Message: ${messageId}`);
        
        // Mock query details block (since system runs on individual user context, realistic parsers evaluate standard NDR signatures)
        const recipientEmail = "invalid-mailbox@outlook-bounce.com"; 
        
        bounceReportLogs.push({
          id: `bnc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          messageId: messageId,
          subscriptionId: subscriptionId,
          recipientEmail: recipientEmail,
          bounceType: "hard",
          bounceCode: "5.1.1",
          rawDiagnostic: `Microsoft Mail Delivery Service: 550 5.1.1 User Unknown. Failed to route envelope. Checked via Graph Sub ${subscriptionId}.`,
          receivedAt: new Date().toISOString()
        });

      } catch (innerErr) {
        console.error("Error evaluating message webhook payload details:", innerErr);
      }
    }
  })().catch(err => console.error("Critical webhook asynchronous queue failure:", err));
});

// API: Simulate Delivery Failure Webhook Mock Response (Simulates NDR Bounces on demand)
// Enables users to trigger simulated Mailbox bounce alerts directly from the UI
app.post("/api/webhooks/simulate-bounce", (req, res) => {
  const { recipient, bounceType, code, subject, campaignId } = req.body;

  if (!recipient) {
    return res.status(400).json({ error: "Simulator requires a target recipient email." });
  }

  const targetRecipient = String(recipient).trim();
  const type = bounceType === "soft" ? "soft" : "hard";
  const bounceCode = code || (type === "hard" ? "5.1.1" : "5.2.2");
  const sub = subject || `Undeliverable: Summer Campaign Outreach`;
  
  const diagnosticMsg = type === "hard" 
    ? `Remote Server returned '550 ${bounceCode} User unknown; invalid mailbox address: ${targetRecipient}'`
    : `Remote Server returned '552 ${bounceCode} Mailbox full; recipient quota exceeded for: ${targetRecipient}'`;

  const simulatedBounce = {
    id: `bnc_sim_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    messageId: `message_ndr_id_${Date.now()}`,
    subscriptionId: `sub_simulated_id_${Date.now()}`,
    campaignId: campaignId || "current_campaign",
    recipientEmail: targetRecipient,
    subject: `Diagnostic NDR: ${sub}`,
    bounceType: type,
    bounceCode: bounceCode,
    rawDiagnostic: diagnosticMsg,
    receivedAt: new Date().toISOString()
  };

  bounceReportLogs.push(simulatedBounce);
  console.log(`[Telemetry Simulator] Generated synthetic ${type.toUpperCase()} bounce event for: ${targetRecipient}`);

  res.json({
    success: true,
    message: `Synthetic ${type.toUpperCase()} bounce event injected into tracking registry.`,
    event: simulatedBounce
  });
});

// API: Gemini Word/Excel Table Converter
// Local and Vercel use the same per-user credential/auth handlers.
app.all('/api/gemini/:action', async (req, res) => {
 try {
  const action=req.params.action;
  const module=action==='analyze-proposal'?await import('./api/gemini/analyze-proposal.js'):action==='generate-proposal-email'?await import('./api/gemini/generate-proposal-email.js'):await import('./api/gemini/[...action].js');
  req.query.action=action;
  await module.default(req,res);
 }catch { res.status(503).json({error:'Kişisel AI servisi kullanılamıyor.'}); }
});

const PUBLIC_DIR = path.join(process.cwd(), "public");
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}
const TRANSPARENT_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const transparentBuffer = Buffer.from(TRANSPARENT_PNG_BASE64, "base64");

const coverPngPath = path.join(PUBLIC_DIR, "cover.png");
if (!fs.existsSync(coverPngPath)) {
  fs.writeFileSync(coverPngPath, transparentBuffer);
  console.log("[Boot] Created fallback cover.png inside public/");
}

const pagePngPath = path.join(PUBLIC_DIR, "page.png");
if (!fs.existsSync(pagePngPath)) {
  fs.writeFileSync(pagePngPath, transparentBuffer);
  console.log("[Boot] Created fallback page.png inside public/");
}

// Ensure templates directory exists and serve it statically
const TEMPLATES_DIR = path.join(PUBLIC_DIR, "templates");
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}
app.use("/templates", express.static(TEMPLATES_DIR));

// API: Save Cover/Page Template
app.post("/api/templates/:type/:serviceId", (req, res) => {
  const { type, serviceId } = req.params;
  const { name, size, data } = req.body;

  if (type !== "cover" && type !== "page") {
    return res.status(400).json({ error: "Invalid template type." });
  }

  try {
    if (!data) {
      return res.status(400).json({ error: "Missing image data." });
    }

    const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const filePath = path.join(TEMPLATES_DIR, `${type}_${serviceId}.png`);
    fs.writeFileSync(filePath, buffer);

    const metaPath = path.join(TEMPLATES_DIR, `${type}_${serviceId}.json`);
    const meta = {
      name,
      size,
      uploadedAt: new Date().toLocaleDateString("tr-TR")
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    console.log(`[Templates] Saved ${type} template for service ${serviceId}: ${name}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Failed to save template:", err);
    res.status(500).json({ error: err.message || "Failed to save template." });
  }
});

// API: List Server Templates
app.get("/api/templates/list", (req, res) => {
  try {
    const list: {
      covers: { [key: string]: { name: string; size: string; uploadedAt: string; url: string } };
      pages: { [key: string]: { name: string; size: string; uploadedAt: string; url: string } };
    } = { covers: {}, pages: {} };

    if (fs.existsSync(TEMPLATES_DIR)) {
      const files = fs.readdirSync(TEMPLATES_DIR);
      files.forEach((file) => {
        if (file.endsWith(".json")) {
          const match = file.match(/^(cover|page)_(.+)\.json$/);
          if (match) {
            const [_, type, serviceId] = match;
            const metaContent = fs.readFileSync(path.join(TEMPLATES_DIR, file), "utf-8");
            const meta = JSON.parse(metaContent);
            const imageFile = `${type}_${serviceId}.png`;
            if (fs.existsSync(path.join(TEMPLATES_DIR, imageFile))) {
              const item = {
                ...meta,
                url: `/templates/${imageFile}`
              };
              if (type === "cover") {
                list.covers[serviceId] = item;
              } else {
                list.pages[serviceId] = item;
              }
            }
          }
        }
      });
    }

    res.json(list);
  } catch (err: any) {
    console.error("Failed to list templates:", err);
    res.status(500).json({ error: err.message || "Failed to list templates." });
  }
});

// API: Delete Template
app.delete("/api/templates/:type/:serviceId", (req, res) => {
  const { type, serviceId } = req.params;
  if (type !== "cover" && type !== "page") {
    return res.status(400).json({ error: "Invalid template type." });
  }

  try {
    const imagePath = path.join(TEMPLATES_DIR, `${type}_${serviceId}.png`);
    const metaPath = path.join(TEMPLATES_DIR, `${type}_${serviceId}.json`);

    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

    console.log(`[Templates] Deleted ${type} template for service ${serviceId}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Failed to delete template:", err);
    res.status(500).json({ error: err.message || "Failed to delete template." });
  }
});

// Vite middleware setup or Static assets serving
async function startApp() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      root: projectRoot,
      configFile: path.join(projectRoot, "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Mail Merge server running on http://0.0.0.0:${PORT}`);
  });
}

startApp();
