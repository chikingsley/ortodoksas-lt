import { describe, expect, it } from "vitest";
import {
  buildHomepageModel,
  getHomepageArticleGroups,
  localizeHomepageCatalog,
  selectHomepageArticles,
} from "./homepage";
import { type CatalogEntry, cleanHtml, hasLeadFigure } from "./publication";

interface Article {
  hero: string | null;
  homepage?: "feed" | "lead" | "secondary";
  homepageOrder?: number;
  path: string;
  published: string | null;
}

function article(
  path: string,
  published: string,
  homepage: Article["homepage"] = "feed",
  homepageOrder?: number
): Article {
  return {
    hero: `/media/${path}.jpg`,
    homepage,
    ...(homepageOrder === undefined ? {} : { homepageOrder }),
    path,
    published,
  };
}

function catalogEntry(
  path: string,
  published: string | null,
  overrides: Partial<CatalogEntry> = {}
): CatalogEntry {
  return {
    description: `${path} description`,
    hero: `/media/${path}.jpg`,
    heroAlt: `${path} image`,
    heroFit: "cover",
    heroFocalX: 50,
    heroFocalY: 50,
    heroMediaId: `media_${path}`,
    kind: "article",
    labels: [],
    path,
    published,
    section: "Naujienos",
    title: path,
    ...overrides,
  };
}

describe("selectHomepageArticles", () => {
  it("honors explicit lead and secondary placement", () => {
    const result = selectHomepageArticles([
      article("/latest", "2026-08-05"),
      article("/lead", "2026-08-01", "lead"),
      article("/third", "2026-08-02", "secondary", 3),
      article("/first", "2026-07-30", "secondary", 1),
    ]);

    expect(result.lead?.path).toBe("/lead");
    expect(result.secondary.map((entry) => entry.path)).toEqual([
      "/first",
      "/third",
      "/latest",
    ]);
  });

  it("falls back to the newest image-bearing article", () => {
    const result = selectHomepageArticles([
      article("/older", "2026-07-01"),
      article("/newer", "2026-08-01"),
    ]);

    expect(result.lead?.path).toBe("/newer");
    expect(result.secondary[0]?.path).toBe("/older");
  });

  it("fills four supporting placements and keeps later stories in the feed", () => {
    const result = selectHomepageArticles([
      article("/lead", "2026-08-06", "lead"),
      article("/one", "2026-08-05"),
      article("/two", "2026-08-04"),
      article("/three", "2026-08-03"),
      article("/four", "2026-08-02"),
      article("/five", "2026-08-01"),
    ]);

    expect(result.secondary.map((entry) => entry.path)).toEqual([
      "/one",
      "/two",
      "/three",
      "/four",
    ]);
    expect(result.remaining.map((entry) => entry.path)).toEqual(["/five"]);
  });

  it("builds archive, section, recent-story, and library presentation data", () => {
    const articles = [
      catalogEntry("/lead", "2026-08-06", { homepage: "lead" }),
      catalogEntry("/one", "2026-08-05"),
      catalogEntry("/two", "2026-08-04"),
      catalogEntry("/three", "2026-08-03"),
      catalogEntry("/four", "2026-08-02"),
      catalogEntry("/five", "2026-08-01"),
      catalogEntry("/six", "2026-07-31"),
      catalogEntry("/seven", "2026-07-30"),
    ];
    const library = catalogEntry("/p/biblioteka.html", null, {
      description: "Library description",
      kind: "page",
      title: "Biblioteka",
    });

    const model = buildHomepageModel({
      articles,
      catalog: [...articles, library],
      sections: ["Naujienos"],
    });

    expect(model.lead?.path).toBe("/lead");
    expect(model.recent.map((entry) => entry.path)).toEqual([
      "/five",
      "/six",
      "/seven",
    ]);
    expect(model.archiveMonths).toEqual([
      ["2026 m. rugpjūtis", 6],
      ["2026 m. liepa", 2],
    ]);
    expect(model.sectionGroups[0]?.articles).toHaveLength(4);
    expect(model.library.description).toBe("Library description");
  });

  it("rotates section groups to the two most recently active categories", () => {
    const articles = [
      catalogEntry("/culture", "2026-08-01", {
        section: "Tikėjimas ir kultūra",
      }),
      catalogEntry("/sermon", "2026-08-07", { section: "Pamokslai" }),
      catalogEntry("/news", "2026-08-08", { section: "Naujienos" }),
      catalogEntry("/older-news", "2026-08-06", { section: "Naujienos" }),
      catalogEntry("/church", "2026-07-30", {
        section: "Bažnyčios gyvenimas",
      }),
    ];

    const model = buildHomepageModel({
      articles,
      catalog: articles,
      sections: [
        "Bažnyčios gyvenimas",
        "Naujienos",
        "Pamokslai",
        "Tikėjimas ir kultūra",
      ],
    });

    expect(model.sectionGroups.map((group) => group.title)).toEqual([
      "Naujienos",
      "Pamokslai",
    ]);
  });
});

