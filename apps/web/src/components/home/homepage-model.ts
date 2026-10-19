import { getSectionLabel } from "@ortodoksas-lt/content/sections";
import { hasText } from "@ortodoksas-lt/content/value";

import type { SiteLocale } from "../../i18n/config";
import { formatPublicationMonth } from "../../i18n/dates";
import { ui } from "../../i18n/ui";
import type { CatalogEntry } from "../publication/publication";
import { sectionSlug } from "../publication/publication";

interface HomepageEntry {
  hero: string | null;
  homepage?: "feed" | "lead" | "secondary" | undefined;
  homepageOrder?: number | undefined;
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
  sectionGroups: {
    articles: CatalogEntry[];
    href: string;
    title: string;
  }[];
}

const publishedTime = (entry: HomepageEntry): number =>
  hasText(entry.published) ? Date.parse(entry.published) : 0;

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
    const localized = hasText(canonical.translationGroupId)
      ? localizedByGroup.get(canonical.translationGroupId)
      : undefined;

    if (!localized) {
      return [];
    }

    const entry = {
      ...localized,
      hero: canonical.hero,
      heroAlt: canonical.heroAlt,
      heroFit: canonical.heroFit,
      heroFocalX: canonical.heroFocalX,
      heroFocalY: canonical.heroFocalY,
      heroMediaId: canonical.heroMediaId,
      published: canonical.published,
      section: canonical.section,
    };

    if (canonical.homepage !== undefined) {
      entry.homepage = canonical.homepage;
    }

    if (canonical.homepageOrder !== undefined) {
      entry.homepageOrder = canonical.homepageOrder;
    }

    return [entry];
  });
}

export function selectHomepageArticles<T extends HomepageEntry>(entries: T[]) {
  const sorted = [...entries].toSorted(
    (a, b) => publishedTime(b) - publishedTime(a)
  );

  const lead =
    sorted.find((entry) => entry.homepage === "lead" && hasText(entry.hero)) ??
    sorted.find((entry) => hasText(entry.hero)) ??
    null;

  const available = sorted.filter((entry) => entry.path !== lead?.path);

  const promoted = available
    .filter((entry) => entry.homepage === "secondary" && hasText(entry.hero))
    .toSorted((a, b) => (a.homepageOrder ?? 99) - (b.homepageOrder ?? 99));

  const secondary = [...promoted];

  for (const entry of available) {
    if (secondary.length >= 4) {
      break;
    }

    if (!hasText(entry.hero)) {
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
  archiveMonths?: [string, number][];
  articles: CatalogEntry[];
  catalog: CatalogEntry[];
  locale?: SiteLocale;
  sections: string[];
}

export function buildHomepageModel({
  archiveMonths: fullArchiveMonths,
  articles,
  catalog,
  locale = "lt",
  sections,
}: HomepageModelInput): HomepageModel {
  const { lead, remaining, secondary } = selectHomepageArticles(articles);
  const archiveMonths = new Map<string, number>();

  for (const article of articles) {
    if (!hasText(article.published)) {
      continue;
    }

    const date = new Date(`${article.published.slice(0, 10)}T00:00:00Z`);

    const key = formatPublicationMonth(date, locale);

    archiveMonths.set(key, (archiveMonths.get(key) ?? 0) + 1);
  }

  const library = catalog.find(
    (entry) => entry.kind === "page" && entry.path === "/p/biblioteka"
  );

  const rotatingSections = sections
    .map((title) => ({
      latest: Math.max(
        ...articles
          .filter((entry) => entry.section === title)
          .map(publishedTime)
      ),
      title,
    }))
    .filter(({ latest }) => Number.isFinite(latest))
    .toSorted(
      (left, right) =>
        right.latest - left.latest ||
        left.title.localeCompare(right.title, "lt")
    )
    .slice(0, 2);

  const sectionGroups = rotatingSections.flatMap(({ title }) => {
    const sectionArticles = articles
      .filter((entry) => entry.section === title && entry.path !== lead?.path)
      .toSorted((left, right) => publishedTime(right) - publishedTime(left))
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
    archiveMonths: fullArchiveMonths ?? [...archiveMonths.entries()],
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
