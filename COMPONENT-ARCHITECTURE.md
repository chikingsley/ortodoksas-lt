# Component architecture worklist

This is the implementation checklist for the public publication UI. A checked item has a shared owner, a documented contract, and a passing rendered build.

## Shared shell

- [x] `PublicationHeader` owns the masthead, language state, desktop navigation, and mobile sheet.
- [x] `NavigationMenu` and `Sheet` come from generated shadcn/Base UI source primitives in `apps/web/src/components/ui`.
- [x] `SiteHeader.astro` is the server boundary and passes only `currentPath` and `locale` into the hydrated header.
- [x] `DESIGN.md` owns colors, type, spacing, borders, active-state, and boundary rules.
- [ ] `SiteFooter` uses the same institutional mark contract as the masthead.

## Public surfaces

- [ ] Homepage: compose the shared shell, service links, lead/supporting story cards, archive rail, and library callout from reusable publication components.
- [ ] Archive: compose the shared shell, section controls, archive rows, and pagination from reusable primitives.
- [ ] Search: compose the shared shell, query control, result rows, and empty/error states from reusable primitives.
- [ ] Article: compose the shared shell, breadcrumb/context, article header, media, body, related stories, and share actions from reusable primitives.
- [ ] Localized routes: verify the same component contracts and active states for LT, EN, RU, UK, and BY.

## Data and validation

- [ ] Keep locale UI copy in the client-safe `locale-ui.ts` boundary.
- [x] Locale URLs use explicit prefixes (`/`, `/en`, `/ru`, `/uk`, `/be`); language links preserve an equivalent article path when that counterpart exists and fall back to the edition home otherwise.
- [x] `hreflang` links are emitted only for equivalent, actually available pages; empty language shells do not receive invented article alternates.
- [ ] Keep canonical article/media data separate from presentation components.
- [ ] Add visual acceptance screenshots for desktop, mobile, and the open mobile sheet for each migrated surface.
- [ ] Run Ultracite, TypeScript, `git diff --check`, and the static build for every surface migration.

## Rules for each next slice

1. Reuse an existing primitive or add one under `components/ui` before styling a new control.
2. Give each surface one owner component and keep route files as composition boundaries.
3. Record the rendered screenshot and validation result before marking an item complete.
