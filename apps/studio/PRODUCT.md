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

Every historical and newly created article uses the same canonical article schema. Recovered Blogger content passes deterministic structural and media checks before publication. Source HTML remains available as migration evidence.

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

## First implementation

The first working slice contains the 2,345 recovered articles, with 19 static pages retained in the same corpus. It provides archive search and filters, the complete official Tiptap Simple Editor, deterministic legacy-HTML normalization, automatic content-quality checks, semantic image figures, source comparison, shared-renderer preview, D1 saves, numbered revisions, and restore-as-new-version history. Media import to R2, production authentication, public-site delivery, translation workflows, and homepage placement remain subsequent slices.

## Design direction

The inventory follows established newsroom CMS conventions. The article route uses a focused full-page editing surface based directly on Tiptap's official Simple Editor template, with a restrained institutional palette, compact controls, automatic quality results, and clear save state.

The automatic quality rules and editorial structure live in [EDITORIAL_STANDARDS.md](EDITORIAL_STANDARDS.md).
