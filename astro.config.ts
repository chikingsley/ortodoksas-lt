import { defineConfig } from "astro/config";

export default defineConfig({
  build: {
    format: "file",
  },
  output: "static",
  site: "https://ortodoksas.grassinside.com",
  trailingSlash: "never",
});
