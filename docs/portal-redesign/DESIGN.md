# DESIGN.md — Obsidian Ivory Portal Design System (binding spec)

> **Audience:** any AI coding agent (or human) implementing the portal
> redesign. This file is self-contained — an agent with only this file and
> the dependency map can implement the design without inventing anything.
> **Authority:** where this file and the strategy doc
> (`premium-portal-redesign-strategy.md`) differ, **this file wins**.
> **Scope:** Admin (`frontend/app/(admin)/admin/**`), Doctor
> (`frontend/app/(doctor)/doctor/**`), Patient
> (`frontend/app/(auth)/account/**`). One system, three accents.
> **Prerequisite reading:**
> `docs/portal-redesign/portal-shared-ui-dependency-map.md`.

---

## §0. How to use this file (for the AI agent)

1. Read §1 (design brief) once — it explains *why* every rule exists.
2. §2–§4 (palette derivation, tokens, typography) are your constants.
   Copy them; never re-derive or "improve" them.
3. §5 (component recipes) is what you build. Each recipe is complete:
   anatomy, values, states. If a value is missing, check §3 tokens first,
   then §13 (decision defaults); only then ask.
4. §6 (page blueprints) tells you how recipes compose into screens.
5. §7 (states matrix) is your completeness checklist per component.
6. §10 (anti-patterns) is a banned list — violating it fails review even
   if the result "looks fine."
7. §14–§16 (a11y gates, ownership map, definition of done) are the merge
   gates.
8. When in doubt: **delete ornament, increase contrast, use a token.**

**The ten commandments (memorize before coding):**

1. Every color/radius/shadow/blur is `var(--portal-*)`. No inline hex in
   components, ever. Missing token → add it to the `.gh-portal-shell`
   block in `globals.css`.
2. Only the chrome blurs. Content surfaces are opaque.
3. Lime `#B0F122` is never body text on white/ivory and never a surface
   fill. Text-safe form is `--portal-signal-text` (`#4E6B10`).
4. Surfaces are neutral. Green appears only as forest (action), mint
   (quiet accent), lime (alive/now).
5. Both shells (`admin-shell.tsx`, `portal-shell.tsx`) change in the same
   commit, always.
6. Never delete an `!important` rule or inline style until its
   token-driven replacement is live and verified.
7. `frontend/components/portal-atoms.ts` stays a pure re-export.
8. Behavior is frozen: no changes to server actions, fetchers, auth,
   i18n, `action`/`formAction` wiring, `Toggle` submit semantics,
   `SyncOrderPaymentOnReturn`, chat send paths, or routes.
9. `gh-admin-*` classes are GLOBAL (all three portals). Do not rename.
10. `globals.css` `:root` (lines ~31–162) and `.gh-btn-*` / `.gh-badge-*`
    / `.gh-eyebrow` are shared with the public site. Portal changes stay
    inside `.gh-portal-shell` scope and the portal `.gh-*` blocks.

---

## §1. Design brief

### 1.1 Product context

MyGlobalHealth / Global Health is a multi-country telemedicine platform:
patients book video consultations with licensed doctors, receive
prescriptions, sick certificates, exam results, and medical documents;
operations staff run the network. Three authenticated portals share one
codebase-level design system:

| Portal | Primary user | Core jobs | Emotional target |
|---|---|---|---|
| Admin | operations staff, country managers, super-admins | manage doctors/services/orders/CMS/plans across countries | command, density, speed — "mission control for a clinic network" |
| Doctor | licensed physicians | run consultations, review/send documents, manage availability | focus, calm, zero noise during a live consult — "a quiet clinical studio" |
| Patient | consumers (mobile-first) | book, pay, read results, manage membership | reassurance, clarity, one obvious next action — "a private health home" |

### 1.2 The brief

Make the three portals look like a **premium, expensive, modern SaaS
product** — investor-demo quality, screenshot-worthy — while staying
brand-true and clinically legible. Explicitly NOT: generic green
healthcare UI, default dashboard template, flat gray-on-white with one
accent, decoration-heavy glassmorphism.

### 1.3 The concept in one paragraph

**Obsidian Ivory.** Two worlds. The **chrome world** is forest-black
glass — sidebar, topbar, and the dashboard Command Band floating over an
ink canvas with a single lime aurora. The **content world** is gallery
ivory — white cards, ink text, hairline borders, generous type scale.
They meet at a 1px luminous lime seam. Green is not a surface color; it
is a three-word language: **forest = act, mint = notice, lime = alive.**
Large luminous tabular numerals are the only decoration.

### 1.4 Why each core decision exists

| Decision | Reason |
|---|---|
| Dark chrome, light content | dark = drama + brand authority where no medical text lives; light = legibility where patients read results. Both audiences win |
| Chrome is forest-black, not neutral black | the dark world literally *is* the brand color, driven to near-black — brand-true luxury |
| Forest primary buttons on a neutral field | today green is wallpaper so green buttons vanish; on neutral ivory the brand forest finally reads as *the* action |
| Lime = voltage only | scarcity converts the brand's loudest color from decoration into meaning ("something is alive right now") — a native healthcare metaphor (vital sign) |
| Mint = quiet accent | needs a mid-energy green between forest (heavy) and lime (electric) for hovers, focus, eyebrows — mint is the brand's own mid-tone |
| Command Band | the product needed one ownable, repeatable, screenshotable composition; a dark KPI band with luminous numerals over an ivory page is it |
| Numerals as ornament | data-forward decoration ages slower than washes/textures and signals competence |
| Visible dark frame at ≥1280px | the previous plan's drama was invisible on laptops; a frame that survives 1280px guarantees the two-world identity always shows |

### 1.5 Quality bar (what "done and premium" looks like)

