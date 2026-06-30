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
  event?: {
    day: string;
    startTime: string;
    endTime: string;
  };
};

const churchUrl = absoluteUrl("/", site.meta.siteUrl);
const churchId = `${churchUrl}#church`;

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

const dayIndexes: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function toDatePart(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getNextOccurrence(day: string, startTime: string, endTime: string) {
  const now = new Date();
  const targetDay = dayIndexes[day] ?? 0;
  const next = new Date(now);
  const daysUntil = (targetDay - now.getDay() + 7) % 7;

  next.setDate(now.getDate() + daysUntil);

  const datePart = toDatePart(next);
  return {
    startDate: `${datePart}T${startTime}:00`,
    endDate: `${datePart}T${endTime}:00`,
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

export function getSundayWorshipEventSchema(pagePath = "/plan-a-visit/") {
  const occurrence = getNextOccurrence("Sunday", "10:00", "11:30");

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${site.church.name} ${site.service.primary.label}`,
    description: `${site.service.primary.summary} ${site.service.coffee.label} begins at ${site.service.coffee.time}.`,
    startDate: occurrence.startDate,
    endDate: occurrence.endDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    url: absoluteUrl(pagePath, site.meta.siteUrl),
    image: [absoluteUrl(site.meta.socialImage, site.meta.siteUrl), absoluteUrl(site.images.community, site.meta.siteUrl)],
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
  return leaders.map((leader) => ({
    "@context": "https://schema.org",
    "@type": "Person",
    name: leader.name,
    jobTitle: leader.role,
    description: leader.bio,
    image: absoluteUrl(leader.image, site.meta.siteUrl),
    url: absoluteUrl(pagePath, site.meta.siteUrl),
    worksFor: { "@id": churchId },
    affiliation: { "@id": churchId },
  }));
}

export function getMinistryEventSchemas(ministries: Ministry[], pagePath = "/ministries/") {
  return ministries
    .filter((ministry) => Boolean(ministry.event))
    .map((ministry) => {
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
        url: absoluteUrl(ministry.id ? `${pagePath}#${ministry.id}` : pagePath, site.meta.siteUrl),
        image: [absoluteUrl(site.meta.socialImage, site.meta.siteUrl), absoluteUrl(site.images.community, site.meta.siteUrl)],
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

export function getTeachingVideoSchema(video: TeachingVideo, pagePath = "/teaching/") {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: `${video.title} - Bible teaching from ${site.church.name} in ${site.church.city}, ${site.church.state}.`,
    thumbnailUrl: [video.thumbnail],
    uploadDate: video.published || undefined,
    contentUrl: video.url,
    embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
    url: absoluteUrl(pagePath, site.meta.siteUrl),
    publisher: { "@id": churchId },
  };
}

export function getTeachingVideoSchemas(videos: TeachingVideo[], pagePath = "/teaching/") {
  return videos.filter((video) => Boolean(video.published)).map((video) => getTeachingVideoSchema(video, pagePath));
}
