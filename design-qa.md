# Public CSS migration visual QA

## Evidence

- Source: `/tmp/codex-remote-attachments/019fd18e-5856-7f33-b2b8-c54848887dc8/A51BE7C1-7E8C-4F4C-B5CC-187F4D3AF2E6/1-Photo-1.jpg`
- Final homepage, mobile: `/tmp/ortodoksas-css-migration-mobile-final.png`
- Final archive, mobile: `/tmp/ortodoksas-css-migration-archive-mobile-final.png`
- Final article, mobile: `/tmp/ortodoksas-css-migration-article-mobile-final.png`
- Final navigation sheet, mobile: `/tmp/ortodoksas-css-migration-menu-mobile-final.png`
- Final footer, mobile: `/tmp/ortodoksas-css-migration-footer-mobile-final.png`
- Final homepage, desktop: `/tmp/ortodoksas-css-migration-desktop-final.png`
- Final archive, desktop: `/tmp/ortodoksas-css-migration-archive-desktop-top-final.png`
- Final article, desktop: `/tmp/ortodoksas-css-migration-article-desktop-final.png`
- Source/final comparison: `/tmp/ortodoksas-css-migration-comparison.png`

## Conditions

- Mobile viewport: 390 x 844 CSS pixels, device scale factor 1.
- Desktop viewport: 1280 x 960 CSS pixels, device scale factor 1.
- Source focus: the reserved scrollbar gutter and clipped right edge.
- Verified states: homepage top and footer, archive top, article top, and open mobile navigation sheet.

## Iteration history

1. Initial mobile measurement: `innerWidth=390`, `clientWidth=375`, `scrollWidth=375`. The root scrolling element reserved a 15-pixel gutter.
2. Applied the scrollbar utility to the root `html` scrolling element and kept horizontal clipping on the shared public shell.
3. Final homepage, archive, and article measurements: `innerWidth=390`, `clientWidth=390`, `scrollWidth=390`, `body.scrollWidth=390`.

## Visual checks

- Typography: passed; the same brand families and weights render at both breakpoints.
- Spacing: passed; mobile content reaches the full viewport and retains the 16-pixel content inset.
- Color: passed; green, gold, blue, neutral surfaces, and active states match the approved brand treatment.
- Images and motifs: passed; source assets retain their aspect ratio and crops.
- Copy: passed for the captured Lithuanian states.
- Interaction: passed; mobile navigation opens as a sheet with usable links and a visible close control.
- Console: passed; captured routes produced an empty browser console.
- Horizontal overflow: passed at 390 and 1280 CSS pixels.

## Final result

Passed.
