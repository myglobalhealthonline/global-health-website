# Global Health — Design System

> **Medicine without borders.** A telehealth platform for licensed online
> consultations across Ireland, Portugal, Spain, Czechia, and Romania.
> This design system contains the brand foundations, tokens, and UI
> patterns used by the marketing site at **myglobalhealth.online** and
> derived from the official _Manual da Marca_.

---

## What Global Health is

Global Health is a **multi-country telemedicine clinic**. Patients land
on a country-specific page, pick a language, and book a video
consultation with a registered local doctor — general practice or
specialist (cardiology, dermatology, mental health, weight loss, etc.) —
plus follow-up online prescriptions, home health tests, and home
delivery of prescribed medication.

The tone is **calm, clinical, trustworthy**, with the warmth of a local
clinic and the convenience of an app. The brand pairs a deep forest
green with a bright lime accent — read as "medical" without leaning on
the more clichéd healthcare blues.

### Surface map

| Country | Path on site         | Locale   |
| ------- | -------------------- | -------- |
| Ireland | `/home`, `/ireland`  | English  |
| Portugal| `/home-pt`           | Portuguese |
| Spain   | `/home-sp`           | Spanish  |
| Czechia | `/home-cz`           | Czech    |
| Romania | `/home-rm`           | Romanian |

### Products in this system

There is **one product**: the public marketing + booking website. (The
patient/clinician portal lives behind login and is out of scope for this
system.) The UI kit in `ui_kits/website/` covers:

- Home / country-selector
- Country home (Ireland, Portugal, etc.)
- Service detail page (a consultation type)
- Doctor team / profile
- Booking form

---

## Source materials

| Source | Type | Path |
| --- | --- | --- |
| **Manual da Marca** (official brand book) | PDF, 7 pp. | `uploads/Global Health - Manual da Marca.pdf` |
| **Brand book rasters** (extracted) | PNG | `assets/brand/*.png` |
| **Production codebase** | Next.js 16 + Tailwind 4 | `myglobalhealthonline/global-health-website` (GitHub) |
| **Code reference** (selected components) | TSX | `code-reference/components/` |
| **Live website** | URL | https://www.myglobalhealth.online |

---

## Index

| File | What's in it |
| --- | --- |
| `README.md` | This file — brand context, content + visual fundamentals, iconography |
| `colors_and_type.css` | Raw tokens + semantic CSS variables for color, type, spacing, radii, shadows |
| `fonts/fonts.css` | Webfont @imports (substitution flagged below) |
| `SKILL.md` | Agent-skill front-matter so this design system can be loaded by Claude Code or the agent runtime |
| `assets/logo/` | Primary logo PNG (transparent) |
| `assets/brand/` | Brand-book reference rasters (logo lockups, mockups) |
| `assets/countries/` | Country menu badges (PNG, used in the country selector) |
| `code-reference/components/` | Selected production TSX components — read these when you need to match a specific section exactly |
| `preview/` | Design-system cards (registered to the Design System tab) |
| `ui_kits/website/` | Click-through UI kit for the marketing site |
| `ui_kits/admin/` | Click-through UI kit for the super-admin portal — all 9 screens from `PLAN.md` §7 |

---

## ⚠️ Substitutions to confirm

These swaps were made because the original asset isn't web-available.
**Please confirm or replace.**

1. **Gilroy → Plus Jakarta Sans.** Gilroy is licensed for print/desktop
   only; the production site already substitutes Plus Jakarta Sans
   (Google Fonts), which has comparable metrics and a similar humanist-
   geometric feel. If you have a web Gilroy license, drop the WOFF2
   files into `fonts/` and update `fonts/fonts.css`.
2. **Logo wordmark serif → Cormorant Garamond.** The wordmark in the
   logo uses a bracketed transitional serif (probably Trajan-family).
   Cormorant Garamond is the closest free match. The serif is **never
   used outside the logotype**, so this only affects regenerated logo
   lockups, not body text.
3. **Tagline copy.** Two taglines coexist in source materials:
   _"Medicine without borders"_ (brand manual) and _"Medicine anytime
   anywhere"_ (logo PNG). Default in this system: _"Medicine without
   borders"_ — please confirm.
4. **Iconography.** The production site uses **Lucide** for system
   icons. We document and link Lucide; no custom icon font.

---

## CONTENT FUNDAMENTALS

