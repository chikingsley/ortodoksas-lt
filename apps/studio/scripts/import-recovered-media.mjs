import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const PROJECT_ROOT = new URL("../", import.meta.url).pathname;
const REVIVAL_PUBLIC =
  process.env.ORTODOKSAS_REVIVAL_PUBLIC ??
  "/home/simon/github/ortodoksas-revival/public";
const MANIFEST_PATH = join(REVIVAL_PUBLIC, "media/manifest.json");
const STATE_PATH = join(PROJECT_ROOT, ".wrangler/media-import-state.json");
const SQL_DIR = join(PROJECT_ROOT, ".wrangler/media-seed");
const BUCKET = "ortodoksas-studio-media";
const WRANGLER = join(PROJECT_ROOT, "node_modules/.bin/wrangler");
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const VERIFY_BASE_URL = process.env.MEDIA_VERIFY_BASE_URL;
const ARCHIVE_MEDIA_PATTERN =
  /^https:\/\/web\.archive\.org\/web\/\d+[a-z_]*\/(https:\/\/blogger\.googleusercontent\.com\/.+)$/u;
const BLOGGER_SIZE_PARAMETER_PATTERN = /[=][^/?#]+$/u;
const BLOGGER_SIZE_PATH_PATTERN = /\/s\d+(?:-[a-z0-9-]+)?\//u;

const flags = new Set(process.argv.slice(2));
const readNumberFlag = (name, fallback) => {
  const value = process.argv.find((argument) =>
    argument.startsWith(`${name}=`)
  );
  return value ? Number.parseInt(value.slice(name.length + 1), 10) : fallback;
};
const concurrency = readNumberFlag("--concurrency", 12);
const limit = readNumberFlag("--limit", Number.POSITIVE_INFINITY);
const shouldUpload = flags.has("--upload");
const shouldVerify = flags.has("--verify");
const shouldSeed = flags.has("--seed");

if (!(shouldUpload || shouldVerify || shouldSeed)) {
  throw new Error("Choose at least one phase: --upload, --verify, or --seed");
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
const media = manifest.media.slice(0, limit);
await mkdir(join(PROJECT_ROOT, ".wrangler"), { recursive: true });

const state = await readFile(STATE_PATH, "utf8")
  .then(JSON.parse)
  .catch(() => ({ seededChunks: [], uploaded: [], verified: [] }));
const uploaded = new Set(state.uploaded);
const verified = new Set(state.verified);
const seededChunks = new Set(state.seededChunks);

const persistState = async () => {
  await writeFile(
    STATE_PATH,
    `${JSON.stringify(
      {
        seededChunks: [...seededChunks].sort((a, b) => a - b),
        uploaded: [...uploaded].sort(),
        verified: [...verified].sort(),
      },
      null,
      2
    )}\n`
  );
};

const run = (command, args, { captureStdout = false } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: ["ignore", captureStdout ? "pipe" : "ignore", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout?.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
        return;
      }
      reject(
        new Error(
          `${command} exited ${code}: ${Buffer.concat(stderr).toString("utf8")}`
        )
      );
    });
  });

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const runWithRetry = async (command, args, options) => {
  const attempts = 7;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      // biome-ignore lint/performance/noAwaitInLoops: retry attempts are sequential
      return await run(command, args, options);
    } catch (error) {
      const retryable = error instanceof Error && error.message.includes("429");
      if (!(retryable && attempt < attempts)) {
        throw error;
      }
      const delay = 1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 750);
      process.stdout.write(`Rate limited; retrying in ${delay}ms\n`);
      await wait(delay);
    }
  }
  throw new Error("Retry loop exhausted");
};

const downloadForVerification = async (entry) => {
  if (!VERIFY_BASE_URL) {
    return await runWithRetry(
      WRANGLER,
      [
        "r2",
        "object",
        "get",
        `${BUCKET}/${keyFor(entry)}`,
        "--pipe",
        "--remote",
      ],
      { captureStdout: true }
    );
  }

  const attempts = 7;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;
    try {
      // biome-ignore lint/performance/noAwaitInLoops: retry attempts are sequential
      response = await fetch(`${VERIFY_BASE_URL}/${keyFor(entry)}`);
    } catch (error) {
      if (attempt >= attempts) {
        throw error;
      }
      const delay = 1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 750);
      process.stdout.write(`Connection reset; retrying in ${delay}ms\n`);
      await wait(delay);
      continue;
    }
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
    const retryable = response.status === 429 || response.status >= 500;
    if (!(retryable && attempt < attempts)) {
      throw new Error(`Verification download returned ${response.status}`);
    }
    const delay = 1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 750);
    process.stdout.write(`Rate limited; retrying in ${delay}ms\n`);
    await wait(delay);
  }
  throw new Error("Verification retry loop exhausted");
};

const mimeTypeFor = (entry) => {
  if (entry.format === "jpeg") {
    return "image/jpeg";
  }
  return `image/${entry.format}`;
};

const localPathFor = (entry) => join(REVIVAL_PUBLIC, entry.path);
const keyFor = (entry) => `archive/${basename(entry.path)}`;
const normalizedAlias = (value) => {
  const direct = value.match(ARCHIVE_MEDIA_PATTERN)?.[1] ?? value;
  if (!direct.startsWith("https://blogger.googleusercontent.com/")) {
    return direct;
  }
  return direct
    .replace(BLOGGER_SIZE_PATH_PATTERN, "/s0/")
    .replace(BLOGGER_SIZE_PARAMETER_PATTERN, "");
};

