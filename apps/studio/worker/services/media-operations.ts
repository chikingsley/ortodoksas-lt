import { mediaAssets } from "@ortodoksas-lt/db";
import { eq } from "drizzle-orm";

import type { StudioDatabase } from "../db";

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

const mediaSelection = {
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
};

const toHex = (value: ArrayBuffer): string =>
  [...new Uint8Array(value)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const decodeFileName = (value: string | null): string => {
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

export const uploadMedia = async (input: {
  database: StudioDatabase;
  images: ImagesBinding;
  media: R2Bucket;
  request: Request;
}): Promise<Response> => {
  const contentLength = Number.parseInt(
    input.request.headers.get("content-length") ?? "0",
    10
  );
  if (contentLength > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: "Image exceeds the 5 MB upload limit" },
      { status: 413 }
    );
  }

  const mimeType =
    input.request.headers.get("content-type")?.split(";", 1)[0] ?? "";
  const extension = ALLOWED_IMAGE_TYPES.get(mimeType);
  if (!extension) {
    return Response.json(
      { error: "Use a JPEG, PNG, WebP, AVIF, or GIF image" },
      { status: 415 }
    );
  }

  const bytes = await input.request.arrayBuffer();
  if (bytes.byteLength === 0) {
    return Response.json({ error: "Image data is required" }, { status: 400 });
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: "Image exceeds the 5 MB upload limit" },
      { status: 413 }
    );
  }

  const imageInfo = await input.images
    .info(new Blob([bytes]).stream())
    .catch(() => null);
  if (!(imageInfo && "width" in imageInfo)) {
    return Response.json(
      { error: "Image data could not be decoded" },
      { status: 422 }
    );
  }

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = toHex(digest);
  const [existing] = await input.database
    .select(mediaSelection)
    .from(mediaAssets)
    .where(eq(mediaAssets.sha256, sha256))
    .limit(1);
  if (existing) {
    return Response.json({ media: mediaResponse(existing), reused: true });
  }

  const id = `media_${sha256}`;
  const key = `media/originals/${sha256}.${extension}`;
  const fileName = decodeFileName(input.request.headers.get("x-file-name"));
  const timestamp = Date.now();
  await input.media.put(key, bytes, {
    customMetadata: { fileName, provenance: "uploaded", sha256 },
    httpMetadata: { cacheControl: CACHE_CONTROL, contentType: mimeType },
    sha256: digest,
  });

  try {
    await input.database.insert(mediaAssets).values({
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
  } catch (error: unknown) {
    const [concurrent] = await input.database
      .select(mediaSelection)
      .from(mediaAssets)
      .where(eq(mediaAssets.sha256, sha256))
      .limit(1);
    if (concurrent) {
      return Response.json({ media: mediaResponse(concurrent), reused: true });
    }
    // The key is content-addressed and every writer stores identical bytes.
    // Retaining an orphan lets a later retry repair D1 while protecting a
    // concurrent winner from losing its shared object.
    throw error;
  }

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
  return Response.json(
    { media: mediaResponse(record), reused: false },
    { status: 201 }
  );
};

export const serveMedia = async (input: {
  database: StudioDatabase;
  id: string;
  images: ImagesBinding;
  media: R2Bucket;
  request: Request;
}): Promise<Response> => {
  const [record] = await input.database
    .select({
      byteSize: mediaAssets.byteSize,
      mimeType: mediaAssets.mimeType,
      r2Key: mediaAssets.r2Key,
    })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, input.id))
    .limit(1);
  if (!record) {
    return Response.json({ error: "Media unavailable" }, { status: 404 });
  }

  const object = await input.media.get(record.r2Key, {
    onlyIf: input.request.headers,
  });
  if (!object) {
    return Response.json(
      { error: "Media object unavailable" },
      { status: 404 }
    );
  }
  if (!("body" in object)) {
    return new Response(null, { status: 304 });
  }

  const url = new URL(input.request.url);
  const requestedWidth = Number.parseInt(
    url.searchParams.get("width") ?? "",
    10
  );
  const outputFormat = preferredOutputFormat(
    input.request.headers.get("accept") ?? ""
  );
  const canTransform =
    RESPONSIVE_WIDTHS.has(requestedWidth) &&
    outputFormat !== null &&
    record.byteSize <= IMAGE_BINDING_LIMIT &&
    record.mimeType !== "image/gif";
  if (canTransform) {
    const transformed = (
      await input.images
        .input(object.body)
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
};
