import { readdirSync, readFileSync } from "node:fs";

export interface CatalogEntry {
  capture?: string;
  description: string;
  file?: string;
  hero: string | null;
  kind: "article" | "page";
  labels: string[];
  path: string;
  published: string | null;
  section: string;
  source?: string;
  title: string;
}

export interface ContentPage extends CatalogEntry {
  html: string;
}

export interface LocalizedMedia {
  alt: string | null;
  type: string;
  url: string;
}

export interface LocalizedProvenance {
  digest: string;
  original: string;
  timestamp: string;
  url: string;
}

export interface LocalizedCatalogEntry {
  date: string | null;
  description: string;
  file: string;
  internalLinks: Array<{ path: string; text: string; url: string }>;
  kind: "article";
  labels: string[];
  locale: Locale;
  media: LocalizedMedia[];
  path: string;
  provenance: LocalizedProvenance;
  title: string;
}

export interface LocalizedContentPage extends LocalizedCatalogEntry {
  body: string;
}

export interface LocalizedArticle extends CatalogEntry {
  html: string;
  locale: Locale;
}

const pagesDirectory = new URL("../../public/content/pages/", import.meta.url);
const localesDirectory = new URL(
  "../../public/content/locales/",
  import.meta.url
);
const safeLocaleFilePattern = /^pages\/[A-Za-z0-9._-]+\.json$/;
const contentFiles = readdirSync(pagesDirectory, { encoding: "utf8" }).filter(
  (file) => file.endsWith(".json")
);

function readJson<T>(base: URL, file: string) {
  try {
    return JSON.parse(readFileSync(new URL(file, base), "utf8")) as T;
  } catch {
    return null;
  }
}

export const pages = contentFiles
  .map((file) => readJson<ContentPage>(pagesDirectory, file))
  .filter((page): page is ContentPage => Boolean(page && page.path !== "/"));

const catalogValue = readJson<CatalogEntry[]>(
  pagesDirectory,
  "../catalog.json"
);
export const catalog = catalogValue ?? [];

export const articles = catalog
  .filter((entry) => entry.kind === "article")
  .sort((a, b) => {
    const left = a.published ? Date.parse(a.published) : 0;
    const right = b.published ? Date.parse(b.published) : 0;
    return right - left;
  });

export const sections = [
  ...new Set(articles.map((entry) => entry.section)),
].sort((a, b) => a.localeCompare(b, "lt"));

export const localeShells = ["en", "ru", "uk", "be"] as const;

export type Locale = (typeof localeShells)[number];

export type SiteLocale = "lt" | Locale;

export const localeUi: Record<
  SiteLocale,
  {
    articles: string;
    archive: string;
    backToLithuanian: string;
    edition: string;
    footerDescription: string;
    home: string;
    institution: string;
    languages: string;
    provenance: string;
    search: string;
  }
> = {
  be: {
    archive: "Выданне",
    articles: "Публікацыі",
    backToLithuanian: "Літоўскі архіў",
    edition: "Беларускае выданне",
    footerDescription:
      "Аўтэнтычныя матэрыялы беларускага выдання будуць дададзеныя пасля іх аднаўлення.",
    home: "Галоўная",
    institution: "Экзархат Канстанцінопальскага патрыярхату ў Літве",
    languages: "Мовы",
    provenance: "Аднаўлена з публічнай архіўнай копіі.",
    search: "Пошук",
  },
  en: {
    archive: "Edition",
    articles: "Publications",
    backToLithuanian: "Lithuanian archive",
    edition: "English edition",
    footerDescription:
      "Authentic English edition material will appear after it has been recovered.",
    home: "Home",
    institution: "Exarchate of the Ecumenical Patriarchate in Lithuania",
    languages: "Languages",
    provenance: "Recovered from a public archive copy.",
    search: "Search",
  },
  lt: {
    archive: "Archyvas",
    articles: "Įrašai",
    backToLithuanian: "Lietuviškas archyvas",
    edition: "Lietuviškas leidimas",
    footerDescription:
      "Apie Ortodoksų Bažnyčią Lietuvoje ir pasaulyje, jos tikėjimą, tradiciją ir gyvenimą.",
    home: "Pradžia",
    institution: "Konstantinopolio patriarchato egzarchatas Lietuvoje",
    languages: "Kalbos",
    provenance: "Šis tekstas atkurtas iš viešos archyvo kopijos.",
    search: "Ieškoti archyve",
  },
  ru: {
    archive: "Издание",
    articles: "Публикации",
    backToLithuanian: "Литовский архив",
    edition: "Русское издание",
    footerDescription:
      "Аутентичные материалы русского издания, восстановленные из публичного архива.",
    home: "Главная",
    institution: "Экзархат Вселенского патриархата в Литве",
    languages: "Языки",
    provenance: "Восстановлено по публичной архивной копии.",
    search: "Поиск",
  },
  uk: {
    archive: "Видання",
    articles: "Публікації",
    backToLithuanian: "Литовський архів",
    edition: "Українське видання",
    footerDescription:
      "Автентичні матеріали українського видання, відновлені з публічного архіву.",
    home: "Головна",
    institution: "Екзархат Вселенського патріархату в Литві",
    languages: "Мови",
    provenance: "Відновлено з публічної архівної копії.",
    search: "Пошук",
  },
};

