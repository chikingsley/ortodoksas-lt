export interface EditorialLink {
  href: string;
  label: string;
}

export interface LibraryGroup {
  links: readonly EditorialLink[];
  title: string;
}

export const libraryGroups: readonly LibraryGroup[] = [
  {
    links: [
      { href: "/p/biblijos-komentarai.html", label: "Biblijos komentarai" },
      { href: "/p/kasdiene-duona.html", label: "„Kasdienė duona“" },
      { href: "/p/katekizmas_12.html", label: "Katekizmas" },
      {
        href: "/2014/01/nikejos-konstantinopolio-tikejimo.html",
        label: "Tikėjimo išpažinimas",
      },
      {
        href: "/2014/08/originalus-nikejos-konstantinopolio.html",
        label: "Pažodinis tikėjimo išpažinimo vertimas",
      },
    ],
    title: "Šventasis Raštas ir tikėjimas",
  },
  {
    links: [
      { href: "/p/natos.html", label: "Natos" },
      {
        href: "/2019/08/troparai-ir-kondakai-antologija.html",
        label: "Troparai ir kondakai",
      },
      {
        href: "/2020/04/prokimenai-antologija.html",
        label: "Prokimenai",
      },
      {
        href: "/p/liturgika.html",
        label: "Liturginiai tekstai ir liturgika",
      },
    ],
    title: "Pamaldos ir bažnytinė muzika",
  },
  {
    links: [
      {
        href: "/p/sventuju-kankiniu.html",
        label: "Lietuvos ortodoksų šventieji",
      },
    ],
    title: "Šventieji",
  },
  {
    links: [
      { href: "/p/ortodoksu-terminu-zodynaw.html", label: "Žodynas" },
      { href: "/p/dokumentu-puslapis.html", label: "Dokumentų puslapis" },
    ],
    title: "Žinynai ir dokumentai",
  },
] as const;

export const contactGroups = [
  {
    email: "egzarchatas@ortodoksas.lt",
    name: "Kancleris kun. Vitalijus Mockus",
    phone: "+370 656 57038",
    phoneHref: "+37065657038",
    role: "Žiniasklaida ir išorės ryšiai",
  },
  {
    email: "sungaila.gintaras@gmail.com",
    name: "Kun. Gintaras Sungaila",
    phone: "+370 677 06761",
    phoneHref: "+37067706761",
    role: "Knygų leidyba, straipsniai ir portalas",
  },
] as const;

export const supportActions = [
  {
    href: "https://contribee.com/ortodoksas-lt",
    label: "Paremti per Contribee",
    service: "Contribee",
  },
  {
    href: "https://paypal.me/ortodoksaslt",
    label: "Paremti per PayPal",
    service: "PayPal",
  },
] as const;

export const calendarLinks = [
  {
    description: "Kalendoriaus leidiniai ir kita ortodoksas.lt produkcija.",
    href: "https://contribee.com/ortodoksas-lt?shop=1",
    label: "E. parduotuvė",
  },
  {
    description: "Pamaldų ir skaitinių tvarka 2026 metams.",
    href: "/2026/01/kanonionas-2026.html",
    label: "Kanonionas 2026 metams",
  },
] as const;
