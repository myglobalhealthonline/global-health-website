# LUX-VISUAL-PASS.md — "Obsidian Ivory · Liquid Lux" (visual upgrade layer)

> **What this is:** a **visual-only upgrade pass** applied ON TOP of the
> already-implemented Obsidian Ivory system. The structure, layout, UX,
> table composition, component markup, routes, and behavior stay exactly
> as they are. Only the *skin* changes: materials, depth, light, borders,
> shadows, gradients, glass, backgrounds, contrast, and typographic
> hierarchy.
>
> **Why it exists:** the first implementation is structurally correct but
> reads flat — single soft shadows, plain white rectangles, no light
> behavior. This file replaces that surface language with a liquid-glass
> material system while keeping every token name, class name, and
> component API already in place.
>
> **Authority:** this file **supersedes** `DESIGN.md` §3 (tokens — extended
> here), §5 recipes' *visual* values, and commandment #2 ("only chrome
> blurs" — now amended by §2.3). Everything else in `DESIGN.md` (green
> language, behavior freeze, shells lockstep, ownership map, a11y gates,
> anti-patterns not contradicted here) remains binding. Where this file is
> silent, `DESIGN.md` applies.
>
> **Priority order:** Patient portal (`frontend/app/(auth)/account/**`)
> and Doctor portal (`frontend/app/(doctor)/doctor/**`) first. The lux
> pass lands in shared primitives so Admin inherits automatically —
> role-specific polish for Admin can follow later.
>
> **Palette law unchanged:** every color still derives from the five brand
> anchors — forest `#1D4B36`, mint `#8FB021`, lime `#B0F122`, white,
> gray `#6D6D6D` — plus neutrals. No foreign hues.

---

## §1. Diagnosis — why the current build reads "flat AI dashboard"

Name the disease before prescribing. Each item below is a flatness sin the
lux pass eliminates:

1. **One-layer shadows.** A single `0 12px 32px` blur reads like a CSS
   default. Expensive UI stacks 4–5 shadow layers (contact, ambient, key,
   drop) so cards appear to *sit in light*, not float in vacuum.
2. **Dead white cards.** Flat `#FFFFFF` fill + uniform 1px border = every
   card identical, no material, no light response. Premium cards are
   *made of something* — tinted glass with a bright specular top edge and
   a border that changes tone around the perimeter.
3. **No environment.** The ivory plane is a flat color, so there is
   nothing for glass to refract and nothing for depth to exist against.
   Luxury interfaces sit in an *atmosphere* — soft blooms, a veil of
   light, a horizon.
4. **Uniform borders.** The same `rgba(...,0.08)` hairline on all four
   sides is a template tell. Machined objects catch light on top and fall
   into shadow at the bottom.
5. **Timid numerals.** Stat numbers at 34px with no light treatment read
   as spreadsheet output. Hero numbers must *glow with meaning*.
6. **Even emphasis.** Every card the same size, same fill, same weight —
   no screen has a jewel. Each screen needs exactly one element that is
   visibly more precious than the rest.
7. **Hover = translate only.** Movement without light change feels
   mechanical. Premium hover = lift + brighten + glow, together.

---

## §2. The material system — "Liquid Lux"

Four materials replace the old flat surfaces. Every visible container on
every screen is one of these four. Nothing is plain white anymore.

### 2.1 Material A — **Obsidian Liquid** (dark chrome, upgraded)

For: sidebar, topbar, Command Band, membership header band, dark telemetry
strips, mobile nav sheet.

```css
background:
  linear-gradient(165deg, rgba(14,28,20,0.86) 0%, rgba(7,16,11,0.88) 60%, rgba(10,22,15,0.86) 100%);
backdrop-filter: blur(32px) saturate(160%);
border: 1px solid transparent;
background-clip: padding-box;
/* gradient hairline via wrapper/::before: */
/* border-image source: linear-gradient(135deg,
     rgba(255,255,255,0.16), rgba(255,255,255,0.05) 30%,
     rgba(176,241,34,0.28) 65%, rgba(255,255,255,0.04)) */
box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.09),        /* specular top */
  inset 0 -1px 0 rgba(0,0,0,0.35),             /* grounded bottom */
  0 1px 2px rgba(4,10,7,0.4),
  0 16px 48px rgba(4,10,7,0.45);
```

