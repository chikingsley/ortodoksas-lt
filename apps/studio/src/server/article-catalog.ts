import { env } from "cloudflare:workers";
import {
  articleStatusSchema,
  translationKindSchema,
  translationReviewStatusSchema,
} from "@ortodoksas-lt/content/article";
import { articles } from "@ortodoksas-lt/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { desc } from "drizzle-orm";

import type { CatalogArticle } from "@/editorial/articles/types";
import { getDatabase } from "../../worker/db";
import { requireStudioEditor } from "./auth";

const getArticleCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogArticle[]> => {
    await requireStudioEditor(env);
    const result = await getDatabase(env.DB)
      .select({
        capture: articles.sourceCapture,
        description: articles.summary,
        file: articles.sourceArticleId,
        heroMediaId: articles.heroMediaId,
        id: articles.id,
        kind: articles.kind,
        labelsJson: articles.labelsJson,
        language: articles.language,
        path: articles.slug,
        publishedAt: articles.publishedAt,
        section: articles.section,
        source: articles.sourceUrl,
        status: articles.status,
        title: articles.title,
        translationGroupId: articles.translationGroupId,
        translationKind: articles.translationKind,
        translationReviewStatus: articles.translationReviewStatus,
      })
      .from(articles)
      .orderBy(desc(articles.updatedAt));

    return result.map((article) => ({
      capture: article.capture ?? "",
      description: article.description,
      file: article.file ?? article.id,
      hero: article.heroMediaId ? `/api/media/${article.heroMediaId}` : null,
      id: article.id,
      kind: article.kind === "page" ? "page" : "article",
      labels: JSON.parse(article.labelsJson) as string[],
      language: article.language,
      path: `/${article.path}`,
      published: article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : null,
      section: article.section,
      source: article.source ?? "",
      status: articleStatusSchema.parse(article.status),
      thumbnail: article.heroMediaId
        ? `/api/media/${article.heroMediaId}`
        : null,
      title: article.title,
      translationGroupId: article.translationGroupId,
      translationKind: translationKindSchema.parse(article.translationKind),
      translationReviewStatus: translationReviewStatusSchema.parse(
        article.translationReviewStatus
      ),
    }));
  }
);

export const articleCatalogQueryOptions = () =>
  queryOptions({
    queryFn: () => getArticleCatalog(),
    queryKey: ["studio", "articles"] as const,
  });
