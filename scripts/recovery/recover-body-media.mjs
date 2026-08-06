#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const publicDirectory = join(root, "apps/web/public");
const queuePath = join(root, "recovery/reports/media-review-queue.json");
const manifestPath = join(publicDirectory, "media/manifest.json");
const mediaDirectory = join(publicDirectory, "media/files");
const reportPath = join(root, "recovery/reports/body-media-recovery.json");
const concurrency = 4;
const timeoutMs = 30_000;

function normalizedSource(value) {
  return value
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

function facebookPhotoId(value) {
  const source = normalizedSource(value);
  if (!/(?:fbcdn|akamaihd|scontent|sphotos)/i.test(source)) {
    return null;
  }
  try {
    const basename = decodeURIComponent(new URL(source).pathname.split("/").at(-1) ?? "");
    const groups = basename.match(/\d{5,}/g) ?? [];
    return groups.length >= 2 ? groups[1] : null;
  } catch {
    return null;
  }
}

async function fetchBytes(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 ortodoksas-media-recovery/1.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(bytes, { animated: true }).metadata();
  const extension = extensionFor(metadata.format);
  if (!(extension && metadata.width && metadata.height)) {
    throw new Error(`unsupported media (${metadata.format ?? response.headers.get("content-type") ?? "unknown"})`);
  }
  return {
    bytes,
    extension,
    format: metadata.format,
    height: metadata.height,
    width: metadata.width,
  };
}

async function facebookCandidate(photoId) {
  const photoUrl = `https://www.facebook.com/photo.php?fbid=${photoId}`;
  const endpoint = new URL("https://www.facebook.com/plugins/post.php");
  endpoint.searchParams.set("href", photoUrl);
  endpoint.searchParams.set("show_text", "true");
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "Mozilla/5.0 ortodoksas-media-recovery/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Facebook embed HTTP ${response.status}`);
  }
  const $ = cheerio.load(await response.text());
  const candidates = $("img")
    .toArray()
    .map((element) => {
      const image = $(element);
      const source = image.attr("src") ?? "";
      const width = Number(image.attr("width") ?? 0);
      const height = Number(image.attr("height") ?? 0);
      const isContent = image.hasClass("_1p6f") || image.closest("a").attr("href")?.includes(`fbid=${photoId}`);
      return { area: width * height, isContent, source };
    })
    .filter((candidate) => candidate.source.includes("scontent") && candidate.isContent)
    .sort((left, right) => right.area - left.area);
  const source = candidates[0]?.source;
  if (!source) {
    throw new Error("Facebook photo content image absent");
  }
  return { evidenceUrl: endpoint.href, source };
}

function directCandidates(source) {
  const candidates = [source];
  try {
    const parsed = new URL(source);
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
      candidates.unshift(parsed.href);
    }
    if (parsed.search) {
      parsed.search = "";
      candidates.push(parsed.href);
    }
    if (parsed.hostname.startsWith("www.")) {
      parsed.hostname = parsed.hostname.slice(4);
      candidates.push(parsed.href);
    } else {
      parsed.hostname = `www.${parsed.hostname}`;
      candidates.push(parsed.href);
    }
  } catch {
    return candidates;
  }
  return [...new Set(candidates)];
}

async function recoverIssue(issue) {
  const source = normalizedSource(issue.originalUrl);
  const attempts = [];
  const photoId = facebookPhotoId(source);
  const candidates = [];
  if (photoId) {
    try {
      const candidate = await facebookCandidate(photoId);
      candidates.push({
        evidence: `facebook-photo-object:${photoId}`,
        evidenceUrl: candidate.evidenceUrl,
        url: candidate.source,
      });
    } catch (error) {
      attempts.push(`facebook:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  candidates.push(
    ...directCandidates(source).map((url) => ({
      evidence: "original-source-url",
      evidenceUrl: source,
      url,
    }))
  );
  for (const candidate of candidates) {
    try {
      const media = await fetchBytes(candidate.url);
      const sha256 = createHash("sha256").update(media.bytes).digest("hex");
      const mediaPath = `/media/files/${sha256}${media.extension}`;
      await writeFile(join(publicDirectory, mediaPath), media.bytes);
      return {
        acquiredFrom: candidate.url,
        articlePath: issue.path,
        bytes: media.bytes.length,
        evidence: candidate.evidence,
        evidenceUrl: candidate.evidenceUrl,
        format: media.format,
        height: media.height,
        mediaPath,
        originalUrl: issue.originalUrl,
        sha256,
        sourceUrl: source,
        width: media.width,
      };
    } catch (error) {
      attempts.push(`${candidate.url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return {
    articlePath: issue.path,
    attempts,
    originalUrl: issue.originalUrl,
    sourceUrl: source,
  };
}

async function mapConcurrent(entries, worker) {
  const results = new Array(entries.length);
  let cursor = 0;
  async function run() {
    while (cursor < entries.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(entries[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, run));
  return results;
}

function removeAmbiguousAliases(media) {
  const aliases = new Map();
  for (const entry of media) {
    for (const alias of entry.aliases) {
      const hashes = aliases.get(alias) ?? new Set();
      hashes.add(entry.sha256);
      aliases.set(alias, hashes);
    }
  }
  const ambiguous = new Set([...aliases].filter(([, hashes]) => hashes.size > 1).map(([alias]) => alias));
  for (const entry of media) {
    entry.aliases = [...new Set(entry.aliases)].filter((alias) => !ambiguous.has(alias));
  }
}

const queue = JSON.parse(await readFile(queuePath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const issues = queue.issues.filter((issue) => issue.issue === "unresolved-body-media");
const mediaByHash = new Map(manifest.media.map((entry) => [entry.sha256, entry]));
await mkdir(mediaDirectory, { recursive: true });

const results = await mapConcurrent(issues, async (issue, index) => {
  const result = await recoverIssue(issue);
  console.log(`[${index + 1}/${issues.length}] ${result.mediaPath ? "recovered" : "pending"} ${issue.path}`);
  return result;
});
const recovered = results.filter((result) => result.mediaPath);
const unresolved = results.filter((result) => !result.mediaPath);

for (const result of recovered) {
  const previous = mediaByHash.get(result.sha256);
  mediaByHash.set(result.sha256, {
    acquiredFrom: result.acquiredFrom,
    aliases: [...new Set([...(previous?.aliases ?? []), result.originalUrl, result.sourceUrl])],
    bytes: result.bytes,
    format: result.format,
    height: result.height,
    path: result.mediaPath,
    sha256: result.sha256,
    width: result.width,
  });
}
manifest.generatedAt = new Date().toISOString();
manifest.media = [...mediaByHash.values()].sort((left, right) => left.path.localeCompare(right.path));
removeAmbiguousAliases(manifest.media);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  reportPath,
  `${JSON.stringify({ generatedAt: manifest.generatedAt, recovered, requested: issues.length, unresolved }, null, 2)}\n`
);
console.log(`Body media recovery: ${recovered.length}/${issues.length}; pending: ${unresolved.length}`);
