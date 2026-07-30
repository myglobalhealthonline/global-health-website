# Public Website UI/UX Review — Global Health

**Date:** 2026-07-04
**Type:** Review only — no code was changed as part of this document.
**Scope:** Public website (`frontend/app/(site)/**` + public layout/section/card/form components + public auth surface). Portals (admin / doctor / patient account) are out of scope.
**Method:** Six parallel read-only code review passes (layout & tokens, homepage & sections & CTAs, cards & listing/detail pages, forms & auth, booking/cart/checkout/pricing, content pages & accessibility/responsive), consolidated and re-classified against the severity framework below. Line numbers are as read on branch `Dev-hassaan` on 2026-07-04 and may drift with future commits.

Severity framework used throughout:

- **S0** — minor local polish (one route / one local component)
- **S1** — repeated public pattern issue
- **S2** — shared public component issue
- **S3** — global public website system issue
- **S4** — booking / checkout / conversion-critical issue

---

## 1. Executive Summary

The public website has a strong, recognizable visual direction: dark forest (`#0F2E25` / `#031F18`) hero and CTA sections, lime accent (`#B0F122`), the `gh2-*` CTA pair, medical-pattern textures, watermarks, and a genuinely well-built token system in `globals.css` (`--radius-card`, `--shadow-card`, `--space-section`, semantic status colors, a good global `:focus-visible` dual-ring). Decorative motifs (dot grids, plus signs, blooms, tint overlays) are consistent and reusable. This is not a template site; the brand system is real.

The problem is **enforcement, not design**. The token system exists but is bypassed in most components:

1. **Three parallel CTA systems** coexist on the same pages — `gh2-btn-lime`/`gh2-btn-ghost` for page CTAs, inline-styled buttons inside DoctorCard/ServiceCard/CartServiceCard, and inline-styled filter pills — plus a legacy `.gh-btn-*` family that public pages barely use. Card CTAs and page CTAs have different weights, shadows, and hover math.
2. **Spacing token is nearly unused**: only 1 of 12 section components uses `.gh-section`; the rest hand-code `clamp(64px,8vw,120px)` or Tailwind `py-*` values that happen to match today and will silently drift tomorrow.
3. **Hardcoded colors leak everywhere** the tokens should be: header CTA text (`#0a1f14` ×4), notification ring (`#0e2c22`), card shadows (5 distinct hardcoded lime/forest shadows), form error colors (`text-red-700`, `rgba(255,180,180,0.9)`), login icons (`#9BB0A4`).
4. **Accessibility has a handful of genuine failures**: missing `<h1>` on ~11 content pages, FAQ answer text at `rgba(255,255,255,0.52)` on dark (below WCAG AA), `focus-visible:outline-none` on the mobile Book CTA without replacement fallback, 36px tap targets in the header, and inconsistent focus-ring overrides that fight the good global style.
5. **Conversion flows are visually solid but mobile-fragile**: slot/date selected states are hard to distinguish, the cart's 10-minute hold countdown is easy to miss on 320px, and the checkout order total scrolls out of view on mobile while the payer form is being filled.

The highest-impact work, in order: fix the conversion-flow selected states and mobile checkout summary (S4), fix the accessibility failures (S3/S2), then consolidate the CTA/card/form systems into enforced shared classes so the drift stops recurring (S3/S2).

---

## 2. Scope Reviewed

### Routes reviewed (public only)

- `/` and `frontend/app/(site)/layout.tsx`
- Country homes: `/[country]/[lang]` (HomeHero / SameDayBooking stack)
- `/[country]/[lang]/services`, `/services/[serviceSlug]` (+ `_components`)
- `/[country]/[lang]/doctors`, `/doctors/[doctorSlug]`
- `/[country]/[lang]/tests`, `/tests/[testSlug]`, `/health/[slug]`, `/prescriptions`, `/general-consultation`, `/specialist-consultation`
- `/[country]/[lang]/book` (+ `_components`: service picker, service-time-picker, details step, step indicator)
- `/[country]/[lang]/consult/[serviceSlug]` (+ `_components`: slot-picker-step, consultation-booking-form)
- `/cart`, `/[country]/[lang]/cart`
- `/checkout`, `/[country]/[lang]/checkout` (+ `success`, `cancelled`)
- `/[country]/[lang]/pricing` (+ `_components/PricingPlanCard`)
- `/blog`, `/blog/[slug]`
- `/about`, `/faq`, `/contact`, `/privacy`, `/terms`, `/reviews`, `/reviews/rate`, `/verify/certificate/[id]`, `/patient-upload`, `/brazil/consent`
- `/[country]/[lang]/legal`, `/legal/[type]`, `/legal/subscription-terms`
- Public auth surface: `frontend/app/(auth)/(public)/login`, `register`, `forgot-password` (reviewed as public access pages, not portal pages)

### Components reviewed

- Layout: `SiteChrome`, `SiteHeader`, `SiteFooter`, `MobileNav`, `Container`, `Section`, `Breadcrumbs`, `CountrySwitcher`, `LanguageSwitcher`, `SectionNav`, `ScrollToTop`, `NewsletterSignup`
- Sections: `HomeHero`, `PageHero`, `ServiceHero`, `DoctorsHero`, `SameDayBooking`, `HeroBookingWizard`, `CountryMarquee`, `TrustRibbon`, `CountryTrustBar`, `StatsBand`, `FeaturedDoctor`, `DoctorCarousel`, `DoctorsSection`, `DoctorFilters`, `HowItWorksNarrative`, `ServicesGrid`, `ServiceCatalog`, `FAQSection`, `FAQTabs`, `FinalCTA`, `StickyBookingCTA`, `LinkCallout`, `RichBodySection`, `MedicalDisclaimer`, `VerifiedProfessionals`, `GH2PagePrimitives`, `CountryEntryGate`, `ServiceContentSections`, `ServiceLinkedBody`
- Cards: `DoctorCard`, `ServiceCard`, `BlogCard`, `CartServiceCard`, `PricingPlanCard`
- Forms: `ContactForm`, `NewsletterSignup`, `phone-field`, booking/checkout forms, brazil consent, reviews/rate, patient-upload
- `frontend/app/globals.css` — public token layer and `gh-*` / `gh2-*` class families

### Intentionally excluded

- `/admin/**`, `/doctor/**`, `/account/**`, `portal-shell.tsx`, `portal-atoms.ts`, all portal atoms/shells/tables — **verified that public layout components do not import from portal files** (no contamination found).
- Backend logic, Stripe behavior, server actions, i18n routing, booking business logic — recommendations in this document are visual/UX only and must preserve all behavior.
- Runtime browser verification (contrast numbers below are computed from code, not measured on screen — flagged where verification is needed).

---

## 3. Overall Design Assessment

**Strengths**

- Coherent brand world: forest + lime + warm off-white, arch-framed imagery, watermarks, medical-pattern texture. The site does not look generic.
- Real token system in `globals.css`: semantic colors, radii (`--radius-card: 20px`, `--radius-tile: 16px`), shadows (`--shadow-card`, `--shadow-card-hover`, `--shadow-focus`), fluid spacing (`--space-section`), a strong global `:focus-visible` dual-ring (globals.css:219–228), and a working `.gh-skip-link`.
- Section header grammar (eyebrow → headline with inline lime accent → subheading) is consistent across 10 of 12 section components.
- Decorative layer (dot grid, plus signs, blooms, tints) is centralized and consistently applied.
- `.gh-input`/`.gh-select`/`.gh-textarea` form base is consistent where used (48px height, same border/radius/focus).
- Reduced-motion compliance is ~90% (marquee, live-dot, card transitions gated).

**Consistency gaps**

- Tokens are defined but not enforced — components hand-roll values that approximate tokens (spacing, shadows, radii, colors). Today it mostly looks right; any future token change will fracture the site.
- Card, CTA, and form-feedback systems each have 2–4 competing implementations.
- Five hero layouts with no documented selection logic.
- Dark sections dominate (~60%+ of homepage area) with several consecutive dark bands.
- Accessibility is inconsistent: excellent primitives (skip link, focus ring, reduced-motion) undermined by local overrides and missing `<h1>`s.

---

## 4. Severity Summary

