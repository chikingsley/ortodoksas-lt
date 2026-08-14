import { env } from "cloudflare:test";
import { articleRevisions, mediaAssets } from "@ortodoksas-lt/db";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { getDatabase } from "../worker/db";
import {
  createArticle,
  getArticleWorkspace,
  restoreArticleRevision,
  updateArticle,
} from "../worker/services/article-operations";
import {
  createTranslationDraft,
  getTranslationSourceHash,
} from "../worker/services/article-translation";
import {
  getHomepagePlacements,
  updateHomepagePlacements,
} from "../worker/services/homepage-operations";
import { serveMedia, uploadMedia } from "../worker/services/media-operations";

const IMAGE_BYTES = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  ),
  (character) => character.charCodeAt(0)
);
const EDITOR_ID = "clerk-test-editor";
const ORIGINAL_MEDIA_KEY_PATTERN = /^media\/originals\/[0-9a-f]{64}\.png$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

const uploadHero = async (fileName: string) => {
  const response = await uploadMedia({
    database: getDatabase(env.DB),
    images: env.IMAGES,
    media: env.MEDIA,
    request: new Request("https://studio.test/api/media", {
      body: IMAGE_BYTES,
      headers: {
        "content-type": "image/png",
        "x-file-name": encodeURIComponent(fileName),
      },
      method: "POST",
    }),
  });
  expect([200, 201]).toContain(response.status);
  return (await response.json()) as {
    media: { id: string; url: string };
    reused: boolean;
  };
};

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

  it("stores, deduplicates, and serves an uploaded image through R2", async () => {
    const first = await uploadHero("service-image.png");
    const second = await uploadHero("service-image-copy.png");
    expect(second.media.id).toBe(first.media.id);
    expect(second.reused).toBe(true);

    const database = getDatabase(env.DB);
    const [stored] = await database
      .select({ r2Key: mediaAssets.r2Key })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, first.media.id))
      .limit(1);
    expect(stored?.r2Key).toMatch(ORIGINAL_MEDIA_KEY_PATTERN);
    const response = await serveMedia({
      database,
      id: first.media.id,
      images: env.IMAGES,
      media: env.MEDIA,
      request: new Request(`https://studio.test${first.media.url}`),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(IMAGE_BYTES);
  });

  it("runs the atomic editorial lifecycle with revision concurrency", async () => {
    const database = getDatabase(env.DB);
    const hero = await uploadHero("article-hero.png");
    const slug = `worker-${crypto.randomUUID()}`;
    const created = await createArticle({
      database,
      editorId: EDITOR_ID,
      payload: {
        baseline: {
          body: {
            content: [
              {
                content: [{ text: "Turinys", type: "text" }],
                type: "paragraph",
              },
            ],
            type: "doc",
          },
          converterVersion: "legacy-html-v1",
          summary: "",
          title: "Source title",
        },
        body: {
          content: [
            {
              content: [{ text: "Turinys", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
        heroSourceUrl: hero.media.url,
        labels: ["Original label"],
        language: "lt",
        section: "Original section",
        slug,
        summary: "Worker runtime test",
        title: "Patikros straipsnis",
      },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const workspace = await getArticleWorkspace(database, created.data.id);
    expect(workspace).toMatchObject({
      canonical: {
        heroMediaId: hero.media.id,
        status: "draft",
        title: "Patikros straipsnis",
      },
      revisions: [{ editor_id: EDITOR_ID, version: 1 }],
    });

    const published = await updateArticle({
      articleId: created.data.id,
      database,
      editorId: EDITOR_ID,
      payload: {
        body: {
          content: [
            {
              content: [{ text: "Turinys", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
        expectedVersion: 1,
        heroSourceUrl: hero.media.url,
        labels: ["Changed label"],
        language: "lt",
        section: "Changed section",
        slug,
        status: "published",
        summary: "Complete worker runtime test.",
        title: "Patikros straipsnis",
        translationKind: "original",
      },
    });
    expect(published).toMatchObject({
      data: { status: "published", version: 2 },
      ok: true,
    });

    const staleSave = await updateArticle({
      articleId: created.data.id,
      database,
      editorId: EDITOR_ID,
      payload: {
        body: { content: [{ type: "paragraph" }], type: "doc" },
        expectedVersion: 1,
        language: "lt",
        slug,
        summary: "Stale save.",
        title: "Stale title",
      },
    });
    expect(staleSave).toMatchObject({
      currentVersion: 2,
      ok: false,
      status: 409,
    });

    const initialHomepage = await getHomepagePlacements(database);
    const homepage = await updateHomepagePlacements({
      database,
      payload: {
        expectedRevision: initialHomepage.revision,
        leadId: created.data.id,
        secondaryIds: [],
      },
    });
    expect(homepage.ok).toBe(true);
    const staleHomepage = await updateHomepagePlacements({
      database,
      payload: {
        expectedRevision: initialHomepage.revision,
        leadId: created.data.id,
        secondaryIds: [],
      },
    });
    expect(staleHomepage).toMatchObject({ ok: false, status: 409 });
    await expect(getHomepagePlacements(database)).resolves.toMatchObject({
      placements: [
        expect.objectContaining({
          articleId: created.data.id,
          slot: "lead",
        }),
      ],
    });
    const placementRows = await database.query.homepagePlacements.findMany();
    expect(placementRows).toHaveLength(1);

    const blockedUnpublish = await updateArticle({
      articleId: created.data.id,
      database,
      editorId: EDITOR_ID,
      payload: {
        body: {
          content: [
            {
              content: [{ text: "Turinys", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
        expectedVersion: 2,
        heroSourceUrl: hero.media.url,
        labels: ["Changed label"],
        language: "lt",
        section: "Changed section",
        slug,
        status: "draft",
        summary: "Complete worker runtime test.",
        title: "Patikros straipsnis",
        translationKind: "original",
      },
    });
    expect(blockedUnpublish).toMatchObject({ ok: false, status: 409 });

    const activeHomepage = await getHomepagePlacements(database);
    const clearedHomepage = await updateHomepagePlacements({
      database,
      payload: {
        expectedRevision: activeHomepage.revision,
        leadId: null,
        secondaryIds: [],
      },
    });
    expect(clearedHomepage.ok).toBe(true);

    const restored = await restoreArticleRevision({
      articleId: created.data.id,
      database,
      editorId: EDITOR_ID,
      expectedVersion: 2,
      version: 1,
    });
    expect(restored).toMatchObject({
      data: {
        article: {
          labelsJson: '["Original label"]',
          publishedAt: null,
          section: "Original section",
          status: "draft",
        },
        restoredFrom: 1,
        version: 3,
      },
      ok: true,
    });

    const translation = await createTranslationDraft({
      database,
      editorId: EDITOR_ID,
      language: "en",
      sourceArticleId: created.data.id,
    });
    expect(translation).toMatchObject({
      article: { language: "en" },
      kind: "created",
    });
    await expect(
      createTranslationDraft({
        database,
        editorId: EDITOR_ID,
        language: "en",
        sourceArticleId: created.data.id,
      })
    ).resolves.toMatchObject({ kind: "edition_exists" });
  });

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
        body: {
          content: [
            {
              content: [{ text: "Edited translation", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
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
              content: [{ text: "Edited source body", type: "text" }],
              type: "paragraph",
            },
          ],
          type: "doc",
        },
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
