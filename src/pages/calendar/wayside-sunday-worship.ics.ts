import type { APIRoute } from "astro";
import { buildIcsCalendar, getSundayCalendarEvent } from "../../lib/calendar";

export const GET: APIRoute = () => {
  return new Response(buildIcsCalendar(getSundayCalendarEvent()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
};
