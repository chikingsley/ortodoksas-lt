import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sanitizeRecoveredHtml } from "./lib/sanitize-recovered-html.mjs";

const root = new URL("../public/content", import.meta.url).pathname;
const pagesRoot = join(root, "pages");
const catalog = JSON.parse(await readFile(join(root, "catalog.json"), "utf8"));

function contentFile(path) {
  const readable = path.slice(1).replace(/\.html$/, "").replaceAll("/", "--");
  if (readable.length <= 180) return `${readable}.json`;
  return `${readable.slice(0, 150)}-${createHash("sha256").update(path).digest("hex").slice(0, 16)}.json`;
}

for (const entry of catalog) {
  const oldFile = entry.file;
  const newFile = contentFile(entry.path);
  const oldPath = join(pagesRoot, oldFile);
  const newPath = join(pagesRoot, newFile);
  const page = JSON.parse(await readFile(oldPath, "utf8"));
  page.html = sanitizeRecoveredHtml(page.html).replace(/href="https?:\/\/(?:www\.)?ortodoksas\.lt\//g, 'href="/');
  await writeFile(oldPath, `${JSON.stringify(page)}\n`);
  if (oldFile !== newFile) await rename(oldPath, newPath);
  entry.file = newFile;
}

const articles = catalog.filter((page) => page.kind === "article");
const standalonePages = catalog.filter((page) => page.kind === "page");
await writeFile(join(root, "catalog.json"), `${JSON.stringify(catalog)}\n`);
await writeFile(join(root, "home.json"), `${JSON.stringify([...standalonePages, ...articles.slice(0, 96)])}\n`);
