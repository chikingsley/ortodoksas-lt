import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import tiptapClasses from "../tiptap-classes.json" with { type: "json" };

await test("Studio client assets preserve size and secret boundaries", async () => {
  const MAX_CLIENT_CHUNK_BYTES = 500_000;
  const MAX_LAZY_EDITOR_CHUNK_BYTES = 850_000;
  const assetsDirectory = path.resolve("dist/client/assets");
  const assetNames = await readdir(assetsDirectory);
  const javaScriptAssets = assetNames.filter((name) => name.endsWith(".js"));

  const clientChunks = await Promise.all(
    javaScriptAssets.map(async (name) => {
      const { size } = await stat(path.join(assetsDirectory, name));

      return { name, size };
    })
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

  const staticImportPattern =
    /\bimport[^;]*?from["']\.\/(?<chunk>[^"']+)["']/gu;

  const sideEffectImportPattern =
    /(?:^|;)\s*import["']\.\/(?<chunk>[^"']+)["']/gu;

  const applicationEntryPattern = /^index-.*\.js$/u;
  const communityEntryPattern = /^_studio\.communities-.*\.js$/u;
  const editorChunkPattern = /^editorial-rich-text-editor-.*\.js$/u;
  /** @type {Map<string, Set<string>>} */
  const sourceCache = new Map();

  /** @param {string} assetName - Client asset filename. */
  const getStaticImports = async (assetName) => {
    const cached = sourceCache.get(assetName);

    if (cached) {
      return cached;
    }

    const source = await readFile(
      path.join(assetsDirectory, assetName),
      "utf-8"
    );

    /** @type {Set<string>} */
    const imports = new Set();

    for (const pattern of [staticImportPattern, sideEffectImportPattern]) {
      pattern.lastIndex = 0;

      for (const match of source.matchAll(pattern)) {
        const chunk = match.groups?.chunk;

        if (chunk !== undefined) {
          imports.add(chunk);
        }
      }
    }

    sourceCache.set(assetName, imports);

    return imports;
  };

  /** @param {string[]} pending - Assets awaiting traversal.
   * @param {Set<string>} visited - Assets already inspected.
   * @returns {Promise<Set<string>>} Transitive static import graph. */
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

    return await collectStaticGraph(
      importedAssets.flatMap((assets) => [...assets]),
      visited
    );
  };

  /** @param {string} entryName - Entry asset filename.
   * @param {string} label - Diagnostic name for the entry. */
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

  if (applicationEntries.length !== 1 || applicationEntries[0] === undefined) {
    throw new Error(
      `Expected one Studio client entry, found ${applicationEntries.length}`
    );
  }

  await assertEditorLoadsLazily(applicationEntries[0], "Studio entry");

  const communityEntries = javaScriptAssets.filter((name) =>
    communityEntryPattern.test(name)
  );

  if (communityEntries.length !== 1 || communityEntries[0] === undefined) {
    throw new Error(
      `Expected one Communities route chunk, found ${communityEntries.length}`
    );
  }

  await assertEditorLoadsLazily(communityEntries[0], "Communities route");
});

await test("Tiptap lint allowlist contains shipped CSS selectors", async () => {
  const assetsDirectory = path.resolve("dist/client/assets");
  const names = await readdir(assetsDirectory);

  const styles = await Promise.all(
    names
      .filter((name) => name.endsWith(".css"))
      .map(
        async (name) =>
          await readFile(path.join(assetsDirectory, name), "utf-8")
      )
  );

  const selectors = new Set(
    [...styles.join("\n").matchAll(/\.(?<name>[a-zA-Z][\w-]*)/gu)].map(
      (match) => match.groups?.name
    )
  );

  const missing = tiptapClasses.filter((name) => !selectors.has(name));

  if (missing.length > 0) {
    throw new Error(
      `Tiptap CSS allowlist has unshipped selectors: ${missing.join(", ")}`
    );
  }
});
