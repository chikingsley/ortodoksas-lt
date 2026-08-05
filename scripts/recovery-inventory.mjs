import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestsDir = join(root, "recovery", "manifests");
const reportsDir = join(root, "recovery", "reports");
const stateDir = join(root, "recovery", "state");
const coveragePath = join(reportsDir, "coverage.md");
const unresolvedPath = join(reportsDir, "unresolved.jsonl");

const PROPERTIES = [
  { locale: "lt", host: "www.ortodoksas.lt" },
  { locale: "ru", host: "ortodoksas-ru.blogspot.com" },
  { locale: "uk", host: "ortodoksas-ua.blogspot.com" },
  { locale: "be", host: "ortodoksas-by.blogspot.com" },
  { locale: "en", host: "ortodoksas-en.blogspot.com" },
];

const FIELDS = "urlkey,timestamp,original,mimetype,statuscode,digest,length";
const MAX_PAGES = 500;
const ATTEMPTS = 5;
const CONCURRENCY = 1;
const TIMEOUT_MS = 60_000;
const RATE_DELAY_MS = 1500;
const BACKOFF_BASE_MS = 2000;
const BACKOFF_MAX_MS = 300_000;
const MAX_ERROR_BODY_BYTES = 4096;
const MAX_ERROR_EVIDENCE_CHARS = 512;
const USER_AGENT = "ortodoksas-revival-inventory/0.2 (recovery of archived public content)";

let lastRequestTime = 0;

function parseOptions(argv) {
  const options = {
    locale: null,
    refresh: false,
    minDelayMs: RATE_DELAY_MS,
    timeoutMs: TIMEOUT_MS,
  };

  const valueFor = (argument, index, name) => {
    if (argument.startsWith(`${name}=`)) return argument.slice(name.length + 1);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--refresh") {
      options.refresh = true;
    } else if (argument === "--locale" || argument.startsWith("--locale=")) {
      options.locale = valueFor(argument, index, "--locale");
      if (!argument.includes("=")) index += 1;
    } else if (argument === "--min-delay-ms" || argument.startsWith("--min-delay-ms=")) {
      options.minDelayMs = Number(valueFor(argument, index, "--min-delay-ms"));
      if (!argument.includes("=")) index += 1;
    } else if (argument === "--timeout-ms" || argument.startsWith("--timeout-ms=")) {
      options.timeoutMs = Number(valueFor(argument, index, "--timeout-ms"));
      if (!argument.includes("=")) index += 1;
    } else {
      throw new Error(`unknown option: ${argument}`);
    }
  }

  if (options.locale && !PROPERTIES.some((property) => property.locale === options.locale)) {
    throw new Error(`unknown locale: ${options.locale}`);
  }
  for (const [name, value] of Object.entries({
    "--min-delay-ms": options.minDelayMs,
    "--timeout-ms": options.timeoutMs,
  })) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
  }
  if (options.timeoutMs === 0) throw new Error("--timeout-ms must be greater than zero");
  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimit(minDelayMs) {
  const now = Date.now();
  const wait = Math.max(0, lastRequestTime + minDelayMs - now);
  lastRequestTime = now + wait;
  if (wait > 0) await sleep(wait);
}

function sourceQueries(property) {
  const params = { output: "json", fl: FIELDS };
  return [
    {
      id: `${property.locale}:host`,
      params: { ...params, url: `${property.host}/*` },
    },
    {
      id: `${property.locale}:sitemap`,
      params: { ...params, url: `${property.host}/sitemap.xml` },
    },
    {
      id: `${property.locale}:feeds-posts`,
      params: { ...params, url: `${property.host}/feeds/posts/default` },
    },
    {
      id: `${property.locale}:feeds-rss`,
      params: { ...params, url: `${property.host}/feeds/posts/default?alt=rss` },
    },
  ];
}

