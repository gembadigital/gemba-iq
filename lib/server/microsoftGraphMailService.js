let tokenCache = {
  accessToken: "",
  expiresAt: 0,
};

function getAzureConfig() {
  return {
    clientId: process.env.AZURE_CLIENT_ID || "",
    clientSecret: process.env.AZURE_CLIENT_SECRET || "",
    tenantId: process.env.AZURE_TENANT_ID || "",
  };
}

function createServiceError(message, status = 500, details = undefined) {
  const error = new Error(message);
  error.status = status;
  if (details) error.details = details;
  return error;
}

function logGraphMail(level, message, metadata = {}) {
  const payload = {
    service: "microsoft-graph-mail",
    message,
    ...metadata,
  };
  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else {
    console.info(payload);
  }
}

function requireAzureConfig() {
  const config = getAzureConfig();
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    throw createServiceError(
      `Microsoft Graph application credentials are not configured: ${missing.join(", ")}.`,
      503
    );
  }
  return config;
}

export function isMicrosoftGraphConfigured() {
  const { clientId, clientSecret, tenantId } = getAzureConfig();
  return Boolean(clientId && clientSecret && tenantId);
}

export async function getMicrosoftGraphAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret, tenantId } = requireAzureConfig();
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;

  logGraphMail("info", "Requesting Microsoft Graph application access token.");
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logGraphMail("error", "Microsoft Graph token request failed.", {
      status: response.status,
      error: payload.error,
      errorDescription: payload.error_description,
    });
    throw createServiceError(
      payload.error_description || payload.error || "Microsoft Graph token request failed.",
      response.status || 502,
      payload
    );
  }

  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: now + Number(payload.expires_in || 3600) * 1000,
  };

  return tokenCache.accessToken;
}

function normalizeRecipients(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list
    .map((item) => {
      if (typeof item === "string") return item.trim();
      return String(item?.email || item?.address || item?.emailAddress?.address || "").trim();
    })
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
}

function normalizeAttachments(attachments = []) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((attachment) => attachment?.contentBytes)
    .map((attachment) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: attachment.name || "attachment",
      contentType: attachment.contentType || attachment.type || "application/octet-stream",
      contentBytes: attachment.contentBytes,
    }));
}

async function parseGraphError(response) {
  const text = await response.text();
  try {
    const payload = JSON.parse(text);
    return {
      message: payload.error?.message || payload.error_description || payload.error || text,
      details: payload,
    };
  } catch {
    return { message: text || "Microsoft Graph mail request failed.", details: text };
  }
}

export async function sendMicrosoftGraphMail({
  organizationMailbox,
  to,
  cc = [],
  bcc = [],
  subject,
  html,
  attachments = [],
  saveToSentItems = true,
}) {
  const sender = String(organizationMailbox || "").trim();
  if (!sender) {
    throw createServiceError("Organization mailbox address is required.", 400);
  }
  if (!subject || !html) {
    throw createServiceError("Mail subject and HTML body are required.", 400);
  }

  const toRecipients = normalizeRecipients(to);
  const ccRecipients = normalizeRecipients(cc);
  const bccRecipients = normalizeRecipients(bcc);
  if (!toRecipients.length && !ccRecipients.length && !bccRecipients.length) {
    throw createServiceError("At least one recipient is required.", 400);
  }

  const accessToken = await getMicrosoftGraphAccessToken();
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`;
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const message = {
    subject,
    body: { contentType: "HTML", content: html },
    toRecipients,
    ccRecipients,
    bccRecipients,
    attachments: normalizeAttachments(attachments),
  };

  logGraphMail("info", "Sending mail through Microsoft Graph.", {
    requestId,
    sender,
    toCount: toRecipients.length,
    ccCount: ccRecipients.length,
    bccCount: bccRecipients.length,
    attachmentCount: message.attachments.length,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, saveToSentItems }),
  });

  if (!response.ok) {
    const graphError = await parseGraphError(response);
    logGraphMail("error", "Microsoft Graph sendMail failed.", {
      requestId,
      sender,
      status: response.status,
      error: graphError.message,
    });
    throw createServiceError(graphError.message, response.status || 502, graphError.details);
  }

  logGraphMail("info", "Microsoft Graph sendMail succeeded.", { requestId, sender });
  return {
    success: true,
    requestId,
    sender,
    message: "Email sent successfully through Microsoft Graph.",
    timestamp: new Date().toISOString(),
  };
}

// Reads recent messages from a mailbox folder (application permission —
// requires the Azure app registration to also have Mail.Read (or
// Mail.ReadBasic.All) granted with admin consent, alongside the Mail.Send
// permission already used for sending. Used by Email Lead Discovery to scan
// a connected Organization or Personal mailbox for real inbound/outbound
// contacts instead of simulated demo data.
export async function listMicrosoftGraphMailMessages({
  mailboxAddress,
  folder = "inbox",
  top = 50,
}) {
  const sender = String(mailboxAddress || "").trim();
  if (!sender) {
    throw createServiceError("Mailbox address is required.", 400);
  }
  const folderSegment = folder === "sentitems" ? "sentitems" : "inbox";

  const accessToken = await getMicrosoftGraphAccessToken();
  const select = "id,subject,receivedDateTime,sentDateTime,from,toRecipients,bodyPreview";
  const endpoint =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}` +
    `/mailFolders/${folderSegment}/messages` +
    `?$top=${encodeURIComponent(top)}&$select=${encodeURIComponent(select)}&$orderby=receivedDateTime desc`;

  logGraphMail("info", "Listing Microsoft Graph mail messages.", { sender, folder: folderSegment, top });

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const graphError = await parseGraphError(response);
    logGraphMail("error", "Microsoft Graph list messages failed.", {
      sender,
      folder: folderSegment,
      status: response.status,
      error: graphError.message,
    });
    throw createServiceError(graphError.message, response.status || 502, graphError.details);
  }

  const payload = await response.json();
  const messages = Array.isArray(payload.value) ? payload.value : [];
  return messages.map((msg) => ({
    id: msg.id,
    subject: msg.subject || "",
    date: (msg.receivedDateTime || msg.sentDateTime || "").split("T")[0] || "",
    from: {
      address: msg.from?.emailAddress?.address || "",
      name: msg.from?.emailAddress?.name || "",
    },
    to: (msg.toRecipients || []).map((r) => ({
      address: r?.emailAddress?.address || "",
      name: r?.emailAddress?.name || "",
    })),
    bodyPreview: msg.bodyPreview || "",
    folder: folderSegment === "sentitems" ? "Sent Items" : "Inbox",
  }));
}