| Severity | Meaning | Count | Main Examples |
|---|---|---:|---|
| S0 | Minor local polish | 9 | Contact textarea error linking, login icon hex, modal overlay token, step-indicator icon fit, list-inside on legal pages |
| S1 | Repeated public pattern issue | 13 | Watermark placement drift, card hover-lift split, `brightness-110` on lime hovers, mint/lime token naming, weak ghost-button hover, back-link contrast |
| S2 | Shared public component issue | 13 | DoctorCard 24px radius, FAQ answer contrast + focus, header tap targets, switcher dropdown overflow, newsletter input divergence, form error-pattern split, patient-upload file input |
| S3 | Global public website system issue | 6 | CTA system fragmentation, `.gh-section` unused, missing H1s, focus-visible overrides, dark-section rhythm, hardcoded color drift |
| S4 | Booking / checkout / conversion-critical issue | 11 | Slot/date selected-state weakness, cart hold countdown visibility, mobile checkout total out of view, wizard loading race, pricing badge conflict |

Total findings: **52** (some grouped under one heading where they share a root cause).

> Note: raw sub-review outputs occasionally used the severity scale loosely; every finding below has been re-classified against the framework in the header (S4 strictly = conversion-critical, S0 strictly = minor local).

---

## 5. Findings

### A. Global system (S3)

---

### Finding 1 — Three parallel CTA systems on the same pages

**Severity:** S3
**Area:** CTAs / Buttons (site-wide)
**Files or components involved:**
- `frontend/app/globals.css` (`.gh2-btn-lime` ~6740s, `.gh2-btn-ghost` ~6770s, legacy `.gh-btn*` 957–1045)
- `frontend/components/cards/ServiceCard.tsx:50–72`, `frontend/components/cards/DoctorCard.tsx` (dynamic inline button styles), `frontend/components/cards/CartServiceCard.tsx:195–206`
- `frontend/components/sections/DoctorCarousel.tsx:90–111`, `frontend/components/sections/ServiceCatalog.tsx:199–230` (filter pills)

**What I observed:**
Page-level CTAs use exactly two classes (`gh2-btn-lime` primary in 8 components, `gh2-btn-ghost` secondary in 5) — that part is clean. But card CTAs (ServiceCard "book"/outline, DoctorCard book/view-profile) rebuild button styles inline per component, and filter pills (DoctorCarousel, ServiceCatalog, DoctorFilters) implement a third lime/ghost system inline. A fourth legacy family (`.gh-btn-primary/-outline/-accent/-soft/-danger/-ghost-dark`, 52px min-height) exists in globals.css and is barely used by public pages.

**Why it matters:**
Same-priority actions look different depending on which component renders them; card CTAs are slightly heavier/lighter than page CTAs; every new surface reinvents button styling (the header switchers already did — see Finding 12). This is the single largest source of "stitched together" feel.

**Recommended future fix:**
Define one public button hierarchy (see §7) and extract missing variants as shared classes: `.gh2-btn-outline` / `.gh2-btn-outline-dark` (card secondary), `.gh2-pill-filter` / `.gh2-pill-filter--ghost` (filters), `.gh-btn-on-chrome` (header glass surfaces). Migrate card/pill inline styles to them. Decide the fate of the legacy `.gh-btn-*` family (deprecate or document).

**Routes to verify after implementation:**
- `/[country]/[lang]` (hero + catalog + carousel on one page)
- `/[country]/[lang]/doctors`, `/services`, `/tests`
- Header on all routes

**Risk notes:** Touches every card and filter surface; do it as class extraction with pixel-identical output first, then tune. No behavior change.

---

### Finding 2 — Section spacing token exists but only one component uses it

**Severity:** S3
**Area:** Layout rhythm (site-wide)
**Files or components involved:**
- `frontend/app/globals.css:361–364` (`.gh-section`, `.gh-section-tight`)
- `HomeHero.tsx:118`, `PageHero.tsx:321–324`, `ServiceHero.tsx:217`, `DoctorsHero.tsx`, `ServiceCatalog.tsx`, `StatsBand.tsx:36`, `FAQSection.tsx:19`, `TrustRibbon.tsx:58`, `HowItWorksNarrative.tsx`, `VerifiedProfessionals.tsx`, `FinalCTA.tsx:45`

**What I observed:**
Only `FinalCTA` uses `.gh-section`. Everything else hand-codes padding: some inline `clamp(64px,8vw,120px)` (matches the token by coincidence), some Tailwind `py-10`/`py-12`, TrustRibbon uses a different scale entirely (`clamp(48px,6vw,88px)`), and each hero has its own ad-hoc padding.

**Why it matters:**
Site-wide rhythm is currently right-ish by luck. Any change to `--space-section` will update 1 of 12 sections. The `py-*` sections are already off-rhythm at some breakpoints.

**Recommended future fix:**
Enforce `.gh-section` / `.gh-section-tight` on all public `<section>` blocks (heroes may keep bespoke top padding for the sticky header offset, but bottom padding should come from the token). Consider a lint rule flagging inline padding on `<section>`.

**Routes to verify after implementation:** Entire public site — scroll every page at 375 / 768 / 1440.

**Risk notes:** Low logic risk, high visual diff surface. Do per-section screenshot comparison.

---

### Finding 3 — Missing `<h1>` on ~11 content/utility pages

**Severity:** S3
**Area:** Accessibility / SEO (content pages)
**Files or components involved:**
- `frontend/app/(site)/blog/page.tsx`, `blog/[slug]/page.tsx`, `about/page.tsx`, `faq/page.tsx`, `privacy/page.tsx`, `terms/page.tsx`, `contact/page.tsx`, `reviews/rate/page.tsx`, `verify/certificate/[id]/page.tsx`
- `frontend/app/(site)/[country]/[lang]/legal/page.tsx`, `legal/[type]/page.tsx`
- `frontend/components/sections/GH2PagePrimitives.tsx` (GH2CompactHero / GH2FlowHeader render `<h2>` without a preceding `<h1>`)

**What I observed:**
Pages built on GH2CompactHero/GH2FlowHeader start their heading outline at `<h2>`. No `<h1>` exists on these pages.

**Why it matters:**
WCAG 1.3.1/2.4.x and screen-reader outline navigation; SEO signal loss on content pages that exist for search.

**Recommended future fix:**
Change GH2CompactHero/GH2FlowHeader to render their title as `<h1>` (preferred), or add an `sr-only` `<h1>` per page. One fix in `GH2PagePrimitives.tsx` covers most routes.

**Routes to verify after implementation:** All routes listed above; check heading outline with an accessibility tree.

**Risk notes:** `GH2PagePrimitives` is shared with auth/checkout/status surfaces — verify no page ends up with two `<h1>`s (e.g., pages that already render their own).

---

### Finding 4 — Focus-visible system undermined by local overrides

**Severity:** S3
**Area:** Accessibility (site-wide)
**Files or components involved:**
- `frontend/app/globals.css:219–228` (good global dual-ring)
- `frontend/components/layout/SiteHeader.tsx:353` (mobile Book CTA: `focus-visible:outline-none` + custom ring)
- `frontend/components/layout/CountrySwitcher.tsx:91`, `LanguageSwitcher.tsx:82` (`focus-visible:ring-white/30` — low contrast on light)
- `frontend/components/layout/SectionNav.tsx:40–41` (`ring-[rgba(29,75,54,0.3)]` — near-invisible on dark)
- `frontend/components/sections/FAQSection.tsx:55–74` (`<summary>` has no focus-visible treatment)
- `frontend/components/cards/ServiceCard.tsx:305–310` (light variant lacks the `focus-within` ring DoctorCard has at `DoctorCard.tsx:147`)

**What I observed:**
The global `:focus-visible` style (forest outline + white halo, works on light and dark) is overridden per-component with weaker rings, and in one case removed via `outline-none` on the highest-value CTA in the header.

**Why it matters:**
Keyboard users get inconsistent, sometimes invisible focus indication (WCAG 2.4.7). The overrides are strictly worse than the global default they replace.

**Recommended future fix:**
Remove custom `focus-visible:*` overrides and let the global style apply. Where a surface genuinely needs a variant (dark chrome), define one documented `.focus-on-dark` modifier and test contrast. Add focus treatment to FAQ `<summary>` and `focus-within` ring to ServiceCard/CartServiceCard.

**Routes to verify after implementation:** Tab through header, section nav, FAQ, and card grids on light and dark sections; test Windows High Contrast.

**Risk notes:** Header is on every page — visually verify no ring bleed on mouse clicks (that is what `:focus-visible` prevents; do not swap to `:focus`).