Plus a **reflection streak** (`::after`): a diagonal soft light band —
`linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.015) 52%, transparent 60%)`
— covering the pane, `pointer-events: none`. This is the "liquid" cue:
the surface looks like it reflects the room.

### 2.2 Material B — **Ivory Liquid Glass** (content cards — THE upgrade)

For: `AdminCard`, `StatCard`, table containers, `FormSection`,
`PortalMobileCard`, chat thread container, calendar card, document rows'
container, popovers.

```css
background:
  linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.66) 100%);
backdrop-filter: blur(24px) saturate(140%);
border-radius: var(--portal-radius-lg);
/* gradient hairline border (padding-box/border-box trick): */
border: 1px solid transparent;
background-image:
  linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.66)),
  linear-gradient(160deg,
    rgba(255,255,255,0.95) 0%,           /* lit top edge */
    rgba(16,23,19,0.06) 38%,             /* neutral sides */
    rgba(16,23,19,0.10) 62%,
    rgba(143,176,33,0.22) 100%);         /* mint kiss at the bottom corner */
background-origin: border-box;
background-clip: padding-box, border-box;
box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.95),         /* specular */
  inset 0 0 0 1px rgba(255,255,255,0.35),       /* inner glass rim */
  0 0 0 1px rgba(16,23,19,0.03),                /* contact line */
  0 1px 1px rgba(7,18,12,0.05),
  0 2px 4px rgba(7,18,12,0.04),
  0 8px 16px rgba(7,18,12,0.05),
  0 24px 48px rgba(7,18,12,0.07);               /* ambient drop */
```

**Readability guarantee (binding):** Ivory Liquid Glass sits ONLY over the
controlled ambient plane (§3), whose blooms are capped at ≤8% tint. The
effective backdrop behind text stays ≥ `#F2F4EE` luminance, so ink text
holds ≥14:1. Never place Material B over imagery, the dark canvas, or
another glass pane.

**Interactive variant hover:**

```css
transform: translateY(-2px);
box-shadow:
  inset 0 1px 0 rgba(255,255,255,1),
  inset 0 0 0 1px rgba(255,255,255,0.45),
  0 0 0 1px rgba(16,23,19,0.04),
  0 2px 4px rgba(7,18,12,0.05),
  0 12px 24px rgba(7,18,12,0.07),
  0 32px 64px rgba(7,18,12,0.10),
  0 8px 40px -8px var(--portal-signal-glow);    /* lime underglow */
/* border gradient brightens: mint kiss → rgba(176,241,34,0.35) */
```

### 2.3 Amended blur rule

`DESIGN.md` commandment #2 becomes: **blur exists on Materials A and B
only.** Wells, table rows, inputs, pills, buttons stay opaque. Per
viewport, max ~6 blurred panes (sidebar + topbar + band + ~3 cards in
view); long card lists render Material B *without* `backdrop-filter`
below the 4th card via a `.is-static` utility (visually identical —
the gradient fill carries the look; blur there is imperceptible anyway).
`@supports not (backdrop-filter: blur(1px))` → solid fills
(`#FFFFFF` for B, `--portal-chrome-solid` for A) — gradients/shadows keep
the depth so the fallback still looks finished.

### 2.4 Material C — **Etched Well** (inset)

For: form inputs at rest, icon tiles, mono blocks, chat message area,
slot chips, skeleton bases.

```css
background: linear-gradient(180deg, #EFF2EA 0%, #F4F6F0 100%);
box-shadow:
  inset 0 1px 2px rgba(16,23,19,0.06),   /* pressed-in top */
  inset 0 -1px 0 rgba(255,255,255,0.9);  /* lit bottom lip */
border: 1px solid rgba(16,23,19,0.05);
```

Wells read as *carved into* the glass — the counterpoint that makes cards
read as raised.

### 2.5 Material D — **Halo Elevated** (modals, menus, drag layers)

