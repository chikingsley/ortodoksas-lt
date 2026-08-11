import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { siteOrigin } from "./src/config/site";
import { defaultLocale, siteLocales } from "./src/i18n/config";

export default defineConfig({
  build: {
    format: "file",
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
  output: "static",
  site: siteOrigin,
  trailingSlash: "never",
  vite: {
    plugins: [tailwindcss()],
    preview: {
      allowedHosts: ["ortodoksas-preview.grassinside.com"],
    },
  },
});
