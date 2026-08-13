import {
  createArticleSchema,
  type TiptapDocument,
  type UpdateArticleInput,
  updateArticleSchema,
} from "@ortodoksas-lt/content/article";
import {
  articleBaselines,
  articleContentChanges,
  articleRevisions,
  articles,
  mediaAliases,
  mediaAssets,
} from "@ortodoksas-lt/db";
import {
  annotateArticleBody,
  type ContentChange,
  getChangeKind,
} from "@ortodoksas-lt/editor/provenance";
import { getArticleQualityIssues } from "@ortodoksas-lt/editor/quality";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { getDatabase, type StudioDatabase } from "../db";
import type { StudioEnvironment } from "../types";

export const articleRoutes = new Hono<StudioEnvironment>();

const WAYBACK_URL_PATTERN =
  /^https:\/\/web\.archive\.org\/web\/\d+[a-z_]*\/(https?:\/\/)/u;
const CONTENT_CHANGE_INSERT_SIZE = 10;

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

const translationMetadataUpdate = (data: UpdateArticleInput) => {
  const update: {
    translationReviewStatus?: UpdateArticleInput["translationReviewStatus"];
    translationReviewedAt?: number | null;
    translationReviewedBy?: string;
    translationSourceArticleId?: string;
    translationSourceHash?: string;
  } = {};
  if (data.translationReviewStatus !== undefined) {
    update.translationReviewStatus = data.translationReviewStatus;
  }
  if (data.translationReviewedAt !== undefined) {
    update.translationReviewedAt = data.translationReviewedAt;
  }
  if (data.translationReviewedBy !== undefined) {
    update.translationReviewedBy = data.translationReviewedBy;
  }
  if (data.translationSourceArticleId !== undefined) {
    update.translationSourceArticleId = data.translationSourceArticleId;
  }
  if (data.translationSourceHash !== undefined) {
    update.translationSourceHash = data.translationSourceHash;
  }
  return update;
};

const insertContentChanges = async (
  database: StudioDatabase,
  articleId: string,
  timestamp: number,
  changes: readonly ContentChange[]
): Promise<void> => {
  const batchCount = Math.ceil(changes.length / CONTENT_CHANGE_INSERT_SIZE);
  await Promise.all(
    Array.from({ length: batchCount }, (_, batchIndex) => {
      const start = batchIndex * CONTENT_CHANGE_INSERT_SIZE;
      const batch = changes.slice(start, start + CONTENT_CHANGE_INSERT_SIZE);
      return database.insert(articleContentChanges).values(
        batch.map((change) => ({
          afterValue: change.afterValue,
          articleId,
          beforeValue: change.beforeValue,
          changeKind: change.changeKind,
          createdAt: timestamp,
          fieldPath: change.fieldPath,
          id: crypto.randomUUID(),
          provenance: change.provenance,
        }))
      );
    })
  );
};

const attachMediaRecords = async (
  database: StudioDatabase,
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
      const [media] = await database
        .select({ id: mediaAssets.id })
        .from(mediaAliases)
        .innerJoin(mediaAssets, eq(mediaAssets.id, mediaAliases.mediaId))
        .where(inArray(mediaAliases.alias, candidates))
        .limit(1);
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
  database: StudioDatabase,
  source: string | undefined
): Promise<string | null> => {
  if (!source) {
    return null;
  }
  const [media] = await database
    .select({ mediaId: mediaAliases.mediaId })
    .from(mediaAliases)
    .where(eq(mediaAliases.alias, source))
    .limit(1);
  return media?.mediaId ?? null;
};

