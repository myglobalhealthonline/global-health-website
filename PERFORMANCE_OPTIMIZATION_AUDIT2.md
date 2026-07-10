# Performance Optimization Audit

**Audit date:** 2026-07-10  
**Repository:** `C:\Users\kingh\Desktop\NashaaFrontend\global-health-website`  
**Audit mode:** Read-only review; no application behavior was changed.
**Execution plan:** see `AUDIT2_EXECUTION_PLAN.md` for model assignment (Fable 5 architecture / Sonnet 5 implementation), cross-audit deduplication, and sequencing shared with `SECURITY_AUDIT2.md`.

## Executive Summary

The application has a solid modern base—Next.js App Router, React Server Components, Fastify compression, Prisma, responsive image configuration, dynamic imports for several heavy widgets, and a successful production build—but several architectural choices explain the reported slowness and mobile lag.

The highest-impact frontend issue is loss of full-page static output: request-specific cookie/header reads in the root and public-site layouts make nearly every public route dynamically server-rendered. The production build classified almost all public pages as `ƒ` (dynamic), despite many `generateStaticParams()` implementations. This increases TTFB and prevents full HTML CDN caching. On the client, bundle analysis found a 735,424-byte parsed / 210,164-byte gzip chunk dominated by locale JSON. Root and account client components statically import multiple languages and namespaces. The country gateway's WebGL globe can also be destroyed and recreated on every search keystroke and continues rendering when motion is reduced or the globe is offscreen.

The backend compounds cold-render latency. A country homepage performs eight parallel content reads that expand into roughly 14 or more SQL operations, including a full global doctor payload used only to calculate a count. Availability endpoints perform per-doctor query chains and database writes while serving a read. The default PostgreSQL pool is about ten connections, so a single cold render or availability request can consume most of the pool. Scheduler jobs, Stripe/Google/email/WhatsApp work, Chromium, and LibreOffice also share the API process, creating CPU, memory, and latency contention.

The ordinary production build, lint, typecheck, frontend unit tests, and all three dependency audits passed. Backend tests were correctly blocked by a guard because the local environment points to a non-test database; that guard was not bypassed. The configured webpack bundle analyzer initially exhausted a 2 GB heap; with 4 GB it produced reports but failed final type checking because a page exports `MANUAL_BOOKING_COOKIE`, which is not a valid Next page export. Browser smoke tests could not be completed because the Playwright entrypoint either hit a Windows shim parsing error or hung during dev-server startup.

Overall performance risk is **High** for TTFB, LCP, and low-end mobile INP. The first fixes should restore static/PPR boundaries, stop shipping all locale data to clients, stabilize/pause the WebGL globe, reduce homepage/API query amplification, and move heavy jobs/external side effects out of the request-serving process.

## Stack Detected

- **Framework:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript 5
- **Frontend:** React Server Components plus 189 client-marked TS/TSX files; Next route handlers as a same-origin BFF
- **Backend:** Fastify 5, TypeScript, Node.js 22
- **Database:** PostgreSQL 16 through Prisma 7 and `@prisma/adapter-pg`
- **Styling:** Tailwind CSS 4 plus large global CSS files
- **Animation libraries:** CSS animations, requestAnimationFrame, IntersectionObserver, and `cobe` WebGL; no Framer Motion or GSAP dependency found
- **Deployment:** Railway; Next standalone Docker image; backend Nixpacks image; GitHub Actions CI
- **Caching:** Next Data Cache/revalidation tags, HTTP cache headers, small in-process TTL maps; optional Redis for rate limits
- **Integrations:** Stripe, S3-compatible object storage, Gmail/SendGrid, Google Meet/Calendar, WhatsApp/WaSender, InvoiceExpress, Make.com, Doctify, Meta Pixel
- **Other important tools:** Vitest, Node test runner, Playwright, bundle analyzer, Chromium, LibreOffice

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `(Get-Location).Path` | Pass | Confirmed the requested repository root. |
| Root/subtree inventory and file counts | Pass | Found 709 backend files and 1,047 frontend files after excluding dependency/generated directories; nested `.claude/worktrees` were excluded from the audit. |
| `rg --files ...` | Tool failure | `rg.exe` could not run on this Windows host because no application association was available; native PowerShell enumeration was used instead. |
| `git status --short` | Pass | Worktree was clean before report creation. |
| `pnpm typecheck` | Pass in 58.9s | Frontend locale check and TypeScript, then backend TypeScript, passed. pnpm warned that child-package override blocks are ignored in workspace mode. |
| `pnpm lint` | Pass in 91.4s | Frontend and backend ESLint passed with the same pnpm workspace warnings. |
| `pnpm --filter frontend test` | Pass | 5 files, 57 tests passed in 654ms. |
| `pnpm --filter backend test` | Safely blocked | All 82 test files were rejected by `backend/src/test-guard.ts` because `DATABASE_URL` targets a non-local/non-test host. The live-database escape hatch was not used. |
| `pnpm build` | Pass in 122.6s | Next compiled in 19.5s, TypeScript took 39.7s, 98 static pages were generated, and backend `tsc` passed. Route output classified nearly all public pages as dynamic SSR. |
| `pnpm audit --audit-level=high` | Pass after registry approval | Initial sandbox attempt failed with registry `EACCES`; rerun with network access reported no known vulnerabilities for the workspace lockfile. |
| Standalone frontend/backend `pnpm audit --audit-level=high --ignore-workspace` | Pass | Both deployed-service lockfiles reported no known vulnerabilities. |
| `pnpm --filter frontend build:analyze` | Failed at 2 GB heap | Webpack reached the Node heap limit after about 128s (exit 134). |
| `NODE_OPTIONS=--max-old-space-size=4096 ... build:analyze` | Partial success | Generated `client.html`, `edge.html`, and `nodejs.html`; compilation took about 2.5 minutes. Final Next typecheck failed because `app/(admin)/admin/appointments/new/page.tsx` exports `MANUAL_BOOKING_COOKIE`. |
| Analyzer data extraction | Pass | Largest measured client asset: 735,424 parsed bytes / 210,164 gzip bytes, dominated by all locale bundles. |
| `pnpm exec playwright test ...` | Failed | Windows shim returned `unknown command '^test^'`. |
| `pnpm e2e -- smoke.spec.ts public-redesign.spec.ts` | Inconclusive | Produced no test/server output for several minutes and was terminated; no Lighthouse numbers were claimed. |

