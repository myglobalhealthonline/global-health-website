# Phase 1 — Public Marketing Site Redesign Audit

**Scope** Public marketing surface only. `app/(site)/**` plus the section + card + layout components it consumes. Admin / doctor / patient portals deferred.
**Target aesthetic** Minimalist, calm, health-trust. Locked.
**Stack** Next.js 16.2.4, React 19.2.4, Tailwind v4 (`@import "tailwindcss"`), Radix primitives (dialog, dropdown, slot), lucide-react, sonner, flag-icons. **No framer-motion, no GSAP, no Lottie.** Motion = CSS / Web Animations only.
**Date** 2026-05-22.

---

## 0. Foundation gaps (block clean Phase 2)

Both must be addressed before Phase 2 produces a meaningful `direction.md`.

| Gap | State | Impact | Recommendation |
|---|---|---|---|
| **PRODUCT.md missing** | Loader reports `hasProduct: false` | Audit lacks formal "who / why / anti-references" anchor; brand voice is inferred from code + filenames | Run `$impeccable teach` between Phase 1 sign-off and Phase 2 to generate it. Will need user input on tone + anti-references. |
| **DESIGN.md is Linear preset** | Loader returned a Linear-style dark/lavender system. The actual project tokens live in `frontend/app/globals.css` (forest #1B4D3E + mint + lime + white) | If Phase 2 grades work against this stale file, every page fails. Reverse is also wrong — promoting it would dark-mode a health site. | Delete `DESIGN.md` at project root. Phase 2 produces a new one from `globals.css` + the direction decisions. |

---

## 1. Stack signal

```
next 16.2.4 · react 19.2.4 · tailwind v4 · radix (dialog/dropdown/slot)
lucide-react · sonner · flag-icons · jose · sanitize-html · clsx · tailwind-merge
```

Implication: **all motion in Phase 4 must use CSS transitions / Web Animations API**, not a runtime motion library. `globals.css` already has a `prefers-reduced-motion: reduce` guard at lines 1064–1073 — good baseline.

The existing token system in `globals.css` is the source of truth:

| Layer | Tokens |
|---|---|
| Brand | `--color-brand-primary` `#1B4D3E` (forest), `--color-brand-accent` `#B0F122` (marketing lime), `--color-accent` `#C8E6A0` (UI mint) |
| Surface | `--color-background-page` (white), `--color-background-soft` (mint-cream), `--color-background-panel`, `--color-background-dark` (#0F2E25 forest night) |
| Text | `--color-text-primary` `#0F2E25`, `--color-text-body`, `--color-text-muted`, `--color-text-placeholder` |
| Border | `--color-border`, `--color-border-strong` |
| Radius | `--radius-card` 20px, `--radius-card-sm` 12px, `--radius-button` 999px (pill), `--radius-tile` 16px |
| Shadow | Forest-tinted (`rgba(15, 46, 37, ...)`) — never neutral black |
| Type | Fluid via `clamp()` — `--text-display` `--text-h1..h3` `--text-body-lg` `--text-body` |
| Layout | `--container-width` 1280px, `--section-padding-y` 112px (sm 64), `--header-height` 88px |

Good news: **the design system is already minimalist + health-themed.** The redesign is about applying it consistently, not inventing it.

---

## 2. Inventory

### Pages (`app/(site)/**`)

| Path | Role | LOC |
|---|---|---|
| `layout.tsx` | Shell wrapper (JSON-LD, CartProvider) | 68 |
| `page.tsx` | Root redirect via CountryEntryGate | 21 |
| `[country]/page.tsx` | Country root → lang redirect | 50 |
| **`[country]/[lang]/page.tsx`** | **Country home — primary marketing surface** | **303** |
| `[country]/[lang]/doctors/page.tsx` | Doctors index | 94 |
| `[country]/[lang]/doctors/[doctorSlug]/page.tsx` | Doctor profile wrapper | 27 |
| `[country]/[lang]/general-consultation/page.tsx` | GP service page | 215 |
| `[country]/[lang]/specialist-consultation/page.tsx` | Specialist service page | 232 |
| `[country]/[lang]/prescriptions/page.tsx` | Rx catalogue | 192 |
| `[country]/[lang]/tests/page.tsx` | Health tests catalogue | 200 |
| `[country]/[lang]/book-online/page.tsx` | Legacy booking wrapper | 120 |
| `[country]/[lang]/consult/[serviceSlug]/page.tsx` | Service → doctor → slot picker | 315 |
| `[country]/[lang]/cart/page.tsx` | Cart | 392 |
| `[country]/[lang]/checkout/page.tsx` | Checkout | 345 |
| `[country]/[lang]/checkout/{success,cancelled}/page.tsx` | Stripe return | small |
| `blog/page.tsx` | Blog index | 38 |
| `blog/[slug]/page.tsx` | Article | medium |
| `contact/page.tsx` | Contact + form | 61 |
| `privacy/page.tsx` | Legal | medium |
| `brazil/consent/page.tsx` | BR GDPR consent + Stripe fee | medium |
| `cart/page.tsx`, `checkout/page.tsx` | Legacy redirects | small |
| `patient-upload/page.tsx`, `reviews/rate/page.tsx` | Tokenised one-shot pages | small |

### Section components (`frontend/components/sections/`)

Heroes + CTAs that compose the marketing canvas — these carry the most weight in Phase 3.

`HomeHero`, `HeroSection`, `TrustBar`, `TrustRibbon`, `TrustSignals`, `HowItWorks`, `HowItWorksNarrative`, `ServicesGrid`, `SpecialtiesGrid`, `ServiceCatalog`, `DoctorsSection`, `DoctorWall`, `FeaturedDoctor`, `FAQSection`, `FinalCTA`, `BookingCTA`, `CountryEntryGate`, `RichBodySection`, `ReviewBadge`, `TeamHero`.

### Cards (`frontend/components/cards/`)

`BlogCard`, `DoctorCard`, `PricingCard`, `ServiceCard`, `ConsultationDestinationCard`.

### Layout shell (`frontend/components/layout/`)

`SiteChrome`, `SiteHeader`, `SiteFooter`, `MobileNav`, `Container`, `Section`, `Breadcrumbs`, `CTAFooter`, `CountrySwitcher`, `LanguageSwitcher`, `NewsletterSignup`, `SectionNav`.

---

## 3. Per-page audit (0–5)

Wrappers / pure redirects collapsed into a single line. **Bold rows** are the ones Phase 3 should land first.

| Page | HIER | SPACE | TYPE | COLOR | CONTRAST | MOTION | A11Y | RESP | SLOP | One-line evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| `(site)/layout.tsx` | — | — | — | — | — | — | 2 | — | 0 | Plumbing only; JSON-LD wiring intact. |
| `(site)/page.tsx`, `[country]/page.tsx` | — | — | — | — | — | — | 1 | — | 0 | Pure redirects. Country gate handles UX. |
| **`[country]/[lang]/page.tsx`** | 4 | 3 | 4 | 4 | 4 | 3 | 3 | 4 | 2 | Six modular sections (Hero → Trust → ServiceCatalog → DoctorWall → HowItWorks → FinalCTA) but `ServiceCatalog` cards are identical — no weight diff between General vs Specialist tiles. |
| `doctors/page.tsx` | 3 | 3 | 3 | 3 | 3 | 1 | 3 | 2 | 2 | Delegates everything to `DoctorTeamTemplate`; identical card grid expected. |
| **`general-consultation/page.tsx`** | 4 | 3 | 4 | 4 | 4 | 2 | 3 | 4 | 2 | 7 serial sections, ServicesGrid lacks "most popular" or doctor-count hierarchy. |
| **`specialist-consultation/page.tsx`** | 4 | 3 | 4 | 4 | 4 | 2 | 3 | 4 | 2 | 8 layers — adds `SpecialtiesGrid`; specialty tiles + service cards both identical card shape, no visual distinction. |
| `prescriptions/page.tsx` | 3 | 3 | 3 | 3 | 3 | 1 | 3 | 4 | 2 | "Coming soon" fallback identical to populated grid — no visual cue when empty. |
| **`tests/page.tsx`** | 3 | 3 | 3 | 3 | 4 | 1 | 3 | 4 | 2 | Stock-state badges cascade (rose "Sold out" + amber "Only N left" + emerald price) — three overlapping signals on one card. Should consolidate into the CTA. |
| `consult/[serviceSlug]/page.tsx` | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | Service-context card is highlighted (`border-2 border-emerald-400 ring-2`); doctor grid below blends. |
| `checkout/page.tsx` | 3 | 4 | 4 | 3 | 4 | 2 | 4 | 3 | 1 | Strong checkout pattern; only nit — Stripe disclaimer is tiny + below the CTA, should be above. |
| `cart/page.tsx` | 3 | 3 | 3 | 3 | 4 | 2 | 4 | 4 | 1 | Item kind (HEALTH_TEST / RX / CONSULT) shown as text-xs only; would scan faster with an icon. |
| `blog/page.tsx` | 3 | 3 | 3 | 2 | 2 | 1 | 2 | 3 | 2 | All BlogCards equal weight; no featured / latest sort signal. |
| `blog/[slug]/page.tsx` | 4 | 4 | 4 | 3 | 4 | 1 | 3 | 4 | 0 | Best article layout in repo. One bug: CTA `/book-online` is **not locale-aware** — should be `/{country}/{lang}/general-consultation`. |
| `contact/page.tsx` | 4 | 4 | 4 | 3 | 4 | 1 | 4 | 3 | 0 | Cleanest split-grid page. |
| `privacy/page.tsx` | 3 | 3 | 4 | 2 | 4 | 0 | 3 | 3 | 0 | Linear h2 cadence; last-updated date is too subtle. |
| **`brazil/consent/page.tsx`** | 2 | 2 | 2 | 1 | 2 | 1 | 2 | 2 | 2 | Mixes custom `gh-*` CSS classes with raw Tailwind; falls back to unstyled if theme CSS loads late. Lowest-scoring page in the audit. |

---

## 4. Second-read moments — what should catch the eye but doesn't

A "second read" is what a returning visitor's eye lands on after the hero. These are the slots where the minimalist treatment is most likely to feel flat.

| Page | Today | Should be |
|---|---|---|
| Country home | Three identical service tiles in `ServiceCatalog` | One feature tile (most-booked / hero service) + two flat tiles. Asymmetric grid. |
| Country home | `DoctorWall` shows all doctors equal weight | One "featured" doctor card 2× width / promoted treatment + the rest at default. Already partially supported via `FeaturedDoctor` component — not wired in. |
| General consultation | Service cards in a 3-up grid | Pricing-prominent layout: large bold price + small caption + CTA pill, varied row heights. |
| Specialist consultation | Two separate grids (specialties + services) | Collapse to a **single decision surface**: specialty → expanded services within. Removes one "stack of identical cards" repetition. |
| Tests | Stock badges + price badge + image + body + CTA | Stock state lives inside the CTA button (`Add to cart · €45` vs disabled `Sold out`). Image stays. Strip the badges. |
| `consult/[serviceSlug]` | Doctor grid is identical cards with a tiny "Pick a time" link | Promote `Pick a time` to a primary pill button; show a per-doctor "next available slot" preview (`Tomorrow 09:30` etc.). |
| Blog index | All BlogCards equal | Featured post on top (1×, wider, larger title), then 3-up grid below. |
| Privacy | Last-updated date is `text-sm text-slate-500` | Promote into the hero strip (eyebrow + h1 + "Updated 16 May 2026" as a meta line). |

---

## 5. Broken patterns observed

Anti-AI-slop checklist + project-specific patterns.

| Pattern | Where | Severity |
|---|---|---|
| **Identical card grids** | `(site)/[country]/[lang]/page.tsx` `ServiceCatalog`, `general-consultation` `ServicesGrid`, `specialist-consultation` (twice — specialties + services), `consult/[serviceSlug]` doctor grid, `blog/page.tsx`, `tests/page.tsx`, `prescriptions/page.tsx` | **High** — the most repeated anti-pattern in the codebase |
| **7+ serial sections per page, equal visual weight** | All three top service pages (general, specialist, country home) | **High** — no rhythm between sections; eye gets lost |
| **Cascading status badges on one card** | `tests/page.tsx` lines 158–166 (emerald price + amber "Only N left" + rose "Sold out") | **Medium** — fold into the CTA |
| **Hardcoded grid `<style>` blocks instead of tokens** | `SiteFooter.tsx` lines 207–218, `HomeHero.tsx` lines 389–392, `CountryEntryGate.module.css` | **Medium** — repeats a rhythm pattern the design system should own |
| **Inline `padding: "112px 0"`** (raw px, not a token) | `FinalCTA.tsx` line 19, `CTAFooter.tsx` line 19 | **Low** — drift risk |
| **Flag rendering re-implemented per consumer** | `MobileNav`, `CountrySwitcher`, `DoctorWall`, doctor card | **Low** — extract `<Flag code="ie" />` |
| **`dangerouslySetInnerHTML` from admin-supplied content** | `RichBodySection.tsx`, used on home/general/specialist/Rx/tests/blog | **Audit gate** — confirm `sanitize-html` runs before render; if not, **XSS + a11y risk** |
| **`gh-*` custom classes + Tailwind mixed** | `brazil/consent/page.tsx` (full page); `globals.css` defines `.gh-card .gh-input .gh-btn-primary` etc. | **Medium** — pick one approach per page; theme-load race is real |
| **Backdrop-filter inlined on header** | `SiteHeader.tsx` lines 114–116 hardcode `backdropFilter` | **Low** — extract `.gh-header-sticky` |
| **Hover-scale on doctor portrait** | `DoctorCard.tsx` line 48 `group-hover:scale-105`, missing `motion-reduce:` | **Low** — add the guard |
| **TrustSignals column-count ternary** | `TrustSignals.tsx` line 32 — fragile logic switching between 2/3/4 cols based on item count | **Low** — simplify to `lg:grid-cols-3` |
| **`/book-online` CTA in `blog/[slug]` is not locale-aware** | `blog/[slug]/page.tsx` line 86 | **Bug, not visual** — but already in scope to fix while we're there |
| **Pulsing live-doctor dot in hero** | `HomeHero.tsx` lines 251–256 — pulse CSS animation, relies on global motion-reduce only | **Low** — add explicit `motion-reduce:animate-none` |

### What is *not* broken — explicitly noted to avoid over-correcting

- No glassmorphism abuse. The header has one tasteful blur; nothing else.
- No gradient text spam. `HomeHero` has one subtle highlight on "From anywhere" — keep.
- No bouncing / elastic easings. No stagger-spam. No fade-on-mount on static content.
- No cards-inside-cards. No modal-first thinking.
- No side-stripe borders >1px used decoratively.
- No `#000` or `#fff` literals in tokens — every neutral tints toward forest.

The site is **6.5–7 / 10** by both auditors' summary scores. The work is mostly tightening, not rebuilding.

---

## 6. Cross-cutting findings

| # | Finding | Suggested home in Phase 3 |
|---|---|---|
| C1 | Section padding is sometimes inline `112px`, sometimes Tailwind `py-12`, sometimes `--section-padding-y`. Three sources of truth. | Extract `.gh-section` utility in `globals.css` using `padding-block: clamp(64px, 8vw, 112px)`. Replace inline / Tailwind usage. |
| C2 | Card grid (`grid gap-6 sm:grid-cols-2 lg:grid-cols-3`) hand-coded in **every** card-rendering component. | Add `.gh-card-grid` utility. Use everywhere. Single point of change when we move to asymmetric grids in Phase 3. |
| C3 | No `<Flag>` atom — flag rendering re-implemented 4+ times. | Extract `frontend/components/ui/Flag.tsx`. |
| C4 | `motion-reduce:` guards missing on 4–5 visible animations (DoctorCard scale, ServiceCard arrow translate, DoctorWall lift, HomeHero pulse, FinalCTA padding pulse if any). | Add per-element. Global guard is fallback, not primary. |
| C5 | `CountrySwitcher` + `LanguageSwitcher` are hand-rolled custom dropdowns with manual click-outside. Don't trap focus on open. | Migrate to Radix `Select` or `DropdownMenu`. Already in deps. |
| C6 | `RichBodySection` calls `dangerouslySetInnerHTML` on admin-supplied content. `sanitize-html` is in deps — verify it runs at render time. | Sanity check in Phase 3 first commit. Not a redesign issue per se but worth confirming while we're in the file. |
| C7 | `[country]/[lang]/page.tsx` doesn't wire `FeaturedDoctor` even though the component exists. | Phase 3: replace one `DoctorWall` card with a `FeaturedDoctor` slot to break the monotony. |
| C8 | `brazil/consent/page.tsx` is the worst-scoring page — different style language from the rest of the site. | Phase 3: rewrite using `gh-*` classes consistently (or Tailwind consistently), pick one. |

---

## 7. Lock list — must be preserved verbatim through Phase 3

These are content + behaviour the redesign must NOT touch.

**Routing + slug architecture**
- `/[country]/[lang]/*` shape; `COUNTRY_CODE_TO_SLUG` mapping.
- `pageMetadata()` calls on every page.
- `breadcrumbJsonLd`, `medicalBusinessJsonLd`, `medicalProcedureJsonLd` — legal / SEO contracts.
- `isCountryFeatureEnabled` gating logic.

**CTAs + business copy**
- "Book a consultation" / "Request a prescription" / "Add to cart" / "Browse consultations" — exact labels.
- "Licensed doctors", "Compliant by default", "GDPR-compliant" — trust line copy.
- "Lab-quality tests, delivered home" — tests hero claim.
- Doctor-count + language-count interpolation logic in `HomeHero`.

**Compliance**
- All copy in `privacy/page.tsx` (Who we are / What we collect / Cookies / Your rights / Retention / Sub-processors).
- All Portuguese copy in `brazil/consent/*` — "Submeter e pagar", "O seu consentimento foi registado", etc.
- Emergency number "112 in EU" (`contact/page.tsx` line 50).
- Email addresses `info@myglobalhealth.online`, `privacy@myglobalhealth.online`.

**Form fields (booking + checkout + contact)**
- All form field names + autocomplete attributes in `checkout/page.tsx`.
- Cart `kind` enum (`HEALTH_TEST` / `PRESCRIPTION_SERVICE` / `GENERAL_CONSULTATION` / `SPECIALIST_CONSULTATION`).
- `heldUntil` slot-hold countdown on cart rows.
- Stripe disclaimer text.

**Provider wiring**
- `CartProvider`, `JsonLd` injection at layout level.
- `sanitize-html` if present in the `RichBodySection` render path.

---

## 8. Suggested Phase 3 ordering (for discussion in Phase 2 boundary)

Each unit = one commit. Each commit aligns to one component family.

| Order | Unit | Why first |
|---|---|---|
| 1 | `globals.css` — add `.gh-section`, `.gh-card-grid`, normalise spacing tokens | Foundation. Every later commit reads from these. |
| 2 | `Flag` atom extraction + replace 4 call sites | Tiny win, unblocks `CountrySwitcher` redesign. |
| 3 | `SiteHeader` — extract `.gh-header-sticky`, migrate switchers to Radix | High-traffic, every page touches it. |
| 4 | `SiteFooter` — remove inline `<style>`, use `.gh-footer-grid` | Same. |
| 5 | `HomeHero` + `[country]/[lang]/page.tsx` — wire `FeaturedDoctor`, break ServiceCatalog symmetry | The page the most users see. |
| 6 | `general-consultation` + `specialist-consultation` — collapse specialty + service into one progressive surface, vary card weight | Two of the highest-converting pages. |
| 7 | `tests/page.tsx` — fold stock state into CTA | Quick clarity win. |
| 8 | `consult/[serviceSlug]` — promote doctor card CTA + show "next available" preview | Critical conversion surface. |
| 9 | `blog/*` — featured-post layout + fix non-locale-aware CTA | Low risk, quick polish. |
| 10 | `brazil/consent/page.tsx` — single styling system, tighten consent block | Worst-scoring page; isolated blast radius. |
| 11 | Add motion-reduce guards across `DoctorCard`, `ServiceCard`, `HomeHero` pulse, `DoctorWall` lift | A11y polish; safe last. |

Phase 4 motion work follows; only one signature moment in scope (likely the country gate or hero transition).

---

## Open questions for the Phase 1 boundary

Before Phase 2 starts, four decisions me need from you:

1. **Run `$impeccable teach`** between Phase 1 and Phase 2 to produce `PRODUCT.md`, or proceed without it and write `direction.md` from code intuition?
2. **Delete the stale Linear `DESIGN.md`** at project root? Phase 2 will produce a fresh one from `globals.css`.
3. **Is `brazil/consent` in scope?** It's a Portuguese consent + Stripe-fee page — different audience (existing patient finishing a flow). Rebuilding it = the highest risk per minute of work.
4. **`FeaturedDoctor` wiring** — currently the component exists but isn't used. Phase 3 plan promotes it. Confirm one featured doctor card on the country home is the right direction, or hold off?

No code touched yet. Awaiting Phase 1 sign-off before invoking taste-skill + writing `direction.md`.
