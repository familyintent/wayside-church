import type { APIRoute } from "astro";
import { site } from "../lib/content";
import { absoluteUrl } from "../lib/paths";
import { getRecentTeachings } from "../lib/youtube";

const feedUrl = absoluteUrl("/teaching-feed.xml", site.meta.siteUrl);
const teachingUrl = absoluteUrl("/teaching/", site.meta.siteUrl);

function escapeXml(value = ""): string {
  return value.replace(/[<>&'"]/g, (character) => {
    switch (character) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return character;
    }
  });
}

function toIsoDate(value = ""): string {
  if (!value) return "";

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString();
}

export const GET: APIRoute = async () => {
  const teachings = await getRecentTeachings(site.youtube, 6);
  const fallbackUpdated = new Date().toISOString();
  const feedUpdated = toIsoDate(teachings[0]?.published) || fallbackUpdated;
  const entries = teachings
    .map((teaching) => {
      const entryUpdated = toIsoDate(teaching.published) || feedUpdated;
      const summary = `Recent Bible teaching from ${site.church.name} in ${site.church.city}, ${site.church.state}.`;

      return `  <entry>
    <id>${escapeXml(teaching.url)}</id>
    <title>${escapeXml(teaching.title)}</title>
    <link href="${escapeXml(teaching.url)}" rel="alternate" type="text/html" />
    <published>${entryUpdated}</published>
    <updated>${entryUpdated}</updated>
    <summary>${escapeXml(summary)}</summary>
    <media:thumbnail url="${escapeXml(teaching.thumbnail)}" />
  </entry>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <id>${escapeXml(feedUrl)}</id>
  <title>${escapeXml(`${site.church.name} Teaching`)}</title>
  <subtitle>${escapeXml(`Recent Bible teaching from ${site.church.name} in ${site.church.city}, ${site.church.state}.`)}</subtitle>
  <link href="${escapeXml(feedUrl)}" rel="self" type="application/atom+xml" />
  <link href="${escapeXml(teachingUrl)}" rel="alternate" type="text/html" />
  <updated>${feedUpdated}</updated>
${entries}
</feed>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
    },
  });
};
