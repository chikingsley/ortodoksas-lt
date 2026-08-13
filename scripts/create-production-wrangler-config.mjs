import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const LOCAL_D1_DATABASE_ID = "00000000-0000-0000-0000-000000000000";
const LOCAL_MEDIA_BUCKET_NAME = "ortodoksas-media-local";
const LOCAL_STUDIO_AUTHORIZED_PARTIES =
  "http://localhost:5173,http://127.0.0.1:5173,https://ortodoksas-studio.grassinside.com";
const PRODUCTION_STUDIO_AUTHORIZED_PARTY =
  "https://ortodoksas-studio.grassinside.com";
const D1_DATABASE_ID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/u;
const R2_BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u;

const databaseId = process.env.ORTODOKSAS_D1_DATABASE_ID?.trim();
const mediaBucketName = process.env.ORTODOKSAS_MEDIA_BUCKET_NAME?.trim();
const clerkPublishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
const studioWriteMode =
  process.env.ORTODOKSAS_STUDIO_WRITE_MODE?.trim() ?? "open";

if (!(databaseId && D1_DATABASE_ID_PATTERN.test(databaseId))) {
  throw new Error(
    "ORTODOKSAS_D1_DATABASE_ID must contain the production D1 database UUID"
  );
}
if (!(mediaBucketName && R2_BUCKET_NAME_PATTERN.test(mediaBucketName))) {
  throw new Error(
    "ORTODOKSAS_MEDIA_BUCKET_NAME must contain the production R2 bucket name"
  );
}

const projectDirectory = process.cwd();
const sourcePath = path.join(projectDirectory, "wrangler.jsonc");
const targetPath = path.join(projectDirectory, "wrangler.production.jsonc");
const source = await readFile(sourcePath, "utf8");
const isStudioConfiguration = source.includes('"name": "ortodoksas-studio"');
if (isStudioConfiguration && !clerkPublishableKey?.startsWith("pk_")) {
  throw new Error(
    "VITE_CLERK_PUBLISHABLE_KEY must contain the Clerk publishable key for the Studio production build"
  );
}
if (isStudioConfiguration && !["frozen", "open"].includes(studioWriteMode)) {
  throw new Error(
    "ORTODOKSAS_STUDIO_WRITE_MODE must contain either frozen or open"
  );
}
const productionConfig = source
  .replaceAll(LOCAL_D1_DATABASE_ID, databaseId)
  .replaceAll(LOCAL_MEDIA_BUCKET_NAME, mediaBucketName)
  .replaceAll(
    LOCAL_STUDIO_AUTHORIZED_PARTIES,
    PRODUCTION_STUDIO_AUTHORIZED_PARTY
  )
  .replace(
    '"STUDIO_WRITE_MODE": "open"',
    `"STUDIO_WRITE_MODE": "${studioWriteMode}"`
  )
  .replaceAll('"remote": false', '"remote": true');

if (productionConfig === source) {
  throw new Error(`Local binding placeholders are absent from ${sourcePath}`);
}

await writeFile(targetPath, productionConfig, { mode: 0o600 });
process.stdout.write(`Created ${targetPath}\n`);
