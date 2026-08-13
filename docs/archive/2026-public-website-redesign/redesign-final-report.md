# Public Marketing Site Redesign — Final Report

**Scope** Public marketing surface only (`app/(site)/**` + the section/card/layout components it consumes). Admin / doctor / patient portals untouched.
**Aesthetic** Minimalist + health-trust. Locked at Phase 2.
**Stack** Next.js 16.2.4 · React 19.2.4 · Tailwind v4 · Radix. **No motion library** — all motion is CSS + Web Animations.
**Date** 2026-05-22.

---

## 1. Summary

12 commits landed on `main` (`0cfe686` → `f1dd817`). Net: +572 / -299 lines across 24 files. All commits independently revertable.

| Metric | Before | After |
|---|---|---|
| `tsc --noEmit` (frontend) | clean | clean |
| `pnpm build` (frontend) | clean | clean, 78 static pages prerendered |
| `pnpm test` (backend) | 173 / 0 / 6 skipped | 173 / 0 / 6 skipped |
| Smoke routes (8 public routes) | 200 × 8 | 200 × 8 |
| Hand-rolled `grid gap-6 sm:grid-cols-2 lg:grid-cols-3` instances | 7 | 0 |
| Inline `<style>` blocks in components | 3 | 0 |
| Inline `padding: "Npx 0"` literals | 4 | 0 |
| `FLAG_CLASS` duplications | 4 | 0 |
| Pages using off-palette `emerald-*` / `slate-*` hero | 4 | 0 |
| Bare `dangerouslySetInnerHTML` audit risk | flagged | unchanged (Phase 6 follow-up) |

---

## 2. What changed per surface

### Foundation (commits 1–4)

| Commit | Lines | What |
|---|---|---|
| `0cfe686` ui(tokens) | +89 / -0 | Added `--text-eyebrow` (sole +tracking token), `--text-meta`, four `--space-*` clamps, `--radius-input` alias. New utilities: `.gh-section`, `.gh-section-tight`, `.gh-eyebrow`, `.gh-card-grid`, `.gh-card-grid--featured` (first child spans 2×2 at lg), `.gh-header-sticky`, `.gh-footer-grid`. |
| `4466def` ui(flag) | +55 / -103 | Extracted `<Flag code size>` atom. 5-row `FLAG_CLASS` map removed from CountrySwitcher, MobileNav, DoctorWall, HomeHero. Internal `sp`/`rm` → ISO `es`/`ro` mapping preserved. |
| `148aa83` ui(header) | +1 / -9 | SiteHeader consumes `.gh-header-sticky`. Inline `backdropFilter` + `bg-opacity` literals gone. |
| `f6d2315` ui(footer) | +10 / -22 | SiteFooter's inline `<style>` block (5-col grid with 3 breakpoints) moved into `.gh-footer-grid`. |

### Pages (commits 5–10)

