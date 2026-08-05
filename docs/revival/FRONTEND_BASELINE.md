# Frontend Baseline and Refinement Contract

## Baseline

The accepted starting point is commit `b653179` with tag `checkpoint-before-ui-hardening`. The rejected follow-up pass is preserved in Git stash `rejected UI pass before checkpoint restoration 2026-08-05`.

The baseline passes `pnpm check` and generates 2,389 pages. Its institutional masthead, green and gold palette, editorial typography, homepage hierarchy, and brand asset pack remain the incumbent visual system. Refinement work preserves those strengths and changes one verified problem at a time.

## Visual Evidence

Restored application captures:

- [Homepage, desktop](../../.impeccable/review/restored-baseline/home-desktop.png)
- [Homepage, phone](../../.impeccable/review/restored-baseline/home-mobile.png)
- [Article, desktop](../../.impeccable/review/restored-baseline/article-desktop.png)
- [Article, phone](../../.impeccable/review/restored-baseline/article-mobile.png)
- [Archive opening, desktop](../../.impeccable/review/restored-baseline/archive-desktop-viewport.png)
- [Archive opening, phone](../../.impeccable/review/restored-baseline/archive-mobile-viewport.png)
- [Russian edition, desktop](../../.impeccable/review/restored-baseline/russian-desktop.png)
- [Russian edition, phone](../../.impeccable/review/restored-baseline/russian-mobile.png)

Reference captures:

- [Plough, desktop](../../.impeccable/review/benchmarks/plough-desktop-viewport.png)
- [Plough, phone](../../.impeccable/review/benchmarks/plough-mobile-viewport.png)
- [Public Orthodoxy, desktop](../../.impeccable/review/benchmarks/public-orthodoxy-desktop-viewport.png)
- [Public Orthodoxy, phone](../../.impeccable/review/benchmarks/public-orthodoxy-mobile-viewport.png)

Plough is the benchmark for decisive editorial hierarchy, image scale, readable measures, and breathing room. Public Orthodoxy is the benchmark for visible Orthodox identity, multilingual context, compact article discovery, and institutional credibility. Ortodoksas keeps its own supplied marks, green and gold palette, Playfair and Arimo typography, Lithuanian content, and archive.

## Current Product Shape

| Surface               | Current state                                                            |
| --------------------- | ------------------------------------------------------------------------ |
| Lithuanian            | 2,345 articles and 19 standalone pages                                   |
| Russian               | Six recovered articles                                                   |
| Ukrainian             | Six recovered articles                                                   |
| English               | Edition shell with zero recovered articles                               |
| Belarusian            | Edition shell with zero recovered articles                               |
| Build                 | 2,389 generated pages                                                    |
| Archive               | All 2,345 Lithuanian articles rendered into one client-filtered document |
| Brand assets          | 28 image assets and supplied fonts under `public/assets`                 |
| Historical media      | 5,820 remote runtime references and two embedded data images             |
| Lithuanian media set  | 5,752 unique remote URLs across hero and body content                    |
| Historical media host | Wayback supplies virtually the entire recovered corpus                   |

The locale states represent three distinct products: a complete Lithuanian archive, limited Russian and Ukrainian collections, and empty English and Belarusian shells. Navigation and page copy must communicate those states directly.

The complete archive currently produces a 306,940-pixel desktop document and a 421,836-pixel phone document. Pagination or bounded result loading is a functional requirement ahead of visual polish.

## Verified Baseline Findings

- The restored homepage has a coherent desktop lead story, authentic institutional assets, useful practical-service navigation, and zero horizontal overflow at 1440 and 390 pixels.
- Seven of 27 homepage images failed during one browser audit because Wayback returned unusable image data. The same URLs succeeded during a later direct check, confirming intermittent delivery as the failure mode.
- Eighteen image-only story links have empty accessible names because the linked images use empty `alt` text.
- The phone menu trigger, locale links, and section actions fall below the 44-pixel interaction target.
- Adjacent content sections each own large padding, creating doubled vertical gaps between some homepage regions.
- The archive month links all lead to the generic archive route instead of a prefiltered month.
- Sixty-seven empty Lithuanian hero records have candidates in older captures. A further 381 Lithuanian routes and two Ukrainian routes require editorial sourcing or removal.
- The brand pack contains the exact Exarchate lockup, an official Patriarchate emblem, Canva source references, extracted motifs, fonts, tokens, and provenance notes. A newly generated transparent Exarchate lockup remains a candidate asset until its derivation is recorded.

## Current Code Topology

```text
src/
├── components/
│   ├── archive/
│   │   ├── ArchiveList.astro
│   │   └── ArchivePanel.astro
│   ├── layout/
│   │   ├── SiteFooter.astro
│   │   └── SiteHeader.astro
│   ├── media/
│   │   └── EditorialImage.astro
│   ├── publication/
│   │   ├── ArticleCard.astro
│   │   ├── LeadStory.astro
│   │   ├── PageIntro.astro
│   │   ├── SectionHeader.astro
│   │   └── StoryRow.astro
│   └── ui/
│       ├── button.tsx
│       └── card.tsx
├── layouts/
│   └── SiteLayout.astro
├── lib/
│   ├── content.ts
│   ├── homepage.ts
│   ├── publication.ts
│   └── utils.ts
└── pages/
    ├── index.astro
    ├── archyvas.astro
    ├── paieska.astro
    ├── [...path].astro
    ├── [locale].astro
    ├── [locale]/[...path].astro
    └── tema/[slug].astro
```

