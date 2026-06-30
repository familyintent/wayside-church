import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://wayside.church",
  base: "/",
  output: "static",
  integrations: [sitemap()],
});
