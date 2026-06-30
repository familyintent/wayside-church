import fs from "node:fs";
import path from "node:path";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const sitemapIndexPath = path.join(distDir, "sitemap-index.xml");
const siteUrl = "https://wayside.church";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
});

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function newestLastmod(entries) {
  const timestamps = entries
    .map((entry) => Date.parse(entry.lastmod || ""))
    .filter((timestamp) => !Number.isNaN(timestamp));

  if (timestamps.length === 0) return new Date().toISOString();

  return new Date(Math.max(...timestamps)).toISOString();
}

if (!fs.existsSync(sitemapIndexPath)) {
  throw new Error("dist/sitemap-index.xml is missing. Run astro build before extending the sitemap index.");
}

const parsed = parser.parse(fs.readFileSync(sitemapIndexPath, "utf8"));
const existingEntries = asArray(parsed?.sitemapindex?.sitemap).map((entry) => ({
  loc: entry.loc,
  lastmod: entry.lastmod,
}));
const defaultLastmod = newestLastmod(existingEntries);
const requiredEntries = [
  { loc: `${siteUrl}/image-sitemap.xml`, lastmod: defaultLastmod, filePath: path.join(distDir, "image-sitemap.xml") },
  { loc: `${siteUrl}/video-sitemap.xml`, lastmod: defaultLastmod, filePath: path.join(distDir, "video-sitemap.xml") },
];
const entriesByLoc = new Map(existingEntries.filter((entry) => entry.loc).map((entry) => [entry.loc, entry]));

for (const entry of requiredEntries) {
  if (!fs.existsSync(entry.filePath)) continue;
  entriesByLoc.set(entry.loc, {
    loc: entry.loc,
    lastmod: entry.lastmod,
  });
}

const sitemapindex = {
  "@_xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
  sitemap: [...entriesByLoc.values()],
};

fs.writeFileSync(sitemapIndexPath, `<?xml version="1.0" encoding="UTF-8"?>${builder.build({ sitemapindex })}\n`);