## Repository Areas Reviewed

- Root workspace and deployment: `package.json`, `pnpm-workspace.yaml`, all three lockfiles, `docker-compose.yml`, `nixpacks.toml`, `playwright.config.ts`, `.github/workflows/ci.yml`
- Frontend configuration and shell: `frontend/next.config.ts`, `frontend/proxy.ts`, `frontend/Dockerfile`, `frontend/railway.toml`, `frontend/app/layout.tsx`, all route-family layouts
- Public routes: country/language home, booking, cart, checkout, doctors, doctor detail, service detail, health test detail, blog, FAQ, contact, legal, pricing, GP and specialist routes
- Portal routes: account, admin, doctor, corporate, print/share routes and their Next API proxies
- Frontend components: layout, cart, compliance, motion, media, sections, cards, templates, forms, calendar, dialogs, chat, and the WebGL globe
- Frontend data layer: `frontend/lib/api`, `frontend/lib/content`, `frontend/lib/server`, routing, i18n loaders, sanitizers, and shared helpers
- Frontend assets and styles: 123 public assets, image use sites, `globals.css`, `portal.css`, media queries, keyframes, reduced-motion rules
- Backend bootstrap/config: `backend/src/app.ts`, `server.ts`, `config/env.ts`, Prisma/pg bootstrap, health route, scheduler
- Backend routes: 124 route files spanning public content, auth, booking, orders, payments, admin, doctor, corporate, uploads, messages, documents, and scheduled jobs
- Backend services: public data, availability, pricing, auth, payments, invoices, automation, generated documents, email/WhatsApp/Google integrations
- Database: `backend/prisma/schema.prisma`, relevant migrations and query/index alignment
- Generated outputs inspected only for evidence: Next route table and `.next/analyze/*.html`; generated files were not treated as source

## Biggest Performance Problems

1. **Public pages are dynamically rendered per request** because root/site layouts read request cookies and headers.
2. **All locales/namespaces leak into large client chunks**, including a measured 210 KB-gzip locale-dominated chunk.
3. **The country WebGL globe is recreated during search input and never truly pauses**, harming INP, battery, and thermals.
4. **A cold homepage fans out into redundant API and SQL work**, including full doctor data used only for a count.
5. **Availability reads perform N-doctor query chains and write slot rows**, occupying most of the DB pool.
6. **Schedulers, provider calls, Chromium, and LibreOffice share the API process**, causing resource contention.
7. **Payment/webhook handling waits on external side effects** and several upstream calls have no timeout.
8. **Cart state and a no-store cart request hydrate on every public page**, even informational pages.
9. **Mobile service/test heroes have cyclic/fixed-height grid sizing** that can collapse or clip conversion content.
10. **Unbounded list endpoints and query/index mismatches** increase payload, memory, and database scan cost.

## Core Web Vitals Risk Assessment

### LCP Risks

- Dynamic root and site layouts prevent full-page static/CDN delivery and add per-request rendering.
- Cold homepage and detail routes wait on multiple backend fetch waves.
- Some CMS hero/cover images use raw `<img>` or `unoptimized`, bypassing responsive resizing and preload behavior.
- Large global CSS remains render-blocking and still contains portal/admin selectors on public pages.
- The API, schedulers, browser/PDF tools, and external integrations share one runtime, making TTFB variable under load.

**Risk:** High. No valid field or Lighthouse LCP measurement was available; use mobile p75 RUM after the P0 fixes.

### CLS Risks