- A screenshot of any dashboard could open a pitch deck without cropping.
- Zero texture PNGs, zero decor spans, zero `!important` styling fights.
- Any two screens from different portals are recognizably the same
  product; any two screens from the same portal are recognizably the same
  role (accent + density).
- Every interactive element has designed hover, focus-visible, active,
  disabled, and (where applicable) loading states.
- The UI looks finished with images disabled.
- A designer inspecting any element finds only `var(--portal-*)` values.

---

## §2. Brand foundation and palette derivation

### 2.1 Brand anchors (Manual da Marca — untouchable)

| Anchor | Hex | RGB | CMYK | Personality |
|---|---|---|---|---|
| Forest | `#1D4B36` | 29, 75, 54 | 61, 0, 28, 71 | authority, medicine, trust |
| Mint (olive) | `#8FB021` | 143, 176, 33 | 19, 0, 81, 31 | growth, freshness |
| Lime | `#B0F122` | 176, 241, 34 | 27, 0, 86, 5 | energy, vitality — the distinctive asset |
| White | `#FFFFFF` | 255, 255, 255 | 0, 0, 0, 0 | clinical cleanliness |
| Gray | `#6D6D6D` | 109, 109, 109 | 0, 0, 0, 57 | neutrality |

**Binding rule:** every color in the system is an anchor, a
tint/shade/alpha of an anchor, or a neutral mixed from anchors. No foreign
hues (no cyan, no gold, no violet, no blue-blue). Functional status colors
(warning amber, danger red, info slate) are the single sanctioned
exception, desaturated so brand greens stay the only saturated voices.

### 2.2 Derivation table (how each system color was made)

| System color | Hex | Derivation |
|---|---|---|
| Canvas | `#07120C` | forest darkened ~80% (hue held) |
| Chrome solid | `#0C1A12` | forest darkened ~70% |
| Chrome glass | `rgba(9,20,14,0.80)` | chrome solid at 0.80 alpha |
| Ink text | `#101713` | forest desaturated to near-neutral, darkened |
| Secondary text | `#3C463F` | ink lifted toward brand gray |
| Muted text | `#6D6D6D` | brand gray, verbatim |
| Ivory plane | `#FAFBF7` | white + ~2% forest |
| Well | `#F2F4EE` | white + ~5% forest |
| Primary action | `#1D4B36` | forest, verbatim |
| Primary hover | `#163A29` | forest darkened ~20% |
| Mint text-safe | `#5E7516` | mint darkened to 5.2:1 on white |
| Signal | `#B0F122` | lime, verbatim |
| Signal text-safe | `#4E6B10` | lime darkened to 6.1:1 on white |
| Patient accent | `#CFEC81` | lime tinted ~40% toward white |
| Member silk | `#E3F5B0` | lime tinted ~70% toward white |
| Success | `#2F7D4E` | forest lifted toward mint |
| Warning | `#B07C1A` | mint hue-rotated to amber, desaturated |
| Danger | `#BC4A42` | functional clinical red, desaturated |
| Info | `#56707A` | brand gray + forest hint (near-neutral slate) |

### 2.3 The green language (the most important rule in the system)

| Green | Value | Means | Appears as | Never |
|---|---|---|---|---|
| Forest | `#1D4B36` | **act** | primary buttons, selected calendar day, own chat bubble, links-as-buttons | page backgrounds, washes |
| Mint | `#8FB021` (`#5E7516` as text) | **notice** | eyebrows, section rules, focus rings, row hovers, soft buttons, tab underlines (via accent), chart series 2 | large fills |
| Lime | `#B0F122` (`#4E6B10` as text) | **alive / now** | active nav on dark, live pills, unread dots, "now" tick, hero numeral, glows, chart series 1 | text on white, surface fills, borders of static elements |

If an element is not an action, not a notice, and not alive — it is
neutral (ink/gray/ivory/white). This single rule is what makes the design
premium; enforce it ruthlessly.

---

## §3. Token reference (authoritative, complete)

Land on `.gh-portal-shell` in `frontend/app/globals.css`, **remapping the
existing block at ~line 1750** (keep existing var names where they exist:
`--portal-bg`, `--portal-surface`, `--portal-line`, `--portal-line-strong`,
`--portal-muted`, `--portal-radius*`, `--portal-shadow*`,
`--portal-sidebar-w`, `--portal-main-max`, `--portal-readable-max`,
`--portal-pad-*`, `--portal-section-gap`).

