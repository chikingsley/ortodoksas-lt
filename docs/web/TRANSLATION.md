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

`translation_review_status` records its editorial state:

- `not_required` for an original article
- `pending` for a translation awaiting review
- `approved` for a translation accepted for publication
- `changes_requested` when review sends it back for revision

Existing recovered Russian and Ukrainian editions are approved human
translations. A standalone localized article remains an approved original.

## Source-change detection

A translated article records its source article ID and the SHA-256 hash of the
source body used for translation. When the source body changes, a hash mismatch
marks the counterpart for renewed review. `translation_runs` records provider,
model, language pair, character count, status, and resulting article.

## Batch provider

Google Cloud Translation is the primary batch provider because it covers the
complete LT, EN, RU, UK, and BE language set. DeepL and focused editorial or LLM
review act as second-pass checks where language support and terminology warrant
them. Generated text enters Studio as a draft with `pending` review status; an
editor approves publication.

## URL policy

Lithuanian uses unprefixed canonical URLs. Localized editions use `/en`, `/ru`,
`/uk`, and `/be`. New slugs prioritize readable language-appropriate URLs.
Redirects preserve valuable indexed legacy URLs without shaping the current
schema or authoring workflow.
