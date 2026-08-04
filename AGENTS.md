# Cloudflare web rules

- Use upstream Vite with the Cloudflare Vite plugin. The scaffold was generated
  by Vite+, but do not re-enable local Vite+ until its Worker-environment
  `resolve.external` behavior is compatible with Cloudflare's validation.
- Ultracite/Biome is the only formatter/linter. TypeScript owns type checking.
- Use current shadcn components backed by Base UI. Keep copied components in
  `src/components/ui`; application composition stays outside that directory.
- Deploy new sites with Workers Static Assets, not Pages. Keep API routes under
  `/api` and list them in `assets.run_worker_first` so SPA fallback cannot mask
  them.
- Use generated Wrangler binding types and rerun `pnpm cf:types` after config
  changes. Do not put secrets or real resource IDs in source.
- Keep React tests under `src` and Worker-runtime tests under `worker`. The
  Worker lane must use Cloudflare's Vitest pool and the real Wrangler config;
  Node-only tests are not proof that a Worker API works in workerd.
- Run `pnpm check` before handoff. Build and dry-run results do not prove a
  deployment, custom domain, browser flow, or live binding.
