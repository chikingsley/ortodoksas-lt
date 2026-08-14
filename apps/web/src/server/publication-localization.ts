import { articles, publicationGroups } from "@ortodoksas-lt/db";
import { and, eq, inArray } from "drizzle-orm";

import type {
  CatalogEntry,
  LocaleDestination,
} from "../components/publication/publication";
import {
  defaultLocale,
  localeShells,
  type SiteLocale,
  siteLocales,
} from "../i18n/config";
import {
  articlePath,
  catalogEntry,
  catalogSelection,
  database,
  heroMap,
  htmlSuffix,
  leadingSlash,
} from "./publication-data";

const COMMUNITY_DETAIL_PATH_PATTERN = /^\/community\/[^/]+$/u;

function stripLocale(path: string) {
  for (const locale of localeShells) {
    if (path === `/${locale}`) {
      return "/";
    }
    if (path.startsWith(`/${locale}/`)) {
      return path.slice(locale.length + 1);
    }
  }
  return path;
}

async function currentTranslationGroup(currentPath: string) {
  const language =
    localeShells.find(
      (locale) =>
        currentPath === `/${locale}` || currentPath.startsWith(`/${locale}/`)
    ) ?? defaultLocale;
  const path = stripLocale(currentPath);
  if (path === "/") {
    return;
  }
  const slug = path.replace(leadingSlash, "").replace(htmlSuffix, "");
  const [row] = await database()
    .select({ translationGroupId: articles.translationGroupId })
    .from(articles)
    .where(
      and(
        eq(articles.status, "published"),
        eq(articles.language, language),
        eq(articles.slug, slug)
      )
    )
    .limit(1);
  return row?.translationGroupId;
}

export async function getTranslationGroupCounterpart(
  locale: SiteLocale,
  translationGroupId: string
) {
  const rows = await database()
    .select(catalogSelection)
    .from(articles)
    .innerJoin(
      publicationGroups,
      eq(publicationGroups.id, articles.translationGroupId)
    )
    .where(
      and(
        eq(articles.status, "published"),
        eq(articles.language, locale),
        eq(articles.translationGroupId, translationGroupId)
      )
    )
    .limit(1);
  const [row] = rows;
  if (!row) {
    return;
  }
  const heroes = await heroMap(rows);
  return catalogEntry(row, heroes);
}

export async function getLocalizedCounterparts(
  locale: Exclude<SiteLocale, "lt">,
  sourcePaths: string[]
) {
  const sourceSlugs = sourcePaths.map((path) =>
    path.replace(leadingSlash, "").replace(htmlSuffix, "")
  );
  if (sourceSlugs.length === 0) {
    return new Map<string, CatalogEntry>();
  }

  const sourceRows = await database()
    .select({
      slug: articles.slug,
      translationGroupId: articles.translationGroupId,
    })
    .from(articles)
    .where(
      and(
        eq(articles.language, defaultLocale),
        inArray(articles.slug, sourceSlugs)
      )
    );
  const groups = sourceRows.map((row) => row.translationGroupId);
  if (groups.length === 0) {
    return new Map<string, CatalogEntry>();
  }

  const localizedRows = await database()
    .select(catalogSelection)
    .from(articles)
    .innerJoin(
      publicationGroups,
      eq(publicationGroups.id, articles.translationGroupId)
    )
    .where(
      and(
        eq(articles.status, "published"),
        eq(articles.language, locale),
        inArray(articles.translationGroupId, groups)
      )
    );
  const heroes = await heroMap(localizedRows);
  const localizedByGroup = new Map(
    localizedRows.map((row) => [
      row.translationGroupId,
      catalogEntry(row, heroes),
    ])
  );

  return new Map(
    sourceRows.flatMap((source) => {
      const localized = localizedByGroup.get(source.translationGroupId);
      return localized ? [[articlePath(source.slug), localized] as const] : [];
    })
  );
}

export async function getLocaleLinks(currentPath: string) {
  const publicationPath = stripLocale(currentPath);
  if (publicationPath === "/") {
    return {
      be: { hasCounterpart: true, href: "/be" },
      en: { hasCounterpart: true, href: "/en" },
      lt: { hasCounterpart: true, href: "/" },
      ru: { hasCounterpart: true, href: "/ru" },
      uk: { hasCounterpart: true, href: "/uk" },
    } satisfies Record<SiteLocale, LocaleDestination>;
  }
  if (publicationPath === "/paieska") {
    return {
      be: { hasCounterpart: true, href: "/be/paieska" },
      en: { hasCounterpart: true, href: "/en/paieska" },
      lt: { hasCounterpart: true, href: "/paieska" },
      ru: { hasCounterpart: true, href: "/ru/paieska" },
      uk: { hasCounterpart: true, href: "/uk/paieska" },
    } satisfies Record<SiteLocale, LocaleDestination>;
  }
  if (COMMUNITY_DETAIL_PATH_PATTERN.test(publicationPath)) {
    return Object.fromEntries(
      siteLocales.map((locale) => [
        locale,
        {
          hasCounterpart: true,
          href:
            locale === defaultLocale
              ? publicationPath
              : `/${locale}${publicationPath}`,
        },
      ])
    ) as Record<SiteLocale, LocaleDestination>;
  }
  const slug = publicationPath
    .replace(leadingSlash, "")
    .replace(htmlSuffix, "");
  const group = await currentTranslationGroup(currentPath);
  const rows = await database()
    .select({ language: articles.language, slug: articles.slug })
    .from(articles)
    .where(
      and(
        eq(articles.status, "published"),
        group ? eq(articles.translationGroupId, group) : eq(articles.slug, slug)
      )
    );
  const pathByLocale = new Map(
    rows.flatMap((row) =>
      siteLocales.includes(row.language as SiteLocale)
        ? [[row.language as SiteLocale, articlePath(row.slug)] as const]
        : []
    )
  );
  const hrefFor = (locale: SiteLocale, pagePath?: string) => {
    if (locale === defaultLocale) {
      return pagePath ?? "/";
    }
    return pagePath ? `/${locale}${pagePath}` : `/${locale}`;
  };
  return Object.fromEntries(
    siteLocales.map((locale) => [
      locale,
      {
        hasCounterpart: pathByLocale.has(locale),
        href: hrefFor(locale, pathByLocale.get(locale)),
      },
    ])
  ) as Record<SiteLocale, LocaleDestination>;
}
