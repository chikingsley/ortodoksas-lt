import { useEffect, useState } from "react";

import type { CatalogArticle } from "./types";

type CatalogState =
  | { articles: CatalogArticle[]; state: "ready" }
  | { articles: []; state: "loading" | "error" };

export const useArticleCatalog = (): CatalogState => {
  const [catalog, setCatalog] = useState<CatalogState>({
    articles: [],
    state: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/articles", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Catalog request failed");
        }
        return response.json() as Promise<{
          articles: Array<{
            capture: string | null;
            description: string;
            file: string | null;
            heroMediaId: string | null;
            id: string;
            kind: string;
            labelsJson: string;
            language: string;
            path: string;
            publishedAt: number | null;
            section: string;
            source: string | null;
            status: CatalogArticle["status"];
            title: string;
          }>;
        }>;
      })
      .then(({ articles }) =>
        setCatalog({
          articles: articles.map((article) => ({
            capture: article.capture ?? "",
            description: article.description,
            file: article.file ?? article.id,
            hero: article.heroMediaId
              ? `/api/media/${article.heroMediaId}`
              : null,
            id: article.id,
            kind: article.kind === "page" ? "page" : "article",
            labels: JSON.parse(article.labelsJson) as string[],
            path: `/${article.path}`,
            published: article.publishedAt
              ? new Date(article.publishedAt).toISOString()
              : null,
            section: article.section,
            source: article.source ?? "",
            status: article.status,
            title: article.title,
          })),
          state: "ready",
        })
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setCatalog({ articles: [], state: "error" });
      });

    return () => controller.abort();
  }, []);

  return catalog;
};
