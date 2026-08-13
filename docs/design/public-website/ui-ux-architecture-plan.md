# Public Website UI/UX Architecture Plan

**Branch:** `Dev-hassaan` · **Date:** 2026-07-04 · **Author:** Fable 5 (architecture) → Sonnet 5 (execution)
**Source:** Six read-only recon passes (Layout, Mobile UX, Visual Design, Cards, Booking/Conversion, A11y).

---

## 1. Executive Summary

The public site has a strong premium base: unified glass-chrome header/footer recipe, immersive dark-forest heroes with layered atmosphere, a consistent `gh2-btn-lime`/`gh2-btn-ghost` CTA pair, and a real token system in `globals.css`. The gaps are systemic, not cosmetic:

1. **Tap targets** — dozens of conversion-critical controls sit at 24–40px (cart quantity 32px, benefit pills 24px, remove button 28px, SectionNav pills 28px, filter pills 40px, newsletter form 28px, mobile-nav links ~38px, switcher menu items ~31px).
2. **Selected/disabled states** — booking selection UI relies on color-only or border-thickness-jump signals; no card system has a selected or unavailable state.
3. **Glass duplication** — three near-identical dark-glass recipes (`.gh-glass-card` class + inline copies in ServiceCard/CartServiceCard) with divergent shadows.
4. **Dark-band monotony** — home page runs 5 dark bands to 1 light; StatsBand/TrustRibbon/FAQ are flat text-on-hairline sections next to premium heroes.
5. **Mobile pressure** — 88px fixed header + hero display clamp + sticky CTA consume most of a 320px viewport; cart total invisible on mobile (summary only `lg:sticky`).
6. **Focus on dark** — `.gh-focus-on-dark` uses a dark 55%-alpha shadow that disappears on dark surfaces; SectionNav dark focus rings wash out.

This plan fixes all six systemically via shared classes in `globals.css` plus targeted component work. No new brand identity, no new dependencies, no logic changes.

---

## 2. Public Website Scope

**In scope:**
- `frontend/app/(site)/**` (all public pages incl. `[country]/[lang]` book/cart/checkout/doctors/pricing, blog, contact, faq, legal)
- `frontend/app/(auth)/(public)/**` (login, register, forgot-password, reset/verify if present) — as public access surfaces only
- `frontend/components/layout/**` public shell: SiteChrome, SiteHeader, MobileNav, SiteFooter, Container, Section, CountrySwitcher, LanguageSwitcher, SectionNav, NewsletterSignup
- `frontend/components/sections/**` public sections (HomeHero, PageHero, ServiceHero, DoctorsHero, CountryEntryGate, ServiceCatalog, DoctorCarousel, DoctorsSection, FeaturedDoctor, StatsBand, TrustRibbon, FAQSection, FinalCTA, StickyBookingCTA, GH2PagePrimitives, SameDayBooking, DoctorFilters)
- `frontend/components/cards/**` (DoctorCard, ServiceCard, BlogCard, CartServiceCard)
- `frontend/components/forms/**` public forms (ContactForm, phone-field), booking form components under `(site)`
- `frontend/app/globals.css` — public-prefixed classes only (`gh-`, `gh2-`)

**Out of scope:** everything else.

## 3. Out-of-Scope Portal Guardrails

- NEVER edit: `frontend/app/(admin)/**`, `frontend/app/(doctor)/**`, `frontend/app/(account)/**` (or `/account` route group wherever it lives), `frontend/components/portal-shell.tsx`, `frontend/components/portal-atoms.ts`, any `lux-*`/portal CSS blocks in `globals.css`.
- NEVER change: backend, DB, booking/slot/assignment logic, cart pricing math, checkout/Stripe calls, auth redirects, server actions, medical/legal copy meaning.
- `globals.css` edits must only touch `gh-`/`gh2-` public classes and public-only tokens. Do not rename or delete any class a portal file might import; additive changes + edits to public-only selectors only. Grep before altering any shared selector: `grep -rn "<classname>" frontend/app/(admin) frontend/app/(doctor) frontend/components/portal-shell.tsx frontend/components/portal-atoms.ts`.
- After CSS work, smoke `/account`, `/doctor`, `/admin` render unchanged.
- `AppointmentCard.tsx` / `PortalMobileCard.tsx` are portal components — do not touch.

