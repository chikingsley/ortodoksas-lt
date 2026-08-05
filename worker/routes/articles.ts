import { Hono } from "hono";

import {
  createArticleSchema,
  type TiptapDocument,
  updateArticleSchema,
} from "../../shared/content/article";
import {
  annotateArticleBody,
  type ContentChange,
  getChangeKind,
} from "../../shared/editor/provenance";
import { getArticleQualityIssues } from "../../shared/editor/quality";
import type { StudioEnvironment } from "../types";

export const articleRoutes = new Hono<StudioEnvironment>();

const toHex = (value: ArrayBuffer): string =>
  [...new Uint8Array(value)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const hashText = async (value: string): Promise<string> =>
  toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));

const attachMediaRecords = async (
  database: D1Database,
  body: TiptapDocument
): Promise<TiptapDocument> => {
  const content = await Promise.all(
    (body.content ?? []).map(async (node) => {
      const source = node.attrs?.src;
      if (
        node.type !== "figure" ||
        typeof source !== "string" ||
        node.attrs?.mediaId
      ) {
        return node;
      }
      const media = await database
        .prepare(
          `SELECT media_assets.id FROM media_aliases
          JOIN media_assets ON media_assets.id = media_aliases.media_id
          WHERE media_aliases.alias = ? LIMIT 1`
        )
        .bind(source)
        .first<{ id: string }>();
      if (!media) {
        return node;
      }
      return {
        ...node,
        attrs: {
          ...node.attrs,
          mediaId: media.id,
          src: `/api/media/${media.id}`,
        },
      };
    })
  );
  return { ...body, content };
};

const findMediaId = async (
  database: D1Database,
  source: string | undefined
): Promise<string | null> => {
  if (!source) {
    return null;
  }
  const media = await database
    .prepare("SELECT media_id FROM media_aliases WHERE alias = ? LIMIT 1")
    .bind(source)
    .first<{ media_id: string }>();
  return media?.media_id ?? null;
};

const changeStatements = (
  database: D1Database,
  articleId: string,
  changes: ContentChange[],
  timestamp: number
): D1PreparedStatement[] =>
  changes.map((change) =>
    database
      .prepare(
        `INSERT INTO article_content_changes (
          id, article_id, field_path, change_kind, provenance, before_value,
          after_value, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        articleId,
        change.fieldPath,
        change.changeKind,
        change.provenance,
        change.beforeValue,
        change.afterValue,
        timestamp
      )
  );

articleRoutes.get("/", async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT id, slug, language, title, summary, status, translation_kind,
      published_at, updated_at
    FROM articles
    ORDER BY updated_at DESC`
  ).all();

  return context.json({ articles: result.results });
});

articleRoutes.get("/source", async (context) => {
  const sourceKey = context.req.query("key")?.trim();
  if (!sourceKey) {
    return context.json({ error: "Source key is required" }, 400);
  }

  const article = await context.env.DB.prepare(
    "SELECT * FROM articles WHERE source_article_id = ? LIMIT 1"
  )
    .bind(sourceKey)
    .first();

  if (article === null) {
    return context.json({ article: null });
  }

  return context.json({ article });
});

articleRoutes.get("/:id", async (context) => {
  const article = await context.env.DB.prepare(
    "SELECT * FROM articles WHERE id = ? LIMIT 1"
  )
    .bind(context.req.param("id"))
    .first();

  if (article === null) {
    return context.json({ error: "Article unavailable" }, 404);
  }

  return context.json({ article });
});