---

### Finding 5 — Dark-section overuse and weak dark/light rhythm

**Severity:** S3
**Area:** Homepage / section system
**Files or components involved:**
- `HomeHero.tsx:87`, `PageHero.tsx:53–54/110`, `ServiceHero.tsx:74–75/218`, `DoctorsHero.tsx:135–137`, `FinalCTA.tsx:37`, `ServiceCatalog.tsx:149`, `StatsBand.tsx:31–36`, `FAQSection.tsx:16–21`, `TrustRibbon.tsx:54–56`, `HowItWorksNarrative.tsx:59–62`

**What I observed:**
9+ section components default to dark forest backgrounds; on country homes several dark bands run consecutively. FAQSection is always dark. Dark occupies well over half the homepage by area.

**Why it matters:**
Sustained white-on-dark reading fatigues users (worse for astigmatism/dyslexia); light sections lose their contrast value as a "breather"; the lime accent reads aggressive without white space between dark bands. Classification: **intentional brand direction, accidental accumulation** — each section chose dark independently.

**Recommended future fix:**
Define an explicit page-level rhythm rule (e.g., never more than two consecutive dark sections; FAQ gains a light variant). Audit country-home section order against it. Do not lighten the brand — just alternate.

**Routes to verify after implementation:** `/[country]/[lang]` for every live country, `/faq`, service detail pages.

**Risk notes:** Purely compositional; check dark-section-only components (TrustRibbon, StatsBand already support dual themes).

---

### Finding 6 — Hardcoded color drift across public components

