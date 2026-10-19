import { exports as worker } from "cloudflare:workers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

describe("TanStack Start Worker runtime", () => {
  beforeAll(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (...args) => {
      const request = new Request(...args);
      const url = new URL(request.url);

      return await Promise.reject(
        new Error(`Unexpected outbound request: ${url.origin}${url.pathname}`)
      );
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("renders the signed-out Studio shell", async () => {
    const response = await worker.default.fetch("https://studio.test/sign-in");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("cdn-cache-control")).toBe("no-store");
    await expect(response.text()).resolves.toContain("Editorial Studio");
  });

  it("protects the raw media boundary with authorization", async () => {
    const response = await worker.default.fetch(
      "https://studio.test/api/media/missing"
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toStrictEqual({
      error: "Authentication required",
    });
  });

  it("applies same-origin CSRF policy to raw media mutations", async () => {
    const response = await worker.default.fetch(
      "https://studio.test/api/media",
      {
        body: new Uint8Array([1]),
        headers: {
          "content-type": "image/png",
          origin: "https://foreign.test",
        },
        method: "POST",
      }
    );

    expect(response.status).toBe(403);
  });
});
