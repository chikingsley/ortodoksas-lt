import type { articles } from "@ortodoksas-lt/db";
import { z } from "zod";

type ArticleRecord = typeof articles.$inferSelect;

const articleRevisionMetadataSchema = z.looseObject({
  heroFit: z.enum(["contain", "cover"]).optional(),
  heroFocalX: z.number().int().optional(),
  heroFocalY: z.number().int().optional(),
  heroMediaId: z.string().nullable().optional(),
  kind: z.enum(["article", "page"]).optional(),
  labels: z.array(z.string()).optional(),
  language: z.string().optional(),
  publishedAt: z.number().int().nullable().optional(),
  section: z.string().optional(),
  seoDescription: z.string().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  slug: z.string().optional(),
  snapshotCompleteness: z.enum(["complete", "legacy_partial"]).optional(),
  snapshotVersion: z.literal(2).optional(),
  sourceArticleId: z.string().nullable().optional(),
  sourceCapture: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  status: z.enum(["archived", "draft", "published", "scheduled"]).optional(),
  summary: z.string().optional(),
  title: z.string().optional(),
  translationGroupId: z.string().optional(),
  translationKind: z.enum(["human", "machine", "original"]).optional(),
  translationReviewedAt: z.number().int().nullable().optional(),
  translationReviewedBy: z.string().nullable().optional(),
  translationReviewStatus: z
    .enum(["approved", "changes_requested", "not_required", "pending"])
    .optional(),
  translationSourceArticleId: z.string().nullable().optional(),
  translationSourceHash: z.string().nullable().optional(),
});

export interface ArticleRevisionMetadata {
  heroFit: "contain" | "cover";
  heroFocalX: number;
  heroFocalY: number;
  heroMediaId: string | null;
  kind: "article" | "page";
  labels: string[];
  language: string;
  publishedAt: number | null;
  section: string;
  seoDescription: string | null;
  seoTitle: string | null;
  slug: string;
  snapshotCompleteness: "complete" | "legacy_partial";
  snapshotVersion: 2;
  sourceArticleId: string | null;
  sourceCapture: string | null;
  sourceUrl: string | null;
  status: "archived" | "draft" | "published" | "scheduled";
  summary: string;
  title: string;
  translationGroupId: string;
  translationKind: "human" | "machine" | "original";
  translationReviewedAt: number | null;
  translationReviewedBy: string | null;
  translationReviewStatus:
    | "approved"
    | "changes_requested"
    | "not_required"
    | "pending";
  translationSourceArticleId: string | null;
  translationSourceHash: string | null;
}

const parseLabels = (labelsJson: string): string[] => {
  const labels: unknown = JSON.parse(labelsJson);
  return Array.isArray(labels)
    ? labels.filter((label): label is string => typeof label === "string")
    : [];
};

export const articleRevisionMetadata = (
  article: ArticleRecord
): ArticleRevisionMetadata => ({
  heroFit: article.heroFit === "contain" ? "contain" : "cover",
  heroFocalX: article.heroFocalX,
  heroFocalY: article.heroFocalY,
  heroMediaId: article.heroMediaId,
  kind: article.kind === "page" ? "page" : "article",
  labels: parseLabels(article.labelsJson),
  language: article.language,
  publishedAt: article.publishedAt,
  section: article.section,
  seoDescription: article.seoDescription,
  seoTitle: article.seoTitle,
  slug: article.slug,
  snapshotCompleteness: "complete",
  snapshotVersion: 2,
  sourceArticleId: article.sourceArticleId,
  sourceCapture: article.sourceCapture,
  sourceUrl: article.sourceUrl,
  status:
    article.status === "archived" ||
    article.status === "published" ||
    article.status === "scheduled"
      ? article.status
      : "draft",
  summary: article.summary,
  title: article.title,
  translationGroupId: article.translationGroupId,
  translationKind:
    article.translationKind === "human" || article.translationKind === "machine"
      ? article.translationKind
      : "original",
  translationReviewedAt: article.translationReviewedAt,
  translationReviewedBy: article.translationReviewedBy,
  translationReviewStatus:
    article.translationReviewStatus === "approved" ||
    article.translationReviewStatus === "changes_requested" ||
    article.translationReviewStatus === "pending"
      ? article.translationReviewStatus
      : "not_required",
  translationSourceArticleId: article.translationSourceArticleId,
  translationSourceHash: article.translationSourceHash,
});

export const parseArticleRevisionMetadata = (
  metadataJson: string,
  currentArticle: ArticleRecord
): ArticleRevisionMetadata => {
  const fallback = articleRevisionMetadata(currentArticle);
  const parsed = articleRevisionMetadataSchema.safeParse(
    JSON.parse(metadataJson)
  );
  return parsed.success ? { ...fallback, ...parsed.data } : fallback;
};
