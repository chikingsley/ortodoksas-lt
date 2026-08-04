import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Worker API", () => {
  it("serves health from the Workers runtime", async () => {
    const response = await SELF.fetch("https://example.test/api/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      environment: "development",
      status: "ok",
    });
  });
});
