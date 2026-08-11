import { mediaAssets } from "@ortodoksas-lt/db";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { defaultLocale, siteLocales } from "../src/i18n/config";

const localeAliases = new Map(
  siteLocales.map((locale) =>
    locale === defaultLocale
      ? ["", "/index.html"]
      : [`/${locale}`, `/${locale}.html`]
  )
);
const localizedLegacyRedirects = new Map([
  [
    "/ru/2022/05/blog-post_10.html",
    "/ru/2022/05/pochemu-ya-ne-mogu-nazyvat-kirilla-ottsom.html",
  ],
  [
    "/ru/2022/05/blog-post_11.html",
    "/ru/2022/05/duhovenstvo-pokidaet-moskovskiy-patriarhat.html",
  ],
  [
    "/ru/2022/05/blog-post_19.html",
    "/ru/2022/05/pismo-pravoslavnyh-miryan-mitropolitu.html",
  ],
  [
    "/ru/2022/05/blog-post_50.html",
    "/ru/2022/05/konstantinopolskiy-patriarhat-v-litve.html",
  ],
  [
    "/ru/2022/07/blog-post.html",
    "/ru/2022/07/v-selyavko-obrashchenie-litovskoy-eparhii-k-prezidentu.html",
  ],
  [
    "/ru/2022/07/blog-post_27.html",
    "/ru/2022/07/v-selyavko-zachem-litve-yurisdiktsiya-konstantinopolya.html",
  ],
  ["/uk/2022/05/blog-post.html", "/uk/2022/05/vitayemo.html"],
  [
    "/uk/2022/05/blog-post_15.html",
    "/uk/2022/05/istoriya-konstantynopolskoho-patriarkhatu-u-lytvi.html",
  ],
  [
    "/uk/2022/05/blog-post_16.html",
    "/uk/2022/05/serbska-tserkva-vidnovlyuye-spilkuvannya-z-ohridom.html",
  ],
  [
    "/uk/2022/05/blog-post_18.html",
    "/uk/2022/05/lyst-pravoslavnykh-myrian-lytovskomu-mytropolytu.html",
  ],
  [
    "/uk/2022/05/blog-post_21.html",
    "/uk/2022/05/posol-lytvy-vidvidav-vselenskyi-patriarkhat.html",
  ],
  ["/uk/2022/06/22.html", "/uk/2022/06/psalom-22-lytovskoyu.html"],
]);
const trailingSlash = /\/$/;
const mediaPathPattern = /^\/media\/files\/([0-9a-f]{64}\.[a-z0-9]+)$/i;
const mediaIdPattern = /^\/api\/media\/([^/]+)$/u;
const mediaCacheControl = "public, max-age=31536000, immutable";
function applyRangeHeaders(object: R2Object, headers: Headers) {
  const { range } = object;
  if (!range) {
    headers.set("content-length", String(object.size));
    return false;
  }

  let length = object.size;
  let offset = 0;
  const suffix = "suffix" in range ? range.suffix : undefined;
  const requestedOffset = "offset" in range ? range.offset : undefined;
  const requestedLength = "length" in range ? range.length : undefined;
  if (suffix === undefined) {
    offset = requestedOffset ?? 0;
    length = requestedLength ?? object.size - offset;
  } else {
    length = Math.min(suffix, object.size);
    offset = object.size - length;
  }
  headers.set("content-length", String(length));
  headers.set(
    "content-range",
    `bytes ${offset}-${offset + length - 1}/${object.size}`
  );
  return true;
}

