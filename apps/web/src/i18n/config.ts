import {
  type SiteLocale as SharedSiteLocale,
  siteLocales as sharedSiteLocales,
} from "@ortodoksas-lt/content/site";

export const siteLocales = sharedSiteLocales;

export const defaultLocale = "lt" as const;

export type SiteLocale = SharedSiteLocale;
export type Locale = Exclude<SiteLocale, typeof defaultLocale>;

export const localeShells = siteLocales.filter(
  (locale): locale is Locale => locale !== defaultLocale
);

export const localeMetadata: Record<
  SiteLocale,
  { dateLocale: string; displayCode: string; languageName: string }
> = {
  be: { dateLocale: "be-BY", displayCode: "BY", languageName: "Беларуская" },
  en: { dateLocale: "en-GB", displayCode: "EN", languageName: "English" },
  lt: { dateLocale: "lt-LT", displayCode: "LT", languageName: "Lietuvių" },
  ru: { dateLocale: "ru-RU", displayCode: "RU", languageName: "Русский" },
  uk: { dateLocale: "uk-UA", displayCode: "UA", languageName: "Українська" },
};