```css
.gh-portal-shell {
  /* ── worlds ─────────────────────────────────────────────── */
  --portal-canvas: #07120C;
  --portal-bg: #FAFBF7;                 /* ivory work plane */
  --portal-surface: #FFFFFF;            /* L3 content card */
  --portal-surface-elevated: #FFFFFF;   /* L4 modal/menu */
  --portal-well: #F2F4EE;               /* form wells, mono blocks, icon tiles */
  --portal-chrome: rgba(9, 20, 14, 0.80);
  --portal-chrome-solid: #0C1A12;       /* backdrop-filter fallback */
  --portal-chrome-border: rgba(255, 255, 255, 0.08);
  --portal-chrome-text: rgba(233, 239, 233, 0.86);
  --portal-chrome-text-active: #E9EFE9;

  /* ── text (light surfaces) ──────────────────────────────── */
  --portal-text: #101713;
  --portal-text-2: #3C463F;
  --portal-muted: #6D6D6D;              /* brand gray */

  /* ── action + accents (the green language) ──────────────── */
  --portal-primary: #1D4B36;            /* forest — act */
  --portal-primary-hover: #163A29;
  --portal-mint: #8FB021;               /* notice */
  --portal-mint-text: #5E7516;          /* mint read as text on light */
  --portal-mint-soft: rgba(143, 176, 33, 0.12);
  --portal-signal: #B0F122;             /* lime — alive/now */
  --portal-signal-text: #4E6B10;        /* lime read as text on light */
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

  /* ── depth ──────────────────────────────────────────────── */
  --portal-blur-chrome: 28px;
  --portal-blur-overlay: 8px;
  --portal-shadow: 0 1px 2px rgba(7,18,12,0.05), 0 12px 32px rgba(7,18,12,0.07);
  --portal-shadow-hover: 0 2px 4px rgba(7,18,12,0.06), 0 18px 44px rgba(7,18,12,0.11);
  --portal-shadow-modal: 0 24px 80px rgba(5,12,8,0.45);

  /* ── geometry ───────────────────────────────────────────── */
  --portal-radius-sm: 8px;
  --portal-radius: 10px;       /* buttons, inputs */
  --portal-radius-lg: 14px;    /* cards */
  --portal-radius-xl: 18px;    /* band, modals, popovers */
  --portal-radius-pill: 999px; /* status pills only */
}

[data-portal="admin"]   { --portal-accent: #B0F122; --portal-accent-text: #4E6B10; }
[data-portal="doctor"]  { --portal-accent: #8FB021; --portal-accent-text: #5E7516; }
[data-portal="patient"] { --portal-accent: #CFEC81; --portal-accent-text: #4E6B10;
                          --portal-member: #E3F5B0; --portal-member-text: #5E7516; }
```

- `data-portal` and `data-density` (`dense` | `comfortable`) go on the
  shell root `div` in each layout's shell instance. Admin = dense;
  Doctor/Patient = comfortable.
- `--portal-member` is consumed ONLY by
  `app/(auth)/account/{membership,rewards,subscribe}/**` surfaces.

### 3.1 Hardcoded values these tokens replace (exact locations)

| Today | Where | Becomes |
|---|---|---|
| `#D9F99D` active nav (inline) | `portal-shell.tsx:424,458`; `admin-shell.tsx:630,677` | `--portal-signal` system (§5.2) |
| `rgba(18,54,39,0.96)` sidebar + v3 gradient | `globals.css` `.gh-portal-sidebar` region | `--portal-chrome` |
| `#f7f8f3` shell bg + `#f8faf5` gradient | `globals.css:1750,1768` | `--portal-canvas` + `--portal-bg` plane |
| texture PNGs | `globals.css:1527,1555,1735,1772` | deleted (canvas + chrome do the work) |
| `PILL_TONES` hex map | `atoms.tsx` (~line 393) | status tokens (§5.7) |
| StatCard `#B0F122`/`#143B30` tiles + decor | `atoms.tsx` (~line 264/288) | §5.6 (decor deleted) |
| Btn inline `borderRadius: 999` + danger hexes | `atoms.tsx` (~line 716–755) | `--portal-radius` + danger tokens |
| body `#0f2e25 !important` | `globals.css:196` | **DO NOT TOUCH** (public site) |

---

## §4. Typography and spacing

One family: the existing `--font-manrope` stack (optionally self-host
Manrope Variable 400–800 via `next/font/local`; Aptos/Segoe fallback
stays). Mono: existing `--font-geist-mono` stack, promoted to a real role.
No second display family — premium here = scale contrast + weight
discipline, not a new font.

### 4.1 Type roles

| Role | Spec | Where |
|---|---|---|
| Band numeral (hero) | 44–56px / 800 / −0.02em / `tabular-nums` | Command Band only |
| Band title | 26–30px / 800 / `--portal-chrome-text-active` | Command Band |
| Page title (h1) | `clamp(24px, 2vw, 34px)` / 800 / −0.02em / lh 1.08 / ink | PageHeader |
| Section title | 16px / 800 / −0.01em / ink | SectionHeader |
| Eyebrow | 12px / 800 / +0.06em / caps / `--portal-accent-text` + 5px signal dot | PageHeader, SectionHeader |
| Body | 14px / 500 / lh 1.6 / `--portal-text-2` | everywhere |
| Label | 12.5px / 700 / ink | forms |
| Helper/meta | 12px / 500 / `--portal-muted` | forms, cards |
| Table header | 11px / 800 / +0.10em / caps / muted | tables |
| Table cell | 13.5px / 500 | tables |
| Stat numeral | 34–36px / 800 / `tabular-nums` / ink | StatCard |
| Inline metric | 15px / 800 / `tabular-nums` | rows, chips |
| Button | 13px (sm) / 14px (md, lg) / 700 / no tracking | buttons |
| Mono data | 12.5px mono / muted | IDs, order numbers, IBAN last-4, timestamps, audit log, slugs, card last-4 |

Rules: numerals in metrics/tables/time are ALWAYS `tabular-nums`. Line
length for reading text ≤68ch. Titles never wrap more than 2 lines —
truncate with title attribute.

### 4.2 Spacing, radius, blur, shadow scales

