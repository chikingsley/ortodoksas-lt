import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getSectionOptions } from "@ortodoksas-lt/content/sections";
import type {
  TranslationKind,
  TranslationReviewStatus,
} from "@ortodoksas-lt/content/translation";
import { siteOrigin } from "../config/site";
import {
  type Locale,
  localeMetadata,
  localeShells,
  type SiteLocale,
} from "../i18n/config";
import { ui } from "../i18n/ui";

import { localizeMediaHtml, localizeMediaUrl } from "./media";

export interface CatalogEntry {
  capture?: string;
  description: string;
  file?: string;
  hero: string | null;
  homepage?: "feed" | "lead" | "secondary";
  homepageOrder?: number;
  kind: "article" | "page";
  labels: string[];
  path: string;
  published: string | null;
  section: string;
  source?: string;
  title: string;
  translationGroupId?: string;
  translationKind?: TranslationKind;
  translationReviewStatus?: TranslationReviewStatus;
}

export interface ContentPage extends CatalogEntry {
  html: string;
}

export interface LocalizedPage extends CatalogEntry {
  html: string;
  locale: Locale;
}

export type LocalizedArticle = LocalizedPage & { kind: "article" };

const contentRoot = resolve(process.cwd(), ".canonical-content");
const pagesDirectory = resolve(contentRoot, "pages");
const localesDirectory = resolve(contentRoot, "locales");
const safeLocaleFilePattern = /^pages\/[A-Za-z0-9._-]+\.json$/;
const imageSourcePattern = /\bsrc\s*=\s*["']([^"']+)["']/i;
const firstMediaTablePattern = /<table\b[\s\S]*?<img\b[^>]*>[\s\S]*?<\/table>/i;
const standaloneStrongHeadingPattern =
  /<p>\s*<strong>([^<]{1,180})<\/strong>\s*<\/p>/gi;
const youtubeIframePattern = /<iframe\b[^>]*><\/iframe\s*>/gi;
const youtubeEmbedSourcePattern =
  /\bsrc\s*=\s*["'](https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]+(?:\?[^"']*)?)["']/i;
const leadFigurePattern = /<figure\b[^>]*\bdata-figure-role=["']lead["']/i;
const contentFiles = readdirSync(pagesDirectory, { encoding: "utf8" }).filter(
  (file) => file.endsWith(".json")
);

function readJson<T>(base: string, file: string): T {
  const path = join(base, file);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    throw new Error(`Unable to read publication JSON: ${path}`, {
      cause: error,
    });
  }
}

const canonicalPages = contentFiles
  .map((file) => readJson<ContentPage>(pagesDirectory, file))
  .filter((page) => page.path !== "/")
  .map((page) => ({
    ...page,
    hero: localizeMediaUrl(page.hero, page.path),
    html: localizeMediaHtml(page.html),
  }));

const catalogValue = readJson<CatalogEntry[]>(contentRoot, "catalog.json");
const canonicalCatalog = catalogValue.map((entry) => ({
  ...entry,
  hero: localizeMediaUrl(entry.hero, entry.path),
}));

function assertUniquePaths(entries: CatalogEntry[], label: string) {
  const paths = new Set<string>();
  for (const entry of entries) {
    if (paths.has(entry.path)) {
      throw new Error(`Duplicate ${label} path: ${entry.path}`);
    }
    paths.add(entry.path);
  }
  return entries;
}

export const pages = assertUniquePaths(
  canonicalPages,
  "Lithuanian publication"
) as ContentPage[];

export const catalog = assertUniquePaths(
  canonicalCatalog,
  "Lithuanian catalog"
);

export const articles = catalog
  .filter((entry) => entry.kind === "article")
  .sort((a, b) => {
    const left = a.published ? Date.parse(a.published) : 0;
    const right = b.published ? Date.parse(b.published) : 0;
    return right - left;
  });

export const sections = getSectionOptions(
  articles.map((entry) => entry.section)
);

function isCanonicalLocaleCatalogEntry(
  value: unknown
): value is CatalogEntry & { file: string; translationGroupId: string } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Partial<CatalogEntry>;
  return (
    (entry.kind === "article" || entry.kind === "page") &&
    typeof entry.path === "string" &&
    entry.path.startsWith("/") &&
    typeof entry.file === "string" &&
    typeof entry.title === "string" &&
    typeof entry.description === "string" &&
    typeof entry.translationGroupId === "string" &&
    Array.isArray(entry.labels)
  );
}

