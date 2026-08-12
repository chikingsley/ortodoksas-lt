# Burgundy publication correction visual QA

## Evidence

- Client visual truth: `/tmp/codex-remote-attachments/019fd18e-5856-7f33-b2b8-c54848887dc8/2E7A7133-524B-4CF1-BA4C-3C59DF2DDF1A/1-Pasted-Image-1.jpg`
- User audit markup: `/tmp/codex-remote-attachments/019fd18e-5856-7f33-b2b8-c54848887dc8/5E4AF41D-EF3B-4E95-B87C-F30A411DEFE7/1-Photo-1.jpg`
- Corrected homepage, desktop: `/tmp/ort-home-final-desktop.png`
- Corrected homepage, mobile: `/tmp/ort-home-final-mobile-v2.png`
- Corrected search, mobile: `/tmp/ort-search-final-mobile.png`
- Corrected search results, mobile: `/tmp/ort-search-results-mobile.png`
- Public page-type captures: `/tmp/ort-audit-final/`
- Article regression matrix: `/tmp/ort-article-audit.tsv`

## Conditions

- Mobile viewport: 390 x 844 CSS pixels, device scale factor 1.
- Desktop viewport: 1440 x 1000 CSS pixels, device scale factor 1.
- Source focus: centered legacy mark, sparse burgundy, exact gold ornaments, editorial density, and one search control.
- Verified states: homepage, archive, search, institutional page, topic page, five locale shells, and 20 current articles in each locale.

## Iteration history

1. The reviewed build paired a gold active underline with two burgundy framing rules, exposed two search controls on desktop, used an authored burgundy rail, and repeated separators between adjacent sections.
2. The correction removed the underline, duplicate search entry, invented rail, and redundant section rules; it restored source-faithful gold assets and measured service-band geometry.
3. The search surface was rebuilt from the project shadcn primitives and D1-backed pagination. Locale switches now retain the search route and query surface.
4. Post-fix measurements: desktop root `1440/1440`, mobile root `390/390`; active navigation pseudo-element `none`; service icon `36 x 36`, gap `8`, inset `16`, stroke `rgb(200, 163, 74)`.

## Visual checks

- Typography: passed; Arimo remains the control/body face and Playfair Display remains the editorial face across all five scripts.
- Spacing: passed; the 1200px desktop shell, 16px mobile inset, service geometry, and single-owner separator contract are consistent.
- Color: passed; burgundy is the text/action state and exact opaque `#C8A34A` is reserved for ornaments.
- Images and motifs: passed; supplied raster ornaments remain unstretched and the unsupported burgundy rail is gone.
- Copy: passed for the captured UI states; article copy remains canonical D1 content.
- Interaction: passed; search input, submission, pagination, locale persistence, mobile sheet, and navigation links work.
- Accessibility: passed for visible labels, 44px mobile header/social targets, image alt presence, current-page state, and heading presence.
- Route audit: passed for the public page types plus 100 article pages. Every checked article reported the expected locale, viewport width, body and heading content, zero broken images, zero missing alt attributes, and zero replacement-character artifacts.
- Console: the browser capture run produced no application console errors.
- Horizontal overflow: passed at 390 and 1440 CSS pixels.

## Final result

passed