- Spacing: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56` px. Card padding
  20–24. Section gap = existing `--portal-section-gap` (clamp 14–22px).
  Page padding = existing `--portal-pad-x/y` clamps. Form row gap 16.
  Table cell padding 11×14 (dense) / 14×16 (comfortable).
- Radius: 8 (sm chips/inner) / 10 (buttons, inputs) / 14 (cards) /
  18 (band, modals, popovers) / 999 (status pills). Nothing else.
- Blur: 28px chrome, 8px modal overlay. Nothing else blurs.
- Shadow: rest / hover / modal — three tokens, no component-local shadows.
- Layout widths: keep `--portal-main-max: 1500px`,
  `--portal-readable-max: 1180px`, sidebar 272px.

---

## §5. Component recipes (binding)

### 5.0 Shell canvas + plane

- `.gh-portal-shell`: `background: var(--portal-canvas)`; fixed
  pseudo-element paints
  `radial-gradient(1200px 800px at 82% -10%, rgba(176,241,34,0.12), transparent 62%)`.
- Ivory plane = the `<main>` wrapper region: `background: var(--portal-bg)`,
  18px top corner radius, inset from canvas: **16–28px frame ≥1280px, 8px
  ≥1024px, 0 below. Frame must be visible at 1280px.**
- Optional `canvas-aurora.webp` between canvas and plane, ≤0.4 opacity,
  `aria-hidden`.

### 5.1 Sidebar (both shells, identical)

- Fill `--portal-chrome` + `backdrop-filter: blur(var(--portal-blur-chrome)) saturate(140%)`;
  width `--portal-sidebar-w` (272px — use the token in BOTH shells).
- Right edge: 1px `--portal-chrome-border` PLUS 1px seam light:
  `linear-gradient(180deg, transparent, rgba(176,241,34,0.45) 35%, rgba(176,241,34,0.10) 70%, transparent)`.
- Inset top highlight `inset 0 1px 0 rgba(255,255,255,0.05)`.
- Nav item (CSS classes — DELETE the `onMouseEnter/Leave` inline style
  mutation in both shells):
  - rest: text `--portal-chrome-text`, transparent, radius 10px;
  - hover: text `--portal-chrome-text-active`, bg `rgba(255,255,255,0.05)`;
  - active (`aria-current`): bg `--portal-signal-soft`, text
    `--portal-signal`, 3px left bar `--portal-signal` with
    `box-shadow: 0 0 8px var(--portal-signal-glow)`; bar animates height
    0→18px on activation (200ms).
- Badge counters: live/unread = 5px `--portal-signal` dot + 2px halo;
  otherwise neutral chip (`rgba(255,255,255,0.10)` fill, chrome text).
- Logo block unchanged; portal eyebrow label `--portal-accent` @0.9.
- Sidebar texture PNG rules deleted.

### 5.2 Topbar (both shells)

- Fill `--portal-chrome`, blur 28, height 64px, sticky; bottom 1px
  `--portal-chrome-border`; on scroll >8px swap the border for the
  horizontal seam-light gradient (one class toggle — the ONLY
  scroll-linked effect).
- Left: portal glyph — 20px rounded square (6px radius), bg
  `color-mix(in srgb, var(--portal-accent) 16%, transparent)`, glyph
  `--portal-accent` — then breadcrumb: 13px `--portal-chrome-text`,
  chevron 12px @0.5, last crumb 700 `--portal-chrome-text-active`;
  existing CUID truncation preserved; mobile collapses to `‹ Parent`.
- Right: bell + user chip inside ONE pill: 1px `--portal-chrome-border`,
  radius 999px, 1px border-soft internal divider. Unread bell = signal
  dot + halo.
- Admin country picker: trigger = chrome pill (flag + name + chevron,
  chrome text); menu = L4 white surface (§5.8), search on top, active row
  `--portal-mint-soft` + `--portal-accent-text` text.

### 5.3 Command Band (`CommandBand`, new atom in `atoms.tsx`)

The signature. Dashboard pages only (`/admin`, `/doctor`, `/account`).

- Container: `--portal-chrome` + blur 28, radius `--portal-radius-xl`,
  1px chrome border, inset top highlight, padding 24–28px; first element
  on the page, sits on the ivory plane.
- Grid: left context block; right metric row
  (`auto-fit minmax(120px, max-content)`, gap 32px; 2-up grid <760px).
- Left: context line 13px `--portal-chrome-text`; title 26–30px/800
  `--portal-chrome-text-active`; optional scope chip (Admin country).
- Metric: label 10.5px caps `--portal-chrome-text` @0.6; numeral
  44–56px/800 tabular `--portal-chrome-text-active`; the ONE most
  important metric renders its numeral in `--portal-signal` with a
  `radial-gradient` glow behind (≤0.25 opacity).
- Live element (max one): 6px lime dot + halo, pulses ×2 on mount then
  rests — "consultation live" / "next appointment in Xm".
- Skeleton variant ships with it (dark bg, shimmering numeral blocks).
- Props presentational only: `{ context, title, chip?, metrics:
  {label, value, signal?, live?}[], action? }`. Role pages fetch data.

### 5.4 PageHeader (non-dashboard hero)

- Transparent on the plane (NO glass, NO raster, NO wash).
- Eyebrow 12px/800 caps `--portal-accent-text` + 5px `--portal-signal`
  dot; 2px hairline under it:
  `linear-gradient(90deg, var(--portal-accent), transparent)`, width 64px.
- Title per §4.1; description ≤68ch muted.
- Admin `gh-admin-area-hero` per-area accents survive ONLY as
  eyebrow/hairline color overrides; delete wash backgrounds and the v3
  `!important` h1 overrides in the same pass that moves title styles to
  one owner.

### 5.5 Cards (`AdminCard`)

- Fill `--portal-surface`, radius `--portal-radius-lg`, 1px
  `--portal-line`, `--portal-shadow`, inset top highlight
  `inset 0 1px 0 rgba(255,255,255,0.9)`, padding prop stays (default 24).
  All visuals in CSS; the atom keeps layout props only.
- Interactive variant (opt-in class): hover = border
  `--portal-line-strong`, `--portal-shadow-hover`, translateY(-2px),
  title underline sweep 0→24px in `--portal-accent` (200ms). Static cards
  never move.
- Card headers: `SectionHeader` with 3×16px `--portal-mint` rule.
- Kill `.gh-admin-card` PNG tint overlay + card `!important` rules after
  replacements are live.

### 5.6 StatCard

- Min-height 128px; numeral 34–36px/800 tabular ink; label 10.5px caps
  muted; icon tile 40px radius 10px — bg `--portal-well`, glyph
  `--portal-accent-text` (neutral variant: glyph ink).
- Delete the inline `#B0F122`/`#143B30` tiles and the dead radial decor
  spans + their `display:none !important` CSS.
