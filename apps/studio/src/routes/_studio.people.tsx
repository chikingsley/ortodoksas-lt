import { siteLocaleSchema } from "@ortodoksas-lt/content/site";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { PeopleDirectoryWorkspace } from "@/editorial/directories/people-directory-workspace";
import { useDirectoryRouteState } from "@/editorial/directories/use-directory-route-state";
import {
  communityDirectoryQueryOptions,
  peopleDirectoryQueryOptions,
} from "@/server/directories/directory.functions";

function PeopleRoute() {
  const { language, record } = Route.useSearch();

  const { changeLanguage, changeRecord, locale } = useDirectoryRouteState({
    language,
    record,
    to: "/people",
  });

  return (
    <PeopleDirectoryWorkspace
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

export const Route = createFileRoute("/_studio/people")({
  component: PeopleRoute,
  loader: async ({ context }) =>
    await Promise.all([
      context.queryClient.query({
        ...peopleDirectoryQueryOptions(),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...communityDirectoryQueryOptions(),
        staleTime: "static",
      }),
    ]),
  validateSearch: (search) => ({
    language: siteLocaleSchema.optional().parse(search.language),
    record: z.string().min(1).optional().parse(search.record),
  }),
});
