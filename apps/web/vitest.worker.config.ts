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
        main: "./dist/server/entry.mjs",
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations },
          compatibilityDate: "2026-08-05",
        },
        wrangler: {
          configPath: "./dist/server/wrangler.json",
        },
      };
    }),
  ],
  test: {
    include: ["worker/**/*.spec.ts"],
    setupFiles: ["./worker/apply-migrations.ts"],
  },
});