async function serveMedia(request: Request, env: Env, fileName: string) {
  if (!(request.method === "GET" || request.method === "HEAD")) {
    return new Response("Method Not Allowed", {
      headers: { Allow: "GET, HEAD" },
      status: 405,
    });
  }

  const key = `archive/${fileName}`;
  if (request.method === "HEAD") {
    const object = await env.MEDIA.head(key);
    if (!object) {
      return serveAsset(request, env);
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("accept-ranges", "bytes");
    headers.set(
      "cache-control",
      headers.get("cache-control") ?? mediaCacheControl
    );
    headers.set("content-length", String(object.size));
    headers.set("etag", object.httpEtag);
    return new Response(null, { headers });
  }

  const object = await env.MEDIA.get(key, {
    onlyIf: request.headers,
    range: request.headers,
  });
  if (!object) {
    return serveAsset(request, env);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("accept-ranges", "bytes");
  headers.set(
    "cache-control",
    headers.get("cache-control") ?? mediaCacheControl
  );
  headers.set("etag", object.httpEtag);
  if (!("body" in object)) {
    return new Response(null, { headers, status: 412 });
  }
  const partial = applyRangeHeaders(object, headers);
  return new Response(object.body, { headers, status: partial ? 206 : 200 });
}

async function serveMediaById(request: Request, env: Env, id: string) {
  if (!(request.method === "GET" || request.method === "HEAD")) {
    return new Response("Method Not Allowed", {
      headers: { Allow: "GET, HEAD" },
      status: 405,
    });
  }
  const record = await drizzle(env.DB)
    .select({ r2Key: mediaAssets.r2Key })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);
  if (!record[0]) {
    return new Response("Media unavailable", { status: 404 });
  }
  if (request.method === "HEAD") {
    const object = await env.MEDIA.head(record[0].r2Key);
    if (!object) {
      return new Response("Media unavailable", { status: 404 });
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("accept-ranges", "bytes");
    headers.set(
      "cache-control",
      headers.get("cache-control") ?? mediaCacheControl
    );
    headers.set("content-length", String(object.size));
    headers.set("etag", object.httpEtag);
    return new Response(null, { headers });
  }
  const object = await env.MEDIA.get(record[0].r2Key, {
    onlyIf: request.headers,
    range: request.headers,
  });
  if (!object) {
    return new Response("Media unavailable", { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("accept-ranges", "bytes");
  headers.set(
    "cache-control",
    headers.get("cache-control") ?? mediaCacheControl
  );
  headers.set("etag", object.httpEtag);
  if (!("body" in object)) {
    return new Response(null, { headers, status: 412 });
  }
  const partial = applyRangeHeaders(object, headers);
  return new Response(object.body, { headers, status: partial ? 206 : 200 });
}

function cleanRouteAlias(pathname: string) {
  const path = pathname.replace(trailingSlash, "");
  if (
    path === "/archyvas" ||
    path === "/paieska" ||
    path === "/404" ||
    path.startsWith("/tema/")
  ) {
    return `${path}.html`;
  }
}

async function serveAsset(request: Request, env: Env) {
  const response = await env.ASSETS.fetch(request);
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    const localizedRedirect = localizedLegacyRedirects.get(url.pathname);
    if (localizedRedirect && request.method === "GET") {
      return Response.redirect(new URL(localizedRedirect, url), 301);
    }
    const mediaMatch = url.pathname.match(mediaPathPattern);
    if (mediaMatch?.[1]) {
      return serveMedia(request, env, mediaMatch[1]);
    }
    const mediaIdMatch = url.pathname.match(mediaIdPattern);
    if (mediaIdMatch?.[1]) {
      return serveMediaById(request, env, decodeURIComponent(mediaIdMatch[1]));
    }
    if (url.pathname === "/api/health") {
      return Response.json({ environment: env.ENVIRONMENT, status: "ok" });
    }
    const alias = localeAliases.get(url.pathname.replace(trailingSlash, ""));
    const routeAlias = cleanRouteAlias(url.pathname);
    if ((alias ?? routeAlias) && request.method === "GET") {
      const assetUrl = new URL(alias ?? routeAlias ?? url.pathname, url);
      return serveAsset(new Request(assetUrl, request), env);
    }
    return serveAsset(request, env);
  },
} satisfies ExportedHandler<Env>;
