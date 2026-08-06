#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const pagesDirectory = join(root, "public/content/pages");
const reportPath = join(root, "recovery/reports/word-media-artifacts.json");
const artifactPattern = /<img\b[^>]*\bsrc=(?:"[^"]*file:\/\/\/[^"]*"|'[^']*file:\/\/\/[^']*')[^>]*>/giu;
const removed = [];

for (const file of await readdir(pagesDirectory)) {
  if (!file.endsWith(".json")) continue;
  const path = join(pagesDirectory, file);
  const page = JSON.parse(await readFile(path, "utf8"));
  const html = page.html ?? "";
  const matches = [...html.matchAll(artifactPattern)];
  if (matches.length === 0) continue;
  page.html = html.replace(artifactPattern, "");
  await writeFile(path, `${JSON.stringify(page, null, 2)}\n`);
  removed.push({
    articlePath: page.path,
    file: `public/content/pages/${file}`,
    occurrences: matches.length,
    tags: [...new Set(matches.map((match) => match[0]))],
  });
}

await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      classification:
        "Word-export formatting artifacts that referenced author-local temporary files and were never public media assets",
      removed,
      schemaVersion: 1,
    },
    null,
    2
  )}\n`
);
console.log(
  `Removed ${removed.reduce((sum, entry) => sum + entry.occurrences, 0)} Word-export artifact occurrences from ${removed.length} articles`
);
