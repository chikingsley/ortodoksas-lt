import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    "migration/*.json",
    "migration/source/**",
    "**/assets/**",
    "**/public/**",
    "**/dist/**",
    "**/.wrangler/**",
    "**/worker-configuration.d.ts",
    "**/routeTree.gen.ts",
    "**/migrations/meta/**",
  ],
});
