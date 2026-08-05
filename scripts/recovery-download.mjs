#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { access, mkdir, open, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { request as httpsRequest } from "node:https";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestsDir = join(root, "recovery", "manifests");
const payloadsDir = join(root, "recovery", "payloads");
const indexDir = join(root, "recovery", "payload-index");
const reportsDir = join(root, "recovery", "reports");
const checkpointPath = join(indexDir, "checkpoints.jsonl");
const reportPath = join(reportsDir, "payload-coverage.md");

const LOCALES = ["be", "en", "lt", "ru", "uk"];
const MIME_GROUPS = ["html", "xml", "image", "other", "all"];
const STATUSES = ["queued", "downloading", "ok", "mismatch", "missing", "error"];
const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 2_000;
const BACKOFF_MAX_MS = 300_000;
const MAX_RESPONSE_HISTORY = 20;
const MAX_HEADER_COUNT = 32;
const MAX_HEADER_VALUE_CHARS = 2_048;
const CHECKPOINT_INTERVAL_MS = 30_000;
const CHECKPOINT_COMPLETION_INTERVAL = 100;
const USER_AGENT = "ortodoksas-revival-payloads/1.0 (G0 recovery)";

function fetchRaw(url, { headers, signal }) {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(url, { headers, signal }, (incoming) => {
      resolve({
        body: Readable.toWeb(incoming),
        headers: new Headers(incoming.headers),
        status: incoming.statusCode ?? 0,
        statusText: incoming.statusMessage ?? "",
        url,
      });
    });
    request.once("error", reject);
    request.end();
  });
}

let lastRequestAt = 0;
let checkpointWrite = Promise.resolve();
let checkpointCompletedAt = 0;
let checkpointWrittenAt = 0;
let interrupted = false;
const stopController = new AbortController();
const activeControllers = new Set();

class InterruptError extends Error {
  constructor() {
    super("interrupted by SIGINT");
    this.name = "InterruptError";
  }
}

class RequestFailure extends Error {
  constructor(message, { kind = "error", retryable = false, retryAfterMs = null, response = null, history = [], attempts = 1 } = {}) {
    super(message);
    this.name = "RequestFailure";
    this.kind = kind;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
    this.response = response;
    this.history = history;
    this.attempts = attempts;
  }
}

function parseOptions(argv) {
  const options = {
    locale: null,
    mimeGroup: "all",
    limit: null,
    refreshErrors: false,
    minDelayMs: 1_500,
    timeoutMs: 60_000,
    concurrency: 2,
    resetIndex: false,
    plan: false,
  };

  const valueFor = (argument, index, name) => {
    if (argument.startsWith(`${name}=`)) return argument.slice(name.length + 1);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      printUsage();
      process.exitCode = 0;
      return null;
    }
    if (argument === "--refresh-errors") {
      options.refreshErrors = true;
      continue;
    }
    if (argument === "--reset-index") {
      options.resetIndex = true;
      continue;
    }
    if (argument === "--plan") {
      options.plan = true;
      continue;
    }
    const specs = [
      ["--locale", "locale"],
      ["--mime-group", "mimeGroup"],
      ["--limit", "limit"],
      ["--min-delay-ms", "minDelayMs"],
      ["--timeout-ms", "timeoutMs"],
      ["--concurrency", "concurrency"],
    ];
    const spec = specs.find(([name]) => argument === name || argument.startsWith(`${name}=`));
    if (!spec) throw new Error(`unknown option: ${argument}`);
    const [name, key] = spec;
    const value = valueFor(argument, index, name);
    if (!argument.includes("=")) index += 1;
    if (key === "locale") options.locale = value === "all" ? null : value;
    else if (key === "mimeGroup") options.mimeGroup = value;
    else options[key] = Number(value);
  }

  if (options.locale !== null && !LOCALES.includes(options.locale)) throw new Error(`unknown locale: ${options.locale}`);
  if (!MIME_GROUPS.includes(options.mimeGroup)) throw new Error(`unknown MIME group: ${options.mimeGroup}`);
  for (const [name, value] of Object.entries({
    "--limit": options.limit,
    "--min-delay-ms": options.minDelayMs,
    "--timeout-ms": options.timeoutMs,
    "--concurrency": options.concurrency,
  })) {
    if (value !== null && (!Number.isSafeInteger(value) || value < 0)) throw new Error(`${name} must be a non-negative integer`);
  }
  if (options.timeoutMs === 0) throw new Error("--timeout-ms must be greater than zero");
  if (options.concurrency === 0) throw new Error("--concurrency must be greater than zero");
  return options;
}

