# Ortodoksas Studio

Ortodoksas Studio is the independent editorial application for the publication. It contains the editor-facing React application, Cloudflare Worker API, D1 content database, and R2 media boundary. The public website remains a separate consumer of published content.

## Current foundation

- React 19 and Vite 8 with the official Cloudflare Vite plugin
- Cloudflare Worker API routed with Hono
- D1 schema managed with Drizzle and SQL migrations
- R2 media binding
- Tiptap JSON as the canonical article-body format
- Shared Tiptap extensions for editing and static rendering
- Zod API validation
- Current shadcn components backed by Base UI
- Ultracite and Biome for formatting and linting
- Worker-runtime tests through Cloudflare's Vitest integration

## Commands

```sh
pnpm dev
pnpm check
pnpm build
pnpm db:migrate:local
pnpm cf-typegen
pnpm media:import --upload --verify
pnpm media:import --seed
pnpm studio:up
pnpm studio:status
pnpm studio:down
```

`studio:up` starts a supervised local preview and exposes its stable Peacockery Tunnel. The service uses a transient user unit with login autostart disabled. `studio:down` removes the route and stops the preview together.

## Project boundaries

- `src` contains the editor-facing React application.
- `worker` contains API routes, data access, publishing, conversion, and media operations.
- `../../packages/content` contains contracts shared by both applications.
- `../../packages/editor` contains the shared Tiptap schema and renderer.
- `../../packages/db` contains the Drizzle schema and D1 migration history.
- `test` runs inside the Workers runtime with the real Wrangler configuration.

The first implementation phase establishes corpus fixtures, automatic article-quality checks, semantic Tiptap figures, article persistence, revisions, media uploads, and publishing behavior. Each Tiptap extension corresponds to content observed in the publication archive.

## Media and provenance

R2 stores immutable original image bytes under content-addressed keys. D1 stores the SHA-256 digest, dimensions, MIME type, archive source, aliases, and the stable media ID used by articles. Delivery through `/api/media/:id` supports responsive widths and AVIF/WebP negotiation through Cloudflare Images while preserving the original object.

The archive importer runs in three resumable phases. `--upload` hashes each local file before sending it, `--verify` downloads every object and compares its digest, and `--seed` writes media records and URL aliases after verification succeeds. The recovered local library remains the source backup.

Each imported article stores an immutable pristine conversion baseline alongside the editable canonical document. D1 keeps the current field-level difference, revisions keep the complete save history, and figure attributes identify source, generated, manual, or missing alt text and captions. Missing source captions remain missing until an editor or an explicit generation step supplies one.
