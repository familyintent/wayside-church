const siteUrl = process.env.LIVE_SEO_SITE_URL || "https://wayside.church";
const rootUrl = new URL("/", siteUrl).toString();
const siteHost = new URL(siteUrl).host;
const teachingFeedUrl = new URL("/teaching-feed.xml", rootUrl).toString();
const errors = [];
const warnings = [];
const expectedImageSizes = new Map([
  ["/images/wayside-welcome-hero.webp", { width: 1717, height: 916 }],
  ["/images/wayside-community.webp", { width: 1400, height: 1855 }],
  ["/images/charlton.webp", { width: 852, height: 1080 }],
  ["/images/chase-mendoza.webp", { width: 629, height: 549 }],
  ["/images/owen-rushing.webp", { width: 900, height: 1350 }],
  ["/images/wayside-social-card.jpg", { width: 1200, height: 630 }],
]);

function reportError(message) {
  errors.push(message);
}

function reportWarning(message) {
  warnings.push(message);
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].trim());
}

function extractImageLocs(xml) {
  return [...xml.matchAll(/<image:loc>(.*?)<\/image:loc>/g)].map((match) => match[1].trim());
}

function extractVideoPlayerLocs(xml) {
  return [...xml.matchAll(/<video:player_loc(?:\s[^>]*)?>(.*?)<\/video:player_loc>/g)].map((match) => match[1].trim());
}

function extractVideoThumbnailLocs(xml) {
  return [...xml.matchAll(/<video:thumbnail_loc>(.*?)<\/video:thumbnail_loc>/g)].map((match) => match[1].trim());
}

function extractVideoTitles(xml) {
  return [...xml.matchAll(/<video:title>([\s\S]*?)<\/video:title>/g)].map((match) => match[1].trim());
}

function extractVideoDescriptions(xml) {
  return [...xml.matchAll(/<video:description>([\s\S]*?)<\/video:description>/g)].map((match) => match[1].trim());
}

function extractAtomEntries(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1].trim());
}

function extractJsonLd(html) {
  return [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) =>
    match[1].trim(),
  );
}

function extractUrls(html, attributeName) {
  return [...html.matchAll(new RegExp(`\\s${attributeName}=["']([^"']+)["']`, "gi"))].map((match) => match[1]);
}

function textContent(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAnchors(html) {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: match[1],
    text: textContent(match[2]),
  }));
}

function countMatches(value, regex) {
  return [...value.matchAll(regex)].length;
}

function getMetaContent(html, name) {
  const regex = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i");
  return html.match(regex)?.[1] || "";
}

