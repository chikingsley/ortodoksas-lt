import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const MAX_CLIENT_CHUNK_BYTES = 500_000;
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
  .filter((asset) => asset.size > MAX_CLIENT_CHUNK_BYTES)
  .map((asset) => `${asset.name} (${asset.size} bytes)`);

if (oversizedChunks.length > 0) {
  throw new Error(
    `Studio client chunks exceed the ${MAX_CLIENT_CHUNK_BYTES}-byte budget: ${oversizedChunks.join(
      ", "
    )}`
  );
}