- Blog cover images and the CMS header logo can render without intrinsic dimensions/aspect reservation.
- Fixed-height mobile split heroes can re-resolve implicit rows or clip content across viewport/browser combinations.
- A global delayed `ScrollToTop` correction may expose late layout movement rather than fixing its source.

**Risk:** Medium. Most `next/image` use sites correctly reserve dimensions.

### INP / Interaction Lag Risks

- Globe effects recreate a 16,000-sample WebGL scene on country-search keystrokes.
- Continuous globe rAF/GPU updates continue offscreen and under reduced motion.
- Large locale JSON chunks increase parse/compile/hydration work.
- Doctify scripts and a universal cart fetch start eagerly across broad route groups.
- Large client islands and global CSS increase style/reconciliation work on portal pages.

**Risk:** High on low-end mobile and thermally constrained devices.

### TTFB Risks

- Nearly every public route is dynamic SSR.
- Homepage and availability query amplification can saturate the default DB pool.
- Sequential server fetch waves remain on booking, GP, service, and test pages.
- BFF proxies add an extra hop, buffer responses, and often lack abort deadlines.
- Background jobs and document rendering run in the request-serving process.

**Risk:** High on cache misses and under concurrency.

## Frontend Rendering Issues

- About 189 frontend files are client components. Client boundaries are warranted for many forms/portals, but root components make large locale and cart graphs globally reachable.
- Three account pages import the complete locale bundle at runtime: access history, profile, and security.
- Public pages use request-dependent root/site layouts, defeating full static output.
- Heavy third-party widgets are code-split in places but mount immediately rather than near viewport visibility.
- Several server routes contain independent fetch waterfalls that could start concurrently.
- Large client pages (booking, doctor/admin edit, cart, checkout) should be profiled after shared-bundle fixes; memoization should be applied only to measured hot paths.

## Mobile Performance & Rendering Issues

- Country entry always renders a 250px WebGL globe on mobile with DPR up to 2 and high map sample count.
- Service and health-test split heroes use fixed viewport height, `overflow-hidden`, one-column grids, and `h-full` children without explicit mobile tracks.
- Raw/unoptimized CMS imagery can download desktop originals to small devices.
- Existing mobile safeguards are good and should be preserved: coarse-pointer backdrop-filter disablement, passive/rAF-throttled header scrolling, observer disconnects, and reduced-motion CSS.
- Touch-target and typography implementation generally appears deliberate, but the hero layout and globe need 320px/390px, short-landscape, iOS Safari, reduced-motion, and slow-CPU verification.

## Asset & Bundle Issues

- Public assets total about 2.85 MB across 123 files. Largest individual images are around 124–148 KB; this is not the dominant performance problem.
- Next image configuration supports AVIF/WebP, responsive sizes, and a long optimized-image cache.
- No webfont files or `next/font` use were found; system fonts avoid font download and font-swap CLS.
- Analyzer evidence found a 210,164-byte gzip shared chunk dominated by locale JSON and a second 50,338-byte gzip common-locale chunk.
- A 103,269-byte gzip chunk contains `sanitize-html`, parser/entity libraries, PostCSS, buffer, and related code. Confirm that server-oriented sanitization/parsing is not imported into broad client boundaries.
- One-year immutable headers are applied by extension to stable `/public` filenames; updated assets can remain stale unless names are versioned.
- The configured analyzer is operational only with a larger heap and currently fails the final webpack typecheck.

## Animation & Scroll Lag Issues

- The globe's default color arrays are created inline, so effect dependencies change on re-render and recreate WebGL.
- Its animation loop always calls `globe.update()` and schedules another frame; reduced motion only stops rotation, not rendering.
- Doctify widgets are dynamically imported but not viewport-gated.
- `ScrollToTop` disables native restoration, scrolls immediately, again on rAF, and again after 120ms, which can fight user input and expose navigation jumps.
- Positive controls: `HeaderScrollShell` uses passive listeners and rAF throttling; `RevealOnScroll` respects coarse pointer/reduced motion and disconnects observers; marquees pause offscreen.

## API / Backend Performance Issues

- Country home loads eight datasets after country resolution; three are separate service-kind calls and one is a full global doctor list used for a count.
- Aggregated availability loops over doctors and performs read/write slot materialization per doctor.
- Payment webhooks and invoice flows can await Google, email, messaging, or invoice work before/around response completion.
- Several public/account/doctor lists have no pagination or return full bodies/relations.
- Next proxy helpers buffer text or entire `arrayBuffer()` payloads and lack a standardized timeout/error policy.
- Authenticated requests can perform redundant user reads.
- Cache headers are inconsistent: some stable public data lacks caching, while volatile availability permits stale serving for several minutes.

## Database Performance Issues

