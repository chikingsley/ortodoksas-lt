#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = join(root, "public/media/manifest.json");

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1];
}

const relativeFile = argument("file");
const originalUrl = argument("original-url");
const acquiredFrom = argument("acquired-from");

if (!(relativeFile && originalUrl && acquiredFrom)) {
  throw new Error(
    "Usage: adopt-recovered-media.mjs --file <public path> --original-url <url> --acquired-from <url>"
  );
}

const absoluteFile = join(root, relativeFile.replace(/^\//, ""));
const bytes = await readFile(absoluteFile);
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (!basename(relativeFile).startsWith(sha256)) {
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
  path: relativeFile.replace(/^public/, ""),
  sha256,
  width: metadata.width,
};
entry.aliases = [
  ...new Set([...entry.aliases, originalUrl, normalizedOriginal]),
];
if (!existing) manifest.media.push(entry);
manifest.generatedAt = new Date().toISOString();
manifest.media.sort((left, right) => left.path.localeCompare(right.path));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `Adopted ${relativeFile} for ${originalUrl} (${metadata.width}x${metadata.height})`
);
