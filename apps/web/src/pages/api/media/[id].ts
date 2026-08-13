import { env } from "cloudflare:workers";
import { mediaAssets } from "@ortodoksas-lt/db";
import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { mediaResponse } from "../../../server/media-response";

export const ALL: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) {
    return new Response("Media unavailable", { status: 404 });
  }
  const record = await drizzle(env.DB)
    .select({ r2Key: mediaAssets.r2Key })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);
  const key = record[0]?.r2Key;
  return key
    ? mediaResponse(request, env.MEDIA, key)
    : new Response("Media unavailable", { status: 404 });
};
