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
const catalogPath = join(root, "public/content/catalog.json");
const manifestPath = join(root, "public/media/manifest.json");
const assignmentsPath = join(root, "public/media/assignments.json");
const ingestionReportPath = join(root, "recovery/reports/media-ingestion.json");
const recoveryManifestPath = join(root, "recovery/manifests/lt.jsonl");
const payloadDirectory = join(root, "recovery/payloads");
const mediaDirectory = join(root, "public/media/files");
const reportPath = join(root, "recovery/reports/media-metadata-recovery.json");
const timeoutMs = 12_000;
const knownOnly = process.argv.includes("--known-only");

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
  }[format] ?? null;
}

function removeAmbiguousAliases(media) {
  const counts = new Map();
  for (const entry of media) {
    for (const alias of entry.aliases) {
      counts.set(alias, (counts.get(alias) ?? 0) + 1);
    }
  }
  const ambiguous = new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([alias]) => alias)
  );
  for (const entry of media) {
    entry.aliases = entry.aliases.filter((alias) => !ambiguous.has(alias));
  }
  return ambiguous;
}

function pathnameFor(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return null;
  }
}

async function recoveryCaptures(paths) {
  const captures = new Map();
  const lines = createInterface({
    crlfDelay: Number.POSITIVE_INFINITY,
    input: createReadStream(recoveryManifestPath),
  });
  for await (const line of lines) {
    const record = JSON.parse(line);
    if (record.status !== "200" || record.mime !== "text/html") continue;
    const path = pathnameFor(record.original);
    if (!path || !paths.has(path)) continue;
    const previous = captures.get(path) ?? [];
    previous.push(record);
    captures.set(path, previous);
  }
  return captures;
}

function chooseCapture(entry, captures) {
  const available = captures.get(entry.path) ?? [];
  return (
    available.find((capture) => capture.timestamp === entry.capture) ??
    available.sort((left, right) => right.timestamp.localeCompare(left.timestamp))[0] ??
    null
  );
}

