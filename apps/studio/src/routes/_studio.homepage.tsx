import { createFileRoute } from "@tanstack/react-router";

import { homepagePlacementsQueryOptions } from "@/editorial/homepage/homepage-api";
import { StudioWorkspace } from "@/editorial/shell/studio-workspace";
import { articleCatalogQueryOptions } from "@/server/articles/article-catalog.functions";

export const Route = createFileRoute("/_studio/homepage")({
  component: () => <StudioWorkspace view="homepage" />,
  loader: async ({ context }) =>
    await Promise.all([
      context.queryClient.query({
        ...articleCatalogQueryOptions(),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...homepagePlacementsQueryOptions(),
        staleTime: "static",
      }),
    ]),
});
