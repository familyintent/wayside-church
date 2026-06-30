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
- ministries
- giving, newsletter, YouTube, and social links
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
public/images/wayside-social-card.png
```

These were generated from the supplied Wayside logo file and are transparent PNGs for use on light and dark backgrounds. The social card is used for link previews on Facebook, Messages, and other platforms.

## SEO

The site includes:

- unique page titles and descriptions
- canonical URLs
- Open Graph and Twitter card metadata
- local church structured data using JSON-LD
- sitemap generation through `@astrojs/sitemap`
- `public/robots.txt`
- `public/site.webmanifest`

Update the production URL, default description, logo, and social image in `src/content/settings.yaml` under `meta`.

## Latest YouTube Teaching

The homepage automatically fetches the newest YouTube upload at build time from the channel feed:

```yaml
youtube:
  channelId: "UCETcyl8b0ylPXNQtUtTZpAQ"
  feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCETcyl8b0ylPXNQtUtTZpAQ"
```

If Wayside changes YouTube channels, update `channelId`, `handle`, `feedUrl`, and the `links.youtube` value in `src/content/settings.yaml`.

No homepage edit is needed when a new sermon is uploaded. For a static deployment, schedule regular rebuilds in Vercel or Netlify so the build-time feed refreshes.

If the feed fails during a build, the site shows a graceful fallback message and a button to visit the YouTube channel.

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

## Notes

- The site is mobile-first and uses semantic HTML.
- Navigation, buttons, and FAQ details are keyboard-friendly.
- External GivingTools, Microsoft Forms, and social links are configurable in one settings file.
- The custom Wayside logo is inline SVG, with a small favicon in `public/favicon.svg`.
