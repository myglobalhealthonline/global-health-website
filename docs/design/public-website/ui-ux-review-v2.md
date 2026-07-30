# Public Website UI/UX Review — Global Health

**Date:** 2026-07-04  
**Type:** Review only. No source components, styles, routes, backend logic, auth logic, booking logic, checkout logic, or portal files were edited.  
**Rerun note:** `docs/archive/2026-public-website-redesign/ui-ux-review.md` already existed, so this fresh pass was written as `docs/design/public-website/ui-ux-review-v2.md`.

## 1. Executive Summary

The public website has a strong current direction: forest green, lime accent, rounded clinical cards, medical-pattern surfaces, arch imagery, and a premium telehealth tone. The site does not need a new visual identity.

The main issue is still consistency enforcement. The codebase has useful public tokens and primitives, but shared public components often bypass them with inline colors, local button recipes, local spacing clamps, and per-component focus styles. The highest-impact future work is to consolidate public CTA/card/form primitives, fix conversion-flow touch targets, and protect the header/footer/booking/checkout surfaces from small regressions.

Runtime sampling confirmed several routes render locally, with no horizontal overflow in sampled successful pages at 390px and 1440px. It also exposed conversion and chrome issues: 36-42px tap targets in header and booking cards, a public footer hydration mismatch for dynamically supplied country links, auth pages outside the public chrome/skip-link shell, and backend-unavailable fallbacks affecting blog/cart/checkout/auth-dependent states.

## 2. Scope Reviewed

Public routes reviewed from code:

