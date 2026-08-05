import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import * as cheerio from "cheerio";
import { sanitizeRecoveredHtml } from "./lib/sanitize-recovered-html.mjs";

const projectRoot = new URL("..", import.meta.url).pathname;
const archiveRoot = join(projectRoot, "public", "archive");
const outputRoot = join(projectRoot, "public", "content");
const pagesRoot = join(outputRoot, "pages");
const cdxUrl = "https://web.archive.org/cdx/search/cdx?url=www.ortodoksas.lt/*&output=json&fl=timestamp,original,statuscode,mimetype,digest&filter=statuscode:200&filter=mimetype:text/html&collapse=urlkey";
const postPattern = /^\/\d{4}\/\d{2}\/[^/]+\.html$/;
const pagePattern = /^\/p\/[^/]+\.html$/;
const concurrency = 10;

function cleanPath(value) {
  try {
    const url = new URL(value.replace(/^http:/, "https:"));
    return url.pathname.replace(/\/$/, "") || "/";
  } catch {
    return null;
  }
}

function contentFile(path) {
  const readable = path.slice(1).replace(/\.html$/, "").replaceAll("/", "--");
  if (readable.length <= 180) return `${readable}.json`;
  return `${readable.slice(0, 150)}-${createHash("sha256").update(path).digest("hex").slice(0, 16)}.json`;
}

function text($, selector) {
  return $(selector).first().text().replace(/\s+/g, " ").trim();
}

