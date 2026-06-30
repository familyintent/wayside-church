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
pnpm preview
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
- Plan a Visit page copy
- Sunday Worship page copy and FAQ
- Events page copy and FAQ
- Families page copy
- Teaching page copy
- Sermons page copy and FAQ
- Beliefs page copy
- Ministries page copy, audience labels, and weekly rhythm
- Sunday calendar event settings
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

## SEO

The site includes:

- unique page titles and descriptions
- canonical URLs
- Open Graph and Twitter card metadata
- local church structured data using JSON-LD
- page-level `WebPage`, `AboutPage`, `ContactPage`, and `CollectionPage` structured data
- recurring Sunday worship event schema
- FAQ schema on visitor-focused pages
- video schema for recent teaching pages when YouTube publish dates are available
- leader `Person` schema on the About page
- recurring ministry `Event` schema on the Ministries page
- `public/llms.txt` for AI discovery summaries
- sitemap generation through `@astrojs/sitemap`
- `public/robots.txt`
- `public/site.webmanifest`
- IndexNow key file and deploy notification for participating search engines

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

The homepage and `/teaching/` page automatically fetch YouTube uploads at build time from the channel feed:

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

No homepage, teaching page, or sermons page edit is needed when a new sermon is uploaded. The GitHub Pages workflow runs on pushes, can be run manually, and also rebuilds daily so the build-time YouTube feed can refresh even when no site files change.

If the feed fails during a build, the site shows a graceful fallback message or the configured featured video and a button to visit the YouTube channel.

## Deploy to GitHub Pages

The repository includes `.github/workflows/deploy.yml`.

It runs:

- on every push to `main`
- manually from the GitHub Actions tab with `workflow_dispatch`
- daily on a schedule to refresh build-time content like the latest YouTube teaching
- after deployment, it submits sitemap URLs to IndexNow so participating search engines can discover changed pages faster

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

## Visitor Path

The `Start Here` page is designed for seekers, first-time guests, and people new to faith. Update its copy in `src/content/settings.yaml` under `startHere`.

The `links.connectCard` value is ready for a future Planning Center, Church Center, Fillout, Microsoft Forms, or similar follow-up form. Until a dedicated form is ready, it can point to `/contact/`.

## Sunday Calendar

The Plan a Visit and Contact pages include calendar links for Google/Gmail, Apple/iPhone, and Outlook.

Update the editable event text and Google Calendar link settings in:

```text
src/content/settings.yaml
```

under `calendar.sunday`.

Apple/iPhone and Outlook use this standards-based recurring calendar file:

```text
public/calendar/wayside-sunday-worship.ics
```

If the worship time, address, or event description changes, update both `calendar.sunday` and the `.ics` file so all calendar options stay aligned.

## Notes

- The site is mobile-first and uses semantic HTML.
- Navigation, buttons, and FAQ details are keyboard-friendly.
- External GivingTools, Microsoft Forms, and social links are configurable in one settings file.
- The supplied Wayside logo is used for the site mark, favicon, app icons, and social preview image.
