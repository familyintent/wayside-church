import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { parse } from "yaml";

const settings = parse(fs.readFileSync(new URL("./src/content/settings.yaml", import.meta.url), "utf8"));
const feedParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  attributeNamePrefix: "@_",
});

function isoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function newestIsoDate(values) {
  const timestamps = values.map((value) => Date.parse(value || "")).filter((value) => !Number.isNaN(value));
  if (timestamps.length === 0) return "";

  return new Date(Math.max(...timestamps)).toISOString();
}

function gitCommitDate() {
  try {
    return isoDate(execSync("git show -s --format=%cI HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
  } catch {
    return isoDate(new Date());
  }
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

let teachingFreshnessPromise;

async function getTeachingFreshness() {
  if (!teachingFreshnessPromise) {
    teachingFreshnessPromise = (async () => {
      const byVideoId = new Map();
      const feedUrl = settings.youtube?.feedUrl;

      if (!feedUrl) return { latest: "", byVideoId };

      try {
        const response = await fetch(feedUrl, {
          headers: {
            Accept: "application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
            "User-Agent": "WaysideChurchSitemap/1.0",
          },
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) return { latest: "", byVideoId };

        const parsed = feedParser.parse(await response.text());
        for (const entry of asArray(parsed?.feed?.entry)) {
          const videoId = entry?.videoId;
          const published = isoDate(entry?.published || entry?.updated || "");
          if (videoId && published) byVideoId.set(videoId, published);
        }
      } catch {
        return { latest: "", byVideoId };
      }

      return { latest: newestIsoDate([...byVideoId.values()]), byVideoId };
    })();
  }

  return teachingFreshnessPromise;
}

function videoIdFromTeachingPath(pathname) {
  return pathname.match(/^\/teaching\/[^/]*-([A-Za-z0-9_-]{11})\/$/)?.[1] || "";
}

const commitLastmod = gitCommitDate();
const teachingDrivenPaths = new Set(["/", "/sermons/", "/sitemap/", "/teaching/"]);

async function getSitemapItem(item) {
  const pathname = new URL(item.url).pathname;
  const teachingFreshness = await getTeachingFreshness();
  const videoId = videoIdFromTeachingPath(pathname);
  const teachingLastmod = videoId
    ? teachingFreshness.byVideoId.get(videoId)
    : teachingDrivenPaths.has(pathname)
      ? teachingFreshness.latest
      : "";

  return {
    ...item,
    lastmod: newestIsoDate([commitLastmod, teachingLastmod]) || commitLastmod,
  };
}

export default defineConfig({
  site: "https://wayside.church",
  base: "/",
  output: "static",
  integrations: [sitemap({ serialize: getSitemapItem })],
});
