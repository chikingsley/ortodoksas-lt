import { defaultLocale, type SiteLocale } from "../../i18n/config";
import { ui } from "../../i18n/ui";

type UiCopy = (typeof ui)[SiteLocale];

export interface NavigationItem {
  href: string;
  id: PrimaryNavigationId;
  label: string;
  targetLocale: SiteLocale;
}

export interface ContactNavigationItem {
  href: string;
  id: "contacts" | "support";
  label: string;
  targetLocale: SiteLocale;
}

type PrimaryNavigationId =
  | "home"
  | "worship"
  | "clergy"
  | "library"
  | "calendar"
  | "archive";

interface PrimaryNavigationDefinition {
  id: PrimaryNavigationId;
  label: keyof Pick<
    UiCopy,
    "archive" | "calendar" | "clergy" | "home" | "library" | "worship"
  >;
  path: string;
}

const primaryNavigation: readonly PrimaryNavigationDefinition[] = [
  { id: "home", label: "home", path: "/" },
  {
    id: "worship",
    label: "worship",
    path: "/p/bendruomenes_21.html",
  },
  {
    id: "clergy",
    label: "clergy",
    path: "/p/dvasininkai.html",
  },
  {
    id: "library",
    label: "library",
    path: "/p/biblioteka.html",
  },
  {
    id: "calendar",
    label: "calendar",
    path: "/p/kalendorius.html",
  },
  { id: "archive", label: "archive", path: "/archyvas" },
] as const;

const contactNavigation = [
  { id: "contacts", label: "contacts", path: "/p/kontaktai_30.html" },
  { id: "support", label: "support", path: "/p/paremti.html" },
] as const;

function localizedHome(locale: SiteLocale) {
  return locale === defaultLocale ? "/" : `/${locale}`;
}

/**
 * Resolve the publication's shared primary navigation.
 *
 * Localized institutional pages appear once their translated counterpart is
 * published. This keeps every visible link inside the selected edition.
 */
export function getPrimaryNavigation(
  locale: SiteLocale,
  resolveLocalizedPath: (path: string) => string | undefined = () => undefined
): NavigationItem[] {
  return primaryNavigation.flatMap((item) => {
    if (item.id === "home") {
      return {
        href: localizedHome(locale),
        id: item.id,
        label: ui[locale][item.label],
        targetLocale: locale,
      };
    }
    if (item.id === "archive" && locale !== defaultLocale) {
      return {
        href: `/${locale}#articles`,
        id: item.id,
        label: ui[locale][item.label],
        targetLocale: locale,
      };
    }
    const localizedPath =
      locale === defaultLocale ? undefined : resolveLocalizedPath(item.path);
    if (locale !== defaultLocale && !localizedPath) {
      return [];
    }
    return {
      href: localizedPath ? `/${locale}${localizedPath}` : item.path,
      id: item.id,
      label: ui[locale][item.label],
      targetLocale: locale,
    };
  });
}

export function getContactNavigation(
  locale: SiteLocale,
  resolveLocalizedPath: (path: string) => string | undefined = () => undefined
): ContactNavigationItem[] {
  return contactNavigation.flatMap((item) => {
    const localizedPath =
      locale === defaultLocale ? undefined : resolveLocalizedPath(item.path);
    if (locale !== defaultLocale && !localizedPath) {
      return [];
    }
    return {
      href: localizedPath ? `/${locale}${localizedPath}` : item.path,
      id: item.id,
      label: ui[locale][item.label],
      targetLocale: locale,
    };
  });
}

export function isNavigationItemActive(
  currentPath: string,
  item: NavigationItem
) {
  if (item.id === "home") {
    return currentPath === item.href;
  }
  if (item.id === "archive") {
    return item.href.includes("#")
      ? currentPath === item.href
      : currentPath === item.href || currentPath === "/archyvas";
  }
  return currentPath === item.href;
}
