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
  requireIncludes(label, source, "getYouTubeThumbnailSize");
  requireIncludes(label, source, "getRecentTeachings(site.youtube, 6)");
  requireIncludes(label, source, "const latest = teachings[0]");
  requireIncludes(label, source, "const recent = teachings.slice(1)");
  requireIncludes(label, source, "const latestThumbnailSize = latest ? getYouTubeThumbnailSize(latest.thumbnail)");
  requireIncludes(label, source, "const recentWithThumbnailSizes = recent.map((video)");
  requireIncludes(label, source, "width={latestThumbnailSize.width}");
  requireIncludes(label, source, "height={latestThumbnailSize.height}");
  requireIncludes(label, source, "recentWithThumbnailSizes.map(({ video, thumbnailSize })");
  requireIncludes(label, source, "width={thumbnailSize.width}");
  requireIncludes(label, source, "height={thumbnailSize.height}");
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

const imageHelper = readText("src/lib/images.ts");
requireIncludes("src/lib/images.ts", imageHelper, "export const imageVariants");
requireIncludes("src/lib/images.ts", imageHelper, "imageSrcset");
requireIncludes("src/lib/images.ts", imageHelper, "imageSizesFor");
requireIncludes("src/lib/images.ts", imageHelper, "withBase(variantPath)");
requireIncludes("src/lib/images.ts", imageHelper, "wayside-local-1x1.webp");
requireIncludes("src/lib/images.ts", imageHelper, "wayside-local-4x3.webp");
requireIncludes("src/lib/images.ts", imageHelper, "wayside-local-16x9.webp");

const homepage = readText("src/pages/index.astro");
requireIncludes("src/pages/index.astro", homepage, "getLatestTeaching(site.youtube)");
requireIncludes("src/pages/index.astro", homepage, "<LatestTeaching latest={latestTeaching}");
requireIncludes("src/pages/index.astro", homepage, "const heroPreload =");
requireIncludes("src/pages/index.astro", homepage, "preloadImages={[heroPreload]}");
requireIncludes("src/pages/index.astro", homepage, "srcset={heroImageSrcset}");
requireIncludes("src/pages/index.astro", homepage, "sizes={heroImageSizes}");
requireIncludes("src/pages/index.astro", homepage, "srcset={communityImageSrcset}");

const latestTeachingComponent = readText("src/components/LatestTeaching.astro");
requireIncludes("src/components/LatestTeaching.astro", latestTeachingComponent, "getLatestTeaching");
requireIncludes("src/components/LatestTeaching.astro", latestTeachingComponent, "getYouTubeThumbnailSize");
requireIncludes("src/components/LatestTeaching.astro", latestTeachingComponent, "const latestThumbnailSize = latest ? getYouTubeThumbnailSize(latest.thumbnail)");
requireIncludes("src/components/LatestTeaching.astro", latestTeachingComponent, "width={latestThumbnailSize.width}");
requireIncludes("src/components/LatestTeaching.astro", latestTeachingComponent, "height={latestThumbnailSize.height}");

checkTeachingPage("src/pages/teaching.astro", "src/pages/teaching.astro");
checkTeachingPage("src/pages/sermons.astro", "src/pages/sermons.astro");

const aboutPage = readText("src/pages/about.astro");
requireIncludes("src/pages/about.astro", aboutPage, "imageSrcset(aboutHero.image)");
requireIncludes("src/pages/about.astro", aboutPage, "sizes={imageSizesFor(\"panel\")}");
requireIncludes("src/pages/about.astro", aboutPage, "sizes={imageSizesFor(\"leader\")}");

const contactPage = readText("src/pages/contact.astro");
requireIncludes("src/pages/contact.astro", contactPage, "charltonImageSrcset");
requireIncludes("src/pages/contact.astro", contactPage, "sizes={imageSizesFor(\"panel\")}");

const ministriesPhotoPage = readText("src/pages/ministries.astro");
requireIncludes("src/pages/ministries.astro", ministriesPhotoPage, "communityImageSrcset");
requireIncludes("src/pages/ministries.astro", ministriesPhotoPage, "sizes={imageSizesFor(\"panel\")}");

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
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "relatedTeachings: teachings.filter");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "relatedWithThumbnailSizes");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "watchPage.relatedTitle");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "getTeachingPagePath(teaching)");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "image={video.thumbnail}");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "imageAlt={thumbnailAlt}");
requireIncludes("src/pages/teaching/[slug].astro", teachingRoute, "breadcrumbLabel={video.title}");

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
requireIncludes("src/pages/llms.txt.ts", llmsRoute, "Entity Facts");
requireIncludes("src/pages/llms.txt.ts", llmsRoute, "Common local name");
requireIncludes("src/pages/llms.txt.ts", llmsRoute, "AI Usage Notes");
requireIncludes("src/pages/llms.txt.ts", llmsRoute, "text/plain");

