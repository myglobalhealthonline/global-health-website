# GH2 Design System — "Clinical Editorial"

**Status: AUTHORITATIVE.** This document supersedes `docs/DESIGN.md` wherever they conflict.
It defines the design language shipped on the country homepage (`/[country]/[lang]`, June 2026)
and is the spec for restyling **every other public page** to match. §8 defines the page
archetypes; §9 maps **every route on the website** to an archetype with page-specific notes.

Reference implementation (read these before styling anything):

| What | File |
|---|---|
| All `gh2-*` CSS utilities | `frontend/app/globals.css` (block starting `Country homepage redesign system — "clinical editorial" (gh2-*)`, ~line 1528) |
| Hero pattern | `frontend/components/sections/HomeHero.tsx` |
| Light editorial columns | `frontend/components/sections/TrustRibbon.tsx` |
| Open stat columns + sticky headline | `frontend/components/sections/StatsBand.tsx` |
| Editorial step rows | `frontend/components/sections/HowItWorksNarrative.tsx` |
| Dark white-glass cards | `frontend/components/sections/ServiceCatalog.tsx` |
| Dark closer section | `frontend/components/sections/FinalCTA.tsx` |
| Marquee band | `frontend/components/sections/CountryMarquee.tsx` |
| Header (translucent forest + lime CTA) | `frontend/components/layout/SiteHeader.tsx` |
| Footer (deep-night + watermark closer) | `frontend/components/layout/SiteFooter.tsx` |
| Section composition / rhythm | `frontend/app/(site)/[country]/[lang]/page.tsx` |

---

## 1. Design direction in one paragraph

**Clinical editorial.** Healthcare trust (deep forest greens, generous whitespace, precise
hairline rules) crossed with editorial magazine hierarchy (mono section indices, oversized
numerals, giant outlined watermarks, asymmetric grids, one accent word per headline).
Dark sections are *deep night gradients*, never flat. Lime (`#B0F122`) is the single
accent — used for CTAs, accent words, indices, and live signals. Nothing else is lime.
The page should read like a printed annual report for a hospital that hired a design studio.

---

## 2. Tokens (already defined in `globals.css` — never hardcode alternates)

### 2.1 Color

| Token / value | Use |
|---|---|
| `var(--color-brand-primary)` `#1D4B36` | Forest deep. Light-section headings, primary fills, icons |
| `var(--color-brand-primary-hover)` `#163826` | Hover for forest fills |
| `var(--color-brand-accent)` `#B0F122` | Lime. CTAs, accent word (dark sections), indices, live dots |
| `#8FB021` | Darkened lime — accent word **on light backgrounds only** (raw lime fails contrast on white) |
| `#0a1f14` | Ink on lime buttons (NOT forest — darker for contrast) |
| `var(--color-background-page)` `#FFFFFF` | Light section base |
| `var(--color-background-soft)` `#F6F8F1` | Warm off-white — alternate light section |
| `var(--color-background-panel)` `#EDF2E2` | Mint panel — inset blocks on light |
| `var(--color-text-primary)` `#1D4B36` | Light-section headings |
| `var(--color-text-body)` `#2D3B36` | Light-section body |
| `var(--color-text-muted)` `#6D6D6D` | Light-section secondary |
| `var(--color-border)` `#E4E7DD` | Light hairlines (cards) |

### 2.2 Dark-section palette (gradients, not flat)

Flat `var(--color-background-dark)` is allowed only for simple bands (e.g. StatsBand dark theme).
Atmospheric sections use these gradients:

```css
/* Hero — header melts into it (header bg = rgba(29,75,54,0.88)) */
.gh2-hero {
  background:
    radial-gradient(1100px 720px at 82% -8%, rgba(176,241,34,0.09), transparent 55%),
    radial-gradient(900px 640px at -12% 112%, rgba(0,0,0,0.35), transparent 60%),
    linear-gradient(172deg, #1D4B36 0%, #15382A 44%, #0F2E25 100%);
}

/* Mid-page dark section (ServiceCatalog) */
background: linear-gradient(178deg, #12342A 0%, #0F2E25 100%);

/* Closer sections (FinalCTA, team band) */
background: linear-gradient(168deg, #15382A 0%, #0F2E25 55%, #0B241C 100%);

/* Footer */
background: linear-gradient(180deg, #0F2E25 0%, #0B241C 100%);
```