Material B at full opacity (`rgba(255,255,255,0.92)` → solid feel) +
stronger key shadow `0 32px 96px rgba(5,12,8,0.5)` + a 24px outer halo
`0 0 48px rgba(176,241,34,0.06)`. Overlay behind: `rgba(7,18,12,0.6)` +
`blur(12px)`.

---

## §3. The environment — ambient background system

Glass needs something to refract. Three layers, bottom to top:

### 3.1 Canvas (L0) — deepened

```css
background:
  radial-gradient(1400px 900px at 85% -12%, rgba(176,241,34,0.16), transparent 60%),
  radial-gradient(900px 700px at -10% 110%, rgba(143,176,33,0.10), transparent 55%),
  linear-gradient(170deg, #0A160F 0%, #07120C 45%, #081409 100%);
```

Two blooms now (lime top-right, mint bottom-left) + a gradient base
instead of flat color. Optional `canvas-aurora.webp` on top at ≤0.5.

### 3.2 Ivory plane (L2) — the "veil", no longer flat

```css
background:
  radial-gradient(1200px 800px at 78% -8%, rgba(176,241,34,0.07), transparent 55%),
  radial-gradient(1000px 700px at 8% 30%, rgba(143,176,33,0.05), transparent 60%),
  radial-gradient(800px 600px at 92% 88%, rgba(29,75,54,0.04), transparent 60%),
  linear-gradient(180deg, #FCFDF9 0%, #F8FAF4 55%, #F5F8F0 100%);
```

Bloom intensity cap: **≤8% alpha** (readability guarantee §2.2). Optional
asset `plane-veil.webp` (§8) above this at ≤0.35 opacity, `aria-hidden`.

Role tuning (one gradient stop swap via `[data-portal]`):
- **Patient:** warmer — first bloom becomes `rgba(207,236,129,0.08)`
  (pale lime), plus a faint warm bloom near the greeting area.
- **Doctor:** calmer — blooms at 60% of listed alpha; steadier field for
  clinical reading.

### 3.3 Plane edge

