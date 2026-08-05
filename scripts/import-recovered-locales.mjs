import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { load } from "cheerio";

const projectRoot = resolve(new URL("..", import.meta.url).pathname);
const recoveryRoot = join(projectRoot, "recovery");
const manifestsRoot = join(recoveryRoot, "manifests");
const payloadRoot = join(recoveryRoot, "payloads");
const checkpointPath = join(recoveryRoot, "payload-index", "checkpoints.jsonl");
const outputRoot = join(projectRoot, "public", "content", "locales");
const reportRoot = join(recoveryRoot, "reports");

const locales = ["ru", "uk", "be", "en"];
const localeHosts = {
  be: "ortodoksas-by.blogspot.com",
  en: "ortodoksas-en.blogspot.com",
  ru: "ortodoksas-ru.blogspot.com",
  uk: "ortodoksas-ua.blogspot.com",
};
const postPattern = /^\/\d{4}\/\d{2}\/[^/]+\.html$/;
const pagePattern = /^\/p\/[^/]+\.html$/;
const routePattern = /^(?:\/\d{4}\/\d{2}\/[^/]+\.html|\/p\/[^/]+\.html)$/;
const unsafeSchemePattern = /^(?:javascript|vbscript|data|file|blob):/i;
const waybackPattern = /^https?:\/\/web\.archive\.org\/web\/\d{1,14}(?:[a-z_]+)?\/(.*)$/i;
const duplicateSlashPattern = /\/{2,}/g;
const trailingSlashPattern = /\/$/;
const siteSuffixPattern =
  /\s*[|–—-]\s*(?:ortodoksas(?:-[a-z]{2})?\.blogspot\.com|ortodoksas\.lt|by\.ortodoksas\.lt)\s*$/i;
const htmlSuffixPattern = /\.html$/i;
const unsafeMarkupPattern = /<\s*script\b|\bon[a-z]+\s*=|(?:javascript|vbscript|data|file|blob):/i;
const protocolRelativePattern = /^\/\//;
const timestampPattern = /^\d{14}$/;
const urlAttributes = new Set([
  "action",
  "cite",
  "formaction",
  "href",
  "poster",
  "src",
]);
const forbiddenAttributes = new Set(["style", "srcdoc", "xlink:href"]);
const removableElements =
  "script,style,iframe,object,embed,form,noscript,template,svg,base";

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeStable(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, json(value));
  await rename(temporary, path);
}

