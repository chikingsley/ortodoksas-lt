import { Outlet, createFileRoute } from "@tanstack/react-router";

import { articleCatalogQueryOptions } from "@/server/articles/article-catalog.functions";

export const Route = createFileRoute("/_studio/articles")({
  component: Outlet,
  loader: async ({ context }) =>
    await context.queryClient.query({
      ...articleCatalogQueryOptions(),
      staleTime: "static",
    }),
});
