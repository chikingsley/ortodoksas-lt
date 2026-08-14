import type { JSONContent } from "@tiptap/core";

import type { TiptapDocument } from "./article";

type LocalizedPublicationLocale = "be" | "en" | "ru" | "uk";

export interface InternalPublicationHref {
  locale?: LocalizedPublicationLocale;
  path: string;
  suffix: string;
}

const CURRENT_ORIGIN = "https://ortodoksas.lt";
const INTERNAL_PUBLICATION_HOSTS = new Set([
  "be.ortodoksas.lt",
  "en.ortodoksas.lt",
  "ortodoksas-be.blogspot.com",
  "ortodoksas-en.blogspot.com",
  "ortodoksas-ru.blogspot.com",
  "ortodoksas-uk.blogspot.com",
  "ortodoksas.blogspot.com",
  "ortodoksas.lt",
  "ru.ortodoksas.lt",
  "uk.ortodoksas.lt",
  "www.ortodoksas.lt",
]);
const HOST_LOCALES = new Map<string, LocalizedPublicationLocale>([
  ["be.ortodoksas.lt", "be"],
  ["en.ortodoksas.lt", "en"],
  ["ortodoksas-be.blogspot.com", "be"],
  ["ortodoksas-en.blogspot.com", "en"],
  ["ortodoksas-ru.blogspot.com", "ru"],
  ["ortodoksas-uk.blogspot.com", "uk"],
  ["ru.ortodoksas.lt", "ru"],
  ["uk.ortodoksas.lt", "uk"],
]);
const LOCALIZED_PUBLICATION_PATH_PATTERN = /^\/(be|en|ru|uk)(\/.*)$/u;
const PUBLICATION_PATH_PATTERN =
  /^\/(?:p\/[^/?#]+|\d{4}\/\d{2}\/[^/?#]+)(?:\.html)?$/u;
const HISTORICAL_HTML_SUFFIX_PATTERN = /\.html$/u;
const ABSOLUTE_URL_PATTERN = /^https?:\/\//u;

const canonicalPublicationPath = (pathname: string): string | undefined =>
  PUBLICATION_PATH_PATTERN.test(pathname)
    ? pathname.replace(HISTORICAL_HTML_SUFFIX_PATTERN, "")
    : undefined;

export const parseInternalPublicationHref = (
  href: string
): InternalPublicationHref | undefined => {
  try {
    const url = new URL(href, CURRENT_ORIGIN);
    if (!INTERNAL_PUBLICATION_HOSTS.has(url.hostname)) {
      return;
    }
    const localizedMatch = url.pathname.match(
      LOCALIZED_PUBLICATION_PATH_PATTERN
    );
    const path = canonicalPublicationPath(localizedMatch?.[2] ?? url.pathname);
    if (!path) {
      return;
    }
    const locale =
      (localizedMatch?.[1] as LocalizedPublicationLocale | undefined) ??
      HOST_LOCALES.get(url.hostname);
    return {
      ...(locale ? { locale } : {}),
      path,
      suffix: `${url.search}${url.hash}`,
    };
  } catch (error) {
    if (error instanceof TypeError) {
      return;
    }
    throw error;
  }
};

export const canonicalizePublicationHref = (href: string): string => {
  const parsed = parseInternalPublicationHref(href);
  if (!parsed) {
    return href;
  }
  return `${parsed.locale ? `/${parsed.locale}` : ""}${parsed.path}${parsed.suffix}`;
};

const canonicalizeVisibleUrl = (value: string): string => {
  const trimmed = value.trim();
  const canonical = canonicalizePublicationHref(trimmed);
  if (canonical === trimmed) {
    return value;
  }
  const replacement = ABSOLUTE_URL_PATTERN.test(trimmed)
    ? `${CURRENT_ORIGIN}${canonical}`
    : canonical;
  return value.replace(trimmed, replacement);
};

const canonicalizeNode = (node: JSONContent): JSONContent => ({
  ...node,
  ...(node.marks
    ? {
        marks: node.marks.map((mark) => {
          const href = mark.attrs?.href;
          return typeof href === "string"
            ? {
                ...mark,
                attrs: {
                  ...mark.attrs,
                  href: canonicalizePublicationHref(href),
                },
              }
            : mark;
        }),
      }
    : {}),
  ...(node.content ? { content: node.content.map(canonicalizeNode) } : {}),
  ...(typeof node.text === "string"
    ? { text: canonicalizeVisibleUrl(node.text) }
    : {}),
});

export const canonicalizePublicationDocument = (
  document: TiptapDocument
): TiptapDocument => canonicalizeNode(document) as TiptapDocument;
