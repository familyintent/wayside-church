import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://familyintent.github.io",
  base: "/wayside-church",
  output: "static",
  integrations: [sitemap()],
});
