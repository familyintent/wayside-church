import { XMLParser } from "fast-xml-parser";

type YouTubeSettings = {
  channelId?: string;
  feedUrl?: string;
  handle?: string;
  channelVideosUrl?: string;
  featuredVideo?: {
    title?: string;
    videoId?: string;
    publishedLabel?: string;
  };
};

export type LatestTeaching = {
  title: string;
  videoId: string;
  url: string;
  thumbnail: string;
  published: string;
  publishedLabel?: string;
  source: "feed" | "channel" | "featured";
};

type ThumbnailSize = {
  width: number;
  height: number;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  attributeNamePrefix: "@_",
});

function asFirst<T>(value: T | T[] | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function decodeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
  } catch {
    return value.replace(/\\u0026/g, "&");
  }
}

function videoFromId(videoId: string, title = "Latest teaching", publishedLabel = ""): LatestTeaching {
  return {
    title,
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    published: "",
    publishedLabel,
    source: "featured",
  };
}

async function getLatestFromChannelPage(settings: YouTubeSettings): Promise<LatestTeaching | null> {
  const handle = settings.handle?.replace(/^@?/, "@");
  const channelVideosUrl =
    settings.channelVideosUrl || (handle ? `https://www.youtube.com/${handle}/videos` : "");

  if (!channelVideosUrl) return null;

  const response = await fetch(channelVideosUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0 compatible; WaysideChurchSite/1.0",
    },
  });

  if (!response.ok) return null;

  const html = await response.text();
  const videoMatch =
    html.match(/"videoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})"([\s\S]{0,4500})/) ||
    html.match(/"gridVideoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})"([\s\S]{0,4500})/) ||
    html.match(/"videoId":"([A-Za-z0-9_-]{11})"([\s\S]{0,4500})/);

  if (!videoMatch?.[1]) return null;

  const videoId = videoMatch[1];
  const snippet = videoMatch[2] || "";
  const titleMatch =
    snippet.match(/"title":\{"runs":\[\{"text":"([^"]+)"/) ||
    snippet.match(/"title":\{"simpleText":"([^"]+)"/);
  const publishedLabelMatch = snippet.match(/"publishedTimeText":\{"simpleText":"([^"]+)"/);

  return {
    title: titleMatch?.[1] ? decodeJsonString(titleMatch[1]) : "Latest teaching",
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    published: "",
    publishedLabel: publishedLabelMatch?.[1] ? decodeJsonString(publishedLabelMatch[1]) : "",
    source: "channel",
  };
}

function getFeaturedVideo(settings: YouTubeSettings): LatestTeaching | null {
  const videoId = settings.featuredVideo?.videoId;
  if (!videoId) return null;

  return videoFromId(
    videoId,
    settings.featuredVideo?.title || "Latest teaching",
    settings.featuredVideo?.publishedLabel || "Featured teaching",
  );
}

function teachingFromFeedEntry(entry: any): LatestTeaching | null {
  const videoId = entry?.videoId;
  const title = typeof entry?.title === "string" ? entry.title : "Latest teaching";
  const published = entry?.published || entry?.updated || "";
  const link = asFirst(entry?.link);
  const url = link?.["@_href"] || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");
  const thumbnail =
    asFirst(entry?.group?.thumbnail)?.["@_url"] ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");

  if (!videoId || !url || !thumbnail) return null;

  return { title, videoId, url, thumbnail, published, source: "feed" };
}

export async function getRecentTeachings(settings: YouTubeSettings, limit = 6): Promise<LatestTeaching[]> {
  const feedUrl =
    settings.feedUrl ||
    (settings.channelId ? `https://www.youtube.com/feeds/videos.xml?channel_id=${settings.channelId}` : "");

  if (feedUrl) {
    try {
      const response = await fetch(feedUrl, {
        headers: { Accept: "application/atom+xml, application/xml;q=0.9, text/xml;q=0.8" },
      });

      if (response.ok) {
        const xml = await response.text();
        const parsed = parser.parse(xml);
        const entries = parsed?.feed?.entry ? (Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry]) : [];
        const teachings = entries.map(teachingFromFeedEntry).filter(Boolean).slice(0, limit) as LatestTeaching[];

        if (teachings.length > 0) return teachings;
      }
    } catch {
      // Fall through to the same resilient fallback path used by the latest teaching section.
    }
  }

  const latest = await getLatestTeaching(settings);
  return latest ? [latest] : [];
}

export async function getLatestTeaching(settings: YouTubeSettings): Promise<LatestTeaching | null> {
  const feedUrl =
    settings.feedUrl ||
    (settings.channelId ? `https://www.youtube.com/feeds/videos.xml?channel_id=${settings.channelId}` : "");

  if (!feedUrl) {
    return (await getLatestFromChannelPage(settings)) || getFeaturedVideo(settings);
  }

  try {
    const response = await fetch(feedUrl, {
      headers: { Accept: "application/atom+xml, application/xml;q=0.9, text/xml;q=0.8" },
    });

    if (!response.ok) {
      return (await getLatestFromChannelPage(settings)) || getFeaturedVideo(settings);
    }

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const entry = asFirst(parsed?.feed?.entry);
    if (!entry) {
      return (await getLatestFromChannelPage(settings)) || getFeaturedVideo(settings);
    }

    const teaching = teachingFromFeedEntry(entry);
    if (!teaching) {
      return (await getLatestFromChannelPage(settings)) || getFeaturedVideo(settings);
    }

    return teaching;
  } catch {
    try {
      return (await getLatestFromChannelPage(settings)) || getFeaturedVideo(settings);
    } catch {
      return getFeaturedVideo(settings);
    }
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

export function getYouTubeThumbnailSize(thumbnailUrl: string): ThumbnailSize {
  const fallback = { width: 480, height: 360 };

  try {
    const filename = new URL(thumbnailUrl).pathname.split("/").pop() || "";
    const knownSizes: Record<string, ThumbnailSize> = {
      "maxresdefault.jpg": { width: 1280, height: 720 },
      "sddefault.jpg": { width: 640, height: 480 },
      "hqdefault.jpg": { width: 480, height: 360 },
      "mqdefault.jpg": { width: 320, height: 180 },
      "default.jpg": { width: 120, height: 90 },
    };

    return knownSizes[filename] || fallback;
  } catch {
    return fallback;
  }
}