Where the ivory plane meets the dark frame: 18px top radius + a 1px
`rgba(255,255,255,0.65)` inner top edge + `0 -12px 32px rgba(7,18,12,0.18)`
above it, so the plane visibly *floats* over the canvas instead of butting
against it.

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

  /* layered shadow stacks (replace usage of --portal-shadow/-hover on cards) */
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

  /* light */
  --lux-specular: rgba(255,255,255,0.95);
  --lux-streak: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.015) 52%, transparent 60%);
  --lux-blur-card: 24px;
  --lux-blur-chrome: 32px;

  /* numeral treatment */
  --lux-numeral-ink: linear-gradient(180deg, #101713 0%, #1D4B36 130%);
  --lux-numeral-live: linear-gradient(180deg, #DFFF7A 0%, #B0F122 70%);
}
```

Rule stays: components reference tokens, never raw values. New visuals =
new tokens here first.

---

## §5. Component skin upgrades (visual deltas only — no markup changes)

### 5.1 Cards (`AdminCard` / `.gh-admin-card`)

Material B in full (§2.2). Additional:
- **Header zone tint:** when a card has a `SectionHeader`, the header row
  sits on `rgba(255,255,255,0.5)` with a 1px `--portal-line-soft` rule
  below — cards get visible internal architecture.
- **Section rule upgrade:** the 3×16px mint rule becomes a 3×16px
  **gradient bar** `linear-gradient(180deg, var(--portal-signal), var(--portal-mint))`
  with `border-radius: 2px` and a 6px soft glow at 20%.
- One **jewel card** per screen (dashboard: the primary queue/next-action
  card) may add a corner bloom `::before`:
  `radial-gradient(320px 200px at 100% 0%, color-mix(in srgb, var(--portal-accent) 9%, transparent), transparent 70%)`.
  Max one per screen.

### 5.2 StatCard — the centerpiece upgrade

Anatomy unchanged. Skin:
- Container: Material B + min-height 136px.
- **Numeral:** 40–44px/800, `tabular-nums`, tracking −0.03em, filled with
  `--lux-numeral-ink` via `background-clip: text` (subtle ink→forest
  vertical gradient — reads engraved, not flat).
- **Icon tile:** 40px, Material C well + inner accent ring
  `inset 0 0 0 1px color-mix(in srgb, var(--portal-accent) 35%, transparent)`;
  glyph `--portal-accent-text`.
- **Label:** 10px/800, +0.14em tracking, caps, `--portal-muted` — wider,
  smaller, more machined than before.
- **Delta chip (when the metric has a trend):** 11px/700 pill,
  success/danger soft tone, `▲/▼` glyph — sits right of the numeral.
- **Baseline shimmer:** a 1px bottom-edge gradient
  `linear-gradient(90deg, transparent, rgba(143,176,33,0.35), transparent)`
  — the card sits on a thread of light.
- Hover (linked stats): `--lux-elev-2` + numeral gradient brightens
  (forest stop → mint).

### 5.3 Command Band — from panel to instrument

- Material A + reflection streak + gradient hairline.
- **Inner aurora:** one `::before` radial
  `radial-gradient(600px 300px at 85% 0%, rgba(176,241,34,0.10), transparent 65%)`
  drifting 24px horizontally over 30s (paused under
  `prefers-reduced-motion`) — the ONE slow ambient allowed on dashboards
  (replaces, not adds to, the agenda tick when both would be visible).
- **Hero numeral:** 48–56px, filled `--lux-numeral-live` gradient via
  `background-clip: text`, plus `filter: drop-shadow(0 0 24px rgba(176,241,34,0.25))`.
  Non-hero metrics stay ivory.
- **Metric separators:** 1px vertical `rgba(255,255,255,0.07)` rules
  between metrics — instrument-panel articulation.
- Bottom edge: seam-light gradient always on (not only on scroll).

### 5.4 Tables

Container = Material B (blur allowed on the container only, rows opaque):
- **Header row:** `rgba(242,244,238,0.7)` fill + `backdrop-filter: none`,
  1px strong rule below, **sticky** within the card scroll area, letters
  10.5px/800 +0.12em.
- **Row hover:** `rgba(143,176,33,0.07)` + 2px accent inset bar with a
  4px glow, + row lifts type color ink→pure-ink (subtle darken).
- **Selected row:** persistent mint wash + 1px accent left border.
- **Money/ID columns:** mono/tabular as before, but muted → ink on row
  hover (data sharpens when regarded).
- **Zebra is still banned.** Depth separates rows, not stripes.

### 5.5 Sidebar

Material A + streak. Upgrades:
- **Active item = glass pill:** `rgba(176,241,34,0.12)` fill +
  `inset 0 0 0 1px rgba(176,241,34,0.25)` ring + text `--portal-signal` +
  3px bar with 8px glow (existing) + **icon gains
  `drop-shadow(0 0 6px rgba(176,241,34,0.5))`**.
- Rest icons at 0.6 opacity → 1 on hover (chrome text unchanged) — the
  rail breathes with attention.
- Section labels (Admin "Global/Country", Doctor/Patient single label):
  9.5px/800 +0.18em caps, `rgba(233,239,233,0.4)`.
- Bottom fade: sidebar content fades to transparent over the last 48px
  (mask-image) so long navs dissolve instead of clipping.

### 5.6 Topbar

Material A. Portal glyph upgraded: 22px rounded square with
`--lux-chrome-border` gradient ring + accent glyph + faint inner glow.
User pill: hairline gradient ring instead of flat border; avatar gets a
1px `rgba(255,255,255,0.2)` rim.

### 5.7 Buttons

Shapes/variants unchanged. Light behavior added:
- `primary`: fill becomes vertical duotone
  `linear-gradient(180deg, #226044 0%, #1D4B36 55%, #16382A 100%)` +
  `inset 0 1px 0 rgba(255,255,255,0.18)` (lit top) +
  `inset 0 -1px 0 rgba(0,0,0,0.25)` (grounded base); hover adds the lime
  underglow (existing) + brightens the top stop.
- `secondary`: white → Material B mini (glass fill @0.85, gradient
  hairline).
- `on-chrome`: hover gains `inset 0 0 0 1px rgba(176,241,34,0.2)`.
- Press: translateY(1px) + shadow collapses to contact layer only —
  buttons physically *press into* the surface.

### 5.8 Pills / badges

Tone map unchanged. Add: 1px inner rim `inset 0 0 0 1px` at tone color
@0.18, and dot gains a 3px soft halo at tone color @0.25 (was flat).
`live` keeps its stronger lime halo — still the only glowing pill.

### 5.9 Forms

- Inputs: Material C etched well; on focus the well *rises*: fill →
  white, `--lux-elev-1` at 40% strength + mint border + ring (existing).
  Focus = the field physically lifts to meet you.
- `FormSection`: Material B card; legend/SectionHeader per §5.1.
- Dropzone dragover: dashed accent + inner bloom
  `radial-gradient(closest-side, rgba(176,241,34,0.08), transparent)`.

### 5.10 Modals / popovers

Material D. Popover enter: scale 0.96→1 + fade + a one-time top-edge
specular sweep (200ms, left→right) — menus *arrive with light*.

### 5.11 Chat

Thread container Material B; message area Material C. Own bubble: forest
duotone (same recipe as primary button fill) + `inset 0 1px 0
rgba(255,255,255,0.12)`; other bubble: white glass @0.9 + hairline.
Composer bar: Material B strip with top hairline gradient.

### 5.12 Calendar

Month card Material B. Today ring gains a 4px soft accent glow. Selected
day = forest duotone fill. `DayAgenda` now-tick keeps its breathing glow —
but suppressed when a Command Band aurora is in the same viewport (one
ambient max, per rule).

### 5.13 Mobile cards (`PortalMobileCard`)

Material B with blur dropped (`.is-static`) for scroll performance;
status left edge becomes a 3px gradient bar (tone → transparent) with
2px glow. Touch feedback: press = scale(0.99) + shadow collapse.

### 5.14 Empty states / skeletons

- Empty: illustration slot gets a backing bloom
  `radial-gradient(280px 180px at 50% 40%, rgba(143,176,33,0.06), transparent)`
  so art never floats on nothing.
- Skeletons: bases become Material C gradients; shimmer sweep gains a
  faint mint tint `rgba(143,176,33,0.15)` at its center. Command Band
  skeleton: Material A + shimmering numeral blocks (existing) + streak.

---

## §6. Typography hierarchy upgrade

Same family, sharper contrast:

| Tier | Old | New |
|---|---|---|
| Band hero numeral | 44–56/800 flat ivory | 48–56/800, −0.03em, `--lux-numeral-live` gradient text + drop-glow (hero only) |
| Stat numeral | 34–36/800 flat ink | 40–44/800, −0.03em, `--lux-numeral-ink` gradient text |
| Page title | clamp(24,2vw,34)/800 −0.02em | same size, −0.03em, color pure ink `#0C120E`; optional word-accent: final word of dashboard greeting in `--portal-accent-text` |
| Micro-label (NEW tier) | — | 10px/800 +0.14em caps muted — stat labels, band labels, meta kickers |
| Eyebrow | 12/800 +0.06em | 11px/800 +0.12em (tighter, wider — more machined) |
| Body/muted | unchanged | unchanged (readability floor) |

Rule: each screen has exactly ONE gradient-text element cluster (band
numerals or stat grid — not both at full treatment; stat grid drops to
plain ink when a band is present above it… **exception:** dashboards may
have band (live gradient) + stats (ink gradient) since the gradients
differ in energy).

---

## §7. Role polish priorities

### 7.1 Patient (`(auth)/account/**`) — first

- Plane veil warm variant (§3.2); greeting title word-accent.
- Dashboard: band = jewel; "next appointment" card gets the corner-bloom
  jewel treatment when no band metric is live.
- Membership: plan card header = Material A + `--portal-member` hairline +
  membership-silk asset corner (≤0.5 opacity); progress bar gains a
  moving 20% highlight sweep on value change only.
- Payment cards: amount numerals get the ink-gradient treatment at 20px.
- All list surfaces: `PortalMobileCard` lux skin (§5.13) — mobile is the
  primary patient platform; verify at 390px first.

### 7.2 Doctor (`(doctor)/doctor/**`) — second

- Plane veil calm variant (60% blooms).
- "Now" band: hero time numeral in live gradient; when consultation is
  live, band border gradient shifts lime-heavy + streak brightens 20%.
- **Calm mode override (unchanged in spirit):** during a live
  consultation the form zone drops ALL lux hover physics (no lifts, no
  glows) — glass stays, motion stops.
- Availability slot chips: Material C rest / accent glass fill active
  (`rgba(143,176,33,0.16)` + inner ring) / danger-soft blocked.
- Document tables + medical notes: container Material B, rows opaque,
  mono timestamps — chart-like sobriety, the lux lives in the container.

### 7.3 Admin — inherits

Shared primitives carry the skin. Admin-specific jewel tuning (orders
mini-band, telemetry strips → Material A) may follow as a later polish
commit; not part of this pass's acceptance.

---

## §8. Asset pack (generated backgrounds — optional but recommended)

All under `frontend/public/images/portal/obsidian/`, `aria-hidden`,
empty `alt`, UI must look finished without them. Constraints in every
prompt: no text, no letters, no numbers, no logos, no watermarks, no UI,
no people, no medical gore.

| # | File | Where | Opacity cap | Size |
|---|---|---|---|---|
| V1 | `plane-veil.webp` | ivory plane, above gradient blooms | 0.35 | 2560×1440 |
| V2 | `card-silk.webp` | inside jewel cards only, top third | 0.25 | 1200×600 |
| V3 | `band-aurora.webp` | Command Band inner backdrop | 0.5 | 1600×500 |
| A1 | `canvas-aurora.webp` | (existing slot) canvas | 0.5 | 2560×1440 |
| M1 | `membership-silk.png` | (existing slot) plan card corner | 0.5 | 1200×480 |

**V1 — `plane-veil.webp`, 16:9, 2560×1440, opaque:**
> Extremely subtle light abstract background: warm ivory white base
> (#FAFBF7) with two or three very soft out-of-focus blooms of pale
> lime-green (#CFEC81) and gentle olive-green (#8FB021) light at very low
> opacity, one near the top right, one at the lower left, smooth
> large-scale gradients like light through frosted glass, no grain, no
> shapes, no lines, no text, no logos. Must stay light enough that
> near-black text remains perfectly readable anywhere on it.

**V2 — `card-silk.webp`, 2:1, 1200×600, opaque (used inside a masked
container):**
> Ultra-subtle abstract silk-light texture: soft white satin surface with
> one diagonal band of slightly brighter light crossing it and the
> faintest hint of pale green iridescence (#CFEC81) at the edges,
> extremely low contrast, smooth and premium, like light on frosted
> glass, no folds, no fabric weave, no text, no logos.

**V3 — `band-aurora.webp`, 16:5, 1600×500, opaque:**
> Dark horizontal abstract banner: near-black deep forest green base
> (#0C1A12) with one luminous aurora ribbon of electric lime-green
> (#B0F122) light flowing from the right edge and dissolving before the
> center, a faint secondary glow of olive green (#8FB021) beneath it,
> smooth cinematic gradients, no stars, no grain, no shapes, no text, no
> logos. Dark enough for white text everywhere.

(A1 and M1 prompts already exist in the strategy doc — reuse them.)

---

## §9. Depth & light discipline (what keeps lux from becoming kitsch)

1. **One jewel per screen.** Band OR a corner-bloom card — never two
   bloomed containers in one viewport.
2. **Glow budget:** lime glow appears on at most 3 elements per viewport
   (active nav, live pill/tick, hero numeral OR hover underglow).
3. **Streaks are static** (except the 30s band drift). Nothing shimmers
   continuously on content surfaces.
4. **Blur budget:** ≤6 blurred panes per viewport; lists go `.is-static`
   after the 4th card (§2.3).
5. **Gradient text** only on numerals per §6 — never on body, labels, or
   buttons.
6. **Shadows never darker** than the listed stacks — depth comes from
   layering, not opacity.
7. **All existing DESIGN.md anti-patterns hold** except where §2.3
   amends the blur rule. Lime still never text on white; surfaces still
   never green; status pills still pills.

---

## §10. Acceptance — how to know the flatness is gone

Review each portal dashboard + one list + one detail screen against:

- [ ] No pure-flat `#FFFFFF` container anywhere (every container is
      Material A/B/C/D).
- [ ] Every card shows: specular top edge, gradient perimeter (brighter
      top, mint kiss bottom), ≥4-layer shadow, glass fill.
- [ ] Stat numerals are gradient-filled, 40px+, with micro-cap labels.
- [ ] The dashboard band has streak + inner aurora + gradient hero
      numeral.
- [ ] The ivory plane visibly breathes (blooms) — screenshot it next to
      flat `#FAFBF7`; if indistinguishable, blooms are too weak.
- [ ] Hover on any interactive card = lift + brighten + glow together.
- [ ] Focus rings visible on glass (mint ring on Material B verified).
- [ ] Text contrast spot-check: ink on the *bloomiest* point of the plane
      and on a Material B card over it — both ≥12:1.
- [ ] `prefers-reduced-motion`: drift paused, sweeps off, everything
      still gorgeous static.
- [ ] Blur fallback (`@supports` off): still premium via gradients +
      shadows.
- [ ] Zero markup/behavior diffs outside class/style layers (git diff
      shows CSS + className/style-object changes only).

---

## §11. Implementation notes for the agent

- **This is a skin pass.** Do not move, add, or remove DOM elements
  except adding `::before/::after` hooks or a wrapper class where a
  gradient-border technique requires it. No prop API changes.
- Land in this order (small commits):
  1. `feat(portals): lux tokens + ambient environment` — §3 + §4 in
     `globals.css` only.
  2. `feat(portals): lux materials on cards/stat cards` — §5.1–5.2 (+
     §5.14 skeleton/empty).
  3. `feat(portals): lux chrome — sidebar/topbar/band` — §5.3, 5.5, 5.6
     (both shells lockstep).
  4. `feat(portals): lux tables/forms/buttons/pills` — §5.4, 5.7–5.9.
  5. `feat(portals): lux chat/calendar/modals/mobile` — §5.10–5.13.
  6. `feat(portals): patient + doctor role polish` — §7.
- Validation per commit: `npm run lint`, `npx tsc --noEmit`,
  `npm run build`, render `/account` and `/doctor` at 390/768/1280/1920
  (Patient mobile first), then `/admin` smoke check, then public `(site)`
  smoke check if any shared `.gh-*` rule was touched.
- Gradient-border technique: prefer the double-`background` +
  `background-clip: padding-box, border-box` recipe (§2.2) — no extra
  wrappers needed in most cases.
- Performance: add `will-change: transform` ONLY on hover-lifting cards,
  remove after transition; never `will-change` globally.

---

## §12. Ready-to-paste agent prompt

> You are applying the **"Liquid Lux" visual upgrade pass** to the Global
> Health portals on branch `Dev-hassaan`. Read, in order:
> `docs/portal-redesign/portal-shared-ui-dependency-map.md`,
> `docs/portal-redesign/DESIGN.md`, and
> `docs/portal-redesign/LUX-VISUAL-PASS.md`. LUX-VISUAL-PASS.md wins on
> any visual conflict; DESIGN.md still governs behavior freeze, shells
> lockstep, ownership, and the green language; the dependency map governs
> blast radius. This is a **visual-only skin pass**: no markup
> restructuring, no prop changes, no behavior changes, no route changes.
> Implement §11's six commits in order — tokens+environment first, then
> cards/stat-cards, then chrome, then tables/forms/buttons, then
> chat/calendar/modals/mobile, then Patient+Doctor role polish. Patient
> and Doctor portals are the priority; Admin inherits via shared
> primitives. Every new visual value must be a `--lux-*` or `--portal-*`
> token. Validate per commit (lint, tsc, build, render /account and
> /doctor at 390/768/1280/1920) and check §10's acceptance list before
> declaring done.

---

*Written 2026-07-03, branch `Dev-hassaan`. Layer order: this file ▸
`DESIGN.md` ▸ `premium-portal-redesign-strategy.md` ▸ dependency map.*
