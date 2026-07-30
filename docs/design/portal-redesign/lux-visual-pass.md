# LUX-VISUAL-PASS.md — "Obsidian Ivory · Liquid Lux" (visual upgrade layer, v3 picture-perfect)

> **What this is:** a **visual-only upgrade pass** applied ON TOP of the
> already-implemented Obsidian Ivory system. Structure, layout, UX, table
> composition, component markup, routes, and behavior stay exactly as they
> are. Only the *skin* changes: materials, depth, light, borders, shadows,
> gradients, glass, backgrounds, contrast, iconography, and typographic
> hierarchy.
>
> **Why it exists:** the first implementation is structurally correct but
> reads flat — single soft shadows, plain white rectangles, no light
> behavior. This file replaces that surface language with a liquid-glass
> material system while keeping every token name, class name, and
> component API already in place.
>
> **Authority / layer order:** this file ▸ `DESIGN.md` ▸
> `premium-portal-redesign-strategy.md` ▸ dependency map. This file
> **supersedes** `DESIGN.md` §3 (tokens — extended here), the *visual*
> values of `DESIGN.md` §5 recipes, and commandment #2 ("only chrome
> blurs" — amended by §2.3). Everything else in `DESIGN.md` (green
> language, behavior freeze, shells lockstep, ownership map, a11y gates,
> non-contradicted anti-patterns) remains binding. Where this file is
> silent, `DESIGN.md` applies. Where both are silent, use §13 decision
> defaults — do not invent.
>
> **Priority order:** Patient portal (`frontend/app/(auth)/account/**`)
> and Doctor portal (`frontend/app/(doctor)/doctor/**`) first. The lux
> pass lands in shared primitives so Admin inherits automatically.
>
> **Palette law unchanged:** every color derives from the five brand
> anchors — forest `#1D4B36`, mint `#8FB021`, lime `#B0F122`, white,
> gray `#6D6D6D` — plus neutrals. No foreign hues.
>
> **Confirmed stack facts (do not substitute):** icons = `lucide-react`
> (already a dependency, already imported across portal pages); toasts =
> `sonner` (Toaster mounted in Admin layout); fonts = existing
> `--font-manrope` + `--font-geist-mono` stacks; dark scrollbar class
> `.gh-dark-scroll` already exists for sidebars.

---

## §1. Diagnosis — why the current build reads "flat AI dashboard"

1. **One-layer shadows.** A single `0 12px 32px` blur reads like a CSS
   default. Expensive UI stacks 4–5 shadow layers (contact, ambient, key,
   drop) so cards appear to *sit in light*.
2. **Dead white cards.** Flat `#FFFFFF` + uniform 1px border = every card
   identical, no material, no light response. Premium cards are *made of
   something* — tinted glass with a bright specular top edge and a border
   that changes tone around the perimeter.
3. **No environment.** A flat ivory plane gives glass nothing to refract
   and depth nothing to exist against. Luxury interfaces sit in an
   *atmosphere* — soft blooms, a veil of light.
4. **Uniform borders.** Same hairline on all four sides = template tell.
   Machined objects catch light on top and fall into shadow at the bottom.
5. **Timid numerals.** 34px flat stat numbers read as spreadsheet output.
   Hero numbers must *glow with meaning*.
6. **Even emphasis.** Every card same size, same fill, same weight — no
   screen has a jewel. Each screen needs exactly one visibly precious
   element.
7. **Hover = translate only.** Movement without light change feels
   mechanical. Premium hover = lift + brighten + glow, together.
8. **Default icon rendering.** Icons at full opacity, default 2px stroke,
   inconsistent sizes — reads unstyled. Icons need an opacity/weight
   system like text does.

---

## §2. The material system — "Liquid Lux"

Four materials. Every visible container on every screen is one of these
four. Nothing is plain flat white anymore.

### 2.1 Material A — **Obsidian Liquid** (dark chrome, upgraded)

For: sidebar, topbar, Command Band, membership header band, dark telemetry
strips (`subscription-health-panel` dark variant), mobile nav sheet.

```css
background:
  linear-gradient(165deg, rgba(14,28,20,0.86) 0%, rgba(7,16,11,0.88) 60%, rgba(10,22,15,0.86) 100%);
backdrop-filter: blur(32px) saturate(160%);
/* gradient hairline via border-image or ::before ring:
   linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05) 30%,
   rgba(176,241,34,0.28) 65%, rgba(255,255,255,0.04)) */
box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.09),   /* specular top */
  inset 0 -1px 0 rgba(0,0,0,0.35),        /* grounded bottom */
  0 1px 2px rgba(4,10,7,0.4),
  0 16px 48px rgba(4,10,7,0.45);
```

Plus a **reflection streak** (`::after`, `pointer-events:none`):
`linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.015) 52%, transparent 60%)`.
The surface looks like it reflects the room — the "liquid" cue.

### 2.2 Material B — **Ivory Liquid Glass** (content cards — THE upgrade)

For: `AdminCard`, `StatCard`, table containers, `FormSection`,
`PortalMobileCard`, chat thread container, calendar cards, popovers,
scope banner, summary strip items.

```css
background:
  linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.66) 100%);
backdrop-filter: blur(24px) saturate(140%);
border-radius: var(--portal-radius-lg);
/* gradient hairline border (double background trick): */
border: 1px solid transparent;
background-image:
  linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.66)),
  linear-gradient(160deg,
    rgba(255,255,255,0.95) 0%,        /* lit top edge */
    rgba(16,23,19,0.06) 38%,          /* neutral sides */
    rgba(16,23,19,0.10) 62%,
    rgba(143,176,33,0.22) 100%);      /* mint kiss, bottom corner */
background-origin: border-box;
background-clip: padding-box, border-box;
box-shadow: var(--lux-elev-1);        /* §4 — 5-layer stack */
```

**Readability guarantee (binding):** Material B sits ONLY over the
controlled ambient plane (§3), whose blooms are capped at ≤8% tint.
Effective backdrop behind text stays ≥ `#F2F4EE` luminance → ink text
≥14:1. Never place Material B over imagery, the dark canvas, or another
glass pane.

**Interactive hover:** `transform: translateY(-2px)`, shadow →
`--lux-elev-2` (includes lime underglow), border gradient →
`--lux-card-border-hover`.

### 2.3 Amended blur rule

`DESIGN.md` commandment #2 becomes: **blur exists on Materials A and B
only.** Wells, rows, inputs, pills, buttons stay opaque. Budget: ≤6
blurred panes per viewport; in card lists, cards after the 4th get
`.is-static` (identical gradients/shadows, no `backdrop-filter` — visually
indistinguishable in a stack, much cheaper).
`@supports not (backdrop-filter: blur(1px))` → solid fills (`#FFFFFF` for
B, `--portal-chrome-solid` for A); gradients + shadows carry the depth so
the fallback still looks finished. `prefers-reduced-transparency` → same.

### 2.4 Material C — **Etched Well** (inset)

For: inputs at rest, icon tiles, mono blocks, chat message area, slot
chips, checklist tiles rest state, skeleton bases, avatar fallbacks.

```css
background: linear-gradient(180deg, #EFF2EA 0%, #F4F6F0 100%);
box-shadow:
  inset 0 1px 2px rgba(16,23,19,0.06),   /* pressed-in top */
  inset 0 -1px 0 rgba(255,255,255,0.9);  /* lit bottom lip */
border: 1px solid rgba(16,23,19,0.05);
```

Wells read as *carved into* the glass — the counterpoint that makes cards
read as raised.

### 2.5 Material D — **Halo Elevated** (modals, menus, toasts, drag layers)

Material B recipe at `rgba(255,255,255,0.92)` fill + shadow
`--lux-elev-modal` (includes a 48px lime halo @6%). Overlay behind modals:
`rgba(7,18,12,0.6)` + `blur(12px)`.

---

## §3. The environment — ambient background system

### 3.1 Canvas (L0) — deepened