- `/`
- `/[country]/[lang]`
- `/[country]/[lang]/book`
- `/[country]/[lang]/cart`
- `/[country]/[lang]/checkout`
- `/[country]/[lang]/checkout/success`
- `/[country]/[lang]/checkout/cancelled`
- `/[country]/[lang]/consult/[serviceSlug]`
- `/[country]/[lang]/doctors`
- `/[country]/[lang]/doctors/[doctorSlug]`
- `/[country]/[lang]/services/[serviceSlug]`
- `/[country]/[lang]/tests`
- `/[country]/[lang]/tests/[testSlug]`
- `/[country]/[lang]/health/[slug]`
- `/[country]/[lang]/prescriptions`
- `/[country]/[lang]/pricing`
- `/blog`
- `/blog/[slug]`
- `/about`
- `/faq`
- `/contact`
- `/privacy`
- `/terms`
- `/patient-upload`
- `/brazil/consent`
- `/reviews/rate`
- `/verify/certificate/[id]`
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`

Public components reviewed:

- `frontend/components/layout/SiteChrome.tsx`
- `frontend/components/layout/SiteHeader.tsx`
- `frontend/components/layout/SiteFooter.tsx`
- `frontend/components/layout/MobileNav.tsx`
- `frontend/components/layout/Container.tsx`
- `frontend/components/layout/Section.tsx`
- `frontend/components/layout/Breadcrumbs.tsx`
- `frontend/components/layout/CountrySwitcher.tsx`
- `frontend/components/layout/LanguageSwitcher.tsx`
- `frontend/components/layout/SectionNav.tsx`
- `frontend/components/layout/NewsletterSignup.tsx`
- `frontend/components/sections/HomeHero.tsx`
- `frontend/components/sections/CountryEntryGate.tsx`
- `frontend/components/sections/PageHero.tsx`
- `frontend/components/sections/DoctorsHero.tsx`
- `frontend/components/sections/ServiceHero.tsx`
- `frontend/components/sections/ServiceCatalog.tsx`
- `frontend/components/sections/DoctorCarousel.tsx`
- `frontend/components/sections/DoctorsSection.tsx`
- `frontend/components/sections/FeaturedDoctor.tsx`
- `frontend/components/sections/StatsBand.tsx`
- `frontend/components/sections/TrustRibbon.tsx`
- `frontend/components/sections/FAQSection.tsx`
- `frontend/components/sections/FinalCTA.tsx`
- `frontend/components/sections/GH2PagePrimitives.tsx`
- `frontend/components/cards/DoctorCard.tsx`
- `frontend/components/cards/ServiceCard.tsx`
- `frontend/components/cards/BlogCard.tsx`
- `frontend/components/cards/CartServiceCard.tsx`
- `frontend/components/forms/ContactForm.tsx`
- `frontend/components/forms/phone-field.tsx`
- `frontend/app/globals.css`

Runtime sampled:

- Mobile 390×844: `/ireland/en/book`, `/ireland/en/checkout`, `/blog`, `/contact`, `/login`, `/privacy`
- Desktop 1440×1000: `/`, `/ireland/en`, partial `/ireland/en/book`
- Dev server started with `pnpm --filter frontend dev`

Intentionally excluded:

- `/admin/**`
- `/doctor/**`
- `/account/**`
- `frontend/components/portal-shell.tsx`
- `frontend/components/portal-atoms.ts`
- `frontend/app/(admin)/admin/**`
- `frontend/app/(doctor)/doctor/**`
- backend implementation, Stripe behavior, server actions, database, auth business logic, cart pricing logic

Environment constraints:

- Backend at `127.0.0.1:4000` was unavailable during the public runtime pass. Blog used fallback content; `/api/auth/me`, `/api/me/cart-preview`, and cart proxy calls returned backend fetch failures.
- Initial mobile navigation to `/` and `/ireland/en` timed out during cold Turbopack compilation, then later desktop requests rendered. Treat root mobile visual state as not fully verified in this pass.
- `/ireland/en/services` returned 404; the codebase currently has service detail routes, not a country service index route at that exact path.

## 3. Overall Design Assessment

Strengths:

- The public brand world is coherent: dark forest surfaces, lime accent, warm off-white backgrounds, medical-pattern texture, and arch/framed imagery.
- `globals.css` contains strong primitives: brand colors, radii, shadows, `gh-input`, `gh-card`, `gh2-btn-lime`, `gh2-btn-ghost`, skip link, reduced-motion handling, and global `:focus-visible`.
- Booking has moved toward clearer step separation. Date pills and time grids now use stronger selected states than older patterns, and the slot grid has fixed min-heights.
- Public auth pages are visibly branded and polished enough to belong to the public access surface.

Consistency gaps:

- Public button systems remain fragmented across `gh-btn`, `gh2-btn-*`, header-specific CTAs, card-specific inline buttons, filter pills, newsletter buttons, and compact booking buttons.
- `globals.css` defines section/card systems more than once. Later declarations override earlier token-driven rules, making the intended public rhythm hard to reason about.
- Cards share a brand mood but not a strict hierarchy. Doctor, service, cart-service, and blog cards use different radii, CTAs, hover behavior, and image rules.
- Form surfaces are split between shared `.gh-input` fields, footer newsletter custom fields, public auth inline styling, file upload local styling, and several one-off error styles.
- Accessibility primitives exist, but local overrides weaken them: `focus-visible:outline-none` appears in key public components, some rings are low contrast, FAQ answer text is faint, and public auth pages do not render the site skip link.

## 4. Severity Summary

| Severity | Meaning | Count | Main Examples |
|---|---|---:|---|
| S0 | Minor local polish | 1 | Legal/content prose CTA polish |
| S1 | Repeated public pattern issue | 3 | Blog/content fallback polish, missing service index review target, switcher menu/style drift |
| S2 | Shared public component issue | 7 | Footer hydration link mismatch, header tap targets, card inconsistency, form split, contrast/focus issues, auth shell, portal/global CSS coupling |
| S3 | Global public website system issue | 3 | CTA fragmentation, section spacing duplication, scattered hardcoded visual styles |
| S4 | Booking / checkout / conversion-critical issue | 2 | Booking card 36px actions, checkout/cart degraded fallback clarity |

## 5. Findings

### Finding 1 — Dynamic country links can hydrate to `/undefined/...`

**Severity:** S2  
**Area:** Footer / Public chrome / Navigation  
**Files or components involved:**

- `frontend/components/layout/SiteFooter.tsx`
- `frontend/components/layout/CountrySwitcher.tsx`
- `frontend/lib/routing/country-slug.ts`
- `frontend/lib/routing/path-rewrites.ts`

**What I observed:**  
Runtime logs showed React hydration mismatches where server-rendered footer links such as `/brazil/pt` and `/romania/ro` became client links like `/undefined/pt` and `/undefined/ro`. The footer builds clinic links using `COUNTRY_CODE_TO_SLUG[c.code]`, while the client-side country slug registry is only seeded statically until runtime registration happens. `path-rewrites.ts` also captures `COUNTRY_SLUGS` once at module load, so admin-added country slugs can be missed by client parsing.

**Why it matters:**  
This is a shared public chrome issue. Broken country links damage trust and navigation, especially on global pages where users rely on the footer and country switcher to enter the correct country site.

**Recommended future fix:**  
Use the `CountryConfig.slug` already present on `countries` props for footer and switcher href generation instead of reading a proxy map that may not be warm on the client. Make `parseSitePath` consult `COUNTRY_SLUG_TO_CODE` dynamically or accept slugs from the current countries list rather than a module-load `Set`.

**Routes to verify after implementation:**

- `/`
- `/about`
- `/blog`
- `/ireland/en`
- Any route after backend returns admin-added countries such as Brazil

**Risk notes:**  
Header/footer changes affect every public page. Verify country switching with a non-empty cart because `CountrySwitcher` also clears cart on confirmed country changes.

### Finding 2 — Public CTA systems remain fragmented

**Severity:** S3  
**Area:** Buttons / CTAs / Design system  
**Files or components involved:**

- `frontend/app/globals.css`
- `frontend/components/layout/SiteHeader.tsx`
- `frontend/components/layout/NewsletterSignup.tsx`
- `frontend/components/sections/ServiceCatalog.tsx`
- `frontend/components/cards/DoctorCard.tsx`
- `frontend/components/cards/ServiceCard.tsx`
- `frontend/components/cards/CartServiceCard.tsx`
- `frontend/components/cards/BlogCard.tsx`

**What I observed:**  
The public website uses at least six button recipes: `.gh2-btn-lime`, `.gh2-btn-ghost`, legacy `.gh-btn-*`, header-specific lime CTAs, custom card buttons, filter pills, and the square footer newsletter button. The same action weight can appear as a 56px lime pill, 52px legacy button, 48px card CTA, 44px service tile CTA, or 36px booking-card CTA.

**Why it matters:**  
Users learn CTA meaning from repeated visual treatment. When booking, browsing, adding to cart, and reading actions use different dimensions and shadows without a documented hierarchy, the public site feels less intentional and future changes become risky.

**Recommended future fix:**  
Define a public CTA hierarchy and migrate components to shared classes without changing behavior first:

- Page primary: `gh2-btn-lime`
- Page secondary on dark: `gh2-btn-ghost`
- Card primary: shared 48px class
- Card secondary: shared outline/ghost class
- Compact booking action: minimum 44px class
- Filter pill: shared pressed/unpressed class
- Newsletter-on-dark: documented footer form button variant

**Routes to verify after implementation:**

- `/ireland/en`
- `/ireland/en/book`
- `/ireland/en/doctors`
- `/ireland/en/pricing`
- `/blog`
- `/contact`

**Risk notes:**  
Do not rename `.gh-btn-*` globally without checking portal overrides in `globals.css`. Portal styles also target `.gh-btn`.

### Finding 3 — Booking selection cards still use sub-44px actions

**Severity:** S4  
**Area:** Booking / Conversion / Mobile  
**Files or components involved:**

- `frontend/app/(site)/[country]/[lang]/book/page.tsx`
- `frontend/components/cards/DoctorCard.tsx`

**What I observed:**  
The mobile runtime pass found several booking actions at 36px high: service choice `View` and `Continue`, and compact doctor-card `View` / `Continue` actions. These are high-value conversion controls inside `/ireland/en/book`.

**Why it matters:**  
Booking is the primary conversion flow. Controls below 44px are harder to tap on mobile and feel less important than page-level CTAs, even though they are the next-step actions.

**Recommended future fix:**  
Raise compact booking action buttons to at least 44px high, keep labels short, and maintain a clear distinction between secondary `View` and primary `Continue`. Use one shared compact booking action class instead of local `h-9` strings.

**Routes to verify after implementation:**

- `/ireland/en/book`
- `/ireland/en/book?service=<service-slug>`
- `/ireland/en/book?service=<service-slug>&at=<time>`
- Doctor-first booking URLs from doctor cards

**Risk notes:**  
Do not change booking URL semantics, slot selection, doctor assignment, or cart submission behavior.

### Finding 4 — Header tap targets and focus styles are inconsistent

**Severity:** S2  
**Area:** Header / Navigation / Accessibility  
**Files or components involved:**

- `frontend/components/layout/SiteHeader.tsx`
- `frontend/components/layout/MobileNav.tsx`
- `frontend/components/layout/SectionNav.tsx`
- `frontend/components/layout/CountrySwitcher.tsx`
- `frontend/components/layout/LanguageSwitcher.tsx`
- `frontend/components/cart/CartIcon.tsx`

**What I observed:**  
Runtime sampling found the cart icon at 36px, mobile book CTA at 40px high, mobile menu at 42px, and desktop nav pills around 39px high. Several header controls override the global focus system with `focus-visible:outline-none` plus local rings, some of which are low-contrast on dark chrome.

**Why it matters:**  
The header is shared across the entire public website. Small tap targets and weak focus states create repeated friction and accessibility risk.

**Recommended future fix:**  
Set public header interactive controls to a minimum 44px hit area. Remove local focus overrides where the global dual-ring works, and define a single documented on-dark focus modifier for glass header controls.

**Routes to verify after implementation:**

- `/ireland/en`
- `/ireland/en/book`
- `/contact`
- `/blog`
- `/privacy`

**Risk notes:**  
Header layout is tight on desktop. Verify that 44px targets do not overflow the collapsed glass pill at 1024px and 1280px.

### Finding 5 — Section spacing has conflicting global definitions

**Severity:** S3  
**Area:** Public layout rhythm  
**Files or components involved:**

- `frontend/app/globals.css`
- `frontend/components/layout/Section.tsx`
- `frontend/components/sections/FinalCTA.tsx`
- `frontend/components/sections/ServiceCatalog.tsx`
- `frontend/components/sections/FAQSection.tsx`
- `frontend/components/sections/GH2PagePrimitives.tsx`
- `frontend/app/(site)/about/page.tsx`
- `frontend/app/(site)/contact/page.tsx`

**What I observed:**  
`.gh-section` is defined early as `padding-block: var(--space-section)` and later redefined as `padding-block: clamp(72px, 10vw, 144px)`. `Section.tsx` does not use `.gh-section`; it hardcodes `py-12 sm:py-16 lg:py-24`. Many public sections use their own inline `clamp(...)` padding.

**Why it matters:**  
The intended public rhythm cannot be changed from one place. Future edits may update the token while many sections keep old values, producing a subtle stitched-together feel.

**Recommended future fix:**  
Choose one public section spacing contract. Prefer token-driven `.gh-section` and `.gh-section-sm`, then update `Section.tsx` and repeated public sections to consume those classes. Keep bespoke hero top padding only where the sticky header requires it.

**Routes to verify after implementation:**

- `/ireland/en`
- `/about`
- `/contact`
- `/faq`
- `/blog`
- `/privacy`

**Risk notes:**  
This has broad visual surface area but low behavior risk. Use screenshot comparison across 390px, 768px, and 1440px.

### Finding 6 — Hardcoded visual styles bypass public tokens

**Severity:** S3  
**Area:** Tokens / Maintainability / Visual consistency  
**Files or components involved:**

- `frontend/app/globals.css`
- `frontend/components/layout/SiteHeader.tsx`
- `frontend/components/sections/ServiceCatalog.tsx`
- `frontend/components/sections/GH2PagePrimitives.tsx`
- `frontend/components/cards/DoctorCard.tsx`
- `frontend/components/cards/ServiceCard.tsx`
- `frontend/components/cards/CartServiceCard.tsx`
- `frontend/app/(auth)/(public)/login/ui.tsx`

**What I observed:**  
The public surface contains many inline hex/rgba values for brand ink, card shadows, glows, dark text opacity, icon colors, and focus rings. Some are intentional visual recipes, but many repeat token-like values (`#0a1f14`, `#9BB0A4`, `rgba(176,241,34,...)`, `rgba(255,255,255,0.55)`) across unrelated components.

**Why it matters:**  
Token drift is already visible: components look related, but not governed. Future palette changes will require broad manual search instead of a controlled token update.

**Recommended future fix:**  
Move repeated values into public semantic tokens: on-accent ink, dark-muted text tiers, card glow, footer error text, auth icon color, filter selected/unselected colors, and header notification ring.

**Routes to verify after implementation:**

- `/ireland/en`
- `/ireland/en/book`
- `/login`
- `/register`
- `/contact`

**Risk notes:**  
Token changes can affect portals because `globals.css` contains both public and portal styles. Scope new public tokens/classes deliberately.

### Finding 7 — Public card hierarchy is visually coherent but not systemized

**Severity:** S2  
**Area:** Cards / Repeated public patterns  
**Files or components involved:**

- `frontend/components/cards/DoctorCard.tsx`
- `frontend/components/cards/ServiceCard.tsx`
- `frontend/components/cards/CartServiceCard.tsx`
- `frontend/components/cards/BlogCard.tsx`
- `frontend/components/sections/ServiceCatalog.tsx`

**What I observed:**  
Doctor cards use `borderRadius: 24` and custom CSS variables. Service cards use `var(--radius-card)` and different light/dark action layouts. Cart service cards mirror dark service cards but implement buttons separately. Blog cards use `.gh-card gh-card-hover` and a horizontal editorial layout. ServiceCatalog tiles have another card implementation with `GLASS_CARD_STYLE`.

**Why it matters:**  
The differences are partly intentional, but the repeated implementation paths create inconsistent padding, hover lift, button height, image ratio, and selected/action placement. Developers adding a new public card do not have one obvious contract to follow.

**Recommended future fix:**  
Document and extract four public card tiers:

- Editorial article card
- Doctor/person card
- Service/product card
- Checkout/booking selection card

Each tier should define radius, padding, image ratio, hover, CTA placement, and selected/disabled state.

**Routes to verify after implementation:**

- `/ireland/en`
- `/ireland/en/doctors`
- `/ireland/en/book`
- `/blog`
- `/ireland/en/tests`

**Risk notes:**  
Do not flatten every card into the same look. Doctor cards, blog cards, and checkout cards have valid different purposes.

### Finding 8 — Public forms are split across multiple visual systems

**Severity:** S2  
**Area:** Forms / Auth / Newsletter / Checkout  
**Files or components involved:**

- `frontend/app/globals.css`
- `frontend/components/forms/ContactForm.tsx`
- `frontend/components/layout/NewsletterSignup.tsx`
- `frontend/components/forms/phone-field.tsx`
- `frontend/app/(auth)/(public)/login/ui.tsx`
- `frontend/app/(auth)/(public)/register/ui.tsx`
- `frontend/app/(site)/patient-upload/page.tsx`
- `frontend/app/(site)/[country]/[lang]/checkout/page.tsx`

**What I observed:**  
Contact and checkout largely use `.gh-input`, `.gh-select`, `.gh-textarea`, and `.gh-status-*`. Newsletter uses custom `.gh-newsletter-*` fields and a square button. Auth fields use shared inputs but wrap them in inline icon/color rules. Patient upload uses local `text-red-700` errors instead of status tokens.

**Why it matters:**  
Users encounter forms in contact, auth, booking, checkout, newsletter, and upload flows. Inconsistent input height, helper/error treatment, icon color, and button treatment reduce confidence.

**Recommended future fix:**  
Create one public form contract: label, input/select/textarea, helper, error, success, disabled, input-with-icon, phone-field, file-input, and dark-footer-newsletter variants. Migrate local red/error and auth icon styles into tokens.

**Routes to verify after implementation:**

- `/contact`
- `/login`
- `/register`
- `/forgot-password`
- `/patient-upload?token=...`
- `/ireland/en/checkout`
- Footer newsletter on any country route

**Risk notes:**  
Preserve form submission behavior, server actions, auth redirects, checkout handoff, and phone hidden-input behavior.

### Finding 9 — Dark-surface contrast and focus treatment need a pass

**Severity:** S2  
**Area:** Accessibility / Dark sections  
**Files or components involved:**

- `frontend/components/sections/FAQSection.tsx`
- `frontend/components/sections/GH2PagePrimitives.tsx`
- `frontend/components/layout/SiteFooter.tsx`
- `frontend/components/layout/NewsletterSignup.tsx`
- `frontend/components/layout/SectionNav.tsx`
- `frontend/components/layout/CountrySwitcher.tsx`
- `frontend/components/layout/LanguageSwitcher.tsx`

**What I observed:**  
FAQ answer text is `rgba(255,255,255,0.52)` on forest. GH2 body and meta text often sit around 0.55 opacity. Footer regulatory text uses white/40. Newsletter errors use a custom pale red. Several interactive controls remove outline and substitute local rings.

**Why it matters:**  
The brand relies heavily on dark surfaces. Slightly faint text may look refined on large monitors but can fail real mobile readability and accessibility expectations.

**Recommended future fix:**  
Define dark-surface text tiers, then audit contrast for body, meta, legal/regulatory, helper, disabled, and error text. Keep decorative text faint, but raise informational text to a tested accessible tier. Let the global dual focus ring apply unless a tested on-dark variant exists.

**Routes to verify after implementation:**

- `/ireland/en`
- `/faq`
- `/contact`
- `/login`
- Footer on all public pages

**Risk notes:**  
Do not brighten decorative watermarks or background motifs; target readable content and interactive states.

### Finding 10 — Public auth shell is polished but disconnected from site chrome

**Severity:** S2  
**Area:** Auth as public access surface  
**Files or components involved:**

- `frontend/app/(auth)/(public)/layout.tsx`
- `frontend/components/sections/GH2PagePrimitives.tsx`
- `frontend/app/(auth)/(public)/login/ui.tsx`
- `frontend/app/(auth)/(public)/register/ui.tsx`

**What I observed:**  
The auth layout returns children directly, so `/login` and `/register` do not include `SiteChrome`, the public skip link, or `main#main-content`. `GH2AuthShell` uses `height: 100svh` and `overflow: hidden`, many inline colors, and tab links that measured 36px high on mobile.

**Why it matters:**  
Auth pages are public access pages and often part of checkout recovery. They should feel connected to the public brand while keeping a focused sign-in layout. Missing skip link/main landmark consistency is also an accessibility regression compared with public site pages.

**Recommended future fix:**  
Keep the auth split layout if desired, but add a public-access shell contract: semantic `main`, skip-link equivalent, min-height instead of fixed height where possible, shared form/status tokens, and 44px tab/touch targets.

**Routes to verify after implementation:**

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/login?next=/ireland/en/checkout`

**Risk notes:**  
Do not apply portal shell styles to auth. Keep redirects and auth API behavior untouched.

### Finding 11 — Checkout/cart fallback clarity is conversion-critical

**Severity:** S4  
**Area:** Checkout / Cart / Backend-unavailable states  
**Files or components involved:**

- `frontend/app/(site)/[country]/[lang]/checkout/page.tsx`
- `frontend/app/(site)/cart/page.tsx`
- `frontend/app/(site)/[country]/[lang]/cart/page.tsx`
- `frontend/components/cart/CartContext.tsx`
- `frontend/lib/api/me-subscription.ts`
- `frontend/lib/api/auth-api.ts`

**What I observed:**  
During runtime, backend-dependent calls to auth/cart preview failed because `127.0.0.1:4000` was unavailable. Checkout rendered with little visible page content in the sampled state and then relies on redirect/null handling when the cart is empty. The order summary is desktop-sticky only; on mobile it sits below the payer form.

**Why it matters:**  
Checkout is a conversion-critical surface. Empty, loading, backend-unavailable, and auth-preview-failed states need to be clear and reassuring, not visually blank or dependent on a redirect that may be missed.

**Recommended future fix:**  
Add explicit public checkout/cart fallback states: empty cart, loading cart, unable to load benefits/auth preview, and payment-start failure. Keep totals and Stripe handoff behavior unchanged. Consider a mobile summary affordance before the pay button so the final amount remains visible while filling payer details.

**Routes to verify after implementation:**

- `/ireland/en/cart`
- `/ireland/en/checkout`
- `/checkout`
- `/login?next=/ireland/en/checkout`

**Risk notes:**  
Do not alter pricing, plan benefit calculation, Stripe session creation, order creation, or cart country constraints.

### Finding 12 — `/[country]/[lang]/services` is not reviewable as an index route

**Severity:** S1  
**Area:** Public service pages / Route clarity  
**Files or components involved:**

- `frontend/app/(site)/[country]/[lang]/services/[serviceSlug]/page.tsx`
- `frontend/components/sections/ServiceCatalog.tsx`
- `frontend/components/layout/SectionNav.tsx`

**What I observed:**  
Runtime request to `/ireland/en/services` returned 404. The codebase has service detail pages and service category entries, but not a country service index at that exact path.

**Why it matters:**  
The review prompt lists public service pages broadly, and users may expect a services index URL. If the current design intentionally routes service browsing through the homepage service catalog and service submenu, that should be explicit.

**Recommended future fix:**  
Either document that `/[country]/[lang]/services` is intentionally absent, or add a public services index later using the existing ServiceCatalog/card system. Do not add it as part of a visual cleanup unless product confirms the route.

**Routes to verify after implementation:**

- `/ireland/en/services`
- `/ireland/en/services/[serviceSlug]`
- Header Services submenu destinations

**Risk notes:**  
Adding the route would affect SEO, sitemap, and navigation. Treat it as product scope, not just UI polish.

### Finding 13 — Country/language switchers are visually local implementations

**Severity:** S1  
**Area:** Header switchers / Public chrome  
**Files or components involved:**

- `frontend/components/layout/CountrySwitcher.tsx`
- `frontend/components/layout/LanguageSwitcher.tsx`
- `frontend/components/layout/SectionNav.tsx`

**What I observed:**  
Country and language menus use inline min-widths, border radii, shadows, and item styles. SectionNav uses Radix dropdown styles with a different menu recipe. All are visually close, but they are not one shared public menu primitive.

**Why it matters:**  
Header dropdowns are high-frequency controls. Small differences in menu width, border, focus, active state, and shadow are repeated public pattern drift.

**Recommended future fix:**  
Extract a public chrome menu primitive for header dropdown panels and menu items. Keep the country-switch confirmation behavior and locale cookie behavior unchanged.

**Routes to verify after implementation:**

- `/ireland/en`
- `/about` after a country has been remembered
- `/blog`
- Header at 1024px and 1440px

**Risk notes:**  
Country switching has cart-clearing side effects. Only visual/menu structure should change.

### Finding 14 — Blog and content fallback states need stronger public polish

**Severity:** S1  
**Area:** Blog / Content-heavy pages  
**Files or components involved:**

- `frontend/app/(site)/blog/page.tsx`
- `frontend/components/cards/BlogCard.tsx`
- `frontend/lib/content/get-public-blog.ts`
- `frontend/app/(site)/privacy/page.tsx`
- `frontend/app/(site)/terms/page.tsx`

**What I observed:**  
When backend fetches failed, blog used fallback behavior. The blog empty state is usable, but its CTA uses a local button style rather than the public CTA hierarchy. Legal/content pages are readable, but prose spacing and list styling are local instead of shared content primitives.

**Why it matters:**  
Content-heavy pages are trust pages. They should be calm and readable, but still use the same public link/button/prose system so they do not feel separate from the rest of the website.

**Recommended future fix:**  
Create public prose and empty-state primitives: content container, section heading, list style, inline link, empty-state CTA. Apply to blog empty state, privacy, terms, and legal pages.

**Routes to verify after implementation:**

- `/blog`
- `/blog/[slug]`
- `/privacy`
- `/terms`
- `/ireland/en/legal`

**Risk notes:**  
Do not overdecorate legal pages. Readability matters more than adding marketing treatment.

### Finding 15 — Legal/content prose has minor local polish issues

**Severity:** S0  
**Area:** Legal / Privacy / Terms  
**Files or components involved:**

- `frontend/app/(site)/privacy/page.tsx`
- `frontend/app/(site)/terms/page.tsx`

**What I observed:**  
Privacy and terms pages use a good readable max-width and clear headings. Minor polish remains: `list-inside` can create uneven multi-line wrapping, and the bottom of long legal pages has no soft return path or contextual CTA.

**Why it matters:**  
This is local polish, not a system failure. Legal pages should remain restrained, but wrapping and end-of-page navigation affect readability.

**Recommended future fix:**  
Use a shared prose list style with outside bullets and consistent hanging indents. Add a quiet back-to-contact or back-to-booking link only if product wants an end-of-page path.

**Routes to verify after implementation:**

- `/privacy`
- `/terms`
- `/ireland/en/legal`
- `/ireland/en/legal/subscription-terms`

**Risk notes:**  
Avoid changing legal text meaning.

### Finding 16 — Public and portal CSS are coupled in global class names

**Severity:** S2  
**Area:** Guardrails / Public component reuse risk  
**Files or components involved:**

- `frontend/app/globals.css`
- `frontend/components/portal-shell.tsx`
- `frontend/components/portal-atoms.ts`

**What I observed:**  
`globals.css` contains public `.gh-btn`, `.gh-input`, `.gh-card`, `.gh-section`, and later portal-specific overrides targeting `.gh-portal-shell .gh-btn`, `.gh-admin-main`, and related selectors. Future public cleanup could unintentionally change portal surfaces if class names are reused broadly.

**Why it matters:**  
The prompt excludes portal redesign. Public website work should not regress authenticated portals, especially because portal classes share some public names.

**Recommended future fix:**  
During future implementation, add public-only classes or scoped wrappers before changing shared names. Treat portal selectors as guardrails and run portal smoke checks only to verify no spillover.

**Routes to verify after implementation:**

- Public: `/ireland/en`, `/contact`, `/login`, `/ireland/en/checkout`
- Guardrail only: `/account`, `/doctor`, `/admin` smoke if available

**Risk notes:**  
Do not redesign portal UI as part of public website work.

## 6. Public Website Component Map

- `SiteChrome`: public shell, skip link, header, main landmark, medical disclaimer or country trust bar, footer.
- `SiteHeader`: sticky glass header, brand, section nav, country/language switchers, cart icon, auth link/account avatar, book CTA, mobile nav trigger.
- `MobileNav`: Radix mobile drawer, mobile IA, bottom book CTA.
- `SiteFooter`: public footer, care links, country links, account/company links, newsletter signup, regulatory text, copyright/legal row.
- `Container`: max-width and horizontal padding primitive.
- `Section`: generic section wrapper, but currently hardcodes padding instead of using the tokenized `.gh-section`.
- `SectionNav`: desktop public navigation pills and services dropdown.
- `CountrySwitcher` / `LanguageSwitcher`: header menus with country/lang routing and cookie/cart side effects.
- `NewsletterSignup`: footer-only dark form.
- `GH2CompactHero`: compact dark hero for blog/legal/content pages.
- `GH2FlowHeader`: compact step header for booking/cart/checkout/status flows.
- `GH2AuthShell`: public auth split shell.
- `HomeHero`: country homepage hero and primary booking entry.
- `ServiceCatalog`: homepage service catalogue, filters, pager, service tiles.
- `DoctorCard`: doctor/person card used in directories and booking selection.
- `ServiceCard`: service listing/detail related card.
- `CartServiceCard`: add-to-cart product/service card for test/prescription flows.
- `BlogCard`: editorial article card.
- `ContactForm`: primary public contact form.
- `PhoneField`: shared public/portal phone input.

## 7. Button / CTA Review

Current state:

- Page CTAs are strongest when they use `gh2-btn-lime` and `gh2-btn-ghost`.
- Header CTAs visually mimic `gh2-btn-lime` but reimplement it locally.
- Booking selection cards use smaller local `h-9` actions.
- Service/catalog cards reimplement primary/secondary actions inline.
- Newsletter has a compact rectangular submit button that does not belong to the same hierarchy.
- Legacy `.gh-btn-*` still exists and is used in some public/mobile surfaces and portal scopes.

Recommended future public hierarchy:

- Primary page action: 56px lime pill, dark ink, strong shadow.
- Secondary page action on dark: 56px ghost pill, white text, restrained border.
- Secondary page action on light: forest outline or text-link variant.
- Card primary: 48px minimum, filled forest on light or lime on dark.
- Card secondary: 44-48px outline/ghost.
- Booking compact action: 44px minimum, clear primary/secondary distinction.
- Filter pill: tokenized pressed/unpressed state, no ad hoc inline styles.
- Footer/newsletter action: footer-specific but tokenized dark-form variant.

## 8. Card System Review

Current state:

- Cards are visually aligned around forest, white, glass, and rounded surfaces.
- Doctor cards, service cards, cart-service cards, and blog cards use different radius and CTA rules.
- `ServiceCatalog` has a separate tile implementation rather than reusing `ServiceCard`.
- Hover lift and shadows differ between `.gh-card-hover`, `.gh2-card`, and local card CSS.

Recommended future hierarchy:

- Doctor card: portrait-led, strong credential metadata, booking/action stack.
- Service card: service/product card with consistent price/duration chips and card CTA footer.
- Booking selection card: compact, tap-safe, selected/continue actions optimized for mobile.
- Editorial card: blog/content card with prose-forward spacing and lower visual weight.
- Checkout summary card: read-only financial/line-item hierarchy with sticky desktop and mobile summary affordance.

## 9. Form System Review

Current state:

- `.gh-input`, `.gh-select`, `.gh-textarea`, `.gh-status-*`, and `PhoneField` are useful and should remain the base.
- Newsletter form and auth icon fields still use local styling.
- Upload and some fallback states use local red/error styling.
- Form labels are generally above fields, which is good.

Recommended future form hierarchy:

- Shared label above field, helper below, error below.
- 48px minimum input/select height.
- Shared `input-with-icon` wrapper for auth/search fields.
- Shared phone-field layout variant for narrow screens.
- Shared file-input primitive for upload surfaces.
- Shared dark-footer compact form variant.
- Shared status/error/success blocks across contact, auth, checkout, upload, newsletter.

## 10. Responsive Review

Runtime observations:

- No horizontal overflow was detected in sampled successful mobile routes at 390px.
- `/ireland/en/book` mobile had many controls and several 36-42px tap targets.
- `/contact` mobile had no overflow but footer/contact links and header icons measured below 44px.
- `/login` mobile rendered without site chrome and with 36px auth tabs.
- Cold mobile loads for `/` and `/ireland/en` timed out in the collector during compilation, so those first-viewport mobile visuals need another warm-server screenshot pass.

Routes needing future visual verification:

- `/`
- `/ireland/en`
- `/ireland/en/book`
- `/ireland/en/checkout`
- `/ireland/en/doctors`
- `/blog`
- `/contact`
- `/login`
- `/register`
- `/privacy`

## 11. Accessibility Review

Positive:

- Public site pages under `SiteChrome` include a skip link and `main#main-content`.
- Global `:focus-visible` is designed to work on both light and dark surfaces.
- Most meaningful images have alt text paths or fallback text.
- Booking date/time controls use ARIA tab patterns in current code.

Risks:

- Public auth pages do not use `SiteChrome`, skip link, or the same main landmark contract.
- Header/cart/menu/book controls need a 44px target pass.
- Local focus overrides weaken the global focus style.
- FAQ and dark-surface support text use low-opacity white text.
- Some CTA-like links are visually small text links where a stronger touch target would be better.

Recommended future checks:

- Keyboard tab through header, section nav, FAQ, service filters, booking, checkout, auth.
- Check focus ring contrast on forest, white, and glass surfaces.
- Check visible heading outline on content pages after streaming/hydration.
- Re-test at 320px and 390px widths.

## 12. Booking / Checkout Review

Booking:

- Step separation is improved and directionally correct.
- Date selected states are now much clearer than older weak selected-state patterns.
- Service/doctor selection card CTAs remain too small for conversion-critical mobile taps.
- Step indicator is readable, but future changes should verify compact labels at 320px.

Checkout:

- Desktop summary uses a sticky aside, which is appropriate.
- Mobile should keep total/summary visibility closer to the payment action.
- Backend/auth/cart-preview failures need explicit, designed fallback states.
- Empty cart and redirect states should show clear recovery paths.

Guardrails:

- Preserve pricing, plan coverage, slot selection, doctor assignment, patient details, cart country rules, Stripe handoff, server APIs, and redirects.

## 13. Recommended Implementation Order

1. Fix the footer/country slug hydration mismatch. This is a shared public chrome reliability issue.
2. Raise conversion-flow booking action targets to at least 44px.
3. Add explicit checkout/cart empty/loading/backend-unavailable states.
4. Normalize public header tap targets and focus styles.
5. Resolve `.gh-section` duplication and migrate `Section.tsx` to the chosen token.
6. Extract public CTA classes for page, card, compact booking, filter, and newsletter variants.
7. Document and align the four public card tiers.
8. Consolidate public form/status primitives, including auth/newsletter/upload variants.
9. Audit dark-surface contrast and focus rings.
10. Add or explicitly document the absence of `/[country]/[lang]/services`.
11. Run warm-server screenshots for mobile/desktop public routes.
12. Run portal smoke checks only as guardrails after shared CSS changes.

## 14. Do Not Touch / Guardrails

Do not change unless specifically required:

- `/admin/**`
- `/doctor/**`
- `/account/**`
- `frontend/components/portal-shell.tsx`
- `frontend/components/portal-atoms.ts`
- `frontend/app/(admin)/admin/**`
- `frontend/app/(doctor)/doctor/**`
- backend pricing, booking, cart, checkout, auth, Stripe, server action, or database logic
- plan coverage calculation
- cart country clearing behavior
- locale/country routing behavior beyond visual or link-generation fixes
- doctor assignment and slot availability logic
- patient medical intake behavior
- legal text meaning

## 15. Final Checklist For Future Implementation

- [ ] Keep public website changes scoped to public routes/components.
- [ ] Preserve the current brand direction: forest, lime, warm off-white, clinical calm.
- [ ] Do not introduce a new design system.
- [ ] Use existing Tailwind 4 / Next 16 / React 19 patterns.
- [ ] Keep public CTAs in a documented hierarchy.
- [ ] Maintain 44px minimum tap targets for key public actions.
- [ ] Use shared public form/status primitives.
- [ ] Use shared public card tiers instead of one-off card recipes.
- [ ] Verify no horizontal overflow at 320px, 390px, 768px, 1024px, and 1440px.
- [ ] Verify keyboard focus on header, dropdowns, cards, filters, FAQ, auth, booking, and checkout.
- [ ] Verify dark-surface text contrast.
- [ ] Verify checkout/cart empty, loading, error, and backend-unavailable states.
- [ ] Verify dynamic/admin-added country links in footer and switchers.
- [ ] Verify `/login?next=/ireland/en/checkout` remains functional.
- [ ] Run public route screenshot checks after visual changes.
- [ ] Run portal smoke checks only to confirm shared CSS did not spill into out-of-scope portals.
