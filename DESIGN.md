---
name: Margin
description: A quiet personal English tutor shaped around reading and deliberate practice.
colors:
  canvas: "#f6f7f5"
  paper: "#fff"
  sidebar: "#eef1ef"
  ink: "#173d42"
  text: "#28464a"
  muted: "#5b6f71"
  faint: "#e8edeb"
  line: "#dce3df"
  accent: "#287e87"
  accent-hover: "#20656d"
  accent-soft: "#e5f1ef"
  cyan: "#87cdd3"
  peach: "#ffe0c8"
  peach-strong: "#e69a6d"
  peach-ink: "#754322"
  error: "#a63e37"
  error-bg: "#fff0ec"
  success: "#26704d"
  dark-canvas: "#172226"
  dark-paper: "#1d2c30"
  dark-sidebar: "#131e22"
  dark-ink: "#d7ebe7"
  dark-text: "#c6dad6"
  dark-muted: "#9bb4b2"
  dark-faint: "#26383c"
  dark-line: "#33464b"
  dark-accent: "#8bcfd1"
  dark-accent-hover: "#a6dfe1"
  dark-accent-soft: "#263f42"
  dark-cyan: "#86c8cc"
  dark-peach: "#654837"
  dark-peach-strong: "#e2a27d"
  dark-peach-ink: "#ffe3cb"
  dark-error: "#ffafa4"
  dark-error-bg: "#402c2a"
  dark-success: "#9ed6b8"
typography:
  display:
    fontFamily: "\"Anonymous Pro\", monospace"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "\"Anonymous Pro\", monospace"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  signature-term:
    fontFamily: "\"Anonymous Pro\", monospace"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.5
  article-headline:
    fontFamily: "\"Literata\", serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "-0.025em"
  reading:
    fontFamily: "\"Literata\", serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.98
  body:
    fontFamily: "\"Inter\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  title:
    fontFamily: "\"Inter\", sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "\"Inter\", sans-serif"
    fontSize: "13px"
    fontWeight: 500
  button:
    fontFamily: "\"Inter\", sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  navigation:
    fontFamily: "\"Inter\", sans-serif"
    fontSize: "12px"
    lineHeight: 1.6
  chip:
    fontFamily: "\"Inter\", sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  mark: "2px"
  chip: "4px"
  navigation: "6px"
  control: "7px"
  status: "8px"
  feedback: "9px"
  discovery: "12px"
  container: "14px"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
  "36": "36px"
  "40": "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-dark:
    backgroundColor: "{colors.dark-accent}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-secondary-hover:
    backgroundColor: "{colors.accent-soft}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    width: "100%"
  navigation:
    textColor: "{colors.muted}"
    typography: "{typography.navigation}"
    rounded: "{rounded.navigation}"
    padding: "10px 12px"
    width: "100%"
  navigation-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  chip:
    backgroundColor: "{colors.faint}"
    textColor: "{colors.muted}"
    typography: "{typography.chip}"
    rounded: "{rounded.chip}"
    padding: "3px 7px"
  recall-card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.container}"
    padding: "36px"
  selection-toolbar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "4px"
---

# Design System: Margin

## Overview

**Creative North Star: "The Reading Margin"**

Margin is a quiet, daily-use English learning workspace: cool paper, dark teal ink, small practical controls, and enough space to read comfortably. Its visual authority is the user-pinned Mochi and Reader references, interpreted originally in code. The surface contract records the implementation and review provenance.

Three self-hosted families divide the work clearly: Anonymous Pro supplies the signature, Literata carries reading and language examples, and Inter handles dense interface text. Teal guides action, cyan belongs to the bookmark motif, and peach marks language worth keeping. Light and dark themes retain these roles.

**Key Characteristics:**
- Readable typography with a distinct signature and a dedicated reading face.
- Quiet tonal surfaces, hairline divisions, and restrained overlays.
- Compact controls beside generous reading and task space.
- Peach annotations and a cyan bookmark connect collection with reading.

## Colors

The palette pairs cool, nearly white surfaces with teal text and actions, cyan paper details, and warm peach annotations. The frontmatter records the exact implemented light values and their `dark-` counterparts; `src/app/globals.css` supplies the runtime CSS variables.

### Primary

- **Action Teal** (`accent`, `accent-hover`, `accent-soft`): primary controls, active navigation, helpful feedback, and restrained task surfaces.
- **Deep Teal Ink** (`ink`, `text`): headings and primary interface or reading text, with a separate softer text role.

### Secondary

- **Peach Mark** (`peach`, `peach-strong`, `peach-ink`): prose selection and saved highlights, annotation quotations, the first discovery card, the account medallion, and small identity dots. Strong peach underlines collected language.
- **Bookmark Cyan** (`cyan`): the paper bookmark and working indicator dots; it is a supporting detail.

