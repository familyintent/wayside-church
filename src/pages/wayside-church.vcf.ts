import type { APIRoute } from "astro";
import { site } from "../lib/content";
import { absoluteUrl } from "../lib/paths";

function escapeVcardText(value = ""): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export const GET: APIRoute = () => {
  const phone = site.contact.phoneHref.replace(/^tel:/, "");
  const notes = [
    `${site.service.primary.label}: ${site.service.primary.day} at ${site.service.primary.time}`,
    `${site.service.coffee.label}: ${site.service.coffee.day} at ${site.service.coffee.time}`,
    site.church.description,
  ].join("\n");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVcardText(site.church.name)}`,
    `ORG:${escapeVcardText(site.church.name)}`,
    `TEL;TYPE=WORK,VOICE:${phone}`,
    `ADR;TYPE=WORK:;;${escapeVcardText(site.contact.addressLine1)};${escapeVcardText(site.contact.addressLocality)};${escapeVcardText(site.contact.addressRegion)};${escapeVcardText(site.contact.postalCode)};${escapeVcardText(site.contact.addressCountry)}`,
    `URL:${absoluteUrl("/", site.meta.siteUrl)}`,
    `URL;TYPE=map:${site.links.maps}`,
    `NOTE:${escapeVcardText(notes)}`,
    "END:VCARD",
  ];

  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
    },
  });
};