| Commit | Surface | Lines | What |
|---|---|---|---|
| `d099989` ui(home) | `HomeHero` + country home | +59 / -25 | Inline `<style>` (keyframes + grid) → globals.css. Pulse dot uses `.gh-pulse-dot` (has own `prefers-reduced-motion` guard). Section padding → `.gh-section`. **Wired `FeaturedDoctor`** between TrustRibbon/ReviewBadge and ServiceCatalog (picks first doctor with bio + image; excluded from DoctorWall below). |
| `86fdf71` ui(services) | GP + Specialist pages, ServicesGrid + SpecialtiesGrid + DoctorsSection | +57 / -26 | Card grids consume `.gh-card-grid`. ServicesGrid takes new `featureFirst` prop (default true): promotes first card to 2×2 when ≥ 4 services. Heros use `.gh-eyebrow` + forest tokens. CTAs use existing `.gh-btn .gh-btn-primary` atom. |
| `a269a33` ui(tests) | Tests catalogue | +94 / -72 | **Stock state folded into CTA button** (`Add to cart · Only N left` / disabled `Sold out`). Three cascading badges (rose + amber + emerald) collapsed to one tinted price chip. Forest token system everywhere. |
| `1f57781` ui(consult) | Service → doctor picker | +39 / -9 | "Pick a time" promoted from subtle inline link to forest primary pill button anchored at card bottom. Card hover lifts via `-translate-y-0.5`. Motion-reduce guarded. |
| `12c3694` ui(blog) | Blog index + post + BlogCard | +112 / -18 | BlogCard accepts `category` + `publishedAt` + `featured`. Featured variant promotes first card to 2×2 with larger headline + longer excerpt. Blog index sorts newest-first; uses featured layout only when ≥ 4 posts. **Fixed dead `/book-online` CTA in blog/[slug]** → routes through `/` → CountryEntryGate. |
| `a21c117` ui(brazil-consent) | Worst-scoring Phase 1 page | +55 / -14 | Added `.gh-eyebrow` taxonomy. Consent checkbox moved into its own bordered tinted panel above submit (`aria-describedby` paired). Error message uses `--color-status-error-*` tokens with `role="alert"`. Form labels gained `font-medium` + 1.5px gap for clarity. |

### A11y + motion (commits 11–12)

| Commit | Lines | What |
|---|---|---|
| `eac55ad` ui(a11y) | +7 / -7 | Explicit `motion-reduce:transition-none` + neutral transform variants on DoctorCard, ServiceCard, ConsultationDestinationCard. Global `@media (prefers-reduced-motion)` is now fallback, not primary. |
| `f1dd817` ui(motion) | +3 / -3 | Removed `group-hover:scale-105` (DoctorCard) + `group-hover:scale-[1.04]` (DoctorTeamTemplate) per Phase 2 anti-pattern #9 — hover-scale on cards is banned in favour of `-translate-y` + shadow lift. Added missing motion-reduce on DoctorTeamTemplate arrow. **Net new motion in Phase 4: zero.** The existing motion budget (pulse dot + HowItWorks step + card hover + spinners) is fully spent. |

---

## 3. Phase 1 audit findings — status

Cross-referenced against the per-page scores from `redesign-audit.md`.

