#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const publicDirectory = join(root, "apps/web/public");
const queuePath = join(root, "recovery/reports/media-review-queue.json");
const recoveredLargePath = join(root, "recovery/media/index.json");
const manifestPath = join(publicDirectory, "media/manifest.json");
const mediaDirectory = join(publicDirectory, "media/files");
const reportPath = join(root, "recovery/reports/wayback-media-recovery.json");
const lookupConcurrency = 6;
const execFileAsync = promisify(execFile);

async function curl(url, maxTimeSeconds, maxBuffer) {
  const { stdout } = await execFileAsync(
    "curl",
    [
      "--fail",
      "--location",
      "--silent",
      "--show-error",
      "--max-time",
      String(maxTimeSeconds),
      "--user-agent",
      "ortodoksas-lt-media/1.0",
      url,
    ],
    { encoding: "buffer", maxBuffer }
  );
  return stdout;
}

function normalizeUrl(value) {
  return (value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&#38;", "&")
    .replace(/^https?:\/\/web\.archive\.org\/web\/\d+(?:id_|im_)?\//i, "");
}

function extensionFor(format) {
  return {
    avif: ".avif",
    gif: ".gif",
    heif: ".heic",
    jpeg: ".jpg",
    png: ".png",
    svg: ".svg",
    tiff: ".tif",
    webp: ".webp",
  }[format];
}

function lookupVariants(value) {
  const variants = [normalizeUrl(value)];
  try {
    const parsed = new URL(variants[0]);
    parsed.search = "";
    variants.push(parsed.href);
  } catch {}
  return [...new Set(variants)];
}

async function cdxCaptures(value) {
  const captures = [];
  const errors = [];
  for (const variant of lookupVariants(value)) {
    const endpoint = new URL("https://web.archive.org/cdx/search/cdx");
    endpoint.searchParams.set("url", variant);
    endpoint.searchParams.set("output", "json");
    endpoint.searchParams.set("fl", "timestamp,original,statuscode,mimetype,digest");
    endpoint.searchParams.append("filter", "statuscode:200");
    endpoint.searchParams.set("collapse", "digest");
    endpoint.searchParams.set("limit", "10");
    try {
      const bytes = await curl(endpoint.href, 30, 4 * 1024 * 1024);
      const rows = JSON.parse(bytes.toString("utf8"));
      if (!Array.isArray(rows) || rows.length < 2) continue;
      for (const row of rows.slice(1)) {
        const [timestamp, original, statuscode, mimetype, digest] = row;
        captures.push({ digest, mimetype, original, statuscode, timestamp });
      }
      if (captures.length > 0) break;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return {
    captures: [
      ...new Map(captures.map((capture) => [capture.digest, capture])).values(),
    ],
    errors,
  };
}

async function fetchCapture(capture) {
  const url = `https://web.archive.org/web/${capture.timestamp}id_/${capture.original}`;
  const bytes = await curl(url, 120, 64 * 1024 * 1024);
  const metadata = await sharp(bytes, { animated: true }).metadata();
  const extension = extensionFor(metadata.format);
  if (!extension || !metadata.width || !metadata.height) {
    throw new Error(`unsupported media (${metadata.format ?? "unknown"})`);
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const path = `/media/files/${sha256}${extension}`;
  await writeFile(join(publicDirectory, path), bytes);
  return {
    acquiredFrom: url,
    bytes: bytes.length,
    format: metadata.format,
    height: metadata.height,
    path,
    sha256,
    width: metadata.width,
  };
}

async function mapConcurrent(entries, worker, concurrency) {
  const results = new Array(entries.length);
  let cursor = 0;
  const run = async () => {
    while (cursor < entries.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(entries[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, entries.length) }, run)
  );
  return results;
}

function removeAmbiguousAliases(media) {
  const counts = new Map();
  for (const entry of media) {
    for (const alias of entry.aliases) {
      counts.set(alias, (counts.get(alias) ?? 0) + 1);
    }
  }
  const ambiguous = new Set(
    [...counts].filter(([, count]) => count > 1).map(([alias]) => alias)
  );
  for (const entry of media) {
    entry.aliases = [...new Set(entry.aliases)].filter(
      (alias) => !ambiguous.has(alias)
    );
  }
}

const queue = JSON.parse(await readFile(queuePath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const recoveredLarge = JSON.parse(await readFile(recoveredLargePath, "utf8")).assets;
const recoveredLargeUrls = new Set(
  recoveredLarge.map((entry) => normalizeUrl(entry.originalUrl))
);
const issues = queue.issues.filter(
  (entry) =>
    entry.issue === "unresolved-body-media" &&
    !recoveredLargeUrls.has(normalizeUrl(entry.originalUrl))
);
const mediaByHash = new Map(manifest.media.map((entry) => [entry.sha256, entry]));
const recovered = [];
const unresolved = [];
let manifestWrite = Promise.resolve();

function persistManifest() {
  manifestWrite = manifestWrite.then(async () => {
    manifest.generatedAt = new Date().toISOString();
    manifest.media = [...mediaByHash.values()].sort((left, right) =>
      left.path.localeCompare(right.path)
    );
    removeAmbiguousAliases(manifest.media);
    const temporaryPath = `${manifestPath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await rename(temporaryPath, manifestPath);
  });
  return manifestWrite;
}

await mkdir(mediaDirectory, { recursive: true });
await mapConcurrent(
  issues,
  async (issue, index) => {
    const lookup = await cdxCaptures(issue.originalUrl);
    const errors = [...lookup.errors];
    for (const capture of lookup.captures) {
      try {
        const result = await fetchCapture(capture);
        const previous = mediaByHash.get(result.sha256);
        mediaByHash.set(result.sha256, {
          acquiredFrom: result.acquiredFrom,
          aliases: [
            ...new Set([
              ...(previous?.aliases ?? []),
              issue.originalUrl,
              normalizeUrl(issue.originalUrl),
              capture.original,
            ]),
          ],
          bytes: result.bytes,
          format: result.format,
          height: result.height,
          path: result.path,
          sha256: result.sha256,
          width: result.width,
        });
        recovered.push({
          articlePath: issue.path,
          capture,
          mediaPath: result.path,
          originalUrl: issue.originalUrl,
        });
        await persistManifest();
        console.log(`[${index + 1}/${issues.length}] recovered ${issue.path}`);
        return;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    unresolved.push({
      articlePath: issue.path,
      captures: lookup.captures,
      errors,
      originalUrl: issue.originalUrl,
    });
    console.log(`[${index + 1}/${issues.length}] pending ${issue.path}`);
  },
  lookupConcurrency
);

await persistManifest();
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      generatedAt: manifest.generatedAt,
      recovered: recovered.sort((left, right) =>
        left.articlePath.localeCompare(right.articlePath)
      ),
      requested: issues.length,
      unresolved: unresolved.sort((left, right) =>
        left.articlePath.localeCompare(right.articlePath)
      ),
    },
    null,
    2
  )}\n`
);
console.log(
  `Wayback recovery: ${recovered.length}/${issues.length}; pending: ${unresolved.length}`
);