function cdxUrl(params, page = null, showNumPages = false) {
  const url = new URL("https://web.archive.org/cdx/search/cdx");
  for (const [key, value] of Object.entries(params)) {
    if (showNumPages && (key === "output" || key === "fl")) continue;
    url.searchParams.set(key, value);
  }
  url.searchParams.set("pageSize", "1");
  if (page !== null) url.searchParams.set("page", String(page));
  if (showNumPages) url.searchParams.set("showNumPages", "true");
  return url.href;
}

function looksLikeHtml(text) {
  return /^\s*<!doctype html|^\s*<html[\s>]/i.test(text);
}

async function readResponseBody(response) {
  if (!response.body) {
    const text = await response.text();
    return response.status >= 400 ? text.slice(0, MAX_ERROR_BODY_BYTES) : text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const bounded = response.status >= 400 || contentType.includes("text/html");
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = MAX_ERROR_BODY_BYTES - bytes;
      const chunk = bounded ? value.slice(0, Math.max(0, remaining)) : value;
      text += decoder.decode(chunk, { stream: true });
      bytes += chunk.byteLength;
      if (
        (bounded && (bytes >= MAX_ERROR_BODY_BYTES || chunk.byteLength < value.byteLength)) ||
        (!bounded && bytes >= MAX_ERROR_BODY_BYTES && looksLikeHtml(text))
      ) {
        await reader.cancel();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return text + decoder.decode();
}

function errorEvidence(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact ? compact.slice(0, MAX_ERROR_EVIDENCE_CHARS) : null;
}

function endpointError(message, { status = null, requestUrl, phase, page = null, responseBody = null, retryAfterMs = null }) {
  const error = new Error(message);
  error.status = status;
  error.requestUrl = requestUrl;
  error.phase = phase;
  error.page = page;
  error.responseBody = responseBody;
  error.retryAfterMs = retryAfterMs;
  return error;
}

function httpError(response, text, requestUrl, phase, page) {
  const evidence = errorEvidence(text);
  return endpointError(
    `HTTP ${response.status} ${response.statusText}${evidence ? `: ${evidence}` : ""}`,
    {
      status: response.status,
      requestUrl,
      phase,
      page,
      responseBody: evidence,
      retryAfterMs: retryAfterMs(response),
    },
  );
}

function retryAfterMs(response) {
  const value = response.headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

function isHtmlThrottlePage(response, text) {
  const contentType = response.headers.get("content-type") ?? "";
  const html = contentType.includes("text/html") || looksLikeHtml(text);
  return (
    html &&
    /\b(?:429|503)\b|too many requests|rate.?limit|temporarily unavailable|service unavailable|captcha|robot|slow down|try again/i.test(
      text,
    )
  );
}

function isRetryableError(error) {
  return error?.retryable === true || error?.name === "AbortError" || error?.name === "TimeoutError" || error instanceof TypeError;
}

function retryDelayMs(attempt, retryAfter) {
  const exponential = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (attempt - 1));
  const base = Math.max(exponential, retryAfter ?? 0);
  const jitter = Math.floor(Math.random() * Math.min(1000, Math.max(1, Math.floor(base / 4))));
  return base + jitter;
}

async function fetchEndpoint(url, options, phase, page, attempts = ATTEMPTS) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await rateLimit(options.minDelayMs);
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(options.timeoutMs),
      });
      const text = await readResponseBody(response);
      const throttlePage = isHtmlThrottlePage(response, text);
      const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
      const htmlResponse = contentType.includes("text/html") || looksLikeHtml(text);
      if (response.status === 400) throw httpError(response, text, url, phase, page);
      if (response.status === 408 || response.status === 429 || (response.status >= 500 && response.status <= 599) || throttlePage) {
        const error =
          throttlePage && response.status < 400
            ? endpointError(`HTML throttle page: ${errorEvidence(text) ?? "empty body"}`, {
                status: response.status,
                requestUrl: url,
                phase,
                page,
                responseBody: errorEvidence(text),
                retryAfterMs: retryAfterMs(response),
              })
            : httpError(response, text, url, phase, page);
        error.retryable = true;
        error.retryAfterMs = retryAfterMs(response);
        throw error;
      }
      if (!response.ok) {
        if (htmlResponse) {
          throw endpointError(`HTML error page: ${errorEvidence(text) ?? "empty body"}`, {
            status: response.status,
            requestUrl: url,
            phase,
            page,
            responseBody: errorEvidence(text),
            retryAfterMs: retryAfterMs(response),
          });
        }
        throw httpError(response, text, url, phase, page);
      }
      if (htmlResponse) {
        throw endpointError(`HTML error page: ${errorEvidence(text) ?? "empty body"}`, {
          status: response.status,
          requestUrl: url,
          phase,
          page,
          responseBody: errorEvidence(text),
          retryAfterMs: retryAfterMs(response),
        });
      }
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        if (phase === "preflight" && /^\s*\d+\s*$/.test(text)) {
          return { json: undefined, text, status: response.status };
        }
        throw endpointError(`invalid JSON response: ${errorEvidence(text) ?? "empty body"}`, {
          status: response.status,
          requestUrl: url,
          phase,
          page,
          responseBody: errorEvidence(text),
          retryAfterMs: retryAfterMs(response),
        });
      }
      return { json, text, status: response.status };
    } catch (error) {
      if (error.requestUrl === undefined) {
        error.status = null;
        error.requestUrl = url;
        error.phase = phase;
        error.page = page;
        error.responseBody = null;
        error.retryAfterMs = null;
      }
      lastError = error;
      if (attempt < attempts && isRetryableError(error)) {
        await sleep(retryDelayMs(attempt, error.retryAfterMs));
      } else if (attempt < attempts && error?.name === "SyntaxError") {
        throw error;
      } else if (attempt < attempts && !isRetryableError(error)) {
        throw error;
      }
    }
  }
  throw lastError;
}

