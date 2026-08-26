# Brand assets

This directory owns source, research, and audit material for the Ortodoksas
identity. Application `public/` directories contain only assets delivered to a
browser.

## Directory contract

- `identity/` contains the byte-preserved client archive, Illustrator master,
  logo exports, checksums, and identity guide.
- `research/source/` contains verified institutional artwork and client source
  references.
- `research/canva/` contains the eleven flattened Canva reference pages.
- `research/audit/` contains source comparisons and extraction evidence.
- `research/derived/` contains retained visual derivatives outside the shipped
  web bundle.
- `brand-tokens.json` records the verified brand palette and typography.

The web application ships this small runtime subset under
`apps/web/public/assets/brand`:

- `fonts/` with Arimo and Playfair Display plus their licenses
- `ortodoksas-logo-official.svg`
- `motif-gold-chain.png`
- `pattern-gold-grid.png`

## Confirmed system

- Publication name: `ortodoksas.lt`
- Header identity: original horizontal publication mark
- Display type: Playfair Display
- Sans-serif type: Arimo
- Palette: burgundy `#AF272F`, deep burgundy `#861D24`, gold `#C8A34A`,
  warm paper `#F4F1E8`, white, and black

The production interface preserves the original vector artwork, proportions,
and official burgundy. Institutional Exarchate artwork remains research source
material for contexts where the institution itself is the subject.

## Source evidence

- `research/source/exarchate-shield-official.png` came from the official
  Exarchate website.
- `research/source/exarchate-legal-seal-official.png` came from the Exarchate
  statutes page.
- `research/source/obl-institutional-lockup.png` came from the official
  Exarchate website.
- `research/source/exarchate-lockup-client-reference.jpg` is the exact client
  JPEG.
- `research/source/exarchate-lockup-client-tight.png` is its whitespace-trimmed
  derivative.

The Patriarchate vector originates from Wikimedia Commons under CC BY-SA 4.0.
Its geometry matches the official Patriarchate raster and the supplied Canva
board. Full source classification and extraction evidence lives under
`research/audit/`.
