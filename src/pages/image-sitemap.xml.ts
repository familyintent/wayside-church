import { site } from "../lib/content";
import { absoluteUrl } from "../lib/paths";

type ImageSitemapEntry = {
  page: string;
  images: Array<{
    path: string;
    title: string;
    caption: string;
  }>;
};

const entries: ImageSitemapEntry[] = [
  {
    page: "/",
    images: [
      ...(site.images.localEntity || []).map((path: string) => ({
        path,
        title: "Wayside Church in Charlton, MA",
        caption: "Real Wayside Church imagery prepared for local church search results.",
      })),
      {
        path: site.images.hero,
        title: "Wayside Church welcome table",
        caption: "A warm welcome image for Wayside Church in Charlton, Massachusetts.",
      },
      {
        path: site.images.community,
        title: "Wayside Church community meal",
        caption: "People sharing fellowship and a meal at Wayside Church.",
      },
    ],
  },
  {
    page: "/about/",
    images: [
      {
        path: site.images.community,
        title: "Wayside Church family",
        caption: "Wayside Church life together through fellowship, care, and shared meals.",
      },
      ...site.about.leaders.map((leader) => ({
        path: leader.image,
        title: `${leader.name}, ${leader.role} at Wayside Church`,
        caption: leader.bio,
      })),
    ],
  },
  {
    page: "/leadership/",
    images: site.about.leaders.map((leader) => ({
      path: leader.image,
      title: `${leader.name}, ${leader.role} at Wayside Church`,
      caption: leader.bio,
    })),
  },
  {
    page: "/church-in-charlton-ma/",
    images: [
      {
        path: site.images.community,
        title: "Wayside Church in Charlton, MA",
        caption: "Wayside Church is a local church family gathering in Charlton, Massachusetts.",
      },
    ],
  },
  {
    page: "/nearby-communities/",
    images: [
      {
        path: site.images.community,
        title: "Wayside Church near Dudley, Oxford, Sturbridge, and Southbridge",
        caption: "Wayside Church welcomes neighbors from Charlton and nearby Worcester County communities.",
      },
    ],
  },
  {
    page: "/sunday-worship/",
    images: [
      {
        path: site.images.community,
        title: "Sunday Worship at Wayside Church",
        caption: "Wayside Church gathers Sunday at 10:00 AM for worship, Scripture, prayer, and fellowship.",
      },
    ],
  },
  {
    page: "/plan-a-visit/",
    images: [
      {
        path: site.images.charlton,
        title: "Directions to Wayside Church",
        caption: "Wayside Church gathers at 6 Haggerty Rd in Charlton, Massachusetts.",
      },
    ],
  },
  {
    page: "/directions/",
    images: [
      {
        path: site.images.charlton,
        title: "Map for Wayside Church in Charlton",
        caption: "Map and directions for Wayside Church at 6 Haggerty Rd in Charlton, MA.",
      },
    ],
  },
  {
    page: "/contact/",
    images: [
      {
        path: site.images.charlton,
        title: "Contact Wayside Church in Charlton",
        caption: "Wayside Church address, phone, directions, and Sunday gathering details.",
      },
    ],
  },
  {
    page: "/ministries/",
    images: [
      {
        path: site.images.community,
        title: "Ministries at Wayside Church",
        caption: "Wayside Church ministries are simple, relational, and centered on Jesus.",
      },
    ],
  },
  {
    page: "/events/",
    images: [
      {
        path: site.images.community,
        title: "Church events at Wayside Church",
        caption: "Weekly gatherings and ministry rhythms at Wayside Church in Charlton.",
      },
    ],
  },
  {
    page: "/families/",
    images: [
      {
        path: site.images.community,
        title: "Families at Wayside Church",
        caption: "Children, youth, parents, and guests are welcomed into the life of Wayside Church.",
      },
    ],
  },
];

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function imageEntryXml(image: ImageSitemapEntry["images"][number]) {
  return [
    "    <image:image>",
    `      <image:loc>${xmlEscape(absoluteUrl(image.path, site.meta.siteUrl))}</image:loc>`,
    `      <image:title>${xmlEscape(image.title)}</image:title>`,
    `      <image:caption>${xmlEscape(image.caption)}</image:caption>`,
    "    </image:image>",
  ].join("\n");
}

export function GET() {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...entries.map((entry) =>
      [
        "  <url>",
        `    <loc>${xmlEscape(absoluteUrl(entry.page, site.meta.siteUrl))}</loc>`,
        ...entry.images.map(imageEntryXml),
        "  </url>",
      ].join("\n"),
    ),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
