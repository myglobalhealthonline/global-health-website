# Phase 1 — Public Site Redesign Audit (Fresh, Current State)

**Scope** Public marketing surface only. `app/(site)/**` + section/card/layout components it
consumes. Admin / doctor / patient portals out of scope.
**Stack** Next.js · React 19 · Tailwind v4 · Manrope via next/font · Radix
primitives · lucide-react. No motion library.
**Audit date** 2026-05-22. Prior redesign passes already ran; this audit reads the
CURRENT code, not the previous session's notes.

---

## 0. TL;DR — what's wrong

The site passed the first-order AI reflex test (not "healthcare white + teal") but
walked straight into the second-order trap: **"health platform that rejected the
default → dark editorial startup with lime accent."** That is now the new training-data
reflex, and the result looks like every funded-startup homepage circa 2024, not a
trusted European telemedicine clinic. The problems are clustered in five themes:

1. Dark editorial aesthetic on a trust-product (wrong scene, wrong mood)
2. The same decorative technique — lime radial glow on forest-night canvas — used
   across FOUR sections, making every section look templated
3. Primary CTA colour split (mint on dark hero, forest everywhere else)
4. Typography token system exists but is ignored — every component hand-rolls
   its own `clamp()` at wildly different scales
5. Inline `style={}` attributes scattered across header and DoctorWall, bypassing
   the token system

These are fixable without rebuilding. Everything structural (routing, data fetching,
schema markup, auth, cart) stays unchanged.

---

## 1. Stack signal

```
Next.js 16.2.4 · React 19 · Tailwind v4 (@import "tailwindcss")
Manrope via next/font (Manual da Marca spec — Gilroy substitute)
Radix (dialog, dropdown, slot) · lucide-react · sonner · flag-icons
No framer-motion, no GSAP. Motion = CSS + Web Animations only.
```

`globals.css` already contains the right token system. It is **not being used
consistently**. The redesign is about applying the existing system, not inventing
a new one.

---

## 2. Inventory

### Pages in scope (`app/(site)/**`)

| Path | Role | LOC |
|---|---|---|
| `(site)/layout.tsx` | Shell — CartProvider, SiteChrome | 68 |
| `[country]/[lang]/page.tsx` | Country home — primary marketing page | 391 |
| `[country]/[lang]/doctors/page.tsx` | Doctors index | 94 |
| `[country]/[lang]/general-consultation/page.tsx` | GP service page | 215 |
| `[country]/[lang]/specialist-consultation/page.tsx` | Specialist page | 232 |
| `[country]/[lang]/prescriptions/page.tsx` | Rx catalogue | 192 |
| `[country]/[lang]/tests/page.tsx` | Health tests catalogue | 200 |
| `[country]/[lang]/consult/[serviceSlug]/page.tsx` | Service → doctor picker | 315 |
| `[country]/[lang]/cart/page.tsx` | Cart | 392 |
| `[country]/[lang]/checkout/page.tsx` | Checkout | 345 |
| `blog/page.tsx` | Blog index | 38 |
| `blog/[slug]/page.tsx` | Blog article | ~150 |
| `contact/page.tsx` | Contact + form | 61 |
| `privacy/page.tsx` | Legal | ~120 |
| `brazil/consent/page.tsx` | BR GDPR consent | ~90 |

### Section components (`components/sections/`)

`HomeHero`, `CountryMarquee`, `TrustRibbon`, `TrustBar`, `ReviewBadge`,
`ServiceCatalog`, `StatsBand`, `FeaturedDoctor`, `DoctorWall`, `DoctorsSection`,
`HowItWorks`, `HowItWorksNarrative`, `PageHero`, `HeroSection`, `ServicesGrid`,
`SpecialtiesGrid`, `FAQSection`, `FinalCTA`, `BookingCTA`, `RichBodySection`,
`TeamHero`.

### Cards (`components/cards/`)

`DoctorCard`, `ServiceCard`, `BlogCard`, `ConsultationDestinationCard`,
`PricingCard`.

### Layout shell (`components/layout/`)

`SiteChrome`, `SiteHeader`, `SiteFooter`, `MobileNav`, `Container`, `Section`,
`Breadcrumbs`, `CTAFooter`, `CountrySwitcher`, `LanguageSwitcher`, `SectionNav`,
`NewsletterSignup`.

---

## 3. Per-page audit (0–5 per dimension)

**Scale:** 5 = best-in-class, 0 = needs full rewrite.

