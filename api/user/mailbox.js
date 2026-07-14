import {
    connectPersonalMailbox,
    disconnectPersonalMailbox,
    getPersonalMailboxStatus,
    handlePersonalMailboxError,
    sendPersonalMailboxTest,
  } from "../../lib/server/personalMailbox.js";
  
  export default async function handler(request, response) {
    try {
      if (request.method === "GET") {
        return response.status(200).json(await getPersonalMailboxStatus(request));
      }
  
      if (request.method === "DELETE") {
        return response.status(200).json(await disconnectPersonalMailbox(request));
      }
  
      if (request.method === "POST") {
        const action = request.body?.action || "connect";
        if (action === "test") {
          return response.status(200).json(await sendPersonalMailboxTest(request));
        }
        return response.status(200).json(await connectPersonalMailbox(request, request.body));
      }
  
      response.setHeader("Allow", "GET, POST, DELETE");
      return response.status(405).json({ error: "Method not allowed" });
    } catch (error) {
      return handlePersonalMailboxError(response, error);
    }
  }