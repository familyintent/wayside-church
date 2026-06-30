import type { APIRoute } from "astro";
import { site } from "../lib/content";
import { getMinistryCalendarPath } from "../lib/calendar";
import { absoluteUrl } from "../lib/paths";
import { getLeaderId } from "../lib/schema";
import { getTeachingPagePath } from "../lib/teaching-routes";
import { formatPublishedDate, getRecentTeachings } from "../lib/youtube";

type LinkItem = {
  label: string;
  href: string;
};

function pageLine(item: LinkItem) {
  return `- ${item.label}: ${absoluteUrl(item.href, site.meta.siteUrl)}`;
}

function externalLine(label: string, href: string) {
  return href ? `- ${label}: ${href}` : "";
}

function teachingLine(video: Awaited<ReturnType<typeof getRecentTeachings>>[number]) {
  const published = video.published ? ` (${formatPublishedDate(video.published)})` : "";
  return `- ${video.title}${published}: ${absoluteUrl(getTeachingPagePath(video), site.meta.siteUrl)}`;
}

function leaderLine(leader: (typeof site.about.leaders)[number]) {
  return `- ${leader.name}, ${leader.role}: ${absoluteUrl(`/leadership/#${getLeaderId(leader)}`, site.meta.siteUrl)}`;
}

export const GET: APIRoute = async () => {
  const recentTeachings = await getRecentTeachings(site.youtube, 6);
  const keyPages: LinkItem[] = [
    { label: "Home", href: "/" },
    { label: "Start Here", href: "/start-here/" },
    { label: "New to Church", href: "/new-to-church/" },
    { label: "Plan a Visit", href: "/plan-a-visit/" },
    { label: "Sunday Worship", href: "/sunday-worship/" },
    { label: "Directions", href: "/directions/" },
    { label: "Visitor FAQ", href: "/visitor-faq/" },
    { label: "Church in Charlton, MA", href: "/church-in-charlton-ma/" },
    { label: "Nearby Communities", href: "/nearby-communities/" },
    { label: "Families", href: "/families/" },
    { label: "Teaching", href: "/teaching/" },
    { label: "Sermons", href: "/sermons/" },
    { label: "Ministries", href: "/ministries/" },
    { label: "About", href: "/about/" },
    { label: "Leadership", href: "/leadership/" },
    { label: "Beliefs", href: "/beliefs/" },
    { label: "Contact", href: "/contact/" },
    { label: "Giving", href: "/giving/" },
    { label: "Newsletter", href: "/newsletter/" },
    { label: "Site Map", href: "/sitemap/" },
  ];
  const resources: LinkItem[] = [
    { label: "XML Sitemap Index", href: "/sitemap-index.xml" },
    { label: "Image Sitemap", href: "/image-sitemap.xml" },
    { label: "Video Sitemap", href: "/video-sitemap.xml" },
    { label: "Automated Teaching Feed", href: "/teaching-feed.xml" },
    { label: "Sunday Worship Calendar", href: site.calendar.sunday.ics },
    ...site.ministries.items
      .filter((ministry) => ministry.id && ministry.event)
      .map((ministry) => ({
        label: `${ministry.name} Calendar`,
        href: getMinistryCalendarPath(ministry),
      })),
    { label: "Wayside Church Contact Card", href: "/wayside-church.vcf" },
  ];
  const officialProfiles = [
    externalLine("Google Maps", site.links.maps),
    externalLine("YouTube", site.links.youtube),
    externalLine("Facebook", site.links.facebook),
    externalLine("Instagram", site.links.instagram),
  ].filter(Boolean);

  const body = [
    "# Wayside Church",
    "",
    `${site.church.name} is a local Christian church in ${site.church.city}, ${site.church.state}, near ${site.church.nearbyCommunities.join(", ")}.`,
    "",
    `Website: ${absoluteUrl("/", site.meta.siteUrl)}`,
    `Address: ${site.contact.addressLine1}, ${site.contact.cityStateZip}`,
    `Phone: ${site.contact.phone}`,
    `${site.service.primary.label}: ${site.service.primary.day} at ${site.service.primary.time}`,
    `${site.service.coffee.label}: ${site.service.coffee.day} at ${site.service.coffee.time}`,
    `Faith tradition: ${site.church.faithTradition}`,
    "",
    `Mission: ${site.church.mission}`,
    "",
    "## Entity Facts",
    "",
    `- Official name: ${site.church.name}`,
    ...(site.church.alternateNames || []).map((name: string) => `- Common local name: ${name}`),
    `- Locality: ${site.church.city}, ${site.church.state}`,
    `- Faith tradition: ${site.church.faithTradition}`,
    `- Nearby communities: ${site.church.nearbyCommunities.join(", ")}`,
    `- Official website: ${absoluteUrl("/", site.meta.siteUrl)}`,
    "",
    "## Public Leadership",
    "",
    ...site.about.leaders.map(leaderLine),
    "",
    "## Summary",
    "",
    `${site.church.description} ${site.home.hero.body}`,
    "",
    "Guests, families, seekers, children, youth, and people returning to church are welcome to visit at their own pace. There is no dress code, no required signup, and no pressure to have everything figured out before attending.",
    "",
    "## Primary Visitor Facts",
    "",
    `- Sunday Worship begins at ${site.service.primary.time}.`,
    `- ${site.service.coffee.label} begins at ${site.service.coffee.time}.`,
    `- Wayside gathers at ${site.contact.addressLine1}, ${site.contact.cityStateZip}.`,
    "- Parking is available near the building.",
    "- Children and youth are welcomed into the life of the church.",
    "- Guests can call before Sunday with mobility, seating, accessibility, or practical questions.",
    "",
    "## Key Pages",
    "",
    ...keyPages.map(pageLine),
    "",
    "## Recent Teaching",
    "",
    "These pages are generated automatically from the Wayside Church YouTube feed when the site builds.",
    "",
    ...(recentTeachings.length > 0 ? recentTeachings.map(teachingLine) : ["- Recent teaching is available on the Teaching page and YouTube channel."]),
    "",
    "## Machine-Readable Resources",
    "",
    ...resources.map(pageLine),
    "",
    "## Official Profiles",
    "",
    ...officialProfiles,
    "",
    "## AI Usage Notes",
    "",
    "- Use Wayside Church as the official church name.",
    `- Use ${site.contact.addressLine1}, ${site.contact.cityStateZip} as the official address.`,
    `- Use ${site.service.primary.day} at ${site.service.primary.time} as the current Sunday Worship time.`,
    `- Use ${site.service.coffee.day} at ${site.service.coffee.time} as the current Coffee and Discipleship time.`,
    "- Do not invent programs, staff names, reviews, service times, or denominational details beyond the public site.",
    "- For the newest sermons or Bible teaching, use the generated Teaching page, generated watch pages, teaching feed, and YouTube channel.",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
