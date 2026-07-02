# Premium Portal Redesign Strategy — "Obsidian Ivory"

> **Status:** Design strategy + implementation-ready documentation only. No code
> was changed to produce this file. This document **replaces** the previous
> "Meridian Glass" strategy in full.
>
> **Scope:** Admin Portal (`frontend/app/(admin)/admin/**`), Doctor Portal
> (`frontend/app/(doctor)/doctor/**`), Patient/Account Portal
> (`frontend/app/(auth)/account/**`) — one shared design system, three
> role-tuned expressions.
>
> **Read first:** `docs/portal-redesign/portal-shared-ui-dependency-map.md`
> (master dependency reference) and `docs/portal-redesign/DESIGN.md`
> (binding design-system spec for implementing agents).
>
> **Path correction (repeat, because it keeps biting agents):** the Patient
> portal lives at `frontend/app/(auth)/account/**`. There is **no**
> `(account)` route group.

---

# Current plan critique

An honest review of the previous `premium-portal-redesign-strategy.md`
("Meridian Glass"), written as a senior creative director would deliver it.

### What is good (keep)

- **The diagnosis is excellent.** Section 2 of the old plan (triple-layer
  `!important` fights, two status palettes, four unrelated near-blacks,
  inline `#D9F99D` in both shells, texture PNGs hardcoded into five
  selectors) is verified, precise, and remains true in source today
  (`portal-shell.tsx:424,458`, `admin-shell.tsx:630,677`,
  `globals.css:1527,1555,1735,1772`). All of that engineering analysis
  carries forward unchanged.
- **The architecture discipline is right.** Token-first phasing, shells in
  lockstep, `portal-atoms.ts` stays a pure re-export, `.gh-admin-*` treated
  as global, contrast rules for glass, "content never sits on blur." These
  are correct constraints for any direction and are preserved.
- **The dependency awareness is right.** Phase ordering, blast-radius
  labeling, and the `phone-field.tsx` public-site escape hatch are real.

### What is weak (replace)

1. **It is a refinement, not a redesign.** Meridian Glass keeps the same
   forest canvas, the same porcelain work plane, the same green family, and
   re-weights the same three brand colors. A user who saw the old portal
   would recognize the new one instantly. That is polish, not a statement.
2. **It is still a green healthcare portal.** Forest `#1D4B36`, mint, jade
   `#2E9E77`, lime — every accent decision is another green. Jade "as the
   credibility move" is the same hue family at different lightness. The
   palette has no tension, no second voice, nothing unexpected. Premium
   products almost never run monochrome-green; they run high contrast with
   one disciplined signal color.
3. **The dark canvas is wasted.** The deep forest gradient only ever shows
   as a "0–24px breathing edge" at ≥1500px viewports. That means the single
   most dramatic element of the design is invisible on a 13–14" laptop —
   which is what an investor demo runs on. Drama that only exists at 1500px+
   is not drama.
4. **Primary actions are forest-green fills.** Green buttons on
   green-tinted porcelain with green headings is exactly what the current
   portal does. The old plan's "what visibly changes" table is honest about
   this: mostly recolors and shadow cleanup.
5. **No signature moment.** Stripe has the gradient. Linear has the glow.
   Apple has the material. Meridian Glass has… a jade hover state. There is
   no single screen element a user would screenshot, no composition that
   could open a pitch deck. The plan over-specifies mechanics (three shadow
   tokens, two blur values) and under-delivers a memorable image.
6. **Typography is timid.** "Keep one family, weights 500/700/800" produces
   the same texture the portal has today. Premium SaaS in 2026 is carried by
   scale contrast and numeric display treatment; the old plan's largest type
   is a 36px stat numeral.
7. **The asset plan decorates the old idea.** Ten prompts, all "jade glass
   forms on porcelain" — competent, interchangeable, forgettable.

### Why it would still look ordinary

Because every decision minimizes distance from the current UI. Same hue,
same plane, same chrome geometry, same component shapes with better tokens.
The result would be *cleaner*, and cleaner is not the brief. The brief is
expensive, sharp, memorable.

### Verdict

**Replace the visual direction entirely. Keep the engineering skeleton**
(tokens-first phasing, lockstep shells, risk registry, validation gates).

---

# Three alternative premium design concepts

Three genuinely different directions were developed before choosing. None is
a variation of Meridian Glass.

---

## Concept A — "Obsidian Ward" (dark luxury clinical command center)

- **Mood:** a private surgical suite at night. Bloomberg-terminal authority
  crossed with dark-luxury hospitality. Serious, quiet, powerful.
- **Color direction:** true dark UI everywhere. Ink `#0B0E0D` canvas, graphite
  `#161B19` surfaces, warm off-white text `#F2F1EC`, one luminous vital-green
  `#2CE5A0` signal, brushed-bronze `#B08D4F` hairlines for premium tiers.
- **Background:** near-black with an ultra-subtle emerald aurora drifting in
  the top corner; grain-free, cinematic vignette.
- **Glass/depth:** dark glass on darker glass; depth from luminous 1px edges
  and soft green underglows rather than shadows.
- **Cards:** graphite panels, 1px `rgba(255,255,255,0.07)` border, inner top
  highlight `rgba(255,255,255,0.04)`, luminous accent bar on active.
- **Sidebar/topbar:** dissolve into the canvas — chrome and page are one
  continuous black instrument; nav items glow when active.
- **Buttons:** vital-green filled primary glowing softly; ghost buttons with
  luminous borders.
- **Tables:** dark rows, hairline separators, green telemetry numerals in
  tabular figures — reads like a trading terminal.
- **Forms:** inset darker wells with luminous focus rings.
- **Role feel:** Admin = mission control (perfect fit). Doctor = night-shift
  clinical console (good fit). Patient = **problem** — patients reading
  medical results on a black screen reads ominous, and WCAG-compliant dark
  forms across ~40 patient surfaces is a heavy lift.
- **Why premium:** dark + luminous + restrained is the most instantly
  "expensive" look in software; zero resemblance to generic healthcare.
- **Risks:** patient trust/warmth suffers; long-form reading (consultation
  notes, legal text, GDPR) is measurably worse on dark; every status tone
  needs a dark-mode-safe rebuild; medical document rendering (white PDFs)
  punches holes in the composition.

---

## Concept B — "Obsidian Ivory" (black glass chrome · gallery-ivory content · vital signal)

- **Mood:** a private clinic designed by a Swiss architecture firm. Gallery
  white where you read; obsidian black where the machine lives; one electric
  vital sign connecting them. Linear/Stripe-grade sharpness with clinical calm.
- **Color direction:** two worlds, hard contrast. Chrome world: ink-black
  glass `rgba(8,12,10,0.78)` over a `#060A08` canvas with an emerald aurora.
  Content world: gallery ivory `#FBFBF8` and pure white cards with ink
  `#0A0F0D` text. **Primary buttons are ink-black, not green.** Brand green
  survives as two disciplined voices: deep emerald `#0B5C41` (links, selected
  states, section accents on light) and electric **vital jade `#2CE5A0`**
  (glows, live signals, active nav on dark, focus rings, chart lines —
  never body text). Patient membership surfaces add **champagne gold
  `#E8C476`** hairlines — private-clinic luxury.
- **Background:** viewport canvas is near-black with one aurora bloom;
  the ivory work plane floats on it as a single continuous sheet with a
  visible obsidian frame on ≥1280px (not 1500px — the drama must survive a
  laptop).
- **Glass/depth:** black glass is the only blurred material (sidebar, topbar,
  command band, popovers-on-dark). Light surfaces are near-opaque; depth on
  light comes from 1px inner highlights + two shadow tiers.
- **Cards:** white, radius 14, hairline `rgba(10,15,13,0.08)` border, inset
  top highlight; interactive cards lift 2px with a faint jade underglow.
- **Sidebar/topbar:** obsidian glass; sidebar carries a 1px luminous jade
  edge-light on its content seam; active nav item = jade text + jade left
  bar + soft glow. Topbar is a black glass strip with the portal glyph,
  breadcrumb in ivory text, bell + user chip in one bordered pill.
- **Signature moment:** the **Command Band** — every dashboard opens with a
  full-width obsidian glass panel: greeting/context on the left, 3–5 huge
  luminous tabular numerals (44–56px) on the right, one live jade tick.
  Black band over ivory page = the screenshot.
