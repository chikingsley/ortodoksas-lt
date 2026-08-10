# ortodoksas.lt

One pnpm workspace contains the public publication, its editorial Studio, and
the shared content system.

## Workspace

- `apps/web` — Astro public site and Cloudflare Worker delivery layer.
- `apps/studio` — React/Vite editorial interface and Cloudflare Worker API.
- `packages/content` — canonical article contracts and media URL handling.
- `packages/editor` — shared Tiptap schema, rendering, provenance, and quality gates.
- `packages/db` — Drizzle schema and immutable D1 migrations.

Both apps use the same D1 database and R2 media bucket. D1 is the canonical
source for articles, editorial baselines, field-level changes, revision history,
and homepage placements. R2 is the canonical source for media objects.

The historical crawl and migration evidence lives in the public
[`chikingsley/ortodoksas-lt-source-archive`](https://huggingface.co/datasets/chikingsley/ortodoksas-lt-source-archive)
dataset. Generated D1 exports and local media mirrors stay outside Git and the
Cloudflare asset bundle. Git retains the compact media manifest, assignment,
and unavailable-source registries that validate R2-backed rendering. The
ignored local `recovery/` directory is the upload staging copy and can be
removed after the public dataset has been verified.

## Commands

```sh
pnpm install
pnpm check
pnpm dev:web
pnpm dev:studio
```

Ultracite/Biome owns formatting and linting. TypeScript owns type checking.
React tests run under Vitest, and Worker tests run inside Cloudflare's workerd
runtime with the real Wrangler configuration.
