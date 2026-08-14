# Media originals migration

This one-time tool moves existing R2 objects to the canonical immutable key
contract `media/originals/<sha256>.<ext>`. Studio uploads already use that
contract. Public and Studio reads continue to resolve the `r2_key` stored in D1,
so `archive/*` objects remain readable throughout the staged cutover.

The migration uses R2's S3-compatible `CopyObject` operation, then downloads
each destination and checks its byte count and SHA-256 digest. D1 changes happen
only after every destination has a verification receipt. Source deletion also
requires a fresh post-cutover D1 inventory and re-verifies both objects before
deleting the source.

## Credentials

Create a narrowly scoped R2 S3 API token for the production bucket. Keep these
values in the shell or the deployment secret store:

```sh
export R2_ACCOUNT_ID="..."
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
export R2_BUCKET_NAME="..."
```

The tool reads those four variables and never writes or prints them. The
manifest, receipts, checkpoints, D1 exports, and generated SQL belong in the
external cutover evidence directory. Store each artifact with mode `0600` and
hash the complete directory after every phase.

## Staged procedure

Run the inventory query while Studio writes are frozen. Wrangler emits JSON
that the manifest command accepts directly:

```sh
pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB --remote \
  --config wrangler.production.jsonc --json \
  --command "SELECT id, r2_key, sha256, mime_type, byte_size FROM media_assets ORDER BY id" \
  > "$ORTODOKSAS_BACKUP_DIR/media-before.json"

pnpm --filter @ortodoksas-lt/media-originals-migration migrate manifest \
  --inventory "$ORTODOKSAS_BACKUP_DIR/media-before.json" \
  --output "$ORTODOKSAS_BACKUP_DIR/media-manifest.json"

pnpm --filter @ortodoksas-lt/media-originals-migration migrate plan \
  --manifest "$ORTODOKSAS_BACKUP_DIR/media-manifest.json" \
  --output "$ORTODOKSAS_BACKUP_DIR/media-plan.json"
```

Copy and independently verify the canonical destinations. Both operations are
idempotent. The copy checkpoint records completed objects after each batch.

```sh
pnpm --filter @ortodoksas-lt/media-originals-migration migrate copy \
  --manifest "$ORTODOKSAS_BACKUP_DIR/media-manifest.json" \
  --checkpoint "$ORTODOKSAS_BACKUP_DIR/media-copy-checkpoint.json" \
  --concurrency 4

pnpm --filter @ortodoksas-lt/media-originals-migration migrate verify \
  --manifest "$ORTODOKSAS_BACKUP_DIR/media-manifest.json" \
  --output "$ORTODOKSAS_BACKUP_DIR/media-verification.json" \
  --concurrency 4
```

Generate the D1 cutover SQL from that exact manifest and receipt. The SQL uses
a temporary manifest table plus pre-update and post-update constraint gates. A
rerun accepts rows at either the source or destination key and updates only
source rows. It also removes redundant `/api/media/<id>` aliases; the canonical
route resolves media IDs directly. Migration `0012_blogger_content_cleanup.sql`
later canonicalizes recoverable historical figures and retires the source-alias
table after the recovery export is verified.

```sh
pnpm --filter @ortodoksas-lt/media-originals-migration migrate d1-sql \
  --manifest "$ORTODOKSAS_BACKUP_DIR/media-manifest.json" \
  --verification "$ORTODOKSAS_BACKUP_DIR/media-verification.json" \
  --output "$ORTODOKSAS_BACKUP_DIR/media-d1-cutover.sql"

pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB --remote \
  --config wrangler.production.jsonc \
  --file "$ORTODOKSAS_BACKUP_DIR/media-d1-cutover.sql"
```

Deploy and verify `/api/media/:id` reads against the destination keys. Then
capture the post-cutover inventory with the same query as `media-after.json`.
Source cleanup requires that exact D1 evidence, the verification receipt, an
explicit confirmation phrase, and a separate resumable checkpoint:

```sh
pnpm --filter @ortodoksas-lt/media-originals-migration migrate delete-source \
  --manifest "$ORTODOKSAS_BACKUP_DIR/media-manifest.json" \
  --verification "$ORTODOKSAS_BACKUP_DIR/media-verification.json" \
  --cutover-inventory "$ORTODOKSAS_BACKUP_DIR/media-after.json" \
  --checkpoint "$ORTODOKSAS_BACKUP_DIR/media-delete-checkpoint.json" \
  --confirm DELETE_VERIFIED_SOURCES \
  --concurrency 4
```

Hash and validate all evidence before reopening Studio writes. Retain the
manifest, verification receipt, D1 inventories, generated SQL, checkpoints,
database recovery bookmark, and pre-cutover database export with the release
record.
