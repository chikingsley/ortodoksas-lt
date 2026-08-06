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
- Authentic recovered content remains distinct from generated translation.
- `/original.html` remains available as archival evidence.
- Article conversion follows the Studio calibration established by Antalija,
  Besarabija, and Sakartvelas: source evidence, an immutable converted baseline,
  a canonical Tiptap draft, semantic figures, and provenance-tracked changes.
- Unresolved body media remains attached to its source position until
  article-level review recovers, replaces, or deliberately removes it.
- Media removal requires a concrete editorial reason. The approved calibration
  example removes a duplicated body copy of the Sakartvelas lead image.

### URLs and Localization

- Lithuanian keeps its historical unprefixed Blogger paths.
- English uses `/en/`, Russian `/ru/`, Ukrainian `/uk/`, and Belarusian `/be/`.
- Language selection is explicit and remembered.
- Locale metadata links actual counterparts only.

### Identity

- The recovered Ortodoksas logo is the identity source.
- A faithful vector trace and responsive derivatives replace generative
  reinterpretation.
- The visual direction combines the original identity, OCA archive utility, The
  Wheel editorial restraint, and Public Orthodoxy reading clarity.

### CMS

- Decap CMS is the production baseline.
- Decap is MIT-licensed, Git-backed, multilingual, and supports editorial
  workflow.
- A small Cloudflare Worker handles GitHub OAuth.
- Content edits become Git commits and Cloudflare builds.
- Payload, database-backed CMS deployments, and paid SaaS plans remain outside
  the baseline.
- Sveltia CMS remains a compatible future UI evaluation after its authentication
  and 1.0 work matures.

## Pending Gate Decisions

- Final visual calibration at G2.
- Generated-translation publication and review policy at G4.
- Client CMS acceptance at G5.
- Production domain cutover at G6.
