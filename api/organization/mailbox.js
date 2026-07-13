import {
  connectOrganizationMailbox,
  disconnectOrganizationMailbox,
  getOrganizationMailboxStatus,
  handleMailboxError,
  sendOrganizationMailboxTest,
} from "../lib/organizationMailbox.js";

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      return response.status(200).json(await getOrganizationMailboxStatus(request));
    }

    if (request.method === "DELETE") {
      return response.status(200).json(await disconnectOrganizationMailbox(request));
    }

    if (request.method === "POST") {
      const action = request.body?.action || "connect";
      if (action === "test") {
        return response.status(200).json(await sendOrganizationMailboxTest(request));
      }
      return response.status(200).json(await connectOrganizationMailbox(request, request.body));
    }

    response.setHeader("Allow", "GET, POST, DELETE");
    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return handleMailboxError(response, error);
  }
}
