import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import vitest from "ultracite/oxlint/vitest";

// Integration tests retain .spec filenames and assert each observable state transition.
const tests = {
  ...vitest,
  overrides: vitest.overrides?.map((override) => ({
    ...override,
    excludeFiles: [
      "tests/**/*.test.mts",
      "tests/**/*.test.mjs",
      "migration/tests/**/*.test.mts",
      "apps/studio/tests/**/*.test.mjs",
    ],
    rules: {
      ...override.rules,
      "vitest/consistent-test-filename": [
        "error",
        { pattern: ".*\\.(?:test|spec)\\.[cm]?[jt]sx?$" },
      ],
      "vitest/max-expects": ["error", { max: 30 }],
      "vitest/prefer-to-be-falsy": "off",
      "vitest/prefer-to-be-truthy": "off",
    },
  })),
};

export default defineConfig({
  env: core.env,
  extends: [core, react, tests, shadcn, antiSlop],
  ignorePatterns: [
    ...core.ignorePatterns,
    "migration/*.json",
    "migration/source/**",
    "**/assets/**",
    "**/public/**",
    "**/dist/**",
    "**/.wrangler/**",
    "**/worker-configuration.d.ts",
    "**/routeTree.gen.ts",
    "**/migrations/meta/**",
    "**/components/tiptap-*/**",
    "**/lib/tiptap-utils.ts",
  ],
  jsPlugins: shadcn.jsPlugins,
  options: { typeAware: true },
  // Retain the project's named component declarations and strict boolean assertions.
  rules: {
    "func-style": ["error", "declaration", { allowArrowFunctions: true }],
    "react/function-component-definition": [
      "error",
      {
        namedComponents: ["function-declaration", "arrow-function"],
        unnamedComponents: "arrow-function",
      },
    ],
    "vitest/prefer-to-be-falsy": "off",
    "vitest/prefer-to-be-truthy": "off",
  },
});