function getLinkHref(html, rel) {
  const regex = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']+)["'][^>]*>`, "i");
  return html.match(regex)?.[1] || "";
}

function getMetaPropertyContent(html, property) {
  const regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i");
  return html.match(regex)?.[1] || "";
}

function textIncludes(value, expected) {
  return JSON.stringify(value || "").toLowerCase().includes(expected.toLowerCase());
}

function collectSchemasByType(schema, type, acc = []) {
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    const nodeTypes = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]].filter(Boolean);
    if (nodeTypes.includes(type)) acc.push(node);

    Object.values(node).forEach(visit);
  };

  visit(schema);
  return acc;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    redirect: options.redirect || "follow",
    headers: {
      Accept: options.accept || "text/html,application/xhtml+xml,application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8",
      "User-Agent": "WaysideChurchLiveSeoCheck/1.0",
    },
  });

  const text = await response.text();
  return { response, text };
}

async function checkRedirect(sourceUrl, expectedLocation) {
  const { response } = await fetchText(sourceUrl, { redirect: "manual" });
  const location = response.headers.get("location") || "";

  if (![301, 308].includes(response.status)) {
    reportError(`${sourceUrl} should redirect permanently, got ${response.status}.`);
    return;
  }

  if (location !== expectedLocation) {
    reportError(`${sourceUrl} redirects to ${location || "(no location)"}, expected ${expectedLocation}.`);
  }
}

async function checkDomainCanonicalization() {
  const { response } = await fetchText(rootUrl, { redirect: "manual" });
  if (response.status !== 200) reportError(`${rootUrl} should return 200, got ${response.status}.`);

  await checkRedirect("https://www.wayside.church/", rootUrl);
  await checkRedirect("http://wayside.church/", rootUrl);
  await checkRedirect("http://www.wayside.church/", rootUrl);
}

async function getSitemapUrls() {
  const sitemapIndexUrl = new URL("/sitemap-index.xml", rootUrl).toString();
  const { response, text } = await fetchText(sitemapIndexUrl, { accept: "application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8" });

  if (!response.ok) {
    reportError(`${sitemapIndexUrl} should be fetchable, got ${response.status}.`);
    return [];
  }

  const childSitemapUrls = extractLocs(text).filter((url) => url.endsWith(".xml"));
  if (childSitemapUrls.length === 0) return extractLocs(text);

  const childUrlSets = await Promise.all(
    childSitemapUrls.map(async (url) => {
      const child = await fetchText(url, { accept: "application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8" });
      if (!child.response.ok) {
        reportError(`${url} should be fetchable, got ${child.response.status}.`);
        return [];
      }
      return extractLocs(child.text);
    }),
  );

  return childUrlSets.flat();
}

async function checkRobots() {
  const robotsUrl = new URL("/robots.txt", rootUrl).toString();
  const { response, text } = await fetchText(robotsUrl, { accept: "text/plain,*/*;q=0.8" });

  if (!response.ok) {
    reportError(`${robotsUrl} should be fetchable, got ${response.status}.`);
    return;
  }

  if (!text.includes(`${rootUrl}sitemap-index.xml`)) {
    reportError("robots.txt should reference the production sitemap-index.xml.");
  }

  if (!text.includes(`${rootUrl}image-sitemap.xml`)) {
    reportError("robots.txt should reference the production image-sitemap.xml.");
  }

  if (!text.includes(`${rootUrl}video-sitemap.xml`)) {
    reportError("robots.txt should reference the production video-sitemap.xml.");
  }
}

async function checkImageSitemap(sitemapUrls) {
  const imageSitemapUrl = new URL("/image-sitemap.xml", rootUrl).toString();
  const { response, text } = await fetchText(imageSitemapUrl, { accept: "application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8" });

  if (!response.ok) {
    reportError(`${imageSitemapUrl} should be fetchable, got ${response.status}.`);
    return;
  }

  const imagePageUrls = extractLocs(text);
  const imageUrls = extractImageLocs(text);

  if (!text.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')) {
    reportError("image-sitemap.xml is missing the Google image sitemap namespace.");
  }
  if (imagePageUrls.length < 10) {
    reportError(`image-sitemap.xml should include key visual pages, found ${imagePageUrls.length}.`);
  }
  if (imageUrls.length < 12) {
    reportError(`image-sitemap.xml should include representative local images, found ${imageUrls.length}.`);
  }

  for (const imagePageUrl of imagePageUrls) {
    if (!sitemapUrls.includes(imagePageUrl)) {
      reportError(`image-sitemap.xml page URL is missing from the XML sitemap: ${imagePageUrl}.`);
    }
  }

  for (const imageUrl of imageUrls) {
    try {
      const url = new URL(imageUrl);
      if (url.host !== siteHost) reportError(`image-sitemap.xml image URL should use ${siteHost}: ${imageUrl}.`);
      if (!url.pathname.startsWith("/images/")) reportError(`image-sitemap.xml image should use a local /images/ asset: ${imageUrl}.`);
    } catch {
      reportError(`image-sitemap.xml contains invalid image URL: ${imageUrl}.`);
    }
  }
}

async function checkVideoSitemap(sitemapUrls) {
  const videoSitemapUrl = new URL("/video-sitemap.xml", rootUrl).toString();
  const { response, text } = await fetchText(videoSitemapUrl, { accept: "application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8" });

  if (!response.ok) {
    reportError(`${videoSitemapUrl} should be fetchable, got ${response.status}.`);
    return;
  }

  const videoPageUrls = extractLocs(text);
  const videoPlayerUrls = extractVideoPlayerLocs(text);
  const videoThumbnailUrls = extractVideoThumbnailLocs(text);
  const videoTitles = extractVideoTitles(text);
  const videoDescriptions = extractVideoDescriptions(text);

  if (!text.includes('xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"')) {
    reportError("video-sitemap.xml is missing the Google video sitemap namespace.");
  }
  if (!videoPageUrls.includes(new URL("/teaching/", rootUrl).toString())) {
    reportError("video-sitemap.xml should include /teaching/.");
  }
  if (!videoPageUrls.includes(new URL("/sermons/", rootUrl).toString())) {
    reportError("video-sitemap.xml should include /sermons/.");
  }
  const dedicatedVideoPageUrls = videoPageUrls.filter((url) => {
    try {
      const pathname = new URL(url).pathname;
      return pathname.startsWith("/teaching/") && pathname !== "/teaching/";
    } catch {
      return false;
    }
  });
  if (dedicatedVideoPageUrls.length < 3) {
    reportError(`video-sitemap.xml should include generated individual teaching watch pages, found ${dedicatedVideoPageUrls.length}.`);
  }
  if (videoPlayerUrls.length < 3) {
    reportError(`video-sitemap.xml should include multiple YouTube player URLs, found ${videoPlayerUrls.length}.`);
  }
  if (videoThumbnailUrls.length < 3) {
    reportError(`video-sitemap.xml should include multiple YouTube thumbnail URLs, found ${videoThumbnailUrls.length}.`);
  }
  if (videoTitles.some((title) => title.length === 0 || title.length > 100)) {
    reportError("video-sitemap.xml video titles should be present and 100 characters or fewer.");
  }
  if (videoDescriptions.some((description) => description.length === 0 || description.length > 2048)) {
    reportError("video-sitemap.xml video descriptions should be present and 2048 characters or fewer.");
  }

  for (const videoPageUrl of videoPageUrls) {
    if (!sitemapUrls.includes(videoPageUrl)) {
      reportError(`video-sitemap.xml page URL is missing from the XML sitemap: ${videoPageUrl}.`);
    }
  }

  for (const playerUrl of videoPlayerUrls) {
    try {
      const url = new URL(playerUrl);
      if (url.host !== "www.youtube.com" || !url.pathname.startsWith("/embed/")) {
        reportError(`video-sitemap.xml player should use a YouTube embed URL: ${playerUrl}.`);
      }
    } catch {
      reportError(`video-sitemap.xml contains invalid player URL: ${playerUrl}.`);
    }
  }

  for (const thumbnailUrl of videoThumbnailUrls) {
    try {
      const url = new URL(thumbnailUrl);
      if (!url.host.endsWith("ytimg.com")) reportError(`video-sitemap.xml thumbnail should use a YouTube thumbnail URL: ${thumbnailUrl}.`);
    } catch {
      reportError(`video-sitemap.xml contains invalid thumbnail URL: ${thumbnailUrl}.`);
    }
  }

  for (const videoPageUrl of dedicatedVideoPageUrls.slice(0, 3)) {
    const { response: watchResponse, text: watchText } = await fetchText(videoPageUrl);

    if (!watchResponse.ok) {
      reportError(`${videoPageUrl} should be fetchable, got ${watchResponse.status}.`);
      continue;
    }
    if (!watchText.includes("www.youtube-nocookie.com/embed/")) {
      reportError(`${videoPageUrl} should embed YouTube using the privacy-enhanced domain.`);
    }
    if (!watchText.includes('"@type":"VideoObject"')) {
      reportError(`${videoPageUrl} should include VideoObject schema.`);
    }
    if (!watchText.includes("Plan a Visit")) {
      reportError(`${videoPageUrl} should include a visitor next step.`);
    }
    if (!watchText.includes("frame-src https://www.youtube-nocookie.com https://www.youtube.com")) {
      reportError(`${videoPageUrl} CSP should allow only the expected YouTube frame hosts.`);
    }
  }
}

async function checkTeachingFeed() {
  const { response, text } = await fetchText(teachingFeedUrl, {
    accept: "application/atom+xml,application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8",
  });

  if (!response.ok) {
    reportError(`${teachingFeedUrl} should be fetchable, got ${response.status}.`);
    return;
  }

  const entries = extractAtomEntries(text);

  if (!text.includes('xmlns="http://www.w3.org/2005/Atom"')) {
    reportError("teaching-feed.xml is missing the Atom namespace.");
  }
  if (!text.includes('xmlns:media="http://search.yahoo.com/mrss/"')) {
    reportError("teaching-feed.xml is missing the Media RSS namespace.");
  }
  if (!text.includes(`<link href="${teachingFeedUrl}" rel="self" type="application/atom+xml" />`)) {
    reportError("teaching-feed.xml is missing its self link.");
  }
  if (!text.includes(`<link href="${new URL("/teaching/", rootUrl).toString()}" rel="alternate" type="text/html" />`)) {
    reportError("teaching-feed.xml should point readers to /teaching/.");
  }
  if (entries.length < 3) {
    reportError(`teaching-feed.xml should include multiple recent YouTube entries, found ${entries.length}.`);
  }
  if (entries.some((entry) => !/https:\/\/www\.youtube\.com\/(?:watch\?v=|shorts\/)/.test(entry))) {
    reportError("teaching-feed.xml entries should link to YouTube videos or Shorts.");
  }
  if (entries.some((entry) => !entry.includes("<media:thumbnail url=\"https://"))) {
    reportError("teaching-feed.xml entries should include video thumbnails.");
  }
}

async function checkLiveLlms() {
  const llmsUrl = new URL("/llms.txt", rootUrl).toString();
  const { response, text } = await fetchText(llmsUrl, {
    accept: "text/plain,*/*;q=0.8",
  });

  if (!response.ok) {
    reportError(`${llmsUrl} should be fetchable, got ${response.status}.`);
    return;
  }

  for (const expected of [
    "# Wayside Church",
    "Address: 6 Haggerty Rd, Charlton, MA 01507",
    "Sunday Worship: Sunday at 10:00 AM",
    "Coffee and Discipleship: Sunday at 9:00 AM",
    "## Key Pages",
    "## Recent Teaching",
    "## Machine-Readable Resources",
    new URL("/video-sitemap.xml", rootUrl).toString(),
    new URL("/wayside-church.vcf", rootUrl).toString(),
    "## AI Usage Notes",
  ]) {
    if (!text.includes(expected)) {
      reportError(`Generated llms.txt is missing ${expected}.`);
    }
  }
  if (!/https:\/\/wayside\.church\/teaching\/[^/\s]+-[A-Za-z0-9_-]{11}\//.test(text)) {
    reportError("Generated llms.txt should include at least one generated teaching watch page URL.");
  }
}

async function checkSundayCalendarFile() {
  const calendarUrl = new URL("/calendar/wayside-sunday-worship.ics", rootUrl).toString();
  const { response, text } = await fetchText(calendarUrl, {
    accept: "text/calendar,text/plain;q=0.9,*/*;q=0.8",
  });

  if (!response.ok) {
    reportError(`${calendarUrl} should be fetchable, got ${response.status}.`);
    return;
  }

  for (const expected of [
    "BEGIN:VCALENDAR",
    "SUMMARY:Wayside Church Sunday Worship",
    "DTSTART;TZID=America/New_York:20260705T100000",
    "DTEND;TZID=America/New_York:20260705T113000",
    "RRULE:FREQ=WEEKLY;BYDAY=SU",
    "LOCATION:6 Haggerty Rd\\, Charlton\\, MA 01507",
    "URL:https://wayside.church/",
  ]) {
    if (!text.includes(expected)) {
      reportError(`Generated Sunday Worship calendar is missing ${expected}.`);
    }
  }
}

async function checkMinistryCalendarFiles() {
  const expectedCalendars = [
    {
      path: "/calendar/coffee-and-discipleship.ics",
      summary: "SUMMARY:Coffee and Discipleship at Wayside Church",
      start: "DTSTART;TZID=America/New_York:20260705T090000",
      end: "DTEND;TZID=America/New_York:20260705T094500",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SU",
      url: `${rootUrl}ministries/#coffee-and-discipleship`,
    },
    {
      path: "/calendar/little-disciples.ics",
      summary: "SUMMARY:Little Disciples at Wayside Church",
      start: "DTSTART;TZID=America/New_York:20260705T100000",
      end: "DTEND;TZID=America/New_York:20260705T113000",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SU",
      url: `${rootUrl}ministries/#little-disciples`,
    },
    {
      path: "/calendar/newlife-youth-ministry.ics",
      summary: "SUMMARY:NewLife Youth Ministry at Wayside Church",
      start: "DTSTART;TZID=America/New_York:20260705T100000",
      end: "DTEND;TZID=America/New_York:20260705T113000",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SU",
      url: `${rootUrl}ministries/#newlife-youth-ministry`,
    },
    {
      path: "/calendar/identity-groups.ics",
      summary: "SUMMARY:Identity Groups at Wayside Church",
      start: "DTSTART;TZID=America/New_York:20260708T180000",
      end: "DTEND;TZID=America/New_York:20260708T193000",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=WE",
      url: `${rootUrl}ministries/#identity-groups`,
    },
  ];

  for (const expectedCalendar of expectedCalendars) {
    const calendarUrl = new URL(expectedCalendar.path, rootUrl).toString();
    const { response, text } = await fetchText(calendarUrl, {
      accept: "text/calendar,text/plain;q=0.9,*/*;q=0.8",
    });

    if (!response.ok) {
      reportError(`${calendarUrl} should be fetchable, got ${response.status}.`);
      continue;
    }

    for (const expected of [
      "BEGIN:VCALENDAR",
      expectedCalendar.summary,
      expectedCalendar.start,
      expectedCalendar.end,
      expectedCalendar.recurrence,
      "LOCATION:6 Haggerty Rd\\, Charlton\\, MA 01507",
      `URL:${expectedCalendar.url}`,
    ]) {
      if (!text.includes(expected)) {
        reportError(`Generated ministry calendar ${expectedCalendar.path} is missing ${expected}.`);
      }
    }
  }
}

