# Premium Portal Redesign Strategy — "Obsidian Ivory"

> **Status:** Design strategy + implementation-ready documentation only. No code
> was changed to produce this file. This document **replaces** the previous
> "Meridian Glass" strategy in full.
>
> **Palette rule (binding):** every color in this system derives from the five
> Manual da Marca brand anchors — forest `#1D4B36`, mint `#8FB021`, lime
> `#B0F122`, white `#FFFFFF`, gray `#6D6D6D` — plus neutrals mixed from them.
> No foreign hues (no cyan, no gold, no violet). Functional status colors
> (warning/danger/info) are the single sanctioned exception, desaturated to
> sit quietly next to the brand greens.
>
> **Scope:** Admin Portal (`frontend/app/(admin)/admin/**`), Doctor Portal
> (`frontend/app/(doctor)/doctor/**`), Patient/Account Portal
> (`frontend/app/(auth)/account/**`) — one shared design system, three
> role-tuned expressions.
>
> **Read first:** `docs/portal-redesign/portal-shared-ui-dependency-map.md`
> (master dependency reference) and `docs/portal-redesign/DESIGN.md`
> (binding design-system spec for implementing agents — wins on conflict).
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
   forest canvas, the same porcelain work plane, and re-weights the same
   colors slightly. A user who saw the old portal would recognize the new
   one instantly. That is polish, not a statement.
2. **Green is used as wallpaper, not as a voice.** Forest surfaces, mint
   dots, jade hovers, lime dots — four greens covering everything means no
   green means anything. Premium products run a disciplined neutral field
   with the brand color deployed as a *signal*.
3. **The dark canvas is wasted.** The deep forest gradient only ever shows
   as a "0–24px breathing edge" at ≥1500px viewports. The single most
   dramatic element of the design is invisible on a 13–14" laptop — which
   is what an investor demo runs on. Drama that only exists at 1500px+ is
   not drama.
4. **Primary actions are mid-green fills on green-tinted porcelain** —
   exactly what the current portal does. The old plan's "what visibly
   changes" table is honest about this: mostly recolors and shadow cleanup.
5. **No signature moment.** Stripe has the gradient. Linear has the glow.
   Apple has the material. Meridian Glass has… a jade hover state. Nothing
   a user would screenshot, no composition that could open a pitch deck.
6. **Typography is timid.** "Keep one family, weights 500/700/800" produces
   the same texture the portal has today. Premium SaaS is carried by scale
   contrast and numeric display treatment; the old plan's largest type is a
   36px stat numeral.
7. **It invented an off-brand accent.** Jade `#2E9E77` is not in the Manual
   da Marca. The brand already owns an electric color — lime `#B0F122` —
   and the old plan demoted it instead of weaponizing it.

### Why it would still look ordinary

Because every decision minimizes distance from the current UI. Same hue
coverage, same plane, same chrome geometry, same component shapes with
better tokens. The result would be *cleaner*, and cleaner is not the brief.
The brief is expensive, sharp, memorable.

### Verdict

**Replace the visual direction entirely. Keep the engineering skeleton**
(tokens-first phasing, lockstep shells, risk registry, validation gates).

---

# Three alternative premium design concepts

Three genuinely different directions were developed before choosing. None is
a variation of Meridian Glass. All three respect the brand-palette rule.

---

## Concept A — "Obsidian Ward" (dark luxury clinical command center)

- **Mood:** a private surgical suite at night. Bloomberg-terminal authority
  crossed with dark-luxury hospitality. Serious, quiet, powerful.
- **Color direction:** true dark UI everywhere. Forest-black `#0A140E`
  canvas, graphite-green `#14211A` surfaces, warm off-white text `#F2F3EE`,
  lime `#B0F122` as the only luminous signal, mint `#8FB021` for secondary
  telemetry.
- **Background:** near-black with an ultra-subtle lime aurora in the top
  corner; grain-free, cinematic vignette.
- **Glass/depth:** dark glass on darker glass; depth from luminous 1px edges
  and soft lime underglows rather than shadows.
- **Cards:** graphite-green panels, 1px `rgba(255,255,255,0.07)` border,
  inner top highlight, luminous accent bar on active.
- **Sidebar/topbar:** dissolve into the canvas — chrome and page are one
  continuous dark instrument; nav items glow lime when active.
- **Buttons:** lime-filled primary glowing softly; ghost buttons with
  luminous borders.
- **Tables:** dark rows, hairline separators, lime telemetry numerals in
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
  needs a dark-safe rebuild; white medical PDFs punch holes in the
  composition.

---

## Concept B — "Obsidian Ivory" (forest-black glass chrome · gallery-ivory content · lime voltage)

- **Mood:** a private clinic designed by a Swiss architecture firm. Gallery
  white where you read; forest-black glass where the machine lives; the
  brand's own electric lime connecting them as a live signal.
  Linear/Stripe-grade sharpness with clinical calm.
- **Color direction:** two worlds, hard contrast — built entirely from the
  five brand anchors. Chrome world: forest-black glass
  `rgba(9,20,14,0.80)` over a `#07120C` canvas (forest `#1D4B36` driven to
  near-black) with a lime aurora. Content world: gallery ivory `#FAFBF7`
  and pure white `#FFFFFF` cards with ink-forest `#101713` text and brand
  gray `#6D6D6D` for muted meta. **Primary buttons are brand forest
  `#1D4B36`** on a neutral field — the anchor color finally reads as *the*
  action color because nothing else competes with it. Lime `#B0F122`
  becomes **voltage**: live signals, active nav on dark, focus rings,
  glows, chart lines, the hero metric — never a surface, never body text
  on white (text-safe derivative: deep olive `#4E6B10`). Mint `#8FB021` is
  the quiet secondary — eyebrows, section rules, chart series 2, the
  Doctor accent.
- **Background:** viewport canvas is forest-black with one lime aurora
  bloom; the ivory work plane floats on it as a single continuous sheet
  with a visible dark frame on ≥1280px (not 1500px — the drama must
  survive a laptop).
- **Glass/depth:** dark glass is the only blurred material (sidebar,
  topbar, Command Band, mobile nav sheet). Light surfaces are opaque;
  depth on light comes from 1px inner highlights + two shadow tiers.
- **Cards:** white, radius 14, hairline ink border, inset top highlight;
  interactive cards lift 2px with a faint lime underglow.
