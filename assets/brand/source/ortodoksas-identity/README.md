# Ortodoksas identity source package

These are the byte-preserved client originals from
`OneDrive_2026-08-07.zip`, extracted on 2026-08-13 and renamed for clear,
stable repository use. The source archive has SHA-256
`7b39fbbfb84e4fd5120a93b3bf391a58f37547ec5cdc08a575c78638bcb9de15`.
The exact archive is retained as `ortodoksas-identity-original.zip`.

This directory stays outside application `public/` trees because it contains
the editable Illustrator master and archival exports. The deployed horizontal
SVG remains at
`apps/web/public/assets/brand/production/ortodoksas-logo-official.svg`.

## Naming

- **Logo**: the standalone mark combined with the `ortodoksas.lt` wordmark.
- **Mark**: the circular symbol by itself.
- **Profile**: a square social-avatar composition based on the primary mark.
- **Transparent**: the original `befonis` export, meaning the background is
  transparent.

## Original-to-canonical mapping

| Original filename | Canonical filename | Contents |
| --- | --- | --- |
| `Ort_logo_1.jpg` | `ortodoksas-logo-horizontal.jpg` | Horizontal logo on white |
| `Ort_logo_1_befonis.png` | `ortodoksas-logo-horizontal-transparent.png` | Horizontal logo with transparency |
| `Ort_logo_2.jpg` | `ortodoksas-logo-stacked.jpg` | Stacked logo on white |
| `Ort_logo_2_befonis.png` | `ortodoksas-logo-stacked-transparent.png` | Stacked logo with transparency |
| `Ort_mark_1.jpg` | `ortodoksas-mark-primary.jpg` | Primary standalone mark on white |
| `Ort_mark_1_befonis.png` | `ortodoksas-mark-primary-transparent.png` | Primary standalone mark with transparency |
| `Ort_mark_2.jpg` | `ortodoksas-mark-alternate.jpg` | Alternate decorated standalone mark on white |
| `Ort_mark_2_befonis.png` | `ortodoksas-mark-alternate-transparent.png` | Alternate decorated mark with transparency |
| `Ort_profils_1.jpg` | `ortodoksas-profile-light.jpg` | Primary mark on a white square avatar |
| `Ort_profils_2.jpg` | `ortodoksas-profile-burgundy.jpg` | White primary mark on a burgundy square avatar |
| `Ort_logo_gaires.pdf` | `ortodoksas-identity-guidelines.pdf` | One-page logo layout and color guide |
| `Ort_logo_vektorinis.ai` | `ortodoksas-vector-master.ai` | PDF-compatible Illustrator vector master |

Run `sha256sum -c SHA256SUMS` from this directory to verify every extracted
original and the retained source archive.
