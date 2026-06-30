import type { APIRoute } from "astro";
import { site } from "../../lib/content";
import { absoluteUrl } from "../../lib/paths";

function escapeIcsText(value = ""): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatUtcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function foldLine(line: string): string {
  const limit = 74;
  if (line.length <= limit) return line;

  const parts = [];
  let remaining = line;
  while (remaining.length > limit) {
    parts.push(remaining.slice(0, limit));
    remaining = ` ${remaining.slice(limit)}`;
  }
  parts.push(remaining);
  return parts.join("\r\n");
}

function calendarLine(name: string, value: string): string {
  return foldLine(`${name}:${value}`);
}

export const GET: APIRoute = () => {
  const event = site.calendar.sunday;
  const timezone = event.timezone || "America/New_York";
  const address = `${site.contact.addressLine1}, ${site.contact.cityStateZip}`;
  const description = `${event.description} ${site.church.name} gathers at ${site.contact.addressLine1} in ${site.contact.addressLocality}, ${site.contact.addressRegion}.`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wayside Church//Sunday Worship//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    calendarLine("X-WR-CALNAME", escapeIcsText(event.title)),
    calendarLine("X-WR-TIMEZONE", timezone),
    "BEGIN:VTIMEZONE",
    calendarLine("TZID", timezone),
    calendarLine("X-LIC-LOCATION", timezone),
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0400",
    "TZNAME:EDT",
    "DTSTART:19700308T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0400",
    "TZOFFSETTO:-0500",
    "TZNAME:EST",
    "DTSTART:19701101T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    "UID:wayside-sunday-worship@wayside.church",
    calendarLine("DTSTAMP", formatUtcStamp(new Date())),
    calendarLine(`DTSTART;TZID=${timezone}`, event.startLocal),
    calendarLine(`DTEND;TZID=${timezone}`, event.endLocal),
    event.recurrenceRule,
    calendarLine("SUMMARY", escapeIcsText(event.title)),
    calendarLine("LOCATION", escapeIcsText(address)),
    calendarLine("DESCRIPTION", escapeIcsText(description)),
    calendarLine("URL", absoluteUrl("/", site.meta.siteUrl)),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
};
