# DESIGN.md — Obsidian Ivory Portal Design System (binding spec)

> **Audience:** the AI coding agent implementing the portal redesign.
> **Authority:** where this file and the strategy doc
> (`premium-portal-redesign-strategy.md`) differ, **this file wins**.
> **Scope:** Admin (`frontend/app/(admin)/admin/**`), Doctor
> (`frontend/app/(doctor)/doctor/**`), Patient
> (`frontend/app/(auth)/account/**`). One system, three accents.
> **Prerequisite reading:**
> `docs/portal-redesign/portal-shared-ui-dependency-map.md`.
>
> **Non-negotiables (memorize before coding):**
> 1. Every color/radius/shadow/blur is `var(--portal-*)`. No inline hex in
>    components, ever. Missing token → add it to the `.gh-portal-shell`
>    block in `globals.css`.
> 2. Only the chrome blurs. Content surfaces are opaque.
> 3. Vital jade `#2CE5A0` is never body text on white. Text-safe variant
>    is `--portal-signal-text` (`#0B7A55`).
> 4. Both shells (`admin-shell.tsx`, `portal-shell.tsx`) change in the
>    same commit, always.
> 5. Never delete an `!important` rule or inline style until its
>    token-driven replacement is live and verified.
> 6. `frontend/components/portal-atoms.ts` stays a pure re-export.
> 7. Behavior is frozen: no changes to server actions, fetchers, auth,
>    i18n, `action`/`formAction` wiring, `Toggle` submit semantics,
>    `SyncOrderPaymentOnReturn`, chat send paths, or routes.
> 8. `gh-admin-*` classes are GLOBAL (all three portals). Do not rename.
> 9. `globals.css` `:root` (lines ~31–162) and `.gh-btn-*` / `.gh-badge-*`
>    / `.gh-eyebrow` are shared with the public site. Portal changes stay
>    inside `.gh-portal-shell` scope and the portal `.gh-*` blocks.

---

## 1. The concept in one paragraph

Two worlds. The **chrome world** is obsidian: near-black glass sidebar,
topbar, and dashboard Command Band floating over an ink canvas with a
single jade aurora. The **content world** is ivory: gallery-white pages,
white cards, ink text, hairline borders. They meet at a 1px luminous jade
seam. Green is not a surface color — it is a *signal* (alive, active,
focused, live). Primary actions are ink-black. Gold exists only on Patient
membership. Large luminous tabular numerals are the only decoration.

---

## 2. Token reference (the complete set)

Land these on `.gh-portal-shell` in `frontend/app/globals.css`, **remapping
the existing block at ~line 1750** (keep existing var names where they
exist: `--portal-bg`, `--portal-surface`, `--portal-line`,
`--portal-line-strong`, `--portal-muted`, `--portal-radius*`,
`--portal-shadow*`, `--portal-sidebar-w`, `--portal-main-max`,
`--portal-readable-max`, `--portal-pad-*`, `--portal-section-gap`).

