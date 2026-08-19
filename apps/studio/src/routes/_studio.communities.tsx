import { type SiteLocale, siteLocaleSchema } from "@ortodoksas-lt/content/site";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";

import { DirectoryRouteWorkspace } from "@/editorial/directories/directory-workspace";
import { communityDirectoryQueryOptions } from "@/server/directories/directory.functions";

const CommunitiesRoute = () => {
  const { language, record } = Route.useSearch();
  const navigate = Route.useNavigate();
  const locale = language ?? "lt";
  useEffect(() => {
    if (language) {
      localStorage.setItem("ortodoksas-studio-directory-language", language);
      return;
    }
    const storedLanguage = siteLocaleSchema
      .catch("lt")
      .parse(localStorage.getItem("ortodoksas-studio-directory-language"));
    navigate({
      replace: true,
      search: (current) => ({ ...current, language: storedLanguage }),
    });
  }, [language, navigate]);
  const changeLanguage = useCallback(
    (nextLanguage: SiteLocale) => {
      localStorage.setItem(
        "ortodoksas-studio-directory-language",
        nextLanguage
      );
      navigate({
        replace: true,
        search: (current) => ({ ...current, language: nextLanguage }),
      });
    },
    [navigate]
  );
  const changeRecord = useCallback(
    (nextRecord: string, replace = false) => {
      navigate({
        replace,
        search: (current) => ({ ...current, record: nextRecord }),
      });
    },
    [navigate]
  );
  return (
    <DirectoryRouteWorkspace
      kind="communities"
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