## 4. Current UI/UX Problems (consolidated, with file anchors)

**Tap targets below 44px (WCAG 2.5.5/2.5.8):**
- `SectionNav.tsx:31` pills `px-4 py-2` ≈ 28px
- `CountrySwitcher.tsx` / `LanguageSwitcher.tsx` dropdown items `padding: 9px 12px` ≈ 31px
- `MobileNav.tsx:198,234,270` drawer links `py-3` ≈ 37–41px; close button `p-2` ≈ 28px (`MobileNav.tsx:180`)
- `globals.css:613–621` newsletter input/button ≈ 28px
- `cart/page.tsx:604,620` qty buttons `size-8` = 32px; `:638` remove `px-2.5 py-1.5` ≈ 28px; `:546` benefit pills `py-1 text-[12px]` ≈ 24px
- `consultation-booking-form.tsx:581–600` benefit radio pills ≈ 24px
- `SameDayBooking.tsx:242` time chips `py-1.5` ≈ 28px
- `DoctorCarousel.tsx:122–127` prev/next `size-10` = 40px; `DoctorsSection.tsx:71–96` pager `size-10`
- `globals.css:6850` `.gh2-pill-filter` min-height 40px

**Selected/disabled state weakness:**
- Date pills/time chips: unselected = 1px hairline border, selected = 2px + fill → border-width jump, color-only (`service-time-picker.tsx:119`, `slot-picker-step.tsx:123,162`)
- Benefit pills: bg swap only, no focus ring (`consultation-booking-form.tsx:587`, `cart/page.tsx:546`)
- SameDayBooking language list: bg-color-only selection, no checkmark (`SameDayBooking.tsx:320–337`)
- DoctorCard/ServiceCard: no selected or unavailable variant at all
- Disabled "Add to cart": opacity-only (`consultation-booking-form.tsx:904`)
- Step indicator: completed ≈ active visually (`book/page.tsx:900–917`)

**Glass/surface duplication & drift:**
- `.gh-glass-card` (`globals.css:1442`) vs inline copies in ServiceCard dark + CartServiceCard (identical recipe minus box-shadow)
- Radius drift: 22px (HomeHero panel, ServiceHero checklist) vs 20px token
- Hardcoded `#1D4B36`/`rgba(29,75,54,…)` alpha variants inline across DoctorCard/ServiceCard

**Visual flatness / rhythm:**
- StatsBand, TrustRibbon, FAQSection: pure text + hairline, zero depth next to 5-layer heroes
- Home page: 5 dark bands vs 1 light (Hero, ServiceCatalog, DoctorsSection, StatsBand, FinalCTA + dark footer)
- DoctorCarousel and DoctorsSection render identical grids (no role differentiation)
- Button height triad 56/48/44 without semantic tiering; hover elevation inconsistent (shadow vs brightness)

**Focus/contrast on dark:**
- `.gh-focus-on-dark` (`globals.css:6874`) = dark 55%-alpha shadow → invisible on dark surfaces
- `SectionNav.tsx:36–37` dark focus rings: lime-on-lime active, white/40 inactive → wash out
- Muted white text `rgba(255,255,255,0.55)` on dark glass ≈ 3.2:1 → CRIT contrast fail
- Lime small-text on forest glass ≈ 2.8:1 in hero badge

