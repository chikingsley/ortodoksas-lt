import {
  articles,
  communities,
  communityLocalizations,
  people,
  personLocalizations,
  publicationGroups,
} from "@ortodoksas-lt/db";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";

import type { LocaleDestination } from "../components/publication/publication";
import { defaultLocale, localeShells, siteLocales } from "../i18n/config";
import type { SiteLocale } from "../i18n/config";
import {
  articlePath,
  catalogEntry,
  catalogSelection,
  database,
  heroMap,
  leadingSlash,
} from "./publication-data";

const DIRECTORY_DETAIL_PATH_PATTERN = /^\/(?:community|person)\/[^/]+$/u;
const DIRECTORY_DETAIL_PARTS_PATTERN = /^\/(community|person)\/([^/]+)$/u;

async function getDirectoryLocaleLinks(publicationPath: string) {
  const match = DIRECTORY_DETAIL_PARTS_PATTERN.exec(publicationPath);

  if (!match) {
    return;
  }

  const [, kind, slug] = match;

  if (!(kind && slug)) {
    return;
  }

  const rows =
    kind === "person"
      ? await database()
          .select({ language: personLocalizations.language })
          .from(people)
          .innerJoin(
            personLocalizations,
            eq(personLocalizations.personId, people.id)
          )
          .where(and(eq(people.slug, slug), eq(people.status, "published")))
      : await database()
          .select({ language: communityLocalizations.language })
          .from(communities)
          .innerJoin(
            communityLocalizations,
            eq(communityLocalizations.communityId, communities.id)
          )
          .where(
            and(eq(communities.slug, slug), eq(communities.status, "published"))
          );

  const available = new Set(rows.map(({ language }) => language));

  return Object.fromEntries(
    siteLocales.map((locale) => [
      locale,
      {
        hasCounterpart: available.has(locale),
        href:
          locale === defaultLocale
            ? publicationPath
            : `/${locale}${publicationPath}`,
      },
    ])
  ) as Record<SiteLocale, LocaleDestination>;
}

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

  const slug = path.replace(leadingSlash, "");

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

// D1 accepts at most 100 bound values; reserve space for language and status.
function localizationBatches(values: string[]) {
  return Array.from({ length: Math.ceil(values.length / 90) }, (_, index) =>
    values.slice(index * 90, (index + 1) * 90)
  );
}

export async function getLocalizedCounterparts(
  locale: Exclude<SiteLocale, "lt">,
  sourcePaths: string[]
) {
  const sourceSlugs = [
    ...new Set(sourcePaths.map((path) => path.replace(leadingSlash, ""))),
  ];

  const batches = localizationBatches(sourceSlugs);

  if (batches.length === 0) {
    return new Map<string, { path: string }>();
  }

  // CROSS JOIN preserves the indexed source-slug lookup as the outer loop.
  const results = await env.DB.batch<{ source_slug: string; slug: string }>(
    batches.map((batch) =>
      env.DB.prepare(
        `SELECT source.slug AS source_slug, translated.slug
       FROM articles source
       CROSS JOIN articles translated ON translated.translation_group_id = source.translation_group_id
       WHERE source.language = ? AND source.slug IN (${batch.map(() => "?").join(",")})
         AND translated.language = ? AND translated.status = 'published'`
      ).bind(defaultLocale, ...batch, locale)
    )
  );

  const rows = results.flatMap((result) => result.results);

  return new Map(
    rows.map((row) => [
      articlePath(row.source_slug),
      { path: articlePath(row.slug) },
    ])
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

  if (DIRECTORY_DETAIL_PATH_PATTERN.test(publicationPath)) {
    const localeLinks = await getDirectoryLocaleLinks(publicationPath);

    if (localeLinks) {
      return localeLinks;
    }
  }

  const slug = publicationPath.replace(leadingSlash, "");
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