- The pg pool uses defaults and lacks explicit max, acquisition timeout, idle timeout, statement timeout, and graceful shutdown.
- One cold homepage can approach or exceed the default pool width through redundant queries.
- Availability uses O(doctors) query chains and writes inside a read request.
- Pricing computes about four reads per consultation item and starts items concurrently without batching/deduplication.
- Reminder, patient-search, blog-list, and post-payment query shapes are not aligned with existing indexes.
- In-memory slot/assignment caches and document mutex maps retain expired keys indefinitely.
- Scheduler advisory lock/unlock may run on different pooled connections.

## Deployment / Hosting Performance Issues

- Backend runtime includes Playwright/Chromium and LibreOffice with the HTTP API rather than a worker image.
- Health probes do not test DB readiness unless `?db=1`, so traffic can reach a DB-dead instance.
- There is no graceful SIGTERM/SIGINT path to stop jobs and drain requests/pools.
- CI does not run the production build, bundle budget, E2E tests, or performance budgets.
- No route-latency histograms, pool-wait metrics, slow-query telemetry, cache-hit ratios, or CWV RUM integration were found.

## Detailed Findings

### Finding P-001: Request-specific root layouts force dynamic public rendering

- **Severity:** High
- **Category:** rendering / deployment
- **Affected files:** `frontend/app/layout.tsx:28-39`; `frontend/lib/i18n/get-root-html-lang.ts:28-52`; `frontend/app/(site)/layout.tsx:25-66`; `frontend/proxy.ts`; country route pages with `generateStaticParams`
- **Problem:** Root HTML language reads `cookies()`/`headers()`. The public site layout also reads headers/cookies, personalizes navigation from role/email, and starts multiple server loaders. The build classified virtually every public page as dynamic.
- **Why it matters:** Full HTML cannot be served as a static artifact from the CDN; each navigation pays request routing and React server-render time even when data is cached.
- **Recommended fix:** Make the root/public shell static where possible. Derive country/locale from route params in static layouts, move auth/avatar/cart indicators into small isolated islands, and avoid email personalization in the public shell. If request data is mandatory, adopt Cache Components/PPR intentionally and place dynamic islands behind Suspense.
- **Difficulty:** Hard
- **Expected impact:** High
- **Priority:** P0

### Finding P-002: Locale architecture ships excessive JSON to clients

- **Severity:** High
- **Category:** bundle / rendering
- **Affected files:** `frontend/lib/i18n/load-locale.ts:4-79`; `frontend/lib/i18n/get-common-locale.ts:2-15`; `frontend/components/compliance/CookieBanner.tsx:1-55`; `frontend/app/layout.tsx:75`; account access-history/profile/security pages
- **Problem:** Static imports include six languages across common and 11 namespaces. Bundle analyzer measured a 735,424-byte parsed / 210,164-byte gzip locale-dominated chunk, plus a 191,634-byte parsed / 50,338-byte gzip common-locale chunk.
- **Why it matters:** All users parse languages and namespaces they do not use, increasing initial JS, memory, and hydration/INP cost.
- **Recommended fix:** Pass small translated string slices from server components to client islands. Give CookieBanner a tiny dedicated dictionary. For client-only locale switches, dynamically import only the active locale/namespace and cache it.
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** P0

### Finding P-003: Country gateway WebGL is recreated on input and never pauses

- **Severity:** High
- **Category:** frontend / animation / mobile
- **Affected files:** `frontend/components/ui/cobe-globe.tsx:45-64,169-202,204-230,248-278`; `frontend/components/sections/CountryEntryGate.tsx:189-196,272-283`; `CountryEntryGate.module.css:553-560`
- **Problem:** Default color arrays have unstable identities and belong to the globe initialization effect. Typing updates parent state, rerenders the non-memoized globe, and destroys/recreates a high-sample WebGL scene. rAF and GPU updates continue offscreen and with reduced motion.
- **Why it matters:** This is a direct INP, battery, heat, and scroll-smoothness risk on mobile.
- **Recommended fix:** Hoist immutable defaults, memoize the globe, pause/cancel frames when offscreen or document-hidden, render one static frame for reduced motion, and lower DPR/map samples or use a static mobile visual.
- **Difficulty:** Easy–Medium
- **Expected impact:** High
- **Priority:** P0

### Finding P-004: Cold homepage fans out into redundant API and SQL work

- **Severity:** High
- **Category:** backend / database / TTFB
- **Affected files:** `frontend/app/(site)/[country]/[lang]/page.tsx:164-200`; `backend/src/routes/country-scoped.route.ts:31-40,108-120,153-188,218-234`; `backend/src/modules/doctors/doctors.service.ts:303-321`; `backend/src/db/prisma.ts:18-28`
- **Problem:** The homepage starts eight content calls. Three separately fetch service kinds, and it fetches both country doctors and the full global roster only to compute `allDoctors.length`. Repeated country existence checks expand this to roughly 14+ SQL calls.
- **Why it matters:** A cold page can consume most of the default ten-connection pool and queue concurrent renders.
- **Recommended fix:** Fetch country services once and partition in memory; replace the full doctor payload with a count projection; remove redundant existence reads; consider a cacheable home-context projection.
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** P0

