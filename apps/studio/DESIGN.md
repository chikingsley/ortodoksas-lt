---
name: Ortodoksas Studio
description: A focused institutional newsroom for archive conversion, canonical editing, automatic quality checks, and revision.
colors:
  brand-burgundy: "#af272f"
  brand-dark: "#861d24"
  gold: "#c8a34a"
  canvas: "#ffffff"
  editor-canvas: "#f4f1e8"
  surface: "#ffffff"
  ink: "#111111"
  secondary-surface: "#f4f1e8"
  secondary-ink: "#111111"
  muted-surface: "#f4f1e8"
  muted-ink: "#5c5650"
  accent-surface: "#f4f1e8"
  border: "#d3cdc0"
  input-border: "#d3cdc0"
  focus-ring: "#af272f"
  destructive: "#b42318"
typography:
  editor-title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "clamp(34px, 4.3vw, 56px)"
    fontWeight: 680
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  inventory-title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "30px"
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  interface-body:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  editor-body:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  preview-title:
    fontFamily: "Georgia, serif"
    fontSize: "clamp(38px, 6vw, 56px)"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  preview-summary:
    fontFamily: "Helvetica Neue, Helvetica, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  preview-body:
    fontFamily: "Georgia, serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.72
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "10px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "0.09em"
rounded:
  badge: "4px"
  field: "6px"
  inspector-field: "7px"
  icon-action: "8px"
  panel: "9px"
  action: "10px"
  editor: "12px"
  dialog: "14px"
  pill: "99px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "30px"
  section: "42px"
components:
  button-primary:
    backgroundColor: "{colors.brand-burgundy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.action}"
    padding: "0 10px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.action}"
    padding: "0 10px"
    height: "36px"
  search-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 9px"
    height: "36px"
  inventory-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  editor-frame:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.editor}"
---

<!-- markdownlint-disable MD036 -->

# Design System: Ortodoksas Studio

## Overview

**Creative North Star: "The Editorial Desk"**

Ortodoksas Studio is a calm, high-density newsroom for turning recovered archive material into canonical editorial records. The interface gives the article full-page focus while preserving source evidence, save state, automatic quality results, publication metadata, and revision history within the same working context.

Official Ortodoksas burgundy marks deliberate editorial action. Warm paper accents, white work surfaces, black editorial ink, one-pixel divisions, compact controls, and restrained shadows give the product the character of a durable staff system. The official Tiptap Simple Editor remains a distinct authored-content workspace inside that publication shell.

**Key Characteristics:**

- A conventional archive inventory for rapid scanning, search, filtering, and pagination.
- A focused article route with a sticky action bar, centered document canvas, and persistent desktop inspector.
- Conversion evidence, automatic quality results, revision history, and restore actions embedded in the editorial workflow.
- Geist interface typography, official Tiptap editing typography, and Georgia-led shared preview typography.
- Compact internal spacing from 4–12px, 20–30px structural rhythm, and 42px section separation.

## Colors

Official Ortodoksas burgundy is the functional brand accent. White and warm paper surfaces create hierarchy, muted ink carries secondary metadata, gold remains decorative, and destructive red identifies failures or change-request states.

### Primary

- **Brand Burgundy** (`colors.brand-burgundy`): primary actions, selected tabs and navigation, focus, and high-confidence editorial states.
- **Dark Burgundy** (`colors.brand-dark`): active text and strong brand emphasis.
- **Gold** (`colors.gold`): restrained decorative emphasis tied to the publication identity.

### Neutral

- **Archive Canvas** (`colors.canvas`): inventory background and outline-button fill.
- **Editor Canvas** (`colors.editor-canvas`): quiet surround around the full-page editor workspace.
- **Working Surface** (`colors.surface`): tables, document fields, editor frame, toolbars, dialogs, and inspector controls.
- **Editorial Ink** (`colors.ink`): titles, body copy, and primary operating text.
- **Muted Surface and Ink** (`colors.muted-surface`, `colors.muted-ink`): hover fills, secondary information, timestamps, and supporting labels.
- **Hairline Border** (`colors.border`): the primary separator across navigation, inventory, inspector, fields, and overlays.

### State Colors

- **Focus Ring** (`colors.focus-ring`): visible keyboard focus and field emphasis.
- **Destructive Red** (`colors.destructive`): errors and requested-change states.

**The Brand Emphasis Rule.** Use burgundy for selected states, primary publishing actions, and focus. Keep routine navigation and utility controls neutral, and reserve gold for decorative identity details.

