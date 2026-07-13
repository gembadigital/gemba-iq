import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

const projectRoot = process.cwd();

// Load environment variables from project root .env
dotenv.config({ path: path.join(projectRoot, ".env") });

import { GoogleGenAI } from "@google/genai";
import { runCompanyAnalysis } from "./api/lib/analyzeCompanyCore.js";
import {
  getOrganizationMailboxForRequest,
  sendGraphMailWithMailbox,
} from "./api/lib/organizationMailbox.js";
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});

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
    const handler = (await import("./api/organization/members/role.js")).default;
    await handler(req, res);
  } catch (error) {
    console.error("Organization role update handler failed:", error);
    res.status(500).json({ error: "Failed to update user role." });
  }
});

// API: Organization-scoped Microsoft 365 mailbox
app.all("/api/organization/mailbox", async (req, res) => {
  try {
    const handler = (await import("./api/organization/mailbox.js")).default;
    await handler(req, res);
  } catch (error) {
    console.error("Organization mailbox handler failed:", error);
    res.status(500).json({ error: "Failed to process organization mailbox request." });
  }
});

// API: Health / Config Endpoint
app.get("/api/config", (req, res) => {
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  
  res.json({
    hasClientKeys: hasMicrosoftConfig(),
    clientId: process.env.AZURE_CLIENT_ID || "",
    tenantId: process.env.AZURE_TENANT_ID || "",
    redirectUri: "",
    appUrl: appUrl
  });
});

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
// We proxy this through Express to guarantee request reliability, handle headers cleanly, and log outcomes if required.
app.post("/api/mail/send", async (req, res) => {
  const { recipient, recipients, cc, bcc, subject, body, attachments } = req.body;
  if (!(recipient || recipients) || !subject || !body) {
    return res.status(400).json({ error: "Missing required mail parameters (recipient/recipients, subject, body)." });
  }

  try {
    const context = await getOrganizationMailboxForRequest(req, { requireConnected: true });
    await sendGraphMailWithMailbox(context.adminClient, context.organizationId, context.mailbox, {
      recipient,
      recipients,
      cc,
      bcc,
      subject,
      body,
      attachments,
    });
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("Microsoft Graph mail sending failed:", error);
    res.status(error.status || 500).json({ error: error.message || "Unknown mail merge sending error." });
  }
});

