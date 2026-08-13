import { getTranslationDisplayState } from "@ortodoksas-lt/content/translation";
import { getInformationPageRole } from "../../content/information-pages";
import { localeShells, type SiteLocale } from "../../i18n/config";
import { ui } from "../../i18n/ui";
import { getPage } from "../../server/publication-catalog";
import {
  getLocalizedCounterparts,
  getTranslationGroupCounterpart,
} from "../../server/publication-localization";
import {
  cleanHtml,
  getInternalPublicationPaths,
  hasLeadFigure,
  localizePublicationLinks,
} from "./publication";

const CALENDAR_PREFIX_PATTERN = /^🗓️\s*/u;
const LEADING_LIBRARY_TABLE_PATTERN =
  /^\s*<div>\s*<\/div>\s*<table[\s\S]*?<\/table>/iu;

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
  if (locale === "lt") {
    return html;
  }
  const sourceLinks = getInternalPublicationPaths(html);
  const localizedLinks = await getLocalizedCounterparts(locale, sourceLinks);
  return localizePublicationLinks(
    html,
    locale,
    new Map(
      [...localizedLinks].map(([sourcePath, entry]) => [sourcePath, entry.path])
    )
  );
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
  const informationPage = getInformationPageRole(
    page.translationGroupId,
    page.path
  );
  const displayTitle = page.title.replace(CALENDAR_PREFIX_PATTERN, "");
  const customBody = locale === "lt" && informationPage !== undefined;
  const localizedHtml = await getLocalizedHtml(page.html, locale);
  const bodyHtml =
    customBody && informationPage === "library"
      ? cleanHtml(localizedHtml, {
          hero: page.hero,
          heroMediaId: page.heroMediaId,
        }).replace(LEADING_LIBRARY_TABLE_PATTERN, "")
      : cleanHtml(localizedHtml, {
          hero: bodyOwnsLeadImage ? null : page.hero,
          heroMediaId: bodyOwnsLeadImage ? null : page.heroMediaId,
          removeFirstMedia: page.kind === "article",
        });

  return {
    articleSchema:
      page.kind === "article"
        ? {
            articleSection: page.section,
            dateModified: page.published ?? undefined,
            datePublished: page.published ?? undefined,
            headline: page.title,
            keywords: page.labels.join(", "),
            mainEntityOfPage: canonicalPath,
          }
        : undefined,
    bodyHtml,
    bodyOwnsLeadImage,
    canonicalPath,
    copy,
    customBody,
    description: page.description || `${displayTitle} · ortodoksas.lt`,
    displayTitle,
    informationPage,
    locale,
    localized,
    original,
    page,
    translationDisclosure:
      translationState === "editor_reviewed"
        ? copy.editorReviewedTranslation
        : copy.automaticTranslation,
    translationState,
    wideBody: informationPage !== undefined,
  };
}

export type PublicationPageModel = NonNullable<
  Awaited<ReturnType<typeof resolvePublicationPage>>
>;
