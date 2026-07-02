# Premium Portal Redesign Strategy — "Meridian Glass"

> **Status:** Design strategy + implementation-ready documentation only. No code
> was changed to produce this file.
>
> **Scope:** Admin Portal (`frontend/app/(admin)/admin/**`), Doctor Portal
> (`frontend/app/(doctor)/doctor/**`), Patient/Account Portal
> (`frontend/app/(auth)/account/**`) — one shared design system, three
> role-tuned expressions.
>
> **Read first:** `docs/portal-redesign/portal-shared-ui-dependency-map.md`.
> Every claim about shared reach in this document derives from that map and was
> re-verified against source on branch `Dev-hassaan` (2026-07-02).
>
> **Path correction (repeat, because it keeps biting agents):** the Patient
> portal lives at `frontend/app/(auth)/account/**`. There is **no**
> `(account)` route group.

---

## 1. Executive redesign vision

### Concept name

**Meridian Glass** — a deep-clinical glass system for a global telehealth
platform.

### One-line design statement

A calm, luminous clinical workspace: porcelain glass surfaces floating over a
deep forest-teal atmosphere, with jade as the living interactive color and
lime reserved as a rare vital-sign signal.

### Mood

Calm luxury. Precision. Trust. The feeling of a private clinic lobby at
dawn — quiet, expensive, immaculate — translated into software. Not playful,
not sterile: *composed*.

### Premium positioning

The current portals look like a competent internal tool. Meridian Glass
positions them as the product itself — the thing a doctor screenshots when
recommending the platform to a colleague, the dashboard a patient trusts with
medical documents, the console an operations lead demos to an investor.

### Why this direction fits Global Health / MyGlobalHealth

1. **It grows out of the brand, it does not fight it.** The Manual da Marca
   palette (forest `#1D4B36`, mint `#8FB021`, lime `#B0F122`) stays the DNA.
   Meridian Glass *re-weights* it: forest deepens into an atmospheric canvas,
   a new jade mid-tone carries interactivity, and lime is demoted from
   "decorate everything" to "signal something is alive right now" (unread
   dot, live consultation, available slot). Restraint is what reads premium.
2. **Glass is honest here.** The portals are layered by nature — shell →
   page → card → row → dialog. Glassmorphism gives that hierarchy literal
   depth instead of simulating it with a pile of `!important` box-shadows
   (which is what `globals.css` lines 1514–1891 currently do across three
   stacked "generations" of portal CSS).
3. **Healthcare demands contrast discipline.** Meridian Glass keeps content
   on near-opaque light surfaces (≥ 0.85 alpha over a controlled backdrop)
   and pushes the glass drama to the chrome (shell background, sidebar,
   topbar, page hero) where WCAG contrast is easy to hold.
4. **One system, three temperaments.** Admin gets density and command; Doctor
   gets focus and clinical calm; Patient gets warmth and reassurance — all
   from the same tokens, varied only through an accent variable and layout
   rhythm (see §6, §8–10).

### How it improves each portal

| Portal | Today | Under Meridian Glass |
|---|---|---|
| Admin | Flat off-white pages, texture PNG washes, 3-column summary strips, tables that read as spreadsheet | An operations command deck: dense glass panels on a deep canvas edge, jade-lit active states, confident numerics, area-accented heroes that orient instantly |
| Doctor | Same chrome as Admin with clinical content bolted in | A consultation-first workspace: quieter surfaces, a persistent "now" rail (next appointment / active consult), document and note surfaces that feel like a chart, not a CMS |
| Patient | Admin-derived tables and strips softened slightly | A reassuring health home: larger type, card-first (tables demoted), progress and status told in plain visual language, mobile-first spacing, one clear next action per screen |

### What visibly changes vs the current portal

- Warm yellow-green `#f4f6ef` wash → cool **porcelain** surface over a deep
  forest-teal atmospheric gradient that shows at the edges of the viewport.
- Texture PNG overlays (`portal-ambient-texture.png`, `portal-card-tint.png`,
  `portal-sidebar-texture.png`) → tokenized glass recipes + two purpose-built
  atmospheric assets (§13). No more per-card raster tint.
- Flat white cards with forest-tinted shadow → two-tier surface system:
  frosted glass panels (chrome, heroes, rails) and near-solid content cards
  with a 1px inner highlight and soft ambient shadow.
- Lime-on-everything (`#D9F99D` active nav, lime stat glyphs, lime dots) →
  jade interaction color; lime only for live/unread/now signals.
- Mixed radii (8px forced by `!important`, 12px in atom inline styles, 999px
  buttons overridden back to 8px) → one radius scale actually applied from
  tokens (§5).
- Status pills with raw Tailwind-palette hex in `atoms.tsx` (`#FEF3C7`,
  `#DCFCE7`, `#FEE2E2`) → one tokenized status system shared by Pill,
  `.gh-badge-*`, summary-strip tones, and calendar event chips.
- Sidebar: hardcoded `rgba(18,54,39,0.96)` + texture PNG → tokenized deep
  gradient glass with a hairline jade edge and a soft top glow.

---

## 2. Current design diagnosis

Specific weaknesses, verified in source. File references are load-bearing.

### 2.1 Colors

- **Two accent systems fight.** `--color-accent` = lime `#B0F122` is used for
  both decoration (stat glyph tiles, eyebrow dots) and interaction (sidebar
  active, badges). Lime at this size/frequency reads consumer-fitness, not
  clinical-premium, and its contrast on white fails for text.
- **A second "brand dark" hides in the shells.** Sidebar fill
  `rgba(18,54,39,0.96)` (`globals.css:1543`), v3 override gradient
  `rgba(15,48,36,0.99) → rgba(9,34,27,0.99)` (`globals.css:1784–1785`), body
  `#0f2e25 !important` (`globals.css:196`), footer chrome `rgba(4,32,24,…)`
  (`--gh-chrome`). Four unrelated near-blacks, none tokenized.
- **Active-nav lime `#D9F99D` is inline** in both `admin-shell.tsx` and
  `portal-shell.tsx` (`portal-shell.tsx:424,459`) — not a token, and it is a
  *fourth* green family (Tailwind lime-200) foreign to the brand palette.
- **Status colors have two sources of truth:** `--color-status-*` tokens in
  `:root` vs the hex map `PILL_TONES` in `atoms.tsx:393–421`. They do not
  agree (e.g. success text `#15803D` vs pill active `#166534`).

### 2.2 Hardcoded theme values

- `atoms.tsx` inline styles: `AdminCard` `borderRadius: 12` (line 155) is
  overridden by `.gh-admin-card { border-radius: 8px !important }`
  (`globals.css:1617`) and again by v3 `var(--portal-radius) !important`
  (`globals.css:1859–1864`). Three layers disagree; the CSS wins only by
  `!important`.
- `Btn` sets `borderRadius: 999` inline (`atoms.tsx:755`), then
  `.gh-btn { border-radius: 8px !important }` (`globals.css:1710–1713`)
  overrides it. The atom's stated design (pill) is dead code.
- `StatCard` tile foregrounds `#B0F122` / `#143B30` inline
  (`atoms.tsx:264`); decorative radial gradients inline (`atoms.tsx:288`)
  are then hidden by `display:none !important` (`globals.css:1643–1648`).
  Dead decoration shipped to every page.
- Texture PNGs are hardcoded into five selectors (`globals.css:1527, 1555,
  1584, 1627, 1735`).

### 2.3 Shell / sidebar

- Two shells (`admin-shell.tsx`, `portal-shell.tsx`) are hand-mirrored
  copies; drift is only prevented by discipline. Sidebar geometry (272px),
  logo block, item styles, hover handlers (imperative
  `onMouseEnter` style mutation, `portal-shell.tsx:430–435`) are duplicated.
- The sidebar is opaque dark with a screen-blended texture PNG at 0.2
  opacity — it looks like a stock admin template, not a designed object. No
  glass, no light response, no depth cue at the content seam.

### 2.4 Topbar

- Frosted (`blur(16px)`) but visually inert: no elevation change on scroll,
  breadcrumb-only left side wastes the space, bell + user chip float with
  no grouping. Height fixed 64px with no density response.

### 2.5 Cards

- Every card is the same: white-ish fill, same shadow, same radius, PNG tint
  overlay at 0.1 opacity that reads as dirt on bright screens
  (`.gh-admin-card::before`, `globals.css:1885–1888`). No hierarchy between
  a KPI card, a form section, and a table container.

### 2.6 Tables

- Styled twice: atom primitives (`AdminTable/Thead/Th/Td/Tr` inline styles)
  **and** `.gh-admin-main table/th/td` descendant rules
  (`globals.css:1650–1665`). Raw `<table>` elements on some pages get only
  the descendant styling — two visibly different tables ship today.
- Header rows are muted-gray caps at 10.5px with 0.12em tracking — legible
  but timid; row hover is a barely-visible mint wash + inset bar.

### 2.7 Forms

- Inputs get blanket normalization via descendant selectors
  (`.gh-admin-main :where(input, select, textarea…)`, `globals.css:1679–1685`)
  — `border-radius: 8px !important`, `min-height: 42px` — with no focus
  design, no error/success states, no label system. Field composition is
  re-implemented per feature (`*-fields.tsx` × ~12 in Admin alone).

### 2.8 Buttons

- Six variants defined in the atom, then re-normalized by
  `.gh-admin-main :where(button…)` descendant rules. Active state is a
  generic `translateY(1px) scale(0.99)`. Danger variant hex is inline
  (`atoms.tsx:716–720`). No loading state, no icon-only size, no
  on-glass variant.

### 2.9 Status pills

- `Pill` = uppercase 10.5px with 7 tones from a hex map; `.gh-badge-*` = a
  parallel CSS badge system on tokens. Same semantic ("active") renders two
  different greens depending on which primitive the page author picked.

### 2.10 Summary strips

- `AdminSummaryStrip` hardcodes `repeat(3, …)` columns; tone borders use raw
  `rgba(29,75,54,0.1)`. Four items = orphan row. Used by all three portals
  under an `Admin` name.

