import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://www.wayside.church",
  output: "static",
  integrations: [sitemap()],
});
