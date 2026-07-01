import { site } from "./content";
import { absoluteUrl } from "./paths";

type FaqItem = {
  question: string;
  answer: string;
};

type TeachingVideo = {
  title: string;
  videoId: string;
  url: string;
  thumbnail: string;
  published?: string;
};

type Leader = {
  name: string;
  role: string;
  image: string;
  bio: string;
};

type Ministry = {
  id?: string;
  name: string;
  audience: string;
  summary: string;
  details?: string;
  schedule?: string;
  event?: {
    day: string;
    startTime: string;
    endTime: string;
  };
};

const churchUrl = absoluteUrl("/", site.meta.siteUrl);
const churchId = `${churchUrl}#church`;
const localEntityImagePaths = site.images.localEntity || [];
const churchEventImageUrls = [site.meta.socialImage, ...localEntityImagePaths, site.images.community].map((imagePath) =>
  absoluteUrl(imagePath, site.meta.siteUrl),
);

const postalAddress = {
  "@type": "PostalAddress",
  streetAddress: site.contact.addressLine1,
  addressLocality: site.contact.addressLocality,
  addressRegion: site.contact.addressRegion,
  postalCode: site.contact.postalCode,
  addressCountry: site.contact.addressCountry,
};

const geo = {
  "@type": "GeoCoordinates",
  latitude: site.contact.latitude,
  longitude: site.contact.longitude,
};

const amenityFeatures = (site.visitDetails?.amenityFeatures || []).map((name: string) => ({
  "@type": "LocationFeatureSpecification",
  name,
  value: true,
}));

const dayIndexes: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function getZonedDateParts(date: Date, timeZone: string) {
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

function addDaysToDateParts(year: number, month: number, day: number, days: number) {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function datePartFromParts(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getTimeZoneOffset(parts: { year: number; month: number; day: number }, time: string, timeZone: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hours || 0, minutes || 0));
  const offsetName =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value || "";
  const match = offsetName.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) return "";

  const [, sign, offsetHours, offsetMinutes = "00"] = match;
  return `${sign}${offsetHours.padStart(2, "0")}:${offsetMinutes.padStart(2, "0")}`;
}

function dateTimeWithOffset(parts: { year: number; month: number; day: number }, time: string, timeZone: string) {
  return `${datePartFromParts(parts)}T${time}:00${getTimeZoneOffset(parts, time, timeZone)}`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function getNextOccurrence(day: string, startTime: string, endTime: string) {
  const now = new Date();
  const timeZone = site.calendar.sunday.timezone || "America/New_York";
  const nowParts = getZonedDateParts(now, timeZone);
  const targetDay = dayIndexes[day] ?? 0;
  const today = dayIndexes[nowParts.weekday] ?? 0;
  let daysUntil = (targetDay - today + 7) % 7;

  if (daysUntil === 0 && nowParts.hour * 60 + nowParts.minute >= timeToMinutes(endTime)) {
    daysUntil = 7;
  }

  const dateParts = addDaysToDateParts(nowParts.year, nowParts.month, nowParts.day, daysUntil);
  return {
    startDate: dateTimeWithOffset(dateParts, startTime, timeZone),
    endDate: dateTimeWithOffset(dateParts, endTime, timeZone),
  };
}

function getFreeEventOffer(url: string) {
  return {
    "@type": "Offer",
    name: "Free admission",
    url,
    price: 0,
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  };
}

export function getFaqPageSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function getSundayWorshipEventSchema(pagePath = "/sunday-worship/") {
  const occurrence = getNextOccurrence("Sunday", "10:00", "11:30");
  const eventUrl = absoluteUrl(pagePath, site.meta.siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${site.service.primary.label} at ${site.church.name}`,
    description: `${site.service.primary.summary} ${site.service.coffee.label} begins at ${site.service.coffee.time}.`,
    startDate: occurrence.startDate,
    endDate: occurrence.endDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    isAccessibleForFree: true,
    inLanguage: "en-US",
    url: eventUrl,
    image: churchEventImageUrls,
    offers: getFreeEventOffer(eventUrl),
    organizer: {
      "@type": "Church",
      "@id": churchId,
      name: site.church.name,
      url: churchUrl,
    },
    location: {
      "@type": "Place",
      name: site.church.name,
      hasMap: site.links.maps,
      amenityFeature: amenityFeatures,
      address: postalAddress,
      geo,
    },
    eventSchedule: {
      "@type": "Schedule",
      repeatFrequency: "P1W",
      byDay: "https://schema.org/Sunday",
      startTime: "10:00",
      endTime: "11:30",
      scheduleTimezone: site.calendar.sunday.timezone,
    },
  };
}

export function getLeaderPersonSchemas(leaders: Leader[], pagePath = "/about/") {
  const pageUrl = absoluteUrl(pagePath, site.meta.siteUrl);

  return leaders.map((leader) => {
    const leaderUrl = absoluteUrl(`${pagePath}#${getLeaderId(leader)}`, site.meta.siteUrl);

    return {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": leaderUrl,
      name: leader.name,
      jobTitle: leader.role,
      description: leader.bio,
      image: absoluteUrl(leader.image, site.meta.siteUrl),
      url: leaderUrl,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
      },
      worksFor: { "@id": churchId },
      affiliation: { "@id": churchId },
    };
  });
}

