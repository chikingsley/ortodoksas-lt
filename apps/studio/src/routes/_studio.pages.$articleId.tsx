import { createFileRoute } from "@tanstack/react-router";

import { articleWorkspaceQueryOptions } from "@/editorial/articles/editor/article-editor-api";
import { ArticleRouteError } from "@/editorial/articles/editor/article-route-error";
import { StudioWorkspace } from "@/editorial/shell/studio-workspace";
import { articleCatalogQueryOptions } from "@/server/articles/article-catalog.functions";

export const Route = createFileRoute("/_studio/pages/$articleId")({
  component: PageEditorRoute,
  errorComponent: PageError,
  loader: async ({ context, params }) =>
    await Promise.all([
      context.queryClient.query({
        ...articleCatalogQueryOptions(),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...articleWorkspaceQueryOptions(params.articleId),
        staleTime: 0,
      }),
    ]),
  ssr: false,
});

function PageError() {
  return <ArticleRouteError to="/pages" />;
}

function PageEditorRoute() {
  const { articleId } = Route.useParams();

  return <StudioWorkspace articleId={articleId} kind="page" view="editor" />;
}
