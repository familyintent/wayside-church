# Wayside Church Website

Fast static Astro site for Wayside Church in Charlton, MA.

## Quick Start

```bash
pnpm install
pnpm dev
```

Build for production:

```bash
pnpm build
pnpm seo:audit
pnpm automation:audit
pnpm performance:audit
pnpm preview
```

Check the deployed production site after a Pages deploy:

```bash
pnpm seo:live
```

## Content Updates

Most editable church content lives in:

```text
src/content/settings.yaml
```

That file includes comments showing where to update:

- service times
- address and phone
- homepage copy
- Start Here page copy for seekers and first-time guests
- New to Church page copy for seekers, returning guests, and people unfamiliar with church
- Nearby Communities page copy and FAQ
- Plan a Visit page copy
- practical visitor details such as parking, children and youth, coffee, and accessibility questions
- Visitor FAQ page copy
- Directions page copy and FAQ
- Sunday Worship page copy and FAQ
- Events page copy and FAQ
- Families page copy
- Leadership page copy and FAQ
- Teaching page copy
- Sermons page copy and FAQ
- Beliefs page copy
- Ministries page copy, audience labels, and weekly rhythm
- Sunday calendar event settings for Google, Apple/iPhone, and Outlook
- generated recurring ministry calendars for gatherings that have a stable event day and time
- ministries
- giving, newsletter, YouTube, and social links
- optional connect card / follow-up link
- leader bios
- contact page FAQ

Images live in:

```text
public/images/
```

To change an image, add the new file there and update the matching path in `src/content/settings.yaml`.

The logo mark lives in:

```text
public/images/wayside-logo-mark-navy.png
public/images/wayside-logo-mark-white.png
public/favicon.png
public/favicon-32.png
public/apple-touch-icon.png
public/icon-192.png
public/icon-512.png
public/images/wayside-social-card.jpg
```

The logo, favicon, and app icons were generated from the supplied Wayside logo file. The social card is used for link previews on Facebook, Messages, and other platforms.

Large page photos should use the optimized `.webp` variants referenced in `src/content/settings.yaml`. Keep replacement hero, community, map, and leader images reasonably compressed so the homepage stays fast for mobile visitors.

Full-size originals that should not be deployed live in:

```text
source-assets/original-images/
```

Keep public images web-ready before putting them in `public/images/`; files in `public/` are copied directly to the deployed site.

## SEO

The site includes:

- unique page titles and descriptions
- canonical URLs
- Open Graph and Twitter card metadata
- local church structured data using JSON-LD
- enhanced local `Church` schema for public access, free access, Sunday hours, real photo objects, and local keywords
- entity-focused `Church` and `WebSite` schema with common local names, mission, topical focus, and the official site relationship
- page-level `WebPage`, `AboutPage`, `ContactPage`, and `CollectionPage` structured data
- local entity checks for address, phone, map link, social profiles, service hours, and nearby communities
- a nearby-neighbor page with real town direction links and structured direction actions, without creating thin duplicate town pages
- semantic church address blocks for consistent name, address, phone, and map details
- generated `wayside-church.vcf` contact card from the same editable church settings
- visible breadcrumb navigation with matching `BreadcrumbList` structured data
- recurring Sunday worship event schema
- generated recurring calendar files for Sunday Worship and ministry gatherings
- FAQ schema on visitor-focused pages
- practical visitor detail structured data for parking and first-visit planning
- video schema for recent teaching pages when YouTube publish dates are available
- build-time generated watch pages for recent YouTube teachings, so each message has a local page where the video is the main content
- page-specific social preview thumbnails for generated teaching watch pages
- automatic YouTube thumbnail dimensions for latest and recent teaching cards, so feed-driven video images stay stable in the layout
- responsive WebP variants with `srcset` and `sizes` for real Wayside photos, so large local images stay sharp without forcing oversized downloads
- search-friendly 1:1, 4:3, and 16:9 real Wayside image crops for local entity schema and image discovery
- a reusable `pnpm performance:audit` check for deployed HTML, CSS, JS, image weight, homepage hero priority, responsive hero candidates, and unexpected third-party asset loads
- leader `Person` schema on the About page
- recurring ministry `Event` schema on the Ministries page
- generated `llms.txt` for AI discovery summaries, current visitor facts, machine-readable resources, and recent teaching links
- a reusable `pnpm seo:audit` check for canonical URLs, sitemap coverage, local structured data, image alt text, and broken internal links
- a reusable `pnpm automation:audit` check that protects the YouTube-powered latest and recent teaching sections from becoming manual content lists
- a manual `pnpm seo:live` check for production redirects, robots, sitemaps, live canonicals, live local schema, and live recent-teaching output
- sitemap generation through `@astrojs/sitemap`
- a human-readable `/sitemap/` page that links every indexed page without cluttering the main footer
- `image-sitemap.xml` for representative real Wayside images on key pages
- `video-sitemap.xml` generated from the YouTube-powered recent teaching feed
- `teaching-feed.xml` generated from the same YouTube uploads for automated teaching discovery
- `llms.txt` generated from the editable church settings and YouTube feed so AI-facing facts stay aligned with the website
- page-specific social image alt text and structured-data image captions
- visible navigation structured data and an internal-link audit so indexed pages are reachable through the real site, not only the sitemap
- `public/robots.txt`
- generated `/.well-known/security.txt` with the current contact URL, canonical URL, and expiration date
- `public/.nojekyll` so GitHub Pages serves dot-prefixed paths such as `/.well-known/security.txt`
- `public/site.webmanifest`
- IndexNow key file and deploy notification for participating search engines, including page, sitemap, image-sitemap, video-sitemap, teaching-feed, llms.txt, and generated calendar URLs