async function fetchPage(url, options, page) {
  const result = await fetchEndpoint(url, options, "page", page);
  if (!Array.isArray(result.json)) {
    throw endpointError("non-array CDX response", {
      status: result.status,
      requestUrl: url,
      phase: "page",
      page,
      responseBody: errorEvidence(result.text),
    });
  }
  return result.json;
}

function parseInteger(value) {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!/^\d+$/.test(normalized)) return null;
    value = Number(normalized);
  }
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseTotalPages(json, text = "") {
  let value;
  if (Array.isArray(json)) {
    if (
      json.length !== 2 ||
      !Array.isArray(json[0]) ||
      json[0].length !== 1 ||
      json[0][0] !== "numpages" ||
      !Array.isArray(json[1]) ||
      json[1].length !== 1
    ) {
      return null;
    }
    value = json[1][0];
  } else if (typeof json === "number" || typeof json === "string") {
    value = json;
  } else if (json === undefined && /^\s*\d+\s*$/.test(text)) {
    value = text.trim();
  } else {
    return null;
  }
  return parseInteger(value);
}

async function fetchTotalPages(source, options) {
  const url = cdxUrl(source.params, null, true);
  const result = await fetchEndpoint(url, options, "preflight", null);
  const totalPages = parseTotalPages(result.json, result.text);
  if (totalPages === null) {
    throw endpointError("invalid non-negative integer totalPages", {
      status: result.status,
      requestUrl: url,
      phase: "preflight",
      page: null,
      responseBody: errorEvidence(result.text),
    });
  }
  return { totalPages, url };
}

