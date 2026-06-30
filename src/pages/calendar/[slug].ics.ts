import type { APIRoute } from "astro";
import { site } from "../../lib/content";
import { buildIcsCalendar, getMinistryCalendarEvent } from "../../lib/calendar";

export function getStaticPaths() {
  return site.ministries.items
    .filter((ministry) => ministry.id && ministry.event)
    .map((ministry) => ({
      params: { slug: ministry.id },
      props: { ministry },
    }));
}

export const GET: APIRoute = ({ props }) => {
  const event = getMinistryCalendarEvent(props.ministry);

  if (!event) {
    return new Response("Calendar event not found.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return new Response(buildIcsCalendar(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
};