### 2.11 Empty states

- `AdminEmptyState` is structurally fine but visually flat: gray text +
  optional raster. The one generated raster
  (`patient-record-empty-state.png`) is used in exactly one place; other
  surfaces show icon-or-nothing.

### 2.12 Mobile cards

- `.gh-admin-mobile-card` / `.gh-admin-appointment-mobile-card` are a
  special-cased table fallback under 760px — functional after the July
  passes, but each list page re-declares its own card body; no shared
  mobile-card primitive exists in `atoms.tsx`.

### 2.13 Loading states

- Admin has a real skeleton library (`admin/_components/skeletons.tsx`);
  Doctor and Patient ship route-local ad hoc skeletons. No shimmer
  direction, no shared timing, three implementations.

### 2.14 Typography

- One font stack (Aptos/Segoe fallback aliased through `--font-manrope`)
  with weights 500/700/800 doing all the work. Numerals are tabular only in
  `StatCard`. Page `h1` sizing is forced by v3 CSS `!important`
  (`globals.css:1841–1849`) fighting the atom's inline `clamp()` — same
  value class, two owners.

### 2.15 Spacing & visual hierarchy

- Three generations of spacing: atom inline paddings, the 1514-block, and
  v3 `--portal-pad-*` variables. Section gap is a token
  (`--portal-section-gap`) but card inner padding is a prop default
  (`padding = 24`) — retuning rhythm requires touching both CSS and TSX.

### 2.16 Role-specific experience

- Zero visual differentiation between portals beyond nav content. A doctor
  in a consultation sees the same chrome as an admin editing a blog post.
  Patient tables assume desktop-operator literacy.

### 2.17 The `gh-admin-*` naming trap

- Classes emitted by shared atoms are prefixed `gh-admin-*` and
  `.gh-admin-main` wraps **every** portal's `<main>`
  (`portal-shell.tsx:362`). Any agent that "safely edits admin CSS" restyles
  Doctor and Patient too. This is the single most dangerous illusion in the
  codebase (dependency map §1, §5).

---

## 3. New premium visual system

Every element below is specified as **look + feel + construction recipe** so
an implementing agent does not have to invent anything.

### 3.1 Base background

- **Canvas:** full-viewport fixed gradient on `.gh-portal-shell`:
  `linear-gradient(165deg, #0C2B21 0%, #0F3A2C 42%, #12432F 100%)` with a
  single radial jade bloom top-right
  (`radial-gradient(1100px 700px at 85% -12%, rgba(46,158,119,0.20), transparent 60%)`).
- **Work plane:** a porcelain panel (`--portal-bg: #F6F8F4` at 0.97 alpha,
  `backdrop-filter: blur(28px)`) inset from the canvas — visually the
  content area floats as one large glass sheet over the deep canvas. On
  ≥1500px viewports the deep canvas shows as a 0–24px breathing edge around
  the work plane; below that the plane is edge-to-edge.
- Replaces `portal-ambient-texture.png` + the flat `#f4f6ef` wash entirely.
  One optional asset (`portal-atmosphere-mesh.webp`, §13-A1) may sit between
  canvas and plane at ≤ 0.35 opacity.

### 3.2 Glassmorphism style (summary — full rules in §11)

Two glass recipes only, tokenized:

- **Chrome glass (dark):** `rgba(10, 36, 27, 0.66)` + `blur(24px)` +
  `saturate(140%)`, 1px border `rgba(255,255,255,0.10)`, inset top highlight
  `inset 0 1px 0 rgba(255,255,255,0.07)`. Used by: sidebar, mobile nav
  sheet, dark dialogs.
- **Surface glass (light):** `rgba(255,255,255,0.72)` + `blur(18px)` +
  `saturate(120%)`, 1px border `rgba(18,54,39,0.10)`, inset highlight
  `inset 0 1px 0 rgba(255,255,255,0.65)`. Used by: topbar, page hero,
  summary strip, side rails, popovers.

### 3.3 Surface layers

| Layer | Token | Fill | Use |
|---|---|---|---|
| L0 canvas | `--portal-bg-deep` | deep gradient (§3.1) | viewport background only |
| L1 plane | `--portal-bg` | porcelain #F6F8F4 @0.97 | the page work surface |
| L2 glass | `--portal-surface-glass` | white @0.72 + blur | chrome, heroes, rails, popovers |
| L3 card | `--portal-surface` | white @0.94, no blur | content cards, tables, forms |
| L4 elevated | `--portal-surface-elevated` | solid #FFFFFF | modals, menus, drag layers |

Rule: **content never sits directly on glass** — text-dense components use
L3/L4. Blur is for chrome, not for reading surfaces.

### 3.4 Card style

- L3 fill, `--portal-radius-lg` (14px), border 1px `--portal-border`,
  shadow `--portal-shadow-rest`
  (`0 1px 2px rgba(12,43,33,0.05), 0 12px 32px rgba(12,43,33,0.07)`),
  inset top highlight `inset 0 1px 0 rgba(255,255,255,0.85)`.
- Hover (interactive cards only): border →
  `--portal-border-strong`, shadow → `--portal-shadow-hover`, translateY(-2px).
- Kill the PNG tint overlay and all `!important` card rules.
- Card headers use `SectionHeader` with a 3×16px jade rule (today's mint
  rule recolored to `--portal-accent`).

### 3.5 Sidebar style

- Chrome glass (dark) over the deep canvas — because the canvas behind is a
  gradient, the sidebar glass picks up depth for free.
- Hairline right edge: `1px rgba(255,255,255,0.08)` plus a 24%-opacity
  1px jade gradient line (`linear-gradient(180deg, transparent, rgba(46,158,119,0.35) 30%, transparent)`).
- Logo block: unchanged asset; portal label eyebrow recolored
  `--portal-accent-soft` text.
- Nav item states (see §12 for motion): rest = white @0.78; hover = white
  @0.95 + fill white @0.05; **active = jade fill `rgba(46,158,119,0.16)` +
  jade text `#8FE3C4` + 3px jade left bar**. Lime `#D9F99D` is retired from
  nav; badge counters become lime only when they represent *live/unread*
  items (their actual meaning today).
- Footer meta line stays; opacity 0.4.

### 3.6 Topbar style

- Surface glass (light), height 64px, sticky. On scroll > 8px it gains
  `--portal-shadow-rest` and its border opacity doubles (one class toggle —
  the only scroll-linked effect in the system).
- Left: breadcrumb (existing logic) prefixed by the **portal glyph** — a
  20px rounded-square tile in the portal's accent (Admin jade, Doctor teal,
  Patient mint — see §6.9) so users always know which surface they are in.
- Right: notification bell and user chip sit inside a shared pill group with
  a 1px border — one object, not two floaters.

### 3.7 Page header (hero) style

- One `PageHeader` recipe for all portals: surface glass, radius
  `--portal-radius-xl` (18px), 22–28px padding, **no raster wash** —
  replaced by a CSS-only corner bloom
  (`radial-gradient(420px 220px at 92% 0%, var(--portal-accent-dim), transparent 70%)`)
  tinted per portal/area.
- Eyebrow dot recolored jade; title stays `clamp(23px, 2vw, 32px)/800`;
  description max-width 68ch.
- Admin area-accent heroes (`gh-admin-area-hero`) keep their per-area accent
  but express it through the corner bloom variable, not extra washes.

### 3.8 Dashboard panel style

- KPI/stat tiles: L3 card at 128px min-height, numeric 34–36px
  `font-variant-numeric: tabular-nums`, label 10.5px caps, icon tile 40px
  with **jade-on-forest** (brand) or **forest-on-porcelain** (neutral)
  fills; lime glyph tiles retired.
- A restrained decor is allowed: single 1.5px accent underline that scales
  from 24px→48px on hover (replaces the deleted radial-decor spans).
- Quick actions: L3 cards with leading icon tile, one-line label, chevron;
  hover lifts 2px.

### 3.9 Tables

- One construction: `AdminTable` primitives only; the `.gh-admin-main table`
  descendant layer is reduced to a safety net matching the same values.
- Header: 10.5px/800 caps at `--portal-text-muted`, background transparent
  (no soft bar), separated by a 1px `--portal-border-strong` rule.
- Rows: 52px comfortable / 44px dense (Admin defaults dense, Doctor/Patient
  comfortable — one `data-density` attribute on `<main>`).
- Hover: `rgba(46,158,119,0.06)` full-row + 2px jade inset bar (keep the
  existing inset-bar idea, recolor).
- First column left-padding 20px; numeric columns right-aligned tabular.
- Mobile: below 760px tables swap to the shared mobile card (§3.20).

### 3.10 Forms

- Field: 44px min-height, L4 fill, 10px radius, border `--portal-border`;
  focus = jade border + `--portal-focus` ring (3px @ 0.35 alpha); error =
  danger border + danger ring; disabled = porcelain fill, 0.6 text.
- Labels: 12.5px/700 forest; helper 12px muted below field; error text
  replaces helper, never appears alongside.
- Field groups live inside `FormSection` cards (promoted pattern, §7) with a
  `SectionHeader` and a 2-column grid ≥ 900px, 1-column below.
- Selects/textareas share the recipe; rich-text
  (`rich-text-html-field.tsx`) gets the same border/focus shell around its
  editor chrome.

### 3.11 Buttons

- Radius decision: **10px rounded-rect** (`--portal-radius-button`) — the
  999px pill inline style and the 8px override both die; one value, from a
  token. Pills remain for status only, preserving a clear shape language:
  *rounded-rect = action, pill = status*.
- Variants: `primary` (forest fill, porcelain text, jade underglow on
  hover), `secondary` (forest outline), `soft` (jade @0.12 fill, forest
  text), `ghost`, `accent` (jade fill `#2E9E77`, white text — replaces lime
  accent buttons), `danger` (tokenized `--portal-danger` fill @0.12, danger
  text, danger border @0.4).
- States: hover = fill shift + shadow-rest; active = translateY(1px);
  focus-visible = `--portal-focus` ring; loading = 16px spinner replacing
  `iconLeft`, label persists.

