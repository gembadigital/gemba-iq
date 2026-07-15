import {
  getOrganizationMailboxForRequest,
  handleMailboxError,
  sendGraphMailWithMailbox,
} from "../../lib/server/organizationMailbox.js";
import {
  getPersonalMailboxForRequest,
  sendGraphMailWithPersonalMailbox,
  handlePersonalMailboxError,
} from "../../lib/server/personalMailbox.js";
import { listMicrosoftGraphMailMessages } from "../../lib/server/microsoftGraphMailService.js";

// Consolidated into a single Vercel catch-all route (covers /api/mail/send,
// /api/mail/draft, /api/mail/scan) to stay under the Hobby plan's 12
// Serverless Functions per deployment limit — each separate file under api/
// used to count as its own function. See errorCode
// "exceeded_serverless_functions_per_deployment" from a previous deploy.
// Frontend URLs are unchanged (organizationMailbox.ts, mailScan.ts, etc.
// still call /api/mail/send, /api/mail/draft, /api/mail/scan as before).

export async function sendHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const { recipient, recipients, cc, bcc, subject, body, attachments, source } = request.body || {};
  if (!(recipient || recipients) || !subject || !body) {
    return response.status(400).json({ error: "Missing required mail parameters (recipient/recipients, subject, body)." });
  }

  const mailPayload = { recipient, recipients, cc, bcc, subject, body, attachments };

  // "personal" sends through the signed-in user's own connected Microsoft 365
  // mailbox; anything else (default) sends through the shared Organization
  // Mailbox, preserving backward compatibility for existing callers.
  if (source === "personal") {
    try {
      const context = await getPersonalMailboxForRequest(request, { requireConnected: true });
      await sendGraphMailWithPersonalMailbox(context.mailbox, mailPayload);
      return response.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        sender: context.mailbox?.mailbox_address || "",
      });
    } catch (error) {
      return handlePersonalMailboxError(response, error);
    }
  }

  try {
    const context = await getOrganizationMailboxForRequest(request, { requireConnected: true });
    await sendGraphMailWithMailbox(context.adminClient, context.organizationId, context.mailbox, mailPayload);
    return response.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      sender: context.mailbox?.organizationMailbox || context.mailbox?.mailbox_email || "",
    });
  } catch (error) {
    return handleMailboxError(response, error);
  }
}

export async function draftHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const { recipient, subject, body, attachments } = request.body || {};
  if (!recipient || !subject || !body) {
    return response.status(400).json({ error: "Missing required mail parameters (recipient, subject, body)." });
  }

  try {
    const context = await getOrganizationMailboxForRequest(request, { requireConnected: true });
    const data = await sendGraphMailWithMailbox(
      context.adminClient,
      context.organizationId,
      context.mailbox,
      { recipient, subject, body, attachments },
      { draft: true }
    );
    return response.status(200).json({
      success: true,
      id: data.id,
      webLink: data.webLink,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleMailboxError(response, error);
  }
}

export async function scanHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const source = String(request.body?.source || "").trim();
  if (!["organization", "personal"].includes(source)) {
    return response.status(400).json({ error: "source must be 'organization' or 'personal'." });
  }

  try {
    let mailboxAddress = "";
    if (source === "organization") {
      const context = await getOrganizationMailboxForRequest(request, { requireConnected: true });
      mailboxAddress = context.mailbox?.organizationMailbox || context.mailbox?.mailbox_email || "";
    } else {
      const context = await getPersonalMailboxForRequest(request, { requireConnected: true });
      mailboxAddress = context.mailbox?.mailbox_address || "";
    }

    if (!mailboxAddress) {
      return response.status(400).json({ error: "Mailbox address could not be resolved." });
    }

    const top = Math.min(Number(request.body?.top) || 50, 100);
    const [inboxMessages, sentMessages] = await Promise.all([
      listMicrosoftGraphMailMessages({ mailboxAddress, folder: "inbox", top }),
      listMicrosoftGraphMailMessages({ mailboxAddress, folder: "sentitems", top }),
    ]);

    // TEMP DIAGNOSTIC (Mail.Read permission verification, remove after test):
    // logs only sender addresses, not subjects/bodies.
    console.log(
      `[mail-scan-debug] mailbox=${mailboxAddress} inbox=${inboxMessages.length} sent=${sentMessages.length} senders=${JSON.stringify(inboxMessages.map((m) => m.from?.address).filter(Boolean))}`
    );

    return response.status(200).json({
      mailboxAddress,
      messages: [...inboxMessages, ...sentMessages],
    });
  } catch (error) {
    const status = error.status || 500;
    return response.status(status).json({
      error: error.message || "Mailbox scan failed.",
      details: error.details || undefined,
    });
  }
}

export default async function handler(request, response) {
  const action = Array.isArray(request.query?.action) ? request.query.action[0] : request.query?.action;
  if (action === "send") return sendHandler(request, response);
  if (action === "draft") return draftHandler(request, response);
  if (action === "scan") return scanHandler(request, response);
  return response.status(404).json({ error: "Unknown mail endpoint." });
}
