# Local SEO Operations Playbook

Use this as the ongoing, legitimate SEO rhythm for Wayside Church. The website now has strong technical and content foundations, but local ranking also depends on accurate off-site profiles, steady activity, and real community signals.

## Weekly Rhythm

- After a sermon is uploaded to YouTube, either wait for the daily GitHub Pages rebuild or manually run the deploy workflow from GitHub Actions to refresh the homepage, teaching page, sermons page, video sitemap, and teaching feed.
- Add one fresh photo to Google Business Profile when there is a real church moment worth sharing: Sunday setup, fellowship, meals, ministry rhythms, baptisms, outreach, or building updates.
- Add one short Google Business Profile post when there is a real next step: Sunday worship, holiday gatherings, community care, teaching series, or ministry updates.
- Update the YouTube description for new teachings with:
  - Wayside Church
  - 6 Haggerty Rd, Charlton, MA 01507
  - Sunday Worship at 10:00 AM
  - https://wayside.church/teaching/
  - https://wayside.church/plan-a-visit/
- Share the newest teaching on Facebook with a natural sentence about the Scripture or theme.

## Monthly Rhythm

- Check Google Business Profile hours, service time, website URL, phone, address, photos, and categories.
- Keep every public profile and citation pointed to the canonical domain: `https://wayside.church/`. Do not mix in `https://www.wayside.church/` unless the directory forces it; `www` should redirect to the apex domain.
- Verify domain consistency after DNS or hosting changes:
  - `https://wayside.church/` should load the current Astro site.
  - `https://www.wayside.church/` should 301 redirect to `https://wayside.church/`.
  - `http://wayside.church/` should 301 redirect to `https://wayside.church/`.
- Check Apple Maps and Bing Places for the same name, address, phone, and website.
- Add one local or ministry update to Facebook that points to a relevant site page.
- Review Google Search Console for indexing, sitemap, query, and page performance issues. Keep `https://wayside.church/sitemap-index.xml` submitted.
- Check Bing Webmaster Tools after major launches or page additions. The deploy workflow also submits sitemap URLs through IndexNow for participating search engines.
- Run `pnpm build` and `pnpm seo:audit` before major SEO edits. The audit checks canonical URLs, sitemap coverage, structured data, local church entity fields, image alt text, and internal links.
- Run `pnpm automation:audit` before major deploys if teaching or sermon pages change. It confirms the latest and recent teaching sections still come from YouTube instead of manual cards.
- Run `pnpm seo:live` after major deploys or DNS changes. It verifies production redirects, robots, sitemap coverage, live canonicals, live local schema, and live recent-teaching cards.
- Keep real Wayside photos in `public/images/` and listed in `image-sitemap.xml` through `src/pages/image-sitemap.xml.ts` so search engines can discover actual church imagery, not just a generic preview card.
- Keep recent teaching discoverable through generated `/teaching/.../` watch pages, `video-sitemap.xml`, and `teaching-feed.xml`, all generated from the same YouTube feed used by the Teaching and Sermons pages. Staff should only need to upload the sermon to YouTube.
- Keep `/llms.txt` generated from site settings and the YouTube feed so AI tools see current service times, contact details, official pages, machine-readable resources, and recent teaching pages.
- Keep generated calendar links aligned with real ministry rhythms. Only ministries with a stable weekly day and time should have an `event` block in `src/content/settings.yaml`; irregular or quarterly gatherings should invite people to reach out for the next date.
- Keep the human-readable site map at `https://wayside.church/sitemap/` current. It should link every indexed page while the footer stays simple for visitors.
- Look for one legitimate local mention or backlink opportunity from:
  - Advent Christian or regional church directories
  - local ministry partners
  - Charlton community calendars
  - Dudley, Oxford, Sturbridge, and Southbridge community calendars when Wayside has a real public event that would serve those neighbors
  - Worcester County community directories
  - nonprofit or service partners
  - event listings for real public gatherings

## Review Growth

Do not script or pressure reviews. Ask naturally when someone has had a real, positive experience with Wayside.

Simple ask:

> If Wayside has been a blessing to you, a short honest Google review helps local families find the church when they search online.

Good review prompts:

- What helped you feel welcome?
- What would you want a first-time guest to know?
- How has Wayside helped you or your family grow in faith?

## Page Links to Use

- Main site: https://wayside.church/
- Nearby Communities: https://wayside.church/nearby-communities/
- Sunday Worship: https://wayside.church/sunday-worship/
- Plan a Visit: https://wayside.church/plan-a-visit/
- Visitor FAQ: https://wayside.church/visitor-faq/
- New to Church: https://wayside.church/new-to-church/
- Directions: https://wayside.church/directions/
- Events: https://wayside.church/events/
- Church in Charlton, MA: https://wayside.church/church-in-charlton-ma/
- Teaching: https://wayside.church/teaching/
- Sermons: https://wayside.church/sermons/
- Families: https://wayside.church/families/
- Leadership: https://wayside.church/leadership/
- Beliefs: https://wayside.church/beliefs/
- Ministries: https://wayside.church/ministries/
- Contact: https://wayside.church/contact/

## Content Ideas That Fit Wayside

- What to expect this Sunday at Wayside Church in Charlton
- A short clip or quote from the latest teaching
- A photo from Coffee and Discipleship
- A family-friendly Sunday reminder
- A ministry rhythm reminder for men, youth, children, or Identity Groups
- A local Charlton care story when there is a real story to tell
- A helpful Sunday invitation for neighbors in Dudley, Oxford, Sturbridge, or Southbridge when the post is tied to a real gathering, teaching series, or event
- A holiday service or seasonal invitation

## Search Console and Business Profile Checklist

- Verify `wayside.church` as a Google Search Console domain property.
- Submit `https://wayside.church/sitemap-index.xml`.
- Use URL Inspection after major page updates for:
  - `https://wayside.church/`
  - `https://wayside.church/church-in-charlton-ma/`
  - `https://wayside.church/nearby-communities/`
  - `https://wayside.church/sunday-worship/`
  - `https://wayside.church/plan-a-visit/`
  - `https://wayside.church/visitor-faq/`
  - `https://wayside.church/new-to-church/`
  - `https://wayside.church/directions/`
  - `https://wayside.church/events/`
  - `https://wayside.church/teaching/`
  - `https://wayside.church/sermons/`
  - `https://wayside.church/leadership/`
- In Google Business Profile, keep the website URL, phone, service time, address, photos, and description aligned with the website.
- Make the Google Business Profile description natural and local, not stuffed: Wayside Church is a welcoming Christian church in Charlton, MA, gathering Sundays at 10:00 AM at 6 Haggerty Rd and welcoming neighbors from Dudley, Oxford, Sturbridge, Southbridge, and nearby Worcester County communities.
- Link real public events, seasonal gatherings, and teaching updates back to the most relevant page rather than always linking only to the homepage.

## What Not To Do

- Do not buy backlinks.
- Do not use fake reviews.
- Do not create doorway pages for towns where Wayside has no real connection.
- Do not stuff "church in Charlton" unnaturally into every sentence.
- Do not copy generic church blog content just to publish more pages.

The goal is simple: make it easy for real people in Charlton, Dudley, Oxford, Sturbridge, Southbridge, and nearby communities to find a real church family, and make every public profile tell the same true story.
