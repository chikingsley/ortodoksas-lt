import { lazy, Suspense, useCallback, useEffect, useState } from "react";

import { ArticleInventory } from "@/editorial/article-inventory";
import { StudioSidebar } from "@/editorial/studio-sidebar";
import type { CatalogArticle } from "@/editorial/types";
import { useArticleCatalog } from "@/editorial/use-article-catalog";

const ArticleEditor = lazy(() =>
  import("@/editorial/article-editor").then((module) => ({
    default: module.ArticleEditor,
  }))
);

const App = () => {
  const catalog = useArticleCatalog();
  const [selectedArticle, setSelectedArticle] = useState<CatalogArticle | null>(
    null
  );
  useEffect(() => {
    if (catalog.state !== "ready" || selectedArticle) {
      return;
    }
    const file = new URLSearchParams(window.location.search).get("article");
    const requested = catalog.articles.find((article) => article.file === file);
    if (requested) {
      setSelectedArticle(requested);
    }
  }, [catalog, selectedArticle]);

  const openArticle = useCallback((article: CatalogArticle) => {
    window.history.replaceState(
      null,
      "",
      `?article=${encodeURIComponent(article.file)}`
    );
    setSelectedArticle(article);
  }, []);
  const closeArticle = useCallback(() => {
    window.history.replaceState(null, "", window.location.pathname);
    setSelectedArticle(null);
  }, []);

  return (
    <div
      className={
        selectedArticle ? "studio-shell editor-active" : "studio-shell"
      }
    >
      <StudioSidebar />
      <div className="studio-main">
        {selectedArticle ? (
          <Suspense
            fallback={
              <div className="editor-route-loading">Įkeliamas redaktorius…</div>
            }
          >
            <ArticleEditor
              article={selectedArticle}
              key={selectedArticle.file}
              onBack={closeArticle}
            />
          </Suspense>
        ) : (
          <ArticleInventory
            articles={catalog.articles}
            catalogState={catalog.state}
            onOpen={openArticle}
          />
        )}
      </div>
    </div>
  );
};

export default App;
