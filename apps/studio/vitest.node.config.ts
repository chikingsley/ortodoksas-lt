import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "test/article-content.spec.ts",
      "test/article-services.spec.ts",
      "test/authorized-parties.spec.ts",
      "test/blogger-content-cleanup-migration.spec.ts",
      "test/inventory-groups.spec.ts",
      "test/translation-readiness-migration.spec.ts",
    ],
  },
});
