# Website UI Audit — Public Site

Audit date: 2026-07-11 · Branch: Dev-hassaan · Audit scope: Website (Audit 1 of 2)
Companions: [`WEBSITE_SECTION_INVENTORY.md`](./website-section-inventory.md), [`WEBSITE_OVERLAY_STACKING_INVENTORY.md`](./website-overlay-stacking-inventory.md), shared docs in `../shared/`.

## Executive summary

The public site is in **good structural shape** — far better than typical: fluid clamp() type tokens (DESIGN.md-compliant), correct `min-w-0`/`minmax(0,1fr)` usage in cart/checkout/booking, a portalled Radix mobile nav, model-quality country entry gate, comprehensive reduced-motion handling, working skip link and landmarks. The defects cluster in exactly two mechanisms:

1. **Non-portalled custom dropdowns** (2 confirmed failures, 2 latent): the SameDayBooking language listbox is clipped by its own card's `overflow-hidden` (W-01), and DoctorFilters panels can exit the viewport with no collision handling and no outside-click close (W-02). CountrySwitcher/LanguageSwitcher share the same fragile pattern but are currently safe.
2. **`whitespace-nowrap` + fixed ch/em caps on translatable text** across a 6-locale product (header CTA, nav pills, pricing card reserves, hero 13ch cap, ServiceCatalog CTAs).

No page-level horizontal overflow mechanism was found on public routes. No `z-[9999]`-style arbitrary values exist; layering is small ad-hoc steps needing only token mapping.

## Scope & repository areas inspected

- `frontend/app/(site)/**` (global + [country]/[lang] routes — all 40 public page.tsx files or their shared templates)
- `frontend/app/(auth)/(public)/**` (6 auth routes)
- `frontend/components/layout/**`, `frontend/components/sections/**`, `frontend/components/cart/**`, `frontend/components/compliance/**`
- `frontend/app/globals.css`
- Not inspectable: Doctify third-party iframe internals. Card internals (`DoctorCard`, `ServiceCard`) audited via their containers only.

## Root causes (systemic)

| # | Root cause | Category | Evidence |
|---|-----------|----------|----------|
| R1 | Custom overlay pattern: `useState` + `absolute` + manual outside-click, no portal, no collision handling — reimplemented 4× | Stacking context / z-axis failure, Portal mounting failure | CountrySwitcher.tsx:114, LanguageSwitcher.tsx:109, SameDayBooking.tsx:300, DoctorFilters.tsx:78 |
| R2 | `overflow-hidden` on glass cards that contain overlay triggers | Clipping (overflow ancestor) | SameDayBooking.tsx:277 |
| R3 | `whitespace-nowrap`/fixed ch caps on locale-variable text | Long-content failure, Typography | SiteHeader.tsx:252, SectionNav.tsx:31, StickyBookingCTA.tsx:30, HomeHero.tsx:175, ServiceCatalog.tsx:303-309, PricingPlanCard.tsx:123-153 |
| R4 | Single 1280px header cliff — no intermediate tablet nav | Inconsistent breakpoint | SiteHeader.tsx:222,228 |
| R5 | Ad-hoc z steps without shared scale (z-20/30/40/50 role collisions) | Stacking context / z-axis failure | see overlay inventory |

## Global issues

