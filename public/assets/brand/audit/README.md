# Ecumenical Patriarchate emblem audit

The audit compared twelve references before selecting the production asset.

|   # | Source                                | Result                                                                                                                  |
| --: | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
|   1 | Wikimedia Commons SVG                 | Selected vector; complete artwork and intact boundary                                                                   |
|   2 | Official Exarchate lockup             | Same alternate magenta-and-gold rendering; unsuitable for extraction because the source composition clips the left edge |
|   3 | Apostolic Pilgrimage                  | Alternate magenta-and-gold rendering                                                                                    |
|   4 | ACROD                                 | Same artwork family as the selected vector; compressed raster                                                           |
|   5 | Turku Orthodox Parish                 | Same artwork as the selected vector; 1,024 px raster                                                                    |
|   6 | Pastoral Health EP                    | Alternate magenta-and-gold rendering                                                                                    |
|   7 | PNGEgg                                | Same artwork family; padded third-party raster                                                                          |
|   8 | Antena M                              | Alternate magenta-and-gold rendering; compressed raster                                                                 |
|   9 | Ecumenical Patriarchate website       | Same artwork as the selected vector; official 512 px raster                                                             |
|  10 | Annunciation Greek Orthodox Cathedral | Different institutional emblem                                                                                          |
|  11 | Client Canva board                    | Target reference; same artwork as the selected vector                                                                   |
|  12 | GOARCH Google result                  | Alternate magenta-and-gold rendering                                                                                    |

The selected SVG is the only complete vector found among these references. Its visible geometry matches the target Canva emblem and the official Ecumenical Patriarchate raster. The source images have different dimensions and resampling, so their raster bytes differ.
