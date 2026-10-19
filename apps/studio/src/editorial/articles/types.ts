import {
  articleStatusSchema,
  translationKindSchema,
  translationReviewStatusSchema,
} from "@ortodoksas-lt/content/article";
import { siteLocaleSchema } from "@ortodoksas-lt/content/site";
import { z } from "zod";

export const catalogArticleSchema = z.object({
  description: z.string(),
  hero: z.string().nullable(),
  id: z.string(),
  kind: z.enum(["article", "page"]),
  labels: z.array(z.string()),
  language: siteLocaleSchema,
  path: z.string(),
  published: z.string().nullable(),
  section: z.string(),
  status: articleStatusSchema,
  thumbnail: z.string().nullable(),
  title: z.string(),
  translationGroupId: z.string(),
  translationKind: translationKindSchema,
  translationReviewStatus: translationReviewStatusSchema,
});

export type CatalogArticle = z.infer<typeof catalogArticleSchema>;