```css
.gh-portal-shell {
  /* ── worlds ─────────────────────────────────────────────── */
  --portal-canvas: #060A08;
  --portal-bg: #FBFBF8;                 /* ivory work plane */
  --portal-surface: #FFFFFF;            /* L3 content card */
  --portal-surface-elevated: #FFFFFF;   /* L4 modal/menu */
  --portal-well: #F4F5F1;               /* form wells, mono blocks, icon tiles */
  --portal-chrome: rgba(8, 12, 10, 0.78);
  --portal-chrome-solid: #0B100E;       /* backdrop-filter fallback */
  --portal-chrome-border: rgba(255, 255, 255, 0.08);
  --portal-chrome-text: rgba(237, 242, 238, 0.86);
  --portal-chrome-text-active: #EDF2EE;

  /* ── text (light surfaces) ──────────────────────────────── */
  --portal-text: #0A0F0D;
  --portal-text-2: #3D4A44;
  --portal-muted: #69766F;

  /* ── action + signal ────────────────────────────────────── */
  --portal-primary: #0E1512;            /* ink button fill */
  --portal-primary-hover: #1A2420;
  --portal-emerald: #0B5C41;            /* quiet links/selection on light */
  --portal-signal: #2CE5A0;             /* vital jade — glow/live/active/focus */
  --portal-signal-text: #0B7A55;        /* jade read as text on ivory */
  --portal-signal-soft: rgba(44, 229, 160, 0.12);
  --portal-signal-glow: rgba(44, 229, 160, 0.30);

  /* ── role accent (defaults; overridden per portal) ──────── */
  --portal-accent: var(--portal-signal);
  --portal-accent-text: var(--portal-signal-text);

  /* ── status ─────────────────────────────────────────────── */
  --portal-success: #128A5E;  --portal-success-text: #0F6B49;
  --portal-warning: #B97D10;  --portal-warning-text: #8A5D0C;
  --portal-danger:  #C4453D;  --portal-danger-text:  #93332D;
  --portal-info:    #3173B4;  --portal-info-text:    #245A8C;

  /* ── lines + interaction ────────────────────────────────── */
  --portal-line: rgba(10, 15, 13, 0.08);
  --portal-line-strong: rgba(10, 15, 13, 0.16);
  --portal-line-soft: rgba(10, 15, 13, 0.05);
  --portal-hover: rgba(44, 229, 160, 0.06);
  --portal-focus: rgba(44, 229, 160, 0.45);

  /* ── depth ──────────────────────────────────────────────── */
  --portal-blur-chrome: 28px;
  --portal-blur-overlay: 8px;
  --portal-shadow: 0 1px 2px rgba(6,10,8,0.05), 0 12px 32px rgba(6,10,8,0.07);
  --portal-shadow-hover: 0 2px 4px rgba(6,10,8,0.06), 0 18px 44px rgba(6,10,8,0.11);
  --portal-shadow-modal: 0 24px 80px rgba(4,8,6,0.45);

  /* ── geometry ───────────────────────────────────────────── */
  --portal-radius-sm: 8px;
  --portal-radius: 10px;       /* buttons, inputs */
  --portal-radius-lg: 14px;    /* cards */
  --portal-radius-xl: 18px;    /* band, modals, popovers */
  --portal-radius-pill: 999px; /* status pills only */
}

[data-portal="admin"]   { --portal-accent: #2CE5A0; --portal-accent-text: #0B7A55; }
[data-portal="doctor"]  { --portal-accent: #4DD6E8; --portal-accent-text: #0E7490; }
[data-portal="patient"] { --portal-accent: #7BEBC1; --portal-accent-text: #0B7A55;
                          --portal-gold: #E8C476;  --portal-gold-text: #8A6420; }
```

- `data-portal` and `data-density` (`dense` | `comfortable`) go on the
  shell root `div` in each layout's shell instance. Admin = dense;
  Doctor/Patient = comfortable.
- `--portal-gold` is consumed ONLY by
  `app/(auth)/account/{membership,rewards,subscribe}/**` surfaces.

### Hardcoded values these tokens replace (exact locations)

| Today | Where | Becomes |
|---|---|---|
| `#D9F99D` active nav (inline) | `portal-shell.tsx:424,458`; `admin-shell.tsx:630,677` | `--portal-signal` system (§4.1) |
| `rgba(18,54,39,0.96)` sidebar + v3 gradient | `globals.css` `.gh-portal-sidebar` region | `--portal-chrome` |
| `#f7f8f3` shell bg + `#f8faf5` gradient | `globals.css:1750,1768` | `--portal-canvas` + `--portal-bg` plane |
| texture PNGs | `globals.css:1527,1555,1735,1772` | deleted (canvas + chrome do the work) |
| `PILL_TONES` hex map | `atoms.tsx` (~line 393) | status tokens (§4.6) |
| StatCard `#B0F122`/`#143B30` tiles + decor | `atoms.tsx` (~line 264/288) | §4.5 (decor deleted) |
| Btn inline `borderRadius: 999` + danger hexes | `atoms.tsx` (~line 716–755) | `--portal-radius` + danger tokens |
| body `#0f2e25 !important` | `globals.css:196` | **DO NOT TOUCH** (public site) |

