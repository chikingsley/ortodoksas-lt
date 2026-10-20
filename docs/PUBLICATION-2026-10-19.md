# Publication release review: October 19, 2026

The release fixes public editorial artifacts, mobile navigation, locale output and runtime failures on https://ortodoksas.grassinside.com. The official ortodoksas.lt Blogger site continues under its existing hosting arrangement.

## Public presentation

Ortodoksas keeps its official logo, burgundy branding and white page background. Images retain their original proportions with transparent surrounds. Supporting article headlines remain complete. The shared header uses Astro and a native dialog; the compact menu covers widths below 768px. Menu open, close, Escape, focus return and background scroll locking were checked in the browser.

Simon's final October 19 instruction removes public translation-status footers and empty-date placeholders. Exact standalone source translation annotations are omitted from rendered bodies. Source text and translation provenance remain available accurately in the CMS. Body-level h1 elements become h2 so the page owns one primary heading. Available dates stay visible; Belarusian dates and archive month names render in Belarusian on Cloudflare Workers.

## Runtime and database fixes

A complete crawl exposed CPU-limit failures on uncached pages. The shared Tiptap renderer now prepares immutable extension mappings and its schema once per Worker isolate. Its output matched the upstream renderer across all 2,880 stored Ortodoksas editions. Total local rendering time fell from 1,946ms to 474ms. The header and footer share their navigation query, and date formatters are reused.

Localized links now use indexed path-only queries in batches of ninety source paths. This repairs four translated Daily Bread directories containing 230 links, which exceeded D1's 100-bound-parameter limit. A real Worker test covers 105 source links. The join order keeps the indexed source slug lookup first; six navigation paths read 24 D1 rows. Public cache hits continue to read one revision row.

The account plan and current domains are preserved. See Cloudflare's [CPU limits](https://developers.cloudflare.com/workers/platform/limits/) and [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).

## Repository organization and verification

Root and Studio scripts directories were cleared. Lint-baseline and braces security checks live in tests; browser-bundle checks live in apps/studio/tests. Existing package commands invoke explicit test runners. The zero-new-findings lint gate remains enforced with its existing backlog recorded.

The full repository check passed, followed by the complete web check for the final public changes. The web suite includes 33 unit tests and 16 Worker integration tests, production builds, type checks and deployment dry runs. Layout checks cover all five home editions at eight widths from 320px to 1440px. Physical iOS and Android checks remain a separate device-validation step.

The originating task's feedback directory contains the complete public crawls, per-page issues, rendering comparison, layout measurements, screenshots, navigation read-budget proof and Worker execution outcomes. The OBL companion review is documented in that repository's docs/FEEDBACK-2026-10-19.md.

## Final release evidence

October 20 correction: the successful HTTP and execution-outcome checks below established availability during their samples. Measured uncached CPU still exceeded the free HTTP allowance. The runtime correction and stronger acceptance criteria are recorded in [CPU-2026-10-20.md](CPU-2026-10-20.md).

The final complete crawl returned HTTP 200 with complete page markup for all 568 OBL editions and all 2,880 Ortodoksas editions. The public presentation checks passed for page language, one primary heading, omitted empty dates and editorial labels. A scan match inside an article discussing misleading information was reviewed as substantive source content and preserved.

All 136 layout cases passed: 96 OBL cases and 40 Ortodoksas cases across eight widths, including 68 phone-width cases. The latest Ortodoksas live log sample contains 327 successful executions and zero CPU-limit failures; the complete 2,880-page HTTP crawl independently passed. OBL's final web check passed 37 unit tests and 24 Worker tests. Ortodoksas passed 33 unit tests and 16 Worker tests.

Detailed results are retained in the originating task's feedback directory: obl-production-release-audit.json, orto-production-release-audit.json, obl-release-layout.txt, orto-release-layout.txt, orto-production-cpu-proof.json, belarusian-services-live-proof.json and acceptance.json.
