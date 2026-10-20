# Dependency review: October 20, 2026

This review refreshed the official npm registry metadata for every direct dependency and compared the installed versions after a frozen-lockfile installation. Both workspaces use strict peer dependency validation; the former Ortodoksas Vite wildcard waiver has been removed.

## Updated releases

| Package                     | Version |
| --------------------------- | ------- |
| @shadcn/lint                | 0.2.3   |
| oxfmt                       | 0.74.0  |
| oxlint                      | 1.89.0  |
| @astrojs/cloudflare         | 14.4.1  |
| lucide-react                | 1.60.0  |
| @astrojs/check              | 0.9.11  |
| @cloudflare/vitest-plugin   | 1.4.6   |
| astro                       | 7.4.1   |
| wrangler                    | 4.151.3 |
| @clerk/tanstack-react-start | 1.7.4   |
| @clerk/ui                   | 1.41.0  |
| @tanstack/react-query       | 5.104.5 |

Ultracite 8.0.1, Tiptap 3.32.0 and Vite 8.3.4 remain current in this registry snapshot. Web uses TypeScript 6.0.3 because @astrojs/check 0.9.11 declares support for TypeScript 5 and 6. Studio and the shared tooling use TypeScript 7.0.2. This is a supported-version boundary recorded explicitly in the manifests.

The ten exact release-age exceptions in pnpm-workspace.yaml cover this explicitly requested update, including the new releases' transitive dependencies. The default 24-hour age gate continues to apply to ordinary future package updates. Expired version exceptions were removed. Existing narrowly scoped Vite, TanStack router and braces patches remain required by their current upstream versions. The braces advisory exception accompanies the local security patch and its regression tests.

The new Oxlint release required six mechanical corrections: global replacements now use replaceAll, and a test's type assertion throws TypeError. Lint rules and warning enforcement remain strict.

## Copied editor source

All 93 Tiptap registry responses were fetched again and compared with the original raw registry responses. Their file contents match. The 160 source manifest entries retain the existing included and excluded decisions.

TIPTAP-SOURCE.json now records the raw registry content hash as upstreamSha256, the exact raw upstreamPath, and the prior normalized import baseline separately as adaptedBaselineSha256. This corrects provenance bookkeeping while preserving the editor implementation. The verified date records this fresh source comparison.

## Validation

Both complete pnpm check suites passed after the upgrades, covering lint, formatting, type checks, security regressions, release-evidence tests, package tests, actual Worker integration tests, builds and deployment dry runs. Frozen-lockfile installations and production dependency audits passed with the documented patched advisory exception. Wrangler binding types were regenerated and match the checked-in types.

Live deployment versions, CPU evidence and full sitemap results for this dependency release are recorded below after deployment. The earlier incident and the required CPU acceptance procedure remain in CPU-2026-10-20.md.