async function checkChurchContactCard() {
  const contactCardUrl = new URL("/wayside-church.vcf", rootUrl).toString();
  const { response, text } = await fetchText(contactCardUrl, {
    accept: "text/vcard,text/plain;q=0.9,*/*;q=0.8",
  });

  if (!response.ok) {
    reportError(`${contactCardUrl} should be fetchable, got ${response.status}.`);
    return;
  }

  for (const expected of [
    "BEGIN:VCARD",
    "FN:Wayside Church",
    "TEL;TYPE=WORK,VOICE:+15084340401",
    "ADR;TYPE=WORK:;;6 Haggerty Rd;Charlton;MA;01507;US",
    "URL:https://wayside.church/",
    "Sunday Worship: Sunday at 10:00 AM",
    "Coffee and Discipleship: Sunday at 9:00 AM",
  ]) {
    if (!text.includes(expected)) {
      reportError(`Generated contact card is missing ${expected}.`);
    }
  }
}

async function checkHomepageSchema(homeHtml) {
  const jsonLdBlocks = extractJsonLd(homeHtml);
  const parsedSchemas = [];

  for (const block of jsonLdBlocks) {
    try {
      parsedSchemas.push(JSON.parse(block));
    } catch (error) {
      reportError(`Homepage has invalid JSON-LD: ${error.message}`);
    }
  }

  const churchSchema = parsedSchemas.flatMap((schema) => collectSchemasByType(schema, "Church"))[0];
  const webSiteSchema = parsedSchemas.flatMap((schema) => collectSchemasByType(schema, "WebSite"))[0];
  const siteNavigationSchemas = parsedSchemas.flatMap((schema) => collectSchemasByType(schema, "SiteNavigationElement"));
  const pageSchema = parsedSchemas.flatMap((schema) => collectSchemasByType(schema, "WebPage"))[0];

  if (!churchSchema) {
    reportError("Homepage missing Church schema.");
    return;
  }

  if (churchSchema.url !== rootUrl) reportError(`Church schema url should be ${rootUrl}.`);
  if (!textIncludes(churchSchema.address, "6 Haggerty Rd")) reportError("Church schema missing street address.");
  if (!textIncludes(churchSchema.address, "Charlton")) reportError("Church schema missing Charlton locality.");
  if (!textIncludes(churchSchema.telephone, "+15084340401")) reportError("Church schema missing canonical phone number.");
  if (!textIncludes(churchSchema.hasMap, "google.com/maps")) reportError("Church schema missing Google Maps profile.");

  for (const profile of ["facebook.com", "youtube.com", "google.com/maps"]) {
    if (!textIncludes(churchSchema.sameAs, profile)) reportError(`Church schema sameAs missing ${profile}.`);
  }

  for (const community of ["Charlton", "Dudley", "Oxford", "Sturbridge", "Southbridge", "Worcester County"]) {
    if (!textIncludes(churchSchema.areaServed, community)) reportError(`Church schema areaServed missing ${community}.`);
  }

  if (!textIncludes(churchSchema.openingHoursSpecification, "09:00") || !textIncludes(churchSchema.openingHoursSpecification, "11:30")) {
    reportError("Church schema opening hours should cover Coffee and Discipleship through worship.");
  }
  if (!textIncludes(churchSchema.amenityFeature, "Parking available")) {
    reportError("Church schema missing visitor parking amenity feature.");
  }
  if (!textIncludes(churchSchema.additionalProperty, "Accessibility questions")) {
    reportError("Church schema missing practical visitor details.");
  }

  if (!webSiteSchema?.keywords || !textIncludes(webSiteSchema.keywords, "Church in Charlton, MA")) {
    reportError("WebSite schema missing local church keywords.");
  }

  for (const navItem of [
    ["Home", rootUrl],
    ["Start Here", new URL("/start-here/", rootUrl).toString()],
    ["Plan a Visit", new URL("/plan-a-visit/", rootUrl).toString()],
    ["Teaching", new URL("/teaching/", rootUrl).toString()],
    ["Ministries", new URL("/ministries/", rootUrl).toString()],
    ["Contact", new URL("/contact/", rootUrl).toString()],
  ]) {
    const [name, url] = navItem;
    if (!siteNavigationSchemas.some((schema) => schema.name === name && schema.url === url)) {
      reportError(`Homepage SiteNavigationElement schema missing ${name}.`);
    }
  }

  if (!textIncludes(pageSchema?.mainEntity, "#church")) {
    reportError("Homepage WebPage schema should point mainEntity to Church schema.");
  }
}

