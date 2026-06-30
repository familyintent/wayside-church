import { site } from "./content";
import { absoluteUrl } from "./paths";

type MinistryWithEvent = {
  id?: string;
  name: string;
  summary: string;
  details: string;
  event?: {
    day: string;
    startTime: string;
    endTime: string;
  };
};

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startLocal: string;
  endLocal: string;
  timezone: string;
  recurrenceRule: string;
  location: string;
  url: string;
  uid: string;
};

const dayIndexes: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const dayCodes: Record<string, string> = {
  Sunday: "SU",
  Monday: "MO",
  Tuesday: "TU",
  Wednesday: "WE",
  Thursday: "TH",
  Friday: "FR",
  Saturday: "SA",
};

export function escapeIcsText(value = ""): string {
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

function ymdFromDate(date: Date): string {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function localStamp(datePart: string, time: string): string {
  return `${datePart}T${time.replace(":", "")}00`;
}

function datePartForDay(day: string) {
  const sundaySeed = site.calendar.sunday.startLocal.slice(0, 8);
  const seedDate = new Date(Date.UTC(Number(sundaySeed.slice(0, 4)), Number(sundaySeed.slice(4, 6)) - 1, Number(sundaySeed.slice(6, 8))));
  const offset = ((dayIndexes[day] ?? 0) - dayIndexes.Sunday + 7) % 7;
  seedDate.setUTCDate(seedDate.getUTCDate() + offset);
  return ymdFromDate(seedDate);
}

function eventLocation() {
  return `${site.contact.addressLine1}, ${site.contact.cityStateZip}`;
}

export function getMinistryCalendarPath(ministry: MinistryWithEvent) {
  return `/calendar/${ministry.id}.ics`;
}

export function getGoogleCalendarUrl(event: CalendarEvent) {
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${event.startLocal}/${event.endLocal}`,
    details: `${event.description}\n\n${event.location}`,
    location: event.location,
    ctz: event.timezone,
    recur: event.recurrenceRule,
  }).toString()}`;
}

export function getSundayCalendarEvent(): CalendarEvent {
  const event = site.calendar.sunday;
  const description = `${event.description} ${site.church.name} gathers at ${site.contact.addressLine1} in ${site.contact.addressLocality}, ${site.contact.addressRegion}.`;

  return {
    id: "wayside-sunday-worship",
    title: event.title,
    description,
    startLocal: event.startLocal,
    endLocal: event.endLocal,
    timezone: event.timezone || "America/New_York",
    recurrenceRule: event.recurrenceRule,
    location: eventLocation(),
    url: absoluteUrl("/", site.meta.siteUrl),
    uid: "wayside-sunday-worship@wayside.church",
  };
}

export function getMinistryCalendarEvent(ministry: MinistryWithEvent, pagePath = "/ministries/"): CalendarEvent | null {
  if (!ministry.id || !ministry.event) return null;

  const day = ministry.event.day || "Sunday";
  const datePart = datePartForDay(day);
  const byDay = dayCodes[day] || "SU";
  const description = `${ministry.details} ${site.church.name} gathers at ${site.contact.addressLine1} in ${site.contact.addressLocality}, ${site.contact.addressRegion}.`;

  return {
    id: ministry.id,
    title: `${ministry.name} at ${site.church.name}`,
    description,
    startLocal: localStamp(datePart, ministry.event.startTime),
    endLocal: localStamp(datePart, ministry.event.endTime),
    timezone: site.calendar.sunday.timezone || "America/New_York",
    recurrenceRule: `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
    location: eventLocation(),
    url: absoluteUrl(`${pagePath}#${ministry.id}`, site.meta.siteUrl),
    uid: `${ministry.id}@wayside.church`,
  };
}

export function buildIcsCalendar(event: CalendarEvent) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Wayside Church//${event.id}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    calendarLine("X-WR-CALNAME", escapeIcsText(event.title)),
    calendarLine("X-WR-TIMEZONE", event.timezone),
    "BEGIN:VTIMEZONE",
    calendarLine("TZID", event.timezone),
    calendarLine("X-LIC-LOCATION", event.timezone),
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
    calendarLine("UID", event.uid),
    calendarLine("DTSTAMP", formatUtcStamp(new Date())),
    calendarLine(`DTSTART;TZID=${event.timezone}`, event.startLocal),
    calendarLine(`DTEND;TZID=${event.timezone}`, event.endLocal),
    event.recurrenceRule,
    calendarLine("SUMMARY", escapeIcsText(event.title)),
    calendarLine("LOCATION", escapeIcsText(event.location)),
    calendarLine("DESCRIPTION", escapeIcsText(event.description)),
    calendarLine("URL", event.url),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.join("\r\n")}\r\n`;
}
