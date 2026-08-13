import { describe, expect, it } from "vitest";

import {
  filterArticleGroups,
  getGroupPublicationSummary,
  getPageRole,
  groupArticles,
  groupPagesByRole,
} from "../src/editorial/articles/inventory/article-groups";
import type { CatalogArticle } from "../src/editorial/articles/types";

const article = (
  overrides: Partial<CatalogArticle> & Pick<CatalogArticle, "id" | "language">
): CatalogArticle => ({
  capture: "",
  description: "Description",
  file: "",
  hero: null,
  kind: "article",
  labels: [],
  path: `/p/${overrides.id}.html`,
  published: null,
  section: "faith",
  source: "",
  status: "draft",
  thumbnail: null,
  title: `Title ${overrides.language}`,
  translationGroupId: "story-1",
  translationKind: overrides.language === "lt" ? "original" : "human",
  translationReviewStatus:
    overrides.language === "lt" ? "not_required" : "pending",
  ...overrides,
});

describe("article inventory groups", () => {
  it("groups editions and prefers Lithuanian for the story identity", () => {
    const groups = groupArticles([
      article({ id: "en-1", language: "en" }),
      article({ id: "lt-1", language: "lt" }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.representative.id).toBe("lt-1");
    expect(groups[0]?.editions.en?.id).toBe("en-1");
    expect(groups[0]?.editions.lt?.id).toBe("lt-1");
  });

  it("searches and filters across every edition in a group", () => {
    const groups = groupArticles([
      article({ id: "lt-1", language: "lt", title: "Lietuviškas" }),
      article({
        id: "en-1",
        language: "en",
        section: "news",
        status: "published",
        title: "English searchable title",
      }),
    ]);

    expect(
      filterArticleGroups(groups, {
        query: "searchable",
        section: "news",
        status: "published",
      })
    ).toHaveLength(1);
  });

  it("counts published edition coverage", () => {
    const [group] = groupArticles([
      article({ id: "lt-1", language: "lt", status: "published" }),
      article({ id: "en-1", language: "en", status: "published" }),
      article({ id: "ru-1", language: "ru" }),
    ]);

    expect(group && getGroupPublicationSummary(group)).toBe("2 / 5 published");
  });

  it("groups localized pages into one page row with edition coverage", () => {
    const groups = groupArticles([
      article({
        id: "page-lt",
        kind: "page",
        language: "lt",
        translationGroupId: "page-group",
      }),
      article({
        id: "page-en",
        kind: "page",
        language: "en",
        translationGroupId: "page-group",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.representative.kind).toBe("page");
    expect(groups[0]?.editions.lt?.id).toBe("page-lt");
    expect(groups[0]?.editions.en?.id).toBe("page-en");
  });

  it("classifies all 18 recovered pages into the approved public roles", () => {
    const routesByRole = {
      archive: ["/p/paskaitos"],
      library: [
        "/p/biblijos-komentarai",
        "/p/kasdiene-duona",
        "/p/katekizmas_12",
        "/p/natos",
        "/p/liturgika",
        "/p/sventuju-kankiniu",
        "/p/ortodoksu-terminu-zodynaw",
        "/p/dokumentu-puslapis",
        "/p/blog-page",
        "/p/dvasingumas",
      ],
      navigation: [
        "/p/bendruomenes_21",
        "/p/dvasininkai",
        "/p/biblioteka",
        "/p/kalendorius",
        "/p/kontaktai_30",
        "/p/paremti",
      ],
      "profile-redirect": ["/p/apie-mane"],
    } as const;
    const pages = Object.values(routesByRole)
      .flat()
      .map((path, index) =>
        article({
          id: `page-${index}`,
          kind: "page",
          language: "lt",
          path,
          translationGroupId: `page-group-${index}`,
        })
      );

    for (const [expectedRole, routes] of Object.entries(routesByRole)) {
      for (const route of routes) {
        expect(getPageRole(route)).toBe(expectedRole);
      }
    }

    const grouped = groupPagesByRole(groupArticles(pages));
    expect(
      Object.fromEntries(
        grouped.map(({ groups, role }) => [role, groups.length])
      )
    ).toEqual({
      archive: 1,
      library: 10,
      navigation: 6,
      "profile-redirect": 1,
    });
    expect(grouped.flatMap(({ groups }) => groups)).toHaveLength(18);
  });

  it("keeps new page routes in an explicit other-pages group", () => {
    const grouped = groupPagesByRole(
      groupArticles([
        article({
          id: "new-page",
          kind: "page",
          language: "lt",
          path: "/p/new-page",
          translationGroupId: "new-page-group",
        }),
      ])
    );

    expect(grouped.find(({ role }) => role === "other")).toEqual(
      expect.objectContaining({
        groups: [expect.objectContaining({ id: "new-page-group" })],
      })
    );
  });
});
