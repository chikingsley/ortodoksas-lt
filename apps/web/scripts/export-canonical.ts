import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { tiptapDocumentSchema } from "@ortodoksas-lt/content/article";
import { renderArticleBody } from "@ortodoksas-lt/editor/render";

const execFileAsync = promisify(execFile);
const outputRoot =
  process.env.CANONICAL_CONTENT_DIR ?? "public/.canonical-content";
const wrangler = "node_modules/.bin/wrangler";
const config = "wrangler.jsonc";

interface Row {
  body_json: string;
  hero_media_id: string | null;
  kind: "article" | "page";
  labels_json: string;
  language: string;
  published_at: number | null;
  section: string;
  slug: string;
  source_capture: string | null;
  source_url: string | null;
  summary: string;
  title: string;
}

interface WranglerResult {
  results?: Row[];
}

interface ExportPage {
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

async function query(sql: string) {
  const { stdout } = await execFileAsync(
    wrangler,
    [
      "d1",
      "execute",
      "DB",
      "--remote",
      "--config",
      config,
      "--command",
      sql,
      "--json",
    ],
    { maxBuffer: 128 * 1024 * 1024 }
  );
  const payload = JSON.parse(stdout) as WranglerResult[];
  return payload[0]?.results ?? [];
}

const rows = await query(
  "SELECT body_json, hero_media_id, kind, labels_json, language, published_at, section, source_capture, source_url, summary, title, slug FROM articles WHERE language = 'lt' AND (status = 'published' OR kind = 'page') ORDER BY published_at DESC"
);

await rm(outputRoot, { force: true, recursive: true });
await mkdir(`${outputRoot}/pages`, { recursive: true });

const pages = rows.map((row) => {
  const body = tiptapDocumentSchema.parse(JSON.parse(row.body_json));
  const path = `/${row.slug}.html`;
  const file = `${row.slug.replaceAll("/", "--")}.json`;
  const page: ExportPage = {
    capture: row.source_capture ?? "",
    description: row.summary,
    file,
    hero: row.hero_media_id ? `/api/media/${row.hero_media_id}` : null,
    html: renderArticleBody(body),
    kind: row.kind,
    labels: JSON.parse(row.labels_json) as string[],
    path,
    published: row.published_at
      ? new Date(row.published_at).toISOString()
      : null,
    section: row.section,
    source: row.source_url ?? "",
    title: row.title,
  };
  return page;
});
await Promise.all(
  pages.map((page) =>
    writeFile(`${outputRoot}/pages/${page.file}`, `${JSON.stringify(page)}\n`)
  )
);
const catalog = pages.map(({ html: _html, ...entry }) => entry);
await writeFile(`${outputRoot}/catalog.json`, `${JSON.stringify(catalog)}\n`);
process.stdout.write(
  `Exported ${rows.length} canonical Lithuanian records to ${outputRoot}\n`
);
