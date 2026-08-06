import { mediaAssets } from "@ortodoksas-lt/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { getDatabase } from "../db";
import type { StudioEnvironment } from "../types";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const IMAGE_BINDING_LIMIT = 20 * 1024 * 1024;
const RESPONSIVE_WIDTHS = new Set([320, 640, 960, 1280, 1600]);
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/avif", "avif"],
  ["image/gif", "gif"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

interface MediaRecord {
  alt_text: string;
  alt_text_provenance: string;
  byte_size: number;
  caption: string;
  caption_provenance: string;
  file_name: string;
  height: number | null;
  id: string;
  mime_type: string;
  r2_key: string;
  sha256: string | null;
  width: number | null;
}

const toHex = (value: ArrayBuffer): string =>
  [...new Uint8Array(value)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const decodeFileName = (value: string | undefined): string => {
  if (!value) {
    return "upload";
  }
  try {
    return decodeURIComponent(value).slice(0, 255);
  } catch {
    return "upload";
  }
};

const preferredOutputFormat = (
  acceptHeader: string
): "image/avif" | "image/webp" | null => {
  if (acceptHeader.includes("image/avif")) {
    return "image/avif";
  }
  if (acceptHeader.includes("image/webp")) {
    return "image/webp";
  }
  return null;
};

const mediaResponse = (record: MediaRecord) => ({
  altText: record.alt_text,
  altTextProvenance: record.alt_text_provenance,
  byteSize: record.byte_size,
  caption: record.caption,
  captionProvenance: record.caption_provenance,
  fileName: record.file_name,
  height: record.height,
  id: record.id,
  mimeType: record.mime_type,
  url: `/api/media/${record.id}`,
  width: record.width,
});

export const mediaRoutes = new Hono<StudioEnvironment>();

mediaRoutes.post("/", async (context) => {
  const database = getDatabase(context.env.DB);
  const contentLength = Number.parseInt(
    context.req.header("content-length") ?? "0",
    10
  );
  if (contentLength > MAX_UPLOAD_BYTES) {
    return context.json({ error: "Image exceeds the 5 MB upload limit" }, 413);
  }

  const mimeType = context.req.header("content-type")?.split(";", 1)[0] ?? "";
  const extension = ALLOWED_IMAGE_TYPES.get(mimeType);
  if (!extension) {
    return context.json(
      { error: "Use a JPEG, PNG, WebP, AVIF, or GIF image" },
      415
    );
  }

  const bytes = await context.req.arrayBuffer();
  if (bytes.byteLength === 0) {
    return context.json({ error: "Image data is required" }, 400);
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return context.json({ error: "Image exceeds the 5 MB upload limit" }, 413);
  }

  const imageInfo = await context.env.IMAGES.info(
    new Blob([bytes]).stream()
  ).catch(() => null);
  if (!(imageInfo && "width" in imageInfo)) {
    return context.json({ error: "Image data could not be decoded" }, 422);
  }

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = toHex(digest);
  const [existing] = await database
    .select({
      alt_text: mediaAssets.altText,
      alt_text_provenance: mediaAssets.altTextProvenance,
      byte_size: mediaAssets.byteSize,
      caption: mediaAssets.caption,
      caption_provenance: mediaAssets.captionProvenance,
      file_name: mediaAssets.fileName,
      height: mediaAssets.height,
      id: mediaAssets.id,
      mime_type: mediaAssets.mimeType,
      r2_key: mediaAssets.r2Key,
      sha256: mediaAssets.sha256,
      width: mediaAssets.width,
    })
    .from(mediaAssets)
    .where(eq(mediaAssets.sha256, sha256))
    .limit(1);
  if (existing) {
    return context.json({ media: mediaResponse(existing), reused: true });
  }

  const id = `media_${sha256}`;
  const key = `uploads/${sha256}.${extension}`;
  const fileName = decodeFileName(context.req.header("x-file-name"));
  const timestamp = Date.now();

  await context.env.MEDIA.put(key, bytes, {
    customMetadata: {
      fileName,
      provenance: "uploaded",
      sha256,
    },
    httpMetadata: {
      cacheControl: CACHE_CONTROL,
      contentType: mimeType,
    },
    sha256: digest,
  });

  await database.insert(mediaAssets).values({
    byteSize: bytes.byteLength,
    createdAt: timestamp,
    fileName,
    height: imageInfo.height,
    id,
    mimeType,
    r2Key: key,
    sha256,
    updatedAt: timestamp,
    width: imageInfo.width,
  });

  const record: MediaRecord = {
    alt_text: "",
    alt_text_provenance: "missing",
    byte_size: bytes.byteLength,
    caption: "",
    caption_provenance: "missing",
    file_name: fileName,
    height: imageInfo.height,
    id,
    mime_type: mimeType,
    r2_key: key,
    sha256,
    width: imageInfo.width,
  };

  return context.json({ media: mediaResponse(record), reused: false }, 201);
});

mediaRoutes.get("/:id", async (context) => {
  const database = getDatabase(context.env.DB);
  const [record] = await database
    .select({
      byte_size: mediaAssets.byteSize,
      mime_type: mediaAssets.mimeType,
      r2_key: mediaAssets.r2Key,
    })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, context.req.param("id")))
    .limit(1);
  if (!record) {
    return context.json({ error: "Media unavailable" }, 404);
  }

  const object = await context.env.MEDIA.get(record.r2_key, {
    onlyIf: context.req.raw.headers,
  });
  if (!object) {
    return context.json({ error: "Media object unavailable" }, 404);
  }
  if ("body" in object === false) {
    return new Response(null, { status: 304 });
  }

  const requestedWidth = Number.parseInt(context.req.query("width") ?? "", 10);
  const accepts = context.req.header("accept") ?? "";
  const outputFormat = preferredOutputFormat(accepts);
  const canTransform =
    RESPONSIVE_WIDTHS.has(requestedWidth) &&
    outputFormat !== null &&
    record.byte_size <= IMAGE_BINDING_LIMIT &&
    record.mime_type !== "image/gif";
  if (canTransform) {
    const transformed = (
      await context.env.IMAGES.input(object.body)
        .transform({ width: requestedWidth })
        .output({ format: outputFormat, quality: 82 })
    ).response();
    const headers = new Headers(transformed.headers);
    headers.set("cache-control", CACHE_CONTROL);
    headers.set("vary", "accept");
    headers.set("x-content-type-options", "nosniff");
    return new Response(transformed.body, { headers });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", CACHE_CONTROL);
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
});
