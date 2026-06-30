import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const siteUrl = "https://wayside.church";
const rootUrl = new URL("/", siteUrl).toString();
const siteHost = new URL(siteUrl).host;
const teachingFeedUrl = new URL("/teaching-feed.xml", siteUrl).toString();
const errors = [];
const warnings = [];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walkFiles(dir, predicate, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, acc);
    } else if (predicate(fullPath)) {
      acc.push(fullPath);
    }
  }

  return acc;
}

function routeFromHtmlPath(filePath) {
  const relative = path.relative(distDir, filePath).replaceAll("\\", "/");

  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"index.html".length)}`;
  return `/${relative}`;
}

function getMetaContent(html, name) {
  const regex = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=(["'])(.*?)\\1[^>]*>`, "i");
  return html.match(regex)?.[2] || "";
}

function getMetaPropertyContent(html, property) {
  const regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=(["'])(.*?)\\1[^>]*>`, "i");
  return html.match(regex)?.[2] || "";
}

function getLinkHref(html, rel) {
  const regex = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']+)["'][^>]*>`, "i");
  return html.match(regex)?.[1] || "";
}

function textContent(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveInternalTarget(rawUrl) {
  if (
    !rawUrl ||
    rawUrl.startsWith("#") ||
    rawUrl.startsWith("mailto:") ||
    rawUrl.startsWith("tel:") ||
    rawUrl.startsWith("data:") ||
    rawUrl.startsWith("javascript:")
  ) {
    return null;
  }

  let url;

  try {
    url = new URL(rawUrl, siteUrl);
  } catch {
    return null;
  }

  if (url.host !== siteHost) return null;

  return decodeURI(url.pathname);
}

function existsInDist(pathname) {
  const normalized = pathname === "/" ? "/index.html" : pathname;
  const directPath = path.join(distDir, normalized.replace(/^\//, ""));
  const indexPath = path.join(distDir, normalized.replace(/^\//, ""), "index.html");

  return fs.existsSync(directPath) || fs.existsSync(indexPath);
}

function extractUrls(html, attributeName) {
  return [...html.matchAll(new RegExp(`\\s${attributeName}=["']([^"']+)["']`, "gi"))].map((match) => match[1]);
}

function extractAnchors(html) {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: match[1],
    text: textContent(match[2]),
  }));
}

function extractJsonLd(html) {
  return [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) =>
    match[1].trim(),
  );
}

function schemaTypes(schema) {
  const values = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node["@type"]) values.push(node["@type"]);
    Object.values(node).forEach(visit);
  };

  visit(schema);
  return values.flat();
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
    const url = new URL(value, siteUrl);
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

function extractVideoTitles(xml) {
  return [...xml.matchAll(/<video:title>([\s\S]*?)<\/video:title>/g)].map((match) => match[1].trim());
}

function extractVideoDescriptions(xml) {
  return [...xml.matchAll(/<video:description>([\s\S]*?)<\/video:description>/g)].map((match) => match[1].trim());
}

function extractAtomEntries(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1].trim());
}

function textIncludes(value, expected) {
  return JSON.stringify(value || "").toLowerCase().includes(expected.toLowerCase());
}

function htmlRouteFromPathname(pathname) {
  const route = pathname === "/" ? "/" : pathname.endsWith("/") ? pathname : `${pathname}/`;
  const filePath = route === "/" ? path.join(distDir, "index.html") : path.join(distDir, route.replace(/^\//, ""), "index.html");

  return fs.existsSync(filePath) ? route : null;
}

function htmlFilePathForRoute(route) {
  return route === "/" ? path.join(distDir, "index.html") : path.join(distDir, route.replace(/^\//, ""), "index.html");
}

function routeLabel(route) {
  return route === "/" ? "/" : route.replace(/\/$/, "");
}

if (!fs.existsSync(distDir)) {
  errors.push("Missing dist directory. Run `pnpm build` before `pnpm seo:audit`.");
}

const htmlFiles = fs.existsSync(distDir) ? walkFiles(distDir, (filePath) => filePath.endsWith(".html")) : [];
const sitemapPath = path.join(distDir, "sitemap-0.xml");
const sitemapUrls = fs.existsSync(sitemapPath) ? new Set(extractLocs(readText(sitemapPath))) : new Set();
const titles = new Map();
const descriptions = new Map();
const indexedRoutes = new Set();
const internalLinkEdges = [];
const expectedImageSizes = new Map([
  ["/images/wayside-welcome-hero.webp", { width: 1717, height: 916 }],
  ["/images/wayside-community.webp", { width: 1400, height: 1855 }],
  ["/images/charlton.webp", { width: 852, height: 1080 }],
  ["/images/chase-mendoza.webp", { width: 629, height: 549 }],
  ["/images/owen-rushing.webp", { width: 900, height: 1350 }],
  ["/images/wayside-social-card.jpg", { width: 1200, height: 630 }],
]);

for (const filePath of htmlFiles) {
  const html = readText(filePath);
  const route = routeFromHtmlPath(filePath);
  const label = route === "/" ? "/" : route.replace(/\/$/, "");
  const robots = getMetaContent(html, "robots");
  const isNoIndex = robots.includes("noindex");
  const title = textContent(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const description = getMetaContent(html, "description");
  const canonical = getLinkHref(html, "canonical");
  const h1Count = [...html.matchAll(/<h1[\s>]/gi)].length;
  const expectedCanonical = new URL(route, siteUrl).toString();
  const ogImage = getMetaPropertyContent(html, "og:image");
  const ogImageAlt = getMetaPropertyContent(html, "og:image:alt");
  const twitterImageAlt = getMetaContent(html, "twitter:image:alt");
  const ogImageWidth = Number(getMetaPropertyContent(html, "og:image:width") || 0);
  const ogImageHeight = Number(getMetaPropertyContent(html, "og:image:height") || 0);

  if (!title) errors.push(`${label}: missing <title>.`);
  if (!isNoIndex && title && title.length > 75) warnings.push(`${label}: title is ${title.length} characters.`);
  if (!description) errors.push(`${label}: missing meta description.`);
  if (!isNoIndex && description && (description.length < 50 || description.length > 180)) {
    warnings.push(`${label}: meta description is ${description.length} characters.`);
  }
  if (!canonical) errors.push(`${label}: missing canonical link.`);
  if (!isNoIndex && canonical !== expectedCanonical) {
    errors.push(`${label}: canonical is ${canonical}, expected ${expectedCanonical}.`);
  }
  if (
    !isNoIndex &&
    (!html.includes('type="application/atom+xml"') || !html.includes(`href="${teachingFeedUrl}"`))
  ) {
    errors.push(`${label}: missing teaching-feed alternate link.`);
  }
  if (!isNoIndex && h1Count !== 1) errors.push(`${label}: expected exactly one H1, found ${h1Count}.`);

  if (!isNoIndex && ogImage) {
    if (!ogImageAlt || ogImageAlt.length < 20) {
      errors.push(`${label}: og:image:alt should describe the page image.`);
    }
    if (!twitterImageAlt || twitterImageAlt.length < 20) {
      errors.push(`${label}: twitter:image:alt should describe the page image.`);
    }
    if (ogImageAlt && twitterImageAlt && ogImageAlt !== twitterImageAlt) {
      errors.push(`${label}: og:image:alt and twitter:image:alt should match.`);
    }

    const ogImagePath = new URL(ogImage, siteUrl).pathname;
    const expectedImageSize = expectedImageSizes.get(ogImagePath);
    if (expectedImageSize) {
      if (ogImageWidth !== expectedImageSize.width || ogImageHeight !== expectedImageSize.height) {
        errors.push(
          `${label}: og:image dimensions are ${ogImageWidth}x${ogImageHeight}, expected ${expectedImageSize.width}x${expectedImageSize.height}.`,
        );
      }
    }
  }

  if (!isNoIndex) {
    if (!sitemapUrls.has(expectedCanonical)) {
      errors.push(`${label}: missing from sitemap-0.xml.`);
    }
    if (titles.has(title)) {
      errors.push(`${label}: duplicate title with ${titles.get(title)}.`);
    } else {
      titles.set(title, label);
    }
    if (descriptions.has(description)) {
      errors.push(`${label}: duplicate meta description with ${descriptions.get(description)}.`);
    } else {
      descriptions.set(description, label);
    }
  }

  const jsonLdBlocks = extractJsonLd(html);
  if (!isNoIndex && jsonLdBlocks.length === 0) errors.push(`${label}: missing JSON-LD structured data.`);

  const allSchemaTypes = [];
  const parsedSchemas = [];
  for (const block of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(block);
      parsedSchemas.push(parsed);
      allSchemaTypes.push(...schemaTypes(parsed));
    } catch (error) {
      errors.push(`${label}: invalid JSON-LD (${error.message}).`);
    }
  }

  const churchSchemas = parsedSchemas.flatMap((schema) => collectSchemasByType(schema, "Church"));
  const webSiteSchemas = parsedSchemas.flatMap((schema) => collectSchemasByType(schema, "WebSite"));
  const siteNavigationSchemas = parsedSchemas.flatMap((schema) => collectSchemasByType(schema, "SiteNavigationElement"));
  const pageSchemas = parsedSchemas.flatMap((schema) =>
    ["WebPage", "AboutPage", "ContactPage", "CollectionPage"].flatMap((type) => collectSchemasByType(schema, type)),
  );

  if (!isNoIndex && !allSchemaTypes.includes("Church")) errors.push(`${label}: missing Church schema.`);
  if (
    !isNoIndex &&
    !allSchemaTypes.includes("WebPage") &&
    !allSchemaTypes.includes("AboutPage") &&
    !allSchemaTypes.includes("ContactPage") &&
    !allSchemaTypes.includes("CollectionPage")
  ) {
    errors.push(`${label}: missing page-level schema.`);
  }
  if (!isNoIndex && route !== "/" && !allSchemaTypes.includes("BreadcrumbList")) {
    errors.push(`${label}: missing BreadcrumbList schema.`);
  }
  if (!isNoIndex && !allSchemaTypes.includes("SiteNavigationElement")) {
    errors.push(`${label}: missing SiteNavigationElement schema.`);
  }

  if (!isNoIndex) {
    indexedRoutes.add(route);

    const churchSchema = churchSchemas[0];
    if (!churchSchema) {
      errors.push(`${label}: missing inspectable Church schema.`);
    } else {
      if (churchSchema.url !== rootUrl) errors.push(`${label}: Church schema url should be ${rootUrl}.`);
      if (!textIncludes(churchSchema.logo, `${siteUrl}/images/`)) errors.push(`${label}: Church schema missing production logo URL.`);
      if (!churchSchema.slogan) errors.push(`${label}: Church schema missing slogan.`);
      if (!churchSchema.description || churchSchema.description.length < 80) {
        errors.push(`${label}: Church schema description should be a substantial local church description.`);
      }
      if (!churchSchema.telephone) errors.push(`${label}: Church schema missing telephone.`);
      if (!textIncludes(churchSchema.hasMap, "google.com/maps")) errors.push(`${label}: Church schema missing Google Maps link.`);
      if (!textIncludes(churchSchema.keywords, "Church in Charlton, MA")) {
        errors.push(`${label}: Church schema missing local church keywords.`);
      }
      if (churchSchema.isAccessibleForFree !== true) {
        errors.push(`${label}: Church schema should mark Sunday gatherings as accessible for free.`);
      }
      if (churchSchema.publicAccess !== true) {
        errors.push(`${label}: Church schema should mark public access for visitor clarity.`);
      }
      if (!textIncludes(churchSchema.address, "6 Haggerty Rd")) errors.push(`${label}: Church schema missing street address.`);
      if (!textIncludes(churchSchema.address, "Charlton")) errors.push(`${label}: Church schema missing address locality.`);
      if (!textIncludes(churchSchema.address, "01507")) errors.push(`${label}: Church schema missing postal code.`);
      if (!textIncludes(churchSchema.geo, "42.104233") || !textIncludes(churchSchema.geo, "-71.952781")) {
        errors.push(`${label}: Church schema missing expected geographic coordinates.`);
      }
      if (!textIncludes(churchSchema.photo, "ImageObject") || !textIncludes(churchSchema.photo, "wayside-community.webp")) {
        errors.push(`${label}: Church schema missing real local photo objects.`);
      }
      if (!textIncludes(churchSchema.contactPoint, "English")) {
        errors.push(`${label}: Church schema contact point missing available language.`);
      }
      for (const profile of ["facebook.com", "youtube.com", "google.com/maps"]) {
        if (!textIncludes(churchSchema.sameAs, profile)) errors.push(`${label}: Church schema sameAs missing ${profile}.`);
      }
      for (const community of ["Charlton", "Dudley", "Oxford", "Sturbridge", "Southbridge", "Worcester County"]) {
        if (!textIncludes(churchSchema.areaServed, community)) errors.push(`${label}: Church schema areaServed missing ${community}.`);
      }
      if (!textIncludes(churchSchema.openingHoursSpecification, "Sunday")) {
        errors.push(`${label}: Church schema missing Sunday opening hours.`);
      }
      if (!textIncludes(churchSchema.openingHoursSpecification, "09:00") || !textIncludes(churchSchema.openingHoursSpecification, "11:30")) {
        errors.push(`${label}: Church schema opening hours should cover Coffee and Discipleship through worship.`);
      }
      if (churchSchema.openingHours !== "Su 09:00-11:30") {
        errors.push(`${label}: Church schema should include compact Sunday openingHours.`);
      }
      if (!textIncludes(churchSchema.additionalProperty, "Sunday Worship") || !textIncludes(churchSchema.additionalProperty, "Coffee and Discipleship")) {
        errors.push(`${label}: Church schema missing service-time additional properties.`);
      }
      if (!textIncludes(churchSchema.amenityFeature, "Parking available")) {
        errors.push(`${label}: Church schema missing visitor parking amenity feature.`);
      }
      if (!textIncludes(churchSchema.additionalProperty, "Accessibility questions")) {
        errors.push(`${label}: Church schema missing practical visitor details.`);
      }
    }

    const webSiteSchema = webSiteSchemas[0];
    if (!webSiteSchema) {
      errors.push(`${label}: missing inspectable WebSite schema.`);
    } else {
      if (webSiteSchema.url !== rootUrl) errors.push(`${label}: WebSite schema url should be ${rootUrl}.`);
      if (!textIncludes(webSiteSchema.publisher, "#church")) errors.push(`${label}: WebSite schema publisher should reference Church schema.`);
      if (!textIncludes(webSiteSchema.about, "#church") || !textIncludes(webSiteSchema.mainEntity, "#church")) {
        errors.push(`${label}: WebSite schema should point about/mainEntity to Church schema.`);
      }
      if (!textIncludes(webSiteSchema.keywords, "Church in Charlton, MA")) {
        errors.push(`${label}: WebSite schema missing local church keywords.`);
      }
    }

    for (const navItem of [
      ["Home", rootUrl],
      ["Start Here", `${siteUrl}/start-here/`],
      ["Plan a Visit", `${siteUrl}/plan-a-visit/`],
      ["Teaching", `${siteUrl}/teaching/`],
      ["Ministries", `${siteUrl}/ministries/`],
      ["Contact", `${siteUrl}/contact/`],
    ]) {
      const [name, url] = navItem;
      if (!siteNavigationSchemas.some((schema) => schema.name === name && schema.url === url)) {
        errors.push(`${label}: SiteNavigationElement schema missing ${name}.`);
      }
    }

    const pageSchema = pageSchemas[0];
    if (!pageSchema) {
      errors.push(`${label}: missing inspectable page schema.`);
    } else {
      if (!textIncludes(pageSchema.mainEntity, "#church")) errors.push(`${label}: page schema mainEntity should reference Church schema.`);
      if (!textIncludes(pageSchema.keywords, "Church in Charlton, MA")) {
        errors.push(`${label}: page schema missing local church keywords.`);
      }
      const primaryImageUrl = pageSchema.primaryImageOfPage?.url || "";
      const primaryImagePath = primaryImageUrl ? new URL(primaryImageUrl, siteUrl).pathname : "";
      const expectedImageSize = expectedImageSizes.get(primaryImagePath);
      if (!pageSchema.primaryImageOfPage?.caption || pageSchema.primaryImageOfPage.caption !== ogImageAlt) {
        errors.push(`${label}: primaryImageOfPage caption should match og:image:alt.`);
      }
      if (expectedImageSize) {
        if (
          pageSchema.primaryImageOfPage?.width !== expectedImageSize.width ||
          pageSchema.primaryImageOfPage?.height !== expectedImageSize.height
        ) {
          errors.push(
            `${label}: primaryImageOfPage dimensions are ${pageSchema.primaryImageOfPage?.width}x${pageSchema.primaryImageOfPage?.height}, expected ${expectedImageSize.width}x${expectedImageSize.height}.`,
          );
        }
      }
    }
  }

  for (const anchor of extractAnchors(html)) {
    const href = anchor.href;

    const target = resolveInternalTarget(href);
    if (target && !existsInDist(target)) {
      errors.push(`${label}: broken internal href ${href}.`);
    }

    const targetRoute = target ? htmlRouteFromPathname(target) : null;
    if (!isNoIndex && targetRoute) {
      internalLinkEdges.push({
        from: route,
        target: targetRoute,
        text: anchor.text,
      });
    }
  }

  for (const src of extractUrls(html, "src")) {
    const target = resolveInternalTarget(src);
    if (target && !existsInDist(target)) {
      errors.push(`${label}: broken internal src ${src}.`);
    }
  }

  for (const img of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = img[0];
    if (!/\salt=["'][^"']*["']/i.test(tag)) {
      errors.push(`${label}: image missing alt attribute: ${tag.slice(0, 120)}.`);
    }

    const src = getTagAttribute(tag, "src");
    const expectedThumbnailSize = getYouTubeThumbnailExpectedSize(src);
    if (isYouTubeThumbnailUrl(src) && !expectedThumbnailSize) {
      errors.push(`${label}: YouTube thumbnail should use a recognized thumbnail filename: ${src}.`);
    }
    if (expectedThumbnailSize) {
      const width = Number(getTagAttribute(tag, "width") || 0);
      const height = Number(getTagAttribute(tag, "height") || 0);
      if (width !== expectedThumbnailSize.width || height !== expectedThumbnailSize.height) {
        errors.push(
          `${label}: YouTube thumbnail ${src} should use intrinsic dimensions ${expectedThumbnailSize.width}x${expectedThumbnailSize.height}, found ${width}x${height}.`,
        );
      }
    }
  }

  if (!isNoIndex && ["/plan-a-visit/", "/directions/"].includes(route)) {
    if (!html.includes("Parking is available near the building")) {
      errors.push(`${label}: missing practical parking guidance for visitors.`);
    }
    if (!html.includes("Accessibility questions")) {
      errors.push(`${label}: missing practical accessibility question guidance for visitors.`);
    }
  }

  if (!isNoIndex && ["/", "/contact/", "/directions/", "/church-in-charlton-ma/"].includes(route)) {
    if (!html.includes("<address") || !html.includes("church-contact-block")) {
      errors.push(`${label}: missing semantic church address block.`);
    }
    if (!html.includes('itemprop="streetAddress"') || !html.includes('itemprop="telephone"')) {
      errors.push(`${label}: church address block should expose street address and phone microdata.`);
    }
  }
}

const robotsPath = path.join(distDir, "robots.txt");
if (!fs.existsSync(robotsPath)) {
  errors.push("Missing robots.txt.");
} else {
  const robots = readText(robotsPath);
  if (!robots.includes(`${siteUrl}/sitemap-index.xml`)) {
    errors.push("robots.txt does not reference the production sitemap-index.xml.");
  }
  if (!robots.includes(`${siteUrl}/image-sitemap.xml`)) {
    errors.push("robots.txt does not reference the production image-sitemap.xml.");
  }
  if (!robots.includes(`${siteUrl}/video-sitemap.xml`)) {
    errors.push("robots.txt does not reference the production video-sitemap.xml.");
  }
}

const securityTxtPath = path.join(distDir, ".well-known", "security.txt");
if (!fs.existsSync(securityTxtPath)) {
  errors.push("Missing .well-known/security.txt.");
} else {
  const securityTxt = readText(securityTxtPath);
  const securityContact = `${siteUrl}/contact/`;
  const securityCanonical = `${siteUrl}/.well-known/security.txt`;
  if (!securityTxt.includes(`Contact: ${securityContact}`)) {
    errors.push(".well-known/security.txt should point security reports to the contact page.");
  }
  if (!securityTxt.includes(`Canonical: ${securityCanonical}`)) {
    errors.push(".well-known/security.txt should include the production canonical URL.");
  }
  if (!securityTxt.includes("Preferred-Languages: en")) {
    errors.push(".well-known/security.txt should include Preferred-Languages.");
  }
  const expiresMatch = securityTxt.match(/^Expires:\s*(.+)$/m);
  if (!expiresMatch || Number.isNaN(Date.parse(expiresMatch[1]))) {
    errors.push(".well-known/security.txt should include a valid Expires timestamp.");
  }
}

const noJekyllPath = path.join(distDir, ".nojekyll");
if (!fs.existsSync(noJekyllPath)) {
  errors.push("Missing .nojekyll marker needed for GitHub Pages to serve .well-known routes.");
}

const llmsPath = path.join(distDir, "llms.txt");
if (!fs.existsSync(llmsPath)) {
  errors.push("Missing llms.txt.");
} else {
  const llms = readText(llmsPath);
  for (const expected of [
    "# Wayside Church",
    "Address: 6 Haggerty Rd, Charlton, MA 01507",
    "Sunday Worship: Sunday at 10:00 AM",
    "Coffee and Discipleship: Sunday at 9:00 AM",
    "## Key Pages",
    "## Recent Teaching",
    "## Machine-Readable Resources",
    "https://wayside.church/video-sitemap.xml",
    "https://wayside.church/wayside-church.vcf",
    "Coffee and Discipleship Calendar: https://wayside.church/calendar/coffee-and-discipleship.ics",
    "Identity Groups Calendar: https://wayside.church/calendar/identity-groups.ics",
    "## AI Usage Notes",
    "Do not invent programs, staff names, reviews, service times, or denominational details beyond the public site.",
  ]) {
    if (!llms.includes(expected)) {
      errors.push(`Generated llms.txt is missing ${expected}.`);
    }
  }
  if (!/https:\/\/wayside\.church\/teaching\/[^/\s]+-[A-Za-z0-9_-]{11}\//.test(llms)) {
    errors.push("Generated llms.txt should include at least one generated teaching watch page URL.");
  }
}

const calendarPath = path.join(distDir, "calendar", "wayside-sunday-worship.ics");
if (!fs.existsSync(calendarPath)) {
  errors.push("Missing generated Sunday Worship calendar .ics file.");
} else {
  const calendar = readText(calendarPath);
  for (const expected of [
    "BEGIN:VCALENDAR",
    "SUMMARY:Wayside Church Sunday Worship",
    "DTSTART;TZID=America/New_York:20260705T100000",
    "DTEND;TZID=America/New_York:20260705T113000",
    "RRULE:FREQ=WEEKLY;BYDAY=SU",
    "LOCATION:6 Haggerty Rd\\, Charlton\\, MA 01507",
    "URL:https://wayside.church/",
  ]) {
    if (!calendar.includes(expected)) {
      errors.push(`Generated Sunday Worship calendar is missing ${expected}.`);
    }
  }
}

const ministryCalendarExpectations = [
  {
    file: "coffee-and-discipleship.ics",
    summary: "SUMMARY:Coffee and Discipleship at Wayside Church",
    start: "DTSTART;TZID=America/New_York:20260705T090000",
    end: "DTEND;TZID=America/New_York:20260705T094500",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SU",
    url: "URL:https://wayside.church/ministries/#coffee-and-discipleship",
  },
  {
    file: "little-disciples.ics",
    summary: "SUMMARY:Little Disciples at Wayside Church",
    start: "DTSTART;TZID=America/New_York:20260705T100000",
    end: "DTEND;TZID=America/New_York:20260705T113000",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SU",
    url: "URL:https://wayside.church/ministries/#little-disciples",
  },
  {
    file: "newlife-youth-ministry.ics",
    summary: "SUMMARY:NewLife Youth Ministry at Wayside Church",
    start: "DTSTART;TZID=America/New_York:20260705T100000",
    end: "DTEND;TZID=America/New_York:20260705T113000",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SU",
    url: "URL:https://wayside.church/ministries/#newlife-youth-ministry",
  },
  {
    file: "identity-groups.ics",
    summary: "SUMMARY:Identity Groups at Wayside Church",
    start: "DTSTART;TZID=America/New_York:20260708T180000",
    end: "DTEND;TZID=America/New_York:20260708T193000",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=WE",
    url: "URL:https://wayside.church/ministries/#identity-groups",
  },
];

for (const expectedCalendar of ministryCalendarExpectations) {
  const ministryCalendarPath = path.join(distDir, "calendar", expectedCalendar.file);
  if (!fs.existsSync(ministryCalendarPath)) {
    errors.push(`Missing generated ministry calendar file: ${expectedCalendar.file}.`);
    continue;
  }

  const ministryCalendar = readText(ministryCalendarPath);
  for (const expected of [
    "BEGIN:VCALENDAR",
    expectedCalendar.summary,
    expectedCalendar.start,
    expectedCalendar.end,
    expectedCalendar.recurrence,
    "LOCATION:6 Haggerty Rd\\, Charlton\\, MA 01507",
    expectedCalendar.url,
  ]) {
    if (!ministryCalendar.includes(expected)) {
      errors.push(`Generated ministry calendar ${expectedCalendar.file} is missing ${expected}.`);
    }
  }
}

for (const route of ["/events/", "/ministries/"]) {
  const htmlPath = htmlRouteFromPathname(route);
  if (!fs.existsSync(htmlPath)) continue;

  const html = readText(htmlPath);
  for (const expectedCalendar of ministryCalendarExpectations) {
    const calendarHref = `/calendar/${expectedCalendar.file}`;
    if (!html.includes(calendarHref)) {
      errors.push(`${routeLabel(route)}: missing generated ministry calendar link ${calendarHref}.`);
    }
  }

  if (!html.includes("calendar.google.com/calendar/render")) {
    errors.push(`${routeLabel(route)}: missing Google Calendar links for recurring ministry events.`);
  }
}

const contactCardPath = path.join(distDir, "wayside-church.vcf");
if (!fs.existsSync(contactCardPath)) {
  errors.push("Missing generated Wayside Church contact card.");
} else {
  const contactCard = readText(contactCardPath);
  for (const expected of [
    "BEGIN:VCARD",
    "FN:Wayside Church",
    "TEL;TYPE=WORK,VOICE:+15084340401",
    "ADR;TYPE=WORK:;;6 Haggerty Rd;Charlton;MA;01507;US",
    "URL:https://wayside.church/",
    "Sunday Worship: Sunday at 10:00 AM",
    "Coffee and Discipleship: Sunday at 9:00 AM",
  ]) {
    if (!contactCard.includes(expected)) {
      errors.push(`Generated contact card is missing ${expected}.`);
    }
  }
}

const imageSitemapPath = path.join(distDir, "image-sitemap.xml");
if (!fs.existsSync(imageSitemapPath)) {
  errors.push("Missing image-sitemap.xml.");
} else {
  const imageSitemap = readText(imageSitemapPath);
  const imagePageUrls = extractLocs(imageSitemap);
  const imageUrls = extractImageLocs(imageSitemap);

  if (!imageSitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')) {
    errors.push("image-sitemap.xml is missing the Google image sitemap namespace.");
  }
  if (imagePageUrls.length < 10) {
    errors.push(`image-sitemap.xml should include key visual pages, found ${imagePageUrls.length}.`);
  }
  if (imageUrls.length < 12) {
    errors.push(`image-sitemap.xml should include representative local images, found ${imageUrls.length}.`);
  }

  for (const imagePageUrl of imagePageUrls) {
    if (!sitemapUrls.has(imagePageUrl)) {
      errors.push(`image-sitemap.xml page URL is missing from sitemap-0.xml: ${imagePageUrl}.`);
    }
  }

  for (const imageUrl of imageUrls) {
    let parsedUrl;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      errors.push(`image-sitemap.xml contains invalid image URL: ${imageUrl}.`);
      continue;
    }

    if (parsedUrl.host !== siteHost) {
      errors.push(`image-sitemap.xml image URL should use ${siteHost}: ${imageUrl}.`);
      continue;
    }

    const imagePath = path.join(distDir, decodeURIComponent(parsedUrl.pathname).replace(/^\//, ""));
    if (!fs.existsSync(imagePath)) {
      errors.push(`image-sitemap.xml image does not exist in dist: ${imageUrl}.`);
    }
  }
}

const indexNowScriptPath = path.join(rootDir, "scripts", "submit-indexnow.mjs");
if (!fs.existsSync(indexNowScriptPath)) {
  errors.push("Missing scripts/submit-indexnow.mjs.");
} else {
  const indexNowScript = readText(indexNowScriptPath);
  if (!indexNowScript.includes("image-sitemap.xml")) {
    errors.push("IndexNow submission should include image-sitemap.xml for image discovery.");
  }
  if (!indexNowScript.includes("video-sitemap.xml")) {
    errors.push("IndexNow submission should include video-sitemap.xml for teaching video discovery.");
  }
  if (!indexNowScript.includes("teaching-feed.xml")) {
    errors.push("IndexNow submission should include teaching-feed.xml for automated teaching discovery.");
  }
  if (!indexNowScript.includes("llms.txt")) {
    errors.push("IndexNow submission should include llms.txt for AI-facing site summary discovery.");
  }
  if (!indexNowScript.includes("coffee-and-discipleship.ics") || !indexNowScript.includes("identity-groups.ics")) {
    errors.push("IndexNow submission should include generated ministry calendar files.");
  }
  if (!indexNowScript.includes("INDEXNOW_DRY_RUN")) {
    errors.push("IndexNow submission should keep a dry-run mode for safe verification.");
  }
}

const videoSitemapPath = path.join(distDir, "video-sitemap.xml");
if (!fs.existsSync(videoSitemapPath)) {
  errors.push("Missing video-sitemap.xml.");
} else {
  const videoSitemap = readText(videoSitemapPath);
  const videoPageUrls = extractLocs(videoSitemap);
  const videoPlayerUrls = extractVideoPlayerLocs(videoSitemap);
  const videoThumbnailUrls = extractVideoThumbnailLocs(videoSitemap);
  const videoTitles = extractVideoTitles(videoSitemap);
  const videoDescriptions = extractVideoDescriptions(videoSitemap);

  if (!videoSitemap.includes('xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"')) {
    errors.push("video-sitemap.xml is missing the Google video sitemap namespace.");
  }
  if (videoPageUrls.length < 2) {
    errors.push(`video-sitemap.xml should include teaching video pages, found ${videoPageUrls.length}.`);
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
    errors.push(`video-sitemap.xml should include generated individual teaching watch pages, found ${dedicatedVideoPageUrls.length}.`);
  }
  if (videoPlayerUrls.length < 1) {
    errors.push("video-sitemap.xml should include at least one YouTube player URL.");
  }
  if (videoThumbnailUrls.length < 1) {
    errors.push("video-sitemap.xml should include at least one video thumbnail URL.");
  }
  if (videoTitles.some((title) => title.length === 0 || title.length > 100)) {
    errors.push("video-sitemap.xml video titles should be present and 100 characters or fewer.");
  }
  if (videoDescriptions.some((description) => description.length === 0 || description.length > 2048)) {
    errors.push("video-sitemap.xml video descriptions should be present and 2048 characters or fewer.");
  }

  for (const expectedPageUrl of [`${siteUrl}/teaching/`, `${siteUrl}/sermons/`]) {
    if (!videoPageUrls.includes(expectedPageUrl)) {
      errors.push(`video-sitemap.xml missing ${expectedPageUrl}.`);
    }
  }

  for (const videoPageUrl of videoPageUrls) {
    if (!sitemapUrls.has(videoPageUrl)) {
      errors.push(`video-sitemap.xml page URL is missing from sitemap-0.xml: ${videoPageUrl}.`);
    }
  }

  for (const playerUrl of videoPlayerUrls) {
    try {
      const parsedUrl = new URL(playerUrl);
      if (parsedUrl.host !== "www.youtube.com" || !parsedUrl.pathname.startsWith("/embed/")) {
        errors.push(`video-sitemap.xml player should use a YouTube embed URL: ${playerUrl}.`);
      }
    } catch {
      errors.push(`video-sitemap.xml contains invalid player URL: ${playerUrl}.`);
    }
  }

  for (const thumbnailUrl of videoThumbnailUrls) {
    try {
      const parsedUrl = new URL(thumbnailUrl);
      if (!parsedUrl.host.endsWith("ytimg.com")) {
        errors.push(`video-sitemap.xml thumbnail should use a YouTube thumbnail URL: ${thumbnailUrl}.`);
      }
    } catch {
      errors.push(`video-sitemap.xml contains invalid thumbnail URL: ${thumbnailUrl}.`);
    }
  }

  for (const videoPageUrl of dedicatedVideoPageUrls) {
    const pathname = new URL(videoPageUrl).pathname;
    const route = htmlRouteFromPathname(pathname);
    if (!route) {
      errors.push(`Generated teaching watch page is missing from dist: ${videoPageUrl}.`);
      continue;
    }

    const watchPageHtml = readText(htmlFilePathForRoute(route));
    if (!watchPageHtml.includes("www.youtube-nocookie.com/embed/")) {
      errors.push(`${routeLabel(route)}: generated teaching watch page should embed YouTube using the privacy-enhanced domain.`);
    }
    if (!watchPageHtml.includes("VideoObject")) {
      errors.push(`${routeLabel(route)}: generated teaching watch page should include VideoObject schema.`);
    }
    const watchOgImage = getMetaPropertyContent(watchPageHtml, "og:image");
    const watchTwitterImage = getMetaContent(watchPageHtml, "twitter:image");
    const watchOgImageAlt = getMetaPropertyContent(watchPageHtml, "og:image:alt");
    const watchOgImageWidth = Number(getMetaPropertyContent(watchPageHtml, "og:image:width") || 0);
    const watchOgImageHeight = Number(getMetaPropertyContent(watchPageHtml, "og:image:height") || 0);
    if (!isYouTubeThumbnailUrl(watchOgImage)) {
      errors.push(`${routeLabel(route)}: generated teaching watch page should use the YouTube thumbnail as og:image.`);
    }
    if (watchTwitterImage !== watchOgImage) {
      errors.push(`${routeLabel(route)}: generated teaching watch page twitter:image should match og:image.`);
    }
    if (!watchOgImageAlt.includes("Wayside Church teaching video")) {
      errors.push(`${routeLabel(route)}: generated teaching watch page should describe the video thumbnail in social alt text.`);
    }
    const expectedWatchThumbnailSize = getYouTubeThumbnailExpectedSize(watchOgImage);
    if (!expectedWatchThumbnailSize) {
      errors.push(`${routeLabel(route)}: generated teaching watch page should use a recognized YouTube thumbnail filename.`);
    } else if (watchOgImageWidth !== expectedWatchThumbnailSize.width || watchOgImageHeight !== expectedWatchThumbnailSize.height) {
      errors.push(
        `${routeLabel(route)}: generated teaching watch page should publish YouTube thumbnail dimensions ${expectedWatchThumbnailSize.width}x${expectedWatchThumbnailSize.height}, found ${watchOgImageWidth}x${watchOgImageHeight}.`,
      );
    }
    if (!watchPageHtml.includes("Plan a Visit")) {
      errors.push(`${routeLabel(route)}: generated teaching watch page should include a visitor next step.`);
    }
    if (!watchPageHtml.includes("frame-src https://www.youtube-nocookie.com https://www.youtube.com")) {
      errors.push(`${routeLabel(route)}: CSP should allow only the expected YouTube frame hosts for embedded teaching videos.`);
    }
  }
}

const teachingFeedPath = path.join(distDir, "teaching-feed.xml");
if (!fs.existsSync(teachingFeedPath)) {
  errors.push("Missing teaching-feed.xml.");
} else {
  const teachingFeed = readText(teachingFeedPath);
  const entries = extractAtomEntries(teachingFeed);

  if (!teachingFeed.includes('xmlns="http://www.w3.org/2005/Atom"')) {
    errors.push("teaching-feed.xml is missing the Atom namespace.");
  }
  if (!teachingFeed.includes('xmlns:media="http://search.yahoo.com/mrss/"')) {
    errors.push("teaching-feed.xml is missing the Media RSS namespace for thumbnails.");
  }
  if (!teachingFeed.includes(`<link href="${teachingFeedUrl}" rel="self" type="application/atom+xml" />`)) {
    errors.push("teaching-feed.xml is missing its self link.");
  }
  if (!teachingFeed.includes(`<link href="${siteUrl}/teaching/" rel="alternate" type="text/html" />`)) {
    errors.push("teaching-feed.xml should point readers to /teaching/.");
  }
  if (entries.length < 3) {
    errors.push(`teaching-feed.xml should include multiple recent YouTube entries, found ${entries.length}.`);
  }
  if (entries.some((entry) => !/https:\/\/www\.youtube\.com\/(?:watch\?v=|shorts\/)/.test(entry))) {
    errors.push("teaching-feed.xml entries should link to YouTube videos or Shorts.");
  }
  if (entries.some((entry) => !entry.includes("<media:thumbnail url=\"https://"))) {
    errors.push("teaching-feed.xml entries should include video thumbnails.");
  }
}

const htmlSitemapPath = path.join(distDir, "sitemap", "index.html");
if (!fs.existsSync(htmlSitemapPath)) {
  errors.push("Missing HTML sitemap page at /sitemap/.");
} else {
  const sitemapHtml = readText(htmlSitemapPath);
  const htmlSitemapTargets = new Set(
    extractUrls(sitemapHtml, "href")
      .map(resolveInternalTarget)
      .filter(Boolean)
      .map((pathname) => new URL(pathname, siteUrl).toString()),
  );

  for (const sitemapUrl of sitemapUrls) {
    if (!htmlSitemapTargets.has(sitemapUrl)) {
      errors.push(`/sitemap: missing HTML link to indexed URL ${sitemapUrl}.`);
    }
  }
}

const inboundCounts = new Map([...indexedRoutes].map((route) => [route, 0]));
for (const edge of internalLinkEdges) {
  if (!indexedRoutes.has(edge.from) || !indexedRoutes.has(edge.target)) continue;
  if (edge.from === edge.target || edge.from === "/sitemap/") continue;

  inboundCounts.set(edge.target, (inboundCounts.get(edge.target) || 0) + 1);
}

for (const route of indexedRoutes) {
  if (route === "/") continue;

  if ((inboundCounts.get(route) || 0) === 0) {
    errors.push(`${routeLabel(route)}: indexed page has no non-sitemap internal links.`);
  }
}

if (warnings.length > 0) {
  console.warn("SEO audit warnings:");
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length > 0) {
  console.error("SEO audit failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`SEO audit passed for ${htmlFiles.length} HTML page(s).`);