Night-scale stops: `#1D4B36 → #15382A → #12342A → #0F2E25 → #0B241C`. Pick from this scale only.

### 2.3 On-dark text opacities (exact values — do not improvise)

| Role | Value |
|---|---|
| Heading | `rgba(255,255,255,0.95)` |
| Body | `rgba(255,255,255,0.55)`–`0.60` |
| Muted / captions | `rgba(255,255,255,0.40)`–`0.50` |
| Faint (stat captions) | `rgba(255,255,255,0.32)` |
| Hairline rules | `rgba(255,255,255,0.10)` |
| Section borders | `rgba(255,255,255,0.06)`–`0.08` |
| White-glass card fill | `rgba(255,255,255,0.045)` |
| White-glass card border | `rgba(255,255,255,0.10)` |

### 2.4 On-light hairlines

| Role | Value |
|---|---|
| Hairline rules | `rgba(29,75,54,0.16)` |
| Section borders | `rgba(29,75,54,0.10)` |
| Index numerals | `rgba(29,75,54,0.35)`–`0.40` |

### 2.5 Type

- Sans: `var(--font-manrope)` (Aptos stack) — everything.
- Mono: `var(--font-geist-mono)` (Cascadia Code stack) — **indices and counts only**, via `.gh2-index`.
- Radii: cards `var(--radius-card)` 20px / `--radius-card-sm` 12px; buttons/chips `999px`; inset photos `14px`.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for all transforms. Durations 200–300ms (700ms photo zoom only).

---

## 3. The `gh2-*` utility kit (in `globals.css` — reuse, do not duplicate)

| Class | What it does |
|---|---|
| `.gh2-hero` | Hero gradient canvas (see above) |
| `.gh2-watermark` | Giant outlined text: `-webkit-text-stroke: 1.5px rgba(255,255,255,0.055)`, transparent fill, 800 weight, `-0.04em` tracking, `0.78` line-height, nowrap, no select |
| `.gh2-arch` | Signature shape: `border-radius: 999px 999px 28px 28px` (chapel-arch top) |
| `.gh2-arch-frame` | Absolute inset `-14px` lime hairline frame around an arch (`rgba(176,241,34,0.22)`, radius `999px 999px 36px 36px`) |
| `.gh2-index` | Mono index: 12px, 600, `0.08em` tracking, tabular-nums |
| `.gh2-btn-lime` | Primary CTA: 56px tall pill, lime fill, `#0a1f14` ink, 800 weight, lime glow shadow; hover lifts `-2px` + `brightness(1.06)` + bigger glow; active `scale(0.98)` |
| `.gh2-btn-ghost` | Secondary CTA: 56px pill, `rgba(255,255,255,0.22)` border, white/85 text; hover fills `white/0.08` |
| `.gh2-card` | Card hover: lift `-4px`, lime border bloom `rgba(176,241,34,0.35)`, deep shadow |
| `.gh2-zoom` | Wrapper: child `img` scales `1.05` over 700ms on hover |
| `.gh2-live-dot` | 12px lime dot with infinite expanding-ring pulse (`gh2-ring` keyframes, 2.2s) |
| `.gh2-step` / `.gh2-step-arrow` | Editorial row hover: faint forest wash; arrow circle fills forest, goes white, slides `+4px` |
| `.gh2-underline` | Wrapper for hand-drawn SVG underline under hero accent word (SVG sits at `bottom: -0.14em`, height `0.22em`) |

All have `prefers-reduced-motion` guards already. Any **new** animation you add must too.

---

## 4. Core patterns (copy these exactly)

### 4.1 Section header — index + eyebrow → headline with ONE accent word

