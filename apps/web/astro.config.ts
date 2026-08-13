import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { siteOrigin } from "./src/config/site";
import { defaultLocale, siteLocales } from "./src/i18n/config";

export default defineConfig({
  adapter: cloudflare(),
  build: {
    format: "file",
  },
  devToolbar: {
    enabled: false,
  },
  i18n: {
    defaultLocale,
    locales: [...siteLocales],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [react()],
  output: "server",
  site: siteOrigin,
  trailingSlash: "never",
  vite: {
    plugins: [tailwindcss()],
    preview: {
      allowedHosts: ["ortodoksas-preview.grassinside.com"],
    },
  },
});
