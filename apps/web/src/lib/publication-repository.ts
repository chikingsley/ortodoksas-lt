import { env } from "cloudflare:workers";
import { getSectionOptions } from "@ortodoksas-lt/content/sections";
import type {
  TranslationKind,
  TranslationReviewStatus,
} from "@ortodoksas-lt/content/translation";
import { articles, homepagePlacements, mediaAssets } from "@ortodoksas-lt/db";
import { renderArticleBody } from "@ortodoksas-lt/editor/render";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { defaultLocale, localeShells, type SiteLocale } from "../i18n/config";
import {
  buildHomepageModel,
  getHomepageArticleGroups,
  localizeHomepageCatalog,
} from "./homepage";
import type {
  CatalogEntry,
  ContentPage,
  LocaleDestination,
} from "./publication";

type ArticleRow = typeof articles.$inferSelect;
type PublicationRow = Pick<
  ArticleRow,
  | "heroMediaId"
  | "id"
  | "kind"
  | "labelsJson"
  | "publishedAt"
  | "section"
  | "slug"
  | "summary"
  | "title"
  | "translationGroupId"
  | "translationKind"
  | "translationReviewStatus"
>;

const catalogSelection = {
  heroMediaId: articles.heroMediaId,
  id: articles.id,
  kind: articles.kind,
  labelsJson: articles.labelsJson,
  publishedAt: articles.publishedAt,
  section: articles.section,
  slug: articles.slug,
  summary: articles.summary,
  title: articles.title,
  translationGroupId: articles.translationGroupId,
  translationKind: articles.translationKind,
  translationReviewStatus: articles.translationReviewStatus,
};

const database = () => drizzle(env.DB);
const leadingSlash = /^\//u;
const htmlSuffix = /\.html$/u;
const fourDigitYear = /^\d{4}$/u;

function articlePath(slug: string) {
  return `/${slug}.html`;
}

function parseLabels(value: string) {
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed)
    ? parsed.filter((label): label is string => typeof label === "string")
    : [];
}

async function heroMap(rows: Pick<ArticleRow, "heroMediaId">[]) {
  const ids = [...new Set(rows.flatMap((row) => row.heroMediaId ?? []))];
  if (ids.length === 0) {
    return new Map<string, string>();
  }
  const batches = Array.from(
    { length: Math.ceil(ids.length / 100) },
    (_, index) => ids.slice(index * 100, index * 100 + 100)
  );
  const media = (
    await Promise.all(
      batches.map((batch) =>
        database()
          .select({ altText: mediaAssets.altText, id: mediaAssets.id })
          .from(mediaAssets)
          .where(inArray(mediaAssets.id, batch))
      )
    )
  ).flat();
  return new Map(media.map((asset) => [asset.id, asset.altText]));
}

function catalogEntry(
  row: PublicationRow,
  heroes: Map<string, string>,
  placement?: { position: number; slot: string }
): CatalogEntry {
  const homepage =
    placement?.slot === "lead" ||
    placement?.slot === "secondary" ||
    placement?.slot === "feed"
      ? placement.slot
      : undefined;
  return {
    description: row.summary,
    hero: row.heroMediaId ? `/api/media/${row.heroMediaId}` : null,
    heroAlt: row.heroMediaId ? heroes.get(row.heroMediaId) || row.title : "",
    heroMediaId: row.heroMediaId,
    ...(homepage ? { homepage } : {}),
    ...(placement ? { homepageOrder: placement.position } : {}),
    kind: row.kind === "page" ? "page" : "article",
    labels: parseLabels(row.labelsJson),
    path: articlePath(row.slug),
    published: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
    section: row.section,
    title: row.title,
    translationGroupId: row.translationGroupId,
    translationKind: row.translationKind as TranslationKind,
    translationReviewStatus:
      row.translationReviewStatus as TranslationReviewStatus,
  };
}

function publishedRows(language: SiteLocale) {
  return database()
    .select(catalogSelection)
    .from(articles)
    .where(
      and(eq(articles.status, "published"), eq(articles.language, language))
    )
    .orderBy(desc(articles.publishedAt));
}

