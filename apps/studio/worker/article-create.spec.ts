import { env } from "cloudflare:workers";
import { articleRevisions } from "@ortodoksas-lt/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  createArticle,
  updateArticle,
} from "../src/server/articles/article-commands.server";
import { getDatabase } from "../src/server/db.server";
import { EDITOR_ID } from "./fixtures";

describe("Studio Worker services", () => {
  it("applies publication quality gates during article creation", async () => {
    const result = await createArticle({
      database: getDatabase(env.DB),
      editorId: EDITOR_ID,
      payload: {
        body: { content: [{ type: "paragraph" }], type: "doc" },
        language: "lt",
        slug: `quality-gate-${crypto.randomUUID()}`,
        status: "published",
        summary: "",
        title: "Quality gate",
      },
    });
    expect(result).toMatchObject({ ok: false, status: 422 });
  });

  it("accepts version zero for an imported article without revision history", async () => {
    const database = getDatabase(env.DB);
    const slug = `revisionless-${crypto.randomUUID()}`;
    const created = await createArticle({
      database,
      editorId: EDITOR_ID,
      payload: {
        body: { content: [{ type: "paragraph" }], type: "doc" },
        language: "lt",
        slug,
        summary: "Imported article",
        title: "Imported article",
      },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    await database
      .delete(articleRevisions)
      .where(eq(articleRevisions.articleId, created.data.id));

    const saved = await updateArticle({
      articleId: created.data.id,
      database,
      editorId: EDITOR_ID,
      payload: {
        body: { content: [{ type: "paragraph" }], type: "doc" },
        expectedVersion: 0,
        language: "lt",
        slug,
        summary: "Imported article ready for review",
        title: "Imported article",
      },
    });
    expect(saved).toMatchObject({ data: { version: 1 }, ok: true });
  });
});
