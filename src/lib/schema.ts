import { site } from "./content";
import { absoluteUrl } from "./paths";

type FaqItem = {
  question: string;
  answer: string;
};

const churchUrl = absoluteUrl("/", site.meta.siteUrl);

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
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${site.church.name} ${site.service.primary.label}`,
    description: `${site.service.primary.summary} ${site.service.coffee.label} begins at ${site.service.coffee.time}.`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    url: absoluteUrl(pagePath, site.meta.siteUrl),
    image: [absoluteUrl(site.meta.socialImage, site.meta.siteUrl), absoluteUrl(site.images.community, site.meta.siteUrl)],
    organizer: {
      "@type": "Church",
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
