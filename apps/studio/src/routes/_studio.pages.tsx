import { createFileRoute } from "@tanstack/react-router";

import { StudioWorkspace } from "@/editorial/shell/studio-workspace";
import { articleCatalogQueryOptions } from "@/server/article-catalog";

export const Route = createFileRoute("/_studio/pages")({
  component: () => <StudioWorkspace kind="page" view="content" />,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(articleCatalogQueryOptions()),
});
