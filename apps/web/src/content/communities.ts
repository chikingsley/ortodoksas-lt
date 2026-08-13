export interface WorshipLink {
  href: string;
  label: string;
}

export interface WorshipImage {
  alt: string;
  src: string;
}

export interface WorshipCommunity {
  address: string;
  contacts: readonly WorshipLink[];
  images: readonly WorshipImage[];
  name: string;
  services: readonly string[];
}

const exarchateContact = {
  href: "mailto:egzarchatas@ortodoksas.lt",
  label: "egzarchatas@ortodoksas.lt",
} as const;

export const worshipCommunities: readonly WorshipCommunity[] = [
  {
    address: "Švč. Trejybės (Trinapolio) bažnyčia, Verkių g. 70, Vilnius",
    contacts: [
      { href: "https://www.trejybe.lt/", label: "Trejybe.lt" },
      {
        href: "https://www.facebook.com/groups/ortodoksaitrinapolyje",
        label: "Facebook",
      },
      {
        href: "https://www.instagram.com/vilnius_trejybe/",
        label: "Instagram",
      },
    ],
    images: [
      {
        alt: "Vilniaus Švč. Trejybės bažnyčia",
        src: "/api/media/media_5b51d9d6448032761b372510edee0fcd5a7c21de9bab997839881278dc9954e1",
      },
      {
        alt: "Šv. Kalėdų pamaldos Vilniuje",
        src: "/api/media/media_1428bc888a741128a07a6cb86e4e66d0b197a95265c1e25e3075da8a907fa719",
      },
      {
        alt: "Vilniaus lietuvių ortodoksų bendruomenės pamaldos",
        src: "/api/media/media_ef6e295547c1a6e0c213ab55e3207b2755d21431df2c732c47dfd637360c79cb",
      },
    ],
    name: "Vilniaus Švč. Trejybės bendruomenė",
    services: ["Sekmadienį 9:00 — Dieviškoji Liturgija lietuvių kalba"],
  },
  {
    address: "Lukiškių skg. 6, Vilnius",
    contacts: [
      {
        href: "https://www.facebook.com/groups/ortodoksailukiskese",
        label: "Facebook",
      },
    ],
    images: [
      {
        alt: "Vilniaus Šv. Mikalojaus bažnyčia",
        src: "/api/media/media_328d99d261466f67ca61199b94a99352c3d5cb5a936e967bd81bb94c4d843c7b",
      },
      {
        alt: "Vilniaus rusakalbės ortodoksų bendruomenės pamaldos",
        src: "/api/media/media_a896563e0736dcb135fe7010d03c4e573ca1b8d8b7d17a94ac73fc0194179264",
      },
    ],
    name: "Vilniaus Šv. Mikalojaus bendruomenė",
    services: ["Sekmadienį 9:00 — Dieviškoji Liturgija bažnytine slavų kalba"],
  },
  {
    address: "Bokšto g. 4, Vilnius",
    contacts: [
      {
        href: "https://www.facebook.com/groups/3431985900407940",
        label: "Facebook",
      },
      { href: "https://t.me/ortovilnya", label: "Telegram" },
    ],
    images: [
      {
        alt: "Vilniaus Apreiškimo Švč. Dievo Gimdytojai bendruomenės vieta",
        src: "/api/media/media_e402488b0505a68b50f8d2cb49cb8e093c9c088938cbe9bfcce00ee7ab2fd3cb",
      },
      {
        alt: "Vilniaus baltarusių ortodoksų bendruomenės pamaldos",
        src: "/api/media/media_16be433a6a6dd960cea04e2dd03e155f8d26511ae31b9ff205fd794da4882bd9",
      },
      {
        alt: "Šv. Kalėdų pamaldos baltarusių kalba Vilniuje",
        src: "/api/media/media_0a7ae95f1a7abdfe7b4ca8700e55fafc700a304897e9b28e51bb836d9d62d59a",
      },
    ],
    name: "Vilniaus Apreiškimo Švč. Dievo Gimdytojai bendruomenė",
    services: [
      "Sekmadienį 8:45 — Dieviškoji Liturgija ukrainiečių kalba",
      "Sekmadienį 10:30 — Dieviškoji Liturgija baltarusių kalba",
    ],
  },
  {
    address:
      "Katalikų Mažoji Kristaus Prisikėlimo bažnyčia, Aukštaičių g. 6, Kaunas",
    contacts: [
      {
        href: "https://www.facebook.com/groups/ortodoksaikaune",
        label: "Facebook",
      },
    ],
    images: [
      {
        alt: "Kauno Kristaus Prisikėlimo bendruomenės bažnyčia",
        src: "/api/media/media_3c44030e16f3a8fdfe2029a2d3827a7b524d2d09ca5fc026629f5457201d8fc0",
      },
      {
        alt: "Kauno ortodoksų bendruomenės Šv. Kalėdų pamaldos",
        src: "/api/media/media_e03af5aa906b80d2eee7fc83c9ad00b961753a77761d955eaf58b5da677565cc",
      },
      {
        alt: "Kauno ortodoksų bendruomenė pamaldose",
        src: "/api/media/media_de10e3268dee875d6892c7260d5cbb601a46bda0c3fa562d045de9b3a016a760",
      },
    ],
    name: "Kauno Kristaus Prisikėlimo bendruomenė",
    services: [
      "Sekmadienį 10:00 — Dieviškoji Liturgija ukrainiečių kalba",
      "Sekmadienį 12:30 — Dieviškoji Liturgija lietuvių kalba",
    ],
  },
  {
    address: "Klaipėdos universiteto koplyčia, Herkaus Manto g. 84, Klaipėda",
    contacts: [
      {
        href: "https://www.facebook.com/groups/1363716107508280",
        label: "Facebook",
      },
    ],
    images: [
      {
        alt: "Klaipėdos universiteto koplyčia",
        src: "/api/media/media_8d7bd88af56552c64ff9c4a80824fd4c87242c8a399c4e7e491847d735e7bae7",
      },
      {
        alt: "Klaipėdos ortodoksų bendruomenės Šv. Kalėdų pamaldos",
        src: "/api/media/media_d85ddfa1654afa888f27912cf89137c09d5febc59ef70c1cb1b4904aa4d210fd",
      },
      {
        alt: "Klaipėdos ortodoksų bendruomenė pamaldose",
        src: "/api/media/media_f6d8576dde5a45316cefdf302b10388cff023561c933b67cdead33571a7688a9",
      },
    ],
    name: "Klaipėdos Šv. Jurgio bendruomenė",
    services: ["Sekmadienį 10:00 — Dieviškoji Liturgija bažnytine slavų kalba"],
  },
  {
    address: "Kražių g. 17, Šiauliai",
    contacts: [exarchateContact],
    images: [
      {
        alt: "Šiaulių Šv. Jurgio bažnyčia",
        src: "/api/media/media_34c355e0f1430a19e34f10b94fd3379ddff535feb9a03a49b11f789ce24e8ba7",
      },
      {
        alt: "Šiaulių ortodoksų bendruomenės Šv. Kalėdų pamaldos",
        src: "/api/media/media_6fa0bdda6eac562e9623625adb2968a64119c6ec60a0bd42eb547edd66b56e28",
      },
      {
        alt: "Šiaulių ortodoksų bendruomenė pamaldose",
        src: "/api/media/media_9199795fe3a904e74917a8657f24b67f888a2fac21ab7c42e1507a14aa0eb466",
      },
    ],
    name: "Šiaulių Šv. Jurgio bendruomenė",
    services: [
      "Pirmą mėnesio šeštadienį 11:30 — Dieviškoji Liturgija ukrainiečių kalba",
    ],
  },
  {
    address: "Parapijos namai, Gintaro g. 32, Tauragė",
    contacts: [
      {
        href: "https://www.facebook.com/groups/tauragesortodoksai/",
        label: "Facebook",
      },
    ],
    images: [
      {
        alt: "Tauragės bendruomenės pamaldų vieta",
        src: "/api/media/media_d36c3c99e3bafde2cccad3695ffbee1fbfc25c968d3b242888841b00579ea86a",
      },
      {
        alt: "Tauragės ortodoksų bendruomenės Šv. Kalėdų pamaldos",
        src: "/api/media/media_5a129c8fbe1e719fbbdf842d4edccf217aaa3167eff026220d9fdd1452408bc9",
      },
      {
        alt: "Tauragės ortodoksų bendruomenė pamaldose",
        src: "/api/media/media_fc70a048733af90b7a715d7a3b6be7f55cc50c18f43f298122ca57b14dde88d5",
      },
    ],
    name: "Tauragės bendruomenė",
    services: [
      "Pasirinktais šeštadieniais 10:00 — Dieviškoji Liturgija bažnytine slavų kalba; datos skelbiamos Facebook",
    ],
  },
  {
    address:
      "A. Baranausko ir A. Vienuolio-Žukausko memorialinis muziejus, A. Vienuolio g. 2, Anykščiai",
    contacts: [exarchateContact],
    images: [
      {
        alt: "Anykščių ortodoksų bendruomenė",
        src: "/api/media/media_2c597c80d4eeaeddd848b00da6d6d9c573cd7e7ffefbececfbf07324fb757294",
      },
      {
        alt: "Anykščių ortodoksų bendruomenės Šv. Kalėdų pamaldos",
        src: "/api/media/media_8b42dba8015bcd13f4ad363ce437b02bf5509237eb899582194bde67dbb48629",
      },
      {
        alt: "Anykščių ukrainiečių ortodoksų bendruomenė pamaldose",
        src: "/api/media/media_251ae9b8d512520eb8a40bd279f054af7da1147ee34267c7323ab9011c6e5d26",
      },
    ],
    name: "Anykščių bendruomenė",
    services: [
      "Dieviškoji Liturgija ukrainiečių kalba per didžiąsias šventes; datos skelbiamos atskirai",
    ],
  },
] as const;

export const worshipVerificationNotice = {
  contact: exarchateContact,
  name: "Elektrėnai",
  text: "Oficialiame pamaldų sąraše ši vieta tebėra pažymėta kaip ruošiama. Dabartinį adresą ir artimiausių pamaldų laiką patvirtina Egzarchato kanceliarija.",
} as const;