- **Buttons:** ink-black filled primary (jade underglow on hover), emerald
  quiet-link, outline, ghost, danger-soft. Shape language: 10px rounded-rect
  actions, 999px pills for status only.
- **Tables:** ivory container, ink 11px caps headers, hairline rules, jade
  row-hover wash + 2px jade inset bar; numerics right-aligned tabular.
- **Forms:** white wells on ivory cards, ink labels, jade focus ring, danger
  states in desaturated clinical red.
- **Role feel:** Admin = operations command (black chrome + dense telemetry).
  Doctor = focused clinical studio (same chrome, calmer content, glacier-cyan
  accent). Patient = private health atelier (same chrome, warmer ivory,
  champagne membership accents, card-first, large type).
- **Why premium:** maximum contrast discipline (the #1 shared trait of
  Linear, Stripe, Vercel, Arc); black chrome reads tech-luxury, ivory reads
  clinical-clean; the electric jade is unmistakably *this product*; gold on
  membership says "private care" without saying it.
- **Risks:** black chrome must be executed with hairline precision or it
  reads heavy; jade must stay signal-only or the design collapses into
  neon; needs a real blur fallback for old GPUs.

---

## Concept C — "Helios Instrument" (futuristic AI clinical cockpit)

- **Mood:** the diagnostic deck of a medical AI. Holographic, luminous,
  slightly sci-fi. The interface feels like it is computing.
- **Color direction:** deep indigo-slate `#0D1220` canvas, iridescent
  teal→violet gradient accents (`#2DD4BF → #8B5CF6`), white instrument
  panels, data-viz everywhere.
- **Background:** animated-feeling mesh gradients, orbital hairlines,
  soft light rays.
- **Glass/depth:** heavy glassmorphism — floating translucent instrument
  panels at multiple z-depths with colored backdrop glows.
- **Cards:** translucent panels with gradient borders (1px conic gradient),
  glow-on-hover.
- **Sidebar/topbar:** floating glass rail detached from the edge; topbar as
  a floating capsule.
- **Buttons:** gradient-filled primaries, glow focus.
- **Tables:** data-grid aesthetic with mono numerals and sparkline columns.
- **Forms:** glass wells with luminous borders.
- **Role feel:** Admin = flight director (great). Doctor = AI copilot
  (thematically strong — this is the "AI-healthcare" look). Patient =
  futuristic but potentially cold/untrustworthy for medical documents.
- **Why premium:** the most visually spectacular of the three; screams
  "AI product, 2026."
- **Risks:** violet/indigo abandons brand DNA completely; gradient-border
  glass is the fastest-aging trend in this list; hardest contrast math;
  easiest to tip into cheap sci-fi; blur cost on low-end devices highest.

---

# Final chosen design direction

## Chosen: **Concept B — "Obsidian Ivory"**

### Why (decision, not a vote)

1. **Highest premium-per-risk.** It delivers Concept A's black-luxury drama
   in the chrome — where contrast is easy to hold and no medical text lives —
   while keeping every reading surface light. Patients get warmth and
   legibility; investors get the black-glass screenshot. Concept A pays for
   its drama with 40+ dark-mode patient surfaces; Concept C pays with brand
   abandonment and trend-decay. B pays almost nothing.
2. **It finally breaks "green portal."** Ink-black primary buttons, ink
   headings, black chrome. Green stops being the wallpaper and becomes the
   *signal* — a single electric vital sign that means "alive/interactive."
   That is a healthcare story (vitals, telemetry) told with restraint.
3. **It has a signature.** The Command Band (obsidian panel, luminous
   numerals, live tick) is a repeatable, ownable composition that opens
   every dashboard and every pitch deck.
4. **It maps 1:1 onto the existing architecture.** Two shells → obsidian
   chrome recipe. Porcelain plane → ivory plane. Same phased rollout, same
   token surface, same lockstep rules. Nothing in the dependency map fights
   this direction.
5. **Role differentiation is built in, cheaply.** One `data-portal`
   attribute swaps the signal accent (jade / glacier / champagne) and the
   Command Band content. Three temperaments, one system.

---

# Final design vision

- **Concept name:** **Obsidian Ivory**
- **One-line design statement:** A black-glass instrument frame around a
  gallery-white clinical workspace, connected by a single electric vital
  sign.
- **Mood:** precision, quiet power, private care. A Swiss gallery that
  happens to run a hospital. Never playful, never sterile — *engineered
  calm*.
- **Design principles:**
  1. **Two worlds, one seam.** Chrome is obsidian; content is ivory. The
     1px luminous seam between them is sacred — it is the brand.
  2. **Green is a signal, not a surface.** Vital jade appears only where
     something is alive, active, or focused. Emerald ink carries quiet
     interactivity on light. Nothing else is green.
  3. **Black is the new primary.** Actions are ink-black. Authority comes
     from contrast, not from brand color.
  4. **Numbers are the decoration.** Large luminous tabular numerals are the
     only ornament the system needs. No washes, no texture PNGs, no decor
     spans.
  5. **Blur lives in the chrome.** Reading surfaces are ≥0.94 opaque, always.
  6. **One radius language.** 10px actions, 14px cards, 18px band/modals,
     999px status pills. Shape = meaning.
  7. **Motion states facts.** 120/200/280ms, transform/opacity only,
     nothing bounces.
- **Why it feels premium:** hard value contrast (near-black against
  near-white) is the most reliable luxury cue in UI; hairline borders +
  inner highlights read machined; a single electric accent against a
  disciplined neutral field reads intentional; gold appears exactly once
  (membership) so it reads earned.
- **Why it fits healthcare:** all medical reading happens on ivory/white at
  ≥15:1 contrast; the "vital sign" accent semantics are native to medicine;
  black chrome frames rather than dominates; patient surfaces stay warm,
  large-type, card-first.
- **What makes it visually stronger than the old plan:** the old plan's
  strongest element (deep canvas) was invisible below 1500px and its accent
  system was three greens. Obsidian Ivory makes the dark world permanent
  chrome (visible at every width), replaces green-on-green with
  black/ivory/signal, adds a signature composition (Command Band), adds a
  second material voice (champagne on Patient membership), and doubles the
  typographic scale range (11px caps → 56px luminous numerals).

---

# Premium color system

Decided. No user input required. Brand forest survives as *emerald ink*
and the lime heritage survives as *vital jade* — but neither is wallpaper
anymore.

## Palette

| Role | Value | Notes |
|---|---|---|
| Canvas (viewport, behind everything) | `#060A08` | ink-black with green undertone; carries the aurora |
| Canvas aurora | `radial-gradient(1200px 800px at 82% -10%, rgba(44,229,160,0.14), transparent 62%)` | one bloom only |
| Chrome glass (sidebar/topbar/band) | `rgba(8,12,10,0.78)` + `blur(28px) saturate(150%)` | the obsidian material |
| Chrome border | `rgba(255,255,255,0.08)` | hairline on black |
| Chrome seam light | `linear-gradient(180deg, transparent, rgba(44,229,160,0.45) 35%, rgba(44,229,160,0.10) 70%, transparent)` | 1px luminous edge, sidebar right + band bottom |
| Content plane (work surface) | `#FBFBF8` | gallery ivory — cool, not green-tinted |
| Card surface | `#FFFFFF` | L3 content cards |
| Elevated surface | `#FFFFFF` + modal shadow | modals, menus, drag layers |
| Inset well | `#F4F5F1` | form wells at rest, code/mono blocks |
| Text ink (primary) | `#0A0F0D` | 18.4:1 on ivory |
| Text secondary | `#3D4A44` | body copy |
| Text muted | `#69766F` | meta, helpers (≥4.5:1 on ivory) |
| Text on chrome | `#EDF2EE` @0.86 rest / 1.0 active | sidebar/topbar/band text |
| Primary action | `#0E1512` (ink) | filled buttons; hover `#1A2420` + jade underglow |
| Quiet interactive (light surfaces) | `#0B5C41` emerald ink | links, selected, tab text, section accents |
| **Signal — vital jade** | `#2CE5A0` | live/active/focus/glow/charts on dark; dots + rings on light; **never body text on white** |
| Signal text-safe (on light) | `#0B7A55` | when the signal must be read as text on ivory |
| Patient membership accent | `#E8C476` champagne | hairlines + plan-card band only; text-safe `#8A6420` |
| Doctor accent | `#4DD6E8` glacier | chrome-side accent; text-safe `#0E7490` |
| Success | fill `rgba(18,138,94,0.12)` · text `#0F6B49` · dot `#128A5E` | |
| Warning | fill `rgba(185,125,16,0.12)` · text `#8A5D0C` · dot `#B97D10` | |
| Danger | fill `rgba(196,69,61,0.10)` · text `#93332D` · dot `#C4453D` | |
| Info | fill `rgba(49,115,180,0.10)` · text `#245A8C` · dot `#3173B4` | |
| Live | dot `#2CE5A0` + halo `rgba(44,229,160,0.30)` | "happening now" only |
| Border (light surfaces) | `rgba(10,15,13,0.08)` | hairline |
| Border strong | `rgba(10,15,13,0.16)` | table header rule, hover |
| Border soft | `rgba(10,15,13,0.05)` | inner dividers |
| Hover wash (rows/items) | `rgba(44,229,160,0.06)` | |
| Focus ring | `rgba(44,229,160,0.45)` 3px | all focus-visible, both worlds |
| Shadow rest | `0 1px 2px rgba(6,10,8,0.05), 0 12px 32px rgba(6,10,8,0.07)` | |
| Shadow hover | `0 2px 4px rgba(6,10,8,0.06), 0 18px 44px rgba(6,10,8,0.11)` | |
| Shadow modal | `0 24px 80px rgba(4,8,6,0.45)` | |