export async function getCatalog(language: SiteLocale = defaultLocale) {
  const [rows, placements] = await Promise.all([
    publishedRows(language),
    language === defaultLocale
      ? database().select().from(homepagePlacements)
      : Promise.resolve([]),
  ]);
  const [heroes] = await Promise.all([heroMap(rows)]);
  const placementByArticle = new Map(
    placements.map((placement) => [
      placement.articleId,
      { position: placement.position, slot: placement.slot },
    ])
  );
  return rows.map((row) =>
    catalogEntry(row, heroes, placementByArticle.get(row.id))
  );
}

export async function getHomepageCatalog(language: SiteLocale = defaultLocale) {
  if (language === defaultLocale) {
    return getCatalog(defaultLocale);
  }
  const [canonicalCatalog, localizedCatalog] = await Promise.all([
    getCatalog(defaultLocale),
    getCatalog(language),
  ]);
  const canonicalArticles = canonicalCatalog.filter(
    (entry) => entry.kind === "article"
  );
  const sections = getSectionOptions(
    canonicalArticles.map((entry) => entry.section)
  );
  const canonicalModel = buildHomepageModel({
    articles: canonicalArticles,
    catalog: canonicalCatalog,
    sections,
  });
  const homepageGroups = getHomepageArticleGroups(canonicalModel);
  const homepageCatalog = canonicalCatalog.filter(
    (entry) =>
      entry.kind === "page" ||
      (entry.translationGroupId
        ? homepageGroups.has(entry.translationGroupId)
        : false)
  );
  return localizeHomepageCatalog(homepageCatalog, localizedCatalog);
}

export async function getArticles(language: SiteLocale = defaultLocale) {
  return (await getCatalog(language)).filter(
    (entry) => entry.kind === "article"
  );
}