**The Surface Hierarchy Rule.** Create depth with canvas shifts, white working surfaces, and hairline boundaries before adding shadow.

## Typography

Geist Variable owns every operating surface: navigation, inventory, fields, metadata, status, buttons, and authored content inside the editor. Interface text concentrates between 9px and 14px. Labels use 650–700 weight; the inventory title uses `typography.inventory-title`; the article title field uses `typography.editor-title` and falls to 34px on phones.

The official Tiptap editor renders authored paragraphs with `typography.editor-body`, 20px paragraph spacing, and its complete heading and rich-text hierarchy. The shared renderer switches publication presentation to `typography.preview-title`, `typography.preview-summary`, and `typography.preview-body`. At 520px, preview summary and body text both step down to 18px while the preview title holds at 38px.

**The Content Boundary Rule.** Preserve the official Tiptap type system inside the editor, the shared renderer type system inside preview and comparison, and Geist throughout the operating shell.

**The Hierarchy Through Weight Rule.** Use compact sizes and weight changes for operational hierarchy; reserve display scale for article and inventory titles.

## Layout

The inventory uses a 232px sticky rail and a fluid main area. Its content reaches 1500px, with 42px desktop padding and a single panel containing status tabs, search, section filtering, the article table, and pagination. At 1100px the rail contracts to 196px. At 800px it becomes a 64px brand header, the inventory loses secondary columns, and page padding contracts. At 560px tabs form two columns, the section filter drops away, and table rows become stacked article cards.

Opening an article removes the inventory rail and dedicates the viewport to editing. The 64px sticky action bar keeps route identity, save state, Preview, and Save draft visible. The workspace reaches 1320px and divides into a fluid document plus a 304px inspector; at 1040px the inspector contracts to 280px. The document uses `48px clamp(28px, 5vw, 72px) 96px` padding. Title, summary, lead image, and editor frame share an 860px maximum width; Tiptap content itself reaches 760px. Lead images use the available width with a 280px maximum height and contained cropping.

At 780px the editor becomes one column. The sticky header becomes a 102px two-row control band, the document padding becomes `32px 18px 56px`, and the inspector follows the document. A compact three-column status summary appears directly after the summary, followed by full-width source comparison. The editor toolbar sticks beneath the action bar at 102px. At 520px action labels compact, dialog padding and radii collapse to a true full-screen workflow, and public preview uses 16px side margins.

Preview and conversion comparison use viewport-contained overlays. Public preview reaches 1180 × 860px; comparison reaches 1440 × 860px. Comparison presents archived source and canonical result in equal columns on desktop, stacks them into 520px-minimum sections at 780px, and keeps import warnings in a scrollable footer.

**The Workflow Persistence Rule.** Preserve article identity, save state, preview, automatic quality status, and publication metadata through every responsive transition.

**The Focused Route Rule.** Treat editing as a full-page task and keep archive navigation outside the article route.

## Elevation & Depth

One-pixel borders provide the primary depth system. Tonal layering separates the archive canvas, white working surfaces, the pale inspector, and modal scrim. Shadows stay quiet across everyday work and become strong for overlays.

### Shadow Vocabulary

- **Panel Trace** (`0 1px 2px rgb(17 17 17 / 3%)`): inventory panel separation.
- **Primary Action Trace** (`0 1px 1px rgb(0 0 0 / 8%)`): compact emphasis on the inventory creation action.
- **Sticky Action Bar** (`0 5px 18px rgb(17 17 17 / 5%)`): a soft boundary beneath the 96%-opaque white editor bar.
- **Focus Halo** (`0 0 0 3px rgb(175 39 47 / 12%)`): search-field focus paired with the official burgundy border.
- **Overlay Lift** (`0 24px 70px rgb(0 0 0 / 30%)`): preview and comparison windows above the 68%-opaque dark scrim.

**The Bordered Workspace Rule.** Use one-pixel structure for persistent surfaces and reserve pronounced elevation for modal reading or comparison.

## Shapes

The system uses a measured radius ladder tied to scale and role. Count and language badges use 4px corners or a 99px pill. Search and filter fields use 6px; inspector controls use 7px; route icon buttons use 8px; the inventory panel uses 9px; primary and outline actions plus lead-image surfaces use 10px; the Tiptap frame uses 12px; and overlay windows use 14px. Avatars and status dots remain circular. Borders remain one pixel.

**The Radius Follows Scale Rule.** Increase curvature with component scale while retaining compact newsroom geometry.

## Components

### Inventory

