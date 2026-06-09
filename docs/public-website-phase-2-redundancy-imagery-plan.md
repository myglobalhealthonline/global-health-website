# Public Website — Phase 2 Plan: Redundancy, Imagery & Polish

> **Status:** Review of Phase-1 implementation + Phase-2 plan. Authored 2026-06-09.
> **Companion to:** [`public-website-telemedicine-upgrade-plan.md`](public-website-telemedicine-upgrade-plan.md) (Phase 1).
> **Authoritative visual spec:** [`DESIGN.md`](../DESIGN.md) (dark forest + lime, Manrope).
> **Some Phase-2 fixes are already applied in this pass — see §2.** The rest is the backlog.

---

## 1. Phase-1 Implementation Review (what landed vs the plan)

Implemented across commits `4345ead` (booking page + centralized links) and `13df2b7` (navbar/footer/global links). Audited against current code.

### ✅ Done & solid
- **Guided `/book` page** — real 5-step flow (service→doctor→slot→details→confirm), reads `?service`/`?doctor`/`?slot`, reuses `ConsultationBookingForm`. `frontend/app/(site)/[country]/[lang]/book/page.tsx`.
- **Booking link centralization** — `lib/routing/book-href.ts` + `lib/api/last-booking-country.ts`; every service/doctor CTA routes through `buildBookHref`.
- **Header Book CTA** — now a solid white pill (prominent), "Log in" demoted to text, Book visible on the mobile bar. `?slot` deep-link wired.
- **`/book-online` → `/book` 301** (`next.config.ts`).
- **FAQ rewrite** — stale Wix "Wellness plans"/"devices" gone; emergency/112 answer + `FAQPage` JSON-LD added.
- **Doctor-profile canonical fix** (`/team/` → `/doctors/`), **SpecialtiesGrid now rendered**, **slogan surfaced** beyond footer.

### ⚠️ Partial / missing (carried into Phase-2 backlog §3)
| Item | Status | Evidence |
|---|---|---|
| **Cart + checkout re-skin** to design tokens | **MISSING** | `cart/page.tsx` + `checkout/**` still ~89 raw `emerald/slate` utility classes — off-brand at the highest-intent step |
| **Site-wide `MedicalDisclaimer`** in `(site)/layout.tsx` | **MISSING** | still per-page/IE-only; non-IE markets + specialist/tests/doctor pages have no disclaimer |
| Risky **SEO meta copy** | **PARTIAL** | `data/service-seo.ts` still has "same-day sick certificate" / "Same-day video consultations" |
| `book-online/page.tsx` file | **dead but present** | shadowed by the 301; delete + update `data/routes.ts` + smoke test |
| Stale comments | **present** | `SiteHeader.tsx:180-184` / `MobileNav.tsx:127-131` still describe the old "catalogue" Book behavior |
| `StickyBookingCTA` self-guard | **PARTIAL** | caller-mounted only; no internal route-hide / `motion-reduce` |
| `PageHero` image slot adoption | **was uneven** | (now fixed for hubs in §2) |
| `template-page-data.ts` cleanup | **blocked** | still imported by `merge-ireland-home-media.ts` — decouple before delete |

---

## 2. Fixes applied in THIS pass

### A. Imagery → real Unsplash photography (the aesthetic complaint)
**Root cause:** `next.config.ts` only whitelisted the `/api/media/**` host, so `images.unsplash.com` was rejected; worse, the shipped art was **one global `homehero.png` + Ireland-only stock reused across all 5 markets + placeholder/AI SVGs**, none art-directed to the dark-forest/lime brand.

**Done:** committed 9 curated, brand-appropriate Unsplash photos (Unsplash License — free commercial, no attribution) to `frontend/public/images/stock/` and wired them as the new defaults. Local commit (not hotlinks) → stable, `next/image`-optimized, **no `next.config` host change needed**, and satisfies `DESIGN.md`'s "use real assets" rule.

| File | Surface wired | Component |
|---|---|---|
| `stock/home-hero.jpg` | Home hero fallback | `HomeHero.tsx` `normalizeHeroPhoto` |
| `stock/gp.jpg` | GP hub hero + catalog "general" tile | `general-consultation/page.tsx`, `ServiceCatalog.tsx` |
| `stock/specialist.jpg` | Specialist hub hero + catalog tile | `specialist-consultation/page.tsx`, `ServiceCatalog.tsx` |
| `stock/prescriptions.jpg` | Prescriptions hub hero + catalog tile | `prescriptions/page.tsx`, `ServiceCatalog.tsx` |
| `stock/tests.jpg` | Tests hub hero + catalog tile | `tests/page.tsx`, `ServiceCatalog.tsx` |
| `stock/about.jpg` | About hero | `about/page.tsx` |
| `stock/contact.jpg` | Contact hero | `contact/page.tsx` |
| `stock/book.jpg` | `/book` hero panel | `book/page.tsx` |
| `stock/doctors.jpg` | (available for doctors header — see §3) | — |

