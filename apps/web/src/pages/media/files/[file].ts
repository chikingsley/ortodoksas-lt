import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { mediaResponse } from "../../../lib/media-response";

const safeFile = /^[0-9a-f]{64}\.[a-z0-9]+$/i;
export const ALL: APIRoute = ({ params, request }) => {
  const { file } = params;
  return file && safeFile.test(file)
    ? mediaResponse(request, env.MEDIA, `archive/${file}`)
    : new Response("Media unavailable", { status: 404 });
};
