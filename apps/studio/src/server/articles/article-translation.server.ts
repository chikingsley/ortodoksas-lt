import type {
  TiptapDocument,
  UpdateArticleInput,
} from "@ortodoksas-lt/content/article";
import {
  articleBaselines,
  articleRevisions,
  articles,
} from "@ortodoksas-lt/db";
import { and, eq } from "drizzle-orm";

import type { StudioDatabase } from "../db.server";
import { hashText } from "./article-content.server";
import { articleRevisionMetadata } from "./article-revision.server";

export type TranslationDraftLanguage = "be" | "en" | "ru" | "uk";

type TranslationReviewAction = UpdateArticleInput["translationReviewAction"];

export type TranslationDraftResult =
  | {
      article: {
        heroMediaId: string | null;
        id: string;
        language: TranslationDraftLanguage;
        slug: string;
        title: string;
        translationGroupId: string;
      };
      kind: "created";
    }
  | { kind: "edition_exists"; articleId: string }
  | { kind: "source_unavailable" };

const EMPTY_DOCUMENT: TiptapDocument = {
  content: [{ type: "paragraph" }],
  type: "doc",
};

export const translationMetadataUpdate = (
  input: {
    action: TranslationReviewAction;
    contentChanged: boolean;
    currentStatus: string;
  },
  reviewer: { editorId: string; timestamp: number }
) => {
  const update: {
    translationReviewStatus?:
      | "approved"
      | "changes_requested"
      | "not_required"
      | "pending";
    translationReviewedAt?: number | null;
    translationReviewedBy?: string | null;
  } = {};
  if (input.action === "approve") {
    update.translationReviewStatus = "approved";
    update.translationReviewedAt = reviewer.timestamp;
    update.translationReviewedBy = reviewer.editorId;
  } else if (input.action === "request_changes") {
    update.translationReviewStatus = "changes_requested";
    update.translationReviewedAt = null;
    update.translationReviewedBy = null;
  } else if (
    input.action === "mark_pending" ||
    (input.contentChanged && input.currentStatus === "approved")
  ) {
    update.translationReviewStatus = "pending";
    update.translationReviewedAt = null;
    update.translationReviewedBy = null;
  }
  return update;
};

export const getTranslationSourceHash = (source: {
  bodyJson: string;
  byline: string | null;
  bylineType: string;
  bylineUrl: string | null;
  summary: string;
  title: string;
}) =>
  hashText(
    JSON.stringify({
      body: JSON.parse(source.bodyJson) as TiptapDocument,
      byline: source.byline,
      bylineType: source.bylineType,
      bylineUrl: source.bylineUrl,
      summary: source.summary,
      title: source.title,
    })
  );

export const createTranslationDraft = async (input: {
  database: StudioDatabase;
  editorId: string;
  language: TranslationDraftLanguage;
  sourceArticleId: string;
}): Promise<TranslationDraftResult> => {
  const requestedSource = await input.database.query.articles.findFirst({
    where: eq(articles.id, input.sourceArticleId),
  });
  if (!requestedSource) {
    return { kind: "source_unavailable" };
  }

  const source =
    (await input.database.query.articles.findFirst({
      where: and(
        eq(articles.translationGroupId, requestedSource.translationGroupId),
        eq(articles.language, "lt")
      ),
    })) ?? requestedSource;
  const existing = await input.database.query.articles.findFirst({
    where: and(
      eq(articles.translationGroupId, source.translationGroupId),
      eq(articles.language, input.language)
    ),
  });
  if (existing) {
    return { articleId: existing.id, kind: "edition_exists" };
  }

  const id = crypto.randomUUID();
  const timestamp = Date.now();
  const bodyJson = JSON.stringify(EMPTY_DOCUMENT);
  const title = `Untitled ${input.language.toUpperCase()} translation`;
  const slug = `${source.kind === "page" ? "p/" : ""}draft-${id}`;
  const sourceHash = await getTranslationSourceHash(source);
  const articleRecord: typeof articles.$inferSelect = {
    bodyJson,
    byline: source.byline,
    bylineType: source.bylineType,
    bylineUrl: source.bylineUrl,
    createdAt: timestamp,
    heroFit: source.heroFit,
    heroFocalX: source.heroFocalX,
    heroFocalY: source.heroFocalY,
    heroMediaId: source.heroMediaId,
    id,
    kind: source.kind,
    labelsJson: source.labelsJson,
    language: input.language,
    publishedAt: null,
    section: source.section,
    seoDescription: null,
    seoTitle: null,
    slug,
    status: "draft",
    summary: "",
    title,
    translationGroupId: source.translationGroupId,
    translationKind: "human",
    translationReviewedAt: null,
    translationReviewedBy: null,
    translationReviewStatus: "pending",
    translationSourceArticleId: source.id,
    translationSourceHash: sourceHash,
    updatedAt: timestamp,
  };

  try {
    await input.database.batch([
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
        bodyJson,
        converterVersion: "native-translation-draft-v1",
        createdAt: timestamp,
        sourceHash: await hashText(
          JSON.stringify({ body: EMPTY_DOCUMENT, summary: "", title })
        ),
        summary: "",
        title,
      }),
    ]);
  } catch (error: unknown) {
    const conflictingEdition = await input.database.query.articles.findFirst({
      where: and(
        eq(articles.translationGroupId, source.translationGroupId),
        eq(articles.language, input.language)
      ),
    });
    if (conflictingEdition) {
      return { articleId: conflictingEdition.id, kind: "edition_exists" };
    }
    throw error;
  }

  return {
    article: {
      heroMediaId: source.heroMediaId,
      id,
      language: input.language,
      slug,
      title,
      translationGroupId: source.translationGroupId,
    },
    kind: "created",
  };
};
