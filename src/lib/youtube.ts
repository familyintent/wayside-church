import { XMLParser } from "fast-xml-parser";

type YouTubeSettings = {
  channelId?: string;
  feedUrl?: string;
};

export type LatestTeaching = {
  title: string;
  videoId: string;
  url: string;
  thumbnail: string;
  published: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  attributeNamePrefix: "@_",
});

function asFirst<T>(value: T | T[] | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function getLatestTeaching(settings: YouTubeSettings): Promise<LatestTeaching | null> {
  const feedUrl =
    settings.feedUrl ||
    (settings.channelId ? `https://www.youtube.com/feeds/videos.xml?channel_id=${settings.channelId}` : "");

  if (!feedUrl) return null;

  try {
    const response = await fetch(feedUrl, {
      headers: { Accept: "application/atom+xml, application/xml;q=0.9, text/xml;q=0.8" },
    });

    if (!response.ok) return null;

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const entry = asFirst(parsed?.feed?.entry);
    if (!entry) return null;

    const videoId = entry.videoId || xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = typeof entry.title === "string" ? entry.title : "Latest teaching";
    const published = entry.published || entry.updated || "";
    const link = asFirst(entry.link);
    const url = link?.["@_href"] || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");
    const thumbnail =
      asFirst(entry.group?.thumbnail)?.["@_url"] ||
      (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");

    if (!videoId || !url || !thumbnail) return null;

    return { title, videoId, url, thumbnail, published };
  } catch {
    return null;
  }
}

export function formatPublishedDate(value: string): string {
  if (!value) return "";

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