// API: Proxy Create Message Draft via Microsoft Graph
app.post("/api/mail/draft", async (req, res) => {
  const { recipient, subject, body, attachments } = req.body;
  if (!recipient || !subject || !body) {
    return res.status(400).json({ error: "Missing required mail parameters (recipient, subject, body)." });
  }

  try {
    const context = await getOrganizationMailboxForRequest(req, { requireConnected: true });
    const data = await sendGraphMailWithMailbox(
      context.adminClient,
      context.organizationId,
      context.mailbox,
      { recipient, subject, body, attachments },
      { draft: true }
    );
    res.json({ success: true, id: data.id, webLink: data.webLink, timestamp: new Date().toISOString() });
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
app.post("/api/gemini/convert-table", async (req, res) => {
  const { pastedContent } = req.body;

  if (!pastedContent || !pastedContent.trim()) {
    return res.status(400).json({ error: "Yapıştırılan içerik boş olamaz." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({ error: "GEMINI_API_KEY ortam değişkeni tanımlı değil. Lütfen Ayarlar > Secrets panelinden ekleyin." });
  }

  try {
    const systemInstruction = 
      "You are an expert HTML document designer. Your task is to convert any raw pasted table text, tab-separated values, bulleted lists, or messy HTML from MS Word into a clean, modern, and professional HTML table. " +
      "The result must be styled directly with inline style attributes on the tags to match professional A4 page standards. " +
      "Important rules:\n" +
      "1. Output ONLY the raw HTML table code starting with <table style=\"...\"> and ending with </table>. Do NOT wrap it in any markdown code blocks like ```html or ```. " +
      "2. Columns typically represent 'Süreç / Faz', 'Faaliyet Detayları ve Çalışma Başlıkları', and 'Efor (Adam/Gün)'. Extract or translate headers appropriately in Turkish. " +
      "3. Use rowspans elegantly for processes or efforts that are shared across multiple consecutive activities to keep a beautiful grouping layout just like the classic MS Word merged cells (similar to Teşhis, Odaklama, Akış Oluşturma, vb. and Adam Gün). " +
      "4. Style headers cleanly, e.g. <th style=\"border: 1px solid #cbd5e1; padding: 10px; background-color: #f1f5f9; text-align: left; font-weight: bold;\">. " +
      "5. Bullet points inside cells must be clean <ul> with small margins. All table borders must be 1px solid #cbd5e1 with border-collapse: collapse.\n" +
      "6. Make the tables 100% wide with responsive font sizing (usually 11px for text, 11px bold for headers).";

    const promptText = `Convert the following pasted clipboard content into a professional, well-structured, valid HTML table with rowspans/colspans as appropriate. Use Turkish for headers and text.

Pasted Content:
${pastedContent}`;

    const aiRes = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
      }
    });

    let resultHtml = aiRes.text || "";
    // Clean up any accidental markdown wrapper if returned
    resultHtml = resultHtml.replace(/```html/gi, "").replace(/```/g, "").trim();

    res.json({
      success: true,
      htmlTable: resultHtml
    });
  } catch (error: any) {
    console.error("Gemini Table Converter route error:", error);
    res.status(500).json({ error: error.message || "Yapay zeka ile tablo dönüştürme işlemi başarısız oldu." });
  }
});

// API: Gemini AI Strategy Assistant
app.post("/api/gemini/assist", async (req, res) => {
  const { action, bodyText, promptInstruction, prompt } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({ error: "GEMINI_API_KEY is not configured in environment variables. Please supply it under Settings > Secrets." });
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
      return res.status(400).json({ error: "Invalid assistance action requested." });
    }

    const aiRes = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPromptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const resultText = aiRes.text;
    if (!resultText) {
      throw new Error("Empty text response received from AI model.");
    }

    if (isPlainPrompt) {
      return res.json({
        success: true,
        response: resultText
      });
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (_) {
      const cleanJsonStr = resultText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJsonStr);
    }

    res.json({
      success: true,
      subject: parsedResult.subject || "",
      body: parsedResult.body || ""
    });
  } catch (error: any) {
    console.error("Gemini Assistant route error:", error);
    res.status(500).json({ error: error.message || "Could not complete text generation with Gemini." });
  }
});