- **Sidebar/topbar:** forest-black glass; sidebar carries a 1px luminous
  lime edge-light on its content seam; active nav item = lime text + lime
  left bar + soft glow. Topbar is a dark glass strip with the portal
  glyph, breadcrumb in ivory text, bell + user chip in one bordered pill.
- **Signature moment:** the **Command Band** — every dashboard opens with a
  full-width forest-black glass panel: greeting/context on the left, 3–5
  huge luminous tabular numerals (44–56px) on the right, the hero metric
  in lime, one live tick. Dark band over ivory page = the screenshot.
- **Buttons:** forest-filled primary (lime underglow on hover), white
  secondary, mint-soft, ghost, danger-soft. Shape law: 10px rounded-rect
  actions, 999px pills for status only.
- **Tables:** white container, ink 11px caps headers, hairline rules, mint
  row-hover wash + 2px accent inset bar; numerics right-aligned tabular.
- **Forms:** off-white wells on white cards, ink labels, mint focus ring,
  danger states in desaturated clinical red.
- **Role feel:** Admin = operations command (dark chrome + dense telemetry,
  lime accent). Doctor = focused clinical studio (same chrome, calmer
  content, mint accent). Patient = private health home (same chrome,
  warmer ivory, pale-lime accent, card-first, large type; membership
  surfaces get a pale "lime silk" hairline — quiet luxury from the brand's
  own family).
- **Why premium:** maximum value contrast (the #1 shared trait of Linear,
  Stripe, Vercel); forest-black chrome reads tech-luxury while literally
  being the brand color; ivory reads clinical-clean; electric lime against
  a disciplined neutral field is unmistakably *this brand* — no other
  telehealth product owns that color.
- **Risks:** dark chrome must be executed with hairline precision or it
  reads heavy; lime must stay signal-only or the design collapses into
  neon; needs a real blur fallback for old GPUs.

---

## Concept C — "Ledger Mint" (finance-grade light dashboard adapted to healthcare)

- **Mood:** a premium accounting platform for medicine. Entirely light,
  entirely neutral, obsessively typographic. Notion/Mercury-like calm.
- **Color direction:** paper white `#FFFFFF` + warm neutral `#F5F5F2`
  panels, ink `#111512` text, brand gray `#6D6D6D` meta everywhere; forest
  `#1D4B36` only for primary buttons and links; mint `#8FB021` hairline
  accents; lime reserved for a single "live" dot.
- **Background:** flat paper; no canvas, no glass, no dark chrome.
- **Glass/depth:** none — depth from typography, hairlines, and generous
  whitespace only.
- **Cards:** borderless surfaces separated by hairlines and spacing;
  section numbers in huge light-gray numerals as ornament.
- **Sidebar/topbar:** white sidebar with ink text and a mint active bar;
  topbar merges into the page.
- **Buttons:** forest primary, everything else ghost/text.
- **Tables:** editorial — generous row height, strong typographic
  hierarchy, no zebra, no chrome.
- **Forms:** underline-style inputs, floating labels.
- **Role feel:** Admin = ledgers (excellent). Doctor = quiet chart
  (good). Patient = clean but potentially clinical-cold; the least
  differentiated of the three concepts.
- **Why premium:** restraint at this level reads expensive to design-literate
  audiences; ages the slowest.
- **Risks:** to everyone else it reads *plain*; zero theatrical moment for
  demos; the brand's most distinctive asset (lime) is nearly absent; hardest
  to make memorable — high chance of "looks like Notion with green buttons."

---

# Final chosen design direction

## Chosen: **Concept B — "Obsidian Ivory"**

### Why (decision, not a vote)

1. **Highest premium-per-risk.** It delivers Concept A's dark-luxury drama
   in the chrome — where contrast is easy to hold and no medical text
   lives — while keeping every reading surface light. Patients get warmth
   and legibility; investors get the dark-glass screenshot. Concept A pays
   for its drama with 40+ dark patient surfaces; Concept C pays with
   forgettability. B pays almost nothing.
2. **It is the most brand-true option on the table.** The chrome *is*
   forest, driven to near-black. The voltage *is* lime, the brand's most
   distinctive color, finally given a meaning (alive/active/now) instead of
   being decoration. Mint gets a real job (quiet interactivity). Gray
   `#6D6D6D` anchors the neutral scale. Nothing foreign enters the system.
3. **It finally breaks "green wallpaper."** Surfaces go neutral
   (ivory/white/ink); green appears only where it *means* something —
   forest = action, mint = quiet accent, lime = live. Scarcity is what
   makes brand color premium.
4. **It has a signature.** The Command Band (dark panel, luminous lime
   numerals, live tick) is a repeatable, ownable composition that opens
   every dashboard and every pitch deck.
5. **It maps 1:1 onto the existing architecture.** Two shells → dark
   chrome recipe. Porcelain plane → ivory plane. Same phased rollout, same
   token surface, same lockstep rules. Nothing in the dependency map
   fights this direction.
6. **Role differentiation is built in, cheaply.** One `data-portal`
   attribute swaps the accent (lime / mint / pale-lime) and the Command
   Band content. Three temperaments, one system.

---

# Final design vision

- **Concept name:** **Obsidian Ivory**
- **One-line design statement:** A forest-black glass instrument frame
  around a gallery-white clinical workspace, connected by the brand's own
  electric lime as a living signal.
- **Mood:** precision, quiet power, private care. A Swiss gallery that
  happens to run a hospital. Never playful, never sterile — *engineered
  calm*.
- **Design principles:**
  1. **Two worlds, one seam.** Chrome is forest-black; content is ivory.
     The 1px luminous seam between them is sacred — it is the brand.
  2. **Green is a language, not a wallpaper.** Forest = action. Mint =
     quiet accent. Lime = alive/now. Nothing else is green; surfaces are
     neutral.
  3. **Contrast is the luxury.** Near-black against near-white does the
     talking; ornament is deleted, not added.
  4. **Numbers are the decoration.** Large luminous tabular numerals are
     the only ornament the system needs. No washes, no texture PNGs, no
     decor spans.
  5. **Blur lives in the chrome.** Reading surfaces are opaque, always.
  6. **One radius language.** 10px actions, 14px cards, 18px band/modals,
     999px status pills. Shape = meaning.
  7. **Motion states facts.** 120/200/280ms, transform/opacity only,
     nothing bounces.
