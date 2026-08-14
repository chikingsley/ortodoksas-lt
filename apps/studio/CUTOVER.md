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

The duplicate query returns an empty result set. Record the complete pending-migration list in the release log. The migration chain includes `0007_legacy_revision_provenance.sql` through `0012_blogger_content_cleanup.sql`. Migration `0007` marks imported revisions as partial. Migration `0008` creates normalized publication groups plus the people and community directories, migrates the twelve clergy profiles from their five localized page bodies, and seeds the nine community records with five localizations each. Migration `0009` enforces the article-to-publication-group relationship with D1 triggers. This preserves restrict-style referential integrity within D1's per-request CPU budget and avoids rebuilding the production article table. Migration `0010` creates the FTS5 article-search index, backfills it from every article, and installs synchronization triggers for future inserts, updates, and deletes. Migration `0011` backfills translation review state, canonical baselines, and complete readiness revisions. Migration `0012` canonicalizes internal publication links across current bodies, baselines, and revisions; replaces every alias-backed historical figure with its media ID; removes raw import metadata from revision snapshots; and retires the Blogger source columns and media-alias table behind constraint gates.

Run the directory preflight against the same production database:

```sh
pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB \
  --remote \
  --config wrangler.production.jsonc \
  --command "SELECT language, COUNT(*) AS clergy_pages FROM articles WHERE translation_group_id = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f' GROUP BY language; SELECT articles.language, COUNT(*) AS portrait_refs FROM articles, json_tree(articles.body_json) AS node WHERE articles.translation_group_id = 'edf497f7-11c8-4c2f-8fa5-c975fb4dbd2f' AND node.type = 'object' AND json_extract(node.value, '$.type') = 'figure' AND json_extract(node.value, '$.attrs.mediaId') IS NOT NULL GROUP BY articles.language;"

pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB \
  --remote \
  --config wrangler.production.jsonc \
  --file ../../packages/db/preflight/0008_directory_source.sql
```

The first result contains one clergy page for each of `lt`, `en`, `ru`, `uk`, and `be`. The second result contains twelve portrait references for each language. The semantic report contains exactly sixty rows, shows the expected person beside each localized display name and media ID, and reports `valid` for every row. Save all three result sets beside the database export and review the semantic report before the maintenance window. Migration `0008` repeats these structural and non-empty semantic checks as a database constraint before it creates directory tables or changes source bodies.

## 3. Capture the database recovery point

First deploy the release candidate in maintenance mode. This activates the
server-enforced write gate for article saves, revision restores, translation
creation, homepage changes, and media uploads. Schedule the database export as
a maintenance window: a running D1 export blocks other requests to the database,
including database-backed public-site and Studio reads.

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
  --output "$ORTODOKSAS_BACKUP_DIR/schema.sql" \
  --no-data \
  --skip-confirmation

for table_name in \
  d1_migrations homepage_layout_state homepage_placements media_assets \
  media_aliases translation_runs article_baselines article_content_changes \
  articles article_revisions
do
  pnpm --filter @ortodoksas-lt/studio exec wrangler d1 export DB \
    --remote \
    --config wrangler.production.jsonc \
    --output "$ORTODOKSAS_BACKUP_DIR/$table_name.sql" \
    --table "$table_name" \
    --no-schema \
    --skip-confirmation
done

