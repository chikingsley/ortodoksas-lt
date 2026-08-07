import { describe, expect, it } from "vitest";
import { buildHomepageModel, selectHomepageArticles } from "./homepage";
import type { CatalogEntry } from "./publication";

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
});
