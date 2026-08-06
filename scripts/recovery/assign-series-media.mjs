#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogPath = join(root, "public/content/catalog.json");
const manifestPath = join(root, "public/media/manifest.json");
const assignmentsPath = join(root, "public/media/assignments.json");
const reportPath = join(root, "recovery/reports/media-series-assignments.json");

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const assignmentDocument = JSON.parse(await readFile(assignmentsPath, "utf8"));
const entriesByPath = new Map(catalog.map((entry) => [entry.path, entry]));
const mediaByAlias = new Map(
  manifest.media.flatMap((entry) => entry.aliases.map((alias) => [alias, entry]))
);
const assignmentsByPath = new Map(
  assignmentDocument.assignments.map((assignment) => [assignment.path, assignment])
);

const series = [
  {
    coverPath: "/p/kasdiene-duona.html",
    id: "kasdiene-duona",
    matches: (entry) => entry.title.includes("Kasdienė duona"),
  },
];
const added = [];

for (const definition of series) {
  const cover = entriesByPath.get(definition.coverPath);
  const media = cover?.hero ? mediaByAlias.get(cover.hero) : null;
  if (!cover || !media) {
    throw new Error(`Series cover unavailable: ${definition.coverPath}`);
  }
  for (const entry of catalog.filter(definition.matches)) {
    if (entry.hero || assignmentsByPath.has(entry.path)) continue;
    const assignment = {
      confidence: 1,
      evidence: `verified-series-cover:${definition.coverPath}`,
      mediaPath: media.path,
      path: entry.path,
      source: cover.hero,
    };
    assignmentsByPath.set(entry.path, assignment);
    added.push({ path: entry.path, series: definition.id });
  }
}

const generatedAt = new Date().toISOString();
await writeFile(
  assignmentsPath,
  `${JSON.stringify({ assignments: [...assignmentsByPath.values()].sort((left, right) => left.path.localeCompare(right.path)), generatedAt, schemaVersion: 1 }, null, 2)}\n`
);
await writeFile(reportPath, `${JSON.stringify({ added, generatedAt }, null, 2)}\n`);
console.log(`Series assignments added: ${added.length}; total: ${assignmentsByPath.size}`);
