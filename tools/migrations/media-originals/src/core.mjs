import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const MANIFEST_VERSION = 1;

const MIME_EXTENSIONS = new Map([
  ["image/avif", "avif"],
  ["image/bmp", "bmp"],
  ["image/gif", "gif"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/svg+xml", "svg"],
  ["image/tiff", "tiff"],
  ["image/webp", "webp"],
]);

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SAFE_EXTENSION_PATTERN = /^[a-z0-9]{1,10}$/u;

export const sha256Hex = (value) =>
  createHash("sha256").update(value).digest("hex");

export const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

export const writeJsonAtomic = async (filePath, value) => {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporaryPath, filePath);
};

export const fileSha256 = async (filePath) =>
  sha256Hex(await readFile(filePath));

const inventoryRows = (input) => {
  if (Array.isArray(input)) {
    if (
      input.every(
        (entry) => entry && typeof entry === "object" && "results" in entry
      )
    ) {
      return input.flatMap((entry) => entry.results ?? []);
    }
    return input;
  }
  if (input && typeof input === "object" && Array.isArray(input.results)) {
    return input.results;
  }
  throw new Error("Inventory must be a row array or Wrangler D1 JSON output");
};

const normalizedExtension = (row) => {
  const mimeExtension = MIME_EXTENSIONS.get(
    String(row.mime_type).toLowerCase()
  );
  if (mimeExtension) {
    return mimeExtension;
  }
  const sourceExtension = path
    .extname(String(row.r2_key))
    .slice(1)
    .toLowerCase();
  if (SAFE_EXTENSION_PATTERN.test(sourceExtension)) {
    return sourceExtension;
  }
  throw new Error(`Media ${row.id} has an unsupported MIME type and extension`);
};

const positiveInteger = (value, label) => {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!(Number.isSafeInteger(parsed) && parsed >= 0)) {
    throw new Error(`${label} must be a nonnegative integer`);
  }
  return parsed;
};

export const createManifest = (
  input,
  generatedAt = new Date().toISOString()
) => {
  const seenIds = new Set();
  const seenDestinations = new Set();
  const items = inventoryRows(input)
    .map((row) => {
      const id = String(row.id ?? "");
      const sourceKey = String(row.r2_key ?? "");
      const sha256 = String(row.sha256 ?? "").toLowerCase();
      const mimeType = String(row.mime_type ?? "").toLowerCase();
      if (!(id && sourceKey)) {
        throw new Error("Every inventory row requires id and r2_key");
      }
      if (!SHA256_PATTERN.test(sha256)) {
        throw new Error(`Media ${id} requires a lowercase SHA-256 digest`);
      }
      if (seenIds.has(id)) {
        throw new Error(`Duplicate media id: ${id}`);
      }
      seenIds.add(id);
      const destinationKey = `media/originals/${sha256}.${normalizedExtension(row)}`;
      if (sourceKey === destinationKey) {
        return null;
      }
      if (sourceKey.startsWith("media/originals/")) {
        throw new Error(`Media ${id} has a malformed canonical originals key`);
      }
      if (seenDestinations.has(destinationKey)) {
        throw new Error(`Duplicate destination key: ${destinationKey}`);
      }
      seenDestinations.add(destinationKey);
      return {
        byteSize: positiveInteger(row.byte_size, `Media ${id} byte_size`),
        destinationKey,
        id,
        mimeType,
        sha256,
        sourceKey,
      };
    })
    .filter((item) => item !== null)
    .sort((left, right) => left.id.localeCompare(right.id));
  return {
    destinationPrefix: "media/originals/",
    generatedAt,
    items,
    sourcePrefixes: [
      ...new Set(items.map((item) => `${item.sourceKey.split("/", 1)[0]}/`)),
    ].sort(),
    version: MANIFEST_VERSION,
  };
};

export const validateManifest = (manifest) => {
  if (
    manifest?.version !== MANIFEST_VERSION ||
    !Array.isArray(manifest.items)
  ) {
    throw new Error(
      `Expected media migration manifest version ${MANIFEST_VERSION}`
    );
  }
  const rebuilt = createManifest(
    manifest.items.map((item) => ({
      byte_size: item.byteSize,
      id: item.id,
      mime_type: item.mimeType,
      r2_key: item.sourceKey,
      sha256: item.sha256,
    })),
    manifest.generatedAt
  );
  for (let index = 0; index < rebuilt.items.length; index += 1) {
    if (
      rebuilt.items[index].destinationKey !==
      manifest.items[index]?.destinationKey
    ) {
      throw new Error(
        `Manifest destination mismatch for ${rebuilt.items[index].id}`
      );
    }
  }
  return manifest;
};

