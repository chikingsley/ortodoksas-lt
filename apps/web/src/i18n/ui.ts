import type { SiteLocale } from "./config";

export const ui: Record<
  SiteLocale,
  {
    articles: string;
    archive: string;
    automaticTranslation: string;
    backToLithuanian: string;
    calendar: string;
    clergy: string;
    contact: string;
    contacts: string;
    edition: string;
    editionUnavailable: string;
    editorReviewedTranslation: string;
    footerDescription: string;
    home: string;
    institution: string;
    languages: string;
    library: string;
    navigation: string;
    pageUnavailable: string;
    search: string;
    support: string;
    undated: string;
    viewOriginal: string;
    worship: string;
  }
> = {
  be: {
    archive: "Архіў",
    articles: "Публікацыі",
    automaticTranslation: "Аўтаматычна перакладзена з літоўскай мовы.",
    backToLithuanian: "Літоўскае выданне",
    calendar: "Каляндар",
    clergy: "Духавенства",
    contact: "Сувязь",
    contacts: "Кантакты",
    edition: "Беларускае выданне",
    editionUnavailable:
      "Публікацыі на беларускай мове рыхтуюцца. Літоўскае выданне даступнае як зыходнае.",
    editorReviewedTranslation:
      "Перакладзена з літоўскай мовы і праверана рэдактарам.",
    footerDescription:
      "Праваслаўная вера, традыцыя і царкоўнае жыццё ў Літве і свеце.",
    home: "Галоўная",
    institution: "Экзархат Канстанцінопальскага патрыярхату ў Літве",
    languages: "Мовы",
    library: "Бібліятэка",
    navigation: "Навігацыя",
    pageUnavailable: "Гэтая старонка яшчэ не даступная ў гэтым выданні.",
    search: "Пошук",
    support: "Падтрымаць служэнне",
    undated: "Дата не пазначана",
    viewOriginal: "Глядзець арыгінал",
    worship: "Богаслужэнні",
  },
  en: {
    archive: "Archive",
    articles: "Publications",
    automaticTranslation: "Automatically translated from Lithuanian.",
    backToLithuanian: "Lithuanian edition",
    calendar: "Calendar",
    clergy: "Clergy",
    contact: "Contact",
    contacts: "Contacts",
    edition: "English edition",
    editionUnavailable:
      "English publications are being prepared. Browse the Lithuanian source edition in the meantime.",
    editorReviewedTranslation:
      "Translated from Lithuanian and reviewed by an editor.",
    footerDescription:
      "Orthodox faith, tradition, and church life in Lithuania and beyond.",
    home: "Home",
    institution: "Exarchate of the Ecumenical Patriarchate in Lithuania",
    languages: "Languages",
    library: "Library",
    navigation: "Navigation",
    pageUnavailable: "This page is not yet available in this edition.",
    search: "Search",
    support: "Support the ministry",
    undated: "Date unavailable",
    viewOriginal: "View original",
    worship: "Services",
  },
  lt: {
    archive: "Archyvas",
    articles: "Įrašai",
    automaticTranslation: "Automatiškai išversta iš lietuvių kalbos.",
    backToLithuanian: "Lietuviškas leidimas",
    calendar: "Kalendorius",
    clergy: "Dvasininkai",
    contact: "Susisiekti",
    contacts: "Kontaktai",
    edition: "Lietuviškas leidimas",
    editionUnavailable:
      "Kitų kalbų publikacijos rengiamos iš šio lietuviško leidimo.",
    editorReviewedTranslation:
      "Išversta iš lietuvių kalbos ir peržiūrėta redaktoriaus.",
    footerDescription:
      "Apie Ortodoksų Bažnyčią Lietuvoje ir pasaulyje, jos tikėjimą, tradiciją ir gyvenimą.",
    home: "Pradžia",
    institution: "Konstantinopolio patriarchato egzarchatas Lietuvoje",
    languages: "Kalbos",
    library: "Biblioteka",
    navigation: "Navigacija",
    pageUnavailable: "Šio puslapio šiame leidime dar nėra.",
    search: "Ieškoti archyve",
    support: "Paremti veiklą",
    undated: "Data nenurodyta",
    viewOriginal: "Žiūrėti originalą",
    worship: "Pamaldos",
  },
  ru: {
    archive: "Архив",
    articles: "Публикации",
    automaticTranslation: "Автоматически переведено с литовского языка.",
    backToLithuanian: "Литовское издание",
    calendar: "Календарь",
    clergy: "Духовенство",
    contact: "Связаться",
    contacts: "Контакты",
    edition: "Русское издание",
    editionUnavailable:
      "Публикации на русском языке готовятся. Литовское издание доступно как исходное.",
    editorReviewedTranslation:
      "Переведено с литовского языка и проверено редактором.",
    footerDescription:
      "Православная вера, традиция и церковная жизнь в Литве и мире.",
    home: "Главная",
    institution: "Экзархат Вселенского патриархата в Литве",
    languages: "Языки",
    library: "Библиотека",
    navigation: "Навигация",
    pageUnavailable: "Эта страница пока недоступна в этом издании.",
    search: "Поиск",
    support: "Поддержать служение",
    undated: "Дата не указана",
    viewOriginal: "Посмотреть оригинал",
    worship: "Богослужения",
  },
  uk: {
    archive: "Архів",
    articles: "Публікації",
    automaticTranslation: "Автоматично перекладено з литовської мови.",
    backToLithuanian: "Литовське видання",
    calendar: "Календар",
    clergy: "Духовенство",
    contact: "Зв’язок",
    contacts: "Контакти",
    edition: "Українське видання",
    editionUnavailable:
      "Публікації українською мовою готуються. Литовське видання доступне як вихідне.",
    editorReviewedTranslation:
      "Перекладено з литовської мови та перевірено редактором.",
    footerDescription:
      "Православна віра, традиція і церковне життя в Литві та світі.",
    home: "Головна",
    institution: "Екзархат Вселенського патріархату в Литві",
    languages: "Мови",
    library: "Бібліотека",
    navigation: "Навігація",
    pageUnavailable: "Ця сторінка ще недоступна в цьому виданні.",
    search: "Пошук",
    support: "Підтримати служіння",
    undated: "Дату не вказано",
    viewOriginal: "Переглянути оригінал",
    worship: "Богослужіння",
  },
};