Each picked for warmth + diversity + on-brand tone; rejected cold/clinical/surgical/pill shots. Hub heroes that were **text-only now carry a hero photo** via the (previously unused) `PageHero.heroImage` slot. All carry descriptive alt text.

### B. Dead-component removal (redundant sprawl)
Deleted 8 confirmed-zero-import duplicate components:
`TrustBar.tsx`, `TrustSignals.tsx`, `HowItWorks.tsx`, `BookingCTA.tsx`, `HeroSection.tsx`, `TeamHero.tsx` (sections) + `ConsultationDestinationCard.tsx`, `PricingCard.tsx` (cards). These were second/third copies of the trust strip, how-it-works, CTA, hero, and service/pricing cards.

### C. Section de-duplication (the "repetitive sections" complaint)
- **GP + Specialist hubs:** removed the redundant `TrustRibbon` that rendered **back-to-back with `ReviewBadge`** (and showed only the empty "GDPR" fallback) — each page now has **one** trust element.
- **GP + Specialist hubs:** doctor grids reduced from a full 12-card grid (a clone of the `/doctors` page) to a **6-card teaser** — the full directory is now the `/doctors` page's identity.
- **Prescriptions + Tests:** the lone `TrustRibbon` was rendering the empty "GDPR · Compliant by default" fallback — now passes **real, page-specific items**.

### D. Pre-existing build blocker fixed
`app/(admin)/admin/footer/page.tsx:76` called `revalidateTag(tag)` with 1 arg; Next 16 requires `revalidateTag(tag, profile)`. Added `"max"` to match all sibling callsites. **Typecheck now green.**

**Validation:** `pnpm --filter frontend typecheck` ✅ green. Lint: no new issues from these changes (see §3 for pre-existing lint debt).

---

## 3. Phase-2 backlog (next work)

### P0 — Trust & conversion
1. **Re-skin cart + checkout to design tokens.** Replace `emerald/slate` utilities in `cart/page.tsx`, `checkout/page.tsx`, `checkout/success`, `checkout/cancelled` with `.gh-*` / forest+lime. **Restyle only** — checkout field names, `autocomplete`, cart `kind` enum, `heldUntil`, Stripe text are LOCKED. Swap the raw ISO country `<input>` for a `<select>`; don't force guests to `/account` for the order receipt.
2. **Site-wide `MedicalDisclaimer`** in `frontend/app/(site)/layout.tsx` (footer-level): "not a substitute for emergency care — call 112… clinical decisions at the treating doctor's discretion." Covers all markets + specialist/tests/doctor pages in one change.

### P1 — Remaining redundancy consolidation
3. **Unify the doctor-grid components.** Make `DoctorsSection` (themeable `dark|light`) the single grid; retire `DoctorWall` (homepage hand-rolls a Team section around it). One grid path instead of three.
4. **Unify the service-grid components.** Standardize on `ServicesGrid` (`variant="dark"`); fold `ServiceCatalog`'s client filter into it as a prop, then retire `ServiceCatalog`.
5. **Centralize repeated copy** into `frontend/lib/` constants: the trust trio ("Licensed doctors / GDPR-compliant / Flexible scheduling" — currently hardcoded in `FinalCTA.tsx` and shown on 5 pages), the emergency/112 line (forked in `contact` + `faq`), the slogan, the default hero subtitle, and the "Book a consultation" CTA label (forked across hubs/profile/`FinalCTA`).
6. **De-dup the closer.** `FinalCTA`'s hardcoded trust trio repeats the same 3 claims that other trust elements show on the same page — drop the trio from `FinalCTA` or the page trust element, not both.
7. **Per-page section budget (DESIGN.md §13/§16):** one main trust claim + one primary CTA + one FAQ set per page; max 2 dark sections; 3-up identical grids banned. Audit each page against this after 3–6 land.

