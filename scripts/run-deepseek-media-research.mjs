#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = fileURLToPath(new URL("../", import.meta.url));
const databasePath = join(root, "recovery/media-registry.sqlite");
const researchDirectory = join(root, "recovery/research");
const batchDirectory = join(researchDirectory, "batches");
const rawDirectory = join(researchDirectory, "raw");
const workspaceDirectory = "/tmp/ortodoksas-media-research";
const opencode = "/home/simon/.bun/bin/opencode";
const model = "opencode-go/deepseek-v4-flash";
const batchSize = 1;
const batchCount = 8;
const concurrency = 1;

const database = new DatabaseSync(databasePath, { readOnly: true });
const selectIssues = database.prepare(`
  SELECT
    ri.issue_key,
    ri.issue_type,
    ri.original_url,
    ri.reason,
    ri.search_query,
    ri.candidates_json,
    a.path,
    a.title,
    a.description,
    a.published,
    a.section,
    a.labels_json,
    a.capture,
    a.source_page
  FROM review_issues ri
  JOIN articles a ON a.path = ri.article_path
  WHERE ri.status = 'pending' AND ri.issue_type = ?
  ORDER BY COALESCE(a.published, '') DESC, a.path
  LIMIT ?
`);
const selectedIssues = [
  ...selectIssues.all("unresolved-hero-url", 32),
  ...selectIssues.all("unresolved-body-media", 16),
  ...selectIssues.all("missing-hero-evidence", 16),
];
database.close();

async function collectSourceEvidence(item) {
  try {
    const response = await fetch(item.source_page, {
      headers: { "user-agent": "Mozilla/5.0 media-provenance-research/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    const html = await response.text();
    const videoIds = [
      ...new Set(
        [...html.matchAll(/(?:youtube\.com\/embed\/|i\.ytimg\.com\/vi\/)([A-Za-z0-9_-]+)/g)].map(
          (match) => match[1]
        )
      ),
    ];
    return {
      fetched_at: new Date().toISOString(),
      http_status: response.status,
      source_url: response.url,
      youtube: videoIds.map((videoId) => ({
        thumbnail_url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        video_id: videoId,
        video_url: `https://www.youtube.com/watch?v=${videoId}`,
      })),
    };
  } catch (error) {
    return {
      fetched_at: new Date().toISOString(),
      source_url: item.source_page,
      error: error instanceof Error ? error.message : String(error),
      youtube: [],
    };
  }
}

const selected = await Promise.all(
  selectedIssues.map(async (item) => ({
    ...item,
    direct_source_evidence: await collectSourceEvidence(item),
  }))
);

await mkdir(batchDirectory, { recursive: true });
await mkdir(rawDirectory, { recursive: true });
await mkdir(workspaceDirectory, { recursive: true });
const batches = Array.from({ length: batchCount }, (_, batchIndex) =>
  selected.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize)
);

function runAgent(batch, batchIndex) {
  const reviewInput = batch.map((item) => ({
    issue_key: item.issue_key,
    article_title: item.title,
    source_page: item.source_page,
    youtube: item.direct_source_evidence.youtube,
  }));
  const prompt = `Classify media provenance. Each supplied article source page directly embeds the listed YouTube ID. Treat that as exact provenance for its listed thumbnail. Return ONLY a JSON array with issue_key, status (exact|unresolved), candidate_url (thumbnail or null), evidence_url (source page or null), rationale, confidence, and searches. INPUT: ${JSON.stringify(reviewInput)}`;
  return new Promise((resolve) => {
    const child = spawn(
      opencode,
      [
        "run",
        "--pure",
        "--auto",
        "--format",
        "json",
        "--model",
        model,
        prompt,
      ],
      { cwd: workspaceDirectory, env: process.env }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const timeout = setTimeout(() => child.kill("SIGTERM"), 30_000);
    child.on("close", (exitCode, signal) => {
      clearTimeout(timeout);
      resolve({ batch: batchIndex + 1, exitCode, signal, stderr, stdout });
    });
  });
}

const jobs = [];
for (const [index, batch] of batches.entries()) {
  const batchFile = join(batchDirectory, `batch-${String(index + 1).padStart(2, "0")}.json`);
  await writeFile(batchFile, `${JSON.stringify(batch, null, 2)}\n`);
  jobs.push({ batch, index });
}
const results = new Array(jobs.length);
let cursor = 0;
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (cursor < jobs.length) {
      const jobIndex = cursor;
      cursor += 1;
      const job = jobs[jobIndex];
      results[jobIndex] = await runAgent(job.batch, job.index);
      const stem = `batch-${String(job.index + 1).padStart(2, "0")}`;
      await writeFile(join(rawDirectory, `${stem}.txt`), results[jobIndex].stdout);
      await writeFile(join(rawDirectory, `${stem}.stderr.txt`), results[jobIndex].stderr);
      console.log(
        `completed batch-${String(job.index + 1).padStart(2, "0")}: exit=${results[jobIndex].exitCode}`
      );
    }
  })
);
for (const result of results) {
  const stem = `batch-${String(result.batch).padStart(2, "0")}`;
  await writeFile(join(rawDirectory, `${stem}.txt`), result.stdout);
  await writeFile(join(rawDirectory, `${stem}.stderr.txt`), result.stderr);
  console.log(
    `${stem}: exit=${result.exitCode} signal=${result.signal ?? "none"} bytes=${Buffer.byteLength(result.stdout)}`
  );
}
await writeFile(
  join(researchDirectory, "run-summary.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), model, results: results.map(({ stdout, stderr, ...result }) => ({ ...result, stderrBytes: Buffer.byteLength(stderr), stdoutBytes: Buffer.byteLength(stdout) })) }, null, 2)}\n`
);
