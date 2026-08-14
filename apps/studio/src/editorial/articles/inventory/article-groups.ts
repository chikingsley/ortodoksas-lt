import { type SiteLocale, siteLocales } from "@ortodoksas-lt/content/site";
import type { CatalogArticle } from "../types";

export const EDITION_LANGUAGES = siteLocales;

export type EditionLanguage = SiteLocale;

export const PAGE_ROLE_ORDER = [
  "navigation",
  "library",
  "archive",
  "profile-redirect",
  "other",
] as const;

export type PageRole = (typeof PAGE_ROLE_ORDER)[number];

const pagePathsByRole: Record<PageRole, string[]> = {
  archive: ["/p/paskaitos"],
  library: [
    "/p/biblijos-komentarai",
    "/p/kasdiene-duona",
    "/p/katekizmas_12",
    "/p/natos",
    "/p/liturgika",
    "/p/sventuju-kankiniu",
    "/p/ortodoksu-terminu-zodynaw",
    "/p/dokumentu-puslapis",
    "/p/blog-page",
    "/p/dvasingumas",
  ],
  navigation: [
    "/p/bendruomenes_21",
    "/p/dvasininkai",
    "/p/biblioteka",
    "/p/kalendorius",
    "/p/kontaktai_30",
    "/p/paremti",
  ],
  other: [],
  "profile-redirect": ["/p/apie-mane"],
};

const roleByPagePath = new Map<string, PageRole>(
  Object.entries(pagePathsByRole).flatMap(([role, paths]) =>
    paths.map((path) => [path, role as PageRole])
  )
);

export const PAGE_ROLE_LABELS: Record<PageRole, string> = {
  archive: "Archive",
  library: "Library",
  navigation: "Navigation",
  other: "Other pages",
  "profile-redirect": "Profile & redirect",
};

export const PAGE_ROLE_DESCRIPTIONS: Record<PageRole, string> = {
  archive: "Dated historical collections preserved with their deep links.",
  library: "Reference collections organized under Biblioteka.",
  navigation: "Live destinations in the public header or footer.",
  other: "Additional live pages outside the current public structure.",
  "profile-redirect":
    "Biography content moving into a contributor profile with a route redirect.",
};

export interface ArticleGroup {
  editions: Partial<Record<EditionLanguage, CatalogArticle>>;
  id: string;
  latestPublished: string | null;
  representative: CatalogArticle;
}

export interface PageRoleGroup {
  description: string;
  groups: ArticleGroup[];
  label: string;
  role: PageRole;
}

export const getPageRole = (path: string): PageRole =>
  roleByPagePath.get(path) ?? "other";

export const groupPagesByRole = (
  articleGroups: ArticleGroup[],
  includeEmptyRoles = true
): PageRoleGroup[] => {
  const grouped = new Map<PageRole, ArticleGroup[]>(
    PAGE_ROLE_ORDER.map((role) => [role, []])
  );

  for (const group of articleGroups) {
    grouped.get(getPageRole(group.representative.path))?.push(group);
  }

  return PAGE_ROLE_ORDER.map((role) => ({
    description: PAGE_ROLE_DESCRIPTIONS[role],
    groups: (grouped.get(role) ?? []).toSorted((left, right) => {
      const canonicalOrder = pagePathsByRole[role];
      const leftIndex = canonicalOrder.indexOf(left.representative.path);
      const rightIndex = canonicalOrder.indexOf(right.representative.path);
      if (leftIndex >= 0 || rightIndex >= 0) {
        return (
          (leftIndex >= 0 ? leftIndex : Number.MAX_SAFE_INTEGER) -
          (rightIndex >= 0 ? rightIndex : Number.MAX_SAFE_INTEGER)
        );
      }
      return left.representative.title.localeCompare(
        right.representative.title,
        "lt"
      );
    }),
    label: PAGE_ROLE_LABELS[role],
    role,
  })).filter(({ groups: roleGroups, role }) => {
    if (role === "other") {
      return roleGroups.length > 0;
    }
    return includeEmptyRoles || roleGroups.length > 0;
  });
};

const preferredRepresentative = (articles: CatalogArticle[]) =>
  articles.find((article) => article.language === "lt") ??
  articles.find((article) => article.translationKind === "original") ??
  articles[0];

export const groupArticles = (articles: CatalogArticle[]): ArticleGroup[] => {
  const grouped = new Map<string, CatalogArticle[]>();

  for (const article of articles) {
    const key = article.translationGroupId || `article:${article.id}`;
    const editions = grouped.get(key);
    if (editions) {
      editions.push(article);
    } else {
      grouped.set(key, [article]);
    }
  }

  return [...grouped.entries()]
    .map(([id, editions]) => {
      const sortedEditions = editions.toSorted((left, right) =>
        (right.published ?? "").localeCompare(left.published ?? "")
      );
      const representative = preferredRepresentative(sortedEditions);

      return {
        editions: Object.fromEntries(
          sortedEditions
            .filter((article) =>
              EDITION_LANGUAGES.includes(article.language as EditionLanguage)
            )
            .map((article) => [article.language, article])
        ),
        id,
        latestPublished:
          sortedEditions.find((article) => article.published)?.published ??
          null,
        representative,
      } satisfies ArticleGroup;
    })
    .sort((left, right) => {
      const byPublication = (right.latestPublished ?? "").localeCompare(
        left.latestPublished ?? ""
      );
      return (
        byPublication ||
        left.representative.title.localeCompare(
          right.representative.title,
          "lt"
        )
      );
    });
};

export interface ArticleGroupFilters {
  query: string;
  section: string;
  status: string;
}

export const filterArticleGroups = (
  groups: ArticleGroup[],
  { query, section, status }: ArticleGroupFilters
) => {
  const normalized = query.trim().toLocaleLowerCase("lt");

  return groups.filter((group) => {
    const articles = Object.values(group.editions);
    const matchesSection =
      section === "All sections" ||
      articles.some((article) => article.section === section);
    const matchesStatus =
      status === "all" || articles.some((article) => article.status === status);
    const matchesQuery =
      normalized.length === 0 ||
      articles.some((article) =>
        `${article.title} ${article.description} ${article.labels.join(" ")}`
          .toLocaleLowerCase("lt")
          .includes(normalized)
      );

    return matchesSection && matchesStatus && matchesQuery;
  });
};

export const getGroupPublicationSummary = (group: ArticleGroup) => {
  const articles = Object.values(group.editions);
  const published = articles.filter(
    (article) => article.status === "published"
  ).length;
  const scheduled = articles.filter(
    (article) => article.status === "scheduled"
  ).length;
  const drafts = articles.filter(
    (article) => article.status === "draft"
  ).length;

  if (published > 0) {
    return `${published} / ${EDITION_LANGUAGES.length} published`;
  }
  if (scheduled > 0) {
    return `${scheduled} scheduled`;
  }
  if (drafts > 0) {
    return `${drafts} ${drafts === 1 ? "draft" : "drafts"}`;
  }
  return "Archived";
};
