import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import {
  createArticle,
  updateArticle,
} from "../src/server/articles/article-commands.server";
import { getDatabase } from "../src/server/db.server";
import { EDITOR_ID } from "./fixtures";

describe("Studio Worker services", () => {
  it("routes translation creation through the guarded draft workflow", async () => {
    const database = getDatabase(env.DB);
    const result = await createArticle({
      database,
      editorId: EDITOR_ID,
      payload: {
        body: { content: [{ type: "paragraph" }], type: "doc" },
        language: "lt",
        slug: `review-bypass-${crypto.randomUUID()}`,
        summary: "Attempted bypass",
        title: "Attempted bypass",
        translationKind: "human",
        translationReviewStatus: "approved",
        translationSourceArticleId: crypto.randomUUID(),
        translationSourceHash: "a".repeat(64),
      },
    });
    expect(result).toMatchObject({ ok: false, status: 422 });

    const original = await createArticle({
      database,
      editorId: EDITOR_ID,
      payload: {
        body: { content: [{ type: "paragraph" }], type: "doc" },
        language: "lt",
        slug: `original-conversion-${crypto.randomUUID()}`,
        summary: "Original article",
        title: "Original article",
      },
    });
    expect(original.ok).toBe(true);
    if (!original.ok) {
      return;
    }
    const conversion = await updateArticle({
      articleId: original.data.id,
      database,
      editorId: EDITOR_ID,
      payload: {
        body: { content: [{ type: "paragraph" }], type: "doc" },
        expectedVersion: 1,
        language: "en",
        slug: "converted-translation",
        summary: "Converted translation",
        title: "Converted translation",
        translationKind: "human",
      },
    });
    expect(conversion).toMatchObject({ ok: false, status: 422 });
  });
});