### Neutral

- **Cool Canvas** (`canvas`), **Paper** (`paper`), and **Sidebar Mist** (`sidebar`): separate the workspace, editable or raised surfaces, and navigation without heavy borders.
- **Muted Teal** (`muted`), **Faint Mist** (`faint`), and **Hairline** (`line`): secondary copy, quiet hover backgrounds, chips, tracks, and dividers.
- **Error** (`error`, `error-bg`) and **Success** (`success`): semantic status colors. Error foreground and background appear together in alerts.

All `dark-` primitives replace the equivalent runtime role under the dark theme; they are not an additional decorative palette. Primary controls use light deep-teal ink as their dark-theme foreground, and danger controls use the dark error background as their foreground.

**The Contextual Color Rule.** Use teal for actions and active navigation, peach for selected or collected language and warm emphasis, and cyan for the bookmark motif. Preserve these roles across themes.

## Typography

**Signature Font:** Anonymous Pro, monospace.
**Reading Font:** Literata, serif.
**Dense UI Font:** Inter, sans-serif.

All three families are self-hosted. Anonymous Pro provides regular and bold files, Literata supports weights 200–900, and Inter supports weights 100–900. Inter is an explicit user requirement despite the automated detector's generic overuse warning.

### Hierarchy

- **Display:** signature page headings use the `display` role. Some settings and progress headings use a compact variant (29px); mobile page headings are generally 28–29px.
- **Headline:** signature section headings use `headline`, with contextual sizes from 20px to 26px. These are compact task headings rather than oversized promotional text.
- **Signature term:** bank rows use `signature-term`; a recall term expands to 35px, regular weight, with a 1.3 line-height.
- **Article headline:** Literata uses `article-headline`; source titles remain distinct from signature interface headings. Reading-list titles use 20px, weight 550, and a 1.5 line-height.
- **Reading:** article prose uses `reading`. Its initial size is 20px and the reader controls adjust it from 17px through 26px. The mobile line-height becomes 2. Examples and quotations use Literata at 13–19px according to context.
- **Body and title:** dense interface copy uses `body`; subsection titles use `title`. Paragraphs generally use a 1.7 line-height, with explanatory copy often between 1.8 and 1.9.
- **Label and metadata:** forms and buttons use the label/button roles; navigation uses 12px, becoming 13px in the mobile drawer. Secondary metadata is commonly 10–12px. These smaller roles are for compact supporting text, not reading passages.

**The Three Voices Rule.** Use only Anonymous Pro for the signature, Literata for reading, and Inter for dense interface text. Do not introduce another display or interface family.

## Layout

The desktop workspace fills the viewport with a fixed-width sidebar (218px), a toolbar (62px high), and an independently scrolling main area. Standard pages are centered within a maximum width of 1160px and use padding of 42px 52px 72px. Specialized workspaces narrow that measure; reading and exercise pages remain focused on their content. The spacing primitives record repeated increments, not a claim that every dimension follows a single scale.

The reading column has a maximum outer width of 850px with 44px horizontal padding. Its optional notes rail is 288px wide; the reading toolbar stays above the prose. Language-bank details occupy 365px beside the list. List rows use whitespace and bottom rules; forms and dialogs use explicit internal gaps.

Responsive behavior follows the implemented breakpoints:

- At widths of 1600px and above, the notes rail becomes 330px and the reading column's maximum outer width becomes 865px.
- At 1200px and below, the sidebar becomes 195px, page padding becomes 35px 34px 60px, the notes rail becomes 255px, and bank detail becomes 320px.
- At 1000px and below, the sidebar becomes 182px, notes move beneath the reading column, and bank detail replaces the list while open. Practice and supporting content stack.
- At 760px and below, navigation becomes a 230px drawer with a scrim and the main toolbar becomes 57px high. Page padding becomes 30px 25px 55px.
- At 520px and below, page padding becomes 28px 20px 45px, form and list tools reflow, and reading-column padding becomes 29px 23px 35px.

Print styling removes interface chrome and annotations rail, releases viewport scrolling, and prints prose at 12pt with a 24pt article title.

## Elevation & Depth

Tonal surfaces and hairline borders provide most separation. Ordinary reading, list, discovery, exercise, and recall surfaces have no elevation shadow. Diffuse shadows identify floating controls, status feedback, dialogs, and the illustrated paper; none is a hard offset shadow.

### Shadow Vocabulary

- **Floating overlay:** `0 8px 32px #173d4214`; dark theme uses `0 8px 32px #0003`. Used by model menus, the selection toolbar, and status toasts.
- **Modal:** `0 20px 100px #122c4233`, with a `#102f3a55` backdrop and a 3px backdrop blur.
- **Paper motif:** `0 8px 16px #173d4210`, confined to the small illustrated sheet.
- **Global error:** `0 10px 60px #153c4230`, identifying the floating error panel.

