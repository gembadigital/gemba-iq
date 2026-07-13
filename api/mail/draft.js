import {
  getOrganizationMailboxForRequest,
  handleMailboxError,
  sendGraphMailWithMailbox,
} from "../../lib/server/organizationMailbox.js";

export default async function handler(request, response) {
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