const baseLayout = readText("src/layouts/BaseLayout.astro");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "teaching-feed.xml");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "application/atom+xml");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "preloadImages.map");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "imagesrcset={preload.srcset}");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "imagesizes={preload.sizes}");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "breadcrumbLabel?: string");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "breadcrumbLabelOverride");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "parentBreadcrumbItems");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "normalizedPathKey.startsWith(\"/teaching/\")");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "frame-src https://www.youtube-nocookie.com https://www.youtube.com");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "imageWidth");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "imageHeight");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "photo: churchPhotoObjects");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "localEntityImageSources");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "keywords: searchTopics");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "alternateName: alternateNames");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "knowsAbout: searchTopics");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "mainEntityOfPage: siteUrl");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "name: \"Mission\"");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "description: site.meta.description");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "isAccessibleForFree: true");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "publicAccess: true");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "availableLanguage: \"English\"");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "openingHours: \"Su 09:00-11:30\"");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "about: { \"@id\": churchId }");
requireIncludes("src/layouts/BaseLayout.astro", baseLayout, "mainEntity: { \"@id\": churchId }");

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
requireIncludes("src/lib/schema.ts", schemaHelper, "dateTimeWithOffset");
requireIncludes("src/lib/schema.ts", schemaHelper, "timeZoneName: \"longOffset\"");
requireIncludes("src/lib/schema.ts", schemaHelper, "site.calendar.sunday.timezone");
requireIncludes("src/lib/schema.ts", schemaHelper, "daysUntil = 7");
requireIncludes("src/lib/schema.ts", schemaHelper, "isAccessibleForFree: true");
requireIncludes("src/lib/schema.ts", schemaHelper, "inLanguage: \"en-US\"");
requireIncludes("src/lib/schema.ts", schemaHelper, "mainEntityOfPage");
requireIncludes("src/lib/schema.ts", schemaHelper, "isFamilyFriendly: true");
requireIncludes("src/lib/schema.ts", schemaHelper, "\"@type\": \"WatchAction\"");

const settings = readText("src/content/settings.yaml");
requireIncludes("src/content/settings.yaml", settings, "Staff should only need to upload sermons to YouTube");
requireIncludes("src/content/settings.yaml", settings, "visitDetails:");
requireIncludes("src/content/settings.yaml", settings, "Parking is available near the building");
requireIncludes("src/content/settings.yaml", settings, "alternateNames:");
requireIncludes("src/content/settings.yaml", settings, "Wayside Church Charlton");
requireIncludes("src/content/settings.yaml", settings, "One real church family");
requireIncludes("src/content/settings.yaml", settings, "sundayPlan:");
requireIncludes("src/content/settings.yaml", settings, "generated .ics route");
requireIncludes("src/content/settings.yaml", settings, "Ministries with an event block automatically get structured-data event signals and generated .ics calendar files");
requireIncludes("src/content/settings.yaml", settings, "feedUrl: \"https://www.youtube.com/feeds/videos.xml");
requireIncludes("src/content/settings.yaml", settings, "channelVideosUrl:");
requireIncludes("src/content/settings.yaml", settings, "featuredVideo:");
requireIncludes("src/content/settings.yaml", settings, "Only edit the page copy below");
requireIncludes("src/content/settings.yaml", settings, "watchPage:");
requireIncludes("src/content/settings.yaml", settings, "The video, title, publish date, thumbnail, and related teaching cards still come from YouTube");
requireIncludes("src/content/settings.yaml", settings, "localEntity:");
requireIncludes("src/content/settings.yaml", settings, "wayside-local-1x1.webp");
requireIncludes("src/content/settings.yaml", settings, "wayside-local-4x3.webp");
requireIncludes("src/content/settings.yaml", settings, "wayside-local-16x9.webp");

const workflow = readText(".github/workflows/deploy.yml");
requireIncludes(".github/workflows/deploy.yml", workflow, "schedule:");
requireIncludes(".github/workflows/deploy.yml", workflow, "workflow_dispatch:");
requireIncludes(".github/workflows/deploy.yml", workflow, "pnpm build");
requireIncludes(".github/workflows/deploy.yml", workflow, "pnpm automation:audit");
requireIncludes(".github/workflows/deploy.yml", workflow, "pnpm performance:audit");
requireIncludes(".github/workflows/deploy.yml", workflow, "actions/checkout@v7.0.0");
requireIncludes(".github/workflows/deploy.yml", workflow, "pnpm/action-setup@v6.0.9");
requireIncludes(".github/workflows/deploy.yml", workflow, "actions/setup-node@v6.4.0");
requireIncludes(".github/workflows/deploy.yml", workflow, "node-version: 24");
requireIncludes(".github/workflows/deploy.yml", workflow, "actions/configure-pages@v6.0.0");
requireIncludes(".github/workflows/deploy.yml", workflow, "actions/upload-pages-artifact@v5.0.0");
requireIncludes(".github/workflows/deploy.yml", workflow, "include-hidden-files: true");
requireIncludes(".github/workflows/deploy.yml", workflow, "actions/deploy-pages@v5.0.0");

