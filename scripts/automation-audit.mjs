import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const errors = [];

function readText(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing ${relativePath}.`);
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(label, source, expected) {
  if (!source.includes(expected)) {
    errors.push(`${label} should include ${expected}.`);
  }
}

function checkTeachingPage(relativePath, label) {
  const source = readText(relativePath);

  requireIncludes(label, source, "getRecentTeachings");
  requireIncludes(label, source, "getRecentTeachings(site.youtube, 6)");
  requireIncludes(label, source, "const latest = teachings[0]");
  requireIncludes(label, source, "const recent = teachings.slice(1)");
  requireIncludes(label, source, "recent.map((video)");
  requireIncludes(label, source, "site.youtube.fallbackMessage");
}

const youtubeHelper = readText("src/lib/youtube.ts");
requireIncludes("src/lib/youtube.ts", youtubeHelper, "new XMLParser");
requireIncludes("src/lib/youtube.ts", youtubeHelper, "getRecentTeachings");
requireIncludes("src/lib/youtube.ts", youtubeHelper, "settings.feedUrl");
requireIncludes("src/lib/youtube.ts", youtubeHelper, "entries.map(teachingFromFeedEntry)");
requireIncludes("src/lib/youtube.ts", youtubeHelper, "slice(0, limit)");
requireIncludes("src/lib/youtube.ts", youtubeHelper, "getLatestFromChannelPage(settings)");
requireIncludes("src/lib/youtube.ts", youtubeHelper, "getFeaturedVideo(settings)");

const homepage = readText("src/pages/index.astro");
requireIncludes("src/pages/index.astro", homepage, "getLatestTeaching(site.youtube)");
requireIncludes("src/pages/index.astro", homepage, "<LatestTeaching latest={latestTeaching}");

checkTeachingPage("src/pages/teaching.astro", "src/pages/teaching.astro");
checkTeachingPage("src/pages/sermons.astro", "src/pages/sermons.astro");

const videoSitemap = readText("src/pages/video-sitemap.xml.ts");
requireIncludes("src/pages/video-sitemap.xml.ts", videoSitemap, "getRecentTeachings(site.youtube, 6)");
requireIncludes("src/pages/video-sitemap.xml.ts", videoSitemap, "xmlns:video=\"http://www.google.com/schemas/sitemap-video/1.1\"");
requireIncludes("src/pages/video-sitemap.xml.ts", videoSitemap, "https://www.youtube.com/embed/");

const teachingFeed = readText("src/pages/teaching-feed.xml.ts");
requireIncludes("src/pages/teaching-feed.xml.ts", teachingFeed, "getRecentTeachings(site.youtube, 6)");
requireIncludes("src/pages/teaching-feed.xml.ts", teachingFeed, "application/atom+xml");
requireIncludes("src/pages/teaching-feed.xml.ts", teachingFeed, "xmlns=\"http://www.w3.org/2005/Atom\"");
requireIncludes("src/pages/teaching-feed.xml.ts", teachingFeed, "media:thumbnail");

const baseLayout = readText("src/layouts/BaseLayout.astro");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "teaching-feed.xml");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "application/atom+xml");

const settings = readText("src/content/settings.yaml");
requireIncludes("src/content/settings.yaml", settings, "Staff should only need to upload sermons to YouTube");
requireIncludes("src/content/settings.yaml", settings, "feedUrl: \"https://www.youtube.com/feeds/videos.xml");
requireIncludes("src/content/settings.yaml", settings, "channelVideosUrl:");
requireIncludes("src/content/settings.yaml", settings, "featuredVideo:");
requireIncludes("src/content/settings.yaml", settings, "Only edit the page copy below");

const workflow = readText(".github/workflows/deploy.yml");
requireIncludes(".github/workflows/deploy.yml", workflow, "schedule:");
requireIncludes(".github/workflows/deploy.yml", workflow, "workflow_dispatch:");
requireIncludes(".github/workflows/deploy.yml", workflow, "pnpm build");
requireIncludes(".github/workflows/deploy.yml", workflow, "pnpm automation:audit");

const readme = readText("README.md");
requireIncludes("README.md", readme, "No homepage, teaching page, sermons page, recent-message card, video-sitemap, or teaching-feed edit is needed");
requireIncludes("README.md", readme, "daily so the build-time YouTube feed can refresh");

if (errors.length > 0) {
  console.error("Automation audit failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Automation audit passed: teaching pages are wired to the YouTube feed and daily rebuild workflow.");