- **Why it feels premium:** hard value contrast is the most reliable luxury
  cue in UI; hairline borders + inner highlights read machined; one
  electric accent against a disciplined neutral field reads intentional;
  the brand's loudest color appearing only at moments of life makes it
  feel engineered, not decorated.
- **Why it fits healthcare:** all medical reading happens on ivory/white at
  ≥15:1 contrast; "vital sign" semantics for lime are native to medicine;
  dark chrome frames rather than dominates; patient surfaces stay warm,
  large-type, card-first.
- **What makes it visually stronger than the old plan:** the old plan's
  strongest element (deep canvas) was invisible below 1500px and its accent
  system was four interchangeable greens. Obsidian Ivory makes the dark
  world permanent chrome (visible at every width), replaces green-on-green
  with neutral-field + three-meaning green language, adds a signature
  composition (Command Band), and doubles the typographic scale range
  (11px caps → 56px luminous numerals).

---

# Premium color system

**Binding rule:** brand anchors + derivatives + neutrals only. Full
derivation table in `DESIGN.md` §2.

## Brand anchors (Manual da Marca — untouchable)

| Anchor | Hex | RGB | System role |
|---|---|---|---|
| Forest | `#1D4B36` | 29, 75, 54 | primary action color; parent of all dark neutrals |
| Mint | `#8FB021` | 143, 176, 33 | quiet accent: eyebrows, section rules, hovers, focus, Doctor accent |
| Lime | `#B0F122` | 176, 241, 34 | voltage: live/active/glow/hero-metric; never a surface |
| White | `#FFFFFF` | 255, 255, 255 | card surface |
| Gray | `#6D6D6D` | 109, 109, 109 | muted text anchor |

## Derived palette

| Role | Value | Derived from | Notes |
|---|---|---|---|
| Canvas (viewport) | `#07120C` | forest → near-black | carries the aurora |
| Canvas aurora | `radial-gradient(1200px 800px at 82% -10%, rgba(176,241,34,0.12), transparent 62%)` | lime | one bloom only |
| Chrome glass | `rgba(9,20,14,0.80)` + `blur(28px) saturate(140%)` | forest-black | sidebar/topbar/band |
| Chrome solid fallback | `#0C1A12` | forest-black | no-blur devices |
| Chrome border | `rgba(255,255,255,0.08)` | white | hairline on dark |
| Chrome seam light | 1px `linear-gradient(180deg, transparent, rgba(176,241,34,0.45) 35%, rgba(176,241,34,0.10) 70%, transparent)` | lime | sidebar right edge, band bottom |
| Content plane | `#FAFBF7` | white + forest 2% | gallery ivory |
| Card surface | `#FFFFFF` | anchor | L3 |
| Inset well | `#F2F4EE` | white + forest 5% | form wells, icon tiles, mono blocks |
| Text ink | `#101713` | forest-black neutral | 17.4:1 on ivory |
| Text secondary | `#3C463F` | ink + gray | body copy |
| Text muted | `#6D6D6D` | anchor | meta, helpers (4.9:1 on white) |
| Text on chrome | `#E9EFE9` @0.86 rest / 1.0 active | white | |
| Primary action | `#1D4B36` | anchor | buttons, links-as-buttons; hover `#163A29` |
| Quiet interactive | `#8FB021`-family: text-safe `#5E7516` | mint | links, selected, tab underline text |
| **Signal (voltage)** | `#B0F122` | anchor | live/active-on-dark/focus glow/chart-1/hero numeral; **never body text on white** |
| Signal text-safe | `#4E6B10` | lime darkened | lime "read" as text on light (6.1:1) |
| Signal soft | `rgba(176,241,34,0.14)` | lime | active-nav fill on dark, live pill fill |
| Signal glow | `rgba(176,241,34,0.30)` | lime | halos, underglows, numeral bloom |
| Member accent (Patient) | `#E3F5B0` hairline · text `#5E7516` | lime tint | membership/rewards/subscribe only — "lime silk" |
| Success | fill `rgba(31,122,74,0.12)` · text `#1F5B3D` · dot `#2F7D4E` | forest+mint | brand-family green |
| Warning | fill `rgba(176,124,26,0.12)` · text `#7A5610` · dot `#B07C1A` | functional | desaturated amber |
| Danger | fill `rgba(188,74,66,0.10)` · text `#8E332C` · dot `#BC4A42` | functional | desaturated clinical red |
| Info | fill `rgba(86,112,122,0.12)` · text `#3F565F` · dot `#56707A` | gray+forest | slate-neutral, near-gray |
| Border | `rgba(16,23,19,0.08)` | ink | hairline on light |
| Border strong | `rgba(16,23,19,0.16)` | ink | table header rule, hover |
| Border soft | `rgba(16,23,19,0.05)` | ink | inner dividers |
| Hover wash | `rgba(143,176,33,0.08)` | mint | rows, list items |
| Focus ring | `rgba(143,176,33,0.65)` 3px | mint | all focus-visible, both worlds |
| Shadow rest | `0 1px 2px rgba(7,18,12,0.05), 0 12px 32px rgba(7,18,12,0.07)` | canvas | |
| Shadow hover | `0 2px 4px rgba(7,18,12,0.06), 0 18px 44px rgba(7,18,12,0.11)` | canvas | |
| Shadow modal | `0 24px 80px rgba(5,12,8,0.45)` | canvas | |

## Recommended CSS variables

Extend the **existing** scoped block on `.gh-portal-shell`
(`globals.css:1750` already defines `--portal-bg`, `--portal-surface`,
`--portal-line`, `--portal-radius`, `--portal-shadow` — remap those names to
the new values and add the rest; do not create a parallel namespace). The
complete authoritative block lives in `DESIGN.md` §3 — summary:

