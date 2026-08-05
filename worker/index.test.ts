import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { oauthResultPage } from "./index";

describe("Worker API", () => {
  it("serves health from the Workers runtime", async () => {
    const response = await SELF.fetch("https://example.test/api/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      environment: "development",
      status: "ok",
    });
  });

  it("completes Decap's GitHub OAuth popup handshake", async () => {
    const callback = oauthResultPage("error", { message: "Declined" });
    const html = await callback.text();

    expect(callback.status).toBe(200);
    expect(callback.headers.get("Cache-Control")).toBe("no-store");
    expect(html).toContain('postMessage("authorizing:github","*")');
    expect(html).toContain("authorization:github:error:");
    expect(html).toContain("Declined");
  });
});
