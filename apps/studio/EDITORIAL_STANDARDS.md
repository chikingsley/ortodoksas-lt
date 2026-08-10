# Editorial conversion standards

## Scope

Every imported or newly created article enters Studio as one canonical Tiptap document. Imported records retain their original source for comparison. Automatic checks evaluate canonical structure, copy boundaries, media metadata, and publication readiness whenever the document changes.

## Summary

- Write the summary as an intentional reader-facing deck.
- Use one or two complete sentences with terminal punctuation.
- Replace archive search snippets and text ending in `...` or `…`.
- Keep the summary distinct from the opening paragraph.

## Body structure

- Store each prose paragraph as one Tiptap paragraph node.
- Let the renderer create paragraph spacing; remove empty spacer paragraphs and repeated hard breaks.
- Reconstruct sentences split by Blogger tables or media wrappers.
- Represent section headings with heading nodes. Automatic checks flag empty and level-one body headings.
- Preserve intentional single line breaks inside verse, addresses, and similar material.

## Media

- Render the lead image once between the summary and article body.
- Import approved media into R2 before publication.
- Give every informative image meaningful alternative text.
- Store each body image, caption, credit, and alternative description in one semantic Tiptap figure node.
- Preserve source captions when present and record absent captions as missing rather than generating them automatically.
- Preserve unresolved source media as figure evidence until article-level review recovers, replaces, or deliberately removes it.
- Treat removal as an editorial decision tied to the article and its revision history. The Sakartvelas calibration deliberately removes one duplicated body copy of the approved lead image.
- Verify image order, crop, orientation, and loading in the public preview.

## Automatic quality gate

Publication requires all of the following:

1. A complete title and punctuated summary.
1. Semantic paragraphs and headings without spacer nodes or repeated line breaks.
1. Semantic figure nodes with a source and alternative text, plus caption provenance that distinguishes source, manual, generated, and missing captions.
1. Distinct figure sources and properly attached captions.
1. Deliberate dividers and separated bylines.
1. A clean shared-renderer result.

The Worker rejects a publish request while any quality issue remains. Restoring an older article version creates a new revision and preserves the history.

## Calibration set

The calibration set contains three manually reviewed articles:

- Antalija: an image-heavy feature with four headings and 20 individually reviewed semantic figures.
- Besarabija: a seven-country weekly roundup with deliberate headings, dividers, notes, lead caption/source, byline, and copy corrections.
- Sakartvelas: a ten-story weekly roundup with deliberate headings, dividers, byline/copy corrections, and one reviewed removal of a duplicated lead/body image.

Every conversion preserves an immutable baseline, records canonical changes with provenance, and remains reviewable through source comparison, revisions, and public preview. Automatic structural checks replace a separate manual review-notes workflow.
