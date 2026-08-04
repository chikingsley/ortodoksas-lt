# Project Template

React web app built by Vite, styled with shadcn's Base UI Nova preset, and
deployed as Cloudflare Workers Static Assets with a small `/api` Worker surface.
Ultracite/Biome owns formatting and linting, and TypeScript 7 checks the app and
Worker projects directly.

Vitest has two explicit lanes: `test:react` runs React and pure TypeScript tests
in Node, while `test:worker` runs the Worker entrypoint inside workerd with the
bindings and compatibility settings from `wrangler.jsonc`.

```bash
pnpm install
pnpm cf:types
pnpm check
pnpm dev
pnpm deploy
```

Add shadcn components with `pnpm dlx shadcn@latest add <component>`. Add a
custom domain in `wrangler.jsonc` only when the production hostname is known.

This template was created with `vp create`, but it deliberately uses upstream
Vite locally: Vite+ 0.2.2 currently injects `resolve.external` into Worker
environments, which Cloudflare's Vite plugin 1.44 rejects. Re-evaluate that
boundary when either project documents compatibility; do not paper over it by
disabling Cloudflare's runtime validation.