Every major section opens with this. From `StatsBand.tsx`:

```tsx
<p className="flex items-center gap-3">
  <span aria-hidden className="gh2-index"
    style={{ color: isLight ? "rgba(29,75,54,0.40)" : "rgba(176,241,34,0.50)" }}>
    03
  </span>
  <span className="text-[11px] font-bold tracking-[0.22em] uppercase"
    style={{ color: isLight ? "var(--color-brand-primary)" : "var(--color-brand-accent)" }}>
    {eyebrow}
  </span>
</p>
<h2 className="mt-5 font-extrabold leading-[1.0] tracking-[-0.035em]"
  style={{
    fontSize: "clamp(2.1rem, 4vw + 0.5rem, 3.6rem)",
    color: isLight ? "var(--color-text-primary)" : "rgba(255,255,255,0.95)",
    maxWidth: "16ch",
  }}>
  {headline}{" "}
  <span style={{ color: isLight ? "#8FB021" : "var(--color-brand-accent)" }}>{accentWord}</span>.
</h2>
```

Rules:
- Indices are **per-page sequential** (`01`, `02`, …) top to bottom. Homepage uses 01 trust →
  02 services → 03 stats → 04 team → 05 how-it-works → 06 final CTA. Each page restarts at `01`.
- Exactly **one** accent word per headline. Never two. Never the whole headline.
- Headlines: `font-extrabold`, `leading-[1.0]`, `tracking-[-0.035em]`, capped `maxWidth` (~14–18ch).
- Body under headline: `var(--text-body-lg)`, muted color, `maxWidth` ~38–44ch.

### 4.2 Section shell

```tsx
<section style={{ padding: "clamp(64px,8vw,120px) 0", /* + bg + borders */ }}>
  <div className="mx-auto px-5 md:px-10" style={{ maxWidth: "var(--container-width)" }}>
```

- Vertical padding: `clamp(64px,8vw,120px)`. Heros: more (`clamp(96px,…)` top).
- Adjacent same-tone sections separated by 1px borders (`rgba(255,255,255,0.06)` dark / `rgba(29,75,54,0.10)` light).

### 4.3 Hairline-rule columns (no boxes)

Stats / facts / feature lists do NOT live in cards on this system. They sit on rules:

- Each column gets `borderTop: 2px solid <hairline>`, first column gets the **accent** rule
  (`var(--color-brand-accent)` dark / `var(--color-brand-primary)` light).
- Inside: `.gh2-index` numeral → oversized value (`clamp(2.75rem,5.5vw,4.25rem)`, extrabold,
  `tracking-[-0.045em]`, `tabular-nums`) → 11px caps label (`tracking-[0.18em]`) → small muted caption.
- Vertical 1px separators between columns where the layout reads as a band (see `TrustRibbon.tsx`).

### 4.4 Asymmetric split + sticky headline

Two-column editorial sections: `lg:grid-cols-[1fr_1.35fr]` (or `1.2fr`), headline column
`lg:sticky lg:top-[calc(var(--header-height)+32px)]`. Headline left, content right.

### 4.5 Editorial step rows (lists of steps/options)

From `HowItWorksNarrative.tsx`: full-width rows separated by hairlines, each row =
ghost numeral (≥5rem, ~8% opacity) | title + copy | arrow-in-circle affordance with
`.gh2-step` hover. Use for "how it works", process lists, FAQ-ish indexes.

### 4.6 White-glass cards (dark sections only)

```css
background: rgba(255,255,255,0.045);
border: 1px solid rgba(255,255,255,0.10);
border-radius: var(--radius-card);
backdrop-filter: blur(8px);   /* where layered over imagery */
```

Add `gh2-card` (+ `gh2-zoom` if it has a photo). Photos inset with `rounded-[14px]` inside
the card padding — never full-bleed to card edge. Chips on cards: frosted
(`rgba(255,255,255,0.10)` + blur, 999px).

Light-section cards: white fill, `var(--color-border)` hairline, `var(--shadow-card)`,
same `gh2-card` hover (lime bloom works on light too).

