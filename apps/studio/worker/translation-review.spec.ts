import { env } from "cloudflare:workers";
import { articleRevisions } from "@ortodoksas-lt/db";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  createArticle,
  restoreArticleRevision,
  updateArticle,
} from "../src/server/articles/article-commands.server";
import { getArticleWorkspace } from "../src/server/articles/article-queries.server";
import {
  createTranslationDraft,
  getTranslationSourceHash,
} from "../src/server/articles/article-translation.server";
import { getDatabase } from "../src/server/db.server";
import { EDITOR_ID } from "./fixtures";

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

describe("Studio Worker services", () => {
  it("preserves explicit translation approval and invalidates stale reviews", async () => {
    const database = getDatabase(env.DB);
    const sourceSlug = `translation-source-${crypto.randomUUID()}`;
    const source = await createArticle({
      database,
      editorId: EDITOR_ID,
      payload: {
        body: {
          content: [
            {
              content: [{ text: "Source body", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
        language: "lt",
        slug: sourceSlug,
        summary: "Source summary",
        title: "Source title",
      },
    });
    expect(source.ok).toBe(true);
    if (!source.ok) {
      return;
    }
    const translationDraft = await createTranslationDraft({
      database,
      editorId: EDITOR_ID,
      language: "en",
      sourceArticleId: source.data.id,
    });
    expect(translationDraft.kind).toBe("created");
    if (translationDraft.kind !== "created") {
      return;
    }
    const translationId = translationDraft.article.id;
    const initialTranslationWorkspace = await getArticleWorkspace(
      database,
      translationId
    );
    const initialSourceHash =
      initialTranslationWorkspace?.translationSourceCurrentHash;
    expect(initialSourceHash).toMatch(SHA256_PATTERN);
    const translationPayload = {
      body: {
        content: [
          {
            content: [{ text: "Translated body", type: "text" }],
            type: "paragraph",
          },
        ],
        type: "doc",
      },
      language: "en",
      slug: translationDraft.article.slug,
      summary: "Translated summary",
      title: "Translated title",
      translationKind: "human" as const,
    };

    const approved = await updateArticle({
      articleId: translationId,
      database,
      editorId: EDITOR_ID,
      payload: {
        ...translationPayload,
        expectedTranslationSourceHash: initialSourceHash,
        expectedVersion: 1,
        translationReviewAction: "approve",
      },
    });
    expect(approved).toMatchObject({
      data: { translationReviewStatus: "approved", version: 2 },
      ok: true,
    });
    const approvedWorkspace = await getArticleWorkspace(
      database,
      translationId
    );
    const approvedAt = approvedWorkspace?.canonical.translationReviewedAt;
    expect(approvedAt).toEqual(expect.any(Number));

    const ordinarySave = await updateArticle({
      articleId: translationId,
      database,
      editorId: EDITOR_ID,
      payload: { ...translationPayload, expectedVersion: 2 },
    });
    expect(ordinarySave).toMatchObject({
      data: { translationReviewStatus: "approved", version: 3 },
      ok: true,
    });
    await expect(
      getArticleWorkspace(database, translationId)
    ).resolves.toMatchObject({
      canonical: {
        translationReviewedAt: approvedAt,
        translationReviewedBy: EDITOR_ID,
      },
    });

    const editedTranslation = await updateArticle({
      articleId: translationId,
      database,
      editorId: EDITOR_ID,
      payload: {
        ...translationPayload,
        byline: "Translated author",
        bylineType: "person",
        bylineUrl: "https://example.com/translated-author",
        expectedVersion: 3,
      },
    });
    expect(editedTranslation).toMatchObject({
      data: { translationReviewStatus: "pending", version: 4 },
      ok: true,
    });
    await expect(
      getArticleWorkspace(database, translationId)
    ).resolves.toMatchObject({
      canonical: {
        translationReviewedAt: null,
        translationReviewedBy: null,
      },
    });

    const reapproved = await updateArticle({
      articleId: translationId,
      database,
      editorId: EDITOR_ID,
      payload: {
        ...translationPayload,
        body: {
          content: [
            {
              content: [{ text: "Edited translation", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
        byline: "Translated author",
        bylineType: "person",
        bylineUrl: "https://example.com/translated-author",
        expectedTranslationSourceHash: initialSourceHash,
        expectedVersion: 4,
        translationReviewAction: "approve",
      },
    });
    expect(reapproved).toMatchObject({
      data: { translationReviewStatus: "approved", version: 5 },
      ok: true,
    });
    await database
      .update(articleRevisions)
      .set({
        metadataJson: JSON.stringify({
          snapshotCompleteness: "legacy_partial",
          snapshotVersion: 2,
          summary: "Translated summary",
          title: "Translated title",
        }),
      })
      .where(
        and(
          eq(articleRevisions.articleId, translationId),
          eq(articleRevisions.version, 5)
        )
      );

    const editedSource = await updateArticle({
      articleId: source.data.id,
      database,
      editorId: EDITOR_ID,
      payload: {
        body: {
          content: [
            {
              content: [{ text: "Source body", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
        byline: "Updated source author",
        bylineType: "person",
        bylineUrl: "https://example.com/source-author",
        expectedVersion: 1,
        language: "lt",
        slug: sourceSlug,
        summary: "Source summary",
        title: "Source title",
        translationKind: "original",
      },
    });
    expect(editedSource.ok).toBe(true);
    const sourceInvalidatedWorkspace = await getArticleWorkspace(
      database,
      translationId
    );
    expect(sourceInvalidatedWorkspace).toMatchObject({
      canonical: {
        translationReviewedAt: null,
        translationReviewedBy: null,
        translationReviewStatus: "pending",
      },
    });
    expect(sourceInvalidatedWorkspace?.revisions[0]).toMatchObject({
      version: 6,
    });
    expect(
      JSON.parse(
        sourceInvalidatedWorkspace?.revisions[0]?.metadata_json ?? "{}"
      )
    ).toMatchObject({
      snapshotCompleteness: "complete",
      translationReviewStatus: "pending",
      translationSourceArticleId: source.data.id,
    });

    const staleApproval = await updateArticle({
      articleId: translationId,
      database,
      editorId: EDITOR_ID,
      payload: {
        ...translationPayload,
        body: {
          content: [
            {
              content: [{ text: "Edited translation", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
        expectedTranslationSourceHash: initialSourceHash,
        expectedVersion: 6,
        translationReviewAction: "approve",
      },
    });
    expect(staleApproval).toEqual({
      error: "Translation source changed since this editor loaded it",
      ok: false,
      status: 409,
    });

    const approvedAfterSourceEdit = await updateArticle({
      articleId: translationId,
      database,
      editorId: EDITOR_ID,
      payload: {
        ...translationPayload,
        body: {
          content: [
            {
              content: [{ text: "Edited translation", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
        expectedTranslationSourceHash:
          sourceInvalidatedWorkspace?.translationSourceCurrentHash,
        expectedVersion: 6,
        translationReviewAction: "approve",
      },
    });
    expect(approvedAfterSourceEdit).toMatchObject({
      data: { translationReviewStatus: "approved", version: 7 },
      ok: true,
    });

    const restoredSource = await restoreArticleRevision({
      articleId: source.data.id,
      database,
      editorId: EDITOR_ID,
      expectedVersion: 2,
      version: 1,
    });
    expect(restoredSource.ok).toBe(true);
    const restoreInvalidatedWorkspace = await getArticleWorkspace(
      database,
      translationId
    );
    expect(restoreInvalidatedWorkspace).toMatchObject({
      canonical: { translationReviewStatus: "pending" },
    });
    expect(restoreInvalidatedWorkspace?.revisions[0]?.version).toBe(8);

    await Promise.all([
      updateArticle({
        articleId: source.data.id,
        database,
        editorId: EDITOR_ID,
        payload: {
          body: {
            content: [
              {
                content: [{ text: "Concurrent source body", type: "text" }],
                type: "paragraph",
              },
            ],
            type: "doc",
          },
          expectedVersion: 3,
          language: "lt",
          slug: sourceSlug,
          summary: "Source summary",
          title: "Source title",
          translationKind: "original",
        },
      }),
      updateArticle({
        articleId: translationId,
        database,
        editorId: EDITOR_ID,
        payload: {
          ...translationPayload,
          body: {
            content: [
              {
                content: [{ text: "Edited translation", type: "text" }],
                type: "paragraph",
              },
            ],
            type: "doc",
          },
          expectedTranslationSourceHash:
            restoreInvalidatedWorkspace?.translationSourceCurrentHash,
          expectedVersion: 8,
          translationReviewAction: "approve",
        },
      }),
    ]);
    const [concurrentSource, concurrentTranslation] = await Promise.all([
      getArticleWorkspace(database, source.data.id),
      getArticleWorkspace(database, translationId),
    ]);
    expect(concurrentSource).toBeDefined();
    expect(concurrentTranslation).toBeDefined();
    if (!(concurrentSource && concurrentTranslation)) {
      return;
    }
    if (
      concurrentTranslation.canonical.translationReviewStatus === "approved"
    ) {
      await expect(
        getTranslationSourceHash(concurrentSource.canonical)
      ).resolves.toBe(concurrentTranslation.canonical.translationSourceHash);
    } else {
      expect(concurrentTranslation.canonical.translationReviewStatus).toBe(
        "pending"
      );
    }

    const changesRequested = await updateArticle({
      articleId: translationId,
      database,
      editorId: EDITOR_ID,
      payload: {
        ...translationPayload,
        body: {
          content: [
            {
              content: [{ text: "Edited translation", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
        expectedVersion: concurrentTranslation.revisions[0]?.version,
        translationReviewAction: "request_changes",
      },
    });
    expect(changesRequested).toMatchObject({
      data: { translationReviewStatus: "changes_requested" },
      ok: true,
    });

    const [preRestoreSource, preRestoreTranslation] = await Promise.all([
      getArticleWorkspace(database, source.data.id),
      getArticleWorkspace(database, translationId),
    ]);
    expect(preRestoreSource).toBeDefined();
    expect(preRestoreTranslation).toBeDefined();
    if (!(preRestoreSource && preRestoreTranslation)) {
      return;
    }
    const restoreRaceApproval = await updateArticle({
      articleId: translationId,
      database,
      editorId: EDITOR_ID,
      payload: {
        ...translationPayload,
        body: {
          content: [
            {
              content: [{ text: "Edited translation", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
        expectedTranslationSourceHash:
          preRestoreTranslation.translationSourceCurrentHash,
        expectedVersion: preRestoreTranslation.revisions[0]?.version,
        translationReviewAction: "approve",
      },
    });
    expect(restoreRaceApproval.ok).toBe(true);
    if (!restoreRaceApproval.ok) {
      return;
    }
    const approvedVersion = restoreRaceApproval.data.version;
    await Promise.all([
      restoreArticleRevision({
        articleId: translationId,
        database,
        editorId: EDITOR_ID,
        expectedVersion: approvedVersion,
        version: approvedVersion,
      }),
      updateArticle({
        articleId: source.data.id,
        database,
        editorId: EDITOR_ID,
        payload: {
          body: {
            content: [
              {
                content: [
                  { text: "Source changed during restore", type: "text" },
                ],
                type: "paragraph",
              },
            ],
            type: "doc",
          },
          expectedVersion: preRestoreSource.revisions[0]?.version,
          language: "lt",
          slug: sourceSlug,
          summary: "Source summary",
          title: "Source title",
          translationKind: "original",
        },
      }),
    ]);
    const [postRestoreSource, postRestoreTranslation] = await Promise.all([
      getArticleWorkspace(database, source.data.id),
      getArticleWorkspace(database, translationId),
    ]);
    expect(postRestoreSource).toBeDefined();
    expect(postRestoreTranslation).toBeDefined();
    if (!(postRestoreSource && postRestoreTranslation)) {
      return;
    }
    if (
      postRestoreTranslation.canonical.translationReviewStatus === "approved"
    ) {
      await expect(
        getTranslationSourceHash(postRestoreSource.canonical)
      ).resolves.toBe(postRestoreTranslation.canonical.translationSourceHash);
    } else {
      expect(postRestoreTranslation.canonical.translationReviewStatus).toBe(
        "pending"
      );
    }
  });
});
