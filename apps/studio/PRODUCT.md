# Ortodoksas Studio

## Product purpose

Ortodoksas Studio is the staff editorial workspace for the `ortodoksas.lt` publication. Editors use one browser interface to find, edit, review, translate, preview, place, and publish every article in the archive.

## Users

- Approved publication editors

## Core workflow

1. Open the article inventory and find any item by title, section, language, status, or publication date.
1. Open an article in the canonical editor.
1. Edit the title, summary, body, section, and lead-image presentation. Language and translation kind remain fixed edition identity; editors create another language through the translation workflow.
1. Preview the article in the public-site presentation.
1. Save a draft, resolve automatic quality findings, and publish.
1. Assign published articles to homepage lead and supporting positions; the feed follows reverse publication order automatically.

## Content model

Every historical and newly created article uses the same canonical article schema. Imported Blogger content and new editorial work pass the same deterministic structural and media checks before publication. Original source HTML remains available for comparison.

Each article carries:

- Stable identity, language, slug, and translation-group identity
- Title, summary, Tiptap body, and hero media
- Section, labels, author, and search metadata
- Draft, scheduled, published, or archived status
- Original, human-translated, or machine-translated provenance
- Homepage promotion and publication timing
- Revision history and editor identity

## Product boundaries

The Studio and public publication are separate products connected through shared D1 and R2 contracts. Staff work entirely in the Studio browser interface. Clerk provides authentication, and the Worker enforces the approved-editor allowlist for every editorial read and write. Cloudflare Workers, D1, and R2 provide the application runtime and storage.

## Current implementation

The canonical corpus contains 2,375 published records in D1, including 18 public information pages. Studio provides archive search and filters, the official Tiptap Simple Editor, automatic content-quality checks, semantic image figures, source comparison, shared-renderer preview, D1 saves, optimistic conflict protection, numbered revisions, restore-as-new-version history, translation state, R2 media, and atomic homepage placement. TanStack Start owns routing and server functions; TanStack Query, Form, and Table own their corresponding browser state. The public Astro Worker reads published D1 records and serves media through the R2-backed delivery layer.

## Design direction

The inventory follows established newsroom CMS conventions. The article route uses a focused full-page editing surface based directly on Tiptap's official Simple Editor template, with a restrained institutional palette, compact controls, automatic quality results, and clear save state.

The automatic quality rules and editorial structure live in [EDITORIAL_STANDARDS.md](EDITORIAL_STANDARDS.md).
