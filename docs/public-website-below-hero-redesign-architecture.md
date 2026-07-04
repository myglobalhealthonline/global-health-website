# Public Website Below-Hero Redesign — Architecture Spec

Author: Fable 5 (architecture pass). Executors: Sonnet 5 agents.
Date: 2026-07-04. Branch: `Dev-hassaan`.

## 1. Executive summary

The public marketing pages (home, service listing pages, doctors, heroes) already carry a premium ivory + dark-forest + glass identity. Three systemic failures break the experience below the hero:

1. **The conversion funnel (book → cart → checkout) drops the brand entirely** — flat white cards, generic SaaS forms, zero glass, zero forest depth, right where payment trust matters most.
2. **All light-theme card variants are flat** — `DoctorCard`, `ServiceCard`, `FeaturedDoctor`, `BlogCard` light variants are plain `bg-white` + hard border. Only dark variants use `gh2-glass`.
3. **Lime is overdosed and glowing** — `rgba(176,241,34,*)` box-shadows on price chips, CTAs, hover blooms, filter fills; reads neon, not premium.

Plus: homepage section rhythm has hero+marquee back-to-back dark (spec violation), `StatsBand` light cards are invisible, dark-surface text at `/40–/50` opacity fails WCAG AA, no `<main>` landmark, form status messages lack `role="alert"`.

This spec defines a token/class layer (§9), per-component redesigns (§10–§18), and an exact execution order (§22).

## 2. Full public website scope

- `frontend/app/(site)/**` — home, `[country]/[lang]/**` (landing, doctors, doctor profile, services, service detail, book, cart, checkout ± success/cancelled, pricing), blog, contact, faq, privacy, terms, about, reviews.
- `frontend/app/(auth)/(public)/**` — login, register, forgot-password, reset/verify.
- Public layout: `SiteChrome`, `SiteHeader`, `SiteFooter`, `MobileNav`, `Container`, `Section`, `CountrySwitcher`, `LanguageSwitcher`, `SectionNav`, `NewsletterSignup`.
- Public sections: `CountryEntryGate`, `ServiceCatalog`, `DoctorCarousel`, `DoctorsSection`, `FeaturedDoctor`, `StatsBand`, `TrustRibbon`, `FAQSection`, `FinalCTA`, `StickyBookingCTA`, `GH2PagePrimitives`, `SameDayBooking`, `DoctorFilters`, `CountryMarquee`, `HowItWorksNarrative`, `VerifiedProfessionals`.
- Public cards: `DoctorCard`, `ServiceCard`, `BlogCard`, `CartServiceCard`, pricing cards, booking selection surfaces.
- Public forms: `ContactForm`, `phone-field`, booking forms, checkout forms, newsletter, auth forms.
- `frontend/app/globals.css` — public token/class work only.

## 3. Explicit hero exclusion

Do NOT redesign: `HomeHero`, `ServiceHero`, `DoctorsHero`, `PageHero`, `ContactArchPanel`, hero imagery, hero copy, hero animation, `.gh2-hero`, `.gh-home-hero-*` (except the one clamp fix below). Allowed hero-adjacent changes ONLY:

- `CountryMarquee` dark→light (it is the hero-to-body transition strip, not the hero).
- `.gh-home-hero-title` clamp floor for 320–360px (mobile overflow class of fix): change `clamp(3rem, 7vw + 0.75rem, 6rem)` → `clamp(2.5rem, 8vw, 6rem)` in `globals.css` (~L888).
- Spacing immediately after heroes if a section change requires it.

## 4. Out-of-scope portal guardrails

Never touch: `/admin/**`, `/doctor/**`, `/account/**`, `frontend/components/portal-shell.tsx`, `frontend/components/portal-atoms.ts`, `frontend/app/(admin)/**`, `frontend/app/(doctor)/**`, portal skeletons. New CSS classes must be `gh2-*` prefixed and additive; do not modify `gh-quick-action`, `gh-portal-*`, or any class grep-confirmed to be used in portal files. Before editing any existing `gh-*` class, grep its usage; if it appears under `(admin)`, `(doctor)`, or `account`, leave it alone and add a new `gh2-*` class instead. Smoke-check `/account`, `/doctor`, `/admin` after CSS changes.