### Finding P-005: Availability reads cause N-doctor query and write amplification

- **Severity:** High
- **Category:** backend / database
- **Affected files:** `backend/src/modules/service-booking/service-availability.service.ts:72-143`; `backend/src/modules/gp-booking/gp-assignment.service.ts:133-177`; `backend/src/modules/doctor-availability/doctor-availability.service.ts:144-220,276-302,471-537,750-764`; `backend/src/routes/country-scoped.route.ts:257-419`
- **Problem:** Each eligible doctor triggers expired-hold cleanup, recurring-availability reads, timezone reads, slot counts, slot writes, and final slot reads. Batches of eight can occupy most of the pool.
- **Why it matters:** A read endpoint becomes a write-heavy O(doctors) workflow, increasing TTFB, contention, and deadlock/retry risk.
- **Recommended fix:** Materialize slots and release holds in set-based worker jobs; query all eligible doctor slots once and group in memory; combine validation queries; use short derived-response caching with mutation invalidation.
- **Difficulty:** Hard
- **Expected impact:** High
- **Priority:** P0

### Finding P-006: Heavy jobs and document rendering share the API process

- **Severity:** High
- **Category:** backend / deployment
- **Affected files:** `backend/src/server.ts:8-13`; `backend/src/lib/internal-scheduler.ts:121-154`; automation services; `backend/src/routes/reminders.route.ts:46-156`; generated-document service/renderers; `backend/nixpacks.toml`
- **Problem:** Scheduled scans, messaging, Stripe URL resolution, Chromium PDF rendering, and LibreOffice conversion run in the request server.
- **Why it matters:** CPU spikes, child processes, provider delays, and six-second WhatsApp gaps directly reduce request capacity and increase tail latency.
- **Recommended fix:** Use a durable outbox/queue and separate worker deployment with bounded concurrency, due-time SQL predicates, bulk updates, timeouts, and retries.
- **Difficulty:** Hard
- **Expected impact:** High
- **Priority:** P0

### Finding P-007: Payment/external side effects extend request and webhook latency

- **Severity:** High
- **Category:** backend / API
- **Affected files:** `backend/src/routes/payments.route.ts:301-387`; `complete-order-payment.service.ts`; Google Meet, Gmail, invoice webhook, and notification services
- **Problem:** Payment completion can synchronously await provider work. Gmail, Make.com, and several proxy/provider calls have no abort timeout.
- **Why it matters:** Slow providers pin handlers, cause Stripe retries, duplicate load, and consume API sockets/memory.
- **Recommended fix:** Transactionally persist payment/idempotency plus outbox rows, acknowledge Stripe quickly, process side effects asynchronously, and add hard provider deadlines/circuit-breaker metrics.
- **Difficulty:** Hard
- **Expected impact:** High
- **Priority:** P0

### Finding P-008: Every public route hydrates cart state and requests the cart

- **Severity:** Medium–High
- **Category:** frontend / API
- **Affected files:** `frontend/app/(site)/layout.tsx:127-148`; `frontend/components/cart/CartContext.tsx:47-65`; `frontend/lib/api/cart-client.ts:9-30`
- **Problem:** Informational routes mount CartProvider and immediately make a no-store `/api/cart` request.
- **Why it matters:** Adds client JS, hydration, network contention, and backend requests for visitors who never use booking/cart.
- **Recommended fix:** Scope the full provider to booking/cart/checkout, use a tiny header count island, or fetch only after first cart interaction with a server-provided initial count.
- **Difficulty:** Medium
- **Expected impact:** Medium–High
- **Priority:** P1

### Finding P-009: Mobile service/test hero grids can collapse or clip content

- **Severity:** High
- **Category:** mobile / rendering
- **Affected files:** service detail page `:188-226`; health-test detail page `:126-192`; `frontend/app/globals.css:4751-4755`
- **Problem:** Fixed `100svh`-style height, minimum height, `overflow-hidden`, one-column implicit grid rows, absolute images, and `h-full` children create cyclic sizing below 1024px.
- **Why it matters:** Primary image or booking content can collapse, overlap, or be clipped on small/short mobile viewports.
- **Recommended fix:** Use explicit mobile rows such as `240px auto`, `h-auto`, `min-h-0`, and `overflow-visible`; restore viewport-locked two-column behavior only at desktop breakpoints.
- **Difficulty:** Easy
- **Expected impact:** High
- **Priority:** P0

### Finding P-010: CMS images bypass responsive optimization and dimensions

- **Severity:** Medium–High
- **Category:** assets / LCP / CLS
- **Affected files:** blog detail and BlogCard; GP/specialist banners; service/test heroes; booking/service/catalog cards; `HeroBookingWizard`; `DoctorProfileTemplate`; `SiteHeader`
- **Problem:** Raw `<img>` and inconsistent `unoptimized` logic can download full CMS originals. Blog cover and header logo lack intrinsic layout metadata.
- **Why it matters:** Wastes mobile bandwidth, delays LCP, and permits layout shifts.
- **Recommended fix:** Centralize an optimizer-safe media policy, allow same-origin `/api/media` through `next/image`, persist width/height/aspect metadata, enforce upload variants, and reserve space for raw remote images.
- **Difficulty:** Medium
- **Expected impact:** Medium–High
- **Priority:** P1

