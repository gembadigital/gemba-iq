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

export default async function handler(request, response) {
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