No changes to: backend, database, booking/slot/assignment logic, cart pricing math, checkout/Stripe logic, auth redirects, server actions, medical/legal copy meaning, plan coverage calculations. Preserve exactly: `CartContext` mutation wiring, benefit-selection flow (`onSelectBenefit` → `patchItem` → `coverageNonce`), summary `dl` bound values/order, `ConsultationBookingForm` slot/benefit/family resolution + `formKey` remount, `MobileOrderTotalBar` IntersectionObserver + `cart-order-summary`/`checkout-order-summary` DOM ids, `useCountdown` logic, success-page `processing` vs `success` branching.

## 5. Page-by-page below-hero findings

- **Homepage / country landing** (`app/(site)/[country]/[lang]/page.tsx`): marquee dark (breaks rhythm, §13); team section is inline JSX with copy-pasted forest gradient; StatsBand light cards invisible; 4 dark bands total, zebra fatigue.
- **Doctors listing**: composition OK; verify `RichBodySection` typography matches `.gh-article-body`.
- **Service detail** (`services/[serviceSlug]/page.tsx:496–517`): "About service" is a raw CMS dump with no surface treatment — weakest section on page. Closing CTA hand-rolls `gh2-hero` instead of `FinalCTA`.
- **Book** (`book/page.tsx`): plain white cards everywhere; stepper has no rail; picker chips flat; trust list undesigned; brand disappears.
- **Cart**: white `gh-card` rows + flat summary aside; premium dark-glass exists only in `MobileOrderTotalBar` — tone mismatch.
- **Checkout**: one long flat card; duplicated trust messaging in two styles; summary aside flat; cancelled page thin; processing state reads as broken.
- **Pricing**: second competing "how it works" language (gradient circles vs ghost numerals).
- **Blog article**: bare content dump after hero; acceptable, light polish only.
- **Contact**: aside info column visually thin after lush hero; emergency box OK.
- **FAQ**: closing CTA is bespoke re-implementation of FinalCTA.
- **Privacy/Terms**: acceptable; add ghost-numeral section markers (cheap consistency).
- **Auth** (`GH2AuthShell`): already the best-executed brand surface. Minor polish only.

## 6. Mobile-first findings

- `ServicesGrid.tsx:95` header row missing `flex-wrap` (sibling `DoctorsSection.tsx:127` has it). Fix.
- `.gh-home-hero-title` clamp floor too big at 320px (§3 exception). Fix.
- Sticky bars, safe-area insets, 44px floors already solid — preserve.
- Booking date-pill scroller (`-mx-1 overflow-x-auto`) has no scroll affordance → add right-edge fade mask (`.gh2-scroll-fade`).
- Booking details submit is below 4 fieldsets with no sticky affordance — acceptable for now; do NOT add a new sticky bar (risk of logic entanglement); instead tighten fieldset rhythm.
- Cart line-item bottom rows shift shape per item kind — align stepper/pill/remove into one consistent right-aligned cluster.

## 7. Visual design direction

Calm clinical luxury. Ivory planes carry reading; dark forest bands carry conviction; glass carries product (cards). Lime is a signal, never a surface. Depth from layered translucency + soft shadow, never from glow. Every section below a hero sits on an explicit surface class (ivory / forest / soft), no inline background ternaries.

## 8. Ivory / dark theme rules

- **Ivory** (`.gh2-section-ivory`): long text, legal/blog, forms, trust sections, alternating rhythm. Warm (`#FAFAF5`-family via existing `--color-background-soft`), with an optional faint radial warmth top-left. Never flat pure-white blocks with 1px gray borders.
- **Dark forest** (`.gh2-section-forest`): tokenizes the copy-pasted `linear-gradient(178deg,#12342A,#0F2E25)`. Use for: service discovery, team band, FinalCTA, footer. Max 2 non-hero dark bands per page, never two adjacent dark sections.
- Rhythm target homepage: Hero(dark) → Marquee(**light**) → RichBody(ivory) → TrustRibbon(ivory) → ServiceCatalog(forest) → StatsBand(ivory) → Team(forest) → Verified(ivory) → HowItWorks(ivory) → FinalCTA(forest).

