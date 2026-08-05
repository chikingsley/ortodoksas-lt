import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  build: {
    format: "file",
  },
  integrations: [react()],
  output: "static",
  site: "https://ortodoksas.grassinside.com",
  trailingSlash: "never",
});
