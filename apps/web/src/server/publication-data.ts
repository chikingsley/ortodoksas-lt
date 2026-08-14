import { env } from "cloudflare:workers";
import { pageTemplateSchema } from "@ortodoksas-lt/content/site";
import type {
  TranslationKind,
  TranslationReviewStatus,
} from "@ortodoksas-lt/content/translation";
import { articles, mediaAssets, publicationGroups } from "@ortodoksas-lt/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import type { CatalogEntry } from "../components/publication/publication";
import type { SiteLocale } from "../i18n/config";

export type ArticleRow = typeof articles.$inferSelect;
export type PublicationRow = Pick<
  ArticleRow,
  | "heroMediaId"
  | "heroFit"
  | "heroFocalX"
  | "heroFocalY"
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
> & { pageTemplate: string };

export const catalogSelection = {
  heroFit: articles.heroFit,
  heroFocalX: articles.heroFocalX,
  heroFocalY: articles.heroFocalY,
  heroMediaId: articles.heroMediaId,
  id: articles.id,
  kind: publicationGroups.kind,
  labelsJson: articles.labelsJson,
  pageTemplate: publicationGroups.pageTemplate,
  publishedAt: articles.publishedAt,
  section: articles.section,
  slug: articles.slug,
  summary: articles.summary,
  title: articles.title,
  translationGroupId: articles.translationGroupId,
  translationKind: articles.translationKind,
  translationReviewStatus: articles.translationReviewStatus,
};

export const database = () => drizzle(env.DB);
export const leadingSlash = /^\//u;
export const htmlSuffix = /\.html$/u;

export function articlePath(slug: string) {
  return `/${slug}.html`;
}

export function parseLabels(value: string) {
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed)
    ? parsed.filter((label): label is string => typeof label === "string")
    : [];
}

export async function heroMap(rows: Pick<ArticleRow, "heroMediaId">[]) {
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

export function catalogEntry(
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
    heroFit: row.heroFit === "contain" ? "contain" : "cover",
    heroFocalX: row.heroFocalX,
    heroFocalY: row.heroFocalY,
    heroMediaId: row.heroMediaId,
    ...(homepage ? { homepage } : {}),
    ...(placement ? { homepageOrder: placement.position } : {}),
    kind: row.kind === "page" ? "page" : "article",
    labels: parseLabels(row.labelsJson),
    pageTemplate: pageTemplateSchema.catch("standard").parse(row.pageTemplate),
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

export function publishedRows(language: SiteLocale) {
  return database()
    .select(catalogSelection)
    .from(articles)
    .innerJoin(
      publicationGroups,
      eq(publicationGroups.id, articles.translationGroupId)
    )
    .where(
      and(eq(articles.status, "published"), eq(articles.language, language))
    )
    .orderBy(desc(articles.publishedAt));
}
