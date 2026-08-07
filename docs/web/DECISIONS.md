# Ortodoksas.lt Decision Register

## Accepted

### Framework and Rendering

- Astro generates the publication as static HTML.
- Reader-facing pages ship zero JavaScript by default.
- Native HTML, CSS, and small scripts handle simple interaction.
- Framework islands require a concrete interaction that earns their runtime cost.
- Pagefind provides static multilingual search.

### Hosting

- Cloudflare Workers Static Assets hosts the production site.
- The current tunnel remains the preview surface during development.
- Production deployment follows successful build and rendered-review gates.

### Recovery

- Completeness means every Wayback record currently exposed has a deterministic
  status and every accessible distinct payload is preserved.
- Capture indexes retain every timestamp; payload hashes remove redundant bytes.
- Existing Russian and Ukrainian editions enter D1 as approved human
  translations. New machine translations carry their production method and
  review status as separate fields.
- `/original.html` remains available as archival evidence.
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
- New localized slugs are readable, language-appropriate slugs. Redirects keep
  legacy Blogger URLs working where they have public value.
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
- Tiptap stores canonical article bodies; Drizzle owns every D1 read and write.
- D1 stores articles, revisions, translation relationships, publication state,
  and media records. R2 stores media bytes.
- Publishing exports approved D1 records and triggers the static Astro build.
- The deployed Worker serves the static publication, D1-backed publication API,
  and R2 media.
- Production authentication uses Clerk in the production-authentication phase.

### Machine Translation

- Google Cloud Translation is the primary batch provider because it covers all
  five publication languages, including Belarusian.
- DeepL and focused editorial/LLM review provide a second opinion for supported
  languages and terminology-sensitive articles.
- Every generated article begins in `pending` review state. Publication requires
  an explicit approval action.
- Batch translation records provider, model, character count, source hash,
  completion state, and resulting article ID.

## Pending Gate Decisions

- Translation credentials, budget, glossary, and reviewer assignment.
- Clerk production authentication.
- Production domain cutover.