const localeDateLocales: Record<SiteLocale, string> = {
  be: "be-BY",
  en: "en-GB",
  lt: "lt-LT",
  ru: "ru-RU",
  uk: "uk-UA",
};

function isLocalizedCatalogEntry(
  value: unknown,
  locale: Locale
): value is LocalizedCatalogEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Partial<LocalizedCatalogEntry>;
  return (
    entry.locale === locale &&
    entry.kind === "article" &&
    typeof entry.path === "string" &&
    entry.path.startsWith("/") &&
    typeof entry.file === "string" &&
    typeof entry.title === "string" &&
    typeof entry.description === "string" &&
    Array.isArray(entry.labels) &&
    Array.isArray(entry.media) &&
    entry.media.every((media) =>
      Boolean(
        media && typeof media.type === "string" && typeof media.url === "string"
      )
    ) &&
    typeof entry.date === "string" &&
    Boolean(entry.provenance && typeof entry.provenance.original === "string")
  );
}

function isSafeLocaleFile(file: string) {
  return safeLocaleFilePattern.test(file);
}

function loadLocalizedArticles(locale: Locale): LocalizedArticle[] {
  const localeCatalogValue = readJson<unknown>(
    localesDirectory,
    `${locale}/catalog.json`
  );
  if (!Array.isArray(localeCatalogValue)) {
    return [];
  }
  return localeCatalogValue
    .flatMap((rawEntry) => {
      if (
        !(
          isLocalizedCatalogEntry(rawEntry, locale) &&
          isSafeLocaleFile(rawEntry.file)
        )
      ) {
        return [];
      }
      const page = readJson<unknown>(
        new URL(`${locale}/`, localesDirectory),
        rawEntry.file
      );
      if (!page || typeof page !== "object") {
        return [];
      }
      const content = page as Partial<LocalizedContentPage>;
      if (
        content.locale !== locale ||
        content.path !== rawEntry.path ||
        typeof content.body !== "string"
      ) {
        return [];
      }
      const hero =
        rawEntry.media.find(
          (media) => media.type === "image" && typeof media.url === "string"
        )?.url ?? null;
      return [
        {
          capture: rawEntry.provenance.timestamp,
          description: rawEntry.description,
          file: rawEntry.file,
          hero,
          html: content.body,
          kind: "article" as const,
          labels: rawEntry.labels,
          locale,
          path: rawEntry.path,
          published: rawEntry.date,
          section: rawEntry.labels[0] ?? "",
          source: rawEntry.provenance.original,
          title: rawEntry.title,
        },
      ];
    })
    .sort(
      (a, b) => Date.parse(b.published ?? "") - Date.parse(a.published ?? "")
    );
}

export const localizedArticles = Object.fromEntries(
  localeShells.map((locale) => [locale, loadLocalizedArticles(locale)])
) as Record<Locale, LocalizedArticle[]>;

export function getLocalizedArticles(locale: Locale) {
  return localizedArticles[locale];
}

export function getLocalizedPage(locale: Locale, path: string) {
  return localizedArticles[locale].find((page) => page.path === path);
}

export function getPage(path: string) {
  return pages.find((page) => page.path === path);
}

export function formatDate(
  value: string | null | undefined,
  locale: SiteLocale = "lt"
) {
  if (!value) {
    return locale === "lt"
      ? "Archyvo publikacija"
      : localeUi[locale].provenance;
  }
  return new Intl.DateTimeFormat(localeDateLocales[locale], {
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

export function cleanHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
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
  return new URL(path, "https://ortodoksas.grassinside.com").toString();
}