### 4.7 Watermarks

- Hero: giant outlined country/page name behind content (`.gh2-watermark`,
  `fontSize: clamp(…, ~14vw, …)`, absolutely positioned, `aria-hidden`, `pointer-events-none`).
- Footer already closes every page with the cropped "Global Health" wordmark — don't add a
  second closer watermark on page bodies.
- On light sections, watermark stroke flips to `rgba(29,75,54,0.06)` (override the stroke color inline).

### 4.8 Buttons

- Primary: `.gh2-btn-lime` (+ `ArrowUpRight` icon from lucide, which nudges `+x/-y` on hover).
- Secondary on dark: `.gh2-btn-ghost`.
- Secondary on light: forest outline pill — `border: 1px solid rgba(29,75,54,0.25)`,
  forest text, hover `rgba(29,75,54,0.06)` wash.
- Tertiary/inline: text link + arrow, forest (light) / lime (dark).
- One lime button per viewport-height of content. CTAs pair: lime + ghost, never two limes.

### 4.9 Pills / badges

Hero-style status pills: 999px, 1px hairline border, frosted on dark
(`rgba(255,255,255,0.08)` + blur), 12–13px semibold. Live status pills include `.gh2-live-dot`.

---

## 5. Page composition rules

1. **Rhythm:** never more than two consecutive dark sections. Homepage rhythm: dark hero →
   dark marquee → **light** trust → dark services → light/dark stats → dark team → light
   how-it-works → dark final CTA → dark footer. Interior pages with mostly light content:
   dark hero band → light body sections → (footer is the dark closer; only long pages
   need their own dark pre-footer CTA).
2. **Header blend:** header is `rgba(29,75,54,0.88)` + blur. Every page's first section
   MUST start dark-forest at the top (use `.gh2-hero` or a `#1D4B36`-topped gradient) so
   the header melts into it. A light section directly under the header is forbidden.
3. **Interior page hero (the standard recipe):** shallower than homepage —
   `padding: clamp(72px,9vw,128px) 0 clamp(48px,6vw,80px)`, `.gh2-hero` canvas, watermark
   (page name) behind, index `01` eyebrow, H1 (`clamp(2.4rem, 5vw, 4.2rem)`, same tracking),
   one accent word, optional sub-copy + CTA pair, optional arch photo right on desktop.
4. **Numbering:** every section that has a header gets the next index. Sections without
   headers (marquees, plain CTAs) don't consume an index.
5. **Photos:** prefer arch-cropped (`.gh2-arch` [+ `.gh2-arch-frame` on dark]) for portraits;
   `rounded-[14px]` inset rectangles inside cards; never raw unrounded rectangles.
6. **Forms** (booking, checkout, auth, contact): light sections, white fields,
   `var(--radius-input)` 12px, `var(--color-border)` borders, forest focus ring
   (`var(--shadow-focus)`), labels 13px semibold forest. Submit = `.gh2-btn-lime`
   (it works on light backgrounds — keep the glow shadow).
7. **Admin (`/admin/**`) and patient portal (`/account/**`) are OUT OF SCOPE** — functional
   surfaces, do not restyle. Public `(site)` routes, auth pages, blog, about/faq/contact,
   booking/cart/checkout flows are in scope.

---

## 6. Motion + accessibility (non-negotiable)

- Scroll reveals: wrap in existing `RevealOnScroll` (`@/components/motion/RevealOnScroll`),
  stagger 120ms between siblings.
- Animate `transform` / `opacity` / `box-shadow` / `filter` only. Never layout props.
- Every hover transform has a `motion-reduce:` / `prefers-reduced-motion` guard
  (the gh2 utilities already do; match them in new code).
- Decorative elements (`watermarks`, indices, arches, dots): `aria-hidden`, watermarks also
  `pointer-events-none select-none`.
- Keep all existing i18n props, CMS overrides, hrefs, and aria labels when restyling —
  **restyle markup, never change component APIs or data flow.**
