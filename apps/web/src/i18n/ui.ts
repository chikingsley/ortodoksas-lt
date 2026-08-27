import type { SiteLocale } from "./config";

export const ui: Record<
  SiteLocale,
  {
    articles: string;
    allArticles: string;
    archive: string;
    archiveAllSections: string;
    archiveAllYears: string;
    archiveEmptyLabels: string;
    archiveLabel: string;
    archiveLabelPlaceholder: string;
    archiveSearchPlaceholder: string;
    archiveSection: string;
    archiveYear: string;
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
    humanDraftTranslation: string;
    imageUnavailable: string;
    institution: string;
    languages: string;
    library: string;
    more: string;
    navigation: string;
    pageUnavailable: string;
    recentPublications: string;
    read: string;
    readMore: string;
    search: string;
    searchDescription: string;
    searchEyebrow: string;
    searchPlaceholder: string;
    searchResults: string;
    searchTitle: string;
    support: string;
    serviceCalendarDescription: string;
    serviceLibraryDescription: string;
    serviceSupportDescription: string;
    serviceWorshipDescription: string;
    openLibrary: string;
    undated: string;
    viewOriginal: string;
    worship: string;
  }
> = {
  be: {
    allArticles: "Усе публікацыі",
    archive: "Архіў",
    archiveAllSections: "Усе тэмы",
    archiveAllYears: "Усе гады",
    archiveEmptyLabels: "Меткі не знойдзены",
    archiveLabel: "Метка",
    archiveLabelPlaceholder: "Усе меткі",
    archiveSearchPlaceholder: "Шукаць па назве або тэме",
    archiveSection: "Тэма",
    archiveYear: "Год",
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
    humanDraftTranslation:
      "Перакладзена з літоўскай мовы; чакае рэдактарскай праверкі.",
    imageUnavailable: "Выява недаступная",
    institution: "Экзархат Канстанцінопальскага патрыярхату ў Літве",
    languages: "Мовы",
    library: "Бібліятэка",
    more: "Больш",
    navigation: "Навігацыя",
    openLibrary: "Адкрыць бібліятэку",
    pageUnavailable: "Гэтая старонка яшчэ не даступная ў гэтым выданні.",
    read: "Чытаць",
    readMore: "Чытаць далей",
    recentPublications: "Найноўшыя публікацыі",
    search: "Пошук",
    searchDescription: "Шукайце публікацыі паводле назвы, тэмы або пазнакі.",
    searchEyebrow: "Пошук у архіве",
    searchPlaceholder: "Увядзіце слова або фразу",
    searchResults: "вынікаў",
    searchTitle: "Што вы шукаеце?",
    serviceCalendarDescription: "Святы і пасты",
    serviceLibraryDescription: "Артыкулы і кнігі",
    serviceSupportDescription: "Далучыцеся да місіі",
    serviceWorshipDescription: "Расклад і супольнасці",
    support: "Падтрымаць",
    undated: "Дата не пазначана",
    viewOriginal: "Глядзець арыгінал",
    worship: "Богаслужэнні",
  },
  en: {
    allArticles: "All publications",
    archive: "Archive",
    archiveAllSections: "All topics",
    archiveAllYears: "All years",
    archiveEmptyLabels: "No tags found",
    archiveLabel: "Tag",
    archiveLabelPlaceholder: "All tags",
    archiveSearchPlaceholder: "Search by title or topic",
    archiveSection: "Section",
    archiveYear: "Year",
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
    humanDraftTranslation:
      "Translated from Lithuanian; editorial review is pending.",
    imageUnavailable: "Image unavailable",
    institution: "Exarchate of the Ecumenical Patriarchate in Lithuania",
    languages: "Languages",
    library: "Library",
    more: "More",
    navigation: "Navigation",
    openLibrary: "Open the library",
    pageUnavailable: "This page is not yet available in this edition.",
    read: "Read",
    readMore: "Read more",
    recentPublications: "Latest publications",
    search: "Search",
    searchDescription: "Search publications by title, topic, or label.",
    searchEyebrow: "Archive search",
    searchPlaceholder: "Enter a word or phrase",
    searchResults: "results",
    searchTitle: "What are you looking for?",
    serviceCalendarDescription: "Feasts and fasts",
    serviceLibraryDescription: "Articles and books",
    serviceSupportDescription: "Join the mission",
    serviceWorshipDescription: "Schedules and communities",
    support: "Support",
    undated: "Date unavailable",
    viewOriginal: "View original",
    worship: "Services",
  },
  lt: {
    allArticles: "Visi straipsniai",
    archive: "Archyvas",
    archiveAllSections: "Visos temos",
    archiveAllYears: "Visi metai",
    archiveEmptyLabels: "Žymų nerasta",
    archiveLabel: "Žyma",
    archiveLabelPlaceholder: "Visos žymos",
    archiveSearchPlaceholder: "Ieškoti pagal pavadinimą ar temą",
    archiveSection: "Tema",
    archiveYear: "Metai",
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
    humanDraftTranslation:
      "Išversta iš lietuvių kalbos; laukiama redaktoriaus peržiūros.",
    imageUnavailable: "Vaizdas nepasiekiamas",
    institution: "Konstantinopolio patriarchato egzarchatas Lietuvoje",
    languages: "Kalbos",
    library: "Biblioteka",
    more: "Daugiau",
    navigation: "Navigacija",
    openLibrary: "Atverti biblioteką",
    pageUnavailable: "Šio puslapio šiame leidime dar nėra.",
    read: "Skaityti",
    readMore: "Skaityti daugiau",
    recentPublications: "Naujausios publikacijos",
    search: "Ieškoti archyve",
    searchDescription: "Ieškokite publikacijų pagal pavadinimą, temą ar žymą.",
    searchEyebrow: "Archyvo paieška",
    searchPlaceholder: "Įveskite žodį ar frazę",
    searchResults: "rezultatai",
    searchTitle: "Ko ieškote?",
    serviceCalendarDescription: "Šventės ir pasninkai",
    serviceLibraryDescription: "Straipsniai ir knygos",
    serviceSupportDescription: "Prisidėkite prie misijos",
    serviceWorshipDescription: "Tvarkaraščiai ir bendruomenės",
    support: "Paremti",
    undated: "Data nenurodyta",
    viewOriginal: "Žiūrėti originalą",
    worship: "Pamaldos",
  },
  ru: {
    allArticles: "Все публикации",
    archive: "Архив",
    archiveAllSections: "Все темы",
    archiveAllYears: "Все годы",
    archiveEmptyLabels: "Метки не найдены",
    archiveLabel: "Метка",
    archiveLabelPlaceholder: "Все метки",
    archiveSearchPlaceholder: "Искать по названию или теме",
    archiveSection: "Тема",
    archiveYear: "Год",
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
    humanDraftTranslation:
      "Переведено с литовского языка; ожидает редакторской проверки.",
    imageUnavailable: "Изображение недоступно",
    institution: "Экзархат Вселенского патриархата в Литве",
    languages: "Языки",
    library: "Библиотека",
    more: "Больше",
    navigation: "Навигация",
    openLibrary: "Открыть библиотеку",
    pageUnavailable: "Эта страница пока недоступна в этом издании.",
    read: "Читать",
    readMore: "Читать далее",
    recentPublications: "Последние публикации",
    search: "Поиск",
    searchDescription: "Ищите публикации по названию, теме или метке.",
    searchEyebrow: "Поиск по архиву",
    searchPlaceholder: "Введите слово или фразу",
    searchResults: "результатов",
    searchTitle: "Что вы ищете?",
    serviceCalendarDescription: "Праздники и посты",
    serviceLibraryDescription: "Статьи и книги",
    serviceSupportDescription: "Присоединитесь к миссии",
    serviceWorshipDescription: "Расписания и общины",
    support: "Поддержать",
    undated: "Дата не указана",
    viewOriginal: "Посмотреть оригинал",
    worship: "Богослужения",
  },
  uk: {
    allArticles: "Усі публікації",
    archive: "Архів",
    archiveAllSections: "Усі теми",
    archiveAllYears: "Усі роки",
    archiveEmptyLabels: "Міток не знайдено",
    archiveLabel: "Мітка",
    archiveLabelPlaceholder: "Усі мітки",
    archiveSearchPlaceholder: "Шукати за назвою або темою",
    archiveSection: "Тема",
    archiveYear: "Рік",
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
    humanDraftTranslation:
      "Перекладено з литовської мови; очікує редакторської перевірки.",
    imageUnavailable: "Зображення недоступне",
    institution: "Екзархат Вселенського патріархату в Литві",
    languages: "Мови",
    library: "Бібліотека",
    more: "Більше",
    navigation: "Навігація",
    openLibrary: "Відкрити бібліотеку",
    pageUnavailable: "Ця сторінка ще недоступна в цьому виданні.",
    read: "Читати",
    readMore: "Читати далі",
    recentPublications: "Останні публікації",
    search: "Пошук",
    searchDescription: "Шукайте публікації за назвою, темою або міткою.",
    searchEyebrow: "Пошук в архіві",
    searchPlaceholder: "Введіть слово або фразу",
    searchResults: "результатів",
    searchTitle: "Що ви шукаєте?",
    serviceCalendarDescription: "Свята і пости",
    serviceLibraryDescription: "Статті та книги",
    serviceSupportDescription: "Долучіться до місії",
    serviceWorshipDescription: "Розклади та громади",
    support: "Підтримати",
    undated: "Дату не вказано",
    viewOriginal: "Переглянути оригінал",
    worship: "Богослужіння",
  },
};