## Recommended CSS variables

Extend the **existing** scoped block on `.gh-portal-shell`
(`globals.css:1750` already defines `--portal-bg`, `--portal-surface`,
`--portal-line`, `--portal-radius`, `--portal-shadow` — remap those names to
the new values and add the rest; do not create a parallel namespace):

```css
.gh-portal-shell {
  /* worlds */
  --portal-canvas: #060A08;
  --portal-bg: #FBFBF8;                        /* ivory work plane (was #f7f8f3) */
  --portal-surface: #FFFFFF;                   /* content card (was rgba white .92) */
  --portal-surface-elevated: #FFFFFF;
  --portal-well: #F4F5F1;                      /* form/mono inset */
  --portal-chrome: rgba(8, 12, 10, 0.78);      /* obsidian glass */
  --portal-chrome-solid: #0B100E;              /* no-blur fallback */
  --portal-chrome-border: rgba(255, 255, 255, 0.08);
  --portal-chrome-text: rgba(237, 242, 238, 0.86);
  --portal-chrome-text-active: #EDF2EE;

  /* text */
  --portal-text: #0A0F0D;
  --portal-text-2: #3D4A44;
  --portal-muted: #69766F;                     /* keep existing var name */

  /* action + signal */
  --portal-primary: #0E1512;                   /* ink action fill */
  --portal-primary-hover: #1A2420;
  --portal-emerald: #0B5C41;                   /* quiet interactive on light */
  --portal-signal: #2CE5A0;                    /* vital jade */
  --portal-signal-text: #0B7A55;               /* text-safe on ivory */
  --portal-signal-soft: rgba(44, 229, 160, 0.12);
  --portal-signal-glow: rgba(44, 229, 160, 0.30);

  /* role accents (overridden per portal below) */
  --portal-accent: var(--portal-signal);
  --portal-accent-text: var(--portal-signal-text);

  /* status */
  --portal-success: #128A5E;
  --portal-success-text: #0F6B49;
  --portal-warning: #B97D10;
  --portal-warning-text: #8A5D0C;
  --portal-danger: #C4453D;
  --portal-danger-text: #93332D;
  --portal-info: #3173B4;
  --portal-info-text: #245A8C;

  /* lines + interaction */
  --portal-line: rgba(10, 15, 13, 0.08);       /* keep existing var name */
  --portal-line-strong: rgba(10, 15, 13, 0.16);
  --portal-line-soft: rgba(10, 15, 13, 0.05);
  --portal-hover: rgba(44, 229, 160, 0.06);
  --portal-focus: rgba(44, 229, 160, 0.45);

  /* depth */
  --portal-blur-chrome: 28px;
  --portal-blur-overlay: 8px;
  --portal-shadow: 0 1px 2px rgba(6,10,8,0.05), 0 12px 32px rgba(6,10,8,0.07);
  --portal-shadow-hover: 0 2px 4px rgba(6,10,8,0.06), 0 18px 44px rgba(6,10,8,0.11);
  --portal-shadow-modal: 0 24px 80px rgba(4,8,6,0.45);

  /* geometry (existing names kept) */
  --portal-radius-sm: 8px;
  --portal-radius: 10px;
  --portal-radius-lg: 14px;
  --portal-radius-xl: 18px;
  --portal-radius-pill: 999px;
}
```

Per-portal accent override (one `data-portal` attribute on each shell root):

```css
[data-portal="admin"]   { --portal-accent: #2CE5A0; --portal-accent-text: #0B7A55; }
[data-portal="doctor"]  { --portal-accent: #4DD6E8; --portal-accent-text: #0E7490; }
[data-portal="patient"] { --portal-accent: #7BEBC1; --portal-accent-text: #0B7A55;
                          --portal-gold: #E8C476;  --portal-gold-text: #8A6420; }
```

`--portal-gold` exists **only** under `[data-portal="patient"]` and may be
consumed **only** by membership/rewards/subscribe surfaces.

### Why this palette is premium (and not "basic green healthcare")

- **Value contrast does the talking.** `#060A08` against `#FBFBF8` is a
  ~18:1 frame. No competitor healthcare portal runs this; most fintech
  flagships do.
- **Green is demoted to voltage.** One electric jade with strict semantics
  (alive/active/focus) + one deep emerald for quiet links. The brand hue is
  present in every session yet never covers a surface.
- **Black primary buttons** are the single highest-impact break from both
  the current portal and the old plan — instantly Linear/Stripe-class.
- **Champagne is scarce.** Gold appears on exactly one surface family
  (Patient membership), which is what makes it read as status.
- **Status tones are desaturated and text-contrast verified** (all text/fill
  pairs chosen ≥4.5:1 on their fills).

---

# Visual system

Construction recipes. Implementing agents copy these; they do not invent.
The binding component-level spec lives in `DESIGN.md` — this section defines
the system; DESIGN.md repeats it per component with exact rules.

### Background style

- `.gh-portal-shell` paints `--portal-canvas` + the single aurora radial,
  `background-attachment: fixed` behavior via a fixed pseudo-element.
- The ivory work plane is one continuous sheet (`--portal-bg`) inset from
  the canvas: visible obsidian frame of 16–28px at ≥1280px, 8px at ≥1024px,
  edge-to-edge below. **The frame must be visible on a 1280px laptop** —
  this fixes the old plan's invisible-drama bug.
- Kill `portal-ambient-texture.png` (`globals.css:1527,1772`) and the
  `#f7f8f3` wash. One optional raster (`A1`, §asset strategy) may sit
  between canvas and plane at ≤0.4 opacity.

### Surface + glass rules

| Layer | Material | Blur | Use |
|---|---|---|---|
| L0 canvas | `--portal-canvas` + aurora | none | viewport only |
| L1 chrome | `--portal-chrome` obsidian glass | 28px | sidebar, topbar, Command Band, mobile nav sheet, dark popovers |
| L2 plane | `--portal-bg` ivory, opaque | none | the page work surface |
| L3 card | `--portal-surface` white | none | cards, tables, forms, chat |
| L4 elevated | white + modal shadow | none | modals, menus |

- **Only L1 blurs.** Light surfaces never blur (fixes readability and GPU
  cost in one rule).
- Every chrome pane: 1px `--portal-chrome-border` + inset top highlight
  `inset 0 1px 0 rgba(255,255,255,0.05)`.
- Every L3 card: 1px `--portal-line` + inset top highlight
  `inset 0 1px 0 rgba(255,255,255,0.9)`.
- **Never nest chrome in chrome** except topbar-over-band (sanctioned).
- `@supports not (backdrop-filter: blur(1px))` → `--portal-chrome-solid`.
  `prefers-reduced-transparency` → same solid fallback.

### Gradient usage (sanctioned list — nothing else)

