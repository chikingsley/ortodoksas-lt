import { hasText } from "@ortodoksas-lt/content/value";
import type { JSONContent } from "@tiptap/core";
import { z } from "zod";

import type { TiptapDocument } from "./article";
import { siteLocales } from "./site";

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

const LOCALIZED_PUBLICATION_PATH_PATTERN =
  /^\/(?<locale>be|en|ru|uk)(?<path>\/.*)$/u;

const PUBLICATION_PATH_PATTERN =
  /^\/(?:p\/[^/?#]+|\d{4}\/\d{2}\/[^/?#]+)(?:\.html)?$/u;

const HISTORICAL_HTML_SUFFIX_PATTERN = /\.html$/u;
const ABSOLUTE_URL_PATTERN = /^https?:\/\//u;
const VISIBLE_URL_PATTERN = /^(?:https?:\/\/|\/)[^\s]+$/u;

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

    const localizedMatch = LOCALIZED_PUBLICATION_PATH_PATTERN.exec(
      url.pathname
    );

    const path = canonicalPublicationPath(localizedMatch?.[2] ?? url.pathname);

    if (!hasText(path)) {
      return;
    }

    const locale =
      siteLocales.find(
        (candidate): candidate is LocalizedPublicationLocale =>
          candidate !== "lt" && candidate === localizedMatch?.[1]
      ) ?? HOST_LOCALES.get(url.hostname);

    return {
      ...(locale === undefined ? undefined : { locale }),
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

  if (!VISIBLE_URL_PATTERN.test(trimmed)) {
    return value;
  }

  const canonical = canonicalizePublicationHref(trimmed);

  if (canonical === trimmed) {
    return value;
  }

  const replacement = ABSOLUTE_URL_PATTERN.test(trimmed)
    ? `${CURRENT_ORIGIN}${canonical}`
    : canonical;

  return value.replace(trimmed, replacement);
};

function canonicalizeNode(node: JSONContent): JSONContent {
  const canonical = { ...node };

  if (node.marks) {
    canonical.marks = node.marks.map((mark) => {
      const href = z.string().safeParse(mark.attrs?.href);

      return href.success
        ? {
            ...mark,
            attrs: {
              ...mark.attrs,
              href: canonicalizePublicationHref(href.data),
            },
          }
        : mark;
    });
  }

  if (node.content) {
    canonical.content = node.content.map(canonicalizeNode);
  }

  if (node.text !== undefined) {
    canonical.text = canonicalizeVisibleUrl(node.text);
  }

  return canonical;
}

export const canonicalizePublicationDocument = (
  document: TiptapDocument
): TiptapDocument => ({ ...canonicalizeNode(document), type: "doc" });
