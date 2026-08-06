#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogPath = join(root, "public/content/catalog.json");
const pagesDirectory = join(root, "public/content/pages");
const localesDirectory = join(root, "public/content/locales");
const mediaDirectory = join(root, "public/media/files");
const manifestPath = join(root, "public/media/manifest.json");
const reportPath = join(root, "recovery/reports/media-ingestion.json");
const seedDirectory = join(root, ".impeccable/mocks/assets");
const waybackImagePattern = /^https?:\/\/web\.archive\.org\/web\/(\d+)(?:id_|im_)?\/(https?:\/\/.+)$/i;
const imageAttributePattern = /\b(?:src|poster)=(?:"([^"]+)"|'([^']+)')|\bsrcset=(?:"([^"]+)"|'([^']+)')/gi;

function parseOptions(arguments_) {
  const options = { concurrency: 3, scope: "homepage", timeoutMs: 45_000 };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--scope") options.scope = arguments_[index += 1];
    else if (argument.startsWith("--scope=")) options.scope = argument.slice(8);
    else if (argument === "--concurrency") options.concurrency = Number(arguments_[index += 1]);
    else if (argument.startsWith("--concurrency=")) options.concurrency = Number(argument.slice(14));
    else if (argument === "--timeout-ms") options.timeoutMs = Number(arguments_[index += 1]);
    else if (argument.startsWith("--timeout-ms=")) options.timeoutMs = Number(argument.slice(13));
    else throw new Error(`Unknown option: ${argument}`);
  }
  if (!["all", "homepage", "locales"].includes(options.scope)) throw new Error("--scope must be homepage, locales, or all");
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) throw new Error("--concurrency must be a positive integer");
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1) throw new Error("--timeout-ms must be a positive integer");
  return options;
}

function unwrapWayback(url) {
  const match = url.match(waybackImagePattern);
  return match ? { original: match[2], timestamp: match[1] } : null;
}

function directVariants(url) {
  const normalized = url.replaceAll("&amp;", "&");
  const variants = [normalized];
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === "http:") {
      const secure = new URL(parsed);
      secure.protocol = "https:";
      variants.unshift(secure.href);
    }
    if (parsed.hostname === "images-blogger-opensocial.googleusercontent.com") {
      const nested = parsed.searchParams.get("url");
      if (nested) variants.unshift(...directVariants(nested));
    }
    if (parsed.hostname === "upload.wikimedia.org") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const thumbIndex = parts.indexOf("thumb");
      const filename = thumbIndex >= 0 ? parts.at(-2) : parts.at(-1);
      if (filename) {
        variants.unshift(
          `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(decodeURIComponent(filename))}`
        );
      }
    }
    const youtube = parsed.hostname === "i.ytimg.com" || parsed.hostname === "img.youtube.com";
    const videoMatch = youtube ? parsed.pathname.match(/\/vi\/([^/]+)\//) : null;
    if (videoMatch) {
      variants.unshift(
        `https://i.ytimg.com/vi/${videoMatch[1]}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${videoMatch[1]}/hqdefault.jpg`,
        `https://i.ytimg.com/vi/${videoMatch[1]}/mqdefault.jpg`,
        `https://i.ytimg.com/vi/${videoMatch[1]}/0.jpg`
      );
    }
  } catch {}
  return [...new Set(variants)];
}

function candidatesFor(url) {
  const wayback = unwrapWayback(url);
  if (!wayback) return directVariants(url);
  const direct = directVariants(wayback.original);
  return [
    ...direct,
    url,
    ...direct.map(
      (candidate) => `https://web.archive.org/web/${wayback.timestamp}im_/${candidate}`
    ),
  ];
}

function extensionFor(format) {
  return { avif: ".avif", gif: ".gif", heif: ".heic", jpeg: ".jpg", png: ".png", svg: ".svg", tiff: ".tif", webp: ".webp" }[format] ?? null;
}

