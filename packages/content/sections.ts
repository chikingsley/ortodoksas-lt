export const HISTORICAL_SECTIONS = [
  "Tikėjimas ir kultūra",
  "Naujienos",
  "Bažnyčios gyvenimas",
  "Pamokslai",
  "Šventasis Raštas",
] as const;

export type SectionLocale = "be" | "en" | "lt" | "ru" | "uk";

const sectionLabels: Record<
  SectionLocale,
  Record<(typeof HISTORICAL_SECTIONS)[number], string>
> = {
  be: {
    "Bažnyčios gyvenimas": "Царкоўнае жыццё",
    Naujienos: "Навіны",
    Pamokslai: "Пропаведзі",
    "Tikėjimas ir kultūra": "Вера і культура",
    "Šventasis Raštas": "Святое Пісанне",
  },
  en: {
    "Bažnyčios gyvenimas": "Church life",
    Naujienos: "News",
    Pamokslai: "Sermons",
    "Tikėjimas ir kultūra": "Faith and culture",
    "Šventasis Raštas": "Holy Scripture",
  },
  lt: {
    "Bažnyčios gyvenimas": "Bažnyčios gyvenimas",
    Naujienos: "Naujienos",
    Pamokslai: "Pamokslai",
    "Tikėjimas ir kultūra": "Tikėjimas ir kultūra",
    "Šventasis Raštas": "Šventasis Raštas",
  },
  ru: {
    "Bažnyčios gyvenimas": "Церковная жизнь",
    Naujienos: "Новости",
    Pamokslai: "Проповеди",
    "Tikėjimas ir kultūra": "Вера и культура",
    "Šventasis Raštas": "Священное Писание",
  },
  uk: {
    "Bažnyčios gyvenimas": "Церковне життя",
    Naujienos: "Новини",
    Pamokslai: "Проповіді",
    "Tikėjimas ir kultūra": "Віра і культура",
    "Šventasis Raštas": "Святе Письмо",
  },
};

const isHistoricalSection = (
  section: string
): section is (typeof HISTORICAL_SECTIONS)[number] =>
  HISTORICAL_SECTIONS.includes(section as (typeof HISTORICAL_SECTIONS)[number]);

export const getSectionLabel = (
  section: string,
  locale: SectionLocale = "lt"
): string => {
  if (isHistoricalSection(section)) {
    return sectionLabels[locale][section];
  }
  const [first = "", ...rest] = Array.from(section.trim());
  return `${first.toLocaleUpperCase(locale)}${rest.join("")}`;
};

export const getSectionOptions = (sections: Iterable<string>): string[] =>
  Array.from(
    new Set([
      ...HISTORICAL_SECTIONS,
      ...Array.from(sections, (section) => section.trim()).filter(Boolean),
    ])
  ).sort((left, right) => left.localeCompare(right, "lt"));
