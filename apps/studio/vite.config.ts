import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const TIPTAP_MODULE_PATTERN =
  /(?:node_modules[\\/]\.pnpm[\\/]@tiptap\+|src[\\/]components[\\/]tiptap-)/u;
const EDITOR_ENGINE_PATTERN =
  /node_modules[\\/]\.pnpm[\\/](?:linkifyjs@|orderedmap@|prosemirror-|re2js@|rope-sequence@|w3c-keyname@)/u;

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  environments: {
    client: {
      build: {
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                {
                  name: "editor-engine",
                  priority: 20,
                  test: EDITOR_ENGINE_PATTERN,
                },
                {
                  name: "editor-runtime",
                  priority: 10,
                  test: TIPTAP_MODULE_PATTERN,
                },
              ],
            },
          },
        },
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
