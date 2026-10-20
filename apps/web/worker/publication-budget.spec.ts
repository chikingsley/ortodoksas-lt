import { env, exports } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";

const totals = async () =>
  await env.DB.prepare(
    "SELECT SUM(total) AS total FROM publication_counts"
  ).first<number>("total");

describe("publication database read budgets", () => {
  beforeAll(async () => {
    await env.DB.batch([
      env.DB.prepare(`
    WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM numbers WHERE n < 3000)
    INSERT INTO publication_groups(id,kind,created_at,updated_at)
    SELECT 'budget-group-' || n, 'article', 1, 1 FROM numbers`),
      env.DB.prepare(`
    WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM numbers WHERE n < 3000)
    INSERT INTO articles(id,translation_group_id,language,slug,title,summary,body_json,status,section,published_at,created_at,updated_at)
    SELECT 'budget-article-' || n, 'budget-group-' || n, 'lt', '2026/budget-' || n,
      'Budget article ' || n, 'Publication read budget', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Read budget fixture"}]}]}',
      'published', 'Budget section ' || (n % 300), 1704067200000 + n * 1000, 1, 1 FROM numbers
  `),
    ]);
  });

  it("uses indexed point lookups and bounded recent lists as the archive grows", async () => {
    const missing = await env.DB.prepare(
      "SELECT id FROM articles WHERE status = 'published' AND slug = ?"
    )
      .bind("missing-budget-slug")
      .all();

    const recent = await env.DB.prepare(
      "SELECT id FROM articles WHERE status = 'published' AND language = 'lt' ORDER BY published_at DESC LIMIT 20"
    ).all();

    const counterpart = await env.DB.prepare(
      "SELECT language,slug FROM articles WHERE status = 'published' AND translation_group_id = ?"
    )
      .bind("budget-group-1")
      .all();

    expect(missing.results).toHaveLength(0);
    expect(missing.meta.rows_read).toBeLessThanOrEqual(2);
    expect(recent.results).toHaveLength(20);
    expect(recent.meta.rows_read).toBeLessThanOrEqual(50);
    expect(counterpart.results).toHaveLength(1);
    expect(counterpart.meta.rows_read).toBeLessThanOrEqual(5);
  });

  it("serves repeat visits from the revision-aware cache and sees edits immediately", async () => {
    const url = "https://read-budget.test/2026/budget-1";
    const first = await exports.default.fetch(url);
    expect(first.status).toBe(200);
    expect(first.headers.get("X-Publication-Cache")).toBe("MISS");
    await expect(first.text()).resolves.toContain("Budget article 1");

    const repeated = await exports.default.fetch(url);
    expect(repeated.headers.get("X-Publication-Cache")).toBe("HIT");
    await repeated.arrayBuffer();

    const revisionRead = await env.DB.prepare(
      "SELECT revision FROM publication_state WHERE id = 1"
    ).all();

    expect(revisionRead.meta.rows_read).toBe(1);

    await env.DB.prepare(
      "UPDATE articles SET title = ?, updated_at = 2 WHERE id = ?"
    )
      .bind("Changed publication title", "budget-article-1")
      .run();
    const changed = await exports.default.fetch(url);
    expect(changed.headers.get("X-Publication-Cache")).toBe("MISS");
    await expect(changed.text()).resolves.toContain(
      "Changed publication title"
    );

    await env.DB.prepare(
      "UPDATE articles SET status = 'draft' WHERE id = 'budget-article-1'"
    ).run();
    const withdrawn = await exports.default.fetch(url);
    expect(withdrawn.status).toBe(404);
    await withdrawn.arrayBuffer();
    await env.DB.prepare(
      "UPDATE articles SET status = 'published' WHERE id = 'budget-article-1'"
    ).run();
    const republished = await exports.default.fetch(url);
    expect(republished.status).toBe(200);
    await expect(republished.text()).resolves.toContain(
      "Changed publication title"
    );
  });

  it("bypasses the public cache for authenticated requests and API routes", async () => {
    const authorized = await exports.default.fetch(
      "https://private-budget.test/2026/budget-2",
      {
        headers: { Authorization: "Bearer test-only" },
      }
    );

    expect(authorized.headers.get("X-Publication-Cache")).toBeNull();
    await authorized.arrayBuffer();

    const health = await exports.default.fetch(
      "https://private-budget.test/api/health"
    );

    expect(health.status).toBe(200);
    expect(health.headers.get("X-Publication-Cache")).toBeNull();
  });

  it("renders a cold page inside a Durable Object before edge delivery", async () => {
    const url = "https://render-budget.test/2026/budget-8";
    const renderer = env.PUBLICATION_RENDERER.getByName("cold-render-test");
    const rendered = await renderer.fetch(url);
    expect(rendered.status).toBe(200);
    const html = await rendered.text();
    expect(html).toContain("Budget article 8");

    const delivered = await exports.default.fetch(url);
    expect(delivered.headers.get("X-Publication-Cache")).toBe("MISS");
    await expect(delivered.text()).resolves.toBe(html);

    const revision = await env.DB.prepare(
      "SELECT revision FROM publication_state WHERE id = 1"
    ).first<number>("revision");

    const key = new URL(url);

    key.searchParams.set("__publication_cache", env.PUBLICATION_VERSION.id);
    key.searchParams.set("__publication_revision", String(revision));
    const cache = await caches.open("public-publication-v1");
    const stored = await cache.match(key.toString());
    expect(stored?.headers.get("cache-control")).toBe("public, max-age=86400");
    await expect(stored?.text()).resolves.toBe(html);

    key.searchParams.set("__publication_cache", "previous-deployment");
    await expect(cache.match(key.toString())).resolves.toBeUndefined();
  });

  it("normalizes tracking parameters and serves HEAD requests from the same cache", async () => {
    const first = await exports.default.fetch(
      "https://tracking-budget.test/2026/budget-3?utm_source=first"
    );

    expect(first.status).toBe(200);
    await first.arrayBuffer();

    const second = await exports.default.fetch(
      "https://tracking-budget.test/2026/budget-3?utm_source=second"
    );

    expect(second.headers.get("X-Publication-Cache")).toBe("HIT");
    await second.arrayBuffer();

    const head = await exports.default.fetch(
      "https://tracking-budget.test/2026/budget-3",
      {
        method: "HEAD",
      }
    );

    expect(head.headers.get("X-Publication-Cache")).toBe("HIT");
    await expect(head.text()).resolves.toBe("");
  });

  it("maintains compact archive counts across publication, reclassification and deletion", async () => {
    const before = await totals();
    expect(before).toBeGreaterThanOrEqual(3000);

    const summaries = await env.DB.prepare(
      "SELECT * FROM publication_counts WHERE language = 'lt' AND section LIKE 'Budget section %'"
    ).all();

    expect(summaries.results).toHaveLength(300);
    expect(summaries.meta.rows_read).toBeLessThanOrEqual(400);

    const unpublished = await env.DB.prepare(
      "UPDATE articles SET status = 'draft' WHERE id = 'budget-article-4'"
    ).run();

    expect(unpublished.meta.rows_read).toBeLessThanOrEqual(50);
    await expect(totals()).resolves.toBe((before ?? 0) - 1);
    await env.DB.prepare(
      "UPDATE articles SET status = 'published', section = 'Changed section' WHERE id = 'budget-article-4'"
    ).run();
    await expect(totals()).resolves.toBe(before);

    const reclassified = await env.DB.prepare(
      "UPDATE publication_groups SET kind = 'page' WHERE id = 'budget-group-4'"
    ).run();

    expect(reclassified.meta.rows_read).toBeLessThanOrEqual(50);
    await expect(totals()).resolves.toBe((before ?? 0) - 1);

    const deleted = await env.DB.prepare(
      "DELETE FROM articles WHERE id = 'budget-article-5'"
    ).run();

    expect(deleted.meta.rows_read).toBeLessThanOrEqual(50);
    await expect(totals()).resolves.toBe((before ?? 0) - 2);

    const lastEdition = await env.DB.prepare(
      "DELETE FROM articles WHERE id = 'budget-article-6'"
    ).run();

    expect(lastEdition.meta.rows_read).toBeLessThanOrEqual(50);

    const groupDeleted = await env.DB.prepare(
      "DELETE FROM publication_groups WHERE id = 'budget-group-6'"
    ).run();

    expect(groupDeleted.meta.rows_read).toBeLessThanOrEqual(50);
    await expect(totals()).resolves.toBe((before ?? 0) - 3);
  });

  it("reclassifies only the affected multilingual group", async () => {
    await env.DB.prepare(`INSERT INTO articles(id,translation_group_id,language,slug,title,body_json,status,published_at,created_at,updated_at,section)
      SELECT 'budget-russian',translation_group_id,'ru',slug,'Russian fixture',body_json,status,published_at,1,1,section FROM articles WHERE id='budget-article-1'`).run();
    const before = await totals();

    const hidden = await env.DB.prepare(
      "UPDATE publication_groups SET kind='page' WHERE id='budget-group-1'"
    ).run();

    expect(hidden.meta.rows_read).toBeLessThanOrEqual(50);
    await expect(totals()).resolves.toBe((before ?? 0) - 2);

    const restored = await env.DB.prepare(
      "UPDATE publication_groups SET kind='article' WHERE id='budget-group-1'"
    ).run();

    expect(restored.meta.rows_read).toBeLessThanOrEqual(50);
    await expect(totals()).resolves.toBe(before);
  });
});
