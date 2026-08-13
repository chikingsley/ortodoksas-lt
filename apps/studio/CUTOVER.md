# Studio production cutover

This sequence promotes the TanStack Start Studio after the repository checks and production-data preflight pass.

## 1. Verify the release candidate

```sh
pnpm install --frozen-lockfile
pnpm --filter @ortodoksas-lt/studio cf-typegen
pnpm check
git diff --check
```

The generated binding types must match `wrangler.jsonc`. The Studio check covers the production client and Worker bundles, workerd integration tests, and adapter-neutral service tests.

## 2. Verify the release-migration preconditions

Load the production binding identifiers from the deployment secret store and create the ignored release configuration. The same command works in `apps/web` for a public-site release.

```sh
export ORTODOKSAS_D1_DATABASE_ID="<production-d1-uuid>"
export ORTODOKSAS_MEDIA_BUCKET_NAME="<production-r2-bucket>"
export VITE_CLERK_PUBLISHABLE_KEY="<clerk-publishable-key>"
pnpm --filter @ortodoksas-lt/studio config:production
```

The generated `wrangler.production.jsonc` has mode `0600` and stays outside source control. All remote commands below use this configuration.

```sh
pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB \
  --remote \
  --config wrangler.production.jsonc \
  --command "SELECT translation_group_id, language, COUNT(*) AS copies FROM articles GROUP BY translation_group_id, language HAVING COUNT(*) > 1 LIMIT 20"

pnpm --filter @ortodoksas-lt/studio exec wrangler d1 migrations list DB \
  --remote \
  --config wrangler.production.jsonc
```

The duplicate query returns an empty result set. For this release, the migration list shows `0006_equal_vanisher.sql` as applied and `0007_legacy_revision_provenance.sql` as pending. Migration `0006` adds homepage layout compare-and-swap state. Migration `0007` marks imported revisions as partial and removes migration-time values for fields the legacy revision format never recorded.

## 3. Capture the database recovery point

First deploy the release candidate in maintenance mode. This activates the
server-enforced write gate for article saves, revision restores, translation
creation, homepage changes, and media uploads while keeping editorial reads
available.

```sh
export ORTODOKSAS_STUDIO_WRITE_MODE="frozen"
pnpm --filter @ortodoksas-lt/studio deploy
```

Confirm an authenticated save receives HTTP `503` with
`Studio writes are paused for release maintenance`. Keep this frozen Worker
active through recovery capture, migration, and database verification.

Choose a backup directory outside the repository, record the current Time Travel bookmark in the release log, export the complete database, and hash the export.

```sh
export ORTODOKSAS_BACKUP_DIR="<absolute-backup-directory>"
mkdir -p "$ORTODOKSAS_BACKUP_DIR"

pnpm --filter @ortodoksas-lt/studio exec wrangler d1 time-travel info DB \
  --config wrangler.production.jsonc \
  --json > "$ORTODOKSAS_BACKUP_DIR/pre-cutover-bookmark.json"

pnpm --filter @ortodoksas-lt/studio exec wrangler d1 export DB \
  --remote \
  --config wrangler.production.jsonc \
  --output "$ORTODOKSAS_BACKUP_DIR/pre-cutover.sql"

sha256sum "$ORTODOKSAS_BACKUP_DIR/pre-cutover.sql" \
  > "$ORTODOKSAS_BACKUP_DIR/pre-cutover.sql.sha256"
```

Read the bookmark JSON and copy its bookmark value into the release log. The SQL export provides a durable audit artifact beyond D1's Time Travel retention window.

## 4. Configure production identity

Set the Clerk application to Restricted sign-up mode and invite or create each editor account through Clerk. Set the Clerk secret and approved editor IDs through Wrangler secrets. Load `VITE_CLERK_PUBLISHABLE_KEY` from the deployment secret store before every production build; Vite embeds this public browser key into the client bundle. Confirm the generated authorized-party list contains exactly the production Studio origin.