const astroConfig = readText("astro.config.mjs");
requireIncludes("astro.config.mjs", astroConfig, "serialize: getSitemapItem");
requireIncludes("astro.config.mjs", astroConfig, "git show -s --format=%cI HEAD");
requireIncludes("astro.config.mjs", astroConfig, "getTeachingFreshness");
requireIncludes("astro.config.mjs", astroConfig, "lastmod: newestIsoDate");
requireIncludes("astro.config.mjs", astroConfig, "XMLParser");

const readme = readText("README.md");
requireIncludes("README.md", readme, "No homepage, teaching page, sermons page, recent-message card, individual watch page, related-teaching card, video-sitemap, or teaching-feed edit is needed");
requireIncludes("README.md", readme, "update `calendar.sunday` only");
requireIncludes("README.md", readme, "daily so the build-time YouTube feed can refresh");
requireIncludes("README.md", readme, "pnpm performance:audit");
requireIncludes("README.md", readme, "XML sitemap `lastmod`");

const packageJson = readText("package.json");
requireIncludes("package.json", packageJson, "\"performance:audit\": \"node scripts/performance-audit.mjs\"");
requireIncludes("package.json", packageJson, "pnpm performance:audit");

const performanceAudit = readText("scripts/performance-audit.mjs");
requireIncludes("scripts/performance-audit.mjs", performanceAudit, "Homepage should preload the hero image");
requireIncludes("scripts/performance-audit.mjs", performanceAudit, "fetchpriority=\"high\"");
requireIncludes("scripts/performance-audit.mjs", performanceAudit, "wayside-welcome-hero-640.webp 640w");
requireIncludes("scripts/performance-audit.mjs", performanceAudit, "Content-Security-Policy");
requireIncludes("scripts/performance-audit.mjs", performanceAudit, "unexpected external script");
requireIncludes("scripts/performance-audit.mjs", performanceAudit, "Total deployed image assets");

const liveSeoCheck = readText("scripts/live-seo-check.mjs");
requireIncludes("scripts/live-seo-check.mjs", liveSeoCheck, "checkLiveEventSchemas");
requireIncludes("scripts/live-seo-check.mjs", liveSeoCheck, "hasTimeZoneOffset");
requireIncludes("scripts/live-seo-check.mjs", liveSeoCheck, "Event schema should mark church gatherings as accessible for free");

const generatedCalendar = readText("src/pages/calendar/wayside-sunday-worship.ics.ts");
requireIncludes("src/pages/calendar/wayside-sunday-worship.ics.ts", generatedCalendar, "text/calendar");
requireIncludes("src/pages/calendar/wayside-sunday-worship.ics.ts", generatedCalendar, "getSundayCalendarEvent");
requireIncludes("src/pages/calendar/wayside-sunday-worship.ics.ts", generatedCalendar, "buildIcsCalendar");

const ministriesPage = readText("src/pages/ministries.astro");
requireIncludes("src/pages/ministries.astro", ministriesPage, "MinistryCalendarLinks");

const eventsPage = readText("src/pages/events.astro");
requireIncludes("src/pages/events.astro", eventsPage, "MinistryCalendarLinks");

const nearbyPage = readText("src/pages/nearby-communities.astro");
requireIncludes("src/pages/nearby-communities.astro", nearbyPage, "nearby.localNote");
requireIncludes("src/pages/nearby-communities.astro", nearbyPage, "nearby-communities__plan");
requireIncludes("src/pages/nearby-communities.astro", nearbyPage, "potentialAction");
requireIncludes("src/pages/nearby-communities.astro", nearbyPage, "town.directionsHref");

const imageSitemapRoute = readText("src/pages/image-sitemap.xml.ts");
requireIncludes("src/pages/image-sitemap.xml.ts", imageSitemapRoute, "site.images.localEntity");

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

const noJekyll = readText("public/.nojekyll");
requireIncludes("public/.nojekyll", noJekyll, ".well-known/security.txt");

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

console.log("Automation audit passed: teaching pages are wired to the YouTube feed, responsive images, and daily rebuild workflow.");