1. Canvas aurora (above).
2. Chrome seam light (1px vertical/horizontal luminous line).
3. Command Band numeral glow (`radial-gradient` behind the KPI numerals,
   `--portal-signal-glow`, ≤0.25 opacity).
4. Hero accent hairline (2px horizontal `linear-gradient(90deg,
   var(--portal-accent), transparent)` under the page title eyebrow).

No gradient fills on buttons, cards, pills, or text.

### Card style

- L3 recipe above; radius `--portal-radius-lg` (14px); padding 20–24px.
- Interactive cards: hover = border → `--portal-line-strong`, shadow →
  hover tier, translateY(-2px), plus a 0→24px accent underline sweep on the
  card title. Static info cards never move.
- Card headers use `SectionHeader` with a 3×16px rule in
  `--portal-accent-text`.
- Kill the PNG tint overlay and all `!important` card rules
  (`globals.css:1830–1888` region) per the phased order in §roadmap.

### Shell — sidebar

- Obsidian glass (L1) full height; width stays 272px
  (`--portal-sidebar-w`).
- Right edge: 1px `--portal-chrome-border` + the luminous seam gradient.
- Logo block unchanged; portal eyebrow label in `--portal-accent` @0.9.
- Nav items (CSS classes, delete the inline `onMouseEnter` style mutation in
  both shells): rest `--portal-chrome-text`; hover text→active-white + fill
  `rgba(255,255,255,0.05)`; **active = `--portal-signal-soft` fill on dark
  (`rgba(44,229,160,0.14)`), text `--portal-signal`, 3px signal left bar
  with 8px glow**. The inline `#D9F99D` (`portal-shell.tsx:424,458`,
  `admin-shell.tsx:630,677`) dies here.
- Badge counters: signal dot + halo when live/unread; neutral chip
  otherwise.
- Sidebar texture PNG (`globals.css:1555,1735`) retired — the aurora behind
  the glass does the work.

### Shell — topbar

- Obsidian glass strip, height 64px, sticky; bottom edge 1px chrome border;
  on scroll >8px the border gains the seam-light gradient (one class
  toggle — the only scroll-linked effect).
- Left: 20px portal glyph (rounded square filled `--portal-accent` @0.16,
  glyph in `--portal-accent`) + breadcrumb in `--portal-chrome-text`
  (last crumb active-white 700).
- Right: bell + user chip inside one bordered pill
  (`--portal-chrome-border`); unread = signal dot + halo.
- Admin country picker: chrome-glass pill trigger with flag + chevron;
  menu is an L4 white surface (light menus on dark chrome — deliberate
  world-crossing, like macOS).

### Command Band (new primitive — the signature)

- Full-width L1 obsidian panel at the top of each portal **dashboard only**,
  radius 18px, 24–28px padding, sits on the ivory plane.
- Left: greeting/context line (13px `--portal-chrome-text`) + page title
  (26–30px/800 ivory).
- Right: 3–5 metrics — label 10.5px caps `--portal-chrome-text` @0.6,
  numeral **44–56px/800 tabular** in ivory with `--portal-signal` for the
  single most important figure; numeral glow gradient behind.
- One live element max: jade tick + halo (next appointment countdown,
  live consultations counter).
- Implemented once in `atoms.tsx` as `CommandBand`; role pages feed it data.
- **This replaces** the old raster hero on the Admin dashboard
  (`admin-dashboard-clinical-wash.png` usage).

### Page header (hero) — non-dashboard pages

- Light, not glass: transparent on the ivory plane. Eyebrow (12px/800 caps
  `--portal-accent-text` with signal dot) → title `clamp(24px, 2vw, 34px)/800
  ink, −0.02em` → description ≤68ch muted.
- 2px accent hairline gradient under the eyebrow (sanctioned gradient 4).
- Admin per-area accents keep working via the existing area-hero hook but
  express only through the eyebrow/hairline color — all washes die.

### Buttons

- Radius 10px rounded-rect from token; the inline 999px in `atoms.tsx` and
  the 8px `!important` override both die together (see roadmap order).
- Variants:
  - `primary` — ink fill `--portal-primary`, ivory text; hover
    `--portal-primary-hover` + `0 4px 16px var(--portal-signal-glow)`
    underglow; press translateY(1px).
  - `secondary` — white fill, 1px `--portal-line-strong`, ink text.
  - `soft` — `--portal-signal-soft` fill, `--portal-signal-text` text.
  - `ghost` — transparent, ink text, hover well fill.
  - `danger` — `rgba(196,69,61,0.10)` fill, danger-text, danger border @0.4.
  - `on-chrome` — for buttons living on obsidian: transparent, 1px chrome
    border, chrome text; hover fill white @0.06.
- States: focus-visible = `--portal-focus` 3px ring; loading = 16px spinner
  replacing `iconLeft`, label persists; success flash = one border pulse in
  success tone after form saves.
- Shape law: **rounded-rect = action, pill = status.** No exceptions.

### Status pills

- One tokenized tone map consumed by **both** `Pill` (`atoms.tsx`
  `PILL_TONES`) and `.gh-badge-*`: `success | warning | danger | info |
  neutral | brand | live`.
- Anatomy: 999px, 11px/700 caps, 0.05em tracking, tone fill, tone text,
  optional 5px dot; `live` = jade dot + halo + neutral text (the only
  glowing pill).
- The two disagreeing palettes (atoms hex map vs CSS badges) merge in the
  same phase or the design ships two greens forever.

### Tables

- One construction: atom primitives; `.gh-admin-main table` descendant
  rules reduced to a safety net with identical values.
- Header: 11px/800 caps `--portal-muted`, transparent bg, 1px
  `--portal-line-strong` bottom rule.
- Rows: 52px comfortable / 44px dense via `data-density` on `<main>`
  (Admin dense; Doctor/Patient comfortable).
- Hover: `--portal-hover` wash + 2px `--portal-accent` inset left bar;
  row actions fade 0.55→1.
- Numerics right-aligned `tabular-nums`; IDs/order numbers in mono 12.5px.
- Below 760px: shared mobile card (below).

### Forms

- Field: 44px min-height, `--portal-well` fill at rest → white on focus,
  radius 10px, 1px `--portal-line`; focus = `--portal-accent-text` border +
  3px `--portal-focus` ring; error = danger border + danger ring + 12px
  danger helper replacing (never joining) the muted helper.
- Labels 12.5px/700 ink; helpers 12px muted.
- Field groups live in `FormSection` cards (new primitive): SectionHeader +
  2-col grid ≥900px, 1-col below.
- Rich text (`rich-text-html-field.tsx`) gets the same border/focus shell.
- Dropzones: dashed `--portal-line-strong`; dragover = dashed
  `--portal-accent` + `--portal-signal-soft` wash.

### Tabs

- One `PortalTabs` visual: 13px/700 labels, muted → ink active, 2px
  `--portal-accent` underline sliding transform-based; overflow scrolls with
  fade masks. Consolidates `plan-edit-tabs`, `*-translation-tabs`,
  `appointment-tabs`, profile `*-tab` headers, `faq-language-tabs`.

### Modals / dialogs

- L4 white, radius 18px, modal shadow; overlay = canvas color @0.55 +
  `blur(8px)`.
- Header/body/footer anatomy; primary action last. 560px default / 760px
  wide / full-height bottom sheet on mobile with grabber.
- One `PortalDialog` shell absorbs `confirm-delete-button`,
  `consultation-documents-modal`, `delete-account-button`,
  `EventDetailDialog`.
- Danger dialogs: title row carries a danger dot; destructive confirms use
  type-to-confirm where they already do (behavior preserved).

### Empty states

- Anatomy: ≤220px illustration slot (assets E-group) **or** 44px icon tile
  on `--portal-well`; 16px/800 ink title; 13.5px muted body ≤52ch; optional
  primary action. 48px vertical padding, centered.
- Restyle of `AdminEmptyState` — structure already correct.

### Loading states

- One shared kit: promote `admin/_components/skeletons.tsx` →
  `components/portal-skeletons.tsx` (re-export shim at old path).
- Shimmer: base `#EFF0EB`, sweep `rgba(255,255,255,0.75)` 1.6s ease-in-out;
  `prefers-reduced-motion` → static two-tone pulse.
- Kit shapes mirror real composition: command band, page header, stat grid,
  table (header + n rows), card, form section, calendar month, chat thread.
- Command Band skeleton is obsidian with shimmering numeral blocks — loading
  should already look expensive.

