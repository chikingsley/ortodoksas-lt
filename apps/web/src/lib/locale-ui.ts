import type { SiteLocale } from "./publication";

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
    search: string;
    undated: string;
  }
> = {
  be: {
    archive: "Выданне",
    articles: "Публікацыі",
    backToLithuanian: "Літоўскае выданне",
    edition: "Беларускае выданне",
    footerDescription:
      "Праваслаўная вера, традыцыя і царкоўнае жыццё ў Літве і свеце.",
    home: "Галоўная",
    institution: "Экзархат Канстанцінопальскага патрыярхату ў Літве",
    languages: "Мовы",
    search: "Пошук",
    undated: "Дата не пазначана",
  },
  en: {
    archive: "Edition",
    articles: "Publications",
    backToLithuanian: "Lithuanian edition",
    edition: "English edition",
    footerDescription:
      "Orthodox faith, tradition, and church life in Lithuania and beyond.",
    home: "Home",
    institution: "Exarchate of the Ecumenical Patriarchate in Lithuania",
    languages: "Languages",
    search: "Search",
    undated: "Date unavailable",
  },
  lt: {
    archive: "Archyvas",
    articles: "Įrašai",
    backToLithuanian: "Lietuviškas leidimas",
    edition: "Lietuviškas leidimas",
    footerDescription:
      "Apie Ortodoksų Bažnyčią Lietuvoje ir pasaulyje, jos tikėjimą, tradiciją ir gyvenimą.",
    home: "Pradžia",
    institution: "Konstantinopolio patriarchato egzarchatas Lietuvoje",
    languages: "Kalbos",
    search: "Ieškoti archyve",
    undated: "Data nenurodyta",
  },
  ru: {
    archive: "Издание",
    articles: "Публикации",
    backToLithuanian: "Литовское издание",
    edition: "Русское издание",
    footerDescription:
      "Православная вера, традиция и церковная жизнь в Литве и мире.",
    home: "Главная",
    institution: "Экзархат Вселенского патриархата в Литве",
    languages: "Языки",
    search: "Поиск",
    undated: "Дата не указана",
  },
  uk: {
    archive: "Видання",
    articles: "Публікації",
    backToLithuanian: "Литовське видання",
    edition: "Українське видання",
    footerDescription:
      "Православна віра, традиція і церковне життя в Литві та світі.",
    home: "Головна",
    institution: "Екзархат Вселенського патріархату в Литві",
    languages: "Мови",
    search: "Пошук",
    undated: "Дату не вказано",
  },
};
