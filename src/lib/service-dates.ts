import { site } from "./content";

type DateParts = {
  weekday: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
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

function getZonedDateParts(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";

  return {
    weekday: value("weekday"),
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

function addDays(parts: DateParts, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function dateIso(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function serviceEndMinutes() {
  const endLocal = site.calendar.sunday.endLocal || "20260705T113000";
  const timePart = endLocal.split("T")[1] || "113000";
  const hour = Number(timePart.slice(0, 2));
  const minute = Number(timePart.slice(2, 4));

  return (hour || 0) * 60 + (minute || 0);
}

function formatDateLabel(parts: { year: number; month: number; day: number }) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function getNextSundayDate() {
  const timeZone = site.calendar.sunday.timezone || "America/New_York";
  const now = getZonedDateParts(new Date(), timeZone);
  const targetDay = dayIndexes[site.service.primary.day] ?? dayIndexes.Sunday;
  const today = dayIndexes[now.weekday] ?? dayIndexes.Sunday;
  let daysUntil = (targetDay - today + 7) % 7;

  if (daysUntil === 0 && now.hour * 60 + now.minute >= serviceEndMinutes()) {
    daysUntil = 7;
  }

  const parts = addDays(now, daysUntil);

  return {
    iso: dateIso(parts),
    label: formatDateLabel(parts),
  };
}