- Hover (when the card links somewhere): 1.5px accent underline scales
  24→48px.

### 5.7 Status pills (`Pill` + `.gh-badge-*` — SAME phase)

One tone map, tokens only:

| Tone | Fill | Text | Dot |
|---|---|---|---|
| success | `--portal-success-soft` | `--portal-success-text` | `--portal-success` |
| warning | `--portal-warning-soft` | `--portal-warning-text` | `--portal-warning` |
| danger | `--portal-danger-soft` | `--portal-danger-text` | `--portal-danger` |
| info | `--portal-info-soft` | `--portal-info-text` | `--portal-info` |
| neutral | `--portal-well` | `--portal-text-2` | `--portal-muted` |
| brand | `rgba(29,75,54,0.10)` | `--portal-primary` | `--portal-primary` |
| live | `--portal-signal-soft` | `--portal-text-2` | `--portal-signal` + halo `0 0 0 2px var(--portal-signal-glow)` |

Anatomy: radius 999px, 11px/700 caps, 0.05em tracking, optional 5px dot.
`live` = the ONLY glowing pill; means "happening now" (active
consultation, online, unread). Map existing semantics: pending→warning,
active→success, inactive/cancelled→danger or neutral per current meaning —
do not invent new meanings.

### 5.8 Buttons (`Btn`, `IconBtn`)

- Radius `--portal-radius` (10px). Delete inline `borderRadius: 999` and
  the 8px `!important` override together.
- Variants (visuals in CSS classes; atom keeps variant prop):

| Variant | Fill | Text | Border | Hover |
|---|---|---|---|---|
| `primary` | `--portal-primary` | `#FAFBF7` | none | `--portal-primary-hover` + `0 4px 16px var(--portal-signal-glow)` |
| `secondary` | white | ink | 1px `--portal-line-strong` | `--portal-well` fill |
| `soft` | `--portal-mint-soft` | `--portal-mint-text` | none | fill @0.18 |
| `ghost` | transparent | ink | none | `--portal-well` |
| `danger` | `--portal-danger-soft` | `--portal-danger-text` | 1px danger @0.4 | fill @0.16 |
| `on-chrome` | transparent | `--portal-chrome-text` | 1px `--portal-chrome-border` | white @0.06 fill |

- All: focus-visible 3px `--portal-focus` ring; press translateY(1px);
  loading = 16px spinner replaces `iconLeft`, label persists; post-save
  success = one border pulse in success tone.
- Sizes: sm 32px / md 40px / lg 44px height; icon-only square variant at
  each size.
- `IconBtn`: 32px, radius 9px, ink glyph @0.7→1; hover `--portal-hover`
  fill + 1px accent ring.
- Shape law: **rounded-rect = action, pill = status.** No exceptions.
- Audit `.gh-admin-main :where(button…)` descendant overrides in the same
  pass; reduce to a safety net matching these values.

### 5.9 Tables

- Container: L3 card, no padding, overflow hidden.
- Header: 11px/800 caps muted, transparent, 1px `--portal-line-strong`
  bottom rule; first col padding-left 20px.
- Rows: `[data-density="dense"]` 44px / `comfortable` 52px; 1px
  `--portal-line-soft` separators.
- Hover: `--portal-hover` full row + 2px `--portal-accent` inset left bar
  sliding in (120ms); row `IconBtn`s fade 0.55→1.
- Numeric cols right-aligned tabular; ID cols mono 12.5px.
- `.gh-admin-main table/th/td` descendant rules: reduce to identical
  values (safety net for raw `<table>` pages — Doctor reports, some Admin
  panes — verify they still render styled).
- <760px: swap to `PortalMobileCard` (§5.14).

### 5.10 Menus / popovers / `NotificationPopover`

- Surface: L4 white, radius 18px, `--portal-shadow-modal` @60% strength,
  1px `--portal-line`.
- Enter: scale 0.96→1 + fade 200ms from trigger origin.
- Notification rows: unread = 5px signal dot + halo +
  `--portal-signal-soft` @0.5 row tint; read = plain; mark-as-read fades
  tint out 280ms; footer = full-width `soft` button "view all".
- User menu: same surface; role line = neutral pill; sign-out = `danger`.

### 5.11 Forms (+ `FormSection`, new)

- Input/select/textarea: min-height 44px, fill `--portal-well` → white on
  focus, radius 10px, 1px `--portal-line`; focus border
  `--portal-mint-text` + 3px `--portal-focus` ring; error = danger border
  + danger ring + 12px danger text REPLACING the helper; disabled = well
  fill, 0.6 opacity text.
- Label 12.5px/700 ink above; helper 12px muted below.
- `FormSection` (new primitive): L3 card + `SectionHeader` + grid
  (2-col ≥900px, 1-col below, gap 16).
- Rich text (`rich-text-html-field.tsx`): same border/focus shell around
  the editor chrome; toolbar buttons = `IconBtn` recipe.
- Dropzone: dashed 1.5px `--portal-line-strong`, radius 14; dragover =
  dashed `--portal-accent` + `--portal-signal-soft` wash.
- Replace the blanket `.gh-admin-main :where(input…)` normalization with
  these rules (keep selector as a matching safety net).

### 5.12 Tabs (`PortalTabs`, new)

- 13px/700 labels; muted rest → ink active; 2px `--portal-accent`
  underline sliding via transform (200ms); container bottom 1px
  `--portal-line`; overflow-x scroll + fade masks (keep
  `.gh-portal-tabs` thin-scrollbar behavior).