### Finding P-011: Public and authenticated list endpoints are unbounded/oversized

- **Severity:** High
- **Category:** API / database
- **Affected files:** blog and doctors services; account orders/prescriptions; appointment documents; internal messages; doctor-patient document history
- **Problem:** Lists return full bodies/relations or entire histories without cursor pagination.
- **Why it matters:** Response size, serialization, proxy buffering, memory, and query time grow with production data.
- **Recommended fix:** Cursor pagination, lightweight list projections, separate detail endpoints, explicit maximum page sizes, and “load older” UI.
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** P1

### Finding P-012: Query/index alignment needs production EXPLAIN validation

- **Severity:** High
- **Category:** database
- **Affected files:** reminder routes and Appointment indexes; admin patient search; blog list; post-payment flow; `backend/prisma/schema.prisma`
- **Problem:** Scheduled range/null/status queries, substring patient search, blog ordering, and payment-stage scans are not supported by well-aligned leading/partial indexes.
- **Why it matters:** These become scans as data grows; encrypted identifier substring search cannot work meaningfully and still costs CPU.
- **Recommended fix:** Capture `EXPLAIN (ANALYZE, BUFFERS)` on representative production-sized data, then add partial/composite indexes through Prisma migrations; use normalized prefix/trigram search or a search projection.
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** P1

### Finding P-013: Expired caches and mutex keys are not evicted

- **Severity:** Medium
- **Category:** backend / memory
- **Affected files:** doctor availability slot cache; GP caches; aggregated service cache; generated-document mutex
- **Problem:** Expiry is checked on read but expired entries remain. Time-bucketed slot keys continuously grow; document mutex keys remain per document/appointment.
- **Why it matters:** Long-lived processes accumulate memory and lookup overhead.
- **Recommended fix:** Bounded TTL/LRU caches with delete-on-expiry and hard size caps; delete mutex tails after completion; use Redis only for cross-replica coordination.
- **Difficulty:** Easy
- **Expected impact:** Medium–High
- **Priority:** P1

### Finding P-014: Global CSS still contains portal/admin rules

- **Severity:** Medium
- **Category:** CSS / rendering
- **Affected files:** `frontend/app/globals.css` (161 KB source, 5,120 lines); `frontend/app/portal.css` (95.9 KB source, 3,991 lines); route layouts
- **Problem:** Despite a portal split, globals still contains substantial `.gh-admin-*` and `.gh-portal-*` blocks. It has 48 media blocks, 20 keyframes, and 87 `!important` declarations; no `content-visibility` is used.
- **Why it matters:** Public pages pay render-blocking CSS transfer/parse and broader selector matching.
- **Recommended fix:** Complete route-family extraction, keep only shared tokens/primitives global, move sections to modules, and trial `content-visibility:auto` with intrinsic size on long below-fold sections.
- **Difficulty:** Medium
- **Expected impact:** Medium
- **Priority:** P1

### Finding P-015: Doctify and tracking work is too broadly eager

- **Severity:** Medium
- **Category:** third-party / INP
- **Affected files:** `DoctifyReviewsLazy.tsx`; `DoctifyReviews.tsx:109-135`; `CountryTrustBar.tsx:236-252`; `frontend/app/layout.tsx:34-58`
- **Problem:** Dynamic import code-splits the widget but it mounts immediately; root preconnects Doctify/Facebook and schedules Meta Pixel across all route families.
- **Why it matters:** Below-fold third-party scripts compete for bandwidth/main-thread time, including on authenticated/utility pages.
- **Recommended fix:** IntersectionObserver-gate widgets, route-scope preconnects, and consent/marketing-route gate analytics after idle.
- **Difficulty:** Easy–Medium
- **Expected impact:** Medium
- **Priority:** P1

### Finding P-016: Independent server fetches still form waterfalls

- **Severity:** Medium
- **Category:** frontend / TTFB
- **Affected files:** booking, GP, service-detail, test-detail, and country-home pages
- **Problem:** Independent overlays, disclaimers, requirements, detail, and list reads are awaited in waves.
- **Why it matters:** Cache-miss latency adds instead of overlapping.
- **Recommended fix:** Start independent promises early, await them together, and stream below-fold trust/review content through Suspense while preserving not-found validation.
- **Difficulty:** Easy–Medium
- **Expected impact:** Medium
- **Priority:** P1

### Finding P-017: BFF proxy helpers buffer payloads and lack standardized deadlines

