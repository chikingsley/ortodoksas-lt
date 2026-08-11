import { describe, expect, it } from "vitest";
import {
  applyArticleTranslations,
  getArticleTranslationSegments,
} from "./machine-translation";

const source = {
  body: {
    content: [
      {
        content: [{ text: "Body text", type: "text" }],
        type: "paragraph",
      },
      {
        attrs: {
          alt: "Icon description",
          src: "/api/media/example",
        },
        type: "figure",
      },
    ],
    type: "doc" as const,
  },
  summary: "Summary",
  title: "Title",
};

describe("article machine translation", () => {
  it("extracts only reader-facing text in stable order", () => {
    expect(getArticleTranslationSegments(source)).toEqual([
      "Title",
      "Summary",
      "Body text",
      "Icon description",
    ]);
  });

  it("rebuilds the document without changing structure or media paths", () => {
    const result = applyArticleTranslations(source, [
      "Antraštė",
      "Santrauka",
      "Tekstas",
      "Ikonos aprašymas",
    ]);

    expect(result.title).toBe("Antraštė");
    expect(result.summary).toBe("Santrauka");
    expect(result.body).toEqual({
      content: [
        {
          content: [{ text: "Tekstas", type: "text" }],
          type: "paragraph",
        },
        {
          attrs: {
            alt: "Ikonos aprašymas",
            src: "/api/media/example",
          },
          type: "figure",
        },
      ],
      type: "doc",
    });
  });

  it("rejects incomplete provider responses", () => {
    expect(() => applyArticleTranslations(source, ["Only one"])).toThrow(
      "Translation segment count mismatch"
    );
  });
});
