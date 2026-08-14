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

The duplicate query returns an empty result set. Record the complete pending-migration list in the release log. This release includes `0007_legacy_revision_provenance.sql`, `0008_wide_human_torch.sql`, `0009_red_vin_gonzales.sql`, and `0010_article_search_fts.sql`. Migration `0007` marks imported revisions as partial. Migration `0008` creates normalized publication groups plus the people and community directories, migrates the twelve clergy profiles from their five localized page bodies, and seeds the nine community records with five localizations each. Migration `0009` adds the database foreign key from every article to its publication group. Migration `0010` creates the FTS5 article-search index, backfills it from every article, and installs synchronization triggers for future inserts, updates, and deletes.

Run the directory preflight against the same production database:

```sh
pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB \
  --remote \
  --config wrangler.production.jsonc \
  --command "SELECT language, COUNT(*) AS clergy_pages FROM articles WHERE translation_group_id = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f' GROUP BY language; SELECT articles.language, COUNT(*) AS portrait_refs FROM articles, json_tree(articles.body_json) AS node WHERE articles.translation_group_id = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f' AND node.type = 'object' AND json_extract(node.value, '$.type') = 'figure' AND json_extract(node.value, '$.attrs.mediaId') IS NOT NULL GROUP BY articles.language;"
```

The first result contains one clergy page for each of `lt`, `en`, `ru`, `uk`, and `be`. The second result contains twelve portrait references for each language. Save both result sets beside the database export; they are the source-data evidence for the deterministic directory migration.

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

Read the bookmark JSON and copy its bookmark value into the release log. The SQL export provides a durable audit artifact beyond D1's Time Travel retention window. Capture this export before applying `0010`: D1 export currently excludes databases that contain virtual tables. Later recovery captures can use Time Travel directly or a maintenance procedure that drops and recreates the derived `articles_fts` table around the export.

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

Verify the revision provenance, normalized directories, publication groups, referential integrity, and active homepage layout after the migration:

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

pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB \
  --remote \
  --config wrangler.production.jsonc \
  --command "SELECT COUNT(*) AS people FROM people; SELECT language, COUNT(*) AS localizations FROM person_localizations GROUP BY language ORDER BY language; SELECT COUNT(*) AS communities FROM communities; SELECT language, COUNT(*) AS localizations FROM community_localizations GROUP BY language ORDER BY language; SELECT kind, page_template, COUNT(*) AS groups FROM publication_groups GROUP BY kind, page_template ORDER BY kind, page_template; PRAGMA foreign_key_check;"

pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB \
  --remote \
  --config wrangler.production.jsonc \
  --command "INSERT INTO articles_fts(articles_fts) VALUES('integrity-check'); SELECT COUNT(*) AS indexed_matches FROM articles_fts WHERE articles_fts MATCH 'ortodoks*';"
```

The provenance query reports imported history as `legacy_partial`; revisions created after the TanStack Studio release report `complete`. The directory query reports twelve people and twelve localizations in each language, nine communities and nine localizations in each language, and an empty foreign-key result. The publication-group totals reconcile exactly to the distinct `translation_group_id` values in `articles`. The FTS integrity command completes successfully and the representative term returns matches. The stale-placement count returns zero, and the layout query returns one `primary` row.

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
