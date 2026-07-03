# DESIGN2.md — Obsidian Ivory · Liquid Lux — CONSOLIDATED AGENT SPEC

> **This is the single-file implementation bible.** It merges the base
> system (`DESIGN.md`) and the Liquid Lux visual layer
> (`LUX-VISUAL-PASS.md` v3) into one self-contained document. An agent
> with only THIS file plus
> `docs/portal-redesign/portal-shared-ui-dependency-map.md` can implement
> the entire visual redesign without opening anything else and without
> inventing a single value.
>
> **Authority:** DESIGN2.md ▸ LUX-VISUAL-PASS.md ▸ DESIGN.md ▸ strategy
> doc ▸ dependency map. On any conflict, this file wins (it is the newest
> consolidation of all of them).
>
> **Scope:** Admin (`frontend/app/(admin)/admin/**`), Doctor
> (`frontend/app/(doctor)/doctor/**`), Patient
> (`frontend/app/(auth)/account/**` — there is NO `(account)` route
> group). One shared design system, three role accents.
>
> **Priority:** Patient and Doctor portals first. The skin lands in
> shared primitives, so Admin inherits automatically; Admin-specific
> polish is a later commit and not part of this pass's acceptance.
>
> **Confirmed stack facts (never substitute):** icons = `lucide-react`
> (existing dependency, already imported across portal pages); toasts =
> `sonner` (Toaster mounted in Admin layout); fonts = existing
> `--font-manrope` + `--font-geist-mono` stacks; dark scrollbar class
> `.gh-dark-scroll` exists; the portals share one primitive library
> (`atoms.tsx`) and one stylesheet (`globals.css`, ~6232 lines, shared
> with the public site).

---

## §0. How to use this file + the twelve commandments

Reading order for the agent:
1. §1 design brief — why every rule exists. Read once.
2. §2–§6 — constants (brand, tokens, environment, materials, type).
   Copy; never re-derive or "improve".
3. §7 component catalog + §8 icons — what you build. Every recipe is
   complete: anatomy, values, states. Missing value → §3 tokens → §20
   decision defaults → only then ask.
4. §9 blueprints + picture targets — what screens must add up to.
5. §10 states matrix — per-component completeness checklist.
6. §14 anti-patterns — banned list; violating it fails review even if it
   "looks fine".
7. §16–§21 — merge gates (a11y, ownership, phases, inventory, DoD).
8. When in doubt: **delete ornament, increase contrast, use a token.**

**The twelve commandments (memorize before coding):**

1. Every color/radius/shadow/blur/gradient is a `var(--portal-*)` or
   `var(--lux-*)` token. No inline hex in components, ever. Missing
   token → add it to the `.gh-portal-shell` block in `globals.css`.
2. Blur exists on Material A (chrome) and Material B (content glass)
   ONLY, within the §14 blur budget. Wells, rows, inputs, pills, buttons
   stay opaque.
3. Lime `#B0F122` is never body text on white/ivory and never a surface
   fill. Text-safe form is `--portal-signal-text` (`#4E6B10`).
4. Surfaces are neutral. Green appears only as forest (act), mint
   (notice), lime (alive/now).
5. Both shells (`admin-shell.tsx`, `portal-shell.tsx`) change in the
   same commit, always. They are hand-mirrored twins sharing CSS
   classes.
6. Never delete an `!important` rule or inline style until its
   token-driven replacement is live and verified.
7. `frontend/components/portal-atoms.ts` stays a pure re-export. Fork =
   instant Doctor/Patient design split.
8. Behavior is frozen: no changes to server actions, fetchers, auth,
   i18n, `action`/`formAction` wiring, `Toggle` submit-button semantics,
   `SyncOrderPaymentOnReturn`, chat send paths, or routes. This is a
   skin; restyle wrappers only.