### 3.12 Badges / status pills

- One tokenized tone map consumed by **both** `Pill` and `.gh-badge-*`:
  `success | warning | danger | info | neutral | brand | live`.
  `live` is the only lime tone (lime dot + forest text) — reserved for
  "happening now" (active consultation, online, unread).
- Anatomy: pill radius, 11px/700 caps, 0.05em tracking, optional 5px dot
  with 2px soft halo, tone fill @0.14, tone border @0.35, tone text at
  ≥ 4.5:1 on the fill.

### 3.13 Modals / dialogs

- L4 surface, radius 18px, `--portal-shadow-modal`
  (`0 24px 80px rgba(8,30,22,0.35)`), overlay = deep canvas color @0.45 +
  `blur(6px)`.
- Header (title + close), body, footer (actions right-aligned, primary
  last). Max-width 560px default / 760px wide / full-sheet on mobile
  (slides from bottom, grabber handle).
- Applies to: `confirm-delete-button`, `consultation-documents-modal`,
  `delete-account-button`, `EventDetailDialog` — one `PortalDialog` shell.

### 3.14 Tabs

- One `PortalTabs` visual: underline style — 13px/700 labels, muted at
  rest, forest active, 2px jade underline that slides (transform-based)
  between items; scrollable with fade masks on overflow (keep
  `.gh-portal-tabs` thin-scrollbar behavior).
- Consolidates: `plan-edit-tabs`, `*-translation-tabs`, `appointment-tabs`,
  profile `*-tab` headers, `faq-language-tabs`.

### 3.15 Calendar surfaces

- `MonthCalendar`: L3 card; day cells hairline-separated (no full grid
  boxes); today = jade ring; selected = forest fill white text; event dots
  use the status tone map; weekend headers muted.
- `DayAgenda`: timeline rail on the left (1px border + jade "now" tick),
  event cards as compact L3 cards with status pill and time in tabular
  numerals.
- `EventDetailDialog`: `PortalDialog` shell (§3.13).
- `TimezoneSelect`: standard form field recipe.

### 3.16 Chat surfaces

- Thread container: L3 card with porcelain body (`--portal-bg` @0.6) so
  bubbles pop.
- Bubbles: own message = forest fill, porcelain text, 14px radius with
  4px tail-corner; other party = white fill, forest text, same geometry
  mirrored; internal/system notes = dashed-border neutral chip centered.
- Composer: elevated L4 bar pinned bottom, jade send button, disabled state
  clearly labeled (consultation closed).
- Applies to `ChatThread`, `ConsultationChat`, `InternalMessagesThread` via
  one shared bubble/thread core (dependency map §7).

### 3.17 Document cards / tables

- Shared `DocumentTable` direction (Doctor `doctor-document-tables` +
  Patient `medical-files`): leading file-type icon tile (16px glyph on 32px
  porcelain tile), name + meta stack, status pill, trailing actions as
  `IconBtn`s. Review states (pending review / sent / signed) use the status
  tone map. Mobile: same mobile-card primitive.

### 3.18 Appointment cards

- Shared `AppointmentCard`: left time block (tabular, 15px/800 + tz meta),
  center patient/doctor + service line, right status pill + action. A 3px
  left edge bar carries the status tone. `live` tone (lime) when the
  consultation is in progress. Used by Admin/Doctor lists and Patient
  bookings; mobile card variant identical minus the grid.

### 3.19 Invoice / payment cards

- Amounts always tabular numerals, currency 0.7em superscript-weighted;
  paid = success pill, refund states = warning/danger; card rows lead with
  a document icon tile; receipt action = soft button. Admin ops framing
  (dense table) vs Patient framing (cards with plain-language captions)
  share tokens, not markup.

### 3.20 Empty states

- Anatomy: 220px-max illustration slot (assets §13-E group) **or** 44px
  icon tile, 16px/800 title, 13.5px muted body ≤ 52ch, optional primary
  action. Vertically centered in the card with 48px padding.
- Tone: reassuring, never blank. Every list surface must render it (already
  mostly wired via `AdminEmptyState` — this is a restyle, not a rebuild).

### 3.21 Loading skeletons

- One shared skeleton kit (`components/portal-skeletons.tsx`, promoted from
  `admin/_components/skeletons.tsx` — dependency map §7).
- Shimmer: porcelain base `#EEF1EA`, highlight sweep
  `rgba(255,255,255,0.7)` 1.6s ease-in-out infinite, `prefers-reduced-motion`
  → static two-tone pulse.
- Kit shapes: page header, summary strip, stat grid, table (header + n
  rows), card, form section, calendar month, chat thread — mirroring real
  composition so load → content never jumps.

---

## 4. Premium color palette

Decided. No user input required. Values chosen to keep brand identity
(forest/mint family) while deepening the atmosphere and introducing jade as
the interaction color.

### 4.1 Palette

| Role | Value | Notes |
|---|---|---|
| primary background (work plane) | `#F6F8F4` | cool porcelain; replaces warm `#f4f6ef` |
| secondary background (deep canvas) | `#0C2B21 → #12432F` gradient | unifies the four ad-hoc darks |
| glass surface | `rgba(255,255,255,0.72)` + blur 18 | light chrome glass |
| elevated surface | `#FFFFFF` | modals, menus |
| sidebar background | `rgba(10,36,27,0.66)` + blur 24 over canvas | chrome glass (dark) |
| topbar background | `rgba(250,252,249,0.78)` + blur 18 | surface glass |
| primary text | `#12291F` | deep forest-black, 15.6:1 on porcelain |
| secondary text | `#3F544A` | body copy |
| muted text | `#6C7E74` | meta, helpers (≥ 4.6:1 on porcelain) |
| primary accent (brand action) | `#1D4B36` | unchanged brand forest — buttons, links, headings |
| secondary accent (interactive) | `#2E9E77` **jade — new** | hovers, active nav, focus, selection, tab underline |
| success | `#1E8E62` (fill @0.14, text `#136247`) | replaces split `#15803D`/`#166534` |
| warning | `#C27803` (fill @0.14, text `#8A5602`) | calmer than `#D97706` |
| danger | `#C03D3D` (fill @0.12, text `#8F2C2C`) | replaces raw `#FEE2E2/#991B1B` map |
| info | `#2C7A9E` (fill @0.14, text `#1E5975`) | steel blue, unchanged family |
| border | `rgba(18,54,39,0.10)` | hairline on porcelain |
| soft border | `rgba(18,54,39,0.06)` | inner dividers |
| glow color | `rgba(176,241,34,0.35)` | **lime, signal-only**: live dots, unread, "now" tick |
| hover color | `rgba(46,158,119,0.08)` | rows, list items, quick actions |
| focus ring | `rgba(46,158,119,0.40)` 3px | all focus-visible states |

### 4.2 Recommended CSS variables

Extend the **existing** scoped layer on `.gh-portal-shell`
(`globals.css:1749` already defines `--portal-bg`, `--portal-surface`,
`--portal-line`, `--portal-radius`, `--portal-shadow` — build on it, do not
create a parallel namespace):

```css
.gh-portal-shell {
  --portal-bg: #F6F8F4;
  --portal-bg-deep: #0C2B21;              /* canvas gradient start */
  --portal-bg-deep-2: #12432F;            /* canvas gradient end */
  --portal-surface: rgba(255,255,255,0.94);      /* L3 content card */
  --portal-surface-glass: rgba(255,255,255,0.72);/* L2 light glass */
  --portal-surface-elevated: #FFFFFF;            /* L4 */
  --portal-sidebar-bg: rgba(10,36,27,0.66);      /* + blur token below */
  --portal-topbar-bg: rgba(250,252,249,0.78);
  --portal-text: #12291F;
  --portal-text-2: #3F544A;
  --portal-text-muted: #6C7E74;
  --portal-primary: #1D4B36;
  --portal-primary-hover: #163826;
  --portal-accent: #2E9E77;               /* jade */
  --portal-accent-soft: rgba(46,158,119,0.14);
  --portal-accent-dim: rgba(46,158,119,0.07);
  --portal-success: #1E8E62;
  --portal-warning: #C27803;
  --portal-danger: #C03D3D;
  --portal-info: #2C7A9E;
  --portal-live: #B0F122;                 /* lime, signal-only */
  --portal-border: rgba(18,54,39,0.10);
  --portal-border-strong: rgba(18,54,39,0.20);
  --portal-border-soft: rgba(18,54,39,0.06);
  --portal-glow: rgba(176,241,34,0.35);
  --portal-hover: rgba(46,158,119,0.08);
  --portal-focus: rgba(46,158,119,0.40);
  --portal-blur-chrome: 24px;
  --portal-blur-surface: 18px;
  --portal-shadow-rest: 0 1px 2px rgba(12,43,33,0.05), 0 12px 32px rgba(12,43,33,0.07);
  --portal-shadow-hover: 0 2px 4px rgba(12,43,33,0.06), 0 18px 44px rgba(12,43,33,0.11);
  --portal-shadow-modal: 0 24px 80px rgba(8,30,22,0.35);
  --portal-radius-sm: 8px;
  --portal-radius: 10px;
  --portal-radius-lg: 14px;
  --portal-radius-xl: 18px;
  --portal-radius-button: 10px;
  --portal-radius-pill: 999px;
}
```

Per-portal accent override (one line per layout wrapper, §6.9):

```css
[data-portal="admin"]   { --portal-accent: #2E9E77; }  /* jade  */
[data-portal="doctor"]  { --portal-accent: #2F8FA3; }  /* clinical teal */
[data-portal="patient"] { --portal-accent: #4CAE7E; }  /* warm mint-jade */
```

### 4.3 Why this palette is premium and healthcare-appropriate

- **Depth without darkness where it matters:** patients and doctors read on
  porcelain (light, 15:1 text contrast); the deep canvas provides luxury
  framing without ever carrying body text.
- **Jade is the credibility move.** A single desaturated interactive green
  reads surgical and deliberate; it is visually related to the brand forest
  (same hue family, +lightness, −saturation drift toward teal) so nothing
  feels off-brand.
