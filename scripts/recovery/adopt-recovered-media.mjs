#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const publicRoot = join(root, "apps/web/public");
const manifestPath = join(publicRoot, "media/manifest.json");

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1];
}

const file = argument("file");
const originalUrl = argument("original-url");
const acquiredFrom = argument("acquired-from");

if (!(file && originalUrl && acquiredFrom)) {
  throw new Error(
    "Usage: adopt-recovered-media.mjs --file <repo path or /media path> --original-url <url> --acquired-from <url>"
  );
}

const absoluteFile = file.startsWith("/media/")
  ? resolve(publicRoot, file.slice(1))
  : resolve(root, file);
const publicRelativePath = relative(publicRoot, absoluteFile);
if (publicRelativePath.startsWith("..")) {
  throw new Error("Recovered file must live under apps/web/public");
}
const mediaPath = `/${publicRelativePath}`;
const bytes = await readFile(absoluteFile);
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (!basename(absoluteFile).startsWith(sha256)) {
  throw new Error(`Filename does not match SHA-256: ${sha256}`);
}

const metadata = await sharp(bytes, { animated: true }).metadata();
if (!(metadata.format && metadata.width && metadata.height)) {
  throw new Error("Recovered file is not a supported image");
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const normalizedOriginal = originalUrl
  .replaceAll("&amp;", "&")
  .replace(/^https?:\/\/web\.archive\.org\/web\/\d+(?:id_|im_)?\//i, "");
const existing = manifest.media.find((entry) => entry.sha256 === sha256);
const entry = existing ?? {
  acquiredFrom,
  aliases: [],
  bytes: bytes.length,
  format: metadata.format,
  height: metadata.height,
  path: mediaPath,
  sha256,
  width: metadata.width,
};
entry.aliases = [
  ...new Set([...entry.aliases, originalUrl, normalizedOriginal]),
];
if (!existing) {
  manifest.media.push(entry);
}
manifest.generatedAt = new Date().toISOString();
manifest.media.sort((left, right) => left.path.localeCompare(right.path));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `Adopted ${mediaPath} for ${originalUrl} (${metadata.width}x${metadata.height})`
);