---

## 3. Typography

One family (existing `--font-manrope` stack; optionally self-host Manrope
Variable 400–800 via `next/font/local` in the implementation — fallback
Aptos/Segoe stays). Mono = existing `--font-geist-mono` stack, promoted to
a real role.

| Role | Spec | Where |
|---|---|---|
| Command Band numeral | 44–56px / 800 / −0.02em / `tabular-nums` | Command Band only |
| Page title (h1) | `clamp(24px, 2vw, 34px)` / 800 / −0.02em / lh 1.08 | PageHeader |
| Band title | 26–30px / 800 / ivory | Command Band |
| Section title | 16px / 800 / −0.01em / ink | SectionHeader |
| Eyebrow | 12px / 800 / +0.06em / caps / `--portal-accent-text` + signal dot | PageHeader, SectionHeader |
| Body | 14px / 500 / lh 1.6 / `--portal-text-2` | everywhere |
| Label | 12.5px / 700 / `--portal-text` | forms |
| Helper/meta | 12px / 500 / `--portal-muted` | forms, cards |
| Table header | 11px / 800 / +0.10em / caps / `--portal-muted` | tables |
| Table cell | 13.5px / 500 | tables |
| Stat numeral (cards) | 34–36px / 800 / `tabular-nums` | StatCard |
| Inline metric | 15px / 800 / `tabular-nums` | rows, chips |
| Button | 13px (sm) / 14px (md, lg) / 700 | buttons |
| Mono data | 12.5px mono / `--portal-muted` | IDs, order numbers, IBAN last-4, timestamps, audit log |

