---
name: ortodoksas.lt C Institutional Edition
description: A living Lithuanian church publication joining institutional authority to a compact newsroom.
colors:
  patriarchal-green: "#015c4b"
  patriarchal-green-deep: "#004438"
  ceremonial-gold: "#face6b"
  library-blue: "#2a4782"
  cool-bone: "#f0eee4"
  cool-bone-deep: "#e4e1d4"
  living-ink: "#171916"
  quiet-ink: "#555b57"
  hairline: "#c9c7bd"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(40px, 6vw, 68px)"
    fontWeight: 700
    lineHeight: 0.99
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(32px, 3vw, 40px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.028em"
  title:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(24px, 2.3vw, 32px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.72
    letterSpacing: "normal"
  label:
    fontFamily: "Arimo, Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.08em"
rounded:
  square: "0"
  pill: "999px"
  circle: "50%"
spacing:
  hairline: "1px"
  focus: "2px"
  us-05: "4px"
  us-1: "8px"
  us-105: "12px"
  us-2: "16px"
  us-205: "20px"
  us-3: "24px"
  us-4: "32px"
  us-5: "40px"
  us-6: "48px"
  us-8: "64px"
components:
  nav-item:
    backgroundColor: "{colors.white}"
    textColor: "{colors.living-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.square}"
    padding: "16px 27px 14px"
  story-link:
    backgroundColor: "transparent"
    textColor: "{colors.patriarchal-green}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0"
  service-link:
    backgroundColor: "{colors.patriarchal-green}"
    textColor: "{colors.white}"
    typography: "{typography.title}"
    rounded: "{rounded.square}"
    padding: "11px 20px"
    height: "66px"
  text-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.living-ink}"
    rounded: "{rounded.square}"
    padding: "0 14px"
    height: "46px"
  tag-chip:
    backgroundColor: "{colors.white}"
    textColor: "{colors.quiet-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "7px 11px"
---

<!-- markdownlint-disable MD024 MD025 MD026 MD036 -->

# Design System: ortodoksas.lt C Institutional Edition

## Standards Foundation

The system adopts the U.S. Web Design System 3 foundations for spacing, responsive widths, grid behavior, site margins, and structural borders. This is a foundation rather than a visual theme: the client palette, Playfair Display, Arimo, institutional marks, editorial hierarchy, and C composition remain the product's own identity.

- **Spacing:** Use USWDS spacing-unit values only: 4, 8, 12, 16, 20, 24, 32, 40, 48, and 64px for this publication surface.
- **Responsive widths:** Use 640px as the mobile-to-tablet composition change, 1024px as the tablet-to-desktop composition change, and 1200px as the publication max-width. These match the practical BBC GEL/Guardian reflow model while preserving this publication's fixed outer contract.
- **Grid and margins:** Use a 1200px maximum publication container, 32px gutters from tablet upward, 16px gutters below tablet, a 24px standard column gap, and a 32px large column gap.
- **Borders:** Use a 1px structural border. A 2px line belongs to focus or an explicit selection state.
- **Current location:** Mark the current destination with `aria-current="page"`. The visual state uses green text plus one 2px gold indicator contained inside the navigation item.
- **Keyboard focus:** Use a 2px library-blue outline with a 4px offset and at least 3:1 contrast against adjacent colors.

### Boundary Ownership

- `SectionHeader` owns one bottom structural border.
- `StoryList` items own one bottom structural border; the final item removes it.
- `PageHeader` uses spacing alone when the following component already owns a top border.
- `InstitutionalMasthead` owns the single green divider immediately above desktop navigation or mobile language choices; those rows draw no second outer divider.
- Adjacent components never both draw the same boundary.
- Background changes count as a boundary and do not receive an additional separator.
- Every margin, padding, gap, gutter, and responsive width must resolve to the adopted tokens above.

### Editorial Metadata Order

- Every story uses the same reading order: section/kicker, headline, standfirst when available, date metadata, then the read action.
- Dates belong below the headline in story cards and archive rows. Mobile reflow preserves this order.
- The lead story, supporting stories, section stories, archive rows, and localized stories all use this rule.

### Control Primitive Policy

- Fixed finite choices use a native select or the shadcn/Base UI Select primitive.
- Searchable finite choices use the shadcn/Base UI Combobox primitive.
- Free-form creation uses a separate Input and explicit action beside the Combobox. The Combobox itself remains a selector.

## Overview

**Creative North Star: "The Living Ecclesial Press"**

The C Institutional Edition presents a living Lithuanian church publication through the visual discipline of an ecclesial institution and the pace of a compact newsroom. White and cool-bone fields keep the publication immediate and readable; patriarchal green, ceremonial gold, exact institutional marks, and authentic chain motifs give it provenance and ceremony.

The system feels authoritative, editorial, restrained, and current. Playfair Display carries headlines and long-form reading with literary gravity, while Arimo handles navigation, metadata, controls, and multilingual utility text. Dense story groupings remain legible through strong type hierarchy, image crops, hairline rules, and generous section intervals rather than generic lifestyle-blog staging.

**Key Characteristics:**

- Exact dual institutional marks paired with the visible `ortodoksas.lt` publication identity.
- Flat white and cool-bone fields structured by green and neutral hairlines.
- Playfair-led editorial hierarchy with compact Arimo utility labels.
- Ceremonial green and gold accents used with discipline; library blue marks a distinct content destination.
- Authentic chain and grid motifs acting as cropped edge signatures rather than wallpaper.
- Image-led reporting with quiet scale motion and highly legible responsive density.

## Colors

The palette combines ecclesial authority, ceremonial warmth, and paper-like neutrals, with blue reserved for a distinct institutional-library moment.

### Primary

- **Patriarchal Green:** The institutional voice for rules, links, labels, active states, service bands, and the footer.
- **Deep Patriarchal Green:** The grounded state for hover fills and the footer field.

### Secondary

- **Ceremonial Gold:** A precise accent for active underlines, icons, motifs, and highlighted editorial status.

### Tertiary

- **Library Blue:** A contained destination color for the library callout and the universal focus outline.

### Neutral

- **Cool Bone:** The warm-cool paper field behind archive panels, shell cards, and image placeholders.
- **Deep Cool Bone:** The deeper paper tone available for adjacent neutral layering.
- **Living Ink:** The near-black reading and navigation color.
- **Quiet Ink:** The softer text color for descriptions, dates, and supporting information.
- **Hairline:** The structural divider color between stories, columns, controls, and masthead identities.
- **White:** The principal publication field and reverse text color on institutional bands.

### Named Rules

**The Ceremonial Accent Rule.** Gold identifies ceremony, selection, or an institutional motif; it remains an accent rather than a broad reading surface.

**The Blue Room Rule.** Blue belongs to the library destination and focus visibility, giving that content one distinct chamber inside the green-led world.

## Typography

**Display Font:** Playfair Display (with Georgia and serif fallbacks)\
**Body Font:** Playfair Display (with Georgia and serif fallbacks)\
**Label Font:** Arimo (with Arial and sans-serif fallbacks)

**Character:** Playfair Display gives the publication an editorial and ecclesial cadence across headlines, summaries, article prose, and footer links. Arimo supplies crisp administrative contrast for navigation support, metadata, languages, labels, controls, and status.

### Hierarchy

- **Display** (700, fluid 40–68px, 0.99 line height): Centered article titles and major page introductions; balance short lines and allow long multilingual words to wrap safely.
- **Headline** (700, fluid 32–40px, 1.02 line height): Lead-story titles with compact negative tracking and a readable measure near 22 characters on wide screens.
- **Title** (700, fluid 24–32px, 1 line height): Section headings and prominent editorial modules.
- **Body** (400, 20px, 1.72 line height): Long-form article reading in a centered column near 790px; supporting summaries step down to 13–17px with 1.4–1.5 line height.
- **Label** (700, 9–11px, 0.05–0.14em tracking, usually uppercase): Eyebrows, dates, metadata, languages, action links, and footer headings.

### Named Rules

**The Two-Voice Rule.** Playfair speaks for publication content; Arimo speaks for wayfinding, metadata, controls, and status.

**The Compact Headline Rule.** Editorial headings use bold weight, tight leading, and restrained negative tracking, gaining hierarchy through scale rather than ornamental treatment.

## Layout

The principal container reaches the USWDS `desktop-lg` width of 1200px. Site margins are 16px below `desktop` and 32px from `desktop`; standard and large column gaps are 24px and 32px. Public pages use 1px hairline-separated modules and the adopted USWDS spacing units. Reading pages narrow to a centered measure near 72ex while hero media may occupy the full publication container.

Wide editorial layouts use asymmetric grids for hierarchy: the homepage first viewport uses an approximately 57/43 lead-and-brief composition, followed by a four-cell service band, a three-card recent-story grid with archive rail, and two-column section lists. The brief rail contains four stories. This story order and first-viewport composition are homepage behaviors; other surfaces inherit the visual tokens, editorial density, and responsive principles rather than that exact sequence.

Below `desktop` at 1024px, major asymmetric grids stack, supporting briefs form four columns, service links form two columns, and archive controls simplify. Below `tablet` at 640px, the masthead retains one identity row, languages occupy one compact utility row, desktop navigation becomes a menu, editorial cards become thumbnail-and-copy rows, archive months collapse to one archive destination, and content grids resolve to one column. Images keep fixed editorial aspect ratios and `object-fit: cover` to preserve rhythm across variable source material.

### Homepage Media Contract

- Lead source target: at least 1600 × 990px, landscape, displayed at a 1.62:1 crop on desktop and 1.55:1 on phones.
- Supporting source target: at least 800 × 550px, landscape, displayed at a 1.45:1 crop. The desktop brief rail renders four 175px-wide crops at the 1200px container.
- Recent-card source target: at least 840 × 590px, displayed at a 1.42:1 crop.
- Every promoted story requires a valid image. The publishing workflow blocks a homepage placement whose image fails media validation.
- Lead titles target 45–90 characters and summaries target 110–220 characters. Supporting titles target 30–75 characters and summaries target 55–110 characters. Responsive wrapping remains the final constraint; editorial guidance avoids destructive truncation.

### Editorial Taxonomy

The recovered publication supplies five historical sections: `Tikėjimas ir kultūra`, `Naujienos`, `Bažnyčios gyvenimas`, `Pamokslai`, and `Šventasis Raštas`. Studio presents these as the canonical starting list through a searchable section combobox. Editors may type a deliberate new section; saving the article adds that value to subsequent Studio and public-archive section filters. Labels remain separate article metadata and participate in archive text search.

**The Surface-Specific Story Rule.** Preserve the homepage journey from institutional identity through lead and briefs, services, recent stories, and archive; carry the shared system to other pages without turning that journey into a universal template.

## Elevation & Depth

The system is flat and paper-like by default. White, cool-bone, green, and blue planes establish depth through tonal contrast, hairline rules, cropped image fields, and section spacing. The mobile menu alone receives a low diffuse shadow because it floats over publication content; imagery gains a quiet 2% scale on hover, and reduced-motion preferences collapse transitions to an immediate state change.

### Shadow Vocabulary

- **Mobile Menu Float** (`0 12px 28px rgba(0, 39, 31, 0.15)`): A single structural shadow for the expanded small-screen menu.

### Named Rules

**The Flat Institution Rule.** Resting publication surfaces gain authority from alignment, tone, and hairlines; floating depth belongs to a true overlay.

## Shapes

The dominant form language is square and rectilinear. Image frames, cards, callouts, fields, service cells, and navigation remain crisp-edged. One-pixel rules express structure; one contained two-pixel indicator expresses the current navigation destination. Full pills belong to article tags, and circles belong to the archive arrow control and the framed footer emblem.

Chain motifs create the signature organic geometry: exact ceremonial-gold vertical crops separate adjacent service cells, while a gold grid motif enters the library field as a partially cropped institutional texture. Supplied motif orientation remains unchanged.

**The Reserved Curve Rule.** Curves signal a compact token, circular action, or emblem container; editorial surfaces retain square corners.

## Components

### Institutional Masthead

- **Identity:** Place the Ecumenical Patriarchate emblem at the far left, followed by the client Exarchate crest with its Arimo wordmark, a hairline divider, and the visible `ortodoksas.lt` wordmark.
- **Typography:** Set the publication name in bold Playfair with a compact uppercase Arimo descriptor.
- **Sizing:** Render the Ecumenical Patriarchate emblem and the crest portion of the Exarchate lockup at the same optical height: 52px on desktop and 40px on mobile.
- **Responsive behavior:** Preserve both institutional marks, the hairline, and the publication identity in one compact identity row. Place the language choices below the masthead's single green divider.
- **Desktop rhythm:** Use an 80px identity row, place languages 16px from its top edge, follow it with the single 1px green divider and a 48px primary-navigation row, then use 24px before homepage content.
- **Mobile rhythm:** Use a 60px identity row: the 44px menu target plus 8px vertical padding determines the row while the 40px marks center inside it. Follow it with the single 1px green divider and one 44px language row, then use 8px before homepage content.
- **Scrolling:** The document owns vertical scrolling. Publication components create no nested vertical scroller and reserve no scrollbar gutter.

- **Page intro spacing:** Use 48px above and 32px below the desktop archive/page intro; use 32px above and 24px below on mobile.

### Navigation

- **Style:** Center Playfair navigation inside a 48px row under a neutral hairline.
- **States:** Hover and active labels turn green; the active item receives a thin gold underline. The mobile menu uses a three-line trigger and a white, hairline-divided overlay.
- **Languages:** Keep multilingual switches compact in Arimo, with the same green-and-gold active treatment.

### Motifs

- **Story rail:** Use the single-column green chain SVG at its intrinsic ratio, positioned 4px beyond the right edge of the desktop story rail. Remove it when the desktop story rail collapses.
- **Service band:** Use the pixel-faithful ceremonial-gold chain continuously at grid-column boundaries. Desktop shows the four quarter boundaries; mobile shows the center and outer-right boundaries. The motif itself owns each boundary.
- **Assets:** Preserve the client PNG extractions as the production masters. The vectorization comparison remains an audit artifact until an identity-owner SVG export supersedes it.

### Story Links

- **Shape:** Inline and square with a compact arrow aligned to the text.
- **Color:** Patriarchal green on light fields and ceremonial gold on the library-blue field.
- **States:** Preserve direct text behavior and the universal blue focus outline.

### Editorial Cards

- **Corner Style:** Crisp rectangular image and copy regions.
- **Background:** White by default; cool bone for archive and placeholder contexts.
- **Shadow Strategy:** Flat at rest, with a quiet image-scale response on hover.
- **Structure:** Pair an image crop with green uppercase eyebrow, bold Playfair title, and compact Arimo metadata. Desktop grids become thumbnail-led rows on phones.

### Service Links

- **Shape:** Full-width rectilinear cells inside the patriarchal-green band.
- **Color:** White text, ceremonial-gold line icon, and the exact client ceremonial-gold chain between adjacent cells. One gold hairline separates the two mobile rows.
- **Icon size:** Use a 34px ceremonial-gold line icon, matching the height of the title-and-description block.
- **Hover / Focus:** Deepen the green fill on hover and retain the universal blue focus outline.

### Inputs / Fields

- **Style:** Use the generated shadcn/Base UI `InputGroup`, `Select`, and `Combobox` primitives at their standard 32px control height. Archive controls sit directly on the white page in a lightweight toolbar: one flexible search field followed by compact filters. The toolbar stacks with an 8px gap on phones, forms two columns at tablet width, and resolves to one row on desktop.
- **Ownership:** Control shape, border, type, focus, and disabled states come from the shared primitives. Feature components may set width and responsive layout; they do not restyle control internals.
- **Focus:** Use the universal two-pixel library-blue outline with a four-pixel offset.
- **Icons:** Use restrained green line icons at approximately 18px.

### Chips

- **Style:** Article tags use white fields, quiet-ink labels, neutral hairlines, full pill corners, and compact 7px by 11px padding.
- **Placement:** Keep them as end-of-article metadata after a separating hairline.

### Editorial Preview

- **Identity:** Reuse Arimo, Playfair Display, living ink, patriarchal green, ceremonial gold, exact brand imagery, and hairline masthead structure inside the CMS preview.
- **Reading:** Constrain the article to approximately 760px, give hero media a 460px maximum height, and preserve the large Playfair title, serif description, and spacious body leading.
- **Status:** Render homepage-placement status as a compact gold label with green text, keeping editorial workflow metadata visually distinct from article content.

## Design Commitments

### Do:

- **Do** preserve the exact dual-mark order and keep `ortodoksas.lt` visible as the publication identity.
- **Do** use green hairlines, paper fields, editorial image crops, and spacing to structure dense information.
- **Do** pair Playfair publication content with Arimo utility text across both public pages and editorial preview.
- **Do** treat chain and grid motifs as authentic, cropped institutional signatures.
- **Do** maintain the homepage's lead-to-archive journey as a homepage behavior.
- **Do** preserve the blue focus outline and reduced-motion behavior across interactive elements.

### Boundaries:

- **Preserve** the client-supplied Exarchate lockup and the Patriarchate-then-Exarchate mark order.
- **Reserve** gold for precise accents instead of broad backgrounds or routine body text.
- **Keep** editorial cards, fields, callouts, and navigation square and institutionally crisp.
- **Apply** the homepage's 56/44 story grid specifically to its lead-story composition.
- **Favor** the compact institutional newsroom over lifestyle-blog staging, floating-card stacks, or ornamental church aesthetics.