- **Severity:** Medium
- **Category:** API / memory
- **Affected files:** `frontend/lib/server/proxy-forward.ts:10-44`; `proxy-stream.ts:48-82`; auth catch-all proxy
- **Problem:** Text and binary responses are buffered in the Next process; upstream requests often lack abort/catch behavior.
- **Why it matters:** Adds an extra hop, duplicates memory for PDFs/reports, and permits slow upstreams to pin Next handlers.
- **Recommended fix:** Stream `upstream.body`, apply route-specific abort budgets, standardize safe response-header forwarding, and use direct signed downloads where appropriate.
- **Difficulty:** Medium
- **Expected impact:** Medium
- **Priority:** P1

### Finding P-018: Pool/readiness/latency observability is incomplete

- **Severity:** Medium–High
- **Category:** database / deployment
- **Affected files:** `backend/src/db/prisma.ts:18-28`; `backend/src/app.ts`; `backend/src/routes/health.route.ts`; `backend/railway.json`
- **Problem:** Default pool settings, no request timeout, Railway probes liveness without DB, and no pool-wait/slow-query/route histogram telemetry was found.
- **Why it matters:** Capacity problems appear as user-visible latency without actionable evidence; unhealthy instances may still receive traffic.
- **Recommended fix:** Environment-sized pool/timeouts, bounded readiness check, graceful shutdown, OpenTelemetry/APM, slow-query metrics, cache-hit and worker-queue dashboards.
- **Difficulty:** Medium
- **Expected impact:** High under load
- **Priority:** P1

### Finding P-019: Scheduler advisory locks are not connection-safe

- **Severity:** High
- **Category:** backend / database / reliability
- **Affected files:** `backend/src/lib/internal-scheduler.ts:33-55`
- **Problem:** Session-level lock and unlock are separate Prisma raw queries that may use different physical pg connections; acquisition errors fail open.
- **Why it matters:** Locks can leak, jobs can skip forever, or replicas can duplicate money/message work.
- **Recommended fix:** Use a dedicated checked-out pg client or transaction-scoped advisory lock inside one pinned interactive transaction. Do not fail open for non-idempotent jobs.
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** P0

### Finding P-020: Public cache policy is inconsistent

- **Severity:** Medium
- **Category:** caching / API
- **Affected files:** global services/specialties/health tests/assets routes; country availability routes; `frontend/next.config.ts:82-84`
- **Problem:** Stable public data lacks cache headers, while availability permits up to 300 seconds stale-while-revalidate. Stable un-hashed public asset names receive one-year immutable caching.
- **Why it matters:** Cold renders repeatedly hit the origin; booked slots can remain advertised; updated stable assets can be stale for a year.
- **Recommended fix:** Central explicit public-cache allowlist, tag invalidation for CMS data, `no-store` or very short non-stale availability caching, and immutable only for content-hashed/versioned assets.
- **Difficulty:** Easy
- **Expected impact:** Medium
- **Priority:** P1

### Finding P-021: Build analysis and CI do not enforce performance budgets

- **Severity:** Medium
- **Category:** bundle / CI
- **Affected files:** `frontend/package.json`; admin manual-booking page; `.github/workflows/ci.yml`
- **Problem:** Analyzer needs >2 GB heap and final webpack typecheck fails on an invalid page export. CI does not run `pnpm build`, analyzer checks, E2E, or size budgets.
- **Why it matters:** Turbopack build success can mask webpack/analyzer incompatibilities and bundle regressions.
- **Recommended fix:** Move `MANUAL_BOOKING_COOKIE` to a non-page module, make analyzer reproducible with a documented heap, export machine-readable stats, and fail CI on route/shared bundle budgets.
- **Difficulty:** Easy–Medium
- **Expected impact:** Medium
- **Priority:** P1

### Finding P-022: Global scroll restoration can fight navigation and input

- **Severity:** Low–Medium
- **Category:** frontend / mobile
- **Affected files:** `frontend/components/layout/ScrollToTop.tsx:23-48`; `frontend/app/layout.tsx:73`
- **Problem:** It sets manual restoration and performs immediate, rAF, and 120ms scroll corrections on path changes.
- **Why it matters:** Back/forward behavior and early user scrolling can visibly jump.
- **Recommended fix:** Fix late layout shifts, rely on Next/browser restoration, and limit explicit scrolling to known forward navigations.
- **Difficulty:** Easy
- **Expected impact:** Low–Medium
- **Priority:** P2

## Prioritized Performance Fix Roadmap

### Immediate Fixes — 1 Day

1. Hoist globe defaults, memoize the globe, stop rAF when hidden/offscreen/reduced-motion, and reduce mobile sampling.
2. Replace CookieBanner's full common-locale import with a tiny server-provided string slice/dictionary.
3. Fix explicit mobile grid rows/height/overflow for service and health-test heroes.
4. Move `MANUAL_BOOKING_COOKIE` out of the Next page module so analyzer builds pass.
5. Add timeouts to Gmail/Make/ops webhook and Next proxy fetches; do not add retries inside request handlers.
6. Change availability cache semantics to avoid long stale slot responses.
7. Make Railway readiness check a bounded DB-aware `/ready` endpoint.