### Voice

Global Health writes like a **trusted local clinic** — competent, plain-
spoken, never overheated. Sentences are short. Verbs are concrete
(_book_, _choose_, _connect_, _get the care you need_). Promises are
specific and bounded ("in minutes", "from home", "registered in your
country") rather than aspirational ("transforming healthcare").

### Tone matrix

| Where | Tone | Example |
| --- | --- | --- |
| Hero / landing | Direct, inviting | "Medical Consultations Wherever You Are" |
| Trust signals | Quietly authoritative | "All consultations are provided by qualified and registered doctors in your country." |
| Conversion CTAs | Crisp, second-person, imperative | "Book an online consultation" • "Choose your country" |
| Empty states / disclosures | Plain, GDPR-aware | "Your personal data is protected under strict GDPR standards." |
| Marketing one-liners | Confident, short | "Medicine without borders." |

### Casing

- **Page titles, H1, H2 →** Sentence case (`Why patients choose us`),
  with the occasional Title Case when the line is short and product-y
  (`Medical Clinic Portugal`).
- **Eyebrows / kickers →** ALL CAPS with `letter-spacing: 0.18em`. Used
  above almost every section heading: `SPECIALTIES`, `DOCTOR PROFILE`,
  `LOCAL ACCESS`, `START YOUR ONLINE CONSULTATION`.
- **Buttons →** Sentence case, no terminal punctuation. ("Book now",
  "See doctors", "Get a prescription".)
- **Nav →** Sentence case. ("Clinics", "About", "Blog", "eGift Card" —
  note the lowercase `e`.)

### Person

- Address the patient as **you**. Never "the patient" / "the user" in
  product copy.
- Refer to the company as **we** sparingly; mostly use brand-led nouns
  ("Global Health", "your local clinic", "our doctors").
- Doctors are **doctors**, not "providers" or "physicians".

### Numbers and proof

- Star ratings (`4.94 — doctify`) and "Based on 19 reviews, verified by
  Doctify" appear near hero CTAs. Numbers stay **tabular-nums** in
  product.
- Stat chips ("50+ Expert Doctors", "5 Countries", "24/7 Available")
  follow the pattern `<big value> <muted label>`.

### Lists and proof points

- Trust chips use a checkmark + 1–3-word label: _100% online_,
  _No waiting rooms_, _Confidential_.
- Feature lists pair an outlined check (`CheckCircle2` from Lucide,
  lime-accent stroke) with a short sentence — not bullets.

### Emoji

**Sparingly.** The homepage stat chips use 👨‍⚕️ 🌍 ⚡ as visual rhythm
markers in the hero, but emoji are otherwise absent from product copy,
buttons, and section headers. Default position: **no emoji** unless
you are deliberately echoing the home-hero stat-chip pattern.

### Medical claims

The codebase's agent guidelines explicitly say: _"Avoid hallucinating
medical claims… add TODO comments where content needs business
confirmation."_ Treat any clinical wording as **business-owned** — do
not invent symptoms, treatment durations, or success rates.

### Examples

Real copy from the production site, lifted verbatim:

- _Hero, country home:_ "Medical Consultations Wherever You Are." +
  "Choose your country and language to enter your local clinic. Expert
  doctors, online prescriptions, and health tests — all from home."
- _Trust bar:_ "Licensed Doctors — All consultations are provided by
  qualified and registered doctors in your country."
- _Footer CTA:_ "Choose your country and connect with a licensed doctor
  in minutes."
- _Homepage chip:_ "5 Countries • Online Care"
- _Service tag chip:_ "Online consultation", "From €50".

---

## VISUAL FOUNDATIONS

### Palette

Two greens carry the brand: a **deep forest green** and a **bright lime
green**. Everything else is neutral. The lime is used like a highlighter
on dark surfaces — it's not a button color on white.

| Token | Hex | Role |
| --- | --- | --- |
| `--gh-forest` | `#1D4B36` | Brand-manual primary (logo, dark surfaces) |
| `--gh-forest-deep` | `#1B4D3E` | Production primary (buttons, links) |
| `--gh-forest-night` | `#0F2E25` | Darkest text + section background |
| `--gh-olive` | `#8FB021` | Globe fill (secondary) |
| `--gh-lime` | `#B0F122` | Marketing accent (vivid) |
| `--gh-mint-soft` | `#C8E6A0` | UI-safe accent (icon backgrounds, chips on dark) |
| `--gh-cream` | `#F4F8F4` | Soft section background |
| `--gh-panel` | `#EDF2ED` | Tonal surface |
| `--gh-white` | `#FFFFFF` | Default page |
| `--gh-body` | `#2D3B36` | Body text |
| `--gh-muted` | `#5A6B64` | Captions, supporting text |
| `--gh-border` | `#D8E0D8` | Card border |

**Rule of thumb:** light pages use `forest-deep` for the brand,
`mint-soft` only for backgrounds of small icon containers. Dark
sections (`forest-night` / `forest-deep`) flip it — `mint-soft` and
`lime` get to glow against the deep green.

### Type

- **Display + headings:** Gilroy (or Plus Jakarta Sans) at weight 800,
  letter-spacing −0.02em, line-height 1.1. Heavy and tight.
- **Body:** Plus Jakarta Sans 400/500 at 1.6 line-height.
- **Eyebrow:** 11px, 0.18em tracking, uppercase, weight 700.
- **Wordmark only:** Cormorant Garamond serif. Never used outside the
  logo.

Type is treated **with restraint** — a single display family,
sentence-case headings, eyebrow + H2 + body paragraph is the standard
section header pattern.

### Backgrounds and textures

- **No full-bleed photography in product surfaces.** The homepage hero
  uses one large warm-toned photo overlaid with a forest-green gradient
  + medical pattern; all other sections use solid white, `cream`, or
  `forest-deep`.
- **Medical pattern.** A faint repeating SVG of `+` marks (28×28 tile,
  2px stroke) is layered over hero and dark sections at **~2–4%
  opacity**. It reads almost as a texture, not a pattern. Token:
  `--medical-pattern-color`, util class `.gh-medical-pattern`.
- **Gradients are rare.** The only common gradient is the dark green
  hero overlay (`linear-gradient(120deg, rgba(10,52,42,0.82) 0%,
  rgba(14,76,60,0.74) 45%, rgba(18,96,76,0.66) 100%)`). No purple,
  no rainbow, no two-tone CTA buttons.
- **Soft radial blooms** on dark sections: a `mint-soft`/12 blurred
  circle behind cards, à la a clinical spotlight. See
  `code-reference/components/templates/CountryHomeTemplate.tsx`
  (`gh-medical-pattern-layer`).

### Imagery vibe

- Editorial photography is **warm, golden-hour lit**, indoor, with
  professional subjects (doctor, patient, business person). Not stock-
  cold-blue hospitals.
- Photos are **always set in a frame** — a layered white card with a
  cream outer border, soft shadow, rounded `1.25rem` corners. The frame
  reads as "respectful" rather than "free-floating screenshot".
- Avoid grain, duotone, or filters. Color photography, neutral.

### Borders, corners, shadows

- **Card radius:** `20px` (`--r-card`). Inner panels: `12px`.
- **Buttons:** fully pill — `border-radius: 999px`, `min-height: 48px`.
- **Borders** are 1px and very low-contrast (`#D8E0D8`). On dark
  surfaces, white-alpha 15–20%.
- **Shadows are tinted forest-green** — never neutral black. Three
  levels: soft (1px+3px), card (1+3 stacked with 4+12), elevated
  (8+30 + 2+8). No drop-shadow-of-3 spread floats.
- **No inner shadows**, anywhere.
- **No colored left-border accents** on cards. (Common AI cliché, not
  present in this brand.)

### Layout

- Container width is `1280px`. Section vertical padding is `112px` on
  desktop, `64px` on tablet/mobile.
- The header sticks at `88px` and changes background-tint on scroll
  (transparent → `forest-night` 95% backdrop-blur).
- Sections alternate `white` ↔ `cream` ↔ `forest-deep` for rhythm.
  Dark sections always carry the medical-pattern overlay.

### Buttons & states

- **Primary:** filled `forest-deep` on white surfaces, filled
  `lime`/`mint-soft` on dark surfaces.
- **Outline:** 2px forest border, transparent fill, flips to filled on
  hover.
- **Ghost-on-dark:** white fill, forest text — used in nav.
- **Hover:** shadow lifts (`shadow-card → shadow-card-hover`) +
  `translateY(-1px)`. **No** color shift on filled buttons except the
  small darker-hover swap (`forest-deep → forest-darker`).
- **Press:** translateY back to 0, shadow drops to `soft`.
- **Focus:** 3px alpha-forest ring (`--shadow-focus`).
- **Link arrow:** the pattern `Learn more →` with a `translate-x-1` on
  hover is repeated across every clickable card.

### Animation

- **Calm.** 180ms ease-out, `transform` + `box-shadow` only. Things
  lift 1px on hover; they do not bounce, scale up, or spin.
- The site does have a `float` (3s) and `pulse-glow` (2s) keyframe set
  for decorative blobs; they're hand-applied and rare.
- **Always honor `prefers-reduced-motion`** — animations collapse to
  0.01ms (production already does this).

### Transparency + blur

- Used **only on dark surfaces** — language-picker card and country
  selector inside the homepage hero are `rgba(15,46,37,0.72)` +
  `backdrop-blur-lg`. Glassmorphism is not used on white.

### What this brand is NOT

- ❌ Blue or purple-gradient healthcare. The greens are the brand.
- ❌ Heart-with-pulseline icons as decoration — that's the logo mark,
  reserved.
- ❌ Rounded-corner cards with a colored left-border accent.
- ❌ Sans-serif on top of sans-serif with no display family.
- ❌ Hard-edged 0-radius elements.
- ❌ Emoji-heavy.

---

## ICONOGRAPHY

The production site uses **Lucide** (`lucide-react`) for system icons.
Stroke-based, 1.5–2px stroke, rounded line-cap, single color. We do not
ship a custom icon font.

In the production code, icons most commonly appear as:

1. **Inline glyphs** — `<Globe />`, `<Heart />`, `<Star />`,
   `<ChevronRight />`, `<Check />`, `<Clock />`, `<MapPin />`,
   `<UserRound />`, `<Mail />`, `<ShieldCheck />`, `<Lock />`,
   `<Zap />`, `<Package />`, `<CheckCircle2 />`, `<Tag />`,
   `<ArrowRight />`. Always currentColor-stroked, sized `size-4` or
   `size-5`.
2. **Icon tiles** — a 44×44 (or 56×56) rounded-square container
   (`--r-tile`) with a `mint-soft`/15 background and a forest-stroked
   icon. The `.gh-icon-circle` utility in `colors_and_type.css`
   captures this. On dark sections, the container goes `white/10` and
   the icon goes `mint-soft`.
3. **Country flags** — small alpha-2 flag badges (28×20, 2px radius,
   1px ring) inline beside country labels. The production site uses
   the `flag-icons` CSS sprite. Country **menu icons** (the larger
   circular PNGs) live in `assets/countries/`.

### Service-line illustrations

The codebase ships a set of single-color `*-ai.svg` icons for service
categories (cardiology, dermatology, prescription, etc.) — these are
**placeholder line-art**. They're consistent: 24×24 viewbox, forest-
deep stroke at 2px, rounded line-cap. Use them when you need a service
glyph but a Lucide icon won't quite fit semantically.

### CDN + usage

```html
<!-- For static pages, load Lucide via CDN: -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<i data-lucide="globe" class="size-5" style="color: var(--brand)"></i>
<script>lucide.createIcons();</script>
```

### Emoji + Unicode glyphs

- Emoji used only in stat chips on the homepage hero (`👨‍⚕️ 🌍 ⚡`).
  Avoid elsewhere.
- The `•` mid-dot is used as a separator in pill labels
  ("5 Countries • Online Care"). Use `•`, not `-` or `|`.
- Star ratings render `★★★★★` via Lucide `<Star fill>`, not the
  Unicode glyph.

---

## File-system contract for agents

When you build something using this design system:

1. Always `@import` `colors_and_type.css` at the top of your stylesheet.
2. Always reference the logo with `<img src="assets/logo/global-health-logo.png">` (or copy it into your output folder).
3. Default headings use `var(--font-display)`; default body uses
   `var(--font-body)`. Do not override unless you have a reason.
4. Buttons should match `.gh-btn` shape (48px tall, pill, sentence
   case, no terminal punctuation).
5. Sections begin with an **eyebrow** (`.gh-eyebrow`) → **H2**
   (`.gh-h2`) → **lede paragraph** (`.gh-body-lg`). Skip the eyebrow
   only on the very-first hero, never on interior sections.