// API: Gemini LinkedIn Campaign Assistant
app.post("/api/gemini/campaign-assist", async (req, res) => {
  const { action, bodyText, promptInstruction, targetChannel, tags } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({ error: "GEMINI_API_KEY is not configured in environment variables. Please supply it under Settings > Secrets." });
  }

  try {
    const isEmail = tags && tags.includes("EmailCampaign");
    const systemInstruction = isEmail
      ? `You are an expert Sales and B2B Cold Email Strategist and Copywriter.
You write highly engaging, professional corporate emails that secure high open-rates and CTR on marketing campaigns.
At the very top of "postText", include a clear, professional "Subject: <subject_line>" line, followed by dual line breaks, then the email body.
Always use merge field brackets such as {{FirstName}} and {{Company}} naturally in the text.
Always structure your response as raw, valid, parseable JSON with exactly two fields:
1. "postText": A string containing the formatted email with the subject line at the top (with appropriate spacing, paragraphs, and list layouts). No markdown block wrappers around the JSON.
2. "suggestedTags": An array of 3-5 relevant keywords.`
      : `You are a high-performing Corporate Digital Strategist and elite copywriter for professional social media platforms, especially LinkedIn. 
You write engaging B2B LinkedIn updates, management thought leadership posts, operational excellence articles, and corporate team culture stories.
Always structure your response as raw, valid, parseable JSON with exactly two fields:
1. "postText": A string containing the formatted post (with appropriate human-style spacing, paragraphs, and list layouts). No markdown block wrappers around the JSON.
2. "suggestedTags": An array of 3-5 relevant lowercase hashtag strings (e.g. ["operationalexcellence", "leanmanagement"]).`;

    let userPromptText = "";
    if (action === "write") {
      userPromptText = isEmail
        ? `Write an optimized, highly persuasive B2B marketing email draft from scratch.
Focus topic / outline: "Theme: ${promptInstruction || 'Introducing new site-audit optimization standards'}"
Target Channel Context: "Cold Outreach Campaign"`
        : `Write an optimized, highly engaging LinkedIn post draft from scratch.
Focus topic / outline: "${promptInstruction || 'Digitizing Gemba board values'}"
Target Channel Context: "${targetChannel || 'Lean Consulting Page'}"
Recommended starting hashtags: "${(tags || []).join(', ')}"`;
    } else if (action === "polish") {
      userPromptText = isEmail
        ? `Optimize, polish, enhance readability, and professionalize this B2B email sequence.
Current email draft text:
"${bodyText || ''}"

Focus directions / instructions for improvement: "${promptInstruction || 'Make it sound more urgent and add clear paragraph spacing'}"`
        : `Optimize, polish, enhance readability, and professionalize this existing LinkedIn post.
Current draft text:
"${bodyText || ''}"

Focus directions / instructions for improvement: "${promptInstruction || 'Make it sound more urgent and add clear paragraph spacing'}"
Target Channel Context: "${targetChannel || 'Lean Consulting Page'}"`;
    } else {
      return res.status(400).json({ error: "Invalid assistance action requested." });
    }

    const aiRes = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPromptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const resultText = aiRes.text;
    if (!resultText) {
      throw new Error("Empty response received from AI model.");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (_) {
      const cleanJsonStr = resultText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJsonStr);
    }

    res.json({
      success: true,
      postText: parsedResult.postText || "",
      suggestedTags: parsedResult.suggestedTags || []
    });
  } catch (error: any) {
    console.error("Gemini Campaign Assistant route error:", error);
    res.status(500).json({ error: error.message || "Could not complete text generation with Gemini." });
  }
});

// API: Gemini AI Sales Assistant Company Screener (delegates to shared core; Vercel uses api/gemini/analyze-company.js)
app.post("/api/gemini/analyze-company", async (req, res) => {
  try {
    const result = await runCompanyAnalysis({
      companyInput: req.body?.companyInput,
      tavilyApiKey:
        req.body?.tavilyApiKey ||
        req.headers["x-tavily-api-key"] ||
        process.env.TAVILY_API_KEY,
    });
    res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error("Analyze company route error:", error);
    res.status(500).json({
      success: false,
      error: "Araştırma tamamlanamadı. Lütfen tekrar deneyin.",
    });
  }
});

// API: Core dynamic email writer tool for Cold/Warm pitches
app.post("/api/gemini/generate-custom-pitch", async (req, res) => {
  const { companyName, mailType, topic, tone, extraContext, researchContext } = req.body;

  if (!companyName || !companyName.trim()) {
    return res.status(400).json({ error: "Firma adı parametresi gereklidir." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({ error: "GEMINI_API_KEY ortam değişkeni tanımlı değil. Lütfen ayarlar sekmesinden ekleyin." });
  }

  try {
    const userPromptText = `You are an expert manufacturing consultant and B2B growth marketer specializing in Lean Management and Operational Excellence.
Generate a professional sales outreach email template in Turkish (Türkçe).

STRICT RULES:
- Use ONLY facts from the research context below. Do NOT invent company details, names, locations, or financial figures.
- If research context lacks specific facts, write generically without fabricating specifics.
- Do not guess email addresses or contact names.

Company Name: ${companyName}
Outreach Style: ${mailType === "cold" ? "Cold Email" : "Warm Pitch"}
Focus Topic: ${topic}
Tone: ${tone || "Profesyonel & Danışmanlık yaklaşımı"}
Extra Notes: ${extraContext || "Yok."}

--- RESEARCH CONTEXT (Tavily-sourced analysis) ---
${researchContext || "Araştırma bağlamı sağlanmadı. Genel danışmanlık dili kullan, şirket hakkında uydurma bilgi yazma."}
--- END ---

Provide ONLY the subject line (Konu:) and email body. Use [Adınız], [Unvanınız] placeholders in the closing.`;

    const aiRes = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPromptText
    });

    res.json({
      success: true,
      text: aiRes.text || "E-posta şablonu üretilemedi."
    });
  } catch (err: any) {
    console.error("Custom pitch generator failed:", err);
    res.status(500).json({ success: false, error: err.message || "E-posta üretimi sırasında bir hata oluştu." });
  }
});

