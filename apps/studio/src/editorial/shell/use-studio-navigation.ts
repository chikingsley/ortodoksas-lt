import { type SiteLocale, siteLocaleSchema } from "@ortodoksas-lt/content/site";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import type { CatalogArticle } from "@/editorial/articles/types";

import type { StudioView } from "./studio-sidebar";

const DIRECTORY_LANGUAGE_KEY = "ortodoksas-studio-directory-language";

const getContentPath = (kind: CatalogArticle["kind"]) =>
  kind === "page" ? ("/pages" as const) : ("/articles" as const);

const getStudioPath = (
  view: Exclude<StudioView, "team">,
  kind: CatalogArticle["kind"]
) => {
  switch (view) {
    case "communities":
      return "/communities" as const;
    case "homepage":
      return "/homepage" as const;
    case "people":
      return "/people" as const;
    default:
      return getContentPath(kind);
  }
};

export const useStudioNavigation = ({
  activeView,
  contentKind = "article",
  locale,
}: {
  activeView?: StudioView;
  contentKind?: CatalogArticle["kind"];
  locale?: SiteLocale;
} = {}) => {
  const navigate = useNavigate();

  return useCallback(
    (view: StudioView) => {
      if (view === activeView) {
        return;
      }
      if (view === "team") {
        return navigate({ params: { _splat: "members" }, to: "/team/$" });
      }

      const path = getStudioPath(view, contentKind);
      if (view === "people" || view === "communities") {
        const language =
          locale ??
          siteLocaleSchema
            .catch("lt")
            .parse(localStorage.getItem(DIRECTORY_LANGUAGE_KEY));
        return navigate({ search: { language }, to: path });
      }
      return navigate({ to: path });
    },
    [activeView, contentKind, locale, navigate]
  );
};