function absoluteUrl(value, timestamp, mode = "id_") {
  if (!value || /^(data:|mailto:|tel:|#)/.test(value)) return value;
  const unwrapped = value
    .replace(/^\/\//, "https://")
    .replace(/^https?:\/\/web\.archive\.org\/web\/\d+[^/]*\/(?:id_|im_|js_)?/, "");
  try {
    const resolved = new URL(unwrapped, "https://www.ortodoksas.lt").href;
    if (mode === "im_" && !new URL(resolved).hostname.endsWith("ortodoksas.lt")) {
      return `https://web.archive.org/web/${timestamp}im_/${resolved}`;
    }
    return resolved;
  } catch {
    return value;
  }
}

function sectionFor(title, path) {
  const value = `${title} ${path}`.toLocaleLowerCase("lt");
  if (/pamoksl|paskait|homilij/.test(value)) return "Pamokslai";
  if (/skaitin|evangel|psalm|rašt/.test(value)) return "Šventasis Raštas";
  if (/pamald|liturg|kalend|švent|piligrim/.test(value)) return "Bažnyčios gyvenimas";
  if (/patriarch|egzarch|metropolit|vyskup|naujien|savaitė/.test(value)) return "Naujienos";
  return "Tikėjimas ir kultūra";
}

function extractPage(raw, capture) {
  const $ = cheerio.load(raw);
  const canonical = $("link[rel='canonical']").attr("href") || $("meta[property='og:url']").attr("content") || capture.original;
  const path = cleanPath(absoluteUrl(canonical, capture.timestamp));
  if (!path || (!postPattern.test(path) && !pagePattern.test(path))) return null;

  const body = $(".post-body").first();
  if (!body.length) return null;
  body.find("script, style, iframe, form, noscript, .google-drive-opener, .post-share-buttons").remove();
  body.find("*").each((_, element) => {
    const attributes = Object.keys(element.attribs ?? {});
    for (const attribute of attributes) {
      if (attribute.startsWith("on") || ["style", "class", "id", "data-version", "data-original-width", "data-original-height"].includes(attribute)) {
        $(element).removeAttr(attribute);
      }
    }
  });
  body.find("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const normalized = absoluteUrl(href, capture.timestamp);
    try {
      const url = new URL(normalized, "https://www.ortodoksas.lt");
      const local = url.hostname === "www.ortodoksas.lt" || url.hostname === "ortodoksas.lt";
      $(element).attr("href", local ? `${url.pathname}${url.search}${url.hash}` : normalized);
    } catch {
      $(element).attr("href", normalized);
    }
    if (href?.startsWith("http") && !href.includes("ortodoksas.lt")) {
      $(element).attr("rel", "noreferrer");
    }
  });
  body.find("img").each((_, element) => {
    const source = $(element).attr("src") || $(element).attr("data-src");
    $(element)
      .attr("src", absoluteUrl(source, capture.timestamp, "im_"))
      .attr("loading", "lazy")
      .attr("decoding", "async")
      .removeAttr("srcset")
      .removeAttr("data-src");
  });

  const title = text($, "h1.post-title, h3.post-title, meta[property='og:title']") || text($, "title").replace(/\s*[|–-]\s*ortodoksas\.lt$/i, "");
  const description = $("meta[property='og:description']").attr("content")?.replace(/\s+/g, " ").trim() || text($, ".post-body").slice(0, 220);
  const published = $("time.published").attr("datetime") || $("meta[property='article:published_time']").attr("content") || null;
  const hero = $("meta[property='og:image']").attr("content") || body.find("img").first().attr("src") || null;
  const labels = $(".post-labels a, a[rel='tag']").map((_, element) => $(element).text().trim()).get().filter(Boolean);

  return {
    path,
    kind: pagePattern.test(path) ? "page" : "article",
    title,
    description,
    published,
    section: sectionFor(title, path),
    labels: [...new Set(labels)],
    hero: hero ? absoluteUrl(hero, capture.timestamp, "im_") : null,
    html: sanitizeRecoveredHtml(body.html()?.trim() || ""),
    capture: capture.timestamp,
    source: capture.original,
  };
}

async function fetchText(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

async function main() {
  await mkdir(pagesRoot, { recursive: true });
  const cdx = JSON.parse(await fetchText(cdxUrl));
  const captures = new Map();
  for (const [timestamp, original] of cdx.slice(1)) {
    const path = cleanPath(original);
    if (path && (postPattern.test(path) || pagePattern.test(path))) {
      captures.set(path, { timestamp, original });
    }
  }

  const recovered = new Map();
  const localFiles = await readdir(join(archiveRoot, "html"));
  for (const file of localFiles.filter((name) => name.endsWith(".html"))) {
    const timestamp = file.match(/\d{14}/)?.[0] || "20260715123221";
    const raw = await readFile(join(archiveRoot, "html", file), "utf8");
    const page = extractPage(raw, { timestamp, original: `https://www.ortodoksas.lt/${basename(file)}` });
    if (page) recovered.set(page.path, page);
  }

  const queue = [...captures.entries()].filter(([path]) => !recovered.has(path));
  let cursor = 0;
  let failed = 0;
  async function worker() {
    while (cursor < queue.length) {
      const index = cursor;
      cursor += 1;
      const [path, capture] = queue[index];
      try {
        const raw = await fetchText(`https://web.archive.org/web/${capture.timestamp}id_/${capture.original}`);
        const page = extractPage(raw, capture);
        if (page) recovered.set(path, page);
        else failed += 1;
      } catch {
        failed += 1;
      }
      if ((index + 1) % 100 === 0) {
        console.log(`recovered ${recovered.size}/${captures.size}; failed ${failed}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const catalog = [];
  for (const page of recovered.values()) {
    const file = contentFile(page.path);
    await writeFile(join(pagesRoot, file), `${JSON.stringify(page)}\n`);
    const { html: _html, ...metadata } = page;
    catalog.push({ ...metadata, file });
  }
  catalog.sort((left, right) => (right.published || right.capture).localeCompare(left.published || left.capture));
  await writeFile(join(outputRoot, "catalog.json"), `${JSON.stringify(catalog)}\n`);
  const articles = catalog.filter((page) => page.kind === "article");
  const standalonePages = catalog.filter((page) => page.kind === "page");
  await writeFile(join(outputRoot, "home.json"), `${JSON.stringify([...standalonePages, ...articles.slice(0, 96)])}\n`);
  await writeFile(join(outputRoot, "recovery.json"), `${JSON.stringify({ recovered: catalog.length, attempted: captures.size, failed, generatedAt: new Date().toISOString() }, null, 2)}\n`);
  console.log(`complete: ${catalog.length} pages recovered, ${failed} unavailable`);
}

await main();