### Mobile cards

- New `PortalMobileCard` primitive: white card, 14px radius, title row +
  meta grid + status pill + trailing action; 3px status left edge.
- Replaces per-page `.gh-admin-mobile-card` bodies progressively; the
  responsive swap point stays 760px.

### Notification popover

- L4 white surface, radius 18px, from-bell scale origin; unread rows =
  signal dot + halo + `--portal-signal-soft` @0.5 tint; read rows plain;
  full-width soft "view all" footer.
- Bell badge on chrome = jade dot + halo (legitimate `live` signal).

### Chat surfaces

- Thread container: L3 card with `--portal-well` body so bubbles pop.
- Own message = ink fill `#10 1714`-family (use `--portal-primary`), ivory
  text; other party = white fill, ink text, 1px line; both 14px radius with
  4px tail corner. System/internal notes = dashed neutral chips centered.
- Composer: white elevated bar pinned bottom; send button `primary`
  (ink); disabled/closed states explain why in plain language.
- One bubble/thread core shared by `ChatThread`, `ConsultationChat`,
  `InternalMessagesThread`.

### Calendar surfaces

- `MonthCalendar`: L3 card; hairline-separated day cells; today =
  `--portal-accent` ring; selected = ink fill ivory text; event dots from
  the status tone map; weekend headers muted.
- `DayAgenda`: left timeline rail (1px line + jade "now" tick with halo —
  the one ambient animation, opacity 0.7↔1 over 3s); events as compact L3
  cards, times tabular.
- `EventDetailDialog` → `PortalDialog`. `TimezoneSelect` → form recipe.
- `calendar-utils.ts` / `calendar-types.ts` are logic — untouched.

### Payment / invoice cards

- Amounts always tabular; currency 0.7em; mono last-4 (`•• 4242`).
- Admin/ops framing: dense table + status pills. Patient framing: white
  cards with plain-language captions ("Paid · 12 Jun 2026 · Visa •• 4242")
  and one clear action. Same tokens, different markup owners.

### Document cards / tables

- Shared `DocumentTable` direction (Doctor `doctor-document-tables` +
  Patient `medical-files`): 32px file-kind icon tile on `--portal-well`,
  name + meta stack, status pill, trailing `IconBtn`s; review states from
  the tone map; consumer variant enlarges touch targets.

### Appointment cards

- Shared `AppointmentCard`: left time block (15px/800 tabular + tz meta),
  center person + service, right status pill + action; 3px status left
  edge; `live` = jade edge + halo while a consultation is in progress.

---

# Admin Portal design plan

Root: `frontend/app/(admin)/admin/**`. Feel: **operations command center** —
obsidian telemetry over ivory ledgers. Dense, fast, confident. Accent:
vital jade.

- **Dashboard (`/admin`)**: Command Band with today's appointments, unpaid
  orders, pending verifications, live consultations (jade live tick);
  country-scope chip inside the band. Below: stat grid
  `auto-fit minmax(240px,1fr)` (kills the 3-col orphan), quick-action cards,
  operations queues. The raster hero (`admin-dashboard-clinical-wash.png`
  usage) dies.
- **Appointments (list/`[id]`/`new`)**: dense table on `AppointmentCard`
  tones; unified pills; detail keeps single-column-under-1024; internal
  messages visually separated as dashed system chips; manual booking form →
  `FormSection`.
- **Orders (list/`[id]`)**: money tabular right-aligned; payment pills
  unified; `[id]` summary strip becomes a compact obsidian mini-band under
  the header; bulk-action bar becomes sticky elevated white bar when rows
  selected.
- **Doctors (list/`[id]`/edit/availability/services)**: profile header card
  with avatar tile, market flags, credential pills; edit tabs →
  `PortalTabs`; availability editor visual parity with Doctor portal's
  editor (same slot-chip recipe).
- **Patients**: privacy-first — muted meta, verification pills, GHN/document
  counts as icon+count chips.
- **Services (+ general-consultations / specialist-consultations /
  online-prescriptions delegating routes)**: keep delegation; kind-tinted
  icon tiles; price/duration tabular.
- **Countries / content / legal / country-features / footer / pages**: CMS
  forms → `FormSection` + `PortalTabs` for translations; legal docs →
  `DocumentTable`; flag badges unchanged.
- **Health tests**: services list recipe; FAQ panel → `PortalTabs`.
- **Blog / CMS / newsletter**: editorial rows — title + mono slug + status
  pill; rich-text gets the form shell.
- **Assets**: 32px thumbnail tile per row on `--portal-well`; upload
  dragover = jade dashed.
- **Plans / subscriptions / invoices / users**: money/counts tabular;
  `subscription-health-panel` becomes an obsidian telemetry strip (tone
  dots, luminous numerals); `subscriber-ledger` dense table; role pills
  (brand tone for SUPER_ADMIN).
- **Specialties / automation / audit log / calendar**: audit timestamps in
  mono; automation runs get status left-edge bars; calendar per shared
  restyle.
- **Loading / empty / error**: skeleton kit incl. band skeleton; §empty
  anatomy with E-group assets; **add portal-root `error.tsx`** (none exists
  today) using empty-state anatomy in danger tone.
- **Mobile**: table→`PortalMobileCard` progressively; Command Band stacks
  metrics 2-up; country picker collapses to flag chip.

---

# Doctor Portal design plan

Root: `frontend/app/(doctor)/doctor/**`. Feel: **clinical studio** — the
quietest portal. Same obsidian chrome; content calmer, larger line-height,
fewer competing accents. Accent: glacier `#4DD6E8`.

- **Dashboard (`/doctor`)**: Command Band = the "Now" instrument — next
  appointment time in 48px tabular numerals, patient + service, join
  action; if a consultation is live the band's tick and edge go jade-live.
  Below: today's schedule (comfortable `AppointmentCard`s), pending
  documents count, unread messages.
- **Appointments list**: comfortable rows, date-group headers
  (Today / Tomorrow / date), status pill + 3px edge.
- **Appointment detail (`[id]`) — the consultation workspace**: two-zone
  ≥1024px (left: consultation form + finalize checklist; right: patient
  context — profile summary, documents, chat). Tabs → `PortalTabs`.
  **Calm mode** while a consultation is live: hover lifts suppressed in the
  form zone, accents minimized, the only `primary` button on the page is
  sign/finalize.
- **Consultation workflow (consultation-form, finalize-checklist,
  appointment-actions)**: form recipe; checklist = check-tile rows
  (well → success tint when done).
- **Documents (review-send panel, lists, upload, modal)**: `DocumentTable`;
  modal → `PortalDialog`; dropzone recipe.
- **Chat / internal messages**: bubble core; staff notes = dashed neutral
  chips so clinical chat and internal notes cannot be confused.
- **Medical notes**: chart-like list — mono timestamps, author chip, note
  body on `--portal-well` inset.
- **Prescriptions / exam results**: `DocumentTable` rows with kind icons
  (Rx, lab); issued pills.
- **Availability (`availability-ui.tsx`)**: weekly slot-chip grid — well
  chip rest, accent-filled active, danger-soft blocked.
- **Calendar**: shared restyle; glacier accents the now-tick.
- **Patients (list/`[email]`)**: header card with initials tile, GHN mono,
  consult count; history timeline (date rail + compact cards); documents →
  `DocumentTable`.
- **Profile (+ `[country]`, edit-form, sections)**: `FormSection`;
  `LanguagePicker` accent chips; payout/bank framed with info-tone security
  note.
- **Services / invoices / reports / notifications / forms-templates**:
  check-tile selection grid; §payment framing; CSV as soft button + mono
  counts; unified notification list; template card grid.
- **Loading / empty / error**: kit + clinical empty assets; add root
  `error.tsx`.
- **Mobile**: consultation workspace stacks context-first (doctors review
  on mobile, write on desktop); sticky bottom bar for join/finalize during
  consultations.

---

# Patient/Account Portal design plan

Root: `frontend/app/(auth)/account/**` (no `(account)` group). Feel:
**private health atelier** — the warmest expression. Same obsidian chrome
(consistency = trust); ivory content, large type, card-first, one clear next
action per screen. Accent: soft jade `#7BEBC1`; champagne gold on membership
only.

