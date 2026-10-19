import { siteLocaleSchema } from "@ortodoksas-lt/content/site";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CommunitiesDirectoryWorkspace } from "@/editorial/directories/communities-directory-workspace";
import { useDirectoryRouteState } from "@/editorial/directories/use-directory-route-state";
import { communityDirectoryQueryOptions } from "@/server/directories/directory.functions";

function CommunitiesRoute() {
  const { language, record } = Route.useSearch();

  const { changeLanguage, changeRecord, locale } = useDirectoryRouteState({
    language,
    record,
    to: "/communities",
  });

  return (
    <CommunitiesDirectoryWorkspace
      locale={locale}
      onLocaleChange={(nextLocale) => {
        void changeLanguage(nextLocale);
      }}
      onRecordChange={(nextRecord, replace) => {
        void changeRecord(nextRecord, replace);
      }}
      recordKey={record}
    />
  );
}

export const Route = createFileRoute("/_studio/communities")({
  component: CommunitiesRoute,
  loader: async ({ context }) =>
    await context.queryClient.query({
      ...communityDirectoryQueryOptions(),
      staleTime: "static",
    }),
  validateSearch: (search) => ({
    language: siteLocaleSchema.optional().parse(search.language),
    record: z.string().min(1).optional().parse(search.record),
  }),
});
