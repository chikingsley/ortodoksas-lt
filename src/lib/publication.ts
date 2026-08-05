import { existsSync, readdirSync, readFileSync } from "node:fs";
import { marked } from "marked";

export interface CatalogEntry {
  capture?: string;
  description: string;
  file?: string;
  hero: string | null;
  homepage?: "feed" | "lead" | "secondary";
  homepageOrder?: number;
  kind: "article" | "page";
  labels: string[];
  origin?: "editorial" | "recovered";
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
const editorialDirectory = new URL(
  "../../public/content/editorial/",
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

const recoveredPages = contentFiles
  .map((file) => readJson<ContentPage>(pagesDirectory, file))
  .filter((page): page is ContentPage => Boolean(page && page.path !== "/"));

const catalogValue = readJson<CatalogEntry[]>(
  pagesDirectory,
  "../catalog.json"
);
const recoveredCatalog = catalogValue ?? [];

export const localeShells = ["en", "ru", "uk", "be"] as const;

export type Locale = (typeof localeShells)[number];

export type SiteLocale = "lt" | Locale;

interface EditorialSource {
  body?: unknown;
  description?: unknown;
  hero?: unknown;
  homepage?: unknown;
  homepage_order?: unknown;
  published?: unknown;
  section?: unknown;
  slug?: unknown;
  title?: unknown;
}

const editorialSlugPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function parseEditorialArticle(
  directory: URL,
  file: string,
  locale: SiteLocale
): LocalizedArticle[] {
  const source = readJson<EditorialSource>(directory, file);
  const fileSlug = file.slice(0, -5);
  const slug = typeof source?.slug === "string" ? source.slug : fileSlug;
  if (
    !source ||
    typeof source.title !== "string" ||
    typeof source.body !== "string" ||
    !editorialSlugPattern.test(slug) ||
    slug !== fileSlug
  ) {
    return [];
  }
  const section =
    typeof source.section === "string" && source.section.trim()
      ? source.section.trim()
      : "Naujienos";
  const html = marked.parse(source.body, { async: false }) as string;
  const description =
    typeof source.description === "string" && source.description.trim()
      ? source.description.trim()
      : html
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 180);
  return [
    {
      description,
      file: `public/content/editorial/${locale}/${file}`,
      hero: typeof source.hero === "string" ? source.hero : null,
      homepage:
        source.homepage === "lead" || source.homepage === "secondary"
          ? source.homepage
          : "feed",
      homepageOrder:
        typeof source.homepage_order === "number"
          ? source.homepage_order
          : undefined,
      html,
      kind: "article" as const,
      labels: [section],
      locale: locale === "lt" ? undefined : locale,
      origin: "editorial" as const,
      path: `/e/${slug}.html`,
      published: typeof source.published === "string" ? source.published : null,
      section,
      title: source.title,
    } as LocalizedArticle,
  ];
}

function loadEditorialArticles(locale: SiteLocale): LocalizedArticle[] {
  const directory = new URL(`${locale}/`, editorialDirectory);
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory, { encoding: "utf8" })
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => parseEditorialArticle(directory, file, locale));
}

const editorialArticles = {
  be: loadEditorialArticles("be"),
  en: loadEditorialArticles("en"),
  lt: loadEditorialArticles("lt"),
  ru: loadEditorialArticles("ru"),
  uk: loadEditorialArticles("uk"),
};

function assertUniquePaths(entries: CatalogEntry[], label: string) {
  const paths = new Set<string>();
  for (const entry of entries) {
    if (paths.has(entry.path)) {
      throw new Error(`Duplicate ${label} path: ${entry.path}`);
    }
    paths.add(entry.path);
  }
  return entries;
}

export const pages = assertUniquePaths(
  [...recoveredPages, ...editorialArticles.lt],
  "Lithuanian publication"
) as ContentPage[];

export const catalog = assertUniquePaths(
  [...recoveredCatalog, ...editorialArticles.lt],
  "Lithuanian catalog"
);

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
      "Праваслаўная вера, традыцыя і царкоўнае жыццё ў Літве і свеце.",
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
      "Orthodox faith, tradition, and church life in Lithuania and beyond.",
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
      "Православная вера, традиция и церковная жизнь в Литве и мире.",
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
      "Православна віра, традиція і церковне життя в Литві та світі.",
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
  localeShells.map((locale) => [
    locale,
    assertUniquePaths(
      [...loadLocalizedArticles(locale), ...editorialArticles[locale]],
      `${locale} publication`
    ).sort(
      (a, b) => Date.parse(b.published ?? "") - Date.parse(a.published ?? "")
    ),
  ])
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
    .replace(/<(iframe|frame|object|form)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(?:iframe|frame|object|embed|form)\b[^>]*\/?\s*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /\s+(?:href|src|data|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript|file):[^"]*"|'\s*(?:javascript|vbscript|file):[^']*')/gi,
      ""
    );
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