export async function getRecentArticles(language: SiteLocale, limit: number) {
  const rows = await database()
    .select(catalogSelection)
    .from(articles)
    .where(
      and(
        eq(articles.status, "published"),
        eq(articles.language, language),
        eq(articles.kind, "article")
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
  const heroes = await heroMap(rows);
  return rows.map((row) => catalogEntry(row, heroes));
}

interface ArchiveQuery {
  label?: string;
  limit: number;
  offset: number;
  query?: string;
  section?: string;
  year?: string;
}

export async function getArchiveArticles(
  language: SiteLocale,
  options: ArchiveQuery
) {
  const conditions: SQL[] = [
    eq(articles.status, "published"),
    eq(articles.language, language),
    eq(articles.kind, "article"),
  ];
  if (options.query) {
    const pattern = `%${options.query.replace(/[%_]/gu, (character) => `\\${character}`)}%`;
    conditions.push(
      or(
        like(articles.title, pattern),
        like(articles.summary, pattern),
        like(articles.section, pattern),
        like(articles.labelsJson, pattern)
      ) as SQL
    );
  }
  if (options.section) {
    conditions.push(eq(articles.section, options.section));
  }
  if (options.label) {
    conditions.push(like(articles.labelsJson, `%${options.label}%`));
  }
  if (options.year && fourDigitYear.test(options.year)) {
    const start = Date.UTC(Number(options.year), 0, 1);
    const end = Date.UTC(Number(options.year) + 1, 0, 1);
    conditions.push(gte(articles.publishedAt, start));
    conditions.push(lt(articles.publishedAt, end));
  }

  const where = and(...conditions);
  const [rows, totals] = await Promise.all([
    database()
      .select(catalogSelection)
      .from(articles)
      .where(where)
      .orderBy(desc(articles.publishedAt))
      .limit(options.limit)
      .offset(options.offset),
    database().select({ value: count() }).from(articles).where(where),
  ]);
  const heroes = await heroMap(rows);
  return {
    entries: rows.map((row) => catalogEntry(row, heroes)),
    total: totals[0]?.value ?? 0,
  };
}

export async function getArchiveFacets(language: SiteLocale = defaultLocale) {
  const rows = await database()
    .select({
      labelsJson: articles.labelsJson,
      publishedAt: articles.publishedAt,
      section: articles.section,
    })
    .from(articles)
    .where(
      and(
        eq(articles.status, "published"),
        eq(articles.language, language),
        eq(articles.kind, "article")
      )
    );
  return {
    labels: [
      ...new Set(rows.flatMap((row) => parseLabels(row.labelsJson))),
    ].sort((left, right) => left.localeCompare(right, language)),
    sections: getSectionOptions(rows.map((row) => row.section)),
    total: rows.length,
    years: [
      ...new Set(
        rows.flatMap((row) =>
          row.publishedAt
            ? [new Date(row.publishedAt).getUTCFullYear().toString()]
            : []
        )
      ),
    ].sort((left, right) => right.localeCompare(left)),
  };
}

export async function searchArticles(
  language: SiteLocale,
  query: string,
  options: { limit: number; offset: number }
) {
  const pattern = `%${query.replace(/[%_]/gu, (character) => `\\${character}`)}%`;
  const searchCondition = or(
    like(articles.title, pattern),
    like(articles.summary, pattern),
    like(articles.section, pattern),
    like(articles.labelsJson, pattern)
  );
  const where = and(
    eq(articles.status, "published"),
    eq(articles.language, language),
    searchCondition
  );
  const [rows, totals] = await Promise.all([
    database()
      .select(catalogSelection)
      .from(articles)
      .where(where)
      .orderBy(desc(articles.publishedAt))
      .limit(options.limit)
      .offset(options.offset),
    database().select({ value: count() }).from(articles).where(where),
  ]);
  const heroes = await heroMap(rows);
  return {
    entries: rows.map((row) => catalogEntry(row, heroes)),
    total: totals[0]?.value ?? 0,
  };
}

export async function getSections(language: SiteLocale = defaultLocale) {
  return getSectionOptions(
    (await getArticles(language)).map((entry) => entry.section)
  );
}

export async function getPage(language: SiteLocale, path: string) {
  const slug = path.replace(leadingSlash, "").replace(htmlSuffix, "");
  const rows = await database()
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.status, "published"),
        eq(articles.language, language),
        eq(articles.slug, slug)
      )
    )
    .limit(1);
  const [row] = rows;
  if (!row) {
    return;
  }
  const heroes = await heroMap([row]);
  const body = JSON.parse(row.bodyJson) as Parameters<
    typeof renderArticleBody
  >[0];
  return {
    ...catalogEntry(row, heroes),
    html: renderArticleBody(body),
  } satisfies ContentPage;
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
  return (await getPage(language, path))?.translationGroupId;
}

export async function getCounterpart(locale: SiteLocale, currentPath: string) {
  const path = stripLocale(currentPath);
  const group = await currentTranslationGroup(currentPath);
  const entries = await getCatalog(locale);
  return group
    ? entries.find((entry) => entry.translationGroupId === group)
    : entries.find((entry) => entry.path === path);
}

export function getLocalizedCounterpart(
  locale: Exclude<SiteLocale, "lt">,
  sourcePath: string
) {
  return getCounterpart(locale, sourcePath);
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
  const pairs = await Promise.all(
    ([defaultLocale, ...localeShells] as const).map(
      async (locale) =>
        [locale, await getCounterpart(locale, currentPath)] as const
    )
  );
  const hrefFor = (locale: SiteLocale, page?: CatalogEntry) => {
    if (locale === defaultLocale) {
      return page?.path ?? "/";
    }
    return page ? `/${locale}${page.path}` : `/${locale}`;
  };
  return Object.fromEntries(
    pairs.map(([locale, page]) => [
      locale,
      {
        hasCounterpart: Boolean(page),
        href: hrefFor(locale, page),
      },
    ])
  ) as Record<SiteLocale, LocaleDestination>;
}

export async function getLocaleAlternates(currentPath: string) {
  const links = await getLocaleLinks(currentPath);
  return (Object.entries(links) as [SiteLocale, LocaleDestination][])
    .filter(([, destination]) => destination.hasCounterpart)
    .map(([locale, destination]) => ({
      href: destination.href,
      locale,
    }));
}
