import { getSectionOptions } from "@ortodoksas-lt/content/sections";
import { hasText } from "@ortodoksas-lt/content/value";
import { articles, publicationGroups } from "@ortodoksas-lt/db";
import { env } from "cloudflare:workers";
import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, gte, inArray, like, lt, or } from "drizzle-orm";
import { z } from "zod";

import type { SiteLocale } from "../i18n/config";
import { defaultLocale } from "../i18n/config";
import { site } from "../site";
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

async function getArchiveTotal(
  language: SiteLocale,
  options: ArchiveQuery,
  where: SQL | undefined
) {
  if (hasText(options.query) || hasText(options.label)) {
    const [row] = await database()
      .select({ value: count() })
      .from(articles)
      .innerJoin(
        publicationGroups,
        eq(publicationGroups.id, articles.translationGroupId)
      )
      .where(where);

    return row?.value ?? 0;
  }

  return (
    (await env.DB.prepare(
      "SELECT COALESCE(SUM(total),0) AS value FROM publication_counts WHERE language = ? AND (? IS NULL OR section = ?) AND (? IS NULL OR month LIKE ?)"
    )
      .bind(
        language,
        hasText(options.section) ? options.section : null,
        hasText(options.section) ? options.section : null,
        hasText(options.year) && fourDigitYear.test(options.year)
          ? options.year
          : null,
        hasText(options.year) && fourDigitYear.test(options.year)
          ? `${options.year}-%`
          : null
      )
      .first<number>("value")) ?? 0
  );
}

export async function getArchiveArticles(
  language: SiteLocale,
  options: ArchiveQuery
) {
  const conditions: (SQL | undefined)[] = [
    eq(articles.status, "published"),
    eq(articles.language, language),
    eq(publicationGroups.kind, "article"),
  ];

  if (hasText(options.query)) {
    const pattern = `%${options.query.replaceAll(/[%_]/gu, (character) => `\\${character}`)}%`;
    conditions.push(
      or(
        like(articles.title, pattern),
        like(articles.summary, pattern),
        like(articles.section, pattern),
        like(articles.labelsJson, pattern)
      )
    );
  }

  if (hasText(options.section)) {
    conditions.push(eq(articles.section, options.section));
  }

  if (hasText(options.label)) {
    conditions.push(like(articles.labelsJson, `%${options.label}%`));
  }

  if (hasText(options.year) && fourDigitYear.test(options.year)) {
    const start = Date.UTC(Number(options.year), 0, 1);
    const end = Date.UTC(Number(options.year) + 1, 0, 1);
    conditions.push(
      gte(articles.publishedAt, start),
      lt(articles.publishedAt, end)
    );
  }

  const where = and(...conditions);

  const total = await getArchiveTotal(language, options, where);

  const limit = Math.max(1, Math.min(100, Math.trunc(options.limit)));

  const offset = Math.max(
    0,
    Math.min(Math.trunc(options.offset), Math.max(0, total - 1))
  );

  const rows = await database()
    .select(catalogSelection)
    .from(articles)
    .innerJoin(
      publicationGroups,
      eq(publicationGroups.id, articles.translationGroupId)
    )
    .where(where)
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(offset);

  const heroes = await heroMap(rows);

  return {
    entries: rows.map((row) => catalogEntry(row, heroes)),
    total,
  };
}

async function readArchiveFacets(language: SiteLocale) {
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
    ].toSorted((left, right) => left.localeCompare(right, language)),
    sections: getSectionOptions(rows.map((row) => row.section)),
    total: rows.length,
    years: [
      ...new Set(
        rows.flatMap((row) =>
          row.publishedAt === null
            ? []
            : [new Date(row.publishedAt).getUTCFullYear().toString()]
        )
      ),
    ].toSorted((left, right) => right.localeCompare(left)),
  };
}

const archiveFacetsSchema = z.object({
  labels: z.array(z.string()),
  sections: z.array(z.string()),
  total: z.number(),
  years: z.array(z.string()),
});

export async function getArchiveFacets(language: SiteLocale = defaultLocale) {
  const revision = await env.DB.prepare(
    "SELECT revision FROM publication_state WHERE id = 1"
  ).first<number>("revision");

  const key = new Request(
    new URL(
      `/__publication/facets/${language}?revision=${revision}`,
      site.origin
    )
  );

  const cache = await caches.open("public-facets-v1");
  const cached = await cache.match(key);

  if (cached) {
    return archiveFacetsSchema.parse(await cached.json());
  }

  const result = await readArchiveFacets(language);
  await cache.put(
    key,
    Response.json(result, { headers: { "Cache-Control": "max-age=300" } })
  );

  return result;
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