```css
.gh-portal-shell {
  --portal-canvas: #07120C;
  --portal-bg: #FAFBF7;
  --portal-surface: #FFFFFF;
  --portal-well: #F2F4EE;
  --portal-chrome: rgba(9, 20, 14, 0.80);
  --portal-chrome-solid: #0C1A12;
  --portal-text: #101713;
  --portal-text-2: #3C463F;
  --portal-muted: #6D6D6D;
  --portal-primary: #1D4B36;
  --portal-primary-hover: #163A29;
  --portal-mint: #8FB021;
  --portal-mint-text: #5E7516;
  --portal-signal: #B0F122;
  --portal-signal-text: #4E6B10;
  --portal-signal-soft: rgba(176, 241, 34, 0.14);
  --portal-signal-glow: rgba(176, 241, 34, 0.30);
  --portal-focus: rgba(143, 176, 33, 0.65);
  /* …status, lines, shadows, radii — see DESIGN.md §3 */
}

[data-portal="admin"]   { --portal-accent: #B0F122; --portal-accent-text: #4E6B10; }
[data-portal="doctor"]  { --portal-accent: #8FB021; --portal-accent-text: #5E7516; }
[data-portal="patient"] { --portal-accent: #CFEC81; --portal-accent-text: #4E6B10;
                          --portal-member: #E3F5B0; --portal-member-text: #5E7516; }
```

`--portal-member` exists **only** under `[data-portal="patient"]` and may be
consumed **only** by membership/rewards/subscribe surfaces.

### Why this palette is premium (and not "basic green healthcare")

- **Value contrast does the talking.** `#07120C` against `#FAFBF7` is a
  ~17:1 frame — and the dark side literally *is* the brand forest.
- **Green becomes a three-word language.** Forest = act. Mint = notice.
  Lime = alive. Because surfaces are neutral, each green reads as a
  deliberate statement instead of ambient wallpaper.
- **Lime is finally weaponized.** The brand's most distinctive asset stops
  decorating stat tiles and starts meaning "something is happening right
  now" — a vital sign. No competitor owns that color.
- **The neutral scale is brand-derived.** Ink `#101713` and the wells carry
  a 2–5% forest undertone; gray `#6D6D6D` is the literal brand gray. Even
  the neutrals are on-brand.
- **Status tones are desaturated and text-contrast verified** (all text/fill
  pairs ≥4.5:1 on their fills); info is deliberately near-neutral slate so
  the only saturated colors on screen are brand greens and true alerts.

---

# Visual system

Construction recipes. Implementing agents copy these; they do not invent.
The binding component-level spec lives in `DESIGN.md` §5 — this section
defines the system.

### Background style

- `.gh-portal-shell` paints `--portal-canvas` + the single lime aurora via
  a fixed pseudo-element.
- The ivory work plane is one continuous sheet (`--portal-bg`) inset from
  the canvas: visible dark frame of 16–28px at ≥1280px, 8px at ≥1024px,
  edge-to-edge below. **The frame must be visible on a 1280px laptop.**
- Kill `portal-ambient-texture.png` (`globals.css:1527,1772`) and the
  `#f7f8f3` wash. One optional raster (`A1`, §asset strategy) may sit
  between canvas and plane at ≤0.4 opacity.

### Surface + glass rules

| Layer | Material | Blur | Use |
|---|---|---|---|
| L0 canvas | `--portal-canvas` + aurora | none | viewport only |
| L1 chrome | `--portal-chrome` dark glass | 28px | sidebar, topbar, Command Band, mobile nav sheet |
| L2 plane | `--portal-bg` ivory, opaque | none | the page work surface |
| L3 card | `--portal-surface` white | none | cards, tables, forms, chat |
| L4 elevated | white + modal shadow | none | modals, menus |

- **Only L1 blurs.** Light surfaces never blur.
- Every chrome pane: 1px `--portal-chrome-border` + inset top highlight
  `inset 0 1px 0 rgba(255,255,255,0.05)`.
- Every L3 card: 1px `--portal-line` + inset top highlight
  `inset 0 1px 0 rgba(255,255,255,0.9)`.
- **Never nest chrome in chrome** except topbar-over-band (sanctioned).
- `@supports not (backdrop-filter: blur(1px))` → `--portal-chrome-solid`.
  `prefers-reduced-transparency` → same solid fallback.

### Gradient usage (sanctioned list — nothing else)

1. Canvas aurora.
2. Chrome seam light (1px luminous line).
3. Command Band numeral glow (`radial-gradient` behind the hero numeral,
   `--portal-signal-glow`, ≤0.25 opacity).
4. Hero accent hairline (2px `linear-gradient(90deg, var(--portal-accent),
   transparent)` under the page-title eyebrow).

No gradient fills on buttons, cards, pills, or text.

### Card style

- L3 recipe; radius 14px; padding 20–24px.
- Interactive cards: hover = border → strong, shadow → hover tier,
  translateY(-2px), 0→24px accent underline sweep on the card title.
  Static info cards never move.
- Card headers use `SectionHeader` with a 3×16px `--portal-mint` rule.
- Kill the PNG tint overlay and all `!important` card rules per the phased
  order.

### Shell — sidebar

- Dark glass (L1) full height; width stays 272px (`--portal-sidebar-w`).
- Right edge: 1px chrome border + the luminous lime seam gradient.
- Nav items (CSS classes — delete the inline `onMouseEnter` mutation in
  both shells): rest `--portal-chrome-text`; hover white-active + fill
  `rgba(255,255,255,0.05)`; **active = `--portal-signal-soft` fill, text
  `--portal-signal`, 3px lime left bar with 8px glow**. The inline
  `#D9F99D` (`portal-shell.tsx:424,458`, `admin-shell.tsx:630,677`) dies
  here.
- Badge counters: lime dot + halo when live/unread; neutral chip otherwise.
- Sidebar texture PNG (`globals.css:1555,1735`) retired.

### Shell — topbar

- Dark glass strip, 64px, sticky; bottom 1px chrome border; on scroll >8px
  the border swaps to the seam-light gradient (one class toggle — the only
  scroll-linked effect).
- Left: 20px portal glyph (rounded square, accent @16% fill, accent glyph)
  + breadcrumb in chrome text (last crumb active-white 700).
- Right: bell + user chip inside one bordered pill; unread = lime dot +
  halo.
- Admin country picker: chrome pill trigger; menu = L4 white surface.

### Command Band (new primitive — the signature)

- Full-width L1 dark glass panel at the top of each portal **dashboard
  only**, radius 18px, 24–28px padding, sits on the ivory plane.
- Left: context line (13px chrome text) + title (26–30px/800 ivory).
- Right: 3–5 metrics — label 10.5px caps @0.6, numeral **44–56px/800
  tabular** in ivory; the single most important numeral renders in
  `--portal-signal` with the glow gradient behind.
- One live element max: lime tick + halo.
- Implemented once in `atoms.tsx` as `CommandBand`; role pages feed data.
- **Replaces** the raster hero on the Admin dashboard
  (`admin-dashboard-clinical-wash.png` usage).

