import { site } from "../lib/content";
import { absoluteUrl } from "../lib/paths";
import { getTeachingPagePath } from "../lib/teaching-routes";
import { getRecentTeachings } from "../lib/youtube";
import type { LatestTeaching } from "../lib/youtube";

type VideoSitemapPage = {
  path: string;
  videos: LatestTeaching[];
};

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function videoDescription(video: LatestTeaching) {
  return `${video.title} - Bible teaching from ${site.church.name} in ${site.church.city}, ${site.church.state}.`;
}

function videoEntryXml(video: LatestTeaching) {
  const fields = [
    "    <video:video>",
    `      <video:thumbnail_loc>${xmlEscape(video.thumbnail)}</video:thumbnail_loc>`,
    `      <video:title>${xmlEscape(truncate(video.title, 100))}</video:title>`,
    `      <video:description>${xmlEscape(truncate(videoDescription(video), 2048))}</video:description>`,
    `      <video:player_loc allow_embed="yes">https://www.youtube.com/embed/${xmlEscape(video.videoId)}</video:player_loc>`,
    "      <video:family_friendly>yes</video:family_friendly>",
    "      <video:requires_subscription>no</video:requires_subscription>",
  ];

  if (video.published) {
    fields.push(`      <video:publication_date>${xmlEscape(video.published)}</video:publication_date>`);
  }

  fields.push("    </video:video>");
  return fields.join("\n");
}

export async function GET() {
  const teachings = await getRecentTeachings(site.youtube, 6);
  const latest = teachings[0] ? [teachings[0]] : [];
  const pages: VideoSitemapPage[] = [
    { path: "/", videos: latest },
    { path: "/teaching/", videos: teachings },
    { path: "/sermons/", videos: teachings },
    ...teachings.map((video) => ({ path: getTeachingPagePath(video), videos: [video] })),
  ].filter((page) => page.videos.length > 0);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
    ...pages.map((page) =>
      [
        "  <url>",
        `    <loc>${xmlEscape(absoluteUrl(page.path, site.meta.siteUrl))}</loc>`,
        ...page.videos.map(videoEntryXml),
        "  </url>",
      ].join("\n"),
    ),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