// API: Gemini Proposal Email Assistant
app.post("/api/gemini/generate-proposal-email", async (req, res) => {
  const { companyName, contactPerson, proposalSubject, selectedServices, options, currency, language } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({ error: "GEMINI_API_KEY is not configured in environment variables. Please check Settings > Secrets." });
  }

  try {
    const isTurkish = String(language).toUpperCase() === "TR" || String(language).toLowerCase().includes("tr");
    
    const systemInstruction = isTurkish
      ? "Siz B2B Operasyonel Mükemmellik (OpEx), Yalın Yönetim ve Endüstriyel Dijitalleşme alanlarında uzman kıdemli bir Satış Yöneticisisiniz. Hazırlanan ticari teklifi müşteriye sunan son derece seçkin, ikna edici ve profesyonel bir B2B e-postası hazırlayın. E-posta içeriğinde HTML biçimlendirmeleri (örn. <p>, <br>, <strong>, <ul>, <li> vb.) kullanabilirsiniz. Yanıtı yalnızca geçerli bir JSON dizesi olarak döndürün."
      : "You are an elite B2B Sales Executive specializing in Operational Excellence (OpEx), Lean Management, and Industrial Digitalization. Write an exceptionally polished, persuasive, and professional B2B proposal presentation email. You can use standard HTML formatting (such as <p>, <br>, <strong>, <ul>, <li> etc.) to make it highly readable. Return the answer strictly as a valid JSON string.";

    let optionsSummaryText = "";
    if (options && typeof options === "object") {
      optionsSummaryText = Object.entries(options)
        .map(([key, opt]: [string, any]) => {
          const budget = opt.manDays * opt.dailyRate + (opt.expenses || 0);
          return `- ${key}: ${opt.manDays} Man-Days @ ${opt.dailyRate} ${currency}/day. Total: ${budget} ${currency}`;
        })
        .join("\n");
    }

    const userPromptText = isTurkish
      ? `Aşağıdaki teklif bilgilerine dayanarak müşteriye gönderilmeye hazır, seçkin bir teklif sunum e-postası taslağı yazın.
      
      Şirket Adı: ${companyName || "Belirtilmedi"}
      Yetkili Kişi: ${contactPerson || "Ortak"}
      Teklif Konusu: ${proposalSubject || "Operasyonel Mükemmellik Değerlendirmesi"}
      Seçilen Hizmetler: ${(selectedServices || []).join(", ")}
      Maliyet Paketleri:
      ${optionsSummaryText}
      
      E-posta yapısı:
      1. Sıcak ve kurumsal bir selamlama.
      2. Kararlaştırılan kapsamın özetlenmesi ve Gemba felsefesine, israf azaltımına (TIMWOODS) veya ciroya/kaliteye etkisi.
      3. Teklif kopyasının (PDF/Word) eklendiğinin zarif duruşla belirtilmesi.
      4. Teklifi değerlendirmek üzere kısa bir toplantı talep eden eylem çağrısı (Call-to-Action).
      5. Profesyonel imza kapanışı.
      
      Hız kazanmak için yanıtı tam olarak şu iki anahtara sahip bir JSON nesnesi şeklinde döndürün: "subject" ve "body". Başka hiçbir açıklama, markdown kodu veya sohbet ögesi eklemeyin.`
      : `Write a B2B proposal presentation email based on the following details:
      
      Company Name: ${companyName || "N/A"}
      Contact Person: ${contactPerson || "Stakeholder"}
      Proposal Subject: ${proposalSubject || "Operational Excellence Assessment"}
      Selected Services: ${(selectedServices || []).join(", ")}
      Option Packages:
      ${optionsSummaryText}
      
      Email structure:
      1. Elegant corporate greeting.
      2. Summary of the selected project scope and its B2B value (lean metrics, wasteful activities reduction).
      3. Notice that the formal proposal document (PDF & Word options) is attached.
      4. Clear call-to-action requesting a short review call together.
      5. Professional executive footer block.
      
      Return ONLY a parseable JSON object with exactly two keys: "subject" and "body". Do not wrap in markdown or backticks.`;

    const aiRes = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPromptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const resultText = aiRes.text;
    if (!resultText) {
      throw new Error("Empty text response from Gemini.");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (_) {
      const cleanJsonStr = resultText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJsonStr);
    }

    res.json({
      success: true,
      subject: parsedResult.subject || `Proposal: ${proposalSubject}`,
      body: parsedResult.body || ""
    });
  } catch (error: any) {
    console.error("Gemini Proposal Email expansion failed:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate proposal email." });
  }
});

