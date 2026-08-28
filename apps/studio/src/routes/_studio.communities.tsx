import { siteLocaleSchema } from "@ortodoksas-lt/content/site";
import { createFileRoute } from "@tanstack/react-router";

import { CommunitiesDirectoryWorkspace } from "@/editorial/directories/communities-directory-workspace";
import { useDirectoryRouteState } from "@/editorial/directories/use-directory-route-state";
import { communityDirectoryQueryOptions } from "@/server/directories/directory.functions";

const CommunitiesRoute = () => {
  const { language, record } = Route.useSearch();
  const { changeLanguage, changeRecord, locale } = useDirectoryRouteState({
    language,
    record,
    to: "/communities",
  });
  return (
    <CommunitiesDirectoryWorkspace
      locale={locale}
      onLocaleChange={changeLanguage}
      onRecordChange={changeRecord}
      recordKey={record}
    />
  );
};

export const Route = createFileRoute("/_studio/communities")({
  component: CommunitiesRoute,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(communityDirectoryQueryOptions()),
  validateSearch: (search) => ({
    language: siteLocaleSchema.optional().parse(search.language),
    record:
      typeof search.record === "string" && search.record.length > 0
        ? search.record
        : undefined,
  }),
});