**The Flat Workspace Rule.** Keep reading surfaces, lists, and learning cards flat. Reserve diffuse shadows for overlays and the paper motif.

Interaction transitions generally last 160ms with `cubic-bezier(0.16, 1, 0.3, 1)`. Fields use 160ms border and shadow transitions with the CSS default easing. The drawer uses 200ms, review progress uses 250ms, and a toast enters over 180ms. Loading spins and pulses convey active work. The reduced-motion preference removes animation and transitions and returns scrolling to automatic behavior.

## Shapes

Controls use small, practical corner rounding; chips and marks use tighter corners. Learning containers and dialogs use the larger container radius, while discoveries use the intermediate discovery radius. Borders are normally a 1px hairline. The frontmatter owns the recurring radii.

The distinctive rounded silhouettes are the asymmetric empty-state/complete medallion (40px 40px 25px 25px), paper with one deeper lower corner (6px 6px 20px 6px), a clipped bookmark tail, and small circular account or identity marks. These motifs supply warmth without making every control a pill. The implementation also uses ordinary rounded cards and dialogs; the surface brief's emphasis on motif rounding does not prohibit these established containers.

## Components

### Buttons

Compact, readable, and clearly actionable. Standard controls have a minimum height of 40px; reader and inline contexts use smaller variants. The primary teal control lightens or deepens on hover according to theme and lifts by 1px, returning on press. Secondary controls use paper, deep ink, and a 1px inset hairline that becomes teal on hover. Ghost controls use muted text and a faint hover fill. Danger controls use the semantic error pair. Disabled and busy controls are noninteractive and use 0.5 opacity; busy buttons include an SVG spinner.

All keyboard-operable controls retain a visible accent outline (2px) with a 4px offset, except fields, which use the dedicated focus treatment below.

### Chips

Small rectangular category tags use faint mist, muted text, tight padding, and the chip type role. Tags are descriptive, not interactive filters. The peach discovery card adapts its tag with peach ink and translucent paper.

### Cards / Containers

Recall and exercise cards use paper, a hairline border, and the container radius. Recall cards use 36px padding; exercise cards use 30px 32px. Teal-soft invitations and retention surfaces use the same broad form without elevation. Discovery cards use the discovery radius and their own compact padding. List rows stay open to the page and are separated by rules.

### Inputs / Fields

Fields use paper, a 1px hairline, the control radius, and standard field padding. Text and caret retain their text and accent roles. Hover moves the border toward muted teal; focus uses an accent border and a 3px soft-accent ring with no outline. Placeholder text uses the muted role at full opacity. Textareas resize vertically; passage and answer fields use Literata. Errors appear in a separate semantic alert rather than an invented field-error style.

### Navigation

The sidebar contains SVG icons and compact Inter labels. Navigation rows have a minimum height of 42px; hover uses faint mist and ink, while the current page uses soft teal, teal text, and weight 600. Count chips align to the right. Tabs use a 2px accent underline and stronger text for the active view. Mobile uses the same navigation vocabulary inside the drawer, with visible open and close controls.

### Reading Selection and Collection

Selecting prose reveals a compact fixed toolbar in deep ink with light text. Selection and saved annotations use peach in the passage; collected marks add a thin strong-peach underline with a 5px underline offset. The notes rail repeats the selected quotation in Literata on a peach surface. Successful collection changes the control to a disabled collected state and displays feedback. Keep SVG icons inline and controls near the selected text.

### Empty States and Dialogs

Empty states center a signature heading, short muted explanation, optional asymmetric medallion, and one contextual action. Native dialogs use paper, the container radius, 26px padding, a 560px maximum width (760px for wide dialogs), a viewport-aware height limit, and the diffuse modal backdrop. Their visual behavior follows the shared field, button, and focus rules.

## Do's and Don'ts

### Do:
- Do keep Anonymous Pro, Literata, and Inter in their established roles.
- Do use the matching dark token when the theme changes, including the explicit dark button foregrounds.
- Do preserve visible keyboard focus and the reduced-motion override.
- Do use peach marks in the reading text and keep annotation controls close to the selected passage.
- Do keep lists divided by hairlines and learning cards flat.

### Don't:
- Don't replace the user-specified families with default system display faces or additional fonts.
- Don't turn cyan and peach into competing primary action colors.
- Don't add decorative elevation to ordinary list rows or learning cards.
- Don't use text glyphs in place of the implemented SVG icon vocabulary.
- Don't remove reading-size controls or squeeze the notes rail beside prose below the implemented breakpoint.