- **Dashboard (`/account`)**: Command Band greets by first name; right side
  = next appointment (date/time large tabular, doctor, join/reschedule) or
  a single "Book a consultation" primary; live jade tick when a consult is
  imminent. Below: health-home chips (records / payments / membership) as
  tappable cards; `SubscriptionDashboard` cluster with plan pill + renewal
  in plain language.
- **Appointments / bookings (`/account/bookings`, `ui.tsx`)**: card-first,
  no tables — comfortable `AppointmentCard`s; past visits behind a
  "history" disclosure; payment-needed = warning card with one pay action;
  chat entries per bubble core; `SyncOrderPaymentOnReturn` behavioral —
  untouched.
- **Booking flow**: the portal links out to the public `/book` wizard; only
  the return/payment-sync states restyle as tone cards.
- **Orders / payments / invoices (`/account/orders`, `[id]`, `/payments`,
  receipt-button)**: consumer cards — "Paid · 12 Jun 2026 · Visa •• 4242"
  mono; receipts = soft buttons; refund states explained in one sentence
  plus a pill, not a pill alone.
- **Profile / settings tabs**: `PortalTabs`; each tab a `FormSection` card.
- **Verification / insurance / GDPR**: status-first — large tone card at
  top (success "Verified" / warning "Action needed: <exact missing item>");
  dropzone recipe; GDPR export/delete as info cards with consequences,
  delete через `PortalDialog` danger + type-to-confirm (existing behavior).
- **Medical files / documents**: `DocumentTable` consumer variant — big
  touch targets, kind icons, "shared by Dr. X" meta; E1 empty illustration.
- **Prescriptions / results**: Rx cards with issue date, doctor, one clear
  download.
- **Notifications**: unified list; unread jade dot; friendly empty state.
- **Membership / subscriptions / rewards (`/membership`, `ManagePanel`,
  `/rewards`, `RewardsPanel`, `/subscribe`, `SubscribeForm`)**: **the
  champagne surface.** Plan card gets an obsidian header band with a 1px
  champagne hairline and the plan name in ivory; benefits as icon + plain
  sentence rows; credits + wellness progress as a slim jade progress bar
  (the only progress bar in the system); recurring-charge consent card
  stays, info tone; pause/cancel in a quiet danger-soft cluster behind a
  disclosure.
- **Security / family / access-history**: delete via `PortalDialog` danger;
  access rows with mono timestamps (transparency = trust); family cards
  with relationship chips.
- **Loading / empty / error**: kit; warm empty assets; root `error.tsx`
  with reassuring copy + support link.
- **Mobile (primary platform)**: single column; sticky bottom action on
  payment-needed and subscribe; touch targets ≥44px; account nav sheet
  lists icon + description (patients navigate by recognition).

---

# Shared component redesign plan

Files and directions. **T** = requires the token block landed first.
Full per-component construction specs live in `DESIGN.md`.

| File | Direction | Risk | Notes |
|---|---|---|---|
| `frontend/app/(admin)/admin/_components/atoms.tsx` | The design system for all 3 portals. Move card/button/pill/stat visuals into token-driven CSS; delete dead StatCard decor + inline 999px radius; add `CommandBand`; unify `PILL_TONES` into the tone map | **High** | T. 794 lines today. Restyle = global. Markup/prop changes require consumer sweep (dependency map §9) |
| `frontend/components/portal-atoms.ts` | **No visual work ever.** Pure re-export stays byte-boring | pass-through **High** | Fork = instant Doctor/Patient design split |
| `frontend/app/globals.css` | Remap the existing `--portal-*` block (line 1750) to Obsidian Ivory values; add chrome/signal/status tokens; add `[data-portal]`/`[data-density]` hooks; retire texture PNG rules (1527, 1555, 1735, 1772); collapse the triple-layer `!important` fights in the ~1514–1891 region after replacements exist | **High** | 6232 lines, **shared with the public site** — stay inside `.gh-portal-shell` scope and portal `.gh-*` classes; `:root` and `.gh-btn-*`/`.gh-badge-*`/`.gh-eyebrow` leak to `(site)` |
| `frontend/app/(admin)/admin/_components/admin-shell.tsx` | Obsidian chrome, seam light, CSS-class nav states (delete inline hover mutators at 630/677), portal glyph, `data-portal="admin"` + `data-density="dense"`, chrome country-picker pill | **High** | Lockstep with portal-shell in the same commit |
| `frontend/components/portal-shell.tsx` | Same chrome recipe; delete inline `#D9F99D` at 424/458; `data-portal` from a new prop (`doctor`/`patient`), `data-density="comfortable"` | **High** | Hand-mirrored twin — any drift forks the portals |
| `frontend/components/NotificationPopover.tsx` | L4 white popover, jade unread dots + halo, soft view-all footer | Medium | Single file; safe once tokens exist |
| `frontend/components/calendar/**` | §calendar recipes for `MonthCalendar`, `DayAgenda`, `EventDetailDialog`, `TimezoneSelect` | **High** | One surface, three `/calendar` routes — verify all 3. `calendar-utils/-types` untouched |
| `frontend/components/chat/**` | One bubble/thread core per §chat; per-consumer disabled/closed semantics preserved | Medium | Each component spans ≥2 portals |
| `frontend/components/forms/phone-field.tsx` | Field recipe | **High** | **Escapes to public `(site)` checkout/consult/brazil-consent** — verify site after edit |
| `frontend/components/forms/LanguagePicker.tsx` | Field recipe + accent chips | Low | Doctor-scoped |
| New primitives | `CommandBand`, `PortalDialog`, `PortalTabs`, `FormSection`, `PortalMobileCard`, `AppointmentCard`, `DocumentTable`, unified notification list, promoted `components/portal-skeletons.tsx` | Medium | Introduce in atoms/components; consumers migrate per role phase |

**Risks that apply to every row:** behavior preservation (`Toggle` is a
submit button with `formAction`; chat send paths; country-picker server
action; `SyncOrderPaymentOnReturn`), the `.gh-admin-*` naming trap (classes
are global — renaming is a separate mechanical refactor, out of scope), and
the removal-order rule: **never delete an `!important` rule or inline style
until its token-driven replacement is live**, or dead styles (999px buttons,
12px cards, lime decor) resurface.

---

# Asset strategy and asset prompts

Principle: **the CSS must look finished with zero images.** Assets are
polish, not structure. All five legacy PNGs (`portal-ambient-texture`,
`portal-sidebar-texture`, `portal-header-wash`, `portal-card-tint`,
`portal-clinical-wash`) and `generated/*` wash usages are retired — their
jobs move to the canvas gradient and chrome glass. New assets live under
`frontend/public/images/portal/obsidian/`. All decorative
(`aria-hidden`, empty `alt`). **9 prompts total (3 required, 6 optional).**

Shared constraints baked into every prompt: no text, no letters, no numbers,
no logos, no watermarks, no UI elements, no screens, no people, no medical
gore, no needles/blood.

| # | Asset | File | Used where | Req? | Dimensions | Transparent |
|---|---|---|---|---|---|---|
| A1 | Canvas aurora | `canvas-aurora.webp` | between canvas and ivory plane, ≤0.4 opacity | **Required** | 2560×1440 | no (dark) |
| E1 | Patient records empty | `empty-records.png` | `/account/medical-files`, prescriptions empty | **Required** | 960×640 | yes |
| E2 | Clinical queue empty | `empty-queue.png` | Doctor appointments/patients empty | **Required** | 960×640 | yes |
| E3 | Documents empty | `empty-documents.png` | Doctor doc panels, Admin legal docs | Optional | 960×640 | yes |
| E4 | Payments empty | `empty-payments.png` | Patient payments/orders, Admin invoices | Optional | 960×640 | yes |
| E5 | Content empty | `empty-content.png` | Admin blog/pages/newsletter | Optional | 960×640 | yes |
| E6 | Membership glow | `membership-aura.png` | Patient membership plan-card band corner | Optional | 1200×480 | yes |
| C1 | Calendar empty | `empty-calendar.png` | empty month / no-events agenda | Optional | 960×640 | yes |
| B1 | Band grain | `band-sheen.webp` | Command Band top-edge sheen, ≤0.2 opacity | Optional | 1600×400 | no (dark) |

