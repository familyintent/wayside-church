const siteUrl = process.env.LIVE_SEO_SITE_URL || "https://wayside.church";
const rootUrl = new URL("/", siteUrl).toString();
const siteHost = new URL(siteUrl).host;
const errors = [];
const warnings = [];

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

function extractJsonLd(html) {
  return [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) =>
    match[1].trim(),
  );
}

function extractUrls(html, attributeName) {
  return [...html.matchAll(new RegExp(`\\s${attributeName}=["']([^"']+)["']`, "gi"))].map((match) => match[1]);
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

  if (!webSiteSchema?.keywords || !textIncludes(webSiteSchema.keywords, "Church in Charlton, MA")) {
    reportError("WebSite schema missing local church keywords.");
  }

  if (!textIncludes(pageSchema?.mainEntity, "#church")) {
    reportError("Homepage WebPage schema should point mainEntity to Church schema.");
  }
}

async function checkLivePages(sitemapUrls) {
  const htmlSitemapUrl = new URL("/sitemap/", rootUrl).toString();
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

    const pathname = new URL(url).pathname;
    if (!htmlSitemapTargets.has(new URL(pathname, rootUrl).toString())) {
      reportError(`/sitemap/ missing link to ${url}.`);
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
  await checkLivePages(sitemapUrls);
  await checkLiveTeachingPages();

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
