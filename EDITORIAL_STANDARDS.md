# Editorial conversion standards

## Scope

Every recovered article enters Studio as source evidence plus a draft canonical Tiptap document. Automatic checks evaluate canonical structure, copy boundaries, media metadata, and publication readiness whenever the document changes.

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
- Verify image order, crop, orientation, and loading in the public preview.

## Automatic quality gate

Publication requires all of the following:

1. A complete title and punctuated summary.
1. Semantic paragraphs and headings without spacer nodes or repeated line breaks.
1. Semantic figure nodes with a source, caption, and alternative text.
1. Distinct figure sources and properly attached captions.
1. Deliberate dividers and separated bylines.
1. A clean shared-renderer result.

The Worker rejects a publish request while any quality issue remains. Restoring an older article version creates a new revision and preserves the history.

## Current demonstration

The calibration set contains an image-heavy Antalija feature and two multi-story weekly roundups. Together they exercise headings, dividers, semantic figures, captions, alternative text, credits, summaries, and bylines.
