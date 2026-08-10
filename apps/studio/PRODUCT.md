# Ortodoksas Studio

## Product purpose

Ortodoksas Studio is the staff editorial workspace for the `ortodoksas.lt` publication. Editors use one browser interface to find, edit, review, translate, preview, place, and publish every article in the archive.

## Users

- Publication editors and administrators
- Occasional contributors with scoped editorial access

## Core workflow

1. Open the article inventory and find any item by title, section, language, status, or publication date.
1. Open an article in the canonical editor.
1. Edit the title, summary, body, media, taxonomy, search metadata, and publishing settings.
1. Preview the article in the public-site presentation.
1. Save a draft, resolve automatic quality findings, schedule, or publish.
1. Assign published articles to homepage lead, supporting, or feed positions.

## Content model

Every historical and newly created article uses the same canonical article schema. Imported Blogger content and new editorial work pass the same deterministic structural and media checks before publication. Original source HTML remains available for comparison.

Each article carries:

- Stable identity, language, slug, and translation-group identity
- Title, summary, Tiptap body, and hero media
- Section, labels, author, and search metadata
- Draft, scheduled, published, or archived status
- Original, human-translated, or machine-translated provenance
- Homepage placement and publication timing
- Revision history and editor identity

## Product boundaries

The Studio and public publication are separate products connected through the publishing API. Staff work entirely in the Studio browser interface. Development uses a visible fake editor identity; production authentication will use Clerk. Cloudflare Workers, D1, and R2 provide the application runtime and storage.

## Current implementation

The canonical corpus contains 2,375 published records in D1, including 18 public information pages. Studio provides archive search and filters, the official Tiptap Simple Editor, automatic content-quality checks, semantic image figures, source comparison, shared-renderer preview, D1 saves, numbered revisions, restore-as-new-version history, translation state, R2 media, and homepage placement. The public Astro build exports published D1 records and serves media through the R2-backed Worker. Production authentication remains the release boundary for Studio.

## Design direction

The inventory follows established newsroom CMS conventions. The article route uses a focused full-page editing surface based directly on Tiptap's official Simple Editor template, with a restrained institutional palette, compact controls, automatic quality results, and clear save state.

The automatic quality rules and editorial structure live in [EDITORIAL_STANDARDS.md](EDITORIAL_STANDARDS.md).