function isSafeLocaleFile(file: string) {
  return safeLocaleFilePattern.test(file);
}

function loadLocalizedPages(locale: Locale): LocalizedPage[] {
  const localeCatalogValue = readJson<unknown>(
    localesDirectory,
    `${locale}/catalog.json`
  );
  if (!Array.isArray(localeCatalogValue)) {
    throw new Error(`Invalid ${locale} publication catalog: expected an array`);
  }
  return localeCatalogValue
    .map((rawEntry, index) => {
      if (!isCanonicalLocaleCatalogEntry(rawEntry)) {
        throw new Error(`Invalid ${locale} catalog entry at index ${index}`);
      }
      if (!isSafeLocaleFile(rawEntry.file)) {
        throw new Error(
          `Unsafe ${locale} catalog file at index ${index}: ${rawEntry.file}`
        );
      }
      const page = readJson<ContentPage>(
        join(localesDirectory, locale),
        rawEntry.file
      );
      if (page.path !== rawEntry.path || typeof page.html !== "string") {
        throw new Error(
          `Localized ${locale} page does not match catalog entry: ${rawEntry.path}`
        );
      }
      return {
        ...page,
        hero: localizeMediaUrl(page.hero, page.path),
        html: localizeMediaHtml(page.html),
        locale,
      };
    })
    .sort(
      (a, b) => Date.parse(b.published ?? "") - Date.parse(a.published ?? "")
    );
}

export const localizedPages = Object.fromEntries(
  localeShells.map((locale) => [
    locale,
    assertUniquePaths(loadLocalizedPages(locale), `${locale} publication`).sort(
      (a, b) => Date.parse(b.published ?? "") - Date.parse(a.published ?? "")
    ),
  ])
) as Record<Locale, LocalizedPage[]>;

export function getLocalizedArticles(locale: Locale) {
  return localizedPages[locale].filter(
    (page): page is LocalizedArticle => page.kind === "article"
  );
}

export function getLocalizedPages(locale: Locale) {
  return localizedPages[locale];
}

export function getLocalizedPage(locale: Locale, path: string) {
  return localizedPages[locale].find((page) => page.path === path);
}

const localePrefixes = localeShells.map((locale) => `/${locale}`);

function unprefixLocalePath(path: string) {
  const normalized = path === "" ? "/" : path;
  for (const prefix of localePrefixes) {
    if (normalized === prefix) {
      return "/";
    }
    if (normalized.startsWith(`${prefix}/`)) {
      return normalized.slice(prefix.length) || "/";
    }
  }
  return normalized;
}

function getCurrentArticle(currentPath: string) {
  const path = unprefixLocalePath(currentPath);
  const locale = localeShells.find(
    (candidate) =>
      currentPath === `/${candidate}` ||
      currentPath.startsWith(`/${candidate}/`)
  );
  return locale ? getLocalizedPage(locale, path) : getPage(path);
}

function getCounterpart(locale: SiteLocale, currentPath: string) {
  const path = unprefixLocalePath(currentPath);
  const current = getCurrentArticle(currentPath);
  const candidates = locale === "lt" ? pages : localizedPages[locale];
  if (current?.translationGroupId) {
    const grouped = candidates.find(
      (entry) => entry.translationGroupId === current.translationGroupId
    );
    if (grouped) {
      return grouped;
    }
  }
  return candidates.find((entry) => entry.path === path);
}

export function getLithuanianCounterpart(currentPath: string) {
  return getCounterpart("lt", currentPath);
}

export function getLocalizedCounterpart(locale: Locale, sourcePath: string) {
  return getCounterpart(locale, sourcePath);
}

export interface LocaleDestination {
  hasCounterpart: boolean;
  href: string;
}

