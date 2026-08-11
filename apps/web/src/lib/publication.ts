import type {
  TranslationKind,
  TranslationReviewStatus,
} from "@ortodoksas-lt/content/translation";
import { siteOrigin } from "../config/site";
import { localeMetadata, type SiteLocale } from "../i18n/config";
import { ui } from "../i18n/ui";

export interface CatalogEntry {
  description: string;
  hero: string | null;
  heroAlt: string;
  heroMediaId: string | null;
  homepage?: "feed" | "lead" | "secondary";
  homepageOrder?: number;
  kind: "article" | "page";
  labels: string[];
  path: string;
  published: string | null;
  section: string;
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

const imageSourcePattern = /\bsrc\s*=\s*["']([^"']+)["']/i;
const firstMediaTablePattern = /<table\b[\s\S]*?<img\b[^>]*>[\s\S]*?<\/table>/i;
const standaloneStrongHeadingPattern =
  /<p>\s*<strong>([^<]{1,180})<\/strong>\s*<\/p>/gi;
const youtubeIframePattern = /<iframe\b[^>]*><\/iframe\s*>/gi;
const youtubeEmbedSourcePattern =
  /\bsrc\s*=\s*["'](https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]+(?:\?[^"']*)?)["']/i;
const leadFigurePattern = /<figure\b[^>]*\bdata-figure-role=["']lead["']/i;
const figurePattern = /<figure\b[^>]*>[\s\S]*?<\/figure>/gi;
const figureMediaIdPattern = /\bdata-media-id=(?:"([^"]+)"|'([^']+)')/i;

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

interface CleanHtmlOptions {
  hero?: string | null;
  heroMediaId?: string | null;
  removeFirstMedia?: boolean;
}

export function cleanHtml(value: string, options: CleanHtmlOptions = {}) {
  const { hero, heroMediaId, removeFirstMedia = false } = options;
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
  const withoutHeroFigure = heroMediaId
    ? cleaned.replace(figurePattern, (figure) => {
        const mediaId = figure.match(figureMediaIdPattern);
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
