# Performance Optimization Audit

_Audit date: 2026-07-08 · Branch: `Dev-hassaan` · Method: 7 parallel specialist static-analysis passes over the live repo + build/typecheck/lint/dependency-audit runs. This report supersedes the previous version and reflects the **current** state of the code._

## Executive Summary

`global-health-website` is a pnpm monorepo: a **Next.js 16.2.6 / React 19.2.4 / Tailwind 4** frontend and a **Fastify 5.8 / Prisma 7.8 / PostgreSQL 16** backend, deployed on Railway. The codebase has clearly been through at least one serious performance pass already, and it shows: images go through `next/image` (AVIF/WebP, responsive `sizes`, priority heroes), heavy client widgets (WebGL globe, rich-text editors, Doctify, same-day booking) are `next/dynamic`, **no web fonts** are loaded (system-font stack → zero font render-block/CLS), the backend has compression + CDN cache headers + a thoroughly indexed schema + bounded-parallel queries, and there is no `framer-motion`/`moment`/`lodash`/`date-fns` weight in the client bundle.

Because of that, several severe findings from the *previous* edition of this report are now **stale/remediated** and are not repeated here (see “Changes since the prior audit”). What remains is a smaller, sharper set of real issues. The biggest live drains are:

1. **The full 6-language i18n bundle (~537 KB raw JSON) ships to the browser on the cart and checkout pages** because a server-only loader is imported by client components — dead weight on the two highest-intent conversion pages.
2. **PDF generation runs headless Chromium (Playwright) synchronously in the request path** — for doctor documents and, worse, `await`ed inside the Stripe order-completion flow. Multi-second blocking work on an event-loop process, with a dead-browser failure mode that needs a restart to clear.
3. **The WebGL globe on the landing entry-gate is destroyed and rebuilt on every keystroke** in the country search box (unstable effect deps), janking the first interaction on `/`.
4. **A reconciliation cron makes one sequential Stripe API call per subscription** (up to 200), running hourly and on every boot — tens of seconds of serial latency.
5. **Per-doctor availability reads write to the database on every GET** (lazy slot materialization + expiry sweep), on a read-heavy, crawlable endpoint, with no cache.

Overall performance risk: **Medium**. Public-facing Core Web Vitals are in good shape (the earlier “45–65 mobile Lighthouse” risk has been substantially addressed); the remaining costs concentrate in (a) two client-bundle/interaction issues on conversion pages, (b) backend request-path blocking work, and (c) portal-only image weight. None are architecture-breaking; most are Easy/Medium fixes.

## Remediation Status — Applied 2026-07-08

Fixed and verified (tsc + lint green on all touched files):

- ✅ **P-003** — Globe color defaults hoisted to module consts + `Globe` wrapped in `React.memo` (`frontend/components/ui/cobe-globe.tsx`). Stops the per-keystroke WebGL teardown/rebuild on the landing `/` search.
- ✅ **P-002 (partial)** — `waitUntil: "networkidle"` → `"load"` (~500 ms/render saved) and browser self-heal on `disconnected`/failed-launch (`backend/src/modules/generated-documents/html-document-renderer.ts`). _Deferred: moving PDF generation fully off the request path (queue) and the invoice fire-and-forget — the latter needs confirmation the payment-confirmation flow doesn’t read the invoice synchronously (money path)._
- ✅ **P-015 + cleanup** — Removed 2.7 MB orphaned PNGs (`public/images/portal/generated/`) and dead components (`footer-column.tsx`, `demo.tsx`) via `git rm` (grep-confirmed unreferenced). _Note: `HeroBookingWizard.tsx` was also removed but **restored at the owner's request** — keep it._
- ⏭️ **P-016** — Re-assessed as a non-issue: the entry-gate hero is a `<picture>` with AVIF + mobile-1080 art-directed sources; the raw `<img>` is only the fallback. No change made.

**Round 2 (later 2026-07-08):** additionally fixed **P-004** (batched reconciliation Stripe reads), **P-006** (advisory-lock cron ticks), **P-007** (removed needless `"use client"`), **P-008 + P-010** (portal image re-encode, ~6.5 MB → ~0.15 MB), **P-011** (public `overflow-x: clip`), **P-012** (marquee off-screen pause), **P-017** (cart `useMemo`), **P-018** (cron N+1 → single query), **P-020** (contrast/size on conversion labels), **P-021** (cookie-banner dock), plus all 29 backend lint errors cleaned so `pnpm --filter backend lint` is green. **P-005** partially done (redundant-write guard).

Still open — each needs a decision, runtime/load verification, or is deliberate (NOT blind-safe): **P-001** (i18n client bundle — refactor + per-locale browser verify), **P-002** (off-request-path PDF queue — latency wins already shipped), **P-005** (per-doctor TTL cache — load verify), **P-009** (globals.css split — visual verify all portals), **P-013** (drop Playwright — needs Brazil PDF template), **P-014** (migrate-on-boot — Railway infra decision), **P-019** (shared rate-limit store — needs Redis / multi-replica), **P-022** (deliberate), plus the two optional `@@index` additions (migration).

## Stack Detected

