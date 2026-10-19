import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const GET: APIRoute = () =>
  Response.json({ environment: env.ENVIRONMENT, status: "ok" });
