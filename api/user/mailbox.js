import { personalCredentialsHandler } from '../../lib/server/personalProviderCredentials.js';
import {
  connectPersonalMailbox,
  disconnectPersonalMailbox,
  getPersonalMailboxStatus,
  handlePersonalMailboxError,
  sendPersonalMailboxTest,
} from "../../lib/server/personalMailbox.js";
import {
  createPersonalCalendarEvent,
  deletePersonalCalendarEvent,
  listPersonalCalendarEvents,
  savePersonalCalendarAppointment,
  removePersonalCalendarAppointment,
} from "../../lib/server/personalCalendar.js";

// Outlook Calendar (createPersonalCalendarEvent/deletePersonalCalendarEvent)
// is folded into this same file/route — rather than its own api/user/calendar.js
// — because the Vercel Hobby plan caps a deployment at 12 Serverless
// Functions total, and this project was already exactly at that cap. A
// separate calendar.js file pushed the count to 13 and the whole deployment
// failed with "exceeded_serverless_functions_per_deployment". Both mailbox
// and calendar actions share the same underlying Personal Mailbox
// connection anyway, so folding them here (like the /api/mail, /api/gemini,
// and /api/organization catch-alls already do for their own actions) is a
// natural fit, not just a function-count workaround.
export default async function handler(request, response) {
  if (request.query?.action === "api-credentials") return personalCredentialsHandler(request, response);
  try {
    response.setHeader("Cache-Control", "private, no-store");
    if (request.method === "GET") {
      if (request.query?.action === "calendar-list") return response.status(200).json(await listPersonalCalendarEvents(request, request.query));
      return response.status(200).json(await getPersonalMailboxStatus(request));
    }

    if (request.method === "DELETE") {
      const eventId = request.query?.eventId;
      if (eventId) {
        return response.status(200).json(await deletePersonalCalendarEvent(request, eventId));
      }
      return response.status(200).json(await disconnectPersonalMailbox(request));
    }

    if (request.method === "POST") {
      const action = request.body?.action || "connect";
      if (action === "calendar-save") return response.status(200).json(await savePersonalCalendarAppointment(request, request.body));
      if (action === "calendar-remove") return response.status(200).json(await removePersonalCalendarAppointment(request, request.body));
      if (action === "test") {
        return response.status(200).json(await sendPersonalMailboxTest(request));
      }
      if (action === "calendar-create") {
        return response.status(200).json(await createPersonalCalendarEvent(request, request.body));
      }
      return response.status(200).json(await connectPersonalMailbox(request, request.body));
    }

    response.setHeader("Allow", "GET, POST, DELETE");
    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return handlePersonalMailboxError(response, error);
  }
}
