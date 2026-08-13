import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

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

  it("returns the publication 404 for an unknown catch-all path", async () => {
    const response = await SELF.fetch(
      "https://ortodoksas.test/unknown-publication-path"
    );

    expect(response.status).toBe(404);
  });
});