## 9. Forest-green glassmorphic card system (globals.css additions)

Add near existing glass block (~L1480). All new, additive:

```css
/* Canonical forest glass card — alias-consolidation of gh2-glass-deep */
.gh2-glass-forest {
  background: linear-gradient(168deg, rgba(16, 52, 40, 0.78), rgba(9, 38, 29, 0.86));
  border: 1px solid rgba(176, 241, 34, 0.14);
  border-radius: var(--radius-card);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),   /* soft inner top highlight */
    0 18px 40px -18px rgba(4, 24, 18, 0.55);   /* calm premium shadow */
}
/* Premium ivory card — replaces flat bg-white cards on light sections */
.gh2-card-ivory {
  background: linear-gradient(172deg, #ffffff 0%, #fbfcf8 100%);
  border: 1px solid rgba(29, 75, 54, 0.10);
  border-radius: var(--radius-card);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 1px 2px rgba(16, 44, 34, 0.05),
    0 12px 32px -16px rgba(16, 44, 34, 0.14);
}
.gh2-card-hover { transition: transform .25s var(--ease-out, ease), box-shadow .25s, border-color .25s; }
.gh2-card-hover:hover { transform: translateY(-3px); border-color: rgba(29, 75, 54, 0.22);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 2px 4px rgba(16,44,34,.06), 0 20px 44px -18px rgba(16,44,34,.20); }
@media (prefers-reduced-motion: reduce) { .gh2-card-hover, .gh2-card-hover:hover { transform: none; } }
/* Section surfaces */
.gh2-section-forest { background: linear-gradient(178deg, #12342A 0%, #0F2E25 100%); }
.gh2-section-ivory  { background: var(--color-background-soft); }
.gh2-section-soft   { background: var(--color-background); }
/* Meta chip (light + dark) */
.gh2-meta-chip { display:inline-flex; align-items:center; gap:.4rem; padding:.3rem .65rem; border-radius:999px;
  font-size:12px; font-weight:600; background: rgba(29,75,54,.06); border:1px solid rgba(29,75,54,.10); color: var(--color-text-primary); }
.gh2-meta-chip-dark { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.14); color: rgba(255,255,255,.88); }
/* Trust tile */
.gh2-trust-tile { display:flex; gap:.75rem; align-items:flex-start; padding: .9rem 1rem; border-radius: 14px;
  background: rgba(29,75,54,.045); border: 1px solid rgba(29,75,54,.08); }
/* Status card (calm neutral empty state — not amber) */
.gh2-status-card { border: 1.5px dashed rgba(29,75,54,.22); border-radius: var(--radius-card);
  background: rgba(29,75,54,.03); padding: clamp(1.25rem, 3vw, 2rem); }
/* Scroll fade for horizontal chip rows */
.gh2-scroll-fade { -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 calc(100% - 40px), transparent 100%);
  mask-image: linear-gradient(90deg, #000 0%, #000 calc(100% - 40px), transparent 100%); }
/* Selected-state strengthening (booking) */
.gh2-selectable[data-selected="true"], .gh2-selectable[aria-pressed="true"] {
  border-color: var(--color-brand-primary); background: var(--color-brand-primary); color: #fff;
  box-shadow: 0 10px 24px -12px rgba(29,75,54,.45); }
/* Readable muted-on-dark token */
:root { --gh2-on-dark-muted: rgba(255,255,255,0.72); --gh2-on-dark-faint: rgba(255,255,255,0.60); }
```