The inventory follows established newsroom CMS conventions. Desktop rows are 67px high with a 43px square thumbnail, single-line title and summary, language badge, section, burgundy published state, and tabular date. The title column receives 48% of table width, and the complete table holds a 920px minimum width. Row hover uses the warm paper surface. Search and section filters are 36px high; status tabs occupy 51px; pagination sits in a 52px footer. Loading, empty, and error states stay inside the inventory panel.

At 560px each row becomes a card with a 48px thumbnail, two-line title, one-line summary, status, and date. Selection, language, and section cells yield to the core scan path. Status tabs form a stable two-column control group and the search field spans the panel.

### Official Tiptap Simple Editor

The editor frame contains the official Tiptap Simple Editor capability set. Its 44px toolbar provides undo and redo; headings 1–4; bullet, ordered, and task lists; blockquotes and code blocks; bold, italic, strike, code, underline, multicolor highlight, and links; superscript and subscript; four-way alignment; image upload; search and replace; and light or dark editor themes. Toolbar groups scroll horizontally when space tightens, and mobile highlight and link tools enter focused sub-toolbars with a clear return action.

The working frame has a 640px minimum height and a 590px minimum content area. Desktop authored content uses 48px top and side padding with 192px bottom space; at 640px the frame contracts to 540px, content contracts to 500px, and padding becomes `32px 20px 128px`. The surrounding article route keeps the official editor visually bounded from newsroom controls.

### Desktop Inspector

The inspector is a persistent pale surface separated by a left hairline. Sections use 24px padding and contain Workflow, Automatic quality checks, and Publication. Workflow presents status, recovered-archive source, current version, latest save time, editor identity, and an expandable revision history. Automatic quality checks present a pass or fail state, concrete structural findings, and the source-comparison entry point. Publication presents language and public path.

### Source Comparison

Recovered source HTML and normalized canonical output share the same comparison window. Equal desktop panes support direct visual checking; the responsive stack keeps each pane tall enough for meaningful reading. Numbered import warnings occupy the footer while automatic checks remain visible in the inspector.

### Revision History

Each save appends a numbered D1 revision with title metadata, editor identity, and time. The current version receives a quiet Current label. Older versions expose compact Restore actions. Restore writes the selected body and metadata as a fresh newest revision, preserving the prior sequence and updating the editor in place.

### Shared Preview

Preview renders canonical Tiptap JSON through the same full-document renderer used by the canonical comparison pane. The dialog combines title, summary, and body in a centered 760px publication measure. Georgia creates the reading voice for headline and prose; Helvetica-compatible sans serif separates the summary. The preview becomes edge-to-edge at 520px and retains its close action in a 62px header.

### Fields and Actions

Primary and outline actions are 36px high with compact corners, 14px text, compact horizontal padding, and 16px icons. Primary buttons use official burgundy; outline buttons use the canvas surface and hairline border. Hover adjusts fill, keyboard focus adds a three-pixel ring, active buttons move down one pixel, and disabled buttons use 50% opacity.

Inventory fields are 36px high with 6px corners. Inspector fields use 7px corners and `9px 10px` padding. The article title and summary are borderless textareas; the title grows with content, and the summary carries a 600-character count plus a bottom rule that turns burgundy on focus.

### Mobile Workflow

The mobile action bar places article identity and save state above Preview and Save draft. The compact status card exposes quality, current version, language, and source comparison before the lead image and article body. The full inspector follows the document for revision and publication work, while the sticky Tiptap toolbar remains directly beneath the 102px action bar.

## Do's and Don'ts

### Do

- **Do** preserve the desktop inventory’s table density and the phone inventory’s card readability.
- **Do** give the article route full-page focus with sticky preview and save controls intact.
- **Do** keep automatic quality findings, conversion evidence, media provenance, version numbers, and editor identity visible at their established workflow points.
- **Do** use the shared renderer for both public preview and canonical conversion comparison.
- **Do** preserve the official Tiptap capabilities, toolbar grouping, content styling, and mobile sub-toolbar behavior.
- **Do** restore older history entries as new revisions so the complete editorial sequence remains available.

### Avoid

- **Avoid** spreading brand burgundy across routine controls; its concentrated use signals editorial consequence.
- **Avoid** placing the inventory rail inside the focused article route.
- **Avoid** replacing the 304px desktop inspector with detached settings dialogs or hidden metadata.
- **Avoid** introducing public-site decoration, spacious marketing composition, or reader-facing ornament into this operating environment.
- **Avoid** letting responsive layouts bury Preview, Save draft, automatic quality findings, or publication state.
- **Avoid** rendering an alternate preview path with typography or extensions that differ from the shared renderer.
