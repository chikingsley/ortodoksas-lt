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

## Styling boundaries

- [x] Public presentation uses `apps/web/src/styles/globals.css` for Tailwind/shadcn imports, publication tokens, fonts, and base behavior.
- [x] Studio uses `apps/studio/src/styles/globals.css` for Tailwind/shadcn imports, newsroom tokens, Geist, and base form behavior.
- [x] Public and Studio globals stay separate because their typography, radius, and surface contracts differ.
- [x] Feature layout lives beside its owning Astro or React component as Tailwind utilities.
- [x] Tiptap keeps its upstream component-scoped SCSS inside the editor component tree.
- [x] The superseded Studio `index.css` and CSS-migration evidence bundle are removed after validation.
- [ ] Capture desktop and mobile screenshots for each public surface after the next visual change.

## Studio composition

- [x] `ArticleInventory` owns article filtering and pagination; its workspace header owns the new-article action.
- [x] `HomepageWorkspace` owns homepage placement loading, selection, and saving in a dedicated navigation state.
- [x] Inventory presentation is divided into `InventoryPanel` and `ArticleRow`; homepage composition uses `HomepageLayoutPanel`.
- [x] Studio navigation exposes only complete Articles and Homepage destinations.
- [x] `ArticleEditor` owns loading, persistence, preview state, revision restore, and translation transitions.
- [x] Editor presentation is divided into header, document, inspector, and dialog components.
- [x] Reusable controls come from generated shadcn/Base UI primitives under `apps/studio/src/components/ui`.
- [x] Domain components remain under `apps/studio/src/editorial`; they compose primitives rather than duplicating primitive behavior.
