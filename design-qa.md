# Studio navigation and homepage QA

## Visual truth

- Source Articles screen: `apps/studio/audit/studio-navigation-2026-08-13/01-articles.png`
- Source Homepage control: `apps/studio/audit/studio-navigation-2026-08-13/07-homepage-layout.png`
- Implemented Articles screen: `apps/studio/audit/studio-simplified-2026-08-13/01-articles-desktop.png`
- Implemented Homepage workspace: `apps/studio/audit/studio-simplified-2026-08-13/02-homepage-desktop.png`
- Mobile Articles screen: `apps/studio/audit/studio-simplified-2026-08-13/03-articles-mobile.png`
- Mobile Homepage workspace: `apps/studio/audit/studio-simplified-2026-08-13/04-homepage-mobile.png`
- Reader-facing homepage: `apps/studio/audit/studio-simplified-2026-08-13/05-public-homepage-desktop.png`
- Articles comparison: `apps/studio/audit/studio-simplified-2026-08-13/comparison-articles.png`
- Homepage comparison: `apps/studio/audit/studio-simplified-2026-08-13/comparison-homepage.png`

## Capture conditions

- Desktop source and implementation: 1600 x 950 CSS pixels, 1600 x 950 image pixels, device scale factor 1.
- Mobile implementation: 390 x 844 CSS pixels, 390 x 844 image pixels, device scale factor 1.
- Browser: authenticated full-profile Kasm Chromium against the deployed production Studio.
- State: Articles inventory loaded; Homepage placements loaded with automatic selection; lead-story combobox opened and dismissed once.

## Full-view comparison

- The implementation intentionally replaces six sidebar labels with two working destinations and preserves the existing Studio tokens, Geist typography, control primitives, table density, and status colors.
- Articles now has one page heading, one primary action, one principal count, and a full-width inventory surface.
- Homepage now has a distinct selected navigation state, a page header, lead and supporting sections, working selectors, a public-homepage link, and the save action.
- The desktop implementation preserves the source table content and density while removing the duplicate description, title count, status counts, card radius, and embedded Homepage strip.

## Focused-region comparison

- Header: the Articles heading and New article action share one 76 px workspace bar; Homepage uses the same bar and action alignment.
- Navigation: desktop and mobile expose Articles and Homepage with `aria-current="page"` and a visible selected treatment.
- Controls: Homepage selectors use a consistent 40 px height; the save action stays aligned in the header.
- Table: Language retains enough width for language and translation-method badges before Section begins.
- Mobile: the three status tabs share one row, Homepage actions fit within 390 px, and both workspaces have zero horizontal overflow.

## Required fidelity surfaces

- Fonts and typography: Geist remains consistent with the source Studio; headings use one compact 24 px hierarchy and table type retains its established sizes and weights.
- Spacing and layout rhythm: one workspace header, 24 px inventory separation, 32 px Homepage section spacing, and consistent 16/24/42 px responsive gutters.
- Colors and visual tokens: existing shadcn semantic colors and selected-state treatment remain unchanged.
- Image quality: article thumbnails continue using the canonical media endpoint and retain sharp crops; the public homepage capture shows the production editorial imagery.
- Copy and content: duplicate archive prose and redundant counts are removed; Homepage guidance states the automatic and localized behavior directly.

## Interaction and runtime verification

- Desktop Articles to Homepage navigation passed.
- Mobile Articles to Homepage navigation passed.
- Lead-story combobox open and dismiss passed.
- Direct production public-homepage load passed.
- Browser page errors: zero.
- Browser console errors: zero.
- `pnpm check`: passed.

## Comparison history

1. First production pass found horizontal overflow in the 390 px Homepage header and a two-row status-tab layout. The public-homepage label was collapsed to an icon on mobile and the tabs were changed to three equal columns.
2. The second production capture shows both actions fully visible, all status tabs on one row, and zero horizontal overflow.

## Findings

No actionable P0, P1, or P2 findings remain. The dedicated Homepage workspace is intentionally sparse because it controls five placement decisions; the reader-facing result is available through the adjacent public-homepage action.

## Final result

passed