async function checkLivePages(sitemapUrls) {
  const htmlSitemapUrl = new URL("/sitemap/", rootUrl).toString();
  const sitemapUrlSet = new Set(sitemapUrls);
  const internalLinkEdges = [];
  const htmlSitemap = await fetchText(htmlSitemapUrl);
  if (!htmlSitemap.response.ok) {
    reportError(`${htmlSitemapUrl} should be fetchable, got ${htmlSitemap.response.status}.`);
    return;
  }

  const htmlSitemapTargets = new Set(
    extractUrls(htmlSitemap.text, "href")
      .map((href) => {
        try {
          const url = new URL(href, rootUrl);
          if (url.host !== siteHost) return null;
          return new URL(url.pathname, rootUrl).toString();
        } catch {
          return null;
        }
      })
      .filter(Boolean),
  );

  for (const url of sitemapUrls) {
    if (!url.startsWith(rootUrl)) {
      reportError(`Sitemap URL ${url} should use ${rootUrl}.`);
      continue;
    }

    const page = await fetchText(url);
    if (!page.response.ok) {
      reportError(`${url} should be fetchable, got ${page.response.status}.`);
      continue;
    }

    const canonical = getLinkHref(page.text, "canonical");
    if (canonical !== url) reportError(`${url} canonical is ${canonical || "(missing)"}.`);

    const robots = getMetaContent(page.text, "robots");
    if (!robots.includes("index")) reportError(`${url} should be indexable, robots=${robots || "(missing)"}.`);

    const ogImage = getMetaPropertyContent(page.text, "og:image");
    const ogImageWidth = Number(getMetaPropertyContent(page.text, "og:image:width") || 0);
    const ogImageHeight = Number(getMetaPropertyContent(page.text, "og:image:height") || 0);
    if (ogImage) {
      const ogImagePath = new URL(ogImage, rootUrl).pathname;
      const expectedImageSize = expectedImageSizes.get(ogImagePath);
      if (expectedImageSize && (ogImageWidth !== expectedImageSize.width || ogImageHeight !== expectedImageSize.height)) {
        reportError(
          `${url} og:image dimensions are ${ogImageWidth}x${ogImageHeight}, expected ${expectedImageSize.width}x${expectedImageSize.height}.`,
        );
      }
    }

    const pathname = new URL(url).pathname;
    if (!htmlSitemapTargets.has(new URL(pathname, rootUrl).toString())) {
      reportError(`/sitemap/ missing link to ${url}.`);
    }

    for (const anchor of extractAnchors(page.text)) {
      try {
        const targetUrl = new URL(anchor.href, rootUrl);
        if (targetUrl.host !== siteHost) continue;

        const targetPath = targetUrl.pathname === "/" ? "/" : targetUrl.pathname.endsWith("/") ? targetUrl.pathname : `${targetUrl.pathname}/`;
        const normalizedTargetUrl = new URL(targetPath, rootUrl).toString();
        if (!sitemapUrlSet.has(normalizedTargetUrl)) continue;

        internalLinkEdges.push({
          from: url,
          target: normalizedTargetUrl,
          text: anchor.text,
        });
      } catch {
        // Broken internal URLs are covered by the local build audit.
      }
    }
  }

  const inboundCounts = new Map(sitemapUrls.map((url) => [url, 0]));
  for (const edge of internalLinkEdges) {
    if (edge.from === edge.target || edge.from === htmlSitemapUrl) continue;
    inboundCounts.set(edge.target, (inboundCounts.get(edge.target) || 0) + 1);
  }

  for (const url of sitemapUrls) {
    if (url === rootUrl) continue;

    if ((inboundCounts.get(url) || 0) === 0) {
      reportError(`${url} has no non-sitemap internal links on the live site.`);
    }
  }
}

