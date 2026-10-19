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
  ],
  jsPlugins: shadcn.jsPlugins,
  options: { typeAware: true },
  // Astro recommends PascalCase components; public route names retain their existing URLs.
  overrides: [
    // Worker scenarios cover state transitions and HTTP semantics in one real runtime.
    // Keep unit tests at the preset limit of five assertions.
    {
      files: ["**/worker/**/*.spec.ts"],
      plugins: ["vitest"],
      rules: { "vitest/max-expects": ["error", { max: 20 }] },
    },
    // This sequence verifies approval, source edits, stale reviews, and revision restoration.
    {
      files: ["**/worker/translation-review.spec.ts"],
      plugins: ["vitest"],
      rules: { "vitest/max-expects": ["error", { max: 32 }] },
    },
    {
      files: ["**/*.astro"],
      rules: {
        "unicorn/filename-case": [
          "error",
          {
            cases: { kebabCase: true, pascalCase: true },
            ignore: ["^apie_egzarchata\\.astro$"],
          },
        ],
      },
    },
  ],
  rules: {
    complexity: ["error", { max: 15 }],
    "func-style": ["error", "declaration", { allowArrowFunctions: true }],
    "max-depth": ["error", 4],
    "max-params": ["error", 5],
    "react/function-component-definition": [
      "error",
      {
        namedComponents: "function-declaration",
        unnamedComponents: "arrow-function",
      },
    ],
    // Oxc documents this as an optimization hint for compiler features still in development.
    "react/todo": "off",
    // Oxc recommends TypeScript control-flow analysis; every project enables noImplicitReturns.
    "typescript/consistent-return": "off",
    // Exact booleans make assertions stronger than truthiness checks.
    "vitest/prefer-to-be-falsy": "off",
    "vitest/prefer-to-be-truthy": "off",
  },
});
