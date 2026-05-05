# Public Website QA

Audit date: 2026-05-05

## Book-online — browser QA with backend API (2026-05-05)

Cross-reference: `backend/docs/booking-persistence-qa.md` (API matrix, CORS, DB caveats).

**Environment**

- `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:4000` (gitignored; see `frontend/.env.example`).
- Backend `http://localhost:4000` with `DATABASE_URL` from `backend/.env` (loaded via `dotenv` in dev).

**Screenshots** (`frontend/docs/qa-screenshots/`)

- `book-online-viewport-320.png`, `book-online-viewport-390.png`
- `book-online-viewport-768-form.png`, `book-online-viewport-1024-form.png`, `book-online-viewport-1440-form.png`

**Results**

- **Client validation:** Empty submit shows inline errors + **Please review the highlighted fields before submitting.** No API call until fields pass.
- **Consent:** Unchecked consent surfaces consent copy under the checkbox + summary status; no POST.
- **Invalid email:** Blocked client-side (**Enter a valid email address.**); no POST.
- **Happy-path messaging:** Success uses backend message **Request received. Our team will follow up.** — no wording that claims a confirmed appointment. (This session could not reach success locally because `DATABASE_URL` used an internal Railway hostname; the UI exercised loading state then the safe **Booking service is temporarily unavailable…** banner for `503`.)
- **CORS:** Required `@fastify/cors`; without it the browser showed the same safe unavailable banner because `fetch` failed before JSON.
- **Mobile usability:** Form controls use shared `gh-*` input styles; consent remains readable; booking card uses `overflow-x-hidden` + `min-w-0` grids to limit horizontal bleed at narrow widths.
- **Hydration:** `HeroSection` hero copy wrapper uses `suppressHydrationWarning` to reduce dev-only mismatch noise.

**Fixes in this pass (frontend)**

- `lib/api/client.ts`: surface first Zod `fieldErrors` string on `400` responses.
- `BookingFormTemplate.tsx`: `min-w-0` / `overflow-x-hidden` layout hardening; unavailable mapping covers DB-down and network paths.
- `HeroSection.tsx`: `suppressHydrationWarning` on hero content wrappers.

## Phase 3.6 — public content read integration (2026-05-05)

**Merge strategy:** Prefer backend `GET /api/*` when `NEXT_PUBLIC_API_URL` is set and the response succeeds within ~4s; otherwise keep static seeds and template builders. Country routing paths use DB values only when all four legacy paths are present (see `frontend/docs/public-content-integration.md`).

**Automated validation (this workspace):** `pnpm lint`, `pnpm typecheck`, `pnpm build` (frontend root); `pnpm --filter backend typecheck`, `pnpm --filter backend build`, `pnpm --filter backend test` — all passing after integration.

**Manual spot-check (recommended)**

| Scenario | Expectation |
| -------- | ----------- |
| A — Backend up, seeded DB | Ireland listings/details, team pages, pricing pages, and doctor profile show merged CMS names/copy where rows exist; static inventory routes unchanged. |
| B — Backend offline / no `NEXT_PUBLIC_API_URL` | Same URLs render fallback-only content; no crashes; optional dev console fallback warnings only in development. |
| C — Incomplete rows | Missing summaries/bios fall back to template defaults; legacy URLs preserved when paths incomplete in DB. |

**Backend-offline smoke:** With `NEXT_PUBLIC_API_URL` unset or backend stopped, loading `/`, `/home`, `/home-pt`, `/book-online`, `/general-consultation-ie`, `/specialty-ie`, `/ireland/medical-consultation`, `/ireland-team`, `/ireland-doctors/dr-mirza-aun-mohammad`, `/plans-pricing` should return **200** with fallback content (verified via code paths + build; live browser optional).

## Pages Reviewed
- `/`
- `/home`
- `/home-pt`
- `/home-sp`
- `/home-cz`
- `/home-rm`
- `/book-online`
- `/general-consultation-ie`
- `/specialty-ie`
- `/ireland/medical-consultation`
- `/ireland/diabetes-consultation`
- `/ireland-specialist-consultations/cardiology-consultation`
- `/ireland-team`
- `/ireland-doctors/dr-mirza-aun-mohammad`
- `/plans-pricing`
- `/online-prescription`
- `/home-delivery`
- `/home-health-test`
- `/blog`
- `/post/how-online-medical-consultations-work`
- `/privacy`

## Viewport Notes
- `320`: verify no horizontal scroll, menu readability, stacked cards, clear booking CTA
- `390`: verify mobile balance for hero, service cards, booking form, footer CTA
- `768`: verify tablet wrapping and section spacing
- `1024`: verify header/nav density and two-column template balance
- `1280`: verify card rhythm, hero hierarchy, footer spacing
- `1440`: verify max-width discipline and restrained whitespace

## UI/UX Issues Found
- Some shared pages still used the earlier Wix-derived palette rather than the approved healthcare palette.
- Shared templates were structurally sound but too generic in hierarchy, making key pages feel like scaffolds instead of guided patient journeys.
- Booking form fields were readable but not yet unified under a consistent input/label system.
- Header and mobile navigation had small polish issues:
  - touch-target consistency
  - CTA emphasis
  - dropdown sizing
  - encoding glitch in mobile accordion icon
