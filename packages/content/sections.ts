export const HISTORICAL_SECTIONS = [
  "Tikėjimas ir kultūra",
  "Naujienos",
  "Bažnyčios gyvenimas",
  "Pamokslai",
  "Šventasis Raštas",
] as const;

export const getSectionOptions = (sections: Iterable<string>): string[] =>
  Array.from(
    new Set([
      ...HISTORICAL_SECTIONS,
      ...Array.from(sections, (section) => section.trim()).filter(Boolean),
    ])
  ).sort((left, right) => left.localeCompare(right, "lt"));
