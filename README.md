# ortodoksas.lt

One pnpm workspace contains the public publication, its editorial Studio, and
the shared content system.

## Workspace

- `apps/web` — Astro public site and Cloudflare Worker delivery layer.
- `apps/studio` — React/Vite editorial interface and Cloudflare Worker API.
- `packages/content` — canonical article contracts and media URL handling.
- `packages/editor` — shared Tiptap schema, rendering, provenance, and quality gates.
- `packages/db` — Drizzle schema and immutable D1 migrations.
- `scripts/content` — resumable migration into canonical D1 records.
- `scripts/recovery` — archive and media recovery utilities.

Both apps use the same D1 database and R2 media bucket. D1 stores one article
model, its pristine conversion baseline, current field-level changes, revision
history, and homepage placements. R2 stores immutable media objects.

## Commands

```sh
pnpm install
pnpm check
pnpm dev:web
pnpm dev:studio
pnpm articles:import -- --dry-run
```

Ultracite/Biome owns formatting and linting. TypeScript owns type checking.
React tests run under Vitest, and Worker tests run inside Cloudflare's workerd
runtime with the real Wrangler configuration.