The production URL is configured as `https://wayside.church` in `astro.config.mjs` and `src/content/settings.yaml` under `meta`. Update the default description, logo, and social image in `src/content/settings.yaml` under `meta`.

GitHub Pages custom domain support is kept in:

```text
public/CNAME
```

Ongoing local SEO work is documented in:

```text
docs/local-seo-operations-playbook.md
docs/local-seo-backlink-kit.md
```

## Latest YouTube Teaching

The homepage, `/teaching/` page, `/sermons/` page, and generated individual watch pages automatically fetch YouTube uploads at build time from the channel feed:

```yaml
youtube:
  channelId: "UCETcyl8b0ylPXNQtUtTZpAQ"
  feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCETcyl8b0ylPXNQtUtTZpAQ"
  channelVideosUrl: "https://www.youtube.com/@waysidechurch864/videos"
  featuredVideo:
    title: "20. The Day of Salvation"
    videoId: "8seMnGM1qZk"
```

If Wayside changes YouTube channels, update `channelId`, `handle`, `feedUrl`, `channelVideosUrl`, and the `links.youtube` value in `src/content/settings.yaml`.

The site tries the YouTube feed first, then the public channel videos page, then the configured `featuredVideo`. If YouTube blocks the automatic lookup, update `featuredVideo.videoId` to keep a real teaching card on the homepage.

No homepage, teaching page, sermons page, recent-message card, individual watch page, video-sitemap, or teaching-feed edit is needed when a new sermon is uploaded. The latest teaching, recent-message grids, local watch pages, video sitemap, and teaching feed come from YouTube automatically. `pnpm automation:audit` verifies this wiring. The GitHub Pages workflow runs on pushes, can be run manually, and also rebuilds daily so the build-time YouTube feed can refresh even when no site files change.

Each generated watch page lives under `/teaching/` with a title-based URL and the YouTube video ID. These pages embed the video with YouTube's privacy-enhanced domain and include VideoObject structured data.

If the feed fails during a build, the site shows a graceful fallback message or the configured featured video and a button to visit the YouTube channel.

## Deploy to GitHub Pages

The repository includes `.github/workflows/deploy.yml`.

It runs:

- on every push to `main`
- manually from the GitHub Actions tab with `workflow_dispatch`
- daily on a schedule to refresh build-time content like the latest YouTube teaching
- Node.js 24 with current pinned GitHub Actions releases
- `pnpm seo:audit` after the Astro build, before the Pages artifact is uploaded
- `pnpm automation:audit` after the SEO audit, so recent teaching stays connected to the YouTube feed instead of becoming manual page content
- `pnpm performance:audit` before upload, so oversized raw images, bloated assets, or unexpected third-party scripts do not ship to GitHub Pages
- after deployment, it submits page, sitemap, image-sitemap, video-sitemap, teaching-feed, and llms.txt URLs to IndexNow so participating search engines can discover changed pages, visual assets, teaching videos, and AI-facing site facts faster

After a deploy finishes, you can run `pnpm seo:live` locally to verify the public site, canonical redirects, live sitemap coverage, deployed structured data, and live recent-teaching cards.

The custom domain is configured by:

```text
public/CNAME
CNAME
```

The IndexNow verification key is hosted at:

```text
public/5ea8c2e9256b462dbad69ce5b252e339.txt
```

If the key is rotated later, update the file name, file contents, and `INDEXNOW_KEY` in `.github/workflows/deploy.yml`.

To verify the IndexNow URL list without submitting it:

```powershell
$env:INDEXNOW_DRY_RUN = "true"
node scripts/submit-indexnow.mjs
```

## Deploy to Vercel

1. Push this folder to a Git repository.
2. Import the repository in Vercel.
3. Framework preset: `Astro`.
4. Build command: `pnpm build`.
5. Output directory: `dist`.
6. Optional: add a scheduled deploy hook so the YouTube latest teaching refreshes automatically.

## Deploy to Netlify

1. Push this folder to a Git repository.
2. Create a new Netlify site from the repository.
3. Build command: `pnpm build`.
4. Publish directory: `dist`.
5. Optional: configure a scheduled build or build hook to refresh the YouTube feed.

## Project Structure

```text
public/
  images/              Static site images
src/
  components/          Reusable UI components
  content/settings.yaml Editable church content and links
  layouts/             Page shell
  lib/                 Content and YouTube helpers
  pages/               Astro routes
  styles/global.css    Design system and layout styles
```

The AI discovery summary at `/llms.txt` is generated by:

```text
src/pages/llms.txt.ts
```

It pulls church facts from `src/content/settings.yaml` and recent teaching links from the YouTube feed, so it should not be manually edited in `public/`.

## Visitor Path

The `Start Here` page is designed for seekers, first-time guests, and people new to faith. Update its copy in `src/content/settings.yaml` under `startHere`.

The practical visitor details on Plan a Visit and Directions are edited in `src/content/settings.yaml` under `visitDetails`. Keep parking, children and youth, coffee, and accessibility wording accurate to the real Sunday experience.

The `links.connectCard` value is ready for a future Planning Center, Church Center, Fillout, Microsoft Forms, or similar follow-up form. Until a dedicated form is ready, it can point to `/contact/`.

## Sunday Calendar

The Plan a Visit and Contact pages include calendar links for Google/Gmail, Apple/iPhone, and Outlook.

Update the editable event text and Google Calendar link settings in:

```text
src/content/settings.yaml
```

under `calendar.sunday`.

Apple/iPhone and Outlook use this standards-based recurring calendar route:

```text
src/pages/calendar/wayside-sunday-worship.ics.ts
```

If the worship time, address, or event description changes, update `calendar.sunday` only. The `.ics` file is generated during the Astro build so all calendar options stay aligned.

## Ministry Calendars

Ministry cards on `/ministries/` and `/events/` include Google Calendar and Apple/Outlook links when a ministry has an `event` block in:

```text
src/content/settings.yaml
```

Generated ministry calendar files live at:

```text
src/pages/calendar/[slug].ics.ts
```

Only add an `event` block for gatherings with a stable recurring day and time. Leave it off for quarterly or irregular gatherings, such as men's events, so the site does not publish misleading calendar details.

## Notes

- The site is mobile-first and uses semantic HTML.
- Navigation, buttons, and FAQ details are keyboard-friendly.
- External GivingTools, Microsoft Forms, and social links are configurable in one settings file.
- The supplied Wayside logo is used for the site mark, favicon, app icons, and social preview image.
