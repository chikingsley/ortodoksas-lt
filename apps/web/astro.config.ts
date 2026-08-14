import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { defaultLocale, siteLocales } from "./src/i18n/config";
import { site } from "./src/site";

export default defineConfig({
  adapter: cloudflare({
    configPath:
      process.env.CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH ?? "./wrangler.jsonc",
  }),
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
  site: site.origin,
  trailingSlash: "never",
  vite: {
    plugins: [tailwindcss()],
    preview: {
      allowedHosts: ["ortodoksas-preview.grassinside.com"],
    },
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    ssr: {
      noExternal: ["lucide-react"],
    },
  },
});
