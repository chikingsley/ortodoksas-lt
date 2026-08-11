import type { JSONContent } from "@tiptap/core";
import { z } from "zod";

const languageTagPattern =
  /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2}|-[0-9]{3})?$/;

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

export const createArticleSchema = z.object({
  baseline: z
    .object({
      body: tiptapDocumentSchema,
      converterVersion: z.string().trim().min(1).max(80),
      summary: z.string().max(600),
      title: z.string().trim().min(1).max(240),
    })
    .optional(),
  body: tiptapDocumentSchema,
  heroSourceUrl: z.string().trim().min(1).max(4096).optional(),
  kind: z.enum(["article", "page"]).default("article"),
  labels: z.array(z.string().trim().min(1).max(120)).default([]),
  language: z.string().regex(languageTagPattern),
  publishedAt: z.number().int().nonnegative().nullable().optional(),
  section: z.string().trim().max(160).default(""),
  slug: z.string().trim().min(1).max(240),
  sourceArticleId: z.string().trim().min(1).max(512).optional(),
  sourceCapture: z.string().trim().max(4096).optional(),
  sourceHtml: z.string().optional(),
  sourceUrl: z.string().trim().max(4096).optional(),
  status: articleStatusSchema.default("draft"),
  summary: z.string().trim().max(600).default(""),
  title: z.string().trim().min(1).max(240),
  translationGroupId: z.string().uuid().optional(),
  translationKind: translationKindSchema.default("original"),
  translationReviewedAt: z.number().int().nonnegative().nullable().optional(),
  translationReviewedBy: z.string().trim().min(1).max(200).optional(),
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

export const updateArticleSchema = createArticleSchema
  .pick({
    body: true,
    heroSourceUrl: true,
    kind: true,
    labels: true,
    language: true,
    publishedAt: true,
    section: true,
    slug: true,
    status: true,
    summary: true,
    title: true,
    translationGroupId: true,
    translationKind: true,
    translationReviewedAt: true,
    translationReviewedBy: true,
    translationReviewStatus: true,
    translationSourceArticleId: true,
    translationSourceHash: true,
  })
  .extend({
    translationReviewedAt: z.number().int().nonnegative().nullable().optional(),
    translationReviewedBy: z.string().trim().min(1).max(200).optional(),
    translationReviewStatus: translationReviewStatusSchema.optional(),
    translationSourceArticleId: z.string().uuid().optional(),
    translationSourceHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/u)
      .optional(),
  });

export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