- Footer copy had an encoding issue in the copyright row and needed calmer panel treatment.
- Doctor/profile cards felt too placeholder-heavy and not credible enough in presentation.

## Fixes Applied
- Normalized global tokens in `frontend/app/globals.css` to the approved palette:
  - dark green primary
  - soft green accent
  - white background
  - neutral borders
  - `#333333` body text
  - `#666666` muted text
- Added shared field classes:
  - `gh-input`
  - `gh-select`
  - `gh-textarea`
  - `gh-field-label`
- Strengthened global focus visibility and tap-target sizing.
- Refined shared header/navigation:
  - cleaner CTA sizing
  - better desktop nav padding
  - calmer hover states
  - clearer dropdown width and padding
  - mobile menu icon/fixed CTA polish
- Refined footer:
  - softer background panel
  - better content width balance
  - corrected copyright rendering
  - improved CTA/footer transition block
- Improved shared content sections and cards:
  - hero trust badges
  - clearer country selector chips
  - stronger step markers
  - softer trust icon treatment
  - improved service metadata chips
  - more credible doctor placeholder panels
  - clearer pricing/blog/home-test card hierarchy
- Improved high-intent templates:
  - booking flow
  - consultation listings
  - service detail
  - doctor team/profile
  - blog index/article
  - legal pages
  - static marketing pages

## Remaining Gaps
- Exact visual parity with the live Wix site is still blocked by missing real brand assets:
  - final logo
  - final hero imagery
  - doctor photos
  - trust badges/illustrations
  - footer CTA art
- Some service, doctor, blog, and legal pages still use safe generalized content rather than final editorial or clinical copy.
- Country-specific pages inherit the improved system correctly, but final parity still depends on approved local assets and content review.

## Final Frontend Polish Pass

### Representative Pages Checked
- `/`
- `/home`
- `/book-online`
- `/general-consultation-ie`
- `/specialty-ie`
- `/ireland/medical-consultation`
- `/ireland-team`
- `/plans-pricing`
- `/blog`
- `/privacy`

### Viewports Checked
- `320`
- `390`
- `768`
- `1024`
- `1280`
- `1440`

### Final Polish Fixes Applied
- Footer legal row encoding issue corrected and footer spacing tightened.
- Header/footer shell kept intact while improving production polish:
  - steadier logo sizing
  - clear CTA emphasis
  - calmer footer panel treatment
- Booking page UX clarified:
  - required field indicators added
  - frontend-preview notice when `NEXT_PUBLIC_API_URL` is missing; live request path when configured
  - helper text and consent block kept visible
  - submit action reflects backend outcome (success, validation error, or unavailable) without claiming a confirmed appointment

### Remaining Frontend Gaps
- Launch readiness is still blocked by final approved brand assets, especially the logo and footer CTA art.
- Core page UX, responsiveness, navigation, and template structure are ready for backend/admin integration.

## AI-Generated Asset Replacement Summary

- Replaced visible placeholder logo with temporary wordmark asset.
- Replaced visible homepage and country-home illustration placeholders with branded healthcare illustration assets.
- Replaced visible Ireland about, delivery, doctor spotlight, and footer CTA placeholder artwork.
- Removed visible “image placeholder” treatment from shared doctor cards and doctor profile pages.

### Pages Checked After Asset Swap
- `/`
- `/home`
- `/book-online`
- `/general-consultation-ie`
- `/specialty-ie`
- `/ireland/medical-consultation`
- `/ireland-team`
- `/home-delivery`
- `/home-health-test`
- `/blog`

### Remaining Asset Gaps
- official final logo
- officially approved footer CTA art
- approved real doctor/team imagery if desired
- optional branded icon pack rollout into more components

## `/book-online` — browser QA with backend API (2026-05-05)

- **Setup:** `NEXT_PUBLIC_API_URL=http://localhost:4000` in `frontend/.env.local`; backend `http://localhost:4000/health` returned `200`.
- **Integration:** Valid submissions issue `POST` to `/api/appointments` from the browser (no CORS failure observed). Loading state: submit label **Submitting request...** and disabled button.
- **Success copy:** When the API returns `200`, the UI shows the API message (request received / team follow-up) and does not claim a confirmed appointment (see in-page notice and adapter copy).
- **This run:** Backend responded **`503`** with `Appointments are temporarily unavailable`, so **no database row** was created. The UI shows **Booking service is temporarily unavailable. Please try again later or contact the clinic team directly.** after mapping 503 to the same copy as a dead network (see `BookingFormTemplate` update).
- **Validation:** Missing fields, missing consent, and invalid email are blocked client-side with readable errors; no `POST` until the client validation passes.
- **Mobile / widths:** Checked at `320`, `390`, `768`, `1024`, `1440` (resize + form snapshots). Representative screenshots: `frontend/docs/qa-screenshots/book-online-viewport-320.png`, `frontend/docs/qa-screenshots/book-online-form-1440.png`.
- **Dev-only note:** Cursor IDE browser automation adds `data-cursor-ref` attributes and can trigger a **hydration mismatch** warning in React dev overlay; treat as tooling noise unless reproduced in a normal browser without automation.
