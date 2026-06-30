import { site } from "../../lib/content";
import { absoluteUrl } from "../../lib/paths";

export function GET() {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const canonical = absoluteUrl("/.well-known/security.txt", site.meta.siteUrl);

  return new Response(
    [
      `Contact: ${absoluteUrl("/contact/", site.meta.siteUrl)}`,
      "Preferred-Languages: en",
      `Canonical: ${canonical}`,
      `Expires: ${expires}`,
      "",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}