async function checkLiveTeachingPages() {
  for (const pathname of ["/teaching/", "/sermons/"]) {
    const url = new URL(pathname, rootUrl).toString();
    const { response, text } = await fetchText(url);

    if (!response.ok) {
      reportError(`${url} should be fetchable, got ${response.status}.`);
      continue;
    }

    if (!text.includes("Recent messages")) {
      reportError(`${url} should show the recent-message section populated from YouTube.`);
    }
    if (!text.includes('type="application/atom+xml"') || !text.includes(`href="${teachingFeedUrl}"`)) {
      reportError(`${url} should advertise the automated teaching feed in the page head.`);
    }

    const recentTileCount = countMatches(text, /class=["']teaching-tile["']/g);
    if (recentTileCount < 3) {
      reportError(`${url} should include multiple recent YouTube teaching cards, found ${recentTileCount}.`);
    }

    const youtubeVideoLinkCount = countMatches(text, /https:\/\/www\.youtube\.com\/(?:watch\?v=|shorts\/)/g);
    if (youtubeVideoLinkCount < 6) {
      reportError(`${url} should include newest plus recent YouTube links, found ${youtubeVideoLinkCount}.`);
    }

    const videoObjectCount = countMatches(text, /"@type":"VideoObject"/g);
    if (videoObjectCount < 6) {
      reportError(`${url} should include VideoObject schema for recent YouTube uploads, found ${videoObjectCount}.`);
    }
  }
}

async function checkLiveVisitorDetails() {
  for (const pathname of ["/plan-a-visit/", "/directions/"]) {
    const url = new URL(pathname, rootUrl).toString();
    const { response, text } = await fetchText(url);

    if (!response.ok) {
      reportError(`${url} should be fetchable, got ${response.status}.`);
      continue;
    }

    if (!text.includes("Sunday made practical")) {
      reportError(`${url} should include practical Sunday visitor details.`);
    }
    if (!text.includes("Parking is available near the building")) {
      reportError(`${url} should include parking guidance for visitors.`);
    }
    if (!text.includes("Accessibility questions")) {
      reportError(`${url} should include accessibility question guidance for visitors.`);
    }
  }
}

async function checkLiveSemanticContactBlocks() {
  for (const pathname of ["/", "/contact/", "/directions/", "/church-in-charlton-ma/"]) {
    const url = new URL(pathname, rootUrl).toString();
    const { response, text } = await fetchText(url);

    if (!response.ok) {
      reportError(`${url} should be fetchable, got ${response.status}.`);
      continue;
    }

    if (!text.includes("<address") || !text.includes("church-contact-block")) {
      reportError(`${url} should include a semantic church address block.`);
    }
    if (!text.includes('itemprop="streetAddress"') || !text.includes('itemprop="telephone"')) {
      reportError(`${url} church address block should expose street address and phone microdata.`);
    }
  }

  for (const pathname of ["/contact/", "/directions/"]) {
    const url = new URL(pathname, rootUrl).toString();
    const { response, text } = await fetchText(url);

    if (!response.ok) continue;
    if (!text.includes("/wayside-church.vcf")) {
      reportError(`${url} should link to the generated church contact card.`);
    }
  }
}

async function main() {
  await checkDomainCanonicalization();
  await checkRobots();

  const home = await fetchText(rootUrl);
  if (!home.response.ok) reportError(`${rootUrl} should be fetchable, got ${home.response.status}.`);
  if (home.text.toLowerCase().includes("webflow")) reportWarning("Homepage contains the word webflow; check for stale host/template content.");
  await checkHomepageSchema(home.text);

  const sitemapUrls = await getSitemapUrls();
  if (sitemapUrls.length < 20) reportError(`Expected at least 20 sitemap URLs, found ${sitemapUrls.length}.`);
  if (!sitemapUrls.includes(new URL("/sitemap/", rootUrl).toString())) reportError("XML sitemap should include /sitemap/.");

  await checkImageSitemap(sitemapUrls);
  await checkVideoSitemap(sitemapUrls);
  await checkTeachingFeed();
  await checkLiveLlms();
  await checkSundayCalendarFile();
  await checkMinistryCalendarFiles();
  await checkChurchContactCard();
  await checkLivePages(sitemapUrls);
  await checkLiveTeachingPages();
  await checkLiveVisitorDetails();
  await checkLiveSemanticContactBlocks();

  if (warnings.length > 0) {
    console.warn("Live SEO warnings:");
    warnings.forEach((warning) => console.warn(`- ${warning}`));
  }

  if (errors.length > 0) {
    console.error("Live SEO check failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Live SEO check passed for ${sitemapUrls.length} indexed URL(s).`);
}

main().catch((error) => {
  console.error(`Live SEO check failed: ${error.message}`);
  process.exit(1);
});
