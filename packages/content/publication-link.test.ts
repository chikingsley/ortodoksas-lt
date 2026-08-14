import { describe, expect, it } from "vitest";

import {
  canonicalizePublicationDocument,
  canonicalizePublicationHref,
  parseInternalPublicationHref,
} from "./publication-link";

describe("publication link canonicalization", () => {
  it("canonicalizes historical Ortodoksas hosts and localized paths", () => {
    expect(
      canonicalizePublicationHref(
        "http://ortodoksas.blogspot.com/2012/11/malda-ir-askeze.html"
      )
    ).toBe("/2012/11/malda-ir-askeze");
    expect(
      canonicalizePublicationHref(
        "https://www.ortodoksas.lt/en/p/history.html?ref=old#section"
      )
    ).toBe("/en/p/history?ref=old#section");
    expect(
      canonicalizePublicationHref(
        "https://ortodoksas-ru.blogspot.com/2022/05/story.html"
      )
    ).toBe("/ru/2022/05/story");
    expect(parseInternalPublicationHref("/2026/08/current")).toMatchObject({
      path: "/2026/08/current",
    });
  });

  it("preserves external HTML resources", () => {
    const external =
      "https://example.com/reference/index.html?download=source.html";
    expect(canonicalizePublicationHref(external)).toBe(external);
  });

  it("canonicalizes Tiptap link targets and standalone visible URLs", () => {
    expect(
      canonicalizePublicationDocument({
        content: [
          {
            content: [
              {
                marks: [
                  {
                    attrs: {
                      href: "https://ortodoksas.lt/2026/08/story.html",
                    },
                    type: "link",
                  },
                ],
                text: "https://ortodoksas.lt/2026/08/story.html",
                type: "text",
              },
            ],
            type: "paragraph",
          },
        ],
        type: "doc",
      })
    ).toEqual({
      content: [
        {
          content: [
            {
              marks: [
                {
                  attrs: { href: "/2026/08/story" },
                  type: "link",
                },
              ],
              text: "https://ortodoksas.lt/2026/08/story",
              type: "text",
            },
          ],
          type: "paragraph",
        },
      ],
      type: "doc",
    });
  });
});
