#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = fileURLToPath(new URL("../", import.meta.url));
const databasePath = join(root, "recovery/media-registry.sqlite");

async function readJson(path) {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

function issueKey(issue) {
  return createHash("sha256")
    .update(`${issue.issue}\u0000${issue.path}\u0000${issue.originalUrl ?? ""}`)
    .digest("hex");
}

const [catalog, manifest, assignments, ingestion, metadata, reviewQueue] =
  await Promise.all([
    readJson("public/content/catalog.json"),
    readJson("public/media/manifest.json"),
    readJson("public/media/assignments.json"),
    readJson("recovery/reports/media-ingestion.json"),
    readJson("recovery/reports/media-metadata-recovery.json"),
    readJson("recovery/reports/media-review-queue.json"),
  ]);

const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS articles (
    path TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    published TEXT,
    section TEXT NOT NULL,
    labels_json TEXT NOT NULL,
    hero_original TEXT,
    capture TEXT,
    source_page TEXT,
    content_file TEXT
  );

  CREATE TABLE IF NOT EXISTS assets (
    sha256 TEXT PRIMARY KEY,
    media_path TEXT NOT NULL UNIQUE,
    acquired_from TEXT NOT NULL,
    format TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    bytes INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS asset_aliases (
    alias TEXT PRIMARY KEY,
    sha256 TEXT NOT NULL REFERENCES assets(sha256)
  );

  CREATE TABLE IF NOT EXISTS article_assignments (
    article_path TEXT PRIMARY KEY REFERENCES articles(path),
    sha256 TEXT NOT NULL REFERENCES assets(sha256),
    evidence TEXT NOT NULL,
    confidence REAL NOT NULL,
    source_url TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'auto_verified'
  );

  CREATE TABLE IF NOT EXISTS recovery_attempts (
    id INTEGER PRIMARY KEY,
    article_path TEXT REFERENCES articles(path),
    source_url TEXT,
    method TEXT NOT NULL,
    outcome TEXT NOT NULL,
    reason TEXT,
    candidates_json TEXT NOT NULL DEFAULT '[]',
    attempted_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS review_issues (
    issue_key TEXT PRIMARY KEY,
    article_path TEXT NOT NULL REFERENCES articles(path),
    issue_type TEXT NOT NULL,
    original_url TEXT,
    reason TEXT NOT NULL,
    search_query TEXT NOT NULL,
    candidates_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS research_results (
    id INTEGER PRIMARY KEY,
    issue_key TEXT NOT NULL REFERENCES review_issues(issue_key),
    agent TEXT NOT NULL,
    model TEXT NOT NULL,
    query TEXT NOT NULL,
    candidate_url TEXT,
    evidence_url TEXT,
    rationale TEXT NOT NULL,
    confidence REAL,
    status TEXT NOT NULL DEFAULT 'proposed',
    raw_response TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS review_issues_status_idx
    ON review_issues(status, issue_type);
  CREATE INDEX IF NOT EXISTS research_results_issue_idx
    ON research_results(issue_key, status);
`);

const upsertArticle = database.prepare(`
  INSERT INTO articles (
    path, kind, title, description, published, section, labels_json,
    hero_original, capture, source_page, content_file
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(path) DO UPDATE SET
    kind = excluded.kind,
    title = excluded.title,
    description = excluded.description,
    published = excluded.published,
    section = excluded.section,
    labels_json = excluded.labels_json,
    hero_original = excluded.hero_original,
    capture = excluded.capture,
    source_page = excluded.source_page,
    content_file = excluded.content_file
`);
const upsertAsset = database.prepare(`
  INSERT INTO assets (sha256, media_path, acquired_from, format, width, height, bytes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(sha256) DO UPDATE SET
    media_path = excluded.media_path,
    acquired_from = excluded.acquired_from,
    format = excluded.format,
    width = excluded.width,
    height = excluded.height,
    bytes = excluded.bytes
`);
const insertAlias = database.prepare(
  "INSERT OR REPLACE INTO asset_aliases (alias, sha256) VALUES (?, ?)"
);
const insertAssignment = database.prepare(`
  INSERT INTO article_assignments (
    article_path, sha256, evidence, confidence, source_url, review_status
  ) VALUES (?, ?, ?, ?, ?, 'auto_verified')
`);
const insertAttempt = database.prepare(`
  INSERT INTO recovery_attempts (
    article_path, source_url, method, outcome, reason, candidates_json, attempted_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const insertIssue = database.prepare(`
  INSERT INTO review_issues (
    issue_key, article_path, issue_type, original_url, reason,
    search_query, candidates_json, status, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  ON CONFLICT(issue_key) DO UPDATE SET
    article_path = excluded.article_path,
    issue_type = excluded.issue_type,
    original_url = excluded.original_url,
    reason = excluded.reason,
    search_query = excluded.search_query,
    candidates_json = excluded.candidates_json,
    status = 'pending',
    created_at = excluded.created_at
`);

database.exec("BEGIN IMMEDIATE");
try {
  for (const entry of catalog) {
    upsertArticle.run(
      entry.path,
      entry.kind,
      entry.title,
      entry.description ?? "",
      entry.published,
      entry.section,
      JSON.stringify(entry.labels ?? []),
      entry.hero,
      entry.capture,
      entry.source,
      entry.file
    );
  }

  for (const entry of manifest.media) {
    upsertAsset.run(
      entry.sha256,
      entry.path,
      entry.acquiredFrom,
      entry.format,
      entry.width,
      entry.height,
      entry.bytes
    );
  }

  database.exec("DELETE FROM asset_aliases");
  for (const entry of manifest.media) {
    for (const alias of entry.aliases) insertAlias.run(alias, entry.sha256);
  }

  database.exec("DELETE FROM article_assignments");
  const assetByPath = new Map(
    manifest.media.map((entry) => [entry.path, entry.sha256])
  );
  for (const assignment of assignments.assignments) {
    insertAssignment.run(
      assignment.path,
      assetByPath.get(assignment.mediaPath),
      assignment.evidence,
      assignment.confidence,
      assignment.source
    );
  }

  database.exec("DELETE FROM recovery_attempts");
  for (const item of ingestion.unresolved) {
    insertAttempt.run(
      null,
      item.source,
      "direct-url-and-exact-wayback",
      "failed",
      item.error,
      "[]",
      ingestion.generatedAt
    );
  }
  for (const item of metadata.unresolved) {
    insertAttempt.run(
      item.path,
      null,
      "archived-page-metadata",
      "failed",
      item.reason,
      JSON.stringify(item.candidates ?? []),
      metadata.generatedAt
    );
  }

  database.exec(`
    DELETE FROM review_issues
    WHERE issue_key NOT IN (SELECT issue_key FROM research_results);
    UPDATE review_issues SET status = 'resolved';
  `);
  for (const issue of reviewQueue.issues) {
    insertIssue.run(
      issueKey(issue),
      issue.path,
      issue.issue,
      issue.originalUrl,
      issue.reason,
      issue.searchQuery,
      JSON.stringify(issue.candidates ?? []),
      reviewQueue.generatedAt
    );
  }
  database.exec("COMMIT");
} catch (error) {
  database.exec("ROLLBACK");
  throw error;
}

const counts = database
  .prepare(`
    SELECT
      (SELECT COUNT(*) FROM articles) AS articles,
      (SELECT COUNT(*) FROM assets) AS assets,
      (SELECT COUNT(*) FROM asset_aliases) AS aliases,
      (SELECT COUNT(*) FROM article_assignments) AS assignments,
      (SELECT COUNT(*) FROM recovery_attempts) AS attempts,
      (SELECT COUNT(*) FROM review_issues) AS issues,
      (SELECT COUNT(*) FROM research_results) AS research_results
  `)
  .get();
console.log(JSON.stringify({ databasePath, ...counts }, null, 2));
database.close();