```css
background:
  radial-gradient(1400px 900px at 85% -12%, rgba(176,241,34,0.16), transparent 60%),
  radial-gradient(900px 700px at -10% 110%, rgba(143,176,33,0.10), transparent 55%),
  linear-gradient(170deg, #0A160F 0%, #07120C 45%, #081409 100%);
```

Optional `canvas-aurora.webp` on top at ≤0.5.

### 3.2 Ivory plane (L2) — the "veil", no longer flat

```css
background:
  radial-gradient(1200px 800px at 78% -8%, rgba(176,241,34,0.07), transparent 55%),
  radial-gradient(1000px 700px at 8% 30%, rgba(143,176,33,0.05), transparent 60%),
  radial-gradient(800px 600px at 92% 88%, rgba(29,75,54,0.04), transparent 60%),
  linear-gradient(180deg, #FCFDF9 0%, #F8FAF4 55%, #F5F8F0 100%);
```

Bloom cap: **≤8% alpha**. Optional `plane-veil.webp` above at ≤0.35.

Role tuning via `[data-portal]`:
- **Patient:** warmer — first bloom → `rgba(207,236,129,0.08)`.
- **Doctor:** calmer — all blooms at 60% of listed alpha.

### 3.3 Plane edge

18px top radius + 1px `rgba(255,255,255,0.65)` inner top edge +
`0 -12px 32px rgba(7,18,12,0.18)` above — the plane visibly *floats* over
the canvas.

---

## §4. Token additions (v2 — append to `.gh-portal-shell` block)

Existing tokens keep their names. Add:

```css
.gh-portal-shell {
  /* materials */
  --lux-card-fill: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.66));
  --lux-card-border: linear-gradient(160deg, rgba(255,255,255,0.95) 0%, rgba(16,23,19,0.06) 38%, rgba(16,23,19,0.10) 62%, rgba(143,176,33,0.22) 100%);
  --lux-card-border-hover: linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(16,23,19,0.08) 38%, rgba(16,23,19,0.12) 62%, rgba(176,241,34,0.35) 100%);
  --lux-chrome-fill: linear-gradient(165deg, rgba(14,28,20,0.86) 0%, rgba(7,16,11,0.88) 60%, rgba(10,22,15,0.86) 100%);
  --lux-chrome-border: linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05) 30%, rgba(176,241,34,0.28) 65%, rgba(255,255,255,0.04));
  --lux-well-fill: linear-gradient(180deg, #EFF2EA 0%, #F4F6F0 100%);
  --lux-forest-duotone: linear-gradient(180deg, #226044 0%, #1D4B36 55%, #16382A 100%);

  /* layered shadow stacks (cards use these, not --portal-shadow) */
  --lux-elev-1:
    inset 0 1px 0 rgba(255,255,255,0.95),
    inset 0 0 0 1px rgba(255,255,255,0.35),
    0 0 0 1px rgba(16,23,19,0.03),
    0 1px 1px rgba(7,18,12,0.05),
    0 2px 4px rgba(7,18,12,0.04),
    0 8px 16px rgba(7,18,12,0.05),
    0 24px 48px rgba(7,18,12,0.07);
  --lux-elev-2:
    inset 0 1px 0 rgba(255,255,255,1),
    inset 0 0 0 1px rgba(255,255,255,0.45),
    0 0 0 1px rgba(16,23,19,0.04),
    0 2px 4px rgba(7,18,12,0.05),
    0 12px 24px rgba(7,18,12,0.07),
    0 32px 64px rgba(7,18,12,0.10),
    0 8px 40px -8px var(--portal-signal-glow);
  --lux-elev-chrome:
    inset 0 1px 0 rgba(255,255,255,0.09),
    inset 0 -1px 0 rgba(0,0,0,0.35),
    0 1px 2px rgba(4,10,7,0.4),
    0 16px 48px rgba(4,10,7,0.45);
  --lux-elev-modal:
    inset 0 1px 0 rgba(255,255,255,0.98),
    0 0 0 1px rgba(16,23,19,0.04),
    0 32px 96px rgba(5,12,8,0.5),
    0 0 48px rgba(176,241,34,0.06);
  --lux-elev-press: 0 0 0 1px rgba(16,23,19,0.05), 0 1px 1px rgba(7,18,12,0.06);

  /* light */
  --lux-specular: rgba(255,255,255,0.95);
  --lux-streak: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.015) 52%, transparent 60%);
  --lux-blur-card: 24px;
  --lux-blur-chrome: 32px;

  /* numerals */
  --lux-numeral-ink: linear-gradient(180deg, #101713 0%, #1D4B36 130%);
  --lux-numeral-live: linear-gradient(180deg, #DFFF7A 0%, #B0F122 70%);

  /* icons (§6) */
  --lux-icon-muted: 0.55;
  --lux-icon-rest: 0.75;
  --lux-icon-active: 1;

  /* scrollbars + selection (§5.20) */
  --lux-scrollbar-thumb: rgba(16,23,19,0.18);
  --lux-scrollbar-thumb-hover: rgba(16,23,19,0.30);
  --lux-selection: rgba(176,241,34,0.35);
}
```

Rule stays: components reference tokens, never raw values. New visuals =
new tokens here first.

---

## §5. Component skin catalog (exhaustive — every visible element)

Visual deltas only. No markup restructuring; `::before/::after` hooks and
utility classes are allowed where a recipe requires them.

### 5.1 Cards (`AdminCard` / `.gh-admin-card`)

Material B in full. Plus:
- **Header zone:** when a card has a `SectionHeader`, that header row sits
  on `rgba(255,255,255,0.5)` with a 1px `--portal-line-soft` rule below —
  internal architecture.
- **Section rule:** the 3×16px mint rule becomes a gradient bar
  `linear-gradient(180deg, var(--portal-signal), var(--portal-mint))`,
  `border-radius: 2px`, 6px glow @20%.
- **Jewel card (max ONE per screen):** primary dashboard card may add
  `::before` corner bloom
  `radial-gradient(320px 200px at 100% 0%, color-mix(in srgb, var(--portal-accent) 9%, transparent), transparent 70%)`
  and optionally `card-silk.webp` masked to the top third @≤0.25.
- Static informational cards: Material B without hover physics.

### 5.2 StatCard — the centerpiece

- Container: Material B, min-height 136px, padding 20px.
- **Numeral:** 40–44px/800, `tabular-nums`, −0.03em, filled
  `--lux-numeral-ink` via `background-clip:text; color:transparent`.
- **Icon tile:** 40px, radius 10, Material C + inner accent ring
  `inset 0 0 0 1px color-mix(in srgb, var(--portal-accent) 35%, transparent)`;
  lucide glyph 20px, `--portal-accent-text`, strokeWidth 1.75.
- **Label:** 10px/800, +0.14em, caps, `--portal-muted`.
- **Delta chip (only when trend data already exists):** 11px/700 pill,
  success-soft/`▲` or danger-soft/`▼`, right of numeral, 4px gap.
- **Baseline thread:** 1px bottom-edge
  `linear-gradient(90deg, transparent, rgba(143,176,33,0.35), transparent)`.
- Hover (linked stats only): `--lux-elev-2`; numeral gradient's forest
  stop brightens toward mint.

### 5.3 Command Band

- Material A + streak + gradient hairline; padding 24–28px; radius 18.
- **Inner aurora** (`::before`):
  `radial-gradient(600px 300px at 85% 0%, rgba(176,241,34,0.10), transparent 65%)`,
  drifting 24px horizontally over 30s (paused by
  `prefers-reduced-motion`). The ONE slow ambient allowed per viewport.
- **Hero numeral:** 48–56px/800 −0.03em, `--lux-numeral-live` gradient
  text + `filter: drop-shadow(0 0 24px rgba(176,241,34,0.25))`. Non-hero
  metrics: ivory, plain.
- **Metric separators:** 1px vertical `rgba(255,255,255,0.07)`.
- Labels: 10px/800 +0.14em caps, chrome text @0.6.
- Live dot: 6px lime + halo, pulses ×2 on mount then rests.
- Bottom edge: seam-light gradient always on.
- Optional `band-aurora.webp` behind content @≤0.5.

