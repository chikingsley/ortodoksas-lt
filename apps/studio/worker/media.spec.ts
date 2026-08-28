import { env } from "cloudflare:workers";
import { mediaAssets } from "@ortodoksas-lt/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { getDatabase } from "../src/server/db.server";
import { serveMedia } from "../src/server/media/media-operations.server";
import { IMAGE_BYTES, uploadHero } from "./fixtures";

const ORIGINAL_MEDIA_KEY_PATTERN = /^media\/originals\/[0-9a-f]{64}\.png$/u;

describe("Studio Worker services", () => {
  it("stores, deduplicates, and serves an uploaded image through R2", async () => {
    const first = await uploadHero("service-image.png");
    const second = await uploadHero("service-image-copy.png");
    expect(second.media.id).toBe(first.media.id);
    expect(second.reused).toBe(true);

    const database = getDatabase(env.DB);
    const [stored] = await database
      .select({ r2Key: mediaAssets.r2Key })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, first.media.id))
      .limit(1);
    expect(stored?.r2Key).toMatch(ORIGINAL_MEDIA_KEY_PATTERN);
    const response = await serveMedia({
      database,
      id: first.media.id,
      images: env.IMAGES,
      media: env.MEDIA,
      request: new Request(`https://studio.test${first.media.url}`),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(IMAGE_BYTES);
  });
});
