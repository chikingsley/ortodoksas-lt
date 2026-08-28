import {
  articleBaselines,
  articleContentChanges,
  articleRevisions,
  articles,
} from "@ortodoksas-lt/db";
import { asc, desc, eq } from "drizzle-orm";

import type { StudioDatabase } from "../db.server";
import { getTranslationSourceHash } from "./article-translation.server";

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