Spacing scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56`. Card padding
20–24. Section gap = existing `--portal-section-gap`. Form row gap 16.
Table cell 11×14 (dense) / 14×16 (comfortable).

---

## 4. Component recipes (binding)

### 4.0 Shell canvas + plane

- `.gh-portal-shell`: `background: var(--portal-canvas)` + fixed
  pseudo-element with
  `radial-gradient(1200px 800px at 82% -10%, var(--portal-signal-glow), transparent 62%)`
  (use a dimmer stop — glow token @ ~0.14 effective).
- Ivory plane = the `<main>` wrapper region: `background: var(--portal-bg)`,
  radius 18px top corners, inset from canvas: 16–28px frame ≥1280px, 8px
  ≥1024px, 0 below. **Frame must be visible at 1280px.**
- Optional asset `canvas-aurora.webp` between canvas and plane, ≤0.4
  opacity, `aria-hidden`.

### 4.1 Sidebar (both shells, identical)

- Fill `--portal-chrome` + `backdrop-filter: blur(var(--portal-blur-chrome)) saturate(150%)`;
  width `--portal-sidebar-w` (272px, use the token in BOTH shells).
- Right edge: 1px `--portal-chrome-border` PLUS 1px seam light:
  `linear-gradient(180deg, transparent, rgba(44,229,160,0.45) 35%, rgba(44,229,160,0.10) 70%, transparent)`.
- Inset top highlight `inset 0 1px 0 rgba(255,255,255,0.05)`.
- Nav item (CSS classes — DELETE the `onMouseEnter/Leave` inline style
  mutation in both shells):
  - rest: text `--portal-chrome-text`, transparent bg, radius 10px;
  - hover: text `--portal-chrome-text-active`, bg `rgba(255,255,255,0.05)`;
  - active (`aria-current`): bg `rgba(44,229,160,0.14)`, text
    `--portal-signal`, 3px left bar `--portal-signal` with
    `box-shadow: 0 0 8px var(--portal-signal-glow)`; bar animates height
    0→18px on activation (200ms).
- Badge counters: live/unread = 5px `--portal-signal` dot + 2px halo;
  otherwise neutral chip (`rgba(255,255,255,0.10)` fill, chrome text).
- Logo block unchanged; portal eyebrow label `--portal-accent` @0.9.
- Sidebar texture PNG rules deleted.

### 4.2 Topbar (both shells)

- Fill `--portal-chrome`, blur 28, height 64px, sticky; bottom 1px
  `--portal-chrome-border`; on scroll >8px add class that swaps the border
  for the horizontal seam-light gradient (the ONLY scroll-linked effect).
- Left: portal glyph — 20px rounded square (6px radius), bg
  `color-mix(in srgb, var(--portal-accent) 16%, transparent)`, glyph
  `--portal-accent` — then breadcrumb: 13px `--portal-chrome-text`, chevron
  12px @0.5, last crumb 700 `--portal-chrome-text-active`; existing CUID
  truncation logic preserved; mobile collapses to `‹ Parent`.
- Right: bell + user chip inside ONE pill: 1px `--portal-chrome-border`,
  radius 999px, items divided by a 1px border-soft rule. Unread bell badge
  = signal dot + halo.
- Admin country picker: trigger = chrome pill (flag + name + chevron,
  chrome text); menu = L4 white surface (§4.9), search on top, active row
  `--portal-signal-soft` + `--portal-accent-text` text.

### 4.3 Command Band (`CommandBand`, new atom in `atoms.tsx`)

- Container: `--portal-chrome` + blur 28, radius `--portal-radius-xl`,
  1px chrome border, inset top highlight, padding 24–28px; sits first on
  dashboard pages only (`/admin`, `/doctor`, `/account`).
- Grid: left context block; right metric row (3–5 items,
  `auto-fit minmax(120px, max-content)`, gap 32px; 2-up grid <760px).
- Left: context line 13px `--portal-chrome-text`; title 26–30px/800
  `--portal-chrome-text-active`; optional scope chip (Admin country).
- Metric: label 10.5px caps `--portal-chrome-text` @0.6; numeral
  44–56px/800 tabular `--portal-chrome-text-active`; the ONE most
  important metric renders its numeral in `--portal-signal` with
  `radial-gradient` glow behind (≤0.25 opacity).
- Live element (max one): 6px jade dot + halo pulsing ×2 on mount then
  resting; used for "consultation live" / "next appointment in Xm".
- Skeleton variant ships with it (obsidian bg, shimmering blocks).
- Props stay presentational: `{ context, title, chip?, metrics:
  {label, value, signal?, live?}[], action? }`. Role pages fetch data.

### 4.4 PageHeader (non-dashboard hero)

- Transparent on the plane (NO glass, NO raster, NO wash).
- Eyebrow 12px/800 caps `--portal-accent-text` + 5px signal dot; 2px
  hairline under it:
  `linear-gradient(90deg, var(--portal-accent), transparent)`, width 64px.
- Title per §3; description ≤68ch `--portal-muted`.
- Admin `gh-admin-area-hero` per-area accents survive ONLY as
  eyebrow/hairline color overrides; delete wash backgrounds and the v3
  `!important` h1 overrides in the same pass that moves title styles to
  one owner.

### 4.5 Cards (`AdminCard`, `StatCard`)

- `AdminCard`: fill `--portal-surface`, radius `--portal-radius-lg`, 1px
  `--portal-line`, `--portal-shadow`, inset top highlight
  `inset 0 1px 0 rgba(255,255,255,0.9)`, padding prop stays (default 24).
  All visuals in CSS; the atom keeps layout props only.
- Interactive card (opt-in class): hover = border `--portal-line-strong`,
  `--portal-shadow-hover`, translateY(-2px), title underline sweep 0→24px
  in `--portal-accent` (200ms). Static cards never move.
- `StatCard`: min-height 128px; numeral 34–36px/800 tabular ink; label
  10.5px caps muted; icon tile 40px radius 10px — bg `--portal-well`, glyph
  `--portal-accent-text` (neutral variant: glyph ink). Delete the inline
  `#B0F122`/`#143B30` tiles and the dead radial decor spans + their
  `display:none !important` CSS. Hover: 1.5px accent underline scales
  24→48px.