- **Lime becomes meaningful.** By appearing only on live/unread/now signals,
  the loudest brand color acquires semantics — the interface literally
  glows where life is happening. That is a healthcare story, not a styling
  tic.
- **Status tones are desaturated and darkened** for text-contrast compliance
  on their soft fills (all text/fill pairs chosen ≥ 4.5:1).

### 4.4 How it differs from the current green/lime system

| Aspect | Current | Meridian Glass |
|---|---|---|
| Accent | lime `#B0F122` everywhere + stray `#D9F99D` | jade `#2E9E77` interactive; lime signal-only |
| Dark tones | 4 unrelated near-blacks | one tokenized canvas gradient |
| Background | warm yellow-green `#f4f6ef` + texture PNG | cool porcelain over deep canvas, CSS-only |
| Status | two disagreeing palettes (tokens vs `PILL_TONES` hex) | one tokenized tone map |
| Shadows | forest-tinted, 3 competing definitions with `!important` | 3-step tokenized scale |

---

## 5. Typography and spacing system

Document only — do not implement yet.

### 5.1 Font direction

- **Keep one family**: the existing `--font-manrope` stack (Aptos → Segoe UI
  fallback). Recommendation for the implementation phase: self-host
  **Manrope Variable** (`next/font/local`, weights 400–800) so all
  platforms render identically; keep Aptos/Segoe as fallback. No second
  display family — premium here means weight/size discipline, not a serif.
- Monospace `--font-geist-mono` (Cascadia stack) is promoted to a real role:
  IDs, order numbers, IBAN/last-4, timestamps in audit log.

### 5.2 Type roles

| Role | Spec |
|---|---|
| Page title (h1) | `clamp(23px, 2vw, 32px)` / 800 / −0.02em / lh 1.08 |
| Section title (h3 in cards) | 16px / 800 / −0.01em |
| Eyebrow/kicker | 12px / 800 / +0.06em / caps / jade dot prefix |
| Body | 14px / 500 / lh 1.6 / `--portal-text-2` |
| Label (forms) | 12.5px / 700 / `--portal-text` |
| Helper/meta | 12px / 500 / `--portal-text-muted` |
| Table header | 10.5px / 800 / +0.10em / caps / muted |
| Table cell | 13.5px / 500 |
| Numeric/stat | 34–36px / 800 / −0.02em / `tabular-nums`; inline metrics 15px/800 tabular |
| Button | sm 13px / md·lg 14px / 700 / no tracking |
| Mono data | 12.5px mono / muted |

### 5.3 Spacing scale

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56` px. Bindings: card padding 20–24,
section gap `--portal-section-gap` (keep existing clamp 14–22px), page
padding `--portal-pad-x/y` (keep existing clamps), form row gap 16, field
internal 12×14, table cell 11×14 (dense) / 14×16 (comfortable).

### 5.4 Radius scale

`--portal-radius-sm 8 / radius 10 / lg 14 / xl 18 / pill 999`. Buttons 10,
inputs 10, cards 14, hero + modal 18, chips/pills 999. Resolves the
`--radius-card 20px` vs forced-8px drift noted in the dependency map §6.

### 5.5 Shadow scale

`rest / hover / modal` only (§4.2 values). No component-local shadows.

### 5.6 Blur / glass scale

`--portal-blur-chrome 24px` (dark chrome), `--portal-blur-surface 18px`
(light glass), overlay blur 6px. Nothing else blurs.

### 5.7 Max-width & density

- Keep `--portal-main-max: 1500px` and `--portal-readable-max: 1180px`.
- New: `data-density="dense|comfortable"` on each portal `<main>` — Admin
  dense, Doctor/Patient comfortable — consumed by table/list rules only.

---

## 6. Layout and shell redesign

Files: `frontend/app/(admin)/admin/_components/admin-shell.tsx`,
`frontend/components/portal-shell.tsx`, `frontend/app/globals.css`.

**Cardinal rule (dependency map §2):** the two shells are deliberate mirrors
sharing CSS classes. Every change below must land in both, in the same
implementation phase, or the portals visually fork.

### 6.1 Sidebar (all portals)

- Replace opaque fill + texture PNG with chrome-glass recipe (§3.2) over the
  new canvas; add jade hairline edge (§3.5).
- Replace inline hover mutation handlers with CSS classes
  (`.gh-portal-nav-item`, `:hover`, `[aria-current]`) — deletes the
  `onMouseEnter/Leave` style writes in both shells.
- Active state: jade system (§3.5); tokenized (`--portal-accent-soft`), no
  more inline `#D9F99D`.
- Width stays 272px (`--portal-sidebar-w` already exists — use it in both
  shells instead of the literal).

### 6.2 Topbar (all portals)

- Surface-glass token; scroll-elevation class (§3.6); portal glyph before
  breadcrumbs; bell + user chip grouped in one bordered pill.

### 6.3 Breadcrumbs (all portals)

- Keep logic (including CUID truncation). Style: 13px, muted → forest on
  hover, chevron 12px @0.5. Last crumb 700 forest. On mobile collapse to
  `‹ Parent` single crumb.

### 6.4 Notification popover (all portals)

- `NotificationPopover.tsx`: L4 elevated surface, 18px radius, unread rows
  get a 5px lime `--portal-glow` dot + porcelain tint; read rows plain;
  "view all" as soft button full-width footer. Bell unread badge = lime dot
  with soft halo (this is a legitimate `live` signal).

### 6.5 User menu (all portals)

- Same L4 recipe as popover; avatar keeps forest fill; role line becomes a
  neutral pill; sign-out becomes `danger-soft` button.

### 6.6 Active nav / mobile nav

- Mobile: sidebar becomes a full-height chrome-glass sheet sliding over a
  `blur(6px)` scrim (overlay already exists — restyle only). Close affordance
  stays in the topbar hamburger.

### 6.7 Content width & page background

- `<main>` keeps `gh-admin-main gh-portal-main` classes (do **not** rename in
  this redesign — see §15.11) with the L1 porcelain plane behind it; the deep
  canvas is painted by `.gh-portal-shell` (§3.1).

### 6.8 Role-specific shell differences

| Shell aspect | Admin | Doctor | Patient |
|---|---|---|---|
| Nav structure | Global/Country split (keep) | single section | single section, i18n labels (keep) |
| Country picker | keep in topbar; restyle trigger as glass pill with flag + chevron; menu = L4 surface, search field top, active row jade | n/a | n/a |
| Portal glyph color | jade | clinical teal | mint-jade |
| Density default | dense | comfortable | comfortable |
| Extra rail | none | "Now" rail on dashboard (§9) | next-appointment banner (§10) |
| Logo href | `/admin` | `/doctor` | country homepage (keep existing prop) |

### 6.9 What is global vs role-specific

- **Global (edit once, affects all 3):** canvas + plane backgrounds, glass
  recipes, sidebar/topbar tokens, nav item classes, popover/user-menu
  styles, breadcrumb styles — all in `globals.css` + both shells in lockstep.
- **Role-specific:** country picker (Admin only), `data-portal` attribute +
  accent override, nav sections content, density attribute, dashboard rails.
- Mechanism: each layout already renders its own shell instance — add
  `data-portal` and `data-density` at the shell root `div` so CSS handles
  the divergence; no component forks.

---

## 7. Shared component redesign plan

Token dependency shorthand: **T** = needs §4.2 tokens landed first.

| Component | Current role | Portals | Future direction | Risk | Global vs role | Notes |
|---|---|---|---|---|---|---|
| `PageHeader` (`atoms.tsx`) | page hero | all 3 | §3.7 glass hero, CSS bloom, no raster | **High** | global; per-area accent via CSS var | T. Remove v3 `!important` h1 overrides at the same time |
| `SectionHeader` | in-card header | all 3 | jade rule, unchanged structure | Low | global | T |
| `AdminCard` | generic card | all 3 | §3.4 L3 recipe; move all visuals to CSS, atom keeps padding prop only | **High** | global | Untangle triple-layer radius/shadow first (§15.2) |
| `StatCard` | KPI tile | all 3 | §3.8; delete dead decor spans; tone map via tokens | Medium | global | Lime glyph tiles → jade/forest |
| `AdminSummaryStrip` | metric strip | all 3 | auto-fit columns (`repeat(auto-fit, minmax(180px,1fr))`), tokenized tones, glass variant for heroes | Medium | global | Fixes 4-item orphan |
| `AdminEmptyState` | empty state | all 3 | §3.20 anatomy; illustration slot standardized | Low | global | Assets §13-E |
| `Pill` | status pill | all 3 | single tokenized tone map incl. `live` | **High** | global | Must land together with `.gh-badge-*` retokenization or two palettes persist |
| `Btn` | button | all 3 (+ site classes) | §3.11; move variant visuals to CSS classes, drop inline 999 radius | **High** | global | Audit `.gh-admin-main button` descendant overrides in same pass |
| `IconBtn` | row action | all 3 | 32px, 9px radius, jade hover ring | Low | global | |
| `Toggle` | switch | all 3 | forest track → jade on-state, 200ms knob | Low | global | |
| `AdminTable`/`Thead`/`Th`/`Td`/`Tr` | table kit | all 3 | §3.9; density attr; reduce descendant CSS to safety net | **High** | global | Two-mechanism problem (§2.6) resolved here |
| `NotificationPopover.tsx` | bell + dropdown | all 3 | §6.4 | Medium | global | Single file, safe once tokens exist |
| `calendar/MonthCalendar` | month grid | all 3 | §3.15 | **High** | global | Verify all 3 `/calendar` routes after edit |
| `calendar/DayAgenda` | day list | all 3 | §3.15 timeline + jade now-tick | Medium | global | |
| `calendar/EventDetailDialog` | event modal | all 3 | `PortalDialog` shell | Medium | global | |
| `calendar/TimezoneSelect` | tz picker | all 3 | form-field recipe | Low | global | `calendar-utils/-types` are logic — do not touch |
| `chat/ChatThread` | admin↔patient chat | Admin, Patient | §3.16 bubble core | Medium | global | |
| `chat/ConsultationChat` | consult chat | Doctor, Patient | §3.16 + disabled/closed states | Medium | global | |
| `chat/InternalMessagesThread` | staff notes | Admin, Doctor | §3.16, system-note chips | Medium | global | |
| `forms/phone-field.tsx` | phone input | all 3 **+ public site** | field recipe; verify site checkout/consult after edit | **High** | global+site | The only portal component that escapes to `(site)` |
| `forms/LanguagePicker.tsx` | language multiselect | Doctor | field recipe + jade chips | Low | role (Doctor) | |
| `admin/_components/skeletons.tsx` | Admin skeletons | Admin (today) | promote to `components/portal-skeletons.tsx`, shimmer spec §3.21 | Medium | becomes global | Keep old path re-exporting during migration |
| `admin/_components/country-picker.tsx` | market scope | Admin | glass pill trigger + L4 menu | Low | role (Admin) | |
| `admin/_components/scope-banner.tsx` | scope banner | Admin | glass info bar w/ flag + jade accent | Low | role (Admin) | |
| `portal-atoms.ts` | re-export shim | Doctor, Patient | **no visual work ever** — keep pure re-export | pass-through High | n/a | Fork = instant design split; forbidden |