- **G1 (High) — SameDayBooking listbox clipped.** File WO-05. Homepage conversion widget. Mechanism static-confirmed: `absolute` listbox (max-h 240px) inside `overflow-hidden` card; CSS clips positioned descendants regardless of z-index. Category: Clipping (overflow ancestor). Fix: portal via shared AppMenu, or scope overflow. Risk: Low (isolated component). Pattern: n/a (widget).
- **G2 (High) — DoctorFilters panels overflow viewport + no dismiss.** WO-06/WS-04. `globals.css:3111` `position:absolute; left:0; z-index:20`, native `<details>` without `name` grouping or outside-click. Categories: Horizontal overflow, Stacking context, Accessibility. Fix: AppMenu at `--z-dropdown`. Risk: Medium (used on directory pages).
- **G3 (Medium) — Locale-length fragility** (R3 list). Category: Long-content failure. Fix: drop nowrap on CTAs/pills, line-clamp pricing reserves, align HomeHero max-w with fit function. Risk: Low each.
- **G4 (Medium) — Header 768–1279px dead zone.** All nav collapses to drawer at once. Category: Inconsistent breakpoint. Fix: introduce `lg` intermediate (nav pills w/o switchers) — design approval needed. Risk: Medium (brand surface).
- **G5 (Medium, latent) — switcher dropdowns not portalled** (WO-03/04). Fix with AppMenu migration. 
- **G6 (Low) — StickyBookingCTA substring route matching** (`pathname.includes`, :12,22) can false-hide. Fix: segment match.
- **G7 (Medium, i18n content) — VerifiedProfessionals EN/PT hardcoded copy** (:20-65) silently English on es/cs/ro. Category: Website/portal inconsistency (i18n system bypass).
- **G8 (Medium, a11y) — 9px text** on public booking strips (service-time-picker.tsx:185,189; slot-picker-step.tsx:188,192). Category: Typography/Zoom failure. Below all documented floors.
- **G9 (Low, a11y) — dual `<h1>`**: brazil/consent/page.tsx:85,100 (likely simultaneous), corporate-invite, reviews/rate. Category: Accessibility.

## Route-by-route findings

Only routes with defects get full format; clean routes are recorded in the section inventory.

### Route: /{country}/{lang} (homepage)

**Audit Scope**: Website
**Files**: `frontend/components/sections/SameDayBooking.tsx`, `HomeHero.tsx`, `frontend/app/(site)/[country]/[lang]/page.tsx`
**Current structure**: PageHero/HomeHero + SameDayBooking quick-book card (language→time→continue) + trust/marquee/catalog sections.
**Reproduction**: Width: any (≤480px most likely). Zoom: any. Data: country with enough languages that open listbox extends past card bottom. Interaction: open language dropdown. Exact failure: listbox visually cut at card edge (mechanism static-confirmed; visual repro pending — Unverified runtime).
**Root cause**: non-portalled `absolute` listbox inside `.gh-sameday … overflow-hidden` (SameDayBooking.tsx:277,300-344). Clipping ancestor = the card itself.
**Essential information (P1/P2)**: language choice, available time slots, continue CTA.
**Secondary (P3/P4)**: none.
**Recommended pattern**: n/a (widget) — overlay fix.
**Drawer recommendation**: none.
**Container fixes**: remove `overflow-hidden` from card root or move it to a decorative-only child.
**Layering fixes**: listbox → AppMenu (Radix, portalled) at `--z-dropdown`.
**Typography fixes**: HomeHero `max-w-[13ch]` (:175) → derive from `fitHeadingFontSize` idealChars.
**Accessibility**: Radix migration adds Escape/outside-click/focus management the manual listbox partially reimplements.
**Consistency notes**: 4th duplicate of the hand-rolled dropdown pattern — dissolve into AppMenu.
**Files likely to change**: SameDayBooking.tsx; new shared AppMenu.
**Risk**: Medium (primary conversion widget — verify booking flow end-to-end after).
**Acceptance criteria**: listbox fully visible at 320–1920px & 200% zoom; outside-click + Escape close; keyboard operable; booking flow completes.

### Route: /{country}/{lang}/doctors (+ directory embeds)

**Audit Scope**: Website
**Files**: `frontend/components/sections/DoctorFilters.tsx`, `DoctorsDirectoryClient.tsx`, `frontend/app/globals.css:3111-3119`
**Current structure**: filter chip row (`flex flex-wrap`, wrapper `relative z-30`) with native `<details>` panels; card grid below.
**Reproduction**: Width 640–1024px. Data: enough filter groups that chips wrap. Interaction: open a right-positioned chip's panel. Failure: panel (`left:0` of trigger, max-w min(360px,90vw)) extends past viewport right; second panel opens without closing first; tap-outside does not close. Unverified runtime (mechanism confirmed).
**Root cause**: `.gh2-filter-panel` absolute non-portalled, no collision logic; `<details>` has no dismiss wiring or `name` grouping.
**Essential info (P1/P2)**: active filter values, result count.
**Recommended pattern**: filters = ResponsiveFilterBar behavior (chips + AppMenu panels; mobile filter sheet).
**Drawer recommendation**: mobile filter AppSheet (additive; `<details>` markup remains until migrated; revert = swap component back).
**Container fixes**: none needed beyond overlay migration.
**Layering fixes**: panel → portal at `--z-dropdown`; retire z-20/z-30 pair.
**Typography fixes**: none.
**Accessibility**: Radix gives listbox/menu semantics; keep visible focus (`.gh2-filter-trigger:focus-visible` exists, globals.css:3082-3086).
**Consistency notes**: replaces one of the 4 dropdown duplicates.
**Files likely to change**: DoctorFilters.tsx, globals.css (panel rules), directory clients.
**Risk**: Medium.
**Acceptance criteria**: panel bounding box inside viewport at all matrix widths; single-open behavior; Escape/outside-click close; filters still drive `useSearchParams` state identically.

