import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

const root = process.cwd();
const requireComplete = process.argv.includes("--require-complete");
const checkpointPath = path.join(root, "recovery/payload-index/checkpoints.jsonl");
const reportDirectory = path.join(root, "recovery/reports");
const publishedContentDirectory = path.join(root, "public/content");
const jsonPath = path.join(reportDirectory, "forensic-audit.json");
const markdownPath = path.join(reportDirectory, "forensic-audit.md");

const infrastructureDomains = [
  "archive.org",
  "blogger.com",
  "blogblog.com",
  "blogspot.com",
  "facebook.com",
  "google.com",
  "googleapis.com",
  "googleusercontent.com",
  "gstatic.com",
  "schema.org",
  "twitter.com",
  "x.com",
  "youtu.be",
  "youtube.com",
  "ytimg.com",
];

const records = [];
const input = createReadStream(checkpointPath, { encoding: "utf8" });
const lines = readline.createInterface({ input, crlfDelay: Infinity });

for await (const line of lines) {
  if (!line.trim()) continue;
  const record = JSON.parse(line);
  if (record.recordType === "digest") records.push(record);
}

const domainInventory = new Map();
const findings = [];
const mismatches = [];
const publicationFindings = [];
let scannedPayloads = 0;
let scannedHtmlPayloads = 0;
let scannedPublicationFiles = 0;

function timestampFor(record) {
  return [...(record.timestamps ?? [])].sort().at(-1) ?? null;
}

function sourceFor(record) {
  const capture = record.representative ?? record.captures?.[0] ?? {};
  return {
    digest: record.digest,
    timestamp: capture.timestamp ?? timestampFor(record),
    url: capture.original ?? record.originals?.[0] ?? null,
  };
}