**Mobile pressure:**
- `--header-height: 88px` fixed (27% of 320px viewport)
- `--text-display: clamp(3rem, 7vw+1rem, 6rem)` dominates 320–390px screens
- Cart summary only `lg:sticky`; mobile users change quantities blind to total (`cart/page.tsx:310`)
- Checkout mobile recap exists but non-sticky (`checkout/page.tsx:376–392`)
- phone-field dial select `max-w-[150px]` cramps number input at 320px

**Forms/status:**
- Newsletter: no aria-live, "…" as loading state, no spinner (`NewsletterSignup.tsx:88–101`)
- No required-field indicators anywhere public (`.gh-field-label` has no required variant)
- `LoginForm.tsx:192` `role="status"` without explicit aria-live
- SameDayBooking availability fetch fail is silent — renders as empty state (`SameDayBooking.tsx:166–188`)
- `DoctorFilters.tsx:66` `aria-pressed` on `<Link>` (invalid semantics)

**Hydration/slug safety:**
- `SiteFooter.tsx:121–125` slug fallback chain exists (`c.slug || map || code.toLowerCase()`) — verify all other places building `/{country}/{lang}` links (switchers, MobileNav, entry gate) share this fallback; extract one helper if any diverge
- `globalThis.document` / `document.cookie` calls in switcher handlers (`CountrySwitcher.tsx:66`, `LanguageSwitcher.tsx:25`, `MobileNav.tsx:70`) — all inside click handlers so SSR-safe, but standardize on one guarded helper

## 5. Mobile-First Design Problems

1. 320px viewport: header (88px) + hero title (≥48px×2–3 lines) + sticky CTA (≈60px) leaves <200px content.
2. Cart/checkout: total invisible while acting on items; must scroll to find "Continue".
3. Sub-44px conversion controls concentrated exactly where thumbs work (qty, benefit, remove, time chips).
4. `SlotPickerStep` time grid `grid-cols-3 sm:4 md:5 lg:6` vs `ServiceTimePicker` `2 sm:3 lg:4` — same UI, arbitrary divergence.
5. Drawer nav links slightly under target; language section can pop in post-hydration with no reserve.
6. Filter groups can stack 300–400px tall on 320px with no collapse.

## 6. Visual Design Direction

