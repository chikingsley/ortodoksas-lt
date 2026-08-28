import { createFileRoute } from "@tanstack/react-router";

import { articleWorkspaceQueryOptions } from "@/editorial/articles/editor/article-editor-api";
import { ArticleRouteError } from "@/editorial/articles/editor/article-route-error";
import { StudioWorkspace } from "@/editorial/shell/studio-workspace";
import { articleCatalogQueryOptions } from "@/server/articles/article-catalog.functions";

export const Route = createFileRoute("/_studio/articles/$articleId")({
  component: ArticleEditorRoute,
  errorComponent: ArticleError,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(articleCatalogQueryOptions()),
      context.queryClient.fetchQuery({
        ...articleWorkspaceQueryOptions(params.articleId),
        staleTime: 0,
      }),
    ]),
  ssr: false,
});

function ArticleError() {
  return <ArticleRouteError to="/articles" />;
}

function ArticleEditorRoute() {
  const { articleId } = Route.useParams();
  return <StudioWorkspace articleId={articleId} kind="article" view="editor" />;
}