### 5.4 Page headers — full lux treatment (was underspecified; now binding)

Two header modes exist. Neither is a plain transparent strip anymore.

**Mode 1 — Standard PageHeader (list/form/settings pages):**

- Still NOT a card (no border, no shadow) — it lives on the plane — but
  it gets an **atmosphere**:
  - **Header aura:** a `::before` layer behind the header zone,
    `radial-gradient(720px 320px at 12% 0%, color-mix(in srgb, var(--portal-accent) 7%, transparent), transparent 70%)`
    — a soft accent bloom rising behind the title from the top-left.
    Optionally boosted by asset **H1 `header-aura.webp`** (§9) at ≤0.3
    opacity, masked to the header zone, `aria-hidden`.
  - **Anatomy (top → bottom, 12px gaps):**
    1. Eyebrow row: 11px/800 +0.12em caps `--portal-accent-text` + 5px
       lime dot with 3px halo @25%; 2px×64px hairline below the eyebrow:
       `linear-gradient(90deg, var(--portal-accent), transparent)`.
    2. Title row: title `clamp(24px,2vw,34px)/800 −0.03em` pure ink
       `#0C120E`, left; actions cluster right (primary + secondary per
       §5.7, 8px gap), vertically centered to the title.
    3. Description: 13.5px `--portal-muted`, ≤68ch.
    4. Optional meta row: neutral chips (§5.8) — counts, scope, market
       flags — 8px gap.
  - **Bottom seam:** the header zone closes with a 1px fade rule
    `linear-gradient(90deg, var(--portal-line-strong), transparent 70%)`
    + 24px breathing room before the first card — the page visibly has a
    "masthead".
  - Admin per-area accents (`gh-admin-area-hero`): express through the
    aura + eyebrow + hairline color only. All raster washes stay dead.

**Mode 2 — Identity header (detail pages: order `[id]`, doctor `[id]`,
patient `[email]`, appointment `[id]`):**

- The identity block becomes a **Material B card** (radius 14, standard
  card recipe) placed under a slim Mode-1 header (eyebrow + breadcrumb
  context only):
  - Left: 40px avatar/initials tile (§5.20) or 40px kind icon tile
    (Material C + accent ring).
  - Center: name/title 18px/800 ink + meta line 12.5px muted (mono for
    IDs/GHN) + neutral chips row (flags, credentials, counts).
  - Right: status pill + key actions.
  - The card may carry the screen's jewel corner-bloom when the page has
    no band (§5.1 rule: max one jewel per screen).
- Mobile (<760px): identity card stacks (tile+name row, then meta, then
  actions full-width); Mode-1 actions collapse under the title.

**Dashboard greeting (band pages):** the Command Band IS the header —
no separate PageHeader above it. Greeting's final word in
`--portal-accent-text` when rendered outside the band (Patient mobile
fallback).

**SectionHeader (in cards):** 16px/800 ink + gradient rule per §5.1;
optional trailing count chip (§5.8); optional "view all" quiet link
(§5.20) right-aligned.

### 5.5 Summary strip (`AdminSummaryStrip`)

- Items become Material B mini-cards (padding 14×16, radius 12) in an
  `auto-fit minmax(180px,1fr)` row, 12px gap.
- Tone items: 3px left gradient bar (tone → transparent) + tone dot +
  value 15px/800 tabular ink + label 10px/800 caps muted.
- Inside a hero/band context: switch to `on-chrome` styling (transparent,
  chrome border, ivory values).

### 5.6 Tables

Container = Material B (blur on container only; rows opaque):
- **Header row:** `rgba(242,244,238,0.7)` fill, 10.5px/800 +0.12em caps
  muted, 1px `--portal-line-strong` rule below, **sticky** within the
  card's scroll area.
- **Rows:** 44px dense / 52px comfortable; separators
  `--portal-line-soft`.
- **Hover:** `rgba(143,176,33,0.07)` wash + 2px accent inset left bar
  with 4px glow (slides in 120ms); cell text muted→ink sharpen; row
  `IconBtn`s fade 0.55→1.
- **Selected:** persistent mint wash + 1px accent left border.
- Numeric cols right-aligned tabular; ID/order cols mono 12.5px muted
  (→ ink on hover).
- **No zebra. Ever.**
- Raw `<table>` pages (Doctor reports etc.) inherit via the
  `.gh-admin-main table` safety net — keep values identical.

### 5.7 Buttons — full state matrix (binding)

Base: radius 10px; heights sm 32 / md 40 / lg 44; font 13/14px 700; icon
gap 8px; lucide icons 16px (sm) / 18px (md/lg) strokeWidth 2;
transition 120ms; focus-visible on ALL variants =
`box-shadow: 0 0 0 3px var(--portal-focus)` (appended after variant
shadows); disabled on ALL = 0.5 opacity, no pointer, no hover physics;
loading on ALL = 16px spinner (lucide `Loader2`, spin 0.8s linear)
replaces left icon, label persists, pointer disabled.

| Variant | Rest | Hover | Active/press |
|---|---|---|---|
| `primary` | fill `--lux-forest-duotone`; text `#FAFBF7`; `inset 0 1px 0 rgba(255,255,255,0.18)`, `inset 0 -1px 0 rgba(0,0,0,0.25)`, `0 1px 2px rgba(7,18,12,0.2)` | top stop → `#2A6E4F`; + `0 4px 16px var(--portal-signal-glow)` | translateY(1px); shadow → `--lux-elev-press` |
| `secondary` | fill `rgba(255,255,255,0.85)` + blur-less Material B mini (gradient hairline); text ink | fill → white; border gradient brightens; `0 2px 8px rgba(7,18,12,0.06)` | translateY(1px); `--lux-elev-press` |
| `soft` | fill `--portal-mint-soft`; text `--portal-mint-text`; no border | fill @0.18; `inset 0 0 0 1px rgba(143,176,33,0.25)` | translateY(1px) |
| `ghost` | transparent; text ink | fill `--portal-well` | translateY(1px) |
| `danger` | fill `--portal-danger-soft`; text `--portal-danger-text`; 1px danger @0.4 | fill @0.16; border @0.55 | translateY(1px) |
| `on-chrome` | transparent; 1px `--portal-chrome-border`; text `--portal-chrome-text` | fill `rgba(255,255,255,0.06)`; `inset 0 0 0 1px rgba(176,241,34,0.2)`; text → active-white | translateY(1px) |

Post-save success (primary/secondary): one 600ms border pulse in
`--portal-success` @0.5. Icon-only squares at each size use the same
matrix. **Shape law: rounded-rect = action, pill = status. No pill
buttons.**

`IconBtn` (row actions): 32px, radius 9; glyph 16px lucide strokeWidth 2
at `--lux-icon-rest` → 1 on hover; hover fill `--portal-hover` +
`inset 0 0 0 1px color-mix(in srgb, var(--portal-accent) 30%, transparent)`;
press scale(0.96); focus ring standard; danger-intent IconBtn: glyph
danger-text on hover.

### 5.8 Pills, badges, chips, flag badge

- **Pill/badge tone map:** unchanged from DESIGN.md §5.7. Add: inner rim
  `inset 0 0 0 1px` tone @0.18; dot gains 3px halo tone @0.25. `live` =
  lime dot + stronger halo — still the ONLY glowing pill.
- **Anatomy:** 999px, 11px/700 caps +0.05em, padding 3×10, optional 5px
  dot gap 6.
- **Neutral meta chips** (counts, GHN, relationship, language chips):
  Material C fill, radius 8, 11px/700 ink, 24px height; leading lucide
  icon 14px muted where present. Chips are square-ish (radius 8) so they
  never read as status pills.
- **FlagBadge:** keep flag asset; wrap in a 22px Material C tile radius 6
  + 1px line; label 12px/700 ink.

### 5.9 Forms — every control

**Text input / textarea / select (shared shell):** min-height 44px
(md), radius 10, Material C rest; label 12.5px/700 ink above, 6px gap;
helper 12px muted below, 4px gap.

