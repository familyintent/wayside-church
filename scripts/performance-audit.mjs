import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const publicImagesDir = path.join(rootDir, "public", "images");
const siteHost = "wayside.church";
const errors = [];
const warnings = [];

const budgets = {
  htmlFile: 64 * 1024,
  cssFile: 80 * 1024,
  cssTotal: 96 * 1024,
  jsFile: 40 * 1024,
  jsTotal: 64 * 1024,
  imageFile: 300 * 1024,
  imageTotal: 1700 * 1024,
};

const imageExtensions = new Set([".avif", ".jpg", ".jpeg", ".png", ".svg", ".webp"]);

function walkFiles(dir, predicate = () => true, acc = []) {
  if (!fs.existsSync(dir)) return acc;

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

function relativePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function kib(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function assertBudget(label, bytes, limit) {
  if (bytes > limit) {
    fail(`${label} is ${kib(bytes)}, above the ${kib(limit)} budget.`);
  }
}

function sumBytes(files) {
  return files.reduce((total, filePath) => total + fs.statSync(filePath).size, 0);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractTagAttribute(html, tag, attribute) {
  const pattern = new RegExp(`<${tag}\\b[^>]*\\s${attribute}=(["'])(.*?)\\1[^>]*>`, "gi");
  return [...html.matchAll(pattern)].map((match) => match[2]);
}

function extractSrcsetUrls(srcset) {
  return srcset
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function getUrl(rawUrl) {
  try {
    return new URL(rawUrl, `https://${siteHost}`);
  } catch {
    return null;
  }
}

function isInternalAsset(rawUrl) {
  if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("#")) return false;

  const url = getUrl(rawUrl);
  return Boolean(url && url.host === siteHost);
}

function isAllowedExternalImage(rawUrl) {
  const url = getUrl(rawUrl);
  return Boolean(url && url.protocol === "https:" && url.host.endsWith(".ytimg.com"));
}

function isAllowedExternalFrame(rawUrl) {
  const url = getUrl(rawUrl);
  return Boolean(
    url &&
      url.protocol === "https:" &&
      (url.host === "www.youtube-nocookie.com" || url.host === "www.youtube.com")
  );
}

function localPathForInternalAsset(rawUrl) {
  const url = getUrl(rawUrl);
  if (!url || url.host !== siteHost) return null;

  const pathname = decodeURIComponent(url.pathname.replace(/^\//, ""));
  return path.join(distDir, pathname);
}

function assertInternalAssetExists(rawUrl, context) {
  if (!isInternalAsset(rawUrl)) return;

  const filePath = localPathForInternalAsset(rawUrl);
  if (!filePath || !fs.existsSync(filePath)) {
    fail(`${context} references missing internal asset ${rawUrl}.`);
  }
}

function checkHtmlFile(filePath) {
  const html = readText(filePath);
  const route = relativePath(filePath).replace(/^dist\//, "/");
  const size = fs.statSync(filePath).size;

  assertBudget(`${route}`, size, budgets.htmlFile);

  if (!html.includes("Content-Security-Policy")) {
    fail(`${route} is missing the Content-Security-Policy meta tag.`);
  }

  if (!html.includes("upgrade-insecure-requests")) {
    fail(`${route} CSP should include upgrade-insecure-requests.`);
  }

  if (html.includes("'unsafe-eval'")) {
    fail(`${route} CSP should not allow unsafe-eval.`);
  }

  for (const src of extractTagAttribute(html, "script", "src")) {
    if (!isInternalAsset(src)) {
      fail(`${route} loads an unexpected external script: ${src}`);
    }
    assertInternalAssetExists(src, route);
  }

  for (const href of extractTagAttribute(html, "link", "href")) {
    const linkTag = html.match(new RegExp(`<link\\b[^>]*href=["']${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "i"))?.[0] || "";
    if (/rel=["'][^"']*stylesheet/i.test(linkTag)) {
      if (!isInternalAsset(href)) {
        fail(`${route} loads an unexpected external stylesheet: ${href}`);
      }
      assertInternalAssetExists(href, route);
    }
  }

  for (const src of extractTagAttribute(html, "img", "src")) {
    if (isInternalAsset(src)) {
      assertInternalAssetExists(src, route);
      continue;
    }

    if (!isAllowedExternalImage(src)) {
      fail(`${route} uses an unexpected external image: ${src}`);
    }
  }

  for (const srcset of extractTagAttribute(html, "img", "srcset")) {
    for (const srcsetUrl of extractSrcsetUrls(srcset)) {
      if (isInternalAsset(srcsetUrl)) {
        assertInternalAssetExists(srcsetUrl, route);
      } else if (!isAllowedExternalImage(srcsetUrl)) {
        fail(`${route} uses an unexpected external srcset image: ${srcsetUrl}`);
      }
    }
  }

  for (const src of extractTagAttribute(html, "iframe", "src")) {
    if (!isAllowedExternalFrame(src)) {
      fail(`${route} uses an unexpected iframe source: ${src}`);
    }
  }
}

if (!fs.existsSync(distDir)) {
  fail("Missing dist/. Run pnpm build before pnpm performance:audit.");
} else {
  const htmlFiles = walkFiles(distDir, (filePath) => filePath.endsWith(".html"));
  const cssFiles = walkFiles(path.join(distDir, "_astro"), (filePath) => filePath.endsWith(".css"));
  const jsFiles = walkFiles(path.join(distDir, "_astro"), (filePath) => filePath.endsWith(".js"));
  const imageFiles = walkFiles(distDir, (filePath) => imageExtensions.has(path.extname(filePath).toLowerCase()));
  const publicImages = walkFiles(publicImagesDir, (filePath) => imageExtensions.has(path.extname(filePath).toLowerCase()));
  const homepagePath = path.join(distDir, "index.html");

  htmlFiles.forEach(checkHtmlFile);
  cssFiles.forEach((filePath) => assertBudget(relativePath(filePath), fs.statSync(filePath).size, budgets.cssFile));
  jsFiles.forEach((filePath) => assertBudget(relativePath(filePath), fs.statSync(filePath).size, budgets.jsFile));
  imageFiles.forEach((filePath) => assertBudget(relativePath(filePath), fs.statSync(filePath).size, budgets.imageFile));
  publicImages.forEach((filePath) =>
    assertBudget(`${relativePath(filePath)} should be web-ready before it is copied to dist`, fs.statSync(filePath).size, budgets.imageFile),
  );

  assertBudget("Total Astro CSS", sumBytes(cssFiles), budgets.cssTotal);
  assertBudget("Total Astro JS", sumBytes(jsFiles), budgets.jsTotal);
  assertBudget("Total deployed image assets", sumBytes(imageFiles), budgets.imageTotal);

  if (fs.existsSync(homepagePath)) {
    const homepage = readText(homepagePath);
    if (!homepage.includes('rel="preload"') || !homepage.includes('as="image"')) {
      fail("Homepage should preload the hero image for faster LCP discovery.");
    }

    if (!homepage.includes('imagesrcset="/images/wayside-welcome-hero-640.webp 640w')) {
      fail("Homepage hero preload should keep responsive WebP candidates.");
    }

    if (!homepage.includes('imagesizes="100vw"')) {
      fail("Homepage hero preload should keep the mobile-first imagesizes attribute.");
    }

    if (!homepage.includes('fetchpriority="high"')) {
      fail("Homepage hero image should keep fetchpriority=\"high\" for LCP.");
    }

    if (!homepage.includes("wayside-welcome-hero-640.webp 640w")) {
      fail("Homepage hero image should keep responsive WebP srcset candidates.");
    }

    if (!homepage.includes('sizes="100vw"')) {
      fail("Homepage hero image should keep a mobile-first sizes attribute.");
    }
  }

  if (cssFiles.length === 0) {
    warn("No compiled CSS files found in dist/_astro.");
  }
}

if (warnings.length > 0) {
  console.warn("Performance audit warnings:");
  warnings.forEach((message) => console.warn(`- ${message}`));
}

if (errors.length > 0) {
  console.error("Performance audit failed:");
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("Performance audit passed: deployed HTML, CSS, JS, images, hero priority, and third-party asset boundaries are within budget.");
