import { getOrganizationMailboxStatus } from "../lib/organizationMailbox.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const mailbox = await getOrganizationMailboxStatus(request);
    return response.status(200).json({
      emailConfigured: mailbox.status === "Connected",
      mailboxStatus: mailbox.status,
      mailboxEmail: mailbox.mailbox_email,
    });
  } catch {
    return response.status(200).json({ emailConfigured: false, mailboxStatus: "Disconnected" });
  }
}
