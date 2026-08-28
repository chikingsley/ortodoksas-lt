import { env } from "cloudflare:workers";
import {
  articleBaselines,
  articleRevisions,
  articles,
  publicationGroups,
} from "@ortodoksas-lt/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createArticle } from "../src/server/articles/article-commands.server";
import { deleteArticleDraft } from "../src/server/articles/article-deletion.server";
import { getArticleWorkspace } from "../src/server/articles/article-queries.server";
import { createTranslationDraft } from "../src/server/articles/article-translation.server";
import { getDatabase } from "../src/server/db.server";

const EDITOR_ID = "clerk-draft-deletion-test";

describe("article draft deletion", () => {
  it("deletes translation drafts and removes the group after its final draft", async () => {
    const database = getDatabase(env.DB);
    const original = await createArticle({
      database,
      editorId: EDITOR_ID,
      payload: {
        body: { content: [{ type: "paragraph" }], type: "doc" },
        language: "lt",
        slug: `deletion-${crypto.randomUUID()}`,
        summary: "",
        title: "Deletion test",
      },
    });
    expect(original.ok).toBe(true);
    if (!original.ok) {
      return;
    }

    const translation = await createTranslationDraft({
      database,
      editorId: EDITOR_ID,
      language: "en",
      sourceArticleId: original.data.id,
    });
    expect(translation.kind).toBe("created");
    if (translation.kind !== "created") {
      return;
    }

    await expect(
      deleteArticleDraft({ articleId: original.data.id, database })
    ).resolves.toMatchObject({ ok: false, status: 409 });
    await expect(
      deleteArticleDraft({ articleId: translation.article.id, database })
    ).resolves.toEqual({
      data: { id: translation.article.id },
      ok: true,
    });
    await expect(
      getArticleWorkspace(database, translation.article.id)
    ).resolves.toBeNull();
    await expect(
      database
        .select({ id: articleRevisions.id })
        .from(articleRevisions)
        .where(eq(articleRevisions.articleId, translation.article.id))
    ).resolves.toHaveLength(0);
    await expect(
      database
        .select({ id: articleBaselines.articleId })
        .from(articleBaselines)
        .where(eq(articleBaselines.articleId, translation.article.id))
    ).resolves.toHaveLength(0);

    await expect(
      deleteArticleDraft({ articleId: original.data.id, database })
    ).resolves.toEqual({ data: { id: original.data.id }, ok: true });
    await expect(
      database
        .select({ id: publicationGroups.id })
        .from(publicationGroups)
        .where(eq(publicationGroups.id, translation.article.translationGroupId))
    ).resolves.toHaveLength(0);
  });

  it("preserves records that have left draft status", async () => {
    const database = getDatabase(env.DB);
    const created = await createArticle({
      database,
      editorId: EDITOR_ID,
      payload: {
        body: { content: [{ type: "paragraph" }], type: "doc" },
        language: "lt",
        slug: `published-deletion-${crypto.randomUUID()}`,
        summary: "",
        title: "Published deletion guard",
      },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    await database
      .update(articles)
      .set({ status: "published" })
      .where(eq(articles.id, created.data.id));

    await expect(
      deleteArticleDraft({ articleId: created.data.id, database })
    ).resolves.toMatchObject({ ok: false, status: 422 });
    await expect(
      getArticleWorkspace(database, created.data.id)
    ).resolves.toBeDefined();
  });
});
