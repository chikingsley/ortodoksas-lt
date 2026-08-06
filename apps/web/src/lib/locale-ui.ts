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
