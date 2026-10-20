import {
  canonicalizePublicationHref,
  parseInternalPublicationHref,
} from "@ortodoksas-lt/content/publication-link";
import type { PageTemplate } from "@ortodoksas-lt/content/site";
import type {
  TranslationKind,
  TranslationReviewStatus,
} from "@ortodoksas-lt/content/translation";
import { hasText } from "@ortodoksas-lt/content/value";

import type { SiteLocale } from "../../i18n/config";
import { formatPublicationDate } from "../../i18n/dates";
import { site } from "../../site";

export interface CatalogEntry {
  byline: string | null;
  bylineType: "organization" | "person";
  bylineUrl: string | null;
  description: string;
  hero: string | null;
  heroAlt: string;
  heroFit: "contain" | "cover";
  heroFocalX: number;
  heroFocalY: number;
  heroMediaId: string | null;
  homepage?: "feed" | "lead" | "secondary" | undefined;
  homepageOrder?: number | undefined;
  kind: "article" | "page";
  labels: string[];
  pageTemplate: PageTemplate;
  path: string;
  published: string | null;
  section: string;
  seoDescription: string | null;
  seoTitle: string | null;
  title: string;
  translationGroupId?: string;
  translationKind?: TranslationKind;
  translationReviewStatus?: TranslationReviewStatus;
}

export interface ContentPage extends CatalogEntry {
  html: string;
}

export type LocalizedPage = ContentPage & { locale: Exclude<SiteLocale, "lt"> };

export type LocalizedArticle = LocalizedPage & { kind: "article" };

export interface LocaleDestination {
  hasCounterpart: boolean;
  href: string;
}

const imageSourcePattern = /\bsrc\s*=\s*["'](?<source>[^"']+)["']/iu;

const firstMediaTablePattern =
  /<table\b[\s\S]*?<img\b[^>]*>[\s\S]*?<\/table>/iu;

const standaloneStrongHeadingPattern =
  /<p>\s*<strong>(?<heading>[^<]{1,180})<\/strong>\s*<\/p>/giu;

const youtubeIframePattern = /<iframe\b[^>]*><\/iframe\s*>/giu;

const youtubeEmbedSourcePattern =
  /\bsrc\s*=\s*["'](?<source>https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]+(?:\?[^"']*)?)["']/iu;

const leadFigurePattern = /<figure\b[^>]*\bdata-figure-role=["']lead["']/iu;
const openingFigurePattern = /^\s*<figure\b/iu;
const figurePattern = /<figure\b[^>]*>[\s\S]*?<\/figure>/giu;

const figureMediaIdPattern =
  /\bdata-media-id=(?:"(?<doubleQuotedId>[^"]+)"|'(?<singleQuotedId>[^']+)')/iu;