function toRecord(row, header, property, sourceId) {
  const index = Object.fromEntries(header.map((name, i) => [name, i]));
  const get = (name) => row[index[name]] ?? null;
  const timestamp = get("timestamp");
  const original = get("original");
  if (!timestamp || !original) return null;
  const digest = get("digest");
  const length = get("length");
  return {
    locale: property.locale,
    timestamp,
    original,
    urlKey: get("urlkey"),
    status: get("statuscode"),
    mime: get("mimetype"),
    digest: digest && digest !== "-" ? digest : null,
    length: length && /^\d+$/.test(length) ? Number(length) : null,
    sourceQueries: [sourceId],
  };
}

function sortRecords(records) {
  return [...records].sort(
    (a, b) =>
      (a.urlKey ?? "").localeCompare(b.urlKey ?? "") ||
      a.timestamp.localeCompare(b.timestamp) ||
      a.original.localeCompare(b.original),
  );
}

function sortUnresolved(entries) {
  return [...entries].sort(
    (a, b) =>
      a.locale.localeCompare(b.locale) ||
      String(a.query).localeCompare(String(b.query)) ||
      String(a.kind ?? "").localeCompare(String(b.kind ?? "")) ||
      String(a.error ?? "").localeCompare(String(b.error ?? "")) ||
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
  );
}

function endpointUnresolved(property, source, error, phase, page) {
  return {
    locale: property.locale,
    query: source.id,
    error: error.message,
    status: error.status ?? null,
    requestUrl: error.requestUrl ?? null,
    phase: error.phase ?? phase,
    page: error.page ?? page,
    responseBody: error.responseBody ?? null,
    retryAfterMs: error.retryAfterMs ?? null,
  };
}

function checkpointPath(source) {
  return join(stateDir, `${encodeURIComponent(source.id)}.json`);
}

async function readCheckpoint(source) {
  try {
    const checkpoint = JSON.parse(await readFile(checkpointPath(source), "utf8"));
    if (
      checkpoint.locale !== source.id.split(":", 1)[0] ||
      checkpoint.query !== source.id ||
      typeof checkpoint.raw !== "number" ||
      !Array.isArray(checkpoint.records) ||
      !Array.isArray(checkpoint.unresolved) ||
      typeof checkpoint.complete !== "boolean" ||
      (checkpoint.totalPages !== undefined &&
        (!Number.isInteger(checkpoint.totalPages) || checkpoint.totalPages < 0))
    ) {
      return null;
    }
    if (checkpoint.complete) {
      checkpoint.nextPage = null;
    } else if (!Number.isInteger(checkpoint.nextPage) || checkpoint.nextPage < 0) {
      checkpoint.nextPage = 0;
    }
    return checkpoint;
  } catch {
    return null;
  }
}

async function writeCheckpoint(source, checkpoint) {
  await atomicWrite(checkpointPath(source), `${JSON.stringify(checkpoint)}\n`);
}

