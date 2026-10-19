import { siteLocaleSchema } from "@ortodoksas-lt/content/site";
import { z } from "zod";

export const storedArticleSchema = z.object({
  bodyJson: z.string(),
  byline: z.string().nullable(),
  bylineType: z.enum(["organization", "person"]),
  bylineUrl: z.string().nullable(),
  heroFit: z.enum(["contain", "cover"]),
  heroFocalX: z.number(),
  heroFocalY: z.number(),
  heroMediaId: z.string().nullable(),
  id: z.string(),
  kind: z.enum(["article", "page"]),
  labelsJson: z.string(),
  language: siteLocaleSchema,
  publishedAt: z.number().nullable(),
  section: z.string(),
  seoDescription: z.string().nullable(),
  seoTitle: z.string().nullable(),
  slug: z.string(),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  summary: z.string(),
  title: z.string(),
  translationGroupId: z.string(),
  translationKind: z.enum(["original", "human", "machine"]),
  translationReviewStatus: z.enum([
    "approved",
    "changes_requested",
    "not_required",
    "pending",
  ]),
  translationReviewedAt: z.number().nullable(),
  translationReviewedBy: z.string().nullable(),
  translationSourceArticleId: z.string().nullable(),
  translationSourceHash: z.string().nullable(),
});

export const contentChangeSchema = z.object({
  after_value: z.string().nullable(),
  before_value: z.string().nullable(),
  change_kind: z.enum(["added", "changed", "removed"]),
  field_path: z.string(),
  provenance: z.enum(["generated", "manual", "normalized"]),
});

export const persistedArticleSchema = storedArticleSchema
  .pick({
    heroMediaId: true,
    id: true,
    publishedAt: true,
    status: true,
    translationReviewStatus: true,
  })
  .extend({ version: z.number().int().nonnegative() });

export type PersistedArticle = z.infer<typeof persistedArticleSchema>;
