import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { DOMParser as LinkedomDOMParser } from "linkedom";

Object.defineProperty(globalThis, "DOMParser", {
  configurable: true,
  value: LinkedomDOMParser,
});

interface SourceArticle {
  capture: string;
  description: string;
  file: string;
  hero: string | null;
  html: string;
  kind: "article" | "page";
  labels: string[];
  path: string;
  published: string | null;
  section: string;
  source: string;
  title: string;
}

const argumentsSet = new Set(process.argv.slice(2));
const valueAfter = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const limit = Number.parseInt(valueAfter("--limit") ?? "0", 10);
const baseUrl = valueAfter("--base-url") ?? "http://127.0.0.1:5173";
const shouldRelinkMedia = argumentsSet.has("--relink-media");
const contentRoot = resolve("apps/web/public/content");
const catalog = JSON.parse(
  await readFile(resolve(contentRoot, "catalog.json"), "utf8")
) as Omit<SourceArticle, "html">[];
const selected = limit > 0 ? catalog.slice(0, limit) : catalog;

const { convertLegacyArticle } = await import(
  "../../apps/studio/src/editorial/convert-legacy-article"
);

const slugFromPath = (path: string): string =>
  path.replace(/^\/+/, "").replace(/\.html$/u, "");

let imported = 0;
let skipped = 0;
const failures: Array<{ file: string; message: string }> = [];
const existingSources = new Set<string>();

if (!argumentsSet.has("--dry-run")) {
  const inventoryResponse = await fetch(`${baseUrl}/api/articles`);
  if (!inventoryResponse.ok) {
    throw new Error(`Inventory lookup failed: ${inventoryResponse.status}`);
  }
  const inventory = (await inventoryResponse.json()) as {
    articles: Array<{ file: string | null }>;
  };
  for (const article of inventory.articles) {
    if (article.file) {
      existingSources.add(article.file);
    }
  }
}

for (const [index, entry] of selected.entries()) {
  try {
    if (existingSources.has(entry.file)) {
      skipped += 1;
      continue;
    }
    const source = JSON.parse(
      await readFile(resolve(contentRoot, "pages", entry.file), "utf8")
    ) as SourceArticle;
    const converted = convertLegacyArticle(source.html, source.hero);
    const bodyHash = createHash("sha256")
      .update(JSON.stringify(converted.body))
      .digest("hex");
    if (argumentsSet.has("--dry-run")) {
      imported += 1;
      process.stdout.write(
        `${index + 1}/${selected.length} ${entry.file} ${bodyHash.slice(0, 12)}\n`
      );
      continue;
    }

    const response = await fetch(`${baseUrl}/api/articles`, {
      body: JSON.stringify({
        baseline: {
          body: converted.body,
          converterVersion: "legacy-html-v2",
          summary: source.description,
          title: source.title,
        },
        body: converted.body,
        heroSourceUrl: source.hero ?? undefined,
        kind: source.kind,
        labels: source.labels,
        language: "lt",
        publishedAt: source.published ? Date.parse(source.published) : null,
        section: source.section,
        slug: slugFromPath(source.path),
        sourceArticleId: entry.file,
        sourceCapture: source.capture,
        sourceHtml: source.html,
        sourceUrl: source.source,
        status: source.kind === "article" ? "published" : "draft",
        summary: source.description,
        title: source.title,
        translationKind: "original",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(
        `Import failed for ${entry.file}: ${response.status} ${await response.text()}`
      );
    }
    imported += 1;
    existingSources.add(entry.file);
    process.stdout.write(`${index + 1}/${selected.length} ${entry.file}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({ file: entry.file, message });
    process.stderr.write(
      `${index + 1}/${selected.length} FAILED ${entry.file}: ${message}\n`
    );
  }
}

process.stdout.write(
  `Complete: ${imported} imported, ${skipped} already present, ${failures.length} failed, ${selected.length} considered.\n`
);
if (failures.length > 0) {
  process.stderr.write(`${JSON.stringify({ failures }, null, 2)}\n`);
  process.exitCode = 1;
}

if (shouldRelinkMedia && !argumentsSet.has("--dry-run")) {
  const pendingResponse = await fetch(
    `${baseUrl}/api/articles/media-links/pending`
  );
  if (!pendingResponse.ok) {
    throw new Error(`Pending media lookup failed: ${pendingResponse.status}`);
  }
  const { articleIds } = (await pendingResponse.json()) as {
    articleIds: string[];
  };
  let relinked = 0;
  for (const [index, articleId] of articleIds.entries()) {
    const response = await fetch(
      `${baseUrl}/api/articles/${encodeURIComponent(articleId)}/media-links`,
      { method: "POST" }
    );
    if (!response.ok) {
      throw new Error(`Media relink failed for ${articleId}: ${response.status}`);
    }
    const result = (await response.json()) as { changed: boolean };
    if (result.changed) {
      relinked += 1;
    }
    process.stdout.write(
      `Media links: ${index + 1}/${articleIds.length} checked\r`
    );
  }
  process.stdout.write(
    `Media links: ${articleIds.length} checked, ${relinked} articles updated.\n`
  );
}