articleRoutes.get("/:id/revisions", async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT id, version, metadata_json, editor_id, created_at
    FROM article_revisions WHERE article_id = ? ORDER BY version DESC`
  )
    .bind(context.req.param("id"))
    .all();

  return context.json({ revisions: result.results });
});

articleRoutes.get("/:id/baseline", async (context) => {
  const articleId = context.req.param("id");
  const [baseline, changes] = await Promise.all([
    context.env.DB.prepare(
      `SELECT title, summary, body_json, source_hash, converter_version, created_at
      FROM article_baselines WHERE article_id = ? LIMIT 1`
    )
      .bind(articleId)
      .first(),
    context.env.DB.prepare(
      `SELECT field_path, change_kind, provenance, before_value, after_value,
        created_at FROM article_content_changes
      WHERE article_id = ? ORDER BY field_path`
    )
      .bind(articleId)
      .all(),
  ]);
  if (!baseline) {
    return context.json({ error: "Conversion baseline unavailable" }, 404);
  }
  return context.json({ baseline, changes: changes.results });
});

articleRoutes.post("/:id/revisions/:version/restore", async (context) => {
  const id = context.req.param("id");
  const version = Number.parseInt(context.req.param("version"), 10);
  const revision = await context.env.DB.prepare(
    `SELECT body_json, metadata_json FROM article_revisions
    WHERE article_id = ? AND version = ? LIMIT 1`
  )
    .bind(id, version)
    .first<{ body_json: string; metadata_json: string }>();
  if (revision === null) {
    return context.json({ error: "Revision unavailable" }, 404);
  }

  const latest = await context.env.DB.prepare(
    "SELECT MAX(version) AS version FROM article_revisions WHERE article_id = ?"
  )
    .bind(id)
    .first<{ version: number | null }>();
  const nextVersion = (latest?.version ?? 0) + 1;
  const metadata = JSON.parse(revision.metadata_json) as {
    language: string;
    slug: string;
    status: string;
    summary: string;
    title: string;
  };
  const timestamp = Date.now();
  const baseline = await context.env.DB.prepare(
    `SELECT title, summary, body_json FROM article_baselines
    WHERE article_id = ? LIMIT 1`
  )
    .bind(id)
    .first<{ body_json: string; summary: string; title: string }>();
  const restoredDocument = JSON.parse(revision.body_json) as TiptapDocument;
  const annotated = baseline
    ? annotateArticleBody(
        restoredDocument,
        JSON.parse(baseline.body_json) as TiptapDocument
      )
    : { body: restoredDocument, changes: [] };
  const changes = [...annotated.changes];
  if (baseline?.title !== undefined && baseline.title !== metadata.title) {
    changes.push({
      afterValue: metadata.title,
      beforeValue: baseline.title,
      changeKind: getChangeKind(baseline.title, metadata.title),
      fieldPath: "title",
      provenance: "manual",
    });
  }
  if (
    baseline?.summary !== undefined &&
    baseline.summary !== metadata.summary
  ) {
    changes.push({
      afterValue: metadata.summary || null,
      beforeValue: baseline.summary || null,
      changeKind: getChangeKind(baseline.summary, metadata.summary),
      fieldPath: "summary",
      provenance: "manual",
    });
  }
  const restoredBodyJson = JSON.stringify(annotated.body);
  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE articles SET language = ?, slug = ?, title = ?, summary = ?,
       body_json = ?, status = ?, updated_at = ? WHERE id = ?`
    ).bind(
      metadata.language,
      metadata.slug,
      metadata.title,
      metadata.summary,
      restoredBodyJson,
      metadata.status,
      timestamp,
      id
    ),
    context.env.DB.prepare(
      `INSERT INTO article_revisions
       (id, article_id, version, body_json, metadata_json, editor_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      id,
      nextVersion,
      restoredBodyJson,
      revision.metadata_json,
      context.var.editor.id,
      timestamp
    ),
    context.env.DB.prepare(
      "DELETE FROM article_content_changes WHERE article_id = ?"
    ).bind(id),
    ...changeStatements(context.env.DB, id, changes, timestamp),
  ]);

  return context.json({
    article: { ...metadata, body_json: restoredBodyJson, id },
    restoredFrom: version,
    version: nextVersion,
  });
});

articleRoutes.post("/", async (context) => {
  const payload: unknown = await context.req.json();
  const parsed = createArticleSchema.safeParse(payload);

  if (!parsed.success) {
    return context.json(
      {
        error: "Article validation failed",
        issues: parsed.error.issues,
      },
      422
    );
  }

  const id = crypto.randomUUID();
  const translationGroupId =
    parsed.data.translationGroupId ?? crypto.randomUUID();
  const timestamp = Date.now();
  const baseline = parsed.data.baseline ?? {
    body: parsed.data.body,
    converterVersion: "native-v1",
    summary: parsed.data.summary,
    title: parsed.data.title,
  };
  const annotated = annotateArticleBody(parsed.data.body, baseline.body);
  const body = await attachMediaRecords(context.env.DB, annotated.body);
  const bodyJson = JSON.stringify(body);
  const heroMediaId = await findMediaId(
    context.env.DB,
    parsed.data.heroSourceUrl
  );
  const baselineBodyJson = JSON.stringify(baseline.body);
  const changes = [...annotated.changes];
  if (baseline.title !== parsed.data.title) {
    changes.push({
      afterValue: parsed.data.title,
      beforeValue: baseline.title,
      changeKind: "changed",
      fieldPath: "title",
      provenance: "manual",
    });
  }
  if (baseline.summary !== parsed.data.summary) {
    changes.push({
      afterValue: parsed.data.summary || null,
      beforeValue: baseline.summary || null,
      changeKind: getChangeKind(baseline.summary, parsed.data.summary),
      fieldPath: "summary",
      provenance: "manual",
    });
  }

  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO articles (
      id, translation_group_id, source_article_id, language, slug, title,
      summary, body_json, hero_media_id, status, translation_kind, created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`
    ).bind(
      id,
      translationGroupId,
      parsed.data.sourceArticleId ?? null,
      parsed.data.language,
      parsed.data.slug,
      parsed.data.title,
      parsed.data.summary,
      bodyJson,
      heroMediaId,
      parsed.data.translationKind,
      timestamp,
      timestamp
    ),
    context.env.DB.prepare(
      `INSERT INTO article_revisions (
      id, article_id, version, body_json, metadata_json, editor_id, created_at
    ) VALUES (?, ?, 1, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      id,
      bodyJson,
      JSON.stringify({
        language: parsed.data.language,
        slug: parsed.data.slug,
        status: "draft",
        summary: parsed.data.summary,
        title: parsed.data.title,
      }),
      context.var.editor.id,
      timestamp
    ),
    context.env.DB.prepare(
      `INSERT INTO article_baselines (
        article_id, title, summary, body_json, source_hash, converter_version,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      baseline.title,
      baseline.summary,
      baselineBodyJson,
      await hashText(
        JSON.stringify({
          body: baseline.body,
          summary: baseline.summary,
          title: baseline.title,
        })
      ),
      baseline.converterVersion,
      timestamp
    ),
    ...changeStatements(context.env.DB, id, changes, timestamp),
  ]);

  return context.json({ heroMediaId, id, status: "draft", version: 1 }, 201);
});