- Focus rings: `focus-visible:ring-2`, lime-tinted on dark (`rgba(176,241,34,0.45)`),
  forest-tinted on light (`rgba(29,75,54,0.3)`).
- Contrast: lime text only on dark; on light use `#8FB021` (accent words) or forest. Ink on
  lime fills is always `#0a1f14`.

---

## 7. Page archetypes

Every page on the site is one of these eight shapes. Build the archetype once, reuse it.
§9 assigns each route its archetype.

### A — Landing (homepage)
Already shipped — the reference implementation. Full atmospheric hero, watermark, arch
portrait, 6 indexed sections, dark/light rhythm, FinalCTA closer.

### B — Service category page
(GP appointment, See a specialist, Repeat prescription, Lab tests.)

1. **Hero band** — `.gh2-hero` canvas, shallower than homepage
   (`padding: clamp(72px,9vw,128px) 0 clamp(48px,6vw,80px)`). Watermark = service name
   (e.g. "GP"). Index `01` + eyebrow (e.g. `GENERAL PRACTICE`). H1 with one accent word.
   Sub-copy ≤ 44ch. CTA pair (lime "Book now" + ghost "How it works"). Right side desktop:
   arch photo (`.gh2-arch` + `.gh2-arch-frame`) OR a frosted info ticket (price-from,
   duration, availability pill with `.gh2-live-dot`).
2. **Trust strip** (light, index `02`) — 3–4 hairline columns: price from / duration /
   availability / certification. TrustRibbon light pattern.
3. **Service/option grid** (dark night-gradient, index `03`) — white-glass `gh2-card`s.
   Each card: inset 14px photo (if any), title, 2-line description, price + duration in
   `.gh2-index` mono, frosted chips for tags, arrow affordance. If page has only ONE
   bookable service, replace grid with a single editorial split: arch photo left, details +
   `.gh2-btn-lime` right.
4. **How-it-works rows** (light, index `04`) — reuse `HowItWorksNarrative` pattern,
   3 steps specific to this service.
5. **FAQ rows** (light, index `05`, optional) — editorial step-row pattern without arrows;
   ghost numeral + question + answer. Hairline-separated. No accordion cards.
6. **Closer CTA** (dark `168deg` gradient, index `06`) — slim FinalCTA variant: headline +
   CTA pair. No live stat needed (homepage owns that).

### C — Detail page
(Doctor profile, service detail `/consult/[serviceSlug]`, blog post.)

1. **Compact dark header band** — NOT a full hero. `linear-gradient(172deg, #1D4B36 0%, #15382A 100%)`,
   `padding: clamp(56px,7vw,96px) 0 clamp(40px,5vw,64px)`. Contains: breadcrumb
   (12px, `rgba(255,255,255,0.45)`, lime hover), then the identity row:
   - **Doctor:** arch portrait (~180px, `.gh2-arch`, lime frame) left; name as H1
     (`clamp(2rem,4vw,3.2rem)`), specialty eyebrow in lime caps, registration/IMC number in
     `.gh2-index` mono, country + languages as frosted pills, live availability pill.
   - **Service:** category eyebrow, H1 with accent word, price + duration in mono, CTA pair.
   - **Blog post:** category eyebrow + index, H1, author + date in mono, read-time pill.
2. **Body** — light, two-column `lg:grid-cols-[1fr_minmax(280px,0.45fr)]`. Main column:
   prose (H2s get small index+eyebrow markers `01`, `02`… scoped to the page), 17px body,
   `max-width: 68ch`. Aside column: sticky booking/summary card (white, hairline border,
   `var(--shadow-card)`, `.gh2-btn-lime` full-width, key facts on hairline rows).
3. **Related items** (light or dark, last index) — 3-up `gh2-card` grid linking to
   siblings (other doctors, related services, more posts).

### D — Directory / listing page
(Doctors index, blog index.)

