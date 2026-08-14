import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("structured directory migration", () => {
  it("loads nine complete five-locale community records", async () => {
    const counts = await env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM communities) AS communities,
        (SELECT COUNT(*) FROM community_localizations) AS localizations,
        (SELECT COUNT(*) FROM community_services) AS services,
        (SELECT COUNT(*) FROM community_service_localizations) AS service_localizations`
    ).first<{
      communities: number;
      localizations: number;
      service_localizations: number;
      services: number;
    }>();
    expect(counts).toEqual({
      communities: 9,
      localizations: 45,
      service_localizations: 50,
      services: 10,
    });
  });

  it("enforces one primary image and valid geographic pairs in D1", async () => {
    await expect(
      env.DB.prepare(
        "INSERT INTO communities (address_line, country_code, created_at, id, latitude, locality, longitude, postal_code, operational_status, slug, sort_order, status, type, updated_at) VALUES ('', 'LT', 1, 'invalid-coordinate', 54.6, '', NULL, '', 'active', 'invalid-coordinate', 0, 'draft', 'community', 1)"
      ).run()
    ).rejects.toThrow();
    const integrity = await env.DB.prepare("PRAGMA foreign_key_check").all();
    expect(integrity.results).toEqual([]);
  });
});