async function querySource(property, source, options, previous) {
  const resume = options.refresh || previous?.complete
    ? null
    : previous?.resume ?? previous;
  let header = null;
  let raw = resume?.raw ?? 0;
  const records = new Map(
    (resume?.records ?? []).map((record) => [
      `${property.locale}\u0000${record.timestamp}\u0000${record.original}`,
      record,
    ]),
  );
  const unresolved = (resume?.unresolved ?? []).filter((entry) => entry.kind);
  if (Array.isArray(resume?.header)) header = resume.header;
  const startPage = Number.isInteger(resume?.nextPage) && resume.nextPage >= 0 ? resume.nextPage : 0;
  const preserved = options.refresh && previous?.complete
    ? {
        raw: previous.raw,
        records: previous.records,
        unresolved: previous.unresolved.filter((entry) => entry.kind),
      }
    : null;
  const pageFailure = (error, phase, page, nextPage = page) => ({
    raw,
    records: sortRecords(records.values()),
    unresolved: sortUnresolved([...unresolved, endpointUnresolved(property, source, error, phase, page)]),
    nextPage,
    totalPages: totalPages ?? null,
    header,
    preserved,
    ok: false,
  });
  const checkpointState = (nextPage) => {
    const current = {
      locale: property.locale,
      query: source.id,
      complete: false,
      nextPage,
      totalPages,
      raw,
      records: sortRecords(records.values()),
      unresolved: sortUnresolved(unresolved),
      header,
    };
    return preserved ? { ...preserved, complete: false, nextPage, resume: current } : current;
  };

  let totalPages;
  try {
    ({ totalPages } = await fetchTotalPages(source, options));
  } catch (error) {
    return pageFailure(error, "preflight", null, startPage);
  }

  if (startPage === totalPages) {
    return { raw, records: sortRecords(records.values()), unresolved, nextPage: null, totalPages, header, ok: true };
  }
  if (startPage > totalPages) {
    return {
      raw,
      records: sortRecords(records.values()),
      unresolved: sortUnresolved([
        ...unresolved,
        {
          locale: property.locale,
          query: source.id,
          error: `resume cursor ${startPage} exceeds totalPages ${totalPages}`,
          phase: "preflight",
          page: startPage,
          totalPages,
        },
      ]),
      nextPage: startPage,
      totalPages,
      header,
      preserved,
      ok: false,
    };
  }

  for (let page = startPage; page < totalPages && page < startPage + MAX_PAGES; page += 1) {
    let json;
    try {
      json = await fetchPage(cdxUrl(source.params, page), options, page);
    } catch (error) {
      return pageFailure(error, "page", page);
    }
    if (json.length > 0 && !header) header = json[0];
    const fieldCount = Array.isArray(header) ? header.length : 0;
    if (json.length > 0 && fieldCount === 0) {
      return pageFailure(
        endpointError("invalid CDX header", {
          status: 200,
          requestUrl: cdxUrl(source.params, page),
          phase: "page",
          page,
          responseBody: errorEvidence(JSON.stringify(json)),
        }),
        "page",
        page,
      );
    }
    const rows = fieldCount === 0 ? [] : json.slice(1).filter((row) => Array.isArray(row) && row.length === fieldCount);
    for (const row of rows) {
      raw += 1;
      const record = toRecord(row, header, property, source.id);
      if (!record) {
        unresolved.push({ locale: property.locale, query: source.id, kind: "malformed", row });
        continue;
      }
      const key = `${property.locale}\u0000${record.timestamp}\u0000${record.original}`;
      records.set(key, record);
    }
    await writeCheckpoint(source, checkpointState(page + 1));
  }
  if (startPage + MAX_PAGES >= totalPages) {
    return { raw, records: sortRecords(records.values()), unresolved, nextPage: null, totalPages, header, ok: true };
  }
  return {
    raw,
    records: sortRecords(records.values()),
    unresolved: sortUnresolved([
      ...unresolved,
      {
        locale: property.locale,
        query: source.id,
        error: `page limit reached before page ${startPage + MAX_PAGES}`,
        phase: "page-limit",
        page: startPage + MAX_PAGES,
        totalPages,
      },
    ]),
    nextPage: startPage + MAX_PAGES,
    totalPages,
    header,
    preserved,
    ok: false,
  };
}

async function atomicWrite(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  try {
    await writeFile(tmp, data);
    await rename(tmp, file);
  } catch (error) {
    await unlink(tmp).catch(() => {});
    throw error;
  }
}