- Kill `.gh-admin-card` PNG tint overlay + all card `!important` rules
  after replacements are live.

### 4.6 Status pills (`Pill` + `.gh-badge-*` — SAME phase)

One tone map, tokens only:

| Tone | Fill | Text | Dot |
|---|---|---|---|
| success | `rgba(18,138,94,0.12)` | `--portal-success-text` | `--portal-success` |
| warning | `rgba(185,125,16,0.12)` | `--portal-warning-text` | `--portal-warning` |
| danger | `rgba(196,69,61,0.10)` | `--portal-danger-text` | `--portal-danger` |
| info | `rgba(49,115,180,0.10)` | `--portal-info-text` | `--portal-info` |
| neutral | `--portal-well` | `--portal-text-2` | `--portal-muted` |
| brand | `rgba(11,92,65,0.10)` | `--portal-emerald` | `--portal-emerald` |
| live | `--portal-signal-soft` | `--portal-text-2` | `--portal-signal` + halo `0 0 0 2px var(--portal-signal-glow)` |

Anatomy: radius 999px, 11px/700 caps, 0.05em tracking, optional 5px dot.
`live` = ONLY glowing pill; means "happening now" (active consultation,
online, unread). Map existing semantics: pending→warning, active→success,
inactive/cancelled→danger or neutral per current meaning — do not invent
new meanings.

### 4.7 Buttons (`Btn`, `IconBtn`)

- Radius `--portal-radius` (10px). Delete inline `borderRadius: 999` and
  the 8px `!important` override together.
- Variants (visuals move to CSS classes; atom keeps variant prop):
  - `primary`: fill `--portal-primary`, text `#FBFBF8`; hover
    `--portal-primary-hover` + `box-shadow: 0 4px 16px var(--portal-signal-glow)`;
    press translateY(1px).
  - `secondary`: white fill, 1px `--portal-line-strong`, ink text; hover
    `--portal-well` fill.
  - `soft`: `--portal-signal-soft` fill, `--portal-signal-text` text.
  - `ghost`: transparent, ink text; hover `--portal-well`.
  - `danger`: `rgba(196,69,61,0.10)` fill, `--portal-danger-text` text,
    1px danger @0.4 border.
  - `on-chrome` (new): transparent, 1px `--portal-chrome-border`,
    `--portal-chrome-text`; hover white @0.06 fill. For buttons inside
    band/sidebar/topbar.
- All: focus-visible 3px `--portal-focus` ring; loading = 16px spinner
  replaces `iconLeft`, label persists; post-save success = one border
  pulse in success tone.
- `IconBtn`: 32px, radius 9px, ink glyph @0.7→1; hover `--portal-hover`
  fill + accent ring 1px.
- Audit `.gh-admin-main :where(button…)` descendant overrides in the same
  pass; reduce to a safety net that matches these values.

### 4.8 Tables (atom prims + safety net)

- Container: L3 card, no padding, overflow hidden.
- Header: 11px/800 caps `--portal-muted`, transparent, 1px
  `--portal-line-strong` bottom rule; first col padding-left 20px.
- Rows: `[data-density="dense"]` 44px / `comfortable` 52px; 1px
  `--portal-line-soft` separators.
- Hover: `--portal-hover` full row + 2px `--portal-accent` inset left bar
  sliding in (120ms); row `IconBtn`s fade 0.55→1.
- Numeric cols right-aligned `tabular-nums`; ID cols mono 12.5px.
- `.gh-admin-main table/th/td` descendant rules: reduce to identical
  values (safety net for raw `<table>` pages — Doctor reports, some Admin
  panes — verify they still render styled).
