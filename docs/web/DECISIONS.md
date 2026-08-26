# Ortodoksas.lt Decision Register

## Accepted

### Framework and Rendering

- Astro renders publication HTML in a Cloudflare Worker from published D1 records.
- Reader-facing pages ship zero JavaScript by default.
- Native HTML, CSS, and small scripts handle simple interaction.
- Framework islands require a concrete interaction that earns their runtime cost.
- The archive and multilingual search query indexed publication fields in D1.

### Hosting

- Cloudflare Workers Static Assets hosts the production site.
- The `grassinside.com` custom domains remain the production-review surface
  until the official-domain cutover.
- Production deployment follows successful build and rendered-review gates.

### Recovery

- Completeness means every Wayback record currently exposed has a deterministic
  status and every accessible distinct payload is preserved.
- Capture indexes retain every timestamp; payload hashes remove redundant bytes.
- Existing Russian and Ukrainian editions enter D1 as approved human
  translations. New machine translations carry their production method and
  review status as separate fields.
- Recovered source evidence remains in the recovery records outside public
  runtime routing.
- Article conversion follows the Studio calibration established by Antalija,
  Besarabija, and Sakartvelas: source evidence, an immutable converted baseline,
  a canonical Tiptap draft, semantic figures, and source-tracked changes.
- Unresolved body media remains attached to its source position until
  article-level review recovers, replaces, or deliberately removes it.
- Media removal requires a concrete editorial reason. The approved calibration
  example removes a duplicated body copy of the Sakartvelas lead image.

### URLs and Localization

- Lithuanian keeps unprefixed canonical paths.
- English uses `/en/`, Russian `/ru/`, Ukrainian `/uk/`, and Belarusian `/be/`.
- New localized slugs are readable, language-appropriate slugs. Public runtime
  routing serves canonical clean paths; unmatched historical `.html` paths use
  the same localized 404 response as every other unknown path.
- Every counterpart shares one `translation_group_id`. Article language links
  resolve by that group and open the matching translated article directly.
- Translation production method (`original`, `human`, or `machine`) and
  editorial review status (`pending`, `approved`, or `changes_requested`) are
  independent facts.
- Machine translations retain the source article ID and source-body hash so a
  later source edit can flag the translation for review.
- Language selection is explicit in the URL. A remembered preference may guide
  visits to edition homepages after the direct counterpart contract is proven.
- `hreflang` metadata lists available counterparts only.

### Identity

- The recovered Ortodoksas logo is the identity source.
- A faithful vector trace and responsive derivatives replace generative
  reinterpretation.
- The visual direction combines the original identity, OCA archive utility, The
  Wheel editorial restraint, and Public Orthodoxy reading clarity.

### CMS

- The custom Studio is the production editorial interface.
- TanStack Start and Router own the Studio application boundary. TanStack Query,
  Form, and Table own server state, metadata forms, and inventory state.
- Tiptap stores canonical article bodies; Drizzle owns every D1 read and write.
- D1 stores articles, revisions, translation relationships, publication state,
  and media records. R2 stores media bytes.
- Publishing commits approved D1 records atomically; the Astro Worker reads the
  current published state on the next request.
- The deployed Worker serves the publication, D1-backed route models, and R2
  media.
- Clerk authenticates Studio sessions. The active Organization role authorizes
  every editorial operation and derives reviewer identity from the session.
- Homepage category rails rotate automatically to the two sections with the
  most recently published activity; each rail shows its newest eligible items.

### Machine Translation

- Translation sources pass through deterministic normalization before segment
  extraction and hashing. Cue-only source-edition links are removed; ordinary
  links and multilingual article content remain intact.
- The approved batch candidate is Luna-direct translation followed by an
  independent Luna review.
- Deterministic checks enforce complete segment coverage, exact Tiptap
  structure, stable attributes and destinations, names, dates, quotations, and
  locale-specific Orthodox terminology.
- Machine translations may publish with an explicit "Automatically translated
  from Lithuanian" disclosure. Editorial review upgrades the disclosure to
  "Reviewed by an editor" without changing the publication model.
- Batch translation records provider, model, character count, source hash,
  completion state, and resulting article ID.

## Open Gates

- Complete editorial review of the first bounded translation batch and approve
  the terminology sample before expanding the batch.
- Production domain cutover.