function distribution(records, field) {
  const counts = new Map();
  for (const record of records) {
    const value = record[field] ?? "null";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

function formatDistribution(entries) {
  return entries.map(([value, count]) => `${value}: ${count}`).join(", ");
}

function formatDateRange(timestamps) {
  if (timestamps.length === 0) return "none";
  const sorted = [...timestamps].sort();
  return `${sorted[0]} .. ${sorted[sorted.length - 1]}`;
}

function renderCoverage(stats) {
  const lines = ["# G0 Recovery Inventory — Coverage Report", ""];
  lines.push("Source: Wayback CDX API (https://web.archive.org/cdx/search/cdx).");
  lines.push("Per-locale source queries: host/domain record query, sitemap.xml, feeds/posts/default, feeds/posts/default?alt=rss.");
  lines.push("Records are deduplicated by locale+timestamp+original; sourceQueries list every query that returned a capture.");
  lines.push("");
  lines.push("| Locale | Manifest | Raw rows | Deduplicated | Unique URLs | Unique URL keys | Date range |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const stat of stats) {
    lines.push(
      `| ${stat.locale} | \`${stat.manifestPath}\` | ${stat.raw} | ${stat.deduplicated} | ${stat.uniqueUrls} | ${stat.uniqueUrlkeys} | ${stat.dateRange} |`,
    );
  }
  lines.push("");
  for (const stat of stats) {
    lines.push(`## ${stat.locale} — ${stat.host}`);
    lines.push("");
    lines.push(`- Manifest: \`${stat.manifestPath}\``);
    lines.push(`- Raw CDX rows across sources (pre-dedupe): ${stat.raw}`);
    lines.push(`- Deduplicated records: ${stat.deduplicated}`);
    lines.push(`- Unique originals: ${stat.uniqueUrls}`);
    lines.push(`- Unique URL keys: ${stat.uniqueUrlkeys}`);
    lines.push(`- Date range: ${stat.dateRange}`);
    lines.push(`- Status distribution: ${formatDistribution(stat.statusDistribution)}`);
    lines.push(`- MIME distribution: ${formatDistribution(stat.mimeDistribution)}`);
    lines.push(`- Source queries: ${stat.sourceQueries.join(", ")}`);
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  await mkdir(manifestsDir, { recursive: true });
  await mkdir(reportsDir, { recursive: true });
  await mkdir(stateDir, { recursive: true });

  const selectedProperties = options.locale
    ? PROPERTIES.filter((property) => property.locale === options.locale)
    : PROPERTIES;
  const checkpointsByLocale = new Map(selectedProperties.map((property) => [property.locale, new Map()]));
  for (const property of selectedProperties) {
    for (const source of sourceQueries(property)) {
      const checkpoint = await readCheckpoint(source);
      if (checkpoint) checkpointsByLocale.get(property.locale).set(source.id, checkpoint);
    }
  }

  const work = [];
  for (const property of selectedProperties) {
    for (const source of sourceQueries(property)) work.push({ property, source });
  }

  process.stderr.write(
    `Queries: ${work.length} across ${selectedProperties.length} locales (concurrency=${CONCURRENCY})\n`,
  );
  let complete = 0;
  for (const { property, source } of work) {
    const previous = checkpointsByLocale.get(property.locale).get(source.id);
    let checkpoint;
    let status;
    if (previous?.complete && !options.refresh) {
      checkpoint = previous;
      status = "SKIP";
    } else {
      const result = await querySource(property, source, options, previous);
      if (result.ok) {
        checkpoint = {
          locale: property.locale,
          query: source.id,
          complete: true,
          nextPage: null,
          totalPages: result.totalPages,
          raw: result.raw,
          records: sortRecords(result.records),
          unresolved: sortUnresolved(result.unresolved),
          header: result.header,
        };
        status = "OK";
      } else {
        const preserved = result.preserved;
        checkpoint = {
          locale: property.locale,
          query: source.id,
          complete: false,
          nextPage: result.nextPage,
          totalPages: result.totalPages ?? previous?.totalPages ?? null,
          raw: preserved?.raw ?? result.raw,
          records: preserved?.records ?? result.records,
          unresolved: sortUnresolved([...(preserved?.unresolved ?? []), ...result.unresolved]),
          header: preserved ? undefined : result.header,
          ...(preserved
            ? {
                resume: {
                  raw: result.raw,
                  records: result.records,
                  unresolved: result.unresolved,
                  header: result.header,
                  nextPage: result.nextPage,
                  totalPages: result.totalPages,
                },
              }
            : {}),
        };
        status = "FAIL";
      }
      await writeCheckpoint(source, checkpoint);
    }
    checkpointsByLocale.get(property.locale).set(source.id, checkpoint);
    complete += 1;
    const rows = checkpoint.raw;
    process.stderr.write(
      `[${String(complete).padStart(String(work.length).length, "0")}/${work.length}] ${source.id} ${status} (rows=${rows})\n`,
    );
  }

  process.stderr.write("Writing manifests from checkpoints...\n");

  const reportProperties = selectedProperties.filter((property) =>
    sourceQueries(property).some((source) => checkpointsByLocale.get(property.locale).has(source.id)),
  );
  const stats = [];
  for (const property of reportProperties) {
    const recordsByKey = new Map();
    let raw = 0;
    const allSourcesComplete = sourceQueries(property).every(
      (source) => checkpointsByLocale.get(property.locale).get(source.id)?.complete === true,
    );
    for (const source of sourceQueries(property)) {
      const checkpoint = checkpointsByLocale.get(property.locale).get(source.id);
      if (!checkpoint) continue;
      raw += checkpoint.raw;
      for (const record of checkpoint.records) {
        const key = `${property.locale}\u0000${record.timestamp}\u0000${record.original}`;
        const existing = recordsByKey.get(key);
        if (existing) {
          existing.sourceQueries = [...new Set([...existing.sourceQueries, ...record.sourceQueries])].sort();
        } else {
          recordsByKey.set(key, {
            ...record,
            sourceQueries: [...record.sourceQueries].sort(),
          });
        }
      }
    }
    const records = sortRecords(recordsByKey.values());
    const manifestPath = join(manifestsDir, `${property.locale}.jsonl`);
    await atomicWrite(
      manifestPath,
      records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : ""),
    );
    stats.push({
      locale: property.locale,
      host: property.host,
      manifestPath: `recovery/manifests/${property.locale}.jsonl`,
      raw,
      deduplicated: records.length,
      uniqueUrls: new Set(records.map((record) => record.original)).size,
      uniqueUrlkeys: new Set(records.map((record) => record.urlKey).filter(Boolean)).size,
      dateRange: formatDateRange(records.map((record) => record.timestamp)),
      statusDistribution: distribution(records, "status"),
      mimeDistribution: distribution(records, "mime"),
      sourceQueries: sourceQueries(property).map((source) => source.id),
      allSourcesComplete,
    });
    console.log(
      `${property.locale}: raw=${raw} deduped=${records.length} urls=${stats.at(-1).uniqueUrls} keys=${stats.at(-1).uniqueUrlkeys} range=${stats.at(-1).dateRange}`,
    );
  }

  const unresolved = [];
  for (const property of reportProperties) {
    for (const source of sourceQueries(property)) {
      const checkpoint = checkpointsByLocale.get(property.locale).get(source.id);
      if (checkpoint) unresolved.push(...checkpoint.unresolved);
    }
    const records = stats.find((stat) => stat.locale === property.locale);
    if (records?.allSourcesComplete && records.deduplicated === 0 && records.raw === 0) {
      unresolved.push({ locale: property.locale, query: "all", error: "no records returned" });
    }
  }
  const sortedUnresolved = sortUnresolved(unresolved);
  await atomicWrite(
    unresolvedPath,
    sortedUnresolved.map((entry) => JSON.stringify(entry)).join("\n") + (sortedUnresolved.length ? "\n" : ""),
  );
  await atomicWrite(coveragePath, renderCoverage(stats));

  const failed = sortedUnresolved.filter((entry) => !entry.kind).length;
  if (sortedUnresolved.length > 0) {
    process.stderr.write(`INCOMPLETE: ${sortedUnresolved.length} unresolved (${failed} query failures)\n`);
    process.exitCode = 1;
  } else {
    process.stderr.write("COMPLETE\n");
  }
}

await main();
