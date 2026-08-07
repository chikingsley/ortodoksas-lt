import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Worker API", () => {
  it("redirects a legacy localized slug to its readable canonical URL", async () => {
    const response = await SELF.fetch(
      "https://example.test/uk/2022/05/blog-post_15.html",
      { redirect: "manual" }
    );

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://example.test/uk/2022/05/istoriya-konstantynopolskoho-patriarkhatu-u-lytvi.html"
    );
  });

  it("streams recovered R2 media with byte ranges", async () => {
    const fileName = `${"a".repeat(64)}.mp4`;
    await env.MEDIA.put(`archive/${fileName}`, "abcdef", {
      httpMetadata: { contentType: "video/mp4" },
    });

    const response = await SELF.fetch(
      `https://example.test/media/files/${fileName}`,
      {
        headers: { Range: "bytes=1-3" },
      }
    );

    expect(response.status).toBe(206);
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-range")).toBe("bytes 1-3/6");
    expect(response.headers.get("content-type")).toBe("video/mp4");
    const body = new TextDecoder().decode(await response.arrayBuffer());
    expect(body).toBe("bcd");
  });

  it("serves health from the Workers runtime", async () => {
    const response = await SELF.fetch("https://example.test/api/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      environment: "production",
      status: "ok",
    });
  });
});