1. **Compact dark header band** (as C.1) — H1 + result count in `.gh2-index` mono
   ("`14` doctors available"), search/filter controls ON the band: frosted inputs
   (`rgba(255,255,255,0.08)` + blur, 999px, white text, lime focus ring).
2. **Results** — light section. Cards: white, hairline border, `gh2-card` hover.
   Doctor cards: arch-cropped portrait (small `.gh2-arch`), name, specialty caps label,
   languages as chips, next-available slot in mono, forest outline "View profile" +
   lime "Book". Blog cards: 14px-rounded image, category chip, title, date in mono.
   Grid `sm:grid-cols-2 lg:grid-cols-3`; first/featured item MAY span 2 columns
   (editorial bento) — never a uniform soup.
3. Empty state: centered ghost numeral `00`, muted copy, ghost CTA back to booking.
4. Pagination/load-more: ghost pill buttons; active page = forest fill.

### E — Flow page (transactional)
(Book `/book`, cart, checkout.)

Function over atmosphere — but still branded:

1. **Slim dark strip** instead of hero: `#1D4B36 → #15382A` gradient,
   `padding: 28px 0 24px`. Contains H1 (smaller: `clamp(1.6rem,3vw,2.2rem)`) + step
   indicator: steps numbered in `.gh2-index` mono (`01 Service → 02 Doctor → 03 Time → 04 Details`),
   active step lime, done steps white/60, future white/30, connected by 1px hairlines.
2. **Body** — `var(--color-background-soft)` page, white panels (`var(--radius-card)`,
   hairline border, `--shadow-card`). Two-column: main flow left, sticky order summary
   right (`lg:grid-cols-[1fr_minmax(300px,0.42fr)]`). Summary card: items on hairline
   rows, totals row `2px` forest rule, lime submit button.
3. Selectable options (service cards, time slots): white cards, hairline border; selected
   state = forest 2px border + mint `#EDF2E2` wash + lime check dot. Time slots: 999px
   pill chips, selected = forest fill white text.
4. Forms per §5.6. Trust footer row: certification badges + lock icon, muted.

### F — Status / confirmation page
(Checkout success, cancelled, consent success, verify-email.)

Single centered column, `max-width: 560px`, on `--color-background-soft`, full-height
centered. White card: 999px icon disc (success = lime disc + `#0a1f14` check + one
`gh2-ring` pulse on load; cancelled/error = `#EDF2E2` disc + forest icon — NEVER red fills,
error text uses `#B91C1C` sparingly), H2, muted copy, reference/order number in
`.gh2-index` mono on a hairline row, lime primary action + ghost secondary.
Cancelled pages: ghost "Try again" primary, text-link "Contact support".

### G — Content / legal page
(About, FAQ, contact, privacy, terms, legal hub + `/legal/[type]`.)

1. **Compact dark header band** (C.1 shape): index `01`, eyebrow (`COMPANY`, `LEGAL`,
   `SUPPORT`…), H1 with accent word, optional watermark word behind.
2. **Body** — light, `max-width: 72ch` prose for legal/about text. H2s carry small mono
   index markers. Legal docs: effective-date + version in `.gh2-index` on a hairline row
   under the band; sticky table-of-contents aside on desktop
   (`lg:grid-cols-[minmax(220px,0.3fr)_1fr]`, links muted → forest active with lime dot).
3. **FAQ**: editorial Q rows (ghost numeral + question + answer), hairline-separated,
   grouped by topic with indexed group headers. No accordions unless count > 15 per group;
   if accordion needed, summary row styled as `.gh2-step` (arrow rotates 90°, no boxes).
4. **Contact**: asymmetric split — left sticky headline + contact channels on hairline
   rows (email/phone in mono), right white form card (§5.6). Closer: NOT another CTA —
   footer suffices.
5. **Legal hub** (`/legal`): document list as editorial rows — ghost index, doc title,
   effective date in mono, arrow affordance (`.gh2-step` hover).

### H — Auth page
(Login, register, forgot/reset password, verify-email form states.)