- Consolidates: `plan-edit-tabs`, `plan-translation-tabs`,
  `*-translation-tabs`, `appointment-tabs`, profile `*-tab` headers,
  `faq-language-tabs`. Migrate per role phase; no big-bang.

### 5.13 Dialogs (`PortalDialog`, new)

- Overlay: `rgba(7,18,12,0.55)` + `blur(var(--portal-blur-overlay))`,
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

### 5.14 Mobile cards (`PortalMobileCard`, new)

- White card, radius 14, 1px `--portal-line`, 16px padding; 3px
  status-tone left edge; title row (15px/700 ink + status pill), meta
  grid (label/value 12px), trailing action row.
- Replaces per-page `.gh-admin-mobile-card` bodies progressively;
  breakpoint stays 760px.

### 5.15 Empty states (`AdminEmptyState` restyle)

- ≤220px illustration slot (assets) OR 44px icon tile on `--portal-well`;
  title 16px/800 ink; body 13.5px muted ≤52ch; optional `primary` action;
  48px vertical padding, centered. Must render on every list surface.

### 5.16 Skeletons (`components/portal-skeletons.tsx`, promoted)

- Promote from `admin/_components/skeletons.tsx`; leave a re-export shim
  at the old path so Admin `loading.tsx` imports keep working.
- Shimmer: base `#EFF1EA`, sweep `rgba(255,255,255,0.75)`, 1.6s
  ease-in-out infinite; `prefers-reduced-motion` → static two-tone pulse.
- Shapes: command band (dark), page header, summary strip, stat grid,
  table (header + n rows), card, form section, calendar month, chat
  thread. Skeleton geometry mirrors the real component so load → content
  never jumps.

### 5.17 Chat (shared bubble core)

- Thread: L3 card; message area bg `--portal-well`.
- Own bubble: `--portal-primary` fill, ivory text; other: white fill, ink
  text, 1px `--portal-line`; both radius 14 with one 4px tail corner;
  max-width 72%.
- System/internal note: dashed 1px neutral chip, centered, 12px muted.
- Composer: white bar pinned bottom, 1px top `--portal-line`; send =
  `primary` sm; disabled state shows a plain-language reason
  (consultation closed).
- New messages rise 6px + fade 200ms. No typing-simulation effects.
- Consumers: `ChatThread` (Admin+Patient), `ConsultationChat`
  (Doctor+Patient), `InternalMessagesThread` (Admin+Doctor) — restyle the
  core once, click through all five mount points.

### 5.18 Calendar

- `MonthCalendar`: L3 card; hairline `--portal-line-soft` cell
  separators (no boxed grid); today = 2px `--portal-accent` ring;
  selected = `--portal-primary` fill ivory text; event dots = status tone
  map; weekend headers muted.
- `DayAgenda`: left rail 1px `--portal-line` + lime "now" tick + halo —
  tick breathes opacity 0.7↔1 over 3s (the ONE ambient animation); events
  = compact L3 cards, tabular times, status pill.
- `EventDetailDialog` → `PortalDialog`; `TimezoneSelect` → field recipe.
- `calendar-utils.ts` / `calendar-types.ts`: DO NOT TOUCH.
- Verify `/admin/calendar`, `/doctor/calendar`, `/account/calendar` after
  any edit.

### 5.19 Document tables (`DocumentTable` direction)

- Row: 32px file-kind icon tile (`--portal-well` bg, kind glyph in
  `--portal-accent-text`), name 13.5px/700 ink + meta 12px muted stack,
  status pill, trailing `IconBtn`s.
- Consumer (Patient) variant: 52px min row height, ≥44px touch targets,
  "shared by Dr. X" meta line.
- Owners: Doctor `doctor-document-tables.tsx`, Patient
  `/account/medical-files`, Admin legal-documents pages.

### 5.20 Appointment cards (`AppointmentCard` direction)

- Grid: time block (15px/800 tabular + tz meta 11px muted) · person +
  service (13.5px/700 + 12px muted) · status pill + action.
- 3px status-tone left edge; `live` = lime edge + halo while a
  consultation is in progress.
- Mobile variant = `PortalMobileCard` with the same content order.

### 5.21 Payments / invoices / membership

- Amounts `tabular-nums`, currency 0.7em; card last-4 mono (`•• 4242`);
  paid = success pill; refund = pill PLUS one plain sentence on Patient
  surfaces.
- Patient membership plan card: dark chrome header band (chrome recipe,
  radius 14 top) with 1px `--portal-member` bottom hairline, plan name
  ivory, status pill; body white with benefit rows (icon + plain
  sentence); lime slim progress bar (6px, radius 999, `--portal-well`
  track, `--portal-signal` fill) — the ONLY progress bar in the system.

---

## §6. Page blueprints (how recipes compose)

### 6.1 Dashboard (all portals)

```
[ CommandBand ]                     ← dark, full width, the signature
[ StatCard ][ StatCard ][ StatCard ]← auto-fit minmax(240px,1fr)
[ Quick actions row / queue cards ] ← interactive cards
[ Primary work surface ]            ← today's list / recent activity
```

Per portal: Admin band = ops metrics + scope chip; Doctor band = "Now"
instrument (next appointment, 48px time, join action, live states);
Patient band = greeting + next appointment or single "Book" primary.

### 6.2 List page (appointments, orders, doctors, services…)

```
[ PageHeader: eyebrow + title + description + primary action right ]
[ Optional summary strip (tone chips) ]
[ Filter row: search field + selects + scope banner (Admin) ]
[ Table (desktop) / PortalMobileCard stack (<760px) ]
[ AdminEmptyState when zero rows — always designed, never blank ]
```

### 6.3 Detail page (order, appointment, doctor, patient)