New shared primitives to introduce (documented for phases 3–4; markup owners
listed in dependency map §7): `PortalDialog`, `PortalTabs`, `FormSection`,
`PortalMobileCard`, `AppointmentCard`, `DocumentTable`, unified
notification list (Doctor `notification-list` + Patient
`patient-notification-list`).

---

## 8. Admin Portal redesign plan

Root: `frontend/app/(admin)/admin/**`. Feel: **operations command center** —
data-dense but composed; the deep canvas + dense tables + jade telemetry make
it read like mission control for a clinic network. No code in this section;
per-route direction only.

- **Dashboard (`/admin`)**: replace the raster
  `admin-dashboard-clinical-wash.png` hero with the glass hero + jade bloom;
  stat grid `auto-fit minmax(240px,1fr)` (kills the orphan-card fix-up);
  add a compact "operations pulse" row — today's appointments, unpaid
  orders, pending verifications — as jade-accented summary items linking to
  their queues. Country picker state echoed as a scope chip in the hero.
- **Appointments (`/admin/appointments`, `[id]`, `new`)**: list uses
  `AppointmentCard` tones in a dense table; status pills from the unified
  tone map; detail page keeps its single-column-under-1024 fix, with the
  internal-messages card visually separated (dashed system-note chips);
  manual booking form adopts `FormSection`.
- **Orders (`/admin/orders`, `[id]`)**: money columns tabular right-aligned;
  payment status pills unified; the summary strip on `[id]` becomes a glass
  strip under the hero; bulk actions bar becomes a sticky elevated bar when
  rows selected.
- **Doctors (list, `[id]`, edit, availability, services)**: profile hero on
  `[id]` with avatar tile, market flags, credential pills; edit page tabs →
  `PortalTabs`; availability editor visual parity with Doctor portal's
  editor (same slot-chip recipe) so the two availability surfaces stop
  diverging (dependency map §4.2).
- **Patients (`/admin/patients`)**: privacy-first framing — muted meta,
  verification status pills, GHN/document counts as icon+count chips.
- **Services (+ general-consultations / specialist-consultations /
  online-prescriptions delegating routes)**: keep delegation; service rows
  get kind-tinted icon tiles; price/duration tabular; the redesigned
  status switch stays.
- **Countries / content / legal (`/admin/countries/**`, `country-features`,
  `footer`, `pages`)**: CMS forms adopt `FormSection` + `PortalTabs` for
  translation tabs; legal-document tables get `DocumentTable` treatment;
  flag badges unchanged.
- **Health tests**: same list recipe as services; FAQ panel → `PortalTabs`.
- **Blog / CMS / pages / footer / newsletter**: editorial lists with title +
  slug mono + status pill; rich-text fields get the form-shell border/focus
  treatment (§3.10).
- **Assets (`/admin/assets/**`)**: thumbnail tile leading each row (32px,
  porcelain frame); upload fields get drag-highlight (jade dashed border on
  dragover).
- **Plans / subscriptions / invoices / users**: money + counts tabular;
  `subscription-health-panel` becomes a glass telemetry strip (green/amber
  states from tone map); `subscriber-ledger` dense table; users table gets
  role pills (brand tone for SUPER_ADMIN).
- **Specialties / automation / audit log / calendar**: audit log timestamps
  in mono; automation runs get status-tone left edge bars; calendar = shared
  calendar restyle (§3.15).
- **Loading / empty / error**: all `loading.tsx` consume the promoted
  skeleton kit; empty states per §3.20 with §13-E assets; add portal-root
  `error.tsx` (none exists today — dependency map §2) using the empty-state
  anatomy with danger tone.
- **Mobile**: keep table→card fallback; migrate the per-page card bodies to
  `PortalMobileCard` progressively; topbar country picker collapses to flag
  chip.

---

## 9. Doctor Portal redesign plan

Root: `frontend/app/(doctor)/doctor/**`. Feel: **clinical workspace** —
quieter than Admin, appointment-first, zero visual noise during a
consultation. Clinical-teal accent (`#2F8FA3`) via `data-portal="doctor"`.

- **Dashboard (`/doctor`)**: the hero carries a **"Now" rail** — next
  appointment (time in large tabular numerals, patient, service, join
  action) pinned at top; if a consultation is live, the rail switches to
  the `live` lime treatment. Below: today's schedule list (AppointmentCard
  comfortable density), pending-documents count, unread messages.
- **Appointments list**: comfortable density table / cards; status pill +
  3px status edge; date grouping headers (Today / Tomorrow / date).
- **Appointment detail (`[id]`)**: the consultation workspace. Two-zone
  layout ≥1024px: left = consultation form + finalize checklist; right =
  patient context (profile summary, documents, chat). Tabs → `PortalTabs`.
  The workflow summary strip stays but becomes glass. During an active
  consultation the page suppresses all non-essential accents (calm mode —
  fewer borders, no hover lifts on the form zone).
- **Consultation workflow (consultation-form, finalize-checklist,
  appointment-actions)**: form adopts §3.10; checklist items become
  check-tile rows (porcelain → success tint when done); sign/finalize is
  the single primary button on the page — nothing else may be `primary`.
- **Document review / send panels (documents-review-send-panel,
  documents-list, document-upload-form, consultation-documents-modal)**:
  `DocumentTable` recipe; review status pills; modal → `PortalDialog`;
  upload dropzone with jade dashed dragover.
- **Chat / messages (consultation-chat-section, InternalMessagesThread)**:
  §3.16; internal notes visually distinct (dashed neutral chips) so
  clinical chat and staff notes cannot be confused.
- **Medical notes (appointment-medical-notes-section)**: chart-like list —
  mono timestamps, author chip, note body on porcelain inset.
- **Prescriptions / exam results (prescriptions-list, exam-results-list)**:
  `DocumentTable` rows with kind icons (Rx, lab); issued state pills.
- **Availability (`availability-ui.tsx`)**: weekly grid of slot chips —
  porcelain chip rest, jade-filled active, danger-soft for blocked; summary
  strip above stays.
- **Calendar**: shared restyle (§3.15); doctor accent colors the "now" tick.
- **Patients (list, `[email]`)**: patient header card with initials tile,
  GHN mono, consult count; consultation-history timeline (date rail +
  compact cards); all-documents card → `DocumentTable`.
- **Profile (+ `[country]`, edit-form, profile-sections)**: readiness
  summary stays; edit form via `FormSection`; `LanguagePicker` jade chips;
  payout/bank section framed with a security note (info tone).
- **Services / invoices / reports / notifications / forms-templates**:
  selection form as check-tile grid; invoices per §3.19; reports keep CSV
  action as soft button with mono counts; notifications adopt the unified
  list; templates as card grid with kind icons.
- **Loading / empty / error**: skeleton kit; empty states use clinical
  assets (§13-E2/E3); add `error.tsx` at root.
- **Mobile**: consultation workspace stacks context-first → form —
  a doctor on mobile is usually reviewing, not writing; sticky bottom action
  bar for join/finalize during consultations.

---

## 10. Patient/Account Portal redesign plan

Root: `frontend/app/(auth)/account/**` (correct path — no `(account)`
group). Feel: **reassuring health home** — warm, plain-language, one clear
next action, mobile-first. Mint-jade accent (`#4CAE7E`).

- **Account dashboard (`/account`)**: hero greets by first name with a
  **next-appointment banner** (date/time large, doctor, join/reschedule
  actions) or a "book a consultation" primary action when none; health-home
  summary strip stays (records / payments / membership) but as tappable
  glass chips; SubscriptionDashboard card cluster below with plan status
  pill and renewal date in plain language.
- **Appointments / bookings (`/account/bookings`, `ui.tsx`)**: card-first
  (no tables): `AppointmentCard` comfortable, past visits collapsed under a
  "history" disclosure; payment-needed panels become warning-tone cards
  with a single pay action; chat entry points (ChatThread /
  ConsultationChat) restyled per §3.16; `SyncOrderPaymentOnReturn` is
  behavioral — untouched.
- **Booking flow**: the portal links out to the public `/book` wizard —
  no in-portal booking surface exists; only ensure the return/callback
  screens (bookings + payment sync states) use the new tone cards.
- **Orders / payments / invoices (`/account/orders`, `[id]`,
  `/account/payments`, receipt-button)**: §3.19 consumer framing — cards
  with plain captions ("Paid · 12 Jun 2026 · Visa •• 4242" in mono last-4);
  receipts as soft buttons; refund states explained in one sentence, not
  just a pill.
- **Profile / settings (`/account/profile`, tabs)**: profile tabs →
  `PortalTabs`; each tab body a `FormSection` card; readiness summary keeps.
- **Verification / insurance / GDPR tabs**: status-first — a large tone
  card at top (success "Verified", warning "Action needed" with the exact
  missing item); uploads via the shared dropzone recipe; GDPR actions
  (export/delete) framed as info cards with clear consequences, delete
  routed through `PortalDialog` (danger).
