import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("studio Worker", () => {
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

  it("provides the development editor identity", async () => {
    const response = await exports.default.fetch(
      "https://studio.test/api/session"
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      authentication: "development",
      editor: {
        id: "local-editor",
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

    const revisionsResponse = await exports.default.fetch(
      `https://studio.test/api/articles/${created.id}/revisions`
    );
    expect(revisionsResponse.status).toBe(200);
    await expect(revisionsResponse.json()).resolves.toMatchObject({
      revisions: [{ editor_id: "local-editor", version: 1 }],
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

    const restoreResponse = await exports.default.fetch(
      `https://studio.test/api/articles/${created.id}/revisions/1/restore`,
      { method: "POST" }
    );
    expect(restoreResponse.status).toBe(200);
    await expect(restoreResponse.json()).resolves.toMatchObject({
      restoredFrom: 1,
      version: 2,
    });
  });
});
