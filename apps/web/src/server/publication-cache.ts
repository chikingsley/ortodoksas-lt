import { env } from "cloudflare:workers";

const cacheSeconds = 300;
const sessionCookie = /(?:^|;\s*)(?:__session|session)=/u;
const trackingParameter = /^(?:utm_|fbclid$|gclid$|_ga$)/u;

const bypassCache = (request: Request, url: URL) =>
  !["GET", "HEAD"].includes(request.method) ||
  url.pathname.startsWith("/api/") ||
  url.pathname.startsWith("/_") ||
  url.pathname === "/robots.txt" ||
  request.headers.has("authorization") ||
  sessionCookie.test(request.headers.get("cookie") ?? "");

export async function cachedPublication(
  request: Request,
  render: () => Promise<Response>
): Promise<Response> {
  const url = new URL(request.url);

  if (bypassCache(request, url)) {
    return await render();
  }

  const revision = await env.DB.prepare(
    "SELECT revision FROM publication_state WHERE id = 1"
  ).first<number>("revision");

  if (revision === null) {
    throw new Error(
      "Apply the publication read-budget migration before deployment."
    );
  }

  const parameters = [...url.searchParams.keys()];

  for (const parameter of parameters) {
    if (trackingParameter.test(parameter)) {
      url.searchParams.delete(parameter);
    }
  }

  url.searchParams.set("__publication_revision", String(revision));
  url.searchParams.set("__publication_cache", "1");
  url.searchParams.sort();
  const key = new Request(url, { method: "GET" });
  const cache = await caches.open("public-publication-v1");
  const cached = await cache.match(key);

  if (cached) {
    const response = new Response(
      request.method === "HEAD" ? null : cached.body,
      cached
    );

    response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    response.headers.set("X-Publication-Cache", "HIT");

    return response;
  }

  const rendered = await render();
  const response = new Response(rendered.body, rendered);

  if (
    request.method === "GET" &&
    [200, 404].includes(response.status) &&
    !response.headers.has("set-cookie") &&
    response.headers.get("vary")?.trim() !== "*" &&
    !(response.headers.get("cache-control") ?? "").includes("private") &&
    !(response.headers.get("cache-control") ?? "").includes("no-store")
  ) {
    const stored = response.clone();
    stored.headers.set("Cache-Control", `public, max-age=${cacheSeconds}`);
    await cache.put(key, stored);
    response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    response.headers.set("X-Publication-Cache", "MISS");
  }

  return response;
}
