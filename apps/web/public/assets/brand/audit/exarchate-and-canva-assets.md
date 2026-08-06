# Exarchate and Canva asset audit

## Search outcome

The audit checked the official Exarchate website, its Drupal media paths, indexed SVG and PDF results, the statutes, the existing `ortodoksas.lt` publication, and the public Canva share.

Public Exarchate sources expose PNG masters exclusively. The official site supplies a 1,650 × 1,800 standalone shield, a 5,709 × 1,800 institutional banner, and a 516 × 511 legal circular seal. Indexed search produced no Exarchate SVG or public brand-library download.

The Canva short link resolves to design `DAHQmaJK3Mo`. Direct command-line export reaches Canva's access-control challenge. The supplied ZIP therefore remains the authoritative Canva export available in this workspace; it contains eleven flattened 1,080 × 1,350 PNG pages.

## Identity distinction

| Asset family                                 | Palette                                                          | Status                                  |
| -------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| Official Exarchate website shield and banner | Green `#00692D`, yellow `#FAD214`                                | Verified institutional source reference |
| Client-supplied Exarchate lockup             | Green `#015C4B`, gold `#FACE6B`                                  | Current client target                   |
| Canva page 9                                 | Green `#015C4B`, gold `#FACE6B`, blue `#2A4782`, paper `#F0EEE4` | Current visual system                   |
| Exarchate legal circular seal                | Black and white                                                  | Legal and documentary reference         |

## Production decision

`production/exarchate-lockup-client.png` is a byte-identical copy of the whitespace-trimmed client artwork and remains the lockup reference. The public interface uses `production/exarchate-crest-client.png` with live Arimo 700 lettering in `InstitutionalLockup.astro`, following the accepted client geometry, spacing, and palette.

The crest remains a client raster because the available public vectors represent different marks. A future vector replacement requires an original file supplied or approved by the identity owner.

## Canva pattern extraction

Six decorative samples were extracted from Canva page 9 by solving foreground alpha against the exact marshmallow background. This preserves the original pixels while producing transparent PNGs:

- `pattern-gold-grid.png`
- `motif-green-chain.png`
- `motif-gold-chain.png`
- `motif-blue-chain.png`
- `pattern-green-small.png`
- `pattern-green-large.png`

The transparent PNG extractions remain the pixel-faithful production masters. The vectorization comparison is retained as a clean alternate direction. A future owner-authenticated Canva SVG export can supersede them while retaining the PNGs as comparison fixtures.
