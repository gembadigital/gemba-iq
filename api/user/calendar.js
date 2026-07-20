import {
  createPersonalCalendarEvent,
  deletePersonalCalendarEvent,
  handlePersonalCalendarError,
} from "../../lib/server/personalCalendar.js";

export default async function handler(request, response) {
  try {
    if (request.method === "POST") {
      return response.status(200).json(await createPersonalCalendarEvent(request, request.body));
    }

    if (request.method === "DELETE") {
      const eventId = request.query?.eventId || request.body?.eventId;
      return response.status(200).json(await deletePersonalCalendarEvent(request, eventId));
    }

    response.setHeader("Allow", "POST, DELETE");
    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return handlePersonalCalendarError(response, error);
  }
}
