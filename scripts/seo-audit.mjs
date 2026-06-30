import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const siteUrl = "https://wayside.church";
const siteHost = new URL(siteUrl).host;
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
  const regex = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i");
  return html.match(regex)?.[1] || "";
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

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].trim());
}

if (!fs.existsSync(distDir)) {
  errors.push("Missing dist directory. Run `pnpm build` before `pnpm seo:audit`.");
}

const htmlFiles = fs.existsSync(distDir) ? walkFiles(distDir, (filePath) => filePath.endsWith(".html")) : [];
const sitemapPath = path.join(distDir, "sitemap-0.xml");
const sitemapUrls = fs.existsSync(sitemapPath) ? new Set(extractLocs(readText(sitemapPath))) : new Set();
const titles = new Map();
const descriptions = new Map();

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
  if (!isNoIndex && h1Count !== 1) errors.push(`${label}: expected exactly one H1, found ${h1Count}.`);

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
  for (const block of jsonLdBlocks) {
    try {
      allSchemaTypes.push(...schemaTypes(JSON.parse(block)));
    } catch (error) {
      errors.push(`${label}: invalid JSON-LD (${error.message}).`);
    }
  }

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

  for (const href of extractUrls(html, "href")) {
    if (isNoIndex && href === canonical) continue;

    const target = resolveInternalTarget(href);
    if (target && !existsInDist(target)) {
      errors.push(`${label}: broken internal href ${href}.`);
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
}

const llmsPath = path.join(distDir, "llms.txt");
if (!fs.existsSync(llmsPath)) {
  errors.push("Missing llms.txt.");
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
