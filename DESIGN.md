---
name: PIAUIGRAPH
description: A plain-language public catalog for finding purchases and following official evidence in Piauí.
colors:
  navy: "#102e42"
  ink: "#163247"
  muted: "#526775"
  teal: "#087a72"
  teal-dark: "#065e59"
  teal-light: "#e3f2ed"
  paper: "#f4f5f1"
  surface: "#ffffff"
  line: "#d5dfde"
  amber: "#84500e"
  amber-light: "#fff3d9"
  focus: "#c27619"
  map-canvas: "#e8eeea"
  map-data: "#6baba0"
  map-empty: "#d6e2da"
  map-region: "#b8d8d0"
  graph-edge: "#8caeaa"
  diagram-surface: "#edf3ef"
  estimate-bar: "#264b62"
typography:
  display:
    fontFamily: '"Source Sans 3", Arial, sans-serif'
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: '"Source Sans 3", Arial, sans-serif'
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Source Sans 3", Arial, sans-serif'
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  record-title:
    fontFamily: '"Source Sans 3", Arial, sans-serif'
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: '"Source Sans 3", Arial, sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Source Sans 3", Arial, sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  bar: "3px"
  tag: "5px"
  icon: "6px"
  control: "7px"
  callout: "8px"
  search: "9px"
  inset-map: "11px"
  panel: "12px"
spacing:
  tight: "8px"
  inline: "12px"
  mobile-gutter: "16px"
  disclosure: "20px"
  section: "24px"
  column-gap: "28px"
  page-top: "32px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.teal-dark}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.teal-dark}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-outline-hover:
    backgroundColor: "{colors.teal-light}"
  button-text:
    textColor: "{colors.teal-dark}"
    padding: "7px 0"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.search}"
    padding: "7px 8px 7px 17px"
  input-select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 28px 8px 11px"
  nav-workspace:
    textColor: "{colors.muted}"
    padding: "10px 0 13px"
  nav-workspace-selected:
    textColor: "{colors.teal-dark}"
  chip-check:
    backgroundColor: "{colors.amber-light}"
    textColor: "{colors.amber}"
    rounded: "{rounded.tag}"
    padding: "3px 8px"
  row-record:
    textColor: "{colors.ink}"
    padding: "21px 4px 21px"
  card-record:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "23px"
  node-evidence:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.search}"
    padding: "10px 12px"
    width: "170px"
  node-evidence-selected:
    backgroundColor: "{colors.teal-dark}"
    textColor: "{colors.surface}"
---

# Design System: PIAUIGRAPH

## Overview

**Creative North Star: "Public library wayfinding"**

PIAUIGRAPH is an approachable reading and finding tool for public procurement. Deep blue ink, teal signs and warm reading surfaces make the catalog recognizable without asking people to learn an auditing interface. Ordinary Portuguese, clear financial labels and visible official sources support readers across literacy levels.

Search and flat results lead the implemented civic explorer. Geographic context, paired value bars and documentary relationships support a chosen record. The user explicitly replaced the former burgundy, serif and map-first direction; those decisions are superseded. This is a record of shipped code, not a composition proposal.

**Key Characteristics:**

- Blue ink and teal wayfinding on warm paper and white surfaces.
- One self-hosted sans-serif family for headings, reading, controls and figures.
- Flat record rows, familiar filters and modest rounded controls.
- Named financial stages and factual visuals with visible source access.
- Responsive reading order, wrapping mobile tabs and alternative list access.

## Colors

The palette is calm and readable: navy anchors the identity, teal marks action and selection, and amber asks for checking. Frontmatter owns the durable values; `src/app/civic.css` and the map/network component sources are the implementation truth.

### Primary

- **Navy:** masthead, document header, browser theme color and geographic labels.
- **Teal:** primary actions, active tab rule, selected municipality and approved-result bars.
- **Deep Teal:** links, secondary actions, primary hover and the selected graph node.
- **Pale Teal:** secondary-action and icon-button hover surfaces.

### Secondary

- **Amber / Pale Amber:** a specific value or comparison that needs checking. These describe a question, not a finding of fraud.
- **Focus Amber:** a visible keyboard outline, distinct from informational amber fills.

### Neutral

- **Ink / Muted:** primary content versus supporting metadata and explanations.
- **Paper / Surface / Line:** page background, reading panels and thin separating rules.
- **Map Canvas / Map Empty / Map Data / Map Region:** geographic field, absence of records in the current selection, presence of records and regional context. Selection reuses Teal.
- **Diagram Surface / Graph Edge:** the quiet network viewport and documented connecting paths.
- **Estimate Bar:** the blue comparison series paired with Teal approved-result bars.

**The Evidence Color Rule.** Color identifies an action, selection, published stage or coverage state. It never establishes wrongdoing.

## Typography

**Display Font:** Source Sans 3 with Arial and sans-serif fallbacks.
**Body Font:** Source Sans 3 with the same fallbacks.
**Label/Mono Font:** the same family; identifiers wrap and monetary figures use tabular numerals where aligned.