- <760px: swap to `PortalMobileCard` (§4.13).

### 4.9 Menus / popovers / `NotificationPopover`

- Surface: L4 white, radius `--portal-radius-xl`, `--portal-shadow-modal`
  @60% strength, 1px `--portal-line`.
- Enter: scale 0.96→1 + fade 200ms from trigger origin.
- Notification rows: unread = 5px signal dot + halo + `--portal-signal-soft`
  @0.5 row tint; read = plain; mark-as-read fades tint out 280ms; footer =
  full-width `soft` button "view all".
- User menu: same surface; role line = neutral pill; sign-out = `danger`.

### 4.10 Forms (+ `FormSection`, new)

- Input/select/textarea: min-height 44px, fill `--portal-well` → white on
  focus, radius 10px, 1px `--portal-line`; focus border
  `--portal-accent-text` + 3px `--portal-focus` ring; error = danger
  border + danger ring + 12px danger text REPLACING the helper; disabled =
  well fill, 0.6 opacity text.
- Label 12.5px/700 ink above; helper 12px muted below.
- `FormSection` (new primitive): L3 card + `SectionHeader` + grid
  (2-col ≥900px, 1-col below, gap 16).
- Rich text (`rich-text-html-field.tsx`): same border/focus shell around
  the editor chrome; toolbar buttons = `IconBtn` recipe.
- Dropzone: dashed 1.5px `--portal-line-strong`, radius 14; dragover =
  dashed `--portal-accent` + `--portal-signal-soft` wash.
- Replace the blanket `.gh-admin-main :where(input…)` normalization with
  these rules (keep selector as safety net with matching values).

### 4.11 Tabs (`PortalTabs`, new)

- 13px/700 labels; muted rest → ink active; 2px `--portal-accent`
  underline sliding via transform (200ms); container bottom 1px
  `--portal-line`; overflow-x scroll + fade masks (keep
  `.gh-portal-tabs` thin-scrollbar behavior).
- Consolidates: `plan-edit-tabs`, `plan-translation-tabs`,
  `*-translation-tabs`, `appointment-tabs`, profile `*-tab` headers,
  `faq-language-tabs`. Migrate per role phase; do not big-bang.

### 4.12 Dialogs (`PortalDialog`, new)

- Overlay: `rgba(6,10,8,0.55)` + `blur(var(--portal-blur-overlay))`,
  fade 200ms.
- Panel: L4 white, radius 18px, `--portal-shadow-modal`; scale 0.98→1 +
  fade 200ms; mobile = bottom sheet sliding 280ms with grabber.
- Anatomy: header (title + `IconBtn` close), body, footer (actions right,
  primary last). Widths 560 / 760 / full-sheet.
- Danger dialogs: 5px danger dot before title; destructive confirm keeps
  existing type-to-confirm behavior.
- Absorbs: `confirm-delete-button`, `consultation-documents-modal`,
  `delete-account-button`, `EventDetailDialog`. Focus trap + Esc + return
  focus required.

### 4.13 Mobile cards (`PortalMobileCard`, new)

- White card, radius 14, 1px `--portal-line`, 16px padding; 3px status
  left edge; title row (15px/700 ink + status pill), meta grid
  (label/value 12px), trailing action row.
- Replaces per-page `.gh-admin-mobile-card` bodies progressively;
  breakpoint stays 760px.

### 4.14 Empty states (`AdminEmptyState` restyle)

- ≤220px illustration slot (assets) OR 44px icon tile on `--portal-well`;
  title 16px/800 ink; body 13.5px muted ≤52ch; optional `primary` action;
  48px vertical padding, centered. Must render on every list surface.

### 4.15 Skeletons (`components/portal-skeletons.tsx`, promoted)

- Promote from `admin/_components/skeletons.tsx`; leave a re-export shim
  at the old path so Admin `loading.tsx` imports keep working.
