const siteUrl = process.env.INDEXNOW_SITE_URL || "https://wayside.church";
const endpoint = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";
const key = process.env.INDEXNOW_KEY || "5ea8c2e9256b462dbad69ce5b252e339";
const isDryRun = ["1", "true", "yes"].includes((process.env.INDEXNOW_DRY_RUN || "").toLowerCase());
const rootUrl = siteUrl.replace(/\/$/, "");
const host = new URL(siteUrl).host;
const keyLocation = `${rootUrl}/${key}.txt`;
const sitemapIndexUrl = `${rootUrl}/sitemap-index.xml`;
const imageSitemapUrl = `${rootUrl}/image-sitemap.xml`;
const videoSitemapUrl = `${rootUrl}/video-sitemap.xml`;

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].trim());
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8",
      "User-Agent": "WaysideChurchIndexNow/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function getSitemapUrls() {
  const sitemapIndex = await fetchText(sitemapIndexUrl);
  const sitemapUrls = extractLocs(sitemapIndex).filter((url) => url.endsWith(".xml"));
  const discoveryUrls = [sitemapIndexUrl, ...sitemapUrls, imageSitemapUrl, videoSitemapUrl];

  if (sitemapUrls.length === 0) {
    return [...discoveryUrls, ...extractLocs(sitemapIndex)];
  }

  const pageUrlSets = await Promise.all(
    sitemapUrls.map(async (sitemapUrl) => extractLocs(await fetchText(sitemapUrl))),
  );

  return [...discoveryUrls, ...pageUrlSets.flat()];
}

function dedupeValidUrls(urls) {
  const validUrls = urls.filter((url) => {
    try {
      return new URL(url).host === host;
    } catch {
      return false;
    }
  });

  return [...new Set(validUrls)];
}

async function main() {
  const urlList = dedupeValidUrls(await getSitemapUrls());

  if (urlList.length === 0) {
    console.log("No sitemap URLs found for IndexNow submission.");
    return;
  }

  if (isDryRun) {
    console.log(`IndexNow dry run found ${urlList.length} URL(s).`);
    urlList.forEach((url) => console.log(url));
    return;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json,text/plain,*/*",
    },
    body: JSON.stringify({
      host,
      key,
      keyLocation,
      urlList,
    }),
  });

  const body = await response.text();

  if (!response.ok) {
    console.warn(`IndexNow notification returned ${response.status} ${response.statusText}.`);
    if (body) console.warn(body);
    return;
  }

  console.log(`Submitted ${urlList.length} URL(s) to IndexNow with status ${response.status}.`);
}

main().catch((error) => {
  console.warn(`IndexNow notification skipped: ${error.message}`);
});
