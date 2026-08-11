import { describe, expect, it } from "vitest";
import {
  applyArticleTranslations,
  getArticleTranslationSegments,
  normalizeArticleTranslationSource,
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

  it("removes linked legacy translation navigation before translation", () => {
    const legacySource = {
      body: {
        content: [
          {
            content: [
              { text: " ", type: "text" },
              { type: "hardBreak" },
              {
                marks: [
                  {
                    attrs: {
                      href: "https://ortodoksas-ru.blogspot.com/example",
                    },
                    type: "link",
                  },
                ],
                text: "РУССКИЙ ПЕРЕВОД",
                type: "text",
              },
            ],
            type: "paragraph",
          },
          {
            content: [{ text: "Article body", type: "text" }],
            type: "paragraph",
          },
        ],
        type: "doc" as const,
      },
      summary: "РУССКИЙ ПЕРЕВОД Article summary",
      title: "Article title",
    };

    expect(normalizeArticleTranslationSource(legacySource)).toEqual({
      body: {
        content: [
          {
            content: [{ text: "Article body", type: "text" }],
            type: "paragraph",
          },
        ],
        type: "doc",
      },
      summary: "Article summary",
      title: "Article title",
    });
    expect(getArticleTranslationSegments(legacySource)).toEqual([
      "Article title",
      "Article summary",
      "Article body",
    ]);
  });

  it("preserves ordinary links and translation wording inside article content", () => {
    const linkedSentence = {
      body: {
        content: [
          {
            content: [
              { text: "Read the ", type: "text" },
              {
                marks: [{ attrs: { href: "/ru" }, type: "link" }],
                text: "Russian translation",
                type: "text",
              },
              { text: " alongside this article.", type: "text" },
            ],
            type: "paragraph",
          },
        ],
        type: "doc" as const,
      },
      summary: "A discussion of a Russian translation",
      title: "Translation notes",
    };

    expect(normalizeArticleTranslationSource(linkedSentence)).toEqual(
      linkedSentence
    );
  });
});