**Lime glow reduction** (edit in place, verify no portal usage first): every `box-shadow` containing `rgba(176, 241, 34, …)` with alpha ≥ 0.22 drops to ≤ 0.14 and blur radius halves (`gh2-btn-lime`, `gh2-card` hover bloom, ServiceCard/CartServiceCard inline shadows, FeaturedDoctor ribbon). Kill the perpetual `.gh-accent-glow` pulse animation (keep class, make static text-shadow: none) — grep portal usage first.

## 10. Doctor card redesign spec (`frontend/components/cards/DoctorCard.tsx`)

Keep structure (photo/initials, flag+role badges, name h3, metadata rows, CTA footer, dual CTA layouts, `dark` prop). Change:

- **Light variant**: replace `bg-white` + hard border/shadow with `gh2-card-ivory gh2-card-hover`. Keep `focus-within` ring.
- **Dark variant**: swap `gh2-glass gh2-glass-hover` → `gh2-glass-forest gh2-glass-hover` (deeper, greener, inner highlight).
- **Metadata rows**: convert registration/credential/language rows to use `gh2-meta-chip` (`-dark` when `dark`) or keep row layout but give `IconBox` a visible tint: `background: rgba(29,75,54,.08); border:1px solid rgba(29,75,54,.10)` (light) / `rgba(255,255,255,.08)` (dark).
- **Photo area**: add a subtle bottom gradient scrim on photos for badge legibility (already partial); initials tile gets forest gradient + inner highlight.
- **CTA footer**: primary keeps current recipe but lime glow per §9 reduction; secondary = `gh2-btn-compact-secondary`/outline. Both `min-h-[44px]` (already).
- **Hover**: light = ivory-hover lift; dark = glass-hover. No new glow.
- Do not add selected/unavailable states here (booking links away); that lives in §12.

## 11. Service card redesign spec (`frontend/components/cards/ServiceCard.tsx`, `ServiceCatalog.tsx` ServiceTile, `CartServiceCard.tsx`)