```sh
pnpm --filter @ortodoksas-lt/studio exec wrangler secret put CLERK_SECRET_KEY \
  --config wrangler.production.jsonc
pnpm --filter @ortodoksas-lt/studio exec wrangler secret put CLERK_ALLOWED_USER_IDS \
  --config wrangler.production.jsonc
```

## 5. Apply the D1 release migration

Production-write approval opens this step.

```sh
pnpm --filter @ortodoksas-lt/studio exec wrangler d1 migrations apply DB \
  --remote \
  --config wrangler.production.jsonc
```

Verify the revision provenance and active homepage layout after the migration:

```sh
pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB \
  --remote \
  --config wrangler.production.jsonc \
  --command "SELECT COALESCE(json_extract(metadata_json, '$.snapshotCompleteness'), 'unmarked') AS completeness, COUNT(*) AS revisions FROM article_revisions GROUP BY completeness"

pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB \
  --remote \
  --config wrangler.production.jsonc \
  --command "SELECT id, revision, updated_at FROM homepage_layout_state WHERE id = 'primary'"

pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB \
  --remote \
  --config wrangler.production.jsonc \
  --command "SELECT COUNT(*) AS stale_homepage_placements FROM homepage_placements AS placement INNER JOIN homepage_layout_state AS layout ON layout.id = 'primary' WHERE placement.layout_revision <> layout.revision"
```

The provenance query reports imported history as `legacy_partial`; revisions created after the TanStack Studio release report `complete`. The stale-placement count returns zero, and the layout query returns one `primary` row.

## 6. Deploy and verify

Reopen editorial writes by deploying the same verified release candidate with
the production write mode set to `open`.

```sh
export ORTODOKSAS_STUDIO_WRITE_MODE="open"
pnpm --filter @ortodoksas-lt/studio deploy
```

Verify these production paths:

1. A signed-out request reaches the Clerk sign-in screen.
1. A signed-in account outside the allowlist reaches the access-denied screen.
1. An approved editor can open the article and page inventories.
1. A draft save creates one complete revision snapshot and records the authenticated editor ID.
1. A stale save receives a conflict response and preserves the newest revision.
1. Restoring a complete v2 revision restores its body, metadata, hero settings, publication state, search metadata, and translation metadata as a new version. Restoring an imported `legacy_partial` revision restores its historical body, title, summary, status, language, slug, and hero fit/focal values while retaining the current values for fields absent from the legacy snapshot.
1. Approving a translation records the reviewer and current source hash; a later source edit returns the dependent translation to pending review.
1. A media upload writes one R2 object and one D1 media record; responsive delivery succeeds through `/api/media/:id`.
1. Two editors saving the homepage from the same revision produce one winner and one conflict; the winning lead and four supporting positions remain intact, and the feed follows reverse publication order automatically.
1. Publishing passes the quality gate and the public verification result resolves.

The previous deployed Worker version remains the immediate rollback target through Cloudflare version rollback. D1 revisions preserve editorial recovery after cutover.

## 7. Roll back a failed cutover

First deploy the release candidate with `ORTODOKSAS_STUDIO_WRITE_MODE=frozen`,
confirm the maintenance response, and roll the Studio Worker back to the
recorded pre-cutover version. A code-only failure ends here.

A database rollback requires explicit production-write approval because D1 restores overwrite the database in place and cancel in-flight queries. Use the bookmark recorded in step 3:

```sh
pnpm --filter @ortodoksas-lt/studio exec wrangler d1 time-travel restore DB \
  --bookmark "<pre-cutover-bookmark>" \
  --config wrangler.production.jsonc
```

Record the restore command's previous bookmark, which supports an undo restore. Verify migration state, article counts, revision counts, media-record counts, and the public homepage before reopening editorial writes. R2 media objects use immutable content-addressed keys, so the database restore re-establishes the corresponding references while retained upload orphans remain safe for later reconciliation.
