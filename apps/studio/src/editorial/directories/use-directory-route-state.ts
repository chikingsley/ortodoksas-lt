import { type SiteLocale, siteLocaleSchema } from "@ortodoksas-lt/content/site";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";

const DIRECTORY_LANGUAGE_KEY = "ortodoksas-studio-directory-language";

type DirectoryPath = "/communities" | "/people";

export const useDirectoryRouteState = ({
  language,
  record,
  to,
}: {
  language?: SiteLocale;
  record?: string;
  to: DirectoryPath;
}) => {
  const navigate = useNavigate();
  const locale = language ?? "lt";

  useEffect(() => {
    if (language) {
      localStorage.setItem(DIRECTORY_LANGUAGE_KEY, language);
      return;
    }
    const storedLanguage = siteLocaleSchema
      .catch("lt")
      .parse(localStorage.getItem(DIRECTORY_LANGUAGE_KEY));
    navigate({
      replace: true,
      search: { language: storedLanguage, record },
      to,
    });
  }, [language, navigate, record, to]);

  const changeLanguage = useCallback(
    (nextLanguage: SiteLocale) => {
      localStorage.setItem(DIRECTORY_LANGUAGE_KEY, nextLanguage);
      return navigate({
        replace: true,
        search: { language: nextLanguage, record },
        to,
      });
    },
    [navigate, record, to]
  );

  const changeRecord = useCallback(
    (nextRecord: string, replace = false) =>
      navigate({
        replace,
        search: { language: locale, record: nextRecord },
        to,
      }),
    [locale, navigate, to]
  );

  return { changeLanguage, changeRecord, locale, record };
};
