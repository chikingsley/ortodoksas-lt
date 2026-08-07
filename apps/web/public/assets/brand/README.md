# Brand assets

This folder contains the client-supplied Exarchate identity, the Canva reference export, verified institutional artwork, and production-ready derivatives.

## Confirmed system

- Publication name: `ortodoksas.lt`
- Institutional order: Ecumenical Patriarchate emblem first, Exarchate lockup second
- Display type: Playfair Display
- Sans-serif type: Arimo
- Client palette: marshmallow `#F0EEE4`, gold `#FACE6B`, blue `#2A4782`, green `#015C4B`, and black `#000000`

## Production assets

- `production/exarchate-crest-client.png`: accepted client crest with its exterior background removed and internal white lettering preserved
- `production/exarchate-lockup-client.png`: client-supplied full lockup retained as the visual source reference
- `production/canva-patterns/`: six transparent, pixel-faithful extractions from the Canva brand board
- `production/canva-patterns/motif-green-chain-column.svg`: single-column interface trace used at the desktop story-rail edge
- `source/ecumenical-patriarchate-emblem.svg`: complete vector artwork matching the emblem in the Canva brand board
- `source/ecumenical-patriarchate-emblem-2048.png`: transparent 2,048 px render of that vector
- `source/ecumenical-patriarchate-emblem-official-raster.png`: 512 px raster served by the Ecumenical Patriarchate's official website

The production interface renders the client-supplied Exarchate lockup and the verified Patriarchate vector through the shared `InstitutionalMarks` component. The masthead and footer therefore preserve one asset, order, proportion, gap, and optical-height contract. An original vector supplied by the identity owner can supersede the Exarchate raster later.

The Canva decorations remain transparent PNGs as their pixel-faithful masters. The green story-rail trace isolates one column from the supplied chain geometry for the approved narrow edge treatment. The broader vectorization trial remains an audit comparison until an identity-owner export supersedes it. Treat the supplied samples as bounded decorative panels and vertical motifs. Preserve their orientation, proportions, and colors.

## Official source references

- `source/exarchate-shield-official.png`: 1,650 × 1,800 standalone shield served by the [official Exarchate website](https://www.obl.lt/sites/default/files/OBL_S1.png)
- `source/exarchate-legal-seal-official.png`: 516 × 511 legal circular seal published with the [Exarchate statutes](https://obl.lt/en-gb/node/40)
- `source/obl-institutional-lockup.png`: 5,709 × 1,800 bilingual institutional banner published by the [official Exarchate website](https://obl.lt/sites/default/files/Ortodoks%C5%B3%20Ba%C5%BEny%C4%8Dia%20Lietuvoje%20%283%29.png)
- `source/exarchate-lockup-client-reference.jpg`: exact JPEG supplied by the client
- `source/exarchate-lockup-client-tight.png`: whitespace-trimmed copy of the supplied JPEG

The official website artwork uses the older green `#00692D` and yellow `#FAD214`. The supplied client logo uses the Canva green `#015C4B` and gold `#FACE6B`; production work follows the client palette.

The Patriarchate vector comes from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Emblem_of_the_Ecumenical_Patriarch_of_Constantinople_Bartholomew_I.svg). Zografos 07 created it and released it under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Its geometry matches the raster served by the [Ecumenical Patriarchate](https://ec-patr.org/wp-content/uploads/2019/07/cropped-logo.png) and the Canva board.

## References and audits

- `reference/canva/`: eleven flattened PNG pages exported from `Orth_inst-template-feed.zip`
- `audit/canva-pattern-extractions.png`: exact Canva crops beside the retained vectorization trial
- `audit/ecumenical-patriarchate-emblem-sources.png`: twelve-source comparison used to identify the Patriarchate emblem
- `audit/exarchate-and-canva-assets.md`: search record, source classification, and extraction details

## Usage

Place the Patriarchate emblem on the left whenever the two institutions appear together. Preserve every mark's proportions and colors. Keep `ortodoksas.lt` visible as the publication identity, distinct from the institutional marks.