**Character:** direct, familiar and readable. The shipped stylesheet imports local Fontsource Latin faces at weights 400, 600 and 700; no remote font request or serif display pairing is part of this system.

### Hierarchy

- **Display:** document-page title, with a maximum line length of 22ch. Mobile reduces it to 32px and 19ch.
- **Headline:** the explorer's task heading. At 600px and below it becomes 27px/1.16 with a 20ch maximum.
- **Title:** section headings; mobile sections use 23px. Supporting third- and fourth-level headings use 21px and 18px.
- **Record title:** result rows use the frontmatter role with a three-line clamp and a 70ch maximum. Detail titles use 22px/1.35, then 21px/1.4 on mobile; these are read in full with long words allowed to wrap.
- **Body:** normal reading, with paragraphs capped at 75ch. Document paragraphs use 1.7 line height; document introductions use 20px, reducing to 18px on mobile.
- **Label:** filter labels and metadata. Supporting text ranges from 12px to 15px; graph-node type labels and small map legends reach 11px. These compact roles are not the default body size.

**The One Reading Voice Rule.** Use Source Sans 3 across the interface; establish hierarchy through size, weight and spacing.

## Layout

The explorer uses a centered frame with a maximum outer width of 1496px, 28px side gutters and 32px top padding. The normal workspace divides into `minmax(0, 1.8fr) minmax(330px, 1fr)` with a 28px gap. Results remain a continuous list of 20 records per page, separated by fine rules; they are not a card grid. Search, filters, coverage context and workspace tabs precede this reading workspace.

At 1500px and wider, top padding becomes 38px and the workspace uses a 38px gap with a 1.85fr main column. At 1100px and below, the gap becomes 22px and the sidebar minimum is 320px. At 999px and below, the layout becomes one column, the optional context map hides, gutters become 22px and detail panels stop sticking. A selected record replaces its result list. Network mode keeps the diagram first and places its selected-record panel afterward, capped at 430px with internal scrolling.

At 600px and below, gutters become 16px, the header becomes more compact and the first secondary header link hides. Filters open behind the labelled Filtrar control and use two columns. Region filtering becomes inline. Workspace tabs wrap into visible rows, including Ligações; they must remain reachable without horizontal tab-strip scrolling. Result titles remain three lines, metadata wraps where specified and detail actions stack vertically.

The network deliberately scrolls inside its own bounded viewport: maximum height 650px, reducing to 510px on mobile. Its canvas is 1035px wide; that is an internal diagram dimension, not a page-width requirement. The full map is 620px high, then 560px below 999px and 480px on mobile. A municipality list accompanies the map. Document pages use a separate 1040px reading frame and 28px gutters, reducing to 19px on mobile; tables use fixed layout and wrap long identifiers there.

Spacing follows repeated small gaps, readable control padding and larger section separations, rather than a rigid universal grid. The frontmatter lists repeated steps; component-specific values remain in the implementation.

## Elevation & Depth

The system is flat at rest: paper, white panels, thin borders and pale selected states carry structure. Actual shadows are limited to the region-filter popover, map-control cluster and an inset selected-row stroke. Record panels do not float on a large drop shadow.

### Shadow Vocabulary

- **Filter popover:** `0 8px 25px #16324720`; the desktop region-filter disclosure. Mobile removes the shadow and positions its contents inline.
- **Map controls:** `0 2px 8px #102e4212`; enough separation for controls placed over geography.
- **Selected row:** `inset 0 0 0 1px #a7c6bc`; a selection boundary paired with pale green fill.

**The Reading Surface Rule.** Use borders and tonal changes for reading structure; reserve the recorded drop shadows for overlays.

## Shapes

Controls have gently rounded corners, with slightly softer search fields and evidence nodes. Detail panels and full map/network viewports share the largest panel radius. Flat record rows and workspace-tab rules remain square. Tags use compact rounded rectangles, not pills. Map legends use small square swatches; node-and-line geometry describes actual records and edges.

Borders are thin (1px) except selected tab underlines (3px), selected municipal outlines (2px) and the keyboard focus ring (3px, offset 3px). The search field has its own group focus treatment: a teal border and a 2px pale teal outline, offset 1px.

## Components

### Buttons

Familiar, plainly labelled actions. Primary and outline buttons share inline-flex alignment, a 9px icon gap, weight 600, line height 1.2 and a 44px minimum height. Primary hover deepens teal; outline hover gains Pale Teal. Text buttons have no enclosing fill and underline on hover. Icon buttons gain Pale Teal on hover. Disabled buttons reduce opacity to 0.45 and use the unavailable cursor.

Keyboard focus uses the recorded amber ring on buttons, links, selects, inputs, summaries and focusable elements. The search input instead highlights its enclosing field. The global 44px control floor has observed compact exceptions: map controls are 38px, mobile search submission is 45px wide by 42px tall, and some secondary/mobile controls are 35–39px high. These exceptions describe the shipped interface rather than a new universal target.

### Inputs / Fields

