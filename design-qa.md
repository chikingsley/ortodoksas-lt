# Public publication QA

## Visual truth

- Client-approved burgundy reference: `/tmp/codex-remote-attachments/019fd18e-5856-7f33-b2b8-c54848887dc8/2E7A7133-524B-4CF1-BA4C-3C59DF2DDF1A/1-Pasted-Image-1.jpg`
- Reference comparison: `/tmp/ort-reference-comparison.png`
- Page matrix: `/tmp/ort-page-matrix.png`
- Locale matrix, desktop: `/tmp/ort-locale-matrix-1280.png`
- Locale matrix, mobile: `/tmp/ort-locale-matrix-390.png`
- Lithuanian homepage: `/tmp/ort-lt-home-desktop.png`, `/tmp/ort-lt-home-mobile.png`
- Archive: `/tmp/ort-archive-desktop-fixed.png`, `/tmp/ort-archive-mobile-fixed.png`
- Search: `/tmp/ort-search-desktop.png`, `/tmp/ort-search-mobile.png`
- English article: `/tmp/ort-en-article-desktop.png`, `/tmp/ort-en-article-mobile.png`

## Capture conditions

- Desktop: 1280 x 900 CSS pixels.
- Tablet: 780 x 900 CSS pixels.
- Mobile: 390 x 844 CSS pixels.
- Browser: canonical Kasm Browserless Chromium.
- Data: remote canonical D1 and R2 bindings through the local Astro server.

## Verified behavior

- Shared header, locale bar, primary navigation, footer, and active states render from one component path.
- Homepage composition remains stable at 1280, 780, and 390 pixels.
- The mobile supporting stories precede the service band and use one section heading for the subsequent publication grid.
- Homepage media resolves from R2; every checked image reported a positive natural width.
- Archive output is bounded to 20 articles per page, with 118 pages for the current 2,345-article corpus.
- Archive search and filters execute in D1 and retain paging parameters.
- Search renders six recent publications before a query and bounded result pages after a query.
- Translated articles use one lead image and one locale-specific canonical route.
- Every checked route reported zero horizontal overflow at 1280 and 390 pixels.
- Web validation passes formatting, Cloudflare binding types, Astro diagnostics, TypeScript, 19 tests, build, and Wrangler deploy dry-run.

## Open finding

- P1 data completeness: five homepage translation groups currently contain Lithuanian only. Their absence causes EN, RU, UK, and BE roots to choose a different lead and omit cards. The shared i18n route and component code preserves translation-group geometry once those 20 D1 counterparts exist.

## Final result

blocked by the five incomplete homepage translation groups
