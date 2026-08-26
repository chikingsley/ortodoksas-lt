import { getTranslationDisplayState } from "@ortodoksas-lt/content/translation";
import { localeShells, type SiteLocale } from "../../i18n/config";
import { ui } from "../../i18n/ui";
import {
  getCommunityDirectory,
  getPeopleDirectory,
} from "../../server/directory-data";
import { getPage } from "../../server/publication-catalog";
import {
  getLocalizedCounterparts,
  getTranslationGroupCounterpart,
} from "../../server/publication-localization";
import {
  type ContentPage,
  canonicalizePublicationLinks,
  cleanHtml,
  getInternalPublicationPaths,
  hasLeadFigure,
  localizePublicationLinks,
} from "./publication";

const CALENDAR_PREFIX_PATTERN = /^🗓️\s*/u;
const resolveLocalePath = (path: string) => {
  const [requestedLocale, ...remainingSegments] = path.split("/");
  const locale: SiteLocale = localeShells.includes(requestedLocale as never)
    ? (requestedLocale as SiteLocale)
    : "lt";
  const localized = locale !== "lt";
  const pathSegments = localized
    ? remainingSegments
    : [requestedLocale, ...remainingSegments];
  return {
    locale,
    localized,
    publicationPath: `/${pathSegments.join("/")}`,
  };
};

const getLocalizedHtml = async (
  html: string,
  locale: SiteLocale
): Promise<string> => {
  const canonicalHtml = canonicalizePublicationLinks(html);
  if (locale === "lt") {
    return canonicalHtml;
  }
  const sourceLinks = getInternalPublicationPaths(canonicalHtml);
  const localizedLinks = await getLocalizedCounterparts(locale, sourceLinks);
  return localizePublicationLinks(
    canonicalHtml,
    locale,
    new Map(
      [...localizedLinks].map(([sourcePath, entry]) => [sourcePath, entry.path])
    )
  );
};

const getDirectoryData = (
  pageTemplate: "community_directory" | "people_directory" | string,
  locale: SiteLocale
) => {
  if (pageTemplate === "people_directory") {
    return getPeopleDirectory(locale);
  }
  if (pageTemplate === "community_directory") {
    return getCommunityDirectory(locale);
  }
};

const getSearchMetadata = (page: ContentPage, displayTitle: string) => ({
  description:
    page.seoDescription?.trim() ||
    page.description ||
    `${displayTitle} · ortodoksas.lt`,
  searchTitle: page.seoTitle?.trim() || displayTitle,
});

const getArticleSchema = (page: ContentPage, canonicalPath: string) => {
  if (page.kind !== "article") {
    return;
  }
  const author = page.byline
    ? {
        "@type": page.bylineType === "organization" ? "Organization" : "Person",
        name: page.byline,
        ...(page.bylineUrl ? { url: page.bylineUrl } : {}),
      }
    : undefined;
  return {
    articleSection: page.section,
    ...(author ? { author } : {}),
    dateModified: page.published ?? undefined,
    datePublished: page.published ?? undefined,
    headline: page.title,
    keywords: page.labels.join(", "),
    mainEntityOfPage: canonicalPath,
  };
};

export async function resolvePublicationPage(path: string) {
  const { locale, localized, publicationPath } = resolveLocalePath(path);
  const page = await getPage(locale, publicationPath);
  if (!page) {
    return;
  }

  const copy = ui[locale];
  const canonicalPath = localized ? `/${locale}${page.path}` : page.path;
  const original =
    localized && page.translationGroupId
      ? await getTranslationGroupCounterpart("lt", page.translationGroupId)
      : undefined;
  const translationState = getTranslationDisplayState({
    kind: page.translationKind ?? "original",
    reviewStatus: page.translationReviewStatus ?? "not_required",
  });
  const bodyOwnsLeadImage = hasLeadFigure(page.html);
  const { pageTemplate } = page;
  const displayTitle = page.title.replace(CALENDAR_PREFIX_PATTERN, "");
  const { description, searchTitle } = getSearchMetadata(page, displayTitle);
  const structuredTemplate =
    pageTemplate === "people_directory" ||
    pageTemplate === "community_directory";
  const directoryData = await getDirectoryData(pageTemplate, locale);
  const localizedHtml = await getLocalizedHtml(page.html, locale);
  const bodyHtml = cleanHtml(localizedHtml, {
    hero: bodyOwnsLeadImage ? null : page.hero,
    heroMediaId: bodyOwnsLeadImage ? null : page.heroMediaId,
    removeFirstMedia: page.kind === "article",
  });

  return {
    articleSchema: getArticleSchema(page, canonicalPath),
    bodyHtml,
    bodyOwnsLeadImage,
    canonicalPath,
    copy,
    description,
    directoryData,
    displayTitle,
    locale,
    localized,
    original,
    page,
    pageTemplate,
    searchTitle,
    structuredTemplate,
    translationDisclosure:
      translationState === "editor_reviewed"
        ? copy.editorReviewedTranslation
        : copy.automaticTranslation,
    translationState,
    wideBody: pageTemplate !== "standard",
  };
}

export type PublicationPageModel = NonNullable<
  Awaited<ReturnType<typeof resolvePublicationPage>>
>;