ShadCN is already configured through `components.json`, backed by Base UI, Tailwind CSS variables, Lucide icons, and the `@/components/ui` alias. Static publication rendering remains Astro-first. React islands belong only to controls that require client state.

## Target Component Boundaries

The first restructuring pass moves existing behavior without changing its appearance. One `CatalogEntry` content record supplies every publication component. `LeadStory`, `StoryRow`, and `ArticleCard` are presentation roles rather than separate article types.

```text
src/components/
├── ui/                  # copied ShadCN/Base UI primitives only
├── layout/              # SiteHeader, SiteFooter, publication shell
├── publication/         # ArticleCard, StoryRow, LeadStory, SectionHeader
├── archive/             # ArchiveFilters, ArchiveResults, Pagination
└── media/               # EditorialImage and verified media rendering
```

| Current boundary                                      | State   | Rule                                                              |
| ----------------------------------------------------- | ------- | ----------------------------------------------------------------- |
| `components/layout/SiteHeader.astro`                  | Moved   | One masthead and locale-navigation implementation                 |
| `components/layout/SiteFooter.astro`                  | Moved   | One footer implementation with locale-specific copy               |
| `components/publication/ArticleCard.astro`            | Moved   | One reusable card rendering for a `CatalogEntry`                   |
| `components/publication/LeadStory.astro`              | Added   | Homepage lead placement for the same article model                 |
| `components/publication/StoryRow.astro`               | Added   | Supporting, compact, and section-row presentation variants         |
| `components/publication/SectionHeader.astro`          | Added   | One section-title and destination-link boundary                    |
| `components/archive/ArchiveList.astro`                | Added   | Shared archive, category, and localized-edition result rendering   |
| `components/archive/ArchiveFilters.tsx` and pagination | Pending | Base UI or ShadCN controls with bounded, shareable results          |
| `components/media/EditorialImage.astro`               | Added   | One accessible responsive rendering path; manifest enforcement follows |

Editorial cards remain publication components because their hierarchy and content rules are product-specific. Buttons, fields, selects, sheets, dialogs, separators, and similar interaction foundations belong in `components/ui`.

## Media Contract

The current recovered records retain remote Wayback image URLs. Article captures show several unavailable remote images as empty bordered boxes. The recovery system must convert every published image reference into a verified media record before the renderer consumes it.

Each record needs:

```text
original URL
canonical asset key
checksum
MIME type
pixel dimensions
alt text
delivery status
```

The recovery order is:

1. Download each unique source URL once.
1. Validate image bytes, MIME type, dimensions, and checksum.
1. Deduplicate identical files.
1. Generate the required responsive variants.
1. Write a deterministic media manifest.
1. Render only manifest-backed media.
1. Fail the media gate when a promoted story, article image, or required social image lacks a verified asset.

Storage follows measurement. The recovery pass will report unique decoded bytes and derivative volume. A repository-compatible corpus can use static assets; a larger corpus can use R2 behind same-origin `/media/*` URLs. This decision follows the measured corpus instead of assumption.

Current brand assets stay under `public/assets/brand`. Their provenance and production/reference distinction already exist and should remain intact.

## Refinement Sequence

1. **Media integrity:** recover a representative article completely, establish the manifest and validation contract, then scale the same process across the corpus.
1. **Archive bounds:** add pagination or bounded loading while preserving search, section, year, and shareable query parameters.
1. **Mechanical component organization:** move shared code into the target folders with visual screenshot parity.
1. **Homepage spacing:** compare the restored homepage with Plough and Public Orthodoxy, then adjust one group of spacing and sizing tokens.
1. **Article reading:** remove broken media states, set a deliberate reading measure, and verify long recovered articles on desktop and phone.
1. **Locale states:** define full, limited, and empty edition presentations and test each with real content counts.
1. **Final system documentation:** update `DESIGN.md` only after the verified implementation establishes the accepted rules.

## Acceptance for Every Pass

Each pass has one named problem and one bounded change set. Completion requires:

- Before and after desktop captures at 1440 × 1000.
- Before and after phone captures at 390 × 844.
- Homepage, representative article, archive, and affected locale coverage.
- `pnpm check` success.
- Zero broken rendered image references in the affected scope.
- Keyboard-visible focus and 44-pixel interactive targets.
- Zero horizontal overflow at 320, 390, 768, 1024, and 1440 pixels.
- A short written verdict stating what improved, what stayed fixed, and the next single problem.

This sequence keeps the existing identity visible, makes ShadCN serve the interaction layer, and prevents architectural cleanup, media recovery, and visual refinement from becoming one uncontrolled rewrite.
