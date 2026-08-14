import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import readinessMigration from "../../../packages/db/migrations/0011_translation_readiness_backfill.sql?raw";

describe("translation readiness migration", () => {
  it("backfills authoritative targets once and remains idempotent", async () => {
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

    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO publication_groups (created_at, id, kind, page_template, updated_at) VALUES (1, ?, 'article', 'standard', 1)"
      ).bind(groupId),
      env.DB.prepare(
        `INSERT INTO articles (
          body_json, created_at, id, language, slug, status, summary, title,
          translation_group_id, translation_kind, translation_review_status,
          updated_at
        ) VALUES (?, 1, ?, 'lt', ?, 'published', 'Source summary',
          'Source title', ?, 'original', 'not_required', 1)`
      ).bind(sourceBody, sourceId, `source-${suffix}`, groupId),
      env.DB.prepare(
        `INSERT INTO articles (
          body_json, created_at, id, language, slug, status, summary, title,
          translation_group_id, translation_kind, translation_review_status,
          translation_source_article_id, translation_source_hash, updated_at
        ) VALUES (?, 2, ?, 'en', ?, 'published', 'Target summary',
          'Target title', ?, 'machine', 'pending', ?, ?, 2)`
      ).bind(
        targetBody,
        targetId,
        `target-${suffix}`,
        groupId,
        sourceId,
        sourceHash
      ),
      env.DB.prepare(
        `INSERT INTO translation_runs (
          character_count, completed_at, created_at, id, model, provider,
          source_article_id, source_hash, source_language, status,
          target_article_id, target_language
        ) VALUES (6, 3, 2, ?, 'test-model', 'test-provider', ?, ?, 'lt',
          'completed', ?, 'en')`
      ).bind(`readiness-run-${suffix}`, sourceId, sourceHash, targetId),
    ]);

    const statements = readinessMigration
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);
    await env.DB.batch(
      statements.map((statement) => env.DB.prepare(statement))
    );
    await env.DB.batch(
      statements.map((statement) => env.DB.prepare(statement))
    );

    const baseline = await env.DB.prepare(
      "SELECT body_json, converter_version, source_hash, summary, title FROM article_baselines WHERE article_id = ?"
    )
      .bind(targetId)
      .first<{
        body_json: string;
        converter_version: string;
        source_hash: string;
        summary: string;
        title: string;
      }>();
    expect(baseline).toEqual({
      body_json: sourceBody,
      converter_version: "translation-v1",
      source_hash: sourceHash,
      summary: "Source summary",
      title: "Source title",
    });

    const revisions = await env.DB.prepare(
      "SELECT body_json, editor_id, metadata_json, version FROM article_revisions WHERE article_id = ?"
    )
      .bind(targetId)
      .all<{
        body_json: string;
        editor_id: string;
        metadata_json: string;
        version: number;
      }>();
    expect(revisions.results).toHaveLength(1);
    expect(revisions.results[0]).toMatchObject({
      body_json: targetBody,
      editor_id: "system:translation-readiness-v1",
      version: 1,
    });
    expect(
      JSON.parse(revisions.results[0]?.metadata_json ?? "{}")
    ).toMatchObject({
      snapshotCompleteness: "complete",
      snapshotVersion: 3,
      title: "Target title",
      translationSourceArticleId: sourceId,
      translationSourceHash: sourceHash,
    });
  });
});
