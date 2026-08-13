import { createFileRoute } from "@tanstack/react-router";

import { StudioWorkspace } from "@/editorial/shell/studio-workspace";
import { articleCatalogQueryOptions } from "@/server/article-catalog";

export const Route = createFileRoute("/_studio/pages/$articleId")({
  component: PageEditorRoute,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(articleCatalogQueryOptions()),
  ssr: false,
});

function PageEditorRoute() {
  const { articleId } = Route.useParams();
  return <StudioWorkspace articleId={articleId} kind="page" view="editor" />;
}
