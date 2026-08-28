import {
  createInteractiveArticleSchema,
  type TiptapDocument,
  updateArticleSchema,
} from "@ortodoksas-lt/content/article";
import { canonicalizePublicationDocument } from "@ortodoksas-lt/content/publication-link";
import {
  articleBaselines,
  articleContentChanges,
  articleRevisions,
  articles,
  publicationGroups,
} from "@ortodoksas-lt/db";
import { annotateArticleBody } from "@ortodoksas-lt/editor/provenance";
import { and, desc, eq, exists } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import type { StudioDatabase } from "../db.server";
import {
  contentChangeInsertQueries,
  findMediaId,
  hashText,
} from "./article-content.server";
import {
  articlePersistenceQueries,
  contentChanges,
  getDependentReviewInvalidationQueries,
  getPublicationQualityIssues,
  getRevisionCommitConflict,
  hasArticleContentChanged,
  optionalText,
  resolveArticleMetadataUpdate,
  resolveEditionIdentity,
  resolveRestoredTranslationReview,
  resolveTranslationReviewUpdate,
  type StudioOperationResult,
  sanitizeDirectoryBody,
  success,
  validationIssues,
} from "./article-operation-support.server";
import { publicationTimestamp } from "./article-publication.server";
import {
  articleRevisionMetadata,
  parseArticleRevisionMetadata,
} from "./article-revision.server";

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
    byline: optionalText(parsed.data.byline),
    bylineType: parsed.data.bylineType,
    bylineUrl: optionalText(parsed.data.bylineUrl),
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
    seoDescription: optionalText(parsed.data.seoDescription),
    seoTitle: optionalText(parsed.data.seoTitle),
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
  const {
    byline: nextByline,
    bylineType: nextBylineType,
    bylineUrl: nextBylineUrl,
    seoDescription: nextSeoDescription,
    seoTitle: nextSeoTitle,
  } = resolveArticleMetadataUpdate(existingArticle, parsed.data);
  const contentChanged = hasArticleContentChanged(existingArticle, {
    bodyJson,
    byline: nextByline,
    bylineType: nextBylineType,
    bylineUrl: nextBylineUrl,
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
    byline: nextByline,
    bylineType: nextBylineType,
    bylineUrl: nextBylineUrl,
    heroFit: parsed.data.heroFit,
    heroFocalX: parsed.data.heroFocalX,
    heroFocalY: parsed.data.heroFocalY,
    heroMediaId,
    kind: existingArticle.kind,
    labelsJson: JSON.stringify(parsed.data.labels),
    language: parsed.data.language,
    publishedAt,
    section: parsed.data.section,
    seoDescription: nextSeoDescription,
    seoTitle: nextSeoTitle,
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
    byline: metadata.byline,
    bylineType: metadata.bylineType,
    bylineUrl: metadata.bylineUrl,
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
    byline: metadata.byline,
    bylineType: metadata.bylineType,
    bylineUrl: metadata.bylineUrl,
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
