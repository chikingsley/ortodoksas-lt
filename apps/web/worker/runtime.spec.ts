import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const disabledRussianLocale = /<button[^>]+disabled[^>]+lang="ru"/u;

describe("Astro Worker runtime", () => {
  it("serves the health route from the emitted Worker", async () => {
    const response = await SELF.fetch("https://ortodoksas.test/api/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      environment: "production",
      status: "ok",
    });
  });

  it("renders the publication homepage against migrated D1", async () => {
    const response = await SELF.fetch("https://ortodoksas.test/");

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("Ortodoksas");
  });

  it("renders article SEO fallbacks, overrides, and a typed public byline", async () => {
    const groupId = "91111111-1111-4111-8111-111111111111";
    const articleId = "a1111111-1111-4111-8111-111111111111";
    const body = JSON.stringify({
      content: [
        {
          content: [{ text: "Visible article body", type: "text" }],
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
        `INSERT INTO articles (
          id, translation_group_id, language, slug, title, summary, body_json,
          byline, byline_type, status, translation_kind, published_at,
          created_at, updated_at, kind, translation_review_status
        ) VALUES (?, ?, 'lt', '2026/article-metadata', 'Visible title',
          'Visible summary', ?, 'Vitalijus Mockus', 'person', 'published',
          'original', 10, 1, 1, 'article', 'not_required')`
      ).bind(articleId, groupId, body),
    ]);

    const fallbackResponse = await SELF.fetch(
      "https://ortodoksas.test/2026/article-metadata"
    );
    expect(fallbackResponse.status).toBe(200);
    const fallbackHtml = await fallbackResponse.text();
    expect(fallbackHtml).toContain(
      "<title>Visible title · ortodoksas.lt</title>"
    );
    expect(fallbackHtml).toContain(
      '<meta name="description" content="Visible summary">'
    );
    expect(fallbackHtml).toContain(
      '"author":{"@type":"Person","name":"Vitalijus Mockus"}'
    );

    await env.DB.prepare(
      `UPDATE articles
       SET seo_title = ?, seo_description = ?, byline = ?, byline_type = ?,
           byline_url = ?, updated_at = 2
       WHERE id = ?`
    )
      .bind(
        "Custom search title",
        "Custom search description",
        "ortodoksas.lt Editorial Team",
        "organization",
        "https://ortodoksas.lt/p/kontaktai",
        articleId
      )
      .run();

    const customResponse = await SELF.fetch(
      "https://ortodoksas.test/2026/article-metadata"
    );
    expect(customResponse.status).toBe(200);
    const customHtml = await customResponse.text();
    expect(customHtml).toContain(
      "<title>Custom search title · ortodoksas.lt</title>"
    );
    expect(customHtml).toContain(
      '<meta name="description" content="Custom search description">'
    );
    expect(customHtml).toContain(">Visible title</h1>");
    expect(customHtml).toContain(
      '"author":{"@type":"Organization","name":"ortodoksas.lt Editorial Team","url":"https://ortodoksas.lt/p/kontaktai"}'
    );
    expect(customHtml).toContain(
      '<a class="font-semibold text-foreground hover:text-primary" href="https://ortodoksas.lt/p/kontaktai">ortodoksas.lt Editorial Team</a>'
    );
  });

  it("returns the publication 404 for an unknown catch-all path", async () => {
    const response = await SELF.fetch(
      "https://ortodoksas.test/unknown-publication-path"
    );

    expect(response.status).toBe(404);
  });

  it("serves complete media as 200 and requested byte ranges as 206", async () => {
    const mediaId = `media_${"b".repeat(64)}`;
    const r2Key = "media/originals/range-semantics.jpg";
    const bytes = new TextEncoder().encode("0123456789");
    await env.MEDIA.put(r2Key, bytes, {
      httpMetadata: { contentType: "image/jpeg" },
    });
    await env.DB.prepare(
      `INSERT INTO media_assets (
        id, r2_key, file_name, mime_type, byte_size, created_at, updated_at
      ) VALUES (?, ?, 'range-semantics.jpg', 'image/jpeg', ?, 1, 1)`
    )
      .bind(mediaId, r2Key, bytes.byteLength)
      .run();

    const url = `https://ortodoksas.test/api/media/${mediaId}`;
    const complete = await SELF.fetch(url);
    expect(complete.status).toBe(200);
    expect(complete.headers.get("content-length")).toBe("10");
    expect(complete.headers.get("content-range")).toBeNull();
    expect(new TextDecoder().decode(await complete.arrayBuffer())).toBe(
      "0123456789"
    );

    const partial = await SELF.fetch(url, {
      headers: { Range: "bytes=2-5" },
    });
    expect(partial.status).toBe(206);
    expect(partial.headers.get("content-length")).toBe("4");
    expect(partial.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(new TextDecoder().decode(await partial.arrayBuffer())).toBe("2345");

    const head = await SELF.fetch(url, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe("10");
    expect(head.headers.get("content-range")).toBeNull();
  });

  it("keeps the publication group while switching a directory locale", async () => {
    const groupId = "11111111-1111-4111-8111-111111111111";
    const body = JSON.stringify({
      content: [{ type: "paragraph" }],
      type: "doc",
    });
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO publication_groups (id, kind, page_template, created_at, updated_at) VALUES (?, 'page', 'community_directory', 1, 1)"
      ).bind(groupId),
      env.DB.prepare(
        "INSERT INTO articles (id, translation_group_id, language, slug, title, body_json, status, translation_kind, published_at, created_at, updated_at, kind, translation_review_status) VALUES (?, ?, 'lt', 'p/bendruomenes-test', 'Bendruomenės', ?, 'published', 'original', 1, 1, 1, 'page', 'not_required')"
      ).bind("21111111-1111-4111-8111-111111111111", groupId, body),
      env.DB.prepare(
        "INSERT INTO articles (id, translation_group_id, language, slug, title, body_json, status, translation_kind, published_at, created_at, updated_at, kind, translation_review_status) VALUES (?, ?, 'en', 'p/communities-test', 'Communities', ?, 'published', 'human', 1, 1, 1, 'page', 'approved')"
      ).bind("31111111-1111-4111-8111-111111111111", groupId, body),
    ]);

    const lithuanian = await SELF.fetch(
      "https://ortodoksas.test/p/bendruomenes-test"
    );
    expect(lithuanian.status).toBe(200);
    const lithuanianHtml = await lithuanian.text();
    expect(lithuanianHtml).toContain('href="/en/p/communities-test"');
    expect(lithuanianHtml).toMatch(disabledRussianLocale);
    expect(lithuanianHtml).not.toContain('href="/ru"');

    const english = await SELF.fetch(
      "https://ortodoksas.test/en/p/communities-test"
    );
    expect(english.status).toBe(200);
    await expect(english.text()).resolves.toContain(
      "Vilnius Holy Trinity Community"
    );
  });

  it("searches published articles through the localized FTS5 index", async () => {
    const articleGroupId = "41111111-1111-4111-8111-111111111111";
    const pageGroupId = "51111111-1111-4111-8111-111111111111";
    const body = (text: string) =>
      JSON.stringify({
        content: [{ content: [{ text, type: "text" }], type: "paragraph" }],
        type: "doc",
      });
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO publication_groups (id, kind, page_template, created_at, updated_at) VALUES (?, 'article', 'standard', 1, 1)"
      ).bind(articleGroupId),
      env.DB.prepare(
        "INSERT INTO publication_groups (id, kind, page_template, created_at, updated_at) VALUES (?, 'page', 'standard', 1, 1)"
      ).bind(pageGroupId),
      env.DB.prepare(
        "INSERT INTO articles (id, translation_group_id, language, slug, title, body_json, status, translation_kind, published_at, created_at, updated_at, kind, translation_review_status) VALUES (?, ?, 'lt', '2026/fts-paieska', 'Paieškos straipsnis', ?, 'published', 'original', 10, 1, 1, 'article', 'not_required')"
      ).bind(
        "61111111-1111-4111-8111-111111111111",
        articleGroupId,
        body("Šviesakalnis yra šiame straipsnyje.")
      ),
      env.DB.prepare(
        "INSERT INTO articles (id, translation_group_id, language, slug, title, body_json, status, translation_kind, published_at, created_at, updated_at, kind, translation_review_status) VALUES (?, ?, 'en', '2026/fts-search', 'English search article', ?, 'published', 'human', 10, 1, 1, 'article', 'approved')"
      ).bind(
        "71111111-1111-4111-8111-111111111111",
        articleGroupId,
        body("Sviesakalnis appears in English.")
      ),
      env.DB.prepare(
        "INSERT INTO articles (id, translation_group_id, language, slug, title, body_json, status, translation_kind, published_at, created_at, updated_at, kind, translation_review_status) VALUES (?, ?, 'lt', 'p/fts-page', 'Paieškos puslapis', ?, 'published', 'original', 10, 1, 1, 'page', 'not_required')"
      ).bind(
        "81111111-1111-4111-8111-111111111111",
        pageGroupId,
        body("Šviesakalnis yra instituciniame puslapyje.")
      ),
    ]);

    const lithuanian = await SELF.fetch(
      "https://ortodoksas.test/paieska?q=sviesak"
    );
    expect(lithuanian.status).toBe(200);
    const lithuanianHtml = await lithuanian.text();
    expect(lithuanianHtml).toContain("Paieškos straipsnis");
    expect(lithuanianHtml).toContain('href="/2026/fts-paieska"');
    expect(lithuanianHtml).not.toContain('href="/2026/fts-paieska.html"');
    expect(lithuanianHtml).not.toContain("Paieškos puslapis");
    expect(lithuanianHtml).not.toContain("English search article");

    const publication = await SELF.fetch(
      "https://ortodoksas.test/2026/fts-paieska"
    );
    expect(publication.status).toBe(200);
    await expect(publication.text()).resolves.toContain(
      '<link rel="canonical" href="https://ortodoksas.lt/2026/fts-paieska"'
    );

    const rss = await SELF.fetch("https://ortodoksas.test/rss.xml");
    expect(await rss.text()).toContain(
      "https://ortodoksas.lt/2026/fts-paieska"
    );
    const sitemap = await SELF.fetch("https://ortodoksas.test/sitemap.xml");
    expect(await sitemap.text()).toContain(
      "https://ortodoksas.lt/2026/fts-paieska"
    );

    await env.DB.prepare(
      "UPDATE articles SET body_json = ?, updated_at = 2 WHERE id = ?"
    )
      .bind(
        body("Naujasžodis pakeitė ankstesnį paieškos terminą."),
        "61111111-1111-4111-8111-111111111111"
      )
      .run();

    const updated = await SELF.fetch(
      "https://ortodoksas.test/paieska?q=naujaszod"
    );
    expect(updated.status).toBe(200);
    await expect(updated.text()).resolves.toContain("Paieškos straipsnis");

    const parity = await env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM articles) AS articleRows,
        (SELECT COUNT(*) FROM articles_fts) AS indexedRows,
        (SELECT COUNT(*) FROM articles
          LEFT JOIN articles_fts ON articles_fts.rowid = articles.rowid
          WHERE articles_fts.rowid IS NULL) AS articlesMissingFromFts,
        (SELECT COUNT(*) FROM articles_fts
          LEFT JOIN articles ON articles.rowid = articles_fts.rowid
          WHERE articles.rowid IS NULL) AS ftsRowsMissingFromArticles`
    ).first<{
      articleRows: number;
      articlesMissingFromFts: number;
      ftsRowsMissingFromArticles: number;
      indexedRows: number;
    }>();
    expect(parity?.articleRows).toBe(parity?.indexedRows);
    expect(parity?.articlesMissingFromFts).toBe(0);
    expect(parity?.ftsRowsMissingFromArticles).toBe(0);
  });
});