| State | Recipe |
|---|---|
| rest | Material C |
| hover | border → `--portal-line-strong` |
| focus | fill → `#FFFFFF`; border 1px `--portal-mint-text`; ring `0 0 0 3px var(--portal-focus)`; plus 40%-strength `--lux-elev-1` — the field *rises to meet you* |
| error | border `--portal-danger`; ring danger @0.35; helper replaced by 12px `--portal-danger-text` message |
| success (after validation) | 1px `--portal-success` border, no ring |
| disabled | Material C, 0.6 text, no hover |
| readonly | Material C, text ink, no focus rise |

- **Select:** `appearance:none` + lucide `ChevronDown` 16px muted,
  absolute right 12px; same states.
- **Search field:** lucide `Search` 16px muted left, 36px left padding;
  clear button = IconBtn `X` 14px appears when non-empty.
- **Checkbox:** 18px, radius 5, Material C rest; checked = forest duotone
  fill + white lucide `Check` 13px strokeWidth 3; indeterminate = white
  `Minus`; focus ring standard; disabled 0.5.
- **Radio:** 18px, radius 999; checked = 1px forest border + 8px forest
  dot; same states.
- **Toggle (`Toggle` atom — form-submitting button, DO NOT change element
  type):** track 36×20 radius 999; off = Material C track + 16px white
  knob (`0 1px 2px rgba(7,18,12,0.2)`); on = forest duotone track + knob
  slides 16px (200ms); focus ring standard; disabled 0.5. Knob gains a
  1px `rgba(255,255,255,0.4)` rim.
- **Date/time inputs:** shared shell; mono 12.5px value text.
- **Phone field (`phone-field.tsx` — PUBLIC-SITE SHARED, verify `(site)`
  checkout after edit):** shared shell; country code segment = Material C
  chip inside the field, 1px divider.
- **File upload / dropzone (`managed-image-field`, `multi-image-field`,
  document uploads):** dashed 1.5px `--portal-line-strong`, radius 14,
  Material C fill @50%; icon lucide `Upload` 20px muted; dragover =
  dashed `--portal-accent` + inner bloom
  `radial-gradient(closest-side, rgba(176,241,34,0.08), transparent)`;
  uploaded thumbs = 48px Material C tiles radius 8 with 1px line +
  remove IconBtn on hover.
- **Rich text (`rich-text-html-field`):** editor gets the shared shell;
  toolbar = Material C strip radius 10 with IconBtn recipe buttons;
  active format button = mint-soft fill + accent-text glyph.
- **`FormSection`:** Material B card; SectionHeader per §5.1; grid 2-col
  ≥900px gap 16.

### 5.10 Tabs (`PortalTabs` + legacy tab headers)

- Labels 13px/700; rest muted, hover ink, active ink.
- Active underline: 2px `--portal-accent` sliding (transform, 200ms) +
  4px glow @30% — a lit filament, not a flat line.
- Container bottom 1px `--portal-line`; overflow-x scroll + 24px fade
  masks both ends; count badges inside tabs = neutral meta chip 5.8.
- Applies visually to `plan-edit-tabs`, `*-translation-tabs`,
  `appointment-tabs`, profile `*-tab` headers, `faq-language-tabs` even
  before they migrate to the shared primitive.

### 5.11 Sidebar

Material A + streak. Plus:
- **Active item = glass pill:** `rgba(176,241,34,0.12)` fill +
  `inset 0 0 0 1px rgba(176,241,34,0.25)` + text `--portal-signal` + 3px
  bar with 8px glow + icon `drop-shadow(0 0 6px rgba(176,241,34,0.5))`.
- Rest item: chrome text; lucide icon 18px strokeWidth 1.75 at 0.6
  opacity → 1 + white text on hover; hover fill `rgba(255,255,255,0.05)`.
- Section labels: 9.5px/800 +0.18em caps `rgba(233,239,233,0.4)`.
- Badge counters: live/unread = lime dot + halo; else neutral chrome chip.
- Bottom fade: content fades over last 48px
  (`mask-image: linear-gradient(180deg, #000 calc(100% - 48px), transparent)`).
- Scroll: keep `.gh-dark-scroll`.
- Logo block unchanged; portal eyebrow label `--portal-accent` @0.9.

### 5.12 Topbar, breadcrumbs, country picker, user menu

- Topbar: Material A, 64px, sticky; bottom hairline → seam-light gradient
  on scroll >8px (only scroll effect).
- **Portal glyph:** 22px rounded square radius 6; `--lux-chrome-border`
  gradient ring; accent glyph 14px; faint inner glow accent @10%.
- **Breadcrumbs:** 13px chrome text; separators lucide `ChevronRight`
  12px @0.5; last crumb 700 active-white; CUID truncation preserved;
  mobile = `‹ Parent`.
- **Country picker (Admin):** trigger = chrome pill (FlagBadge mini +
  name + `ChevronDown` 14px); menu = Material D, search on top (search
  recipe), rows 40px with flag tile + name, active row mint-soft +
  accent-text, hover well.
- **User pill:** bell + avatar chip in ONE pill, 1px chrome border,
  internal 1px divider @soft. **Avatar:** 28px, radius 9; image gets 1px
  `rgba(255,255,255,0.2)` rim; fallback = forest duotone fill + 11px/700
  ivory initials.
- **User menu:** Material D; name 13px/700 ink + email 12px muted; role
  line = neutral chip; divider = 1px line-soft; sign-out row = danger
  text + `LogOut` 16px.

### 5.13 Notifications (popover + full-page lists)

- **Popover:** Material D, radius 18, from-bell origin scale 0.96→1 +
  fade 200ms + one-time top-edge specular sweep.
- Rows: 12px vertical padding; unread = 5px lime dot + halo +
  signal-soft @0.5 tint; read = plain; mark-as-read fades tint 280ms;
  icon tile 32px Material C with kind glyph 16px accent-text; title
  13px/700 ink, body 12.5px muted 2-line clamp, time 11px mono muted.
- Footer: full-width `soft` button.
- Full-page lists (Doctor `notification-list`, Patient
  `patient-notification-list`): same row recipe inside a Material B card.
- **Bell:** lucide `Bell` 18px chrome-text; unread badge = lime dot +
  halo top-right.

### 5.14 Modals, popovers, toasts

- **`PortalDialog` / legacy modals:** Material D; radius 18; overlay
  §2.5; enter scale 0.98→1 + fade 200ms; mobile bottom sheet 280ms +
  36×4px grabber `rgba(16,23,19,0.15)`; header 16px/800 ink + close
  IconBtn; footer actions right, primary last; danger = 5px danger dot
  before title; keep type-to-confirm flows.
- **Toasts (sonner, already mounted):** theme via sonner CSS vars /
  `toastOptions`: surface Material D (solid white + `--lux-elev-modal`
  at 70%), radius 14, 13px/600 ink text, leading tone dot + lucide glyph
  (success `CircleCheck` / danger `CircleAlert` / info `Info`, 16px, tone
  color), bottom-right, 4s. No colored surfaces — tone lives in dot +
  glyph only.

### 5.15 Chat

- Thread container Material B; message area Material C.
- Own bubble: `--lux-forest-duotone` + `inset 0 1px 0 rgba(255,255,255,0.12)`,
  ivory text; other: `rgba(255,255,255,0.9)` + hairline, ink; both radius
  14 with one 4px tail corner; max-width 72%; timestamp 11px mono muted
  below @0.7.
- System/internal note: dashed 1px neutral chip, centered, 12px muted.
- Composer: Material B strip pinned bottom, top hairline gradient; input
  = borderless well; send = `primary` sm with `SendHorizonal` 16px;
  disabled composer: well fill + 12.5px muted plain-language reason.
- New message enters rise 6px + fade 200ms.

### 5.16 Calendar + availability

- `MonthCalendar`: Material B card; day cells hairline-separated
  (line-soft); day numerals 13px tabular; **today** = 2px accent ring +
  4px glow @30%; **selected** = forest duotone fill, ivory text; event
  dots 5px from tone map (max 3 + "+n" 10px muted); weekend headers
  muted; other-month days @0.35.
