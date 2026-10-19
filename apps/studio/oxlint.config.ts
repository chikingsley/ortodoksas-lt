import { defineConfig } from "oxlint";
import tanstack from "ultracite/oxlint/tanstack";

import root from "../../oxlint.config.ts";
import tiptapClasses from "./tiptap-classes.json" with { type: "json" };

// Oxlint lints each file with its nearest config alone, so this extends the
// root config and repeats the properties that extends doesn't carry over.
export default defineConfig({
  env: root.env,
  extends: [root, tanstack],
  ignorePatterns: root.ignorePatterns,
  jsPlugins: root.jsPlugins,
  overrides: root.overrides,
  rules: {
    ...root.rules,
    // TanStack routes and server functions throw typed responses for redirects and HTTP status handling.
    "typescript/only-throw-error": [
      "error",
      {
        allow: [
          { from: "lib", name: "Response" },
          {
            from: "package",
            name: "Redirect",
            package: "@tanstack/router-core",
          },
        ],
        allowThrowingAny: false,
        allowThrowingUnknown: false,
      },
    ],
    // Tiptap loads these exact selectors from component SCSS outside Tailwind.
    "shadcn/no-unknown-classes": ["error", { allow: tiptapClasses }],
  },
  settings: root.settings,
});
