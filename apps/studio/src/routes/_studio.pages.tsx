import { createFileRoute, Outlet } from "@tanstack/react-router";

import { articleCatalogQueryOptions } from "@/server/articles/article-catalog.functions";

export const Route = createFileRoute("/_studio/pages")({
  component: Outlet,
  loader: async ({ context }) =>
    context.queryClient.ensureQueryData(articleCatalogQueryOptions()),
});
