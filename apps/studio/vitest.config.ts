import path from "node:path";
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(
        path.join(import.meta.dirname, "../../packages/db/migrations")
      );

      return {
        main: "./dist/server/index.js",
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations },
          compatibilityDate: "2026-08-08",
        },
        wrangler: {
          configPath:
            process.env.CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH ??
            "./wrangler.jsonc",
        },
      };
    }),
  ],
  test: {
    exclude: ["test/article-content.spec.ts"],
    include: ["test/**/*.spec.ts"],
    setupFiles: ["./test/apply-migrations.ts"],
  },
});