function printUsage() {
  console.log(`Usage: node scripts/recovery-download.mjs [options]

Options:
  --locale lt|ru|uk|be|en|all
  --mime-group html|xml|image|other|all
  --limit N
  --refresh-errors
  --reset-index
  --plan
  --min-delay-ms N
  --timeout-ms N
  --concurrency N`);
}

function sleep(ms) {
  if (interrupted) return Promise.reject(new InterruptError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      stopController.signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new InterruptError());
    };
    stopController.signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function pace(minDelayMs) {
  const now = Date.now();
  const wait = Math.max(0, lastRequestAt + minDelayMs - now);
  lastRequestAt = now + wait;
  if (wait > 0) await sleep(wait);
}

function retryAfterMs(response) {
  const value = response.headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

function retryDelayMs(attempt, retryAfter) {
  const exponential = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (attempt - 1));
  const base = Math.max(exponential, retryAfter ?? 0);
  const jitter = Math.floor(Math.random() * Math.min(1_000, Math.max(1, Math.floor(base / 4))));
  return base + jitter;
}

function isRetryableStatus(status) {
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);
}

function contentLength(response, fallback = null) {
  const value = response.headers.get("content-length");
  if (value && /^\d+$/.test(value)) return Number(value);
  return fallback;
}

function responseProvenance(response, requestUrl, attempt, bytes = null) {
  const headers = boundedHeaders(response);
  return {
    attempt,
    requestUrl,
    status: response?.status ?? null,
    statusText: response?.statusText ?? null,
    contentType: response?.headers.get("content-type") ?? null,
    contentLength: response ? contentLength(response, bytes) : bytes,
    contentEncoding: response?.headers.get("content-encoding") ?? null,
    location: response?.headers.get("location")?.slice(0, MAX_HEADER_VALUE_CHARS) ?? null,
    headers,
    finalUrl: response?.url ?? null,
  };
}

function boundedHeaders(response) {
  if (!response) return {};
  const headers = {};
  let count = 0;
  for (const [name, value] of response.headers) {
    if (count >= MAX_HEADER_COUNT) break;
    headers[name] = value.slice(0, MAX_HEADER_VALUE_CHARS);
    count += 1;
  }
  return headers;
}

function errorProvenance(error, requestUrl, attempt) {
  return {
    attempt,
    requestUrl,
    status: null,
    statusText: null,
    contentType: null,
    contentLength: null,
    contentEncoding: null,
    location: null,
    headers: {},
    finalUrl: null,
    error: error instanceof Error ? error.message : String(error),
  };
}

async function streamResponse(response, temporaryPath) {
  let bytes = 0;
  const sha1 = createHash("sha1");
  const sha256 = createHash("sha256");
  const digesting = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      sha1.update(chunk);
      sha256.update(chunk);
      callback(null, chunk);
    },
  });
  if (response.body) {
    await pipeline(Readable.fromWeb(response.body), digesting, createWriteStream(temporaryPath, { flags: "wx" }));
  } else {
    await writeFile(temporaryPath, Buffer.alloc(0), { flag: "wx" });
  }
  const handle = await open(temporaryPath, "r+");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
  const sha1Bytes = sha1.digest();
  return {
    bytes,
    sha1: sha1Bytes.toString("hex"),
    sha256: sha256.digest("hex"),
    digest: base32(sha1Bytes),
  };
}

async function hashFile(file) {
  const sha1 = createHash("sha1");
  const sha256 = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(file)) {
    bytes += chunk.length;
    sha1.update(chunk);
    sha256.update(chunk);
  }
  const sha1Bytes = sha1.digest();
  return { bytes, sha1: sha1Bytes.toString("hex"), sha256: sha256.digest("hex"), digest: base32(sha1Bytes) };
}

