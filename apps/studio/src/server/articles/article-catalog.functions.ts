import {
  articleStatusSchema,
  translationKindSchema,
  translationReviewStatusSchema,
} from "@ortodoksas-lt/content/article";
import { articles, publicationGroups } from "@ortodoksas-lt/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { catalogArticleSchema } from "@/editorial/articles/types";
import type { CatalogArticle } from "@/editorial/articles/types";

import { requireStudioEditor } from "../auth";
import { getDatabase } from "../db.server";

const getArticleCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogArticle[]> => {
    await requireStudioEditor(env);

    const revision = await env.DB.prepare(
      "SELECT revision FROM publication_state WHERE id = 1"
    ).first<number>("revision");

    if (revision === null) {
      throw new Error(
        "Apply the publication read-budget migration before deployment."
      );
    }

    const key = new Request(
      new URL(
        `/__editorial/catalog?revision=${revision}`,
        env.PUBLICATION_ORIGIN
      )
    );

    const cache = await caches.open("editorial-catalog-v1");
    const cached = await cache.match(key);

    if (cached) {
      return catalogArticleSchema.array().parse(await cached.json());
    }

    const result = await getDatabase(env.DB)
      .select({
        description: articles.summary,
        heroMediaId: articles.heroMediaId,
        id: articles.id,
        kind: publicationGroups.kind,
        labelsJson: articles.labelsJson,
        language: articles.language,
        path: articles.slug,
        publishedAt: articles.publishedAt,
        section: articles.section,
        status: articles.status,
        title: articles.title,
        translationGroupId: articles.translationGroupId,
        translationKind: articles.translationKind,
        translationReviewStatus: articles.translationReviewStatus,
      })
      .from(articles)
      .innerJoin(
        publicationGroups,
        eq(publicationGroups.id, articles.translationGroupId)
      )
      .orderBy(desc(articles.updatedAt));

    const catalog: CatalogArticle[] = result.map((article) => ({
      description: article.description,
      hero: article.heroMediaId ? `/api/media/${article.heroMediaId}` : null,
      id: article.id,
      kind: article.kind === "page" ? "page" : "article",
      labels: z.array(z.string()).parse(JSON.parse(article.labelsJson)),
      language: article.language,
      path: `/${article.path}`,
      published: article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : null,
      section: article.section,
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

    await cache.put(
      key,
      Response.json(catalog, { headers: { "Cache-Control": "max-age=300" } })
    );

    return catalog;
  }
);

export const articleCatalogQueryOptions = () =>
  queryOptions({
    queryFn: async () => getArticleCatalog(),
    queryKey: ["studio", "articles"] as const,
    staleTime: 30_000,
  });