articleRoutes.put("/:id", async (context) => {
  const payload: unknown = await context.req.json();
  const parsed = updateArticleSchema.safeParse(payload);

  if (!parsed.success) {
    return context.json(
      { error: "Article validation failed", issues: parsed.error.issues },
      422
    );
  }

  const id = context.req.param("id");
  if (parsed.data.status === "published") {
    const qualityIssues = getArticleQualityIssues({
      body: parsed.data.body,
      summary: parsed.data.summary,
      title: parsed.data.title,
    });
    if (qualityIssues.length > 0) {
      return context.json(
        { error: "Article quality checks failed", issues: qualityIssues },
        422
      );
    }
  }
  const existing = await context.env.DB.prepare(
    `SELECT articles.id, articles.hero_media_id,
      article_baselines.body_json AS baseline_body_json,
      article_baselines.title AS baseline_title,
      article_baselines.summary AS baseline_summary
    FROM articles LEFT JOIN article_baselines
      ON article_baselines.article_id = articles.id
    WHERE articles.id = ? LIMIT 1`
  )
    .bind(id)
    .first<{
      baseline_body_json: string | null;
      baseline_summary: string | null;
      baseline_title: string | null;
      hero_media_id: string | null;
      id: string;
    }>();
  if (existing === null) {
    return context.json({ error: "Article unavailable" }, 404);
  }

  const latestRevision = await context.env.DB.prepare(
    "SELECT MAX(version) AS version FROM article_revisions WHERE article_id = ?"
  )
    .bind(id)
    .first<{ version: number | null }>();
  const version = (latestRevision?.version ?? 0) + 1;
  const timestamp = Date.now();
  const baselineBody = existing.baseline_body_json
    ? (JSON.parse(existing.baseline_body_json) as TiptapDocument)
    : parsed.data.body;
  const annotated = annotateArticleBody(parsed.data.body, baselineBody);
  const body = await attachMediaRecords(context.env.DB, annotated.body);
  const bodyJson = JSON.stringify(body);
  const heroMediaId =
    (await findMediaId(context.env.DB, parsed.data.heroSourceUrl)) ??
    existing.hero_media_id;
  const changes = [...annotated.changes];
  if (
    existing.baseline_title !== null &&
    existing.baseline_title !== parsed.data.title
  ) {
    changes.push({
      afterValue: parsed.data.title,
      beforeValue: existing.baseline_title,
      changeKind: "changed",
      fieldPath: "title",
      provenance: "manual",
    });
  }
  if (
    existing.baseline_summary !== null &&
    existing.baseline_summary !== parsed.data.summary
  ) {
    changes.push({
      afterValue: parsed.data.summary || null,
      beforeValue: existing.baseline_summary || null,
      changeKind: getChangeKind(existing.baseline_summary, parsed.data.summary),
      fieldPath: "summary",
      provenance: "manual",
    });
  }
  const metadataJson = JSON.stringify({
    language: parsed.data.language,
    slug: parsed.data.slug,
    status: parsed.data.status,
    summary: parsed.data.summary,
    title: parsed.data.title,
  });

  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE articles SET language = ?, slug = ?, title = ?, summary = ?,
        body_json = ?, hero_media_id = ?, status = ?, translation_kind = ?,
        updated_at = ?
      WHERE id = ?`
    ).bind(
      parsed.data.language,
      parsed.data.slug,
      parsed.data.title,
      parsed.data.summary,
      bodyJson,
      heroMediaId,
      parsed.data.status,
      parsed.data.translationKind,
      timestamp,
      id
    ),
    context.env.DB.prepare(
      `INSERT INTO article_revisions (
        id, article_id, version, body_json, metadata_json, editor_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      id,
      version,
      bodyJson,
      metadataJson,
      context.var.editor.id,
      timestamp
    ),
    context.env.DB.prepare(
      "DELETE FROM article_content_changes WHERE article_id = ?"
    ).bind(id),
    ...changeStatements(context.env.DB, id, changes, timestamp),
  ]);

  return context.json({ heroMediaId, id, status: parsed.data.status, version });
});