```
[ PageHeader with identity (avatar/flag/status pill) + key actions ]
[ Optional dark mini-band for money/status summary (Admin orders) ]
[ Two-zone ≥1024px: main content cards | context rail ]
[ Single column <1024px, context stacks below main ]
```

Doctor appointment detail = consultation workspace: left form +
checklist, right patient context; calm mode while live (§5, strategy
Doctor plan).

### 6.4 Form page (CRUD edit/new)

```
[ PageHeader: eyebrow + title + save/cancel actions ]
[ PortalTabs when the entity has translations/sections ]
[ FormSection cards, 2-col grid ≥900px ]
[ Sticky action bar on mobile ]
```

### 6.5 Settings/profile page (Patient/Doctor)

```
[ PageHeader ]
[ PortalTabs ]
[ Status-first tone card when verification/action needed ]
[ FormSection per group ]
```

---

## §7. States matrix (per component class — all required)

| Component | Rest | Hover | Focus-visible | Active/selected | Disabled | Loading | Empty | Error |
|---|---|---|---|---|---|---|---|---|
| Button | per variant | fill shift 120ms | 3px focus ring | translateY(1px) | 0.5 opacity, no pointer | spinner, label stays | — | — |
| Nav item | chrome text | white text + faint fill | focus ring (visible on dark) | lime system | — | — | — | — |
| Card (interactive) | rest shadow | lift + underline sweep | focus ring | — | — | skeleton | — | — |
| Table row | plain | mint wash + accent bar | ring on row focus | selected = mint wash persistent | — | skeleton rows | AdminEmptyState | inline danger row tint |
| Input | well fill | border strong | mint border + ring | — | well + 0.6 text | — | placeholder muted | danger border + ring + message |
| Pill | tone | — | — | — | — | — | — | — |
| Tab | muted | ink | ring | ink + accent underline | 0.5 | — | — | — |
| Dialog | — | — | trap inside | — | — | button spinner | — | danger header dot |
| Chat composer | white bar | — | ring | — | plain-language reason | sending tint | — | retry affordance |
| Page | — | — | — | — | — | skeleton kit mirrors layout | designed empty state | root error.tsx, danger empty-state anatomy |

Every list surface MUST render its empty state. Every route group gets
`loading.tsx` from the skeleton kit and each portal root gets `error.tsx`
(none exists today).

---

## §8. Motion

- Durations: 120ms micro / 200ms standard / 280ms panels.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` entrances, `ease-out` exits.
- `transform` / `opacity` only. Nothing bounces. Max ONE ambient
  animation per viewport (agenda now-tick OR band live dot).
- Page content: single `.gh-portal-enter` utility — fade + rise 8px,
  200ms, CSS only. No router-level transitions.
- Mobile nav sheet: chrome glass slides 280ms, scrim fades, items stagger
  20ms (max 8).
- `prefers-reduced-motion`: all transitions ≤50ms opacity-only; shimmer
  static; pulses off.

---

## §9. Iconography, data-viz, imagery

- **Icons:** existing icon usage stays; sizes 16 (inline) / 20 (nav,
  buttons) / 24 (empty-state tiles); stroke-style consistent; color =
  contextual text color, accent only when the icon IS the signal (live
  dot, verified check).
- **Charts/telemetry (subscription health, reports):** series 1 = lime,
  series 2 = mint, series 3 = forest, remaining = grays; gridlines
  `--portal-line-soft`; axis labels 11px muted; numerals tabular; no 3D,
  no gradient fills under lines (flat @0.08 tint allowed).
- **Imagery:** decorative rasters only from the asset inventory (strategy
  doc §assets); all `aria-hidden` + empty `alt`; UI must look finished
  without them. No stock photos inside portals.

---

## §10. Anti-patterns (banned — fails review)

1. Lime text on white/ivory. Lime surface fills. Lime borders on static
   elements.
2. Any green as a page/card background wash.
3. Blur on content surfaces (cards, tables, forms, chat).
4. New gradients beyond the four sanctioned ones.
5. Texture/noise images over surfaces; the five legacy PNGs anywhere.
6. New `!important` rules. Inline hex/radius/shadow in components.
7. Pill-shaped action buttons; rectangular status pills.
8. Two glowing elements in one viewport region.
9. Uniform emphasis — a screen where every card/number is the same size
   (hierarchy is mandatory: one hero element per screen).
10. Empty screens without a designed empty state; spinners instead of
    skeletons for full-page loads.
11. Colored text for decoration (color = meaning only).
12. Drop shadows on chrome panes beyond `--portal-shadow` (chrome depth
    comes from blur + seam, not shadow stacks).
13. Editing `atoms.tsx` markup for a role-specific need (fork a variant
    in the role's `_components` instead).
14. Renaming `.gh-admin-*` classes or forking `portal-atoms.ts`.
15. Bouncy/spring motion; animating layout properties (width/height/top).

---

## §11. UX copy tone (for states this redesign touches)

- Empty states: reassuring, specific, one action. "No documents yet —
  they'll appear here after your consultation." Never "No data."
- Errors: plain language + what to do next + support link on Patient.
  Never raw error codes on Patient surfaces (mono detail line allowed on
  Admin).
- Refunds/payments (Patient): one plain sentence next to the pill —
  "We've refunded €25 to your Visa •• 4242. It can take 5–10 business
  days."
- Destructive confirms: state the consequence, name the object, keep
  type-to-confirm where it exists.
- Live/disabled chat: say why — "This chat closed when your consultation
  was completed."

---

## §12. Role differentiation summary

| Aspect | Admin | Doctor | Patient |
|---|---|---|---|
| `data-portal` | `admin` | `doctor` | `patient` |
| Accent | lime `#B0F122` | mint `#8FB021` | pale lime `#CFEC81` (+ member silk) |
| Accent text | `#4E6B10` | `#5E7516` | `#4E6B10` |
| `data-density` | dense (44px rows) | comfortable (52px) | comfortable |
| Command Band | ops metrics + scope chip | "Now" instrument + live states | greeting + next appointment / book CTA |
| Layout bias | tables, two-zone detail | two-zone workspace, calm mode | cards-first, single column, ≥44px targets |
| Extra chrome | country picker (topbar) | — | i18n nav labels (existing) |
| Special surfaces | dark telemetry strips (subscription health) | consultation calm mode | membership silk hairline |

