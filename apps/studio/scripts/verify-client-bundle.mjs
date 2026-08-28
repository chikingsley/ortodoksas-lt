import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const MAX_CLIENT_CHUNK_BYTES = 500_000;
const MAX_LAZY_EDITOR_CHUNK_BYTES = 850_000;
const assetsDirectory = path.resolve("dist/client/assets");
const assetNames = await readdir(assetsDirectory);
const javaScriptAssets = assetNames.filter((name) => name.endsWith(".js"));
const clientChunks = await Promise.all(
  javaScriptAssets.map(async (name) => ({
    name,
    size: (await stat(path.join(assetsDirectory, name))).size,
  }))
);
const oversizedChunks = clientChunks
  .filter((asset) => {
    const limit = asset.name.startsWith("editorial-rich-text-editor-")
      ? MAX_LAZY_EDITOR_CHUNK_BYTES
      : MAX_CLIENT_CHUNK_BYTES;
    return asset.size > limit;
  })
  .map((asset) => `${asset.name} (${asset.size} bytes)`);

if (oversizedChunks.length > 0) {
  throw new Error(
    `Studio client chunks exceed the ${MAX_CLIENT_CHUNK_BYTES}-byte budget: ${oversizedChunks.join(
      ", "
    )}`
  );
}

const staticImportPattern = /\bimport[^;]*?from["']\.\/([^"']+)["']/gu;
const sideEffectImportPattern = /(?:^|;)\s*import["']\.\/([^"']+)["']/gu;
const applicationEntryPattern = /^index-.*\.js$/u;
const communityEntryPattern = /^_studio\.communities-.*\.js$/u;
const editorChunkPattern = /^editorial-rich-text-editor-.*\.js$/u;
const sourceCache = new Map();

const getStaticImports = async (assetName) => {
  if (sourceCache.has(assetName)) {
    return sourceCache.get(assetName);
  }
  const source = await readFile(path.join(assetsDirectory, assetName), "utf8");
  const imports = new Set();
  for (const pattern of [staticImportPattern, sideEffectImportPattern]) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      imports.add(match[1]);
    }
  }
  sourceCache.set(assetName, imports);
  return imports;
};

const collectStaticGraph = async (pending, visited = new Set()) => {
  const nextAssets = pending.filter(
    (assetName) =>
      javaScriptAssets.includes(assetName) && !visited.has(assetName)
  );
  if (nextAssets.length === 0) {
    return visited;
  }
  for (const assetName of nextAssets) {
    visited.add(assetName);
  }
  const importedAssets = await Promise.all(nextAssets.map(getStaticImports));
  return collectStaticGraph(
    importedAssets.flatMap((assets) => [...assets]),
    visited
  );
};

const assertEditorLoadsLazily = async (entryName, label) => {
  const graph = await collectStaticGraph([entryName]);
  const editorAssets = [...graph].filter((name) =>
    editorChunkPattern.test(name)
  );
  if (editorAssets.length > 0) {
    throw new Error(
      `${label} eagerly loads the rich-text editor: ${editorAssets.join(", ")}`
    );
  }
};

const applicationEntries = javaScriptAssets.filter((name) =>
  applicationEntryPattern.test(name)
);
if (applicationEntries.length !== 1) {
  throw new Error(
    `Expected one Studio client entry, found ${applicationEntries.length}`
  );
}
await assertEditorLoadsLazily(applicationEntries[0], "Studio entry");

const communityEntries = javaScriptAssets.filter((name) =>
  communityEntryPattern.test(name)
);
if (communityEntries.length !== 1) {
  throw new Error(
    `Expected one Communities route chunk, found ${communityEntries.length}`
  );
}
await assertEditorLoadsLazily(communityEntries[0], "Communities route");
