import { env } from "cloudflare:workers";
import { getSectionOptions } from "@ortodoksas-lt/content/sections";
import { articles, publicationGroups } from "@ortodoksas-lt/db";
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

import { defaultLocale, type SiteLocale } from "../i18n/config";
import {
  catalogEntry,
  catalogSelection,
  database,
  heroMap,
  parseLabels,
} from "./publication-data";

const fourDigitYear = /^\d{4}$/u;
const searchWords = /[\p{L}\p{N}]+/gu;

function toFtsQuery(query: string) {
  return (query.normalize("NFC").match(searchWords) ?? [])
    .slice(0, 12)
    .map((word) => `"${word.slice(0, 64)}"*`)
    .join(" AND ");
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
    eq(publicationGroups.kind, "article"),
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
      .innerJoin(
        publicationGroups,
        eq(publicationGroups.id, articles.translationGroupId)
      )
      .where(where)
      .orderBy(desc(articles.publishedAt))
      .limit(options.limit)
      .offset(options.offset),
    database()
      .select({ value: count() })
      .from(articles)
      .innerJoin(
        publicationGroups,
        eq(publicationGroups.id, articles.translationGroupId)
      )
      .where(where),
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
  const ftsQuery = toFtsQuery(query);
  if (!ftsQuery) {
    return { entries: [], total: 0 };
  }

  const matches = await env.DB.prepare(
    `SELECT articles.id
       FROM articles_fts
       INNER JOIN articles ON articles.rowid = articles_fts.rowid
       INNER JOIN publication_groups ON publication_groups.id = articles.translation_group_id
      WHERE articles_fts MATCH ?
        AND articles.status = 'published'
        AND articles.language = ?
        AND publication_groups.kind = 'article'
      ORDER BY bm25(articles_fts, 10.0, 5.0, 3.0, 2.0, 1.0), articles.published_at DESC
      LIMIT ? OFFSET ?`
  )
    .bind(ftsQuery, language, options.limit, options.offset)
    .all<{ id: string }>();
  const ids = matches.results.map((match) => match.id);
  const total = await env.DB.prepare(
    `SELECT COUNT(*) AS value
       FROM articles_fts
       INNER JOIN articles ON articles.rowid = articles_fts.rowid
       INNER JOIN publication_groups ON publication_groups.id = articles.translation_group_id
      WHERE articles_fts MATCH ?
        AND articles.status = 'published'
        AND articles.language = ?
        AND publication_groups.kind = 'article'`
  )
    .bind(ftsQuery, language)
    .first<number>("value");

  if (ids.length === 0) {
    return { entries: [], total: total ?? 0 };
  }

  const rows = await database()
    .select(catalogSelection)
    .from(articles)
    .innerJoin(
      publicationGroups,
      eq(publicationGroups.id, articles.translationGroupId)
    )
    .where(inArray(articles.id, ids));
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const rankedRows = ids.flatMap((id) => rowsById.get(id) ?? []);
  const heroes = await heroMap(rankedRows);
  return {
    entries: rankedRows.map((row) => catalogEntry(row, heroes)),
    total: total ?? 0,
  };
}

export async function getSections(language: SiteLocale = defaultLocale) {
  const rows = await database()
    .selectDistinct({ section: articles.section })
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
    );
  return getSectionOptions(rows.map((row) => row.section));
}
