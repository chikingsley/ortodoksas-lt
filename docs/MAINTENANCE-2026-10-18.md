# Maintenance verification - 18 October 2026

This release bounds D1 reads for the public publication and authenticated editorial apps, and upgrades the application and developer toolchain.

## Database behavior

- Published slug, translation-group, recent-date, section/date, hero/date and editorial-update indexes support the actual lookup and list queries.
- Homepage selectors load bounded candidates and selected hero metadata. RSS emits the latest 50 articles. OBL's institutional homepage and news pages use bounded queries.
- Transactional triggers maintain one publication revision and compact language/section/month counts. Draft, publication, deletion and directory/media edits invalidate cached output through the revision.
- Public responses and archive facets use named Cloudflare caches for five minutes, keyed by content revision. Every public cache lookup reads one D1 revision row. Authenticated requests, APIs, framework assets and responses carrying cookies or private cache policy bypass the public response cache.
- The editorial catalogue authenticates before reading its separate cache. Cached JSON is validated with Zod. Client queries stay fresh for 30 seconds. All HTTP responses from Studio retain private, no-store cache policy.
- Filtered archive searches retain their existing semantics; full-text search continues to use the existing FTS5 index. Distinct searches and deep archive offsets have query costs; the repeated full-catalogue work on ordinary page views is removed.

## Toolchain

Ultracite 8.0.1 uses Oxlint 1.88.0, Oxfmt 0.73.0 and type-aware checks. The anti-slop, React, Vitest, TanStack and shadcn presets are enabled. The shadcn generator belongs to development dependencies. Astro 7.4, its Cloudflare/React adapters, React 19.3, TanStack, Tiptap 3.32, Wrangler 4.151 and Vitest 5 are upgraded. Web TypeScript stays on 6.0.3 to satisfy @astrojs/check's peer range; Studio and shared packages use TypeScript 7.0.2.

Cloudflare tests use @cloudflare/vitest-plugin and cloudflare:workers bindings. Studio media handlers read the typed Worker environment directly. Directory pages use discriminated data and validated locale selection.

## Lint migration

Run pnpm lint for formatting and the zero-new-findings gate; pnpm lint:strict prints the complete preset findings. lint-baseline.json records the existing source backlog by file, rule, diagnostic, source-line fingerprint and count. A changed finding or additional occurrence fails the gate. New maintenance modules pass the complete preset. Existing generated Tiptap components retain their prior vendor boundary. Worker integration assertions retain .spec filenames and a 30-assertion budget. Migration scripts keep their existing Node test runner.

The baseline captures 1008 existing findings exposed by the stronger presets. These include UI styling, older type assertions and React conventions. Shrink the recorded entries as those lines are repaired; retain the gate for new work. Full type checks, builds and runtime tests remain required independently.

## Verification and operations

The release gate is pnpm check, including package tests, generated binding checks, Astro/TypeScript checks, React tests, production builds, Worker integration tests, the browser-bundle secret boundary and Wrangler dry runs. Runtime read-budget tests use 3,000 articles and verify indexed costs, repeated cache hits, immediate edit invalidation, authorization bypass, HEAD handling and archive summaries.

Before live migration, ordinary D1 tables were exported privately, restored locally, checked for integrity and foreign-key consistency, and exercised with the additive migration. The FTS5 schema and seed SELECT were preserved separately and the index was rebuilt in the restored copies. Cloudflare's full-database export rejects virtual tables. Temporary recovery copies are removed after live verification.

Both publication review sites use their existing grassinside.com Worker Custom Domains. The editorial Workers keep public routes and workers.dev access disabled. Official domain cutover remains a separate release step. Use an ignored account-specific deployment config with the existing resource bindings. Review the resulting routes before deploying.

The old esbuild transitive development dependency is overridden to 0.28.2. braces 3.0.3 now has a pinned pnpm patch for GHSA-vfj7-8cjw-p6xm. The patch bounds parser nesting and each recursive AST walker at 256 levels. Regression tests cover 3,000 nested braces, parentheses, direct syntax trees, ordinary alternatives, ranges, and nested groups. The advisory-specific audit exception accounts for this local fix; the lockfile pins the patch hash. Replace the patch and exception when a verified upstream release incorporates the fix.

## Official references

- [Ultracite presets](https://www.ultracite.ai/docs/presets) and [OXC provider](https://www.ultracite.ai/providers/oxlint)
- [Oxlint type-aware checks](https://oxc.rs/docs/guide/usage/linter/type-aware)
- [Cloudflare Vitest migration](https://developers.cloudflare.com/workers/testing/vitest-integration/migration-guides/migrate-to-vitest-plugin/) and [test APIs](https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/)
- [Cloudflare cache behavior](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [D1 export limitations](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [TanStack server entry](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point)
- [Braces upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)

## Live measurements and release result

The initial read-budget migration preserved all article, publication-group, media and revision counts. Integrity checks passed. The complete pnpm check gate passed on both repositories, including 212 Vitest tests across them and OBL source-migration tests. Both production dependency audits report zero vulnerabilities.

| Live D1 operation                  | Rows read |
| ---------------------------------- | --------: |
| Revision point lookup              |         1 |
| Missing published slug             |         0 |
| Latest 20 article metadata records |        40 |
| One translation group              |         2 |
| Complete month summary             |       914 |

The previous Ortodoksas full Lithuanian catalogue query read 4,928 rows. The public cache hit path executes the one-row revision lookup. Live OBL checks confirmed MISS followed by HIT for its homepage, news and missing-page responses. An injected lint violation was rejected by both migration gates.

## Review follow-up: write budgets

Archive-count triggers now update the affected edition or publication group and skip unchanged publication metadata. Translation-source, translation-target, hero-media and homepage-article indexes also bound reference checks. With 3,000 articles and 300 archive buckets, article unpublishing and deletion, group reclassification and empty-group deletion each stay within 50 rows read. The earlier article deletion read 6,019 rows. Multilingual group reclassification and restoration preserve the archive totals. Both live databases received these additive migrations with unchanged summary data.
