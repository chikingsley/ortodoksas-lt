import { describe, expect, it } from "vitest";
import { selectHomepageArticles } from "./homepage";

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
});
