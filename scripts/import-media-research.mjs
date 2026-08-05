#!/usr/bin/env node

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = fileURLToPath(new URL("../", import.meta.url));
const databasePath = join(root, "recovery/media-registry.sqlite");
const researchDirectory = join(root, "recovery/research");
const rawDirectory = join(researchDirectory, "raw");
const model = "opencode-go/deepseek-v4-flash";

function extractEventText(value) {
  const textParts = [];
  for (const line of value.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "text" && typeof event.part?.text === "string") {
        textParts.push(event.part.text);
      }
    } catch {
      return value;
    }
  }
  return textParts.length > 0 ? textParts.join("") : value;
}

function extractJsonArray(value) {
  const responseText = extractEventText(value);
  const start = responseText.indexOf("[");
  const end = responseText.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error("JSON array absent");
  return JSON.parse(responseText.slice(start, end + 1));
}

const database = new DatabaseSync(databasePath);
database.exec("PRAGMA foreign_keys = ON");
const issue = database.prepare(
  "SELECT issue_key, search_query FROM review_issues WHERE issue_key = ?"
);
const removePrevious = database.prepare(
  "DELETE FROM research_results WHERE issue_key = ? AND agent = 'deepseek-media-research' AND model = ?"
);
const insert = database.prepare(`
  INSERT INTO research_results (
    issue_key, agent, model, query, candidate_url, evidence_url,
    rationale, confidence, status, raw_response, created_at
  ) VALUES (?, 'deepseek-media-research', ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const files = (await readdir(rawDirectory))
  .filter((file) => /^batch-\d+\.txt$/.test(file))
  .sort();
const imported = [];
const failures = [];
database.exec("BEGIN IMMEDIATE");
try {
  for (const file of files) {
    const raw = await readFile(join(rawDirectory, file), "utf8");
    let results;
    try {
      results = extractJsonArray(raw);
    } catch (error) {
      failures.push({ file, reason: error instanceof Error ? error.message : String(error) });
      continue;
    }
    for (const result of results) {
      const sourceIssue = issue.get(result.issue_key);
      if (!sourceIssue) {
        failures.push({ file, issueKey: result.issue_key, reason: "unknown-issue-key" });
        continue;
      }
      const confidence = Number(result.confidence);
      removePrevious.run(result.issue_key, model);
      insert.run(
        result.issue_key,
        model,
        sourceIssue.search_query,
        result.candidate_url ?? null,
        result.evidence_url ?? null,
        String(result.rationale ?? ""),
        Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
        ["exact", "strong_candidate", "unresolved"].includes(result.status)
          ? `agent_${result.status}`
          : "agent_unresolved",
        JSON.stringify(result),
        new Date().toISOString()
      );
      imported.push({ file, issueKey: result.issue_key, status: result.status });
    }
  }
  database.exec("COMMIT");
} catch (error) {
  database.exec("ROLLBACK");
  throw error;
}

const summary = {
  failures,
  generatedAt: new Date().toISOString(),
  imported: imported.length,
  statuses: imported.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {}),
};
await writeFile(
  join(researchDirectory, "import-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`
);
console.log(JSON.stringify(summary, null, 2));
database.close();