async function removeStaleParts(directory) {
  let items;
  try {
    items = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const item of items) {
    const path = join(directory, item.name);
    if (item.isDirectory()) await removeStaleParts(path);
    else if (item.name.endsWith(".part")) {
      const pid = Number(item.name.match(/\.(\d+)\.part$/)?.[1] ?? 0);
      if (pid === 0 || pid === process.pid || !isProcessAlive(pid)) await unlink(path).catch(() => {});
    }
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function base32(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
    buffer &= bits === 0 ? 0 : (1 << bits) - 1;
  }
  if (bits > 0) output += alphabet[(buffer << (5 - bits)) & 31];
  return output;
}

async function fetchReplay(item, options) {
  const requestUrl = `https://web.archive.org/web/${item.representative.timestamp}id_/${item.representative.replayOriginal}`;
  const history = [];
  let lastFailure = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (interrupted) throw new InterruptError();
    await pace(options.minDelayMs);
    const controller = new AbortController();
    const abortFromStop = () => controller.abort();
    stopController.signal.addEventListener("abort", abortFromStop, { once: true });
    activeControllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    let response = null;
    let temporaryPath = null;
    try {
      response = await fetchRaw(requestUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "*/*", "Accept-Encoding": "identity" },
        signal: controller.signal,
      });
      const provenance = responseProvenance(response, requestUrl, attempt);
      history.push(provenance);
      temporaryPath = `${digestPath(item.digest)}.${process.pid}.part`;
      await mkdir(join(payloadsDir, item.digest.slice(0, 2)), { recursive: true });
      const streamed = await streamResponse(response, temporaryPath);
      const actualDigest = streamed.digest;
      const finalResponse = { ...provenance, contentLength: contentLength(response, streamed.bytes), deliveredBytes: streamed.bytes };
      history[history.length - 1] = finalResponse;
      const retryable = isRetryableStatus(response.status) && actualDigest !== item.digest;
      if (retryable && attempt < MAX_ATTEMPTS) {
        await unlink(temporaryPath).catch(() => {});
        temporaryPath = null;
        await sleep(retryDelayMs(attempt, retryAfterMs(response)));
        continue;
      }
      return {
        attempts: attempt,
        history,
        response: finalResponse,
        temporaryPath,
        bytes: streamed.bytes,
        sha1: streamed.sha1,
        sha256: streamed.sha256,
        actualDigest,
      };
    } catch (error) {
      if (interrupted || (controller.signal.aborted && stopController.signal.aborted)) {
        if (temporaryPath) await unlink(temporaryPath).catch(() => {});
        throw new InterruptError();
      }
      if (error instanceof RequestFailure) {
        lastFailure = error;
        if (error.kind === "missing" || !error.retryable || attempt >= MAX_ATTEMPTS) throw error;
        await sleep(retryDelayMs(attempt, error.retryAfterMs));
        continue;
      }
      if (temporaryPath) await unlink(temporaryPath).catch(() => {});
      const provenance = errorProvenance(error, requestUrl, attempt);
      history.push(provenance);
      lastFailure = new RequestFailure(error instanceof Error ? error.message : String(error), {
        retryable: true,
        response: provenance,
        history,
        attempts: attempt,
      });
      if (attempt >= MAX_ATTEMPTS) throw lastFailure;
      await sleep(retryDelayMs(attempt, null));
    } finally {
      clearTimeout(timeout);
      activeControllers.delete(controller);
      stopController.signal.removeEventListener("abort", abortFromStop);
    }
  }
  throw lastFailure ?? new Error("download exhausted without a result");
}

function validateDigest(value, context) {
  if (!/^[A-Z2-7]{32}$/.test(value)) throw new Error(`unsafe or invalid CDX digest in ${context}: ${value}`);
}