A broad white search field leads the explorer, with a teal search icon and adjacent primary action. The desktop input is 18px and 43px high within the enclosing field; mobile is 16px and 39px high. The mobile submit button shows an arrow while its button text remains in the accessible name. Selects retain native behavior, a thin muted border and ordinary-language labels. Municipality, subject, year and contracting method remain independently visible on desktop; the region disclosure adds another familiar select.

### Navigation

The navy masthead pairs a compact geometric network mark with the product name and a short descriptor. Workspace tabs use weight 600, muted inactive labels, a teal selected label and bottom rule, plus small rectangular count badges. Selected state is also exposed through `aria-selected`. On mobile the tabs wrap; the selected Ligações tab remains visible. Navigation uses real text and inline SVG icons.

### Chips / Signals

The compact amber check tag reads Valor para conferir. Larger amber callouts state the reason and limitations of a comparison. Count badges are quiet metadata, not alerts. Amber signals are never rendered as unexplained risk scores.

### Cards / Containers

The selected-record panel is white, bordered, rounded and internally padded. On desktop it sticks 13px from the viewport top and scrolls within `calc(100vh - 26px)`; smaller screens restore ordinary document flow, with the network exception recorded in Layout. Loading, empty and failed states use plain text with a useful next action. Source and coverage disclosures remain part of the reading interface.

### Record Rows

Each row is one full-width button. Municipality and subject/year appear above the object, agency or supplier beneath it, then a stage-named amount and a directional arrow. Hover adds a pale green wash; selection adds a second pale tone and inset outline. The detail view supplies complete text when a row title or agency has been truncated.

### Financial Comparisons

Two horizontal bars share the same scale: Previsto uses Estimate Bar and Resultado aprovado uses Teal. Tracks are 11px high with compact corners. Both values are printed beside their labels; absent values receive no bar. Contract detail uses a separately named global published value with an explicit payment limitation. Never relabel an estimate, approved result or published contract amount as paid spending.

### Municipal Map

Real IBGE municipal boundaries carry categorical coverage states. The selected municipality receives Teal and an Ink outline; the legend explains selected, with-record and without-record states. Zoom and reset buttons have accessible names. The municipality list and native filter provide keyboard selection without requiring the canvas. If the map fails, the copy explicitly keeps search and list access available.

### Documentary Network

The selected record is named before the drawing, followed by counts, scope limits and the Ver os registros em lista disclosure. The list appears before the canvas in reading order and contains every returned node. Visible navigation buttons move left, return to the selected node or move right; no hidden gesture is required to discover the graph.

The drawing orders nodes by selected node, direct neighbors and label, then caps rendered nodes at 28. It uses five factual type columns, 208px apart, on a fixed-width canvas. Node buttons are 170px wide and at least 65px high; contract identifiers appear above the node title. Only edges whose endpoints are drawn appear in the canvas. Captions disclose any drawing limit and returned-graph truncation. Lists cover returned records, not an assertion of every database record. Edge evidence remains available through a separate official-source disclosure. Direct and one-more-step scope options use ordinary Portuguese.

### Motion / Access

A result-row hover changes background over 0.12s; the loading dot breathes over 1.1s. Default document scrolling is smooth and selected-map fitting lasts 450ms. With reduced motion requested, CSS transitions and animations are disabled, document scrolling becomes immediate and selected-map fitting uses zero duration. Explicit graph-navigation and result-page movements are immediate. The shipped sources do not establish an exhaustive reduced-motion guarantee for every MapLibre interaction.

The page declares Brazilian Portuguese and includes a focus-revealed skip link. Programmatic record/result headings deliberately omit an outline; normal interactive focus remains visible. Accessible names, textual counts, source lists and map/graph alternatives are part of the component contract.

## Do's and Don'ts

### Do:

- **Do** keep search and flat, readable results ahead of supporting geographic context.
- **Do** use the blue/teal palette and one self-hosted Source Sans 3 reading voice.
- **Do** print financial-stage labels, values, sources and coverage limitations beside the relevant visual.
- **Do** retain visible focus, native filters, wrapping mobile tabs and map/network list alternatives.
- **Do** disclose graph scope and drawing limits while keeping the full returned node list available.

### Don't:

- **Don't** restore the superseded burgundy/serif visual world.
- **Don't** use color, network proximity or a comparison difference to imply fraud.
- **Don't** substitute decorative charts or invented edges for documented data.
- **Don't** call an estimate, approved result or published contract value a payment.
- **Don't** turn the graph's internal scrolling canvas into horizontal page overflow.

Not canonized: source-record capitalization, compact secondary-control exceptions and tiny map/node metadata are observed constraints, not new defaults for future surfaces. No craft-floor refusal is promoted to a reusable rule. The unused legacy stylesheet and Tinos package are not evidence of the current visual system.

Recorded from `src/app/civic.css`, `src/app/layout.tsx`, `src/components/civic-explorer.tsx`, `src/components/evidence-network.tsx`, `src/components/municipal-map.tsx` and `src/components/document-shell.tsx`. Final capture evidence in `.impeccable/review/civic/evidence.json` covers ten desktop/mobile states with no reported page overflow or browser errors. This documentation pass did not rerun the detector.
