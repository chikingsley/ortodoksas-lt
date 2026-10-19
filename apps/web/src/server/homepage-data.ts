import {
  articles,
  homepageLayoutState,
  homepagePlacements,
  publicationGroups,
} from "@ortodoksas-lt/db";
import { env } from "cloudflare:workers";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

import type { CatalogEntry } from "../components/publication/publication";
import { defaultLocale } from "../i18n/config";
import type { SiteLocale } from "../i18n/config";
import {
  catalogEntry,
  catalogSelection,
  database,
  heroMap,
} from "./publication-data";

export async function homepageMonths(
  language: SiteLocale
): Promise<[string, number][]> {
  const result = await env.DB.prepare(
    "SELECT month, SUM(total) AS total FROM publication_counts WHERE language = ? AND month <> '' GROUP BY month ORDER BY month DESC"
  )
    .bind(language)
    .all<{ month: string; total: number }>();

  return result.results.map((row) => [
    new Intl.DateTimeFormat(language, {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    }).format(new Date(`${row.month}-01T00:00:00Z`)),
    row.total,
  ]);
}

const query = () =>
  database()
    .select(catalogSelection)
    .from(articles)
    .innerJoin(
      publicationGroups,
      eq(publicationGroups.id, articles.translationGroupId)
    );

export async function homepageCandidates(): Promise<CatalogEntry[]> {
  const sections = await env.DB.prepare(
    `SELECT s.section, (SELECT published_at FROM articles a
      WHERE a.status = 'published' AND a.language = s.language AND a.section = s.section
      ORDER BY a.published_at DESC LIMIT 1) AS latest
     FROM (SELECT DISTINCT language, section FROM publication_counts WHERE language = ?) s`
  )
    .bind(defaultLocale)
    .all<{ section: string; latest: number | null }>();

  const latestSections = sections.results
    .filter((row) => row.section.trim())
    .toSorted(
      (left, right) =>
        (right.latest ?? 0) - (left.latest ?? 0) ||
        left.section.localeCompare(right.section, "lt")
    )
    .slice(0, 2);

  const conditions = [
    eq(articles.status, "published"),
    eq(articles.language, defaultLocale),
    eq(publicationGroups.kind, "article"),
  ];

  const [recent, images, placements, library, ...sectionRows] =
    await Promise.all([
      query()
        .where(and(...conditions))
        .orderBy(desc(articles.publishedAt))
        .limit(8),
      query()
        .where(and(...conditions, isNotNull(articles.heroMediaId)))
        .orderBy(desc(articles.publishedAt))
        .limit(8),
      database()
        .select({
          ...catalogSelection,
          position: homepagePlacements.position,
          slot: homepagePlacements.slot,
        })
        .from(homepagePlacements)
        .innerJoin(
          homepageLayoutState,
          and(
            eq(homepageLayoutState.id, "primary"),
            eq(homepagePlacements.layoutRevision, homepageLayoutState.revision)
          )
        )
        .innerJoin(articles, eq(articles.id, homepagePlacements.articleId))
        .innerJoin(
          publicationGroups,
          eq(publicationGroups.id, articles.translationGroupId)
        )
        .where(
          and(
            ...conditions,
            inArray(homepagePlacements.slot, ["lead", "secondary"])
          )
        )
        .orderBy(homepagePlacements.position)
        .limit(5),
      query()
        .where(
          and(
            eq(articles.status, "published"),
            eq(articles.language, defaultLocale),
            eq(articles.slug, "p/biblioteka")
          )
        )
        .limit(1),
      ...latestSections.map(({ section }) =>
        query()
          .where(and(...conditions, eq(articles.section, section)))
          .orderBy(desc(articles.publishedAt))
          .limit(5)
      ),
    ]);

  const rows = [
    ...new Map(
      [
        ...recent,
        ...images,
        ...placements,
        ...library,
        ...sectionRows.flat(),
      ].map((row) => [row.id, row])
    ).values(),
  ];

  const heroes = await heroMap(rows);

  const placed = new Map(
    placements.map((row) => [
      row.id,
      { position: row.position, slot: row.slot },
    ])
  );

  return rows.map((row) => catalogEntry(row, heroes, placed.get(row.id)));
}

export async function homepageTranslations(
  language: SiteLocale,
  canonical: CatalogEntry[]
) {
  const groups = canonical.flatMap((entry) => entry.translationGroupId ?? []);

  if (groups.length === 0) {
    return [];
  }

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
        eq(articles.language, language),
        inArray(articles.translationGroupId, groups)
      )
    );

  const heroes = await heroMap(rows);

  return rows.map((row) => catalogEntry(row, heroes));
}