export function getLeaderId(leader: Pick<Leader, "name">) {
  return leader.name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getMinistryEventSchemas(ministries: Ministry[], pagePath = "/ministries/") {
  return ministries
    .filter((ministry) => Boolean(ministry.event))
    .map((ministry) => {
      const eventUrl = absoluteUrl(ministry.id ? `${pagePath}#${ministry.id}` : pagePath, site.meta.siteUrl);
      const occurrence = getNextOccurrence(
        ministry.event?.day || "Sunday",
        ministry.event?.startTime || "10:00",
        ministry.event?.endTime || "11:30",
      );

      return {
        "@context": "https://schema.org",
        "@type": "Event",
        name: `${ministry.name} at ${site.church.name}`,
        description: ministry.summary,
        startDate: occurrence.startDate,
        endDate: occurrence.endDate,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        isAccessibleForFree: true,
        inLanguage: "en-US",
        url: eventUrl,
        image: churchEventImageUrls,
        offers: getFreeEventOffer(eventUrl),
        organizer: {
          "@type": "Church",
          "@id": churchId,
          name: site.church.name,
          url: churchUrl,
        },
        location: {
          "@type": "Place",
          name: site.church.name,
          hasMap: site.links.maps,
          amenityFeature: amenityFeatures,
          address: postalAddress,
          geo,
        },
        audience: {
          "@type": "Audience",
          audienceType: ministry.audience,
        },
        eventSchedule: {
          "@type": "Schedule",
          repeatFrequency: "P1W",
          byDay: `https://schema.org/${ministry.event?.day}`,
          startTime: ministry.event?.startTime,
          endTime: ministry.event?.endTime,
          scheduleTimezone: site.calendar.sunday.timezone,
        },
      };
    });
}

export function getMinistryItemListSchema(ministries: Ministry[], pagePath = "/ministries/", name = "Wayside Church ministries") {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: ministries.map((ministry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Thing",
        name: ministry.name,
        description: ministry.details || ministry.summary,
        audience: {
          "@type": "Audience",
          audienceType: ministry.audience,
        },
        additionalProperty: [
          ministry.schedule && {
            "@type": "PropertyValue",
            name: "Schedule",
            value: ministry.schedule,
          },
        ].filter(Boolean),
        url: absoluteUrl(ministry.id ? `${pagePath}#${ministry.id}` : pagePath, site.meta.siteUrl),
      },
    })),
  };
}

export function getDonateActionSchema(pagePath = "/giving/") {
  const pageUrl = absoluteUrl(pagePath, site.meta.siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "DonateAction",
    name: `Give to ${site.church.name}`,
    description: site.givingPage?.body || `Support worship, care, and local ministry at ${site.church.name}.`,
    url: pageUrl,
    target: site.links.giving,
    actionStatus: "https://schema.org/PotentialActionStatus",
    recipient: {
      "@type": "Church",
      "@id": churchId,
      name: site.church.name,
      url: churchUrl,
    },
  };
}

export function getTeachingVideoSchema(video: TeachingVideo, pagePath = "/teaching/") {
  const pageUrl = absoluteUrl(pagePath, site.meta.siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: `${video.title} - Bible teaching from ${site.church.name} in ${site.church.city}, ${site.church.state}.`,
    thumbnailUrl: [video.thumbnail],
    uploadDate: video.published || undefined,
    contentUrl: video.url,
    embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
    url: pageUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
    },
    about: { "@id": churchId },
    publisher: { "@id": churchId },
    isFamilyFriendly: true,
    inLanguage: "en-US",
    potentialAction: {
      "@type": "WatchAction",
      target: [pageUrl, video.url],
    },
  };
}

export function getTeachingVideoSchemas(videos: TeachingVideo[], pagePath = "/teaching/") {
  return videos.filter((video) => Boolean(video.published)).map((video) => getTeachingVideoSchema(video, pagePath));
}