/** Return edition destinations and expose when a page-level counterpart is unavailable. */
export function getLocaleLinks(currentPath: string) {
  if (unprefixLocalePath(currentPath) === "/") {
    return {
      be: { hasCounterpart: true, href: "/be" },
      en: { hasCounterpart: true, href: "/en" },
      lt: { hasCounterpart: true, href: "/" },
      ru: { hasCounterpart: true, href: "/ru" },
      uk: { hasCounterpart: true, href: "/uk" },
    };
  }
  const be = getCounterpart("be", currentPath);
  const en = getCounterpart("en", currentPath);
  const lt = getCounterpart("lt", currentPath);
  const ru = getCounterpart("ru", currentPath);
  const uk = getCounterpart("uk", currentPath);
  return {
    be: { hasCounterpart: Boolean(be), href: be ? `/be${be.path}` : "/be" },
    en: { hasCounterpart: Boolean(en), href: en ? `/en${en.path}` : "/en" },
    lt: { hasCounterpart: Boolean(lt), href: lt?.path ?? "/" },
    ru: { hasCounterpart: Boolean(ru), href: ru ? `/ru${ru.path}` : "/ru" },
    uk: { hasCounterpart: Boolean(uk), href: uk ? `/uk${uk.path}` : "/uk" },
  } as const;
}

/** Return only equivalent pages suitable for reciprocal hreflang annotations. */
export function getLocaleAlternates(currentPath: string) {
  const path = unprefixLocalePath(currentPath);
  const alternates: Array<{ href: string; locale: SiteLocale }> = [];
  const lithuanian =
    path === "/" ? undefined : getCounterpart("lt", currentPath);
  if (path === "/" || lithuanian) {
    alternates.push({ href: lithuanian?.path ?? "/", locale: "lt" });
  }
  for (const locale of localeShells) {
    const counterpart =
      path === "/" ? undefined : getCounterpart(locale, currentPath);
    if (path === "/" || counterpart) {
      alternates.push({
        href: `/${locale}${counterpart?.path ?? ""}`,
        locale,
      });
    }
  }
  return alternates;
}

export function getPage(path: string) {
  return pages.find((page) => page.path === path);
}

export function formatDate(
  value: string | null | undefined,
  locale: SiteLocale = "lt"
) {
  if (!value) {
    return ui[locale].undated;
  }
  return new Intl.DateTimeFormat(localeMetadata[locale].dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("lt");
}

export function sectionSlug(section: string) {
  return normalizeText(section)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function excerpt(value: string, length = 180) {
  const text = value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length
    ? `${text.slice(0, length - 1).trimEnd()}…`
    : text;
}

export function cleanHtml(
  value: string,
  hero?: string | null,
  removeFirstMedia = false
) {
  const trustedYoutubeFrames: string[] = [];
  const cleaned = value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(youtubeIframePattern, (frame) => {
      if (!youtubeEmbedSourcePattern.test(frame)) {
        return "";
      }
      const index = trustedYoutubeFrames.push(frame) - 1;
      return `<!--canonical-youtube-${index}-->`;
    })
    .replace(/<(iframe|frame|object|form)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(?:iframe|frame|object|embed|form)\b[^>]*\/?\s*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    .replace(
      /\s+(?:href|src|data|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript|file):[^"]*"|'\s*(?:javascript|vbscript|file):[^']*')/gi,
      ""
    )
    .replace(standaloneStrongHeadingPattern, "<h2>$1</h2>")
    .replace(
      /<!--canonical-youtube-(\d+)-->/g,
      (_token, index: string) => trustedYoutubeFrames[Number(index)] ?? ""
    );
  if (!hero) {
    return cleaned;
  }
  const heroName =
    decodeURIComponent(hero).split("?")[0]?.split("/").pop() ?? "";
  if (!heroName) {
    return cleaned;
  }
  const deduped = removeFirstMedia
    ? cleaned.replace(firstMediaTablePattern, "")
    : cleaned;
  return deduped.replace(/<img\b[^>]*>/gi, (tag) => {
    const source = tag.match(imageSourcePattern)?.[1];
    const sourceName = source
      ? (decodeURIComponent(source).split("?")[0]?.split("/").pop() ?? "")
      : undefined;
    return sourceName === heroName ? "" : tag;
  });
}

export function hasLeadFigure(value: string) {
  return leadFigurePattern.test(value);
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function absoluteUrl(path: string) {
  return new URL(path, siteOrigin).toString();
}