function homepageEntries(entries) {
  const articles = entries
    .filter((entry) => entry.kind === "article")
    .sort((left, right) => Date.parse(right.published ?? "") - Date.parse(left.published ?? ""));
  const lead = articles.find((entry) => entry.homepage === "lead") ?? articles.find((entry) => entry.hero) ?? articles[0];
  const available = articles.filter((entry) => entry.path !== lead?.path);
  const promoted = available
    .filter((entry) => entry.homepage === "secondary")
    .sort((left, right) => (left.homepageOrder ?? 99) - (right.homepageOrder ?? 99));
  const secondary = [...promoted];
  for (const entry of available) {
    if (secondary.length >= 3) break;
    if (!secondary.some((candidate) => candidate.path === entry.path)) secondary.push(entry);
  }
  const used = new Set([lead?.path, ...secondary.slice(0, 3).map((entry) => entry.path)]);
  const remaining = articles.filter((entry) => !used.has(entry.path));
  const sections = [...new Set(articles.map((entry) => entry.section))].sort((left, right) => left.localeCompare(right, "lt"));
  const sectionEntries = sections.slice(0, 2).flatMap((section) =>
    articles.filter((entry) => entry.section === section && entry.path !== lead?.path).slice(0, 4)
  );
  return [...new Map([lead, ...secondary.slice(0, 3), ...remaining.slice(0, 3), ...sectionEntries].filter(Boolean).map((entry) => [entry.path, entry])).values()];
}

function urlsFromHtml(html) {
  const urls = [];
  for (const match of html.matchAll(imageAttributePattern)) {
    const value = match[1] ?? match[2] ?? match[3] ?? match[4];
    if (!value) continue;
    if (match[3] || match[4]) {
      for (const candidate of value.split(",")) urls.push(candidate.trim().split(/\s+/)[0]);
    } else urls.push(value);
  }
  return urls;
}

function seedForEntry(entry) {
  const seeds = [
    [/\/antalijos-krikscioniu-atgimimas-kaip\.html$/, "hero-antalija.jpg"],
    [/\/bulgarijos-sventosios-vietos-netoli\.html$/, "card-bulgaria.jpg"],
    [/\/piligrimyste-i-pazaisli-2026\.html$/, "card-pazaislis.jpg"],
    [/\/pamokslas-dievo-artumas-neprasideda-tik\.html$/, "card-sermon.jpg"],
  ];
  const match = seeds.find(([pattern]) => pattern.test(entry.path));
  return match ? join(seedDirectory, match[1]) : null;
}

async function collectUrls(scope) {
  const catalog = scope === "locales"
    ? []
    : JSON.parse(await readFile(catalogPath, "utf8"));
  const selected = scope === "homepage" ? homepageEntries(catalog) : catalog;
  const urls = new Map(
    selected
      .filter((entry) => typeof entry.hero === "string" && entry.hero)
      .map((entry) => [entry.hero, { seedPath: seedForEntry(entry), source: entry.hero }])
  );
  if (scope === "all") {
    const selectedFiles = new Set(selected.map((entry) => entry.file).filter(Boolean));
    for (const file of await readdir(pagesDirectory)) {
      if (!file.endsWith(".json") || (selectedFiles.size && !selectedFiles.has(file))) continue;
      const page = JSON.parse(await readFile(join(pagesDirectory, file), "utf8"));
      for (const url of urlsFromHtml(page.html ?? "")) {
        if (/^(?:https?:|data:image\/)/i.test(url) && !urls.has(url)) {
          urls.set(url, { seedPath: null, source: url });
        }
      }
    }
  }
  if (scope === "all" || scope === "locales") {
    const pending = [localesDirectory];
    while (pending.length) {
      const directory = pending.pop();
      for (const item of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, item.name);
        if (item.isDirectory()) {
          pending.push(path);
          continue;
        }
        if (!item.name.endsWith(".json")) continue;
        const document = JSON.parse(await readFile(path, "utf8"));
        const documents = Array.isArray(document) ? document : [document];
        for (const page of documents) {
          for (const url of urlsFromHtml(page.html ?? page.body ?? "")) {
            if (/^(?:https?:|data:image\/)/i.test(url) && !urls.has(url)) {
              urls.set(url, { seedPath: null, source: url });
            }
          }
          for (const media of page.media ?? []) {
            if (
              typeof media?.url === "string" &&
              /^(?:https?:|data:image\/)/i.test(media.url) &&
              !urls.has(media.url)
            ) {
              urls.set(media.url, { seedPath: null, source: media.url });
            }
          }
        }
      }
    }
  }
  return [...urls.values()];
}

