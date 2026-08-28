import type {
  CreateArticleInput,
  TiptapDocument,
  UpdateArticleInput,
} from "@ortodoksas-lt/content/article";
import {
  articleRevisions,
  articles,
  homepageLayoutState,
  homepagePlacements,
} from "@ortodoksas-lt/db";
import {
  type annotateArticleBody,
  getChangeKind,
} from "@ortodoksas-lt/editor/provenance";
import { getArticleQualityIssues } from "@ortodoksas-lt/editor/quality";
import { and, desc, eq, exists, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import type { StudioDatabase } from "../db.server";
import { textChangeProvenance } from "./article-content.server";
import type { ArticleRevisionMetadata } from "./article-revision.server";
import {
  getTranslationSourceHash,
  translationMetadataUpdate,
} from "./article-translation.server";

type ArticleRecord = typeof articles.$inferSelect;

export const sanitizeDirectoryBody = (
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

export const optionalText = (value: string): string | null => value || null;

export const resolveArticleMetadataUpdate = (
  article: ArticleRecord,
  update: Pick<
    UpdateArticleInput,
    "byline" | "bylineType" | "bylineUrl" | "seoDescription" | "seoTitle"
  >
): Pick<
  ArticleRecord,
  "byline" | "bylineType" | "bylineUrl" | "seoDescription" | "seoTitle"
> => {
  const {
    byline: currentByline,
    bylineType: currentBylineType,
    bylineUrl: currentBylineUrl,
  } = article;
  const {
    byline: requestedByline,
    bylineType: requestedBylineType,
    bylineUrl: requestedBylineUrl,
  } = update;
  const byline =
    requestedByline === undefined
      ? currentByline
      : optionalText(requestedByline);
  const bylineChanged =
    requestedByline !== undefined && byline !== currentByline;
  let bylineType = currentBylineType;
  if (requestedBylineType !== undefined) {
    bylineType = requestedBylineType;
  } else if (bylineChanged) {
    bylineType = "person";
  }
  let bylineUrl = currentBylineUrl;
  if (!byline) {
    bylineUrl = null;
  } else if (requestedBylineUrl !== undefined) {
    bylineUrl = optionalText(requestedBylineUrl);
  } else if (bylineChanged) {
    bylineUrl = null;
  }
  return {
    byline,
    bylineType,
    bylineUrl,
    seoDescription:
      update.seoDescription === undefined
        ? article.seoDescription
        : optionalText(update.seoDescription),
    seoTitle:
      update.seoTitle === undefined
        ? article.seoTitle
        : optionalText(update.seoTitle),
  };
};

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

export const success = <T>(data: T): StudioOperationResult<T> => ({
  data,
  ok: true,
});

export const validationIssues = (
  issues: Array<{ message: string; path: PropertyKey[] }>
) =>
  issues.map((issue) => {
    const path = issue.path.map(String).join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

export const contentChanges = (input: {
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

export const hasArticleContentChanged = (
  article: Pick<
    ArticleRecord,
    "bodyJson" | "byline" | "bylineType" | "bylineUrl" | "summary" | "title"
  >,
  next: Pick<
    ArticleRecord,
    "byline" | "bylineType" | "bylineUrl" | "summary" | "title"
  > & { bodyJson: string }
) =>
  article.bodyJson !== next.bodyJson ||
  article.byline !== next.byline ||
  article.bylineType !== next.bylineType ||
  article.bylineUrl !== next.bylineUrl ||
  article.summary !== next.summary ||
  article.title !== next.title;

const hasEditionIdentityChanged = (
  article: ArticleRecord,
  next: Pick<UpdateArticleInput, "language" | "translationKind">
) =>
  next.language !== article.language ||
  next.translationKind !== article.translationKind;

export const resolveEditionIdentity = (
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

export const getPublicationQualityIssues = async (
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

export const resolveTranslationReviewUpdate = async (input: {
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

export const getDependentReviewInvalidationQueries = (input: {
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
    'byline', ${invalidationArticle.byline},
    'bylineType', ${invalidationArticle.bylineType},
    'bylineUrl', ${invalidationArticle.bylineUrl},
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
    'snapshotVersion', 5,
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

export const resolveRestoredTranslationReview = async (
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

export const articlePersistenceQueries = (input: {
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

export const getRevisionCommitConflict = async (input: {
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
