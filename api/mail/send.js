import {
  getOrganizationMailboxForRequest,
  handleMailboxError,
  sendGraphMailWithMailbox,
} from "../lib/organizationMailbox.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const { recipient, recipients, cc, bcc, subject, body, attachments } = request.body || {};
  if (!(recipient || recipients) || !subject || !body) {
    return response.status(400).json({ error: "Missing required mail parameters (recipient/recipients, subject, body)." });
  }

  try {
    const context = await getOrganizationMailboxForRequest(request, { requireConnected: true });
    await sendGraphMailWithMailbox(context.adminClient, context.organizationId, context.mailbox, {
      recipient,
      recipients,
      cc,
      bcc,
      subject,
      body,
      attachments,
    });
    return response.status(200).json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    return handleMailboxError(response, error);
  }
}