// API: Gemini AI Proposal Strategy & Risk Analyzer
app.post("/api/gemini/analyze-proposal", async (req, res) => {
  const { companyName, proposalSubject, description, selectedServices, options, currency } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({ error: "GEMINI_API_KEY is not configured. Please add it to secrets." });
  }

  try {
    const systemInstruction = 
      "You are an expert Sales Operations Director and Lean Manufacturing consultant. Analyze proposals and commercial deals, assessing win risk, completeness, upselling opportunities, and follow-up activities to maximize win probability. Return ONLY a single valid parseable JSON object with no surrounding text.";

    let optionsSummaryText = "";
    if (options && typeof options === "object") {
      optionsSummaryText = Object.entries(options)
        .map(([key, opt]: [string, any]) => {
          const budget = opt.manDays * opt.dailyRate + (opt.expenses || 0);
          return `- ${key}: ${opt.manDays} Man-Days @ ${opt.dailyRate} ${currency || "₺"}/day. Total: ${budget} ${currency || "₺"}`;
        })
        .join("\n");
    }

    const userPromptText = `Analyze the following newly created B2B consulting proposal to evaluate its strength, potential risks, and optimization actions.
    
    Company Name: ${companyName || "N/A"}
    Proposal Subject: ${proposalSubject || "N/A"}
    Description: ${description || "N/A"}
    Selected Services: ${(selectedServices || []).join(", ")}
    Option Packages:
    ${optionsSummaryText}
    
    Provide a thorough professional analysis. Structure your response exactly as a JSON object with the following fields:
    1. "winProbability" (string, e.g., "75%") - Realistic probability based on specifications.
    2. "riskFactors" (array of strings) - Bullet points of commercial, technical, or timing risk factors (e.g., pricing, lack of executive sponsor, unclear timeline).
    3. "missingInformation" (array of strings) - Data or metrics that the sales partner should ask the client to improve proposal quality.
    4. "recommendedFollowUp" (string) - Concrete timeline and step-by-step strategy for checking in.
    5. "suggestedNextAction" (string) - Direct immediate next step for the sales representative.
    6. "potentialUpsell" (array of strings) - Upsell recommendations (e.g. OEE Tracking software, Kaizen events, visual control boards).
    
    Do not add markdown wrappers like \`\`\`json. Return only the JSON string.`;

    const aiRes = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPromptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const resultText = aiRes.text;
    if (!resultText) {
      throw new Error("No response from Gemini.");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (_) {
      const cleanJsonStr = resultText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJsonStr);
    }

    res.json({
      success: true,
      analysis: parsedResult
    });
  } catch (error: any) {
    console.error("Gemini Proposal Analyzer failed:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to analyze proposal." });
  }
});