**A1 — `canvas-aurora.webp` (required), 16:9, 2560×1440, opaque:**
> Ultra-dark abstract background, near-black with a very subtle deep-green
> undertone (#060A08), one soft luminous aurora bloom of electric
> mint-green light (#2CE5A0) drifting in from the upper right corner and
> dissolving before the center, extremely smooth out-of-focus gradients,
> faint darker vignette in the lower corners, cinematic, premium
> technology-company atmosphere, no grain, no stars, no shapes, no text,
> no logos, no UI. Must stay dark enough for white text to be readable
> anywhere on it.

**E1 — `empty-records.png` (required), 3:2, 960×640, transparent:**
> Minimal abstract illustration of organized personal health records at
> rest: two overlapping matte ivory-white folder shapes with precise
> hairline dark edges, one thin electric mint-green line tracing the top
> folder's edge like a pulse, a small round badge shape resting on the
> corner, floating on a fully transparent background, flat-3D style with
> soft realistic shadows, premium minimal SaaS empty-state, gallery-white
> and ink-black palette with a single mint accent, no text, no letters,
> no logos, no faces, no medical instruments.

**E2 — `empty-queue.png` (required), 3:2, 960×640, transparent:**
> Minimal abstract illustration of a calm empty schedule: a matte white
> rounded panel with a precise grid of blank rounded tiles drawn in thin
> ink-black hairlines, one tile softly filled with luminous mint-green, a
> small abstract circular dial beside the panel without numbers or hands,
> floating on a transparent background, soft realistic shadows, premium
> minimal clinical SaaS empty-state, ivory / ink / single mint accent
> palette, no text, no numbers, no logos, no people.

**E3 — `empty-documents.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of documents at rest: three layered matte
> white sheets with rounded corners and thin ink-black hairline edges,
> slightly fanned, blank surfaces with faint gray tone bands suggesting
> paragraphs without readable content, the top sheet edged with a thin
> luminous mint-green highlight, floating on transparent background, soft
> shadows, premium minimal SaaS empty state, no text, no letters, no
> logos, no UI chrome.

**E4 — `empty-payments.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of finances at rest: one matte white
> rounded rectangle suggesting a blank receipt with faint gray tone bands,
> one smooth ink-black disc beside it like an abstract coin with a thin
> mint-green rim light, floating on transparent background, precise
> hairline edges, soft shadows, premium fintech-grade minimal empty state,
> no currency symbols, no numbers, no text, no logos.

**E5 — `empty-content.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of editorial content at rest: a blank
> matte white card with a soft gray image-placeholder rectangle and two
> blank tone bands beneath, a second smaller ink-black card peeking from
> behind with a thin mint-green edge light, floating on transparent
> background, precise hairlines, soft shadows, premium CMS empty state,
> no text, no letters, no icons, no logos.

**E6 — `membership-aura.png` (optional), 5:2, 1200×480, transparent:**
> Subtle abstract luxury accent on a fully transparent background: soft
> concentric arcs of warm champagne-gold light (#E8C476) at low opacity
> concentrated toward the right edge and fading to nothing, with one very
> faint mint-green thread woven through, extremely low contrast, smooth,
> premium private-membership feeling, decorative corner accent for a dark
> panel, no text, no logos, no hard edges, no sparkles.

**C1 — `empty-calendar.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of time at rest: a matte white rounded
> grid of blank square tiles drawn with thin ink hairlines suggesting a
> calendar month without numbers, one tile raised and filled with luminous
> mint-green, one thin orbital curve passing behind the grid in ink-black,
> transparent background, soft shadows, premium scheduling empty state,
> no text, no numbers, no logos.

**B1 — `band-sheen.webp` (optional), 4:1, 1600×400, opaque:**
> Very dark abstract horizontal banner texture, near-black (#0B100E) with
> an extremely subtle diagonal sheen of cooler dark tone crossing it and a
> faint mint-green glow entering from one end and fading within a third of
> the width, perfectly smooth, no grain, no shapes, no text, no logos,
> suitable as a barely-visible overlay on a dark glass dashboard panel.

---

# Implementation roadmap

Rules for every phase: never change server actions/fetchers/auth/i18n
wiring; run `npx tsc --noEmit`, frontend lint, and `npm run build` per
phase; render all three portals after any shared-file change; update the
dependency map §3/§9 when a shared dependency changes. One commit per
phase: `feat(portals): <phase summary>`.

| Phase | Files | What changes | Risk | Validation / acceptance |
|---|---|---|---|---|
| **1. Token foundation** | `frontend/app/globals.css` only | Remap the existing `--portal-*` block (line ~1750) to Obsidian Ivory values; add chrome/signal/status/focus tokens; add `[data-portal]`/`[data-density]` selectors; add canvas + ivory plane + chrome glass recipe classes; map today's hardcoded values (sidebar rgba, `#D9F99D`, `PILL_TONES` hexes, status colors) onto tokens **without changing atoms yet** | High blast radius, moderate visual delta (backgrounds shift) | tsc/lint/build; all 3 portals render; public `(site)` visually unchanged (`:root` untouched) |
| **2. Shells + chrome** | `admin-shell.tsx` + `portal-shell.tsx` (lockstep, same commit) + shell rules in `globals.css` + `NotificationPopover.tsx` | Obsidian sidebar/topbar, seam light, CSS-class nav states (delete inline hover mutators + `#D9F99D`), portal glyph, `data-portal`/`data-density` attributes, popover/user-menu restyle, chrome country picker | **High** | 3 portals + mobile nav + country picker + bell; keyboard nav; blur fallback (`@supports`); the identity lands here |
| **3. Atoms** | `atoms.tsx` + atom rules in `globals.css`; `portal-atoms.ts` untouched | Cards/buttons/pills/stats to token CSS; ink primary buttons; unified tone map (Pill + `.gh-badge-*` same phase); `CommandBand` primitive added; delete `!important` fights + dead decor **only after replacements live** | **High** | Representative page sweep per portal; check `(site)` for `.gh-btn` leakage |
| **4. Tables / forms / dialogs / tabs / skeletons** | `atoms.tsx` table prims; table/form rules; new `PortalDialog`/`PortalTabs`/`FormSection`; promote skeletons → `components/portal-skeletons.tsx` (+ shim) | §tables/§forms/§modals/§tabs/§loading; `.gh-admin-main` descendant selectors reduced to safety net | High | Density check dense vs comfortable; focus/error form states; modal focus trap; raw-`<table>` pages still styled |
| **5. Calendar + chat** | `components/calendar/*` (not utils/types); `components/chat/*` | §calendar + §chat recipes | Medium | All 3 `/calendar` routes; every chat consumer incl. disabled/closed states |
| **6. Admin pages** | `app/(admin)/admin/**` routes + `_components` | Command Band on dashboard; §admin per-area work; tabs→`PortalTabs`, forms→`FormSection`, mobile→`PortalMobileCard`; delete dashboard raster usage; add root `error.tsx` | Medium (route-scoped) | Admin sweep at 320/768/1280/1920 |
| **7. Doctor pages** | `app/(doctor)/doctor/**` | Now-band, calm mode, documents/notes/prescriptions, availability chips; root `error.tsx` | Medium | Full consultation workflow click-through |
| **8. Patient pages** | `app/(auth)/account/**` | Dashboard band, card-first bookings, consumer payments, profile tabs, champagne membership; root `error.tsx` | Medium | Mobile-first sweep 320/390/430 first |
| **9. Assets** | `globals.css` (canvas), empty-state `assetSrc` call sites | Wire generated assets; retire 5 legacy PNGs + `generated/*` washes; delete files only after `rg "images/portal" frontend/` shows zero refs | Low | Visual check with **and without** assets — CSS-only must look finished |
| **10. Responsive + a11y** | touched files only | 320–1920 sweep; AA contrast audit on all tone pairs; focus-visible audit; `prefers-reduced-*` + blur fallbacks; ≥44px touch on Patient | Low | Playwright screenshots at 320/768/1024/1440 per portal; axe pass |
| **11. Cleanup** | `globals.css`, docs | Delete superseded 1514-block rules; remove retired PNGs; update dependency map + this doc status | Medium (deletion) | `rg` dead classes/assets before delete; full gates; 3-portal render |

Sequencing: 1→4 strictly ordered; 5 parallel to 4; 6–8 independent after 4;
9 waits on generated assets; 10–11 last.

---

# High-risk files and safety notes

1. **`frontend/app/globals.css`** — 6232 lines, shared with the PUBLIC
   SITE. Portal work stays inside `.gh-portal-shell` scope and the portal
   `.gh-*` blocks (~1514+). `:root` tokens and `.gh-btn-*` / `.gh-eyebrow` /
   `.gh-badge-*` rules leak to `(site)` — check public pages after touching
   them.
2. **`frontend/app/(admin)/admin/_components/atoms.tsx`** — the design
   system for ALL THREE portals despite its path. Restyling is global by
   definition; changing props/markup requires sweeping every consumer.
   Never add admin-only behavior here.
3. **`frontend/components/portal-atoms.ts`** — pure re-export. Any styling
   or fork splits Doctor/Patient from Admin instantly. Keep byte-boring.
4. **`admin-shell.tsx` / `portal-shell.tsx` lockstep** — hand-mirrored
   twins sharing CSS classes. Every shell change ships to both in the same
   commit; a class rename in one silently breaks the other.
5. **Triple-layer style conflicts** — atom inline styles vs the 1514-block
   vs the v3 `!important` block (~1817–1891). Safe order: land tokens →
   move visuals to one CSS layer → then delete older layers. Deleting
   `!important` rules first re-exposes dead styles (999px buttons, 12px
   cards, lime decor spans).
6. **Shared calendar (`components/calendar/**`)** — one surface, three
   routes. `calendar-utils.ts`/`calendar-types.ts` are logic; verify all
   three `/calendar` routes after any edit.
7. **Shared chat (`components/chat/**`)** — each component spans ≥2 portals
   with different disabled/closed semantics. Restyle the core once; click
   through every consumer.
8. **`forms/phone-field.tsx` escapes the portals** into public
   checkout/consult/brazil-consent. Test `(site)` checkout after editing.
9. **Status pills — two palettes, one meaning.** `PILL_TONES`
   (`atoms.tsx`) and `.gh-badge-*` (CSS) must merge in the same phase or
   two "active" greens ship indefinitely.
10. **Hardcoded colors inventory** (replace only via token mapping):
    sidebar `rgba(18,54,39,0.96)` + v3 gradient; active nav `#D9F99D`
    (`portal-shell.tsx:424,458`, `admin-shell.tsx:630,677`); StatCard
    `#B0F122`/`#143B30`; Btn danger hex trio; the `PILL_TONES` map; body
    `#0f2e25 !important` (public-site shared — do not change in portal
    phases).
11. **`.gh-admin-*` shared classes are NOT admin-scoped** —
    `.gh-admin-main` wraps every portal's `<main>`. The rename to
    `.gh-portal-*` is a separate mechanical refactor; this redesign keeps
    existing class names.
12. **Texture/image references** — PNGs referenced at
    `globals.css:1527,1555,1735,1772` plus the Admin dashboard raster and
    `/account/medical-files` empty asset. Retire references first, delete
    files last, confirm with `rg "images/portal" frontend/`.
13. **Table descendant selectors** (`.gh-admin-main table/th/td`) style raw
    `<table>` elements on pages that never imported the atoms (Doctor
    reports, some Admin panes). Reducing them to a safety net requires
    checking those pages still render styled.
14. **Button descendant selectors** (`.gh-admin-main :where(button…)`)
    normalize raw buttons — audit raw `<button` usage in portal routes
    before weakening.
15. **Behavior preservation** — `Toggle` is a form-submitting button
    (`type="submit"` + `formAction`); `confirm-delete-button`,
    `SyncOrderPaymentOnReturn`, chat send paths, and country-picker
    `setCountryPreferenceAction` are behavioral. Restyle wrappers only;
    never change element types, form wiring, or handlers.
16. **Dark chrome contrast** — chrome text pairs (`--portal-chrome-text`
    on `--portal-chrome`) must be re-verified over the aurora asset at its
    brightest point, not just over flat canvas.

---

# Future AI implementation prompt

> Copy everything below into the implementation session when the redesign
> is approved and (optionally) assets have been generated.

You are implementing the **Obsidian Ivory** premium redesign for the Admin,
Doctor, and Patient portals of the Global Health platform, on branch
`Dev-hassaan`.

**Binding design spec:** `docs/portal-redesign/DESIGN.md`. Read it in full
before writing any code. This strategy file
(`docs/portal-redesign/premium-portal-redesign-strategy.md`) provides the
rationale and per-route direction; DESIGN.md provides the exact tokens,
recipes, and component rules. Where they differ, DESIGN.md wins.

**Design direction (summary):** ink-black canvas `#060A08` with one jade
aurora; obsidian glass chrome `rgba(8,12,10,0.78)` blur 28 (sidebar,
topbar, Command Band, mobile nav — the ONLY blurred material); gallery
ivory `#FBFBF8` work plane with white L3/L4 content cards (opaque, never
blurred); ink `#0A0F0D` text; **ink-black primary buttons** (`#0E1512`,
jade underglow on hover); emerald ink `#0B5C41` for quiet links/selection
on light; electric **vital jade `#2CE5A0`** strictly for
live/active/focus/glow/charts (never body text on white — use `#0B7A55`
when read as text); champagne gold `#E8C476` ONLY on Patient membership
hairlines; per-portal accents via `data-portal` (admin jade, doctor glacier
`#4DD6E8`, patient soft jade `#7BEBC1`); density via `data-density` (admin
dense, doctor/patient comfortable); one status tone map (success `#128A5E`,
warning `#B97D10`, danger `#C4453D`, info `#3173B4`, live=jade glow);
radius law 10/14/18/999; shadows rest/hover/modal only; the **Command
Band** (obsidian KPI band with 44–56px luminous tabular numerals) opens
every dashboard.

**Inspect before editing (in order):**
1. `docs/portal-redesign/portal-shared-ui-dependency-map.md` (mandatory)
2. `docs/portal-redesign/DESIGN.md` (binding spec)
3. `frontend/app/globals.css` (`:root` 31–162 — public-shared, do not
   touch; portal blocks ~1514+; existing `--portal-*` vars at ~1750 —
   remap, do not duplicate)
4. `frontend/app/(admin)/admin/_components/atoms.tsx`
5. `frontend/components/portal-shell.tsx` and
   `frontend/app/(admin)/admin/_components/admin-shell.tsx` (mirrors;
   inline `#D9F99D` at 424/458 and 630/677 must die via tokens)
6. `frontend/components/NotificationPopover.tsx`,
   `frontend/components/calendar/**`, `frontend/components/chat/**`,
   `frontend/components/forms/phone-field.tsx` (public-site escape)

**Edit order (roadmap phases — do not reorder 1→4):** tokens →
shells+chrome (lockstep) → atoms (incl. `CommandBand`, unified tone map) →
tables/forms/dialogs/tabs/skeletons → calendar+chat → Admin → Doctor →
Patient → assets → a11y sweep → cleanup.

**Hard rules:**
- Every color/radius/shadow/blur you write is a `var(--portal-*)`
  reference. Missing token → add it to the shell block, never inline hex.
- Never delete an `!important` rule or inline style until its token-driven
  replacement is live.
- Both shells change in the same commit, always.
- `portal-atoms.ts` stays a pure re-export.
- No changes to server actions, fetchers, auth, i18n, form
  `action`/`formAction` wiring, `Toggle` submit semantics,
  `SyncOrderPaymentOnReturn`, or route structure.
- Keep all existing class names (`gh-admin-*` rename is out of scope).
- CSS-only rendering (no images) must look finished; assets are polish.

**Validation per phase (all must pass before the next):**
```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```
Then render `/admin`, `/doctor`, `/account` (plus one list + one detail
page each) at 320/768/1280/1920. Verify the public `(site)` homepage and
checkout after any phase that touches `globals.css` shared rules or
`phone-field.tsx`.

**Commits:** one per phase, `feat(portals): <phase summary>`. Update
`docs/portal-redesign/portal-shared-ui-dependency-map.md` §3/§9 in the same
commit as any shared-dependency change.

---

*End of strategy. Written 2026-07-02 on branch `Dev-hassaan`. Companion
docs: `DESIGN.md` (binding design spec),
`portal-shared-ui-dependency-map.md` (master dependency reference),
`admin-portal-audit.md`, `doctor-portal-audit.md`,
`patient-portal-audit.md`, `shared-components-audit.md`,
`verification-results.md`.*
