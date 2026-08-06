#!/usr/bin/env node

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = fileURLToPath(new URL("../", import.meta.url));
const database = new DatabaseSync(join(root, "recovery/media-registry.sqlite"));
const batchDirectory = join(root, "recovery/research/batches");
const files = (await readdir(batchDirectory)).filter((name) => /^batch-\d+\.json$/.test(name)).sort();
const remove = database.prepare(
  "DELETE FROM research_results WHERE issue_key = ? AND agent = 'source-page-media-extractor'"
);
const insert = database.prepare(`
  INSERT INTO research_results (
    issue_key, agent, model, query, candidate_url, evidence_url,
    rationale, confidence, status, raw_response, created_at
  ) VALUES (?, 'source-page-media-extractor', 'deterministic-html-v1', ?, ?, ?, ?, 1, 'source_exact', ?, ?)
`);
const imported = [];

database.exec("BEGIN IMMEDIATE");
try {
  for (const file of files) {
    const items = JSON.parse(await readFile(join(batchDirectory, file), "utf8"));
    for (const item of items) {
      for (const video of item.direct_source_evidence?.youtube ?? []) {
        remove.run(item.issue_key);
        const evidence = {
          fetched_at: item.direct_source_evidence.fetched_at,
          http_status: item.direct_source_evidence.http_status,
          source_url: item.direct_source_evidence.source_url,
          video_id: video.video_id,
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url,
        };
        insert.run(
          item.issue_key,
          item.search_query,
          video.thumbnail_url,
          item.source_page,
          `The article source page directly embeds YouTube video ${video.video_id}.`,
          JSON.stringify(evidence),
          new Date().toISOString()
        );
        imported.push({ issue_key: item.issue_key, ...evidence });
        break;
      }
    }
  }
  database.exec("COMMIT");
} catch (error) {
  database.exec("ROLLBACK");
  throw error;
}

const report = { generated_at: new Date().toISOString(), imported };
await writeFile(
  join(root, "recovery/research/source-evidence-summary.json"),
  `${JSON.stringify(report, null, 2)}\n`
);
console.log(JSON.stringify({ imported: imported.length }, null, 2));
database.close();
