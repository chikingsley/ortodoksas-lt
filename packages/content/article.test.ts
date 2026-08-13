import { describe, expect, it } from "vitest";

import {
  createArticleSchema,
  createInteractiveArticleSchema,
  updateArticleSchema,
} from "./article";

const article = {
  body: { content: [{ type: "paragraph" }], type: "doc" },
  language: "lt",
  slug: "example",
  summary: "Example summary",
  title: "Example title",
};

describe("article mutation boundaries", () => {
  it("accepts the canonical create and update inputs", () => {
    expect(createArticleSchema.safeParse(article).success).toBe(true);
    expect(
      updateArticleSchema.safeParse({ ...article, expectedVersion: 1 }).success
    ).toBe(true);
  });

  it("rejects client-supplied reviewer identity and time", () => {
    expect(
      createArticleSchema.safeParse({
        ...article,
        translationReviewedAt: 123,
        translationReviewedBy: "spoofed-editor",
      }).success
    ).toBe(false);
    expect(
      updateArticleSchema.safeParse({
        ...article,
        expectedVersion: 1,
        translationReviewedAt: 123,
        translationReviewedBy: "spoofed-editor",
      }).success
    ).toBe(false);
  });

  it("reserves translation creation for the dedicated workflow", () => {
    expect(
      createInteractiveArticleSchema.safeParse({
        ...article,
        translationKind: "human",
        translationReviewStatus: "approved",
        translationSourceArticleId: crypto.randomUUID(),
        translationSourceHash: "a".repeat(64),
      }).success
    ).toBe(false);
    expect(
      createInteractiveArticleSchema.safeParse({ ...article, language: "en" })
        .success
    ).toBe(false);
  });
});