- Shimmer: base `#EFF0EB`, sweep `rgba(255,255,255,0.75)`, 1.6s
  ease-in-out infinite; `prefers-reduced-motion` → static two-tone pulse.
- Shapes: command band (obsidian), page header, summary strip, stat grid,
  table (header + n rows), card, form section, calendar month, chat
  thread. Skeleton geometry mirrors the real component so load → content
  never jumps.

### 4.16 Chat (shared bubble core)

- Thread: L3 card; message area bg `--portal-well`.
- Own bubble: `--portal-primary` fill, ivory text; other: white fill, ink
  text, 1px `--portal-line`; both radius 14 with one 4px tail corner;
  max-width 72%.
- System/internal note: dashed 1px neutral chip, centered, 12px muted.
- Composer: white bar pinned bottom, 1px top `--portal-line`; send =
  `primary` sm; disabled state shows plain-language reason (consultation
  closed).
- New messages rise 6px + fade 200ms. No typing-simulation effects.
- Consumers: `ChatThread` (Admin+Patient), `ConsultationChat`
  (Doctor+Patient), `InternalMessagesThread` (Admin+Doctor) — restyle the
  core once, click through all five mount points.

### 4.17 Calendar

- `MonthCalendar`: L3 card; hairline `--portal-line-soft` cell
  separators (no boxed grid); today = 2px `--portal-accent` ring;
  selected = `--portal-primary` fill ivory text; event dots = status tone
  map; weekend headers muted.
- `DayAgenda`: left rail 1px `--portal-line` + jade "now" tick + halo —
  tick breathes opacity 0.7↔1 over 3s (the ONE ambient animation); events
  = compact L3 cards, tabular times, status pill.
- `EventDetailDialog` → `PortalDialog`; `TimezoneSelect` → field recipe.
- `calendar-utils.ts` / `calendar-types.ts`: DO NOT TOUCH.
- Verify `/admin/calendar`, `/doctor/calendar`, `/account/calendar` after
  any edit.

### 4.18 Document tables (`DocumentTable` direction)

- Row: 32px file-kind icon tile (`--portal-well` bg, kind glyph in
  `--portal-accent-text`), name 13.5px/700 ink + meta 12px muted stack,
  status pill, trailing `IconBtn`s.
- Consumer (Patient) variant: 52px min row height, ≥44px touch targets,
  "shared by Dr. X" meta line.
- Owners: Doctor `doctor-document-tables.tsx`, Patient
  `/account/medical-files`, Admin legal-documents pages.

### 4.19 Appointment cards (`AppointmentCard` direction)

- Grid: time block (15px/800 tabular + tz meta 11px muted) · person +
  service (13.5px/700 + 12px muted) · status pill + action.
- 3px status-tone left edge; `live` = jade edge + halo while consultation
  in progress.
- Mobile variant = `PortalMobileCard` with the same content order.

### 4.20 Payments / invoices

- Amounts `tabular-nums`, currency 0.7em; card last-4 in mono
  (`•• 4242`); paid = success pill; refund = warning/danger pill PLUS one
  plain sentence on Patient surfaces.
- Patient membership plan card: obsidian header band (chrome recipe,
  radius 14 top) with 1px `--portal-gold` bottom hairline, plan name
  ivory, status pill; body white with benefit rows (icon + plain
  sentence); jade slim progress bar (6px, radius 999, `--portal-well`
  track, `--portal-signal` fill) — the only progress bar in the system.

---

## 5. Motion (global constants)

