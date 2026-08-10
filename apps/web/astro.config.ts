import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  build: {
    format: "file",
  },
  integrations: [react()],
  output: "static",
  site: "https://ortodoksas.grassinside.com",
  trailingSlash: "never",
  vite: {
    plugins: [tailwindcss()],
  },
});
