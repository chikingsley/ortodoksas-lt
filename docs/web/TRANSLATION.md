# Translation Contract

## Article relationships

Every language edition is a normal `articles` row. Articles that express the
same work share one `translation_group_id`; their slugs remain independent and
natural in each language. The language switcher resolves the current article's
group and links directly to each available counterpart.

## Production and approval

`translation_kind` records how the text was produced:

- `original`
- `human`
- `machine`

`translation_review_status` records its editorial state independently from
publication:

- `not_required` for an original article
- `pending` for an automatic translation awaiting optional editorial review
- `approved` for a translation accepted for publication
- `changes_requested` when review sends it back for revision

Existing recovered Russian and Ukrainian editions are approved human
translations. A standalone localized article remains an approved original.

## Source-change detection

A translated article records its source article ID and the SHA-256 hash of the
source body used for translation. When the source body changes, a hash mismatch
marks the counterpart for renewed review. `translation_runs` records provider,
model, language pair, character count, status, and resulting article.

Before segment extraction and hashing, the translation source passes through a
deterministic normalization gate. The gate removes cue-only source-edition
links and their matching summary prefixes. It preserves ordinary
links, embedded multilingual source material, article structure, media, names,
dates, and quotations.

## Batch provider

The approved batch candidate uses Luna for direct translation followed by an
independent Luna review. Deterministic gates verify segment coverage, Tiptap
structure, attributes, links, names, dates, quotations, and locale-specific
Orthodox terminology before a result enters D1.

A clean four-language benchmark selected Luna-direct plus independent review
for English, Russian, Ukrainian, and Belarusian. The first production batch
remains bounded and audited before the complete backfill.

Published automatic translations carry a visible source-language disclosure.
Editorial review records the reviewer and upgrades that disclosure.

## URL policy

Lithuanian uses unprefixed canonical URLs. Localized editions use `/en`, `/ru`,
`/uk`, and `/be`. New slugs prioritize readable language-appropriate URLs.
Redirects preserve valuable indexed legacy URLs without shaping the current
schema or authoring workflow.