const hashFile = (path) =>
  new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });

const processConcurrent = async (entries, worker, label) => {
  let cursor = 0;
  let completed = 0;
  const work = async () => {
    while (cursor < entries.length) {
      const index = cursor;
      cursor += 1;
      // Each worker owns a sequential queue; Promise.all supplies bounded concurrency.
      // biome-ignore lint/performance/noAwaitInLoops: bounded worker-pool queue
      await worker(entries[index]);
      completed += 1;
      if (completed % 25 === 0 || completed === entries.length) {
        await persistState();
        process.stdout.write(`${label}: ${completed}/${entries.length}\n`);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, entries.length) }, work)
  );
};

if (shouldUpload) {
  const pending = media.filter((entry) => !uploaded.has(entry.sha256));
  await processConcurrent(
    pending,
    async (entry) => {
      const localPath = localPathFor(entry);
      const localHash = await hashFile(localPath);
      if (localHash !== entry.sha256) {
        throw new Error(`Checksum mismatch before upload: ${localPath}`);
      }
      await runWithRetry(WRANGLER, [
        "r2",
        "object",
        "put",
        `${BUCKET}/${keyFor(entry)}`,
        "--file",
        localPath,
        "--content-type",
        mimeTypeFor(entry),
        "--cache-control",
        CACHE_CONTROL,
        "--remote",
        "--force",
      ]);
      uploaded.add(entry.sha256);
    },
    "Uploaded"
  );
  await persistState();
}

if (shouldVerify) {
  const pending = media.filter(
    (entry) => uploaded.has(entry.sha256) && !verified.has(entry.sha256)
  );
  await processConcurrent(
    pending,
    async (entry) => {
      const bytes = await downloadForVerification(entry);
      const remoteHash = createHash("sha256").update(bytes).digest("hex");
      if (remoteHash !== entry.sha256) {
        throw new Error(`Remote checksum mismatch: ${keyFor(entry)}`);
      }
      verified.add(entry.sha256);
    },
    "Verified"
  );
  await persistState();
}

const sqlValue = (value) =>
  value === null || value === undefined
    ? "NULL"
    : `'${String(value).replaceAll("'", "''")}'`;

if (shouldSeed) {
  const eligible = media.filter((entry) => verified.has(entry.sha256));
  if (eligible.length !== media.length) {
    throw new Error(
      `Verify every selected object before seeding D1 (${eligible.length}/${media.length})`
    );
  }
  await mkdir(SQL_DIR, { recursive: true });
  const chunkSize = 200;
  const chunks = [];
  for (let index = 0; index < eligible.length; index += chunkSize) {
    chunks.push(eligible.slice(index, index + chunkSize));
  }
  for (const [chunkIndex, entries] of chunks.entries()) {
    if (seededChunks.has(chunkIndex)) {
      continue;
    }
    const lines = ["PRAGMA foreign_keys = ON;"];
    for (const entry of entries) {
      const id = `media_${entry.sha256}`;
      const fileName = basename(entry.path);
      const timestamp = Date.parse(manifest.generatedAt);
      lines.push(
        `INSERT OR IGNORE INTO media_assets (id, r2_key, file_name, mime_type, byte_size, width, height, alt_text, caption, credit, created_at, updated_at, sha256, source_url, provenance, alt_text_provenance, caption_provenance) VALUES (${sqlValue(id)}, ${sqlValue(keyFor(entry))}, ${sqlValue(fileName)}, ${sqlValue(mimeTypeFor(entry))}, ${entry.bytes}, ${entry.width ?? "NULL"}, ${entry.height ?? "NULL"}, '', '', '', ${timestamp}, ${timestamp}, ${sqlValue(entry.sha256)}, ${sqlValue(entry.acquiredFrom)}, 'recovered', 'missing', 'missing');`
      );
      const sourceAliases = [entry.acquiredFrom, ...entry.aliases];
      const aliases = new Set([
        ...sourceAliases,
        ...sourceAliases.map(normalizedAlias),
      ]);
      for (const alias of aliases) {
        lines.push(
          `INSERT OR IGNORE INTO media_aliases (alias, media_id, created_at) VALUES (${sqlValue(alias)}, ${sqlValue(id)}, ${timestamp});`
        );
      }
    }
    const sqlPath = join(SQL_DIR, `${String(chunkIndex).padStart(4, "0")}.sql`);
    // D1 chunks are applied in order so restart state remains exact.
    // biome-ignore lint/performance/noAwaitInLoops: ordered resumable import
    await writeFile(sqlPath, `${lines.join("\n")}\n`);
    await runWithRetry(WRANGLER, [
      "d1",
      "execute",
      "DB",
      "--remote",
      "--file",
      sqlPath,
    ]);
    seededChunks.add(chunkIndex);
    await persistState();
    process.stdout.write(`Seeded: ${chunkIndex + 1}/${chunks.length}\n`);
  }
}

process.stdout.write(
  `Complete: ${uploaded.size} uploaded, ${verified.size} verified, ${seededChunks.size} seed chunks\n`
);