Split-screen desktop, `lg:grid-cols-[1fr_1fr]`:
- **Left panel** (hidden < lg): `.gh2-hero` gradient, watermark wordmark, one trust line +
  3 hairline mini-stats (reuse TrustRibbon dark column pattern, smaller). Pure brand.
- **Right panel**: white, centered `max-width: 420px` form. Logo top, H2
  (`clamp(1.6rem,2.5vw,2rem)`, one accent word ok), fields per §5.6, lime submit
  (full-width `.gh2-btn-lime`), muted alt-action links (forest, underline on hover).
Mobile: right panel only, slim dark strip with logo on top.

### I — Gateway (`/` country picker)
`.gh2-hero` full-viewport canvas, "Global Health" watermark, H1 with accent word,
country cards as white-glass `gh2-card`s in a grid: flag, country name extrabold,
doctor count in lime mono, languages as chips, arrow affordance. Below: marquee of
countries (CountryMarquee pattern). No other sections — the gate has one job.

---

## 8. Route-by-route map (complete website)

Status legend: ✅ shipped · 🔁 restyle to archetype · 🚫 out of scope (functional surface).

### 8.1 Global pages `(site)`

| Route | Archetype | Notes |
|---|---|---|
| `/` | I | Country gateway. Watermark "Global Health". |
| `/about` | G | Add team band reuse (homepage `04` team pattern) mid-page; stats row (TrustRibbon light). |
| `/faq` | G | Editorial Q rows grouped by topic; search input (frosted, on dark band). |
| `/contact` | G | Split layout per G.4. |
| `/privacy` | G | Prose + sticky ToC. |
| `/terms` | G | Prose + sticky ToC. |
| `/blog` | D | Featured post spans 2 cols (bento). Category filter = pill rail (SectionNav-style). |
| `/blog/[slug]` | C | Blog variant of C.1; cover image inset 14px below band, NOT full-bleed. Related posts 3-up. |
| `/cart` | E | Global cart variant — same body as country cart. |
| `/checkout` + `/checkout/success` + `/checkout/cancelled` | E / F / F | |
| `/brazil/consent` | E | Single-panel consent form, slim dark strip, white form card. LGPD seriousness: no playful copy. |
| `/brazil/consent/success` | F | |
| `/patient-upload` | E | Slim strip + single white upload card; file dropzone = dashed `rgba(29,75,54,0.25)` border, mint wash on dragover, lime progress bar. |
| `/reviews/rate` | E | Slim strip + white card; star control = forest outline stars, lime fill on select, scale pop on tap. |

### 8.2 Auth pages `(auth)`

| Route | Archetype | Notes |
|---|---|---|
| `/login` | H | |
| `/register` | H | Multi-field; group fields with 13px caps section labels. |
| `/forgot-password` | H | Single field — keep left brand panel. |
| `/reset-password` | H | |
| `/verify-email` | H → F | Form state = H; post-verify confirmation = F card inside right panel. |

### 8.3 Country-scoped pages `/[country]/[lang]/…`

| Route | Archetype | Notes |
|---|---|---|
| `/` (country home) | A | ✅ Shipped. Reference implementation. |
| `/gp-appointment` (→ `general-consultation/page.tsx`) | B | Watermark "GP". Eyebrow `GENERAL PRACTICE`. |
| `/see-a-specialist` (→ `specialist-consultation/page.tsx`) | B | Specialty grid = white-glass cards; per-specialty doctor counts in mono. |
| `/repeat-prescription-request` (→ `prescriptions/page.tsx`) | B | Mind Google-Ads copy constraints (GP-only positioning — see prescription-scrub notes). |
| `/lab-tests` (→ `tests/page.tsx`) | B | Test cards: biomarker count in mono, sample-type chip. |
| `/consult/[serviceSlug]` | C | Service detail variant; sticky booking aside. |
| `/doctors` | D | Filter rail on dark band (specialty, language, availability). |
| `/doctors/[doctorSlug]` | C | Doctor variant; bio prose + credentials on hairline rows + availability calendar in aside card. |
| `/book` | E | THE core flow. 4-step indicator per E.1. Slot pills per E.3. |
| `/cart` | E | |
| `/checkout` + `success` + `cancelled` | E / F / F | Success: `gh2-ring` pulse on check disc, appointment details on hairline rows. |
| `/legal` | G | Legal hub rows per G.5. |
| `/legal/[type]` | G | Prose + ToC + effective-date mono row. |
| `/[country]` (no lang) | — | Redirect only. No UI. |