- **Framework:** Next.js 16.2.6 (App Router, `output: "standalone"`, Turbopack root)
- **Frontend:** React 19.2.4, TypeScript 5 (strict), Tailwind CSS v4 (CSS-first, `gh-*`/`gh2-*`/`lux-*` tokens)
- **Backend:** Fastify 5.8.5, TypeScript (strict, ESM via `tsx`), Prisma 7.8 with `@prisma/adapter-pg`
- **Database:** PostgreSQL 16
- **Styling:** Tailwind v4 + a single hand-authored `globals.css` (~9,024 lines / 252 KB)
- **Animation libraries:** None heavy — custom scroll-reveal (`RevealOnScroll`), `cobe` WebGL globe, CSS transitions/keyframes. **No Framer Motion / GSAP.**
- **Deployment:** Railway — backend via Nixpacks (`backend/nixpacks.toml` + `railway.json`), frontend via `frontend/Dockerfile` + `railway.toml`
- **Other important tools:** Stripe, S3-compatible storage, SendGrid/Gmail, WaSender WhatsApp, Playwright (backend PDF fallback + e2e), Vitest, `@next/bundle-analyzer`

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `pnpm audit --prod --json` | **0 vulnerabilities** (540 prod deps) | The prior report’s Critical `sanitize-html` / High `next` / Moderate `hono`+`postcss` findings are **resolved** — overrides + version bumps landed. |
| `pnpm audit --json` (all severities) | **0 vulnerabilities** | Clean across dev + prod. |
| `cd frontend && tsc --noEmit` | **Pass (exit 0)** | Prior `doctorAmountCents` schema/code drift is fixed. |
| `cd backend && tsc --noEmit` | **Pass (exit 0)** | Clean. |
| `cd frontend && eslint .` | **Pass (exit 0)** | 5 warnings only (unused imports: `Link`, `TrustMarquee`, `trustMarqueeItems`, `DoctifyReviewsSection`, one stale eslint-disable). Prior React-19 rule *errors* are gone. |
| `cd backend && eslint src` | **Fail (exit 1)** | 29 errors + 40 warnings — almost all `no-unused-vars` (`orders.route.ts`, `service-faq.service.ts`, test files) + `no-explicit-any` + 2 `no-console`. Lint-only; does not affect the compiled output (tsc passes). |
| Installed-version check (`next`/`react`/`fastify`/`prisma`/`stripe`/`sanitize-html`) | next 16.2.6, react 19.2.4, fastify 5.8.5, @prisma/client 7.8.0, stripe 22.1.1, sanitize-html 2.17.5 | Matches lockfile; no vulnerable versions installed. |
| Production build (`next build`) | **Not re-run this pass** | Prior pass recorded a successful standalone build (~1m43s). Recommend re-running `ANALYZE=true pnpm --filter frontend build:analyze` to capture a fresh treemap (the analyzer previously produced no output — verify `ANALYZE` reaches the plugin). |

## Changes Since the Prior Audit (reconciliation)

The previous `PERFORMANCE_OPTIMIZATION_AUDIT.md` led with: whole-site client hydration via `SiteChrome`, images bypassing optimization (`unoptimized`/raw `<img>`), no `next/dynamic` anywhere, render-blocking fonts, and dependency vulnerabilities. Re-verification against the current tree shows these are **no longer accurate**:

- ✅ `next/dynamic` **is** used (globe, editors, Doctify, SameDayBooking) — code-splitting is in place.
- ✅ `next/image` **is** used correctly across heroes/cards (fill + priority + responsive `sizes`); only 2 raw `<img>` remain (entry-gate hero, Meta-Pixel noscript).
- ✅ Fonts are the **system stack** — zero render-block, zero font CLS.
- ✅ Dependency vulns: `pnpm audit` now clean; typecheck green.
- ⚠️ Header remains a server component; the client-boundary concern is now narrowed to a few genuinely-needless `"use client"` files (P-007), not the whole shell.

The findings below are the residual, verified-current issues.

## Repository Areas Reviewed