### Page header (hero) — non-dashboard pages

- Light, not glass: transparent on the ivory plane. Eyebrow (12px/800 caps
  `--portal-accent-text` + lime dot) → title `clamp(24px, 2vw, 34px)/800
  ink` → description ≤68ch muted; 2px accent hairline under the eyebrow.
- Admin per-area accents keep working via the existing area-hero hook but
  express only through eyebrow/hairline color — all washes die.

### Buttons

- Radius 10px from token; inline 999px + 8px `!important` die together.
- Variants: `primary` (forest fill `--portal-primary`, ivory text, hover
  darker + `0 4px 16px var(--portal-signal-glow)` underglow), `secondary`
  (white + strong border + ink), `soft` (mint @0.12 fill, `--portal-mint-text`),
  `ghost`, `danger` (soft danger fill + text + border @0.4), `on-chrome`
  (transparent + chrome border + chrome text).
- States: focus-visible 3px `--portal-focus` ring; loading = 16px spinner
  replacing `iconLeft`; press translateY(1px); post-save success border
  pulse.
- Shape law: **rounded-rect = action, pill = status.** No exceptions.

### Status pills

- One tokenized tone map consumed by **both** `Pill` (`PILL_TONES`) and
  `.gh-badge-*`: `success | warning | danger | info | neutral | brand |
  live`. `live` = lime dot + halo + neutral text — the only glowing pill.
- Anatomy: 999px, 11px/700 caps, 0.05em tracking, tone fill, tone text,
  optional 5px dot.

### Tables

- One construction: atom primitives; `.gh-admin-main table` descendant
  rules reduced to a matching safety net.
- Header 11px/800 caps muted, 1px strong bottom rule; rows 44px dense /
  52px comfortable via `data-density`; hover = mint wash + 2px accent
  inset bar; numerics tabular right-aligned; IDs mono.
- <760px: shared mobile card.

### Forms

- Field: 44px min-height, `--portal-well` fill → white on focus, radius
  10px, 1px border; focus = `--portal-mint-text` border + 3px focus ring;
  error = danger border + ring + danger helper replacing the muted helper.
- `FormSection` cards (new primitive): SectionHeader + 2-col grid ≥900px.
- Rich text gets the same border/focus shell. Dropzones: dashed strong
  border; dragover = dashed accent + signal-soft wash.

### Tabs

- One `PortalTabs`: 13px/700, muted → ink active, 2px `--portal-accent`
  underline sliding transform-based; overflow scrolls with fade masks.
  Consolidates `plan-edit-tabs`, `*-translation-tabs`, `appointment-tabs`,
  profile `*-tab` headers, `faq-language-tabs`.

### Modals / dialogs

- L4 white, radius 18px, modal shadow; overlay = canvas @0.55 + blur 8px.
- One `PortalDialog` shell absorbs `confirm-delete-button`,
  `consultation-documents-modal`, `delete-account-button`,
  `EventDetailDialog`. Mobile = bottom sheet. Focus trap + Esc + return
  focus. Danger dialogs keep type-to-confirm behavior.

### Empty states

- ≤220px illustration slot (E-assets) or 44px icon tile on the well;
  16px/800 title; 13.5px muted body ≤52ch; optional primary action; 48px
  padding. Restyle of `AdminEmptyState`.

### Loading states

- Promote `admin/_components/skeletons.tsx` →
  `components/portal-skeletons.tsx` (+ shim). Shimmer base `#EFF1EA`,
  sweep white @0.75, 1.6s; reduced-motion → static pulse. Command Band
  skeleton is dark with shimmering numeral blocks — loading already looks
  expensive.

### Mobile cards

- New `PortalMobileCard`: white, radius 14, 3px status left edge, title
  row + meta grid + trailing action. Replaces per-page
  `.gh-admin-mobile-card` bodies progressively; breakpoint stays 760px.

### Notification popover

- L4 white, radius 18, from-bell scale origin; unread = lime dot + halo +
  signal-soft @0.5 tint; full-width soft "view all" footer.

### Chat surfaces

- Thread: L3 card, message area on the well. Own bubble = forest fill
  ivory text; other = white + ink + hairline; radius 14 with 4px tail.
  System notes = dashed neutral chips. Composer white bar, `primary` send,
  disabled states explain why. One bubble core for `ChatThread`,
  `ConsultationChat`, `InternalMessagesThread`.

### Calendar surfaces

- `MonthCalendar`: hairline cells, today = accent ring, selected = forest
  fill ivory text, event dots from the tone map. `DayAgenda`: timeline
  rail + lime "now" tick (breathes 0.7↔1 / 3s — the one ambient
  animation); events as compact cards. `EventDetailDialog` →
  `PortalDialog`. `calendar-utils/-types` untouched.

### Payment / invoice cards

- Amounts tabular; mono last-4 (`•• 4242`); paid = success pill; refund =
  pill + one plain sentence on Patient surfaces. Patient membership plan
  card: dark chrome header band with 1px `--portal-member` hairline, plan
  name ivory; body white; lime slim progress bar (the only progress bar in
  the system).

### Document cards / tables

- Shared `DocumentTable` direction (Doctor `doctor-document-tables` +
  Patient `medical-files`): 32px file-kind icon tile on the well, name +
  meta stack, status pill, trailing `IconBtn`s; consumer variant enlarges
  touch targets.

### Appointment cards

- Shared `AppointmentCard`: time block (15px/800 tabular + tz meta) ·
  person + service · status pill + action; 3px status left edge; `live` =
  lime edge + halo during consultation.

---

# Admin Portal design plan

Root: `frontend/app/(admin)/admin/**`. Feel: **operations command center** —
dark telemetry over ivory ledgers. Dense, fast, confident. Accent: lime.

- **Dashboard (`/admin`)**: Command Band with today's appointments, unpaid
  orders, pending verifications, live consultations (lime live tick);
  country-scope chip inside the band. Below: stat grid
  `auto-fit minmax(240px,1fr)` (kills the 3-col orphan), quick-action
  cards, operations queues. The raster hero dies.
- **Appointments (list/`[id]`/`new`)**: dense table on `AppointmentCard`
  tones; unified pills; detail keeps single-column-under-1024; internal
  messages as dashed system chips; manual booking form → `FormSection`.