### Route: all public (header)

**Audit Scope**: Website · **Files**: SiteHeader.tsx, HeaderScrollShell.tsx, CountrySwitcher.tsx, LanguageSwitcher.tsx, MobileNav.tsx
**Findings**: G4 breakpoint cliff (Medium); G5 latent portal risk; R3 nowrap CTA. No active failure.
**Recommended change**: intermediate `lg` header layout (design approval); switchers → AppMenu; CTA wrap-allow. Risk: Medium (brand surface). Acceptance: no nav dead zone 768–1279px; dropdowns portalled; CTA intact in longest locale.

### Route: /{country}/{lang}/pricing

**Audit Scope**: Website · **Files**: PricingPlanCard.tsx:123-153
**Failure (i18n, static)**: `minHeight:2.4em/2.8em` reserves with no ceiling — long translations grow one card, desyncing the cross-card price/CTA alignment the component's own comment (:28-32) promises. **Fix**: `line-clamp-2` + `title`, or grid-row alignment across cards. Pattern: n/a. Risk: Low. Acceptance: alignment holds with 2× length strings in all 6 locales.

### Auth routes /(auth)/(public)/*

Solid (GH2AuthShell responsive split, forms stack correctly). Only finding: heading hierarchy (G9) + verify focus rings on dark aside variant. Risk: Low.

## Zoom-related findings

None of the shrink-to-fit anti-patterns exist (no zoom detection, no scale transforms — typography census G). Fluid clamp() tokens reflow. 200%-zoom matrix run is pending (Phase 0) — the two overlay defects above are the items most likely to worsen at zoom (smaller effective viewport). Status: Unverified (runtime).

## Clipping & stacking findings

See `WEBSITE_OVERLAY_STACKING_INVENTORY.md` — 15 entries, 2 confirmed failure mechanisms (WO-05, WO-06), 3 latent (WO-03/04/07), rest verified safe. Every failure has a named clipping ancestor or positioning root cause; none is "z-index too low".

## Accessibility findings (website slice)

- Focus system strong globally (globals.css:302 + component rules); dark-section CTAs hand-roll ring colors instead of `gh-focus-on-dark` (inconsistent, verify visibility — Unverified runtime).
- Native `<details>` filter panels lack Escape/outside-click (G2).
- 9px badges (G8); dual `<h1>` pages (G9).
- Touch: public buttons generally ≥44px; `size-7` hero/carousel controls (DoctorsHero.tsx:344,360, PageHero.tsx:283, ServiceHero.tsx:377) below 44px — enlarge hit area on `pointer:coarse`.
- Reduced motion: comprehensive (globals.css:3286-3290 + targeted rules + RevealOnScroll JS bail). No action.
- Skip link + landmarks wired (SiteChrome.tsx:62-77).

## Severity register

| Severity | IDs |
|---|---|
| Critical | none |
| High | G1 (WO-05), G2 (WO-06) |
| Medium | G3, G4, G5, G7, G8, WS-08, WS-10 |
| Low | G6, G9, WS-21, WS-23, remaining inventory Lows |

## Dependencies & risk

Both High items depend on the shared AppMenu primitive (Phase 1/2 of `../shared/responsive-implementation-plan.md`); G1 can also ship standalone as an overflow-scope fix (smaller, earlier). i18n text fixes are independent, low-risk, immediately shippable.

## Verification

Static-only audit. Runtime matrix (18 widths × key routes × 125–200% zoom), screenshot baseline, and the overlay-visibility assertions are defined in the implementation plan Phase 0 and the overlay inventory's verification steps. No screenshot or zoom test has been performed yet — no such claim is made anywhere in this audit.
