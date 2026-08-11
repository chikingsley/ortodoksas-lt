import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

export const GET: APIRoute = () =>
  Response.json({ environment: env.ENVIRONMENT, status: "ok" });
