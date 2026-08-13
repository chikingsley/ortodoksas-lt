import { getSectionLabel } from "@ortodoksas-lt/content/sections";
import type { SiteLocale } from "../i18n/config";
import { ui } from "../i18n/ui";
import { type CatalogEntry, sectionSlug } from "./publication";

interface HomepageEntry {
  hero: string | null;
  homepage?: "feed" | "lead" | "secondary";
  homepageOrder?: number;
  path: string;
  published: string | null;
}

export interface HomepageModel {
  archiveMonths: [string, number][];
  lead: CatalogEntry | null;
  library: {
    description: string;
    title: string;
  };
  recent: CatalogEntry[];
  secondary: CatalogEntry[];
  sectionGroups: Array<{
    articles: CatalogEntry[];
    href: string;
    title: string;
  }>;
}

export function getHomepageArticleGroups(model: HomepageModel) {
  return new Set(
    [
      model.lead,
      ...model.secondary,
      ...model.recent,
      ...model.sectionGroups.flatMap((section) => section.articles),
    ].flatMap((entry) => entry?.translationGroupId ?? [])
  );
}

export function localizeHomepageCatalog(
  canonicalCatalog: CatalogEntry[],
  localizedCatalog: CatalogEntry[]
) {
  const localizedByGroup = new Map(
    localizedCatalog.map((entry) => [entry.translationGroupId, entry])
  );

  return canonicalCatalog.flatMap((canonical) => {
    const localized = canonical.translationGroupId
      ? localizedByGroup.get(canonical.translationGroupId)
      : undefined;
    if (!localized) {
      return [];
    }

    return [
      {
        ...localized,
        hero: canonical.hero,
        heroAlt: canonical.heroAlt,
        heroFit: canonical.heroFit,
        heroFocalX: canonical.heroFocalX,
        heroFocalY: canonical.heroFocalY,
        heroMediaId: canonical.heroMediaId,
        ...(canonical.homepage ? { homepage: canonical.homepage } : {}),
        ...(canonical.homepageOrder === undefined
          ? {}
          : { homepageOrder: canonical.homepageOrder }),
        published: canonical.published,
        section: canonical.section,
      },
    ];
  });
}

export function selectHomepageArticles<T extends HomepageEntry>(entries: T[]) {
  const sorted = [...entries].sort((a, b) => {
    const left = a.published ? Date.parse(a.published) : 0;
    const right = b.published ? Date.parse(b.published) : 0;
    return right - left;
  });
  const lead =
    sorted.find((entry) => entry.homepage === "lead" && entry.hero) ??
    sorted.find((entry) => entry.hero) ??
    null;
  const available = sorted.filter((entry) => entry.path !== lead?.path);
  const promoted = available
    .filter((entry) => entry.homepage === "secondary" && entry.hero)
    .sort((a, b) => (a.homepageOrder ?? 99) - (b.homepageOrder ?? 99));
  const secondary = [...promoted];
  for (const entry of available) {
    if (secondary.length >= 4) {
      break;
    }
    if (!entry.hero) {
      continue;
    }
    if (!secondary.some((candidate) => candidate.path === entry.path)) {
      secondary.push(entry);
    }
  }
  const used = new Set([lead?.path, ...secondary.map((entry) => entry.path)]);
  return {
    lead,
    remaining: sorted.filter((entry) => !used.has(entry.path)),
    secondary: secondary.slice(0, 4),
  };
}

interface HomepageModelInput {
  articles: CatalogEntry[];
  catalog: CatalogEntry[];
  locale?: SiteLocale;
  sections: string[];
}

export function buildHomepageModel({
  articles,
  catalog,
  locale = "lt",
  sections,
}: HomepageModelInput): HomepageModel {
  const { lead, remaining, secondary } = selectHomepageArticles(articles);
  const archiveMonths = new Map<string, number>();
  for (const article of articles) {
    if (!article.published) {
      continue;
    }
    const date = new Date(`${article.published.slice(0, 10)}T00:00:00Z`);
    const key = new Intl.DateTimeFormat(locale, {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    }).format(date);
    archiveMonths.set(key, (archiveMonths.get(key) ?? 0) + 1);
  }

  const library = catalog.find(
    (entry) => entry.kind === "page" && entry.path === "/p/biblioteka.html"
  );
  const sectionGroups = sections.slice(0, 2).flatMap((title) => {
    const sectionArticles = articles
      .filter((entry) => entry.section === title && entry.path !== lead?.path)
      .slice(0, 4);
    return sectionArticles.length
      ? [
          {
            articles: sectionArticles,
            href:
              locale === "lt"
                ? `/tema/${sectionSlug(title)}`
                : `/${locale}#articles`,
            title: getSectionLabel(title, locale),
          },
        ]
      : [];
  });

  return {
    archiveMonths: [...archiveMonths.entries()],
    lead,
    library: {
      description: library?.description ?? ui[locale].footerDescription,
      title: library?.title ?? ui[locale].library,
    },
    recent: remaining.slice(0, 3),
    secondary,
    sectionGroups,
  };
}