- **Medical files / documents (`/account/medical-files`)**: `DocumentTable`
  consumer variant — larger touch targets, file-kind icons, "shared by
  Dr. X" meta; empty state keeps the patient-record illustration (replace
  raster with §13-E1 refresh).
- **Prescriptions / results (`/account/prescriptions`)**: Rx cards with
  issue date, doctor, and a clear download action; results (when present)
  same recipe with lab icon.
- **Notifications (`patient-notification-list`)**: unified list component;
  unread lime dot; friendly empty state.
- **Chat / messages**: within bookings (above) — no separate route; ensure
  disabled/closed consultation states explain *why* in plain language.
- **Membership / subscriptions / rewards (`/account/membership`,
  `ManagePanel`, `/account/rewards`, `RewardsPanel`, `/account/subscribe`,
  `SubscribeForm`)**: plan card gets a brand-tone header band with plan
  name + status pill; benefit rows as icon + plain sentence; credits and
  wellness-reward progress as a slim jade progress bar (the one place a
  progress bar exists in the system); subscribe flow's recurring-charge
  consent card stays, restyled info-tone; manage actions (pause/cancel) in
  a quiet danger-soft cluster behind a disclosure.
- **Security / family / access-history**: delete-account through
  `PortalDialog` danger flow (type-to-confirm); access-history rows with
  mono timestamps (transparency = trust); family member cards with
  relationship chips.
- **Loading / empty / error**: skeleton kit; warm empty states (§13-E1/E4);
  add `error.tsx` with a reassuring tone and a support link.
- **Mobile (primary platform)**: single column throughout; sticky bottom
  action on payment-needed and subscribe screens; touch targets ≥ 44px;
  the account nav sheet lists items with icons + descriptions (patients
  navigate by recognition, not memory).

---

## 11. Glassmorphism and depth rules

The discipline that keeps glass premium instead of cheap.

### Where glass IS used

Shell canvas edge, sidebar, topbar, page hero, summary strips in heroes,
popovers/menus, mobile nav sheet, modal overlays (blur behind), the "Now"
rail (Doctor) and next-appointment banner (Patient).

### Where glass is NOT used

Content cards, tables, forms, chat bodies, document lists, anything with
body text or data — these sit on L3/L4 near-opaque surfaces. **Never nest
glass in glass** (a glass card inside the glass hero is forbidden — the
inner surface must be L3+).

### Blur levels

24px chrome (dark) / 18px surface (light) / 6px overlay scrim. Only these
three, only from tokens.

### Opacity levels

Dark chrome fill 0.62–0.70; light glass fill 0.70–0.80; content surfaces
≥ 0.92; overlay scrim 0.45.

### Border treatment

Every glass pane: 1px border (light glass `rgba(18,54,39,0.10)`; dark chrome
`rgba(255,255,255,0.10)`) — glass without an edge reads as a rendering bug.

### Inner highlights

1px inset top highlight on every glass pane and every L3 card
(`rgba(255,255,255,0.65)` light / `rgba(255,255,255,0.07)` dark). This is
the "expensive" cue — light catching the top edge.

### Shadows

Glass panes use `--portal-shadow-rest` only; depth comes from blur +
backdrop, not shadow stacking. Modals alone use `--portal-shadow-modal`.

### Glow usage

Lime `--portal-glow` only: unread dot halo, live-consultation edge, "now"
tick on agenda. Maximum one glowing element per viewport region; glow never
on text.

### Gradient usage

Three sanctioned gradients: canvas (§3.1), hero corner bloom (accent-dim
radial), sidebar edge line. No gradient fills on buttons, pills, or text.

### Keeping contrast readable

- Body text only on surfaces with effective luminance ≥ that of `#EFF2EC`
  (i.e. L1+); text on glass limited to headings/labels ≥ 12.5px/700.
- All text/fill pairs in §4 chosen for ≥ 4.5:1 (AA); large numerics ≥ 3:1.
- The backdrop behind light glass is always the controlled porcelain
  plane — glass never sits over unpredictable imagery.

### Avoiding the cheap look

No noise textures over glass, no rainbow sheen, no >30% saturation shifts in
`backdrop-filter`, no glass on elements smaller than 120px wide (chips and
buttons are solid), no more than two glass panes stacked in one composition
(sidebar + hero is fine; sidebar + hero + glass card is not).

### Accessibility considerations

- `@supports not (backdrop-filter: blur(1px))` fallback: glass fills switch
  to their solid equivalents (`#0E3227` sidebar, `#FBFCF9` topbar/hero).
- `prefers-reduced-transparency` (where supported) → same solid fallbacks.
- `prefers-reduced-motion` → §12 rules; shimmer → static pulse.
- Focus rings (`--portal-focus`, 3px) must remain visible on glass — test on
  both chrome recipes.

---

## 12. Motion and microinteraction direction