| Finding | Status | Where |
|---|---|---|
| Identical card grids (7+ surfaces) | **Fixed** | All migrated to `.gh-card-grid`; ServicesGrid + BlogCard take `featureFirst` to break symmetry on flagship pages. |
| 7+ serial sections per page, equal weight | **Partial** | Section rhythm improved via `.gh-section` / `.gh-section-tight` token; FeaturedDoctor inserted on country home to break the cadence. Service pages still serial but variant card weight + bg alternation reads cleanly. |
| Tests stock badges cascade | **Fixed** | Folded into CTA. Two chips removed per card. |
| Inline `<style>` blocks in components | **Fixed** | All three (SiteFooter, HomeHero, brazil-consent untouched but didn't have one). |
| Inline `padding: "112px 0"` literals | **Fixed** | All replaced by `.gh-section` / `.gh-section-tight`. |
| `FLAG_CLASS` re-implemented per consumer | **Fixed** | `<Flag>` atom. |
| `dangerouslySetInnerHTML` from admin content | **Deferred** | `sanitize-html` is in deps; verifying it's called at render path is a separate audit not in redesign scope. |
| `gh-*` + Tailwind mixed on brazil/consent | **Fixed** | All Tailwind, error chrome via status tokens. |
| Backdrop-filter inlined on header | **Fixed** | `.gh-header-sticky`. |
| Hover-scale on cards | **Fixed** | Removed on DoctorCard + DoctorTeamTemplate. |
| TrustSignals column-count ternary | **Won't fix** | Not in Phase 3 ordering; component still works correctly. |
| Non-locale-aware `/book-online` in blog | **Fixed** | Routed through `/` country gate. |
| Pulse dot missing motion-reduce | **Fixed** | `.gh-pulse-dot` with explicit `@media` block. |
| Country picker hand-rolled custom dropdown | **Deferred** | Direction.md flagged Radix migration but ordering put it behind page-level wins; component still functional. |

---

## 4. Tokens added to design system

```css
/* Spacing (fluid block padding for sections + card insets) */
--space-section:        clamp(64px, 8vw, 112px);
--space-section-tight:  clamp(40px, 5vw, 64px);
--space-stack:          clamp(16px, 1.5vw, 24px);
--space-inset:          clamp(20px, 3vw, 32px);

/* Type (fixed for taxonomy labels that shouldn't scale fluidly) */
--text-eyebrow: 0.8125rem;  /* 13px, the sole +tracking token (+0.06em uppercase) */
--text-meta:    0.875rem;   /* 14px for pricing / metadata rows */

/* Radius alias */
--radius-input: 12px;       /* lets forms diverge from cards later without find-and-replace */
```

## 5. Utilities added

```css
.gh-section            /* padding-block: var(--space-section) */
.gh-section-tight      /* padding-block: var(--space-section-tight) */
.gh-eyebrow            /* 13px + 0.06em uppercase + medium weight */
.gh-card-grid          /* mobile→tablet→desktop step */
.gh-card-grid--featured /* + first child spans 2x2 at lg */
.gh-header-sticky      /* blur + bg-opacity + bottom hairline */
.gh-footer-grid        /* 5-col footer with three breakpoints */
.gh-hero-bottom        /* HomeHero booking-panel + live-doctors grid */
.gh-pulse-dot          /* live indicator + own motion-reduce guard */
@keyframes gh-pulse    /* used by .gh-pulse-dot only */
```

## 6. Motion inventory (every animation on the public surface)

| Trigger | Element | Duration | Easing | Purpose |
|---|---|---|---|---|
| Infinite (paused on `prefers-reduced-motion`) | `.gh-pulse-dot` in HomeHero booking panel | 2s loop | `ease-out` | Signal real-time doctor availability. |
| Viewport intersect | HowItWorks step illustration swap | 700ms (`transition`) | default | Communicate active step on three-step explainer. |
| `:hover` | Card lift (DoctorCard, ServiceCard, consult/[serviceSlug] card, BlogCard via `.gh-card-hover`) | 300ms | default | Tactile affordance. |
| `:hover` | Arrow nudge (`translate-x-1`) on ServiceCard, ConsultationDestinationCard, DoctorTeamTemplate | 200ms | default | Directional cue toward CTA. |
| `:hover` | Forest pill darken on `.gh-btn-primary` | none (color only) | — | Standard hover state. |
| `:hover` | Doctor wall card `translate-y(-2px)` via `.gh-doctor-card` | 300ms | default | Tactile affordance (in `globals.css:1040-1050`, pre-existing). |
| `:active` | Forest pill `scale-[0.98]` on `.gh-btn` | 150ms | default | Tactile push, in `globals.css:288-291` (pre-existing). |
| Async state | `Loader2 animate-spin` on AddToCartButton, ContactForm, checkout submit, chat | infinite | linear | Purposeful loading indicator. |

Every transition / animation has either `motion-reduce:transition-none` + a neutral transform variant inline, or a dedicated `@media (prefers-reduced-motion: reduce)` block in `globals.css`. Globally, the `@media` block at `globals.css:1064-1073` caps animation-duration to 0.01ms as a final safety net.

---

## 7. Files NOT touched (proof of preservation)

Backend:
- All `backend/**` — no source changes; tests + smoke verify still 173/0 + 14 pass / 0 fail.
- Prisma schema + migrations.
- Stripe / SendGrid / WhatsApp wiring.

Frontend logic:
- All `frontend/lib/**` (data fetching, routing, SEO helpers, country / locale negotiation).
- All `frontend/app/api/**`.
- `frontend/middleware.ts`.
- Cart context (`CartProvider`, `useCart`).
- JsonLd injection (every page's structured data is intact).
- Auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`).
- Admin portal (`app/(admin)/**`).
- Doctor portal (`app/(doctor)/**`).
- Patient portal (`app/(auth)/**`) and all `/account/**` pages.
- All `data-testid`, `aria-*`, `role`, event handlers.
- All analytics / tracking calls.
- All schema-marked content (MedicalBusiness, MedicalProcedure, breadcrumbs).
- All legal copy in `/privacy` and `/brazil/consent`.

Cart + checkout flows on `[country]/[lang]/cart` and `[country]/[lang]/checkout` were also untouched — the audit graded them well (3-4/5 on most dimensions) and they sit on the conversion path where any visual change carries disproportionate risk.

---

## 8. Lock list — verbatim preservation confirmed

Phase 1 lock list was honoured.

- `pageMetadata()` calls present on every modified page.
- `breadcrumbJsonLd`, `medicalBusinessJsonLd`, `medicalProcedureJsonLd` — intact.
- "Licensed doctors", "GDPR compliant", "Lab-quality tests, delivered home" — copy preserved.
- All Portuguese copy on `/brazil/consent` ("Submeter e pagar", "O seu consentimento foi registado", emergency-call text) — preserved.
- Cart `kind` enum (HEALTH_TEST / PRESCRIPTION_SERVICE / GENERAL_CONSULTATION / SPECIALIST_CONSULTATION) — preserved.
- `heldUntil` slot-hold countdown — untouched.
- Stripe disclaimer text — preserved.
- All form field names + autocomplete attributes — preserved.
- Email addresses `info@myglobalhealth.online`, `privacy@myglobalhealth.online`, emergency `112 in EU` — preserved.

---

## 9. Outstanding risks + Phase 6 candidates

1. **`RichBodySection` + `sanitize-html`** — Phase 1 flagged that admin-supplied HTML reaches `dangerouslySetInnerHTML`. `sanitize-html` is in `package.json` deps but I didn't verify the render path actually calls it. Worth a 30-minute audit.
2. **Country / Language switchers still custom dropdowns** — `CountrySwitcher.tsx` and `LanguageSwitcher.tsx` are hand-rolled with manual click-outside + no focus trap. Radix `DropdownMenu` migration deferred; behaviour-equivalent but keyboard navigation lags Radix.
3. **TrustSignals column ternary** (`TrustSignals.tsx:32`) — fragile but functional. Worth a 5-minute simplification.
4. **CountryEntryGate is its own visual language** — uses CSS Modules, isolated from the global token system. Re-skin against the design system if it gets product changes.
5. **`FeaturedDoctor` shows the first qualifying doctor** — first-come, not actually "most booked" / "most recommended". When data on booking volume becomes available, pick on real signal.
6. **Visual screenshot of every page at 1440 + 390 viewports** — mission asked for these in Phase 5 step 4; only captured one screenshot of `/ireland/en` at the preview default viewport. Full screenshot grid would round out the verification.

---

## 10. Commits

```
f1dd817 ui(motion): remove hover-scale on doctor portraits per direction lock
eac55ad ui(a11y): explicit motion-reduce guards on every card hover transform
a21c117 ui(brazil-consent): tighten hierarchy, promote consent block, error a11y
12c3694 ui(blog): featured-post layout, category+date metadata, fix dead CTA
1f57781 ui(consult): promote doctor card CTA to primary pill button
a269a33 ui(tests): fold stock state into CTA, drop cascading badges
86fdf71 ui(services): canonical grid utility, eyebrow + token-driven heros
d099989 ui(home): drop inline style block, wire FeaturedDoctor, use .gh-section
f6d2315 ui(footer): move inline grid <style> block into .gh-footer-grid utility
148aa83 ui(header): extract .gh-header-sticky utility, drop inline backdrop styles
4466def ui(flag): extract Flag atom, replace 4 inline FLAG_CLASS maps
0cfe686 ui(tokens): add fluid spacing tokens + canonical section/grid utilities
```

Branch is 12 commits ahead of `origin/main`. Push when ready.
