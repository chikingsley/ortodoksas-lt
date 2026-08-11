# Component architecture worklist

This is the implementation checklist for the public publication UI. A checked item has a shared owner, a documented contract, and a passing rendered build.

## Shared shell

- [x] `PublicationHeader` owns the masthead, language state, desktop navigation, and mobile sheet.
- [x] `NavigationMenu` and `Sheet` come from generated shadcn/Base UI source primitives in `apps/web/src/components/ui`.
- [x] `SiteHeader.astro` is the server boundary and passes `currentPath`, `locale`, and resolved locale destinations into the hydrated header.
- [x] `DESIGN.md` owns colors, type, spacing, borders, active-state, and boundary rules.
- [x] Astro routes and `SiteHeader.astro` are the sole public shell; the superseded Vite/TanStack entrypoint, duplicate Astro navigation components, and orphaned header CSS are removed.
- [x] `SiteFooter` and `PublicationHeader` render the same `InstitutionalMarks` component and optical-height contract.

## Public surfaces

- [x] Homepage: `Homepage` composes the shared shell, service band, lead/supporting story cards, archive rail, section groups, and library callout from reusable publication components and a tested view model.
- [x] Archive: shared shell, archive controls, and `ArchiveList` rows.
- [ ] Archive pagination: bound the initial render and retain filter state across pages.
- [x] Search: shared shell, query control, result rows, and empty states.
- [x] Article: shared shell, article header, media, body, and translation disclosure.
- [x] Localized routes: shared shell and active-state contracts for LT, EN, RU, UK, and BE.

## Data and validation

- [x] Keep locale UI copy in the client-safe `locale-ui.ts` boundary.
- [x] Locale URLs use explicit prefixes (`/`, `/en`, `/ru`, `/uk`, `/be`); language links preserve an equivalent article path when that counterpart exists and fall back to the edition home otherwise.
- [x] `hreflang` links are emitted only for equivalent, actually available pages; empty language shells do not receive invented article alternates.
- [x] Keep canonical article/media data separate from presentation components.
- [ ] Add visual acceptance screenshots for desktop, mobile, and the open mobile sheet for each migrated surface.
- [x] Run Ultracite, TypeScript, tests, media-integrity checks, `git diff --check`, and a static deployment dry run.

## Rules for each next slice

1. Reuse an existing primitive or add one under `components/ui` before styling a new control.
2. Give each surface one owner component and keep route files as composition boundaries.
3. Record the rendered screenshot and validation result before marking an item complete.

## Tailwind migration

- [x] Archive toolbar: standard shadcn/Base UI InputGroup, Select, and Combobox primitives with component-owned Tailwind layout.
- [ ] Public shell and navigation: move remaining layout selectors from `index.css` into the owning Astro and React components.
- [ ] Homepage editorial surfaces: move grids, story cards, service band, archive rail, and library callout into component-owned Tailwind classes.
- [ ] Search and article surfaces: replace raw control styling and remaining page selectors with shared primitives and component-owned Tailwind classes.
- [ ] Reduce `index.css` to Tailwind/shadcn imports, brand tokens, font faces, base element defaults, and genuinely global accessibility behavior.
- [ ] Capture desktop and mobile screenshots after every surface migration and compare them with the approved visual baseline.