---

## §13. Decision defaults (when the spec is silent)

- Unknown spacing → nearest value from the scale, prefer larger.
- Unknown text color → `--portal-text-2`.
- Unknown border → `--portal-line`.
- Unknown radius → element is an action? 10px. Container? 14px.
- Need an accent? → `--portal-accent-text` for text, `--portal-accent`
  for non-text.
- New status semantics → map to the closest existing tone; never mint a
  new color.
- Component needed in 2+ portals → build it in `atoms.tsx` /
  `components/`; needed in 1 → build in that portal's `_components`.
- Anything ambiguous about data/behavior → do not touch; restyle wrappers
  only.

---

## §14. Accessibility gates (block merge if failed)

1. All text/fill pairs in §3/§5.7 ≥4.5:1 (large numerals ≥3:1). Verify
   chrome text over the aurora asset at its brightest point, not just
   flat canvas.
2. Focus-visible ring on EVERY interactive element, both worlds; the mint
   ring must be visibly present on dark chrome.
3. `@supports not (backdrop-filter: blur(1px))` → `--portal-chrome-solid`
   fills; `prefers-reduced-transparency` → same.
4. Touch targets ≥44px on all Patient surfaces.
5. Dialog focus trap, Esc close, focus return.
6. Body text NEVER sits on chrome. Chrome text limited to
   headings/labels/metrics ≥12px/700 and nav items.
7. Lime never text on white/ivory (`--portal-signal-text` instead).
8. Keyboard: full nav traversal, table row focus, tab arrow-key support
   where tabs are composite widgets.
9. `prefers-reduced-motion` honored per §8.

---

## §15. File ownership map (who owns which pixel)

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
| New primitives (`PortalDialog`, `PortalTabs`, `FormSection`, `PortalMobileCard`) | `atoms.tsx` or `frontend/components/` per dependency-map conventions |
| Role compositions | each portal's route `_components` — NEVER edit shared files for a role-only need |

---

## §16. Phase order + definition of done

**Phases (full table in strategy doc):** 1 tokens (`globals.css` only) →
2 shells+chrome (both shells lockstep + NotificationPopover) → 3 atoms
(cards/buttons/pills/stats + CommandBand + unified tone map) → 4
tables/forms/dialogs/tabs/skeletons → 5 calendar+chat → 6 Admin pages →
7 Doctor pages → 8 Patient pages → 9 assets → 10 responsive+a11y → 11
cleanup. 1→4 strictly ordered; 5 ∥ 4; 6–8 independent after 4.

**Per phase:** `npm run lint` + `npx tsc --noEmit` + `npm run build` in
`frontend/`; render all three portals; check public `(site)` after any
shared-CSS or phone-field change. One commit per phase:
`feat(portals): <summary>`.

**Definition of done (per phase and overall):**

- Zero inline hex/radius/shadow in touched components (grep
  `#[0-9A-Fa-f]{3,8}` in touched TSX; allowed only inside the
  `globals.css` token block).
- Zero new `!important`; existing ones removed only per the replacement
  rule.
- Both shells byte-equivalent in shared class usage.
- All three portals render at 320/768/1280/1920 without horizontal
  overflow; the dark frame is visible at 1280px.
- Public site homepage + checkout visually unchanged.
- The same status semantic renders identically from `Pill` and
  `.gh-badge-*`.
- CSS-only (assets absent) build looks finished.
- §7 states matrix satisfied for every touched component.
- §10 anti-pattern scan clean.
- Dependency map §3/§9 updated in the same commit as any shared change.

---

## §17. Quick reference card (cheat sheet)

```
WORLDS      canvas #07120C · chrome rgba(9,20,14,.80) blur28 · plane #FAFBF7 · card #FFF · well #F2F4EE
TEXT        ink #101713 · body #3C463F · muted #6D6D6D · on-chrome #E9EFE9@.86
GREENS      act=forest #1D4B36 · notice=mint #8FB021 (text #5E7516) · alive=lime #B0F122 (text #4E6B10)
ACCENTS     admin lime · doctor mint · patient #CFEC81 · member silk #E3F5B0 (membership only)
STATUS      ok #2F7D4E · warn #B07C1A · danger #BC4A42 · info #56707A · live = lime dot+halo
LINES       .08 / .16 strong / .05 soft (ink alpha) · hover mint@.08 · focus mint@.65 3px
RADIUS      10 action · 14 card · 18 band/modal · 999 status pill
SHADOW      rest / hover / modal — tokens only
TYPE        band numeral 44–56 tabular · h1 clamp(24,2vw,34) · section 16 · body 14 · caps-header 11 · mono for IDs
MOTION      120/200/280ms · transform+opacity only · one ambient max
BLUR        chrome 28 · overlay 8 · nothing else
SIGNATURE   CommandBand: dark glass panel, luminous numerals, one live tick — dashboards only
NEVER       lime text on white · green surfaces · blur on content · new gradients · inline hex · pill actions
```

*Written 2026-07-02, branch `Dev-hassaan`. Companion:
`premium-portal-redesign-strategy.md` (rationale + per-route plans),
`portal-shared-ui-dependency-map.md` (dependency truth).*