- **Orders (list/`[id]`)**: money tabular right-aligned; payment pills
  unified; `[id]` summary strip becomes a compact dark mini-band under the
  header; bulk-action bar = sticky elevated white bar when rows selected.
- **Doctors (list/`[id]`/edit/availability/services)**: profile header
  card with avatar tile, market flags, credential pills; edit tabs →
  `PortalTabs`; availability editor visual parity with Doctor portal's
  editor (same slot-chip recipe).
- **Patients**: privacy-first — muted meta, verification pills,
  GHN/document counts as icon+count chips.
- **Services (+ delegating routes)**: keep delegation; kind-tinted icon
  tiles; price/duration tabular.
- **Countries / content / legal / country-features / footer / pages**: CMS
  forms → `FormSection` + `PortalTabs`; legal docs → `DocumentTable`; flag
  badges unchanged.
- **Health tests**: services list recipe; FAQ panel → `PortalTabs`.
- **Blog / CMS / newsletter**: editorial rows — title + mono slug + status
  pill; rich-text gets the form shell.
- **Assets**: 32px thumbnail tile per row; upload dragover = accent
  dashed.
- **Plans / subscriptions / invoices / users**: money/counts tabular;
  `subscription-health-panel` becomes a dark telemetry strip (tone dots,
  luminous numerals); `subscriber-ledger` dense table; role pills (brand
  tone for SUPER_ADMIN).
- **Specialties / automation / audit log / calendar**: audit timestamps
  mono; automation runs get status left-edge bars; calendar per shared
  restyle.
- **Loading / empty / error**: skeleton kit incl. band skeleton; empty
  anatomy with E-assets; **add portal-root `error.tsx`** (none exists)
  using empty-state anatomy in danger tone.
- **Mobile**: table→`PortalMobileCard` progressively; Command Band stacks
  metrics 2-up; country picker collapses to flag chip.

---

# Doctor Portal design plan

Root: `frontend/app/(doctor)/doctor/**`. Feel: **clinical studio** — the
quietest portal. Same dark chrome; calmer content, larger line-height,
fewer competing accents. Accent: mint `#8FB021`.

- **Dashboard (`/doctor`)**: Command Band = the "Now" instrument — next
  appointment time in 48px tabular numerals, patient + service, join
  action; if a consultation is live the band's tick and edge go lime-live.
  Below: today's schedule (comfortable `AppointmentCard`s), pending
  documents count, unread messages.
- **Appointments list**: comfortable rows, date-group headers
  (Today / Tomorrow / date), status pill + 3px edge.
- **Appointment detail (`[id]`) — the consultation workspace**: two-zone
  ≥1024px (left: consultation form + finalize checklist; right: patient
  context — profile summary, documents, chat). Tabs → `PortalTabs`.
  **Calm mode** while a consultation is live: hover lifts suppressed in
  the form zone, accents minimized, the only `primary` button on the page
  is sign/finalize.
- **Consultation workflow**: form recipe; checklist = check-tile rows
  (well → success tint when done).
- **Documents (review-send panel, lists, upload, modal)**: `DocumentTable`;
  modal → `PortalDialog`; dropzone recipe.
- **Chat / internal messages**: bubble core; staff notes = dashed neutral
  chips so clinical chat and internal notes cannot be confused.
- **Medical notes**: chart-like list — mono timestamps, author chip, note
  body on the well inset.
- **Prescriptions / exam results**: `DocumentTable` rows with kind icons
  (Rx, lab); issued pills.
- **Availability (`availability-ui.tsx`)**: weekly slot-chip grid — well
  chip rest, accent-filled active, danger-soft blocked.
- **Calendar**: shared restyle; mint accents the now-tick color context.
- **Patients (list/`[email]`)**: header card with initials tile, GHN mono,
  consult count; history timeline; documents → `DocumentTable`.
- **Profile (+ `[country]`)**: `FormSection`; `LanguagePicker` accent
  chips; payout/bank framed with info-tone security note.
- **Services / invoices / reports / notifications / forms-templates**:
  check-tile selection grid; payment framing; CSV soft button + mono
  counts; unified notification list; template card grid.
- **Loading / empty / error**: kit + clinical empty assets; root
  `error.tsx`.
- **Mobile**: consultation workspace stacks context-first; sticky bottom
  bar for join/finalize during consultations.

---

# Patient/Account Portal design plan

Root: `frontend/app/(auth)/account/**` (no `(account)` group). Feel:
**private health home** — the warmest expression. Same dark chrome
(consistency = trust); ivory content, large type, card-first, one clear
next action per screen. Accent: pale lime `#CFEC81`; "lime silk"
`#E3F5B0` on membership only.

- **Dashboard (`/account`)**: Command Band greets by first name; right =
  next appointment (date/time large tabular, doctor, join/reschedule) or
  a single "Book a consultation" primary; lime tick when a consult is
  imminent. Below: health-home chips (records / payments / membership) as
  tappable cards; `SubscriptionDashboard` cluster with plan pill + renewal
  in plain language.
- **Appointments / bookings (`/account/bookings`, `ui.tsx`)**: card-first,
  no tables — comfortable `AppointmentCard`s; past visits behind a
  "history" disclosure; payment-needed = warning card with one pay action;
  chat per bubble core; `SyncOrderPaymentOnReturn` behavioral — untouched.
- **Booking flow**: portal links out to the public `/book` wizard; only
  return/payment-sync states restyle as tone cards.
- **Orders / payments / invoices**: consumer cards — "Paid · 12 Jun 2026 ·
  Visa •• 4242" mono; receipts = soft buttons; refund states explained in
  one sentence plus a pill.
