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

    fetch("/content/catalog.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Catalog request failed");
        }
        return response.json() as Promise<CatalogArticle[]>;
      })
      .then((articles) => setCatalog({ articles, state: "ready" }))
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
