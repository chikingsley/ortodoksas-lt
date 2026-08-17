import { createFileRoute, Outlet } from "@tanstack/react-router";

import { articleCatalogQueryOptions } from "@/server/article-catalog";

export const Route = createFileRoute("/_studio/articles")({
  component: Outlet,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(articleCatalogQueryOptions()),
});