function youtubeId(value) {
  const patterns = [
    /youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/i,
    /youtube\.com\/watch\?[^#]*v=([\w-]{6,})/i,
    /youtu\.be\/([\w-]{6,})/i,
  ];
  return patterns.map((pattern) => value.match(pattern)?.[1]).find(Boolean) ?? null;
}

function imageCandidates(html) {
  const $ = cheerio.load(html);
  const body = $(".post-body").first().length
    ? $(".post-body").first()
    : $(".entry-content").first();
  const candidates = [];
  for (const element of body.find("iframe, a")) {
    const value = $(element).attr("src") ?? $(element).attr("href") ?? "";
    const id = youtubeId(value);
    if (id) {
      candidates.push({
        confidence: 1,
        evidence: `youtube:${id}`,
        url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      });
    }
  }
  for (const element of body.find("img")) {
    const image = $(element);
    const values = [
      image.attr("data-original"),
      image.attr("data-src"),
      image.attr("src"),
    ];
    const sourceSet = image.attr("srcset");
    if (sourceSet) {
      values.unshift(sourceSet.split(",").at(-1)?.trim().split(/\s+/)[0]);
    }
    const url = values.find((value) => value && /^(?:https?:|data:image\/)/i.test(value));
    if (url) {
      candidates.push({
        confidence: 0.95,
        evidence: `article-image:${image.attr("alt")?.trim() || "first-content-image"}`,
        url,
      });
    }
  }
  return [...new Map(candidates.map((candidate) => [candidate.url, candidate])).values()];
}

async function liveImageCandidates(entry) {
  const candidates = [entry.source];
  try {
    const source = new URL(entry.source);
    if (source.protocol === "http:") {
      source.protocol = "https:";
      candidates.unshift(source.href);
    }
  } catch {}
  const errors = [];
  for (const source of [...new Set(candidates.filter(Boolean))]) {
    try {
      const response = await fetch(source, {
        headers: { "User-Agent": "Mozilla/5.0 ortodoksas-revival-media/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { candidates: imageCandidates(await response.text()), errors, source: response.url };
    } catch (error) {
      errors.push(`${source}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { candidates: [], errors, source: null };
}

function candidateVariants(url, timestamp) {
  const normalized = url.replaceAll("&amp;", "&");
  const direct = [normalized];
  try {
    const parsed = new URL(normalized);
    if (parsed.hostname === "images-blogger-opensocial.googleusercontent.com") {
      const nested = parsed.searchParams.get("url");
      if (nested) direct.unshift(nested);
    }
  } catch {}
  const youtube = normalized.match(/^(https:\/\/i\.ytimg\.com\/vi\/[^/]+\/)hqdefault\.jpg$/i);
  if (youtube) direct.push(`${youtube[1]}mqdefault.jpg`, `${youtube[1]}0.jpg`);
  return [
    ...new Set([
      ...direct,
      ...direct.map((candidate) =>
        `https://web.archive.org/web/${timestamp}im_/${candidate}`
      ),
    ]),
  ];
}

async function fetchCandidate(url, timestamp) {
  const errors = [];
  for (const candidate of candidateVariants(url, timestamp)) {
    try {
      const response = await fetch(candidate, {
        headers: { "User-Agent": "ortodoksas-revival-media/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(bytes, { animated: true }).metadata();
      const extension = extensionFor(metadata.format);
      if (!extension || !metadata.width || !metadata.height) {
        throw new Error(
          `Unsupported or dimensionless image (${metadata.format ?? "unknown"})`
        );
      }
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const path = `/media/files/${sha256}${extension}`;
      await writeFile(join(root, "public", path), bytes);
      return {
        acquiredFrom: candidate,
        bytes: bytes.length,
        format: metadata.format,
        height: metadata.height,
        path,
        sha256,
        width: metadata.width,
      };
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(errors.join(" | "));
}

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
let existingAssignmentDocument = { assignments: [] };
try {
  existingAssignmentDocument = JSON.parse(await readFile(assignmentsPath, "utf8"));
} catch {}
if (process.argv.includes("--normalize-only")) {
  const ambiguous = removeAmbiguousAliases(manifest.media);
  manifest.generatedAt = new Date().toISOString();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Removed ${ambiguous.size} ambiguous aliases`);
  process.exit(0);
}
const ingestionReport = JSON.parse(await readFile(ingestionReportPath, "utf8"));
const unresolvedSources = new Set(ingestionReport.unresolved.map((item) => item.source));
const assignmentsByPath = new Map(
  existingAssignmentDocument.assignments.map((assignment) => [assignment.path, assignment])
);
const targets = catalog.filter(
  (entry) =>
    !assignmentsByPath.has(entry.path) &&
    (!entry.hero || unresolvedSources.has(entry.hero))
);
const captures = await recoveryCaptures(new Set(targets.map((entry) => entry.path)));
const mediaByHash = new Map(manifest.media.map((entry) => [entry.sha256, entry]));
const mediaByAlias = new Map(
  manifest.media.flatMap((media) =>
    media.aliases.map((alias) => [alias.replaceAll("&amp;", "&"), media])
  )
);
const recoveredAssignments = [];
const unresolved = [];

function knownMediaFor(url) {
  const normalized = url.replaceAll("&amp;", "&");
  const unwrapped = normalized.replace(
    /^https?:\/\/web\.archive\.org\/web\/\d+(?:id_|im_)?\//i,
    ""
  );
  return mediaByAlias.get(normalized) ?? mediaByAlias.get(unwrapped) ?? null;
}

await mkdir(mediaDirectory, { recursive: true });
for (const [index, entry] of targets.entries()) {
  const capture = chooseCapture(entry, captures);
  const errors = [];
  let candidates = [];
  if (capture?.digest) {
    const payloadPath = join(payloadDirectory, capture.digest.slice(0, 2), `${capture.digest}.bin`);
    try {
      candidates = imageCandidates(await readFile(payloadPath, "utf8"));
    } catch (error) {
      errors.push(`archive-page-read-failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    errors.push("archive-page-payload-missing");
  }
  let recovered = null;
  for (const candidate of candidates) {
    const known = knownMediaFor(candidate.url);
    if (known) {
      recovered = {
        ...candidate,
        acquiredFrom: known.acquiredFrom,
        bytes: known.bytes,
        format: known.format,
        height: known.height,
        path: known.path,
        sha256: known.sha256,
        width: known.width,
      };
      break;
    }
    if (knownOnly) continue;
    try {
      recovered = {
        ...candidate,
        ...(await fetchCandidate(candidate.url, capture?.timestamp ?? entry.capture)),
      };
      break;
    } catch (error) {
      errors.push(`${candidate.url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!recovered && !knownOnly) {
    const live = await liveImageCandidates(entry);
    errors.push(...live.errors);
    const archivedUrls = new Set(candidates.map((candidate) => candidate.url));
    const liveCandidates = live.candidates.filter((candidate) => !archivedUrls.has(candidate.url));
    candidates.push(...liveCandidates);
    for (const candidate of liveCandidates) {
      const known = knownMediaFor(candidate.url);
      if (known) {
        recovered = {
          ...candidate,
          acquiredFrom: known.acquiredFrom,
          bytes: known.bytes,
          evidence: `${candidate.evidence}:live-source-page`,
          format: known.format,
          height: known.height,
          path: known.path,
          sha256: known.sha256,
          width: known.width,
        };
        break;
      }
      try {
        recovered = {
          ...candidate,
          evidence: `${candidate.evidence}:live-source-page`,
          ...(await fetchCandidate(candidate.url, capture?.timestamp ?? entry.capture)),
        };
        break;
      } catch (error) {
        errors.push(`${candidate.url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  if (!recovered) {
    unresolved.push({
      candidates: candidates.map((candidate) => candidate.url),
      errors,
      path: entry.path,
      reason: candidates.length ? "candidate-fetch-failed" : "article-media-evidence-missing",
      title: entry.title,
    });
    continue;
  }
  const previous = mediaByHash.get(recovered.sha256);
  mediaByHash.set(recovered.sha256, {
    acquiredFrom: recovered.acquiredFrom,
    aliases: previous?.aliases ?? [],
    bytes: recovered.bytes,
    format: recovered.format,
    height: recovered.height,
    path: recovered.path,
    sha256: recovered.sha256,
    width: recovered.width,
  });
  const assignment = {
    confidence: recovered.confidence,
    evidence: recovered.evidence,
    mediaPath: recovered.path,
    path: entry.path,
    source: recovered.acquiredFrom,
  };
  assignmentsByPath.set(entry.path, assignment);
  recoveredAssignments.push(assignment);
  console.log(`[${index + 1}/${targets.length}] recovered ${entry.path} from ${recovered.evidence}`);
}

manifest.generatedAt = new Date().toISOString();
manifest.media = [...mediaByHash.values()].sort((left, right) => left.path.localeCompare(right.path));
removeAmbiguousAliases(manifest.media);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  assignmentsPath,
  `${JSON.stringify({ assignments: [...assignmentsByPath.values()].sort((left, right) => left.path.localeCompare(right.path)), generatedAt: manifest.generatedAt, schemaVersion: 1 }, null, 2)}\n`
);
await writeFile(
  reportPath,
  `${JSON.stringify({ generatedAt: manifest.generatedAt, recovered: recoveredAssignments.length, requested: targets.length, unresolved }, null, 2)}\n`
);
console.log(`Metadata recovery: ${recoveredAssignments.length}/${targets.length}; assignments: ${assignmentsByPath.size}; unresolved: ${unresolved.length}`);
