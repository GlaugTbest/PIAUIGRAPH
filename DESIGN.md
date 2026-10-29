---
name: PIAUIGRAPH
description: A geographic workspace for examining public procurement evidence in Piauí.
colors:
  wine: "#73030D"
  wine-soft: "#732F3B"
  paper: "#F2F2F2"
  ink: "#0D0D0D"
  muted: "#675C5F"
  line: "#DCD3D5"
  surface: "#FFFFFF"
  tint: "#F6F0F1"
  map-canvas: "#F0EDED"
  map-data: "#AC727D"
  map-empty: "#DED7D8"
  map-region: "#D0AEB4"
  graph-edge: "#C3A7AD"
  graph-context: "#A87D85"
typography:
  display:
    fontFamily: '"Tinos", "Times New Roman", serif'
    fontSize: "46px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  headline:
    fontFamily: '"Tinos", "Times New Roman", serif'
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Tinos", "Times New Roman", serif'
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.5
  figure:
    fontFamily: '"Tinos", "Times New Roman", serif'
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.1
rounded:
  compact: "3px"
  control: "4px"
  workspace: "5px"
spacing:
  inline: "8px"
  control: "12px"
  section: "18px"
  panel-end: "20px"
  frame: "24px"
  panel-inline: "25px"
  page-inline: "32px"
components:
  button-primary:
    backgroundColor: "{colors.wine}"
    textColor: "{colors.surface}"
    rounded: "{rounded.compact}"
    padding: "9px 12px"
  button-export:
    textColor: "{colors.wine}"
    rounded: "{rounded.control}"
    padding: "12px 13px"
  button-export-hover:
    backgroundColor: "{colors.tint}"
  button-icon:
    textColor: "{colors.wine-soft}"
    rounded: "{rounded.control}"
    height: "35px"
    width: "35px"
  button-icon-hover:
    backgroundColor: "{colors.tint}"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "48px"
  nav-panel:
    backgroundColor: "{colors.surface}"
    typography: "{typography.label}"
    padding: "13px 0"
  chip-count:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.wine}"
    rounded: "{rounded.compact}"
    padding: "0 7px"
  row-procedure:
    padding: "19px 0"
  row-territory:
    padding: "13px 0"
  card-sample:
    backgroundColor: "#f5f1f2"
    rounded: "{rounded.compact}"
    padding: "13px"
  map-legend:
    backgroundColor: "#ffffffeb"
    rounded: "{rounded.compact}"
    padding: "12px 14px"
---

# Design System: PIAUIGRAPH

## Overview

**Creative North Star: "A precise geographic investigation workspace"**

The implemented world follows the user-pinned direction: a wine masthead, paper-light workspace, Times-like titles and a map that opens directly into public records. Territory selection connects the geographic view to the contextual evidence panel. Portuguese labels, source links and coverage statements are part of the working interface.

The character is compact, restrained and documentary. Tinos gives names, headings and figures an editorial voice; Arial carries controls and dense supporting text. Thin separators and pale tonal surfaces organize information with little visual elevation. Red marks selection and action, never guilt.

**Key Characteristics:**

- Map-first navigation with a contextual evidence panel.
- Wine accents on paper and white surfaces.
- Tinos headings and figures paired with Arial controls and supporting text.
- Compact controls, thin rules and small corner radii.
- Visible coverage, limitations and official evidence.

## Colors

Wine and dusty rose establish the identity; warm gray and mauve-derived neutrals keep territory and evidence readable. Frontmatter records the implemented values. CSS custom properties in `src/app/globals.css` remain the implementation source.

### Primary

- **Wine:** masthead, selected territory, primary evidence action, active tabs, links and monetary emphasis.
- **Soft Wine:** secondary iconography, supplier/procedure distinctions and supporting territorial accents.

### Neutral