- `DayAgenda`: left rail 1px line + lime "now" tick + halo breathing
  0.7↔1 / 3s (suppressed when a Command Band aurora is in the same
  viewport — one ambient max); event cards = compact Material B
  `.is-static`, tabular times, status pill.
- `TimezoneSelect`: select recipe. `EventDetailDialog`: dialog recipe.
- **Availability slot chips (`availability-ui`):** 36px height radius 8;
  rest = Material C; active = `rgba(143,176,33,0.16)` fill +
  `inset 0 0 0 1px rgba(143,176,33,0.4)` + `--portal-mint-text` label;
  blocked = danger-soft + danger-text; hover = line-strong border; focus
  ring standard.
- `calendar-utils.ts` / `calendar-types.ts`: DO NOT TOUCH. Verify all
  three `/calendar` routes after edits.

### 5.17 Domain cards (documents, appointments, payments, membership, checklists)

- **DocumentTable rows:** 32px file-kind tile (Material C, lucide glyph
  16px accent-text: `FileText` docs / `Pill` Rx / `FlaskConical` labs /
  `Receipt` invoices); name 13.5px/700 ink + meta 12px muted; status
  pill; trailing IconBtns. Patient variant: 52px rows, ≥44px targets,
  "shared by Dr. X" meta.
- **AppointmentCard:** time block 15px/800 tabular + tz 11px muted ·
  person/service 13.5px/700 + 12px muted · pill + action; 3px status
  left edge as gradient bar (tone → transparent) + 2px glow; `live` =
  lime edge + halo.
- **Payment/order cards:** amounts 20px/800 tabular with
  `--lux-numeral-ink` gradient; currency 0.7em; card last-4 mono
  (`•• 4242`); paid success pill; refunds = pill + one plain sentence
  (Patient).
- **Membership plan card (Patient):** header = Material A band radius
  14-top + 1px `--portal-member` bottom hairline + plan name ivory
  18px/800 + status pill + optional `membership-silk.png` corner @≤0.5;
  body Material B: benefit rows = lucide `Check` 16px success + 13.5px
  ink sentence; **progress bar** (the only one in the system): 6px
  radius 999, Material C track, `--portal-signal` fill + 20% highlight
  sweep on value change only; manage actions behind disclosure, danger-
  soft cluster.
- **Finalize checklist (Doctor):** tiles = Material C rows radius 10;
  done = success-soft fill + `CircleCheck` 16px success + label ink;
  pending = `Circle` 16px muted; 200ms tint transition.
- **Subscription health panel (Admin):** Material A strip; tone dots +
  luminous 24px tabular numerals; labels 10px caps chrome @0.6.

### 5.18 Mobile cards (`PortalMobileCard`)

Material B `.is-static`; 3px gradient status edge + 2px glow; title row
15px/700 ink + pill; meta grid label 10px/800 caps muted / value 13px
ink; trailing action row; press = scale(0.99) + shadow →
`--lux-elev-press` (150ms).

### 5.19 Empty states + skeletons

- Empty: illustration ≤220px with backing bloom
  `radial-gradient(280px 180px at 50% 40%, rgba(143,176,33,0.06), transparent)`
  OR 44px Material C icon tile with 24px lucide glyph accent-text; title
  16px/800 ink; body 13.5px muted ≤52ch; optional primary action; 48px
  padding.
- Skeletons: bases = Material C gradient; shimmer sweep gains faint mint
  center `rgba(143,176,33,0.15)`, 1.6s; reduced-motion → static pulse;
  Command Band skeleton = Material A + streak + shimmering numeral
  blocks. Shapes mirror real composition (no jumps).

### 5.20 Micro-layer: links, dividers, avatars, scrollbars, selection, tooltips, banners

- **Text links (prose/meta):** `--portal-primary` 600; hover = underline
  1.5px `--portal-mint` offset 3px; visited same; in-table links: ink +
  underline on hover only. Never lime.
- **Dividers:** 1px `--portal-line-soft`; labeled dividers: 10px/800 caps
  muted centered with line each side.
- **Avatars/initials tiles** (patient header cards, doctor lists): 32/40px
  radius 10; image + 1px line rim; fallback forest duotone + ivory
  initials (12/14px 700).
- **Scrollbars:** light surfaces — 8px, thumb `--lux-scrollbar-thumb`
  radius 999, hover `--lux-scrollbar-thumb-hover`, track transparent;
  dark surfaces keep `.gh-dark-scroll`.
- **Selection:** `::selection { background: var(--lux-selection); color: var(--portal-text); }`
  scoped inside `.gh-portal-shell`.
- **Tooltips (only where a tooltip already exists — do not add new
  ones):** Material A mini — solid `--portal-chrome-solid`, radius 8,
  padding 6×10, 12px/600 ivory text, `0 8px 24px rgba(4,10,7,0.5)`,
  fade+2px rise 150ms, delay 400ms, no arrow.
- **Scope banner (Admin):** Material B strip radius 12 + 3px accent left
  gradient bar + FlagBadge + 13px/700 ink scope text + 12.5px muted
  explainer.
- **Inline alert/consent cards (GDPR, recurring-charge consent,
  brazil-consent, payment-needed):** Material B + 3px tone left gradient
  bar + tone icon tile (32px Material C + tone glyph) + title 13.5px/700
  tone-text + body 13px `--portal-text-2`. No full tone-colored surfaces.

---

## §6. Icon system (lucide-react — confirmed dependency)

- **Library:** `lucide-react` only. No emoji, no mixed sets, no inline
  custom SVGs for standard concepts.
- **Sizes:** 14px (inside chips/pills/small meta) · 16px (buttons, rows,
  inputs) · 18px (nav, topbar, md/lg buttons) · 20px (icon tiles) · 24px
  (empty-state tiles). Never other sizes.
- **Stroke:** `strokeWidth={1.75}` for nav/tiles/decorative contexts,
  `2` for buttons and small functional glyphs. Never 1 or 2.5+.
- **Color = context text color** via `currentColor`; opacity ladder:
  muted contexts `--lux-icon-muted` (0.55) → rest 0.75 → active/hover 1.
  Accent color only when the icon IS the signal (live, verified,
  selected kind tile).
- **Glow:** only the active sidebar icon gets `drop-shadow` (§5.11) —
  no other glowing icons.