- Durations: 120ms micro / 200ms standard / 280ms panels.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` entrances, `ease-out` exits.
- `transform` / `opacity` only. Nothing bounces. Max one ambient
  animation per viewport (agenda now-tick OR band live dot).
- Page content: single `.gh-portal-enter` utility — fade + rise 8px,
  200ms, CSS only.
- `prefers-reduced-motion`: all transitions ≤50ms opacity-only; shimmer
  static; pulses off.

---

## 6. Accessibility gates (block merge if failed)

1. All text/fill pairs in §2/§4.6 ≥4.5:1 (large numerals ≥3:1). Verify
   chrome text over the aurora asset at its brightest point.
2. Focus-visible ring on EVERY interactive element, both worlds; test the
   3px jade ring on chrome (it must remain visible on the dark glass).
3. `@supports not (backdrop-filter: blur(1px))` → `--portal-chrome-solid`
   fills; `prefers-reduced-transparency` → same.
4. Touch targets ≥44px on all Patient surfaces.
5. Dialog focus trap, Esc close, focus return.
6. Body text NEVER sits on chrome. Chrome text is limited to
   headings/labels/metrics ≥12px/700 and nav items.
7. Vital jade never used as text on white/ivory (use
   `--portal-signal-text`).

---

## 7. File ownership map (who owns which pixel)

| Surface | Owner file(s) |
|---|---|
| Tokens, canvas, plane, chrome recipes, nav classes, table/form safety nets | `frontend/app/globals.css` (portal blocks only) |
| PageHeader, SectionHeader, AdminCard, StatCard, AdminSummaryStrip, AdminEmptyState, Pill, Btn, IconBtn, Toggle, table prims, **CommandBand** | `frontend/app/(admin)/admin/_components/atoms.tsx` |
| Doctor/Patient import path | `frontend/components/portal-atoms.ts` (re-export ONLY) |
| Admin chrome + country picker | `frontend/app/(admin)/admin/_components/admin-shell.tsx` |
| Doctor/Patient chrome | `frontend/components/portal-shell.tsx` |
| Bell popover | `frontend/components/NotificationPopover.tsx` |
| Calendar | `frontend/components/calendar/**` (not `-utils`/`-types`) |
| Chat core | `frontend/components/chat/**` |
| Phone input (portals + PUBLIC site) | `frontend/components/forms/phone-field.tsx` |
| Skeleton kit | new `frontend/components/portal-skeletons.tsx` (+ shim at `admin/_components/skeletons.tsx`) |
| New primitives (`PortalDialog`, `PortalTabs`, `FormSection`, `PortalMobileCard`) | add to `atoms.tsx` or `frontend/components/` per dependency-map conventions; export through `portal-atoms.ts` untouched pattern |
| Role compositions | each portal's route `_components` — NEVER edit shared files for a role-only need |

---

## 8. Phase order (summary — full table in the strategy doc)

1. **Tokens** (`globals.css` only) → 2. **Shells + chrome** (both shells
lockstep + NotificationPopover) → 3. **Atoms** (cards/buttons/pills/stats +
CommandBand + unified tone map) → 4. **Tables/forms/dialogs/tabs/skeletons**
→ 5. **Calendar + chat** → 6. **Admin pages** → 7. **Doctor pages** →
8. **Patient pages** → 9. **Assets** → 10. **Responsive + a11y** →
11. **Cleanup** (delete superseded rules + retired PNGs).

Per phase: `npm run lint` + `npx tsc --noEmit` + `npm run build` in
`frontend/`, render all three portals, check public `(site)` after any
shared-CSS or phone-field change. One commit per phase:
`feat(portals): <summary>`.

---

## 9. Definition of done (per phase and overall)

- Zero inline hex/radius/shadow in touched components (grep
  `#[0-9A-Fa-f]{3,8}` in touched TSX; allowed only inside `globals.css`
  token block).
- Zero new `!important` (existing ones only removed per the replacement
  rule).
- Both shells byte-equivalent in shared class usage.
- All three portals render at 320/768/1280/1920 without horizontal
  overflow.
- Public site homepage + checkout visually unchanged.
- Status pill for the same semantic renders identically from `Pill` and
  `.gh-badge-*`.
- CSS-only (assets absent) build looks finished.
- Dependency map §3/§9 updated in the same commit as any shared change.

*Written 2026-07-02, branch `Dev-hassaan`. Companion:
`premium-portal-redesign-strategy.md` (rationale + per-route plans).*
