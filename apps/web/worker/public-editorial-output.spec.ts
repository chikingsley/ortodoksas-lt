import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("Public editorial output", () => {
  it("renders Belarusian publication dates in the Worker runtime", async () => {
    const body = JSON.stringify({
      content: [
        {
          content: [{ text: "Тэкст публікацыі.", type: "text" }],
          type: "paragraph",
        },
      ],
      type: "doc",
    });

    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO publication_groups (id, kind, page_template, created_at, updated_at) VALUES ('belarusian-date-group', 'article', 'standard', 1, 1)"
      ),
      env.DB.prepare(
        "INSERT INTO articles (id, translation_group_id, language, slug, title, body_json, status, published_at, created_at, updated_at, kind) VALUES ('belarusian-date-be', 'belarusian-date-group', 'be', 'belarusian-date', 'Беларуская публікацыя', ?, 'published', ?, 1, 1, 'article')"
      ).bind(body, Date.UTC(2026, 9, 18)),
    ]);

    const response = await exports.default.fetch(
      "https://publication.test/be/belarusian-date"
    );

    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("18 кастрычніка 2026 г.");
    expect(html).not.toContain("October 18");
  });

  it("resolves localized links in directories larger than one D1 parameter batch", async () => {
    const ids = Array.from({ length: 105 }, (_, index) => index);

    const body = JSON.stringify({
      content: ids.map((index) => ({
        content: [
          {
            marks: [{ attrs: { href: `/p/source-${index}` }, type: "link" }],
            text: `Entry ${index}`,
            type: "text",
          },
        ],
        type: "paragraph",
      })),
      type: "doc",
    });

    await env.DB.batch(
      ids.flatMap((index) => [
        env.DB.prepare(
          "INSERT INTO publication_groups (id,kind,page_template,created_at,updated_at) VALUES (?, 'page', 'standard', 1, 1)"
        ).bind(`link-group-${index}`),
        env.DB.prepare(
          "INSERT INTO articles (id,translation_group_id,language,slug,title,body_json,status,created_at,updated_at,kind) VALUES (?, ?, 'lt', ?, 'Source entry', ?, 'published', 1, 1, 'page')"
        ).bind(
          `link-source-${index}`,
          `link-group-${index}`,
          `p/source-${index}`,
          body
        ),
      ])
    );
    await env.DB.batch(
      [0, 104].map((index) =>
        env.DB.prepare(
          "INSERT INTO articles (id,translation_group_id,language,slug,title,body_json,status,created_at,updated_at,kind) VALUES (?, ?, 'en', ?, 'Translated directory', ?, 'published', 1, 1, 'page')"
        ).bind(
          `link-target-${index}`,
          `link-group-${index}`,
          `p/translated-${index}`,
          body
        )
      )
    );

    const response = await exports.default.fetch(
      "https://publication.test/en/p/translated-0"
    );

    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('href="/en/p/translated-0"');
    expect(html).toContain('href="/en/p/translated-104"');
    expect(html).toContain("Entry 104");
  });

  it("renders public article text while retaining editorial translation records", async () => {
    const groupId = "public-output-group";

    const body = JSON.stringify({
      content: [
        {
          content: [{ text: "Preserved article text.", type: "text" }],
          type: "paragraph",
        },
      ],
      type: "doc",
    });

    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO publication_groups (id, kind, page_template, created_at, updated_at) VALUES (?, 'article', 'standard', 1, 1)"
      ).bind(groupId),
      env.DB.prepare(
        "INSERT INTO articles (id, translation_group_id, language, slug, title, body_json, status, translation_kind, translation_review_status, published_at, created_at, updated_at, kind) VALUES ('public-output-lt', ?, 'lt', 'public-output', 'Original article', ?, 'published', 'original', 'not_required', NULL, 1, 1, 'article')"
      ).bind(groupId, body),
      env.DB.prepare(
        "INSERT INTO articles (id, translation_group_id, language, slug, title, body_json, status, translation_kind, translation_review_status, published_at, created_at, updated_at, kind) VALUES ('public-output-en', ?, 'en', 'public-output', 'English article', ?, 'published', 'machine', 'pending', NULL, 1, 1, 'article')"
      ).bind(groupId, body),
    ]);

    const response = await exports.default.fetch(
      "https://publication.test/en/public-output"
    );

    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Preserved article text.");
    expect(html).not.toContain("data-translation-disclosure");
    expect(html).not.toContain("Automatically translated");
    expect(html).not.toContain("Date unavailable");
    expect(html).not.toContain("datePublished");
    expect(html).not.toContain("<time");

    const search = await exports.default.fetch(
      "https://publication.test/en/paieska"
    );

    const searchHtml = await search.text();

    expect(search.status).toBe(200);
    expect(searchHtml).toContain("English article");
    expect(searchHtml).not.toContain("Date unavailable");
    expect(searchHtml).not.toContain("<time");

    const stored = await env.DB.prepare(
      "SELECT translation_kind, translation_review_status, published_at FROM articles WHERE id = 'public-output-en'"
    ).first();

    expect(stored).toStrictEqual({
      published_at: null,
      translation_kind: "machine",
      translation_review_status: "pending",
    });
  });
});
