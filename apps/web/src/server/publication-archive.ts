import { getSectionOptions } from "@ortodoksas-lt/content/sections";
import { articles } from "@ortodoksas-lt/db";
import { and, count, desc, eq, gte, like, lt, or, type SQL } from "drizzle-orm";

import { defaultLocale, type SiteLocale } from "../i18n/config";
import {
  catalogEntry,
  catalogSelection,
  database,
  heroMap,
  parseLabels,
} from "./publication-data";

const fourDigitYear = /^\d{4}$/u;

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
  const rows = await database()
    .selectDistinct({ section: articles.section })
    .from(articles)
    .where(
      and(
        eq(articles.status, "published"),
        eq(articles.language, language),
        eq(articles.kind, "article")
      )
    );
  return getSectionOptions(rows.map((row) => row.section));
}
