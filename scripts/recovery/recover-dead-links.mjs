import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const manifest = JSON.parse(
  readFileSync(resolve(root, "apps/web/public/media/unavailable-links.json"), "utf8")
);
const output = resolve(root, "recovery/reports/dead-link-recovery.json");
const timeoutMs = 10000;
let cursor = 0;
const results = [];

async function lookup(url) {
  const endpoint = new URL("https://web.archive.org/cdx/search/cdx");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("output", "json");
  endpoint.searchParams.set("fl", "timestamp,original,statuscode");
  endpoint.searchParams.set("filter", "statuscode:200");
  endpoint.searchParams.set("collapse", "digest");
  endpoint.searchParams.set("limit", "1");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      headers: { "user-agent": "ortodoksas.lt-link-recovery/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) return { status: response.status, capture: null };
    const rows = await response.json();
    const row = Array.isArray(rows) && rows.length > 1 ? rows[1] : null;
    return {
      status: response.status,
      capture: row
        ? { timestamp: row[0], original: row[1], statuscode: row[2] }
        : null,
    };
  } catch (error) {
    return { status: null, error: error instanceof Error ? error.name : String(error), capture: null };
  } finally {
    clearTimeout(timer);
  }
}

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= manifest.urls.length) return;
    const url = manifest.urls[index];
    results[index] = { url, result: await lookup(url) };
  }
}

await Promise.all(Array.from({ length: Math.min(8, manifest.urls.length) }, worker));
const report = {
  generatedAt: new Date().toISOString(),
  sourceCount: manifest.urls.length,
  capturesFound: results.filter((entry) => entry.result.capture).length,
  results,
};
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: output.replace(`${root}/`, ""), sourceCount: report.sourceCount, capturesFound: report.capturesFound }, null, 2));
