import { env } from "cloudflare:workers";
import { expect } from "vitest";

import { getDatabase } from "../src/server/db.server";
import { uploadMedia } from "../src/server/media/media-operations.server";

export const IMAGE_BYTES = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  ),
  (character) => character.charCodeAt(0)
);

export const EDITOR_ID = "clerk-test-editor";

export const uploadHero = async (fileName: string) => {
  const response = await uploadMedia({
    database: getDatabase(env.DB),
    images: env.IMAGES,
    media: env.MEDIA,
    request: new Request("https://studio.test/api/media", {
      body: IMAGE_BYTES,
      headers: {
        "content-type": "image/png",
        "x-file-name": encodeURIComponent(fileName),
      },
      method: "POST",
    }),
  });
  expect([200, 201]).toContain(response.status);
  return (await response.json()) as {
    media: { id: string; url: string };
    reused: boolean;
  };
};
