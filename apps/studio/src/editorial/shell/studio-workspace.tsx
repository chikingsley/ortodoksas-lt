import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { ArticleInventory } from "@/editorial/articles/inventory/article-inventory";
import type { CatalogArticle } from "@/editorial/articles/types";
import { HomepageWorkspace } from "@/editorial/homepage/homepage-workspace";
import { articleCatalogQueryOptions } from "@/server/article-catalog";
import {
  createArticleMutation,
  createTranslationDraftMutation,
} from "@/server/article-functions";
import { StudioSidebar, type StudioView } from "./studio-sidebar";

const ArticleEditor = lazy(() =>
  import("@/editorial/articles/editor/article-editor").then((module) => ({
    default: module.ArticleEditor,
  }))
);

type WorkspaceRoute =
  | { articleId?: undefined; kind: CatalogArticle["kind"]; view: "content" }
  | { articleId: string; kind: CatalogArticle["kind"]; view: "editor" }
  | { articleId?: undefined; kind?: undefined; view: "homepage" };

const contentPath = (kind: CatalogArticle["kind"]) =>
  kind === "page" ? "/pages" : "/articles";

const sidebarPath = (view: StudioView, kind: CatalogArticle["kind"]) => {
  if (view === "homepage") {
    return "/homepage" as const;
  }
  if (view === "people") {
    return "/people" as const;
  }
  if (view === "communities") {
    return "/communities" as const;
  }
  return contentPath(kind);
};

export const StudioWorkspace = (route: WorkspaceRoute) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: articles } = useSuspenseQuery(articleCatalogQueryOptions());
  const [createError, setCreateError] = useState(false);
  const [creating, setCreating] = useState(false);
  const selectedArticle = useMemo(
    () =>
      route.view === "editor"
        ? (articles.find((article) => article.id === route.articleId) ?? null)
        : null,
    [articles, route]
  );
  const refreshCatalog = useCallback(
    () => queryClient.invalidateQueries(articleCatalogQueryOptions()),
    [queryClient]
  );
  const openArticle = useCallback(
    (article: CatalogArticle) =>
      navigate({
        params: { articleId: article.id },
        to:
          article.kind === "page"
            ? "/pages/$articleId"
            : "/articles/$articleId",
      }),
    [navigate]
  );
  const closeArticle = useCallback(async () => {
    await refreshCatalog();
    await navigate({ to: contentPath(route.kind ?? "article") });
  }, [navigate, refreshCatalog, route.kind]);
  const navigateSidebar = useCallback(
    (view: StudioView) =>
      navigate({
        to: sidebarPath(view, route.kind ?? "article"),
      }),
    [navigate, route.kind]
  );
  const selectContentKind = useCallback(
    (kind: CatalogArticle["kind"]) => navigate({ to: contentPath(kind) }),
    [navigate]
  );
  const createContent = useCallback(
    async (kind: CatalogArticle["kind"]) => {
      setCreateError(false);
      setCreating(true);
      const contentId = crypto.randomUUID();
      const slug = `${kind === "page" ? "p/" : ""}draft-${contentId}`;
      const title = kind === "page" ? "Untitled page" : "Untitled story";
      const section = kind === "page" ? "Tikėjimas ir kultūra" : "Naujienos";
      try {
        const result = await createArticleMutation({
          data: {
            body: { content: [{ type: "paragraph" }], type: "doc" },
            kind,
            language: "lt",
            section,
            slug,
            status: "draft",
            summary: "",
            title,
            translationGroupId: contentId,
          },
        });
        if (!result.ok) {
          throw new Error("Draft creation failed");
        }
        await refreshCatalog();
        await navigate({
          params: { articleId: result.data.id },
          to: kind === "page" ? "/pages/$articleId" : "/articles/$articleId",
        });
      } catch {
        setCreateError(true);
      } finally {
        setCreating(false);
      }
    },
    [navigate, refreshCatalog]
  );
  const createTranslation = useCallback(
    async (source: CatalogArticle, language: "en" | "ru" | "uk" | "be") => {
      const result = await createTranslationDraftMutation({
        data: { articleId: source.id, language },
      });
      if (result.kind !== "created") {
        throw new Error("Translation draft creation failed");
      }
      await refreshCatalog();
      await navigate({
        params: { articleId: result.article.id },
        to:
          source.kind === "page" ? "/pages/$articleId" : "/articles/$articleId",
      });
    },
    [navigate, refreshCatalog]
  );
  const translations = useMemo(
    () =>
      selectedArticle
        ? articles.filter(
            (article) =>
              article.translationGroupId === selectedArticle.translationGroupId
          )
        : [],
    [articles, selectedArticle]
  );

  let workspace =
    route.view === "homepage" ? (
      <HomepageWorkspace articles={articles} />
    ) : (
      <ArticleInventory
        articles={articles}
        catalogState="ready"
        contentKind={route.kind}
        createError={createError}
        creating={creating}
        onContentKindChange={selectContentKind}
        onCreate={createContent}
        onCreateTranslation={createTranslation}
        onOpen={openArticle}
      />
    );
  if (route.view === "editor") {
    workspace = selectedArticle ? (
      <Suspense
        fallback={
          <div className="grid min-h-screen place-items-center text-[13px] text-muted-foreground">
            Įkeliamas redaktorius…
          </div>
        }
      >
        <ArticleEditor
          article={selectedArticle}
          key={selectedArticle.id}
          onBack={closeArticle}
          onCreateTranslation={createTranslation}
          onOpenTranslation={openArticle}
          translations={translations}
        />
      </Suspense>
    ) : (
      <div className="grid min-h-screen place-items-center text-[13px] text-muted-foreground">
        Article unavailable.
      </div>
    );
  }

  return (
    <div
      className={
        route.view === "editor"
          ? "grid min-h-screen grid-cols-[minmax(0,1fr)]"
          : "grid min-h-screen grid-cols-[232px_minmax(0,1fr)] max-[801px]:block max-[1101px]:grid-cols-[196px_minmax(0,1fr)]"
      }
    >
      {route.view === "editor" ? null : (
        <StudioSidebar
          activeView={route.view === "homepage" ? "homepage" : "content"}
          onNavigate={navigateSidebar}
        />
      )}
      <div className="min-w-0">{workspace}</div>
    </div>
  );
};
