# DESIGN.md — The Technical Editorial System

> **Purpose:** A portable design language for creating websites and web applications in the visual spirit of [imdaryl.com](https://imdaryl.com/): precise, editorial, instrument-like, tactile, and motion-aware. This document is **not** a copy of that portfolio's text, branding, or information architecture. Use it as the visual source of truth for any product, service, tool, startup, studio, documentation site, or software interface.
>
> **Design shorthand:** **An editorial publication meets a technical drawing meets a thoughtful product interface.**
>
> **Implementation priority:** Build *one* consistently designed product, not a collection of unrelated trendy components.

## 0. Provenance and how to read this file

Reference inspected October 2026:

- [Daryl Patigas — homepage](https://imdaryl.com/)
- [Example project detail](https://imdaryl.com/work/building-the-editor)
- [Vibrant Design reference entry](https://vibrant.design/website/lifimhf-imdaryl-com)

**Observed reference traits:** light editorial page treatment, numbered sheet/section system, restrained geometric marks, oversized two-tone hero typography, small metadata/captions, strong typographic hierarchy, poster/reel grids, a project-history timeline with editor-like controls, experiment cards, personal photograph/polaroid treatments, a compact utility navigation, and highly specific microinteractions. The gallery identifies **Plus Jakarta Sans** and **JetBrains Mono**, and lists the colors `#2E6FFF`, `#CBDBFF`, `#9098A6`, `#0E1116`, `#0A0C10`, `#9AB6FF`, `#5B8CFF`, and `#FFFFFF`.

**Interpretation and recommended additions:** exact spacing, font sizes, radii, easing, shadows, component variants, breakpoints, dark-mode roles, and app-specific patterns below are **implementation specifications proposed here**, not claims that those values were measured from the site's source CSS. Likewise, components such as pricing tables, onboarding flows, and settings screens are *extensions* of the visual language, not literal reference-site sections.

**Do not confuse visual inspiration with literal replication.** Preserve compositional grammar and interaction discipline; change content, imagery, information architecture, and product workflows to suit the new domain.

---

## 1. Design philosophy

### 1.1 Core idea

The interface behaves like a carefully annotated **design sheet** or **working document**. Every element has a reason to exist. Content sits in a measured grid; labels feel indexed; graphics resemble curated artifacts; interactions feel like operating a well-made instrument.

The result should be:

- **Editorial:** confident headlines, concise supporting copy, deliberate pacing, legible captions.
- **Technical:** coordinates, indexes, issue numbers, ruler ticks, outlines, subtle grid lines, datum marks, observable state.
- **Human:** intentional imperfect-feeling artifacts, candid images, plainspoken writing, and selective personality.
- **Interactive:** timelines, tabs, scrubbers, filters, hover reveals, media controls; motion communicates how elements relate.
- **Restrained:** very limited use of accent color, gradients, background decoration, and visual effects.
- **Modular:** any coherent product concept can be expressed in the language of *sheets, figures, panels, records, and controls*.

### 1.2 What makes this visual language recognizable

1. **Sheet notation:** `SHEET 01 / OVERVIEW`, `FIG 02.1`, `REV. 1.2`, `INDEX`, tiny geometric registration marks.
2. **Two-register typography:** massive expressive sans-serif headings paired with tiny, systematic monospaced labels.
3. **Two-tone emphasis:** the key word is deep ink; a companion word is muted steel/grey or an accent treatment.
4. **Fine structure:** border hairlines, rail marks, baseline alignment, figure captions, precise gaps, rule separators.
5. **An editorial rhythm:** dense information is followed by quiet open space; the page does not shout everywhere.
6. **Artifact-first visuals:** product screens, videos, diagrams, photographs, and genuinely useful illustrations, not generic blob shapes.
7. **Controlled interaction:** components respond quickly and subtly; interfaces behave rather than perform.
8. **Purposeful eccentricity:** one or two distinctive experiments per experience, never a gimmick on every card.

### 1.3 Anti-goals

Do **not** automatically turn this into:

- A black background with neon blue gradients on every section.
- A glassmorphism or frosted-glass dashboard.
- A soft, pill-heavy generic SaaS template.
- A brutalist design with arbitrarily harsh contrasts and no hierarchy.
- A portfolio clone using the original person's name, project history, location, or hobbies.
- A fake technical aesthetic made of decorative numbers with no meaning.
- A page full of animated 3D effects that competes with the actual product.

**Rule:** If a decorative device makes the content less readable or useful, remove it.

---

## 2. Universal design grammar

### 2.1 Name the structures, not the topic

Use the vocabulary below to organize any kind of content:

| Primitive | Meaning | Examples in another product |
|---|---|---|
| `Sheet` | A major self-contained content chapter | Product overview, feature group, pricing, FAQ |
| `SheetIndex` | Number and subject of a sheet | `SHEET 03 · THE ENGINE` |
| `Figure` | A demonstrated piece of evidence | App screenshot, performance chart, code sample, prototype |
| `FigureCaption` | Context for a figure | `FIG 03.2 · QUERY LATENCY / P95` |
| `Record` | A dated or enumerated object | Changelog item, customer story, release, task, event |
| `Artifact` | An interactive or media-rich exhibit | Video, motion demo, product model, before/after comparison |
| `ControlStrip` | Compact set of state-changing commands | Tabs, sort, filters, view toggles |
| `Annotation` | Small explanatory note | Metric definition, feature metadata, timestamp |
| `InstrumentPanel` | Dense operational UI | Dashboard chart, editor, timeline, simulator |
| `UtilityRail` | Lightweight global context/actions | Search, support, theme, notification, clock |
| `ClosingSheet` | Concluding conversion/communication area | Signup CTA, download, contact, next step |

Sections are *visually consistent* without needing identical content or layouts.

### 2.2 Composition rule

Every important section should usually contain:

1. Small sheet/figure identification.
2. An unmistakable heading, often with a muted companion phrase.
3. One concise statement about why the section matters.
4. One dominant form of evidence/content.
5. Fine-grained annotation, metadata, or controls, when useful.

Not every section requires all five. Repetition of *the system* is desired; repetition of *the exact component layout* is not.

---

## 3. Color system

### 3.1 Source palette and assigned semantic roles

The **hex values below are documented by the reference gallery**; the **role assignment is this portable system's interpretation**.

| Token | Value | Use |
|---|---|---|
| `--ink` | `#0A0C10` | Primary typography, high-emphasis controls |
| `--ink-secondary` | `#0E1116` | Inverse panels, slightly softer dark surface |
| `--paper` | `#FFFFFF` | Default page background; editorial canvas |
| `--steel` | `#9098A6` | Supporting type, secondary headings, IDs |
| `--blue` | `#2E6FFF` | Primary accent, focus, active states, sparing key moments |
| `--blue-hover` | `#5B8CFF` | Interactive emphasis on dark surfaces; lighter blue variant |
| `--blue-quiet` | `#9AB6FF` | Graphic traces, highlights on dark media |
| `--blue-pale` | `#CBDBFF` | Selected areas, illustrated lines, accent washes |

Derived, **proposed** utility colors:

| Token | Recommended value | Use |
|---|---|---|
| `--surface-muted` | `#F7F8FA` | Form surfaces, grouped controls, media mat |
| `--surface-raised` | `#FFFFFF` | Focused panels and popovers |
| `--text-secondary` | `#505763` | Readable long-form supporting text |
| `--text-tertiary` | `#6E7581` | UI labels, timestamps, captions |
| `--display-muted` | `#858E9D` | A contrast-adjusted muted tone for oversized two-tone display text |
| `--line` | `#E3E6EA` | Default dividers and hairline borders |
| `--line-strong` | `#C9CFD7` | Interactive outlines and structural guides |
| `--line-dark` | `#303746` | Dark-region dividers |
| `--negative` | `#B84646` | Error or destructive UI, used functionally only |
| `--positive` | `#34765E` | Success/status, used functionally only |
| `--warning` | `#946A22` | Warning/status, used functionally only |

### 3.2 Distribution

Default light application:

- **85–92%:** paper/white and near-white surfaces.
- **6–12%:** ink, typography, borders, and functional dark regions.
- **1–3%:** blue accent and its tints.

These are *heuristics*, not calibrated measurements of the reference. A dense SaaS application can use more dark ink and slightly more blue, but the accent remains punctuation, not wallpaper.

### 3.3 Color rules

- Light mode is the **default visual expression**.
- Black-on-white contrast is the anchor. Use the blue for an intentional moment of action or emphasis.
- Avoid large blue fills behind every card. Reserve a full accent surface for one significant section or graphic.
- Use blue on text only when the contrast is sufficient; **pale blue is never small text on white**. The raw reference blue `#2E6FFF` is slightly below 4.5:1 against white, so normal-sized link text should use a darker accessible blue such as `--color-accent-hover` or remain underlined in dark ink.
- The source steel `#9098A6` is better reserved for large decorative type or marks; use the proposed darker `--display-muted` for meaningful large headings and `--text-tertiary` for small metadata.
- Never encode success/failure or chart-series differences by color alone.
- Tinted panels should be subtle. Prefer white space, a line, and a caption over another filled card.
- On dark panels, use white ink, steel labels, muted rules, and a brighter blue for visible links.
- SVG diagrams should inherit semantic tokens, not hardcode new brand colors per diagram.

### 3.4 Optional inverse/dark mode

Dark mode is a compatible **extension**, not a mandate for the primary website:

- Canvas: `#0A0C10`
- Raised surface: `#0E1116`
- Primary text: `#FFFFFF`
- Secondary text: `#B7BECA` (proposed)
- Rule: `#303746` (proposed)
- Accent: `#9AB6FF` for text/links, `#2E6FFF` for strong accent fills when accessible

Use semantic token overrides. Keep the same typographic, editorial, and grid structure; do not invent a separate neon aesthetic for dark mode.

---

## 4. Typography

### 4.1 Families

- **Display and UI:** `Plus Jakarta Sans`, with a high-quality sans-serif fallback.
- **Technical notation and data:** `JetBrains Mono`, with a monospace fallback.
- No third decorative font by default. A handwritten image caption may be part of an actual photographed artifact, not a universal UI font.

Fonts identified by the reference gallery; the exact metrics below are system recommendations.

### 4.2 Type scale

| Role | Desktop | Mobile | Weight | Leading | Tracking |
|---|---|---|---|---|---|
| Hero display | `clamp(3.5rem, 7vw, 7.25rem)` | `clamp(2.8rem, 12vw, 4.6rem)` | 700–800 | 0.98–1.06 | `-0.055em` |
| Section title | `clamp(2.5rem, 4.8vw, 4.75rem)` | `2.25–3rem` | 700 | 1.05–1.12 | `-0.045em` |
| Feature heading | `1.75–2.5rem` | `1.5–2rem` | 600–700 | 1.13–1.2 | `-0.03em` |
| Editorial lead | `1.15–1.35rem` | `1.05–1.2rem` | 400–500 | 1.5 | `-0.018em` |
| Body | `0.9375–1.0625rem` | `0.9375–1rem` | 400 | 1.6–1.75 | `-0.005em` |
| UI control | `0.8125–0.9375rem` | same | 500–600 | 1.3 | `0` |
| Mono metadata | `0.6875–0.75rem` | `0.6875rem` | 400–600 | 1.45 | `0.035–0.08em` |
| Figure caption | `0.6875–0.8125rem` | same | 400–500 | 1.5 | `0.01em` |

### 4.3 Typographic signatures

**Two-tone headline** (frequently appropriate):

```text
Make work
feel effortless.
     ^ emphatic ink

Every detail, considered.
               ^ muted steel
```

Implementation: one semantically correct heading with inline spans. Use dark ink for the main claim and muted steel for the supporting phrase. Do not mute a key word required to understand the meaning.

**Micro-label:**

```text
◇  SHEET 02 · THE SYSTEM
   FIG 02.3 / INTERACTION STATES
   REV. 2026.10
   [01 / 06]
```

Use uppercase or restrained small caps, monospaced numbering, and disciplined spacing.

**Text-only link:** underlined or visibly distinguished at rest; on hover adjust underline or ink. Avoid tiny glyph-only navigation with no labels.

### 4.4 Writing style

- Use specific, ordinary, human language; avoid generic SaaS phrases like "unlock your potential."
- One clear idea per short paragraph.
- Headlines: evocative but comprehensible.
- Metadata: compact, matter-of-fact, and descriptive.
- Technical content: accurate numbers, units, time periods, state and provenance.
- Captions must explain what an image *shows* or *proves*.
- Lowercase, sentence case, and title case may mix **deliberately by role**, not arbitrarily.

---

## 5. Layout, grid, and page rhythm

### 5.1 Container system

Recommended baseline:

```css
:root {
  --page-max: 1360px;
  --content-max: 1120px;
  --reading-max: 680px;
  --page-gutter: clamp(20px, 4vw, 64px);
  --column-gap: clamp(16px, 2.3vw, 32px);
  --section-gap: clamp(104px, 12vw, 200px);
  --sheet-rail: 40px;
}
```

- Use a **12-column desktop grid**; switch to 8 columns for tablet and 4 for mobile when needed.
- Put important text on an editorial alignment line, not necessarily the center of the viewport.
- Editorial sidebars, figure indexes, and measurement annotations may occupy a quiet margin.
- Keep paragraphs constrained to approximately **55–75 characters** for readability.
- Let an image or editor/timeline escape the reading column into the wider grid.
- Do not use full-width imagery just to fill empty space.

### 5.2 Recommended breakpoints

| Range | Treatment |
|---|---|
| `<480px` | Narrow phone: 4-column grid, minimal utility controls, horizontal scroll for special instruments |
| `480–767px` | Wide phone: same content-first stack, slightly larger art |
| `768–1023px` | Tablet: 8 columns, two-up cards, compact index rail |
| `1024–1439px` | Desktop: 12 columns, readable rail and rich media compositions |
| `>=1440px` | Wide desktop: constrain container; do not make line lengths or tiles enormous |

These breakpoints are design defaults, not asserted source breakpoints.

### 5.3 Spacing scale

Use 4px-based tokens:

```text
2  4  8  12  16  20  24  32  40  48  64  80  104  128  160  200
```

Roles:

- Inline icon/caption: `4–8px`.
- Label-to-heading: `12–20px`.
- Heading-to-intro: `16–32px`.
- Paragraph grouping: `16–24px`.
- Card internal padding: `16–28px`.
- Grid gaps: `12–24px` for small repeated components, `24–40px` for larger exhibits.
- Figure-to-caption: `8–16px`.
- Major section separation: `104–200px` desktop, `72–112px` mobile.

**Rhythm:** follow a rich/tight interaction module with whitespace. Dense control bars and captions benefit from generous section breathing room.

### 5.4 Alignment and borders

- Use thin `1px` lines and occasional `0.5px` optical lines; test on actual display densities.
- Anchor rules to the same section boundaries as content, never scatter them.
- Rounded rectangles are secondary to **aligned edges and fine strokes**.
- Recommended general radii: `4px` small, `8px` controls, `12px` structured panels, `16px` media; occasional completely square technical specimens.
- Treat shadows as exceptional. Prefer a border plus tonal separation.

---

## 6. Signature motifs and visual treatment

### 6.1 Sheet label

An understated metadata line introducing each major chapter.

```text
◇  SHEET 01 · OVERVIEW                    01 / 05
───────────────────────────────────────────────
```

- Font: monospaced, 11–12px, medium.
- Color: steel or other accessible tertiary text.
- Tiny diamond/square/crosshair marker, 6–10px.
- A number conveys actual order or index.
- Optionally include an issue number, artifact type, or status on the right.

### 6.2 Vertical index rail

- Thin, quiet rule adjacent to the main content column.
- Section numbers aligned with content; ticks near section boundaries.
- Number labels stay legible rather than decorative microtext.
- On narrow screens, convert rail to a horizontal prefix above the section; never reduce the content width just to preserve decoration.
- This is a navigational/structural accent, **not** a heavy timeline on every page.

### 6.3 Rulers, grids, registration marks

- Fine technical tick marks may sit at section transitions or behind a key figure.
- Use a subtle repeating line/grid only where it adds a drafting-sheet feeling.
- Major line alpha should be low; never run a high-contrast grid directly behind body text.
- Registration marks and corner brackets can frame a demonstration, not every panel.
- Technical marks should align to the same internal grid.

### 6.4 Figure numbering

Every substantive visual exhibit can be identified:

```text
FIG 01.1 · WORKSPACE, COMPACT VIEW
FIG 01.2 · LATENCY, P95 OVER 30 DAYS
FIG 02.4 · BEFORE / AFTER
```

Figure indexes should not be randomly fabricated. Sequential numbering follows document structure.

### 6.5 Dark specimen panel

A selective inverse surface makes a technical exhibit prominent:

- Background: ink or ink-secondary.
- Foreground: white and accessible neutral text.
- Borders and graph guides: muted blue/grey.
- Accent: blue used to mark actual selection or activity.
- Corners: restrained, radius `8–16px`.
- Include a small header, control area, main evidence, and footer caption if appropriate.

### 6.6 Media as material

- Product shots: clean, true-to-product, usually isolated with a fine frame.
- Posters/reels: edge-to-edge imagery or video thumbnails; hover states reveal *specific* information.
- Polaroid/photo artifacts: white mat/frame, slight rotation only in playful collections, short captions; **never** the base UI style for standard software cards.
- Grain/noise: optionally applied to a photograph or artifact reproduction at barely perceptible intensity, never across interface text.

---

## 7. Component specification

The following components translate visible reference patterns into an implementation library. Each entry indicates whether it is **Reference-derived** or an **Extension** for general web products.

### 7.1 `SiteHeader` — Reference-derived

**Anatomy:** logo mark + wordmark | contextual utilities | main action(s).

- Height: approximately `64–76px` desktop, `56–64px` mobile (proposed).
- Background: paper, optional bottom hairline.
- Logo: compact geometric dark mark plus product name in confident sans-serif.
- Right side: 2–4 lightweight utility items such as `Docs`, `Status`, `Contact`, `Sign in`.
- A clock, weather, or location is appropriate **only when it makes sense for the product**.
- The header should feel like a quiet tool strip, not a tall promotional billboard.
- Link hover: underline, light ink shift, or subtle active indicator.
- Mobile: keep the logo and one primary action visible; put secondary links in an accessible menu.

**States:** default, active navigation item, focus-visible, mobile menu expanded.

### 7.2 `LogoMark` — Reference-derived

**Anatomy:** geometric glyph in square/frame; adjacent text name.

- Prefer a symbol based on the product's own concept.
- Visually compatible primitives: bars, bracket, small square, dot, slit, plus, diamond.
- One color in normal mode; inverse in dark regions.
- Must remain recognizable at 20–24px.
- Do not reuse Daryl's name or exact brand mark.

### 7.3 `SheetSection` — Reference-derived; **foundational primitive**

**Props:** `index`, `eyebrow`, `title`, `description`, `endnote`, `tone`, `children`.

- Contains the common number label, optionally a left rail and rule.
- Establishes 1 primary typographic anchor.
- Controls vertical rhythm across marketing and editorial pages.
- Variants: `open` (mostly whitespace), `ruled` (strong separators), `instrument` (dense contained interaction), `inverse` (dark specimen sheet).
- This should be used widely but **not** around each small piece of dashboard content.

### 7.4 `HeroStatement` — Reference-derived

**Anatomy:** micro-label, oversized primary statement, muted secondary phrase, compact lead, links/actions, understated update or trust note.

- Hero is **typography-led**, not automatically a giant gradient illustration.
- Use one strong verb/noun/claim in ink and an optional companion phrase in steel.
- Desktop headline should occupy a meaningful portion of page width without exceeding a readable line count.
- Let one real product demo, image, or artifact be the main companion visual.
- Primary action can be text-forward; a filled button is reserved for the actual main conversion.

**Good:** `A better place / to think clearly.` with an actual editor preview.

**Avoid:** `Introducing the future of seamless next-generation innovation` over an unrelated stock illustration.

### 7.5 `InlineEditorialLink` — Reference-derived

- Display as readable text with underlined treatment at rest or clearly distinct adjacent icon.
- Use fine arrow (`↗`, `→`) or a small simple icon when useful.
- Hover: underline offset increases or icon translates 2px.
- Keyboard focus: visible 2px focus ring or clear underline/highlight.
- External links: obvious destination or external-link cue.

### 7.6 `FigureFrame` and `FigureCaption` — Reference-derived; **foundational primitive**

**Anatomy:** framed media/interactive surface, bottom/top metadata line, optional label/key.

- Typical full width, ratios based on *actual content* (`16:9`, `4:3`, `1:1` or intrinsic).
- Border: fine neutral rule or no border if image edges already separate it.
- Caption format: `FIG 03.2 · MOBILE WORKSPACE` and one optional descriptive line.
- Fit: prefer `contain` for UI screenshots; `cover` for editorial photography.
- Never crop essential UI text or performance charts.

### 7.7 `ArtifactGrid` — Reference-derived

For reel cards, case studies, feature previews, customer examples, or integrations.

- Desktop: 3 columns for balanced media; 2 columns for dense captioned examples; 4 only for small thumbnails.
- Tablet: 2 columns. Phone: usually 1 column (2 for genuinely small specimens).
- Card: image/artifact first, with a clear title, tag, and sparse metadata.
- Hover: reveal contextual secondary info or a subtle outline/tint.
- Avoid heavy padded boxes around imagery unless framing is purposeful.
- Skeleton/loading placeholder matches aspect ratio.

**States:** idle, hover, focus, loading, unavailable, active/playing where relevant.

### 7.8 `MediaTile` / `ReelTile` — Reference-derived

- Video poster with a recognizable play state and optional duration indicator.
- Always supply accessible controls for audio, pause/play, and captions where applicable.
- Don't autoplay with sound.
- On hover-capable pointers, a silent motion preview is acceptable when inexpensive.
- On touch, show the play affordance permanently.
- Honor `prefers-reduced-motion` and data-saver modes.

### 7.9 `TimelineWorkbench` — Reference-derived; **signature advanced component**

Reference inspiration: a visual history/changelog presented like a compact editor with years, interactive timeline, records, categories, and an inspection area.

**Anatomy:**

```text
┌──────────────────────────────────────────────────────────┐
│ FIG 02.1 / HISTORY                     [SORT] [FILTER]   │
├──────────────────────────────────────────────────────────┤
│  2023       2024       2025       2026                   │
│  ├────●──────┼────●──────┼────●─────┼──●──────           │
│  [PRODUCT] [DESIGN] [GROWTH]                [01 / 06]    │
├────────────────────────┬─────────────────────────────────┤
│ SELECTED RECORD        │ INSPECTOR                       │
│ 01  New workspace      │ Screenshot / animation         │
│ 02  Public launch      │ Title                           │
│ 03  Live collaboration │ Description                     │
│ ...                    │ Open record →                   │
└────────────────────────┴─────────────────────────────────┘
```

- Timeline dots and rows correspond to actual records.
- Scrubbing or selecting an index updates the inspector in place.
- Filters and sorting update both timeline **and** list.
- The currently selected record has a strongly visible active state.
- Use `aria-selected`, keyboard arrow navigation where appropriate, and labeled controls.
- For a small number of items, simplified segmented year tabs can replace the scrubber.
- **Mobile fallback:** chronological record list with year headers + selectable detail drawer. Do not force a desktop-scale timeline onto a 360px screen.

**General uses:** changelog, product roadmap, customer journey, development milestones, release archive, learning path, project lifecycle, order history, audit log. Use only when the *time dimension is meaningful*.

### 7.10 `ControlStrip`, `SegmentedFilter`, `SortMenu` — Reference-derived

- Compact rectangular or lightly rounded controls, not giant pills.
- Thin outlines, quiet labels, narrow height (`32–38px` recommended).
- Selected state: ink-colored text + accent rule/tint, or dark fill for strongest selection.
- Filter chips must express selected state without relying on color alone.
- Sort must show the active ordering and reflect in the visible data.
- At mobile widths, permit horizontal scrolling with visible overflow hint.

### 7.11 `RecordRow` — Reference-derived

A simple information-dense alternative to cards.

**Anatomy:** index/date | title and description | category or status | affordance.

- Strong baseline alignment and understated row dividers.
- Hover/active emphasis may tint background subtly.
- Title ink is stronger than supporting metadata.
- Row actions appear clearly on keyboard focus and remain operable on touch.

**Use for:** releases, files, transactions, jobs, integrations, changelog, docs index.

### 7.12 `InspectorPanel` — Reference-derived from timeline presentation

A context panel whose content changes according to the selected record.

- A clear heading, one visual, metadata, concise explanation, next action.
- Make selection changes instantly visible and announce meaningful updates accessibly.
- Avoid unnecessary transition delays or fake loading for local information.
- Mobile becomes a sheet/drawer or full-width detail area.

### 7.13 `ExperimentCard` — Reference-derived

- Smaller creative test or concept with media, short title, one-line explanation, and source link.
- Composition can be more playful, but spacing and captions stay systematic.
- Use for labs, proof of concepts, side projects, templates, customer snippets, developer demos.
- Layout can stagger or vary sizes within a fixed grid; avoid a chaotic Pinterest collage for a utilitarian dashboard.

### 7.14 `PhotoArtifact` / `PolaroidCard` — Reference-derived

- A physical-feeling frame for authentic photography or editorial storytelling.
- White mat, consistent image area, 1–2 lines of casual caption.
- Optional ±1–3° rotation in personal/lifestyle galleries only.
- Hover lifts slightly or corrects rotation; no high-amplitude springs.
- Images should have legible alt text and lazy loading.

**Use for:** community events, founder stories, behind-the-scenes, customer field work, memories. **Never** use as default frames for metrics, forms, documentation, or account settings.

### 7.15 `UtilityBadge` and `DatumLabel` — Reference-derived

- Mono all-caps or concise sentence case.
- Fine border or no container, often attached to a larger object.
- Used for labels such as `LIVE`, `REV 01`, `V1.4`, `UPDATED OCT 2026`, `07 RECORDS`.
- Semantic status badges (`ERROR`, `COMPLETE`) should have real meaning and accessible color/word pairings.

### 7.16 `TechnicalMetric` — Extension for applications

**Anatomy:** small mono metric label, large number, unit, comparison/context, optional micro-graphic.

```text
P95 RESPONSE TIME                   FIG 02.4
183 ms
↓ 12% compared with last week
```

- A number must include unit, time range and definition where nonobvious.
- Prefer an unboxed typographic statistic over a padded tile when space allows.
- In dashboards, use consistent scale and monospace/tabular figures for alignment.

### 7.17 `ChartInstrument` — Extension for applications

- Plot area: neutral background, precise axis labeling, very subtle grid.
- Series: ink and one blue accent by default; use distinctly patterned/marked styles as data expands.
- Place legend near data, not in a remote decorative panel.
- Tooltips follow the system: white/ink surface, fine border, mono key/value pairing.
- Hover and focus reveal data; tables and accessible descriptions remain available.
- Charts must represent actual, traceable data. Do not invent dramatic curves as decoration.

### 7.18 `Button` variants — Reference-informed extension

1. **Primary:** dark ink fill/white text on light backgrounds, or sparing blue fill when that action deserves emphasis. `36–44px` tall; `8px` radius.
2. **Secondary:** transparent/paper fill; `1px` neutral border; ink label.
3. **Text/Editorial:** inline link with underline or arrow; minimal chrome.
4. **Utility/Icon:** compact square with border or text label, tooltip and accessible name.
5. **Destructive:** visibly named and confirmed when consequences are significant.

Interaction:

- Hover: one subtle tone change, underline/arrow movement, or 1px translation.
- Active: press feeling (small translation and reduced lightness).
- Disabled: lower contrast *with explanatory text*, not opacity alone.
- Loading: preserves width; communicates progress.
- `:focus-visible`: visible outline with sufficient contrast.

**Avoid:** multiple competing big blue CTAs, large pill radii everywhere, excessive shine/glow.

### 7.19 `Input`, `Select`, `Textarea`, `SearchField` — Extension

- Rectangular or modest 8px radius; paper or light muted fill; border remains clear.
- Labels above inputs; descriptions beneath when necessary.
- Default height: `42–48px` controls, larger for multiline.
- Focus uses blue border + visible ring; error uses text and error color.
- Placeholder is supplementary, **not a label**.
- Search can use a compact slash/shortcut annotation if implemented.
- Group fields with headings/rules rather than enclosing every pair in a card.

### 7.20 `Tabs` and `VerticalNav` — Reference-informed extension

- Prefer understated text tabs and fine active underline.
- Active state visible without hover.
- Tab labels fit their functions; avoid tiny inscrutable abbreviations.
- Keyboard arrows between tabs, tab/panel role relationships when the component behaves as tabs.
- Desktop software may use a fixed vertical rail with thin separators and a strong active line.

### 7.21 `Table` — Extension for data-heavy products

- Clear column headers in compact mono or small sans.
- Minimal horizontal lines; avoid boxed grid cells by default.
- Right align numeric columns and use tabular numerals.
- Keep row height readable (`44–56px` typical).
- Hover only meaningful if rows are actionable.
- Sorting indicators show direction. Responsive fallback: scrolling with sticky primary column or real record cards.

### 7.22 `Dialog`, `Drawer`, `Popover`, `Tooltip` — Extension

- White/ink raised surface, border, subdued shadow.
- Small technical label optional, human-readable title mandatory.
- Dialogs for consequential interaction; drawers for contextual inspection; popovers for nearby actions.
- Use minimal motion (`160–220ms`).
- Keyboard trap in dialogs, Escape closes, restore focus, screen-reader labeling.
- Do not use a dramatic modal for information that belongs inline.

### 7.23 `Toast`, `EmptyState`, `Skeleton`, `ErrorState` — Extension

- **Toast:** one-line action summary and meaningful secondary action; unobtrusive border.
- **Empty state:** a small technical/figure-style illustration if helpful, precise explanation, one recovery action.
- **Skeleton:** same frame/layout as real content, gentle transition; no aggressive shimmer.
- **Error:** plain-English cause if known and actionable recovery; do not hide failure behind a cute icon.
- **Offline:** show freshness of cached data or the last successful sync when applicable.

### 7.24 `TicketStub` / `ParticipatoryArtifact` — Reference-derived, optional

The reference uses a small ticket/stub-like interactive metaphor. Generalize it to:

- waitlist ticket;
- product invite;
- event pass;
- community supporter marker;
- downloadable certificate;
- limited experiment token.

Use perforation, issue number, serial-like notation, and narrow mono text. Must have an actual purpose, accessible action, meaningful success state, and backend-backed counts if shown. **Do not fabricate a claim counter.**

### 7.25 `GeoDatum` — Reference-derived, optional

A quiet annotation for geographic context: city, coordinates, timezone, route, or regional availability. Apply only when location affects the experience. Dynamic clock/weather values require real data and must not be cosmetically invented.

### 7.26 `ClosingSheet` and `SiteFooter` — Reference-derived

- End with a clear idea and one action, not a wall of CTA buttons.
- Contact/product action may be as simple as a strong link with generous white space.
- Footer may include issue/revision year, links, social/profile URLs, company metadata, or select utility information.
- A life/experience progress bar or visitor stats section is a domain-specific flourish, not a required component.
- Keep legal/privacy/support navigation plainly accessible.

---

## 8. Motion and interaction language

### 8.1 Guiding rule

**Motion should feel like editing and inspecting a document, not like riding a theme-park interface.** Interactions can be memorable, but they must communicate cause and effect.

### 8.2 Recommended motion tokens

```css
:root {
  --motion-fast: 140ms;
  --motion-base: 220ms;
  --motion-slow: 420ms;
  --ease-precision: cubic-bezier(.2, .75, .25, 1);
  --ease-enter: cubic-bezier(.16, 1, .3, 1);
  --ease-exit: cubic-bezier(.4, 0, 1, 1);
}
```

These are recommended timing values, not reverse-engineered source numbers.

### 8.3 Motion patterns

| Trigger | Intended behavior | Recommended magnitude |
|---|---|---|
| Link hover | Underline or small arrow shift | 1–3px / 140ms |
| Button hover | Border/fill transition | 140–220ms |
| Media tile hover | Slight scale or reveal metadata | 1.01–1.025 / 220ms |
| Section entering viewport | Fade + subtle upward arrival | 8–20px / 350–500ms |
| Timeline selection | Position follows selection; inspector content replaces | 180–300ms |
| Tabs/filters | Active indicator moves; results update clearly | 160–240ms |
| Drawer/dialog | Soft opacity + 8–16px directional move | 180–240ms |
| Photo artifacts | Small lift/rotation correction | 2–6px / 180–260ms |
| Data charts | Short, causal transitions from prior data | 200–400ms |

### 8.4 Reduced motion and media

- Respect `prefers-reduced-motion: reduce`.
- Aesthetic auto-scrolling, parallax, and idle looping should stop or become static.
- Never hide essential content behind scroll-triggered animation.
- Use semantic buttons for playback; audio never starts without a user action.
- Favor `transform` and `opacity` over layout-affecting animation.
- Long-running animations should pause outside the viewport.
- Avoid pointer-following effects when they harm readability or performance.

### 8.5 Deliberate “signature moment” policy

Each marketing page can feature **one** high-effort experiential element, such as an interactive editor demonstration, measured comparison, constrained timeline, or genuinely useful animated product model. Do not add animated cursors, hover distortions, parallax layers, scroll-jacking, and kinetic typography simultaneously.

---

## 9. Page archetypes — use the style for any idea

### 9.1 Product or SaaS landing page

```text
HEADER            logo · nav · one clear CTA
SHEET 01          editorial hero · two-tone claim · live/product artifact
FIG 01.1          product demonstrated (not generic imagery)
SHEET 02          how it works · three precise steps or a usable demo
SHEET 03          capabilities · artifact grid / comparisons
SHEET 04          evidence · results, case studies, changelog or integrations
SHEET 05          pricing / access · straightforward options
CLOSING SHEET     one next step
FOOTER            revision + useful links
```

**Example for a developer tool:** hero + actual console/video, workflow panels, benchmark with units, integration sheet, docs callout, signup.

**Example for a creative SaaS:** hero + real editor canvas, motion specimen grid, selectable workflow timeline, outputs, pricing, start free.

### 9.2 B2B product website

- Keep the editorial opening and restrained typography.
- Shift emphasis from personal imagery to **measurable evidence**, process diagrams, implementation details, and security/operation info.
- Present proof as annotated figures with real sources.
- Use compact, clear primary CTAs; do not bury procurement needs under artistic interaction.

### 9.3 Dashboard/application shell

```text
┌────────────────────────────────────────────────────────────┐
│ LOGO / PRODUCT     SEARCH           STATUS   HELP   PROFILE │
├──────────────┬─────────────────────────────────────────────┤
│ WORKSPACE    │  01 / OVERVIEW               LAST 30 DAYS  │
│ Overview     │  Quiet large heading                         │
│ Records      │  Metrics (typographic, sparse borders)        │
│ Activity     │  Main chart as instrument                     │
│ Automations  │  Table/list with technical annotations        │
│ Settings     │  Context inspector / optional right rail      │
└──────────────┴─────────────────────────────────────────────┘
```

- Use the structural *grammar*, not giant landing-page spacing in the application.
- App section gaps: `20–40px`, not `160px`.
- Replace decorative sheet labels with meaningful page and view metadata.
- Clear data/actions take priority over analogy. Dashboards are tools, not art exhibitions.
- Put charts, tables, filters, and feedback in compact instrument-like layouts.

### 9.4 Changelog, roadmap, or release archive

This is a natural fit for the reference style:

- indexed/dated `RecordRow` objects;
- year/month controls and filters;
- timeline if genuinely useful;
- contextual detail inspector;
- links to complete release notes;
- a changelog counter/last-updated note only if accurate.

### 9.5 Documentation / knowledge base

- Left side: chapter index, active rule; right: reading column.
- Title, edition/version, reading time, compact metadata.
- Code, diagrams, screenshots labeled as figures.
- Callouts use rules and labels rather than large colorful cards.
- Every code example has a visible copy button and keyboard support.
- Search, TOC, back/next actions are operational, not decorative.

### 9.6 Portfolio / agency

- Original reference pattern applies closely: introduction, curated media/works, timeline of contribution, experiments/studies, personal/about sheet, CTA.
- Keep project descriptions contextual and candid, not buzzword-heavy.
- A case-study detail page should look like an editorial report: title, period, role, collaborators, problem, work, evidence, outcome, reflections, next project.

### 9.7 E-commerce / product catalog

- Editorial hero and carefully shot product specimen imagery.
- Cards show actual items, price, variant, stock and actions without sacrificing usability.
- Product pages use clear figures, technical specifications, origin/measurements, and gallery controls.
- Cart and checkout abandon decorative flourishes in favor of clarity, speed and accessibility.

### 9.8 Community / learning platform

- Learning path as timeline only where sequence matters.
- Lessons as numbered records; progress as meaningful instrument.
- Media/artifacts for demos, not ornamental thumbnails.
- Distinct states for completed, current, blocked, and upcoming.
- Community photos can use the more personal artifact treatment.

---

## 10. Responsive transformation rules

**Adapt the concept, not merely the dimensions.**

| Desktop pattern | Phone transformation |
|---|---|
| Left vertical sheet rail | Inline sheet index above section |
| 12-column editorial composition | 4-column stacked flow |
| Oversized two-part headline | 2–4 coherent lines with adaptive size |
| 3-column media collection | 1 column; 2 only if usable |
| Timeline with inspector beside it | Year-filtered list and expanded detail/drawer |
| Hover-only media information | Always-visible title/action or explicit tap disclosure |
| Header with several utilities | Logo + primary action + accessible menu |
| Side-by-side feature demo and explanation | Explanation followed by figure, in reading order |
| Wide data table | Horizontal scroll with disclosure or structured rows |
| Photo collage | Reduced overlap and safe cropping |

Other rules:

- Avoid horizontally clipping interactive controls, captions, focus rings, or long words.
- Minimum pointer/touch targets: approximately 44×44px where applicable.
- Test at 320, 375, 390, 768, 1024, 1440, and wide desktop.
- Respect device safe areas and dynamic browser bars.
- Always preserve the ability to understand and operate the page with no hover and reduced animation.

---

## 11. Accessibility and UX quality bar

- Aim for WCAG 2.2 AA for product work.
- One true `h1`; correct semantic order thereafter.
- Use `nav`, `main`, `section`, `article`, `figure`, `figcaption`, `button`, `a`, and lists correctly.
- Text, icons, media controls, and all fields must be keyboard-operable.
- Avoid faint grey for body copy. Decorative captions may be subtle but still need readable contrast.
- Visible focus states, not only hover states.
- Correct active state and state labels on toggles, tabs, sorting, and filtering.
- Media captions and alternate text describe content rather than repeating nearby labels.
- Provide fallback content when canvas/WebGL/video effects fail.
- Use `prefers-reduced-motion`, and respect low-bandwidth and data-saver contexts.
- Consider locale/timezone/number formatting for clocks, analytics, dates, and coordinates.
- Never show fabricated dynamic visitor statistics, weather, availability, progress, uptime, or release dates.

---

## 12. Performance and implementation defaults

### 12.1 Recommended stack

This is *framework-agnostic*; suitable for Next.js, React Router, Astro, SvelteKit, Nuxt, or plain HTML/CSS/JS.

For a React product, a practical choice is:

- TypeScript + React
- CSS variables and scoped CSS/modules or Tailwind linked to design tokens
- A restrained accessible component foundation such as Radix/headless primitives, custom-styled to this system
- Motion: mostly CSS; add Framer Motion/other animation only when it materially simplifies timeline/editor behavior
- SVG for rulers, axes, ticks, diagrams, and small geometric icons
- Responsive `<picture>` / modern images for real media

**Do not let a UI library's default visual system overtake this specification.** Strip default bright gradients, huge radii, generic cards, and implicit shadows.

### 12.2 Performance expectations

- Keep JS budgets small for editorial pages; progressive enhancement for advanced effects.
- Lazy load offscreen images, heavy videos and advanced visualizations.
- Preload only the critical font/subset and hero asset; use `font-display: swap`.
- Prefer WebP/AVIF and correctly sized images; never serve gallery originals at thumbnail size.
- Avoid animating layout on scroll; prefer opacity/transform.
- Use virtualization for genuinely long record lists.
- Real data states should remain fast, coherent, and cancellable.
- A usable static layout is mandatory before animation initializes.

---

## 13. Design tokens — ready-to-use CSS

The snippet below is a **starting implementation**, with source colors and recommended semantic values. Adjust values only if the same change is recorded in this `DESIGN.md`.

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  /* Reference-source palette */
  --ref-ink: #0a0c10;
  --ref-ink-2: #0e1116;
  --ref-paper: #ffffff;
  --ref-steel: #9098a6;
  --ref-blue: #2e6fff;
  --ref-blue-hover: #5b8cff;
  --ref-blue-soft: #9ab6ff;
  --ref-blue-pale: #cbdbff;

  /* Semantic colors */
  --color-bg: #ffffff;
  --color-fg: #0a0c10;
  --color-fg-subtle: #505763;
  --color-fg-muted: #6e7581;
  --color-display-muted: #858e9d;
  --color-surface: #f7f8fa;
  --color-surface-raised: #ffffff;
  --color-border: #e3e6ea;
  --color-border-strong: #c9cfd7;
  --color-accent: #2e6fff;
  --color-accent-hover: #245ae0;
  --color-accent-wash: #cbdbff;
  --color-focus: #2e6fff;
  --color-inverse: #0a0c10;
  --color-inverse-fg: #ffffff;

  /* Fonts */
  --font-ui: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;

  /* Grid */
  --layout-max: 1360px;
  --layout-content: 1120px;
  --layout-read: 680px;
  --gutter: clamp(20px, 4vw, 64px);
  --grid-gap: clamp(16px, 2.3vw, 32px);

  /* Size and spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-26: 104px;
  --space-32: 128px;
  --space-40: 160px;

  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-media: 16px;

  --motion-fast: 140ms;
  --motion-normal: 220ms;
  --motion-slow: 420ms;
  --ease-precision: cubic-bezier(.2, .75, .25, 1);
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
}

::selection { background: #cbdbff; color: #0a0c10; }
:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 3px; }

.page-shell {
  width: calc(100% - var(--gutter) - var(--gutter));
  max-width: var(--layout-max);
  margin-inline: auto;
}

.reading-column { max-width: var(--layout-read); }

.sheet {
  position: relative;
  padding-block: clamp(80px, 11vw, 160px);
  border-top: 1px solid var(--color-border);
}

.sheet__eyebrow,
.figure__caption,
.datum {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  line-height: 1.55;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-fg-muted);
}

.sheet__heading {
  margin: 14px 0 20px;
  font-size: clamp(2.5rem, 4.8vw, 4.75rem);
  line-height: 1.08;
  letter-spacing: -0.045em;
  font-weight: 700;
}

.hero__title {
  margin: 0;
  font-size: clamp(3.5rem, 7vw, 7.25rem);
  line-height: 1.02;
  letter-spacing: -0.055em;
  font-weight: 800;
}

.text-muted { color: var(--color-display-muted); }

.editorial-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  transition: text-decoration-color var(--motion-fast), color var(--motion-fast);
}
.editorial-link:hover { color: var(--color-accent-hover); }

.button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 42px;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-fg);
  font: 600 0.875rem/1.2 var(--font-ui);
  cursor: pointer;
  transition: background var(--motion-fast), color var(--motion-fast),
    border-color var(--motion-fast), transform var(--motion-fast);
}
.button:hover { border-color: var(--color-fg); transform: translateY(-1px); }
.button:active { transform: translateY(0); }
.button--primary { background: var(--color-fg); color: #fff; border-color: var(--color-fg); }
.button--primary:hover { background: #262c36; }

.media-frame {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.rule { height: 1px; background: var(--color-border); border: 0; }

.instrument {
  background: var(--color-inverse);
  color: var(--color-inverse-fg);
  border: 1px solid #303746;
  border-radius: var(--radius-md);
}

@media (max-width: 767px) {
  .sheet { padding-block: 76px; }
  .hero__title { font-size: clamp(2.8rem, 12vw, 4.6rem); }
  .sheet__heading { font-size: clamp(2.25rem, 8vw, 3rem); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**CSS quality gate:** The valid pale-blue value is **`#CBDBFF`**. Keep reference palette values and semantic tokens synchronized.

### 13.1 Example `SheetSection` markup

```html
<section class="sheet" aria-labelledby="capabilities-title">
  <div class="page-shell">
    <div class="sheet__eyebrow">◇ &nbsp; SHEET 02 · CAPABILITIES</div>
    <h2 class="sheet__heading" id="capabilities-title">
      Built for the details.<span class="text-muted"> And the bigger picture.</span>
    </h2>
    <p class="reading-column">
      Show what the product genuinely does, followed by evidence someone can inspect.
    </p>
    <figure>
      <div class="media-frame">
        <!-- Actual product screenshot, working demo, or real chart -->
      </div>
      <figcaption class="figure__caption">FIG 02.1 · WORKSPACE OVERVIEW</figcaption>
    </figure>
  </div>
</section>
```

---

## 14. Suggested component architecture

Use a small consistent component set instead of unrelated isolated fragments.

```text
src/
  styles/
    tokens.css
    reset.css
    typography.css
    utilities.css
  components/
    layout/
      PageShell
      SiteHeader
      SheetSection
      SheetIndex
      SectionRule
      SiteFooter
    type/
      HeroStatement
      EditorialLink
      DatumLabel
      FigureCaption
    media/
      FigureFrame
      ArtifactGrid
      MediaTile
      ExperimentCard
      PhotoArtifact
    controls/
      Button
      IconButton
      ControlStrip
      Tabs
      FilterChip
      SortMenu
      SearchField
    records/
      RecordRow
      TimelineWorkbench
      InspectorPanel
    data/
      TechnicalMetric
      ChartInstrument
      DataTable
    overlays/
      Dialog
      Drawer
      Popover
      Tooltip
      Toast
    feedback/
      EmptyState
      ErrorState
      Skeleton
```

Do not implement every component in advance. Start with the actual product's page types and add components only when repeated need justifies them.

---

## 15. Examples of cross-domain translation

### Example A — AI writing assistant

- `SHEET 01 · THE WORKSPACE`: two-tone promise + real editor screenshot.
- `FIG 01.1 · EDIT HISTORY`: an interactive before/after with explicit differences.
- `SHEET 02 · THE PROCESS`: annotation-based explanation of how edits are made.
- `SHEET 03 · PRACTICE`: grammar/rewriting card grid with live controls.
- `RECORD`: revision history as compact rows.
- App shell: document list + canvas + right-side inspector.

**Avoid:** faux terminal logs that do not reflect real product data.

### Example B — Cloud hosting / developer platform

- `SHEET 01 · BUILD AND SHIP`: measured headline and real deployment timeline.
- `FIG 02.1 · DEPLOYMENT STATE`: working deployment status panel.
- `SHEET 03 · INFRASTRUCTURE`: system diagrams and service figures.
- `INSTRUMENT`: CPU, memory, latency, event logs with accurate units.
- `RECORD`: deployment/release list by revision.

**Avoid:** animated metrics disconnected from reality.

### Example C — Music plugin or media software

- `SHEET 01 · THE SOUND`: restrained headline with useful audiovisual demo.
- `FIG 01.1 · SIGNAL FLOW`: interactive module diagram.
- `ARTIFACT GRID`: audio examples and comparisons.
- `CONTROL STRIP`: dry/wet, A/B, preset selection.
- `SHEET 04 · THE ENGINE`: technical notes and response diagrams.

**Avoid:** decorative moving waveforms unless synchronized to audio.

### Example D — Personal finance product

- `SHEET 01 · A CLEARER PICTURE`: confident typography, sample or actual portfolio view.
- `INSTRUMENT`: transaction table + investment-performance chart.
- `RECORD`: categorized transaction timeline.
- `FIG`: allocation history with honest scale and units.
- `CLOSING SHEET`: clear action to connect an account securely.

**Avoid:** playful collage framing on transaction tables or misleading fictional returns presented as real.

---

## 16. Design decisions and degrees of freedom

**Non-negotiable signatures:**

- strong editorial typography;
- micro mono labels;
- coherent sheet/figure indexing when applicable;
- fine, disciplined lines;
- restrained near-black/white palette with precise blue accents;
- rich but purpose-built evidence/visuals;
- intentional motion and responsive behavior.

**Flexible:**

- whether a page includes a timeline;
- whether artifacts are video, screenshots, charts, photography or code;
- whether a section uses 2, 3 or 4 columns;
- whether a particular product needs dark/inverse panels;
- whether a playful photo collage makes sense;
- whether the navigation has contextual utilities;
- whether a signature interaction exists at all on a functional screen.

**Do not carry over literally:** original personal biography, founder location, interests, project names, live visitor counter, claimed-stub count, and designer-specific navigation.

---

## 17. Acceptance checklist for every new build

### Visual identity

- [ ] The site reads as technical/editorial, not a generic template.
- [ ] Colors come from the semantic token system; blue is used purposefully.
- [ ] Display headings use Plus Jakarta Sans (or approved fallback); annotations use JetBrains Mono.
- [ ] Section markers, rulers, and captions are consistently formatted.
- [ ] Every visual has an editorial reason to exist.
- [ ] Spacing and hairlines align across sections and components.

### UX behavior

- [ ] Main CTA is obvious; secondary actions are quiet but discoverable.
- [ ] Interactive state is visible, keyboard-accessible, and touch-accessible.
- [ ] No essential information requires hover.
- [ ] Real data is distinguished from examples/placeholder data.
- [ ] Empty, loading, error and disabled states are intentional.
- [ ] No excessive motion or decorative interactions slow core tasks.

### Responsiveness and accessibility

- [ ] 320–390px mobile layouts remain readable and operable.
- [ ] Desktop instrument components have useful mobile alternatives.
- [ ] Focus indicators, contrast, heading semantics, alt text and labels are checked.
- [ ] Reduced-motion preference is respected.
- [ ] Charts/tables remain understandable without color alone.

### Implementation quality

- [ ] No unexplained hardcoded color, typography, or radius variations.
- [ ] Visual tokens and component implementations agree with `DESIGN.md`.
- [ ] Hero assets and key fonts load efficiently.
- [ ] Animation does not block content or input.
- [ ] Every invented technical label/metric is justified by the product's content.

---

## 18. Prompt for AI coding agents

Copy the following into a build instruction with this file at the project root:

> Read `DESIGN.md` in full and treat it as the visual design contract. Build **[PRODUCT NAME]**, a **[PRODUCT DESCRIPTION]** for **[AUDIENCE]**. Apply the technical-editorial visual language from the document: white paper-like canvas, dark ink typography, two-tone oversized headings, measured 12-column composition, numbered editorial sheets, quiet monospaced annotations, fine rules, restrained blue accents, figure-labeled product demonstrations, and purposeful microinteractions. Use the *product's actual information and flows*; do not reproduce the original portfolio's text or content. Adapt the reference-derived patterns to the application: invent only components needed by real user tasks. Build mobile-first responsive layouts, keyboard/focus support, reduced-motion behavior, and complete empty/loading/error states. Use design tokens everywhere; avoid generic SaaS gradients, glass cards, arbitrary pills, and over-animation. If a requested page conflicts with an aesthetic flourish, prioritize usability. Make the result feel designed as a cohesive system, not assembled from unrelated UI snippets.

### Short agent decision rule

Before adding anything, ask:

1. Does it help the user understand, decide, or act?
2. Can it be expressed using an existing `Sheet`, `Figure`, `Record`, `Control`, or `Instrument` primitive?
3. Is its typography, grid alignment, and color consistent with this file?
4. Does its interaction state communicate something useful?
5. Does it still work on mobile and with reduced motion?

If not, simplify it.

---

## 19. Final direction

**The goal is not to make every website look like Daryl's portfolio.** The goal is to inherit the same *design intelligence*: a rigorous grid, editorial confidence, technical annotation, inventive but meaningful interaction, and an unmistakable sense of authorship.

Make the website feel as if its creator cares equally about what a thing **looks like**, what it **means**, and how it **works**.
