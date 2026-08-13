import { createFileRoute } from "@tanstack/react-router";

import { homepagePlacementsQueryOptions } from "@/editorial/homepage/homepage-api";
import { StudioWorkspace } from "@/editorial/shell/studio-workspace";
import { articleCatalogQueryOptions } from "@/server/article-catalog";

export const Route = createFileRoute("/_studio/homepage")({
  component: () => <StudioWorkspace view="homepage" />,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(articleCatalogQueryOptions()),
      context.queryClient.ensureQueryData(homepagePlacementsQueryOptions()),
    ]),
});
