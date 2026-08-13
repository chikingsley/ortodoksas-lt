import { createFileRoute } from "@tanstack/react-router";

import { StudioWorkspace } from "@/editorial/shell/studio-workspace";
import { articleCatalogQueryOptions } from "@/server/article-catalog";

export const Route = createFileRoute("/_studio/articles/$articleId")({
  component: ArticleEditorRoute,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(articleCatalogQueryOptions()),
  ssr: false,
});

function ArticleEditorRoute() {
  const { articleId } = Route.useParams();
  return <StudioWorkspace articleId={articleId} kind="article" view="editor" />;
}
