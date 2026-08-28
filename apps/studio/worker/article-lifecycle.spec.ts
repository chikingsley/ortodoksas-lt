import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import {
  createArticle,
  restoreArticleRevision,
  updateArticle,
} from "../src/server/articles/article-commands.server";
import { getArticleWorkspace } from "../src/server/articles/article-queries.server";
import { createTranslationDraft } from "../src/server/articles/article-translation.server";
import { getDatabase } from "../src/server/db.server";
import {
  getHomepagePlacements,
  updateHomepagePlacements,
} from "../src/server/homepage/homepage-operations.server";
import { EDITOR_ID, uploadHero } from "./fixtures";

describe("Studio Worker services", () => {
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
        byline: "Editorial Team",
        bylineType: "organization",
        bylineUrl: "https://ortodoksas.lt/p/kontaktai",
        heroSourceUrl: hero.media.url,
        labels: ["Original label"],
        language: "lt",
        section: "Original section",
        seoDescription: "Original search description",
        seoTitle: "Original search title",
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
        byline: "Editorial Team",
        bylineType: "organization",
        bylineUrl: "https://ortodoksas.lt/p/kontaktai",
        heroMediaId: hero.media.id,
        seoDescription: "Original search description",
        seoTitle: "Original search title",
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
        byline: "Vitalijus Mockus",
        bylineType: "person",
        bylineUrl: "https://ortodoksas.lt/lt/zmogus/panaretos",
        expectedVersion: 1,
        heroSourceUrl: hero.media.url,
        labels: ["Changed label"],
        language: "lt",
        section: "Changed section",
        seoDescription: "Published search description",
        seoTitle: "Published search title",
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
    await expect(
      getArticleWorkspace(database, created.data.id)
    ).resolves.toMatchObject({
      canonical: {
        byline: "Vitalijus Mockus",
        bylineType: "person",
        bylineUrl: "https://ortodoksas.lt/lt/zmogus/panaretos",
        seoDescription: "Published search description",
        seoTitle: "Published search title",
      },
    });

    const legacyCompatibleSave = await updateArticle({
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
        status: "published",
        summary: "Complete worker runtime test.",
        title: "Patikros straipsnis",
        translationKind: "original",
      },
    });
    expect(legacyCompatibleSave).toMatchObject({
      data: { version: 3 },
      ok: true,
    });
    await expect(
      getArticleWorkspace(database, created.data.id)
    ).resolves.toMatchObject({
      canonical: {
        byline: "Vitalijus Mockus",
        bylineType: "person",
        bylineUrl: "https://ortodoksas.lt/lt/zmogus/panaretos",
        seoDescription: "Published search description",
        seoTitle: "Published search title",
      },
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
      currentVersion: 3,
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
        expectedVersion: 3,
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
      expectedVersion: 3,
      version: 1,
    });
    expect(restored).toMatchObject({
      data: {
        article: {
          byline: "Editorial Team",
          bylineType: "organization",
          bylineUrl: "https://ortodoksas.lt/p/kontaktai",
          labelsJson: '["Original label"]',
          publishedAt: null,
          section: "Original section",
          seoDescription: "Original search description",
          seoTitle: "Original search title",
          status: "draft",
        },
        restoredFrom: 1,
        version: 4,
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
    if (translation.kind === "created") {
      await expect(
        getArticleWorkspace(database, translation.article.id)
      ).resolves.toMatchObject({
        canonical: {
          byline: "Editorial Team",
          bylineType: "organization",
          bylineUrl: "https://ortodoksas.lt/p/kontaktai",
          seoDescription: null,
          seoTitle: null,
        },
      });
    }
    await expect(
      createTranslationDraft({
        database,
        editorId: EDITOR_ID,
        language: "en",
        sourceArticleId: created.data.id,
      })
    ).resolves.toMatchObject({ kind: "edition_exists" });
  });
});
