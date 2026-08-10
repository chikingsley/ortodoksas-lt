import type { SiteLocale } from "./publication";

export const localeUi: Record<
  SiteLocale,
  {
    articles: string;
    archive: string;
    automaticTranslation: string;
    backToLithuanian: string;
    edition: string;
    editorReviewedTranslation: string;
    footerDescription: string;
    home: string;
    institution: string;
    languages: string;
    search: string;
    undated: string;
    viewOriginal: string;
  }
> = {
  be: {
    archive: "Выданне",
    articles: "Публікацыі",
    automaticTranslation: "Аўтаматычна перакладзена з літоўскай мовы.",
    backToLithuanian: "Літоўскае выданне",
    edition: "Беларускае выданне",
    editorReviewedTranslation:
      "Перакладзена з літоўскай мовы і праверана рэдактарам.",
    footerDescription:
      "Праваслаўная вера, традыцыя і царкоўнае жыццё ў Літве і свеце.",
    home: "Галоўная",
    institution: "Экзархат Канстанцінопальскага патрыярхату ў Літве",
    languages: "Мовы",
    search: "Пошук",
    undated: "Дата не пазначана",
    viewOriginal: "Глядзець арыгінал",
  },
  en: {
    archive: "Edition",
    articles: "Publications",
    automaticTranslation: "Automatically translated from Lithuanian.",
    backToLithuanian: "Lithuanian edition",
    edition: "English edition",
    editorReviewedTranslation:
      "Translated from Lithuanian and reviewed by an editor.",
    footerDescription:
      "Orthodox faith, tradition, and church life in Lithuania and beyond.",
    home: "Home",
    institution: "Exarchate of the Ecumenical Patriarchate in Lithuania",
    languages: "Languages",
    search: "Search",
    undated: "Date unavailable",
    viewOriginal: "View original",
  },
  lt: {
    archive: "Archyvas",
    articles: "Įrašai",
    automaticTranslation: "Automatiškai išversta iš lietuvių kalbos.",
    backToLithuanian: "Lietuviškas leidimas",
    edition: "Lietuviškas leidimas",
    editorReviewedTranslation:
      "Išversta iš lietuvių kalbos ir peržiūrėta redaktoriaus.",
    footerDescription:
      "Apie Ortodoksų Bažnyčią Lietuvoje ir pasaulyje, jos tikėjimą, tradiciją ir gyvenimą.",
    home: "Pradžia",
    institution: "Konstantinopolio patriarchato egzarchatas Lietuvoje",
    languages: "Kalbos",
    search: "Ieškoti archyve",
    undated: "Data nenurodyta",
    viewOriginal: "Žiūrėti originalą",
  },
  ru: {
    archive: "Издание",
    articles: "Публикации",
    automaticTranslation: "Автоматически переведено с литовского языка.",
    backToLithuanian: "Литовское издание",
    edition: "Русское издание",
    editorReviewedTranslation:
      "Переведено с литовского языка и проверено редактором.",
    footerDescription:
      "Православная вера, традиция и церковная жизнь в Литве и мире.",
    home: "Главная",
    institution: "Экзархат Вселенского патриархата в Литве",
    languages: "Языки",
    search: "Поиск",
    undated: "Дата не указана",
    viewOriginal: "Посмотреть оригинал",
  },
  uk: {
    archive: "Видання",
    articles: "Публікації",
    automaticTranslation: "Автоматично перекладено з литовської мови.",
    backToLithuanian: "Литовське видання",
    edition: "Українське видання",
    editorReviewedTranslation:
      "Перекладено з литовської мови та перевірено редактором.",
    footerDescription:
      "Православна віра, традиція і церковне життя в Литві та світі.",
    home: "Головна",
    institution: "Екзархат Вселенського патріархату в Литві",
    languages: "Мови",
    search: "Пошук",
    undated: "Дату не вказано",
    viewOriginal: "Переглянути оригінал",
  },
};
