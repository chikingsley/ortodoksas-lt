import { env } from "cloudflare:test";
import { createMiddleware } from "hono/factory";
import { describe, expect, it } from "vitest";

import { createStudioApp } from "../worker";
import type { StudioEnvironment } from "../worker/types";

const testAuth = createMiddleware<StudioEnvironment>(async (context, next) => {
  context.set("editor", {
    id: "clerk-test-editor",
    name: "Clerk test editor",
    role: "editor",
  });
  await next();
});
const testApp = createStudioApp(testAuth);
const exports = {
  default: {
    fetch: (input: string | Request, init?: RequestInit) =>
      testApp.request(input, init, env),
  },
};

describe("studio Worker", () => {
  it("requires a Clerk session for the API", async () => {
    const response = await createStudioApp().request(
      "https://studio.test/api/session",
      undefined,
      env
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
  });

  it("reports its health", async () => {
    const response = await exports.default.fetch(
      "https://studio.test/api/health"
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      service: "ortodoksas-studio",
      status: "ready",
    });
  });

  it("provides the Clerk editor identity", async () => {
    const response = await exports.default.fetch(
      "https://studio.test/api/session"
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      authentication: "clerk",
      editor: {
        id: "clerk-test-editor",
        role: "editor",
      },
    });
  });

  it("stores, deduplicates, and serves an uploaded image through R2", async () => {
    const image = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
      ),
      (character) => character.charCodeAt(0)
    );
    const upload = () =>
      exports.default.fetch("https://studio.test/api/media", {
        body: image,
        headers: {
          "content-type": "image/png",
          "x-file-name": encodeURIComponent("example.png"),
        },
        method: "POST",
      });

    const firstResponse = await upload();
    expect(firstResponse.status).toBe(201);
    const first = (await firstResponse.json()) as {
      media: { height: number; id: string; url: string; width: number };
      reused: boolean;
    };
    expect(first.reused).toBe(false);
    expect(first.media).toMatchObject({ height: 1, width: 1 });
    expect(first.media.url).toBe(`/api/media/${first.media.id}`);

    const reusedResponse = await upload();
    expect(reusedResponse.status).toBe(200);
    await expect(reusedResponse.json()).resolves.toMatchObject({
      media: { id: first.media.id },
      reused: true,
    });

    const mediaResponse = await exports.default.fetch(
      `https://studio.test${first.media.url}`
    );
    expect(mediaResponse.status).toBe(200);
    expect(mediaResponse.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await mediaResponse.arrayBuffer())).toEqual(image);

    const responsiveResponse = await exports.default.fetch(
      `https://studio.test${first.media.url}?width=320`,
      { headers: { accept: "image/avif,image/webp" } }
    );
    expect(responsiveResponse.status).toBe(200);
    expect(responsiveResponse.headers.get("content-type")).toBe("image/avif");
  });

  it("creates and lists a canonical draft article", async () => {
    const createResponse = await exports.default.fetch(
      "https://studio.test/api/articles",
      {
        body: JSON.stringify({
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
          language: "lt",
          slug: "patikros-straipsnis",
          summary: "Worker runtime test",
          title: "Patikros straipsnis",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }
    );

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string };

    const listResponse = await exports.default.fetch(
      "https://studio.test/api/articles"
    );

    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({
      articles: [
        {
          language: "lt",
          slug: "patikros-straipsnis",
          status: "draft",
          title: "Patikros straipsnis",
        },
      ],
    });

    const blockedPublishResponse = await exports.default.fetch(
      `https://studio.test/api/articles/${created.id}`,
      {
        body: JSON.stringify({
          body: {
            content: [{ type: "paragraph" }],
            type: "doc",
          },
          language: "lt",
          slug: "patikros-straipsnis",
          status: "published",
          summary: "Truncated...",
          title: "Patikros straipsnis",
          translationKind: "original",
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      }
    );
    expect(blockedPublishResponse.status).toBe(422);
    await expect(blockedPublishResponse.json()).resolves.toMatchObject({
      error: "Article quality checks failed",
    });

    const publishResponse = await exports.default.fetch(
      `https://studio.test/api/articles/${created.id}`,
      {
        body: JSON.stringify({
          body: {
            content: [
              {
                content: [{ text: "Turinys", type: "text" }],
                type: "paragraph",
              },
            ],
            type: "doc",
          },
          language: "lt",
          slug: "patikros-straipsnis",
          status: "published",
          summary: "Complete worker runtime test.",
          title: "Patikros straipsnis",
          translationKind: "original",
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      }
    );
    expect(publishResponse.status).toBe(200);
    const published = (await publishResponse.json()) as {
      publishedAt: number | null;
      status: string;
    };
    expect(published.status).toBe("published");
    expect(published.publishedAt).toEqual(expect.any(Number));

    const revisionsResponse = await exports.default.fetch(
      `https://studio.test/api/articles/${created.id}/revisions`
    );
    expect(revisionsResponse.status).toBe(200);
    const revisionData = (await revisionsResponse.json()) as {
      revisions: Array<{ editor_id: string; version: number }>;
    };
    expect(revisionData.revisions[0]).toMatchObject({
      editor_id: "clerk-test-editor",
      version: 2,
    });

    const baselineResponse = await exports.default.fetch(
      `https://studio.test/api/articles/${created.id}/baseline`
    );
    expect(baselineResponse.status).toBe(200);
    await expect(baselineResponse.json()).resolves.toMatchObject({
      baseline: { converter_version: "legacy-html-v1" },
      changes: [
        { change_kind: "added", field_path: "summary" },
        { change_kind: "changed", field_path: "title" },
      ],
    });

    const homepageResponse = await exports.default.fetch(
      "https://studio.test/api/homepage",
      {
        body: JSON.stringify({
          leadId: created.id,
          secondaryIds: [created.id],
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      }
    );
    expect(homepageResponse.status).toBe(200);
    await expect(homepageResponse.json()).resolves.toEqual({
      leadId: created.id,
      secondaryIds: [created.id],
    });

    const homepageReadResponse = await exports.default.fetch(
      "https://studio.test/api/homepage"
    );
    expect(homepageReadResponse.status).toBe(200);
    await expect(homepageReadResponse.json()).resolves.toMatchObject({
      placements: [
        { articleId: created.id, position: 0, slot: "lead" },
        { articleId: created.id, position: 0, slot: "secondary" },
      ],
    });

    const restoreResponse = await exports.default.fetch(
      `https://studio.test/api/articles/${created.id}/revisions/1/restore`,
      { method: "POST" }
    );
    expect(restoreResponse.status).toBe(200);
    await expect(restoreResponse.json()).resolves.toMatchObject({
      restoredFrom: 1,
      version: 3,
    });
  });

  it("treats recovered media linking as normalization", async () => {
    const mediaId = "media_normalized_source_test";
    const sourceUrl = "https://example.test/recovered-source.jpg";
    const timestamp = Date.now();
    await env.DB.prepare(
      `INSERT INTO media_assets (
        id, alt_text, alt_text_provenance, byte_size, caption,
        caption_provenance, created_at, credit, file_name, mime_type,
        provenance, r2_key, updated_at
      ) VALUES (?, '', 'missing', 1, '', 'missing', ?, '', 'source.jpg',
        'image/jpeg', 'recovered', 'test/source.jpg', ?)`
    )
      .bind(mediaId, timestamp, timestamp)
      .run();
    await env.DB.prepare(
      "INSERT INTO media_aliases (alias, created_at, media_id) VALUES (?, ?, ?)"
    )
      .bind(sourceUrl, timestamp, mediaId)
      .run();

    const body = {
      content: [
        {
          attrs: {
            alt: "Source description",
            altProvenance: "source",
            src: sourceUrl,
          },
          type: "figure",
        },
      ],
      type: "doc",
    };
    const createResponse = await exports.default.fetch(
      "https://studio.test/api/articles",
      {
        body: JSON.stringify({
          baseline: {
            body,
            converterVersion: "legacy-html-v1",
            summary: "Complete source summary.",
            title: "Recovered media source",
          },
          body,
          language: "lt",
          slug: "recovered-media-source",
          summary: "Complete source summary.",
          title: "Recovered media source",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }
    );
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string };

    const baselineResponse = await exports.default.fetch(
      `https://studio.test/api/articles/${created.id}/baseline`
    );
    expect(baselineResponse.status).toBe(200);
    await expect(baselineResponse.json()).resolves.toMatchObject({
      changes: [],
    });

    const articleResponse = await exports.default.fetch(
      `https://studio.test/api/articles/${created.id}`
    );
    const article = (await articleResponse.json()) as {
      article: { bodyJson: string };
    };
    expect(JSON.parse(article.article.bodyJson)).toMatchObject({
      content: [
        {
          attrs: {
            mediaId,
            src: `/api/media/${mediaId}`,
          },
        },
      ],
    });
  });
});
