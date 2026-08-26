import type { JSONContent } from "@tiptap/core";
import { z } from "zod";
import { pageTemplateSchema, siteLocaleSchema } from "./site";

export const articleStatusSchema = z.enum([
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const translationKindSchema = z.enum(["original", "human", "machine"]);

export const translationReviewStatusSchema = z.enum([
  "not_required",
  "pending",
  "approved",
  "changes_requested",
]);

export const translationReviewActionSchema = z.enum([
  "approve",
  "request_changes",
  "mark_pending",
]);

export const articleBylineTypeSchema = z.enum(["person", "organization"]);

export const articleBylineUrlSchema = z
  .string()
  .trim()
  .max(4096)
  .refine(
    (value) => {
      if (value === "") {
        return true;
      }
      try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    },
    { error: "Author profile URL must use HTTP or HTTPS" }
  );

const tiptapMarkSchema = z.looseObject({
  attrs: z.record(z.string(), z.unknown()).optional(),
  type: z.string().min(1),
});

const tiptapNodeSchema = z.lazy(() =>
  z.looseObject({
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(tiptapNodeSchema).optional(),
    marks: z.array(tiptapMarkSchema).optional(),
    text: z.string().optional(),
    type: z.string().min(1),
  })
) as z.ZodType<JSONContent>;

export const tiptapDocumentSchema = tiptapNodeSchema.refine(
  (document): document is JSONContent & { type: "doc" } =>
    document.type === "doc",
  { error: "Tiptap document root must use the doc node" }
);

export const createArticleSchema = z.strictObject({
  baseline: z
    .object({
      body: tiptapDocumentSchema,
      converterVersion: z.string().trim().min(1).max(80),
      summary: z.string().max(600),
      title: z.string().trim().min(1).max(240),
    })
    .optional(),
  body: tiptapDocumentSchema,
  byline: z.string().trim().max(200).default(""),
  bylineType: articleBylineTypeSchema.default("person"),
  bylineUrl: articleBylineUrlSchema.default(""),
  heroFit: z.enum(["cover", "contain"]).default("cover"),
  heroFocalX: z.number().int().min(0).max(100).default(50),
  heroFocalY: z.number().int().min(0).max(100).default(50),
  heroSourceUrl: z.string().trim().min(1).max(4096).optional(),
  kind: z.enum(["article", "page"]).default("article"),
  labels: z.array(z.string().trim().min(1).max(120)).default([]),
  language: siteLocaleSchema,
  pageTemplate: pageTemplateSchema.default("standard"),
  publishedAt: z.number().int().nonnegative().nullable().optional(),
  section: z.string().trim().max(160).default(""),
  seoDescription: z.string().trim().max(600).default(""),
  seoTitle: z.string().trim().max(240).default(""),
  slug: z.string().trim().min(1).max(240),
  status: articleStatusSchema.default("draft"),
  summary: z.string().trim().max(600).default(""),
  title: z.string().trim().min(1).max(240),
  translationGroupId: z.string().uuid().optional(),
  translationKind: translationKindSchema.default("original"),
  translationReviewStatus:
    translationReviewStatusSchema.default("not_required"),
  translationSourceArticleId: z.string().uuid().optional(),
  translationSourceHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/u)
    .optional(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type TiptapDocument = z.infer<typeof tiptapDocumentSchema>;

export const createInteractiveArticleSchema = createArticleSchema
  .omit({
    translationKind: true,
    translationReviewStatus: true,
    translationSourceArticleId: true,
    translationSourceHash: true,
  })
  .extend({ language: z.literal("lt") });

export const createTranslationDraftSchema = z.object({
  language: z.enum(["en", "ru", "uk", "be"]),
});

export const updateArticleSchema = createArticleSchema
  .pick({
    body: true,
    byline: true,
    bylineType: true,
    bylineUrl: true,
    heroFit: true,
    heroFocalX: true,
    heroFocalY: true,
    heroSourceUrl: true,
    labels: true,
    language: true,
    publishedAt: true,
    section: true,
    seoDescription: true,
    seoTitle: true,
    slug: true,
    status: true,
    summary: true,
    title: true,
    translationKind: true,
  })
  .extend({
    byline: z.string().trim().max(200).optional(),
    bylineType: articleBylineTypeSchema.optional(),
    bylineUrl: articleBylineUrlSchema.optional(),
    expectedTranslationSourceHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/u)
      .optional(),
    expectedVersion: z.number().int().nonnegative(),
    seoDescription: z.string().trim().max(600).optional(),
    seoTitle: z.string().trim().max(240).optional(),
    translationReviewAction: translationReviewActionSchema.optional(),
  });

export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
