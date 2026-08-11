import { env } from "cloudflare:workers";
import { getSectionOptions } from "@ortodoksas-lt/content/sections";
import type {
  TranslationKind,
  TranslationReviewStatus,
} from "@ortodoksas-lt/content/translation";
import { articles, homepagePlacements, mediaAssets } from "@ortodoksas-lt/db";
import { renderArticleBody } from "@ortodoksas-lt/editor/render";
import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { defaultLocale, localeShells, type SiteLocale } from "../i18n/config";
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
    heroAlt: row.heroMediaId ? (heroes.get(row.heroMediaId) ?? "") : "",
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

export async function getArticles(language: SiteLocale = defaultLocale) {
  return (await getCatalog(language)).filter(
    (entry) => entry.kind === "article"
  );
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

export async function getLocaleLinks(currentPath: string) {
  if (stripLocale(currentPath) === "/") {
    return {
      be: { hasCounterpart: true, href: "/be" },
      en: { hasCounterpart: true, href: "/en" },
      lt: { hasCounterpart: true, href: "/" },
      ru: { hasCounterpart: true, href: "/ru" },
      uk: { hasCounterpart: true, href: "/uk" },
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
