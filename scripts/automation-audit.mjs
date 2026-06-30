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
requireIncludes("src/pages/video-sitemap.xml.ts", videoSitemap, "getTeachingPagePath");
requireIncludes("src/pages/video-sitemap.xml.ts", videoSitemap, "xmlns:video=\"http://www.google.com/schemas/sitemap-video/1.1\"");
requireIncludes("src/pages/video-sitemap.xml.ts", videoSitemap, "https://www.youtube.com/embed/");

const teachingFeed = readText("src/pages/teaching-feed.xml.ts");
requireIncludes("src/pages/teaching-feed.xml.ts", teachingFeed, "getRecentTeachings(site.youtube, 6)");
requireIncludes("src/pages/teaching-feed.xml.ts", teachingFeed, "getTeachingPagePath");
requireIncludes("src/pages/teaching-feed.xml.ts", teachingFeed, "application/atom+xml");
requireIncludes("src/pages/teaching-feed.xml.ts", teachingFeed, "xmlns=\"http://www.w3.org/2005/Atom\"");
requireIncludes("src/pages/teaching-feed.xml.ts", teachingFeed, "media:thumbnail");

const teachingRoute = readText("src/pages/teaching/[slug].astro");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "getRecentTeachings(site.youtube, 6)");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "getTeachingSlug(video)");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "getTeachingEmbedUrl(video)");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "getTeachingVideoSchema(video");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "getYouTubeThumbnailSize(video.thumbnail)");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "image={video.thumbnail}");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "imageAlt={thumbnailAlt}");

const teachingRoutes = readText("src/lib/teaching-routes.ts");
requireIncludes("src/lib/teaching-routes.ts", teachingRoutes, "getTeachingSlug");
requireIncludes("src/lib/teaching-routes.ts", teachingRoutes, "getTeachingPagePath");
requireIncludes("src/lib/teaching-routes.ts", teachingRoutes, "www.youtube-nocookie.com");

const llmsRoute = readText("src/pages/llms.txt.ts");
requireIncludes("src/pages/llms.txt.ts", llmsRoute, "getRecentTeachings(site.youtube, 6)");
requireIncludes("src/pages/llms.txt.ts", llmsRoute, "getTeachingPagePath");
requireIncludes("src/pages/llms.txt.ts", llmsRoute, "getMinistryCalendarPath");
requireIncludes("src/pages/llms.txt.ts", llmsRoute, "site.service.primary");
requireIncludes("src/pages/llms.txt.ts", llmsRoute, "Machine-Readable Resources");
requireIncludes("src/pages/llms.txt.ts", llmsRoute, "AI Usage Notes");
requireIncludes("src/pages/llms.txt.ts", llmsRoute, "text/plain");

const baseLayout = readText("src/layouts/BaseLayout.astro");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "teaching-feed.xml");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "application/atom+xml");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "frame-src https://www.youtube-nocookie.com https://www.youtube.com");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "imageWidth");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "imageHeight");

requireIncludes("src/lib/youtube.ts", youtubeHelper, "getYouTubeThumbnailSize");

const calendarHelper = readText("src/lib/calendar.ts");
requireIncludes("src/lib/calendar.ts", calendarHelper, "getSundayCalendarEvent");
requireIncludes("src/lib/calendar.ts", calendarHelper, "getMinistryCalendarEvent");
requireIncludes("src/lib/calendar.ts", calendarHelper, "getMinistryCalendarPath");
requireIncludes("src/lib/calendar.ts", calendarHelper, "getGoogleCalendarUrl");
requireIncludes("src/lib/calendar.ts", calendarHelper, "buildIcsCalendar");
requireIncludes("src/lib/calendar.ts", calendarHelper, "RRULE:FREQ=WEEKLY;BYDAY=");

const ministryCalendarComponent = readText("src/components/MinistryCalendarLinks.astro");
requireIncludes("src/components/MinistryCalendarLinks.astro", ministryCalendarComponent, "getGoogleCalendarUrl");
requireIncludes("src/components/MinistryCalendarLinks.astro", ministryCalendarComponent, "getMinistryCalendarPath");
requireIncludes("src/components/MinistryCalendarLinks.astro", ministryCalendarComponent, "Apple / Outlook");

const ministryCalendarRoute = readText("src/pages/calendar/[slug].ics.ts");
requireIncludes("src/pages/calendar/[slug].ics.ts", ministryCalendarRoute, "site.ministries.items");
requireIncludes("src/pages/calendar/[slug].ics.ts", ministryCalendarRoute, "getMinistryCalendarEvent");
requireIncludes("src/pages/calendar/[slug].ics.ts", ministryCalendarRoute, "buildIcsCalendar");
requireIncludes("src/pages/calendar/[slug].ics.ts", ministryCalendarRoute, "text/calendar");

const contactBlock = readText("src/components/ChurchContactBlock.astro");
requireIncludes("src/components/ChurchContactBlock.astro", contactBlock, "<address");
requireIncludes("src/components/ChurchContactBlock.astro", contactBlock, "itemprop=\"streetAddress\"");
requireIncludes("src/components/ChurchContactBlock.astro", contactBlock, "itemprop=\"telephone\"");