Marketing aliases (`/online-doctor-visit`, `/specialist-appointment`, `/repeat-prescription`,
`/book-online`, `/sick-certificate` etc. in `next.config.ts`) resolve to the routes above —
styling the canonical page covers them.

### 8.4 Out of scope 🚫

| Surface | Why |
|---|---|
| `/admin/**` | Internal tool. Keep functional admin UI. |
| `/doctor/**` (doctor portal) | Internal tool. |
| `/account/**` (patient portal) | Separate portal design pass — do not touch in this rollout. |
| `/print/**` | Print stylesheets — paper, not brand atmosphere. |
| `/share/consults/[token]` | Clinical document view — legibility first; MAY adopt tokens (forest headings, hairlines) but no dark sections, no watermarks. |

### 8.5 Shared components to restyle once (used across archetypes)

| Component | Used by | Treatment |
|---|---|---|
| Breadcrumbs | C, D, G | 12px, white/45 on dark bands, mono `/` separators, lime hover. |
| Pagination | D | Ghost pills, forest fill active. |
| Filter/search inputs on dark bands | B, D | Frosted: `rgba(255,255,255,0.08)` + blur, 999px, lime focus ring. |
| Form fields (light) | E, G, H | §5.6: white, 12px radius, forest focus ring. |
| Toasts/alerts | all | White card + hairline, 4px left rule: lime = success, forest = info, `#B91C1C` = error (text stays forest/ink). |
| Loading skeletons | D, E | `#EDF2E2` shimmer on light; `rgba(255,255,255,0.06)` on dark. |
| Empty states | D, E | Ghost `00` numeral + muted copy + ghost CTA. |
| Modal/dialog | E | White, `--radius-card`, `--shadow-elevated`, dark scrim `rgba(11,36,28,0.55)` + blur(4px). |

---

## 9. Banned (instant review-fail)

- Flat `#1D4B36` backgrounds for atmospheric sections (use night gradients).
- Old dark-glass cards (`rgba(15,46,37,…)` fills) — replaced by white-glass.
- More than one accent word per headline; lime body text; lime on white.
- Uniform symmetric card grids where an editorial pattern (rules/rows/asymmetric split) fits.
- New colors, new fonts, new easing curves, new shadow recipes outside this doc.
- Duplicating gh2 CSS into components — utilities live in `globals.css` only; extend the
  gh2 block there if something is truly missing.
- Touching header/footer (done), homepage sections (done), or admin/portal pages.

---

## 10. Checklist per page

- [ ] Page built to its assigned archetype from §8 (look the route up first)
- [ ] First section starts forest-dark under the translucent header
- [ ] Hero: watermark + `01` index + eyebrow + one-accent-word H1
- [ ] All section headers use the index+eyebrow pattern, sequential from 01
- [ ] Dark sections use night-gradient stops; light sections use white / `#F6F8F1`
- [ ] No 3+ consecutive dark sections
- [ ] Stats/facts on hairline rules, not boxes; first rule is accent-colored
- [ ] Cards: white-glass (dark) / white+hairline (light), `gh2-card` hover, inset 14px photos
- [ ] CTAs: `.gh2-btn-lime` + `.gh2-btn-ghost` pair, lucide `ArrowUpRight`
- [ ] Exact on-dark opacity table respected (no invented rgba values)
- [ ] Reduced-motion guards on any new animation; decorative elements `aria-hidden`
- [ ] Component props/i18n/CMS/data flow untouched
- [ ] `npx tsc --noEmit` clean; visual check at 375px and 1440px