async function readJsonLines(path) {
  try {
    const raw = await readFile(path, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function sourceKey(record) {
  return `${record.locale}\u0000${record.timestamp}\u0000${record.original}`;
}

function decodePath(pathname) {
  try {
    const decoded = decodeURIComponent(pathname);
    if ([...decoded].some((character) => {
      const code = character.codePointAt(0);
      return code !== undefined && (code < 0x20 || code === 0x7f);
    })) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function unwrapWayback(value) {
  return value.replace(waybackPattern, "$1");
}

function cleanPath(value, base = "https://example.invalid/") {
  if (!value) {
    return null;
  }
  const unwrapped = unwrapWayback(String(value).trim());
  try {
    const url = new URL(unwrapped, base);
    const decodedPath = decodePath(url.pathname);
    if (!decodedPath) {
      return null;
    }
    const path =
      url.pathname.replace(duplicateSlashPattern, "/").replace(trailingSlashPattern, "") || "/";
    if (path.includes("%0A") || path.includes("%0D")) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

function routeKind(path) {
  if (postPattern.test(path)) {
    return "article";
  }
  if (pagePattern.test(path)) {
    return "page";
  }
  return null;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }
  const text = String(value).replace(/\s+/g, " ").trim();
  const date = new Date(text);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function text($, selector) {
  return $(selector).first().text().replace(/\s+/g, " ").trim();
}

function stripSiteSuffix(value) {
  return value.replace(siteSuffixPattern, "").trim();
}

function waybackUrl(capture) {
  return `https://web.archive.org/web/${capture.timestamp}id_/${capture.original}`;
}

function fileNameForPath(path) {
  const readable = decodePath(path.slice(1))
    ?.replace(htmlSuffixPattern, "")
    .replaceAll("/", "--")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  const digest = createHash("sha256").update(path).digest("hex").slice(0, 16);
  return `${readable || "page"}-${digest}.json`;
}

function isInternalUrl(url, locale) {
  const host = url.hostname.toLowerCase();
  return (
    host === localeHosts[locale] ||
    host === "ortodoksas.lt" ||
    host === "www.ortodoksas.lt" ||
    host.endsWith(".ortodoksas.lt")
  );
}

function safeUrl(value, base) {
  if (!value) {
    return null;
  }
  const original = String(value).trim();
  if (!original || original.startsWith("#")) {
    return original || null;
  }
  const withoutControlCharacters = [...original]
    .filter((character) => {
      const code = character.codePointAt(0);
      return code === undefined || code > 0x20;
    })
    .join("");
  if (unsafeSchemePattern.test(withoutControlCharacters)) {
    return null;
  }
  if (protocolRelativePattern.test(original)) {
    try {
      return new URL(`https:${original}`).href;
    } catch {
      return null;
    }
  }
  try {
    const url = new URL(unwrapWayback(original), base);
    if (!["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function sanitizeBody(body, capture, locale) {
  const counts = { eventHandlers: 0, scripts: 0, unsafeUrls: 0 };
  body.find(removableElements).each((_, element) => {
    if (["script", "style"].includes(element.name)) {
      counts.scripts += 1;
    }
    body.find(element).remove();
  });

  body.find("*").each((_, element) => {
    const attributes = Object.keys(element.attribs ?? {});
    for (const attribute of attributes) {
      const lower = attribute.toLowerCase();
      if (lower.startsWith("on")) {
        body.find(element).removeAttr(attribute);
        counts.eventHandlers += 1;
        continue;
      }
      if (
        forbiddenAttributes.has(lower) ||
        lower.startsWith("data-") ||
        lower === "srcset"
      ) {
        body.find(element).removeAttr(attribute);
        continue;
      }
      if (urlAttributes.has(lower)) {
        const value = body.find(element).attr(attribute);
        const safe = safeUrl(value, capture.original);
        if (!safe) {
          body.find(element).removeAttr(attribute);
          counts.unsafeUrls += 1;
          continue;
        }
        body.find(element).attr(attribute, safe);
      }
    }
  });

  body.find("a[href]").each((_, element) => {
    const href = body.find(element).attr("href");
    const safe = safeUrl(href, capture.original);
    if (!safe) {
      return;
    }
    try {
      const url = new URL(safe, capture.original);
      if (isInternalUrl(url, locale)) {
        body
          .find(element)
          .attr("href", `${url.pathname}${url.search}${url.hash}`);
      } else if (url.protocol === "http:" || url.protocol === "https:") {
        body.find(element).attr("rel", "noreferrer");
      }
    } catch {
      body.find(element).removeAttr("href");
    }
  });

  body.find("img,video,audio,source").each((_, element) => {
    const sourceAttribute = element.name === "source" ? "src" : "src";
    const source =
      body.find(element).attr(sourceAttribute) ||
      body.find(element).attr("data-src");
    if (!source) {
      return;
    }
    const safe = safeUrl(source, capture.original);
    if (!safe) {
      body.find(element).remove();
      counts.unsafeUrls += 1;
      return;
    }
    body.find(element).attr(sourceAttribute, safe).removeAttr("data-src");
    if (element.name === "img") {
      body.find(element).attr("loading", "lazy").attr("decoding", "async");
    }
  });

  const html = body.html()?.trim() || "";
  if (unsafeMarkupPattern.test(html)) {
    return { counts, error: "unsafe markup remained after sanitization" };
  }
  return { counts, html };
}

function extractMedia(body, capture) {
  const media = [];
  body.find("img,video,audio,source").each((_, element) => {
    const source = body.find(element).attr("src");
    const safe = safeUrl(source, capture.original);
    if (!safe || unsafeSchemePattern.test(safe)) {
      return;
    }
    media.push({
      alt: body.find(element).attr("alt")?.replace(/\s+/g, " ").trim() || null,
      type: element.name === "img" ? "image" : element.name,
      url: safe,
    });
  });
  return [...new Map(media.map((item) => [item.url, item])).values()].sort(
    (left, right) => left.url.localeCompare(right.url)
  );
}

function extractInternalLinks(body, capture, locale) {
  const links = [];
  body.find("a[href]").each((_, element) => {
    const safe = safeUrl(body.find(element).attr("href"), capture.original);
    if (!safe) {
      return;
    }
    try {
      const url = new URL(safe, capture.original);
      if (!isInternalUrl(url, locale)) {
        return;
      }
      const path = cleanPath(url.href);
      if (!path) {
        return;
      }
      links.push({
        path,
        text: body.find(element).text().replace(/\s+/g, " ").trim(),
        url: url.href,
      });
    } catch {}
  });
  return [
    ...new Map(
      links.map((item) => [`${item.path}\u0000${item.url}`, item])
    ).values(),
  ].sort(
    (left, right) =>
      left.path.localeCompare(right.path) || left.url.localeCompare(right.url)
  );
}

function extractLabels($) {
  const labels = $(".post-labels a, a[rel='tag'], [data-label]")
    .map((_, element) => $(element).attr("data-label") || $(element).text())
    .get()
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return [...new Set(labels)].sort((left, right) => left.localeCompare(right));
}

function extractPage(raw, capture, locale) {
  const $ = load(raw);
  const sourcePath = cleanPath(capture.original);
  const canonicalValue =
    $("link[rel='canonical']").attr("href") ||
    $("meta[property='og:url']").attr("content");
  const path = cleanPath(canonicalValue || capture.original, capture.original);
  const kind = routeKind(path || "");
  if (!kind) {
    return {
      discoveredPaths: discoverPaths($, capture, locale),
      kind: sourcePath === "/" ? "home" : "other",
      path: sourcePath,
    };
  }
  if (capture.status !== "200") {
    return { error: `capture status ${capture.status}` };
  }

  const body = $(".post-body").first().length
    ? $(".post-body").first()
    : $(
        "[itemprop='articleBody'], article .entry-content, .entry-content"
      ).first();
  if (!body.length) {
    return { error: "missing Blogger post body", kind, path };
  }

  const sanitized = sanitizeBody(body, capture, locale);
  if (sanitized.error) {
    return { error: sanitized.error, kind, path };
  }
  if (!sanitized.html) {
    return { error: "empty Blogger post body", kind, path };
  }

  const title = stripSiteSuffix(
    text(
      $,
      ".post-title, h1[itemprop='name'], h1, meta[property='og:title']"
    ) || text($, "title")
  );
  if (!title) {
    return { error: "missing page title", kind, path };
  }

  const dateOriginal =
    $("time.published, [itemprop='datePublished'], abbr.published")
      .first()
      .attr("datetime") ||
    $("time.published, [itemprop='datePublished'], abbr.published")
      .first()
      .attr("title") ||
    $("meta[property='article:published_time']").attr("content") ||
    null;
  const description =
    $("meta[property='og:description'], meta[name='description']")
      .first()
      .attr("content")
      ?.replace(/\s+/g, " ")
      .trim() || body.text().replace(/\s+/g, " ").trim().slice(0, 240);
  const published = normalizeDate(dateOriginal);

  return {
    body: sanitized.html,
    date: published,
    dateOriginal: dateOriginal?.replace(/\s+/g, " ").trim() || null,
    description,
    internalLinks: extractInternalLinks(body, capture, locale),
    kind,
    labels: extractLabels($),
    media: extractMedia(body, capture),
    path,
    sanitization: sanitized.counts,
    title,
  };
}

function discoverPaths($, capture, locale) {
  const paths = new Set();
  $("a[href]").each((_, element) => {
    const safe = safeUrl($(element).attr("href"), capture.original);
    if (!safe) {
      return;
    }
    try {
      const url = new URL(safe, capture.original);
      if (isInternalUrl(url, locale)) {
        const path = cleanPath(url.href);
        if (path && routePattern.test(path)) {
          paths.add(path);
        }
      }
    } catch {}
  });
  return [...paths].sort((left, right) => left.localeCompare(right));
}

function versionMetadata(capture, payload, outcome, extra = {}) {
  return {
    digest: capture.digest,
    locale: capture.locale,
    original: capture.original,
    outcome,
    sourceQueries: [...capture.sourceQueries].sort(),
    status: capture.status,
    timestamp: capture.timestamp,
    url: waybackUrl(capture),
    ...extra,
    ...(payload ? { payload: relative(projectRoot, payload.payloadPath) } : {}),
  };
}

function compareVersions(left, right) {
  return (
    left.timestamp.localeCompare(right.timestamp) ||
    left.digest.localeCompare(right.digest) ||
    left.original.localeCompare(right.original)
  );
}

async function loadPayloadMetadata() {
  const metadata = new Map();
  let prefixes = [];
  try {
    prefixes = await readdir(payloadRoot);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  for (const prefix of prefixes.sort()) {
    if (prefix === "quarantine") {
      continue;
    }
    const prefixRoot = join(payloadRoot, prefix);
    for (const name of (await readdir(prefixRoot))
      .filter((item) => item.endsWith(".json"))
      .sort()) {
      const item = JSON.parse(await readFile(join(prefixRoot, name), "utf8"));
      metadata.set(item.digest, item);
    }
  }
  return metadata;
}

function checkpointOutcomes(rows) {
  const outcomes = new Map();
  for (const row of rows) {
    if (row.recordType === "capture" && row.key) {
      outcomes.set(row.key, row);
    }
  }
  return outcomes;
}

async function payloadUsable(payload) {
  if (!payload || payload.status !== "ok" || !payload.payloadPath) {
    return false;
  }
  try {
    await access(join(projectRoot, payload.payloadPath));
    return true;
  } catch {
    return false;
  }
}

function blockerReason(capture, payload, checkpoint) {
  if (!payload) {
    return checkpoint?.outcome === "pending"
      ? "payload pending"
      : "payload metadata missing";
  }
  if (payload.status !== "ok") {
    return `payload ${payload.status}`;
  }
  if (!payload.payloadPath) {
    return "verified payload path missing";
  }
  if (capture.status !== "200") {
    return `capture status ${capture.status}`;
  }
  return checkpoint?.outcome === "unresolved"
    ? checkpoint.outcomeReason || "capture unresolved"
    : "payload file missing";
}

async function main() {
  const payloads = await loadPayloadMetadata();
  const checkpoints = checkpointOutcomes(await readJsonLines(checkpointPath));
  const checkpointMeta = (await readJsonLines(checkpointPath)).find(
    (row) => row.recordType === "meta"
  );
  const allReports = [];
  const reportLocales = {};

  for (const locale of locales) {
    const manifestRows = (
      await readJsonLines(join(manifestsRoot, `${locale}.jsonl`))
    ).filter((row) => row.locale === locale);
    const captures = new Map();
    for (const row of manifestRows) {
      const key = sourceKey(row);
      const existing = captures.get(key);
      if (existing) {
        existing.sourceQueries = [
          ...new Set([...existing.sourceQueries, ...(row.sourceQueries || [])]),
        ];
      } else {
        captures.set(key, {
          ...row,
          sourceQueries: [...(row.sourceQueries || [])],
        });
      }
    }

    const candidates = new Map();
    const homeEvidence = [];
    const blockers = [];
    for (const capture of [...captures.values()].sort(compareVersions)) {
      const payload = payloads.get(capture.digest);
      const checkpoint = checkpoints.get(sourceKey(capture));
      const usable = await payloadUsable(payload);
      if (!usable || capture.mime !== "text/html" || capture.status !== "200") {
        blockers.push({
          digest: capture.digest,
          original: capture.original,
          reason: blockerReason(capture, payload, checkpoint),
          timestamp: capture.timestamp,
        });
        continue;
      }

      const raw = await readFile(
        join(projectRoot, payload.payloadPath),
        "utf8"
      );
      const parsed = extractPage(raw, capture, locale);
      if (parsed.kind === "home") {
        homeEvidence.push({
          digest: capture.digest,
          discoveredPaths: parsed.discoveredPaths,
          original: capture.original,
          timestamp: capture.timestamp,
          url: waybackUrl(capture),
        });
        continue;
      }
      if (parsed.kind === "other") {
        blockers.push({
          digest: capture.digest,
          original: capture.original,
          reason: "not a Blogger post or permanent page",
          timestamp: capture.timestamp,
        });
        continue;
      }
      if (parsed.error) {
        const path = parsed.path || cleanPath(capture.original);
        const entry = candidates.get(path || capture.original) || {
          path,
          successful: [],
          versions: [],
        };
        entry.versions.push(
          versionMetadata(capture, payload, "rejected", { error: parsed.error })
        );
        candidates.set(path || capture.original, entry);
        blockers.push({
          digest: capture.digest,
          original: capture.original,
          reason: parsed.error,
          timestamp: capture.timestamp,
        });
        continue;
      }

      const entry = candidates.get(parsed.path) || {
        path: parsed.path,
        successful: [],
        versions: [],
      };
      const version = versionMetadata(capture, payload, "parsed", {
        kind: parsed.kind,
        published: parsed.date,
      });
      entry.versions.push(version);
      entry.successful.push({ capture, parsed, payload, version });
      candidates.set(parsed.path, entry);
    }

    const catalog = [];
    const pages = [];
    for (const entry of candidates.values()) {
      entry.versions.sort(
        (left, right) =>
          left.timestamp.localeCompare(right.timestamp) ||
          left.digest.localeCompare(right.digest)
      );
      entry.successful.sort((left, right) =>
        compareVersions(left.capture, right.capture)
      );
      const selected = entry.successful.at(-1);
      if (!selected) {
        continue;
      }
      const file = fileNameForPath(entry.path);
      const page = {
        body: selected.parsed.body,
        date: selected.parsed.date,
        dateOriginal: selected.parsed.dateOriginal,
        description: selected.parsed.description,
        file: `pages/${file}`,
        internalLinks: selected.parsed.internalLinks,
        kind: selected.parsed.kind,
        labels: selected.parsed.labels,
        locale,
        media: selected.parsed.media,
        path: entry.path,
        provenance: {
          digest: selected.capture.digest,
          original: selected.capture.original,
          timestamp: selected.capture.timestamp,
          url: waybackUrl(selected.capture),
        },
        sanitization: selected.parsed.sanitization,
        title: selected.parsed.title,
        versions: entry.versions,
      };
      pages.push(page);
      const { body: _body, ...catalogEntry } = page;
      catalog.push(catalogEntry);
      await writeStable(join(outputRoot, locale, "pages", file), page);
    }

    catalog.sort(
      (left, right) =>
        (right.date || "").localeCompare(left.date || "") ||
        left.path.localeCompare(right.path)
    );
    pages.sort((left, right) => left.path.localeCompare(right.path));
    homeEvidence.sort(
      (left, right) =>
        left.timestamp.localeCompare(right.timestamp) ||
        left.digest.localeCompare(right.digest)
    );
    blockers.sort(
      (left, right) =>
        left.timestamp.localeCompare(right.timestamp) ||
        left.original.localeCompare(right.original) ||
        left.reason.localeCompare(right.reason)
    );

    const report = {
      blockers,
      captures: captures.size,
      homeEvidence,
      host: localeHosts[locale],
      locale,
      paths: [...new Set(pages.map((page) => page.path))].sort(),
      published: {
        articles: pages.filter((page) => page.kind === "article").length,
        pages: pages.filter((page) => page.kind === "page").length,
        total: pages.length,
      },
      usablePayloadCaptures:
        captures.size - blockers.length - homeEvidence.length,
    };
    reportLocales[locale] = report;
    allReports.push(...pages);
    await writeStable(join(outputRoot, locale, "catalog.json"), catalog);
  }

  const payloadStatus = {};
  for (const payload of payloads.values()) {
    payloadStatus[payload.status] = (payloadStatus[payload.status] || 0) + 1;
  }
  const report = {
    locales: reportLocales,
    manifestFingerprint: checkpointMeta?.manifestFingerprint || null,
    payloads: {
      metadataFiles: payloads.size,
      status: payloadStatus,
    },
    schemaVersion: 1,
    totals: {
      blockers: Object.values(reportLocales).reduce(
        (total, locale) => total + locale.blockers.length,
        0
      ),
      homeEvidence: Object.values(reportLocales).reduce(
        (total, locale) => total + locale.homeEvidence.length,
        0
      ),
      publishedArticles: allReports.filter((page) => page.kind === "article")
        .length,
      publishedPages: allReports.filter((page) => page.kind === "page").length,
      publishedTotal: allReports.length,
    },
  };
  await writeStable(join(reportRoot, "locale-content.json"), report);
  await writeFile(
    join(reportRoot, "locale-content.md"),
    markdownReport(report)
  );
  console.log(JSON.stringify(report.totals));
}

function markdownReport(report) {
  const lines = [
    "# Recovered Locale Content",
    "",
    "Generated deterministically from the locale manifests, checkpoint index, and transport-verified payload metadata.",
    "",
    `- Manifest fingerprint: \`${report.manifestFingerprint || "unavailable"}\``,
    `- Verified payload metadata files: ${report.payloads.metadataFiles}`,
    `- Published articles: ${report.totals.publishedArticles}`,
    `- Published permanent pages: ${report.totals.publishedPages}`,
    `- Published total: ${report.totals.publishedTotal}`,
    `- Captured home pages retained as discovery evidence: ${report.totals.homeEvidence}`,
    `- Blocked captures: ${report.totals.blockers}`,
    "",
    "## Locale Counts",
    "",
    "| Locale | Manifest captures | Home evidence | Articles | Permanent pages | Published | Blockers |",
    "|---|---:|---:|---:|---:|---:|---:|",
  ];
  for (const locale of locales) {
    const item = report.locales[locale];
    lines.push(
      `| ${locale} | ${item.captures} | ${item.homeEvidence.length} | ${item.published.articles} | ${item.published.pages} | ${item.published.total} | ${item.blockers.length} |`
    );
  }
  lines.push(
    "",
    "## Payload Status",
    "",
    "| Status | Payload metadata files |",
    "|---|---:|"
  );
  for (const [status, count] of Object.entries(report.payloads.status).sort(
    ([left], [right]) => left.localeCompare(right)
  )) {
    lines.push(`| ${status} | ${count} |`);
  }
  lines.push(
    "",
    "## Blockers",
    "",
    "Blockers are listed exactly in `locale-content.json`; no blocked capture is published.",
    ""
  );
  for (const locale of locales) {
    const blockers = report.locales[locale].blockers;
    lines.push(`### ${locale}`, "", `- ${blockers.length} blocked captures`);
    const reasons = new Map();
    for (const blocker of blockers) {
      reasons.set(blocker.reason, (reasons.get(blocker.reason) || 0) + 1);
    }
    for (const [reason, count] of [...reasons.entries()].sort(
      ([left], [right]) => left.localeCompare(right)
    )) {
      lines.push(`- ${count}: ${reason}`);
    }
    lines.push("");
  }
  lines.push(
    "## Homepage Evidence",
    "",
    "Root captures are retained only in machine-readable report evidence and are never emitted as article or page records.",
    ""
  );
  return `${lines.join("\n")}\n`;
}

await main();