| Page | HIER | SPACE | TYPE | COLOR | CONTRAST | MOTION | A11Y | RESP | SLOP | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| `[country]/[lang]/page.tsx` | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | **1** | Four dark sections (hero + marquee + doctor wall + final CTA). Mint CTA on dark hero contradicts forest CTA everywhere else. |
| `doctors/page.tsx` | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | Delegates to DoctorCard grid — three CTAs per card. |
| `general-consultation/page.tsx` | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | ServicesGrid with gradient stripe cards. |
| `specialist-consultation/page.tsx` | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | Two grids (specialties + services) with same card shape. |
| `prescriptions/page.tsx` | 3 | 3 | 3 | 3 | 3 | 1 | 3 | 4 | 2 | Reasonable. |
| `tests/page.tsx` | 3 | 3 | 3 | 3 | 3 | 1 | 3 | 4 | 2 | Reasonable. |
| `consult/[serviceSlug]/page.tsx` | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | OK flow. |
| `checkout/page.tsx` | 4 | 4 | 4 | 4 | 4 | 2 | 4 | 3 | 1 | **Strong.** Leave it. |
| `cart/page.tsx` | 3 | 3 | 3 | 3 | 4 | 2 | 4 | 4 | 1 | Good. |
| `blog/page.tsx` | 3 | 3 | 3 | 3 | 3 | 1 | 3 | 3 | 2 | All BlogCards equal weight. |
| `blog/[slug]/page.tsx` | 4 | 4 | 4 | 3 | 4 | 1 | 3 | 4 | 0 | Best page in the repo. |
| `contact/page.tsx` | 4 | 4 | 4 | 3 | 4 | 1 | 4 | 3 | 0 | Clean. |
| `privacy/page.tsx` | 3 | 3 | 4 | 3 | 4 | 0 | 3 | 3 | 0 | Fine. |
| `brazil/consent/page.tsx` | 2 | 2 | 2 | 2 | 2 | 0 | 2 | 2 | 2 | Still the worst-scoring page. |

---

## 4. Critical findings — detailed

### F1. The "dark SaaS editorial" is the second-order health-site reflex

**HomeHero.tsx lines 53–82, CountryMarquee.tsx lines 29–38, DoctorWall.tsx lines
77–97, FinalCTA.tsx lines 19–34**

All four sections use the same three-part recipe:
- `background: var(--color-background-dark)` (forest night `#0F2E25`)
- `radial-gradient(ellipse …px …px at 95%-110% 0%-(-20%), rgba(176, 241, 34, 0.10–0.22), transparent)` — lime glow top-right
- Dotted SVG texture overlay at 4–6% opacity