sha256sum "$ORTODOKSAS_BACKUP_DIR"/*.json \
  "$ORTODOKSAS_BACKUP_DIR"/*.sql \
  > "$ORTODOKSAS_BACKUP_DIR/SHA256SUMS"
sha256sum --check "$ORTODOKSAS_BACKUP_DIR/SHA256SUMS"
```

Read the bookmark JSON and copy its bookmark value into the release log. The table-split SQL export stays within D1's execution budget and provides a durable audit artifact beyond D1's Time Travel retention window. The source archive captured before `0010` remains the durable raw Blogger recovery corpus. Later recovery points use Time Travel plus release-specific inventories, or a maintenance procedure that drops and recreates the derived `articles_fts` table around a fresh export.

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
  --command "SELECT COUNT(*) AS people FROM people; SELECT language, COUNT(*) AS localizations FROM person_localizations GROUP BY language ORDER BY language; SELECT COUNT(*) AS communities FROM communities; SELECT language, COUNT(*) AS localizations FROM community_localizations GROUP BY language ORDER BY language; SELECT kind, page_template, COUNT(*) AS groups FROM publication_groups GROUP BY kind, page_template ORDER BY kind, page_template; SELECT COUNT(*) AS publication_group_triggers FROM sqlite_master WHERE type = 'trigger' AND name IN ('articles_translation_group_before_insert', 'articles_translation_group_before_update', 'publication_groups_restrict_delete', 'publication_groups_restrict_id_update'); SELECT COUNT(*) AS orphaned_article_groups FROM articles AS article LEFT JOIN publication_groups AS publication_group ON publication_group.id = article.translation_group_id WHERE publication_group.id IS NULL; PRAGMA foreign_key_check;"

pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB \
  --remote \
  --config wrangler.production.jsonc \
  --command "INSERT INTO articles_fts(articles_fts) VALUES('integrity-check'); SELECT (SELECT COUNT(*) FROM articles) AS article_rows, (SELECT COUNT(*) FROM articles_fts) AS indexed_rows; SELECT COUNT(*) AS articles_missing_from_fts FROM articles LEFT JOIN articles_fts ON articles_fts.rowid = articles.rowid WHERE articles_fts.rowid IS NULL; SELECT COUNT(*) AS fts_rows_missing_from_articles FROM articles_fts LEFT JOIN articles ON articles.rowid = articles_fts.rowid WHERE articles.rowid IS NULL; SELECT COUNT(*) AS indexed_matches FROM articles_fts WHERE articles_fts MATCH 'ortodoks*';"

pnpm --filter @ortodoksas-lt/studio exec wrangler d1 execute DB \
  --remote \
  --config wrangler.production.jsonc \
  --command "SELECT COUNT(*) AS legacy_article_columns FROM pragma_table_info('articles') WHERE name IN ('source_article_id', 'source_capture', 'source_html', 'source_url'); SELECT COUNT(*) AS legacy_media_columns FROM pragma_table_info('media_assets') WHERE name = 'source_url'; SELECT COUNT(*) AS legacy_alias_tables FROM sqlite_master WHERE type = 'table' AND name = 'media_aliases'; SELECT COUNT(*) AS unresolved_revision_figures FROM article_revisions, json_tree(article_revisions.body_json) AS node WHERE node.type = 'object' AND json_extract(node.value, '$.type') = 'figure' AND json_extract(node.value, '$.attrs.mediaId') IS NULL AND json_extract(node.value, '$.attrs.src') LIKE 'http%'; SELECT COUNT(*) AS unresolved_baseline_figures FROM article_baselines, json_tree(article_baselines.body_json) AS node WHERE node.type = 'object' AND json_extract(node.value, '$.type') = 'figure' AND json_extract(node.value, '$.attrs.mediaId') IS NULL AND json_extract(node.value, '$.attrs.src') LIKE 'http%';"
```

The provenance query reports imported history as `legacy_partial`; revisions created after the TanStack Studio release report `complete`. The directory query reports twelve people and twelve localizations in each language, nine communities and nine localizations in each language, four publication-group integrity triggers, zero orphaned article groups, and an empty foreign-key result. The publication-group totals reconcile exactly to the distinct `translation_group_id` values in `articles`. The FTS article and index counts match, both two-way rowid checks return zero, the integrity command completes successfully, and the representative term returns matches. The stale-placement count returns zero, and the layout query returns one `primary` row. The Blogger cleanup query reports zero legacy columns, zero alias tables, zero unresolved revision figures, and twenty-one explicitly unresolved baseline figures retained as historical evidence.

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

First deploy the release candidate with `ORTODOKSAS_STUDIO_WRITE_MODE=frozen`
and confirm the maintenance response. A code-only failure uses the recorded
pre-cutover version of the affected Worker.

A database rollback requires explicit production-write approval because D1 restores overwrite the database in place and cancel in-flight queries. Use the bookmark recorded in step 3:

Before restoring a pre-migration bookmark, roll both the public Worker and the
Studio Worker back to their recorded pre-cutover versions. Those versions use
the pre-migration schema. Keep Studio frozen and treat the public site as under
maintenance throughout the coordinated Worker rollback and D1 restore.

```sh
pnpm --filter @ortodoksas-lt/studio exec wrangler d1 time-travel restore DB \
  --bookmark "<pre-cutover-bookmark>" \
  --config wrangler.production.jsonc
```

Record the restore command's previous bookmark, which supports an undo restore.
Verify migration state, article counts, revision counts, media-record counts,
and the public homepage against the pre-cutover Workers before reopening
editorial writes. R2 media objects use immutable content-addressed keys, so the
database restore re-establishes the corresponding references while retained
upload orphans remain safe for later reconciliation.