const schemaHelper = readText("src/lib/schema.ts");
requireIncludes("src/lib/schema.ts", schemaHelper, "getZonedDateParts");
requireIncludes("src/lib/schema.ts", schemaHelper, "site.calendar.sunday.timezone");
requireIncludes("src/lib/schema.ts", schemaHelper, "daysUntil = 7");

const settings = readText("src/content/settings.yaml");
requireIncludes("src/content/settings.yaml", settings, "Staff should only need to upload sermons to YouTube");
requireIncludes("src/content/settings.yaml", settings, "visitDetails:");
requireIncludes("src/content/settings.yaml", settings, "Parking is available near the building");
requireIncludes("src/content/settings.yaml", settings, "generated .ics route");
requireIncludes("src/content/settings.yaml", settings, "Ministries with an event block automatically get structured-data event signals and generated .ics calendar files");
requireIncludes("src/content/settings.yaml", settings, "feedUrl: \"https://www.youtube.com/feeds/videos.xml");
requireIncludes("src/content/settings.yaml", settings, "channelVideosUrl:");
requireIncludes("src/content/settings.yaml", settings, "featuredVideo:");
requireIncludes("src/content/settings.yaml", settings, "Only edit the page copy below");

const workflow = readText(".github/workflows/deploy.yml");
requireIncludes(".github/workflows/deploy.yml", workflow, "schedule:");
requireIncludes(".github/workflows/deploy.yml", workflow, "workflow_dispatch:");
requireIncludes(".github/workflows/deploy.yml", workflow, "pnpm build");
requireIncludes(".github/workflows/deploy.yml", workflow, "pnpm automation:audit");
requireIncludes(".github/workflows/deploy.yml", workflow, "actions/checkout@v7.0.0");
requireIncludes(".github/workflows/deploy.yml", workflow, "pnpm/action-setup@v6.0.9");
requireIncludes(".github/workflows/deploy.yml", workflow, "actions/setup-node@v6.4.0");
requireIncludes(".github/workflows/deploy.yml", workflow, "node-version: 24");
requireIncludes(".github/workflows/deploy.yml", workflow, "actions/configure-pages@v6.0.0");
requireIncludes(".github/workflows/deploy.yml", workflow, "actions/upload-pages-artifact@v5.0.0");
requireIncludes(".github/workflows/deploy.yml", workflow, "actions/deploy-pages@v5.0.0");

const readme = readText("README.md");
requireIncludes("README.md", readme, "No homepage, teaching page, sermons page, recent-message card, individual watch page, video-sitemap, or teaching-feed edit is needed");
requireIncludes("README.md", readme, "update `calendar.sunday` only");
requireIncludes("README.md", readme, "daily so the build-time YouTube feed can refresh");

const generatedCalendar = readText("src/pages/calendar/wayside-sunday-worship.ics.ts");
requireIncludes("src/pages/calendar/wayside-sunday-worship.ics.ts", generatedCalendar, "text/calendar");
requireIncludes("src/pages/calendar/wayside-sunday-worship.ics.ts", generatedCalendar, "getSundayCalendarEvent");
requireIncludes("src/pages/calendar/wayside-sunday-worship.ics.ts", generatedCalendar, "buildIcsCalendar");

const ministriesPage = readText("src/pages/ministries.astro");
requireIncludes("src/pages/ministries.astro", ministriesPage, "MinistryCalendarLinks");

const eventsPage = readText("src/pages/events.astro");
requireIncludes("src/pages/events.astro", eventsPage, "MinistryCalendarLinks");

const generatedContactCard = readText("src/pages/wayside-church.vcf.ts");
requireIncludes("src/pages/wayside-church.vcf.ts", generatedContactCard, "site.contact.addressLine1");
requireIncludes("src/pages/wayside-church.vcf.ts", generatedContactCard, "site.service.primary");
requireIncludes("src/pages/wayside-church.vcf.ts", generatedContactCard, "text/vcard");
requireIncludes("src/pages/wayside-church.vcf.ts", generatedContactCard, "BEGIN:VCARD");

const securityContact = readText("src/pages/.well-known/security.txt.ts");
requireIncludes("src/pages/.well-known/security.txt.ts", securityContact, "Contact:");
requireIncludes("src/pages/.well-known/security.txt.ts", securityContact, "/contact/");
requireIncludes("src/pages/.well-known/security.txt.ts", securityContact, "Canonical:");
requireIncludes("src/pages/.well-known/security.txt.ts", securityContact, "Expires:");
requireIncludes("src/pages/.well-known/security.txt.ts", securityContact, "text/plain");

if (fs.existsSync(path.join(rootDir, "public", "calendar", "wayside-sunday-worship.ics"))) {
  errors.push("Calendar .ics should be generated from settings, not manually maintained in public/calendar.");
}

if (fs.existsSync(path.join(rootDir, "public", "llms.txt"))) {
  errors.push("llms.txt should be generated from settings and YouTube, not manually maintained in public/.");
}

if (errors.length > 0) {
  console.error("Automation audit failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Automation audit passed: teaching pages are wired to the YouTube feed and daily rebuild workflow.");