### Short-Term Fixes — 2 to 5 Days

1. Convert the three account client locale importers to server-sliced translations.
2. Scope/lazy-load the CartProvider and eliminate automatic cart calls on informational pages.
3. Fetch homepage services once and add a doctor-count projection; remove redundant country checks.
4. Batch checkout pricing reads and deduplicate IDs.
5. Add cursor pagination/light list projections to blog, doctors, orders, prescriptions, messages, and documents.
6. Centralize CMS media optimization/dimensions and repair raw LCP/CLS images.
7. Viewport-gate Doctify and route/consent-gate Meta Pixel/preconnects.
8. Finish portal/admin CSS extraction from globals.
9. Configure pg pool/acquisition/statement timeouts and graceful shutdown.

### Medium-Term Fixes — 1 to 2 Weeks

1. Restore static/PPR boundaries for the public shell and isolate auth/cart personalization.
2. Refactor availability to set-based reads and background slot materialization/hold cleanup.
3. Introduce a durable outbox/queue and separate worker for scheduler, payments, messaging, PDF, and LibreOffice work.
4. Make scheduler locking connection-safe and job execution idempotent.
5. Validate and add reminder/search/blog/payment indexes using production-sized `EXPLAIN (ANALYZE, BUFFERS)`.
6. Stream BFF downloads/responses and consolidate abort/error handling.
7. Replace unbounded maps with bounded TTL/LRU caches and expose hit/size metrics.

### Long-Term Improvements

- Separate HTTP API, background workers, and document-render workers with independent autoscaling/resource limits.
- Add CDN/tag invalidation strategy and explicit public/private cache policy.
- Deploy OpenTelemetry/APM, pg pool telemetry, slow-query logging, job-queue metrics, and provider latency/error dashboards.
- Collect browser RUM for p75 LCP/CLS/INP by route, country, device class, and release.
- Add CI performance budgets, production build, targeted E2E, bundle diffing, and scheduled Lighthouse/WebPageTest runs.
- Load-test homepage, availability, booking, checkout, payment webhook, document generation, and portal lists using production-like data.

## Recommended Performance Budget

| Metric | Recommended budget |
|---|---:|
| Initial route JS (marketing pages, gzip) | **≤ 170 KB**, with shared framework excluded only if reported separately |
| Initial route JS (portal pages, gzip) | **≤ 250 KB**; no locale namespace/language not used by the route |
| Single shared application chunk (gzip) | **≤ 80 KB**; current locale-dominated chunk is 210 KB |
| Critical hero image transfer | **≤ 150 KB** mobile, **≤ 250 KB** desktop; correct `sizes` and dimensions required |
| Below-fold image transfer | **≤ 100 KB** each and lazy-loaded |
| Total initial mobile page transfer | **≤ 1.0 MB** on core marketing routes |
| LCP | **≤ 2.5s p75**, stretch target ≤2.0s on public landing pages |
| CLS | **≤ 0.10 p75**, target ≤0.05 |
| INP | **≤ 200ms p75**, target ≤150ms |
| Cached public API response | **≤ 150ms p95** at application edge |
| Uncached simple API response | **≤ 400ms p95** excluding documented external-provider work |
| Homepage server response / TTFB | **≤ 500ms p75**, **≤ 800ms p95** on warm data cache |
| DB pool acquisition | **≤ 25ms p95**; alert above 100ms |
| Mobile Lighthouse target | **≥ 90 Performance** on home/service/booking using a controlled cold mobile profile |

## Manual Verification Plan

1. Build production with both Turbopack and webpack analyzer; confirm all targeted public routes become static/PPR as intended.
2. Compare route/shared gzip bytes before/after locale changes; verify only active locale/namespace JSON is present.
3. Record Chrome Performance profiles for country search, globe offscreen, reduced motion, and background tab; verify no globe recreation per keystroke and no persistent rAF when hidden.
4. Test service/test heroes at 320×568, 390×844, 844×390, iOS Safari, Android Chrome, 4× CPU slowdown, and reduced motion.
5. Use WebPageTest/Lighthouse cold mobile runs for `/`, country home, service detail, health-test detail, book, cart, checkout, login, and account profile.
6. Load-test cold homepage and availability while observing SQL count, pool acquisition time, p95/p99 latency, memory, and worker CPU.
7. Verify Stripe webhook response time stays bounded during simulated slow Google/email/Make providers after outbox migration.

## Final Notes

Static and build analysis were sufficient to identify concrete high-impact causes, but they cannot establish production p75 CWV, real database plans, provider latency, or concurrency behavior. Browser smoke tests were inconclusive in this Windows environment, and backend tests were deliberately not run against a live database. A safe local/CI PostgreSQL test database, production-like data, RUM, Lighthouse/WebPageTest, and controlled load testing are required to validate the roadmap and set final baselines.

No performance fixes were applied during this audit.