- **Paper:** application background beyond the workspace.
- **Ink:** primary text, selected municipal outline and product nodes.
- **Muted:** supporting labels and explanatory text.
- **Line:** panel divisions, rows, controls and tables.
- **Surface:** toolbar, evidence panel and controls.
- **Tint:** restrained hover and count-badge surfaces.
- **Map Canvas / Map Empty:** quiet geographic field and municipalities without records in the current load.
- **Map Data / Map Region:** recorded coverage and selected regional scope.
- **Graph Edge / Graph Context:** documented relationships and contextual nodes.

**The Selection Rule.** Wine denotes selected scope and available actions; it never asserts fraud or irregularity.

The user-provided neutral gray (`#8C8C8C`) is not currently used in the inspected sources. The build uses the muted and line colors recorded above; this documentation does not silently substitute the requested gray or authorize a palette expansion.

## Typography

**Display Font:** Tinos with Times New Roman and serif fallbacks.
**Body Font:** Arial with Helvetica and sans-serif fallbacks.

The serif provides identity and a clear reading hierarchy. Its contrast with plain interface text lets figures and record titles stand out without decorative type treatments. Tinos regular and bold Latin faces are bundled through Fontsource.

### Hierarchy

- **Display:** document-page titles use the display role; the mobile override is (37px).
- **Headline:** current territory heading uses the headline role; the mobile override is (32px).
- **Title:** section headings use the title role, with observed local variants from (19px) to (29px). Procedure-row titles are bold serif (18px/1.25), rising to (20px) on mobile, and clamp to three lines.
- **Body:** the global body role serves interface text. Reading pages use (14px/1.8), bounded to (75ch); mobile reading text is (13px).
- **Label:** tabs use the label role. Controls use regular sans serif (13px), falling to (11px) on mobile. Smaller provenance text exists locally and is not a general text-size target for future surfaces.
- **Figure:** summary figures use the figure role with tabular numerals, rising to (31px) on mobile. Monetary emphasis uses regular serif (26px/1.4), or (29px/1.25) for item unit prices.

**The Reading Hierarchy Rule.** Use Tinos for headings, record titles and prominent figures; keep dense controls and supporting text in the implemented sans-serif stack.

The built typography is a serif/sans pairing. The product's broader Times-like typography commitment has not resulted in a serif body stack; this is recorded as existing implementation drift, without changing the interface.

## Layout

Desktop uses a viewport-height flex shell (100dvh, minimum 740px). A wine masthead (76px), white toolbar (minimum 90px), compact context line and footer frame the main workspace. The workspace has (24px) side margins and a two-column grid: flexible map plus contextual panel (448px). The panel body scrolls independently, while its tabs stay at the top of that scrolling area. Default panel inset is (25px).

At widths at or above (1600px), the panel grows to (490px), its inset becomes (30px), and the masthead becomes (82px). At widths at or below (1150px), the panel narrows to (405px), its inset becomes (22px), the brand description disappears, and some utility actions show their icons alone.

At widths at or below (800px), the shell becomes document-flow height. The masthead becomes (67px); search occupies the full toolbar width above three filters. The final cascading filter widths are region (30%), period (33%) and medicine (37%), preserving the complete period value. The workspace stacks inside (12px) margins; the map region is (400px) high with a minimum map shell of (350px). The panel follows below with a collapse toggle and (20px) horizontal inset. Its content scrolls with the page. This is an in-flow bottom panel, not a fixed overlay or draggable sheet.

Spacing is dense and component-led rather than a uniform mathematical grid. Preserve the distinction between compact inline gaps, control padding, section separation and the wider desktop page frame.

## Elevation & Depth

Most surfaces are flat. One-pixel dividers, pale tints and containment supply depth. The reusable shadow is reserved for the search-results overlay (`0 8px 24px rgb(47 12 21 / 10%)`). The map legend uses translucent white, with no decorative shadow. Do not apply the search-overlay shadow to ordinary evidence rows or the workspace.

**The Flat Workspace Rule.** Keep permanent map and evidence surfaces flat; use the existing shadow to distinguish the floating search results.

## Shapes

