# DevPress: Design

The design system as implemented. All values live in `client/src/styles/tokens.css`; the publication websites add their own scoped values in `client/src/styles/publication.css`. Contrast is enforced by `client/src/styles/tokens.test.js`.

## 1. Principles

- **Editorial, not dashboard.** Serif display headings, hairline rules between items instead of boxed cards, generous spacing.
- **Warm and calm.** Beige paper, charcoal ink, a bronze accent used sparingly.
- **Content first.** Articles and code are the most readable things on every page.
- **Accessible by default.** Text contrast of at least 4.5:1 and controls of at least 3:1 (tested), a visible focus ring everywhere, keyboard access, reduced-motion support.
- **Honest interface.** No fake metrics, no buttons that do nothing; planned features are labelled "Planned".
- **Motion that never hides content.** Animations move things (transform), they do not fade content in from invisible.

## 2. Colour

### Platform palette

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f4f0ea` | Page background (beige) |
| `--bg-alt` | `#e5d8cc` | Bands and panels |
| `--surface` / `--surface-raised` | `#fcfaf7` | Paper: forms, editor, menus |
| `--surface-hover` | `#ede5db` | Hover and sidebar background |
| `--border`, `--border-strong` | `#ddd2c6`, `#c9bcae` | Hairlines |
| `--border-control` | `#8c7e71` | Input and outlined button borders (≥ 3:1) |
| `--text` | `#292725` | Charcoal text, primary buttons |
| `--text-muted`, `--text-subtle` | `#625d57`, `#67615a` | Secondary text |
| `--accent`, `--accent-hover` | `#292725`, `#393633` | Primary actions |
| `--bronze` | `#a78355` | **Decoration only** (rules, underlines, illustration): 3.1:1 on beige, too low for text |
| `--accent-text` | `#7e6038` | Bronze when used as text |
| `--dark-bg`, `--dark-surface` | `#292725`, `#393633` | Charcoal bands, footer |
| `--danger`, `--success`, `--warning` (+ `-tint`) | `#a3362e`, `#3d6b48`, `#86591a` | Feedback |
| `--code-bg`, `--code-text` | `#2b2826`, `#ece5dc` | Code blocks are always dark |

### Article formatting palette

Used by the toolbar's colour and highlight options (`--rich-*` tokens). Every text colour is checked against every light background, and every highlight against every text colour.

| Text colours | Highlights |
|---|---|
| Rust red `#a3362e`, Amber `#86591a`, Forest green `#2f6b4f`, Ocean blue `#1d4e89`, Plum `#6e3a7c`, Slate grey `#4a5560` | Yellow `#f7e8a4`, Green `#d9ecd2`, Blue `#d5e4f4`, Pink `#f5d8df` |

### Publication websites

Publication pages use a lighter ivory sheet (`--bg: #fcfaf7`, `--surface: #f4f0ea`) so a publication reads as its own place, plus one owner-chosen accent:

| Accent | Value |
|---|---|
| Bottle green (default) | `#1f5e4b` |
| Ink blue | `#1d4e89` |
| Oxblood | `#8a2f2f` |
| Umber | `#6b4a1f` |
| Slate | `#33404d` |

Each accent is tested for at least 4.5:1 with white text and as link text on the publication backgrounds (`client/src/utils/publication.test.js`).

## 3. Typography

| Role | Typeface | Token |
|---|---|---|
| Display (headings, titles, wordmark) | Newsreader (serif) | `--font-display` |
| Interface and body | Geist (sans) | `--font-sans` |
| Code, labels, metadata, typewriter paper | Geist Mono | `--font-mono` |
| Publication "Clean sans" preset | Public Sans | used in `publication.css` |

All fonts are self-hosted in `client/src/assets/fonts/` with their SIL Open Font License files; no font requests leave the site.

Scale: `--text-xs` 0.75rem through `--text-3xl` 1.875rem, and `--text-display` `clamp(2.6rem, 1.8rem + 3.6vw, 4.6rem)` for the landing hero. Small uppercase mono "eyebrow" labels introduce sections.

## 4. Space, shape and elevation

- Spacing on a 4 px grid: `--space-1` (0.25rem) to `--space-9` (6rem).
- Corners are small and square: `--radius-sm` 3px, `--radius` 5px, `--radius-lg` 8px. No pill-shaped buttons.
- Shadows are soft and rare: `--shadow-sm`, `--shadow-md`, `--shadow-lift`.

## 5. Layout and breakpoints

| Width | Behaviour |
|---|---|
| < 480 px | Single column; some secondary labels hidden |
| < 640 px | The article editor opens in Document view by default (typewriter paper text would be too small) |
| ≥ 768 px | Wider page gutters; the formatting toolbar stays visible while scrolling (sticky) |
| ≥ 860 px | Login and register show the form beside a charcoal panel |
| ≥ 1024 px | Top-bar links appear (mobile drawer below that); workspace sidebar on the left (horizontal tabs below) |
| ≥ 1180 px | Search box in the top bar |

Layout constants: top bar 64 px, workspace sidebar 256 px, content max 1080 px, reading column 700 px. Every page is checked for no horizontal scrolling at 320, 375, 768, 1024, 1280 and 1440 px.

## 6. Components and conventions

- **Buttons** (`.btn`): primary (charcoal), secondary (outlined), ghost, quiet (text with bronze underline), danger. Hover lifts by 1 px; pressed settles back.
- **Links:** charcoal text with a bronze underline that strengthens on hover.
- **Forms:** labels above fields, hints below, errors in red below the field and linked with `aria-describedby`; focus shows a bronze glow plus a charcoal outline.
- **Lists of items** (articles, publications, topics): rows separated by hairlines, not boxed cards.
- **Status badges:** small mono uppercase (Draft, Published, Planned).
- **Empty states:** a short explanation and the next useful action.
- **Icons:** Lucide line icons drawn inline (`components/common/Icon.jsx`); always paired with a visible label or an accessible name.
- **New tabs:** links from the workspace to the public website, from My publications into a workspace, and from the Dashboard to a workspace, an article's editor (Edit) or the public article (View), open in a new tab and announce it to screen readers (`SiteLink`).

## 7. The typewriter

The typewriter view is a physical scene: a charcoal wall with lamp light, an oak table, the machine, a sheet of paper and a stack of finished pages. It is built from three transparent images (`client/src/assets/typewriter/`: body, carriage, paper), positioned in a fixed 960 × 1050 coordinate system and scaled to the available width. A DevPress nameplate covers the maker's badge on the body image.

Fixed design decisions (see [RULES.md](RULES.md#6-the-typewriter-is-protected)):

- The carriage moves left as characters are typed, so the printing point travels left to right across the page; it returns smoothly on a new line.
- The visible area above the platen fits a whole page, so the first and last lines of a nearly full page are visible together.
- Pages fly out, arc towards the table and land on a stack with slight rotation; clicking the stack opens the full article.
- Paper text uses Geist Mono at 14 px (scene units); Markdown and formatting tags are shown as typed.

## 8. Motion

- Durations: 140 ms (fast), 220 ms (standard), up to about 1.7 s for a page flight.
- Only transforms and colours are animated for content; nothing essential starts at opacity 0.
- `prefers-reduced-motion: reduce` turns off animations and transitions; the typewriter places pages directly on the stack.
- In background tabs, pages are placed directly on the stack instead of waiting mid-flight.
