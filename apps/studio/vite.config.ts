import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  environments: {
    client: {
      build: {
        chunkSizeWarningLimit: 850,
      },
    },
  },
  plugins: [
    cloudflare({
      configPath:
        process.env.CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH ?? "./wrangler.jsonc",
      remoteBindings: mode === "remote",
      viteEnvironment: { name: "ssr" },
    }),
    tanstackStart(),
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    allowedHosts: ["ortodoksas-studio.grassinside.com"],
  },
}));
