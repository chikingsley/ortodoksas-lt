import {
  createArticleSchema,
  type TiptapDocument,
  updateArticleSchema,
} from "@ortodoksas-lt/content/article";
import { articleRevisions, articles } from "@ortodoksas-lt/db";
import {
  annotateArticleBody,
  type ContentChange,
  getChangeKind,
} from "@ortodoksas-lt/editor/provenance";
import { getArticleQualityIssues } from "@ortodoksas-lt/editor/quality";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDatabase } from "../db";
import type { StudioEnvironment } from "../types";

export const articleRoutes = new Hono<StudioEnvironment>();

const WAYBACK_URL_PATTERN =
  /^https:\/\/web\.archive\.org\/web\/\d+[a-z_]*\/(https?:\/\/)/u;

const toHex = (value: ArrayBuffer): string =>
  [...new Uint8Array(value)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const hashText = async (value: string): Promise<string> =>
  toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));

const textChangeProvenance = (
  beforeValue: string,
  afterValue: string
): "manual" | "normalized" =>
  beforeValue.trim() === afterValue ? "normalized" : "manual";

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
      const candidates = [
        source,
        source.replace(WAYBACK_URL_PATTERN, "$1"),
      ].filter((value, index, values) => values.indexOf(value) === index);
      const media = await database
        .prepare(
          `SELECT media_assets.id FROM media_aliases
          JOIN media_assets ON media_assets.id = media_aliases.media_id
          WHERE media_aliases.alias IN (${candidates.map(() => "?").join(", ")})
          LIMIT 1`
        )
        .bind(...candidates)
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
  const database = getDatabase(context.env.DB);
  const result = await database
    .select({
      capture: articles.sourceCapture,
      description: articles.summary,
      file: articles.sourceArticleId,
      heroMediaId: articles.heroMediaId,
      id: articles.id,
      kind: articles.kind,
      labelsJson: articles.labelsJson,
      language: articles.language,
      path: articles.slug,
      publishedAt: articles.publishedAt,
      section: articles.section,
      slug: articles.slug,
      source: articles.sourceUrl,
      status: articles.status,
      title: articles.title,
      translationKind: articles.translationKind,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .orderBy(desc(articles.updatedAt));

  return context.json({ articles: result });
});

articleRoutes.get("/source", async (context) => {
  const sourceKey = context.req.query("key")?.trim();
  if (!sourceKey) {
    return context.json({ error: "Source key is required" }, 400);
  }

  const database = getDatabase(context.env.DB);
  const article = await database.query.articles.findFirst({
    where: eq(articles.sourceArticleId, sourceKey),
  });

  if (!article) {
    return context.json({ article: null });
  }

  return context.json({ article });
});

articleRoutes.get("/media-links/pending", async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT DISTINCT articles.id
    FROM articles, json_tree(articles.body_json) AS node
    WHERE node.type = 'object'
      AND json_extract(node.value, '$.type') = 'figure'
      AND COALESCE(json_extract(node.value, '$.attrs.mediaId'), '') = ''
    ORDER BY articles.id`
  ).all<{ id: string }>();
  return context.json({ articleIds: result.results.map((row) => row.id) });
});

articleRoutes.post("/:id/media-links", async (context) => {
  const id = context.req.param("id");
  const article = await context.env.DB.prepare(
    "SELECT body_json FROM articles WHERE id = ? LIMIT 1"
  )
    .bind(id)
    .first<{ body_json: string }>();
  if (!article) {
    return context.json({ error: "Article unavailable" }, 404);
  }
  const current = JSON.parse(article.body_json) as TiptapDocument;
  const linked = await attachMediaRecords(context.env.DB, current);
  const bodyJson = JSON.stringify(linked);
  if (bodyJson === article.body_json) {
    return context.json({ changed: false, id });
  }
  await context.env.DB.batch([
    context.env.DB.prepare(
      "UPDATE articles SET body_json = ?, updated_at = ? WHERE id = ?"
    ).bind(bodyJson, Date.now(), id),
    context.env.DB.prepare(
      `UPDATE article_revisions SET body_json = ?
      WHERE article_id = ? AND version = 1 AND body_json = ?`
    ).bind(bodyJson, id, article.body_json),
  ]);
  return context.json({ changed: true, id });
});

articleRoutes.get("/:id", async (context) => {
  const database = getDatabase(context.env.DB);
  const article = await database.query.articles.findFirst({
    where: eq(articles.id, context.req.param("id")),
  });

  if (!article) {
    return context.json({ error: "Article unavailable" }, 404);
  }

  return context.json({ article });
});

articleRoutes.get("/:id/revisions", async (context) => {
  const database = getDatabase(context.env.DB);
  const result = await database
    .select({
      created_at: articleRevisions.createdAt,
      editor_id: articleRevisions.editorId,
      id: articleRevisions.id,
      metadata_json: articleRevisions.metadataJson,
      version: articleRevisions.version,
    })
    .from(articleRevisions)
    .where(eq(articleRevisions.articleId, context.req.param("id")))
    .orderBy(desc(articleRevisions.version));

  return context.json({ revisions: result });
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
      provenance: textChangeProvenance(baseline.title, metadata.title),
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
      provenance: textChangeProvenance(baseline.summary, metadata.summary),
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
    article: { ...metadata, bodyJson: restoredBodyJson, id },
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
      provenance: textChangeProvenance(baseline.title, parsed.data.title),
    });
  }
  if (baseline.summary !== parsed.data.summary) {
    changes.push({
      afterValue: parsed.data.summary || null,
      beforeValue: baseline.summary || null,
      changeKind: getChangeKind(baseline.summary, parsed.data.summary),
      fieldPath: "summary",
      provenance: textChangeProvenance(baseline.summary, parsed.data.summary),
    });
  }

  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO articles (
      id, translation_group_id, source_article_id, language, slug, title,
      summary, body_json, hero_media_id, status, translation_kind, published_at,
      kind, labels_json, section, source_capture, source_html, source_url,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      parsed.data.status,
      parsed.data.translationKind,
      parsed.data.publishedAt ?? null,
      parsed.data.kind,
      JSON.stringify(parsed.data.labels),
      parsed.data.section,
      parsed.data.sourceCapture ?? null,
      parsed.data.sourceHtml ?? null,
      parsed.data.sourceUrl ?? null,
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
        status: parsed.data.status,
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

  return context.json(
    { heroMediaId, id, status: parsed.data.status, version: 1 },
    201
  );
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
      provenance: textChangeProvenance(
        existing.baseline_title,
        parsed.data.title
      ),
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
      provenance: textChangeProvenance(
        existing.baseline_summary,
        parsed.data.summary
      ),
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
        published_at = ?, kind = ?, labels_json = ?, section = ?, updated_at = ?
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
      parsed.data.publishedAt ?? null,
      parsed.data.kind,
      JSON.stringify(parsed.data.labels),
      parsed.data.section,
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