articleRoutes.get("/", async (context) => {
  const database = getDatabase(context.env.DB);
  const result = await database
    .select({
      capture: articles.sourceCapture,
      description: articles.summary,
      file: articles.sourceArticleId,
      heroFit: articles.heroFit,
      heroFocalX: articles.heroFocalX,
      heroFocalY: articles.heroFocalY,
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
      translationGroupId: articles.translationGroupId,
      translationKind: articles.translationKind,
      translationReviewedAt: articles.translationReviewedAt,
      translationReviewedBy: articles.translationReviewedBy,
      translationReviewStatus: articles.translationReviewStatus,
      translationSourceArticleId: articles.translationSourceArticleId,
      translationSourceHash: articles.translationSourceHash,
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
  const database = getDatabase(context.env.DB);
  const rows = await database
    .select({ bodyJson: articles.bodyJson, id: articles.id })
    .from(articles)
    .orderBy(asc(articles.id));
  const articleIds = rows
    .filter((row) => {
      const body = JSON.parse(row.bodyJson) as TiptapDocument;
      return (body.content ?? []).some(
        (node) => node.type === "figure" && !node.attrs?.mediaId
      );
    })
    .map((row) => row.id);
  return context.json({ articleIds });
});

articleRoutes.post("/:id/media-links", async (context) => {
  const id = context.req.param("id");
  const database = getDatabase(context.env.DB);
  const [article] = await database
    .select({ bodyJson: articles.bodyJson })
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);
  if (!article) {
    return context.json({ error: "Article unavailable" }, 404);
  }
  const current = JSON.parse(article.bodyJson) as TiptapDocument;
  const linked = await attachMediaRecords(database, current);
  const bodyJson = JSON.stringify(linked);
  if (bodyJson === article.bodyJson) {
    return context.json({ changed: false, id });
  }
  await database.batch([
    database
      .update(articles)
      .set({ bodyJson, updatedAt: Date.now() })
      .where(eq(articles.id, id)),
    database
      .update(articleRevisions)
      .set({ bodyJson })
      .where(
        and(
          eq(articleRevisions.articleId, id),
          eq(articleRevisions.version, 1),
          eq(articleRevisions.bodyJson, article.bodyJson)
        )
      ),
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
  const database = getDatabase(context.env.DB);
  const [baseline, changes] = await Promise.all([
    database
      .select({
        body_json: articleBaselines.bodyJson,
        converter_version: articleBaselines.converterVersion,
        created_at: articleBaselines.createdAt,
        source_hash: articleBaselines.sourceHash,
        summary: articleBaselines.summary,
        title: articleBaselines.title,
      })
      .from(articleBaselines)
      .where(eq(articleBaselines.articleId, articleId))
      .limit(1)
      .then((rows) => rows[0]),
    database
      .select({
        after_value: articleContentChanges.afterValue,
        before_value: articleContentChanges.beforeValue,
        change_kind: articleContentChanges.changeKind,
        created_at: articleContentChanges.createdAt,
        field_path: articleContentChanges.fieldPath,
        provenance: articleContentChanges.provenance,
      })
      .from(articleContentChanges)
      .where(eq(articleContentChanges.articleId, articleId))
      .orderBy(asc(articleContentChanges.fieldPath)),
  ]);
  if (!baseline) {
    return context.json({ error: "Conversion baseline unavailable" }, 404);
  }
  return context.json({ baseline, changes });
});

articleRoutes.post("/:id/revisions/:version/restore", async (context) => {
  const id = context.req.param("id");
  const version = Number.parseInt(context.req.param("version"), 10);
  const database = getDatabase(context.env.DB);
  const [revision] = await database
    .select({
      body_json: articleRevisions.bodyJson,
      metadata_json: articleRevisions.metadataJson,
    })
    .from(articleRevisions)
    .where(
      and(
        eq(articleRevisions.articleId, id),
        eq(articleRevisions.version, version)
      )
    )
    .limit(1);
  if (revision === null) {
    return context.json({ error: "Revision unavailable" }, 404);
  }

  const [latest] = await database
    .select({ version: articleRevisions.version })
    .from(articleRevisions)
    .where(eq(articleRevisions.articleId, id))
    .orderBy(desc(articleRevisions.version))
    .limit(1);
  const nextVersion = (latest?.version ?? 0) + 1;
  const metadata = JSON.parse(revision.metadata_json) as {
    heroFit?: "contain" | "cover";
    heroFocalX?: number;
    heroFocalY?: number;
    language: string;
    slug: string;
    status: string;
    summary: string;
    title: string;
  };
  const timestamp = Date.now();
  const [baseline] = await database
    .select({
      body_json: articleBaselines.bodyJson,
      summary: articleBaselines.summary,
      title: articleBaselines.title,
    })
    .from(articleBaselines)
    .where(eq(articleBaselines.articleId, id))
    .limit(1);
  const restoredDocument = JSON.parse(revision.body_json) as TiptapDocument;
  const restoredBody = await attachMediaRecords(database, restoredDocument);
  const annotated = baseline
    ? annotateArticleBody(
        restoredBody,
        await attachMediaRecords(
          database,
          JSON.parse(baseline.body_json) as TiptapDocument
        )
      )
    : { body: restoredBody, changes: [] };
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
  await database.batch([
    database
      .update(articles)
      .set({
        bodyJson: restoredBodyJson,
        heroFit: metadata.heroFit ?? "cover",
        heroFocalX: metadata.heroFocalX ?? 50,
        heroFocalY: metadata.heroFocalY ?? 50,
        language: metadata.language,
        slug: metadata.slug,
        status: metadata.status,
        summary: metadata.summary,
        title: metadata.title,
        updatedAt: timestamp,
      })
      .where(eq(articles.id, id)),
    database.insert(articleRevisions).values({
      articleId: id,
      bodyJson: restoredBodyJson,
      createdAt: timestamp,
      editorId: context.var.editor.id,
      id: crypto.randomUUID(),
      metadataJson: revision.metadata_json,
      version: nextVersion,
    }),
    database
      .delete(articleContentChanges)
      .where(eq(articleContentChanges.articleId, id)),
  ]);
  if (changes.length > 0) {
    await insertContentChanges(database, id, timestamp, changes);
  }

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
  const database = getDatabase(context.env.DB);
  const currentBody = await attachMediaRecords(database, parsed.data.body);
  const comparableBaselineBody = await attachMediaRecords(
    database,
    baseline.body
  );
  const annotated = annotateArticleBody(currentBody, comparableBaselineBody);
  const { body } = annotated;
  const bodyJson = JSON.stringify(body);
  const heroMediaId = await findMediaId(database, parsed.data.heroSourceUrl);
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

  await database.batch([
    database.insert(articles).values({
      bodyJson,
      createdAt: timestamp,
      heroFit: parsed.data.heroFit,
      heroFocalX: parsed.data.heroFocalX,
      heroFocalY: parsed.data.heroFocalY,
      heroMediaId,
      id,
      kind: parsed.data.kind,
      labelsJson: JSON.stringify(parsed.data.labels),
      language: parsed.data.language,
      publishedAt: parsed.data.publishedAt ?? null,
      section: parsed.data.section,
      slug: parsed.data.slug,
      sourceArticleId: parsed.data.sourceArticleId ?? null,
      sourceCapture: parsed.data.sourceCapture ?? null,
      sourceHtml: parsed.data.sourceHtml ?? null,
      sourceUrl: parsed.data.sourceUrl ?? null,
      status: parsed.data.status,
      summary: parsed.data.summary,
      title: parsed.data.title,
      translationGroupId,
      translationKind: parsed.data.translationKind,
      translationReviewedAt: parsed.data.translationReviewedAt ?? null,
      translationReviewedBy: parsed.data.translationReviewedBy ?? null,
      translationReviewStatus: parsed.data.translationReviewStatus,
      translationSourceArticleId:
        parsed.data.translationSourceArticleId ?? null,
      translationSourceHash: parsed.data.translationSourceHash ?? null,
      updatedAt: timestamp,
    }),
    database.insert(articleRevisions).values({
      articleId: id,
      bodyJson,
      createdAt: timestamp,
      editorId: context.var.editor.id,
      id: crypto.randomUUID(),
      metadataJson: JSON.stringify({
        heroFit: parsed.data.heroFit,
        heroFocalX: parsed.data.heroFocalX,
        heroFocalY: parsed.data.heroFocalY,
        language: parsed.data.language,
        slug: parsed.data.slug,
        status: parsed.data.status,
        summary: parsed.data.summary,
        title: parsed.data.title,
      }),
      version: 1,
    }),
    database.insert(articleBaselines).values({
      articleId: id,
      bodyJson: baselineBodyJson,
      converterVersion: baseline.converterVersion,
      createdAt: timestamp,
      sourceHash: await hashText(
        JSON.stringify({
          body: baseline.body,
          summary: baseline.summary,
          title: baseline.title,
        })
      ),
      summary: baseline.summary,
      title: baseline.title,
    }),
  ]);
  if (changes.length > 0) {
    await insertContentChanges(database, id, timestamp, changes);
  }

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
    const database = getDatabase(context.env.DB);
    const translationSource = parsed.data.translationSourceArticleId
      ? await database.query.articles.findFirst({
          where: eq(articles.id, parsed.data.translationSourceArticleId),
        })
      : undefined;
    const qualityIssues = getArticleQualityIssues({
      body: parsed.data.body,
      language: parsed.data.language,
      summary: parsed.data.summary,
      title: parsed.data.title,
      translationSource: translationSource
        ? {
            body: JSON.parse(translationSource.bodyJson) as TiptapDocument,
            language: translationSource.language,
            summary: translationSource.summary,
            title: translationSource.title,
          }
        : undefined,
    });
    if (qualityIssues.length > 0) {
      return context.json(
        { error: "Article quality checks failed", issues: qualityIssues },
        422
      );
    }
  }
  const database = getDatabase(context.env.DB);
  const [existing] = await database
    .select({
      baseline_body_json: articleBaselines.bodyJson,
      baseline_summary: articleBaselines.summary,
      baseline_title: articleBaselines.title,
      hero_media_id: articles.heroMediaId,
      id: articles.id,
    })
    .from(articles)
    .leftJoin(articleBaselines, eq(articleBaselines.articleId, articles.id))
    .where(eq(articles.id, id))
    .limit(1);
  if (existing === null) {
    return context.json({ error: "Article unavailable" }, 404);
  }

  const [latestRevision] = await database
    .select({ version: articleRevisions.version })
    .from(articleRevisions)
    .where(eq(articleRevisions.articleId, id))
    .orderBy(desc(articleRevisions.version))
    .limit(1);
  const version = (latestRevision?.version ?? 0) + 1;
  const timestamp = Date.now();
  const baselineBody = existing.baseline_body_json
    ? (JSON.parse(existing.baseline_body_json) as TiptapDocument)
    : parsed.data.body;
  const currentBody = await attachMediaRecords(database, parsed.data.body);
  const comparableBaselineBody = await attachMediaRecords(
    database,
    baselineBody
  );
  const annotated = annotateArticleBody(currentBody, comparableBaselineBody);
  const { body } = annotated;
  const bodyJson = JSON.stringify(body);
  const heroMediaId =
    (await findMediaId(database, parsed.data.heroSourceUrl)) ??
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
    heroFit: parsed.data.heroFit,
    heroFocalX: parsed.data.heroFocalX,
    heroFocalY: parsed.data.heroFocalY,
    language: parsed.data.language,
    slug: parsed.data.slug,
    status: parsed.data.status,
    summary: parsed.data.summary,
    title: parsed.data.title,
  });

  await database.batch([
    database
      .update(articles)
      .set({
        bodyJson,
        heroFit: parsed.data.heroFit,
        heroFocalX: parsed.data.heroFocalX,
        heroFocalY: parsed.data.heroFocalY,
        heroMediaId,
        kind: parsed.data.kind,
        labelsJson: JSON.stringify(parsed.data.labels),
        language: parsed.data.language,
        publishedAt: parsed.data.publishedAt ?? null,
        section: parsed.data.section,
        slug: parsed.data.slug,
        status: parsed.data.status,
        summary: parsed.data.summary,
        title: parsed.data.title,
        translationGroupId: parsed.data.translationGroupId,
        translationKind: parsed.data.translationKind,
        ...translationMetadataUpdate(parsed.data),
        updatedAt: timestamp,
      })
      .where(eq(articles.id, id)),
    database.insert(articleRevisions).values({
      articleId: id,
      bodyJson,
      createdAt: timestamp,
      editorId: context.var.editor.id,
      id: crypto.randomUUID(),
      metadataJson,
      version,
    }),
    database
      .delete(articleContentChanges)
      .where(eq(articleContentChanges.articleId, id)),
  ]);
  if (changes.length > 0) {
    await insertContentChanges(database, id, timestamp, changes);
  }

  return context.json({ heroMediaId, id, status: parsed.data.status, version });
});