describe("localizeHomepageCatalog", () => {
  it("keeps canonical placement and presentation while replacing editorial text and paths", () => {
    const canonical = catalogEntry("/lt-lead", "2026-08-06", {
      homepage: "lead",
      homepageOrder: 1,
      section: "Naujienos",
      title: "Lietuviškas pavadinimas",
      translationGroupId: "group-1",
    });
    const localized = catalogEntry("/english-lead", "2026-08-05", {
      hero: "/media/different.jpg",
      section: "News",
      title: "English title",
      translationGroupId: "group-1",
    });

    expect(localizeHomepageCatalog([canonical], [localized])).toEqual([
      {
        ...localized,
        hero: canonical.hero,
        heroAlt: canonical.heroAlt,
        heroFit: canonical.heroFit,
        heroFocalX: canonical.heroFocalX,
        heroFocalY: canonical.heroFocalY,
        heroMediaId: canonical.heroMediaId,
        homepage: "lead",
        homepageOrder: 1,
        published: canonical.published,
        section: canonical.section,
      },
    ]);
  });

  it("omits canonical entries until their localized counterpart exists", () => {
    const canonical = catalogEntry("/lt-only", "2026-08-06", {
      translationGroupId: "group-1",
    });

    expect(localizeHomepageCatalog([canonical], [])).toEqual([]);
  });
});

describe("getHomepageArticleGroups", () => {
  it("returns exactly the groups rendered by the homepage model", () => {
    const lead = catalogEntry("/lead", "2026-08-06", {
      translationGroupId: "lead-group",
    });
    const recent = catalogEntry("/recent", "2026-08-05", {
      translationGroupId: "recent-group",
    });

    expect(
      getHomepageArticleGroups({
        archiveMonths: [],
        lead,
        library: { description: "Library", title: "Library" },
        recent: [recent],
        secondary: [lead],
        sectionGroups: [
          { articles: [recent], href: "/section", title: "Section" },
        ],
      })
    ).toEqual(new Set(["lead-group", "recent-group"]));
  });
});

describe("cleanHtml", () => {
  it("promotes a standalone bold subheading to a semantic heading", () => {
    expect(
      cleanHtml("<p><strong>Article section</strong></p><p>Body</p>")
    ).toBe("<h2>Article section</h2><p>Body</p>");
  });

  it("preserves canonical privacy-enhanced YouTube frames", () => {
    const frame =
      '<div data-youtube-video=""><iframe class="article-youtube" loading="lazy" src="https://www.youtube-nocookie.com/embed/urfnIUXAddM?rel=1"></iframe></div>';

    expect(cleanHtml(frame)).toBe(frame);
  });

  it("removes untrusted frames and event handlers", () => {
    expect(
      cleanHtml(
        '<iframe src="https://example.com/embed"></iframe><p onclick="alert(1)">Body</p>'
      )
    ).toBe("<p>Body</p>");
  });

  it("suppresses a body figure already presented as the article hero", () => {
    expect(
      cleanHtml(
        '<figure data-media-id="media_lead"><img alt="Lead" src="/api/media/media_lead"></figure><p>Body</p>',
        { hero: "/media/files/lead.jpg", heroMediaId: "media_lead" }
      )
    ).toBe("<p>Body</p>");
  });
});

describe("hasLeadFigure", () => {
  it("recognizes a canonical lead figure", () => {
    expect(
      hasLeadFigure(
        '<figure class="article-figure" data-figure-role="lead"><img src="/poster.png"></figure>'
      )
    ).toBe(true);
    expect(
      hasLeadFigure(
        '<figure class="article-figure" data-figure-role="content"><img src="/photo.png"></figure>'
      )
    ).toBe(true);
    expect(
      hasLeadFigure(
        '<p>Introduction</p><figure class="article-figure" data-figure-role="content"><img src="/photo.png"></figure>'
      )
    ).toBe(false);
  });
});
