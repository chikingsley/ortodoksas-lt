#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const webDirectory = join(root, "apps/web");
const publicDirectory = join(webDirectory, "public");
const manifestPath = join(publicDirectory, "media/manifest.json");
const assignmentsPath = join(publicDirectory, "media/assignments.json");
const catalogPath = join(publicDirectory, "content/catalog.json");
const unresolvedPath = join(publicDirectory, "media/unresolved.json");
const pagesDirectory = join(publicDirectory, "content/pages");
const distDirectory = join(webDirectory, "dist");
const imageExtensions = new Set([
  ".avif",
  ".gif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".tif",
  ".tiff",
  ".webp",
]);
const imageUrlPattern = /<(?:img|source)\b[^>]*\b(src|srcset)\s*=\s*(?:"([^"]+)"|'([^']+)')|url\(\s*(?:"([^"]+)"|'([^']+)'|([^"')\s]+))\s*\)|"(?:image|logo|thumbnailUrl)"\s*:\s*"([^"]+)"/gi;

function parseOptions(arguments_) {
  const mode = arguments_[0];
  let scope = "all";
  for (let index = 1; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--scope") scope = arguments_[index += 1];
    else if (argument.startsWith("--scope=")) scope = argument.slice(8);
    else throw new Error(`Unknown option: ${argument}`);
  }
  if (!["dist", "source"].includes(mode)) throw new Error("Mode must be source or dist");
  if (!["all", "homepage"].includes(scope)) throw new Error("--scope must be homepage or all");
  return { mode, scope };
}

async function loadManifest() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.media)) throw new Error("Invalid media manifest");
  return manifest;
}

async function loadAssignments() {
  try {
    const assignments = JSON.parse(await readFile(assignmentsPath, "utf8"));
    if (assignments.schemaVersion !== 1 || !Array.isArray(assignments.assignments)) {
      throw new Error("Invalid media assignments");
    }
    return assignments;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { assignments: [], schemaVersion: 1 };
    }
    throw error;
  }
}

async function loadUnresolvedMedia() {
  const unresolved = JSON.parse(await readFile(unresolvedPath, "utf8"));
  if (unresolved.schemaVersion !== 1 || !Array.isArray(unresolved.issues)) {
    throw new Error("Invalid unresolved media manifest");
  }
  return new Set(
    unresolved.issues.map((issue) =>
      issue.originalUrl.replaceAll("&amp;", "&").replaceAll("&#38;", "&")
    )
  );
}

