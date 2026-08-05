#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const queuePath = join(root, "recovery/reports/media-review-queue.json");
const archiveManifestPath = join(root, "recovery/manifests/lt.jsonl");
const mediaManifestPath = join(root, "public/media/manifest.json");
const payloadDirectory = join(root, "recovery/payloads");
const mediaDirectory = join(root, "public/media/files");
const reportPath = join(root, "recovery/reports/inline-media-recovery.json");
const timeoutMs = 8_000;
const knownOnly = process.argv.includes("--known-only");

function normalizeUrl(value) {
  return (value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&#38;", "&")
    .replace(/^https?:\/\/web\.archive\.org\/web\/\d+(?:id_|im_)?\//i, "");
}

function pathForUrl(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return null;
  }
}

function basenameForUrl(value) {
  try {
    return decodeURIComponent(
      new URL(normalizeUrl(value)).pathname.split("/").at(-1) ?? ""
    ).toLowerCase();
  } catch {
    return "";
  }
}

function mediaUrls(html) {
  const $ = cheerio.load(html);
  const body = $(".post-body").first().length
    ? $(".post-body").first()
    : $(".entry-content").first();
  const urls = [];
  for (const element of body.find("img, source")) {
    const media = $(element);
    const sourceSet = media.attr("srcset");
    const value =
      media.attr("data-original") ??
      media.attr("data-src") ??
      media.attr("src") ??
      sourceSet?.split(",").at(-1)?.trim().split(/\s+/)[0];
    if (value) urls.push(normalizeUrl(value));
  }
  return urls;
}

async function loadCaptures(targetPaths) {
  const captures = new Map();
  const lines = createInterface({
    crlfDelay: Number.POSITIVE_INFINITY,
    input: createReadStream(archiveManifestPath),
  });
  for await (const line of lines) {
    const capture = JSON.parse(line);
    const articlePath = pathForUrl(capture.original);
    if (
      capture.status !== "200" ||
      capture.mime !== "text/html" ||
      !articlePath ||
      !targetPaths.has(articlePath)
    ) {
      continue;
    }
    const payloadPath = join(
      payloadDirectory,
      capture.digest.slice(0, 2),
      `${capture.digest}.bin`
    );
    try {
      const html = await readFile(payloadPath, "utf8");
      const previous = captures.get(articlePath) ?? [];
      previous.push({
        timestamp: capture.timestamp,
        urls: mediaUrls(html),
      });
      captures.set(articlePath, previous);
    } catch {}
  }
  for (const versions of captures.values()) {
    versions.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }
  return captures;
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

function candidateUrls(value) {
  const direct = [normalizeUrl(value)];
  try {
    const parsed = new URL(direct[0]);
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
      direct.unshift(parsed.href);
    }
  } catch {}
  return [...new Set(direct)];
}

async function inspectMedia(bytes, contentType, source) {
  try {
    const metadata = await sharp(bytes, { animated: true }).metadata();
    const extension = extensionFor(metadata.format);
    if (extension && metadata.width && metadata.height) {
      return {
        extension,
        format: metadata.format,
        height: metadata.height,
        width: metadata.width,
      };
    }
  } catch {}
  if (
    bytes.subarray(4, 8).toString("ascii") === "ftyp" ||
    contentType.includes("video/mp4") ||
    /\.mp4(?:$|\?)/i.test(source)
  ) {
    return { extension: ".mp4", format: "mp4", height: null, width: null };
  }
  throw new Error(`unsupported media (${contentType || "unknown content type"})`);
}

async function download(value, timestamp) {
  const errors = [];
  for (const candidate of candidateUrls(value, timestamp)) {
    try {
      const response = await fetch(candidate, {
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,video/*;q=0.8,*/*;q=0.5",
          "User-Agent": "Mozilla/5.0 ortodoksas-revival-media/1.0",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const metadata = await inspectMedia(
        bytes,
        response.headers.get("content-type") ?? "",
        candidate
      );
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const mediaPath = `/media/files/${sha256}${metadata.extension}`;
      await writeFile(join(root, "public", mediaPath), bytes);
      return {
        acquiredFrom: candidate,
        bytes: bytes.length,
        format: metadata.format,
        height: metadata.height,
        path: mediaPath,
        sha256,
        width: metadata.width,
      };
    } catch (error) {
      errors.push(
        `${candidate}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  throw new Error(errors.join(" | "));
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
const manifest = JSON.parse(await readFile(mediaManifestPath, "utf8"));
const issues = queue.issues.filter(
  (entry) => entry.issue === "unresolved-body-media"
);
const captures = await loadCaptures(new Set(issues.map((entry) => entry.path)));
const mediaByHash = new Map(manifest.media.map((entry) => [entry.sha256, entry]));
const mediaByAlias = new Map(
  manifest.media.flatMap((entry) =>
    entry.aliases.map((alias) => [normalizeUrl(alias), entry])
  )
);
const mediaByBasename = new Map();
for (const entry of manifest.media) {
  for (const alias of entry.aliases) {
    const basename = basenameForUrl(alias);
    if (!basename) continue;
    const matches = mediaByBasename.get(basename) ?? new Map();
    matches.set(entry.sha256, entry);
    mediaByBasename.set(basename, matches);
  }
}
const recovered = [];
const unresolved = [];

await mkdir(mediaDirectory, { recursive: true });
for (const [index, issue] of issues.entries()) {
  const target = normalizeUrl(issue.originalUrl);
  const basenameMatches = mediaByBasename.get(basenameForUrl(target));
  const knownByBasename =
    basenameMatches?.size === 1 && basenameForUrl(target).length >= 12
      ? [...basenameMatches.values()][0]
      : null;
  const knownByUrl = mediaByAlias.get(target);
  const known = knownByUrl ?? knownByBasename;
  if (known) {
    known.aliases = [...new Set([...known.aliases, issue.originalUrl, target])];
    mediaByHash.set(known.sha256, known);
    mediaByAlias.set(target, known);
    recovered.push({
      acquiredFrom: known.acquiredFrom,
      articlePath: issue.path,
      evidence: knownByUrl
        ? "normalized-original-url-in-local-manifest"
        : "unique-original-filename-in-local-manifest",
      mediaPath: known.path,
      originalUrl: issue.originalUrl,
    });
    console.log(`[${index + 1}/${issues.length}] linked ${issue.path}`);
    continue;
  }
  if (knownOnly) {
    unresolved.push({
      articlePath: issue.path,
      attempts: [],
      originalUrl: issue.originalUrl,
      positions: [],
      samePositionAlternatives: [],
    });
    console.log(`[${index + 1}/${issues.length}] pending ${issue.path}`);
    continue;
  }
  const versions = captures.get(issue.path) ?? [];
  const positions = new Set();
  for (const version of versions) {
    version.urls.forEach((url, position) => {
      if (url === target) positions.add(position);
    });
  }
  const alternatives = [];
  for (const version of versions) {
    for (const position of positions) {
      const url = version.urls[position];
      if (url && url !== target) {
        alternatives.push({ position, timestamp: version.timestamp, url });
      }
    }
  }
  const uniqueAlternatives = [
    ...new Map(alternatives.map((entry) => [entry.url, entry])).values(),
  ].sort((left, right) => {
    const score = (entry) => {
      if (/blogger\.googleusercontent\.com/i.test(entry.url)) return 0;
      if (/\.bp\.blogspot\.com/i.test(entry.url)) return 1;
      if (/upload\.wikimedia\.org/i.test(entry.url)) return 1;
      if (/blogger_img_proxy/i.test(entry.url)) return 2;
      return 3;
    };
    return score(left) - score(right);
  });
  const attempts = [];
  let result = null;
  for (const alternative of uniqueAlternatives) {
    const known = mediaByAlias.get(normalizeUrl(alternative.url));
    if (known) {
      result = { ...known, acquiredFrom: known.acquiredFrom ?? alternative.url };
    } else {
      try {
        result = await download(alternative.url, alternative.timestamp);
      } catch (error) {
        attempts.push(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
    if (result) {
      const previous = mediaByHash.get(result.sha256);
      const aliases = [
        ...(previous?.aliases ?? []),
        issue.originalUrl,
        target,
        alternative.url,
      ];
      const stored = {
        acquiredFrom: result.acquiredFrom,
        aliases: [...new Set(aliases)],
        bytes: result.bytes,
        format: result.format,
        height: result.height,
        path: result.path,
        sha256: result.sha256,
        width: result.width,
      };
      mediaByHash.set(result.sha256, stored);
      for (const alias of stored.aliases) {
        mediaByAlias.set(normalizeUrl(alias), stored);
      }
      recovered.push({
        acquiredFrom: result.acquiredFrom,
        articlePath: issue.path,
        evidence: "same-article-media-position-across-archived-captures",
        mediaPath: result.path,
        originalUrl: issue.originalUrl,
        position: alternative.position,
        replacementCapture: alternative.timestamp,
        replacementUrl: alternative.url,
      });
      break;
    }
  }
  if (!result) {
    unresolved.push({
      articlePath: issue.path,
      attempts,
      originalUrl: issue.originalUrl,
      positions: [...positions],
      samePositionAlternatives: uniqueAlternatives,
    });
  }
  console.log(
    `[${index + 1}/${issues.length}] ${result ? "recovered" : "pending"} ${issue.path}`
  );
}

manifest.generatedAt = new Date().toISOString();
manifest.media = [...mediaByHash.values()].sort((left, right) =>
  left.path.localeCompare(right.path)
);
removeAmbiguousAliases(manifest.media);
await writeFile(mediaManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      generatedAt: manifest.generatedAt,
      recovered,
      requested: issues.length,
      unresolved,
    },
    null,
    2
  )}\n`
);
console.log(
  `Inline recovery: ${recovered.length}/${issues.length}; pending: ${unresolved.length}`
);