9. `gh-admin-*` classes are GLOBAL (all three portals — `.gh-admin-main`
   wraps every portal's `<main>`). Do not rename.
10. `globals.css` `:root` (lines ~31–162) and `.gh-btn-*` /
    `.gh-badge-*` / `.gh-eyebrow` are shared with the PUBLIC site.
    Portal changes stay inside `.gh-portal-shell` scope and the portal
    `.gh-*` blocks. `phone-field.tsx` also escapes to public checkout —
    verify `(site)` after touching either.
11. Icons are `lucide-react` per §8 — canonical map, fixed sizes, fixed
    strokes, opacity ladder. Never improvise glyphs.
12. No DOM restructuring. `::before/::after` hooks and utility classes
    are allowed where a recipe requires them; nothing else moves.

---

## §1. Design brief

### 1.1 Product context

MyGlobalHealth is a multi-country telemedicine platform: patients book
video consultations with licensed doctors, receive prescriptions, sick
certificates, exam results, and medical documents; operations staff run
the network.

| Portal | Primary user | Core jobs | Emotional target |
|---|---|---|---|
| Admin | operations staff, country managers, super-admins | manage doctors/services/orders/CMS/plans across countries | command, density, speed — "mission control for a clinic network" |
| Doctor | licensed physicians | run consultations, review/send documents, manage availability | focus, calm, zero noise during a live consult — "a quiet clinical studio" |
| Patient | consumers (mobile-first) | book, pay, read results, manage membership | reassurance, clarity, one obvious next action — "a private health home" |

### 1.2 The brief

Make the portals look like a **premium, luxurious, modern, futuristic
SaaS product** — investor-demo quality, screenshot-worthy — while staying
brand-true and clinically legible. Explicitly NOT: generic green
healthcare UI, flat template dashboard, plain white rectangles, default
component styling, "AI-generated" sameness.

### 1.3 The concept

**Obsidian Ivory · Liquid Lux.** Two worlds joined by light. The
**chrome world** is forest-black liquid glass — sidebar, topbar, and the
dashboard Command Band, with reflection streaks and a lime aurora. The
**content world** is gallery ivory — liquid-glass cards with specular
top edges and gradient perimeters floating over a softly glowing plane.
Green is a three-word language: **forest = act, mint = notice, lime =
alive.** Large luminous tabular numerals are the primary ornament.

### 1.4 Why each core decision exists

| Decision | Reason |
|---|---|
| Dark chrome, light content | drama + brand authority where no medical text lives; legibility where patients read results |
| Chrome is forest-black, not neutral black | the dark world literally IS the brand color driven to near-black |
| Forest primary buttons on a neutral field | on neutral ivory the brand forest finally reads as *the* action instead of wallpaper |
| Lime = voltage only | scarcity converts the loudest brand color into meaning ("alive right now") — a vital-sign metaphor native to medicine |
| Mint = quiet accent | the brand's own mid-tone carries hovers, focus, eyebrows without shouting |
| Liquid-glass materials, layered shadows | single-shadow flat white cards read as template output; layered light reads machined and expensive |
| Ambient blooms on the plane | glass needs an environment to refract; flat backgrounds kill depth |
| Command Band | one ownable, repeatable, screenshotable composition opening every dashboard |
| Numerals as ornament | data-forward decoration ages slower than washes and signals competence |
| Visible dark frame ≥1280px | drama that only exists at 1500px+ is invisible on the laptops demos run on |

### 1.5 Quality bar

- A screenshot of any dashboard could open a pitch deck without cropping.
- No pure-flat `#FFFFFF` container anywhere; every container is one of
  the four materials (§5).
- Zero texture-PNG washes, zero decor spans, zero `!important` fights.
- Any two screens from different portals = recognizably one product; any
  two screens within a portal = recognizably one role.
- Every interactive element has designed hover, focus-visible, active,
  disabled, and (where applicable) loading states.
- The UI looks finished with images disabled.
- Inspecting any element reveals only token values.

---

## §2. Brand foundation, derivation, green language

### 2.1 Brand anchors (Manual da Marca — untouchable)

| Anchor | Hex | RGB | CMYK | Personality |
|---|---|---|---|---|
| Forest | `#1D4B36` | 29, 75, 54 | 61, 0, 28, 71 | authority, medicine, trust |
| Mint (olive) | `#8FB021` | 143, 176, 33 | 19, 0, 81, 31 | growth, freshness |
| Lime | `#B0F122` | 176, 241, 34 | 27, 0, 86, 5 | energy, vitality — the distinctive asset |
| White | `#FFFFFF` | 255, 255, 255 | 0, 0, 0, 0 | clinical cleanliness |
| Gray | `#6D6D6D` | 109, 109, 109 | 0, 0, 0, 57 | neutrality |

**Binding rule:** every color is an anchor, a tint/shade/alpha of an
anchor, or a neutral mixed from anchors. No foreign hues (no cyan, gold,
violet, blue). Functional status colors (warning amber, danger red, info
slate) are the single sanctioned exception, desaturated so brand greens
stay the only saturated voices.

### 2.2 Derivation table

| System color | Hex | Derivation |
|---|---|---|
| Canvas | `#07120C` | forest darkened ~80% (hue held) |
| Chrome solid | `#0C1A12` | forest darkened ~70% |
| Chrome glass | `rgba(9,20,14,0.80)` | chrome solid @0.80 |
| Ink text | `#101713` | forest desaturated near-neutral, darkened |
| Secondary text | `#3C463F` | ink lifted toward brand gray |
| Muted text | `#6D6D6D` | brand gray, verbatim |
| Ivory plane | `#FAFBF7` | white + ~2% forest |
| Well | `#F2F4EE` | white + ~5% forest |
| Primary action | `#1D4B36` | forest, verbatim |
| Primary hover | `#163A29` | forest −20% |
| Mint text-safe | `#5E7516` | mint darkened to 5.2:1 on white |
| Signal | `#B0F122` | lime, verbatim |
| Signal text-safe | `#4E6B10` | lime darkened to 6.1:1 on white |
| Patient accent | `#CFEC81` | lime tinted ~40% toward white |
| Member silk | `#E3F5B0` | lime tinted ~70% toward white |
| Success | `#2F7D4E` | forest lifted toward mint |
| Warning | `#B07C1A` | mint hue-rotated to amber, desaturated |
| Danger | `#BC4A42` | functional clinical red, desaturated |
| Info | `#56707A` | brand gray + forest hint (near-neutral slate) |

### 2.3 The green language (most important rule in the system)

| Green | Value | Means | Appears as | Never |
|---|---|---|---|---|
| Forest | `#1D4B36` | **act** | primary buttons, selected calendar day, own chat bubble | page backgrounds, washes |
| Mint | `#8FB021` (text `#5E7516`) | **notice** | eyebrows, section rules, focus rings, row hovers, soft buttons, chart series 2 | large fills |
| Lime | `#B0F122` (text `#4E6B10`) | **alive / now** | active nav on dark, live pills, unread dots, "now" tick, hero numerals, glows, chart series 1 | text on white, surface fills, static borders |

If an element is not an action, not a notice, and not alive — it is
neutral (ink/gray/ivory/white). Enforce ruthlessly.

---

## §3. Token reference (authoritative, complete — base + lux merged)

Land on `.gh-portal-shell` in `frontend/app/globals.css`, **remapping the
existing block at ~line 1750** (keep existing names: `--portal-bg`,
`--portal-surface`, `--portal-line`, `--portal-line-strong`,
`--portal-muted`, `--portal-radius*`, `--portal-shadow*`,
`--portal-sidebar-w`, `--portal-main-max`, `--portal-readable-max`,
`--portal-pad-*`, `--portal-section-gap`).

```css
.gh-portal-shell {
  /* ── worlds ─────────────────────────────────────────────── */
  --portal-canvas: #07120C;
  --portal-bg: #FAFBF7;                 /* ivory work plane */
  --portal-surface: #FFFFFF;            /* base card color (Material B renders over it) */
  --portal-surface-elevated: #FFFFFF;
  --portal-well: #F2F4EE;
  --portal-chrome: rgba(9, 20, 14, 0.80);
  --portal-chrome-solid: #0C1A12;       /* backdrop-filter fallback */
  --portal-chrome-border: rgba(255, 255, 255, 0.08);
  --portal-chrome-text: rgba(233, 239, 233, 0.86);
  --portal-chrome-text-active: #E9EFE9;

  /* ── text (light surfaces) ──────────────────────────────── */
  --portal-text: #101713;
  --portal-text-2: #3C463F;
  --portal-muted: #6D6D6D;

  /* ── green language ─────────────────────────────────────── */
  --portal-primary: #1D4B36;
  --portal-primary-hover: #163A29;
  --portal-mint: #8FB021;
  --portal-mint-text: #5E7516;
  --portal-mint-soft: rgba(143, 176, 33, 0.12);
  --portal-signal: #B0F122;
  --portal-signal-text: #4E6B10;
  --portal-signal-soft: rgba(176, 241, 34, 0.14);
  --portal-signal-glow: rgba(176, 241, 34, 0.30);

  /* ── role accent (overridden per portal below) ──────────── */
  --portal-accent: var(--portal-signal);
  --portal-accent-text: var(--portal-signal-text);

  /* ── status ─────────────────────────────────────────────── */
  --portal-success: #2F7D4E;  --portal-success-text: #1F5B3D;
  --portal-success-soft: rgba(47, 125, 78, 0.12);
  --portal-warning: #B07C1A;  --portal-warning-text: #7A5610;
  --portal-warning-soft: rgba(176, 124, 26, 0.12);
  --portal-danger:  #BC4A42;  --portal-danger-text:  #8E332C;
  --portal-danger-soft: rgba(188, 74, 66, 0.10);
  --portal-info:    #56707A;  --portal-info-text:    #3F565F;
  --portal-info-soft: rgba(86, 112, 122, 0.12);

  /* ── lines + interaction ────────────────────────────────── */
  --portal-line: rgba(16, 23, 19, 0.08);
  --portal-line-strong: rgba(16, 23, 19, 0.16);
  --portal-line-soft: rgba(16, 23, 19, 0.05);
  --portal-hover: rgba(143, 176, 33, 0.08);
  --portal-focus: rgba(143, 176, 33, 0.65);

  /* ── geometry ───────────────────────────────────────────── */
  --portal-radius-sm: 8px;
  --portal-radius: 10px;       /* buttons, inputs */
  --portal-radius-lg: 14px;    /* cards */
  --portal-radius-xl: 18px;    /* band, modals, popovers */
  --portal-radius-pill: 999px; /* status pills only */

  /* ── LUX materials ──────────────────────────────────────── */
  --lux-card-fill: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.66));
  --lux-card-border: linear-gradient(160deg, rgba(255,255,255,0.95) 0%, rgba(16,23,19,0.06) 38%, rgba(16,23,19,0.10) 62%, rgba(143,176,33,0.22) 100%);
  --lux-card-border-hover: linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(16,23,19,0.08) 38%, rgba(16,23,19,0.12) 62%, rgba(176,241,34,0.35) 100%);
  --lux-chrome-fill: linear-gradient(165deg, rgba(14,28,20,0.86) 0%, rgba(7,16,11,0.88) 60%, rgba(10,22,15,0.86) 100%);
  --lux-chrome-border: linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05) 30%, rgba(176,241,34,0.28) 65%, rgba(255,255,255,0.04));
  --lux-well-fill: linear-gradient(180deg, #EFF2EA 0%, #F4F6F0 100%);
  --lux-forest-duotone: linear-gradient(180deg, #226044 0%, #1D4B36 55%, #16382A 100%);

  /* ── LUX layered shadow stacks (cards use these) ────────── */
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

  /* ── LUX light ──────────────────────────────────────────── */
  --lux-specular: rgba(255,255,255,0.95);
  --lux-streak: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.015) 52%, transparent 60%);
  --lux-blur-card: 24px;
  --lux-blur-chrome: 32px;
  --lux-blur-overlay: 12px;

  /* ── LUX numerals ───────────────────────────────────────── */
  --lux-numeral-ink: linear-gradient(180deg, #101713 0%, #1D4B36 130%);
  --lux-numeral-live: linear-gradient(180deg, #DFFF7A 0%, #B0F122 70%);

  /* ── LUX icons / scrollbars / selection ─────────────────── */
  --lux-icon-muted: 0.55;
  --lux-icon-rest: 0.75;
  --lux-icon-active: 1;
  --lux-scrollbar-thumb: rgba(16,23,19,0.18);
  --lux-scrollbar-thumb-hover: rgba(16,23,19,0.30);
  --lux-selection: rgba(176,241,34,0.35);
}

[data-portal="admin"]   { --portal-accent: #B0F122; --portal-accent-text: #4E6B10; }
[data-portal="doctor"]  { --portal-accent: #8FB021; --portal-accent-text: #5E7516; }
[data-portal="patient"] { --portal-accent: #CFEC81; --portal-accent-text: #4E6B10;
                          --portal-member: #E3F5B0; --portal-member-text: #5E7516; }
```

- `data-portal` + `data-density` (`dense`|`comfortable`) live on the
  shell root `div`. Admin = dense; Doctor/Patient = comfortable.
- `--portal-member` is consumed ONLY by
  `account/{membership,rewards,subscribe}` surfaces.

### 3.1 Hardcoded values these tokens replace (exact locations)

| Today | Where | Becomes |
|---|---|---|
| `#D9F99D` active nav (inline) | `portal-shell.tsx:424,458`; `admin-shell.tsx:630,677` | signal system §7.10 |
| `rgba(18,54,39,0.96)` sidebar + v3 gradient | `globals.css` `.gh-portal-sidebar` region | Material A |
| `#f7f8f3` shell bg + `#f8faf5` gradient | `globals.css:1750,1768` | canvas + plane §4 |
| texture PNGs | `globals.css:1527,1555,1735,1772` | deleted |
| `PILL_TONES` hex map | `atoms.tsx` ~393 | §7.7 tone map |
| StatCard `#B0F122`/`#143B30` tiles + decor spans | `atoms.tsx` ~264/288 | §7.2 (decor deleted) |
| Btn inline `borderRadius: 999` + danger hexes | `atoms.tsx` ~716–755 | §7.6 |
| body `#0f2e25 !important` | `globals.css:196` | **DO NOT TOUCH** (public site) |

---

## §4. The environment (canvas, plane, edge)

Glass needs something to refract. Three layers:

### 4.1 Canvas (L0)

```css
background:
  radial-gradient(1400px 900px at 85% -12%, rgba(176,241,34,0.16), transparent 60%),
  radial-gradient(900px 700px at -10% 110%, rgba(143,176,33,0.10), transparent 55%),
  linear-gradient(170deg, #0A160F 0%, #07120C 45%, #081409 100%);
```

Optional `canvas-aurora.webp` (§13 A1) on top at ≤0.5, `aria-hidden`.

### 4.2 Ivory plane (L2) — the "veil"

```css
background:
  radial-gradient(1200px 800px at 78% -8%, rgba(176,241,34,0.07), transparent 55%),
  radial-gradient(1000px 700px at 8% 30%, rgba(143,176,33,0.05), transparent 60%),
  radial-gradient(800px 600px at 92% 88%, rgba(29,75,54,0.04), transparent 60%),
  linear-gradient(180deg, #FCFDF9 0%, #F8FAF4 55%, #F5F8F0 100%);
```

**Bloom cap: ≤8% alpha** — this is the readability guarantee behind
Material B. Optional `plane-veil.webp` above at ≤0.35.

Role tuning via `[data-portal]`: **Patient** — warmer, first bloom →
`rgba(207,236,129,0.08)`; **Doctor** — calmer, all blooms at 60% alpha.

### 4.3 Frame + plane edge

The plane is one continuous sheet inset from the canvas: **16–28px dark
frame ≥1280px, 8px ≥1024px, edge-to-edge below. The frame MUST be visible
at 1280px.** Plane edge: 18px top radius + 1px `rgba(255,255,255,0.65)`
inner top edge + `0 -12px 32px rgba(7,18,12,0.18)` above it — the plane
visibly floats.

---

## §5. The material system (four materials — nothing else exists)

Every visible container is exactly one of these.

### 5.1 Material A — Obsidian Liquid (dark chrome)

For: sidebar, topbar, Command Band, membership header band, dark
telemetry strips, mobile nav sheet.

```css
background: var(--lux-chrome-fill);
backdrop-filter: blur(var(--lux-blur-chrome)) saturate(160%);
/* gradient hairline ring via ::before or border-image: var(--lux-chrome-border) */
box-shadow: var(--lux-elev-chrome);
```

Plus a **reflection streak** `::after` (`pointer-events:none`):
`background: var(--lux-streak);` covering the pane — the surface looks
like it reflects the room.

### 5.2 Material B — Ivory Liquid Glass (content cards)

For: cards, stat cards, table containers, form sections, mobile cards,
chat container, calendar cards, popovers, scope banner, summary items.

```css
border-radius: var(--portal-radius-lg);
border: 1px solid transparent;
background-image: var(--lux-card-fill), var(--lux-card-border);
background-origin: border-box;
background-clip: padding-box, border-box;
backdrop-filter: blur(var(--lux-blur-card)) saturate(140%);
box-shadow: var(--lux-elev-1);
```

Perimeter reads: lit top edge → neutral sides → mint kiss at the bottom
corner. **Readability guarantee (binding):** Material B sits ONLY over
the §4.2 plane (blooms ≤8%); effective backdrop behind text stays ≥
`#F2F4EE` luminance → ink ≥14:1. Never over imagery, canvas, or another
glass pane.

**Interactive hover:** `translateY(-2px)`; shadow → `--lux-elev-2`
(includes lime underglow); border → `--lux-card-border-hover`.

**`.is-static` utility:** identical fill/border/shadow, no
`backdrop-filter` — used after the 4th card in lists (§14 blur budget);
visually indistinguishable in a stack.

### 5.3 Material C — Etched Well (inset)

For: inputs at rest, icon tiles, mono blocks, chat message area, slot
chips, checklist tiles, skeleton bases, avatar fallback tiles.

```css
background: var(--lux-well-fill);
box-shadow:
  inset 0 1px 2px rgba(16,23,19,0.06),
  inset 0 -1px 0 rgba(255,255,255,0.9);
border: 1px solid rgba(16,23,19,0.05);
```

Wells read as carved *into* the glass — the counterpoint that makes
cards read raised.

### 5.4 Material D — Halo Elevated (modals, menus, toasts)

Material B recipe at `rgba(255,255,255,0.92)` fill + shadow
`--lux-elev-modal` (includes 48px lime halo @6%). Modal overlay:
`rgba(7,18,12,0.6)` + `blur(var(--lux-blur-overlay))`.

### 5.5 Fallbacks (binding)

`@supports not (backdrop-filter: blur(1px))` → solid fills (`#FFFFFF`
for B/D, `--portal-chrome-solid` for A); gradients + shadows carry the
depth so fallback still looks finished. `prefers-reduced-transparency` →
same.

---

## §6. Typography and spacing

One family (existing `--font-manrope` stack; optionally self-host Manrope
Variable 400–800 via `next/font/local`). Mono: `--font-geist-mono`,
promoted to a real role. No second display family.

### 6.1 Type roles

| Role | Spec | Where |
|---|---|---|
| Band hero numeral | 48–56px / 800 / −0.03em / `tabular-nums` / `--lux-numeral-live` gradient text + `drop-shadow(0 0 24px rgba(176,241,34,0.25))` | Command Band hero metric only |
| Band non-hero numeral | 44px / 800 / tabular / ivory flat | Command Band |
| Band title | 26–30px / 800 / `--portal-chrome-text-active` | Command Band |
| Page title (h1) | `clamp(24px,2vw,34px)` / 800 / −0.03em / pure ink `#0C120E` / lh 1.08 | PageHeader |
| Stat numeral | 40–44px / 800 / −0.03em / tabular / `--lux-numeral-ink` gradient text | StatCard |
| Inline money | 15–20px / 800 / tabular; 20px payment amounts get ink-gradient | payment cards |
| Section title | 16px / 800 / −0.01em / ink | SectionHeader |
| Identity name | 18px / 800 / ink | detail headers |
| Eyebrow | 11px / 800 / +0.12em / caps / `--portal-accent-text` + lime dot | headers |
| Micro-label | 10px / 800 / +0.14em / caps / muted | stat/band labels, meta kickers, mobile-card meta |
| Body | 14px / 500 / lh 1.6 / `--portal-text-2` | everywhere |
| Label | 12.5px / 700 / ink | forms |
| Helper/meta | 12px / 500 / muted | forms, cards |
| Table header | 10.5–11px / 800 / +0.12em / caps / muted | tables |
| Table cell | 13.5px / 500 | tables |
| Button | 13px (sm) / 14px (md,lg) / 700 | buttons |
| Mono data | 12.5px mono / muted (→ ink on row hover) | IDs, order numbers, IBAN last-4, timestamps, slugs, card last-4 |

Rules: metric/time numerals ALWAYS `tabular-nums`; reading text ≤68ch;
titles ≤2 lines then truncate. **Gradient text on numerals only**; one
gradient cluster per screen — dashboards may have band (live gradient) +
stats (ink gradient) since energies differ.

### 6.2 Scales

- Spacing: `4/8/12/16/20/24/32/40/56`. Card padding 20–24. Section gap =
  existing `--portal-section-gap`. Form row gap 16. Table cell 11×14
  dense / 14×16 comfortable.
- Radius: 8 sm / 10 action / 14 card / 18 band+modal / 999 status pill.
  Nothing else.
- Blur: 32 chrome / 24 card / 12 overlay. Nothing else.
- Widths: main-max 1500px, readable-max 1180px, sidebar 272px
  (`--portal-sidebar-w` — use the token in BOTH shells).

---

## §7. Component catalog (exhaustive — every visible element, final values)

### 7.1 Cards (`AdminCard` / `.gh-admin-card`)

Material B. Plus:
- **Header zone:** cards with a `SectionHeader` give that row
  `rgba(255,255,255,0.5)` fill + 1px `--portal-line-soft` rule below.
- **Section rule:** 3×16px gradient bar
  `linear-gradient(180deg, var(--portal-signal), var(--portal-mint))`,
  radius 2px, 6px glow @20%.
- **Jewel card (max ONE per screen):** the primary dashboard card may add
  `::before` corner bloom
  `radial-gradient(320px 200px at 100% 0%, color-mix(in srgb, var(--portal-accent) 9%, transparent), transparent 70%)`
  + optionally `card-silk.webp` masked to top third @≤0.25.
- Static info cards: Material B without hover physics. Interactive:
  §5.2 hover + title underline sweep 0→24px in accent (200ms).

### 7.2 StatCard (the centerpiece)

- Material B, min-height 136px, padding 20.
- Numeral per §6.1 (ink-gradient via
  `background-clip:text; color:transparent`).
- Icon tile 40px radius 10: Material C + inner accent ring
  `inset 0 0 0 1px color-mix(in srgb, var(--portal-accent) 35%, transparent)`;
  lucide 20px strokeWidth 1.75 `--portal-accent-text`.
- Label = micro-label tier.
- Delta chip (only if trend data already exists): 11px/700 pill,
  success-soft `▲` / danger-soft `▼`, right of numeral.
- Baseline thread: 1px bottom
  `linear-gradient(90deg, transparent, rgba(143,176,33,0.35), transparent)`.
- Hover (linked only): `--lux-elev-2`; numeral gradient forest stop
  brightens toward mint.
- DELETE: inline `#B0F122`/`#143B30` tiles, dead radial decor spans and
  their `display:none !important` CSS (replacement-first rule).

### 7.3 Command Band (`CommandBand` atom — dashboards only)

- Material A + streak + gradient hairline; radius 18; padding 24–28.
- Grid: left context block; right metric row
  (`auto-fit minmax(120px,max-content)`, gap 32; 2-up <760px); 1px
  vertical `rgba(255,255,255,0.07)` separators between metrics.
- Left: context 13px chrome text; title per §6.1; optional scope chip.
- Hero metric numeral per §6.1 live-gradient + glow behind
  (`radial-gradient`, ≤0.25). Others ivory.
- **Inner aurora** `::before`:
  `radial-gradient(600px 300px at 85% 0%, rgba(176,241,34,0.10), transparent 65%)`
  drifting 24px over 30s (paused on `prefers-reduced-motion`) — the ONE
  slow ambient per viewport.
- Live element (max one): 6px lime dot + halo, pulses ×2 on mount, rests.
- Bottom edge: seam-light gradient always on:
  `linear-gradient(90deg, transparent, rgba(176,241,34,0.45) 35%, rgba(176,241,34,0.10) 70%, transparent)`.
- Optional `band-aurora.webp` behind content @≤0.5.
- Props presentational: `{ context, title, chip?, metrics: {label, value,
  signal?, live?}[], action? }`. Role pages fetch data. Ships with its
  dark skeleton variant.

### 7.4 Page headers (two modes — binding)

**Mode 1 — masthead (list/form/settings pages).** NOT a card; lives on
the plane with an atmosphere:
- Header aura `::before`:
  `radial-gradient(720px 320px at 12% 0%, color-mix(in srgb, var(--portal-accent) 7%, transparent), transparent 70%)`;
  optionally boosted by `header-aura.webp` @≤0.3 masked
  `linear-gradient(180deg, #000 60%, transparent)`.
- Anatomy (12px gaps): ① eyebrow row (11px/800 +0.12em caps accent-text +
  5px lime dot w/ 3px halo @25%; 2px×64px hairline below:
  `linear-gradient(90deg, var(--portal-accent), transparent)`) →
  ② title row (title left; actions cluster right, 8px gap, vertically
  centered) → ③ description 13.5px muted ≤68ch → ④ optional meta row of
  neutral chips.
- Bottom seam: 1px
  `linear-gradient(90deg, var(--portal-line-strong), transparent 70%)` +
  24px gap before first card — the page visibly has a masthead.
- Admin area accents express through aura/eyebrow/hairline color only.

**Mode 2 — identity header (detail pages: order/doctor/patient/
appointment `[id]`).** Slim Mode-1 strip (eyebrow + context) above a
**Material B identity card**: left 40px avatar/kind tile (Material C +
accent ring); center name 18px/800 ink + mono meta line + neutral chips
(flags, credentials, counts); right status pill + key actions. May carry
the screen's jewel bloom when no band exists. Mobile: stacks tile+name /
meta / full-width actions.

**Dashboards:** the Command Band IS the header — no PageHeader above it.

**SectionHeader:** 16px/800 ink + §7.1 gradient rule + optional trailing
count chip + optional "view all" quiet link right.

### 7.5 Summary strip (`AdminSummaryStrip`)

Items = Material B mini-cards (padding 14×16, radius 12) in
`auto-fit minmax(180px,1fr)`, gap 12. Tone items: 3px left gradient bar
(tone → transparent) + tone dot + value 15px/800 tabular + micro-label.
Inside band/hero context: on-chrome styling (transparent, chrome border,
ivory values).

### 7.6 Buttons — full state matrix (binding)

Base: radius 10; heights sm 32 / md 40 / lg 44; font 13/14 700; icon gap
8; lucide 16px (sm) / 18px strokeWidth 2; transition 120ms.
ALL variants: focus-visible = `0 0 0 3px var(--portal-focus)` appended;
disabled = 0.5 opacity, no pointer, no hover; loading = 16px `Loader2`
spin 0.8s replaces left icon, label persists, pointer off.

| Variant | Rest | Hover | Press |
|---|---|---|---|
| `primary` | fill `--lux-forest-duotone`; text `#FAFBF7`; `inset 0 1px 0 rgba(255,255,255,0.18)`, `inset 0 -1px 0 rgba(0,0,0,0.25)`, `0 1px 2px rgba(7,18,12,0.2)` | top stop → `#2A6E4F`; + `0 4px 16px var(--portal-signal-glow)` | translateY(1px); shadow → `--lux-elev-press` |
| `secondary` | `rgba(255,255,255,0.85)` + gradient hairline (Material B mini, no blur); ink text | fill → white; border brightens; `0 2px 8px rgba(7,18,12,0.06)` | translateY(1px); `--lux-elev-press` |
| `soft` | `--portal-mint-soft`; `--portal-mint-text` | fill @0.18; `inset 0 0 0 1px rgba(143,176,33,0.25)` | translateY(1px) |
| `ghost` | transparent; ink | `--portal-well` fill | translateY(1px) |
| `danger` | `--portal-danger-soft`; danger-text; 1px danger @0.4 | fill @0.16; border @0.55 | translateY(1px) |
| `on-chrome` | transparent; 1px chrome border; chrome text | white @0.06 fill; `inset 0 0 0 1px rgba(176,241,34,0.2)`; text → active | translateY(1px) |

Post-save success (primary/secondary): one 600ms border pulse
`--portal-success` @0.5. Icon-only squares at each size.
**Shape law: rounded-rect = action, pill = status. No pill buttons.**

`IconBtn`: 32px radius 9; lucide 16 strokeWidth 2 at `--lux-icon-rest` →
1 on hover; hover `--portal-hover` fill +
`inset 0 0 0 1px color-mix(in srgb, var(--portal-accent) 30%, transparent)`;
press scale(0.96); danger-intent → danger-text glyph on hover.

Audit `.gh-admin-main :where(button…)` descendant overrides in the same
pass; reduce to a safety net matching these values.

### 7.7 Pills, badges, chips, flag badge

Tone map (consumed by BOTH `Pill` and `.gh-badge-*` in the same phase):

| Tone | Fill | Text | Dot |
|---|---|---|---|
| success | `--portal-success-soft` | `--portal-success-text` | `--portal-success` |
| warning | `--portal-warning-soft` | `--portal-warning-text` | `--portal-warning` |
| danger | `--portal-danger-soft` | `--portal-danger-text` | `--portal-danger` |
| info | `--portal-info-soft` | `--portal-info-text` | `--portal-info` |
| neutral | `--portal-well` | `--portal-text-2` | `--portal-muted` |
| brand | `rgba(29,75,54,0.10)` | `--portal-primary` | `--portal-primary` |
| live | `--portal-signal-soft` | `--portal-text-2` | `--portal-signal` + halo `0 0 0 2px var(--portal-signal-glow)` |

Anatomy: 999px, 11px/700 caps +0.05em, padding 3×10, optional 5px dot
(gap 6) with 3px halo tone @0.25; inner rim `inset 0 0 0 1px` tone
@0.18. `live` = the ONLY glowing pill ("happening now"). Map existing
semantics (pending→warning, active→success, …) — never invent meanings.

**Neutral meta chips** (counts, GHN, relationships, languages): Material
C, radius 8 (square-ish ≠ status pill), 11px/700 ink, 24px height,
leading lucide 14px muted.

**FlagBadge:** flag asset in a 22px Material C tile radius 6 + 1px line;
label 12px/700 ink.

### 7.8 Forms — every control

**Shared shell (input/textarea/select):** min-height 44px, radius 10,
label 12.5px/700 ink above (6px gap), helper 12px muted below (4px gap).

| State | Recipe |
|---|---|
| rest | Material C |
| hover | border → `--portal-line-strong` |
| focus | fill → white; border 1px `--portal-mint-text`; ring `0 0 0 3px var(--portal-focus)`; + 40%-strength `--lux-elev-1` — the field *rises* |
| error | border `--portal-danger`; ring danger @0.35; helper REPLACED by 12px danger-text message |
| success | 1px `--portal-success` border, no ring |
| disabled | Material C, 0.6 text, no hover |
| readonly | Material C, ink text, no focus rise |

- **Select:** `appearance:none` + lucide `ChevronDown` 16 muted, right 12.
- **Search:** `Search` 16 muted left (36px pad-left); clear = IconBtn `X`
  14 when non-empty.
- **Checkbox:** 18px radius 5; Material C rest; checked = forest duotone
  + white `Check` 13 strokeWidth 3; indeterminate = `Minus`; focus ring;
  disabled 0.5.
- **Radio:** 18px round; checked = 1px forest border + 8px forest dot.
- **Toggle (`Toggle` atom — submit button, element type FROZEN):** track
  36×20 radius 999; off = Material C + 16px white knob
  (`0 1px 2px rgba(7,18,12,0.2)`, 1px `rgba(255,255,255,0.4)` rim); on =
  forest duotone track, knob slides 16px (200ms); focus ring; disabled
  0.5.
- **Date/time:** shared shell; mono 12.5px values.
- **Phone field (`phone-field.tsx` — PUBLIC-SHARED, verify `(site)`
  checkout after edit):** shared shell; country-code segment = Material C
  chip inside the field + 1px divider.
- **Upload/dropzone (`managed-image-field`, `multi-image-field`, doc
  uploads):** dashed 1.5px `--portal-line-strong`, radius 14, Material C
  @50%; `Upload` 20 muted; dragover = dashed accent + inner bloom
  `radial-gradient(closest-side, rgba(176,241,34,0.08), transparent)`;
  thumbs = 48px Material C tiles radius 8 + remove IconBtn on hover.
- **Rich text (`rich-text-html-field`):** editor gets the shared shell;
  toolbar = Material C strip radius 10, IconBtn buttons; active format =
  mint-soft fill + accent-text glyph.
- **`FormSection`:** Material B card + SectionHeader + grid 2-col ≥900px
  gap 16.
- Replace blanket `.gh-admin-main :where(input…)` normalization with
  these rules (selector kept as matching safety net).

### 7.9 Tabs (`PortalTabs` + legacy tab headers)

13px/700; rest muted → hover ink → active ink; active underline = 2px
`--portal-accent` sliding transform 200ms + 4px glow @30% (a lit
filament); container bottom 1px `--portal-line`; overflow-x scroll +
24px fade masks; count badges = neutral chips. Applies visually to
`plan-edit-tabs`, `*-translation-tabs`, `appointment-tabs`, profile
`*-tab` headers, `faq-language-tabs` even before they migrate.

### 7.10 Sidebar (both shells, lockstep)

Material A + streak; width `--portal-sidebar-w`.
- Right edge: 1px chrome border + 1px seam light
  `linear-gradient(180deg, transparent, rgba(176,241,34,0.45) 35%, rgba(176,241,34,0.10) 70%, transparent)`.
- Nav item (CSS classes — DELETE inline `onMouseEnter/Leave` mutation in
  both shells): rest chrome-text, radius 10; hover active-white +
  `rgba(255,255,255,0.05)`; **active (`aria-current`)** =
  `rgba(176,241,34,0.12)` fill + `inset 0 0 0 1px rgba(176,241,34,0.25)`
  ring + text `--portal-signal` + 3px lime bar (animates height 0→18px,
  200ms) with `0 0 8px var(--portal-signal-glow)` + icon
  `drop-shadow(0 0 6px rgba(176,241,34,0.5))`.
- Rest icons 18px strokeWidth 1.75 @0.6 → 1 on hover.
- Section labels: 9.5px/800 +0.18em caps `rgba(233,239,233,0.4)`.
- Badges: live/unread = lime dot + halo; else neutral chrome chip
  (`rgba(255,255,255,0.10)`).
- Bottom fade:
  `mask-image: linear-gradient(180deg, #000 calc(100% - 48px), transparent)`.
- Keep `.gh-dark-scroll`. Logo block unchanged; portal eyebrow label
  accent @0.9. Sidebar texture PNG rules deleted.

### 7.11 Topbar, breadcrumbs, country picker, user menu

- Topbar: Material A, 64px, sticky; bottom hairline → seam-light gradient
  on scroll >8px (the ONLY scroll effect).
- Portal glyph: 22px rounded square radius 6, `--lux-chrome-border` ring,
  accent glyph 14px, inner glow accent @10%.
- Breadcrumbs: 13px chrome text; `ChevronRight` 12 @0.5 separators; last
  crumb 700 active-white; CUID truncation preserved; mobile `‹ Parent`.
- Country picker (Admin): chrome pill trigger (FlagBadge mini + name +
  `ChevronDown` 14); menu = Material D, search top, rows 40px, active =
  mint-soft + accent-text, hover well.
- User pill: bell + avatar in ONE pill, 1px chrome border, soft internal
  divider. Avatar 28px radius 9; image + 1px `rgba(255,255,255,0.2)`
  rim; fallback = forest duotone + 11px/700 ivory initials.
- User menu: Material D; name 13/700 ink + email 12 muted; role = neutral
  chip; divider line-soft; sign-out = danger text + `LogOut` 16.

### 7.12 Notifications (popover + full-page lists)

- Popover: Material D radius 18; from-bell origin scale 0.96→1 + fade
  200ms + one-time top specular sweep.
- Row: 12px v-padding; icon tile 32px Material C + kind glyph 16
  accent-text; title 13px/700 ink; body 12.5 muted 2-line clamp; time
  11px mono muted; unread = 5px lime dot + halo + signal-soft @0.5 tint;
  mark-as-read fades 280ms. Footer = full-width `soft` "view all".
- Full-page lists (Doctor `notification-list`, Patient
  `patient-notification-list`): same rows inside a Material B card.
- Bell: `Bell` 18 chrome-text; unread badge = lime dot + halo.

### 7.13 Modals, dialogs, toasts

- `PortalDialog` / legacy modals: Material D radius 18; overlay §5.4;
  enter scale 0.98→1 + fade 200ms; mobile bottom sheet 280ms + 36×4px
  grabber `rgba(16,23,19,0.15)`; header 16/800 ink + close IconBtn;
  footer actions right, primary last; danger = 5px danger dot before
  title; type-to-confirm flows preserved. Focus trap + Esc + focus
  return required. Absorbs `confirm-delete-button`,
  `consultation-documents-modal`, `delete-account-button`,
  `EventDetailDialog`.
- Toasts (sonner): surface = solid white + `--lux-elev-modal` @70%,
  radius 14, 13px/600 ink; leading tone dot + glyph (`CircleCheck` /
  `CircleAlert` / `Info` 16, tone color); bottom-right; 4s. Tone lives in
  dot + glyph only — no colored surfaces.

### 7.14 Chat (one bubble core: `ChatThread`, `ConsultationChat`, `InternalMessagesThread`)

Thread = Material B; message area = Material C. Own bubble =
`--lux-forest-duotone` + `inset 0 1px 0 rgba(255,255,255,0.12)`, ivory
text; other = `rgba(255,255,255,0.9)` + hairline, ink; both radius 14 w/
one 4px tail corner; max-width 72%; timestamp 11px mono muted @0.7.
System/internal note = dashed neutral chip centered 12px muted.
Composer = Material B strip pinned bottom + top hairline gradient;
borderless well input; send = `primary` sm + `SendHorizonal` 16;
disabled = well fill + plain-language reason. New messages rise 6px +
fade 200ms. Five mount points — click through all after edit.

### 7.15 Calendar + availability

- `MonthCalendar`: Material B; hairline (line-soft) cell separators, no
  boxed grid; day numerals 13px tabular; today = 2px accent ring + 4px
  glow @30%; selected = forest duotone fill ivory text; event dots 5px
  tone map (max 3 + "+n" 10px muted); weekend headers muted; other-month
  @0.35.
- `DayAgenda`: left rail 1px line + lime now-tick + halo breathing
  0.7↔1 / 3s — suppressed when a Command Band aurora shares the viewport
  (one ambient max); events = compact Material B `.is-static`, tabular
  times, pill.
- `TimezoneSelect` = select recipe; `EventDetailDialog` = dialog recipe.
- Availability slot chips (`availability-ui`): 36px radius 8; rest
  Material C; active = `rgba(143,176,33,0.16)` +
  `inset 0 0 0 1px rgba(143,176,33,0.4)` + mint-text label; blocked =
  danger-soft + danger-text; hover = line-strong border; focus ring.
- `calendar-utils.ts` / `calendar-types.ts`: DO NOT TOUCH. Verify all
  three `/calendar` routes after edits.

### 7.16 Tables

Container = Material B (blur on container only; rows opaque):
- Header row: `rgba(242,244,238,0.7)` fill, 10.5px/800 +0.12em caps
  muted, 1px `--portal-line-strong` rule, **sticky** in card scroll area;
  first col pad-left 20.
- Rows: 44px dense / 52px comfortable (`data-density`); separators
  line-soft.
- Hover: `rgba(143,176,33,0.07)` wash + 2px accent inset left bar w/ 4px
  glow (slides 120ms); cell text muted→ink sharpen; IconBtns 0.55→1.
- Selected: persistent mint wash + 1px accent left border.
- Numerics right tabular; IDs mono 12.5 muted→ink on hover.
- **No zebra. Ever.** Raw `<table>` pages inherit via the
  `.gh-admin-main table` safety net — keep values identical.
- <760px → mobile cards §7.18.

### 7.17 Domain cards

- **DocumentTable rows** (Doctor `doctor-document-tables`, Patient
  `medical-files`, Admin legal docs): 32px kind tile (Material C, lucide
  16 accent-text: `FileText` docs / `Pill` Rx / `FlaskConical` labs /
  `Receipt` invoices); name 13.5/700 ink + meta 12 muted; pill; trailing
  IconBtns. Patient variant: 52px rows, ≥44px targets, "shared by Dr. X"
  meta.
- **AppointmentCard:** time 15px/800 tabular + tz 11 muted · person/
  service 13.5/700 + 12 muted · pill + action; 3px status gradient left
  edge (tone → transparent) + 2px glow; `live` = lime edge + halo.
- **Payment/order cards:** amounts 20px/800 tabular ink-gradient;
  currency 0.7em; mono last-4 (`•• 4242`); paid = success pill; refunds
  = pill + ONE plain sentence (Patient).
- **Membership plan card (Patient):** header = Material A band radius
  14-top + 1px `--portal-member` hairline + plan name ivory 18/800 +
  pill + optional `membership-silk.png` corner @≤0.5; body Material B:
  benefit rows = `Check` 16 success + 13.5 ink sentence; **progress
  bar** (the ONLY one in the system): 6px radius 999, Material C track,
  `--portal-signal` fill + 20% highlight sweep on value change only;
  manage actions behind disclosure, danger-soft cluster.
- **Finalize checklist (Doctor):** Material C rows radius 10; done =
  success-soft + `CircleCheck` 16 success; pending = `Circle` 16 muted;
  200ms transition.
- **Subscription health panel (Admin):** Material A strip; tone dots +
  24px tabular luminous numerals; micro-labels chrome @0.6.

### 7.18 Mobile cards (`PortalMobileCard` + `.gh-admin-mobile-card` fallbacks)

Material B `.is-static`; 3px gradient status edge + 2px glow; title row
15/700 ink + pill; meta grid micro-label / value 13px ink; trailing
action row; press = scale(0.99) + `--lux-elev-press` (150ms).
Breakpoint stays 760px.

### 7.19 Empty states + skeletons

- Empty (`AdminEmptyState`): illustration ≤220px + backing bloom
  `radial-gradient(280px 180px at 50% 40%, rgba(143,176,33,0.06), transparent)`
  OR 44px Material C icon tile + lucide 24 accent-text; title 16/800
  ink; body 13.5 muted ≤52ch; optional primary action; 48px padding.
  Every list surface must render one.
- Skeletons (promote `admin/_components/skeletons.tsx` →
  `components/portal-skeletons.tsx` + re-export shim at old path): bases
  = Material C gradient; shimmer sweep white @0.75 with faint mint
  center `rgba(143,176,33,0.15)`, 1.6s ease-in-out;
  `prefers-reduced-motion` → static pulse; Command Band skeleton =
  Material A + streak + shimmering numeral blocks. Shapes mirror real
  composition — no load jumps.

### 7.20 Micro-layer

- **Links:** `--portal-primary` 600; hover underline 1.5px
  `--portal-mint` offset 3px; in-table links ink + hover underline.
  Never lime.
- **Dividers:** 1px line-soft; labeled = 10px/800 caps muted centered w/
  side lines.
- **Avatars:** 32/40px radius 10; image + 1px line rim; fallback forest
  duotone + ivory initials 12/14 700.
- **Scrollbars:** light = 8px thumb `--lux-scrollbar-thumb` radius 999 →
  hover token, transparent track; dark = keep `.gh-dark-scroll`.
- **Selection:**
  `.gh-portal-shell ::selection { background: var(--lux-selection); color: var(--portal-text); }`
- **Tooltips (only where one already exists):** solid
  `--portal-chrome-solid`, radius 8, padding 6×10, 12px/600 ivory,
  `0 8px 24px rgba(4,10,7,0.5)`, fade+2px rise 150ms, delay 400ms, no
  arrow.
- **Scope banner (Admin):** Material B strip radius 12 + 3px accent left
  gradient bar + FlagBadge + 13/700 ink + 12.5 muted explainer.
- **Inline alert/consent cards (GDPR, recurring-charge, brazil-consent,
  payment-needed):** Material B + 3px tone left gradient bar + 32px tone
  icon tile (Material C) + title 13.5/700 tone-text + body 13
  `--portal-text-2`. No full tone-colored surfaces.

---

## §8. Icon system (lucide-react — confirmed dependency)

- Library: `lucide-react` ONLY. No emoji, no mixed sets, no custom SVGs
  for standard concepts.
- Sizes: 14 (chips/small meta) · 16 (buttons, rows, inputs) · 18 (nav,
  topbar, md/lg buttons) · 20 (icon tiles) · 24 (empty tiles). Never
  other sizes.
- Stroke: `1.75` nav/tiles/decorative; `2` buttons + small functional.
  Never 1 or ≥2.5.
- Color = context text color via `currentColor`; opacity ladder: muted
  0.55 → rest 0.75 → active/hover 1. Accent color only when the icon IS
  the signal (live, verified, selected kind tile).
- Glow: ONLY the active sidebar icon (§7.10).
- **Canonical glyph map (use these; don't improvise):** dashboard
  `LayoutDashboard` · appointments `CalendarClock` · calendar
  `CalendarDays` · patients/users `Users` · doctor `Stethoscope` ·
  documents `FileText` · prescriptions `Pill` · lab results
  `FlaskConical` · payments/invoices `Receipt` · orders `ShoppingCart` ·
  chat `MessageSquare` · notifications `Bell` · settings `Settings` ·
  profile `UserRound` · membership `BadgeCheck` · rewards `Gift` ·
  security `ShieldCheck` · availability `Clock` · services
  `ClipboardList` · reports `BarChart3` · upload `Upload` · download
  `Download` · search `Search` · close `X` · confirm `Check` · success
  `CircleCheck` · danger `CircleAlert` · info `Info` · edit `Pencil` ·
  delete `Trash2` · view `Eye` · external `ExternalLink` · chevrons
  `ChevronRight/Down/Left` · send `SendHorizonal` · sign out `LogOut` ·
  loading `Loader2`. Existing correct icons stay; replace only obvious
  mismatches.
- **Charts/telemetry:** series 1 lime, 2 mint, 3 forest, rest grays;
  gridlines line-soft; axis labels 11px muted; tabular numerals; no 3D;
  flat @0.08 under-line tint allowed, no gradient fills.

---

## §9. Page blueprints + picture-perfect targets

### 9.1 Blueprints (composition)

**Dashboard:** `CommandBand` → stat grid (`auto-fit minmax(240px,1fr)`)
→ quick actions / queue cards → primary work surface.
**List page:** Mode-1 masthead → optional summary strip → filter row
(search + selects + scope banner) → table (desktop) / mobile-card stack
(<760px) → designed empty state at zero rows.
**Detail page:** slim masthead + Mode-2 identity card → optional dark
mini-band (Admin orders money summary) → two-zone ≥1024px (main cards |
context rail) → single column below.
**Form page:** Mode-1 masthead (save/cancel right) → `PortalTabs` when
translations/sections exist → `FormSection` cards 2-col ≥900px → sticky
mobile action bar.
**Settings/profile:** masthead → tabs → status-first tone card when
action needed → FormSection per group.

### 9.2 Picture targets (the paintings the recipes must add up to)

**T1 — Patient dashboard (`/account`, 1280px):** dark forest frame
around a softly glowing ivory plane (warm bloom top-right). First: the
Command Band — black liquid glass with a diagonal reflection streak,
"Good morning, Sarah" with *Sarah* in deep olive, next-appointment date
in a huge lime-gradient numeral with soft glow, smaller ivory metrics
behind faint vertical hairlines. Below: three frosted health-home chips
with specular tops and accent icon tiles; then the subscription cluster
— glass cards, lit top borders, mint-kiss corners, plan pill glowing
faintly lime if active. Every hover lifts + brightens + casts lime
underglow. Nothing flat white; nothing green-surfaced.

**T2 — Patient membership:** slim masthead with accent aura. Plan card:
obsidian header band with pale lime-silk hairline and silk light in the
corner, ivory plan name; white glass body with mint-checked benefit
sentences; one thin lime progress bar on an etched track. Manage behind
a quiet disclosure; danger soft, never loud.

**T3 — Patient bookings (390px mobile):** single column of glass mobile
cards, status-tone gradient edges left, pills right, bold tabular times;
payment-needed card = warning icon tile + ONE forest button; press
gently compresses; sticky bottom bar on payment screens.

**T4 — Doctor dashboard (1440px):** calmer plane. "Now" band: black
glass, next-appointment time 48px lime gradient, patient + service in
ivory, one `on-chrome` join button. Live consult → hairline shifts
lime-heavy, one dot pulses twice then rests. Below: comfortable
appointment cards with glowing status edges, then two quiet stat cards
with engraved ink-gradient numerals.

**T5 — Doctor appointment detail (live):** slim header + identity card
(patient tile, GHN mono, pill). Left: consultation form on glass, etched
wells rising white on focus — and NO hover physics anywhere in this zone
while live. Right: context rail — document rows with kind tiles, chat
with forest-duotone own bubbles. Exactly ONE primary button on the page:
finalize.

**T6 — Any Admin list (inherits):** masthead with area-accent aura;
glass summary mini-cards; glass table container with sticky etched
header; rows washing mint with glowing accent bars on hover; money/IDs
tabular/mono sharpening on hover; designed empty state with backing
bloom.

---

## §10. States matrix (all required, per component class)

| Component | Rest | Hover | Focus-visible | Active/selected | Disabled | Loading | Empty | Error |
|---|---|---|---|---|---|---|---|---|
| Button | §7.6 variant | fill/light shift | 3px mint ring | translateY(1px) + press shadow | 0.5, no pointer | spinner, label stays | — | — |
| Nav item | chrome text | white + faint fill | ring (visible on dark) | lime glass pill system | — | — | — | — |
| Card (interactive) | elev-1 | lift + brighten + glow | ring | — | — | skeleton | — | — |
| Table row | plain | mint wash + glowing bar | row ring | persistent wash + border | — | skeleton rows | AdminEmptyState | inline danger tint |
| Input | Material C | line-strong | mint border + ring + rise | — | 0.6 text | — | muted placeholder | danger border + ring + message |
| Pill | tone | — | — | — | — | — | — | — |
| Tab | muted | ink | ring | ink + lit underline | 0.5 | — | — | — |
| Dialog | — | — | trap inside | — | — | button spinner | — | danger dot header |
| Chat composer | Material B bar | — | ring | — | plain-language reason | sending tint | — | retry affordance |
| Toggle | §7.8 | — | ring | on = forest duotone | 0.5 | — | — | — |
| Page | — | — | — | — | — | skeleton kit mirrors layout | designed empty | root error.tsx (danger empty-state anatomy) |

Every route group gets `loading.tsx` from the kit; each portal root gets
`error.tsx` (none exists today — add during role phases).

---

## §11. Motion

- Durations 120 / 200 / 280ms. Easing `cubic-bezier(0.22,1,0.36,1)`
  entrances, `ease-out` exits. `transform`/`opacity` only. Nothing
  bounces.
- ONE ambient per viewport: band aurora drift (30s) OR agenda now-tick
  breathe (3s) — band wins when both would show.
- Page enter: `.gh-portal-enter` fade + rise 8px, 200ms, CSS only.
- Mobile nav sheet: slides 280ms, scrim fades, items stagger 20ms
  (max 8).
- One-time specular sweeps (popover open) allowed; nothing loops on
  content.
- `prefers-reduced-motion`: transitions ≤50ms opacity-only; shimmer
  static; drift paused; pulses off.
- `will-change: transform` ONLY on hover-lifting cards, removed after;
  never global.

---

## §12. Role differentiation + polish priorities

| Aspect | Admin | Doctor | Patient |
|---|---|---|---|
| `data-portal` | `admin` | `doctor` | `patient` |
| Accent | lime `#B0F122` | mint `#8FB021` | pale lime `#CFEC81` (+ member silk) |
| Accent text | `#4E6B10` | `#5E7516` | `#4E6B10` |
| `data-density` | dense (44px rows) | comfortable (52px) | comfortable |
| Plane veil | standard | calm (60% blooms) | warm (pale-lime bloom) |
| Command Band | ops metrics + scope chip | "Now" instrument + live states | greeting + next appointment / book CTA |
| Layout bias | tables, two-zone detail | two-zone workspace, calm mode | cards-first, single column, ≥44px targets |
| Special | country picker; dark telemetry strips | live-consult calm mode (no hover physics in form zone) | membership silk; sticky payment bars |

**Order of work:** Patient first (§9.2 T1–T3; verify 390px FIRST),
Doctor second (T4–T5), Admin inherits (T6 smoke check only; deep Admin
polish is a later commit).

---

## §13. Asset pack — complete inventory + all generation prompts

All under `frontend/public/images/portal/obsidian/`, all decorative
(`aria-hidden`, empty `alt`). **UI must look finished with zero images**
— assets wire in the final commit. Every prompt bakes in: no text, no
letters, no numbers, no logos, no watermarks, no UI, no screens, no
people, no medical gore, no needles/blood.

**13 assets. Required: A1, V1, H1, E1, E2. Optional: rest.**

| # | File | Used where | Req? | Opacity cap | Size | Transparent |
|---|---|---|---|---|---|---|
| A1 | `canvas-aurora.webp` | L0 canvas | **Req** | 0.5 | 2560×1440 | no (dark) |
| V1 | `plane-veil.webp` | ivory plane | **Req** | 0.35 | 2560×1440 | no (light) |
| H1 | `header-aura.webp` | PageHeader zone, masked | **Req** | 0.3 | 2000×640 | no (light) |
| V2 | `card-silk.webp` | jewel cards, top third | Opt | 0.25 | 1200×600 | no |
| V3 | `band-aurora.webp` | Command Band backdrop | Opt | 0.5 | 1600×500 | no (dark) |
| M1 | `membership-silk.png` | plan-card corner | Opt | 0.5 | 1200×480 | yes |
| E1 | `empty-records.png` | medical-files/prescriptions empty | **Req** | 1.0 | 960×640 | yes |
| E2 | `empty-queue.png` | Doctor appointments/patients empty | **Req** | 1.0 | 960×640 | yes |
| E3 | `empty-documents.png` | doc panels / legal docs empty | Opt | 1.0 | 960×640 | yes |
| E4 | `empty-payments.png` | payments/orders/invoices empty | Opt | 1.0 | 960×640 | yes |
| E5 | `empty-content.png` | blog/pages/newsletter empty | Opt | 1.0 | 960×640 | yes |
| E6 | `empty-notifications.png` | notification lists empty | Opt | 1.0 | 960×640 | yes |
| C1 | `empty-calendar.png` | empty month/agenda | Opt | 1.0 | 960×640 | yes |

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

**Wiring rules:** H1 masked
`linear-gradient(180deg, #000 60%, transparent)`; per-portal tint from
the CSS aura on top, not separate assets. E-assets → existing
`AdminEmptyState assetSrc` slots; icon-tile fallback stays. Retire
legacy PNG references first; delete files only when
`rg "images/portal" frontend/` shows zero refs to each.

---

## §14. Depth & light discipline + anti-patterns (banned)

**Budgets:**
1. One jewel per screen (band OR corner-bloom card).
2. Lime glow on ≤3 elements per viewport.
3. Streaks static except the 30s band drift.
4. ≤6 blurred panes per viewport; `.is-static` after the 4th list card.
5. Gradient text on numerals only.
6. Shadows never darker than the §3 stacks.
7. Icons follow the opacity ladder.

**Banned (fails review even if it "looks fine"):**
1. Lime text on white/ivory; lime surface fills; lime borders on static
   elements.
2. Any green page/card background wash.
3. Blur outside Materials A/B or beyond the budget.
4. Gradients beyond the tokenized set (§3) + the four environment/seam
   gradients (§4, §7.3, §7.4).
5. Texture/noise over surfaces; the five legacy PNGs anywhere.
6. New `!important`; inline hex/radius/shadow in components.
7. Pill-shaped action buttons; rectangular status pills.
8. Two glowing/bloomed compositions in one viewport region.
9. Uniform emphasis (no screen jewel); zebra striping.
10. Spinners instead of skeletons for full-page loads; blank empty
    screens.
11. Colored text as decoration (color = meaning only).
12. Editing `atoms.tsx` markup for a role-specific need (fork a variant
    in the role's `_components`).
13. Renaming `.gh-admin-*`; forking `portal-atoms.ts`.
14. Bouncy/spring motion; animating layout properties.
15. Emoji as icons; non-lucide icon imports.

---

## §15. UX copy tone (states this pass touches)

- Empty states: reassuring, specific, one action — "No documents yet —
  they'll appear here after your consultation." Never "No data."
- Errors: plain language + next step + support link on Patient; raw
  codes allowed only as an Admin mono detail line.
- Refunds (Patient): one plain sentence next to the pill — "We've
  refunded €25 to your Visa •• 4242. It can take 5–10 business days."
- Destructive confirms: state the consequence, name the object, keep
  type-to-confirm.
- Disabled chat: say why — "This chat closed when your consultation was
  completed."

---

## §16. Accessibility gates (block merge if failed)

1. All text/fill pairs (§3, §7.7) ≥4.5:1; large numerals ≥3:1. Verify
   chrome text over the aurora at its brightest point AND ink over the
   bloomiest plane point + a Material B card there — ≥12:1.
2. Focus-visible mint ring on EVERY interactive element, both worlds —
   verified visible on dark chrome.
3. `@supports not (backdrop-filter)` + `prefers-reduced-transparency` →
   §5.5 solid fallbacks, still premium.
4. Touch targets ≥44px on all Patient surfaces.
5. Dialog focus trap, Esc, focus return.
6. Body text NEVER on chrome; chrome text = headings/labels/metrics
   ≥12px/700 + nav items.
7. Lime never text on white (`--portal-signal-text` instead).
8. Keyboard: full nav traversal, table row focus, arrow keys where tabs
   are composite widgets.
9. `prefers-reduced-motion` per §11.

---

## §17. File ownership map

| Surface | Owner file(s) |
|---|---|
| Tokens, canvas, plane, materials, nav classes, table/form safety nets | `frontend/app/globals.css` (portal blocks only; `:root` untouchable) |
| PageHeader, SectionHeader, AdminCard, StatCard, AdminSummaryStrip, AdminEmptyState, Pill, Btn, IconBtn, Toggle, table prims, CommandBand | `frontend/app/(admin)/admin/_components/atoms.tsx` |
| Doctor/Patient import path | `frontend/components/portal-atoms.ts` (re-export ONLY) |
| Admin chrome + country picker | `frontend/app/(admin)/admin/_components/admin-shell.tsx` |
| Doctor/Patient chrome | `frontend/components/portal-shell.tsx` |
| Bell popover | `frontend/components/NotificationPopover.tsx` |
| Calendar | `frontend/components/calendar/**` (not `-utils`/`-types`) |
| Chat core | `frontend/components/chat/**` |
| Phone input (portals + PUBLIC site) | `frontend/components/forms/phone-field.tsx` |
| Skeleton kit | `frontend/components/portal-skeletons.tsx` (+ shim at `admin/_components/skeletons.tsx`) |
| New primitives (`PortalDialog`, `PortalTabs`, `FormSection`, `PortalMobileCard`) | `atoms.tsx` or `frontend/components/`; export via `portal-atoms.ts` pattern untouched |
| Role compositions | each portal's route `_components` — NEVER edit shared files for a role-only need |

---

## §18. Implementation order + validation

Seven commits, in order:

1. `feat(portals): lux tokens + ambient environment` — §3 + §4,
   `globals.css` only.
2. `feat(portals): lux materials on cards/stat cards/empty/skeletons` —
   §7.1, 7.2, 7.19.
3. `feat(portals): lux chrome — sidebar/topbar/band` — §7.3, 7.10, 7.11
   (BOTH shells lockstep, same commit).
4. `feat(portals): lux tables/forms/buttons/pills/tabs` — §7.5–7.9,
   7.16.
5. `feat(portals): lux chat/calendar/modals/toasts/mobile/micro + icon
   pass` — §7.12–7.15, 7.18, 7.20, §8.
6. `feat(portals): patient + doctor role polish + headers` — §7.4 across
   routes, §7.17 domain cards, §12 role work, portal-root `error.tsx`.
7. `feat(portals): lux asset wiring` — §13 (ONLY after the user
   generates assets; skip + note if absent — CSS-only must already pass
   §19/§21).

Per commit: `npm run lint`, `npx tsc --noEmit`, `npm run build` in
`frontend/`; render `/account` and `/doctor` at 390/768/1280/1920
(Patient 390px FIRST), `/admin` smoke, public `(site)` homepage +
checkout smoke if any shared `.gh-*` rule or `phone-field` was touched.
After commits 6 (and 7 if run): report §19 acceptance + §20 inventory +
§9.2 picture targets, pass/fail per item.

---

## §19. Acceptance checklist (flatness gone = all checked)

- [ ] No pure-flat `#FFFFFF` container anywhere (all = Materials
      A/B/C/D).
- [ ] Every card: specular top, gradient perimeter, ≥4-layer shadow,
      glass fill.
- [ ] Stat numerals gradient-filled 40px+, micro-cap labels, accent-ring
      icon tiles.
- [ ] Band: streak + inner aurora + gradient hero numeral + metric
      separators.
- [ ] Every non-dashboard page has a §7.4 masthead (aura + hairline +
      bottom fade seam); detail pages show the identity card.
- [ ] Plane visibly breathes — screenshot vs flat `#FAFBF7`; if
      indistinguishable, blooms too weak.
- [ ] Hover = lift + brighten + glow together; buttons press in; inputs
      rise on focus.
- [ ] Icons: lucide only, correct sizes/strokes, opacity ladder visible.
- [ ] Toasts/tooltips/menus/dialogs on Materials A/D — zero unstyled
      defaults.
- [ ] Focus rings visible everywhere, both worlds.
- [ ] Contrast spot-checks per §16.1 pass.
- [ ] `prefers-reduced-motion` + blur fallback renders still premium.
- [ ] Each §9.2 picture target (T1–T6) matches its description.
- [ ] With assets: A1/V1/H1 at caps; without: CSS-only passes everything
      else.
- [ ] Git diff = CSS/className/style-object/`::before/::after` only —
      zero behavior/markup-structure diffs.

---

## §20. Component inventory (every row ends "lux-skinned" or "verified inherits")

| Component (file) | Recipe |
|---|---|
| `atoms.tsx` PageHeader / Eyebrow / SectionHeader | §7.4 |
| `atoms.tsx` AdminCard | §7.1 |
| `atoms.tsx` StatCard | §7.2 |
| `atoms.tsx` CommandBand | §7.3 |
| `atoms.tsx` AdminSummaryStrip | §7.5 |
| `atoms.tsx` AdminTable kit | §7.16 |
| `atoms.tsx` Btn / IconBtn | §7.6 |
| `atoms.tsx` Pill | §7.7 |
| `atoms.tsx` Toggle | §7.8 (element type frozen) |
| `atoms.tsx` AdminEmptyState | §7.19 |
| `admin-shell.tsx` + `portal-shell.tsx` (LOCKSTEP) | §7.10, §7.11 |
| `NotificationPopover.tsx` | §7.12 |
| calendar 4 components | §7.15 |
| chat 3 components | §7.14 |
| `forms/phone-field.tsx` (PUBLIC-SHARED) | §7.8 |
| `forms/LanguagePicker.tsx` | §7.8 + chips §7.7 |
| `portal-skeletons` (+ shim) | §7.19 |
| `PortalDialog` / `confirm-delete-button` / `delete-account-button` / `consultation-documents-modal` | §7.13 |
| `PortalTabs` + all legacy tab headers | §7.9 |
| `PortalMobileCard` + `.gh-admin-mobile-card` fallbacks | §7.18 |
| `country-picker` / `flag-badge` / `scope-banner` | §7.11, §7.7, §7.20 |
| `managed-image-field` / `multi-image-field` / upload forms | §7.8 |
| `rich-text-html-field` | §7.8 |
| `skeletons.tsx` (admin loading) | §7.19 |
| `subscriber-ledger` | §7.16 |
| `subscription-health-panel` | §7.17 |
| Doctor `doctor-document-tables` / `documents-*` / `prescriptions-list` / `exam-results-list` | §7.17, §7.16 |
| Doctor `consultation-form` / `finalize-checklist` / `appointment-actions` / `form-fill` | §7.8, §7.17, §7.6 |
| Doctor `availability-ui` | §7.15 |
| Doctor `notification-list` / Patient `patient-notification-list` | §7.12 |
| Doctor `templates` / `csv-button` / profile `edit-form` / `profile-sections` | §7.1, §7.6, §7.8 |
| Patient `SubscriptionDashboard` / `ManagePanel` / `RewardsPanel` / `SubscribeForm` | §7.17 |
| Patient `receipt-button` | §7.6 (`soft`) |
| Patient bookings `ui.tsx` | §7.17, §7.14 |
| Patient `medical-files` / profile tabs (gdpr/insurance/nationality/verification) | §7.17, §7.9, §7.20 alerts |
| sonner Toaster theme | §7.13 |
| Links / dividers / avatars / scrollbars / selection / tooltips | §7.20 |
| Icons everywhere | §8 |
| PageHeader aura + identity headers (all detail routes) | §7.4 |
| Asset wiring (A1/V1/H1 + E-set) | §13 |

---

## §21. Decision defaults + definition of done

**Defaults (when this file is silent):** unknown container → Material B
`.is-static` · unknown small fill → Material C · unknown icon → nearest
§8 concept, 16px stroke 2 rest opacity · unknown hover → border brighten
+ text sharpen only · unknown emphasis → LESS (neutral, no glow) ·
unknown spacing → nearest scale value, prefer larger · "needs a new
color" → it doesn't (§3 only) · data/behavior ambiguity → don't touch.

**Definition of done (per commit and overall):**
- Zero inline hex/radius/shadow in touched TSX (grep
  `#[0-9A-Fa-f]{3,8}`; allowed only in the `globals.css` token block).
- Zero new `!important`; old ones removed only replacement-first.
- Both shells byte-equivalent in shared class usage.
- All portals render 320/768/1280/1920 without horizontal overflow; dark
  frame visible at 1280.
- Public site homepage + checkout visually unchanged.
- Same status semantic renders identically from `Pill` and
  `.gh-badge-*`.
- §10 states matrix satisfied for every touched component; §14 scan
  clean; §19 checklist + §20 inventory + §9.2 targets reported.
- Dependency map §3/§9 updated in the same commit as any shared change.

---

## §22. Cheat sheet

```
WORLDS      canvas #07120C+blooms · chrome lux gradient blur32 · plane #FAFBF7+veil · cards = Material B glass · wells #F2F4EE etched
MATERIALS   A obsidian liquid (chrome+streak) · B ivory liquid glass (cards) · C etched well (inputs/tiles) · D halo elevated (modals/menus/toasts)
TEXT        ink #101713 · body #3C463F · muted #6D6D6D · on-chrome #E9EFE9@.86
GREENS      act=forest #1D4B36 · notice=mint #8FB021 (text #5E7516) · alive=lime #B0F122 (text #4E6B10)
ACCENTS     admin lime · doctor mint · patient #CFEC81 · member silk #E3F5B0 (membership only)
STATUS      ok #2F7D4E · warn #B07C1A · danger #BC4A42 · info #56707A · live = lime dot+halo (only glowing pill)
NUMERALS    band hero 48-56 live-gradient+glow · stats 40-44 ink-gradient · always tabular · gradient text = numerals ONLY
SHADOWS     lux-elev-1 rest · lux-elev-2 hover(+lime underglow) · chrome · modal · press — tokens only, 5 layers
RADIUS      10 action · 14 card · 18 band/modal · 999 status pill · 8 chips/inner
TYPE        h1 clamp(24,2vw,34)/-0.03em · micro-label 10/800/+0.14em caps · eyebrow 11/800/+0.12em · mono for IDs
ICONS       lucide only · 14/16/18/20/24 · stroke 1.75|2 · opacity .55/.75/1 · glow only active sidebar icon
HEADERS     Mode1 masthead (aura+hairline+fade seam) · Mode2 identity card on detail pages · band IS the dashboard header
MOTION      120/200/280 · transform+opacity · one ambient max (band drift 30s beats agenda tick)
BUDGETS     1 jewel/screen · ≤3 lime glows/viewport · ≤6 blurred panes · .is-static after 4th list card
NEVER       lime text on white · green surfaces · flat #FFF containers · zebra · pill buttons · new gradients · inline hex · emoji icons
PRIORITY    Patient (390px first) → Doctor → Admin inherits
```

---

## §23. Ready-to-paste agent prompt

> You are implementing the **Obsidian Ivory · Liquid Lux** portal design
> on branch `Dev-hassaan`. Read
> `docs/portal-redesign/portal-shared-ui-dependency-map.md` (blast
> radius) and `docs/portal-redesign/DESIGN2.md` (the consolidated spec —
> the single authority; it supersedes DESIGN.md and LUX-VISUAL-PASS.md
> on any conflict). This is a **visual skin implementation**: no markup
> restructuring, no prop changes, no behavior changes, no route changes
> (§0 commandments are absolute). Implement the seven commits in
> DESIGN2.md §18 in order (commit 7 only if generated assets exist).
> Patient and Doctor portals are the priority; Admin inherits via shared
> primitives. Every visual value must be a `--portal-*`/`--lux-*` token;
> icons per §8 (lucide-react only); headers per §7.4; when the spec is
> silent use §21 defaults — never invent colors, sizes, or effects.
> Validate per commit (lint, tsc, build; render `/account` and `/doctor`
> at 390/768/1280/1920, Patient 390 first). After the final commit,
> report §19 acceptance, §20 inventory, and §9.2 picture targets T1–T6 —
> pass/fail per item.

---

*Written 2026-07-03, branch `Dev-hassaan`. This file consolidates and
supersedes `DESIGN.md` + `LUX-VISUAL-PASS.md` for implementation use;
those files remain as history/rationale. Companion:
`portal-shared-ui-dependency-map.md` (dependency truth),
`premium-portal-redesign-strategy.md` (rationale + per-route plans).*