Document only. Global constants: durations 120ms (micro) / 200ms (standard)
/ 280ms (panels); easing `cubic-bezier(0.22, 1, 0.36, 1)` ("confident
settle") for entrances, `ease-out` for exits; nothing bounces; everything
animates `transform`/`opacity` only. `prefers-reduced-motion`: all
transitions ≤ 50ms opacity-only, shimmer static.

| Surface | Direction |
|---|---|
| Page transitions | none router-level; page content fades/rises 8px over 200ms via a single `.gh-portal-enter` utility on `<main>` children (CSS-only, no lib) |
| Hover states | cards lift 2px + shadow-hover (200ms); rows tint jade @0.06 with 2px inset bar sliding in (120ms); quick-actions chevron nudges 2px |
| Buttons | hover fill shift 120ms; press translateY(1px); loading spinner cross-fades with iconLeft slot; success flash = 1 border pulse in success tone (used after form saves) |
| Card lift | interactive cards only; static info cards never move |
| Table row hover | tint + inset bar as above; row actions (IconBtn) fade from 0.55→1 |
| Modal transitions | overlay fades 200ms; dialog scales 0.98→1 + fades 200ms; mobile sheet slides up 280ms |
| Notification interactions | popover scales from bell origin 200ms; unread lime dot pulses ×2 on arrival then rests; row mark-as-read fades tint out 280ms |
| Sidebar active state | 3px jade bar animates height 0→18px on activation (200ms); item bg cross-fades; no layout shift |
| Skeleton shimmer | 1.6s sweep, ease-in-out, porcelain base (§3.21) |
| Calendar | month cell hover tint 120ms; day selection ring scales in 120ms; agenda "now" tick breathes (opacity 0.7↔1, 3s) — the one ambient animation |
| Chat | new messages rise 6px + fade 200ms; composer send button tint-shifts while sending; no typing simulation effects |
| Mobile menu | chrome-glass sheet slides 280ms with scrim fade; nav items stagger 20ms (max 8 staggered) |

---

## 13. Asset strategy

Principle: fewer, better, tokenized. The five current base PNGs
(`portal-ambient-texture`, `portal-sidebar-texture`, `portal-header-wash`,
`portal-card-tint`, `portal-clinical-wash`) and the header wash usage of
`generated/clinical-panel-wash.png` are **retired** — their jobs move to CSS
gradients. Only atmospheric depth and empty-state illustrations justify
raster assets. New assets live under
`frontend/public/images/portal/premium/`. All are decorative
(`aria-hidden`, empty `alt`). Do not generate now — prompts below are for
the user to run later.

### Asset inventory

| # | Asset name | Used where | Purpose | Dimensions | Style | Transparent | Dark/light | Save to | Required? |
|---|---|---|---|---|---|---|---|---|---|
| A1 | Atmosphere mesh | `.gh-portal-shell` canvas (between gradient and plane), ≤0.35 opacity | organic depth so the canvas isn't a flat gradient | 2560×1440 WebP | dark forest-teal gradient mesh | no | dark only | `frontend/public/images/portal/premium/portal-atmosphere-mesh.webp` | **Required** |
| A2 | Sidebar aurora | sidebar chrome glass, top third, ≤0.25 opacity | soft light entering the chrome from above | 640×1600 WebP | vertical jade-teal aurora wisp | no | dark only | `frontend/public/images/portal/premium/sidebar-aurora.webp` | Optional |
| H1 | Hero bloom texture | `PageHeader` corner (only if CSS bloom feels flat in QA) | subtle organic accent behind hero corner | 1200×480 PNG | pale jade glass caustic | yes | light | `frontend/public/images/portal/premium/hero-bloom.png` | Optional |
| E1 | Patient records empty | `/account/medical-files`, prescriptions empty | calm reassurance, replaces current raster | 960×640 PNG | abstract folder/leaf glass forms | yes | light | `frontend/public/images/portal/premium/empty-patient-records.png` | **Required** |
| E2 | Clinical queue empty | Doctor appointments/patients empty states | "no patients waiting" calm | 960×640 PNG | abstract calendar/stethoscope-adjacent glass forms (no literal medical gear) | yes | light | `frontend/public/images/portal/premium/empty-clinical-queue.png` | **Required** |
| E3 | Documents empty | Doctor document panels, Admin legal docs | document surfaces at rest | 960×640 PNG | layered translucent sheets | yes | light | `frontend/public/images/portal/premium/empty-documents.png` | **Required** |
| E4 | Payments empty | Patient payments/orders, Admin invoices empty | neutral finance-at-rest | 960×640 PNG | abstract receipt/coin glass forms | yes | light | `frontend/public/images/portal/premium/empty-payments.png` | **Required** |
| E5 | Content/CMS empty | Admin blog/pages/newsletter empty (replaces `admin-content-management-accent.png`) | editorial-at-rest | 960×640 PNG | abstract page/grid glass forms | yes | light | `frontend/public/images/portal/premium/empty-content.png` | Optional |
| E6 | Membership accent | Patient membership/rewards zero-state | warm belonging | 960×640 PNG | soft concentric ring forms, mint-jade | yes | light | `frontend/public/images/portal/premium/empty-membership.png` | Optional |
| C1 | Calendar accent | calendar empty month / agenda no-events | time-at-rest | 960×640 PNG | abstract grid + orbit forms | yes | light | `frontend/public/images/portal/premium/empty-calendar.png` | Optional |
| L1 | Auth/loading vignette | portal root `loading.tsx` backdrop (very low opacity) | perceived quality during cold loads | 1600×900 WebP | ultra-subtle porcelain gradient with jade horizon line | no | light | `frontend/public/images/portal/premium/loading-vignette.webp` | Optional |

### Image-generation prompts (copy-paste ready)

Shared constraints baked into every prompt: **no text, no letters, no
numbers, no logos, no watermarks, no UI elements, no screens, no people, no
medical gore, no needles/blood**.

**A1 — `portal-atmosphere-mesh.webp` (required), 16:9, 2560×1440, opaque:**
> Abstract premium gradient mesh background, deep forest green to dark teal
> (#0C2B21 to #12432F), one soft luminous jade bloom (#2E9E77) in the upper
> right, very smooth large-scale color transitions, faint darker vignette in
> corners, high-end healthcare SaaS atmosphere, calm and luxurious, no
> texture grain, no text, no logos, no UI, no objects, no people. Ultra
> smooth, out-of-focus, suitable as a distant backdrop behind a light
> dashboard panel.

**A2 — `sidebar-aurora.webp` (optional), 2:5 vertical, 640×1600, opaque:**
> Tall vertical abstract dark background, near-black forest green base, one
> soft vertical aurora wisp of desaturated jade and teal light drifting from
> the top edge and fading by the middle, extremely subtle, misty,
> glass-like, premium and calm, no stars, no text, no logos, no UI, no
> recognizable shapes. Must stay dark enough for white text to remain
> readable on top.

**H1 — `hero-bloom.png` (optional), 5:2, 1200×480, transparent background:**
> Subtle abstract glass caustic light shape on a fully transparent
> background, pale jade green (#2E9E77 at low opacity) with a hint of mint,
> soft refracted-light curves concentrated toward the right edge and fading
> to nothing, extremely low contrast, decorative corner accent for a light
> dashboard header, no text, no logos, no UI, no hard edges.

**E1 — `empty-patient-records.png` (required), 3:2, 960×640, transparent:**
> Minimal abstract illustration of calm, organized personal health records:
> two or three overlapping translucent glass folder shapes in soft jade,
> mint, and porcelain white, one small leaf form resting on top, soft
> rounded geometry, gentle drop shadows, floating on a fully transparent
> background, premium healthcare app empty-state style, flat-3D glassmorphism,
> no text, no letters, no logos, no faces, no medical instruments.

**E2 — `empty-clinical-queue.png` (required), 3:2, 960×640, transparent:**
> Minimal abstract illustration suggesting a calm, empty schedule: a
> rounded translucent glass panel with a soft grid of blank rounded tiles,
> one tile gently highlighted in jade green, a small circular clock-like
> form without numbers or hands beside it, soft porcelain and deep green
> palette, floating on transparent background, premium clinical SaaS
> empty-state, glassmorphism, no text, no numbers, no logos, no people.

**E3 — `empty-documents.png` (required), 3:2, 960×640, transparent:**
> Minimal abstract illustration of documents at rest: three layered
> translucent glass sheets with rounded corners, slightly fanned, blank
> surfaces with faint horizontal tone bands (no readable content), top
> sheet edged with a thin jade highlight, porcelain white and forest green
> palette, soft shadows, transparent background, premium healthcare SaaS
> empty state, no text, no letters, no logos, no UI chrome.

**E4 — `empty-payments.png` (required), 3:2, 960×640, transparent:**
> Minimal abstract illustration of finances at rest: one rounded
> translucent glass rectangle suggesting a blank receipt with soft blank
> tone bands, one or two smooth glass circles beside it like abstract
> coins, jade and porcelain palette with a deep green accent, soft
> shadows, transparent background, premium fintech-grade empty state,
> glassmorphism, no currency symbols, no numbers, no text, no logos.

**E5 — `empty-content.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of editorial content at rest: a blank
> rounded glass card with a soft image-placeholder rectangle and two blank
> tone bands beneath it, a second smaller card peeking from behind, jade
> and porcelain palette, soft shadows, transparent background, premium CMS
> empty-state, glassmorphism, no text, no letters, no icons, no logos.

**E6 — `empty-membership.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of belonging and care: soft concentric
> translucent rings in warm mint and jade with a small glowing core, gentle
> gradient glass material, floating on transparent background, premium
> wellness-membership empty state, calm and warm, no text, no logos, no
> hearts, no medical symbols.

**C1 — `empty-calendar.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of time at rest: a rounded translucent
> glass grid of blank square tiles suggesting a calendar month without any
> numbers, one tile softly raised and highlighted in jade, a thin orbital
> curve passing behind the grid, porcelain and deep green palette,
> transparent background, premium scheduling app empty state, no text, no
> numbers, no logos.

**L1 — `loading-vignette.webp` (optional), 16:9, 1600×900, opaque:**
> Extremely subtle light background texture: warm porcelain off-white
> (#F6F8F4) with an almost imperceptible horizontal jade-green horizon
> gradient in the lower third and the faintest corner vignette, completely
> smooth, no grain, no shapes, no text, no logos, suitable as a barely
> visible backdrop behind loading skeleton cards.

---

## 14. Implementation roadmap

Phased for a future coding agent. Rules for every phase: never change server
actions/fetchers/auth/i18n wiring; run `npm run typecheck`, frontend lint,
and `npm run build` per phase; manually render all three portals after any
shared-file change; update the dependency map §3/§9 when a shared dependency
changes.

| Phase | Files to edit | What changes | Risk | Visual impact | Validation |
|---|---|---|---|---|---|
| **1. Token + CSS foundation** | `frontend/app/globals.css` only | Land §4.2 token block on `.gh-portal-shell`; add `[data-portal]`/`[data-density]` hooks; add canvas gradient + plane; add glass recipe utility classes; map old values (sidebar rgba, `#D9F99D`, statuses) to tokens **without changing rendered values yet** | High (blast radius) but low visual delta | Near zero (mapping pass) | typecheck/build; eyeball all 3 portals unchanged |
| **2. Shared shell redesign** | `admin-shell.tsx` + `portal-shell.tsx` (lockstep) + `globals.css` shell rules + `NotificationPopover.tsx` | §6 in full: glass sidebar/topbar, jade nav states, CSS-class hover (delete inline handlers), portal glyph, `data-portal`/`data-density` attributes, popover/user-menu restyle | **High** | Very high — the new identity lands | All 3 portals, mobile nav, country picker, bell; keyboard nav; blur fallback |
| **3. Shared atoms redesign** | `atoms.tsx` + `globals.css` atom rules; keep `portal-atoms.ts` untouched re-export | §3.4–3.8, §3.11–3.12: move card/btn/pill visuals into token-driven CSS; delete `!important` fights + dead StatCard decor + PNG card tint; unify Pill/badge tone map | **High** | High — every card/button/pill on all 3 portals | Sweep representative pages per portal; check `(site)` for `.gh-btn` leakage |
| **4. Global tables / forms / dialogs / skeletons** | `atoms.tsx` table prims; `globals.css` table/form rules; new `components/portal-skeletons.tsx` (+ re-export from old path); new `PortalDialog`/`PortalTabs`/`FormSection` primitives | §3.9–3.10, §3.13–3.14, §3.21; reduce `.gh-admin-main` descendant selectors to safety net | High | High on list/form pages | Dense vs comfortable density check; forms focus/error states; modal focus trap |
| **5. Shared calendar + chat** | `components/calendar/MonthCalendar,DayAgenda,EventDetailDialog,TimezoneSelect` (not `-utils/-types`); `components/chat/*` | §3.15–3.16 | Medium | Medium | All 3 `/calendar` routes; Admin/Doctor/Patient chat consumers incl. disabled states |
| **6. Admin role pages** | `app/(admin)/admin/**` route pages + `_components` (country-picker, scope-banner, orders table, plan tabs, etc.) | §8 per-area work; migrate tabs to `PortalTabs`, forms to `FormSection`, mobile bodies toward `PortalMobileCard`; delete `admin-dashboard-clinical-wash` usage | Medium (route-scoped) | High in Admin | Admin route sweep at 320/768/1280/1920 |
| **7. Doctor role pages** | `app/(doctor)/doctor/**` | §9: Now rail, consultation calm mode, document/notes/prescription surfaces, availability chips | Medium | High in Doctor | Appointment detail full workflow click-through |
| **8. Patient role pages** | `app/(auth)/account/**` | §10: dashboard banner, card-first bookings, consumer payment cards, profile tabs, membership | Medium | High in Patient | Mobile-first sweep 320/390/430 first |
| **9. Asset integration** | `globals.css` (canvas/hero), empty-state `assetSrc` call sites | Wire §13 assets after the user generates them; retire the 5 legacy PNGs + `generated/*` washes; delete unused files only after zero references confirmed (`rg "images/portal"`) | Low | Medium polish | Visual check with and without assets (fallback = pure CSS must still look finished) |
| **10. Responsive + a11y/contrast pass** | Touched files only | 320–1920 sweep; focus-visible audit; AA contrast audit on all tone pairs; blur/`prefers-reduced-*` fallbacks; touch targets ≥44px on Patient | Low | Corrective | Playwright screenshot pass at 320/768/1024/1440 per portal (auth setup per `verification-results.md`); axe/lighthouse a11y |
| **11. Cleanup + validation** | `globals.css`, audit docs | Delete the now-dead 1514-block rules superseded by tokens; remove retired PNGs; update dependency map §3/§5/§6/§9 + this doc's status; final full gates | Medium (deletion) | None if done right | `rg` for dead classes/assets before delete; typecheck/lint/build; 3-portal render |

Sequencing note: Phases 1–4 are strictly ordered. 5 can run parallel to 4.
6–8 are independent of each other once 1–4 land. 9 waits on user-generated
assets. 10–11 are last.

---

## 15. High-risk changes and safety notes

What breaks if handled carelessly, and how future agents must handle it.

1. **`app/(admin)/admin/_components/atoms.tsx`** — the design system for
   ALL THREE portals despite its path. Restyling is safe; changing
   props/markup requires sweeping every consumer (dependency map §9 lists
   them). Never add admin-only behavior here — fork a variant instead.
2. **Triple-layer style conflicts** — atom inline styles vs 1514-block vs v3
   `!important` block. The safe order is: land tokens → move visuals to one
   CSS layer → *then* delete the older layers. Deleting `!important` rules
   before the atoms stop declaring inline values re-exposes dead styles
   (999px buttons, 12px cards, lime decor spans).
3. **`frontend/components/portal-atoms.ts`** — pure re-export. Any agent
   that adds styles or forks it splits Doctor/Patient from Admin instantly.
   Keep it byte-boring.
4. **`frontend/app/globals.css`** — 6232 lines shared with the PUBLIC SITE.
   Portal work must stay inside the portal-scoped blocks
   (`.gh-portal-shell` scope and `.gh-*` portal classes from ~1514). `:root`
   token edits and `.gh-btn-*`/`.gh-eyebrow`/`.gh-badge-*` rules leak to the
   public site — check `(site)` pages after touching them.
5. **`admin-shell.tsx` / `portal-shell.tsx` lockstep** — hand-mirrored.
   Any shell change ships to both in the same commit or the portals fork.
   They also share CSS classes, so a class rename in one file breaks the
   other silently.
6. **Shared calendar (`components/calendar/**`)** — one surface, three
   routes. `calendar-utils.ts` / `calendar-types.ts` are logic; restyling
   them is a correctness risk, not a style choice. Verify Admin, Doctor,
   and Patient calendars after any edit.
7. **Shared chat (`components/chat/**`)** — each component spans ≥2 portals
   with different disabled/closed semantics. Restyle the bubble core once;
   click through every consumer (admin appointment chat, doctor
   consultation, patient bookings).
8. **Shared forms — `forms/phone-field.tsx` escapes the portals** into
   public checkout/consult/brazil-consent. A portal-flavored restyle can
   corrupt the public booking funnel. Test `(site)` checkout after editing.
9. **Status badges — two palettes, one meaning.** `PILL_TONES` (atoms) and
   `.gh-badge-*` (CSS) must be retokenized in the SAME phase (3), or the
   portals show two different "active" greens indefinitely.
10. **Hardcoded colors inventory** (delete only via token mapping):
    sidebar `rgba(18,54,39,0.96)` + v3 gradient; active nav `#D9F99D`
    (both shells, inline); StatCard `#B0F122`/`#143B30`; Btn danger hex
    trio; Pill hex map; body `#0f2e25 !important` (globals.css:196 —
    public-site shared, do not change in portal phases).
11. **`gh-admin-*` shared classes** — NOT admin-scoped. Renaming to
    `gh-portal-*` is desirable but is a **mechanical, separate refactor**
    (dependency map §5) — do not bundle it with the visual redesign; the
    combined diff would be unreviewable. This redesign keeps existing class
    names.
12. **`!important` portal card rules** (`globals.css:1614–1648, 1699–1724,
    1825–1891`) — load-bearing today. Removal order per note 2.
13. **Texture/image references** — five base PNGs + `generated/*` washes are
    referenced from CSS (`globals.css:1527,1555,1584,1627,1735,1835`), the
    Admin dashboard hero, and `/account/medical-files`. Retire references
    first, delete files last (phase 11), confirm with
    `rg "images/portal" frontend/`.
14. **Table descendant selectors** (`.gh-admin-main table/th/td`) — style
    raw tables on pages that never imported the atoms. Reducing them to a
    safety net requires checking pages that use raw `<table>` (Doctor
    reports, some Admin detail panes) still render styled.
15. **Button descendant selectors**
    (`.gh-admin-main :where(button…)`) — normalize third-party and raw
    buttons. Audit before weakening: search for raw `<button` usage inside
    portal routes.
16. **Behavior preservation** — `Toggle` is a form-submitting button
    (`type="submit"` + `formAction`); `confirm-delete-button`,
    `SyncOrderPaymentOnReturn`, chat send paths, and country-picker
    `setCountryPreferenceAction` are behavioral. Restyle wrappers only;
    never alter element types, form wiring, or handlers.

---

# Future AI implementation prompt

> Copy everything below into the implementation session when the redesign is
> approved and (optionally) assets have been generated.

You are implementing the **Meridian Glass** premium redesign for the Admin,
Doctor, and Patient portals of the Global Health platform, on branch
`Dev-hassaan`.

**Design direction (binding):** Deep forest-teal atmospheric canvas
(`#0C2B21→#12432F`) with a porcelain (`#F6F8F4`) work plane; two glass
recipes (dark chrome 0.66/blur24 for sidebar+mobile nav, light surface
0.72/blur18 for topbar+hero+popovers); content on near-opaque L3/L4 cards
(radius 14, 1px border `rgba(18,54,39,0.10)`, inset top highlight, tokenized
rest/hover/modal shadows); brand forest `#1D4B36` for primary actions; jade
`#2E9E77` for ALL interactive states (hover/active/focus/selection); lime
`#B0F122` ONLY for live/unread/now signals; one tokenized status tone map
(success `#1E8E62`, warning `#C27803`, danger `#C03D3D`, info `#2C7A9E`,
live=lime); buttons 10px rounded-rect (kill the 999px inline + 8px
`!important` fight); pills reserved for status; per-portal accents via
`data-portal` (admin jade `#2E9E77`, doctor teal `#2F8FA3`, patient
mint-jade `#4CAE7E`); density via `data-density` (admin dense,
doctor/patient comfortable). Full spec: this file
(`docs/portal-redesign/premium-portal-redesign-strategy.md`), sections 3–5,
11, 12.

**Inspect before editing (in order):**
1. `docs/portal-redesign/portal-shared-ui-dependency-map.md` (mandatory)
2. `docs/portal-redesign/premium-portal-redesign-strategy.md` (this spec)
3. `frontend/app/globals.css` (`:root` 31–162; portal blocks 1514–~3050;
   note the existing `--portal-*` vars at ~1749 — extend them, do not
   duplicate)
4. `frontend/app/(admin)/admin/_components/atoms.tsx`
5. `frontend/components/portal-shell.tsx` and
   `frontend/app/(admin)/admin/_components/admin-shell.tsx` (mirrors)
6. `frontend/components/NotificationPopover.tsx`,
   `frontend/components/calendar/**`, `frontend/components/chat/**`,
   `frontend/components/forms/phone-field.tsx`

**Edit order (phases from §14 — do not reorder 1→4):**
1. `globals.css`: land the §4.2 token block on `.gh-portal-shell` +
   `[data-portal]`/`[data-density]` overrides; map existing hardcoded values
   (sidebar rgba, `#D9F99D`, status hex) onto tokens with zero visual delta.
2. Both shells in lockstep + `NotificationPopover`: glass chrome, jade nav
   states as CSS classes (delete inline hover mutators), portal glyph,
   data attributes.
3. `atoms.tsx` + atom CSS: move card/button/pill/stat visuals into
   token-driven CSS; delete `!important` overrides and dead inline styles
   ONLY after the replacing rules exist; unify `PILL_TONES` with
   `.gh-badge-*` into one tone map.
4. Tables/forms/dialogs/tabs/skeletons: density-aware table kit; form field
   recipe; new `PortalDialog`, `PortalTabs`, `FormSection`; promote
   `admin/_components/skeletons.tsx` → `components/portal-skeletons.tsx`
   with a re-export shim at the old path.
5. Shared calendar + chat per §3.15–3.16.
6–8. Role pages per §8 (Admin), §9 (Doctor), §10 (Patient) — route-scoped
   `_components` only; never edit shared files for a role-specific need.

**Tokens:** every color/radius/shadow/blur you write must be a
`var(--portal-*)` reference. If a needed token is missing, add it to the
§4.2 block — never inline a hex in a component.

**Assets:** the user generates them from §13 prompts into
`frontend/public/images/portal/premium/`. Wire A1 into the shell canvas and
E1–E4 into the matching `AdminEmptyState assetSrc` call sites. Every asset
must degrade gracefully: the CSS-only rendering (no image) must still look
finished. Retire legacy PNGs (`portal-ambient-texture`,
`portal-sidebar-texture`, `portal-header-wash`, `portal-card-tint`,
`portal-clinical-wash`, `generated/*` washes) by removing references first;
delete files only after `rg "images/portal" frontend/` shows zero remaining
references to each.

**Preserve behavior:** no changes to server actions, fetchers, auth gating,
i18n wiring, form `action`/`formAction` wiring, `Toggle`'s submit-button
semantics, `SyncOrderPaymentOnReturn`, or route structure.
`portal-atoms.ts` stays a pure re-export. `phone-field.tsx` is shared with
the public site — verify `(site)` checkout after touching it. Keep all
existing class names (`gh-admin-*` rename is out of scope).

**Validation per phase (all must pass before the next phase):**
```bash
cd frontend
npm run lint        # or: pnpm --filter frontend lint  (0 errors; existing warnings OK)
npx tsc --noEmit
npm run build
```
Then render `/admin`, `/doctor`, `/account` (plus one list page and one
detail page each) at 320/768/1280/1920. Auth constraints and the
screenshot-runner situation are documented in
`docs/portal-redesign/verification-results.md`.

**Commits:** one commit per phase, message format
`feat(portals): <phase summary>` (e.g.
`feat(portals): land Meridian Glass token foundation`). Never bundle phase 1
token mapping with visual changes. After any shared-file change, update
`docs/portal-redesign/portal-shared-ui-dependency-map.md` §3/§9 in the same
commit.

---

*End of strategy. Written 2026-07-02 on branch `Dev-hassaan`. Companion
docs: `portal-shared-ui-dependency-map.md` (master dependency reference),
`admin-portal-audit.md`, `doctor-portal-audit.md`,
`patient-portal-audit.md`, `shared-components-audit.md`,
`verification-results.md`.*
