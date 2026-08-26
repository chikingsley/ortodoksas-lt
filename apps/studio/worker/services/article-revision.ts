import type { articles } from "@ortodoksas-lt/db";
import { z } from "zod";

type ArticleRecord = typeof articles.$inferSelect;

const articleRevisionMetadataSchema = z.looseObject({
  byline: z.string().nullable().optional(),
  bylineType: z.enum(["organization", "person"]).optional(),
  bylineUrl: z.string().nullable().optional(),
  heroFit: z.enum(["contain", "cover"]).optional(),
  heroFocalX: z.number().int().optional(),
  heroFocalY: z.number().int().optional(),
  heroMediaId: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  language: z.string().optional(),
  publishedAt: z.number().int().nullable().optional(),
  section: z.string().optional(),
  seoDescription: z.string().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  slug: z.string().optional(),
  snapshotCompleteness: z.enum(["complete", "legacy_partial"]).optional(),
  snapshotVersion: z
    .union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .optional(),
  status: z.enum(["archived", "draft", "published", "scheduled"]).optional(),
  summary: z.string().optional(),
  title: z.string().optional(),
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
  byline: string | null;
  bylineType: "organization" | "person";
  bylineUrl: string | null;
  heroFit: "contain" | "cover";
  heroFocalX: number;
  heroFocalY: number;
  heroMediaId: string | null;
  labels: string[];
  language: string;
  publishedAt: number | null;
  section: string;
  seoDescription: string | null;
  seoTitle: string | null;
  slug: string;
  snapshotCompleteness: "complete" | "legacy_partial";
  snapshotVersion: 5;
  status: "archived" | "draft" | "published" | "scheduled";
  summary: string;
  title: string;
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
  byline: article.byline,
  bylineType: article.bylineType === "organization" ? "organization" : "person",
  bylineUrl: article.bylineUrl,
  heroFit: article.heroFit === "contain" ? "contain" : "cover",
  heroFocalX: article.heroFocalX,
  heroFocalY: article.heroFocalY,
  heroMediaId: article.heroMediaId,
  labels: parseLabels(article.labelsJson),
  language: article.language,
  publishedAt: article.publishedAt,
  section: article.section,
  seoDescription: article.seoDescription,
  seoTitle: article.seoTitle,
  slug: article.slug,
  snapshotCompleteness: "complete",
  snapshotVersion: 5,
  status:
    article.status === "archived" ||
    article.status === "published" ||
    article.status === "scheduled"
      ? article.status
      : "draft",
  summary: article.summary,
  title: article.title,
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
  return parsed.success
    ? { ...fallback, ...parsed.data, snapshotVersion: 5 }
    : fallback;
};
