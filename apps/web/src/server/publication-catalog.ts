import { getSectionOptions } from "@ortodoksas-lt/content/sections";
import {
  articles,
  homepageLayoutState,
  homepagePlacements,
  publicationGroups,
} from "@ortodoksas-lt/db";
import { renderArticleBody } from "@ortodoksas-lt/editor/render";
import { and, desc, eq } from "drizzle-orm";

import {
  buildHomepageModel,
  getHomepageArticleGroups,
  localizeHomepageCatalog,
} from "../components/home/homepage-model";
import type { ContentPage } from "../components/publication/publication";
import { defaultLocale, type SiteLocale } from "../i18n/config";
import {
  catalogEntry,
  catalogSelection,
  database,
  heroMap,
  leadingSlash,
  publishedRows,
} from "./publication-data";

export async function getCatalog(language: SiteLocale = defaultLocale) {
  const [rows, placements] = await Promise.all([
    publishedRows(language),
    language === defaultLocale
      ? database()
          .select({
            articleId: homepagePlacements.articleId,
            position: homepagePlacements.position,
            slot: homepagePlacements.slot,
          })
          .from(homepagePlacements)
          .innerJoin(
            homepageLayoutState,
            and(
              eq(homepageLayoutState.id, "primary"),
              eq(
                homepagePlacements.layoutRevision,
                homepageLayoutState.revision
              )
            )
          )
      : Promise.resolve([]),
  ]);
  const heroes = await heroMap(rows);
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

export async function getHomepageModel(language: SiteLocale = defaultLocale) {
  const catalog = await getHomepageCatalog(language);
  const entries = catalog.filter((entry) => entry.kind === "article");
  return {
    entries,
    model: buildHomepageModel({
      articles: entries,
      catalog,
      locale: language,
      sections: getSectionOptions(entries.map((entry) => entry.section)),
    }),
  };
}

export async function getArticles(language: SiteLocale = defaultLocale) {
  return (await getCatalog(language)).filter(
    (entry) => entry.kind === "article"
  );
}

export async function getRecentArticles(language: SiteLocale, limit: number) {
  const rows = await database()
    .select({ ...catalogSelection, bodyJson: articles.bodyJson })
    .from(articles)
    .innerJoin(
      publicationGroups,
      eq(publicationGroups.id, articles.translationGroupId)
    )
    .where(
      and(
        eq(articles.status, "published"),
        eq(articles.language, language),
        eq(publicationGroups.kind, "article")
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
  const heroes = await heroMap(rows);
  return rows.map((row) => catalogEntry(row, heroes));
}

export async function getPage(language: SiteLocale, path: string) {
  const slug = path.replace(leadingSlash, "");
  const rows = await database()
    .select({ ...catalogSelection, bodyJson: articles.bodyJson })
    .from(articles)
    .innerJoin(
      publicationGroups,
      eq(publicationGroups.id, articles.translationGroupId)
    )
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