**Severity:** S3
**Area:** Design tokens (site-wide)
**Files or components involved (inventory):**
- `SiteHeader.tsx:302` — `ring-[#0e2c22]` (notification dot ring)
- `SiteHeader.tsx:340,344,353,356` — `text-[#0a1f14]` ×4 (Book CTA text on lime)
- `SiteHeader.tsx:223` — inline `rgba(167,243,11,0.22)` scrolled border (token `--gh-chrome-border` exists)
- `SectionNav.tsx:36–41` — 4 hardcoded rgba lime/forest tints
- `SiteChrome.tsx:80` — `1px solid rgba(29,75,54,0.10)` disclaimer border
- `globals.css:609–679` — `.gh-newsletter-*` white rgba set + error `rgba(255,180,180,0.9)`
- `ServiceCard.tsx:66`, `CartServiceCard.tsx:116,199`, `DoctorCard.tsx:156,391` — 5 hardcoded shadows
- `patient-upload/page.tsx:49,76`, `reviews/rate/page.tsx:85` — Tailwind `text-red-700` instead of `--color-status-error-text` (#991B1B vs #b91c1c — visibly different reds)
- `login/ui.tsx:110,141` — icon color `#9BB0A4`
- `BlogCard.tsx:91` — `border-[rgba(29,75,54,0.22)]`

**What I observed:** ~20 hardcoded color instances in public components where semantic tokens exist or should exist. MobileNav, NewsletterSignup (markup), Breadcrumbs, Container, Section are clean.

**Why it matters:**
Each is individually harmless; together they mean palette changes can never be made safely, and near-miss colors (two different error reds, `#0e2c22` vs `--color-background-dark` #0f2e25) already ship.

**Recommended future fix:**
Add the missing tokens once — `--color-text-on-accent` (for #0a1f14), `--color-brand-accent-soft/-medium`, `--color-border-soft`, `--color-modal-overlay`, `--shadow-card-dark`, `--shadow-button-lime`, `--price-chip-shadow` — then sweep replacements. Fold the two error reds into `--color-status-error-text`.

**Routes to verify after implementation:** Header everywhere; footer newsletter; `/patient-upload`, `/reviews/rate`, `/login`; card grids.

**Risk notes:** `#0a1f14` on lime is the conversion CTA — verify WCAG AA before/after (it currently passes comfortably; keep the same resolved value).

---

### B. Shared components (S2)

---

### Finding 7 — Five hero layouts with no selection logic

**Severity:** S2
**Area:** Heroes
**Files or components involved:** `HomeHero.tsx:85–293`, `PageHero.tsx:50–299` (immersive) / `306–426` (default), `ServiceHero.tsx:73–432`, `DoctorsHero.tsx:134–349`

**What I observed:** Five distinct hero compositions (full-viewport photo hero; 50/50 immersive; compact default; image-left service hero with floating cards + wave strip; doctors hero with arch portrait + 3 floating glass cards). No documented rule for which page gets which.

**Why it matters:** Users crossing service → doctors → detail pages get a different hero grammar each time; maintenance quintuples; HomeHero is also the one outlier from the eyebrow/headline pattern (uses badges + SVG underline).

**Recommended future fix:** Consolidate to a documented 2–3 variant system (Primary full-viewport; Secondary compact; one specialized). Merge ServiceHero's floating-card feature into a PageHero variant prop. Write the route→hero matrix down.

**Routes to verify after implementation:** `/`, `/[country]/[lang]`, `/services/[slug]`, `/doctors`, `/general-consultation`, `/specialist-consultation`

**Risk notes:** High visual surface; do one hero at a time. No logic risk.

---

### Finding 8 — DoctorCard radius 24px vs system 20px token

**Severity:** S2
**Area:** Cards
**Files or components involved:** `DoctorCard.tsx:151` (`borderRadius: 24` inline), `:166` (`rounded-[24px]`); token at `globals.css:108` (`--radius-card: 20px`)

**What I observed:** All other cards (ServiceCard, BlogCard, CartServiceCard, PricingPlanCard) use `rounded-[var(--radius-card)]`; DoctorCard hardcodes 24px. Its metadata icon boxes also use `rounded-[10px]` (`DoctorCard.tsx:18`) instead of `--radius-tile` (16px).

**Why it matters:** Doctor and service cards sit side by side on country homes and detail pages; the 20% radius difference reads as "one of these doesn't belong."

**Recommended future fix:** Switch to `rounded-[var(--radius-card)]`; if 24 was intentional, add `--radius-card-lg` and document when to use it.

**Routes to verify after implementation:** `/[country]/[lang]/doctors`, `/doctors/[slug]`, country homes (FeaturedDoctor + ServiceCatalog together)

**Risk notes:** One-liner; none.

---

### Finding 9 — Card shadow and hover systems fragmented

**Severity:** S2
**Area:** Cards
**Files or components involved:**
- Shadows: `ServiceCard.tsx:66`, `CartServiceCard.tsx:116,199`, `DoctorCard.tsx:156,391` vs tokens `globals.css:114–119`
- Hover lift: `DoctorCard.tsx:144` (`-translate-y-[3px]`) vs `ServiceCard.tsx:60,120,238` / `BlogCard.tsx:91` / `CartServiceCard.tsx:195,296` (`-translate-y-0.5`)
- Dark DoctorCard has no hover shadow at all (`DoctorCard.tsx:145` — hover styles are light-only)

**What I observed:** Five hardcoded shadow recipes across cards; three different hover-lift distances; dark doctor cards give no elevation feedback on hover.

**Why it matters:** Depth hierarchy is the main "is this clickable / is this elevated" signal. Inconsistent lifts feel like different products; hover-dead dark cards feel unresponsive.

**Recommended future fix:** One lift value for all cards (suggest `-translate-y-1`, tokenized as `--card-hover-lift`); dark-mode shadow tokens (`--shadow-card-dark`, `--shadow-button-lime`); add a hover state to dark DoctorCard.

**Routes to verify after implementation:** `/doctors`, `/tests`, `/specialist-consultation`, country homes — hover adjacent cards of different types.

**Risk notes:** Animation-only; gate any new transforms behind `motion-reduce`.

---

### Finding 10 — Card padding drift, including backwards responsive scaling

**Severity:** S1
**Area:** Cards
**Files or components involved:** `DoctorCard.tsx:237` (`px-5 pb-5 pt-4`, no responsive step), `ServiceCard.tsx:322` (`p-6 sm:p-7`), `BlogCard.tsx:64` (`p-6 sm:p-8`), `CartServiceCard.tsx:138` (`p-5 sm:p-6`)

**What I observed:** Four padding recipes; ServiceCard's `p-6 sm:p-7` differs from siblings and DoctorCard never scales.

**Why it matters:** Adjacent cards visibly breathe differently; the drift pattern suggests copy-paste evolution.

**Recommended future fix:** Standardize on the CartServiceCard pattern (`p-5 sm:p-6`) or tokenize (`--card-padding` / `--card-padding-lg`).

**Routes to verify after implementation:** All card grids at 375/768/1280.

**Risk notes:** Check text overflow on the tightest card after change.

---

### Finding 11 — Duplicated dark-image card markup (ServiceCard ↔ CartServiceCard)

**Severity:** S2
**Area:** Cards (maintenance)
**Files or components involved:** `CartServiceCard.tsx:88–135` ≈ verbatim copy of `ServiceCard.tsx:116–171` (image layer, tint, price chip, badges)

**What I observed:** The dark image card body — including the price chip with its hardcoded shadow — exists twice.

**Why it matters:** They have already begun to diverge (`hover:brightness-110` vs `105`); future fixes will land in one and not the other.

**Recommended future fix:** Extract a shared `DarkImageCardBody` (or shared class set) used by both.

**Routes to verify after implementation:** `/tests`, `/specialist-consultation`, `/prescriptions`

**Risk notes:** Pure refactor; screenshot-compare both consumers.

---

### Finding 12 — No "on-chrome" button/input variants; header switchers hand-rolled

**Severity:** S2
**Area:** Header / navigation
**Files or components involved:** `CountrySwitcher.tsx:91`, `LanguageSwitcher.tsx:82` (identical long inline class strings), `SiteHeader.tsx:340` (Book CTA with inline shadow/colors), `globals.css:609+` (`.gh-newsletter-input` as a one-off dark input)

**What I observed:** Every element on the glass header/footer chrome invents its own translucent-white styling. No `.gh-btn-on-chrome` or `.gh-input-on-chrome` class exists.

**Why it matters:** The header is the most-seen surface on the site; the next feature added to it (account menu, notifications) will create a fourth style. Newsletter input styling is stranded outside the `.gh-input` system (see Finding 21).

**Recommended future fix:** Create `.gh-btn-on-chrome` (translucent) + `.gh-btn-on-chrome-primary` (lime CTA) + `.gh-input-on-chrome`; migrate switchers, Book CTA, newsletter.

**Routes to verify after implementation:** Header + footer on all routes, logged-in and logged-out.

**Risk notes:** Header regression is instantly visible everywhere; pixel-compare before/after.

---

### Finding 13 — Country/Language dropdowns have no max-height (mobile clipping risk)

**Severity:** S2
**Area:** Header / navigation
**Files or components involved:** `CountrySwitcher.tsx:104–114`, `LanguageSwitcher.tsx:94–106`

**What I observed:** Hand-rolled dropdowns (`position:absolute`, `minWidth:220`, no `max-height`, no `overflow-y`). With a growing country list, the menu can extend past the viewport bottom on short screens with no way to scroll it.

**Why it matters:** Country switching is core navigation on a multi-country site; unreachable options = stuck users.

**Recommended future fix:** `max-height: min(calc(100vh - 120px), 320px); overflow-y: auto;` — or migrate to Radix Popover (already a dependency), which handles collision/repositioning.

**Routes to verify after implementation:** Header switchers on iPhone SE-class viewport, opened while scrolled to page bottom; iOS Safari specifically.

**Risk notes:** Behavior-preserving; test keyboard navigation inside the scrollable menu.

---

### Finding 14 — Header tap targets below 44px

**Severity:** S2
**Area:** Header / accessibility
**Files or components involved:** `SiteHeader.tsx:298` (notification bell `size-9` = 36px), `:329` (avatar `size-9`), vs `.gh-header-authLink` (44px, globals.css:555) and `.gh-header-bookCta` (44px, globals.css:561)

**What I observed:** Two of four interactive header controls are 36×36px; WCAG 2.5.5 / platform guidance is 44×44.

**Why it matters:** Missed taps on mobile for account/notification entry points; visual imbalance in the header row.

**Recommended future fix:** Expand hit area to 44px (padding or pseudo-element) while keeping the 36px visual circle if desired.

**Routes to verify after implementation:** Logged-in header, mobile + tablet.

**Risk notes:** Watch header height (88px) — 44px targets still fit.

---

### Finding 15 — FAQ accordion: answer contrast fails AA; summary lacks focus/expanded affordances

**Severity:** S2
**Area:** FAQ (shared section)
**Files or components involved:** `FAQSection.tsx:77` (answers `rgba(255,255,255,0.52)` on dark), `:47–74` (`<summary>` with `list-none`, no focus-visible style, no `aria-expanded`, decorative toggle icon)

**What I observed:** Answer body text at 0.52 white opacity on `--color-background-dark` computes below WCAG AA for body text. Summary relies on browser-default focus (suppressed styling makes it faint) and native `<details>` state only.

**Why it matters:** FAQ is where anxious patients read carefully; this is the least readable text on the site. Keyboard/AT affordances are the weakest of any shared interactive component.

**Recommended future fix:** Raise answers to ≥ `rgba(255,255,255,0.75)`; add explicit focus-visible ring on `<summary>`; either accept native `<details>` semantics with a code comment, or add `aria-expanded` via a small state wrapper. Consider a light FAQ variant (see Finding 5).

**Routes to verify after implementation:** `/faq`, FAQ blocks on service detail pages; verify with a contrast checker on the rendered page.

**Risk notes:** FAQSection and FAQTabs are shared — check both.

---

### Finding 16 — Form feedback split into four patterns

**Severity:** S2
**Area:** Forms (public form system)
**Files or components involved:**
- Contact: inline per-field errors (`ContactForm.tsx:131–133`)
- Auth: `.gh-status-error` block with `role="status"` (`login/ui.tsx:189–191`, `register/ui.tsx:198–200`, `forgot-password:69–71`)
- Brazil consent: `role="alert"` block (`brazil/consent/page.tsx:107–114`)
- Reviews / patient-upload: bare `text-red-700` text, no role (`reviews/rate/page.tsx:85`, `patient-upload/page.tsx:49,76`); reviews success is a plain `<h1>` with no `role="status"` (`reviews/rate/page.tsx:76`)
- Newsletter: bespoke `.gh-newsletter-statusError` pink (`globals.css:677–679`), no `aria-describedby` link to input (`NewsletterSignup.tsx:70–95`)

**What I observed:** Four visually and semantically different error/success treatments across seven public forms; two forms announce nothing to screen readers.

**Why it matters:** Error moments are the highest-anxiety moments on a healthcare site; inconsistency reads as unreliability, and the unannounced states are an a11y gap.

**Recommended future fix:** One shared `FormStatus`/`FieldError` pattern: block status uses `.gh-status-*` + `role="status"`/`"alert"`; field errors get `id` + `aria-describedby` + `aria-invalid`. Migrate reviews, patient-upload, newsletter first (they are furthest off).

**Routes to verify after implementation:** `/contact`, `/login`, `/register`, `/forgot-password`, `/brazil/consent`, `/reviews/rate`, `/patient-upload`, footer newsletter — each in error + success states, with a screen reader spot-check.

**Risk notes:** Visual + attributes only; do not touch validation or submission logic.

---

### Finding 17 — Label styling split across forms

**Severity:** S1
**Area:** Forms
**Files or components involved:** `.gh-field-label` (0.92rem/700 — auth forms) vs `text-sm font-medium` (Contact `ContactForm.tsx:114–117`, Brazil consent labels)

**What I observed:** Two label systems differing in size and weight.

**Recommended future fix:** Pick one (`.gh-field-label` is more distinctive) and apply everywhere; document in the form system.

**Routes to verify after implementation:** All public forms side by side.

**Risk notes:** None.

---

### Finding 18 — Patient-upload file input is unstyled native UI

**Severity:** S2
**Area:** Forms
**Files or components involved:** `patient-upload/page.tsx:74` (`<input type="file" className="block w-full text-sm" />`)

**What I observed:** OS-default file control on a patient-facing medical upload flow; error text hardcoded `text-red-700` (Finding 6).

**Why it matters:** This flow handles medical documents — the least on-brand control sits on one of the most trust-sensitive pages.

**Recommended future fix:** Custom trigger (hidden input + styled button or drop zone) consistent with the form system; keep native input behavior underneath.

**Routes to verify after implementation:** `/patient-upload?token=…` at 320px and desktop, keyboard-only operation.

**Risk notes:** Keep the `<input type="file">` in the DOM and label-associated — do not break AT or mobile camera pickers.

---

### Finding 19 — Password reveal and phone field a11y linking

**Severity:** S1
**Area:** Auth / shared form components
**Files or components involved:** `login/ui.tsx:154–161`, `register/ui.tsx:165–172` (reveal buttons labeled but not linked to inputs), `components/forms/phone-field.tsx:88–115` (dial-code select + number input not grouped as one field)

**What I observed:** Reveal buttons have `aria-label` but no `aria-describedby`/`aria-controls` relation to the password input; PhoneField's two controls have no `fieldset`/`role="group"` wrapper, so AT reads them as unrelated.

**Recommended future fix:** Link reveal button to input; wrap PhoneField in `role="group"` + `aria-labelledby` pointing at the caller's label (used by register + brazil consent).

**Routes to verify after implementation:** `/login`, `/register`, `/brazil/consent` with NVDA/VoiceOver.

**Risk notes:** Attributes only.

---

### Finding 20 — Blog article body runs full container width

**Severity:** S2
**Area:** Blog / readability
**Files or components involved:** `blog/[slug]/page.tsx:144` (`max-w-[var(--container-width)]` = 1280px around article body)

**What I observed:** Article prose can reach ~140 characters per line on desktop. Privacy/terms correctly use `max-w-3xl`; RichBodySection defaults to 720px.

**Why it matters:** 45–75ch is the readability window; blog is the site's E-E-A-T surface.

**Recommended future fix:** Constrain the article body to ~720–800px like RichBodySection (metadata/hero can stay wide).

**Routes to verify after implementation:** `/blog/[slug]` at 1440+.

**Risk notes:** None.

---

### Finding 21 — Newsletter input stranded outside the `.gh-input` system

**Severity:** S2
**Area:** Footer / forms
**Files or components involved:** `globals.css:609–626` (`.gh-newsletter-input` with hardcoded white rgba set) vs `.gh-input` (globals.css:1061+)

**What I observed:** A one-off dark input recipe for the only dark-surface input on the site; error color is off-palette pink (Finding 6, 16).

**Recommended future fix:** Rename/refit as `.gh-input-on-chrome` built on the `.gh-input` base with dark-surface token overrides (pairs with Finding 12).

**Routes to verify after implementation:** Footer on any page; autofill styling.

**Risk notes:** None.

---

### Finding 22 — Doctor detail page lacks breadcrumb / back path

**Severity:** S2
**Area:** Doctors
**Files or components involved:** `doctors/[doctorSlug]/page.tsx` (rendered via `renderDoctorProfilePage` utility — verify in `frontend/lib/content/` before fixing)

**What I observed:** No breadcrumb or "back to doctors" link; `Breadcrumbs.tsx` exists but is not used here.

**Why it matters:** SEO/social entrants can't discover the doctors listing; inconsistent with other detail pages that use breadcrumbs.

**Recommended future fix:** Add Breadcrumbs (`Doctors › [Specialty] › Dr X`) or a back link that preserves filter state.

**Routes to verify after implementation:** `/[country]/[lang]/doctors/[slug]` from direct load and from listing.

**Risk notes:** Rendering is behind a shared utility — check other consumers of `renderDoctorProfilePage` before editing.

---

### C. Repeated patterns (S1) — condensed

### Finding 23 — Watermark placement/size drift across heroes
**Severity:** S1 · **Files:** `HomeHero.tsx:112` (bottom-left), `PageHero.tsx:311–313` + `DoctorsHero.tsx:153–159` (bottom-right); three different size clamps.
**Fix direction:** One anchor rule (left) and shared size scale; consider hiding under 768px. **Verify:** all heroes, mobile. **Risk:** none.

### Finding 24 — `hover:brightness-110` on lime buttons blows out the accent
**Severity:** S1 · **Files:** `ServiceCard.tsx:60`, `DoctorCard.tsx:388`, `CartServiceCard.tsx:195` (`brightness-105` — already diverged).
**What/why:** Brightness-up works on dark fills, but lime × 1.1 approaches white and weakens text contrast mid-hover.
**Fix direction:** Lime buttons hover via shadow glow or `brightness-95`; dark fills keep brightness-up. Standardize the pair. **Verify:** card grids, hero CTAs. **Risk:** conversion-surface hover; A/B if possible.

### Finding 25 — `gh2-btn-ghost` hover feedback nearly invisible
**Severity:** S1 · **Files:** `globals.css:6777–6780` (`background: rgba(255,255,255,0.08)` on hover).
**Fix direction:** Raise to ~0.12–0.15 and/or brighten border more; keep motion-gated. **Verify:** every dark hero secondary CTA. **Risk:** none.

### Finding 26 — Price display: chip vs inline badge vs absent
**Severity:** S1 · **Files:** `ServiceCard.tsx:146–158` (lime chip, hardcoded shadow), `ServiceCard.tsx:271–280` (muted inline badge), `CartServiceCard.tsx:110–122` (chip copy).
**Fix direction:** Rule: overlay chip on image cards, inline badge on text cards; tokenize chip shadow. **Verify:** `/tests`, `/general-consultation`, `/specialist-consultation`. **Risk:** pricing display — confirm copy with product.

### Finding 27 — Mint vs lime accent naming ambiguity
**Severity:** S1 · **Files:** `globals.css:57` (`--color-brand-mint: #8FB021`) vs `:64` (`--color-brand-accent: #B0F122`); mint hardcoded in `VerifiedProfessionals.tsx:69`, `HowItWorksNarrative.tsx:90`, `StatsBand.tsx:63`.
**What/why:** Intentional (lime on dark, mint on light) but undocumented, so it reads accidental and invites misuse.
**Fix direction:** Rename/document (`accent-lime` / `accent-mint`) + usage rule. **Verify:** light sections. **Risk:** none.

### Finding 28 — Back-link `text-white/45` on dark heroes below AA
**Severity:** S1 · **Files:** `GH2PagePrimitives.tsx:97`.
**Fix direction:** ≥ `text-white/65`. **Verify:** `/blog/[slug]`, `/legal/[type]`, `/verify/certificate/[id]`. **Risk:** shared primitive — check all consumers.

### Finding 29 — BlogCard CTA border effectively invisible (non-text contrast)
**Severity:** S1 · **Files:** `BlogCard.tsx:91` (`rgba(29,75,54,0.22)` border on soft background).
**Fix direction:** Raise to ~0.40 opacity or drop the border and rely on fill change. **Verify:** `/blog`. **Risk:** none.

### Finding 30 — DoctorsHero `.gh-floaty` animation lacks reduced-motion gate
**Severity:** S1 · **Files:** `DoctorsHero.tsx:301,315,331`; check `.gh-floaty` keyframes in globals.css.
**Fix direction:** Add `@media (prefers-reduced-motion: reduce)` disable. **Verify:** `/doctors` with OS reduce-motion. **Risk:** none.

### Finding 31 — DoctorCarousel renders blank on empty doctor list
**Severity:** S1 · **Files:** `DoctorCarousel.tsx` (no guard; contrast: `ServiceCatalog.tsx:131` returns null correctly).
**Fix direction:** Empty-state message ("No doctors match this filter") or null-return. **Verify:** country with few doctors + filters applied. **Risk:** none.

### Finding 32 — Review form selects: implicit labels + no status roles
**Severity:** S1 · **Files:** `reviews/rate/page.tsx:87–105` (7 selects inside labels without `htmlFor`), `:76` (success heading, no `role="status"`).
**Fix direction:** Explicit `htmlFor`/`id`; wrap success in `role="status"`. Folds into Finding 16. **Verify:** `/reviews/rate`. **Risk:** none.

### Finding 33 — Card CTA density competes with page CTAs
**Severity:** S1 · **Files:** ServiceCatalog + card grids (2 CTAs per card × 6 cards + hero pair + FinalCTA pair ≈ 16+ CTAs in view).
**What/why:** Partly intentional (cards must be actionable) but the two-button-per-card pattern multiplies noise and buries the page-level "Book" hierarchy.
**Fix direction:** Whole-card click + one quiet secondary, or single primary per card. **Verify:** country homes, `/services`. **Risk:** conversion surface — measure before/after if possible.

### Finding 34 — SectionNav / switcher focus + tint hardcodes
**Severity:** S1 · **Files:** `SectionNav.tsx:36–41`.
**Fix direction:** Covered by Findings 4 + 6 (tokens + global focus). **Verify:** section nav on light + dark. **Risk:** none.

### Finding 35 — StickyBookingCTA polish
**Severity:** S1 · **Files:** `StickyBookingCTA.tsx:25–30`.
**What:** Well designed (hidden on `/book`/`/cart`/`/checkout`, mobile-only); missing `motion-reduce` gate on its transition and consumes ~7% of a small viewport with no dismiss.
**Fix direction:** Add motion-reduce; consider optional dismiss. **Verify:** mobile country home + service pages. **Risk:** none.

---

### D. Conversion-critical (S4)

---

### Finding 36 — Slot-picker time buttons: weak selected state, small targets, invisible spinner

**Severity:** S4
**Area:** Booking (time selection)
**Files or components involved:** `consult/[serviceSlug]/_components/slot-picker-step.tsx:162` (grid buttons `min-h-[70px]`, `text-xs`), `:165` (spinner `size-2.5`)

**What I observed:** Selected time renders in nearly the same style as unselected; text is `text-xs` in a 3-column grid at 320px; the loading spinner is ~10px.

**Why it matters:** This is the single highest-traffic decision point in the funnel. Ambiguous selection → mis-booked times, re-attempts, abandonment.

**Recommended future fix:** Unmistakable selected state (lime fill or primary fill + `aria-pressed`), larger touch targets on mobile, visible loading state. Visual only — no slot logic changes.

**Routes to verify after implementation:** `/[country]/[lang]/book?service=…` and `?doctor=…` flows on 320/375px.

**Risk notes:** Shared by service-first and doctor-first flows; test both.

---

### Finding 37 — Date pill selected state hard to scan in horizontal scroll

**Severity:** S4
**Area:** Booking (date selection)
**Files or components involved:** `book/_components/service-time-picker.tsx:118–120` (`text-[10px]` pills, ~68px min-width, active = primary fill)

**What I observed:** In the horizontally scrolling date strip, the active pill can scroll out of view and 10px text is at legibility floor; no recap of the chosen date near the time grid.

**Recommended future fix:** Check icon on active pill, ≥11px text, and a one-line "Selected: {date}" recap above the time grid.

**Routes to verify after implementation:** `/book?service=…` on mobile; scroll the strip after selecting.

**Risk notes:** Service-first flow only.

---

### Finding 38 — Cart hold countdown easy to miss; double warning on expiry

**Severity:** S4
**Area:** Cart
**Files or components involved:** `[country]/[lang]/cart/page.tsx:555–565` (11.5px inline timer), `:244–263` (separate expiry banner), `:573` (quantity controls crowd the timer at 320px)

**What I observed:** The 10-minute consultation hold — the most urgent element on the page — is an 11.5px inline text that can wrap under quantity controls on small screens; on expiry, a page-level banner and the line item warn separately without synchronizing.

**Why it matters:** A missed hold forces re-booking; that is direct funnel loss.

**Recommended future fix:** Promote countdown to a bordered amber pill anchored near the line price; single source of expiry messaging; explicit "hold released" state on the row.

**Routes to verify after implementation:** Cart with an active hold at 320/375px; let a hold expire.

**Risk notes:** Do not touch the hold timing logic — presentation only.

---

### Finding 39 — Checkout total scrolls out of view on mobile

**Severity:** S4
**Area:** Checkout
**Files or components involved:** `[country]/[lang]/checkout/page.tsx:372` (summary sticky only at `lg:`), `:413–448` (totals list without grouping separators)

**What I observed:** Desktop keeps the order summary sticky; on mobile it scrolls away while the payer form is being filled, so the user reaches "Pay securely" without the total in sight. Totals rows read as a loose list.

**Why it matters:** Price uncertainty at the payment moment is a classic abandonment trigger; ~mobile-majority traffic makes this the top checkout issue.

**Recommended future fix:** Persistent total on mobile (collapsed sticky summary bar or bottom "Total: X" strip, mirroring StickyBookingCTA), plus divider grouping in the totals block.

**Routes to verify after implementation:** `/checkout` at 320/375px with a long form (shipping + consultations).

**Risk notes:** Visual only; no changes to totals computation or Stripe hand-off.

---

### Finding 40 — Booked-slot confirmation on the details form is under-weighted

**Severity:** S4
**Area:** Booking (details step)
**Files or components involved:** `consultation-booking-form.tsx:460–479` (soft box + small "Change time" link)

**What I observed:** After picking a time, the form shows the slot in a soft box that blends with the page; no "locked in" affordance; error blocks use a different visual family than the summary.

**Recommended future fix:** Give the slot summary a lime accent border + lock/check icon so "your time is held" is unmistakable; keep "Change time" but larger.

**Routes to verify after implementation:** All three entry flows landing on the details form.

**Risk notes:** None (presentation).

---

### Finding 41 — HeroBookingWizard: slots clickable during load

**Severity:** S4
**Area:** Booking entry (homepage wizard)
**Files or components involved:** `HeroBookingWizard.tsx:115–136` (async slot fetch; buttons not disabled while loading)

**What I observed:** During slot fetch there is no disabled/loading treatment on slot buttons, so a fast tap can act on stale data.

**Why it matters:** Stale slot picks surface later as conflicts — user pain at the worst point.

**Recommended future fix:** Disable + dim slot buttons and show "Finding times…" while loading (SameDayBooking already does this correctly at `SameDayBooking.tsx:50–51` — copy that pattern).

**Routes to verify after implementation:** Country home wizard under throttled network.

**Risk notes:** UI-state only; do not alter fetch logic.

---

### Finding 42 — GDPR consent checkboxes visually ungrouped on booking form

**Severity:** S4
**Area:** Booking (details step / legal)
**Files or components involved:** `consultation-booking-form.tsx:864–886` (`size-4` checkboxes, `text-xs` muted labels, no fieldset border/background)

**What I observed:** Legally required consents render as two small muted lines with no grouping, directly below a visually bordered address fieldset.

**Why it matters:** Missed consent = blocked appointment (and jurisdictional risk); the least skippable part of the form is the most skippable-looking.

**Recommended future fix:** Bordered/soft-background fieldset, `text-sm` labels, baseline-aligned checkboxes.

**Routes to verify after implementation:** Details form, mobile + desktop.

**Risk notes:** Do not change consent copy or submission behavior — layout only.

---

### Finding 43 — Pricing cards: "Current plan" vs "Featured" badges collide

**Severity:** S4
**Area:** Pricing / subscriptions
**Files or components involved:** `pricing/_components/PricingPlanCard.tsx:99–106` (current badge), `:107–122` (featured badge), `:214–230` (CTA with long interpolated label, no truncation)

**What I observed:** Same-size, same-position badges in adjacent accents; a plan that is both featured and current has no defined precedence. Long plan names can wrap the CTA awkwardly (worse in verbose locales).

**Why it matters:** A subscriber who cannot identify their own plan may click "switch" on it — churn/support risk on a revenue page.

**Recommended future fix:** "Current" always wins (suppress featured badge when current); add a lime border to the current card; clamp/truncate CTA text or use a short verb.

**Routes to verify after implementation:** `/[country]/[lang]/pricing` logged in as subscriber; long-name plan at 320px.

**Risk notes:** Display only; plan logic untouched.

---

### Finding 44 — Service choice cards bury price under image on mobile

**Severity:** S4
**Area:** Booking (service selection)
**Files or components involved:** `book/page.tsx:812–822` (`min-h-[150px]` image), `:848–869` (price in footer button row that wraps at 320px)

**What I observed:** At 320px each card is image-dominated with the price below the fold of the card; the two-button footer wraps.

**Recommended future fix:** Shorter image ratio on mobile, or move price up beside the service name; keep footer to one row.

**Routes to verify after implementation:** `/book` service step at 320/375px.

**Risk notes:** None (layout).

---

### Finding 45 — SameDayBooking "Continue" hides the price

**Severity:** S4
**Area:** Booking entry (same-day GP)
**Files or components involved:** `SameDayBooking.tsx:371–380` (Continue button), `:248` (slot `priceCents` already available)

**What I observed:** After picking language + time, the handoff button says only "Continue" — no price expectation is set before the details form.

**Recommended future fix:** "Continue — {price}" or a one-line recap ("{time} · {price}") above the button, using the already-fetched slot price.

**Routes to verify after implementation:** Country home same-day panel end-to-end.

**Risk notes:** Presentation of existing data only.

---

### Finding 46 — Cart benefit selector stays fully interactive during server PATCH

**Severity:** S4
**Area:** Cart (subscription benefits)
**Files or components involved:** `[country]/[lang]/cart/page.tsx:519–541` (`role="radio"` buttons, no disabled state), `:544–548` ("not enough credits" hint while buttons stay live)

**What I observed:** While a benefit change request is in flight (or after it fails), all options remain clickable with no pending indication.

**Recommended future fix:** Local pending state → disable options + spinner during PATCH; restore prior selection on error (error display already exists at `:314–318`).

**Routes to verify after implementation:** Cart with active plan; throttle network and switch benefits rapidly.

**Risk notes:** UI-state only; PATCH logic unchanged.

---

### E. Minor local polish (S0) — condensed

| # | Finding | Files | Fix direction |
|---|---|---|---|
| 47 | Checkout summary: patient name not visually dominant per consultation; shipping fieldset lacks "why we need this" context; success page rows can squeeze price at 320px; order ref has no copy affordance | `checkout/page.tsx:256–289, 301–328`; `checkout/success/page.tsx:73–94` | Bold/name-first row + item-ships note + `flex-col` stack at 320px + copy-to-clipboard on order ref |
| 48 | Step indicator check icon (size-4) floats in 32px circle | `book/page.tsx:875–920` | `size-5` icon |
| 49 | Contact textarea error not linked (`aria-describedby`) — only field in the form outside the `Field` helper | `ContactForm.tsx:113–134` | Add `id`/`aria-describedby` |
| 50 | Login/register field icon color hardcoded `#9BB0A4` | `login/ui.tsx:110,141` | Token (`--color-text-muted` or new documented token) |
| 51 | MobileNav overlay `bg-black/50` unmapped; SiteChrome disclaimer border inline rgba; scrolled-header border inline (token exists) | `MobileNav.tsx:163`, `SiteChrome.tsx:80`, `SiteHeader.tsx:223` | Fold into Finding 6 token sweep |
| 52 | Legal/privacy `list-inside` bullets wrap awkwardly at 320px; no table `overflow-x` hardening in rich-text renderers (future-proofing — no tables observed); z-index scale undocumented | `privacy/page.tsx:44`, `legal/[type]/page.tsx:145–146`, `RichBodySection.tsx:97–136`, `globals.css:520` | `list-outside`; defensive table wrapper rule; z-index comment block |

**Correct patterns worth protecting (no action):** blog metadata icons properly `aria-hidden` with text labels; `object-cover` on BlogCard images; `overflow-wrap: break-word` on `.gh-article-body`; skip link; marquee/live-dot reduced-motion gates; SameDayBooking loading + empty states; StickyBookingCTA route suppression; consistent `disabled:opacity-60`; consistent `autocomplete` attributes on auth forms.

---

## 6. Public Website Component Map

| Component | Controls | Notes / dependencies |
|---|---|---|
| `SiteChrome` | Whether header/footer/disclaimer render per route (gateway detection) | Wraps everything public |
| `SiteHeader` | Sticky nav, scroll morph, switchers, auth links, Book CTA, cart icon | Highest-visibility surface; findings 4, 6, 12, 13, 14 |
| `SiteFooter` | Dark chrome footer, link columns, NewsletterSignup | Finding 21 |
| `MobileNav` | Drawer nav (<lg), country/lang switching | Radix Dialog; clean tokens except overlay |
| `SectionNav` | In-page tab nav pills | Findings 4, 34 |
| `CountrySwitcher` / `LanguageSwitcher` | Locale routing UI | Findings 12, 13 |
| `Container` / `Section` | Width + section background/pattern variants | `Section` pattern classes live 5000+ lines deep in globals.css (Finding 52 org note) |
| `Breadcrumbs` | Trail on deep pages | Unused on doctor detail (Finding 22) |
| `GH2PagePrimitives` | Compact hero / flow header for content, auth, checkout, status pages | H1 fix point (Finding 3); back-link contrast (28); shared beyond marketing pages — change carefully |
| `HomeHero` / `PageHero` / `ServiceHero` / `DoctorsHero` | Hero layer | Finding 7 consolidation target |
| `SameDayBooking` / `HeroBookingWizard` | Homepage booking entries | 41, 45; SameDayBooking is the reference implementation for loading states |
| `ServiceCatalog` / `ServicesGrid` / `DoctorCarousel` / `DoctorsSection` / `FeaturedDoctor` | Listing sections | 1, 31, 33 |
| `FAQSection` / `FAQTabs` | FAQ accordions site-wide | 15 |
| `FinalCTA` / `BookingCTA` / `StickyBookingCTA` / `LinkCallout` | Conversion bands | Only `.gh-section`-token consumer today (FinalCTA) |
| `TrustRibbon` / `CountryTrustBar` / `StatsBand` / `VerifiedProfessionals` / `HowItWorksNarrative` | Trust/explainer bands | Mint-on-light accent family (27) |
| `RichBodySection` / `MedicalDisclaimer` | Rich text + legal disclaimer | Reference 720px measure (20) |
| Cards: `DoctorCard`, `ServiceCard`, `CartServiceCard`, `BlogCard`, `PricingPlanCard` | All public card surfaces | 8–11, 24, 26, 43 |
| Forms: `ContactForm`, `NewsletterSignup`, `phone-field`, booking/checkout forms | Public form system | 16–19, 21 |

---

## 7. Button / CTA Review

**Current state:** clean 2-variant page system (`gh2-btn-lime` + `gh2-btn-ghost`) + inline card buttons + inline filter pills + legacy `.gh-btn-*` + hand-rolled header chrome buttons. Lime hover uses `brightness(1.1)` (blows out); ghost hover is 8% white (barely visible); `text-[#0a1f14]` on lime is hardcoded 4×.

**Recommended future hierarchy (one system, documented in globals.css):**

1. `gh2-btn-lime` — the only conversion primary (book/pay/continue). Text via `--color-text-on-accent`. Hover: lift + shadow glow (not brightness-up).
2. `gh2-btn-ghost` — secondary on dark. Hover raised to visible (≥0.12 white).
3. `.gh2-btn-outline` (new) — secondary on light (fill-on-hover); replaces ServiceCard/DoctorCard/CartServiceCard inline secondaries.
4. `.gh2-btn-outline-dark` (new) — secondary inside dark cards.
5. `.gh-btn-on-chrome` / `.gh-btn-on-chrome-primary` (new) — header/footer glass surfaces.
6. `.gh2-pill-filter` / `--ghost` (new) — filter pills (DoctorCarousel, ServiceCatalog, DoctorFilters).
7. `.gh-link-arrow` — text/link CTA (already exists; keep).

Rules: one lime primary per view region; cards get max one primary; disabled = `opacity-60` (existing convention); all variants inherit the global focus-visible ring; every hover gated with `motion-reduce`.

---

## 8. Card System Review

**Current state:** four independent card implementations; token adoption is partial (ServiceCard/BlogCard/CartServiceCard on `--radius-card`, DoctorCard hardcodes 24px); 5 hardcoded shadows; 3 hover-lift values; 4 padding recipes (one scaling backwards); duplicated dark-image body; no selected state on any card (filter chips have one — cards don't); price display differs per variant.

**Recommended future hierarchy:**

- Extract a base `Card` (or class contract): `rounded-[var(--radius-card)]`, `--shadow-card`/`--shadow-card-dark`, `hover:-translate-y-1` + shadow step, `focus-within` ring, `p-5 sm:p-6`, optional `selected` prop (accent ring + check badge).
- Variants on the base: media card (image + overlay price chip), text card (inline price badge), person card (DoctorCard — may keep its portrait layout, not its private geometry).
- Shared `DarkImageCardBody` for ServiceCard/CartServiceCard.
- Document the price rule (chip on image cards, badge on text cards) and hover rule (lime = glow, dark = brightness-up).

---

## 9. Form System Review

**Current state:** the `.gh-input`/`.gh-select`/`.gh-textarea` base is genuinely consistent (48px, same border/radius/`--shadow-focus`, correct placeholders, good `autocomplete` usage). The gaps are at the edges: two label styles, four error/success patterns (two of them silent to AT), an unstyled file input, a stranded dark newsletter input, off-token error reds, and missing a11y linking (password reveal, phone group, contact textarea, newsletter).

**Recommended future hierarchy:**

1. One label class (`.gh-field-label`) everywhere.
2. One `FormStatus` (block, `.gh-status-*` + `role="status"|"alert"`) + one `FieldError` (inline, `id` + `aria-describedby` + `aria-invalid`) used by every public form.
3. `.gh-input-on-chrome` dark variant on the `.gh-input` base (newsletter, any future dark forms).
4. `FileUploadField` primitive for patient-upload.
5. PhoneField grouped (`role="group"` + label link).
6. Error color = `--color-status-error-text` only.

Behavior (validation, submission, server actions) unchanged throughout.

---

## 10. Responsive Review

Key risks by breakpoint (all from code inspection — need browser confirmation):

- **320px:** slot grid buttons (36), date pills (37), cart countdown wrap (38), checkout summary loss (39), success-page price squeeze (47), service-card price burial (44), pricing CTA wrap (43), legal `list-inside` (52).
- **Mobile general:** switcher dropdown clipping (13), 36px header targets (14), StickyBookingCTA viewport share (35), watermark right-edge collisions (23).
- **Desktop wide:** blog line length (20).
- **Defensive:** no table overflow wrappers in rich-text (52); long URL/email wrap is already handled by `.gh-article-body` break-word — verify legal prose inherits it.

**Routes needing visual verification at 320 / 375 / 768 / 1024 / 1440:** `/[country]/[lang]` (each country), `/book` (all three flows), `/cart` with hold, `/checkout` (+ success), `/pricing`, `/doctors`, `/services/[slug]`, `/tests`, `/blog` + `/blog/[slug]`, `/faq`, `/contact`, `/login`, `/register`, `/patient-upload`, `/brazil/consent`.

---

## 11. Accessibility Review

**Confirmed failures (fix first):**
- Missing `<h1>` on ~11 pages (Finding 3) — WCAG 1.3.1/2.4.x.
- FAQ answers `rgba(255,255,255,0.52)` on dark (15) — below AA.
- `focus-visible:outline-none` on mobile Book CTA without adequate replacement (4) — WCAG 2.4.7.
- 36px header tap targets (14) — WCAG 2.5.5 guidance.

**High-probability failures (verify with contrast tooling):**
- Back-link `white/45` (28); BlogCard CTA border 0.22 (29 — non-text contrast 1.4.11); `gh-rich-body-dark` paragraphs at 0.72 white if ever rendered on darkest backgrounds (Finding 5-adjacent); 12px error text at `#991B1B` (borderline).

**AT/semantics gaps:** silent error/success states on reviews + newsletter (16, 32); password reveal + phone group linking (19); FAQ `aria-expanded` (15); DoctorsHero `.gh-floaty` reduced-motion (30).

**Working well (protect):** global dual-ring `:focus-visible`, `.gh-skip-link`, heading order within sections (h1 hero → h2 sections), marquee/live-dot motion gates, `aria-hidden` icon discipline in blog metadata, `aria-pressed` on DoctorFilters chips.

---

## 12. Booking / Checkout Review

Funnel-ordered summary (all fixes presentation-only; slots, holds, pricing math, Stripe, server actions untouched):

1. **Entry** (country home): wizard slots clickable during load (41); Continue without price (45); service cards bury price on mobile (44).
2. **Time selection:** weak selected states + small targets (36, 37).
3. **Details form:** slot confirmation under-weighted (40); GDPR block ungrouped (42); family-member dropdown silently filters unapproved members (worth an explanatory note — `consultation-booking-form.tsx:494–531`).
4. **Cart:** hold countdown visibility + expiry double-messaging (38); benefit selector no pending state (46).
5. **Checkout:** mobile total out of view (39); patient-name hierarchy + shipping context (47).
6. **Success:** 320px row squeeze + order-ref copy affordance (47).
7. **Pricing:** current/featured badge precedence (43).

Common thread: **the data is all there — selected states, prices, and totals just aren't visually dominant at the moment of decision, especially on mobile.**

---

## 13. Recommended Implementation Order

Lowest-risk first, building toward shared-system changes:

1. **Token sweep (low risk, no visual change):** add missing tokens, replace ~20 hardcoded colors (Finding 6, 50, 51), unify error reds. Output should be pixel-identical.
2. **Accessibility corrections (small diffs, high value):** H1s via GH2PagePrimitives (3); FAQ answer opacity + summary focus (15); remove focus-visible overrides (4); back-link + BlogCard border contrast (28, 29); form a11y linking + status roles (16, 19, 32, 49); `.gh-floaty` motion gate (30); header tap targets (14).
3. **Conversion micro-fixes (isolated components):** slot/date selected states (36, 37); wizard loading lock (41); Continue price (45); GDPR grouping (42); slot-summary emphasis (40); benefit-selector pending state (46); pricing badge precedence (43); step-icon fit (48).
4. **Cart/checkout mobile layout (medium risk, test hard):** countdown pill (38); mobile persistent total (39); success/summary polish (47); service-card mobile layout (44).
5. **Shared class extraction (wide diff, mechanical):** CTA variants + pills + on-chrome (1, 12, 25); card geometry/shadow/hover/padding + `DarkImageCardBody` (8–11, 24, 26); `.gh-input-on-chrome` + `FileUploadField` + label unification (17, 18, 21); dropdown max-height (13).
6. **System-level composition (do last, with design input):** `.gh-section` enforcement (2); hero consolidation (7); dark/light rhythm (5); watermark rule (23); card CTA density (33); blog measure (20); doctor breadcrumb (22).

Each step should end with the route verifications listed in its findings before starting the next.

---

## 14. Do Not Touch / Guardrails

- **Portals:** `/admin/**`, `/doctor/**`, `/account/**`, `frontend/components/portal-shell.tsx`, `frontend/components/portal-atoms.ts`, `frontend/app/(admin)/admin/_components/**` — no changes. Public components verified free of portal imports; keep it that way.
- **`globals.css` is shared:** the file also contains the entire portal (Obsidian Ivory) system. Only touch the public `gh-*`/`gh2-*` sections and `:root` token additions; never rename or remove a token without grepping portal usage. Changing the global `:focus-visible` block affects portals too — additive changes only.
- **Behavior frozen:** booking slot logic, hold timers, cart PATCH/benefit logic, checkout totals, Stripe redirect, server actions, form submission/validation, i18n/country/lang routing, consent copy, peak pricing, subscription logic. Every recommendation above is class/markup/attribute-level.
- **Shared primitives with non-marketing consumers:** `GH2PagePrimitives` serves auth/checkout/status pages — heading-level changes must be checked on every consumer. `renderDoctorProfilePage` (in `frontend/lib/content/`) may have multiple consumers.
- **Conversion CTAs:** any change to `gh2-btn-lime` colors must re-verify WCAG AA of text-on-lime; prefer keeping resolved values identical while tokenizing.
- **`(site)/layout.tsx` + `SiteChrome` gateway logic** (country entry gate, disclaimer rendering) — visual edits only.
- **Line numbers in this document** were read on 2026-07-04 (branch `Dev-hassaan`); re-locate before editing.

## 15. Final Checklist For Future Implementation

Per change:
- [ ] Change is visual/markup/attribute only — no logic, routing, or data-flow edits
- [ ] Colors/radii/shadows/spacing reference tokens, not literals; new values become tokens first
- [ ] The finding's "routes to verify" checked at 320 / 375 / 768 / 1440
- [ ] Both dark and light section contexts checked where the component supports both
- [ ] Keyboard pass: focus visible, order sane, no `outline-none` without replacement
- [ ] New/changed animation gated with `motion-reduce`
- [ ] Contrast of changed text/borders verified (AA minimum; body text on dark ≥ 0.75 white)
- [ ] Grep confirms no portal file consumed the changed class/token
- [ ] Screenshot diff for shared components (header, cards, heroes) across ≥3 consuming routes

Per phase (from §13):
- [ ] Booking flows smoke-tested end-to-end (service-first, doctor-first, same-day) on mobile viewport
- [ ] Cart hold + checkout + success walked through with a real (test-mode) order
- [ ] `/login`, `/register` visually consistent with public brand (not portal styling)
- [ ] No new hardcoded hex/rgba introduced (grep `#0`, `rgba(` in touched files)
- [ ] Lighthouse/axe pass on `/`, `/[country]/[lang]`, `/book`, `/checkout`, `/faq`, `/blog/[slug]`

---

*End of review. No code changes were made in producing this document.*
