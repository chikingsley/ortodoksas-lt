import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import readinessMigration from "./0011_translation_readiness_backfill.sql?raw";

describe("translation readiness migration", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE articles (
        body_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        hero_fit TEXT DEFAULT 'cover' NOT NULL,
        hero_focal_x INTEGER DEFAULT 50 NOT NULL,
        hero_focal_y INTEGER DEFAULT 50 NOT NULL,
        hero_media_id TEXT,
        id TEXT PRIMARY KEY,
        labels_json TEXT DEFAULT '[]' NOT NULL,
        language TEXT NOT NULL,
        published_at INTEGER,
        section TEXT DEFAULT '' NOT NULL,
        seo_description TEXT,
        seo_title TEXT,
        slug TEXT NOT NULL,
        source_article_id TEXT,
        source_capture TEXT,
        source_url TEXT,
        status TEXT DEFAULT 'draft' NOT NULL,
        summary TEXT DEFAULT '' NOT NULL,
        title TEXT NOT NULL,
        translation_group_id TEXT NOT NULL,
        translation_kind TEXT DEFAULT 'original' NOT NULL,
        translation_review_status TEXT DEFAULT 'not_required' NOT NULL,
        translation_reviewed_at INTEGER,
        translation_reviewed_by TEXT,
        translation_source_article_id TEXT,
        translation_source_hash TEXT,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE translation_runs (
        character_count INTEGER DEFAULT 0 NOT NULL,
        completed_at INTEGER,
        created_at INTEGER NOT NULL,
        id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        provider TEXT NOT NULL,
        source_article_id TEXT NOT NULL,
        source_hash TEXT NOT NULL,
        source_language TEXT NOT NULL,
        status TEXT DEFAULT 'queued' NOT NULL,
        target_article_id TEXT,
        target_language TEXT NOT NULL
      );
      CREATE TABLE article_baselines (
        article_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT DEFAULT '' NOT NULL,
        body_json TEXT NOT NULL,
        source_hash TEXT NOT NULL,
        converter_version TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE article_revisions (
        id TEXT PRIMARY KEY,
        article_id TEXT NOT NULL,
        editor_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        body_json TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  });

  afterEach(() => database.close());

  it("backfills authoritative targets once and remains idempotent", () => {
    const suffix = crypto.randomUUID();
    const groupId = `readiness-group-${suffix}`;
    const sourceId = `readiness-source-${suffix}`;
    const targetId = `readiness-target-${suffix}`;
    const sourceBody = JSON.stringify({
      content: [
        { content: [{ text: "Šaltinis", type: "text" }], type: "paragraph" },
      ],
      type: "doc",
    });
    const targetBody = JSON.stringify({
      content: [
        { content: [{ text: "Target", type: "text" }], type: "paragraph" },
      ],
      type: "doc",
    });
    const sourceHash = "a".repeat(64);

    database
      .prepare(
        `INSERT INTO articles (
          body_json, created_at, id, language, slug, status, summary, title,
          translation_group_id, translation_kind, translation_review_status,
          updated_at
        ) VALUES (?, 1, ?, 'lt', ?, 'published', 'Source summary', 'Source title',
          ?, 'original', 'not_required', 1)`
      )
      .run(sourceBody, sourceId, `source-${suffix}`, groupId);
    database
      .prepare(
        `INSERT INTO articles (
          body_json, created_at, id, language, slug, status, summary, title,
          translation_group_id, translation_kind, translation_review_status,
          translation_source_article_id, translation_source_hash, updated_at
        ) VALUES (?, 2, ?, 'en', ?, 'published', 'Target summary',
          'Target title', ?, 'machine', 'pending', ?, ?, 2)`
      )
      .run(
        targetBody,
        targetId,
        `target-${suffix}`,
        groupId,
        sourceId,
        sourceHash
      );
    database
      .prepare(
        `INSERT INTO translation_runs (
          character_count, completed_at, created_at, id, model, provider,
          source_article_id, source_hash, source_language, status,
          target_article_id, target_language
        ) VALUES (6, 3, 2, ?, 'test-model', 'test-provider', ?, ?, 'lt',
          'completed', ?, 'en')`
      )
      .run(`readiness-run-${suffix}`, sourceId, sourceHash, targetId);

    const sql = readinessMigration.replaceAll("--> statement-breakpoint", "");
    database.exec(sql);
    database.exec(sql);

    expect(
      database
        .prepare(
          "SELECT body_json, converter_version, source_hash, summary, title FROM article_baselines WHERE article_id = ?"
        )
        .get(targetId)
    ).toEqual({
      body_json: sourceBody,
      converter_version: "translation-v1",
      source_hash: sourceHash,
      summary: "Source summary",
      title: "Source title",
    });

    const revisions = database
      .prepare(
        "SELECT body_json, editor_id, metadata_json, version FROM article_revisions WHERE article_id = ?"
      )
      .all(targetId);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({
      body_json: targetBody,
      editor_id: "system:translation-readiness-v1",
      version: 1,
    });
    expect(
      JSON.parse(String(revisions[0]?.metadata_json ?? "{}"))
    ).toMatchObject({
      snapshotCompleteness: "complete",
      snapshotVersion: 3,
      title: "Target title",
      translationSourceArticleId: sourceId,
      translationSourceHash: sourceHash,
    });
  });
});