const hrefPattern = /\bhref\s*=\s*(?<quote>["'])(?<source>[^"']+)\1/giu;
const localizedPathPattern = /^\/(?:be|en|ru|uk)(?:\/|$)/u;

const sourceTranslationLabels = new Set([
  "neoficialus vertimas",
  "neoficialus vertimas / unofficial translation",
  "unofficial translation",
  "ανεπίσημη μετάφραση",
  "ανεπίσημη μετάφραση / unofficial translation",
  "неофіційний переклад",
  "неофициальный перевод",
  "неафіцыйны пераклад",
  "traducere neoficială",
]);

// Keep source annotations in the archived source and editable CMS body.
function omitSourceTranslationLabels(html: string) {
  return html.replaceAll(
    /<(?<tag>p|h[2-6])\b[^>]*>(?<inner>[\s\S]*?)<\/\1>/giu,
    (block, _tag: string, inner: string) => {
      const label = inner
        .replaceAll(/<[^>]*>/gu, "")
        .replaceAll(/&nbsp;|&#160;/giu, " ")
        .replaceAll(/\s+/gu, " ")
        .trim()
        .replaceAll(/^\(|\)$/gu, "")
        .trim()
        .toLowerCase();

      return sourceTranslationLabels.has(label) ? "" : block;
    }
  );
}

export function formatDate(
  value: string | null | undefined,
  locale: SiteLocale = "lt"
) {
  if (!hasText(value)) {
    return "";
  }

  return formatPublicationDate(new Date(value), locale);
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toLocaleLowerCase("lt");
}

export function sectionSlug(section: string) {
  return normalizeText(section)
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");
}

export function excerpt(value: string, length = 180) {
  const text = value
    .replaceAll(/<[^>]+>/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();

  return text.length > length
    ? `${text.slice(0, length - 1).trimEnd()}…`
    : text;
}

interface CleanHtmlOptions {
  hero?: string | null;
  heroMediaId?: string | null;
  removeFirstMedia?: boolean;
}

export function cleanHtml(value: string, options: CleanHtmlOptions = {}) {
  const { hero, heroMediaId, removeFirstMedia = false } = options;
  const trustedYoutubeFrames: string[] = [];

  const cleaned = omitSourceTranslationLabels(value)
    .replaceAll(
      /<(?<closing>\/?)h1(?<attributes>\b[^>]*)>/giu,
      "<$<closing>h2$<attributes>>"
    )
    .replaceAll(/<script[\s\S]*?<\/script>/giu, "")
    .replaceAll(/<style[\s\S]*?<\/style>/giu, "")
    .replaceAll(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .replaceAll(youtubeIframePattern, (frame) => {
      if (!youtubeEmbedSourcePattern.test(frame)) {
        return "";
      }

      const index = trustedYoutubeFrames.push(frame) - 1;

      return `<!--canonical-youtube-${index}-->`;
    })
    .replaceAll(
      /<(?<element>iframe|frame|object|form)\b[\s\S]*?<\/\1\s*>/giu,
      ""
    )
    .replaceAll(/<(?:iframe|frame|object|embed|form)\b[^>]*\/?\s*>/giu, "")
    .replaceAll(/<link\b[^>]*>/giu, "")
    .replaceAll(/<base\b[^>]*>/giu, "")
    .replaceAll(
      /\s+(?:href|src|data|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript|file):[^"]*"|'\s*(?:javascript|vbscript|file):[^']*')/giu,
      ""
    )
    .replaceAll(standaloneStrongHeadingPattern, "<h2>$1</h2>")
    .replaceAll(
      /<!--canonical-youtube-(?<index>\d+)-->/gu,
      (_token, index: string) => trustedYoutubeFrames[Number(index)] ?? ""
    );

  if (!hasText(hero)) {
    return cleaned;
  }

  const withoutHeroFigure = hasText(heroMediaId)
    ? cleaned.replaceAll(figurePattern, (figure) => {
        const mediaId = figureMediaIdPattern.exec(figure);

        return (mediaId?.[1] ?? mediaId?.[2]) === heroMediaId ? "" : figure;
      })
    : cleaned;

  const heroName =
    decodeURIComponent(hero).split("?")[0]?.split("/").pop() ?? "";

  if (!heroName) {
    return withoutHeroFigure;
  }

  const deduped = removeFirstMedia
    ? withoutHeroFigure.replace(firstMediaTablePattern, "")
    : withoutHeroFigure;

  return deduped.replaceAll(/<img\b[^>]*>/giu, (tag) => {
    const source = imageSourcePattern.exec(tag)?.[1];

    const sourceName = hasText(source)
      ? (decodeURIComponent(source).split("?")[0]?.split("/").pop() ?? "")
      : undefined;

    return sourceName === heroName ? "" : tag;
  });
}

export function hasLeadFigure(value: string) {
  return leadFigurePattern.test(value) || openingFigurePattern.test(value);
}

export function getInternalPublicationPaths(value: string) {
  return [
    ...new Set(
      [...value.matchAll(hrefPattern)].flatMap((match) => {
        const internalHref = parseInternalPublicationHref(match[2] ?? "");

        return internalHref ? [internalHref.path] : [];
      })
    ),
  ];
}

export function localizePublicationLinks(
  value: string,
  locale: Exclude<SiteLocale, "lt">,
  localizedPaths: ReadonlyMap<string, string>
) {
  return value.replaceAll(
    hrefPattern,
    (attribute, quote: string, href: string) => {
      if (localizedPathPattern.test(href)) {
        return attribute;
      }

      const source = parseInternalPublicationHref(href);

      if (!source) {
        return attribute;
      }

      const destination = localizedPaths.get(source.path) ?? source.path;

      return `href=${quote}/${locale}${destination}${source.suffix}${quote}`;
    }
  );
}

export function canonicalizePublicationLinks(value: string) {
  return value.replaceAll(
    hrefPattern,
    (attribute, quote: string, href: string) => {
      const canonicalHref = canonicalizePublicationHref(href);

      return canonicalHref === href
        ? attribute
        : `href=${quote}${canonicalHref}${quote}`;
    }
  );
}

export function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function absoluteUrl(path: string) {
  return new URL(path, site.origin).toString();
}
