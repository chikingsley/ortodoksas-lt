import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { tiptapDocumentSchema } from "@ortodoksas-lt/content/article";
import { renderArticleBody } from "@ortodoksas-lt/editor/render";

const execFileAsync = promisify(execFile);
const outputRoot = process.env.CANONICAL_CONTENT_DIR ?? ".canonical-content";
const wrangler = "node_modules/.bin/wrangler";
const config = "wrangler.jsonc";
const localizedPagePrefix = /^pages\//u;

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
  translation_group_id: string;
  translation_kind: "human" | "machine" | "original";
  translation_review_status:
    | "approved"
    | "changes_requested"
    | "not_required"
    | "pending";
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
  translationGroupId: string;
  translationKind: Row["translation_kind"];
  translationReviewStatus: Row["translation_review_status"];
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
  "SELECT body_json, hero_media_id, kind, labels_json, language, published_at, section, source_capture, source_url, summary, title, slug, translation_group_id, translation_kind, translation_review_status FROM articles WHERE status = 'published' ORDER BY published_at DESC"
);

await rm(outputRoot, { force: true, recursive: true });
const pageFromRow = (row: Row, localized = false) => {
  const body = tiptapDocumentSchema.parse(JSON.parse(row.body_json));
  const path = `/${row.slug}.html`;
  const fileName = `${row.slug.replaceAll("/", "--")}.json`;
  const page: ExportPage = {
    capture: row.source_capture ?? "",
    description: row.summary,
    file: localized ? `pages/${fileName}` : fileName,
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
    translationGroupId: row.translation_group_id,
    translationKind: row.translation_kind,
    translationReviewStatus: row.translation_review_status,
  };
  return page;
};

const writeEdition = async (language: string, localized: boolean) => {
  const editionRoot = localized
    ? `${outputRoot}/locales/${language}`
    : outputRoot;
  const pagesRoot = `${editionRoot}/pages`;
  await mkdir(pagesRoot, { recursive: true });
  const pages = rows
    .filter((row) => row.language === language)
    .map((row) => pageFromRow(row, localized));
  await Promise.all(
    pages.map((page) =>
      writeFile(
        `${pagesRoot}/${page.file.replace(localizedPagePrefix, "")}`,
        `${JSON.stringify(page)}\n`
      )
    )
  );
  const catalog = pages.map(({ html: _html, ...entry }) => entry);
  await writeFile(
    `${editionRoot}/catalog.json`,
    `${JSON.stringify(catalog)}\n`
  );
  return pages.length;
};

const editions = [
  ["lt", false],
  ["en", true],
  ["ru", true],
  ["uk", true],
  ["be", true],
] as const;
const editionCounts = await Promise.all(
  editions.map(
    async ([language, localized]) =>
      [language, await writeEdition(language, localized)] as const
  )
);
const counts = new Map(editionCounts);
process.stdout.write(
  `Exported ${rows.length} canonical records (${[...counts.entries()]
    .map(([language, count]) => `${language}:${count}`)
    .join(", ")}) to ${outputRoot}\n`
);