export const validateVerificationReceipt = (
  manifest,
  receipt,
  manifestSha256
) => {
  if (receipt?.version !== 1 || receipt.manifestSha256 !== manifestSha256) {
    throw new Error("Verification receipt does not match this manifest");
  }
  if (
    !Array.isArray(receipt.items) ||
    receipt.items.length !== manifest.items.length
  ) {
    throw new Error("Verification receipt has incomplete item coverage");
  }
  const verified = new Map(receipt.items.map((item) => [item.id, item]));
  for (const item of manifest.items) {
    const result = verified.get(item.id);
    if (
      result?.destinationKey !== item.destinationKey ||
      result?.sha256 !== item.sha256 ||
      result?.byteSize !== item.byteSize ||
      result?.verified !== true
    ) {
      throw new Error(`Verification receipt is incomplete for ${item.id}`);
    }
  }
  return receipt;
};

export const validateCutoverInventory = (manifest, input) => {
  const rows = inventoryRows(input);
  const byId = new Map(rows.map((row) => [String(row.id), row]));
  for (const item of manifest.items) {
    const row = byId.get(item.id);
    if (
      String(row?.r2_key ?? "") !== item.destinationKey ||
      String(row?.sha256 ?? "").toLowerCase() !== item.sha256
    ) {
      throw new Error(`D1 cutover evidence is incomplete for ${item.id}`);
    }
  }
  return rows;
};

const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;

export const createD1CutoverSql = (manifest, manifestSha256) => {
  const lines = [
    `-- Generated from verified media manifest SHA-256 ${manifestSha256}`,
    "-- Apply with Studio writes frozen. This script is idempotent.",
    "DROP TABLE IF EXISTS temp.media_originals_plan;",
    "DROP TABLE IF EXISTS temp.media_originals_gate;",
    "CREATE TEMP TABLE media_originals_plan (id TEXT PRIMARY KEY, source_key TEXT NOT NULL, destination_key TEXT NOT NULL, sha256 TEXT NOT NULL);",
  ];
  for (let index = 0; index < manifest.items.length; index += 100) {
    const batch = manifest.items.slice(index, index + 100);
    lines.push(
      "INSERT INTO media_originals_plan (id, source_key, destination_key, sha256) VALUES\n" +
        batch
          .map(
            (item) =>
              `  (${sqlString(item.id)}, ${sqlString(item.sourceKey)}, ${sqlString(item.destinationKey)}, ${sqlString(item.sha256)})`
          )
          .join(",\n") +
        ";"
    );
  }
  lines.push(
    "CREATE TEMP TABLE media_originals_gate (mismatch_count INTEGER NOT NULL CHECK (mismatch_count = 0));",
    "INSERT INTO media_originals_gate (mismatch_count) SELECT COUNT(*) FROM media_originals_plan AS plan LEFT JOIN media_assets AS asset ON asset.id = plan.id WHERE asset.id IS NULL OR asset.sha256 IS NOT plan.sha256 OR asset.r2_key NOT IN (plan.source_key, plan.destination_key);",
    "UPDATE media_assets SET r2_key = (SELECT destination_key FROM media_originals_plan AS plan WHERE plan.id = media_assets.id) WHERE EXISTS (SELECT 1 FROM media_originals_plan AS plan WHERE plan.id = media_assets.id AND media_assets.r2_key = plan.source_key);",
    "DELETE FROM media_originals_gate;",
    "INSERT INTO media_originals_gate (mismatch_count) SELECT COUNT(*) FROM media_originals_plan AS plan LEFT JOIN media_assets AS asset ON asset.id = plan.id WHERE asset.id IS NULL OR asset.sha256 IS NOT plan.sha256 OR asset.r2_key <> plan.destination_key;",
    "DELETE FROM media_aliases WHERE alias = '/api/media/' || media_id;",
    "SELECT COUNT(*) AS migrated_media_assets FROM media_originals_plan;",
    "SELECT changes() AS removed_redundant_canonical_aliases;",
    "DROP TABLE media_originals_gate;",
    "DROP TABLE media_originals_plan;",
    ""
  );
  return lines.join("\n");
};

export const encodeCopySource = (bucket, key) =>
  `${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
