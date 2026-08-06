import { tiptapDocumentSchema } from "@ortodoksas-lt/content/article";
import { articles, homepagePlacements, mediaAssets } from "@ortodoksas-lt/db";
import { renderArticleBody } from "@ortodoksas-lt/editor/render";
import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

const localeAliases = new Map([
  ["", "/index.html"],
  ["/en", "/en.html"],
  ["/ru", "/ru.html"],
  ["/uk", "/uk.html"],
  ["/be", "/be.html"],
]);
const trailingSlash = /\/$/;
const mediaPathPattern = /^\/media\/files\/([0-9a-f]{64}\.[a-z0-9]+)$/i;
const mediaIdPattern = /^\/api\/media\/([^/]+)$/u;
const mediaCacheControl = "public, max-age=31536000, immutable";

const publicArticle = (article: typeof articles.$inferSelect) => ({
  bodyHtml: renderArticleBody(
    tiptapDocumentSchema.parse(JSON.parse(article.bodyJson))
  ),
  description: article.seoDescription || article.summary,
  hero: article.heroMediaId ? `/api/media/${article.heroMediaId}` : null,
  id: article.id,
  kind: article.kind,
  labels: JSON.parse(article.labelsJson) as string[],
  language: article.language,
  path: `/${article.slug}.html`,
  published: article.publishedAt
    ? new Date(article.publishedAt).toISOString()
    : null,
  section: article.section,
  title: article.title,
});

async function servePublicationApi(request: Request, env: Env) {
  const database = drizzle(env.DB);
  const url = new URL(request.url);
  if (url.pathname === "/api/publication") {
    const path = url.searchParams.get("path")?.replace(/^\/+|\.html$/gu, "");
    if (!path) {
      return Response.json(
        { error: "Article path is required" },
        { status: 400 }
      );
    }
    const article = await database
      .select()
      .from(articles)
      .where(and(eq(articles.slug, path), eq(articles.status, "published")))
      .limit(1);
    return article[0]
      ? Response.json({ article: publicArticle(article[0]) })
      : Response.json({ error: "Article unavailable" }, { status: 404 });
  }

  const [published, placements] = await Promise.all([
    database
      .select()
      .from(articles)
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.publishedAt))
      .limit(24),
    database
      .select()
      .from(homepagePlacements)
      .orderBy(asc(homepagePlacements.position)),
  ]);
  const byId = new Map(published.map((article) => [article.id, article]));
  const explicitLead = placements.find(
    (placement) => placement.slot === "lead"
  );
  const lead =
    (explicitLead && byId.get(explicitLead.articleId)) ?? published[0];
  const explicitSecondary = placements
    .filter((placement) => placement.slot === "secondary")
    .map((placement) => byId.get(placement.articleId))
    .filter((article): article is typeof articles.$inferSelect =>
      Boolean(article)
    );
  const secondary = [...explicitSecondary];
  for (const article of published) {
    if (secondary.length >= 3) {
      break;
    }
    if (
      article.id !== lead?.id &&
      !secondary.some((item) => item.id === article.id)
    ) {
      secondary.push(article);
    }
  }
  const used = new Set([lead?.id, ...secondary.map((article) => article.id)]);
  return Response.json({
    feed: published
      .filter((article) => !used.has(article.id))
      .map(publicArticle),
    lead: lead ? publicArticle(lead) : null,
    secondary: secondary.slice(0, 3).map(publicArticle),
  });
}

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
      return env.ASSETS.fetch(request);
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
    return env.ASSETS.fetch(request);
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

export default {
  fetch(request, env) {
    const url = new URL(request.url);
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
    if (
      request.method === "GET" &&
      (url.pathname === "/api/homepage" || url.pathname === "/api/publication")
    ) {
      return servePublicationApi(request, env);
    }
    const alias = localeAliases.get(url.pathname.replace(trailingSlash, ""));
    const routeAlias = cleanRouteAlias(url.pathname);
    if ((alias ?? routeAlias) && request.method === "GET") {
      const assetUrl = new URL(alias ?? routeAlias ?? url.pathname, url);
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
