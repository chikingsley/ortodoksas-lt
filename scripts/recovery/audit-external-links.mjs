import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const contentRoots = [
  join(root, "apps/web/public/content/pages"),
  join(root, "apps/web/public/content/locales"),
];
const output = join(root, "recovery/reports/external-link-audit.json");
const concurrency = Number(process.env.LINK_AUDIT_CONCURRENCY ?? 32);
const timeoutMs = Number(process.env.LINK_AUDIT_TIMEOUT_MS ?? 8000);

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(file));
    else if (entry.name.endsWith(".json")) files.push(file);
  }
  return files;
}

const links = new Map();
for (const directory of contentRoots) {
  for (const file of walk(directory)) {
    let value;
    try {
      value = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    for (const html of [value.html, value.body]) {
      if (typeof html !== "string") continue;
      for (const match of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) {
        const url = match[1].trim();
        if (!/^https?:\/\//i.test(url)) continue;
        const record = links.get(url) ?? { occurrences: 0, files: [] };
        record.occurrences += 1;
        if (record.files.length < 5 && !record.files.includes(file)) record.files.push(file);
        links.set(url, record);
      }
    }
  }
}

const entries = [...links.entries()].map(([url, metadata]) => ({ url, ...metadata }));
let cursor = 0;
async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(url, { method: "HEAD", redirect: "manual", signal: controller.signal });
    if ([403, 405, 406, 429, 500, 501, 502, 503].includes(response.status)) {
      response = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal });
    }
    return { status: response.status, location: response.headers.get("location") ?? null };
  } catch (error) {
    return { status: null, error: error instanceof Error ? error.name : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= entries.length) return;
    entries[index].result = await check(entries[index].url);
    if ((index + 1) % 100 === 0) process.stdout.write(`Checked ${index + 1}/${entries.length}\n`);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker));
const classify = (entry) => {
  const status = entry.result.status;
  if (status !== null && status >= 200 && status < 400) return "reachable";
  if (status === 404 || status === 410) return "gone";
  if (status !== null && status >= 400) return "error";
  return "unresolved";
};
for (const entry of entries) entry.classification = classify(entry);
const summary = Object.fromEntries(
  ["reachable", "gone", "error", "unresolved"].map((key) => [
    key,
    entries.filter((entry) => entry.classification === key).length,
  ])
);
const report = {
  generatedAt: new Date().toISOString(),
  sources: contentRoots.map((directory) => directory.replace(`${root}/`, "")),
  uniqueUrls: entries.length,
  totalOccurrences: entries.reduce((total, entry) => total + entry.occurrences, 0),
  summary,
  links: entries.sort((a, b) => a.classification.localeCompare(b.classification) || a.url.localeCompare(b.url)),
};
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: output.replace(`${root}/`, ""), ...summary, uniqueUrls: entries.length, totalOccurrences: report.totalOccurrences }, null, 2));