Running the scene-sentence test: *"Patient at 2pm in a bright Dublin office deciding
whether to book an online GP appointment."* The answer is not a dark-canvas
magazine layout. That's a fintech or developer tool. The first-order reflex
("healthcare → white + teal") was avoided; the second-order reflex ("dark editorial
startup") was not.

**Severity: Critical.**

### F2. Primary CTA colour is split across the page

**HomeHero.tsx line 141:** `bg-[var(--color-accent)]` = pastel mint (#C8E6A0)
**FinalCTA.tsx line 98:** same `bg-[var(--color-accent)]`
**SiteHeader.tsx line 238:** `gh-btn-primary` = forest green (#1D4B36)
**ServiceTile hover CTA:** forest green

The two most-visible CTAs (hero + closer) use mint (soft, passive). The header and
every service card use forest (brand primary, authoritative). A patient sees a MINT
"Book a consultation" on the hero then a FOREST "Book" in the header and a FOREST
hover CTA on service tiles. Split signals = weak brand identity.

**Severity: High.**

### F3. Typography token system exists; nothing uses it

`globals.css` defines `--text-display` (max 6rem), `--text-h1` (max 4.25rem),
`--text-h2` (max 3rem), `--text-h3` (max 1.75rem).

What components actually use:

| Component | Actual size | Token says |
|---|---|---|
| HomeHero h1 | `clamp(3.25rem,9vw,11rem)` — **11rem/176px** | `--text-display` = max 6rem |
| DoctorWall count | `clamp(4.5rem,9vw,8rem)` | `--text-display` = max 6rem |
| DoctorWall h2 | `clamp(2.5rem,5vw+0.5rem,4.5rem)` | `--text-h1` = max 4.25rem |
| FinalCTA "24h" | `clamp(4.5rem,11vw,9rem)` — **9rem/144px** | `--text-display` = max 6rem |
| StatsBand numbers | `clamp(3.25rem,7vw,7rem)` | `--text-display` = max 6rem |
| ServiceCatalog h2 | `clamp(2rem,4vw+0.5rem,3.5rem)` | `--text-h2` = max 3rem |

Every section hand-rolls its own clamp with different max values. The token system
is ornamental. At desktop, sections compete for "biggest number" (176px hero
headline vs 144px FinalCTA "24h" vs 128px DoctorWall count). The page looks like
each section was designed in isolation.

**Severity: High.**

### F4. Inline `style={}` attributes bypass the token system

**SiteHeader.tsx lines 160–167:**
```tsx
style={{
  maxWidth: 1320,
  padding: "14px clamp(20px, 4vw, 40px)",
  gridTemplateColumns: "auto 1fr auto",
  gap: 24,
}}
```

**DoctorWall.tsx lines 164–177:** Entire filter button styling via inline `style`
object (border, background, color, fontFamily, fontSize, fontWeight, cursor).

These bypass the design system. Token drift becomes invisible when styling lives in
`style={}` instead of CSS vars or utility classes.

**Severity: Medium.**

### F5. DoctorCard has three competing CTAs per card

**DoctorCard.tsx lines 113–144:**
1. Forest pill "Book Appointment" (full-width primary)
2. WhatsApp circle icon button
3. Bordered "View Profile" link

One card. Three actions. Which one is primary? The first. So 2 and 3 are cognitive
noise. The WhatsApp button makes sense as the primary for some markets; the "View
Profile" link is useful for trust. But stacking all three on the same card inflates
card height and dilutes the message.

**Severity: Medium.**

### F6. ServiceCatalog uses gradient stripe card tops — banning-adjacent

**ServiceCatalog.tsx lines 172–181:** `STRIPE_GRADIENTS` maps service type to a
forest-to-lighter-forest gradient. These are gradient background areas (not text
gradients), but they share the "decorative gradient" problem from the ban list.
Three of four service types look like dark-forest slabs topped with a slightly
lighter dark-forest gradient; visually they blur together. The "test" type uses
`#C8E6A0 → #B0F122` lime gradient — completely different colour family, looks
incongruous next to the other three.

**Severity: Medium.**

### F7. TrustBar is a fifth hardcoded dark section

**TrustBar.tsx line 13:** `bg-[var(--color-brand-primary)]` = forest green section.
All four items are hardcoded in the component (no admin data). Section reads as a
marketing afterthought — icons, bold labels, two-line descriptions — generic trust
boilerplate identical to a hundred SaaS landing pages.

**TrustRibbon** (data-driven, mint-cream surface) already exists and is better.
TrustBar appears to be a duplicate / fallback that should be deprecated.

**Severity: Medium (data/duplication problem more than visual).**

### F8. Page rhythm — four dark sections in one page

Country home section sequence:
`HomeHero (dark)` → `CountryMarquee (dark)` → `RichBodySection (varies)` →
`TrustRibbon (soft)` → `ReviewBadge` → `ServiceCatalog (white)` →
`StatsBand (white)` → `FeaturedDoctor` → `DoctorWall (dark)` →
`HowItWorksNarrative (soft)` → `FinalCTA (dark)`

Hero + marquee = two consecutive dark sections at the top. Then later:
DoctorWall (dark) → HowItWorks (light) → FinalCTA (dark).

`FinalCTA` and `DoctorWall` use the SAME dark canvas + lime glow. If a user
scrolls past the hero, finds the FinalCTA, they've seen this aesthetic three times.

**Target rhythm:** dark (hero) → light (trust + services + stats) → light-soft
(doctors + how it works) → dark (FinalCTA). Marquee should be a one-line divider
between dark hero and light section, not a second full dark section.

**Severity: High.**

### F9. Dead code

- **DoctorWall.tsx lines 304–326:** `function DKV({k, v})` is defined but never
  called in the component's JSX. Orphaned.
- **SiteHeader.tsx line 260:** `void countries;` — a hack to suppress an
  "unused import" TS error. Should be removed along with the import.

**Severity: Low (cleanup).**

### F10. AvatarBubble uses banned gradient

**HomeHero.tsx lines 275–278:**
```tsx
background: "linear-gradient(135deg, var(--color-accent) 0%, #B0F122 60%, var(--color-accent) 100%)"
```

The impeccable rules ban gradient backgrounds used decoratively. This is a
decorative initials bubble — the gradient serves no semantic purpose. Replace with
solid `--color-accent` background or solid `--color-background-panel`.

**Severity: Low.**

---

## 5. Second-read moments — what should catch the eye but doesn't

| Page | Today | Should be |
|---|---|---|
| Country home | Hero is ALL dark — the hero itself doesn't create visual hierarchy because everything is equally dark/editorial | Asymmetric hero (light canvas): big serif/sans headline left, one-line availability panel right. Forest primary CTA. Trust established by restraint. |
| Country home | DoctorWall and FinalCTA look identical from a distance | DoctorWall on soft/light surface OR with a distinct editorial contrast point that differs from FinalCTA dark |
| Service catalog | All four service type stripes look dark/identical | First card (general consultation) has a SOFT mint stripe; others use a single light icon tile — no gradients |
| Doctors page | Three CTAs per DoctorCard compete for attention | One primary action ("Book") + portrait + name + specialty. Trust signals in small meta line. |
| Blog index | All cards identical weight | Featured post 2× width at top, then 3-up grid |

---

## 6. Anti-AI-slop checklist

**Running the full impeccable test against current code:**

| Check | Result |
|---|---|
| Gradient text (`background-clip: text`) | PASS — not used |
| Glassmorphism as default | PARTIAL FAIL — hero live-availability panel uses `bg-white/[0.03] backdrop-blur-sm`; subtle but present |
| Hero metric template (big number / small label / gradient) | **FAIL** — HomeHero "doctors live now", DoctorWall large count, FinalCTA "24h", StatsBand — four sections all display a large number as a hero metric |
| Identical card grids | PARTIAL FAIL — ServiceCatalog uses featured-first (good) but gradient stripes make cards visually identical |
| Hover-scale on cards | PASS — removed in previous session |
| Fade-on-mount static content | PASS — not found |
| Stagger-spam | PASS — not found |
| Side-stripe borders decorative | PASS — not found |
| Same decorative technique repeated 3+ times | **FAIL** — lime radial glow on dark canvas appears in HomeHero, DoctorWall, and FinalCTA (identical technique, slightly different opacity) |
| First-order category reflex (healthcare → white/teal) | PASS — not white/teal |
| Second-order category reflex (not-white-teal health → dark editorial startup) | **FAIL** — this is exactly what the site is |
| `#000` or `#fff` literals | PASS — not in tokens |
| Cards-inside-cards | PASS |
| h-screen on heroes | PASS |
| Inline padding literals | PARTIAL FAIL — SiteHeader uses `style` objects |

---

## 7. What is working well — lock list (visual)

The following are **correct** and must not be reverted:

- `globals.css` token system (colors, radius, shadows) — accurate to brand spec
- Manrope font loaded via `next/font` — correct brand substitute for Gilroy
- `.gh-section` / `.gh-card-grid` / `.gh-section-tight` utilities
- `ServiceCatalog` filter interaction (good component; needs surface-level fixes)
- `HowItWorks` sticky illustration + intersection observer step highlight
- `ServiceCatalog` featured-first layout concept (first card 2×2)
- All `motion-reduce:` guards on hover transforms
- `FinalCTA` asymmetric layout (number left, copy right) — concept is right
- `DoctorWall` portrait-first card grid — concept is right
- `TrustRibbon` (data-driven, four-up credentials strip on soft surface) — keep
- `ServiceTile` hover CTA that animates to forest on hover — keep the interaction
- `--shadow-*` tokens all forest-tinted (never neutral grey) — correct
- All a11y: `aria-*`, `role`, `data-testid`, event handlers — untouched

---

## 8. Lock list — must not change

**Routing + SEO:**
- `/[country]/[lang]/*` slug architecture
- `pageMetadata()` on every page
- `breadcrumbJsonLd`, `medicalBusinessJsonLd`, `medicalProcedureJsonLd`
- `isCountryFeatureEnabled` gating

**Copy (CTA labels):**
- "Book a consultation" / "Request a prescription" / "Add to cart" / "Browse consultations"
- "Licensed doctors" / "Compliant by default" / "GDPR-compliant" trust claims
- "Lab-quality tests, delivered home"

**Compliance:**
- All copy in `privacy/page.tsx`
- All Portuguese copy in `brazil/consent/page.tsx`
- Emergency "112 in EU" copy
- `info@myglobalhealth.online`, `privacy@myglobalhealth.online`

**Forms + cart:**
- All form field names + autocomplete attributes in `checkout/page.tsx`
- Cart `kind` enum (HEALTH_TEST / PRESCRIPTION_SERVICE / GENERAL_CONSULTATION / SPECIALIST_CONSULTATION)
- `heldUntil` slot-hold countdown
- Stripe disclaimer text

**Provider wiring:**
- `CartProvider`, `JsonLd` at layout level
- `sanitize-html` in RichBodySection render path

---

## 9. Suggested Phase 3 ordering

Each row = one commit. Commit message pattern: `ui(<surface>): <verb>`.

| # | Surface | What changes | Why first |
|---|---|---|---|
| 1 | `HomeHero.tsx` | Flip to light canvas. Asymmetric split (text left, availability panel right). Forest primary CTA. Remove gradient mesh + dotted texture. Radial glow banned. AvatarBubble → solid accent bg. | Highest-traffic. Sets the tone for everything else. |
| 2 | `CountryMarquee.tsx` | Convert to a thin light-on-soft divider strip. Soft background, no forest-night. Remove edge-fade gradient overlays. | Stops two consecutive dark sections. |
| 3 | `SiteHeader.tsx` | Replace all inline `style={}` with Tailwind tokens. Remove `void countries` hack. | Every page. Should match the light hero aesthetic. |
| 4 | `ServiceCatalog.tsx` (ServiceTile) | Replace `STRIPE_GRADIENTS` with solid icon-tile tops (no gradients). Single background per type using existing tokens. | Kills the gradient stripe anti-pattern. |
| 5 | `DoctorCard.tsx` | Reduce to one primary action. "Book Appointment" is the CTA. WhatsApp → secondary ghost. Remove "View Profile" from the card body (link to same `href` via the portrait). | Cleans card hierarchy. |
| 6 | `DoctorWall.tsx` | Move to light or soft surface. Remove inline `style` filter buttons → token-driven. Remove dead `DKV` function. | Breaks "identical dark section" repetition. |
| 7 | `FinalCTA.tsx` | Keep asymmetric layout. Replace `--color-accent` (mint) with `--color-brand-primary` (forest) for the "24h" number (or keep mint but cap size to `--text-display`). Tone the lime radial glow to 8% max. | Reduces slop. Caps type size to token. |
| 8 | `TrustBar.tsx` | Deprecate or make data-driven. `TrustRibbon` already serves this purpose better. | Removes the fifth dark/forest section. |
| 9 | All `text-[clamp(…)]` in section components | Replace with `text-[length:var(--text-display)]` / `--text-h1` etc. Remove every hand-rolled clamp that exceeds the token max (11rem → 6rem, 9rem → 6rem). | Restores type hierarchy. The 176px hero headline dwarfs all other type on page. |
| 10 | `StatsBand.tsx` | Cap numbers to `--text-display`. The four-up hero-metric layout is the metric template anti-pattern — convert to editorial data rows or fold into TrustRibbon. | Kills hero-metric repeat. |
| 11 | `brazil/consent/page.tsx` | Single styling language, tighten consent block. | Worst-scoring page, isolated blast radius. |
| 12 | A11y pass | `void countries` SiteHeader, `DKV` dead code removal, missing `alt` audits. | Safety polish. |

Phase 4 motion: the only new animation in scope is a subtle entrance for the hero
headline (one fade + translate-y, instant if `prefers-reduced-motion`). Everything
else that currently animates should be reviewed for purpose before keeping.

---

## 10. Open questions for Phase 1 boundary

Before Phase 2 direction doc and Phase 3 implementation:

1. **Light vs dark hero?** This audit recommends flipping the hero to a light canvas.
   If you want to keep the dark editorial feeling, Phase 3 can keep the dark hero but
   MUST change the other three sections away from the same dark aesthetic. Can't have
   it both ways — either the hero is the unique dark moment, or the whole page is light.

2. **`TrustBar` deprecation?** The hardcoded four-item bar duplicates `TrustRibbon`
   (data-driven). Safe to remove if `TrustRibbon` is in use on the country home (it is).

3. **DoctorWall surface?** Currently dark forest night. Three options:
   a. Move to `--color-background-soft` (mint-cream) — calm, reads as editorial
   b. Keep dark but make it the ONLY dark section (remove dark marquee + dark FinalCTA)
   c. Use a strong border-top on white — no section colour, pure type

4. **Type size cap?** The 11rem headline is a deliberate bold choice from `ui(bold)`.
   The token cap is 6rem. Confirm: keep the aggressive 11rem OR rein it in to the
   4–5rem range that reads as a health platform rather than a crypto/fashion brand?

No code touched. Awaiting Phase 1 sign-off and answers to the four questions above
before starting Phase 2 direction + Phase 3 execution.