- `frontend/app/` — root + `(site)`/`(auth)`/`(admin)`/`(doctor)`/`(corporate)` layouts, pages, route handlers, `globals.css`
- `frontend/components/` — sections, layout, cards, cart, media, motion, portal shells, calendar, chat
- `frontend/lib/` — i18n loader + locales, API wrappers, content sanitizers, routing
- `frontend/next.config.ts`, `frontend/proxy.ts`, `frontend/public/` (asset weights)
- `backend/src/` — `app.ts`, `server.ts`, `internal-scheduler.ts`, routes (132), services/modules (availability, doctors, countries, settings, orders, invoices, generated-documents, subscriptions/ops)
- `backend/prisma/schema.prisma` (3,977 lines — full index inventory)
- Deploy/config: `nixpacks.toml` (root + backend), `railway.json`, `frontend/railway.toml`, `frontend/Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, both `tsconfig.json`, both eslint configs

## Biggest Performance Problems (ranked)

| # | Problem | Where | Severity |
|---|---|---|---|
| 1 | Full 6-locale i18n JSON (~537 KB) shipped to client on cart + checkout | `lib/i18n/load-locale.ts` + cart/checkout/PlanCoverage | High |
| 2 | Chromium PDF render synchronous in request path (incl. Stripe completion) | `generated-documents`, `invoice-pdf`, `complete-order-payment` | High |
| 3 | WebGL globe re-inits on every keystroke on `/` | `cobe-globe.tsx` + `CountryEntryGate.tsx` | High |
| 4 | Reconciliation cron: sequential Stripe call per subscription (≤200) | `reconciliation.service.ts` | Med-High |
| 5 | Per-doctor availability GET writes to DB every request, uncached | `doctor-availability.service.ts` | Medium |
| 6 | In-process scheduler, no distributed lock, re-runs heavy work per deploy | `internal-scheduler.ts` | Medium |
| 7 | Needless `"use client"` on presentational components | `FeaturedDoctor`, `HealthcareMediaFrame`, `ServiceCard` | Medium |
| 8 | 1.96 MB PNG as a CSS background (portal LCP) | `membership-silk.png` + `globals.css` | Medium |
| 9 | Monolithic 252 KB `globals.css` render-blocks every public route | `app/globals.css` | Med (Low-Med) |
| 10 | Playwright + Chromium (~150–300 MB) baked into the backend image | `backend/package.json` + `nixpacks.toml` | Medium (build/deploy) |

## Core Web Vitals Risk Assessment

### LCP Risks
- **Public:** Low. Heroes use `next/image` with AVIF + `priority` + responsive `sizes`; the entry-gate hero is a correctly-sized 62 KB WebP (raw `<img>`, dims + `fetchPriority="high"` set → prioritized, no CLS, but misses AVIF/mobile srcset — see **P-016**).
- **Portal (authenticated):** The real LCP concern — `membership-silk.png` (1.96 MB PNG) and ~1 MB silk WebPs are used as CSS `background-image`, which bypasses `next/image` entirely (no transcode, no resize). See **P-008 / P-010**.

### CLS Risks
- Low across the board. Every `next/image` has `fill` or explicit dimensions; the globe mounts into a sized placeholder; no web fonts to swap. The only injected element is the cookie banner (fixed-position overlay, not layout-flowing) — but on first visit it *overlaps* the bottom conversion bar (**P-021**), a usability rather than CLS issue.

### INP / Interaction Lag Risks
- **Globe re-init per keystroke (P-003)** is the sharpest INP risk — it tears down and rebuilds a `mapSamples: 16000` WebGL context on each character typed in the landing country search.
- Cart per-row 1 Hz countdown + `loadLocaleBundle()` called in the render body (**P-017**) — bounded, minor.
- Otherwise no large eager hydration islands; heavy widgets are `next/dynamic` and canvas-isolated.

### TTFB Risks
- Public reads are shielded by CDN `Cache-Control` (`s-maxage` + `stale-while-revalidate`) and DB queries are indexed/paginated — low.
- **Backend request-path blocking (P-002)** is the main TTFB/latency risk under load: Chromium renders and the Stripe-completion invoice `await` add seconds to those specific responses.
- `prisma migrate deploy` on every boot (**P-014**) adds migrate latency to each restart and can crash-loop the API on a bad migration.

## Frontend Rendering Issues
Detailed in **P-001, P-003, P-007, P-016, P-017, P-022**. Summary: the provider tree is minimal (only a `useMemo`-guarded `CartProvider` wraps `(site)`), scroll/observer usage is already rAF-throttled + passive + touch/reduced-motion-aware, and `RevealOnScroll` disconnects after first fire. The residual issues are (a) a server-only i18n loader leaking into client bundles, (b) an unstable-deps WebGL effect, and (c) a handful of presentational components declaring client boundaries they don’t need.

## Mobile Performance & Rendering Issues
Detailed in **P-009, P-011, P-012, P-020, P-021**. The three previously-documented mobile fixes still hold (verified): `@media (pointer:coarse)` kills all `backdrop-filter` (the Android matrix-glitch root cause), `RevealOnScroll` bails on touch, and the notification popover is viewport-pinned. Reduced-motion is comprehensively respected; pinch-zoom is preserved (no `user-scalable=no`); safe-area insets are honored on all fixed bottom bars; the historical header overflow is resolved (nav gated behind `xl:`). New residuals are small: no `overflow-x` safety net on the public shell, the 252 KB CSS monolith, a permanently-promoted marquee layer, sub-12px low-contrast labels, and the cookie-banner overlap.

## Asset & Bundle Issues
Detailed in **P-008, P-010, P-015, P-016**. Public asset delivery is healthy (all ≤152 KB public images go through `next/image`; `lucide-react` is tree-shaken by Next 16’s default `optimizePackageImports`; `flag-icons` CSS is 28 KB module-scoped). The weight is concentrated in `public/images/portal` (9.1 MB of 12 MB total, authenticated-only) and 2.7 MB of orphaned PNGs that ride into the Docker image.

### 15 Largest Static Assets

| File | Size | Served via | Scope |
|---|---|---|---|
| `public/images/portal/obsidian/membership-silk.png` | 1.96 MB | CSS `url()` | portal |
| `public/images/portal/generated/patient-record-empty-state.png` | 1.40 MB | **unreferenced** | orphan |
| `public/images/portal/generated/admin-content-management-accent.png` | 1.38 MB | **unreferenced** | orphan |
| `public/images/portal/obsidian/card-silk.webp` | 1.05 MB | CSS `url()` | portal |
| `public/images/portal/obsidian/band-aurora.webp` | 1.00 MB | CSS `url()` | portal |
| `public/images/portal/obsidian/canvas-aurora.webp` | 985 KB | CSS `url()` | portal |
| `public/images/portal/obsidian/plane-veil.webp` | 875 KB | CSS `url()` | portal |
| `public/images/portal/obsidian/header-aura.webp` | 811 KB | CSS `url()` | portal |
| `public/images/stock/about.jpg` | 152 KB | `next/image` | public |
| `public/logos/partners/medical-council-ie.png` | 143 KB | `next/image` | public |
| `public/images/stock/doctors.jpg` | 143 KB | `next/image` | public |
| `public/images/stock/specialist.jpg` | 128 KB | `next/image` | public |
| `public/logos/partners/cmr.png` | 127 KB | `next/image` | public |
| `public/images/stock/home-hero.jpg` | 123 KB | `next/image` | public |
| `public/images/stock/tests.jpg` | 123 KB | `next/image` | public |

## Animation & Scroll Lag Issues
Detailed in **P-003, P-012**. No Framer Motion/GSAP. The globe’s own visibility/low-power handling, `HeaderScrollShell` (rAF + hysteresis + passive), and `DoctorCarousel` (rAF-throttled) are all well done. The two issues are the globe re-init and the always-live marquee compositor layer.

## API / Backend Performance Issues
Detailed in **P-002, P-004, P-006, P-019**. No classic Prisma N+1 was found in request handlers; `Promise.all` + batched `IN (...)` and explicit `select` projections are used widely. The problems are request-path Chromium rendering, a sequential Stripe loop in a cron, and an in-process scheduler without a distributed lock.

## Database Performance Issues
Detailed in **P-005, P-018**, plus minor index gaps. The schema is heavily and correctly indexed. Residuals: availability reads that write on every GET, an N+1 in a cron sweep, and two minor missing indexes:

- **`Doctor.slug`** — slug-only lookups (`getDoctorByCountryAndSlug`, `listDoctorsByCountry`) can’t use `@@unique([countryId, slug])` (leftmost column is `countryId`). Add `@@index([slug])` if the roster grows. Negligible today.
- **`Appointment [doctorId, email]`** — the doctor-scoped patient-history read filters `{ email, doctorId }` on two separate single-column indexes; a composite would be tighter. Low priority.

## Deployment / Hosting Performance Issues
Detailed in **P-010, P-013, P-014**, plus config cleanup. Backend image carries a full headless Chromium for one country’s PDF fallback; migrations run on every boot; and there are three overlapping frontend build definitions (root `nixpacks.toml` builds *only* frontend and never backend — a trap).

---

## Detailed Findings

### ✅ ~~Finding P-001: Full 6-language i18n bundle (~537 KB JSON) shipped to the client on cart & checkout~~ — DONE 2026-07-08 (server pages compute slices → client children get props; `loadLocaleBundle` now server-only; build-verified locale JSON gone from cart/checkout/verify chunks. Follow-up: same pattern remains in 5 `account/*` client components.)
- **Severity:** High
- **Category:** frontend / bundle
- **Affected files:** `frontend/lib/i18n/load-locale.ts:4-83` (static `import` of every namespace × every locale — 60+ JSON files, all referenced by `loadLocaleBundle` so none can tree-shake); client importers `frontend/components/cart/PlanCoverage.tsx:9,40`, `frontend/app/(site)/[country]/[lang]/cart/page.tsx:33,137`, `frontend/app/(site)/[country]/[lang]/checkout/page.tsx:30,104`, `frontend/app/(auth)/(public)/verify-email/page.tsx:8`, `frontend/app/(auth)/(public)/reset-password/page.tsx:7`
- **Problem:** `load-locale.ts` eagerly imports all locales × namespaces (`en/pt/es/cs/ro/de` × `home/services/faq/legal/forms/about/contact/auth/account/subscription/...`), ~537 KB raw across ~66 JSON files (~110 KB/locale). Because a **client** component imports the loader, the whole module graph is emitted into that route’s client JS. Cart and checkout each ship all six languages even though only one locale’s slice is read.
- **Why it matters:** ~90–130 KB gzipped of dead JSON parsed on the client on the two highest-intent conversion pages — hurts TTI/INP and main-thread parse time on mobile, for strings the server already has.
- **Recommended fix:** Keep `loadLocaleBundle` server-only. Pass the needed slice (e.g. `t = common.cartPage`) down as props from a server parent, or use per-locale dynamic `import()` so only one locale chunk loads. Cheapest: hoist the cart/checkout/coverage strings and hand them in as props from the server layout that already computed the locale.
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** P1

### ✅ ~~Finding P-002: Headless Chromium (Playwright) PDF rendering runs synchronously in the request path~~ — DONE 2026-07-08 (networkidle→load + browser self-heal + invoice generation now fire-and-forget off the payment path, verified nothing reads the invoice synchronously. A dedicated durable job queue remains an optional future upgrade.)
- **Severity:** High
- **Category:** backend
- **Affected files:** `backend/src/modules/generated-documents/html-document-renderer.ts:64-91` (`getBrowser` + `htmlToPdfBuffer`), `backend/src/modules/generated-documents/generated-documents.service.ts:425`, `backend/src/modules/invoices/invoice-pdf.ts:306`, `backend/src/modules/orders/complete-order-payment.service.ts:501-505` (invoice generation `await`ed during payment completion)
- **Problem:** Every doctor document and order invoice is rendered by launching a headless Chromium page, `page.setContent(html, { waitUntil: "networkidle" })` (a fixed ~500 ms idle wait), and `page.pdf(...)` — all `await`ed inside the HTTP handler. `ensureOrderPaidAutomations` (Stripe completion flow) awaits invoice rendering before returning, adding Chromium latency to webhook processing. The browser is a lazy singleton (`browserPromise`); if it crashes, the promise keeps resolving to a dead browser and every render fails until process restart — no liveness check. Docs are additionally serialized per `appointmentId:type` by an in-process mutex.
- **Why it matters:** Seconds of wall-clock per PDF on a single event-loop process. Under concurrency (multiple doctors, a burst of paid orders), latency and per-page memory spike and can starve other requests; a single Chromium crash takes out all PDF generation process-wide.
- **Recommended fix:** Move PDF rendering off the request path (DB-backed job drained by the existing scheduler; return a “generating” state). Quick wins meanwhile: (a) fire invoice generation as a non-awaited task in `ensureOrderPaidAutomations` (already try/caught + idempotent); (b) switch `waitUntil: "networkidle"` → `"load"` (templates load no network resources — QR is a data URL); (c) reset `browserPromise` on `browser.on("disconnected")` so a crash self-heals.
- **Difficulty:** Medium (quick wins are small; a full queue is larger)
- **Expected impact:** High
- **Priority:** P1

### ✅ ~~Finding P-003: WebGL globe destroyed & recreated on every keystroke in the entry-gate search~~ — DONE 2026-07-08
- **Severity:** High
- **Category:** rendering
- **Affected files:** `frontend/components/ui/cobe-globe.tsx:45-65` (color defaults declared as default params → new array each render), `:335-355` (effect dep array includes those colors), `:285-305` (`createGlobe(... mapSamples:16000 ...)`); `frontend/components/sections/CountryEntryGate.tsx:124` (`countryQuery` state), `:275-285` (`<Globe>` not `React.memo`, colors not passed)
- **Problem:** The globe’s init effect depends on `baseColor/markerColor/arcColor/glowColor`. The caller never passes them, so the destructured default arrays are re-allocated every render, changing identity and firing the effect’s cleanup+re-run. `CountryEntryGate` re-renders on each `countryQuery` change (typing), and `Globe` isn’t memoized — so each keystroke tears down and rebuilds the `mapSamples: 16000` WebGL globe.
- **Why it matters:** `createGlobe` allocates GPU/CPU buffers and rebuilds the map texture; doing it per typed character janks the primary interaction on the site’s landing screen (`/`).
- **Recommended fix:** Root cause — hoist the default color arrays to module-level `const`s (stable identity). Belt-and-suspenders — wrap `Globe` in `React.memo` (its props from `CountryEntryGate` are already stable), so it won’t re-render on search typing at all.
- **Difficulty:** Easy
- **Expected impact:** High
- **Priority:** P1

### ✅ ~~Finding P-004: Reconciliation cron makes one sequential Stripe API call per subscription~~ — DONE 2026-07-08 (batched ×8 w/ per-item fault isolation)
- **Severity:** Medium-High
- **Category:** backend
- **Affected files:** `backend/src/modules/subscriptions/ops/reconciliation.service.ts:155-182` (`checkStripeDrift`), invoked hourly + on boot via `backend/src/lib/internal-scheduler.ts:103,109`
- **Problem:** `checkStripeDrift` fetches up to 200 ACTIVE/PAST_DUE subscriptions then loops `for (const sub of subs) { await billing.retrieveSubscription(...) }` — a serial network round-trip per subscription (~150–300 ms each → 30–60 s for 200). Runs every hour AND on every deploy (boot `setTimeout` burst).
- **Why it matters:** Grows linearly with the subscriber base, monopolizes Stripe rate-limit budget serially, and a slow Stripe response stalls the whole reconciliation. Ops/quota impact rather than user request-path, but it’s the clearest sequential-await problem in the codebase.
- **Recommended fix:** Bounded-parallel batches (`Promise.all` over slices of ~8 — the pattern already used in `service-availability.service.ts:129-143`), or use Stripe `subscriptions.list` to page many at once.
- **Difficulty:** Low
- **Expected impact:** Medium-High
- **Priority:** P2

### ✅ ~~Finding P-005: Per-doctor availability reads write to the DB on every GET~~ — DONE 2026-07-08 (redundant `createMany` guarded by a count check + a 45s Map TTL cache on both per-doctor read paths, mirroring the aggregated path; stale reads safe via the atomic slot-claim UPDATE)
- **Severity:** Medium
- **Category:** database
- **Affected files:** `backend/src/modules/doctor-availability/doctor-availability.service.ts:241-266` (`listOpenSlotsForDoctor`), `:431-495` (`listOpenSlotsForDoctorAndService`), `:144-233` (`ensureSlotsForRange`), `:704-721` (`releaseExpiredHeldSlots`)
- **Problem:** Each public availability read runs, in series: `releaseExpiredHeldSlots` (a `findMany`), then `ensureSlotsForRange` → `resolveDoctorTimeZone` (`doctor.findUnique`) + `doctorAvailability.findMany` + **always** a `doctorTimeSlot.createMany({ skipDuplicates: true })` over the window, then the actual `doctorTimeSlot.findMany`. So a read issues an `INSERT … ON CONFLICT DO NOTHING` for dozens of rows even when nothing is new, plus 3–4 extra queries. Unlike the aggregated service-availability path (45 s TTL cache), the per-doctor endpoints are uncached.
- **Why it matters:** Write amplification + multiple round-trips + row locks + dead-tuple churn on a read-heavy, bot-crawlable endpoint — the busiest DB path under booking load.
- **Recommended fix:** Guard `ensureSlotsForRange` with a cheap `count`/`findFirst` before building `generated` + `createMany` (short-circuit when the range already exists), or move materialization to a scheduled/first-touch-per-day job and keep reads read-only. Add the aggregated path’s TTL cache to the per-doctor path; hoist `resolveDoctorTimeZone` out of the per-doctor loop.
- **Difficulty:** Medium
- **Expected impact:** Medium-High
- **Priority:** P2

### ✅ ~~Finding P-006: In-process scheduler has no distributed lock and re-runs heavy work on every deploy~~ — DONE 2026-07-08 (pg_try_advisory_lock per tick, fail-open, single-replica no-op)
- **Severity:** Medium
- **Category:** backend / deployment
- **Affected files:** `backend/src/lib/internal-scheduler.ts:77-111`
- **Problem:** Five cron loops run via `setInterval` inside the app process, and the boot `setTimeout` immediately fires pre/post-payment, subs-ops and reconciliation ticks on startup. No distributed lock — correctness relies on setting `RUN_SCHEDULER=false` on extra replicas. Any rolling deploy or second replica double-executes ticks until env is set right.
- **Why it matters:** Duplicate reminder sends / Stripe scans on multi-replica or rollovers; every deploy pays the full reconciliation cost (P-004) at boot.
- **Recommended fix:** Gate each tick behind a Postgres advisory lock (`pg_try_advisory_lock`) so only one replica runs a given job regardless of env; drop reconciliation from the immediate boot burst (leave it to the hourly interval + external `POST /api/cron/...` trigger).
- **Difficulty:** Low-Medium
- **Expected impact:** Medium (safe horizontal scaling / rolling deploys)
- **Priority:** P2

### ✅ ~~Finding P-007: Presentational components needlessly marked `"use client"`~~ — DONE 2026-07-08 (FeaturedDoctor + HealthcareMediaFrame; ServiceCard left, parent already client)
- **Severity:** Medium
- **Category:** frontend
- **Affected files:** `frontend/components/sections/FeaturedDoctor.tsx:1` (rendered by the **server** home page at `frontend/app/(site)/[country]/[lang]/page.tsx:534`), `frontend/components/media/HealthcareMediaFrame.tsx:1`, `frontend/components/cards/ServiceCard.tsx:1` (lower impact — parent `ServicesGrid` is already client)
- **Problem:** These have no hooks/state/handlers (just `Image`/`Link`/lucide/pure helpers) yet declare a client boundary, forcing prop serialization across the RSC boundary and shipping the component + transitive imports (e.g. `BrandIcons`) to the client for a static render.
- **Why it matters:** Unnecessary client JS shipped + hydrated on the country home page for content that never changes after paint.
- **Recommended fix:** Delete the `"use client"` directive from `FeaturedDoctor.tsx` and `HealthcareMediaFrame.tsx` (verify no client-only import is added later); `ServiceCard` optional. No other code change needed.
- **Difficulty:** Easy
- **Expected impact:** Medium
- **Priority:** P2

### ✅ ~~Finding P-008: 1.96 MB PNG used as a CSS background (`membership-silk.png`)~~ — DONE 2026-07-08 (→ WebP 127 KB, PNG git-rm'd, css url updated)
- **Severity:** Medium (portal-scoped)
- **Category:** assets
- **Affected files:** `frontend/public/images/portal/obsidian/membership-silk.png`, `frontend/app/globals.css:2159` (`--lux-asset-member`)
- **Problem:** The membership silk is a 1.96 MB **PNG** referenced via a CSS `background-image: url()` variable while its five sibling silks are already WebP. CSS `url()` assets bypass `next/image` — no AVIF/WebP negotiation, no responsive resize — so the full 1.96 MB is delivered to whatever element uses it (portal membership surface, a likely LCP element for members).
- **Why it matters:** ~2 MB decorative background behind a dark veil = a large avoidable LCP/bandwidth hit for authenticated members. (Public pages unaffected — no `--lux-asset-*` class renders under `app/(site)`.)
- **Recommended fix:** Re-encode to WebP/AVIF (quality can drop hard behind its veil → ~150–350 KB); update the `url()` at `globals.css:2159`. Same pattern as the sibling `.webp` tokens.
- **Difficulty:** Easy
- **Expected impact:** ~1.6–1.8 MB saved on portal membership LCP
- **Priority:** P2

### Finding P-009: Monolithic 252 KB `globals.css` render-blocks every public route
- **Severity:** Medium (Low-Medium)
- **Category:** rendering / assets
- **Affected files:** `frontend/app/globals.css` (9,024 lines / 252 KB unminified)
- **Problem:** One stylesheet holds the public site AND all three auth-gated portals (`.gh-admin-*`, `.gh-portal-*`, `.gh-doctor-*`, `lux` tokens), imported in root `layout.tsx`. A first-time public mobile visitor downloads and parses admin/doctor CSS they’ll never render.
- **Why it matters:** Render-blocking CSS on the critical path; larger parse/style cost on low-end phones (the majority of traffic). Already flagged as a deferred item in project notes.
- **Recommended fix:** Split portal-only rules into a stylesheet imported from the `(admin)`/`(doctor)`/`(auth)` route-group layouts; keep `globals.css` to tokens + public + shared primitives. (Tailwind’s utility layer is already tree-shaken — this is the hand-authored component CSS.)
- **Difficulty:** Medium (careful selector partitioning)
- **Expected impact:** Medium (smaller render-blocking CSS for public mobile)
- **Priority:** P3

### ✅ ~~Finding P-010: Obsidian silk WebP backgrounds are still ~0.8–1.0 MB each~~ — DONE 2026-07-08 (re-encoded ≤1600px q55 → 2–6 KB each; ~4.7 MB saved)
- **Severity:** Low-Medium (portal-scoped)
- **Category:** assets
- **Affected files:** `card-silk.webp` (1.05 MB), `band-aurora.webp` (1.00 MB), `canvas-aurora.webp` (985 KB), `plane-veil.webp` (875 KB), `header-aura.webp` (811 KB) under `frontend/public/images/portal/obsidian/`, wired at `globals.css:2155-2160`
- **Problem:** Decorative aurora/silk fills sitting behind 0.50–0.76 opacity veils, each ~1 MB, delivered full-resolution as CSS backgrounds (no `next/image` resize). ~4.7 MB can load across a portal session; a phone downloads the full-res silk.
- **Why it matters:** Cumulative bandwidth + decode for logged-in users; the command-center view pulls several at once.
- **Recommended fix:** Re-encode at lower WebP quality and/or smaller intrinsic dimensions (blurred/veiled → 1280–1600px wide at q≈55). Target ~150–300 KB each.
- **Difficulty:** Easy
- **Expected impact:** ~3.5–4 MB saved across portal decorative loads
- **Priority:** P3

### ✅ ~~Finding P-011: No horizontal-overflow guard on the public-site body~~ — DONE 2026-07-08 (`overflow-x: clip` on body, globals.css:263)
- **Severity:** Low-Medium
- **Category:** mobile
- **Affected files:** `frontend/app/globals.css:250-278` (html/body base — no `overflow-x`); guard exists only at `:2929-2933` (`.gh-portal-main` ≤760px)
- **Problem:** The portals get `overflow-x: hidden` at ≤760px, but the public `(site)` tree has no equivalent body/shell guard. Today the known decorative offenders are defused by responsive hiding (`hidden lg:flex`, `hidden sm:block`), but there’s no safety net for a long unbreakable string, a wide embed, or a future absolute element.
- **Why it matters:** Any such element triggers full-page horizontal scroll on mobile with nothing to catch it.
- **Recommended fix:** Add `overflow-x: clip` on the `(site)` layout wrapper or `body`. Use `clip` (not `hidden`) to avoid creating a scroll container that breaks `position: sticky` descendants.
- **Difficulty:** Trivial
- **Expected impact:** Eliminates a class of latent mobile horizontal-scroll regressions
- **Priority:** P3

### ✅ ~~Finding P-012: Marquee animates + holds a compositor layer on mobile, even off-screen~~ — DONE 2026-07-08 (shared `MarqueeTrack` IntersectionObserver pause + `will-change` only while on-screen)
- **Severity:** Low
- **Category:** rendering / mobile
- **Affected files:** `frontend/app/globals.css:543-545`
- **Problem:** `.gh-marquee-track { animation: gh-marquee 20s linear infinite; will-change: transform; }`. Reduced-motion kills it (`:554`), but on a normal touch device the `pointer:coarse` block deliberately keeps it running. `will-change: transform` is permanent → the track is a promoted GPU layer for the page’s life, and the loop runs while scrolled off-screen.
- **Why it matters:** Constant compositor work + an always-live layer = steady battery/thermal drain on phones for a decorative strip usually out of view.
- **Recommended fix:** Pause via IntersectionObserver when off-screen; drop the persistent `will-change` (only needed while actively animating).
- **Difficulty:** Easy
- **Expected impact:** Low (lower idle GPU/battery)
- **Priority:** P3

### Finding P-013: Playwright + Chromium (~150–300 MB) baked into the backend production image
- **Severity:** Medium
- **Category:** dependencies / deployment
- **Affected files:** `backend/package.json:47` (`playwright` in `dependencies`), `backend/nixpacks.toml` (`npx playwright install chromium` + libnss3/libatk/libgbm/libasound2t64 apt chain), `backend/src/modules/generated-documents/html-document-renderer.ts:64-90`
- **Problem:** `playwright` is a prod dep and the deploy build downloads a full headless Chromium — carried solely as the HTML→PDF **fallback** for markets without a DOCX pack (Brazil). The primary path (IE/PT/ES/CZ/RO) is LibreOffice + DOCX templates.
- **Why it matters:** The single largest contributor to backend image size / build time / cold-boot, for one country’s fallback, plus ~12 Chromium-only apt libs.
- **Recommended fix:** Consolidate Brazil’s PDF onto the existing LibreOffice path (feed it a minimal DOCX/HTML) or `pdf-lib` (already a dep), then drop playwright + its apt libs from the backend runtime. If kept, cache `PLAYWRIGHT_BROWSERS_PATH` so Chromium isn’t re-downloaded every build.
- **Difficulty:** Medium (needs a Brazil template on the existing renderer)
- **Expected impact:** Medium (−150–300 MB image, faster builds/cold starts)
- **Priority:** P3

### ✅ ~~Finding P-014: `prisma migrate deploy` runs on every backend boot with no separate gate~~ — DONE 2026-07-08 (moved to Railway `deploy.preDeployCommand`; `startCommand`/`start` now just `node dist/server.js` — a bad migration fails the deploy without crash-looping the running version)
- **Severity:** Low-Medium
- **Category:** deployment
- **Affected files:** `backend/railway.json` (`startCommand`), `backend/package.json:12` (`start`)
- **Problem:** Start command is `prisma migrate deploy && node dist/server.js`. Every deploy AND every restart (crash/OOM, `restartPolicyMaxRetries: 10`) re-invokes migrate before the server binds. A failing/long migration blocks the port, fails the `/health` check (`healthcheckTimeout: 100`), and the service restart-loops with the whole API down.
- **Why it matters:** Couples schema change with app rollout, no independent review; a bad migration = API-wide outage. (Prisma’s advisory lock makes concurrent instances safe, so the risk is boot-coupling, not racing.)
- **Recommended fix:** Move migrations to a gated pre-deploy step (Railway release phase / one-off job) so a bad migration fails the deploy without crash-looping the running version. At minimum keep migrations small + backward-compatible.
- **Difficulty:** Low
- **Expected impact:** Low-Medium (removes migrate latency per restart; prevents outage on bad migration)
- **Priority:** P3

### ✅ ~~Finding P-015: 2.7 MB of orphaned PNGs shipped in `public/images/portal/generated`~~ — DONE 2026-07-08
- **Severity:** Low
- **Category:** assets
- **Affected files:** `frontend/public/images/portal/generated/patient-record-empty-state.png` (1.40 MB), `.../admin-content-management-accent.png` (1.38 MB)
- **Problem:** Grep across `app/`, `components/`, `lib/`, `globals.css` finds **zero** references. Project notes recorded these as “deleted” when replaced by hand-built SVG empty states, but they’re still on disk. `output: "standalone"` copies all of `public/` into the Docker image.
- **Why it matters:** 2.7 MB of dead pixels ride into every deploy/image cache (no user downloads them — repo/image bloat, not runtime CWV).
- **Recommended fix:** Confirm no CMS DB row points at `/images/portal/generated/*` (unlikely — hardcoded illustrations), then `git rm` the `generated/` directory.
- **Difficulty:** Trivial
- **Expected impact:** −2.7 MB repo + Docker image
- **Priority:** P3

### ⏭️ ~~Finding P-016: Landing-page LCP hero uses a raw `<img>` instead of `next/image`~~ — N/A (hero is a `<picture>` with AVIF + mobile sources; no change needed)
- **Severity:** Low
- **Category:** rendering / assets
- **Affected files:** `frontend/components/sections/CountryEntryGate.tsx:216` (`/images/hero/country-entry-clinic-hero-2560.webp`, 62 KB)
- **Problem:** The entry gate at `/` renders its full-bleed hero as a raw `<img width={2560} height={1440} loading="eager" fetchPriority="high">`. Dimensions + fetch priority are correct (no CLS, prioritized LCP), but as a raw tag it (a) is never transcoded to AVIF and (b) serves the single 2560px WebP to every device — a phone downloads a 2560-wide file rendered at ~390px.
- **Why it matters:** `/` is the first paint for every new visitor and this is its LCP. Over-fetch + missed AVIF are modest (62 KB source) but it’s the one hero that opted out of the otherwise-consistent `next/image` pipeline.
- **Recommended fix:** Swap to `next/image` with `fill`/explicit dims, `priority`, `sizes="100vw"` (matching `HomeHero.tsx:125`) for AVIF + a mobile srcset. If it was left raw deliberately, note the ceiling.
- **Difficulty:** Easy
- **Expected impact:** Low (smaller mobile LCP transfer + AVIF on the most-hit page)
- **Priority:** P3

### ✅ ~~Finding P-017: Cart per-second countdown + `loadLocaleBundle()` in the render body~~ — DONE 2026-07-08 (useMemo([lang]))
- **Severity:** Low
- **Category:** rendering
- **Affected files:** `frontend/app/(site)/[country]/[lang]/cart/page.tsx:38-52` (`useCountdown` — `setInterval(setNow, 1000)`), used per row at `:509`; `loadLocaleBundle(...)` invoked in the render body at `:137`; 30 s auto-refresh `setInterval` at `:166`
- **Problem:** Each held-consultation row runs a 1 Hz `setState` (localized — acceptable), but `loadLocaleBundle(lang)` runs in the render body on every render, rebuilding the bundle object each countdown tick (compounds P-001’s cost per re-render).
- **Why it matters:** Bounded, but avoidable per-tick churn.
- **Recommended fix:** Wrap the `loadLocaleBundle(lang)` result in `useMemo([lang])` (or receive strings as props per P-001).
- **Difficulty:** Easy
- **Expected impact:** Low
- **Priority:** P3

### ✅ ~~Finding P-018: `checkUnsweptReservations` does a `findFirst` per stale reservation (N+1 in cron)~~ — DONE 2026-07-08 (single findMany + in-memory diff)
- **Severity:** Low
- **Category:** database
- **Affected files:** `backend/src/modules/subscriptions/ops/reconciliation.service.ts:128-149`
- **Problem:** Loops stale reservations and runs `consultationCreditLedger.findFirst` per row to find a terminal (CONSUMED/RELEASED) entry — an N+1 inside the reconciliation cron.
- **Why it matters:** Usually tiny (only reservations expired >1h with no terminal), but grows with sweep backlog.
- **Recommended fix:** One `groupBy`/`findMany` over `reservationId IN (...)` with `reason IN ('CONSUMED','RELEASED')`, then set-diff in memory (same shape as `checkMissingGrants` at `:63-68`).
- **Difficulty:** Low
- **Expected impact:** Low
- **Priority:** P3

### Finding P-019: Per-instance caches & rate-limit store don’t span replicas
- **Severity:** Low
- **Category:** backend
- **Affected files:** `backend/src/app.ts:113-118` (`@fastify/rate-limit` default in-memory store), `backend/src/modules/service-booking/service-availability.service.ts:46` (Map TTL cache), `backend/src/modules/gp-booking/gp-assignment.service.ts`
- **Problem:** The global limiter and availability caches are process-local Maps. On >1 replica the effective rate limit becomes `max × replicas` and cache hit-rates drop. Single-replica today (per scheduler comment), so currently benign.
- **Why it matters:** Rate-limit protection weakens and cache benefit dilutes on horizontal scale.
- **Recommended fix:** Point `@fastify/rate-limit` at a shared store (Redis) when scaling out; availability TTL caches are fine per-instance.
- **Difficulty:** Low
- **Expected impact:** Low (only relevant on multi-replica)
- **Priority:** P4

### ✅ ~~Finding P-020: Sub-12px, low-contrast type on conversion-critical UI~~ — DONE 2026-07-08 (order-total label → text-xs; about subtitles `white/55`→`white/70`; HomeHero had no `white/55`)
- **Severity:** Low
- **Category:** mobile / accessibility
- **Affected files:** `frontend/components/.../MobileOrderTotalBar.tsx:56` (`text-[10px]` total label), `HomeHero.tsx:159,165,231` (`text-[11px]`), `about/page.tsx:202,217,232` (`text-[11.5px]` at `white/55`), plus ~60 files using `text-[10px]/[11px]`
- **Problem:** Most 10–11px usages are high-contrast uppercase eyebrow/badge labels (accepted micro-typography). But some are near-body content — the cart/checkout total *label* and about-panel subtitles at `white/55` (low contrast), 11.5px.
- **Why it matters:** 10px low-contrast text is hard to read on a phone and can fail WCAG contrast at that size; the order-total label sits in the primary conversion bar.
- **Recommended fix:** Floor genuinely informational labels at 12px; keep 10–11px only for high-contrast uppercase tags; lift `white/55` subtitles toward `white/70` at small sizes.
- **Difficulty:** Easy
- **Expected impact:** Low
- **Priority:** P4

### ✅ ~~Finding P-021: CookieBanner overlays the fixed bottom conversion bars on first visit~~ — DONE 2026-07-08 (`bottom-24 md:bottom-4`)
- **Severity:** Low
- **Category:** mobile / UX
- **Affected files:** `frontend/components/.../CookieBanner.tsx:62` (`fixed bottom-4 z-50`), `MobileOrderTotalBar.tsx:49` (`fixed bottom-0 z-40`), `StickyBookingCTA.tsx:25` (`fixed bottom-0 z-40`)
- **Problem:** The global cookie banner (z-50) renders over the cart/checkout `MobileOrderTotalBar` and the marketing `StickyBookingCTA` (both z-40, bottom-0) until dismissed. (The two z-40 bars never co-occur.)
- **Why it matters:** On a first-time mobile visit to cart/checkout, the banner obscures the order total + primary CTA until consent is dismissed.
- **Recommended fix:** When the banner is visible, dock it directly above the bottom bar (or raise the bar’s `bottom` offset by the banner height) so both are usable together.
- **Difficulty:** Easy
- **Expected impact:** Low
- **Priority:** P4

### Finding P-022: `ScrollToTop` triggers three scroll writes per navigation
- **Severity:** Low
- **Category:** rendering
- **Affected files:** `frontend/components/layout/ScrollToTop.tsx:29-43` (`scrollTo` + `requestAnimationFrame` + `setTimeout(120)` per `pathname` change)
- **Problem:** Mounted once at root (fine); runs three scroll writes per navigation, the 120 ms timer forcing a second post-paint layout read/write.
- **Why it matters:** Negligible; noted for completeness. The triple-snap is a deliberate workaround for late-settling hero layout.
- **Recommended fix:** Leave as-is unless profiling shows scroll jank.
- **Difficulty:** Easy
- **Expected impact:** Low
- **Priority:** P4

### Cleanup (Info — no runtime impact today)
- **Dead client component:** `frontend/components/ui/footer-column.tsx` (client, no interactivity) is used only by the unused `frontend/components/ui/demo.tsx`; the live footer is the server `SiteFooter`. Delete both or drop the directive.
- **Dead fixed-width hero:** `frontend/components/sections/HeroBookingWizard.tsx:160` (`w-[480px]`, non-responsive) is never imported (replaced by `SameDayBooking`). Delete to prevent someone re-wiring a non-responsive panel into a hero.
- **Overlapping build configs:** root `nixpacks.toml` builds *only* frontend (never backend) while `frontend/Dockerfile` + `railway.toml` are the real per-service builders. Delete/annotate the root nixpacks as legacy (one build path per service).

---

## Prioritized Performance Fix Roadmap

### Immediate Fixes — 1 Day
- **P-003** — Hoist globe color defaults to module consts + `React.memo(Globe)` (stops per-keystroke WebGL rebuild). _Easy, High._
- **P-002 (quick wins)** — Fire invoice generation non-awaited in `ensureOrderPaidAutomations`; switch `waitUntil: "networkidle"` → `"load"`; reset `browserPromise` on `disconnected`. _Removes seconds from the money path + fixes the dead-browser trap._
- **P-004** — Batch the reconciliation Stripe reads (`Promise.all` over slices of ~8). _Easy, Med-High._
- **P-016 / P-015 / cleanup** — Swap entry-gate hero to `next/image`; `git rm` the orphaned `generated/` PNGs; delete dead `footer-column`/`demo`/`HeroBookingWizard`; annotate root `nixpacks.toml`.
- **P-008** — Re-encode `membership-silk.png` → WebP/AVIF (portal LCP).

### Short-Term Fixes — 2 to 5 Days
- **P-001** — Make `loadLocaleBundle` server-only; pass locale slices as props to cart/checkout/PlanCoverage/verify/reset. _Highest client-bundle win._
- **P-007** — Remove needless `"use client"` from `FeaturedDoctor`/`HealthcareMediaFrame`.
- **P-005** — Short-circuit availability slot materialization + add a TTL cache to the per-doctor path.
- **P-010** — Re-encode the obsidian silk WebPs smaller.
- **P-011 / P-012 / P-021 / P-020** — Public `overflow-x: clip`; marquee IntersectionObserver pause + drop persistent `will-change`; cookie-banner docking; floor informational labels at 12px.

### Medium-Term Fixes — 1 to 2 Weeks
- **P-006** — Postgres advisory locks around cron ticks; drop reconciliation from the boot burst.
- **P-009** — Split portal-only CSS out of `globals.css` into route-group stylesheets.
- **P-014** — Move `prisma migrate deploy` to a gated release step.
- **P-018** + index gaps — Replace the cron `findFirst` N+1 with a batched query; add `@@index([slug])` / `@@index([doctorId, email])` if rosters grow.
- Fix the **29 backend lint errors** (unused vars) so `pnpm lint` is green and can gate CI again.

### Long-Term Improvements
- **P-013** — Consolidate PDF generation onto one renderer (LibreOffice/`pdf-lib`) and drop Playwright/Chromium from the backend runtime; or move all PDF work to a proper background-job queue (folds in P-002’s full fix).
- **P-019** — Shared (Redis) rate-limit + cache store before scaling horizontally.
- Stand up a real CWV/perf budget in CI: run `build:analyze` on PRs (fix the analyzer-no-output issue first), add a Lighthouse-CI mobile check against the public routes, and track backend p95 latency + PDF-render time.

## Recommended Performance Budget

| Metric | Target |
|---|---|
| Initial client JS (public route, gzip) | ≤ 180 KB per route (cart/checkout must drop after P-001) |
| Any single image delivered | ≤ 200 KB (public via `next/image`); portal CSS backgrounds ≤ 300 KB |
| LCP (mobile, public) | ≤ 2.5 s (p75) |
| CLS | ≤ 0.10 (p75) — already close |
| INP | ≤ 200 ms (p75) — gated by P-003 on `/` |
| Backend API response (public reads) | p95 ≤ 300 ms (cached), ≤ 800 ms uncached |
| PDF generation | Off request path; user-perceived ≤ 100 ms (async “generating” state) |
| Mobile Lighthouse (performance) | ≥ 85 after Immediate + Short-Term fixes |

## Final Notes

Static analysis was sufficient to locate and evidence every finding above (each carries a `file:line`). The following genuinely need **runtime** confirmation and are recommended before/after applying fixes:

- A fresh **mobile Lighthouse / WebPageTest** run on `/`, a country home, a service page, and cart/checkout to quantify LCP/INP/CLS (static analysis can rank risks but not measure field CWV).
- A **bundle-analyzer** run (`ANALYZE=true`) — the analyzer previously emitted no output; verify the env var reaches the plugin, then confirm P-001’s locale JSON in the cart/checkout chunks and re-measure after the fix.
- A **load test** of the per-doctor availability endpoint (P-005) and a burst of paid orders (P-002) to confirm the request-path improvements under concurrency.