async function validateManifest(manifest) {
  const failures = [];
  const aliases = new Set();
  for (const entry of manifest.media) {
    for (const alias of entry.aliases) {
      if (aliases.has(alias)) failures.push(`Duplicate alias: ${alias}`);
      aliases.add(alias);
    }
    if (entry.storage === "r2") continue;
    const file = join(publicDirectory, entry.path.replace(/^\//, ""));
    try {
      const bytes = await readFile(file);
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (sha256 !== entry.sha256) failures.push(`Hash mismatch: ${entry.path}`);
      const metadata = await sharp(bytes, { animated: true }).metadata();
      if (metadata.width !== entry.width || metadata.height !== entry.height || metadata.format !== entry.format) {
        failures.push(`Metadata mismatch: ${entry.path}`);
      }
    } catch (error) {
      failures.push(`Unreadable media ${entry.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { aliases, failures };
}

function validateAssignments(assignments, manifest) {
  const failures = [];
  const paths = new Map();
  const manifestPaths = new Set(manifest.media.map((entry) => entry.path));
  for (const assignment of assignments.assignments) {
    if (paths.has(assignment.path)) failures.push(`Duplicate media assignment: ${assignment.path}`);
    paths.set(assignment.path, assignment.mediaPath);
    if (!manifestPaths.has(assignment.mediaPath)) {
      failures.push(`Assignment media absent from manifest: ${assignment.path} -> ${assignment.mediaPath}`);
    }
  }
  return { failures, paths };
}

function mediaUrls(value) {
  const urls = [];
  for (const match of value.matchAll(imageUrlPattern)) {
    const attribute = match[1];
    const raw = match.slice(2).find(Boolean);
    if (!raw) continue;
    const candidates = attribute === "srcset" ? raw.split(",") : [raw];
    for (const candidate of candidates) urls.push(candidate.trim().split(/\s+/)[0]);
  }
  return urls;
}

async function checkSource(scope, manifest, assignments) {
  const { aliases, failures } = await validateManifest(manifest);
  const unresolvedMedia = await loadUnresolvedMedia();
  const assignmentValidation = validateAssignments(assignments, manifest);
  failures.push(...assignmentValidation.failures);
  if (scope === "homepage") return failures;
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  for (const entry of catalog) {
    const assignment = assignmentValidation.paths.get(entry.path);
    if (!entry.hero && !assignment) failures.push(`Missing hero: ${entry.path}`);
    else if (/^(?:https?:|data:image\/)/i.test(entry.hero) && !aliases.has(entry.hero) && !assignment) failures.push(`Uningested hero: ${entry.path} -> ${entry.hero}`);
  }
  for (const file of await readdir(pagesDirectory)) {
    if (!file.endsWith(".json")) continue;
    const raw = await readFile(join(pagesDirectory, file), "utf8");
    const page = JSON.parse(raw);
    for (const url of mediaUrls(page.html ?? "")) {
      const normalizedUrl = url
        .replaceAll("&amp;", "&")
        .replaceAll("&#38;", "&");
      if (
        /^(?:https?:|data:image\/)/i.test(url) &&
        !aliases.has(url) &&
        !aliases.has(normalizedUrl) &&
        !unresolvedMedia.has(normalizedUrl)
      ) {
        failures.push(`Untracked body media: ${file} -> ${url}`);
      }
    }
  }
  return failures;
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

async function checkDist(scope, manifest) {
  const failures = [];
  const files = scope === "homepage"
    ? [join(distDirectory, "index.html")]
    : (await walk(distDirectory)).filter((file) => [".css", ".html", ".json", ".xml"].includes(extname(file)));
  const checkedLocal = new Set();
  const r2Paths = new Set(
    manifest.media
      .filter((entry) => entry.storage === "r2")
      .map((entry) => entry.path)
  );
  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const url of mediaUrls(content)) {
      if (/^(?:https?:|data:image\/)/i.test(url)) {
        failures.push(`Remote published media: ${relative(distDirectory, file)} -> ${url}`);
        continue;
      }
      if (!url.startsWith("/") || url.startsWith("//")) continue;
      const cleanPath = decodeURIComponent(url.split(/[?#]/)[0]);
      if (checkedLocal.has(cleanPath)) continue;
      checkedLocal.add(cleanPath);
      if (r2Paths.has(cleanPath)) continue;
      const target = join(distDirectory, cleanPath.replace(/^\//, ""));
      try {
        await access(target);
        if (imageExtensions.has(extname(cleanPath).toLowerCase())) {
          await sharp(target, { animated: true }).metadata();
        }
      } catch (error) {
        failures.push(`Invalid local published media: ${cleanPath} (${error instanceof Error ? error.message : String(error)})`);
      }
    }
  }
  const manifestPaths = new Set(manifest.media.map((entry) => entry.path));
  for (const localPath of checkedLocal) {
    if (localPath.startsWith("/media/files/") && !manifestPaths.has(localPath)) failures.push(`Recovered file absent from manifest: ${localPath}`);
  }
  return failures;
}

const options = parseOptions(process.argv.slice(2));
const manifest = await loadManifest();
const assignments = await loadAssignments();
const failures = options.mode === "source"
  ? await checkSource(options.scope, manifest, assignments)
  : await checkDist(options.scope, manifest);
if (failures.length) {
  const visible = failures.slice(0, 100);
  console.error(visible.join("\n"));
  if (failures.length > visible.length) console.error(`…and ${failures.length - visible.length} more media failures`);
  console.error(`Media integrity failed: ${failures.length} issue(s)`);
  process.exitCode = 1;
} else {
  console.log(`Media integrity passed: mode=${options.mode} scope=${options.scope} entries=${manifest.media.length}`);
}
