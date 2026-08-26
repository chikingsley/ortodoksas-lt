# Ortodoksas Studio

Ortodoksas Studio is the independent editorial application for the publication. It contains the editor-facing TanStack Start application, Cloudflare Worker runtime, D1 content database, and R2 media boundary. The public Astro website remains a separate consumer of published content.

## Current foundation

- TanStack Start and Router on React 19 and Vite 8
- The official Cloudflare Vite plugin and Workers Static Assets
- TanStack Query for server-state ownership
- TanStack Form with Zod validation for editorial metadata
- TanStack Table for inventory pagination and row identity
- Clerk authentication with a server-enforced editor allowlist
- D1 schema managed with Drizzle and SQL migrations
- R2 media binding
- Tiptap JSON as the canonical article-body format
- Shared Tiptap extensions for editing and static rendering
- Zod validation at every mutation boundary
- Current shadcn components backed by Base UI
- Ultracite and Biome for formatting and linting
- Worker-runtime tests through Cloudflare's Vitest integration

## Commands

```sh
pnpm dev
pnpm check
pnpm build
pnpm deploy:dry-run
pnpm deploy:dry-run:production
pnpm db:migrate:local
pnpm cf-typegen
```

`pnpm dev` uses local Cloudflare binding storage. The tracked `wrangler.jsonc` is the source of truth for development and production. Its ID-free D1 and R2 bindings use Wrangler's automatic provisioning contract, which preserves their link to the existing production Worker during deployment. `pnpm deploy` builds and deploys that configuration directly.

Local Clerk configuration belongs in `.dev.vars`. Production uses Wrangler secrets for `CLERK_SECRET_KEY` and `CLERK_ALLOWED_USER_IDS`; `VITE_CLERK_PUBLISHABLE_KEY` remains the public browser key.

Studio exposes a staff sign-in flow. Production Clerk configuration uses Restricted sign-up mode, and administrators create or invite accounts through Clerk before adding their user IDs to the Worker allowlist. This keeps identity enrollment with Clerk and editorial authorization with Studio.

## Project boundaries

- `src/routes` contains the file-based application routes and the explicit raw media routes. TanStack Router's `_studio.tsx` pathless layout owns the shared authentication and authorization guard without adding a URL segment; `__root.tsx` owns the document shell, and `$articleId` marks a dynamic parameter.
- `src/server` contains authenticated TanStack server functions and request-boundary coordination.
- `src/editorial/articles/editor` contains the focused article editor and its article-details panel.
- `src/editorial/articles/inventory` contains article and page catalog tables, grouping, filters, and creation actions.
- `src/editorial/homepage` contains homepage placement queries and composition.
- `src/editorial/shell` contains Studio navigation and route-level workspace coordination.
- `src/editorial/auth` and `src/editorial/shared` contain the sign-in screen and cross-feature editorial controls.
- `src/components/tiptap-*` contains the copied official Tiptap Simple Editor kit. Its component-scoped SCSS styles define editor nodes, toolbars, menus, theme tokens, and editor animations; Vite compiles them into the lazy editor bundle while `src/styles/globals.css` owns the surrounding Studio application.
- `worker/services` contains framework-neutral article, homepage, translation, and media operations.
- `worker/db.ts` owns the Drizzle D1 adapter.
- `../../packages/content` contains contracts shared by both applications.
- `../../packages/editor` contains the shared Tiptap schema and renderer.
- `../../packages/db` contains the Drizzle schema and D1 migration history.
- Worker specs under `worker` run inside workerd with the real Wrangler configuration. The public Astro app carries its corresponding emitted-Worker checks under `../web/worker`.
- React and Node-domain tests live beside their source under `src`. Shared editor tests live in `../../packages/editor`; D1 migration tests live beside the SQL under `../../packages/db/migrations`.

The current implementation provides automatic article-quality checks, semantic Tiptap figures, D1 article persistence, optimistic revision conflicts, restore-as-new-version history, R2 media uploads, translation state, homepage placement, and publication verification. Each Tiptap extension corresponds to content present in the publication corpus.

All editorial mutations pass through Clerk authentication, the server-side allowlist, and TanStack Start CSRF middleware. Raw media delivery stays under `/api/media/:id`; the remaining application reads and writes use typed server functions.

## Media and editorial history

R2 stores immutable original image bytes under content-addressed keys. D1 stores the SHA-256 digest, dimensions, MIME type, R2 key, and stable media ID used by articles. Figure provenance preserves source-derived alt text and caption evidence. Migration `0012_blogger_content_cleanup.sql` retired the temporary source-URL columns and media-alias table after every runtime figure moved to its stable media ID. Delivery through `/api/media/:id` supports responsive widths and AVIF/WebP negotiation through Cloudflare Images while preserving the original object.

Each article stores an editorial baseline alongside the editable canonical document. D1 keeps the current field-level difference, and every revision created by this Studio captures the complete versioned article state. Imported legacy revisions retain their exact body, title, summary, status, slug, language, and hero-presentation history; Studio labels them as partial and uses current values for fields the legacy system never recorded. Figure attributes identify source, generated, manual, or missing alt text and captions.
