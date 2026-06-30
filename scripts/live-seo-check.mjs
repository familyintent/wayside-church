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
  ["/images/wayside-local-1x1.webp", { width: 1200, height: 1200 }],
  ["/images/wayside-local-4x3.webp", { width: 1200, height: 900 }],
  ["/images/wayside-local-16x9.webp", { width: 1200, height: 675 }],
]);
const responsiveImageVariants = new Map([
  ["/images/wayside-welcome-hero.webp", ["/images/wayside-welcome-hero-640.webp", "/images/wayside-welcome-hero-960.webp", "/images/wayside-welcome-hero-1280.webp"]],
  ["/images/wayside-community.webp", ["/images/wayside-community-420.webp", "/images/wayside-community-700.webp", "/images/wayside-community-960.webp"]],
  ["/images/charlton.webp", ["/images/charlton-420.webp", "/images/charlton-640.webp"]],
  ["/images/chase-mendoza.webp", ["/images/chase-mendoza-320.webp", "/images/chase-mendoza-480.webp"]],
  ["/images/owen-rushing.webp", ["/images/owen-rushing-320.webp", "/images/owen-rushing-640.webp"]],
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

function extractSitemapEntries(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => {
    const entry = match[1];
    return {
      loc: entry.match(/<loc>(.*?)<\/loc>/)?.[1]?.trim() || "",
      lastmod: entry.match(/<lastmod>(.*?)<\/lastmod>/)?.[1]?.trim() || "",
    };
  });
}

function isValidIsoDate(value) {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

function extractImageLocs(xml) {
  return [...xml.matchAll(/<image:loc>(.*?)<\/image:loc>/g)].map((match) => match[1].trim());
}

function extractImageTitles(xml) {
  return [...xml.matchAll(/<image:title>([\s\S]*?)<\/image:title>/g)].map((match) => match[1].trim());
}

function extractImageCaptions(xml) {
  return [...xml.matchAll(/<image:caption>([\s\S]*?)<\/image:caption>/g)].map((match) => match[1].trim());
}

function extractImageGeoLocations(xml) {
  return [...xml.matchAll(/<image:geo_location>([\s\S]*?)<\/image:geo_location>/g)].map((match) => match[1].trim());
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

function childImageAlt(value) {
  const imageAlt = value.match(/<img\b[^>]*\salt=(["'])(.*?)\1[^>]*>/i)?.[2] || "";
  return textContent(imageAlt);
}

function linkName(openingTag, innerHtml) {
  return (
    textContent(innerHtml) ||
    textContent(getTagAttribute(openingTag, "aria-label")) ||
    textContent(getTagAttribute(openingTag, "title")) ||
    childImageAlt(innerHtml)
  );
}

function hasGenericLinkName(value) {
  return /^(click here|here|learn more|read more|more|website|link)$/i.test(value.trim());
}

function extractAnchors(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      const openingTag = match[0].match(/^<a\b[^>]*>/i)?.[0] || "";
      const href = getTagAttribute(openingTag, "href");
      if (!href) return null;

      const text = textContent(match[2]);
      const name = linkName(openingTag, match[2]);
      return {
        href,
        text,
        name,
      };
    })
    .filter(Boolean);
}

function countMatches(value, regex) {
  return [...value.matchAll(regex)].length;
}

function isYouTubeThumbnailUrl(value) {
  try {
    return new URL(value).host.endsWith("ytimg.com");
  } catch {
    return false;
  }
}

function isKnownYouTubeThumbnailSize(width, height) {
  return [
    [1280, 720],
    [640, 480],
    [480, 360],
    [320, 180],
    [120, 90],
  ].some(([expectedWidth, expectedHeight]) => width === expectedWidth && height === expectedHeight);
}

function getYouTubeThumbnailExpectedSize(value) {
  try {
    const url = new URL(value, rootUrl);
    if (!url.host.endsWith("ytimg.com")) return null;

    const filename = url.pathname.split("/").pop() || "";
    return (
      {
        "maxresdefault.jpg": { width: 1280, height: 720 },
        "sddefault.jpg": { width: 640, height: 480 },
        "hqdefault.jpg": { width: 480, height: 360 },
        "mqdefault.jpg": { width: 320, height: 180 },
        "default.jpg": { width: 120, height: 90 },
      }[filename] || null
    );
  } catch {
    return null;
  }
}

function getTagAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2] || "";
}

function localPathFromUrl(value) {
  try {
    const url = new URL(value, rootUrl);
    return url.host === siteHost ? url.pathname : "";
  } catch {
    return "";
  }
}

function checkHtmlYouTubeThumbnailImages(html, context) {
  for (const img of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = img[0];
    const src = getTagAttribute(tag, "src");
    if (!isYouTubeThumbnailUrl(src)) continue;

    const expectedThumbnailSize = getYouTubeThumbnailExpectedSize(src);
    if (!expectedThumbnailSize) {
      reportError(`${context} YouTube thumbnail should use a recognized thumbnail filename: ${src}.`);
      continue;
    }

    const width = Number(getTagAttribute(tag, "width") || 0);
    const height = Number(getTagAttribute(tag, "height") || 0);
    if (width !== expectedThumbnailSize.width || height !== expectedThumbnailSize.height) {
      reportError(
        `${context} YouTube thumbnail ${src} should use intrinsic dimensions ${expectedThumbnailSize.width}x${expectedThumbnailSize.height}, found ${width}x${height}.`,
      );
    }
  }
}

function checkHtmlResponsiveImages(html, context) {
  for (const img of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = img[0];
    const src = getTagAttribute(tag, "src");
    const localSrcPath = localPathFromUrl(src);
    const expectedVariants = responsiveImageVariants.get(localSrcPath);
    if (!expectedVariants) continue;

    const srcset = getTagAttribute(tag, "srcset");
    const sizes = getTagAttribute(tag, "sizes");
    if (!srcset) reportError(`${context} responsive image ${localSrcPath} is missing srcset.`);
    if (!sizes) reportError(`${context} responsive image ${localSrcPath} is missing sizes.`);

    for (const variant of expectedVariants) {
      if (!srcset.includes(variant)) {
        reportError(`${context} responsive image ${localSrcPath} srcset missing ${variant}.`);
      }
    }
  }
}

function getMetaContent(html, name) {
  const regex = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=(["'])(.*?)\\1[^>]*>`, "i");
  return html.match(regex)?.[2] || "";
}

function getLinkHref(html, rel) {
  const regex = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']+)["'][^>]*>`, "i");
  return html.match(regex)?.[1] || "";
}

function getMetaPropertyContent(html, property) {
  const regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=(["'])(.*?)\\1[^>]*>`, "i");
  return html.match(regex)?.[2] || "";
}

function textIncludes(value, expected) {
  return JSON.stringify(value || "").toLowerCase().includes(expected.toLowerCase());
}

function hasTimeZoneOffset(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(value || "");
}

function isIsoDateTime(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
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

function checkLiveEventSchemas(html, context) {
  const parsedSchemas = [];

  for (const block of extractJsonLd(html)) {
    try {
      parsedSchemas.push(JSON.parse(block));
    } catch (error) {
      reportError(`${context} has invalid JSON-LD: ${error.message}`);
    }
  }

  const eventSchemas = parsedSchemas.flatMap((schema) => collectSchemasByType(schema, "Event"));
  for (const eventSchema of eventSchemas) {
    if (!hasTimeZoneOffset(eventSchema.startDate)) {
      reportError(`${context} Event schema startDate should include an explicit timezone offset.`);
    }
    if (!hasTimeZoneOffset(eventSchema.endDate)) {
      reportError(`${context} Event schema endDate should include an explicit timezone offset.`);
    }
    if (eventSchema.eventAttendanceMode !== "https://schema.org/OfflineEventAttendanceMode") {
      reportError(`${context} Event schema should mark gatherings as in-person/offline.`);
    }
    if (eventSchema.eventStatus !== "https://schema.org/EventScheduled") {
      reportError(`${context} Event schema should use EventScheduled.`);
    }
    if (eventSchema.isAccessibleForFree !== true) {
      reportError(`${context} Event schema should mark church gatherings as accessible for free.`);
    }
    if (eventSchema.inLanguage !== "en-US") {
      reportError(`${context} Event schema should include inLanguage en-US.`);
    }
    if (!textIncludes(eventSchema.location, "6 Haggerty Rd") || !textIncludes(eventSchema.location, "Charlton")) {
      reportError(`${context} Event schema should include the Wayside Church location.`);
    }
    if (!textIncludes(eventSchema.eventSchedule, "America/New_York")) {
      reportError(`${context} Event schema schedule should include the local timezone.`);
    }
  }
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

      if (child.text.includes("<priority>")) reportError(`${url} should not use priority values.`);
      if (child.text.includes("<changefreq>")) reportError(`${url} should not use changefreq values.`);

      const entries = extractSitemapEntries(child.text);
      for (const entry of entries) {
        if (!entry.lastmod) {
          reportError(`${url} missing lastmod for ${entry.loc}.`);
        } else if (!isValidIsoDate(entry.lastmod)) {
          reportError(`${url} has invalid lastmod for ${entry.loc}: ${entry.lastmod}.`);
        }
      }

      for (const requiredUrl of [rootUrl, new URL("/teaching/", rootUrl).toString(), new URL("/sermons/", rootUrl).toString()]) {
        const entry = entries.find((item) => item.loc === requiredUrl);
        if (!entry || !isValidIsoDate(entry.lastmod)) {
          reportError(`${url} should include a valid lastmod for ${requiredUrl}.`);
        }
      }

      const teachingWatchEntries = entries.filter((entry) => /\/teaching\/[^/]+-[A-Za-z0-9_-]{11}\/$/.test(entry.loc));
      if (teachingWatchEntries.length < 5) {
        reportError(`${url} should include recent teaching watch pages with lastmod, found ${teachingWatchEntries.length}.`);
      }

      return entries.map((entry) => entry.loc);
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

async function checkSecurityTxt() {
  const securityTxtUrl = new URL("/.well-known/security.txt", rootUrl).toString();
  const { response, text } = await fetchText(securityTxtUrl, { accept: "text/plain,*/*;q=0.8" });

  if (!response.ok) {
    reportError(`${securityTxtUrl} should be fetchable, got ${response.status}.`);
    return;
  }

  if (!text.includes(`Contact: ${new URL("/contact/", rootUrl).toString()}`)) {
    reportError("security.txt should point security reports to the Wayside contact page.");
  }
  if (!text.includes(`Canonical: ${securityTxtUrl}`)) {
    reportError("security.txt should include its production canonical URL.");
  }
  if (!text.includes("Preferred-Languages: en")) {
    reportError("security.txt should include Preferred-Languages.");
  }

  const expiresMatch = text.match(/^Expires:\s*(.+)$/m);
  if (!expiresMatch || Number.isNaN(Date.parse(expiresMatch[1]))) {
    reportError("security.txt should include a valid Expires timestamp.");
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
  const imageTitles = extractImageTitles(text);
  const imageCaptions = extractImageCaptions(text);
  const imageGeoLocations = extractImageGeoLocations(text);

  if (!text.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')) {
    reportError("image-sitemap.xml is missing the Google image sitemap namespace.");
  }
  if (imagePageUrls.length < 10) {
    reportError(`image-sitemap.xml should include key visual pages, found ${imagePageUrls.length}.`);
  }
  if (imageUrls.length < 12) {
    reportError(`image-sitemap.xml should include representative local images, found ${imageUrls.length}.`);
  }
  if (imageTitles.length !== imageUrls.length || imageTitles.some((title) => title.length === 0)) {
    reportError("image-sitemap.xml should include a non-empty title for every image.");
  }
  if (imageCaptions.length !== imageUrls.length || imageCaptions.some((caption) => caption.length === 0)) {
    reportError("image-sitemap.xml should include a non-empty caption for every image.");
  }
  if (
    imageGeoLocations.length !== imageUrls.length ||
    imageGeoLocations.some((location) => !location.includes("Charlton"))
  ) {
    reportError("image-sitemap.xml should include Charlton geo_location metadata for every local image.");
  }
  for (const expectedLocalImage of ["wayside-local-1x1.webp", "wayside-local-4x3.webp", "wayside-local-16x9.webp"]) {
    if (!text.includes(expectedLocalImage)) {
      reportError(`image-sitemap.xml missing local entity image ${expectedLocalImage}.`);
    }
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
    const watchSchemas = [];
    for (const block of extractJsonLd(watchText)) {
      try {
        watchSchemas.push(JSON.parse(block));
      } catch (error) {
        reportError(`${videoPageUrl} has invalid watch page JSON-LD: ${error.message}`);
      }
    }
    const watchBreadcrumb = watchSchemas.flatMap((schema) => collectSchemasByType(schema, "BreadcrumbList"))[0];
    const watchBreadcrumbItems = watchBreadcrumb?.itemListElement || [];
    if (watchBreadcrumbItems.length < 3) {
      reportError(`${videoPageUrl} should breadcrumb Home > Teaching > video title.`);
    } else {
      const parentCrumb = watchBreadcrumbItems[1];
      const currentCrumb = watchBreadcrumbItems[2];
      if (parentCrumb?.name !== "Teaching" || parentCrumb?.item !== new URL("/teaching/", rootUrl).toString()) {
        reportError(`${videoPageUrl} should include Teaching as the parent breadcrumb.`);
      }
      if (currentCrumb?.item !== videoPageUrl) {
        reportError(`${videoPageUrl} final breadcrumb should point to the local teaching page.`);
      }
    }
    if (!watchText.includes('href="/teaching/"')) {
      reportError(`${videoPageUrl} should visibly link back to the Teaching parent page.`);
    }
    const watchVideoObjects = watchSchemas.flatMap((schema) => collectSchemasByType(schema, "VideoObject"));
    const watchVideoObject = watchVideoObjects[0];
    const watchWebPages = watchSchemas.flatMap((schema) => collectSchemasByType(schema, "WebPage"));
    const watchWebPage =
      watchWebPages.find((schema) => schema.url === videoPageUrl || schema["@id"] === `${videoPageUrl}#webpage`) || watchWebPages[0];
    if (!watchVideoObject) {
      reportError(`${videoPageUrl} should include inspectable VideoObject schema.`);
    } else {
      if (watchVideoObject.mainEntityOfPage?.["@id"] !== `${videoPageUrl}#webpage`) {
        reportError(`${videoPageUrl} VideoObject should point mainEntityOfPage to the local teaching page.`);
      }
      if (watchVideoObject.about?.["@id"] !== `${rootUrl}#church`) {
        reportError(`${videoPageUrl} VideoObject should identify Wayside Church as the subject.`);
      }
      if (watchVideoObject.isFamilyFriendly !== true) {
        reportError(`${videoPageUrl} VideoObject should mark teaching as family-friendly.`);
      }
      if (watchVideoObject.inLanguage !== "en-US") {
        reportError(`${videoPageUrl} VideoObject should include inLanguage en-US.`);
      }
      if (watchVideoObject.potentialAction?.["@type"] !== "WatchAction" || !textIncludes(watchVideoObject.potentialAction?.target, videoPageUrl)) {
        reportError(`${videoPageUrl} VideoObject should include a WatchAction for the local teaching page.`);
      }
      if (!watchWebPage?.datePublished || watchWebPage.datePublished !== watchVideoObject.uploadDate) {
        reportError(`${videoPageUrl} WebPage datePublished should match the YouTube VideoObject uploadDate.`);
      }
      if (!isIsoDateTime(watchWebPage?.dateModified) || Date.parse(watchWebPage.dateModified) < Date.parse(watchWebPage.datePublished)) {
        reportError(`${videoPageUrl} WebPage dateModified should be an ISO date from the current YouTube-powered page content.`);
      }
      if (!watchText.includes(`<time datetime="${watchVideoObject.uploadDate}"`)) {
        reportError(`${videoPageUrl} visible teaching date should use a time element that matches the YouTube uploadDate.`);
      }
    }
    const watchOgImage = getMetaPropertyContent(watchText, "og:image");
    const watchTwitterImage = getMetaContent(watchText, "twitter:image");
    const watchOgImageAlt = getMetaPropertyContent(watchText, "og:image:alt");
    const watchOgImageWidth = Number(getMetaPropertyContent(watchText, "og:image:width") || 0);
    const watchOgImageHeight = Number(getMetaPropertyContent(watchText, "og:image:height") || 0);
    if (!isYouTubeThumbnailUrl(watchOgImage)) {
      reportError(`${videoPageUrl} should use the YouTube thumbnail as og:image.`);
    }
    if (watchTwitterImage !== watchOgImage) {
      reportError(`${videoPageUrl} twitter:image should match og:image.`);
    }
    if (!watchOgImageAlt.includes("Wayside Church teaching video")) {
      reportError(`${videoPageUrl} should describe the video thumbnail in social alt text.`);
    }
    const expectedWatchThumbnailSize = getYouTubeThumbnailExpectedSize(watchOgImage);
    if (!expectedWatchThumbnailSize) {
      reportError(`${videoPageUrl} should use a recognized YouTube thumbnail filename.`);
    } else if (watchOgImageWidth !== expectedWatchThumbnailSize.width || watchOgImageHeight !== expectedWatchThumbnailSize.height) {
      reportError(
        `${videoPageUrl} should publish YouTube thumbnail dimensions ${expectedWatchThumbnailSize.width}x${expectedWatchThumbnailSize.height}, found ${watchOgImageWidth}x${watchOgImageHeight}.`,
      );
    }
    if (!watchText.includes("Plan a Visit")) {
      reportError(`${videoPageUrl} should include a visitor next step.`);
    }
    const relatedTeachingTileCount = countMatches(watchText, /class=["']teaching-tile["']/g);
    if (!watchText.includes("More recent teaching") || relatedTeachingTileCount < 3) {
      reportError(`${videoPageUrl} should include related recent teaching cards.`);
    }
    const watchPageTimeCount = countMatches(watchText, /<time\b[^>]*\sdatetime=/g);
    if (watchPageTimeCount < 4) {
      reportError(`${videoPageUrl} should expose main and related teaching dates with semantic time elements.`);
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
    "## Entity Facts",
    "Official name: Wayside Church",
    "Common local name: Wayside",
    "Common local name: Wayside Church Charlton",
    "## Public Leadership",
    "Chase Mendoza, Pastor: https://wayside.church/leadership/#chase-mendoza",
    "Owen Rushing, Ministry Leader: https://wayside.church/leadership/#owen-rushing",
    "## Visitor Questions",
    "What time is Sunday Worship at Wayside Church? Sunday Worship begins at 10:00 AM. Coffee and Discipleship begins at 9:00 AM.",
    "Can my children or teens come with me? Yes. Children and youth are welcomed into the life of the church as we worship, learn, and grow together.",
    "Can I attend if I am not a Christian? Yes. You are welcome to attend, listen, ask questions, and take your time. We believe Jesus meets people with truth and grace.",
    "## Recent Teaching",
    "## Machine-Readable Resources",
    new URL("/video-sitemap.xml", rootUrl).toString(),
    new URL("/wayside-church.vcf", rootUrl).toString(),
    `Coffee and Discipleship Calendar: ${new URL("/calendar/coffee-and-discipleship.ics", rootUrl).toString()}`,
    `Identity Groups Calendar: ${new URL("/calendar/identity-groups.ics", rootUrl).toString()}`,
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
  const homePageSchemas = parsedSchemas.flatMap((schema) => collectSchemasByType(schema, "WebPage"));
  const matchingHomePageSchemas = homePageSchemas.filter((schema) => schema.url === rootUrl || schema["@id"] === `${rootUrl}#webpage`);
  const pageSchema =
    matchingHomePageSchemas.find(
      (schema) => textIncludes(schema.mainEntity, "#church") && textIncludes(schema.keywords, "Church in Charlton, MA"),
    ) ||
    matchingHomePageSchemas.find((schema) => schema.primaryImageOfPage) ||
    matchingHomePageSchemas[0] ||
    homePageSchemas[0];

  if (!churchSchema) {
    reportError("Homepage missing Church schema.");
    return;
  }

  if (churchSchema.url !== rootUrl) reportError(`Church schema url should be ${rootUrl}.`);
  if (!textIncludes(churchSchema.alternateName, "Wayside") || !textIncludes(churchSchema.alternateName, "Wayside Church Charlton")) {
    reportError("Church schema missing common local alternate names.");
  }
  if (!textIncludes(churchSchema.address, "6 Haggerty Rd")) reportError("Church schema missing street address.");
  if (!textIncludes(churchSchema.address, "Charlton")) reportError("Church schema missing Charlton locality.");
  if (!textIncludes(churchSchema.telephone, "+15084340401")) reportError("Church schema missing canonical phone number.");
  if (!textIncludes(churchSchema.hasMap, "google.com/maps")) reportError("Church schema missing Google Maps profile.");
  if (!textIncludes(churchSchema.keywords, "Church in Charlton, MA")) reportError("Church schema missing local church keywords.");
  if (!textIncludes(churchSchema.knowsAbout, "Church in Charlton, MA") || !textIncludes(churchSchema.knowsAbout, "Bible teaching in Charlton, MA")) {
    reportError("Church schema missing local topic knowsAbout fields.");
  }
  if (churchSchema.mainEntityOfPage !== rootUrl) reportError(`Church schema mainEntityOfPage should be ${rootUrl}.`);
  if (churchSchema.isAccessibleForFree !== true) reportError("Church schema should mark gatherings as accessible for free.");
  if (churchSchema.publicAccess !== true) reportError("Church schema should mark public access for visitors.");
  if (!textIncludes(churchSchema.photo, "ImageObject") || !textIncludes(churchSchema.photo, "wayside-community.webp")) {
    reportError("Church schema missing real local photo objects.");
  }
  for (const expectedLocalImage of ["wayside-local-1x1.webp", "wayside-local-4x3.webp", "wayside-local-16x9.webp"]) {
    if (!textIncludes(churchSchema.image, expectedLocalImage) || !textIncludes(churchSchema.photo, expectedLocalImage)) {
      reportError(`Church schema missing local entity image ${expectedLocalImage}.`);
    }
  }
  if (!textIncludes(churchSchema.contactPoint, "English")) reportError("Church schema contact point missing available language.");

  for (const profile of ["facebook.com", "youtube.com", "google.com/maps"]) {
    if (!textIncludes(churchSchema.sameAs, profile)) reportError(`Church schema sameAs missing ${profile}.`);
  }

  for (const community of ["Charlton", "Dudley", "Oxford", "Sturbridge", "Southbridge", "Worcester County"]) {
    if (!textIncludes(churchSchema.areaServed, community)) reportError(`Church schema areaServed missing ${community}.`);
  }

  if (!textIncludes(churchSchema.openingHoursSpecification, "09:00") || !textIncludes(churchSchema.openingHoursSpecification, "11:30")) {
    reportError("Church schema opening hours should cover Coffee and Discipleship through worship.");
  }
  if (churchSchema.openingHours !== "Su 09:00-11:30") {
    reportError("Church schema should include compact Sunday openingHours.");
  }
  if (!textIncludes(churchSchema.amenityFeature, "Parking available")) {
    reportError("Church schema missing visitor parking amenity feature.");
  }
  if (!textIncludes(churchSchema.additionalProperty, "Accessibility questions")) {
    reportError("Church schema missing practical visitor details.");
  }
  if (!textIncludes(churchSchema.additionalProperty, "Mission") || !textIncludes(churchSchema.additionalProperty, "radically transformed by the Gospel")) {
    reportError("Church schema missing mission additional property.");
  }
  for (const actionTarget of ["Plan a Visit", "Get Directions", "Watch Recent Teaching", "Save Sunday Worship Calendar"]) {
    if (!textIncludes(churchSchema.potentialAction, actionTarget)) {
      reportError(`Church schema missing potential action ${actionTarget}.`);
    }
  }
  for (const actionUrl of ["/plan-a-visit/", "google.com/maps", "/teaching/", "/calendar/wayside-sunday-worship.ics"]) {
    if (!textIncludes(churchSchema.potentialAction, actionUrl)) {
      reportError(`Church schema potential actions missing ${actionUrl}.`);
    }
  }

  if (!webSiteSchema?.keywords || !textIncludes(webSiteSchema.keywords, "Church in Charlton, MA")) {
    reportError("WebSite schema missing local church keywords.");
  }
  if (!textIncludes(webSiteSchema?.alternateName, "Wayside") || !textIncludes(webSiteSchema?.alternateName, "Wayside Church Charlton")) {
    reportError("WebSite schema missing common local alternate names.");
  }
  if (!webSiteSchema?.description || !textIncludes(webSiteSchema.description, "welcoming church in Charlton")) {
    reportError("WebSite schema missing site description.");
  }
  if (!textIncludes(webSiteSchema?.about, "#church") || !textIncludes(webSiteSchema?.mainEntity, "#church")) {
    reportError("WebSite schema should point about/mainEntity to Church schema.");
  }
  for (const keyPage of ["/plan-a-visit/", "/visitor-faq/", "/church-in-charlton-ma/", "/nearby-communities/", "/teaching/", "/ministries/", "/contact/"]) {
    if (!textIncludes(webSiteSchema?.hasPart, keyPage)) {
      reportError(`WebSite schema hasPart missing ${keyPage}.`);
    }
  }
  if (!textIncludes(webSiteSchema?.hasPart, "Answers for first-time guests") || !textIncludes(webSiteSchema?.hasPart, "neighbors from Dudley")) {
    reportError("WebSite schema hasPart should summarize visitor and nearby-community pages.");
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

    checkHtmlYouTubeThumbnailImages(page.text, url);
    checkHtmlResponsiveImages(page.text, url);
    checkLiveEventSchemas(page.text, url);

    const canonical = getLinkHref(page.text, "canonical");
    if (canonical !== url) reportError(`${url} canonical is ${canonical || "(missing)"}.`);

    const robots = getMetaContent(page.text, "robots");
    if (!robots.includes("index")) reportError(`${url} should be indexable, robots=${robots || "(missing)"}.`);

    if (!page.text.includes('type="text/vcard"') || !page.text.includes(new URL("/wayside-church.vcf", rootUrl).toString())) {
      reportError(`${url} should advertise the generated church contact card in the page head.`);
    }
    if (page.text.includes('class="calendar-actions"') && !page.text.includes("/wayside-church.vcf")) {
      reportError(`${url} Sunday calendar action block should include the generated church contact card.`);
    }

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
    if (pathname === "/giving/") {
      const parsedSchemas = [];
      for (const block of extractJsonLd(page.text)) {
        try {
          parsedSchemas.push(JSON.parse(block));
        } catch (error) {
          reportError(`${url} has invalid JSON-LD: ${error.message}`);
        }
      }
      const donateAction = parsedSchemas.flatMap((schema) => collectSchemasByType(schema, "DonateAction"))[0];
      if (!donateAction) {
        reportError(`${url} should include DonateAction schema for the giving page.`);
      } else {
        if (donateAction.actionStatus !== "https://schema.org/PotentialActionStatus") {
          reportError(`${url} DonateAction should be marked as a potential action.`);
        }
        if (!textIncludes(donateAction.target, "givingtools.com/give/1330")) {
          reportError(`${url} DonateAction should point to the configured GivingTools URL.`);
        }
        if (!textIncludes(donateAction.recipient, "#church") || !textIncludes(donateAction.recipient, "Wayside Church")) {
          reportError(`${url} DonateAction should identify Wayside Church as the recipient.`);
        }
      }
    }

    if (!htmlSitemapTargets.has(new URL(pathname, rootUrl).toString())) {
      reportError(`/sitemap/ missing link to ${url}.`);
    }

    for (const anchor of extractAnchors(page.text)) {
      if (!anchor.name) {
        reportError(`${url} link to ${anchor.href} should have visible text, aria-label, title, or image alt text.`);
      } else if (hasGenericLinkName(anchor.name)) {
        reportError(`${url} link to ${anchor.href} uses generic link text "${anchor.name}".`);
      }

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
    const parsedSchemas = [];
    for (const block of extractJsonLd(text)) {
      try {
        parsedSchemas.push(JSON.parse(block));
      } catch (error) {
        reportError(`${url} has invalid JSON-LD: ${error.message}`);
      }
    }
    const collectionPageSchema = parsedSchemas.flatMap((schema) => collectSchemasByType(schema, "CollectionPage"))[0];
    if (!isIsoDateTime(collectionPageSchema?.dateModified)) {
      reportError(`${url} CollectionPage schema should include an ISO dateModified from the YouTube feed.`);
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

    const semanticDateCount = countMatches(text, /<time\b[^>]*\sdatetime=/g);
    if (semanticDateCount < 6) {
      reportError(`${url} should expose recent teaching publish dates with semantic time elements, found ${semanticDateCount}.`);
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

async function checkLiveNearbyCommunities() {
  const url = new URL("/nearby-communities/", rootUrl).toString();
  const { response, text } = await fetchText(url);

  if (!response.ok) {
    reportError(`${url} should be fetchable, got ${response.status}.`);
    return;
  }

  for (const expected of [
    "One real church family",
    "These town links are not separate campuses or duplicate pages",
    "Sunday plan:",
    "Directions from Dudley",
    "Directions from Oxford",
    "Directions from Sturbridge",
    "Directions from Southbridge",
  ]) {
    if (!text.includes(expected)) {
      reportError(`${url} missing ${expected}.`);
    }
  }

  const parsedSchemas = [];
  for (const block of extractJsonLd(text)) {
    try {
      parsedSchemas.push(JSON.parse(block));
    } catch (error) {
      reportError(`${url} has invalid JSON-LD: ${error.message}`);
    }
  }

  const nearbyItemListSchema = parsedSchemas
    .flatMap((schema) => collectSchemasByType(schema, "ItemList"))
    .find((schema) => schema.name === "Nearby communities served by Wayside Church");

  if (!nearbyItemListSchema) {
    reportError(`${url} missing nearby communities ItemList schema.`);
    return;
  }

  for (const town of ["Dudley", "Oxford", "Sturbridge", "Southbridge"]) {
    if (!textIncludes(nearbyItemListSchema, town)) {
      reportError(`${url} nearby communities schema missing ${town}.`);
    }
    if (!textIncludes(nearbyItemListSchema, `Directions from ${town}`)) {
      reportError(`${url} nearby communities schema missing directions action for ${town}.`);
    }
  }

  if (!textIncludes(nearbyItemListSchema, "potentialAction") || !textIncludes(nearbyItemListSchema, "google.com/maps/dir")) {
    reportError(`${url} nearby communities schema should expose direction actions.`);
  }
}

async function checkLiveLeaderSchemas() {
  for (const pathname of ["/about/", "/leadership/"]) {
    const url = new URL(pathname, rootUrl).toString();
    const { response, text } = await fetchText(url);

    if (!response.ok) {
      reportError(`${url} should be fetchable, got ${response.status}.`);
      continue;
    }

    const parsedSchemas = [];
    for (const block of extractJsonLd(text)) {
      try {
        parsedSchemas.push(JSON.parse(block));
      } catch (error) {
        reportError(`${url} has invalid JSON-LD: ${error.message}`);
      }
    }

    const personSchemas = parsedSchemas.flatMap((schema) => collectSchemasByType(schema, "Person"));
    const expectedLeaders = [
      { id: "chase-mendoza", name: "Chase Mendoza", role: "Pastor", image: "chase-mendoza.webp" },
      { id: "owen-rushing", name: "Owen Rushing", role: "Ministry Leader", image: "owen-rushing.webp" },
    ];

    if (personSchemas.length < expectedLeaders.length) {
      reportError(`${url} should include Person schema for each visible Wayside leader.`);
    }

    for (const leader of expectedLeaders) {
      const leaderUrl = `${url}#${leader.id}`;
      if (!text.includes(`id="${leader.id}"`)) {
        reportError(`${url} visible leader card missing stable id ${leader.id}.`);
      }

      const personSchema = personSchemas.find((schema) => schema.name === leader.name);
      if (!personSchema) {
        reportError(`${url} missing Person schema for ${leader.name}.`);
        continue;
      }

      if (personSchema["@id"] !== leaderUrl || personSchema.url !== leaderUrl) {
        reportError(`${url} ${leader.name} Person schema should point to ${leaderUrl}.`);
      }
      if (personSchema.jobTitle !== leader.role) {
        reportError(`${url} ${leader.name} Person schema should include jobTitle ${leader.role}.`);
      }
      if (!textIncludes(personSchema.image, leader.image)) {
        reportError(`${url} ${leader.name} Person schema should include the leader image.`);
      }
      if (!textIncludes(personSchema.worksFor, "#church") || !textIncludes(personSchema.affiliation, "#church")) {
        reportError(`${url} ${leader.name} Person schema should link worksFor and affiliation to Wayside Church.`);
      }
      if (personSchema.mainEntityOfPage?.["@id"] !== `${url}#webpage`) {
        reportError(`${url} ${leader.name} Person schema should point mainEntityOfPage to this page.`);
      }
    }
  }
}

async function main() {
  await checkDomainCanonicalization();
  await checkRobots();
  await checkSecurityTxt();

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
  await checkLiveNearbyCommunities();
  await checkLiveLeaderSchemas();

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