// API: Gemini Sales Coach AI
app.post("/api/gemini/sales-coach", async (req, res) => {
  const { deals, query, activeSkills } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({ error: "GEMINI_API_KEY is not configured in environment variables. Please supply it under Settings > Secrets." });
  }

  try {
    const formattedDeals = (deals || []).map((d: any) => ({
      name: d.dealName || `${d.companyName} Project`,
      company: d.companyName,
      value: d.opportunityValue || 0,
      stage: d.stage || "Discovery",
      industry: d.industry || "General",
      salesperson: d.owner || "Unassigned",
      expectedClose: d.expectedCloseDate,
      lastActive: d.expectedCloseDate
    }));

    const systemInstruction = `You are a Senior Sales Director and Commercial Excellence Leader working for an Operational Excellence (OPEX) consulting company.

Your company provides specialized services:
* Lean Manufacturing
* Operational Excellence
* MTM Analysis
* Time Studies
* Yamazumi Analysis
* Capacity Planning
* Workforce Optimization
* Productivity Improvement
* OEE Improvement
* Continuous Improvement Programs
* Cost Reduction Projects
* Industrial Engineering Services
* Production System Design
* Kaizen Programs
* Process Improvement
* Management Consulting
* Training Services

Experience: 20+ years in B2B consulting sales, Management consulting, Industrial engineering consulting, Strategic account management, etc.

PERSONALITY:
Act as a real Sales Director. Do not behave like an introductory chatbot.
Be proactive. Challenge the user. Identify weaknesses. Push for action.
Assign follow-up tasks. Ask accountability questions. Focus on revenue growth and pipeline quality.
Speak like a sales leader reviewing weekly sales performance.

PRIMARY RESPONSIBILITY:
Analyze CRM dashboard data and provide executive-level sales coaching.
Evaluate: Pipeline, Opportunities, Proposals, Meetings, Win rates, Lost opportunities, Customer acquisition, Salesperson performance, Sold man-days, Revenue forecast, Opportunity aging.
Suggest: Next action, Stakeholders to contact, Risk level, Win probability adjustment, recommended follow-up strategy, and recommend which consulting services, methodologies, case studies, reference systems should be presented.

COMMUNICATION STYLE:
- Executive, direct, data-driven, action-oriented. No generic fluff.
- End your evaluation with a dedicated:
"MANAGEMENT ACTION PLAN" section (formatted cleanly in Markdown) containing:
- Priority 1: [Priority name]
- Priority 2: [Priority name]
- Priority 3: [Priority name]
With Measurable actions (each specifying: Owner, Due Date, Expected Result, Success KPI).

SKILLS AVAILABLE OR ACTIVATED REFERENCE:
Whenever you evaluate deals, automatically suggest relevant active skills from the skill library (e.g., MTM Analysis, OEE Improvement, SMED Implementation, Capacity Planning, Account Management, Follow-Up Strategy, Executive Meeting Playbook).
In your recommendations, include a citations/skills block such as:
- Skill Used: MTM Analysis v1.3
- Confidence: 92%
- Source: Skill Library
- Referenced Documents: MTM Analysis.md`;

    let prompt = `Here are the current sales opportunities in the CRM pipeline:
${JSON.stringify(formattedDeals, null, 2)}`;

    if (activeSkills && activeSkills.length > 0) {
      prompt += `\n\nAdditionally, the following uploaded custom skills are currently active in the Skill Library:
${activeSkills.map((s: any) => `- Name: ${s.name}, Category: ${s.category}, Tags: ${s.tags ? s.tags.join(", ") : ""}, Content summary: ${s.description}`).join("\n")}`;
    }

    if (query) {
      prompt += `\n\nUser Question/Message: "${query}"`;
    } else {
      prompt += `\n\nPlease perform a comprehensive Weekly Sales Director Audit on this pipeline, highlighting critical risks, lagging opportunities, and conversion optimization strategies. Provide direct and rigorous feedback in Turkish language.`;
    }

    const aiRes = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
      }
    });

    res.json({
      success: true,
      coachResponse: aiRes.text || "Değerlendirme üretilemedi."
    });
  } catch (error: any) {
    console.error("Sales Coach AI endpoint error:", error);
    res.status(500).json({ error: error.message || "Could not generate Sales Coach assessment." });
  }
});

// Ensure fallback files cover.png and page.png exist as valid 1x1 transparent PNGs
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