- **Profile / settings tabs**: `PortalTabs`; each tab a `FormSection` card.
- **Verification / insurance / GDPR**: status-first — large tone card at
  top (success "Verified" / warning "Action needed: <exact missing
  item>"); dropzone recipe; GDPR export/delete as info cards with
  consequences; delete via `PortalDialog` danger + existing
  type-to-confirm.
- **Medical files / documents**: `DocumentTable` consumer variant — big
  touch targets, kind icons, "shared by Dr. X" meta; E1 empty
  illustration.
- **Prescriptions / results**: Rx cards with issue date, doctor, one clear
  download.
- **Notifications**: unified list; unread lime dot; friendly empty state.
- **Membership / subscriptions / rewards (`/membership`, `ManagePanel`,
  `/rewards`, `RewardsPanel`, `/subscribe`, `SubscribeForm`)**: **the lime
  silk surface.** Plan card gets a dark chrome header band with a 1px
  `--portal-member` hairline and the plan name in ivory; benefits as icon
  + plain sentence rows; credits + wellness progress as a slim lime
  progress bar (the only progress bar in the system); recurring-charge
  consent card stays, info tone; pause/cancel in a quiet danger-soft
  cluster behind a disclosure.
- **Security / family / access-history**: delete via `PortalDialog`
  danger; access rows with mono timestamps (transparency = trust); family
  cards with relationship chips.
- **Loading / empty / error**: kit; warm empty assets; root `error.tsx`
  with reassuring copy + support link.
- **Mobile (primary platform)**: single column; sticky bottom action on
  payment-needed and subscribe; touch targets ≥44px; account nav sheet
  lists icon + description (patients navigate by recognition).

---

# Shared component redesign plan

Files and directions. **T** = requires the token block landed first.
Full per-component construction specs live in `DESIGN.md` §5.

| File | Direction | Risk | Notes |
|---|---|---|---|
| `frontend/app/(admin)/admin/_components/atoms.tsx` | The design system for all 3 portals. Move card/button/pill/stat visuals into token-driven CSS; delete dead StatCard decor + inline 999px radius; add `CommandBand`; unify `PILL_TONES` into the tone map | **High** | T. 794 lines today. Restyle = global. Markup/prop changes require consumer sweep (dependency map §9) |
| `frontend/components/portal-atoms.ts` | **No visual work ever.** Pure re-export stays byte-boring | pass-through **High** | Fork = instant Doctor/Patient design split |
| `frontend/app/globals.css` | Remap the existing `--portal-*` block (line 1750) to Obsidian Ivory values; add chrome/signal/status tokens; add `[data-portal]`/`[data-density]` hooks; retire texture PNG rules (1527, 1555, 1735, 1772); collapse the triple-layer `!important` fights in the ~1514–1891 region after replacements exist | **High** | 6232 lines, **shared with the public site** — stay inside `.gh-portal-shell` scope and portal `.gh-*` classes; `:root` and `.gh-btn-*`/`.gh-badge-*`/`.gh-eyebrow` leak to `(site)` |
| `frontend/app/(admin)/admin/_components/admin-shell.tsx` | Dark chrome, seam light, CSS-class nav states (delete inline hover mutators at 630/677), portal glyph, `data-portal="admin"` + `data-density="dense"`, chrome country-picker pill | **High** | Lockstep with portal-shell in the same commit |
| `frontend/components/portal-shell.tsx` | Same chrome recipe; delete inline `#D9F99D` at 424/458; `data-portal` from a new prop (`doctor`/`patient`), `data-density="comfortable"` | **High** | Hand-mirrored twin — any drift forks the portals |
| `frontend/components/NotificationPopover.tsx` | L4 white popover, lime unread dots + halo, soft view-all footer | Medium | Single file; safe once tokens exist |
| `frontend/components/calendar/**` | Calendar recipes for `MonthCalendar`, `DayAgenda`, `EventDetailDialog`, `TimezoneSelect` | **High** | One surface, three `/calendar` routes — verify all 3. `calendar-utils/-types` untouched |
| `frontend/components/chat/**` | One bubble/thread core; per-consumer disabled/closed semantics preserved | Medium | Each component spans ≥2 portals |
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
| E6 | Membership silk | `membership-silk.png` | Patient membership plan-card band corner | Optional | 1200×480 | yes |
| C1 | Calendar empty | `empty-calendar.png` | empty month / no-events agenda | Optional | 960×640 | yes |
| B1 | Band sheen | `band-sheen.webp` | Command Band top-edge sheen, ≤0.2 opacity | Optional | 1600×400 | no (dark) |

**A1 — `canvas-aurora.webp` (required), 16:9, 2560×1440, opaque:**
> Ultra-dark abstract background, near-black with a deep forest-green
> undertone (#07120C), one soft luminous aurora bloom of electric
> lime-green light (#B0F122) drifting in from the upper right corner and
> dissolving before the center, extremely smooth out-of-focus gradients,
> faint darker vignette in the lower corners, cinematic, premium
> technology-company atmosphere, no grain, no stars, no shapes, no text,
> no logos, no UI. Must stay dark enough for white text to be readable
> anywhere on it.

**E1 — `empty-records.png` (required), 3:2, 960×640, transparent:**
> Minimal abstract illustration of organized personal health records at
> rest: two overlapping matte ivory-white folder shapes with precise
> hairline dark-green edges, one thin electric lime-green line tracing the
> top folder's edge like a pulse, a small round badge shape resting on the
> corner, floating on a fully transparent background, flat-3D style with
> soft realistic shadows, premium minimal SaaS empty-state, gallery-white
> and deep-forest-green palette with a single lime accent, no text, no
> letters, no logos, no faces, no medical instruments.

**E2 — `empty-queue.png` (required), 3:2, 960×640, transparent:**
> Minimal abstract illustration of a calm empty schedule: a matte white
> rounded panel with a precise grid of blank rounded tiles drawn in thin
> deep-green hairlines, one tile softly filled with luminous lime-green, a
> small abstract circular dial beside the panel without numbers or hands,
> floating on a transparent background, soft realistic shadows, premium
> minimal clinical SaaS empty-state, ivory / deep forest green / single
> lime accent palette, no text, no numbers, no logos, no people.

**E3 — `empty-documents.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of documents at rest: three layered matte
> white sheets with rounded corners and thin deep-green hairline edges,
> slightly fanned, blank surfaces with faint gray tone bands suggesting
> paragraphs without readable content, the top sheet edged with a thin
> luminous lime-green highlight, floating on transparent background, soft
> shadows, premium minimal SaaS empty state, no text, no letters, no
> logos, no UI chrome.

**E4 — `empty-payments.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of finances at rest: one matte white
> rounded rectangle suggesting a blank receipt with faint gray tone bands,
> one smooth deep-forest-green disc beside it like an abstract coin with a
> thin lime-green rim light, floating on transparent background, precise
> hairline edges, soft shadows, premium fintech-grade minimal empty state,
> no currency symbols, no numbers, no text, no logos.

**E5 — `empty-content.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of editorial content at rest: a blank
> matte white card with a soft gray image-placeholder rectangle and two
> blank tone bands beneath, a second smaller deep-forest-green card
> peeking from behind with a thin lime-green edge light, floating on
> transparent background, precise hairlines, soft shadows, premium CMS
> empty state, no text, no letters, no icons, no logos.

**E6 — `membership-silk.png` (optional), 5:2, 1200×480, transparent:**
> Subtle abstract luxury accent on a fully transparent background: soft
> concentric arcs of pale lime-cream light (#E3F5B0) at low opacity
> concentrated toward the right edge and fading to nothing, with one very
> faint deeper olive-green thread woven through, extremely low contrast,
> smooth, premium private-membership feeling, decorative corner accent for
> a dark panel, no text, no logos, no hard edges, no sparkles.

**C1 — `empty-calendar.png` (optional), 3:2, 960×640, transparent:**
> Minimal abstract illustration of time at rest: a matte white rounded
> grid of blank square tiles drawn with thin deep-green hairlines
> suggesting a calendar month without numbers, one tile raised and filled
> with luminous lime-green, one thin orbital curve passing behind the grid
> in deep forest green, transparent background, soft shadows, premium
> scheduling empty state, no text, no numbers, no logos.

**B1 — `band-sheen.webp` (optional), 4:1, 1600×400, opaque:**
> Very dark abstract horizontal banner texture, near-black with a deep
> forest-green undertone (#0C1A12), an extremely subtle diagonal sheen of
> cooler dark tone crossing it and a faint lime-green glow entering from
> one end and fading within a third of the width, perfectly smooth, no
> grain, no shapes, no text, no logos, suitable as a barely-visible
> overlay on a dark glass dashboard panel.

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
| **2. Shells + chrome** | `admin-shell.tsx` + `portal-shell.tsx` (lockstep, same commit) + shell rules in `globals.css` + `NotificationPopover.tsx` | Dark sidebar/topbar, seam light, CSS-class nav states (delete inline hover mutators + `#D9F99D`), portal glyph, `data-portal`/`data-density` attributes, popover/user-menu restyle, chrome country picker | **High** | 3 portals + mobile nav + country picker + bell; keyboard nav; blur fallback (`@supports`); the identity lands here |
| **3. Atoms** | `atoms.tsx` + atom rules in `globals.css`; `portal-atoms.ts` untouched | Cards/buttons/pills/stats to token CSS; forest primary buttons; unified tone map (Pill + `.gh-badge-*` same phase); `CommandBand` primitive added; delete `!important` fights + dead decor **only after replacements live** | **High** | Representative page sweep per portal; check `(site)` for `.gh-btn` leakage |
| **4. Tables / forms / dialogs / tabs / skeletons** | `atoms.tsx` table prims; table/form rules; new `PortalDialog`/`PortalTabs`/`FormSection`; promote skeletons → `components/portal-skeletons.tsx` (+ shim) | Tables/forms/modals/tabs/loading recipes; `.gh-admin-main` descendant selectors reduced to safety net | High | Density check dense vs comfortable; focus/error form states; modal focus trap; raw-`<table>` pages still styled |
| **5. Calendar + chat** | `components/calendar/*` (not utils/types); `components/chat/*` | Calendar + chat recipes | Medium | All 3 `/calendar` routes; every chat consumer incl. disabled/closed states |
| **6. Admin pages** | `app/(admin)/admin/**` routes + `_components` | Command Band on dashboard; per-area work; tabs→`PortalTabs`, forms→`FormSection`, mobile→`PortalMobileCard`; delete dashboard raster usage; add root `error.tsx` | Medium (route-scoped) | Admin sweep at 320/768/1280/1920 |
| **7. Doctor pages** | `app/(doctor)/doctor/**` | Now-band, calm mode, documents/notes/prescriptions, availability chips; root `error.tsx` | Medium | Full consultation workflow click-through |
| **8. Patient pages** | `app/(auth)/account/**` | Dashboard band, card-first bookings, consumer payments, profile tabs, lime-silk membership; root `error.tsx` | Medium | Mobile-first sweep 320/390/430 first |
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
16. **Dark chrome contrast** — chrome text pairs must be re-verified over
    the aurora asset at its brightest point, not just over flat canvas.
17. **Lime discipline** — lime as text on white/ivory is banned
    (contrast failure + neon collapse). Any "lime text" need on light
    surfaces uses `--portal-signal-text` (`#4E6B10`). Enforce in review.

---

# Future AI implementation prompt

> Copy everything below into the implementation session when the redesign
> is approved and (optionally) assets have been generated.

You are implementing the **Obsidian Ivory** premium redesign for the Admin,
Doctor, and Patient portals of the Global Health platform, on branch
`Dev-hassaan`.

**Binding design spec:** `docs/portal-redesign/DESIGN.md`. Read it in full
before writing any code. This strategy file provides rationale and
per-route direction; DESIGN.md provides exact tokens, recipes, and
component rules. Where they differ, DESIGN.md wins.

**Design direction (summary):** forest-black canvas `#07120C` with one
lime aurora; dark glass chrome `rgba(9,20,14,0.80)` blur 28 (sidebar,
topbar, Command Band, mobile nav — the ONLY blurred material); gallery
ivory `#FAFBF7` work plane with white opaque content cards; ink `#101713`
text, brand gray `#6D6D6D` muted; **forest primary buttons `#1D4B36`**
(lime underglow on hover); mint `#8FB021` quiet accents + focus rings;
electric **lime `#B0F122`** strictly for live/active-on-dark/glow/charts/
hero-numerals (never body text on white — use `#4E6B10` when read as
text); "lime silk" `#E3F5B0` ONLY on Patient membership hairlines;
per-portal accents via `data-portal` (admin lime, doctor mint, patient
pale-lime `#CFEC81`); density via `data-density` (admin dense,
doctor/patient comfortable); one status tone map (success `#2F7D4E`,
warning `#B07C1A`, danger `#BC4A42`, info `#56707A`, live=lime glow);
radius law 10/14/18/999; shadows rest/hover/modal only; the **Command
Band** (dark KPI band with 44–56px luminous tabular numerals) opens every
dashboard. **Every color derives from the five brand anchors (forest
`#1D4B36`, mint `#8FB021`, lime `#B0F122`, white, gray `#6D6D6D`) — no
foreign hues.**

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
- Lime is never text on white/ivory; surfaces are never green.

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
