import type { UpdateArticleInput } from "@ortodoksas-lt/content/article";

const HTML_SUFFIX_PATTERN = /\.html$/u;
const LEADING_SLASHES_PATTERN = /^\/+/u;

export const publicationTimestamp = (
  status: UpdateArticleInput["status"],
  publishedAt: number | null | undefined,
  timestamp: number
): number | null =>
  status === "published" ? (publishedAt ?? timestamp) : (publishedAt ?? null);

export const publicArticleUrl = (
  origin: string,
  language: string,
  slug: string
): string => {
  const normalizedOrigin = origin.endsWith("/") ? origin : `${origin}/`;
  const normalizedSlug = slug
    .replace(LEADING_SLASHES_PATTERN, "")
    .replace(HTML_SUFFIX_PATTERN, "");
  const localePrefix = language === "lt" ? "" : `${language}/`;
  return new URL(`${localePrefix}${normalizedSlug}.html`, normalizedOrigin)
    .href;
};
