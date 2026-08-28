import { siteLocaleSchema } from "@ortodoksas-lt/content/site";
import { createFileRoute } from "@tanstack/react-router";

import { PeopleDirectoryWorkspace } from "@/editorial/directories/people-directory-workspace";
import { useDirectoryRouteState } from "@/editorial/directories/use-directory-route-state";
import {
  communityDirectoryQueryOptions,
  peopleDirectoryQueryOptions,
} from "@/server/directories/directory.functions";

const PeopleRoute = () => {
  const { language, record } = Route.useSearch();
  const { changeLanguage, changeRecord, locale } = useDirectoryRouteState({
    language,
    record,
    to: "/people",
  });
  return (
    <PeopleDirectoryWorkspace
      locale={locale}
      onLocaleChange={changeLanguage}
      onRecordChange={changeRecord}
      recordKey={record}
    />
  );
};

export const Route = createFileRoute("/_studio/people")({
  component: PeopleRoute,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(peopleDirectoryQueryOptions()),
      context.queryClient.ensureQueryData(communityDirectoryQueryOptions()),
    ]),
  validateSearch: (search) => ({
    language: siteLocaleSchema.optional().parse(search.language),
    record:
      typeof search.record === "string" && search.record.length > 0
        ? search.record
        : undefined,
  }),
});