function validateOriginal(value, context) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new Error(`unsafe original URL in ${context}`);
  }
  const replayOriginal = value.replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
  if (replayOriginal.includes("\\") || /[\u0000-\u001f\u007f]/.test(replayOriginal)) {
    throw new Error(`unsafe original URL in ${context}`);
  }
  const rawPath = replayOriginal.replace(/^[a-z]+:\/\/[^/]+/i, "").split(/[?#]/, 1)[0];
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    throw new Error(`invalid original URL encoding in ${context}`);
  }
  if (decodedPath.split("/").some((part) => part === "." || part === "..")) {
    throw new Error(`path traversal in original URL in ${context}`);
  }
  let parsed;
  try {
    parsed = new URL(replayOriginal);
  } catch {
    throw new Error(`invalid original URL in ${context}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error(`unsupported original URL in ${context}`);
  return { original: value, replayOriginal: parsed.href };
}

function mimeGroup(mime) {
  const value = String(mime ?? "").toLowerCase();
  if (value.includes("html")) return "html";
  if (value.startsWith("image/")) return "image";
  if (value.includes("xml") || value.includes("rss") || value.includes("atom")) return "xml";
  return "other";
}

function captureSort(left, right) {
  return left.timestamp.localeCompare(right.timestamp) || left.original.localeCompare(right.original) || left.locale.localeCompare(right.locale);
}

function digestPath(digest) {
  validateDigest(digest, "payload path");
  return join(payloadsDir, digest.slice(0, 2), `${digest}.bin`);
}

function relativePayloadPath(file) {
  return relative(root, file).replaceAll("\\", "/");
}

function payloadPathFromRelative(value) {
  if (typeof value !== "string" || !value.startsWith("recovery/payloads/") || value.includes("\0")) return null;
  const parts = value.split("/");
  if (parts.some((part) => part === "." || part === ".." || part === "")) return null;
  return join(root, ...parts);
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function atomicWrite(file, data) {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`;
  try {
    await writeFile(temporary, data, { encoding: "utf8", flag: "wx" });
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

async function readManifests() {
  const names = (await readdir(manifestsDir)).filter((name) => name.endsWith(".jsonl")).sort();
  const groups = new Map();
  const captures = new Map();
  const fingerprint = createHash("sha256");
  let rawRecords = 0;
  for (const name of names) {
    const localeFromFile = name.slice(0, -6);
    const bytes = await readFile(join(manifestsDir, name));
    fingerprint.update(name).update("\0").update(bytes).update("\0");
    const text = bytes.toString("utf8");
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line) continue;
      rawRecords += 1;
      const context = `${name}:${index + 1}`;
      let record;
      try {
        record = JSON.parse(line);
      } catch (error) {
        throw new Error(`invalid JSON in ${context}: ${error.message}`);
      }
      if (!record || typeof record !== "object") throw new Error(`invalid manifest record in ${context}`);
      const locale = typeof record.locale === "string" ? record.locale : localeFromFile;
      if (!LOCALES.includes(locale)) throw new Error(`unknown locale in ${context}: ${locale}`);
      const timestamp = String(record.timestamp ?? "");
      if (!/^\d{14}$/.test(timestamp)) throw new Error(`invalid timestamp in ${context}`);
      const { original, replayOriginal } = validateOriginal(record.original, context);
      const digest = record.digest === null || record.digest === undefined || record.digest === "-" ? null : String(record.digest).trim();
      if (digest !== null) validateDigest(digest, context);
      const cdxStatus = String(record.status ?? "");
      const mime = record.mime ?? null;
      const key = `${locale}\u0000${timestamp}\u0000${original}`;
      const sourceQueries = Array.isArray(record.sourceQueries) ? [...new Set(record.sourceQueries.map(String))].sort() : [];
      const capture = {
        key,
        locale,
        timestamp,
        original,
        replayOriginal,
        urlKey: record.urlKey ?? null,
        status: cdxStatus,
        cdxStatus,
        mime,
        digest,
        length: record.length ?? null,
        cdxLength: record.length ?? null,
        capturedLocation: record.location ?? null,
        sourceQueries,
        revisit: cdxStatus === "-" || cdxStatus === "197" || String(mime ?? "").toLowerCase() === "warc/revisit",
      };
      const prior = captures.get(key);
      if (prior) {
        if (prior.digest !== digest) throw new Error(`conflicting digests for capture ${key}`);
        prior.sourceQueries = [...new Set([...prior.sourceQueries, ...sourceQueries])].sort();
        continue;
      }
      captures.set(key, capture);
      if (digest !== null) {
        const group = groups.get(digest) ?? { digest, captures: [] };
        group.captures.push(capture);
        groups.set(digest, group);
      }
    }
  }
  for (const group of groups.values()) {
    group.captures.sort(captureSort);
    group.locales = [...new Set(group.captures.map((capture) => capture.locale))].sort();
    group.timestamps = [...new Set(group.captures.map((capture) => capture.timestamp))].sort();
    group.originals = [...new Set(group.captures.map((capture) => capture.original))].sort();
    group.sourceReferences = [...new Set(group.captures.flatMap((capture) => capture.sourceQueries))].sort();
    group.revisitAliases = group.captures.filter((capture) => capture.revisit).map((capture) => capture.key).sort();
    group.representative = group.captures.find((capture) => !capture.revisit) ?? group.captures[0];
  }
  return {
    groups,
    captures,
    rawRecords,
    fingerprint: fingerprint.digest("hex"),
    manifestFiles: names,
  };
}

async function loadCheckpoint() {
  let text;
  try {
    text = await readFile(checkpointPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { meta: null, captures: new Map(), digests: new Map() };
    throw error;
  }
  const meta = {};
  const captures = new Map();
  const digests = new Map();
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (error) {
      throw new Error(`invalid checkpoint JSON at line ${index + 1}: ${error.message}`);
    }
    if (!entry || typeof entry !== "object") throw new Error(`invalid checkpoint at line ${index + 1}`);
    if (entry.recordType === "meta") {
      Object.assign(meta, entry);
    } else if (entry.recordType === "capture") {
      if (typeof entry.key !== "string") throw new Error(`invalid capture checkpoint at line ${index + 1}`);
      captures.set(entry.key, entry);
    } else {
      if (typeof entry.digest !== "string") throw new Error(`invalid digest checkpoint at line ${index + 1}`);
      validateDigest(entry.digest, `checkpoint line ${index + 1}`);
      if (!STATUSES.includes(entry.status)) throw new Error(`invalid checkpoint status at line ${index + 1}: ${entry.status}`);
      digests.set(entry.digest, entry);
    }
  }
  return { meta: Object.keys(meta).length > 0 ? meta : null, captures, digests };
}

function groupMatches(group, options) {
  return group.captures.some((capture) => {
    if (options.locale !== null && capture.locale !== options.locale) return false;
    return options.mimeGroup === "all" || mimeGroup(capture.mime) === options.mimeGroup;
  });
}

function payloadRelativeForDigest(digest) {
  return relativePayloadPath(digestPath(digest));
}

async function makeEntries(groups, previous) {
  const entries = new Map();
  for (const digest of [...groups.keys()].sort()) {
    const group = groups.get(digest);
    const old = previous.get(digest) ?? {};
    let status = old.status ?? "queued";
    if (status === "downloading") status = "queued";
    if (!STATUSES.includes(status)) status = "queued";
    const expectedPayload = payloadRelativeForDigest(digest);
    const oldPayload = payloadPathFromRelative(old.payloadPath);
    if (status === "ok" && oldPayload !== join(root, expectedPayload)) status = "error";
    let verifiedFile = null;
    if (status === "ok" && !(await exists(oldPayload ?? join(root, expectedPayload)))) status = "missing";
    if (status === "ok") {
      verifiedFile = await hashFile(oldPayload ?? join(root, expectedPayload));
      if (verifiedFile.digest !== digest) status = "error";
    }
    if (status === "queued") {
      const existingPayload = join(root, expectedPayload);
      if (await exists(existingPayload)) {
        const existingHash = await hashFile(existingPayload);
        if (existingHash.digest === digest) {
          status = "ok";
          verifiedFile = existingHash;
        }
      }
    }
    entries.set(digest, {
      ...old,
      digest,
      digestPrefix: digest.slice(0, 2),
      status,
      locales: group.locales,
      timestamps: group.timestamps,
      originals: group.originals,
      sourceReferences: group.sourceReferences,
      revisitAliases: group.revisitAliases,
      anchorCapture: group.representative.key,
      captures: group.captures,
      representative: group.representative,
      expectedPayloadPath: expectedPayload,
      payloadPath: oldPayload && oldPayload === join(root, expectedPayload) ? old.payloadPath : status === "ok" ? expectedPayload : null,
      quarantinePath: old.quarantinePath ?? null,
      cdxLengths: [...new Set(group.captures.map((capture) => capture.cdxLength).filter((value) => value !== null))],
      sha1: old.sha1 ?? verifiedFile?.sha1 ?? null,
      sha256: old.sha256 ?? verifiedFile?.sha256 ?? null,
      storedBytes: old.storedBytes ?? verifiedFile?.bytes ?? null,
      error: status === "error" && !old.error ? "verified payload no longer matches CDX digest" : old.error ?? null,
      attempts: Number.isSafeInteger(old.attempts) ? old.attempts : 0,
      responseHistory: Array.isArray(old.responseHistory) ? old.responseHistory.slice(-MAX_RESPONSE_HISTORY) : [],
    });
  }
  return entries;
}

function updateCaptureOutcomes(captures, entries) {
  for (const capture of captures.values()) {
    if (capture.digest === null) {
      capture.outcome = "unresolved";
      capture.outcomeReason = "missing CDX digest";
      continue;
    }
    const entry = entries.get(capture.digest);
    if (!entry) {
      capture.outcome = "unresolved";
      capture.outcomeReason = "digest group missing";
    } else if (entry.status === "ok") {
      capture.outcome = capture.revisit ? "alias-verified" : "verified";
      capture.outcomeReason = null;
    } else if (entry.status === "queued" || entry.status === "downloading") {
      capture.outcome = "pending";
      capture.outcomeReason = null;
    } else {
      capture.outcome = "unresolved";
      capture.outcomeReason = `digest group ${entry.status}`;
    }
  }
}

async function persistEntries(entries, captures, manifestFingerprint) {
  updateCaptureOutcomes(captures, entries);
  const lines = [
    JSON.stringify({ recordType: "meta", schemaVersion: 2, manifestFingerprint }),
    ...[...captures.values()]
      .sort((left, right) => left.key.localeCompare(right.key))
      .map((capture) => JSON.stringify({ recordType: "capture", ...capture })),
    ...[...entries.values()]
      .sort((left, right) => left.digest.localeCompare(right.digest))
      .map((entry) => JSON.stringify({ recordType: "digest", ...entry })),
  ];
  const data = lines.join("\n");
  checkpointWrite = checkpointWrite.then(() => atomicWrite(checkpointPath, `${data}\n`));
  await checkpointWrite;
}

async function persistEntriesIfDue(entries, captures, manifestFingerprint, progress) {
  const now = Date.now();
  if (
    progress.completed - checkpointCompletedAt < CHECKPOINT_COMPLETION_INTERVAL &&
    now - checkpointWrittenAt < CHECKPOINT_INTERVAL_MS
  ) {
    return;
  }
  checkpointCompletedAt = progress.completed;
  checkpointWrittenAt = now;
  await persistEntries(entries, captures, manifestFingerprint);
}

async function writeMetadata(entry) {
  const metadataPath = join(root, entry.expectedPayloadPath.replace(/\.bin$/, ".json"));
  const metadata = {
    schemaVersion: 2,
    digest: entry.digest,
    digestPrefix: entry.digestPrefix,
    status: entry.status,
    expectedPayloadPath: entry.expectedPayloadPath,
    payloadPath: entry.payloadPath ?? null,
    quarantinePath: entry.quarantinePath ?? null,
    sha1: entry.sha1 ?? null,
    sha256: entry.sha256 ?? null,
    fetchedDigest: entry.fetchedDigest ?? null,
    storedBytes: entry.storedBytes ?? null,
    cdxLengths: entry.cdxLengths,
    cdxLengthDiagnostic: entry.cdxLengthDiagnostic ?? null,
    attempts: entry.attempts,
    requestIdentityEncoding: "identity",
    response: entry.response ?? null,
    httpStatus: entry.response?.status ?? null,
    contentType: entry.response?.contentType ?? null,
    contentLength: entry.response?.contentLength ?? null,
    contentEncoding: entry.response?.contentEncoding ?? null,
    location: entry.response?.location ?? null,
    finalUrl: entry.response?.finalUrl ?? null,
    verificationBytes: "fetch response body after runtime decoding",
    responseHistory: entry.responseHistory ?? [],
    error: entry.error ?? null,
    timestamp: entry.representative.timestamp,
    original: entry.representative.original,
    timestamps: entry.timestamps,
    originals: entry.originals,
    locales: entry.locales,
    sourceReferences: entry.sourceReferences,
    revisitAliases: entry.revisitAliases,
    representative: entry.representative,
    anchorCapture: entry.anchorCapture,
    captures: entry.captures,
  };
  await atomicWrite(metadataPath, `${JSON.stringify(metadata)}\n`);
}

async function storePayload(entry, result) {
  const valid = result.actualDigest === entry.digest;
  if (valid) {
    const destination = digestPath(entry.digest);
    const existing = await exists(destination);
    if (existing) {
      const existingHash = await hashFile(destination);
      if (existingHash.digest === entry.digest) {
        await unlink(result.temporaryPath).catch(() => {});
      } else {
        await rename(result.temporaryPath, destination);
      }
    } else {
      await rename(result.temporaryPath, destination);
    }
    return { valid: true, payloadPath: relativePayloadPath(destination), quarantinePath: null };
  }
  const quarantine = join(
    payloadsDir,
    "quarantine",
    entry.digest.slice(0, 2),
    `${entry.digest}--${result.actualDigest}.bin`,
  );
  await mkdir(dirname(quarantine), { recursive: true });
  if (await exists(quarantine)) {
    const existingHash = await hashFile(quarantine);
    if (existingHash.digest === result.actualDigest) await unlink(result.temporaryPath).catch(() => {});
    else await rename(result.temporaryPath, quarantine);
  } else {
    await rename(result.temporaryPath, quarantine);
  }
  return { valid: false, payloadPath: null, quarantinePath: relativePayloadPath(quarantine) };
}

function appendHistory(entry, history) {
  entry.responseHistory = [...(entry.responseHistory ?? []), ...history].slice(-MAX_RESPONSE_HISTORY);
}

async function processEntry(entry, options, entries, captures, manifestFingerprint, progress) {
  entry.status = "downloading";
  entry.error = null;
  try {
    const result = await fetchReplay(entry, options);
    const stored = await storePayload(entry, result);
    entry.status = stored.valid ? "ok" : "mismatch";
    entry.payloadPath = stored.payloadPath;
    entry.quarantinePath = stored.quarantinePath;
    entry.sha1 = result.sha1;
    entry.sha256 = result.sha256;
    entry.fetchedDigest = result.actualDigest;
    entry.storedBytes = result.bytes;
    entry.response = result.response;
    entry.attempts = (entry.attempts ?? 0) + result.attempts;
    entry.cdxLengthDiagnostic = entry.captures.map((capture) => ({
      key: capture.key,
      cdxLength: capture.cdxLength,
      deliveredBytes: result.bytes,
      matches: capture.cdxLength === null || capture.cdxLength === undefined || Number(capture.cdxLength) === result.bytes,
    }));
    appendHistory(entry, result.history);
    entry.error = stored.valid ? null : `digest mismatch: expected ${entry.digest}, fetched ${result.actualDigest}`;
    await writeMetadata(entry);
    progress.completed += 1;
    progress.bytes += result.bytes;
    if (entry.status !== "ok") progress.failed += 1;
    logProgress(entry, progress);
  } catch (error) {
    if (error instanceof InterruptError) {
      entry.status = "queued";
      entry.error = error.message;
      return;
    }
    const failure = error instanceof RequestFailure ? error : new RequestFailure(error.message, { attempts: 1 });
    entry.status = failure.kind;
    entry.error = failure.message;
    entry.attempts = (entry.attempts ?? 0) + (failure.attempts ?? 1);
    entry.response = failure.response ?? null;
    appendHistory(entry, failure.history ?? []);
    progress.completed += 1;
    progress.failed += 1;
    await writeMetadata(entry);
    logProgress(entry, progress);
  } finally {
    await persistEntriesIfDue(entries, captures, manifestFingerprint, progress);
  }
}

function logProgress(entry, progress) {
  const elapsedSeconds = Math.max(0.001, (Date.now() - progress.startedAt) / 1_000);
  const rate = progress.bytes / elapsedSeconds;
  const rateText = rate >= 1_048_576 ? `${(rate / 1_048_576).toFixed(2)} MiB/s` : `${(rate / 1_024).toFixed(1)} KiB/s`;
  process.stderr.write(`[${progress.completed}/${progress.total}] ${entry.digest} ${entry.status} attempts=${entry.attempts} throughput=${rateText}\n`);
}

function countValues(values, selector) {
  const counts = new Map();
  for (const value of values) {
    const key = selector(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function renderReport(snapshot, manifestStats, options, progress) {
  const all = [...snapshot.digests.values()].sort((left, right) => left.digest.localeCompare(right.digest));
  const captures = [...snapshot.captures.values()].sort((left, right) => left.key.localeCompare(right.key));
  const counts = Object.fromEntries(STATUSES.map((status) => [status, all.filter((entry) => entry.status === status).length]));
  const stored = all.filter((entry) => entry.status === "ok" && entry.payloadPath !== null && entry.payloadPath !== undefined);
  const statusGroups = countValues(captures, (capture) => capture.cdxStatus || "(empty)");
  const mimeGroups = countValues(captures, (capture) => mimeGroup(capture.mime));
  const outcomeGroups = countValues(captures, (capture) => capture.outcome ?? "unknown");
  const lines = [
    "# G0 Payload Coverage",
    "",
    "Derived from the generated `recovery/payload-index/checkpoints.jsonl`.",
    "",
    `- Durable capture records: ${captures.length}`,
    `- Distinct CDX digests: ${all.length}`,
    `- Verified payloads: ${stored.length}`,
    `- Verified payload bytes: ${stored.reduce((sum, entry) => sum + (entry.storedBytes ?? 0), 0)}`,
    `- Manifest fingerprint: ${snapshot.meta?.manifestFingerprint ?? manifestStats.fingerprint}`,
    `- Run selection: locale=${options.locale ?? "all"}, mime-group=${options.mimeGroup}, limit=${options.limit ?? "none"}`,
    `- Run progress: attempted=${progress.completed}, failed=${progress.failed}`,
    "",
    "| Status | Digests |",
    "|---|---:|",
  ];
  for (const status of STATUSES) lines.push(`| ${status} | ${counts[status]} |`);
  lines.push("", "## Locale References", "", "| Locale | Distinct digests referenced |", "|---|---:|");
  const locales = [...new Set(all.flatMap((entry) => entry.locales))].sort();
  for (const locale of locales) lines.push(`| ${locale} | ${all.filter((entry) => entry.locales.includes(locale)).length} |`);
  lines.push("", "## Capture Outcomes", "", "| Outcome | Captures |", "|---|---:|");
  for (const [outcome, count] of [...outcomeGroups.entries()].sort(([left], [right]) => left.localeCompare(right))) lines.push(`| ${outcome} | ${count} |`);
  lines.push("", "## CDX Status Groups", "", "| CDX status | Captures |", "|---|---:|");
  for (const [status, count] of [...statusGroups.entries()].sort(([left], [right]) => left.localeCompare(right))) lines.push(`| ${status} | ${count} |`);
  lines.push("", "## MIME Groups", "", "| MIME group | Captures |", "|---|---:|");
  for (const [group, count] of [...mimeGroups.entries()].sort(([left], [right]) => left.localeCompare(right))) lines.push(`| ${group} | ${count} |`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function planReport(entries, captures, manifestStats, options) {
  updateCaptureOutcomes(captures, entries);
  const candidates = [...entries.values()].filter((entry) => groupMatches(entry, options)).sort((left, right) => left.digest.localeCompare(right.digest));
  const work = candidates.filter((entry) => entry.status === "queued" || (options.refreshErrors && ["mismatch", "missing", "error"].includes(entry.status)));
  const selected = options.limit === null ? work : work.slice(0, options.limit);
  const statusGroups = countValues(captures.values(), (capture) => capture.cdxStatus || "(empty)");
  const mimeGroups = countValues(captures.values(), (capture) => mimeGroup(capture.mime));
  const revisitAliases = [...captures.values()].filter((capture) => capture.revisit).length;
  const existingVerified = [...entries.values()].filter((entry) => entry.status === "ok").length;
  const pending = [...entries.values()].filter((entry) => entry.status === "queued" || entry.status === "downloading").length;
  return {
    manifestFiles: manifestStats.manifestFiles,
    manifestFingerprint: manifestStats.fingerprint,
    captureAliases: [...captures.values()].filter((capture) => capture.digest !== null).length,
    uniqueDigestGroups: entries.size,
    revisitAliases,
    statusGroups: Object.fromEntries([...statusGroups.entries()].sort(([left], [right]) => left.localeCompare(right))),
    mimeGroups: Object.fromEntries([...mimeGroups.entries()].sort(([left], [right]) => left.localeCompare(right))),
    estimatedRequests: selected.length,
    estimatedRequestsBeforeLimit: work.length,
    existingVerifiedPayloads: existingVerified,
    pendingPayloads: pending,
    selectedPendingPayloads: selected.length,
    captureOutcomes: Object.fromEntries([...countValues(captures.values(), (capture) => capture.outcome ?? "unknown").entries()].sort(([left], [right]) => left.localeCompare(right))),
    options: {
      locale: options.locale ?? "all",
      mimeGroup: options.mimeGroup,
      limit: options.limit,
      refreshErrors: options.refreshErrors,
    },
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (!options) return;
  const manifestStats = await readManifests();
  const loaded = await loadCheckpoint();
  const hasCheckpoint = loaded.meta !== null || loaded.captures.size > 0 || loaded.digests.size > 0;
  if (
    !options.resetIndex &&
    hasCheckpoint &&
    (loaded.meta?.schemaVersion !== 2 || loaded.meta?.manifestFingerprint !== manifestStats.fingerprint)
  ) {
    throw new Error(`incompatible checkpoint: fingerprint=${loaded.meta?.manifestFingerprint ?? "missing"} input=${manifestStats.fingerprint}; use --reset-index to rebuild`);
  }
  const previous = options.resetIndex ? new Map() : loaded.digests;
  const entries = await makeEntries(manifestStats.groups, previous);
  const captures = manifestStats.captures;
  if (options.plan) {
    console.log(JSON.stringify(planReport(entries, captures, manifestStats, options), null, 2));
    return;
  }
  await mkdir(indexDir, { recursive: true });
  await mkdir(reportsDir, { recursive: true });
  await mkdir(payloadsDir, { recursive: true });
  await removeStaleParts(payloadsDir);
  await persistEntries(entries, captures, manifestStats.fingerprint);
  checkpointCompletedAt = 0;
  checkpointWrittenAt = Date.now();

  const candidates = [...entries.values()]
    .filter((entry) => groupMatches(entry, options))
    .sort((left, right) => left.digest.localeCompare(right.digest));
  const work = candidates.filter((entry) => {
    if (entry.status === "queued") return true;
    return options.refreshErrors && ["downloading", "mismatch", "missing", "error"].includes(entry.status);
  });
  const selected = options.limit === null ? work : work.slice(0, options.limit);
  const progress = { completed: 0, failed: 0, bytes: 0, total: selected.length, startedAt: Date.now() };
  process.stderr.write(`payloads: candidates=${candidates.length} selected=${selected.length} concurrency=${options.concurrency}\n`);

  let cursor = 0;
  async function worker() {
    while (!interrupted) {
      const index = cursor;
      cursor += 1;
      if (index >= selected.length) return;
      await processEntry(selected[index], options, entries, captures, manifestStats.fingerprint, progress);
    }
  }
  await Promise.all(Array.from({ length: Math.min(options.concurrency, Math.max(1, selected.length)) }, () => worker()));
  await persistEntries(entries, captures, manifestStats.fingerprint);
  const generated = await loadCheckpoint();
  await atomicWrite(reportPath, renderReport(generated, manifestStats, options, progress));
  if (interrupted) {
    process.stderr.write("interrupted: checkpoint preserved; queued work remains pending\n");
    process.exitCode = 130;
  } else if (progress.failed > 0) {
    process.exitCode = 1;
  }
}

process.on("SIGINT", () => {
  if (interrupted) return;
  interrupted = true;
  stopController.abort();
  for (const controller of activeControllers) controller.abort();
  process.stderr.write("SIGINT received; finishing checkpoint writes\n");
});

try {
  await main();
} catch (error) {
  process.stderr.write(`recovery-download: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
}