- **Canonical glyph map (use these, don't improvise):** dashboard
  `LayoutDashboard` · appointments `CalendarClock` · calendar
  `CalendarDays` · patients/users `Users` · doctor `Stethoscope` ·
  documents `FileText` · prescriptions `Pill` · lab results
  `FlaskConical` · payments/invoices `Receipt` · orders `ShoppingCart` ·
  chat `MessageSquare` · notifications `Bell` · settings/profile
  `Settings`/`UserRound` · membership `BadgeCheck` · rewards `Gift` ·
  security `ShieldCheck` · availability `Clock` · services
  `ClipboardList` · reports `BarChart3` · upload `Upload` · download
  `Download` · search `Search` · close `X` · confirm `Check` · success
  `CircleCheck` · danger `CircleAlert` · info `Info` · edit `Pencil` ·
  delete `Trash2` · view `Eye` · external `ExternalLink` · chevrons
  `ChevronRight/Down/Left` · send `SendHorizonal` · sign out `LogOut` ·
  loading `Loader2`. Existing correct icons stay; only replace obvious
  mismatches.

---

## §7. Typography hierarchy upgrade

Same families. Sharper contrast:

| Tier | Old | New |
|---|---|---|
| Band hero numeral | 44–56/800 flat ivory | 48–56/800 −0.03em `--lux-numeral-live` gradient text + drop-glow (hero only) |
| Stat numeral | 34–36/800 flat ink | 40–44/800 −0.03em `--lux-numeral-ink` gradient text |
| Inline money/metric | 15/800 tabular | 15–20/800 tabular; payment amounts get ink-gradient at 20px |
| Page title | clamp(24,2vw,34)/800 −0.02em | same size, −0.03em, pure ink `#0C120E`; dashboard greeting final word in accent-text |
| Micro-label (NEW) | — | 10px/800 +0.14em caps muted — stat/band labels, meta kickers, mobile-card meta labels |
| Eyebrow | 12/800 +0.06em | 11px/800 +0.12em |
| Section title | 16/800 | unchanged |
| Body / label / helper / table | unchanged | unchanged (readability floor) |
| Mono | 12.5 mono muted | unchanged; sharpens to ink on row hover |

Gradient-text rule: numerals only. One gradient-text cluster per screen
(band OR stat grid at full treatment); dashboards may have both since
their gradients differ (live vs ink).

---

## §8. Role polish priorities

### 8.1 Patient (`(auth)/account/**`) — first

- Warm plane veil; greeting word-accent.
- Dashboard: band = jewel; "next appointment" card gets corner-bloom
  jewel treatment when no live band metric.
- Membership per §5.17 (silk header, benefit checks, sweep-on-change
  progress).
- Payment amounts ink-gradient 20px; refund sentences per §5.17.
- All lists = `PortalMobileCard` lux skin; verify 390px FIRST.

### 8.2 Doctor (`(doctor)/doctor/**`) — second

- Calm plane veil (60% blooms).
- "Now" band: hero time in live gradient; live consultation → band border
  gradient shifts lime-heavy + streak brightens 20%.
- **Calm mode:** during live consultation the form zone drops ALL hover
  physics (no lifts, no glows). Glass stays; motion stops.
- Availability chips §5.16; checklist tiles §5.17; document/notes
  surfaces sober (lux lives in the container, rows stay quiet).

### 8.3 Admin — inherits

Shared primitives carry the skin; Admin-specific jewel tuning (orders
mini-band, telemetry strips) = later polish commit, not in this pass's
acceptance.

### 8.4 Picture-perfect screen targets (the final image, top to bottom)

The agent implements recipes; these six descriptions are the *paintings*
the recipes must add up to. After commit 6, each screen must match its
description exactly.

**T1 — Patient dashboard (`/account`, 1280px):**
Dark forest frame visible around a softly glowing ivory plane (warm
bloom top-right). First element: the Command Band — black liquid glass
with a diagonal reflection streak, "Good morning, Sarah" with *Sarah* in
deep olive, and on the right the next appointment date in a huge
lime-gradient numeral with a soft glow, separated from two smaller ivory
metrics by faint vertical hairlines. Below: three health-home chips as
frosted glass mini-cards, each with a specular top edge and an accented
icon tile. Then the subscription card cluster: glass cards with lit top
borders and a mint kiss at the bottom corners; plan status pill glows
faintly lime if active. Every hover lifts, brightens, and casts a lime
underglow. Nothing is flat white; nothing is green-surfaced.

**T2 — Patient membership (`/account/membership`):**
Slim masthead header with accent aura. The plan card: obsidian glass
header band with a pale lime-silk hairline under it and silk light in
the corner, plan name in ivory; white glass body with a column of
mint-checked benefit sentences; a single thin lime progress bar on an
etched track. Manage actions hide behind a quiet disclosure; danger
actions are soft, never loud.

**T3 — Patient bookings (`/account/bookings`, 390px mobile):**
Single column of glass mobile cards, each with a status-tone gradient
edge on the left and a pill on the right; time in bold tabular figures;
payment-needed card carries a warning-tone icon tile and ONE forest
button. Press feedback: card gently compresses. Sticky bottom action bar
on payment screens.

**T4 — Doctor dashboard (`/doctor`, 1440px):**
Calmer plane (fainter blooms). The "Now" band: black glass, next
appointment time at 48px in lime gradient, patient name + service in
ivory, one join button (`on-chrome` variant). If a consultation is live:
the band's hairline shifts lime-heavy and a single live dot pulses twice
then rests. Below: today's schedule as comfortable appointment cards —
time blocks tabular, status edges glowing subtly — then two quiet stat
cards with engraved ink-gradient numerals.

**T5 — Doctor appointment detail (`[id]`, live consultation):**
Slim header + identity card (patient tile, GHN in mono, status pill).
Two zones: left, the consultation form on glass with etched input wells
that rise white on focus — and, because the consult is live, NO hover
physics anywhere in this zone; right, the patient context rail —
document rows with kind-icon tiles, chat with forest-duotone own
bubbles. Exactly one primary button on the whole page: finalize.

**T6 — Any Admin list (e.g. `/admin/appointments`, inherits):**
Masthead header with area-accent aura; summary strip of glass
mini-cards; a glass table container with a sticky etched header row;
rows that wash mint with a glowing accent bar on hover; money and IDs in
tabular/mono sharpening to ink on hover; a designed empty state with a
backing bloom when the queue is empty.

---

## §9. Asset pack — COMPLETE inventory with all generation prompts

This section is self-contained — do not hunt prompts in other docs. All
files under `frontend/public/images/portal/obsidian/`, all decorative
(`aria-hidden`, empty `alt`). **The UI must look finished with zero
images** — assets are polish, wired in the final commit.

Constraints baked into EVERY prompt: no text, no letters, no numbers, no
logos, no watermarks, no UI elements, no screens, no people, no medical
gore, no needles/blood.

**13 assets. Required: A1, V1, H1, E1, E2. Optional: the rest.**

| # | File | Used where | Req? | Opacity cap | Size | Transparent |
|---|---|---|---|---|---|---|
| A1 | `canvas-aurora.webp` | L0 canvas, above gradient | **Req** | 0.5 | 2560×1440 | no (dark) |
| V1 | `plane-veil.webp` | ivory plane, above blooms | **Req** | 0.35 | 2560×1440 | no (light) |
| H1 | `header-aura.webp` | behind PageHeader zone (§5.4), masked | **Req** | 0.3 | 2000×640 | no (light) |
| V2 | `card-silk.webp` | jewel cards only, masked top third | Opt | 0.25 | 1200×600 | no (light) |
| V3 | `band-aurora.webp` | Command Band inner backdrop | Opt | 0.5 | 1600×500 | no (dark) |
| M1 | `membership-silk.png` | Patient plan-card band corner | Opt | 0.5 | 1200×480 | yes |
| E1 | `empty-records.png` | `/account/medical-files`, prescriptions empty | **Req** | 1.0 | 960×640 | yes |
| E2 | `empty-queue.png` | Doctor appointments/patients empty | **Req** | 1.0 | 960×640 | yes |
| E3 | `empty-documents.png` | Doctor doc panels, Admin legal docs empty | Opt | 1.0 | 960×640 | yes |
| E4 | `empty-payments.png` | Patient payments/orders, Admin invoices empty | Opt | 1.0 | 960×640 | yes |
| E5 | `empty-content.png` | Admin blog/pages/newsletter empty | Opt | 1.0 | 960×640 | yes |
| E6 | `empty-notifications.png` | notification lists empty | Opt | 1.0 | 960×640 | yes |
| C1 | `empty-calendar.png` | empty month / no-events agenda | Opt | 1.0 | 960×640 | yes |

### Prompts (copy-paste ready)

**A1 — `canvas-aurora.webp` (required), 16:9, 2560×1440, opaque:**
> Ultra-dark abstract background, near-black with a deep forest-green
> undertone (#07120C), one soft luminous aurora bloom of electric
> lime-green light (#B0F122) drifting in from the upper right corner and
> dissolving before the center, a second much fainter olive-green
> (#8FB021) glow at the lower left, extremely smooth out-of-focus
> gradients, faint darker vignette in the lower corners, cinematic,
> premium technology-company atmosphere, no grain, no stars, no shapes,
> no text, no logos, no UI. Must stay dark enough for white text to be
> readable anywhere on it.

**V1 — `plane-veil.webp` (required), 16:9, 2560×1440, opaque:**
> Extremely subtle light abstract background: warm ivory white base
> (#FAFBF7) with two or three very soft out-of-focus blooms of pale
> lime-green (#CFEC81) and gentle olive-green (#8FB021) light at very low
> opacity, one near the top right, one at the lower left, smooth
> large-scale gradients like light through frosted glass, no grain, no
> shapes, no lines, no text, no logos. Must stay light enough that
> near-black text remains perfectly readable anywhere on it.

**H1 — `header-aura.webp` (required), ~3:1, 2000×640, opaque:**
> Very subtle wide horizontal light abstract banner: ivory white base
> (#FAFBF7) with one soft asymmetric bloom of pale green light (#CFEC81
> blended with a hint of olive #8FB021) rising from the lower left and
> dissolving toward the right, like morning light on a gallery wall,
> extremely low contrast, perfectly smooth, no grain, no shapes, no
> lines, no text, no logos. Near-black text must remain perfectly
> readable over every part of it.

**V2 — `card-silk.webp` (optional), 2:1, 1200×600, opaque:**
> Ultra-subtle abstract silk-light texture: soft white satin surface with
> one diagonal band of slightly brighter light crossing it and the
> faintest hint of pale green iridescence (#CFEC81) at the edges,
> extremely low contrast, smooth and premium, like light on frosted
> glass, no folds, no fabric weave, no text, no logos.

**V3 — `band-aurora.webp` (optional), 16:5, 1600×500, opaque:**
> Dark horizontal abstract banner: near-black deep forest green base
> (#0C1A12) with one luminous aurora ribbon of electric lime-green
> (#B0F122) light flowing from the right edge and dissolving before the
> center, a faint secondary glow of olive green (#8FB021) beneath it,
> smooth cinematic gradients, no stars, no grain, no shapes, no text, no
> logos. Dark enough for white text everywhere.

**M1 — `membership-silk.png` (optional), 5:2, 1200×480, transparent:**
> Subtle abstract luxury accent on a fully transparent background: soft
> concentric arcs of pale lime-cream light (#E3F5B0) at low opacity
> concentrated toward the right edge and fading to nothing, with one very
> faint deeper olive-green thread woven through, extremely low contrast,
> smooth, premium private-membership feeling, decorative corner accent
> for a dark panel, no text, no logos, no hard edges, no sparkles.

**E1 — `empty-records.png` (required), 3:2, 960×640, transparent:**
> Minimal abstract illustration of organized personal health records at
> rest: two overlapping matte ivory-white folder shapes with precise
> hairline dark-green edges, one thin electric lime-green line tracing
> the top folder's edge like a pulse, a small round badge shape resting
> on the corner, floating on a fully transparent background, flat-3D
> style with soft realistic shadows, premium minimal SaaS empty-state,
> gallery-white and deep-forest-green palette with a single lime accent,
> no text, no letters, no logos, no faces, no medical instruments.

**E2 — `empty-queue.png` (required), 3:2, 960×640, transparent:**
> Minimal abstract illustration of a calm empty schedule: a matte white
> rounded panel with a precise grid of blank rounded tiles drawn in thin
> deep-green hairlines, one tile softly filled with luminous lime-green,
> a small abstract circular dial beside the panel without numbers or
> hands, floating on a transparent background, soft realistic shadows,
> premium minimal clinical SaaS empty-state, ivory / deep forest green /
> single lime accent palette, no text, no numbers, no logos, no people.

**E3 — `empty-documents.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of documents at rest: three layered
> matte white sheets with rounded corners and thin deep-green hairline
> edges, slightly fanned, blank surfaces with faint gray tone bands
> suggesting paragraphs without readable content, the top sheet edged
> with a thin luminous lime-green highlight, floating on transparent
> background, soft shadows, premium minimal SaaS empty state, no text,
> no letters, no logos, no UI chrome.

**E4 — `empty-payments.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of finances at rest: one matte white
> rounded rectangle suggesting a blank receipt with faint gray tone
> bands, one smooth deep-forest-green disc beside it like an abstract
> coin with a thin lime-green rim light, floating on transparent
> background, precise hairline edges, soft shadows, premium
> fintech-grade minimal empty state, no currency symbols, no numbers, no
> text, no logos.

**E5 — `empty-content.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of editorial content at rest: a blank
> matte white card with a soft gray image-placeholder rectangle and two
> blank tone bands beneath, a second smaller deep-forest-green card
> peeking from behind with a thin lime-green edge light, floating on
> transparent background, precise hairlines, soft shadows, premium CMS
> empty state, no text, no letters, no icons, no logos.

**E6 — `empty-notifications.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of a quiet inbox: a matte white rounded
> bell-like shape drawn with soft geometry and a thin deep-green hairline
> edge, one small lime-green dot floating beside it like a resting
> signal, a faint white glass tray beneath, floating on a transparent
> background, soft shadows, premium minimal SaaS empty-state, ivory /
> forest / lime palette, no text, no numbers, no logos, no people.

**C1 — `empty-calendar.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of time at rest: a matte white rounded
> grid of blank square tiles drawn with thin deep-green hairlines
> suggesting a calendar month without numbers, one tile raised and
> filled with luminous lime-green, one thin orbital curve passing behind
> the grid in deep forest green, transparent background, soft shadows,
> premium scheduling empty state, no text, no numbers, no logos.

### Wiring rules

- H1 masked with
  `mask-image: linear-gradient(180deg, #000 60%, transparent)` so it
  dissolves before content starts; per-portal tint comes from the CSS
  aura on top, not from separate assets.
- E-assets wire into existing `AdminEmptyState assetSrc` call sites; the
  icon-tile fallback (§5.19) must remain for surfaces without an asset.
- After wiring, retire remaining legacy PNG references and delete files
  only when `rg "images/portal" frontend/` shows zero references to each
  legacy file.

---

## §10. Depth & light discipline (what keeps lux from becoming kitsch)

1. **One jewel per screen** (band OR corner-bloom card).
2. **Glow budget:** lime glow on ≤3 elements per viewport (active nav,
   live pill/tick, hero numeral OR hover underglow).
3. **Streaks static** except the 30s band drift; nothing shimmers
   continuously on content.
4. **Blur budget:** ≤6 panes per viewport; `.is-static` after the 4th
   card in lists.
5. **Gradient text on numerals only.**
6. **Shadows never darker than the listed stacks** — depth via layering,
   not opacity.
7. **Icons follow the opacity ladder** — no full-strength icon walls.
8. All DESIGN.md anti-patterns hold except the §2.3 blur amendment.
   Lime still never text on white; surfaces still never green; status
   pills still pills; no zebra.

---

## §11. Acceptance — how to know the flatness is gone

Review each portal dashboard + one list + one detail screen:

- [ ] No pure-flat `#FFFFFF` container anywhere (every container =
      Material A/B/C/D).
- [ ] Every card: specular top, gradient perimeter (lit top / mint-kiss
      bottom), ≥4-layer shadow, glass fill.
- [ ] Every non-dashboard page has a masthead: eyebrow + hairline +
      accent aura behind the title + bottom fade seam (§5.4 Mode 1);
      detail pages show the identity card (Mode 2).
- [ ] Each of the six §8.4 picture targets (T1–T6) matches its written
      description when rendered.
- [ ] With assets generated: A1/V1/H1 wired at their opacity caps;
      without assets: pure-CSS rendering still passes every other item.
- [ ] Stat numerals gradient-filled 40px+, micro-cap labels, icon tiles
      with accent rings.
- [ ] Band: streak + inner aurora + gradient hero numeral + metric
      separators.
- [ ] Plane visibly breathes — screenshot next to flat `#FAFBF7`; if
      indistinguishable, blooms too weak.
- [ ] Hover on interactive cards = lift + brighten + glow together;
      buttons press in; inputs rise on focus.
- [ ] Icons: consistent lucide sizes/strokes, opacity ladder visible
      (row icons dim until hover).
- [ ] Toasts, tooltips, menus, dialogs all on Materials A/D — no
      unstyled defaults anywhere.
- [ ] Focus rings visible on every interactive element, both worlds.
- [ ] Contrast spot-check: ink on the bloomiest plane point AND on a
      Material B card over it — both ≥12:1.
- [ ] `prefers-reduced-motion`: drift paused, sweeps off, still gorgeous
      static.
- [ ] Blur fallback: still premium via gradients + shadows.
- [ ] Git diff shows only CSS/className/style-object/`::before/::after`
      changes — zero behavior/markup-structure diffs.

---

## §12. Component inventory — every component mapped to its recipe

Implementation agent: work through this table; every row must end
"lux-skinned" or "verified inherits". No row may be skipped silently.

| Component (file) | Recipe |
|---|---|
| `atoms.tsx` PageHeader / Eyebrow / SectionHeader | §5.4, §5.1 |
| `atoms.tsx` AdminCard | §5.1 |
| `atoms.tsx` StatCard | §5.2 |
| `atoms.tsx` CommandBand | §5.3 |
| `atoms.tsx` AdminSummaryStrip | §5.5 |
| `atoms.tsx` AdminTable/Thead/Th/Td/Tr | §5.6 |
| `atoms.tsx` Btn / IconBtn | §5.7 |
| `atoms.tsx` Pill | §5.8 |
| `atoms.tsx` Toggle | §5.9 (element type frozen) |
| `atoms.tsx` AdminEmptyState | §5.19 |
| `admin-shell.tsx` + `portal-shell.tsx` (LOCKSTEP) | §5.11, §5.12 |
| `NotificationPopover.tsx` | §5.13 |
| `calendar/MonthCalendar` / `DayAgenda` / `EventDetailDialog` / `TimezoneSelect` | §5.16 |
| `chat/ChatThread` / `ConsultationChat` / `InternalMessagesThread` | §5.15 |
| `forms/phone-field.tsx` (PUBLIC-SHARED) | §5.9 |
| `forms/LanguagePicker.tsx` | §5.9 + chips §5.8 |
| `portal-skeletons` (+ shim) | §5.19 |
| `PortalDialog` / `confirm-delete-button` / `delete-account-button` / `consultation-documents-modal` | §5.14 |
| `PortalTabs` + `plan-edit-tabs` / `*-translation-tabs` / `appointment-tabs` / profile `*-tab` / `faq-language-tabs` | §5.10 |
| `PortalMobileCard` + `.gh-admin-mobile-card` fallbacks | §5.18 |
| `country-picker.tsx` / `flag-badge.tsx` / `scope-banner.tsx` | §5.12, §5.8, §5.20 |
| `managed-image-field` / `multi-image-field` / upload forms | §5.9 |
| `rich-text-html-field.tsx` | §5.9 |
| `skeletons.tsx` (admin loading) | §5.19 |
| `subscriber-ledger.tsx` | §5.6 |
| `subscription-health-panel.tsx` | §5.17 |
| Doctor `doctor-document-tables.tsx` / `documents-*` / `prescriptions-list` / `exam-results-list` | §5.17, §5.6 |
| Doctor `consultation-form` / `finalize-checklist` / `appointment-actions` / `form-fill` | §5.9, §5.17, §5.7 |
| Doctor `availability-ui.tsx` | §5.16 |
| Doctor `notification-list` / Patient `patient-notification-list` | §5.13 |
| Doctor `templates.tsx` / `csv-button` / profile `edit-form` / `profile-sections` | §5.1, §5.7, §5.9 |
| Patient `SubscriptionDashboard` / `ManagePanel` / `RewardsPanel` / `SubscribeForm` | §5.17 |
| Patient `receipt-button` | §5.7 (`soft`) |
| Patient bookings `ui.tsx` (cards + chat mounts) | §5.17, §5.15 |
| Patient `medical-files` / profile tabs (gdpr/insurance/nationality/verification) | §5.17, §5.10, §5.20 alerts |
| sonner Toaster theme | §5.14 |
| Links / dividers / avatars / scrollbars / selection / tooltips | §5.20 |
| Icons everywhere | §6 |
| PageHeader aura + identity headers (all detail routes) | §5.4 |
| Asset wiring (A1/V1/H1 + E-set into `assetSrc` slots) | §9 |

---

## §13. Decision defaults (when this file and DESIGN.md are both silent)

- Unknown container → Material B `.is-static`.
- Unknown small element fill → Material C.
- Unknown icon → nearest concept in §6 map, 16px, strokeWidth 2, rest
  opacity.
- Unknown hover → border brighten + text sharpen only (no lift).
- Unknown emphasis question → LESS: neutral, no glow, no gradient.
- Unknown spacing → nearest scale value, prefer larger.
- Something seems to need a new color → it doesn't; pick from §4 +
  DESIGN.md §3.
- Ambiguity about data/behavior → do not touch; restyle wrappers only.

---

## §14. Implementation notes for the agent

- **Skin pass only.** No DOM moves/additions/removals except
  `::before/::after` hooks or a wrapper class where the gradient-border
  technique requires it. No prop API changes. `Toggle` stays a submit
  button.
- Gradient borders: prefer the double-`background` +
  `background-clip: padding-box, border-box` recipe — no extra wrappers
  in most cases.
- `will-change: transform` ONLY on hover-lifting cards, removed after
  transition; never global.
- Commit order (small commits):
  1. `feat(portals): lux tokens + ambient environment` — §3 + §4,
     `globals.css` only.
  2. `feat(portals): lux materials on cards/stat cards/empty/skeletons` —
     §5.1–5.2, 5.19.
  3. `feat(portals): lux chrome — sidebar/topbar/band` — §5.3, 5.11,
     5.12 (both shells lockstep).
  4. `feat(portals): lux tables/forms/buttons/pills/tabs` — §5.5–5.10.
  5. `feat(portals): lux chat/calendar/modals/toasts/mobile/micro` —
     §5.13–5.16, 5.18, 5.20, §6 icon pass.
  6. `feat(portals): patient + doctor role polish` — §8 + §5.17 domain
     cards + §5.4 headers across routes.
  7. `feat(portals): lux asset wiring` — §9 (ONLY after the user
     generates assets; skip and note if assets absent — CSS-only must
     already pass §11).
- Validation per commit: `npm run lint`, `npx tsc --noEmit`,
  `npm run build`; render `/account` and `/doctor` at 390/768/1280/1920
  (Patient mobile first), `/admin` smoke, public `(site)` smoke if any
  shared `.gh-*` rule or `phone-field` was touched.
- After commit 6 (and 7 when assets exist): run the §11 acceptance list,
  the §12 inventory, and compare each §8.4 picture target — report all
  three.

---

## §15. Ready-to-paste agent prompt

> You are applying the **"Liquid Lux" visual upgrade pass** to the Global
> Health portals on branch `Dev-hassaan`. Read, in order:
> `docs/design/portal-redesign/portal-shared-ui-dependency-map.md`,
> `docs/design/portal-redesign/portal-design-system.md`, and
> `docs/design/portal-redesign/lux-visual-pass.md`. LUX-VISUAL-PASS.md wins on
> any visual conflict; DESIGN.md still governs behavior freeze, shells
> lockstep, ownership, and the green language; the dependency map governs
> blast radius. This is a **visual-only skin pass**: no markup
> restructuring, no prop changes, no behavior changes, no route changes.
> Implement the seven commits in LUX-VISUAL-PASS.md §14 in order (commit
> 7 only if generated assets exist). Patient and Doctor portals are the
> priority; Admin inherits via shared primitives. Every visual value must
> be a `--lux-*` or `--portal-*` token; icons follow §6 (lucide-react
> only); page headers follow §5.4 (Mode 1 masthead / Mode 2 identity
> card); when the spec is silent use §13 decision defaults — never invent
> colors, sizes, or effects. After the final commit, verify every row of
> the §12 component inventory, every item of the §11 acceptance
> checklist, and every §8.4 picture target (T1–T6), and report all three
> lists with pass/fail per item.

---

*Written 2026-07-03 (v2 exhaustive), branch `Dev-hassaan`. Layer order:
this file ▸ `DESIGN.md` ▸ `premium-portal-redesign-strategy.md` ▸
dependency map.*
