# Ortodoksas Revival Work Plan

This file is the authoritative delivery plan. The orchestrator owns task status
and gate acceptance. Work agents may produce scoped implementation and evidence;
review agents assess a gate independently.

## Status Model

`queued -> active -> evidence-ready -> review -> accepted`

## Escalation

- A failed review returns exact findings to the same work session.
- A second failed review transfers the task to a stronger agent with the prior
  evidence and findings attached.
- A fresh reviewer grades every resubmission.
- One writer owns each shared file at a time.

## G0: Recovery Lock

Status: `evidence-ready`

Objective: classify and preserve every Wayback record currently exposed for the
Lithuanian, Russian, Ukrainian, Belarusian, and English properties.

Exit criteria:

- Every CDX record is represented in a capture index.
- Every unique internal URL has a deterministic recovery status.
- Every accessible distinct payload is stored and SHA-256 hashed.
- Identical captures are deduplicated by payload hash.
- Divergent historical versions remain separately addressable.
- Posts, pages, feeds, sitemaps, labels, monthly indexes, fonts, images, audio,
  video, documents, CSS, and embedded resources are inventoried.
- Internal-link discovery reaches closure with zero newly discovered URLs.
- Every inaccessible record includes its URL, timestamp, response, and reason.
- The coverage report reconciles the existing LT corpus, two failed captures,
  all four additional language editions, and all media-count discrepancies.

Evidence:

- `recovery/manifests/{lt,ru,uk,be,en}.jsonl`
- `recovery/reports/coverage.md`
- `recovery/reports/unresolved.jsonl`

## G1: Content Model and Routes

Status: `accepted`

Exit criteria:

- Original `.html` paths remain canonical for Lithuanian content.
- Locale relationships distinguish authentic editions from translations.
- Recovered labels, authors, dates, and permanent pages use validated schemas.
- Every recovered content item maps to exactly one generated route.
- Redirect, canonical, and historical-path maps are complete.

## G2: Visual Calibration

Status: `accepted`

Exit criteria:

- Homepage and article prototypes use real recovered content.
- Desktop captures exist at 1440px and 768px.
- Mobile captures exist at 390px and 320px.
- Typography uses real font files and declared weights.
- The recovered logo, crimson identity, and source-backed hierarchy are present.
- Simon accepts the direction before full template expansion.

## G3: Publication Templates

Status: `accepted`

Exit criteria:

- Home, article, permanent page, category, archive, search, locale, and 404
  templates are complete.
- Article reading requires zero client-side JavaScript.
- Navigation and search remain usable at 320px.
- Long titles, malformed legacy markup, missing media, embeds, and unusual
  Unicode render coherently.

## G4: Media and Localization

Status: `accepted`

Exit criteria:

- Archived media is local, hashed, provenance-tracked, and resumable.
- Responsive derivatives and deterministic fallbacks exist.
- The original logo has a faithful SVG master and raster/favicon derivatives.
- Authentic locale content is preserved separately from generated translation.
- Generated translation records source hash, model, date, and review state.
- Language navigation and `hreflang` represent available counterparts only.
- Simon accepts the translation publication policy.

## G5: CMS and Publishing

Status: `evidence-ready`

Selected baseline: Decap CMS with GitHub and a Cloudflare Worker OAuth proxy.

Exit criteria:

- The stack uses open-source software and zero recurring paid services.
- A client can sign in, create, preview, revise, publish, and unpublish an article.
- Multilingual fields and editorial workflow operate through the CMS UI.
- Publishing merges content to Git and triggers a Cloudflare Workers build.
- A failed build preserves the previous production deployment.
- Simon or the client completes the publishing acceptance exercise.

## G6: Production Acceptance

Status: `evidence-ready`

Exit criteria:

- Route coverage, internal links, search, locales, redirects, feeds, sitemaps,
  robots, canonical metadata, structured data, accessibility, and performance
  gates pass.
- Representative desktop and mobile routes receive rendered inspection.
- Deployment and rollback are exercised.
- Simon approves domain cutover.

## Acceptance Record: 2026-08-04

- Astro generated 2,389 pages: 2,364 historical Lithuanian routes, 12
  authentic Russian/Ukrainian article routes, and publication utility pages.
- Exact historical `.html` URLs return `200` without canonicalizing to
  extensionless paths.
- Desktop 1440px and mobile 390px/320px renders passed visual inspection.
- The 320px localized article render has zero horizontal overflow.
- Search, archive HTML, locale navigation, images, `/original.html`, Decap's
  login surface, sitemap, RSS, robots, Worker aliases, and 404 behavior are
  present in the accepted build.
- `pnpm check` passed, including lint, generated binding checks, TypeScript,
  React and Worker tests, the 2,389-page build, and Wrangler dry run.
- The retained Wrangler preview is active at
  `https://ortodoksas.grassinside.com` with login autostart disabled.
- CMS publication acceptance awaits repository-specific GitHub OAuth secrets.
- GitHub OAuth now completes through the Cloudflare Worker handshake. Decap's
  multilingual editor created Lithuanian and English variants, saved a draft,
  revised it, moved it through Ready, merged pull request `#1`, and deleted the
  published acceptance entry through the CMS UI.
- The temporary publication generated exact Lithuanian and English `/e/*.html`
  routes, appeared in archive, search, RSS, sitemap, and locale navigation, and
  passed rendered desktop/mobile inspection before the unpublish exercise.
- The CMS acceptance content was removed by Decap commit
  `b9b42cf2a280357c7eb7d3391cfef9cbee259075`; the publication remains clean.
- A production GitHub-to-Cloudflare build connection remains part of the domain
  cutover gate. The retained Wrangler preview rebuild path is accepted.
- Production domain cutover remains an explicit external release action.
- G0's capture index covers all 46,540 exposed CDX records. The publication
  corpus is recovered; exhaustive byte mirroring remains queued for 44,995
  historical digest variants and is tracked separately in
  `recovery/reports/payload-coverage.md`.
