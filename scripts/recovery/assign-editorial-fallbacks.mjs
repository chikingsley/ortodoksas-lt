#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicDirectory = join(root, "public");
const reportsDirectory = join(root, "recovery/reports");
const manifestPath = join(publicDirectory, "media/manifest.json");
const assignmentsPath = join(publicDirectory, "media/assignments.json");
const queuePath = join(reportsDirectory, "media-review-queue.json");
const fallbackSource = join(
  publicDirectory,
  "assets/brand/reference/canva/Grid.png"
);
const fallbackAlias = "brand://editorial-fallback/grid";

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const assignments = JSON.parse(await readFile(assignmentsPath, "utf8"));
const queue = JSON.parse(await readFile(queuePath, "utf8"));

await mkdir(join(publicDirectory, "media/files"), { recursive: true });
const fallbackBytes = await readFile(fallbackSource);
const fallbackMetadata = await sharp(fallbackBytes).metadata();
if (
  fallbackMetadata.format !== "png" ||
  !fallbackMetadata.width ||
  !fallbackMetadata.height
) {
  throw new Error("Editorial fallback must be a dimensioned PNG");
}
const fallbackHash = createHash("sha256").update(fallbackBytes).digest("hex");
const fallbackPath = `/media/files/${fallbackHash}.png`;
await writeFile(join(publicDirectory, fallbackPath), fallbackBytes);

const mediaByHash = new Map(manifest.media.map((media) => [media.sha256, media]));
const previousFallback = mediaByHash.get(fallbackHash);
mediaByHash.set(fallbackHash, {
  acquiredFrom: "public/assets/brand/reference/canva/Grid.png",
  aliases: [
    ...new Set([
      ...(previousFallback?.aliases ?? []),
      fallbackAlias,
      "/assets/brand/reference/canva/Grid.png",
    ]),
  ],
  bytes: fallbackBytes.length,
  format: "png",
  height: fallbackMetadata.height,
  path: fallbackPath,
  sha256: fallbackHash,
  width: fallbackMetadata.width,
});

const assignmentsByPath = new Map(
  assignments.assignments.map((assignment) => [assignment.path, assignment])
);
const fallbackAssignments = [];
for (const issue of queue.issues) {
  if (
    !["missing-hero-evidence", "unresolved-hero-url"].includes(issue.issue) ||
    assignmentsByPath.has(issue.path)
  ) {
    continue;
  }
  const assignment = {
    confidence: 1,
    evidence: "editorial-fallback:brand-supplied-grid",
    fallback: true,
    mediaPath: fallbackPath,
    path: issue.path,
    source: fallbackAlias,
  };
  assignmentsByPath.set(issue.path, assignment);
  fallbackAssignments.push(assignment);
}

const unresolvedBodyMedia = queue.issues
  .filter((issue) => issue.issue === "unresolved-body-media")
  .map(({ originalUrl, path, reason, sourcePage, title }) => ({
    originalUrl,
    path,
    reason,
    sourcePage,
    title,
  }));

const generatedAt = new Date().toISOString();
manifest.generatedAt = generatedAt;
manifest.media = [...mediaByHash.values()].sort((left, right) =>
  left.path.localeCompare(right.path)
);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  assignmentsPath,
  `${JSON.stringify(
    {
      assignments: [...assignmentsByPath.values()].sort((left, right) =>
        left.path.localeCompare(right.path)
      ),
      generatedAt,
      schemaVersion: 1,
    },
    null,
    2
  )}\n`
);
await writeFile(
  join(reportsDirectory, "media-editorial-fallbacks.json"),
  `${JSON.stringify(
    {
      fallback: {
        mediaPath: fallbackPath,
        policy:
          "Brand-supplied editorial cover used after original, exact archive, live-page, and local-manifest recovery attempts were exhausted.",
        source: "public/assets/brand/reference/canva/Grid.png",
      },
      fallbackAssignments,
      generatedAt,
      summary: {
        fallbackAssignments: fallbackAssignments.length,
        unresolvedBodyMedia: unresolvedBodyMedia.length,
      },
      unresolvedBodyMedia,
    },
    null,
    2
  )}\n`
);

console.log(
  `Assigned ${fallbackAssignments.length} editorial covers; preserved ${unresolvedBodyMedia.length} unresolved body media elements`
);