- **ServiceCard light variant**: `gh2-card-ivory gh2-card-hover`; price/duration as `gh2-meta-chip`; CTA footer keeps two-action layout, primary = forest fill (`gh-btn-primary` recipe or `gh2-btn-compact-primary`), lime reserved for the dark variant's single Book pill.
- **ServiceCard dark variant**: body `gh2-glass-forest`; price chip stays lime but drop its glow shadow to ≤0.14 alpha; duration chip → `gh2-meta-chip-dark`.
- **ServiceTile (ServiceCatalog.tsx:330–642)**: delete inline `GLASS_CARD_STYLE` const; use `gh2-glass-forest` class. Hover: keep lift+zoom, replace lime border bloom `rgba(176,241,34,0.35)` → `rgba(176,241,34,0.18)`. Tag-pill full-lime hover → lime text/border tint only (no full fill). Filter pills: keep `gh2-pill-filter`, active state → forest fill + white text (align with DoctorFilters), lime only as a 6px dot inside the active pill.
- **CartServiceCard**: same glass + glow reduction; keep `soldOut` pattern intact (it's the reference disabled state).
- **BlogCard**: port `gh-card gh-card-hover` → `gh2-card-ivory gh2-card-hover` (blog is light-only). Keep layout.
- **FeaturedDoctor**: light branch → `gh2-card-ivory`; dark branch `gh-glass-card` → `gh2-glass-forest`; ribbon badge keeps lime fill but glow-shadow reduced.

## 12. Booking / card selected-state spec

Files: `book/page.tsx`, `_components/service-time-picker.tsx`, `_components/slot-picker-step.tsx`, `SameDayBooking.tsx`. Visual only.

- `.gh2-selectable` selected state: apply §9 strengthened rule; components should set `data-selected` (most already conditionally style — normalize to the class contract where trivially safe; otherwise keep inline conditional but match the same visual: forest fill, white text, soft forest shadow, NO lime fill).
- Unselected chips: raise resting contrast — border `rgba(29,75,54,.18)`, background white (not background-soft) so chips read as controls.
- Date-pill scroller: add `gh2-scroll-fade` to the overflow container.
- Time-slot buttons: keep grid; add subtle price-tier tint only if `pricingType` is already passed to the component (render-only; do not add data plumbing).
- Step sidebar (`page.tsx:813–869`): add a vertical rail — container `relative` with an absolutely-positioned 1px line through the dots; active dot ring; remove the `after:` underline hack so the dot rail is the single "you are here" signal.
- Booking cards (sidebar card, selected-service header cards, form fieldsets): `bg-white` → `gh2-card-ivory`. Trust list rows → `gh2-trust-tile`.
- Empty/no-slot states: amber boxes → `gh2-status-card` (calm neutral dashed, matching cart empty state); keep amber only for genuine warnings (hold expiry).
- `SameDayBooking`: `text-white/40` → `text-white/70` (or `--gh2-on-dark-muted`); inactive slot labels `/50` → `/70`.

## 13. Section rhythm spec

- **CountryMarquee**: inline `background:"#0F2E25"` → light strip: `background: var(--color-background-soft)`, text `var(--color-text-muted)`, hairline top/bottom borders `rgba(29,75,54,.10)`. This restores dark→light after hero.
- **Homepage team band** (`page.tsx:447–541`): replace inline gradient with `gh2-section-forest` class (no extraction required; class swap + tidy).
- **ServiceCatalog** section bg: inline gradient → `gh2-section-forest`.
- **StatsBand light cards** (`StatsBand.tsx:86–122`): give cards `gh2-card-ivory` (visible surface) — resolves invisible-card issue.
- **TrustRibbon light path**: tiles → `gh2-trust-tile`; section uses `gh2-section-ivory`.
- **Service detail "About service"** (`services/[serviceSlug]/page.tsx:496–517`): wrap body in a `gh2-card-ivory` prose panel, max-w-prose, `.gh-article-body` typography; add eyebrow + hairline.
- Replace inline light-section background ternaries with `gh2-section-ivory` where mechanical (TrustRibbon, StatsBand, DoctorsSection, HowItWorksNarrative) — keep the `theme` prop APIs unchanged.

## 14. CTA hierarchy spec

- One primary per section. Dark sections: primary = `gh2-btn-lime` (glow reduced), secondary = `gh2-btn-ghost`. Light sections: primary = forest solid (`gh-btn-primary`), secondary = `gh2-btn-outline`. Compact card CTAs: `gh2-btn-compact-*`.
- Do NOT unify the legacy `gh-btn-*` family this pass (portal risk); only fix public components that mix families within one section.
- FAQ closing CTA + service-detail closing CTA: restyle to match `FinalCTA` visual recipe (dark forest band, one lime primary, one ghost secondary) — do not force component substitution if props differ; visual parity is the requirement.

## 15. Public form / status spec

- `ContactForm.tsx`: error banner add `role="alert"`; success container add `role="status"`; field errors get `id` + `aria-describedby` wiring. Form panel → `gh2-card-ivory`. Contact aside rows → `gh2-trust-tile`.
- Checkout form: introduce visual grouping — each logical group (`payer contact`, `consultations`, `shipping`) becomes a bordered sub-panel (`rounded-xl border border-[rgba(29,75,54,.10)] bg-white p-5` or fieldset like booking) instead of `border-t` runs.
- Newsletter form: ensure input+button ≥44px, focus-visible on dark footer, no change to submit logic.
- Status messages sitewide: success=`gh-status-success`, error=`gh-status-error` + `role="alert"` where user-triggered.

## 16. Header / mobile nav polish spec

- `SiteHeader.tsx:282` section-tabs `<div>` → `<nav aria-label="Sections">`.
- Header scroll transition: gate inline transition behind `motion-reduce:transition-none`.
- `CountrySwitcher`/`LanguageSwitcher`: add Escape-to-close + focus-return-to-trigger; either implement Arrow roving focus or drop `role="menu"`/`menuitem` to plain listbox/disclosure semantics (choose the smaller diff: drop the roles, keep buttons).
- `MobileNav`: no structural change (Radix handles focus); verify tap targets stay ≥44px.

## 17. Cart / checkout visual UX spec

Visual only; preserve every logic surface named in §4.

- **Cart summary aside** (`cart/page.tsx:312–393`): white `gh-card` → `gh2-glass-forest` dark glass panel (ivory text, totals in white, lime only on the final total figure or CTA). This matches `MobileOrderTotalBar`'s established premium treatment and anchors the page. Keep `id="cart-order-summary"`.
- **Checkout summary aside**: same treatment. Keep `id="checkout-order-summary"`. Trust footer band: merge the two trust-message styles into one consolidated trust strip inside the dark summary (Shield + Lock rows, `--gh2-on-dark-muted`).
- **Cart item rows**: stay light but `gh2-card-ivory`; align bottom-row cluster (stepper/pill/remove) right-consistent; countdown chip: amber normal, switch to error tokens under 60s (visual class swap only off existing countdown value).
- **Checkout status pages**: cancelled page gets reassurance line ("your cart is saved" — copy exists? if not, use i18n-safe neutral phrasing via existing translation util or plain text consistent with page locale handling; if translation infra required, keep English fallback consistent with file's current pattern). Processing state: add an indeterminate progress bar under the spinner (CSS only).
- Empty cart state: already the benchmark — leave.

## 18. Auth public shell polish spec

`GH2AuthShell` (GH2PagePrimitives.tsx:250–421) is already strong. Only: right-panel card → ensure `gh2-card-ivory` surface (if currently flat white), form status messages get `role="alert"`/`role="status"`, inputs ≥44px, left glass panel swap `gh-glass-*` → `gh2-glass-forest` only if visually identical-or-better (else leave).

## 19. File-by-file implementation plan

| # | File | Change | Spec |
|---|------|--------|------|
| 1 | `frontend/app/globals.css` | Add §9 primitives; lime glow reduction; hero-title clamp; on-dark muted tokens | §3,§9 |
| 2 | `frontend/components/sections/CountryMarquee.tsx` | dark→light strip | §13 |
| 3 | `frontend/components/cards/DoctorCard.tsx` | ivory/forest variants, chips, glow cut | §10 |
| 4 | `frontend/components/cards/ServiceCard.tsx` | ivory/forest variants, chips, glow cut | §11 |
| 5 | `frontend/components/cards/CartServiceCard.tsx` | glass-forest, glow cut | §11 |
| 6 | `frontend/components/cards/BlogCard.tsx` | → gh2-card-ivory | §11 |
| 7 | `frontend/components/sections/ServiceCatalog.tsx` | section-forest, tile glass class, hover/filter lime dosage | §11,§13 |
| 8 | `frontend/components/sections/FeaturedDoctor.tsx` | ivory/forest surfaces, glow cut | §11 |
| 9 | `frontend/components/sections/StatsBand.tsx` | visible ivory stat cards | §13 |
| 10 | `frontend/components/sections/TrustRibbon.tsx` | trust tiles, ivory section | §13 |
| 11 | `frontend/components/sections/DoctorsSection.tsx` / `DoctorCarousel.tsx` | pager focus classes, counter aria-live, contrast, lime dosage on filters | §14,§21 |
| 12 | `frontend/components/sections/FAQSection.tsx` + `faq/page.tsx` closing CTA | polish accordion surface; CTA parity with FinalCTA | §14 |
| 13 | `frontend/components/sections/SameDayBooking.tsx` | contrast /40→/70, selected chips | §12 |
| 14 | `frontend/components/sections/ServicesGrid.tsx` | header `flex-wrap` | §6 |
| 15 | `frontend/app/(site)/[country]/[lang]/page.tsx` | team band → gh2-section-forest | §13 |
| 16 | `frontend/app/(site)/[country]/[lang]/services/[serviceSlug]/page.tsx` | About panel, closing CTA parity | §13,§14 |
| 17 | `frontend/app/(site)/[country]/[lang]/book/page.tsx` | step rail, ivory cards, trust tiles, status cards | §12 |
| 18 | `frontend/app/(site)/[country]/[lang]/book/_components/service-time-picker.tsx` + `slot-picker-step.tsx` | chip contrast, selected states, scroll fade, neutral empty states | §12 |
| 19 | `frontend/app/(site)/[country]/[lang]/cart/page.tsx` | dark-glass summary, ivory item rows, countdown escalation | §17 |
| 20 | `frontend/app/(site)/[country]/[lang]/checkout/page.tsx` | grouped form panels, dark-glass summary, trust strip | §17 |
| 21 | `frontend/app/(site)/[country]/[lang]/checkout/success|cancelled` + `GH2PagePrimitives.tsx` | processing bar, cancelled reassurance, auth shell polish | §17,§18 |
| 22 | `frontend/components/forms/ContactForm.tsx` + `contact/page.tsx` | a11y roles, ivory panel, trust tiles | §15 |
| 23 | `frontend/app/(site)/layout.tsx` | wrap children in `<main>` (verify no double-main with page-level mains first) | §21 |
| 24 | `frontend/components/layout/SiteHeader.tsx` | nav landmark, motion-reduce | §16 |
| 25 | `frontend/components/layout/SiteFooter.tsx` + `ui/footer-column.tsx` | text /40–/50 → /65–/70 | §21 |
| 26 | `frontend/components/layout/CountrySwitcher.tsx` / `LanguageSwitcher.tsx` | Escape+focus-return, role cleanup | §16 |

## 20. Risk classification

- **Low**: CSS additions, contrast bumps, class swaps on presentational wrappers, marquee bg, StatsBand, TrustRibbon, BlogCard, footer text.
- **Medium**: DoctorCard/ServiceCard variant changes (many call sites — keep prop APIs identical), ServiceCatalog tile refactor, booking chip styling (must not alter click handlers), `<main>` wrapper (check for nested `<main>` in pages), switcher keyboard handlers (behavioral JS — keep minimal).
- **High (extra care)**: cart/checkout summary re-skin — DOM ids, bound values, and `dl` order must survive byte-identical in data terms; ConsultationBookingForm fieldsets — style-only edits.

## 21. Verification checklist

1. `pnpm --filter frontend typecheck` clean.
2. `pnpm --filter frontend lint` clean (no new warnings).
3. `pnpm --filter frontend build` succeeds.
4. Grep: no remaining `rgba(176, 241, 34, 0.2` / `0.3` box-shadows in public components; no `text-white/40`/`/50` body text on dark public surfaces; `GLASS_CARD_STYLE` const gone.
5. Viewports 320/360/390/430/768/1024/1280/1440/1920: no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`), cards stack, CTAs ≥44px.
6. Booking selected chip visually distinct at rest/hover/selected; empty states neutral not amber.
7. Cart/checkout: summary ids intact, totals render, mobile bar still hides when summary in view.
8. Portal smoke: `/account`, `/doctor`, `/admin` visually unchanged (spot-check via grep that no edited class is portal-shared).
9. `<main>` present once per page; ContactForm announces status.

## 22. Exact Sonnet 5 execution order

- **Step 0 (sequential, first)**: Agent CSS — file #1 (globals.css). Everything depends on it.
- **Step 1 (parallel, after Step 0)**:
  - Agent A "Cards": files #3, #4, #5, #6, #7, #8 (§10, §11).
  - Agent B "Sections & rhythm": files #2, #9, #10, #11, #12, #13, #14, #15, #16 (§12–§14).
  - Agent C "Booking": files #17, #18 (§12).
  - Agent D "Cart/Checkout/Status/Auth": files #19, #20, #21 (§17, §18).
  - Agent E "A11y & chrome": files #22–#26 (§15, §16, §21).
- **Step 2 (sequential)**: validation agent runs §21 items 1–4; main thread fixes fallout; viewport checks.

No two agents share a file. Agents must not edit globals.css in Step 1 (report missing classes back instead).