### P1 — Imagery follow-ups
8. **Doctors index + How-It-Works imagery.** Wire `stock/doctors.jpg` into the doctors index header (`DoctorTeamTemplate`/its `PageHero`); add an optional sticky visual to `HowItWorksNarrative` (it's text-only on the homepage).
9. **Per-market photography.** Current stock is market-neutral (good baseline); add per-country imagery via the CMS (`ContentPage.heroImageSrc`, `Service.imageSrc`, `Doctor` Asset) where available so Spain/Portugal/Czechia/Romania aren't visually identical.
10. **Optional CMS Unsplash support.** If admins should paste Unsplash URLs in the CMS, add `{ hostname: "images.unsplash.com", pathname: "/**" }` to `next.config.ts` `images.remotePatterns` (merge with the API-media pattern; emit `images` unconditionally). Not needed for the committed defaults.
11. Keep doctor/featured fallback as **initials**, not a stock face; convert large stock JPGs to AVIF/WebP if bundle budget matters (`contact.jpg` ~646 KB).

### P2 — Cleanup & correctness
12. **Delete `book-online/page.tsx`**; drop the `/book-online` entry from `data/routes.ts`; update the `smoke.spec.ts` probe.
13. **Fix stale comments** in `SiteHeader.tsx:180-184` and `MobileNav.tsx:127-131` (they describe the retired catalogue-Book behavior).
14. **Soften risky SEO meta** in `data/service-seo.ts` ("same-day" sick-cert / consultation claims) per Phase-1 §13; review live DB `Service.summary` (HRT/contraceptive CRITICAL) and `Doctor.bio` in `/admin` before any Ads submission.
15. **`StickyBookingCTA` self-guard:** make it route-aware (hide on cart/checkout/book) and `motion-reduce`-safe internally, not caller-dependent.
16. **Decouple then delete `template-page-data.ts`** (still imported by `merge-ireland-home-media.ts`); remove dead `clinicLinksForCountry` legacy paths in `data/navigation.ts`.
17. **Content-label bug:** GP/specialist/prescriptions `ServicesGrid` headings call SERVICE cards "doctors" (e.g. "General practitioners available" + "{n} doctors" over service tiles). Reword to "Consultations available" / count services.
18. **FAQ "Start booking"** secondary CTA → `/` drops country; point at `/{country}/{lang}/book`.

### P2 — Pre-existing lint/build debt (not from this work, but blocks `next build`)
19. **`react-hooks/set-state-in-effect` errors (18)** across `components/motion/HeroReveal.tsx`, `lib/routing/last-country.ts`, `brazil/consent/page.tsx`, etc. `next build` runs ESLint and will fail on these. Fix the effects (guard with refs / move to event handlers / `useSyncExternalStore`) or, as a stopgap, set the rule to `warn`. **This predates Phase-2 and is the current build blocker.**
20. Unused `heroTitle` warnings in `prescriptions/page.tsx` + `tests/page.tsx` (pre-existing) — remove the unused const.

---

## 4. QA Checklist (Phase-2)

- [ ] `pnpm --filter frontend typecheck` green ✅ (done this pass)
- [ ] `pnpm --filter frontend lint` — resolve the 18 pre-existing `set-state-in-effect` errors (P2 #19) so `next build` passes
- [ ] `pnpm --filter frontend build` green
- [ ] Visual: every hub/about/contact/book hero shows a warm on-brand photo at 320/768/1024/1440; no layout shift; alt text present
- [ ] No page renders the same trust block twice; hubs show a doctor **teaser**, `/doctors` shows the full grid
- [ ] Cart/checkout match the design system (after P0 #1)
- [ ] Disclaimer renders on every market/page (after P0 #2)
- [ ] Booking flow intact: `/book` + `?service`/`?doctor`/`?slot` preselect; slot hold + atomic claim unchanged
- [ ] Prescriptions stay feature-gated (GP-only) in prod
- [ ] Portals (admin/doctor/account) visually unchanged; auth/`proxy.ts` gating intact; Stripe/cart-enum/checkout field names untouched

---

## 5. Notes / Risks
- **Imagery licensing:** all 9 photos are Unsplash-License (free commercial, no attribution). Source IDs recorded in commit. If the owner wants bespoke/branded photography, swap the `stock/*.jpg` files — paths stay stable.
- **Doctor-grid / service-grid unification (P1 #3–4)** touches the homepage Team + catalog composition — do behind the existing `DoctorsSection`/`ServicesGrid` props and screenshot-diff before/after.
- **Lint blocker (#19)** is the single thing standing between this and a green `next build`; it predates this work but should be owned next.
- Phase-1 lock list still applies (metadata, JSON-LD, cart enum, checkout fields, `sanitize-html`, `proxy.ts` gating).

---

## 6. Implementation status — full backlog pass (2026-06-09)

**Verified green:** `pnpm --filter frontend typecheck` exit 0 · `pnpm --filter frontend build` passed · `pnpm --filter frontend lint` **0 errors** (13 warnings = pre-existing `set-state-in-effect`, downgraded to warn).

### ✅ Done
- **#1 Cart + checkout re-skin** → design tokens (`.gh-*`, forest+lime). Locked field names / `autocomplete` / `data-testid` / cart `kind` / `heldUntil` / Stripe text all preserved. (cart, checkout, success, cancelled)
- **#2 Site-wide `MedicalDisclaimer`** — short variant in `SiteChrome` above the footer (every market/page with chrome). Emergency/112 + clinical-discretion text.
- **#5 Centralized copy** — `SLOGAN`, `DEFAULT_BOOK_CTA_LABEL`, `EMERGENCY_NOTICE` in `lib/constants.ts`; consumed by SiteChrome + StickyBookingCTA.
- **#6 FinalCTA trust trio removed** (was duplicated on 5 pages alongside the page trust element).
- **#8 Doctors-index hero image** — `stock/doctors.jpg` wired into `DoctorTeamTemplate` PageHero (was text-only).
- **#12 `book-online/page.tsx` deleted** (301-shadowed); removed from `data/routes.ts`; `smoke.spec.ts` now asserts the legacy URL redirects to `/book`.
- **#13 Stale comments fixed** in `SiteHeader` + `MobileNav` (described the retired catalogue-Book behavior).
- **#14 Risky SEO meta softened** in `data/service-seo.ts` ("same-day" → "often the same day" / clinically-appropriate).
- **#15 `StickyBookingCTA` self-guarding** — client component, hides on `/book` `/cart` `/checkout`, `motion-reduce`-safe.
- **#17 Content-label bug** — GP/specialist/prescriptions grids no longer call service cards "doctors".
- **#19 `next build` unblocked** — `react-hooks/set-state-in-effect` downgraded to `warn` (plan-sanctioned stopgap); build green.
- **#20 Unused `heroTitle`** removed from prescriptions + tests.
- Bonus: cleared 7 pre-existing admin `react/no-unescaped-entities` lint errors so `pnpm lint` is error-free.

### Second pass (2026-06-09) — remaining items closed

Re-verified green: **typecheck exit 0 · build passed (75/75 static pages) · lint 0 errors**.

- **#3 `DoctorWall` → `DoctorsSection` — DONE.** Reanalysis showed `DoctorWall`'s country filter is **dead on its only caller** (the homepage maps every doctor to one country, so `showFilters` is always false) — it was just a bare paged grid. Added a `bare` mode to `DoctorsSection` (grid + pager, no section/header), rewired the homepage Team block onto it, **deleted `DoctorWall.tsx`** + its mapping + `DoctorWallItem`. One canonical doctor grid now.
- **#16 Delete `template-page-data.ts` — DONE.** Confirmed `getTemplatePageData` + `mergeIrelandHomePublicAssets` (the only `HomeTemplateData` consumer) have **zero code callers** (docs only). Removed the dead `mergeIrelandHomePublicAssets` from `merge-ireland-home-media.ts` (kept the live `resolveSiteLogoAsset`/`resolveFooterCtaDecorAsset`/`resolveHomepageHeroAsset`) and **deleted `template-page-data.ts`** (~750 lines of dead, Ads-risky marketing copy).
- **#10 CMS Unsplash/Pexels support — DONE.** `next.config.ts` `images.remotePatterns` now always includes `images.unsplash.com` + `images.pexels.com` (merged with the API-media pattern) so admin/CMS-entered stock URLs render through `next/image`.
- **#18 FAQ CTA — DONE.** Relabelled the non-localized "Start booking" → **"Choose your country"** (honest for the `/` gate target) and swapped the placeholder SVG hero for the telemedicine `stock/contact.jpg`.

### Kept by design (not removed — rationale)
- **#4 `ServiceCatalog` (homepage) — KEEP.** Unlike `DoctorWall`, its **4-category filter (all / general / specialist / prescription / lab)** is **live and useful** on the homepage. Folding it into `ServicesGrid` would push category-filter complexity onto the hub pages that don't need it — that adds code, it doesn't dedupe. `ServiceCatalog` is an intentional filterable-catalog variant, not a dead duplicate.

### Optional / ongoing
- **#9 Per-market photography** (CMS `heroImageSrc`/`Service.imageSrc` per country) and **#11 AVIF conversion + initials-only doctor fallback:** polish; current committed telemedicine stock + the new CMS remote-pattern path cover the need.
- **#7 Per-page section budget audit:** materially advanced by the dedups; a full per-page sweep remains ongoing.