The form language is almost square: compact (3px), control (4px) and workspace (5px) radii. The mobile workspace uses the control radius. Fine borders define sections instead of a repeated card grid. Small circles are reserved for status/coverage marks and graph entities. Graph procedures are compact rounded squares; supplier and product nodes are circles. The municipal boundary is the signature irregular silhouette.

## Components

### Buttons

Primary official-source links use wine fill, white text, a compact radius and (9px 12px) padding. They do not have a separate implemented hover fill. Secondary text actions remain wine without a filled container. Export actions use an outline, a control radius, (12px 13px) padding and a tint on hover. Icon actions are bordered squares (35px). Disabled buttons reduce opacity to (0.45).

Interactive elements receive a wine focus outline (2px) offset by (4px); masthead links use white. Primary source links use a (3px) focus offset. Icons are vector strokes, not text glyphs.

### Inputs / Fields

Search is a white bordered control with a control radius and icon, desktop height (48px), mobile height (45px). Focus belongs to the outer search wrapper: wine outline (2px), offset (2px). The input itself has no duplicate outline. Suggestions float below in a bordered, shadowed container with a bounded scrolling height; groups and hovered rows use tint.

Toolbar selects are compact, transparent, labelled fields divided by vertical rules. Medicine and region values may truncate in constrained space; retain the complete period value. Native selects retain their actual options and labelled purpose.

### Navigation

The masthead navigation uses pale text and a white bottom rule for the current surface. Hover brightens text and exposes a pale wine rule. On mobile, the current Explore label and public-data tag are hidden, leaving methodology and sources accessible.

Panel tabs are sticky on white, with wine text and a (2px) wine bottom border for the selected tab. They change the evidence view within the current scope. Network is available for a defined center; clearing the center returns navigation to purchases, while a directly opened centerless network view explains how to choose a center.

### Chips / Counts

Small count badges use wine text on tint with compact corners. They annotate list headings; they are not selectable filter chips.

### Evidence Rows / Containers

Procedure and territory records are full-width rows divided by a fine bottom border. Procedure rows use serif titles, supporting metadata and a source/action arrow. Hover adds a very pale wine wash; the selected procedure uses a pale wine surface. Comparison rows align identity at left with price at right. Avoid recasting these lists as large elevated cards.

Insufficient-data explanations use a pale, compact inset container. Error messages use a pale red surface and a labelled retry action. Empty states use a plain icon, serif heading and short explanation; they preserve the ability to continue using search and territory lists.

### Municipal Map / Network

The map uses official municipal shapes on a quiet canvas, fine light boundaries and a dark outline around wine-filled selection. Controls sit at top right; the legend sits at lower left and identifies recorded coverage, no records in this load and selection. Coverage color does not imply comprehensive geographic coverage. Attribution and the territorial limitation remain visible.

The network uses a (600 × 400) SVG viewBox with a central node and two positional rings. Fine edges, circle/square node types, short labels and a pale container support compact reading. A disclosure exposes named nodes for recentering; relationship evidence remains linked below. It is a bounded projection, with truncation disclosed when present.

Map selection fits the selected boundary over (450ms), becoming immediate for reduced motion. State changes otherwise remain direct. The reduced-motion stylesheet shortens CSS animation and transition durations to (0.01ms) and disables smooth scrolling.

## Do's and Don'ts

### Do:

- **Do** open directly into the geographic workspace and retain equivalent list access.
- **Do** use the implemented wine, paper and white roles, with Tinos headings and visible focus.
- **Do** keep coverage, insufficient data and official-source actions in the evidence flow.
- **Do** preserve complete period labels and the mobile panel's normal document flow.
- **Do** respect reduced motion when moving the map or scrolling to a record.

### Don't:

- **Don't** use red selection or graph relationships as visual accusations.
- **Don't** replace thin evidence rows with elevated card grids.
- **Don't** treat a municipality without records in this load as proof of zero procurement.
- **Don't** assume the entire user-requested palette or a serif body has been implemented.
- **Don't** reproduce the smallest provenance text as a default size for new interface content.
