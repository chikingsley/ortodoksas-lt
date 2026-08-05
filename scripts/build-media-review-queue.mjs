#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicDirectory = join(root, "public");
const catalog = JSON.parse(
  await readFile(join(publicDirectory, "content/catalog.json"), "utf8")
);
const manifest = JSON.parse(
  await readFile(join(publicDirectory, "media/manifest.json"), "utf8")
);
const assignments = JSON.parse(
  await readFile(join(publicDirectory, "media/assignments.json"), "utf8")
);
const metadataReport = JSON.parse(
  await readFile(
    join(root, "recovery/reports/media-metadata-recovery.json"),
    "utf8"
  )
);
const outputPath = join(root, "recovery/reports/media-review-queue.json");
const publicUnresolvedPath = join(publicDirectory, "media/unresolved.json");
const imageAttributePattern =
  /\b(?:src|poster)=(?:"([^"]+)"|'([^']+)')|\bsrcset=(?:"([^"]+)"|'([^']+)')/gi;

function mediaUrls(value) {
  const urls = [];
  for (const match of value.matchAll(imageAttributePattern)) {
    const raw = match.slice(1).find(Boolean);
    if (!raw) continue;
    if (match[3] || match[4]) {
      for (const candidate of raw.split(",")) {
        urls.push(candidate.trim().split(/\s+/)[0]);
      }
    } else {
      urls.push(raw);
    }
  }
  return urls;
}

function contextFor(entry) {
  return {
    capture: entry.capture,
    description: entry.description,
    labels: entry.labels,
    path: entry.path,
    published: entry.published,
    searchQuery: [entry.title, ...(entry.labels ?? []).slice(0, 3), "ortodoksas.lt"]
      .filter(Boolean)
      .join(" "),
    sourcePage: entry.source,
    title: entry.title,
  };
}

const aliases = new Set(manifest.media.flatMap((entry) => entry.aliases));
const assignedPaths = new Set(
  assignments.assignments.map((assignment) => assignment.path)
);
const metadataByPath = new Map(
  metadataReport.unresolved.map((entry) => [entry.path, entry])
);
const queue = [];

for (const entry of catalog) {
  if (
    !assignedPaths.has(entry.path) &&
    (!entry.hero ||
      (/^(?:https?:|data:image\/)/i.test(entry.hero) && !aliases.has(entry.hero)))
  ) {
    const metadata = metadataByPath.get(entry.path);
    queue.push({
      ...contextFor(entry),
      candidates: metadata?.candidates ?? [],
      issue: entry.hero ? "unresolved-hero-url" : "missing-hero-evidence",
      originalUrl: entry.hero,
      reason: metadata?.reason ?? "automated-recovery-exhausted",
    });
  }
  if (!entry.file) continue;
  const page = JSON.parse(
    await readFile(join(publicDirectory, "content/pages", entry.file), "utf8")
  );
  for (const url of mediaUrls(page.html ?? "")) {
    if (/^(?:https?:|data:image\/)/i.test(url) && !aliases.has(url)) {
      queue.push({
        ...contextFor(entry),
        issue: "unresolved-body-media",
        originalUrl: url,
        reason: "live-and-exact-archive-fetch-failed",
      });
    }
  }
}

const unique = [
  ...new Map(
    queue.map((entry) => [
      `${entry.issue}\u0000${entry.path}\u0000${entry.originalUrl ?? ""}`,
      entry,
    ])
  ).values(),
];
const summary = unique.reduce(
  (counts, entry) => {
    counts[entry.issue] = (counts[entry.issue] ?? 0) + 1;
    return counts;
  },
  {}
);
await writeFile(
  outputPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), issues: unique, summary, total: unique.length }, null, 2)}\n`
);
await writeFile(
  publicUnresolvedPath,
  `${JSON.stringify(
    {
      issues: unique
        .filter((entry) => entry.issue === "unresolved-body-media")
        .map(({ originalUrl, path, reason, sourcePage, title }) => ({
          originalUrl,
          path,
          reason,
          sourcePage,
          title,
        })),
      schemaVersion: 1,
    },
    null,
    2
  )}\n`
);
console.log(`Media review queue: ${unique.length}`, summary);
