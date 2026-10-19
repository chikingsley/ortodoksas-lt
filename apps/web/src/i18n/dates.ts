import type { SiteLocale } from "./config";
import { localeMetadata } from "./config";

// CLDR Belarusian month forms cover Workers runtimes that fall back to English.
const belarusianMonths = [
  {
    genitive: "студзеня",
    standalone: "студзень",
  },
  {
    genitive: "лютага",
    standalone: "люты",
  },
  {
    genitive: "сакавіка",
    standalone: "сакавік",
  },
  {
    genitive: "красавіка",
    standalone: "красавік",
  },
  {
    genitive: "мая",
    standalone: "май",
  },
  {
    genitive: "чэрвеня",
    standalone: "чэрвень",
  },
  {
    genitive: "ліпеня",
    standalone: "ліпень",
  },
  {
    genitive: "жніўня",
    standalone: "жнівень",
  },
  {
    genitive: "верасня",
    standalone: "верасень",
  },
  {
    genitive: "кастрычніка",
    standalone: "кастрычнік",
  },
  {
    genitive: "лістапада",
    standalone: "лістапад",
  },
  {
    genitive: "снежня",
    standalone: "снежань",
  },
];

const dateFormatters = new Map<SiteLocale, Intl.DateTimeFormat>();
const monthFormatters = new Map<SiteLocale, Intl.DateTimeFormat>();

function belarusianMonth(date: Date) {
  const month = belarusianMonths[date.getUTCMonth()];

  if (month === undefined) {
    throw new RangeError("Invalid publication date");
  }

  return month;
}

export function formatPublicationDate(date: Date, locale: SiteLocale) {
  if (locale === "be") {
    return `${date.getUTCDate()} ${belarusianMonth(date).genitive} ${date.getUTCFullYear()} г.`;
  }

  let formatter = dateFormatters.get(locale);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(localeMetadata[locale].dateLocale, {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    });
    dateFormatters.set(locale, formatter);
  }

  return formatter.format(date);
}

export function formatPublicationMonth(date: Date, locale: SiteLocale) {
  if (locale === "be") {
    return `${belarusianMonth(date).standalone} ${date.getUTCFullYear()} г.`;
  }

  let formatter = monthFormatters.get(locale);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(localeMetadata[locale].dateLocale, {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    });
    monthFormatters.set(locale, formatter);
  }

  return formatter.format(date);
}