function domainFromUrl(value) {
  try {
    const url = new URL(value.replaceAll("&amp;", "&"));
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function domainMatches(domain, suffix) {
  return domain === suffix || domain.endsWith(`.${suffix}`);
}

function domainClass(domain) {
  if (domainMatches(domain, "ortodoksas.lt")) return "first-party";
  if (infrastructureDomains.some((item) => domainMatches(domain, item))) {
    return "known-platform";
  }
  return "third-party";
}

function inventoryDomain(domain, context, source) {
  const key = `${domain}\u0000${context}`;
  const existing = domainInventory.get(key) ?? {
    domain,
    context,
    classification: domainClass(domain),
    payloadCount: 0,
    firstTimestamp: source.timestamp,
    lastTimestamp: source.timestamp,
    samples: [],
  };
  existing.payloadCount += 1;
  if (source.timestamp && (!existing.firstTimestamp || source.timestamp < existing.firstTimestamp)) {
    existing.firstTimestamp = source.timestamp;
  }
  if (source.timestamp && (!existing.lastTimestamp || source.timestamp > existing.lastTimestamp)) {
    existing.lastTimestamp = source.timestamp;
  }
  if (existing.samples.length < 5 && !existing.samples.some((sample) => sample.digest === source.digest)) {
    existing.samples.push(source);
  }
  domainInventory.set(key, existing);
}

function addFinding(severity, kind, evidence, source) {
  findings.push({ severity, kind, evidence: evidence.slice(0, 500), ...source });
}

function inspectHtml(html, source) {
  const seenDomains = new Set();
  const register = (value, context) => {
    const domain = domainFromUrl(value);
    const key = `${domain}\u0000${context}`;
    if (!domain || seenDomains.has(key)) return;
    seenDomains.add(key);
    inventoryDomain(domain, context, source);
  };

  for (const match of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    register(match[1], "script");
  }
  for (const match of html.matchAll(/<(?:iframe|frame|embed)\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    register(match[1], "embedded-content");
  }
  for (const match of html.matchAll(/<object\b[^>]*\bdata\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    register(match[1], "embedded-content");
  }
  for (const match of html.matchAll(/<(?:form|base)\b[^>]*\b(?:action|href)\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    register(match[1], "navigation-control");
    const domain = domainFromUrl(match[1]);
    if (domain && domainClass(domain) === "third-party") {
      addFinding("medium", "third-party-form-or-base", match[0], source);
    }
  }
  for (const match of html.matchAll(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["'][^"']*url\s*=\s*([^"';\s>]+)[^"']*["'][^>]*>/gi)) {
    register(match[1], "redirect");
    const domain = domainFromUrl(match[1]);
    if (domain && domainClass(domain) === "third-party") {
      addFinding("high", "third-party-meta-refresh", match[0], source);
    }
  }

  const highConfidencePatterns = [
    ["eval-decoder", /eval\s*\(\s*(?:unescape|atob)\s*\(/i],
    ["document-write-decoder", /document\.write\s*\(\s*unescape\s*\(/i],
    ["obfuscated-script-chain", /eval\s*\([^)]*String\.fromCharCode/i],
  ];
  for (const [kind, pattern] of highConfidencePatterns) {
    const match = html.match(pattern);
    if (match) addFinding("high", kind, html.slice(Math.max(0, match.index - 120), match.index + 380), source);
  }

  for (const match of html.matchAll(/<(?:iframe|frame)\b[^>]*(?:display\s*:\s*none|visibility\s*:\s*hidden|width\s*=\s*["']?0|height\s*=\s*["']?0)[^>]*>/gi)) {
    addFinding("medium", "hidden-frame", match[0], source);
  }

  for (const match of html.matchAll(/(?:window\.)?location(?:\.href)?\s*=\s*["'](https?:\/\/[^"']+)["']/gi)) {
    const domain = domainFromUrl(match[1]);
    if (domain && domainClass(domain) === "third-party") {
      register(match[1], "script-redirect");
      addFinding("medium", "third-party-script-redirect", match[0], source);
    }
  }
}

async function classifyMismatch(record) {
  const response = record.responseHistory?.at(-1) ?? {};
  const status = Number(response.status ?? response.statusCode ?? 0);
  const bytes = Number(response.deliveredBytes ?? response.bytes ?? response.storedBytes ?? 0);
  const original = sourceFor(record).url ?? "";
  let classification = "digest-mismatch-or-replay-drift";
  if (/%(?:0a|0d|00)|[\u0000-\u001f]/i.test(original)) classification = "malformed-capture-url";
  else if (record.fetchedDigest === "3I42H3S6NNFQ2MSVX7XZKYAYSCX5QBYJ" || bytes === 0) {
    classification = status >= 300 && status < 400 ? "empty-replay-redirect" : "empty-replay-response";
  } else if (status === 404 && bytes > 50_000) classification = "wayback-unavailable-page";

  if (record.quarantinePath) {
    try {
      const body = (await readFile(path.resolve(root, record.quarantinePath), "utf8")).slice(0, 250_000);
      if (/wayback machine|temporarily unavailable|rate limit|too many requests|captcha|robots\.txt/i.test(body)) {
        classification = "wayback-generated-response";
      }
    } catch {
      // The mismatch metadata remains sufficient when a quarantine body is absent.
    }
  }

  return { ...sourceFor(record), classification, responseStatus: status || null, responseBytes: bytes || null };
}

async function listJsonFiles(directory) {
  const files = [];
  try {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...(await listJsonFiles(entryPath)));
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(entryPath);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return files;
}

function inspectPublishedValue(value, file, field = "$") {
  if (typeof value === "string") {
    const checks = [
      ["active-content-tag", /<(?:script|iframe|frame|object|embed|form)\b/i],
      ["event-handler-attribute", /\son[a-z]+\s*=/i],
      ["unsafe-url-scheme", /(?:href|src|data|action|formaction)\s*=\s*["']\s*(?:javascript|vbscript|file)\s*:/i],
    ];
    for (const [kind, pattern] of checks) {
      const match = value.match(pattern);
      if (match) {
        publicationFindings.push({
          severity: "high",
          kind,
          file: path.relative(root, file),
          field,
          evidence: value.slice(Math.max(0, match.index - 100), match.index + 300),
        });
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectPublishedValue(item, file, `${field}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) inspectPublishedValue(item, file, `${field}.${key}`);
  }
}

for (const record of records) {
  if (["mismatch", "error", "missing"].includes(record.status)) mismatches.push(await classifyMismatch(record));
  if (record.status !== "ok" || !record.payloadPath) continue;
  scannedPayloads += 1;
  const mime = record.representative?.mime ?? record.captures?.[0]?.mime ?? "";
  if (!mime.includes("html")) continue;
  try {
    const payload = await readFile(path.resolve(root, record.payloadPath));
    const html = payload.toString("utf8");
    scannedHtmlPayloads += 1;
    inspectHtml(html, sourceFor(record));
  } catch (error) {
    addFinding("low", "payload-read-error", String(error), sourceFor(record));
  }
}

for (const file of await listJsonFiles(publishedContentDirectory)) {
  try {
    inspectPublishedValue(JSON.parse(await readFile(file, "utf8")), file);
    scannedPublicationFiles += 1;
  } catch (error) {
    publicationFindings.push({
      severity: "high",
      kind: "publication-json-read-error",
      file: path.relative(root, file),
      field: "$",
      evidence: String(error),
    });
  }
}

const domains = [...domainInventory.values()].sort((a, b) => {
  const classOrder = { "third-party": 0, "known-platform": 1, "first-party": 2 };
  return classOrder[a.classification] - classOrder[b.classification] || b.payloadCount - a.payloadCount || a.domain.localeCompare(b.domain);
});
const highConfidenceFindings = findings.filter((finding) => finding.severity === "high");
const highConfidenceCount = highConfidenceFindings.length + publicationFindings.filter((finding) => finding.severity === "high").length;
const incomplete = records.some((record) => ["queued", "downloading"].includes(record.status));
const statusCounts = Object.fromEntries(
  Object.entries(Object.groupBy(records, (record) => record.status)).map(([status, group]) => [status, group.length]),
);
const conclusion = incomplete
  ? "The payload mirror is incomplete, so this report is provisional."
  : highConfidenceCount > 0
    ? "Recovered payloads contain high-confidence indicators that require manual incident review."
    : "The recovered payload set contains no high-confidence malware indicator matched by this static audit.";

const audit = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  conclusion,
  scope: {
    digestRecords: records.length,
    scannedPayloads,
    scannedHtmlPayloads,
    scannedPublicationFiles,
    statusCounts,
    complete: !incomplete,
  },
  limitations: [
    "A static archive audit cannot observe server-side behavior, deleted captures, account access, or code omitted by the archive.",
    "Third-party and rare domains are review leads rather than proof of malicious behavior.",
    "Wayback replay pages and Blogger platform scripts are classified separately to reduce false positives.",
  ],
  findings,
  publicationFindings,
  mismatches,
  domains,
};

const domainRows = domains
  .map((item) => `| ${item.domain} | ${item.context} | ${item.classification} | ${item.payloadCount} | ${item.firstTimestamp ?? ""} | ${item.lastTimestamp ?? ""} |`)
  .join("\n");
const findingRows = findings
  .slice(0, 250)
  .map((item) => `| ${item.severity} | ${item.kind} | ${item.timestamp ?? ""} | ${item.digest} | ${item.url ?? ""} |`)
  .join("\n");
const mismatchRows = mismatches
  .map((item) => `| ${item.classification} | ${item.responseStatus ?? ""} | ${item.responseBytes ?? ""} | ${item.timestamp ?? ""} | ${item.digest} | ${item.url ?? ""} |`)
  .join("\n");

const markdown = `# Recovery Forensic Audit

Generated: ${audit.generatedAt}

## Conclusion

${conclusion}

This is an evidence triage report, not a declaration that the Blogger account or site was clean or compromised.

## Scope

| Measure | Count |
| --- | ---: |
| Digest records | ${records.length} |
| Verified payloads scanned | ${scannedPayloads} |
| HTML payloads scanned | ${scannedHtmlPayloads} |
| High-confidence findings | ${highConfidenceCount} |
| All findings | ${findings.length} |
| Publication files scanned | ${scannedPublicationFiles} |
| Publication sanitization findings | ${publicationFindings.length} |
| Replay mismatches | ${mismatches.length} |

Mirror complete: ${incomplete ? "no" : "yes"}

## Findings

| Severity | Kind | Capture | Digest | Original URL |
| --- | --- | --- | --- | --- |
${findingRows || "|  | No matched indicators |  |  |  |"}

## Replay mismatch classification

| Classification | HTTP | Bytes | Capture | Digest | Original URL |
| --- | ---: | ---: | --- | --- | --- |
${mismatchRows || "|  |  |  |  | No replay mismatches |  |"}

## Publication sanitization check

Scanned ${scannedPublicationFiles} JSON content files. Matched ${publicationFindings.length} active-content or unsafe-scheme indicators.

## Executable and embedded domain inventory

| Domain | Context | Classification | Payloads | First capture | Last capture |
| --- | --- | --- | ---: | --- | --- |
${domainRows || "|  |  |  | 0 |  |  |"}

## Interpretation boundaries

- A static archive audit cannot observe server-side behavior, deleted captures, account access, or code omitted by the archive.
- Third-party and rare domains are review leads rather than proof of malicious behavior.
- Wayback replay pages and Blogger platform scripts are classified separately to reduce false positives.
`;

await mkdir(reportDirectory, { recursive: true });
await Promise.all([
  writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`),
  writeFile(markdownPath, markdown),
]);

console.log(conclusion);
console.log(
  `Scanned ${scannedHtmlPayloads} HTML payloads; findings=${findings.length} publication=${publicationFindings.length} high=${highConfidenceCount} mismatches=${mismatches.length} domains=${domains.length}.`,
);
for (const finding of publicationFindings.slice(0, 20)) {
  console.log(`publication ${finding.kind} ${finding.file} ${finding.field}`);
}
console.log(`Wrote ${path.relative(root, markdownPath)} and ${path.relative(root, jsonPath)}.`);

if (requireComplete && (incomplete || highConfidenceCount > 0)) {
  console.error(
    `Forensic completion gate failed: complete=${!incomplete} highConfidenceFindings=${highConfidenceCount}.`
  );
  process.exitCode = 1;
}