async function decodeDataUrl(url) {
  const match = url.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is);
  if (!match) throw new Error("Unsupported image data URI");
  return { bytes: Buffer.from(match[2], "base64"), fetchedFrom: "data-uri" };
}

async function fetchImage(url, timeoutMs) {
  if (url.startsWith("data:image/")) return decodeDataUrl(url);
  const errors = [];
  for (const candidate of candidatesFor(url)) {
    try {
      const response = await fetch(candidate, {
        headers: { "User-Agent": "Mozilla/5.0 ortodoksas-lt-media/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      return { bytes, fetchedFrom: candidate };
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(errors.join("; "));
}

async function ingestOne(source, timeoutMs, seedPath) {
  const payload = seedPath
    ? { bytes: await readFile(seedPath), fetchedFrom: seedPath }
    : await fetchImage(source, timeoutMs);
  const { bytes, fetchedFrom } = payload;
  const metadata = await sharp(bytes, { animated: true }).metadata();
  const extension = extensionFor(metadata.format);
  if (!extension || !metadata.width || !metadata.height) throw new Error(`Unsupported or dimensionless image (${metadata.format ?? "unknown"})`);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const filename = `${sha256}${extension}`;
  await writeFile(join(mediaDirectory, filename), bytes);
  const fetchedAlias = /^(?:https?:|data:image\/)/i.test(fetchedFrom)
    ? fetchedFrom
    : null;
  const aliases = [...new Set([source, fetchedAlias, unwrapWayback(source)?.original].filter(Boolean))];
  return {
    acquiredFrom: fetchedFrom.startsWith(root)
      ? fetchedFrom.slice(root.length)
      : fetchedFrom,
    aliases,
    bytes: bytes.length,
    format: metadata.format,
    height: metadata.height,
    path: `/media/files/${filename}`,
    sha256,
    width: metadata.width,
  };
}

async function runPool(values, concurrency, operation) {
  const results = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await operation(values[index], index);
    }
  }));
  return results;
}

const options = parseOptions(process.argv.slice(2));
await mkdir(mediaDirectory, { recursive: true });
const sources = await collectUrls(options.scope);
let existing = { media: [], schemaVersion: 1 };
try {
  existing = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {}
const aliasIndex = new Map(existing.media.flatMap((entry) => entry.aliases.map((alias) => [alias, entry])));
const unresolved = [];
const ingested = await runPool(sources, options.concurrency, async ({ seedPath, source }, index) => {
  const cached = aliasIndex.get(source);
  if (cached) {
    console.log(`[${index + 1}/${sources.length}] cached ${source}`);
    return cached;
  }
  try {
    const entry = await ingestOne(source, options.timeoutMs, seedPath);
    console.log(`[${index + 1}/${sources.length}] ingested ${entry.path}`);
    return entry;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    unresolved.push({ error: message, source });
    console.error(`[${index + 1}/${sources.length}] unresolved ${source}: ${message}`);
    return null;
  }
});
const mediaByHash = new Map(existing.media.map((entry) => [entry.sha256, entry]));
for (const entry of ingested.filter(Boolean)) {
  const previous = mediaByHash.get(entry.sha256);
  mediaByHash.set(entry.sha256, previous ? { ...previous, aliases: [...new Set([...previous.aliases, ...entry.aliases])] } : entry);
}
const manifest = {
  generatedAt: new Date().toISOString(),
  media: [...mediaByHash.values()].sort((left, right) => left.path.localeCompare(right.path)),
  schemaVersion: 1,
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(reportPath, `${JSON.stringify({ generatedAt: manifest.generatedAt, ingested: ingested.filter(Boolean).length, requested: sources.length, scope: options.scope, unresolved }, null, 2)}\n`);
console.log(`Media: ${manifest.media.length}; requested: ${sources.length}; unresolved: ${unresolved.length}`);
if (unresolved.length) process.exitCode = 1;
