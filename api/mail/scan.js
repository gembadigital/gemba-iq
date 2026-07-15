import { getOrganizationMailboxForRequest } from "../../lib/server/organizationMailbox.js";
import { getPersonalMailboxForRequest } from "../../lib/server/personalMailbox.js";
import { listMicrosoftGraphMailMessages } from "../../lib/server/microsoftGraphMailService.js";

// Scans a connected mailbox (Organization or the caller's own Personal
// mailbox) for real Inbox + Sent Items messages, used by Email Lead
// Discovery. Any signed-in organization member can scan the shared
// Organization mailbox and their own Personal mailbox — never someone
// else's personal mailbox.
export default async function handler(request, response) {
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
