import {
  type CreateArticleInput,
  createInteractiveArticleSchema,
  type TiptapDocument,
  type UpdateArticleInput,
  updateArticleSchema,
} from "@ortodoksas-lt/content/article";
import { canonicalizePublicationDocument } from "@ortodoksas-lt/content/publication-link";
import {
  articleBaselines,
  articleContentChanges,
  articleRevisions,
  articles,
  homepageLayoutState,
  homepagePlacements,
  publicationGroups,
} from "@ortodoksas-lt/db";
import {
  annotateArticleBody,
  getChangeKind,
} from "@ortodoksas-lt/editor/provenance";
import { getArticleQualityIssues } from "@ortodoksas-lt/editor/quality";
import { and, asc, desc, eq, exists, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import type { StudioDatabase } from "../db";
import {
  contentChangeInsertQueries,
  findMediaId,
  hashText,
  textChangeProvenance,
} from "./article-content";
import { publicArticleUrl, publicationTimestamp } from "./article-publication";
import {
  type ArticleRevisionMetadata,
  articleRevisionMetadata,
  parseArticleRevisionMetadata,
} from "./article-revision";
import {
  getTranslationSourceHash,
  translationMetadataUpdate,
} from "./article-translation";

type ArticleRecord = typeof articles.$inferSelect;

const sanitizeDirectoryBody = (
  body: TiptapDocument,
  pageTemplate: string
): TiptapDocument => {
  if (pageTemplate === "community_directory") {
    return { content: [], type: "doc" };
  }
  if (pageTemplate === "people_directory") {
    return { content: body.content?.slice(0, 1) ?? [], type: "doc" };
  }
  return body;
};

const mutableArticleValues = ({
  createdAt: _createdAt,
  id: _id,
  ...values
}: ArticleRecord) => values;

export type StudioOperationResult<T> =
  | { data: T; ok: true }
  | {
      currentVersion?: number;
      error: string;
      issues?: string[];
      ok: false;
      status: 404 | 409 | 422 | 503;
    };

type StudioOperationFailure = Extract<
  StudioOperationResult<never>,
  { ok: false }
>;

const success = <T>(data: T): StudioOperationResult<T> => ({ data, ok: true });

const validationIssues = (
  issues: Array<{ message: string; path: PropertyKey[] }>
) =>
  issues.map((issue) => {
    const path = issue.path.map(String).join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

const contentChanges = (input: {
  baselineSummary: string;
  baselineTitle: string;
  bodyChanges: ReturnType<typeof annotateArticleBody>["changes"];
  summary: string;
  title: string;
}) => {
  const changes = [...input.bodyChanges];
  if (input.baselineTitle !== input.title) {
    changes.push({
      afterValue: input.title,
      beforeValue: input.baselineTitle,
      changeKind: "changed",
      fieldPath: "title",
      provenance: textChangeProvenance(input.baselineTitle, input.title),
    });
  }
  if (input.baselineSummary !== input.summary) {
    changes.push({
      afterValue: input.summary || null,
      beforeValue: input.baselineSummary || null,
      changeKind: getChangeKind(input.baselineSummary, input.summary),
      fieldPath: "summary",
      provenance: textChangeProvenance(input.baselineSummary, input.summary),
    });
  }
  return changes;
};

const hasArticleContentChanged = (
  article: Pick<ArticleRecord, "bodyJson" | "summary" | "title">,
  next: Pick<CreateArticleInput, "summary" | "title"> & { bodyJson: string }
) =>
  article.bodyJson !== next.bodyJson ||
  article.summary !== next.summary ||
  article.title !== next.title;

const hasEditionIdentityChanged = (
  article: ArticleRecord,
  next: Pick<UpdateArticleInput, "language" | "translationKind">
) =>
  next.language !== article.language ||
  next.translationKind !== article.translationKind;

const resolveEditionIdentity = (
  article: ArticleRecord | undefined,
  next: Pick<UpdateArticleInput, "language" | "translationKind">
):
  | { article: ArticleRecord; ok: true }
  | { failure: StudioOperationFailure; ok: false } => {
  if (!article) {
    return {
      failure: { error: "Article unavailable", ok: false, status: 404 },
      ok: false,
    };
  }
  if (hasEditionIdentityChanged(article, next)) {
    return {
      failure: {
        error:
          "Edition identity is fixed; create translations through the translation workflow",
        ok: false,
        status: 422,
      },
      ok: false,
    };
  }
  return { article, ok: true };
};

const getPublicationQualityIssues = async (
  database: StudioDatabase,
  article: Pick<
    CreateArticleInput,
    "body" | "language" | "summary" | "title" | "translationSourceArticleId"
  >
) => {
  const translationSource = article.translationSourceArticleId
    ? await database.query.articles.findFirst({
        where: eq(articles.id, article.translationSourceArticleId),
      })
    : undefined;
  return getArticleQualityIssues({
    body: article.body,
    language: article.language,
    summary: article.summary,
    title: article.title,
    translationSource: translationSource
      ? {
          body: JSON.parse(translationSource.bodyJson) as TiptapDocument,
          language: translationSource.language,
          summary: translationSource.summary,
          title: translationSource.title,
        }
      : undefined,
  });
};

const resolveTranslationReviewUpdate = async (input: {
  article: ArticleRecord;
  contentChanged: boolean;
  database: StudioDatabase;
  editorId: string;
  expectedTranslationSourceHash: string | undefined;
  reviewAction: UpdateArticleInput["translationReviewAction"];
  timestamp: number;
  translationKind: UpdateArticleInput["translationKind"];
}) => {
  if (
    input.reviewAction === "approve" &&
    input.translationKind === "original"
  ) {
    return {
      error: "Original articles use the not-required review state",
      ok: false as const,
      status: 422 as const,
    };
  }
  const metadata = translationMetadataUpdate(
    {
      action: input.reviewAction,
      contentChanged: input.contentChanged,
      currentStatus: input.article.translationReviewStatus,
    },
    { editorId: input.editorId, timestamp: input.timestamp }
  );
  const reviewStatus =
    metadata.translationReviewStatus ?? input.article.translationReviewStatus;
  if (reviewStatus !== "approved") {
    return {
      metadata,
      ok: true as const,
      translationSourceHash: input.article.translationSourceHash,
      translationSourceSnapshot: undefined,
    };
  }
  const { translationSourceArticleId } = input.article;
  const translationSource = translationSourceArticleId
    ? await input.database.query.articles.findFirst({
        where: eq(articles.id, translationSourceArticleId),
      })
    : undefined;
  if (!translationSource) {
    if (input.reviewAction !== "approve") {
      return {
        metadata: {
          ...metadata,
          translationReviewedAt: null,
          translationReviewedBy: null,
          translationReviewStatus: "pending" as const,
        },
        ok: true as const,
        translationSourceHash: input.article.translationSourceHash,
        translationSourceSnapshot: undefined,
      };
    }
    return {
      error: "Translation approval requires an available source article",
      ok: false as const,
      status: 422 as const,
    };
  }
  const currentSourceHash = await getTranslationSourceHash(translationSource);
  if (
    input.reviewAction === "approve" &&
    input.expectedTranslationSourceHash !== currentSourceHash
  ) {
    return {
      error: "Translation source changed since this editor loaded it",
      ok: false as const,
      status: 409 as const,
    };
  }
  if (
    input.reviewAction !== "approve" &&
    currentSourceHash !== input.article.translationSourceHash
  ) {
    return {
      metadata: {
        ...metadata,
        translationReviewedAt: null,
        translationReviewedBy: null,
        translationReviewStatus: "pending" as const,
      },
      ok: true as const,
      translationSourceHash: input.article.translationSourceHash,
      translationSourceSnapshot: undefined,
    };
  }
  return {
    metadata,
    ok: true as const,
    translationSourceHash: currentSourceHash,
    translationSourceSnapshot: {
      bodyJson: translationSource.bodyJson,
      summary: translationSource.summary,
      title: translationSource.title,
    },
  };
};

const getDependentReviewInvalidationQueries = (input: {
  contentChanged: boolean;
  database: StudioDatabase;
  editorId: string;
  guardRevisionId: string;
  sourceArticleId: string;
  timestamp: number;
}) => {
  if (!input.contentChanged) {
    return [];
  }
  const sourceMutationGuard = alias(
    articleRevisions,
    "source_invalidation_mutation_guard"
  );
  const sourceMutationCommitted = exists(
    input.database
      .select({ id: sourceMutationGuard.id })
      .from(sourceMutationGuard)
      .where(eq(sourceMutationGuard.id, input.guardRevisionId))
  );
  const invalidationArticle = alias(articles, "translation_invalidation");
  const approvedDependents = and(
    eq(invalidationArticle.translationSourceArticleId, input.sourceArticleId),
    eq(invalidationArticle.translationReviewStatus, "approved"),
    sourceMutationCommitted
  );
  const metadataJson = sql<string>`json_object(
    'heroFit', ${invalidationArticle.heroFit},
    'heroFocalX', ${invalidationArticle.heroFocalX},
    'heroFocalY', ${invalidationArticle.heroFocalY},
    'heroMediaId', ${invalidationArticle.heroMediaId},
    'kind', ${invalidationArticle.kind},
    'labels', json(${invalidationArticle.labelsJson}),
    'language', ${invalidationArticle.language},
    'publishedAt', ${invalidationArticle.publishedAt},
    'section', ${invalidationArticle.section},
    'seoDescription', ${invalidationArticle.seoDescription},
    'seoTitle', ${invalidationArticle.seoTitle},
    'slug', ${invalidationArticle.slug},
    'snapshotCompleteness', 'complete',
    'snapshotVersion', 4,
    'status', ${invalidationArticle.status},
    'summary', ${invalidationArticle.summary},
    'title', ${invalidationArticle.title},
    'translationGroupId', ${invalidationArticle.translationGroupId},
    'translationKind', ${invalidationArticle.translationKind},
    'translationReviewedAt', NULL,
    'translationReviewedBy', NULL,
    'translationReviewStatus', 'pending',
    'translationSourceArticleId', ${invalidationArticle.translationSourceArticleId},
    'translationSourceHash', ${invalidationArticle.translationSourceHash}
  )`;

  return [
    input.database.insert(articleRevisions).select(
      input.database
        .select({
          articleId: invalidationArticle.id,
          bodyJson: invalidationArticle.bodyJson,
          createdAt: sql<number>`${input.timestamp}`.as("created_at"),
          editorId: sql<string>`${input.editorId}`.as("editor_id"),
          id: sql<string>`lower(hex(randomblob(16)))`.as("id"),
          metadataJson: metadataJson.as("metadata_json"),
          version:
            sql<number>`(SELECT COALESCE(MAX("history"."version"), 0) + 1 FROM "article_revisions" AS "history" WHERE "history"."article_id" = "translation_invalidation"."id")`.as(
              "version"
            ),
        })
        .from(invalidationArticle)
        .where(approvedDependents)
    ),
    input.database
      .update(articles)
      .set({
        translationReviewedAt: null,
        translationReviewedBy: null,
        translationReviewStatus: "pending",
        updatedAt: input.timestamp,
      })
      .where(
        and(
          eq(articles.translationSourceArticleId, input.sourceArticleId),
          eq(articles.translationReviewStatus, "approved"),
          sourceMutationCommitted
        )
      ),
  ];
};

const resolveRestoredTranslationReview = async (
  database: StudioDatabase,
  metadata: ArticleRevisionMetadata,
  contentChanged: boolean
) => {
  const restoredReview = {
    translationReviewedAt: metadata.translationReviewedAt,
    translationReviewedBy: metadata.translationReviewedBy,
    translationReviewStatus: metadata.translationReviewStatus,
  };
  if (
    (metadata.snapshotCompleteness === "legacy_partial" && contentChanged) ||
    metadata.translationReviewStatus !== "approved" ||
    !metadata.translationSourceArticleId
  ) {
    return {
      restoredReview:
        metadata.translationReviewStatus === "approved" && contentChanged
          ? {
              translationReviewedAt: null,
              translationReviewedBy: null,
              translationReviewStatus: "pending" as const,
            }
          : restoredReview,
      sourceSnapshot: undefined,
    };
  }
  const translationSource = await database.query.articles.findFirst({
    where: eq(articles.id, metadata.translationSourceArticleId),
  });
  const currentSourceHash = translationSource
    ? await getTranslationSourceHash(translationSource)
    : null;
  if (currentSourceHash !== metadata.translationSourceHash) {
    return {
      restoredReview: {
        translationReviewedAt: null,
        translationReviewedBy: null,
        translationReviewStatus: "pending" as const,
      },
      sourceSnapshot: undefined,
    };
  }
  return {
    restoredReview,
    sourceSnapshot: translationSource
      ? {
          bodyJson: translationSource.bodyJson,
          summary: translationSource.summary,
          title: translationSource.title,
        }
      : undefined,
  };
};

const articlePersistenceQueries = (input: {
  article: ArticleRecord;
  articleId: string;
  bodyJson: string;
  database: StudioDatabase;
  editorId: string;
  metadataJson: string;
  sourceArticleId: string | null;
  sourceSnapshot:
    | { bodyJson: string; summary: string; title: string }
    | undefined;
  timestamp: number;
  version: number;
}) => {
  const revisionValues = {
    articleId: input.articleId,
    bodyJson: input.bodyJson,
    createdAt: input.timestamp,
    editorId: input.editorId,
    id: crypto.randomUUID(),
    metadataJson: input.metadataJson,
    version: input.version,
  };
  const mutationTarget = alias(articles, "article_mutation_target");
  const approvalSource = alias(articles, "approval_source");
  const sourceSnapshotMatches =
    input.sourceArticleId && input.sourceSnapshot
      ? exists(
          input.database
            .select({ id: approvalSource.id })
            .from(approvalSource)
            .where(
              and(
                eq(approvalSource.id, input.sourceArticleId),
                eq(approvalSource.bodyJson, input.sourceSnapshot.bodyJson),
                eq(approvalSource.summary, input.sourceSnapshot.summary),
                eq(approvalSource.title, input.sourceSnapshot.title)
              )
            )
        )
      : undefined;
  const staysHomepageEligible =
    input.article.kind === "article" &&
    input.article.language === "lt" &&
    input.article.status === "published" &&
    input.article.heroMediaId !== null;
  const activePlacement = alias(
    homepagePlacements,
    "article_mutation_active_placement"
  );
  const activeLayout = alias(
    homepageLayoutState,
    "article_mutation_active_layout"
  );
  const homepageTransitionAllowed = staysHomepageEligible
    ? undefined
    : notExists(
        input.database
          .select({ id: activePlacement.id })
          .from(activePlacement)
          .innerJoin(
            activeLayout,
            eq(activeLayout.revision, activePlacement.layoutRevision)
          )
          .where(
            and(
              eq(activeLayout.id, "primary"),
              eq(activePlacement.articleId, input.articleId)
            )
          )
      );
  const mutationCondition = and(
    eq(mutationTarget.id, input.articleId),
    sourceSnapshotMatches,
    homepageTransitionAllowed
  );
  const mutationAllowed = exists(
    input.database
      .select({ id: mutationTarget.id })
      .from(mutationTarget)
      .where(mutationCondition)
  );
  return {
    queries: [
      input.database
        .update(articles)
        .set(mutableArticleValues(input.article))
        .where(and(eq(articles.id, input.articleId), mutationAllowed)),
      input.database.insert(articleRevisions).select(
        input.database
          .select({
            articleId: sql<string>`${revisionValues.articleId}`.as(
              "article_id"
            ),
            bodyJson: sql<string>`${revisionValues.bodyJson}`.as("body_json"),
            createdAt: sql<number>`${revisionValues.createdAt}`.as(
              "created_at"
            ),
            editorId: sql<string>`${revisionValues.editorId}`.as("editor_id"),
            id: sql<string>`${revisionValues.id}`.as("id"),
            metadataJson: sql<string>`${revisionValues.metadataJson}`.as(
              "metadata_json"
            ),
            version: sql<number>`${revisionValues.version}`.as("version"),
          })
          .from(mutationTarget)
          .where(mutationCondition)
      ),
    ] as const,
    revisionId: revisionValues.id,
  };
};

const getRevisionCommitConflict = async (input: {
  articleId: string;
  currentVersion: number;
  database: StudioDatabase;
  revisionId: string;
}): Promise<StudioOperationFailure | undefined> => {
  const [committedRevision] = await input.database
    .select({ id: articleRevisions.id })
    .from(articleRevisions)
    .where(eq(articleRevisions.id, input.revisionId))
    .limit(1);
  if (committedRevision) {
    return;
  }
  const [latestRevision] = await input.database
    .select({ version: articleRevisions.version })
    .from(articleRevisions)
    .where(eq(articleRevisions.articleId, input.articleId))
    .orderBy(desc(articleRevisions.version))
    .limit(1);
  return {
    currentVersion: latestRevision?.version ?? input.currentVersion,
    error: "Article state changed during the guarded save",
    ok: false,
    status: 409,
  };
};

export const getArticleBaseline = async (
  database: StudioDatabase,
  articleId: string
) => {
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
  return baseline ? { baseline, changes } : null;
};

export const getArticleRevisions = (
  database: StudioDatabase,
  articleId: string
) =>
  database
    .select({
      created_at: articleRevisions.createdAt,
      editor_id: articleRevisions.editorId,
      id: articleRevisions.id,
      metadata_json: articleRevisions.metadataJson,
      version: articleRevisions.version,
    })
    .from(articleRevisions)
    .where(eq(articleRevisions.articleId, articleId))
    .orderBy(desc(articleRevisions.version));

export const getArticleWorkspace = async (
  database: StudioDatabase,
  articleId: string
) => {
  const canonical = await database.query.articles.findFirst({
    where: eq(articles.id, articleId),
  });
  if (!canonical) {
    return null;
  }
  const [baselineRecord, revisions, translationSource] = await Promise.all([
    getArticleBaseline(database, articleId),
    getArticleRevisions(database, articleId),
    canonical.translationSourceArticleId
      ? database.query.articles.findFirst({
          where: eq(articles.id, canonical.translationSourceArticleId),
        })
      : null,
  ]);
  return {
    baseline: baselineRecord?.baseline ?? { body_json: canonical.bodyJson },
    canonical,
    changes: baselineRecord?.changes ?? [],
    revisions,
    translationSource: translationSource ?? null,
    translationSourceCurrentHash: translationSource
      ? await getTranslationSourceHash(translationSource)
      : null,
  };
};

export const createArticle = async (input: {
  database: StudioDatabase;
  editorId: string;
  payload: unknown;
}): Promise<
  StudioOperationResult<{
    heroMediaId: string | null;
    id: string;
    publishedAt: number | null;
    status: string;
    translationReviewStatus: string;
    version: number;
  }>
> => {
  const parsed = createInteractiveArticleSchema.safeParse(input.payload);
  if (!parsed.success) {
    return {
      error: "Article validation failed",
      issues: validationIssues(parsed.error.issues),
      ok: false,
      status: 422,
    };
  }
  if (
    parsed.data.kind === "article" &&
    parsed.data.pageTemplate !== "standard"
  ) {
    return {
      error: "Article records use the standard page type",
      ok: false,
      status: 422,
    };
  }
  if (parsed.data.status === "published") {
    const qualityIssues = await getPublicationQualityIssues(
      input.database,
      parsed.data
    );
    if (qualityIssues.length > 0) {
      return {
        error: "Article quality checks failed",
        issues: qualityIssues,
        ok: false,
        status: 422,
      };
    }
  }

  const id = crypto.randomUUID();
  const translationGroupId =
    parsed.data.translationGroupId ?? crypto.randomUUID();
  const existingGroup = parsed.data.translationGroupId
    ? await input.database.query.publicationGroups.findFirst({
        where: eq(publicationGroups.id, parsed.data.translationGroupId),
      })
    : undefined;
  if (
    existingGroup &&
    (existingGroup.kind !== parsed.data.kind ||
      existingGroup.pageTemplate !== parsed.data.pageTemplate)
  ) {
    return {
      error: "Publication group kind and template are immutable",
      ok: false,
      status: 409,
    };
  }
  const timestamp = Date.now();
  const baseline = parsed.data.baseline ?? {
    body: parsed.data.body,
    converterVersion: "native-v1",
    summary: parsed.data.summary,
    title: parsed.data.title,
  };
  const currentBody = canonicalizePublicationDocument(parsed.data.body);
  const comparableBaselineBody = canonicalizePublicationDocument(baseline.body);
  const annotated = annotateArticleBody(currentBody, comparableBaselineBody);
  const bodyJson = JSON.stringify(annotated.body);
  const heroMediaId = await findMediaId(
    input.database,
    parsed.data.heroSourceUrl
  );
  const publishedAt = publicationTimestamp(
    parsed.data.status,
    parsed.data.publishedAt,
    timestamp
  );
  const changes = contentChanges({
    baselineSummary: baseline.summary,
    baselineTitle: baseline.title,
    bodyChanges: annotated.changes,
    summary: parsed.data.summary,
    title: parsed.data.title,
  });
  const articleRecord: typeof articles.$inferSelect = {
    bodyJson,
    createdAt: timestamp,
    heroFit: parsed.data.heroFit,
    heroFocalX: parsed.data.heroFocalX,
    heroFocalY: parsed.data.heroFocalY,
    heroMediaId,
    id,
    kind: parsed.data.kind,
    labelsJson: JSON.stringify(parsed.data.labels),
    language: "lt",
    publishedAt,
    section: parsed.data.section,
    seoDescription: null,
    seoTitle: null,
    slug: parsed.data.slug,
    status: parsed.data.status,
    summary: parsed.data.summary,
    title: parsed.data.title,
    translationGroupId,
    translationKind: "original",
    translationReviewedAt: null,
    translationReviewedBy: null,
    translationReviewStatus: "not_required",
    translationSourceArticleId: null,
    translationSourceHash: null,
    updatedAt: timestamp,
  };

  await input.database.batch([
    input.database
      .insert(publicationGroups)
      .values({
        createdAt: timestamp,
        id: translationGroupId,
        kind: parsed.data.kind,
        pageTemplate: parsed.data.pageTemplate,
        updatedAt: timestamp,
      })
      .onConflictDoNothing({ target: publicationGroups.id }),
    input.database.insert(articles).values(articleRecord),
    input.database.insert(articleRevisions).values({
      articleId: id,
      bodyJson,
      createdAt: timestamp,
      editorId: input.editorId,
      id: crypto.randomUUID(),
      metadataJson: JSON.stringify(articleRevisionMetadata(articleRecord)),
      version: 1,
    }),
    input.database.insert(articleBaselines).values({
      articleId: id,
      bodyJson: JSON.stringify(baseline.body),
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
    ...contentChangeInsertQueries(input.database, id, timestamp, changes),
  ]);

  return success({
    heroMediaId,
    id,
    publishedAt,
    status: parsed.data.status,
    translationReviewStatus: "not_required",
    version: 1,
  });
};

export const updateArticle = async (input: {
  articleId: string;
  database: StudioDatabase;
  editorId: string;
  payload: unknown;
}): Promise<
  StudioOperationResult<{
    heroMediaId: string | null;
    id: string;
    publishedAt: number | null;
    status: string;
    translationReviewStatus: string;
    version: number;
  }>
> => {
  const parsed = updateArticleSchema.safeParse(input.payload);
  if (!parsed.success) {
    return {
      error: "Article validation failed",
      issues: validationIssues(parsed.error.issues),
      ok: false,
      status: 422,
    };
  }

  const [storedArticle, baseline] = await Promise.all([
    input.database.query.articles.findFirst({
      where: eq(articles.id, input.articleId),
    }),
    input.database.query.articleBaselines.findFirst({
      where: eq(articleBaselines.articleId, input.articleId),
    }),
  ]);
  const identityResolution = resolveEditionIdentity(storedArticle, parsed.data);
  if (!identityResolution.ok) {
    return identityResolution.failure;
  }
  const { article: existingArticle } = identityResolution;
  if (parsed.data.status === "published") {
    const qualityIssues = await getPublicationQualityIssues(input.database, {
      ...parsed.data,
      translationSourceArticleId:
        existingArticle.translationSourceArticleId ?? undefined,
    });
    if (qualityIssues.length > 0) {
      return {
        error: "Article quality checks failed",
        issues: qualityIssues,
        ok: false,
        status: 422,
      };
    }
  }

  const [latestRevision] = await input.database
    .select({ version: articleRevisions.version })
    .from(articleRevisions)
    .where(eq(articleRevisions.articleId, input.articleId))
    .orderBy(desc(articleRevisions.version))
    .limit(1);
  const currentVersion = latestRevision?.version ?? 0;
  if (parsed.data.expectedVersion !== currentVersion) {
    return {
      currentVersion,
      error: "Article changed since this editor loaded it",
      ok: false,
      status: 409,
    };
  }

  const version = currentVersion + 1;
  const timestamp = Date.now();
  const baselineBody = baseline?.bodyJson
    ? (JSON.parse(baseline.bodyJson) as TiptapDocument)
    : parsed.data.body;
  const currentBody = canonicalizePublicationDocument(parsed.data.body);
  const comparableBaselineBody = canonicalizePublicationDocument(baselineBody);
  const annotated = annotateArticleBody(currentBody, comparableBaselineBody);
  const bodyJson = JSON.stringify(annotated.body);
  const heroMediaId =
    (await findMediaId(input.database, parsed.data.heroSourceUrl)) ??
    existingArticle.heroMediaId;
  const publishedAt = publicationTimestamp(
    parsed.data.status,
    parsed.data.publishedAt,
    timestamp
  );
  const changes = contentChanges({
    baselineSummary: baseline?.summary ?? parsed.data.summary,
    baselineTitle: baseline?.title ?? parsed.data.title,
    bodyChanges: annotated.changes,
    summary: parsed.data.summary,
    title: parsed.data.title,
  });
  const contentChanged = hasArticleContentChanged(existingArticle, {
    bodyJson,
    summary: parsed.data.summary,
    title: parsed.data.title,
  });
  const reviewResolution = await resolveTranslationReviewUpdate({
    article: existingArticle,
    contentChanged,
    database: input.database,
    editorId: input.editorId,
    expectedTranslationSourceHash: parsed.data.expectedTranslationSourceHash,
    reviewAction: parsed.data.translationReviewAction,
    timestamp,
    translationKind: parsed.data.translationKind,
  });
  if (!reviewResolution.ok) {
    return reviewResolution;
  }
  const nextArticle: typeof articles.$inferSelect = {
    ...existingArticle,
    bodyJson,
    heroFit: parsed.data.heroFit,
    heroFocalX: parsed.data.heroFocalX,
    heroFocalY: parsed.data.heroFocalY,
    heroMediaId,
    kind: existingArticle.kind,
    labelsJson: JSON.stringify(parsed.data.labels),
    language: parsed.data.language,
    publishedAt,
    section: parsed.data.section,
    slug: parsed.data.slug,
    status: parsed.data.status,
    summary: parsed.data.summary,
    title: parsed.data.title,
    translationGroupId: existingArticle.translationGroupId,
    translationKind: parsed.data.translationKind,
    translationSourceHash: reviewResolution.translationSourceHash,
    updatedAt: timestamp,
    ...reviewResolution.metadata,
  };
  const metadataJson = JSON.stringify(articleRevisionMetadata(nextArticle));
  const persistence = articlePersistenceQueries({
    article: nextArticle,
    articleId: input.articleId,
    bodyJson,
    database: input.database,
    editorId: input.editorId,
    metadataJson,
    sourceArticleId:
      nextArticle.translationReviewStatus === "approved"
        ? existingArticle.translationSourceArticleId
        : null,
    sourceSnapshot: reviewResolution.translationSourceSnapshot,
    timestamp,
    version,
  });
  const dependentRevisionQueries = getDependentReviewInvalidationQueries({
    contentChanged,
    database: input.database,
    editorId: input.editorId,
    guardRevisionId: persistence.revisionId,
    sourceArticleId: input.articleId,
    timestamp,
  });
  const changeMutationGuard = alias(
    articleRevisions,
    "article_change_mutation_guard"
  );
  const articleMutationCommitted = exists(
    input.database
      .select({ id: changeMutationGuard.id })
      .from(changeMutationGuard)
      .where(eq(changeMutationGuard.id, persistence.revisionId))
  );

  try {
    await input.database.batch([
      ...persistence.queries,
      ...dependentRevisionQueries,
      input.database
        .delete(articleContentChanges)
        .where(
          and(
            eq(articleContentChanges.articleId, input.articleId),
            articleMutationCommitted
          )
        ),
      ...contentChangeInsertQueries(
        input.database,
        input.articleId,
        timestamp,
        changes,
        persistence.revisionId
      ),
    ]);
  } catch (error: unknown) {
    const [currentRevision] = await input.database
      .select({ version: articleRevisions.version })
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, input.articleId))
      .orderBy(desc(articleRevisions.version))
      .limit(1);
    const concurrentVersion = currentRevision?.version ?? 0;
    if (concurrentVersion > parsed.data.expectedVersion) {
      return {
        currentVersion: concurrentVersion,
        error: "Article changed since this editor loaded it",
        ok: false,
        status: 409,
      };
    }
    throw error;
  }

  const commitConflict = await getRevisionCommitConflict({
    articleId: input.articleId,
    currentVersion,
    database: input.database,
    revisionId: persistence.revisionId,
  });
  return (
    commitConflict ??
    success({
      heroMediaId,
      id: input.articleId,
      publishedAt,
      status: parsed.data.status,
      translationReviewStatus: nextArticle.translationReviewStatus,
      version,
    })
  );
};

export const restoreArticleRevision = async (input: {
  articleId: string;
  database: StudioDatabase;
  editorId: string;
  expectedVersion: number;
  version: number;
}): Promise<
  StudioOperationResult<{
    article: NonNullable<
      Awaited<ReturnType<StudioDatabase["query"]["articles"]["findFirst"]>>
    >;
    restoredFrom: number;
    version: number;
  }>
> => {
  const [[revision], currentArticle] = await Promise.all([
    input.database
      .select({
        bodyJson: articleRevisions.bodyJson,
        metadataJson: articleRevisions.metadataJson,
      })
      .from(articleRevisions)
      .where(
        and(
          eq(articleRevisions.articleId, input.articleId),
          eq(articleRevisions.version, input.version)
        )
      )
      .limit(1),
    input.database.query.articles.findFirst({
      where: eq(articles.id, input.articleId),
    }),
  ]);
  if (!(revision && currentArticle)) {
    return { error: "Revision unavailable", ok: false, status: 404 };
  }

  const [latest] = await input.database
    .select({ version: articleRevisions.version })
    .from(articleRevisions)
    .where(eq(articleRevisions.articleId, input.articleId))
    .orderBy(desc(articleRevisions.version))
    .limit(1);
  const currentVersion = latest?.version ?? 0;
  if (input.expectedVersion !== currentVersion) {
    return {
      currentVersion,
      error: "Article changed since this editor loaded it",
      ok: false,
      status: 409,
    };
  }

  const metadata = parseArticleRevisionMetadata(
    revision.metadataJson,
    currentArticle
  );
  const timestamp = Date.now();
  const [[baseline], publicationGroup] = await Promise.all([
    input.database
      .select({
        bodyJson: articleBaselines.bodyJson,
        summary: articleBaselines.summary,
        title: articleBaselines.title,
      })
      .from(articleBaselines)
      .where(eq(articleBaselines.articleId, input.articleId))
      .limit(1),
    input.database.query.publicationGroups.findFirst({
      where: eq(publicationGroups.id, currentArticle.translationGroupId),
    }),
  ]);
  const restoredBody = canonicalizePublicationDocument(
    metadata.snapshotCompleteness === "legacy_partial"
      ? sanitizeDirectoryBody(
          JSON.parse(revision.bodyJson) as TiptapDocument,
          publicationGroup?.pageTemplate ?? "standard"
        )
      : (JSON.parse(revision.bodyJson) as TiptapDocument)
  );
  const annotated = baseline
    ? annotateArticleBody(
        restoredBody,
        canonicalizePublicationDocument(
          JSON.parse(baseline.bodyJson) as TiptapDocument
        )
      )
    : { body: restoredBody, changes: [] };
  const restoredBodyJson = JSON.stringify(annotated.body);
  const changes = contentChanges({
    baselineSummary: baseline?.summary ?? metadata.summary,
    baselineTitle: baseline?.title ?? metadata.title,
    bodyChanges: annotated.changes,
    summary: metadata.summary,
    title: metadata.title,
  });
  const nextVersion = currentVersion + 1;
  const restoredContentChanged = hasArticleContentChanged(currentArticle, {
    bodyJson: restoredBodyJson,
    summary: metadata.summary,
    title: metadata.title,
  });
  const { restoredReview, sourceSnapshot: restorationSourceSnapshot } =
    await resolveRestoredTranslationReview(
      input.database,
      metadata,
      restoredContentChanged
    );
  const restoredArticle: typeof articles.$inferSelect = {
    ...currentArticle,
    bodyJson: restoredBodyJson,
    heroFit: metadata.heroFit,
    heroFocalX: metadata.heroFocalX,
    heroFocalY: metadata.heroFocalY,
    heroMediaId: metadata.heroMediaId,
    kind: currentArticle.kind,
    labelsJson: JSON.stringify(metadata.labels),
    language: metadata.language,
    publishedAt: metadata.publishedAt,
    section: metadata.section,
    seoDescription: metadata.seoDescription,
    seoTitle: metadata.seoTitle,
    slug: metadata.slug,
    status: metadata.status,
    summary: metadata.summary,
    title: metadata.title,
    translationGroupId: currentArticle.translationGroupId,
    translationKind: metadata.translationKind,
    translationSourceArticleId: metadata.translationSourceArticleId,
    translationSourceHash: metadata.translationSourceHash,
    updatedAt: timestamp,
    ...restoredReview,
  };
  const restoration = articlePersistenceQueries({
    article: restoredArticle,
    articleId: input.articleId,
    bodyJson: restoredBodyJson,
    database: input.database,
    editorId: input.editorId,
    metadataJson: JSON.stringify(articleRevisionMetadata(restoredArticle)),
    sourceArticleId:
      restoredReview.translationReviewStatus === "approved"
        ? metadata.translationSourceArticleId
        : null,
    sourceSnapshot: restorationSourceSnapshot,
    timestamp,
    version: nextVersion,
  });
  const dependentRevisionQueries = getDependentReviewInvalidationQueries({
    contentChanged: restoredContentChanged,
    database: input.database,
    editorId: input.editorId,
    guardRevisionId: restoration.revisionId,
    sourceArticleId: input.articleId,
    timestamp,
  });
  const restoreMutationGuard = alias(
    articleRevisions,
    "restore_change_mutation_guard"
  );
  const restoreCommitted = exists(
    input.database
      .select({ id: restoreMutationGuard.id })
      .from(restoreMutationGuard)
      .where(eq(restoreMutationGuard.id, restoration.revisionId))
  );

  try {
    await input.database.batch([
      ...restoration.queries,
      ...dependentRevisionQueries,
      input.database
        .delete(articleContentChanges)
        .where(
          and(
            eq(articleContentChanges.articleId, input.articleId),
            restoreCommitted
          )
        ),
      ...contentChangeInsertQueries(
        input.database,
        input.articleId,
        timestamp,
        changes,
        restoration.revisionId
      ),
    ]);
  } catch (error: unknown) {
    const [currentRevision] = await input.database
      .select({ version: articleRevisions.version })
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, input.articleId))
      .orderBy(desc(articleRevisions.version))
      .limit(1);
    const concurrentVersion = currentRevision?.version ?? 0;
    if (concurrentVersion > input.expectedVersion) {
      return {
        currentVersion: concurrentVersion,
        error: "Article changed since this editor loaded it",
        ok: false,
        status: 409,
      };
    }
    throw error;
  }

  const commitConflict = await getRevisionCommitConflict({
    articleId: input.articleId,
    currentVersion,
    database: input.database,
    revisionId: restoration.revisionId,
  });
  if (commitConflict) {
    return {
      ...commitConflict,
      error: "Article state changed during the guarded revision restoration",
    };
  }
  const [article, [latestRevision]] = await Promise.all([
    input.database.query.articles.findFirst({
      where: eq(articles.id, input.articleId),
    }),
    input.database
      .select({ version: articleRevisions.version })
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, input.articleId))
      .orderBy(desc(articleRevisions.version))
      .limit(1),
  ]);
  if (!article) {
    return { error: "Article unavailable", ok: false, status: 404 };
  }
  return success({
    article,
    restoredFrom: input.version,
    version: latestRevision?.version ?? nextVersion,
  });
};

export const verifyArticlePublication = async (input: {
  articleId: string;
  database: StudioDatabase;
  publicationOrigin: string | undefined;
}): Promise<
  StudioOperationResult<{
    reachable: boolean;
    status: number | null;
    url: string;
  }>
> => {
  const [article] = await input.database
    .select({
      language: articles.language,
      slug: articles.slug,
      status: articles.status,
    })
    .from(articles)
    .where(eq(articles.id, input.articleId))
    .limit(1);
  if (!article) {
    return { error: "Article unavailable", ok: false, status: 404 };
  }
  if (article.status !== "published") {
    return {
      error: "Article is awaiting publication",
      ok: false,
      status: 409,
    };
  }
  if (!input.publicationOrigin) {
    return {
      error: "Publication origin is unavailable",
      ok: false,
      status: 503,
    };
  }
  const url = publicArticleUrl(
    input.publicationOrigin,
    article.language,
    article.slug
  );
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    return success({ reachable: response.ok, status: response.status, url });
  } catch {
    return success({ reachable: false, status: null, url });
  }
};