Keep: dark forest (#1D4B36 / night #0F2E25 / deep #031F18), lime #B0F122, warm ivory, glass chrome, arch/editorial hero language, mono indices (`gh2-index`), tabular stats.

Adjust:
- **Rhythm over darkness.** Long pages alternate: dark hero → light trust → dark feature band → light content → dark CTA. Max 2 loud dark bands between hero and footer.
- **Depth for flat sections.** StatsBand/TrustRibbon/FAQ gain quiet surface treatment (soft card fills, icon tiles, accent hairline) — NOT glass, NOT decoration stacks. Calm clinical depth.
- **One elevation language.** Hover = translateY(-2px) + shadow step; kill `brightness()` hover on buttons where it coexists with shadow hover.
- **Token discipline.** 22px radii → `var(--radius-card)` (20px). New inline rgba(29,75,54,…) forbidden; reuse tokens.

## 7. Glassmorphic Card Strategy

Single source of truth in `globals.css`:

```css
/* Dark forest glass — cards/panels on dark sections */
.gh2-glass {
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-card);
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
/* Deep emerald variant — trust badges, floating hero cards (replaces .gh-glass-emerald usage growth) */
.gh2-glass-deep {
  background: rgba(8, 42, 32, 0.72);
  border: 1px solid rgba(176, 241, 34, 0.16);
  border-radius: var(--radius-card);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
}
/* Frosted ivory glass — light panels over imagery (ServiceHero checklist family) */
.gh2-glass-ivory {
  background: rgba(245, 255, 248, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-card);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  box-shadow: 0 22px 60px rgba(3, 31, 24, 0.28);
}
/* Interactive glass card hover — clickable cards ONLY */
.gh2-glass-hover { transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
.gh2-glass-hover:hover { transform: translateY(-3px); border-color: rgba(255,255,255,0.22); box-shadow: 0 24px 60px rgba(0,0,0,0.3); }
@media (prefers-reduced-motion: reduce) { .gh2-glass-hover { transition: none; } .gh2-glass-hover:hover { transform: none; } }
```

Adoption map:
- ServiceCard dark + CartServiceCard: replace inline glass recipe with `.gh2-glass` (+ `.gh2-glass-hover` when clickable). Keep image/price-chip internals.
- DoctorCard dark: swap `gh-glass-card` → `gh2-glass gh2-glass-hover` (leave `.gh-glass-card` definition in place for any other consumer; do not delete).
- Booking selection summary cards, checkout order summary (dark contexts), auth card (see §14), hero support panels new work: use these classes.
- Do NOT glass: legal text pages, blog article bodies, FAQ answer bodies, long form fieldsets.
- Readability rule: body text on `.gh2-glass` must be ≥ rgba(255,255,255,0.78); muted text ≥ 0.70 (fixes 3.2:1 CRIT).

## 8. Public CTA Hierarchy

Formalize existing classes; adjust sizes; add missing tiers. All in `globals.css`.

| Tier | Class | Height | Notes |
|---|---|---|---|
| 1. Page primary | `.gh2-btn-lime` | 56px desktop / **48px min mobile** (add `@media (max-width: 640px){ min-height:48px; height:auto; }`) | keep lime + shadow; remove `brightness()` from hover, keep translateY+shadow |
| 2. Page secondary | `.gh2-btn-ghost` | matches primary | keep; add visible focus ring on dark (see §15) |
| 3. Card primary | `.gh2-btn-compact-primary` | **48px min** (raise from 44) | forest fill on light, lime on dark contexts |
| 4. Card secondary | `.gh2-btn-compact-secondary` / `.gh2-btn-outline` | 48px min | outline; max one per card |
| 5. Compact booking action | `.gh2-btn-book` (new alias or keep compact) | 44px hard min | slot/continue chips context |
| 6. Filter pill | `.gh2-pill-filter` | **44px min** (raise from 40) | must style `[aria-pressed="true"]` and `[data-active="true"]`: forest fill + white text + 2px transparent-to-forest border; never color-alone |
| 7. Footer/newsletter | `.gh-footer-newsletter` input+button | **48px min both** | dark-surface variant, lime focus ring, error/success text slots |

Rules: one Tier-1 per major section; DoctorCard "View profile" demotes to outline/text-link when beside "Book".

## 9. Public Card Hierarchy

| Card | Surface | Required states |
|---|---|---|
| DoctorCard | light: white + `--shadow-card`; dark: `.gh2-glass .gh2-glass-hover` | hover, focus-within, (booking context) selected |
| ServiceCard | light: white; dark: `.gh2-glass .gh2-glass-hover` | hover, focus-within |
| Booking selection (date pill/time chip/benefit pill/service pick) | see §13 selection pattern | default / hover / selected / disabled — never color-alone |
| BlogCard | plain `.gh-card .gh-card-hover` (no glass — editorial) | hover |
| Cart/checkout summary | light page: white card; add mobile sticky total bar (§13) | loading / error / empty |
| Trust/review/stat tiles | quiet ivory fill `var(--color-background-soft)` + icon tile, NO glass | static (no hover jump) |

Shared selection pattern (new, `globals.css`):

```css
.gh2-selectable {
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-background-soft);
  min-height: 44px;
  transition: border-color .15s ease, background-color .15s ease;
}
.gh2-selectable:hover { border-color: var(--color-brand-primary); }
.gh2-selectable[aria-pressed="true"], .gh2-selectable[data-selected="true"], .gh2-selectable[aria-selected="true"] {
  border-color: var(--color-brand-primary);
  background: var(--color-brand-primary);
  color: #fff;
}
.gh2-selectable:disabled { opacity: .45; cursor: not-allowed; text-decoration: line-through; }
/* dark-surface variant */
.gh2-selectable-dark { border: 2px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); }
.gh2-selectable-dark[aria-pressed="true"], .gh2-selectable-dark[data-selected="true"] {
  border-color: var(--color-brand-accent); background: var(--color-brand-accent); color: #0a1f1a;
}
```

Key: border is ALWAYS 2px (transparent state change only) → no size jump. Selected pairs fill + border + (where listed) a check icon → not color-alone.

## 10. Public Section Rhythm

- Deduplicate `.gh-section` family: single definition, spacing via `--space-section: clamp(4rem, 3rem + 4vw, 7.5rem)`; variants `.gh-section-sm`, `.gh-section-tight` derive from it. Remove/merge duplicate blocks found around `globals.css:362–370` (grep for every `.gh-section` occurrence first; portals must not consume these — verify).
- Home page band order becomes: Hero (dark) → TrustRibbon (light) → ServiceCatalog (dark, feature band) → DoctorsSection (**switch to light/ivory theme**) → StatsBand (**light theme on home**) → FinalCTA (dark). Net: 3 dark bands incl. hero. If DoctorsSection lacks a light theme prop, add `theme?: "dark" | "light"` prop defaulting to current behavior; only home passes light.
- Flat-section lift (quiet, no glass):
  - **TrustRibbon**: icon tiles get mint-soft fill + 12px radius; row gains top accent hairline (2px lime at 24% on light); numbers keep tabular style.
  - **StatsBand**: each stat cell gets soft card fill (`--color-background-soft`, 16px radius, no shadow) + lime accent bar on first stat only.
  - **FAQSection**: each `<details>` becomes a soft-framed item (radius 14px, border white/10 on dark, bg white/[0.04]); expanded item bg white/[0.07]; keep native details/summary.
- ServiceCatalog: pagination controls restyle to pill pager (44px targets); no layout change.
- DoctorCarousel vs DoctorsSection role split is OUT of this pass (logic-adjacent); only unify card grid gap tokens.

## 11. Public Form/Status System

- `.gh-field-label` gains required marker: `.gh-field-label[data-required]::after { content:" *"; color: var(--color-status-error); }` + apply `data-required` + `aria-required` to required inputs in booking/checkout/contact/auth forms.
- Status messages: standardize on `.gh-status-error` / `.gh-status-success` / `.gh-status-info` blocks; every async form status container gets `aria-live="polite"` (errors `role="alert"`). Files: NewsletterSignup, ContactForm, LoginForm/Register/Forgot, checkout error block, cart benefit error, SameDayBooking.
- NewsletterSignup: input+button 48px; loading = spinner icon + `aria-busy="true"`; status text in aria-live region.
- phone-field: dial select `max-w-[130px] sm:max-w-[150px]`, gap-2, number input `min-w-0 flex-1`; both 48px height.
- SameDayBooking fetch failure: distinguish catch → set `error` state → render amber notice "Couldn't load times — retry" with retry button (UI-only state, no logic change to endpoints).
- Booking form: benefit pills adopt `.gh2-selectable` (44px); address fieldset gets one-line context note at fieldset top (copy exists at line 787 — move/echo to top, do not change meaning); "someone else" toggle scrolls revealed section into view (`ref.scrollIntoView({behavior:"smooth", block:"nearest"})` guarded by prefers-reduced-motion).

## 12. Header / Mobile Navigation Plan

- `--header-height`: 88px desktop, **72px ≤768px** (media query on the token or a `--header-height-mobile` consumed by `.gh-header-sticky` + scroll-margin users). Verify anchors/scroll-margin-top consumers after change.
- SectionNav pills: `min-height: 44px` (py adjust); dark focus ring → `focus-visible:ring-2 ring-white/80 ring-offset-2 ring-offset-[#0F2E25]`; active pill focus ring stays white (not lime-on-lime).
- SectionNav dark gap: 2px → 8px.
- Switcher dropdown items: `min-height: 44px; padding: 10px 14px;` + explicit focus-visible bg (`--color-background-mint-soft` or forest/8%) + checkmark icon on active item.
- MobileNav: links `min-h-[44px] py-3.5`; close button `p-3` inside 44px box; Book CTA stays `gh-btn-primary`; language section container reserves min-height to avoid pop-in.
- SiteHeader: bell/account keep `size-11`, drop `-mx-1` negative margins; Book CTA `min-h-12` so wrap never dips below 44px.
- Scroll listener: wrap state set in rAF guard (cheap, no behavior change).

## 13. Booking / Cart / Checkout UX Plan (UI only — zero logic changes)

- **Selection pattern adoption:** date pills + time chips in BOTH `service-time-picker.tsx` and `slot-picker-step.tsx` → `.gh2-selectable` (light) with check icon on selected date pill; SameDayBooking chips → `.gh2-selectable-dark`; language dropdown options get leading check icon on selected. Unify time-grid columns: both pickers `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` (do NOT merge the two components in this pass — visual parity only).
- **Tap targets:** cart qty → `size-11`; remove → icon+label `min-h-11 px-3`; benefit pills (cart + form) → `.gh2-selectable` 44px; disabled minus keeps size, adds `aria-disabled`.
- **Mobile sticky total:** new tiny client component `MobileOrderTotalBar` (public, shared by cart + checkout): fixed bottom bar `md:hidden`, shows `Total {formatted}` + primary action ("Continue to checkout" / "Pay securely"), `.gh2-glass-deep` surface, safe-area padding, hidden when the real summary/action block is in viewport (IntersectionObserver on the existing summary node). Reuses existing computed totals via props — no recalculation.
  - StickyBookingCTA must not co-render with it (cart/checkout don't render StickyBookingCTA — verify).
- **Step indicator:** completed steps mute to forest/60% + smaller check; active step gains lime underline bar + `aria-current="step"`; add sr-only "Step X of Y".
- **Empty/error states:** standardize block = icon (lucide, aria-hidden) + heading + body + one CTA. Apply to: "No open slots" (both pickers — add "Pick another clinician/day" CTA where href exists in current code), SameDayBooking no-times (+ retry per §11), cancelled page (keep copy, add icon + "Back to cart" primary emphasis).
- **Checkout success:** processing state adds gentle note "usually under 30 seconds"; receipt-fetch-fail fallback upgrades from small gray text to `.gh-status-info` callout. No polling changes.
- **Slot-hold countdown:** give it a fixed line (no wrap) with `tabular-nums`; no timing changes.
- **DoctorFilters:** `aria-pressed` on `<Link>` → replace with `aria-current={active ? "page" : undefined}` + `data-active` styling via `.gh2-pill-filter`.

## 14. Auth Public Shell Plan

- One shared shell for login/register/forgot/reset/verify: dark forest backdrop (reuse PageHero atmosphere lite — single gradient + one radial glow, NOT 5 layers), centered `.gh2-glass` card (max-w-[440px]), logo on top, footer microcopy links (privacy/terms).
- Card interior: white/ivory form panel inside glass frame OR direct glass with high-contrast inputs — choose based on existing `.gh-input` rendering on dark; if `.gh-input` is light-only, wrap fields in an ivory inner panel (`.gh2-glass-ivory`) for readability.
- Forms keep all existing behavior/redirects; add: required markers, `aria-live` on status, `autocomplete` attrs verified (`email`, `current-password`, `new-password`), 48px inputs/buttons (`.gh-input` is already 48px — verify auth uses it).
- Mobile: card full-bleed with 20px gutter at ≤430px; no viewport-height centering trick that hides submit under keyboard — top-aligned scroll layout.

## 15. Accessibility Plan

1. **Focus on dark (systemic):** redefine `.gh-focus-on-dark`: `outline: 2px solid var(--color-brand-accent); outline-offset: 2px; box-shadow: 0 0 0 5px rgba(3,31,24,0.85);` — lime ring + dark halo = visible on both lime and forest fills. Apply class to: footer links, MobileNav triggers/links, FAQ summary, SectionNav dark, newsletter controls, FinalCTA buttons, hero ghost buttons.
2. **Contrast:** dark-glass muted text 0.55 → 0.70+ alpha (DoctorCard dark meta, card chips); lime small-text on glass → either 16px+/bold or swap to white text with lime icon. Global `:focus-visible` halo 0.9 → 1.0 white.
3. **Semantics:** filter pills = real `<button>` or `aria-current` links (§13); carousel prev/next `size-11` + keep labels; FAQ add `aria-controls`/`id` pairs (keep native details).
4. **Forms:** required indicators + aria-required; error containers `role="alert"`; status `aria-live="polite"`; newsletter announce success.
5. **Keyboard:** SectionNav service dropdown — ensure Escape closes and focus returns to trigger; arrow-key nav only if currently Radix-based (verify; if plain disclosure, Tab order + Escape is the bar for this pass).
6. **Motion:** all new transitions get `prefers-reduced-motion` guards (pattern exists — 14 blocks in globals.css).
7. **Alt text:** DoctorCard alt fallback → `` `${name}, ${primarySpecialty}` `` when specialty available.

## 16. Responsive Breakpoint Plan

| Range | Rules |
|---|---|
| 320–430 | header 72px; `--text-display` bottom clamp → 2.5rem (`clamp(2.5rem, 7vw + 1rem, 6rem)`); single-column everything; sticky bars respect `env(safe-area-inset-bottom)`; filter rows `overflow-x-auto` snap scroll where wrap exceeds ~2 rows |
| 431–767 | 2-col card grids allowed from 640px only if card ≥ 280px wide |
| 768–1023 | header 88px resumes; time grids ≤4 cols; Container needs `md:px-10` bridge (px-5→sm:px-8→**md:px-10**→lg:px-12) |
| 1024–1439 | current layouts OK; verify header row uncrowded at 1024 (known pre-existing overflow was fixed in 0fb91a01 — re-verify) |
| 1440–1920 | Container max-width unchanged; card grids cap at 3 cols; hero art scales, no stretched cards |

No horizontal overflow at any step — verify via `document.documentElement.scrollWidth === clientWidth` at each width.

## 17. File-by-File Implementation Map

**globals.css (one owner — Wave 1):**
- Dedupe `.gh-section` family; section spacing token
- Add `.gh2-glass`, `.gh2-glass-deep`, `.gh2-glass-ivory`, `.gh2-glass-hover`
- Add `.gh2-selectable`, `.gh2-selectable-dark`
- Fix `.gh-focus-on-dark`; bump global focus halo to 1.0
- `.gh2-btn-lime` mobile 48px + drop brightness hover; `.gh2-btn-compact-*` min 48px; `.gh2-pill-filter` min 44px + pressed styling
- Newsletter block: 48px controls, focus, status colors
- `--header-height` mobile override; `--text-display` mobile clamp floor
- `.gh-field-label[data-required]` marker
- Container `md:px-10` (if Container uses CSS class; else in Container.tsx)

**Wave 2 (parallel, disjoint files):**
- **A. Shell:** `SiteHeader.tsx`, `MobileNav.tsx`, `SiteFooter.tsx`, `SectionNav.tsx`, `CountrySwitcher.tsx`, `LanguageSwitcher.tsx`, `NewsletterSignup.tsx`, `Container.tsx` — §12 + slug-helper audit (§4 last block) + newsletter §11
- **B. Cards:** `DoctorCard.tsx`, `ServiceCard.tsx`, `CartServiceCard.tsx`, `BlogCard.tsx` — glass adoption, contrast bumps, alt text, CTA heights, remove inline recipe duplicates
- **C. Booking/cart/checkout:** `book/page.tsx` (step indicator, empty states), `service-time-picker.tsx`, `slot-picker-step.tsx`, `consultation-booking-form.tsx` (pills, required, context note, scroll-into-view), `cart/page.tsx` (qty/remove/benefit targets, error placement), `checkout/page.tsx` (+ success/cancelled pages), new `MobileOrderTotalBar` component, `SameDayBooking.tsx` (chips, retry state), `DoctorFilters.tsx`, `DoctorCarousel.tsx` + `DoctorsSection.tsx` (pager/arrow sizes only)
- **D. Sections:** `TrustRibbon.tsx`, `StatsBand.tsx`, `FAQSection.tsx`, `ServiceCatalog.tsx` (pager), home page composition (DoctorsSection/StatsBand light themes), `StickyBookingCTA.tsx` (safe-area), `FinalCTA.tsx` (focus classes)
- **E. Auth:** `(auth)/(public)/login|register|forgot-password|…` + shared shell component per §14

**Wave 3:** validation + visual QA (§19).

## 18. Risk Classification

| Risk | Items | Mitigation |
|---|---|---|
| LOW | tap-target paddings, focus classes, contrast alphas, alt text, aria attrs, newsletter states, glass class adoption (visual parity first) | mechanical; visual diff |
| MEDIUM | `.gh-section` dedupe, `--header-height` mobile change, `--text-display` clamp, Container md padding, home band re-theming, selection-pattern swap in pickers | grep all consumers first; screenshot before/after at 5 widths |
| MEDIUM+ | MobileOrderTotalBar (new fixed element near forms/keyboards), auth shell rework | IntersectionObserver hide rule; keyboard-open manual check; auth flows must keep exact form actions/redirects |
| GUARD | any `globals.css` selector also matched by portal markup | grep `(admin)`, `(doctor)`, portal-shell/atoms before edit; portal smoke after |

Blocker protocol: if a file reveals portal coupling or logic entanglement, skip that item, note it in final report, continue.

## 19. Verification Checklist

1. `pnpm --filter frontend typecheck` · `pnpm --filter frontend lint` · `pnpm --filter frontend build` — all green
2. Routes render: `/`, `/ireland/en`, `/ireland/en/book`, `/ireland/en/cart`, `/ireland/en/checkout`, `/ireland/en/doctors`, `/ireland/en/pricing`, `/blog`, `/contact`, `/faq`, `/privacy`, `/terms`, `/login`, `/register`, `/forgot-password`
3. Widths: 320/360/390/430/768/1024/1280/1440/1920 — no horizontal overflow, hero balanced, sticky bars don't cover inputs
4. Keyboard: header tab order, mobile nav (Esc/focus return), switchers, filters, booking steps, checkout form, FAQ, auth, newsletter — visible focus everywhere incl. dark surfaces
5. Tap targets ≥44px: qty, remove, benefit, time chips, date pills, filter pills, nav links, switcher items, newsletter, carousel arrows
6. States: selected date/time obvious without color; disabled add-to-cart announced; empty cart/no-slots/error blocks render with CTA
7. Portal smoke: `/account`, `/doctor`, `/admin` visually unchanged
8. Playwright e2e if present: run public suites only

## 20. Exact Execution Order (Sonnet 5)

1. **Wave 1 — globals.css** (single agent, full §17 Wave-1 list). Build must stay green before Wave 2.
2. **Wave 2 — five parallel agents A–E** (disjoint file sets per §17). Each agent: read spec section(s) cited, implement exactly, run `pnpm --filter frontend typecheck` on completion, report deviations.
3. **Wave 3 — validation:** typecheck + lint + build; warm dev server; route/viewport/a11y sweep per §19; portal smoke; fix residuals inline.
4. Report per the 17-point final-response template.

Deviation rule: safest public-website-only choice, documented. Never widen scope to portals/logic.
