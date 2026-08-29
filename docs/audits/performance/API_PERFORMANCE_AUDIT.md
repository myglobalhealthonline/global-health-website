# API Performance Audit

**Audit date:** 2026-08-29  
**Repository revision:** `f7da1354` (`perf: optimize public booking availability reads`)  
**Scope:** Next.js frontend, Fastify backend, Prisma/PostgreSQL data paths, Railway deployment, same-origin proxy handlers, polling, caches, payloads, and third-party integrations  
**Mode:** Audit first. No production data, schema, infrastructure, or application behavior was changed.

## Evidence and confidence model

This report deliberately separates three evidence classes:

1. **Current measured:** seven serial, unauthenticated GET samples per listed public route against the repository's configured Railway staging hosts. No auth material was used. Each `curl` invocation opened a new connection, so these figures include cold DNS/TCP/TLS cost and represent a cold navigation rather than an already-pooled server connection. Response headers identified the observed Railway edge as `sin1`.
2. **Historical measured:** the controlled 2026-08-14 Railway snapshot load test in `docs/audits/perf/load-test-report-2026-08-14.md`. These results are not treated as proof of today's latency, but they remain valid capacity evidence until the environment is retested.
3. **Current code-confirmed:** request topology, query sequencing, cache policy, payload shape, polling, provider calls, and deployment configuration traced at revision `f7da1354`. Where runtime timing or `EXPLAIN` evidence is absent, the report says so.

Current authenticated timing, per-query timing, p99, and provider timing were not collected. Docker Desktop was unavailable, `backend/.env` points at production, and no APM exists in the codebase. The current k6 profiles import `loadtest/scenarios/*.js`, but that directory is absent in this clone; the configured targets are Railway hosts; and the credential files are unsafe to reuse. Bypassing those controls would have made the audit less trustworthy, not more complete.

### Security blocker discovered during measurement setup

The test harness must be remediated before authenticated performance testing:

- `docs/testing/load-test-run-sheet.md:13-29` contains a literal `PROXY_CLIENT_IP_SECRET`.
- `loadtest/lib/helpers.js:55-58` describes `loadtest/config/cookies.json` as gitignored, but `.gitignore:115` ignores only `loadtest/config/secrets.json`; the cookie file is tracked.
- History exposure is confirmed: both artifacts were introduced in commit `0a9024e9` (`Load Test Report`). No secret or cookie value was opened, copied, or used in this audit.

Required response: rotate the proxy secret; invalidate every represented session; remove the cookie file from tracking and add it to `.gitignore`; remove the literal from the run sheet; scan the repository/history for copies; and decide whether history rewriting is required under the project's incident policy.

## 1. Executive Summary

Overall API health is **Needs Investigation at low concurrency and Critical at the historical 200-user target**.

- Source inspection found **658 Fastify method/path registrations** across 29 route families. The Next frontend contains **166 same-origin API route-handler files** and approximately **506 statically discoverable API path literals/variants**. The static counts are a surface-area ledger, not a claim that every operation runs on every journey.
- Eight representative public paths were measured with seven valid samples each. All seven backend API reads had p95 above 500 ms; the Ireland services catalog was 919 ms p95; the Ireland doctors catalog was 1.70 s p95; the Ireland homepage was 2.52 s p95.
- Tiny JSON responses and `/health` still cluster around 0.48-0.55 s average. This proves payload size is not the only issue. Cold connection/edge transit and shared backend/database work form a substantial latency floor. Exact attribution requires pooled-connection probes plus route/DB instrumentation.
- Payload size then compounds the floor: the Ireland service list is **276,806 bytes** and the doctor list is **514,430 bytes** uncompressed. The homepage response is **640,192 bytes** uncompressed HTML. These list payloads are too large for navigation-blocking data.
- The public shell performs five parallel backend reads on most marketing pages. A country homepage adds six parallel reads for its body. The page is parallelized, but it still depends on a wide origin fan-out before useful content is complete.
- Every public page mounts the cart provider, which performs `/api/cart` after hydration, including informational pages. Visible chat/support views poll every 10 seconds.
- The current availability optimization is real and verified: cold-read single-flight, bounded TTL caches, shared raw slot inventory, and batched expired-hold sweeping are present, and 13 focused tests pass. Remaining availability paths still perform several sequential reads and may execute cleanup writes from a GET.
- Historical controlled load testing on the 2026-08-14 `Dev-hassaan` snapshot failed the 200-concurrent-user target: `/ie/en` p95 reached 30 s and overall request p95 reached 13.48 s while database pool usage remained at three active connections or fewer. Queueing/contention in single Node processes was the strongest explanation for that environment; it is not proof that the same bottleneck dominates revision `f7da1354`.
- In-process schedulers, provider dispatch, PDF/LibreOffice work, and HTTP request serving still share the backend process. This is a tail-latency and capacity risk even when average CPU appears low.
- There is no route latency histogram, trace propagation, database query timing, event-loop lag metric, provider timing, cache-hit metric, or pool-wait metric in the repository. This is the main reason several root-cause allocations cannot yet be quantified.

The highest-impact order is: reduce public page/catalog fan-out and payloads; add instrumentation; make the load harness safe and runnable; retest capacity; then horizontally scale the web processes and isolate worker duties if measurements confirm the historical contention pattern.

## 2. Architecture Overview

### Request flow

Public server rendering usually follows:

`browser -> Railway edge -> Next.js 16 server/proxy -> Fastify API -> requireAuth when private -> Prisma 7 / pg.Pool -> PostgreSQL -> JSON -> Next render -> browser hydration`

Browser mutations and many browser reads use same-origin Next handlers first. Public server components normally call the backend origin directly through `frontend/lib/api/client.ts`. Portal server components also call the backend directly with forwarded cookies and `cache: "no-store"`. Browser-facing `/api/public/*`, `/api/auth/*`, and `/api/me/*` catch-all handlers are allowlisted proxies.

Important code paths:

- Public SSR client, retries, cache tags, and trusted SSR/build headers: `frontend/lib/api/client.ts:52-121,314-401`
- Public browser proxy: `frontend/app/api/public/[...path]/route.ts`
- Auth browser proxy: `frontend/app/api/auth/[...path]/route.ts`
- Membership/account proxy: `frontend/app/api/me/[...path]/route.ts`
- Shared proxy implementation: `frontend/lib/server/proxy-forward.ts`
- Backend creation, middleware, compression, rate limits, and route autoload: `backend/src/app.ts:25-306`
- Backend listen and in-process scheduler startup: `backend/src/server.ts:13-20`
- Prisma/pg pool: `backend/src/db/prisma.ts:24-49`

### Authentication

The frontend proxy validates RS256 session cookies locally for routing and header hints. The backend remains authoritative. `requireAuth` verifies the JWT and performs a `User.findUnique` on each guarded request to confirm token version, active status, and deletion status (`backend/src/utils/require-auth.ts:36-60`). That database read is security-relevant and should not be removed casually; duplicate checks inside one request/navigation should instead be deduplicated or traced.

### Database and caching

The backend uses one Prisma client over one shared `pg.Pool` per process: max 10 connections, 30 s idle timeout, 5 s connection timeout, and 15 s statement timeout. Public content uses Next data caching/tags plus explicit backend cache headers on selected routes. Availability uses bounded in-process TTL caches and mutation invalidation. Private account/admin/doctor/corporate responses default to `Cache-Control: private, no-store`.

### Deployment

Railway starts one `node dist/server.js` backend process (`backend/railway.json`, `backend/nixpacks.toml`) and one Next server process. The backend image also contains Playwright Chromium and LibreOffice. In-process schedules are enabled by default; replicas are expected to disable them with `RUN_SCHEDULER=false`, leaving one scheduler/worker instance.

## 3. Complete API Inventory

### Inventory method and totals

The route ledger at the end of this report is source-derived from current `app.get/post/put/patch/delete()` registrations and records method, endpoint, handler file, authentication/cache class, and measurement state for all **658 statically discoverable backend operations**. The generator scanned non-test `backend/src/routes/*.ts`, extracted literal Fastify method/path registrations, sorted by path and method, and deduplicated on method plus path. This is the ultimate-execution source inventory; runtime `app.printRoutes()` should be captured in CI to detect any dynamically registered exception. Same-origin Next handlers are transport adapters for those operations plus a small number of frontend-only routes such as `/api/og` and `/api/health`.

Frontend path scanning found 506 literals/variants. Query-string variants and catch-all proxies mean this number is not directly comparable to the backend registration count. The runtime route families are summarized below so an engineer can understand user impact without reading 658 rows first.

| Family | Backend operations | Main consumers | Initial-load behavior | Auth/cache |
| --- | ---: | --- | --- | --- |
| `/api/public/*` | 22 | Public forms, consent, reviews, availability, invoices, upload capabilities | Some homepage/booking blocking | Public or signed capability; route-specific cache/no-store |
| `/api/countries*`, `/api/services*`, `/api/doctors*`, `/api/health-tests*`, `/api/blog*`, `/api/assets`, `/api/specialties` | 24 | Public shell, country home, catalog/detail, sitemap/build | Frequently blocking SSR | Public; generally 60-300 s cache directives/tags |
| `/api/auth/*` | 19 | Login, registration, session, password, 2FA | Login/session blocking | Private, no-store; tighter rate limits |
| `/api/cart*`, `/api/orders*`, `/api/appointments` | 9 | Every public shell after hydration, booking, checkout | Cart is universal post-paint; booking blocking | Guest/auth private, no-store |
| `/api/payments/*` | 3 | Checkout, sync, Stripe webhook | Conversion blocking / webhook | Private or signed provider call |
| `/api/contact`, `/api/newsletter`, `/api/medical-access-requests*` | 5 | Contact/newsletter forms and medical-access workflow | Interaction/background | Public form or handler-specific controls |
| `/api/account/*` | 56 | Patient dashboard/profile/files/chat/payments | Dashboard has auth + six parallel reads | Authenticated, private no-store |
| `/api/me/*` | 33 | Membership, subscription, corporate benefit surfaces | Pricing/account dependent | Authenticated, private no-store |
| `/api/doctor/*` | 122 | Doctor dashboard, consultations, documents, chat, reports | Dashboard has one read then two parallel reads | Doctor/admin roles, private no-store |
| `/api/admin/*` | 330 | Admin dashboards and CRUD | Admin home has countries then eight parallel reads | Admin roles, private no-store |
| `/api/corporate/*` | 16 | Corporate admin portal | Dashboard/detail dependent | Corporate/admin roles, private no-store |
| `/api/partner/*` | 5 | Partner integration | Background/integration | API-client authentication |
| `/api/internal/*`, `/api/cron/*` | 9 | Scheduler/jobs | Background; shares API process | Internal secret/controlled caller |
| `/api/media/*`, `/api/share-links/*` | 2 | CMS media, signed shares/downloads | Images/docs may block content | Public key/capability or route policy |
| `/health`, `/live`, `/ready` | 3 | Railway/operations | Infrastructure | Public operational probes |

### Current measured inventory

All sizes below are uncompressed response bytes. Backend compression is enabled above 1 KB; header checks confirmed gzip on `/api/countries` and the homepage. p99 is not reported because seven samples cannot support it.

| Endpoint | Method | Used By | Avg | p50 | p95 | Payload | Status |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| `/health` | GET | Railway/operations | 551 ms | 458 ms | 877 ms | 43 B | Slow |
| `/api/countries` | GET | Public shell/site context | 498 ms | 489 ms | 584 ms | 9,219 B | Needs investigation |
| `/api/countries/ie/services?locale=EN` | GET | Ireland home/catalog | 868 ms | 865 ms | 919 ms | 276,806 B | Slow |
| `/api/countries/ie/doctors?locale=EN` | GET | Ireland home/doctors | 1,077 ms | 954 ms | 1,702 ms | 514,430 B | Critical |
| `/api/doctors/count` | GET | Country home | 527 ms | 515 ms | 608 ms | 31 B | Needs investigation |
| `/api/public/gp-languages?country=IE` | GET | Country home/same-day booking | 496 ms | 464 ms | 650 ms | 179 B | Needs investigation |
| `/api/public/reviews-config` | GET | Public shell/review widgets | 485 ms | 469 ms | 547 ms | 219 B | Needs investigation |
| `/ie/en` frontend document | GET | Ireland visitors | 1,266 ms | 1,070 ms | 2,518 ms | 640,192 B HTML | Critical |

The first probe used uppercase `IE` for the two catalog paths and received valid empty 21-byte responses; those samples were excluded and replaced with the lowercase paths the application actually calls. This is why the table does not mix empty and representative payloads.

### Historical concurrency inventory

| Profile | Scope | Avg | p95 | Max | Status |
| --- | --- | ---: | ---: | ---: | --- |
| 5 VUs, 2 min | Public + authenticated + booking + heavy | Not retained by endpoint | Smoke passed | — | Historical pass |
| 50 VUs, 15 min | 19,868 requests | 456 ms overall | 890 ms overall; `/ie/en` 1.1 s | — | Historical pass |
| 200 VUs, 30 min hold | 81,960 requests | 19.9 s page load | 13.48 s overall; `/ie/en` 30 s | 15m57s page outlier | Historical critical fail |

The historical report recorded no DB lock waits and no more than three active connections during the 200-VU run. That rules out pool exhaustion for that specific staging run, not for every endpoint or future deployment.

## 4. Critical APIs

### `/api/countries/ie/doctors?locale=EN`

- **Current performance:** 1,077 ms average, 954 ms p50, 1,702 ms p95; 514,430 B uncompressed.
- **Target:** less than 300 ms p95 TTFB and less than 500 ms total for the first page; less than 100 KB compressed list payload.
- **Root cause:** confirmed oversized full-list response on top of the common 0.5-0.6 s latency floor. The public home and directory consume a roster much richer than a card/count projection requires.
- **Evidence:** current seven-sample probe; `frontend/lib/content/get-public-doctors.ts`; `frontend/lib/api/site-content-api.ts`; handler `backend/src/routes/country-scoped.route.ts`.
- **Recommended fix:** introduce a bounded public doctor-card projection with explicit pagination/cursor and a separate detail endpoint; keep the count endpoint; avoid nested translations/relations not displayed in the list. Preserve crawlability by server-rendering the first page and stable pagination links.
- **Risk:** medium. SEO, cross-market doctor listings, active/suspended status, and deterministic ordering must be preserved.
- **Expected impact:** remove hundreds of KB per country page and reduce serialization/transfer time by roughly 300-500 ms in this probe, before any backend-query improvement.

### `/api/countries/ie/services?locale=EN`

- **Current performance:** 868 ms average, 865 ms p50, 919 ms p95; 276,806 B uncompressed.
- **Target:** less than 300 ms p95 TTFB and less than 500 ms total; less than 100 KB compressed first-page/list payload.
- **Root cause:** confirmed oversized catalog payload plus common latency floor.
- **Evidence:** current seven-sample probe; `frontend/lib/content/get-public-services.ts`; `frontend/lib/api/site-content-api.ts`; `backend/src/routes/country-scoped.route.ts`.
- **Recommended fix:** return card fields only for the catalog; move long body, FAQ, SEO keyword, requirements, and other detail-only relations to the detail route; avoid repeating country/currency objects per row.
- **Risk:** low-medium if backed by response-contract tests and page snapshot/E2E checks.
- **Expected impact:** 150-250 KB raw reduction and lower JSON parse/serialization cost on every country page/catalog navigation.

### `/ie/en` and public shell SSR dependency graph

- **Current performance:** 1,266 ms average, 1,070 ms p50, 2,518 ms p95; 640,192 B uncompressed HTML.
- **Target:** less than 500 ms TTFB and less than 1 s p95 document response from a representative market; materially smaller HTML/RSC transfer.
- **Root cause:** the public shell starts five backend reads (`PublicShell.tsx:85`); country home starts six more (`app/[country]/[lang]/page.tsx:223`). The work is mostly parallel rather than waterfall, but origin fan-out, dynamic personalization, and very large data/HTML still block completion. The shell also mounts cart hydration traffic after paint.
- **Evidence:** current probe; `frontend/components/layout/PublicShell.tsx:85-157`; `frontend/app/[country]/[lang]/page.tsx:78,223`; `frontend/components/cart/CartContext.tsx:93`.
- **Recommended fix:** measure the render with Server-Timing first; consolidate stable shell/home data into cached projections; stream below-fold trust/review sections; keep personalized auth/cart as small islands; remove catalog detail fields; assess Cache Components/PPR only after response dependencies are explicit.
- **Risk:** medium-high because locale, SEO metadata, feature flags, and authenticated header state must remain correct.
- **Expected impact:** largest improvement to LCP/navigation because this is the visible document path.

### Availability endpoints

Affected routes include `/api/services/:countryCode/:serviceSlug/aggregated-availability`, `/api/services/:countryCode/:serviceSlug/doctors/:doctorSlug/availability`, `/api/public/gp-availability`, and the frontend `/api/public/booking-availability` adapter.

- **Current performance:** not safely timed in this audit because the GET path can release expired holds and materialize slots. The route was not repeatedly invoked against an unknown database target.
- **Expected target:** less than 500 ms p95 warm and less than 1 s p95 cold with query count bounded independently of doctor count.
- **Root cause:** current code still performs service/doctor lookup, bookability, optional insurance lookup, slot work, timezone resolution, and peak configuration. The single-doctor path calls timezone resolution separately; aggregated paths batch doctor reads but still sweep expired holds and fan out slot work.
- **Evidence:** `backend/src/routes/country-scoped.route.ts:344-402,434-467`; `backend/src/modules/service-booking/service-availability.service.ts:96-197`; `backend/src/modules/doctor-availability/doctor-availability.service.ts:1777-1893`.
- **Resolved since the July audit:** 45-second bounded caches, in-flight deduplication, shared raw slot inventory across service durations, mutation invalidation, and one batched hold release are present at revision `f7da1354`. Thirteen focused tests pass.
- **Recommended fix:** move expired-hold release/materialization to a scheduled/set-based job; batch timezone/insurance/peak data into the initial doctor/service projection; add per-phase timing and query-count tests; preserve short no-store client semantics for bookable slots.
- **Risk:** high. Availability correctness, held slots, pauses, doctor suspension, and race-free booking are more important than cache hit rate.
- **Expected impact:** lower p95 and less write contention, especially for service/GP fan-out.

### Payment webhook and order fulfillment

- **Current performance:** unmeasured; authenticated/provider-safe timing is required.
- **Target:** acknowledge verified Stripe events in less than 500 ms p95 after durable idempotency/outbox commit; process fulfillment asynchronously with its own SLO.
- **Root cause:** paid webhooks await `completeOrderPaymentFromCheckoutSession`; fulfillment loops order items and performs slot, appointment, GP assignment, patient, and insurance work in a transaction with a 30 s timeout.
- **Evidence:** `backend/src/routes/payments.route.ts:553-677`; `backend/src/modules/orders/complete-order-payment.service.ts:49-131,193-245,254-613`.
- **Recommended fix:** keep payment state/idempotency and outbox enqueue transactional, acknowledge Stripe, and move idempotent fulfillment steps to a monitored worker. Do not weaken payment correctness.
- **Risk:** high; requires exact idempotency, retry, compensation, and observability design.
- **Expected impact:** removes provider retry amplification and protects checkout during slow fulfillment.

### Document generation/list/send

- **Current performance:** unmeasured; code documents 10-15 s LibreOffice fallback.
- **Target:** list metadata under 300 ms p95; generation as an asynchronous job with progress; download streams without full proxy buffering.
- **Root cause:** list can purge orphans via storage reads; generation performs DB/storage/render work; sends loop documents and providers sequentially; storage reads retry up to three times with waits.
- **Evidence:** `backend/src/modules/generated-documents/generated-documents.service.ts:63-100,343-532,722-768,817-999`.
- **Recommended fix:** make list read-only; move orphan cleanup to a job; queue generation/send; stream storage objects; expose job state.
- **Risk:** medium-high because clinical documents and delivery auditability are sensitive.
- **Expected impact:** removes 10 s-class CPU/provider work from interactive request slots.

## 5. Database Bottlenecks

### Confirmed

- Guarded requests perform a user lookup after JWT verification. This is a deliberate revocation/account-state check, but repeated auth reads across one portal navigation need tracing and request-level deduplication.
- Availability still performs multiple sequential queries/services and can write from read routes. Recent cache/single-flight changes reduce duplicate work but do not make query count constant.
- Payment fulfillment performs per-item database work inside a potentially 30 s transaction.
- Document listing can perform object-storage verification and database deletion before returning metadata.
- The shared pool is fixed at 10 connections per process. Timeouts are explicit and sane as a starting point, but the correct pool size depends on replica count, PostgreSQL connection budget, and measured query concurrency.

### Historical but not reconfirmed

The 2026-08-14 200-VU run reached at most three active pool connections with no lock waits. Therefore increasing pool size is not a justified first fix for the previously observed capacity failure.

### Requiring database evidence

No `EXPLAIN (ANALYZE, BUFFERS)` was run because a safe representative database was unavailable. Before adding indexes, capture plans for:

- Doctor/service country lists and their ordering/filter predicates
- Availability doctor, slot-status, and date-range queries
- Admin patient search and paginated order/appointment lists
- Reminder/outbox due-time scans
- Payment fulfillment lookups by order, slot, patient email/blind index, and provider IDs

Index acceptance requires reduced buffers/rows scanned on representative data, not merely a planner choosing the new index on an empty test database.

## 6. Backend Bottlenecks

- **Single process per service:** historical load shows severe queueing with low aggregate CPU utilization. Multiple cores do not help one Node process unless work is replicated or moved to workers.
- **Scheduler shares request process:** reminder, subscription, outbox, cancellation, and no-show jobs run in the API process, including boot-time jittered runs (`internal-scheduler.ts:29-53,476-507`).
- **CPU/heavy child processes share image/process environment:** PDF generation, Chromium, and LibreOffice compete with requests.
- **Provider/storage work is awaited:** payment, document, email, WhatsApp, object storage, Rekognition, and other integration paths can occupy request handlers.
- **Proxy buffering:** frontend proxy helpers buffer text or `arrayBuffer()` responses instead of streaming all eligible downloads, adding memory and one-hop latency.
- **No global request deadline:** Node/Fastify defaults apply; provider routes have inconsistent abort budgets.
- **No first-class metrics:** logs exist, but no APM/OTel/Prometheus route histograms, event-loop lag, query timing, provider timing, or cache hit ratios were found.

## 7. Frontend Request Problems

### Initial-load fan-out

- Public shell: five parallel loaders on most marketing pages.
- Country home: six parallel loaders in addition to shell dependencies.
- Account dashboard: auth, then six parallel reads.
- Doctor dashboard: doctor profile/auth read, then appointments and notifications.
- Admin dashboard: countries first, then eight parallel reads, including scoped and unscoped lists for global health summaries. This is the largest portal first-paint burst.

Parallelization prevents a simple A->B->C waterfall, but it does not remove backend work. At the measured 0.5 s small-endpoint floor, an uncached miss in any required branch sets the page critical path; large doctors/services branches then add transfer and render cost.

### Duplicate/unnecessary traffic

- Every public shell mounts `CartProvider`, which calls `/api/cart` after hydration even on informational pages (`PublicShell.tsx:157`, `CartContext.tsx:93`). Scope it to commerce routes or lazy-load after the first cart interaction.
- Public auth `/api/auth/me` is already conditional on `gh-auth-hint`; this is a positive optimization and should be preserved.
- Metadata/page content duplication is request-deduped with React `cache()`; this is also resolved and should not be reported as a duplicate call.

### Polling

Patient/admin booking chat, patient/doctor consultation chat, and doctor/admin support chat poll every 10 seconds while visible (`frontend/components/chat/ChatThread.tsx:44-92`, `ConsultationChat.tsx:73-147`, `SupportChat.tsx:55-153`). Support chat also refreshes on focus/visibility. Visibility gating is good; the remaining risk is many open portal tabs and unchanged full responses.

Recommended next step: record payload/change rate and active-session concurrency. If low-change, use ETag/`If-None-Match`, long polling, SSE, or WebSocket only where operational complexity is justified. Back off after repeated unchanged responses and stop immediately when hidden/offline.

## 8. Third-Party API Bottlenecks

| Dependency | Blocking paths | Timeout/retry evidence | Current latency evidence | Recommendation |
| --- | --- | --- | --- | --- |
| Stripe | Checkout, webhook, refunds, voucher/checkout teardown | SDK behavior plus route logic; not uniformly timed | Not measured | Trace each call; acknowledge webhook after durable state/outbox; bounded retries |
| S3-compatible object storage | Uploads, document list/read/send, media | Some reads retry 3x with 400 ms waits | Not measured | Stream downloads, separate orphan cleanup, per-call deadlines/metrics |
| LibreOffice/Chromium | Generated documents/PDF | Code comment notes 10-15 s fallback | Code-confirmed long task | Queue and isolate worker resources |
| SendGrid/Gmail/email | Registration, invoices, notifications, documents | Mixed paths, some inline | Not measured | Outbox, idempotency key, 3-5 s connect/overall budgets, retry worker |
| WhatsApp/WaSender | Notifications/upload links | Scheduler notes serialized sends | Not measured | Worker queue, rate control, circuit breaker/fallback |
| Google Calendar/Meet | Consultation fulfillment | Inline in some historical flows | Not measured | Outbox/worker and deadline; preserve meeting idempotency |
| Rekognition | Identity verification | SDK call from face-match service | Not measured | Explicit timeout, async review fallback, provider timing |
| Invoice provider/Make.com | Billing/automation | External request paths | Not measured | Deadline, outbox, reconciliation job |
| Doctify | Client reviews widget | Consent-gated iframe/script | Not measured | Intersection-observer load below fold; never block LCP |
| GA4/Clarity | Client analytics | Consent and route gated | Not measured | Keep post-consent/deferred; monitor main-thread/network cost |

## 9. Caching Opportunities

| Data | Layer | Proposed TTL | Invalidation | Stale-data risk |
| --- | --- | ---: | --- | --- |
| Countries, footer, trust, reviews config | Next data cache + verified shared CDN | 2-5 min | Existing/admin mutation tags plus explicit surrogate purge | Feature/legal/trust changes; short TTL and mutation purge |
| Public doctor/service card projections | Next data cache + shared CDN | 60 s | Doctor/service/country mutation tags; suspension must purge immediately | Suspended doctor or price availability stale; purge and server-side booking validation |
| Doctor count | Next/shared cache | 60 s | Doctor create/activate/suspend/delete | Cosmetic count staleness only |
| Country home context projection | Server aggregation cache | 60 s | Union of country/page/doctor/service/trust tags | Wider invalidation graph; measure hit ratio |
| Availability derived rows | Backend in-process/shared single-flight | 30-45 s maximum | Every slot/booking/pause/suspension mutation | High correctness risk; no public SWR, revalidate at booking |
| Timezone/peak configuration | Backend bounded cache | 5 min | Admin configuration mutation | Wrong price/timezone; mandatory explicit invalidation |
| Authenticated/private data | Browser/Next/CDN | No shared cache | N/A | Do not cache across users; retain `private, no-store` |

Current headers are directionally good: countries advertise 120 s plus SWR, review config 300 s plus SWR, country services 60 s plus SWR, and private prefixes default to no-store. However, the probe saw no `Age` or other proof of a shared cache hit. Verify whether Railway or an upstream CDN actually honors `s-maxage`; headers alone do not create a cache.

## 10. Payload Problems

- Ireland doctors: 514,430 B raw. Split list card projection from detail, paginate, and eliminate repeated nested country/translation/media objects.
- Ireland services: 276,806 B raw. Remove FAQ/body/SEO/detail-only fields from list responses.
- Ireland homepage: 640,192 B raw HTML. Inspect RSC/serialized props and repeated content, not only markup. Compression helps transfer but not server serialization, decompression, parse, or hydration memory.
- Public list APIs and many authenticated histories are not consistently paginated. Adopt cursor pagination with explicit maximum page sizes and lightweight list projections.
- Proxy buffering duplicates large PDF/export/media payloads in Next memory. Stream safe upstream bodies and preserve only allowlisted headers.

Compression is correctly configured at the backend for Brotli/gzip/deflate above 1 KB and was observed on representative responses. Compression is not a substitute for returning less data.

## 11. Infrastructure Findings

### Confirmed

- Railway/Nixpacks deployment; one Node start command per frontend/backend service.
- Current probe reached Railway edge `sin1`. This identifies the edge used from the audit location, not the backend or database region.
- Backend pool is max 10 per process with connection/statement timeouts.
- Readiness performs a bounded database `SELECT 1`; liveness is process-only.
- Scheduler is in-process by default and supports `RUN_SCHEDULER=false` for extra replicas.
- Optional Redis is used for distributed rate-limit state only when `REDIS_URL` is set; otherwise buckets are per process.
- No repo-level override for keep-alive/header/request timeouts was found.

### Historical/suspected

- Historical 200-VU evidence is consistent with single-process event-loop queueing. It is not a fresh profile and must be confirmed with event-loop lag and CPU-per-replica telemetry.
- Region mismatch may contribute to the small-response floor, but origin/database regions are unknown. Do not infer them from `x-railway-edge: sin1`.
- A shared CDN may not be serving backend JSON despite cache headers; current responses did not prove cache hits.

### Production monitoring required

- Origin/frontend/backend/database regions and inter-service RTT
- Per-route p50/p95/p99 and active requests
- Event-loop utilization/lag, CPU by process, memory/GC pauses
- DB pool active/idle/wait, query count/time, slow-query plans, locks
- Cache hit/miss and single-flight coalescing
- Provider call duration, timeout, retry, and failure rates
- Worker queue depth/age and scheduler duration
- Response compressed/uncompressed bytes by route

## 12. Prioritized Fix List

| Priority | Issue | Endpoint | Impact | Effort | Risk | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | Exposed load-test credentials and incomplete harness | Load-test tooling | Blocks safe authenticated measurement | Low-medium | Security | Rotate/revoke, purge where appropriate, untrack cookies, restore scenarios, add CI guard |
| P0 | No route/query/event-loop telemetry | All | Prevents exact root-cause allocation | Medium | Low | Add trace IDs, Server-Timing, route histograms, query/provider spans, event-loop lag |
| P0 | Oversized doctor catalog | `/api/countries/:code/doctors` | Homepage/directory LCP and transfer | Medium | Medium | Card projection + pagination + detail split |
| P0 | Public document fan-out/large HTML | Country homepage/public shell | Direct LCP/TTFB blocker | Medium-high | Medium-high | Consolidate cached projections, stream below fold, isolate personalization |
| P0 | Historical single-process capacity collapse | Frontend/backend | Site unusable at 200 VUs | Medium | Medium | Instrument, safe retest, then replicas with Redis limiter and scheduler isolation |
| P1 | Oversized service catalog | `/api/countries/:code/services` | Homepage/catalog transfer | Medium | Low-medium | List projection and relation trimming |
| P1 | Availability still does sequential/read-write work | Availability family | Booking interaction latency/contention | High | High | Set-based cleanup/materialization, batch dependent data, phase timing |
| P1 | Scheduler and heavy jobs share API process | API-wide tails | Capacity and p95/p99 | High | Medium | Dedicated worker deployment; web replicas `RUN_SCHEDULER=false` |
| P1 | Webhook fulfillment waits for heavy workflow | `/api/payments/webhook` | Payment reliability/retries | High | High | Durable outbox and asynchronous idempotent fulfillment |
| P1 | Document list/generation/send is synchronous/provider-bound | Doctor document routes | 10 s-class interactions | Medium-high | Medium-high | Queue generation/send; read-only list; stream downloads |
| P1 | Universal cart request | `/api/cart` | Extra request on every public page | Low | Low | Lazy/scope provider or initial minimal count |
| P1 | Admin dashboard 1+8 load burst | Admin home | Slow first paint/backend burst | Medium | Medium | Purpose-built summary endpoint/projections; avoid duplicate global lists |
| P2 | 10 s chat polling | Chat/support families | Sustained background load | Medium | Medium | ETag/backoff; evaluate SSE/WebSocket from measured concurrency |
| P2 | Auth DB lookup per guarded request | Private APIs | Fixed DB cost | Medium | Security-sensitive | Trace and request-dedupe only; preserve revocation semantics |
| P2 | Proxy buffering/no standard deadlines | Downloads/provider proxies | Memory/tail latency | Medium | Medium | Stream, abort budgets, safe header forwarding |
| P2 | Cache-hit behavior unverified | Public reads | Origin load and TTFB | Low-medium | Medium | Verify CDN behavior and tag/purge paths before longer TTLs |
| P3 | Keep-alive/request timeout defaults undocumented | API server | Operational tails | Low | Low-medium | Measure, then set explicit bounded values and regression tests |

## 13. Quick Wins

1. Remove `/api/cart` from informational-page mount; load on cart/booking routes or first cart interaction.
2. Add `Server-Timing` for Next shell loaders and backend phases, plus a request ID forwarded across Next -> Fastify.
3. Add response byte logging/histograms and alert on doctor/service list budget regressions.
4. Create lightweight doctor/service list projections without changing detail contracts.
5. Verify shared cache behavior with `Age`/cache-status and purge tests; do not lengthen TTL until invalidation is proven.
6. Add ETag/backoff to 10-second polling endpoints before adopting a new realtime stack.
7. Make generated-document list read-only; move orphan verification to the existing scheduler/worker path.
8. Restore the missing k6 scenarios and remove tracked auth artifacts before any new authenticated run.

## 14. Larger Architectural Improvements

- Separate request-serving web processes from scheduler/outbox/document/provider workers.
- Add horizontal frontend/backend replicas only with distributed rate limiting, explicit scheduler topology, connection-budget calculations, and load validation.
- Introduce durable, observable idempotent jobs for payment fulfillment, documents, messaging, calendar, and invoice side effects.
- Build purpose-specific read models/projections for public home, admin summary, and catalog cards instead of composing large operational entities at page time.
- Move availability hold cleanup/materialization out of GETs and query slots set-wise.
- Adopt OpenTelemetry or equivalent APM with route, DB, provider, queue, and frontend server-render spans.

## 15. Recommended Implementation Order

### Phase 0 — Measurement safety and security

Rotate exposed load-test credentials, untrack cookie artifacts, restore missing scenarios, ensure the target is a confirmed snapshot, neutralize real integrations, and add a CI secret/tracked-cookie guard.

### Phase 1 — Instrument and reduce visible payloads

Add trace/Server-Timing/route/query/provider metrics. Ship doctor/service list projections and remove universal cart fetch. Establish response and latency budgets.

### Phase 2 — Public page and dashboard request topology

Consolidate stable public shell/home reads, stream below-fold sections, and create an admin summary projection. Preserve locale, SEO, auth, and cache invalidation behavior with integration/E2E tests.

### Phase 3 — Availability/database work

Measure query counts and plans on representative data. Move hold cleanup/materialization to set-based jobs, batch repeated timezone/insurance/peak reads, and verify booking races.

### Phase 4 — Workers and provider isolation

Move payment fulfillment, documents, messaging, and scheduled jobs to durable workers with idempotency, retries, deadlines, and queue SLOs.

### Phase 5 — Infrastructure capacity

Run the restored smoke/baseline/target-200 ladder against a confirmed non-production snapshot. If event-loop contention is confirmed, enable replicas with Redis-backed rate limiting, scheduler isolation, and a calculated database connection budget. Continue to stress/spike/soak only after target-200 passes.

## 16. Verification Plan

| Change | Before/after metrics | Correctness checks | Acceptance target |
| --- | --- | --- | --- |
| Doctor/service projections | p50/p95/p99, TTFB, raw/compressed bytes, serialization time | Locale, order, active status, SEO links, detail parity | Doctor/service list p95 <500 ms and first payload <100 KB compressed |
| Public shell/home consolidation | Document/RSC p50/p95/p99, Server-Timing phases, backend request count, LCP | Six markets/languages, metadata, auth header, footer/trust flags | `/ie/en` p95 <1 s in baseline; fewer origin calls |
| Cart lazy load | Request count per anonymous page, INP/LCP | Cart count/add/update/checkout E2E | No `/api/cart` on informational anonymous navigation |
| Availability changes | Query count/time, p50/p95/p99, writes per GET, cache hit/coalesce rate | Held/booked/paused/suspended/race tests; real booking E2E | Warm p95 <500 ms; bounded query count; zero cleanup writes in GET target state |
| Admin summary | First-paint API count, response bytes, DB time | Country scope/role authorization, totals parity | One summary call plus only detail-on-demand |
| Polling optimization | Requests/session/hour, 304 ratio, bytes, freshness delay | Message ordering/unread/focus/reconnect | At least 70% lower unchanged bytes/requests without >10 s freshness regression |
| Payment worker | Webhook ack p95/p99, provider retries, queue age, fulfillment duration | Stripe signature/idempotency, duplicate event, partial failure, reconciliation | Ack p95 <500 ms; zero duplicate fulfillment |
| Document worker/streaming | API p95, worker time, peak RSS, storage/provider spans | Clinical document integrity, audit trail, download authorization | Metadata p95 <300 ms; generation no longer occupies request handler |
| Replicas/worker split | Target-200 page/API p95/p99, event-loop lag, per-replica CPU, errors | Rate limits, scheduler singleton, sessions, DB budget | `/ie/en` p95 <1.5 s and errors <1% at 200 VUs |
| Cache deployment | Hit ratio, origin requests, stale age, purge latency | Mutation invalidation, suspension/price/legal updates | >80% hit on stable public reads; purge visible within agreed SLA |

For every optimization, retain the same dataset, location, connection model, and load profile before and after. Report both cold and warm behavior. Do not declare success from a single request or average alone.

## Audit Verification Performed

- `pnpm --filter backend typecheck` — passed.
- Focused availability/bookability tests — 13 passed, 0 failed.
- Current public probes — 7 valid samples for each of 8 representative paths; no authenticated or mutating requests.
- Response-header checks — compression and public cache directives observed; private caching confirmed from code.
- Docker local profiling — blocked because Docker Desktop was not running; no unsafe fallback was used.
- Full k6 rerun — blocked because tracked scenarios are missing and credential handling is unsafe; historical results are clearly labeled.

## Appendix A — Complete Backend Route Ledger

The source-derived ledger below lists all literal Fastify method/path registrations found at the audited revision. `NM` means not measured in this audit. Auth is inferred conservatively from route family; the handler remains the source of truth for exceptional public/signed routes.

| Method | Endpoint | Backend handler / used by | Auth/cache | Avg | p95 | Payload | Status |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| GET | `/api/account/access-log` | `account-access-log.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/appointments` | `account-appointments.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/appointments/:id` | `account-appointments.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/appointments/:id/cancel` | `account-appointments.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/appointments/:id/chat` | `consultation-chat.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/appointments/:id/chat` | `consultation-chat.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/appointments/:id/chat/download/:messageId` | `consultation-chat.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/appointments/:id/chat/upload` | `consultation-chat.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/appointments/:id/messages` | `chat.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/appointments/:id/messages` | `chat.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/appointments/:id/payment-url` | `account-payments.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/appointments/:id/reschedule` | `account-appointments.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/account/appointments/:id/reschedule` | `account-appointments.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/consents` | `consents.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/account/consents` | `consents.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/data-deletion` | `account-data-deletion.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/data-deletion` | `account-data-deletion.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/family` | `family.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/family` | `family.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/account/family/:id` | `family.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/account/family/:id` | `family.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/invoices` | `account-invoices.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/invoices/:invoiceId` | `account-invoices.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/invoices/:invoiceId/pdf` | `account-invoices.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/medical-documents` | `medical-documents.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/medical-documents` | `medical-documents.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/medical-documents/:id/download` | `medical-documents.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/message-threads` | `chat.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/messages/unread` | `chat.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/orders` | `orders.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/orders/:id` | `orders.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/orders/:id/payment-url` | `orders.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/payments` | `account-payments.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/payments/:id/receipt-url` | `account-payments.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/prescriptions` | `account-prescriptions.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/profile` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/account/profile` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/profile/id-document` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/profile/id-document/download` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/profile/identity-verification` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/profile/identity-verification/selfie` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/profile/identity-verification/selfie/download` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/profile/identity-verification/submit` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/profile/insurance` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/account/profile/insurance` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/profile/insurance/document` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/profile/nationality` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/account/profile/nationality/:slot` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/account/profile/nationality/:slot` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/profile/nationality/:slot/download` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/profile/nationality/:slot/upload` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/profile/verification` | `account-profile.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/account/security/sign-out-all` | `auth.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/subscription-invoices/:id` | `account-invoices.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/subscription-invoices/:id/pdf` | `account-invoices.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/account/trustpilot-reminder` | `account-trustpilot-reminder.route.ts` | Patient/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/appointments` | `admin-appointments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/appointments` | `admin-appointments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/appointments/:id` | `admin-appointments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/appointments/:id/internal-messages` | `internal-messages.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/appointments/:id/internal-messages` | `internal-messages.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/appointments/:id/messages` | `chat.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/appointments/:id/messages` | `chat.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/appointments/:id/schedule` | `admin-appointments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/appointments/:id/status` | `admin-appointments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/appointments/:id/update` | `admin-appointments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/assets` | `admin-assets.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/assets` | `admin-assets.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/assets/:id` | `admin-assets.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/assets/:id` | `admin-assets.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/assets/:id` | `admin-assets.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/assets/:id/purge` | `admin-assets.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/audit-log` | `admin-audit-log.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/audit-log/export` | `admin-audit-log.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/automation/catalog` | `admin-automation.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/automation/orders` | `admin-automation.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/automation/runs` | `admin-automation.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/blog` | `admin-blog.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/blog` | `admin-blog.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/blog/:id` | `admin-blog.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/blog/:id` | `admin-blog.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/blog/:id` | `admin-blog.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/blog/:id/countries` | `admin-blog.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/blog/:id/purge` | `admin-blog.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/blog/:id/translations` | `admin-blog.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/blog/:id/translations/:locale` | `admin-blog.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/blog/:id/translations/:locale` | `admin-blog.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/calendar` | `admin-calendar.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/clinics` | `admin-clinics.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/confidentiality-signed/download` | `doctor-confidentiality.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/corporate/beneficiaries/:id` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/corporate/beneficiaries/:id/resend-invite` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/corporate/companies` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/corporate/companies` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/corporate/companies/:id` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/corporate/companies/:id` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/corporate/companies/:id` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/corporate/companies/:id/admin-invite` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/corporate/companies/:id/beneficiaries` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/corporate/companies/:id/employees` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/corporate/companies/:id/employees` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/corporate/companies/:id/invoices` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/corporate/companies/:id/requests` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/corporate/companies/:id/requests` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/corporate/employees/:id` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/corporate/employees/:id` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/corporate/employees/:id/resend-invite` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/corporate/plan-services/:id` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/corporate/plan-services/:id` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/corporate/plans` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/corporate/plans/:id` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/corporate/plans/:id/rules` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/corporate/plans/:id/services` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/corporate/requests/:id` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/corporate/rules/:ruleId` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/corporate/rules/:ruleId` | `admin-corporate.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/countries` | `admin-countries.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/countries` | `admin-countries.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/countries/:code/gp-settings` | `admin-gp-settings.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/countries/:code/gp-settings` | `admin-gp-settings.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/countries/:countryId/authority-links` | `admin-country-authority-links.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/countries/:countryId/authority-links` | `admin-country-authority-links.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/countries/:countryId/footer` | `admin-country-footer.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/countries/:countryId/footer` | `admin-country-footer.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/countries/:countryId/insurance-companies` | `admin-insurance-companies.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/countries/:countryId/insurance-companies` | `admin-insurance-companies.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/countries/:countryId/landing-pages` | `admin-seo-landing.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/countries/:countryId/landing-pages` | `admin-seo-landing.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/countries/:countryId/landing-pages/:pageId` | `admin-seo-landing.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/countries/:id` | `admin-countries.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/countries/:id` | `admin-countries.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/countries/:id` | `admin-countries.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/countries/:id/legal` | `admin-countries.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/countries/:id/legal` | `admin-countries.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/countries/:id/legal-documents` | `admin-countries.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/countries/:id/legal-documents` | `admin-countries.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/countries/:id/legal-documents/:docId` | `admin-countries.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/countries/:id/purge` | `admin-countries.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/currencies` | `admin-countries.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/data-deletion-requests` | `admin-data-deletion.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/data-deletion-requests/:id` | `admin-data-deletion.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/data-policy` | `admin-data-policy.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/data-policy/:countryCode` | `admin-data-policy.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/data-policy/:countryCode` | `admin-data-policy.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctor-profile-change-requests` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctor-service-requests` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/doctors` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/:doctorId/credentials` | `admin-doctor-credentials.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/doctors/:doctorId/credentials` | `admin-doctor-credentials.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/:doctorId/faqs` | `admin-doctor-faqs.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/doctors/:doctorId/faqs` | `admin-doctor-faqs.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/:doctorId/markets` | `admin-doctor-markets.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/doctors/:doctorId/markets/:countryId` | `admin-doctor-markets.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/:doctorId/markets/:countryId/bank` | `admin-doctor-markets.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/:doctorId/registrations` | `admin-doctor-registrations.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/doctors/:doctorId/time-slots` | `admin-doctor-time-slots.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/doctors/:doctorId/time-slots/:slotId` | `admin-doctor-time-slots.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/doctors/:doctorId/time-slots/:slotId` | `admin-doctor-time-slots.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/doctors/:doctorId/time-slots/bulk` | `admin-doctor-time-slots.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/doctors/:id` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/:id` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/doctors/:id` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/:id/availability` | `doctor-availability.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/doctors/:id/availability` | `doctor-availability.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/doctors/:id/booking-pause` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/doctors/:id/booking-pause` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/:id/confidentiality` | `doctor-confidentiality.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/:id/delete-impact` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/:id/featured` | `admin-featured-doctor.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/doctors/:id/featured` | `admin-featured-doctor.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/doctors/:id/invite` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/:id/profile-change-requests` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/doctors/:id/profile-change-requests/:requestId` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/doctors/:id/purge` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/:id/services` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/doctors/:id/services` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/doctors/:id/services/:serviceDoctorId` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/doctors/:id/services/:serviceDoctorId` | `admin-doctors.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/doctors/confidentiality-status` | `doctor-confidentiality.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/exam-types` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/exam-types` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/exam-types/:id` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/exam-types/:id` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/exam-types/categories` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/health-tests` | `admin-health-tests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/health-tests` | `admin-health-tests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/health-tests/:id` | `admin-health-tests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/health-tests/:id` | `admin-health-tests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/health-tests/:id` | `admin-health-tests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/health-tests/:id/faqs` | `admin-health-tests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/health-tests/:id/faqs` | `admin-health-tests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/health-tests/:id/faqs/:faqId` | `admin-health-tests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/health-tests/:id/faqs/:faqId` | `admin-health-tests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/health-tests/:id/faqs/reorder` | `admin-health-tests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/health-tests/:id/purge` | `admin-health-tests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/health-tests/reorder` | `admin-health-tests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/internal-message-threads` | `internal-messages.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/invoices` | `admin-invoices.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/invoices/:invoiceId` | `admin-invoices.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/invoices/:invoiceId/pdf` | `admin-invoices.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/invoices/:invoiceId/resend` | `admin-invoices.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/lab-requisitions` | `admin-lab-requisitions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/lab-requisitions/:id` | `admin-lab-requisitions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/lab-requisitions/:id/confirm` | `admin-lab-requisitions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/lab-requisitions/:id/methods` | `admin-lab-requisitions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/lab-requisitions/:id/payment-link` | `admin-lab-requisitions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/lab-requisitions/:id/result-list` | `admin-lab-requisitions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/lab-requisitions/:id/status` | `admin-lab-requisitions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/lab-requisitions/:id/weblims-form` | `admin-lab-requisitions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/media/upload` | `admin-media-upload.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/medical-access-requests` | `medical-access-requests.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/medical-documents/:id/download` | `medical-documents.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/membership-benefit-options` | `admin-membership-benefit-options.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/membership-benefits/:benefitId` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/membership-benefits/:benefitId` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/membership-enrollments` | `admin-membership-enrollments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-enrollments` | `admin-membership-enrollments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/membership-enrollments/:id` | `admin-membership-enrollments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/membership-enrollments/:id` | `admin-membership-enrollments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-enrollments/:id/allowance-adjust` | `admin-membership-enrollments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-enrollments/:id/dependents` | `admin-membership-enrollments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-enrollments/:id/invite` | `admin-membership-enrollments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-enrollments/:id/reactivate` | `admin-membership-enrollments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-enrollments/:id/remove` | `admin-membership-enrollments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-enrollments/:id/resend-card` | `admin-membership-enrollments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-enrollments/:id/suspend` | `admin-membership-enrollments.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-imports` | `admin-membership-import.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/membership-imports/:batchId` | `admin-membership-import.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-imports/:batchId/cancel` | `admin-membership-import.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-imports/:batchId/commit` | `admin-membership-import.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/membership-levels/:levelId` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/membership-levels/:levelId` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/membership-levels/:levelId/benefits` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-levels/:levelId/benefits` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/membership-levels/:levelId/translations/:locale` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/membership-levels/:levelId/translations/:locale` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/membership-plans` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-plans` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/membership-plans/:planId` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/membership-plans/:planId` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/membership-plans/:planId/countries` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-plans/:planId/countries` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-plans/:planId/countries/:countryId/copy-primary-rules` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-plans/:planId/deactivate` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/membership-plans/:planId/levels` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/membership-plans/:planId/translations/:locale` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/membership-plans/:planId/translations/:locale` | `admin-membership-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/membership-reports/:planId/usage` | `admin-membership-reports.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/membership-reports/enrollment/:enrollmentId/usage` | `admin-membership-reports.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/membership-verify` | `admin-membership-verify.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/message-threads` | `chat.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/newsletter` | `newsletter.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/newsletter.csv` | `newsletter.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/notifications` | `admin-notifications.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/notifications/:id/read` | `admin-notifications.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/notifications/appointment/:appointmentId/read` | `admin-notifications.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/notifications/read-all` | `admin-notifications.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/orders` | `orders.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/orders/:id` | `orders.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/orders/:id` | `orders.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/orders/:id/insurance-verification` | `orders.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/orders/:id/payment-link` | `admin-invoices.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/orders/:id/refund` | `orders.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/orders/bulk` | `orders.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/page-content` | `admin-page-content.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/page-content/:countryId/:pageKey` | `admin-page-content.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/page-content/:countryId/:pageKey` | `admin-page-content.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/page-content/:countryId/:pageKey/flags` | `admin-page-content.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/pages` | `admin-pages.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/pages` | `admin-pages.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/pages/:id` | `admin-pages.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/pages/:id` | `admin-pages.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/pages/:id` | `admin-pages.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/pages/:id/purge` | `admin-pages.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/partner-api-clients` | `admin-partner-api-clients.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/partner-api-clients` | `admin-partner-api-clients.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/partner-api-clients/:id` | `admin-partner-api-clients.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/patient-anonymize` | `admin-data-deletion.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/patient-merge` | `admin-patient-merge.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patient-merge/duplicates/:patientId` | `admin-patient-merge.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patient-merge/status/:patientId` | `admin-patient-merge.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/patients` | `admin-patient-profile.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patients/:email/access-log` | `account-access-log.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patients/:email/alert-log` | `admin-patient-profile.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patients/:email/consents` | `consents.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patients/:email/id-document/download` | `admin-patient-profile.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patients/:email/insurance/download` | `admin-patient-profile.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patients/:email/medical-documents` | `medical-documents.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patients/:email/nationality` | `admin-patient-profile.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patients/:email/payments` | `admin-patient-profile.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patients/:email/profile` | `admin-patient-profile.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/patients/:email/profile` | `admin-patient-profile.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patients/by-email` | `admin-patient-profile.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/patients/search` | `admin-patient-profile.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/payout-invoices` | `admin-payout-invoices.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/payout-invoices/download` | `admin-payout-invoices.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/plans` | `admin-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/plans` | `admin-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/plans/:id` | `admin-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/plans/:id` | `admin-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/plans/:id` | `admin-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/plans/:id/consultation-rules` | `admin-plan-rules.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/plans/:id/consultation-rules` | `admin-plan-rules.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/plans/:id/consultation-rules/:serviceId` | `admin-plan-rules.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/plans/:id/health-test-rules` | `admin-plan-rules.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/plans/:id/health-test-rules` | `admin-plan-rules.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/plans/:id/health-test-rules/:healthTestId` | `admin-plan-rules.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/plans/:id/perks` | `admin-plan-rules.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/plans/:id/perks` | `admin-plan-rules.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/plans/:id/perks/:perkKey` | `admin-plan-rules.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/plans/:id/preview` | `admin-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/plans/:id/translations/:locale` | `admin-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/plans/:id/translations/:locale` | `admin-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/plans/reorder` | `admin-plans.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/reports/export` | `admin-reports.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/security-alerts` | `admin-security-alerts.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/security-alerts/:id` | `admin-security-alerts.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/seo/ga4` | `admin-seo-data.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/seo/search-console` | `admin-seo-data.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/services` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/services` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/services/:id` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/services/:id` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/services/:id` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/services/:id/booking-pause` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/services/:id/booking-pause` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/services/:id/faqs` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/services/:id/faqs` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/services/:id/faqs/:faqId` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/services/:id/faqs/:faqId` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/services/:id/faqs/reorder` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/services/:id/peak-pricing` | `admin-service-pricing.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/services/:id/peak-pricing` | `admin-service-pricing.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/services/:id/purge` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/services/:serviceId/links` | `admin-service-links.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/services/:serviceId/links` | `admin-service-links.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/services/reorder` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/settings/reviews` | `admin-settings.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/settings/reviews` | `admin-settings.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/specialties` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/specialties` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/specialties/:id` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/specialties/:id` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/specialties/:id` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/specialties/:id/purge` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/specialties/reorder` | `admin-services.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/subscription-health` | `admin-subscription-health.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/subscription-perk-grants` | `admin-subscription-perk-grants.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/subscription-perk-grants/:id/approve` | `admin-subscription-perk-grants.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/subscriptions` | `admin-subscriptions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/subscriptions/:id/adjust-credits` | `admin-subscriptions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/subscriptions/:id/ledger` | `admin-subscriptions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/subscriptions/:id/refund` | `admin-subscriptions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/subscriptions/:id/regrant-period` | `admin-subscriptions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/subscriptions/:id/resync` | `admin-subscriptions.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/sukl/app-ping` | `admin-sukl.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/sukl/doctor-identities` | `admin-sukl.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/sukl/doctor-identities/:doctorUserId` | `admin-sukl.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PUT | `/api/admin/sukl/doctor-identities/:doctorUserId` | `admin-sukl.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/sukl/status` | `admin-sukl.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/sukl/test-connection` | `admin-sukl.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/sukl/wsdl` | `admin-sukl.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/support/doctors` | `doctor-support.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/support/threads` | `doctor-support.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/support/threads` | `doctor-support.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/support/threads/:threadId` | `doctor-support.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/support/threads/:threadId/messages` | `doctor-support.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/support/threads/:threadId/messages/:messageId/download` | `doctor-support.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/support/threads/:threadId/messages/upload` | `doctor-support.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/support/threads/:threadId/notifications/read` | `doctor-support.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/test-centers` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/test-centers` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/test-centers/:id` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/test-centers/:id` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/test-centers/:id` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/test-centers/:id/exams` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/test-centers/:id/exams` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/test-centers/:id/exams/:offeringId` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/test-centers/:id/exams/:offeringId` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/admin/test-centers/:id/purge` | `admin-test-centers.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/users` | `admin-users.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/admin/users/:id` | `admin-users.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/admin/users/:id` | `admin-users.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/users/:id/resend-email-correction` | `admin-users.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/admin/users/:id/reset-password` | `admin-users.route.ts` | Admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/appointments` | `appointments.route.ts` | Guest/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/assets` | `assets.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/2fa/confirm` | `auth-2fa.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/2fa/disable` | `auth-2fa.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/2fa/resend-otp` | `auth-2fa.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/2fa/setup` | `auth-2fa.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/auth/2fa/status` | `auth-2fa.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/2fa/verify-login` | `auth-2fa.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/change-password` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/forgot-password` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/login` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/logout` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/auth/me` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/auth/me` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/auth/me` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/me/cancel-deletion` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/auth/me/export` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/register` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/resend-verification` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/reset-password` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/auth/verify-email` | `auth.route.ts` | Auth/session; no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/blog` | `blog.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/blog/:slug` | `blog.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/cart` | `cart.route.ts` | Guest/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/cart` | `cart.route.ts` | Guest/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/cart/checkout` | `orders.route.ts` | Guest/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/cart/items` | `cart.route.ts` | Guest/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/cart/items/:itemId` | `cart.route.ts` | Guest/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/cart/items/:itemId` | `cart.route.ts` | Guest/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/contact` | `contact.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/corporate/billing-summary` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/corporate/card-verify/:cardNumber` | `corporate-invites.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/corporate/company` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/corporate/company` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/corporate/employees` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/corporate/employees` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/corporate/employees/:id` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/corporate/employees/:id` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/corporate/employees/:id/resend-invite` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/corporate/employees/bulk` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/corporate/invites/:token` | `corporate-invites.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/corporate/invites/:token/accept` | `corporate-invites.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/corporate/overview` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/corporate/requests` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/corporate/requests` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/corporate/requests/:id` | `corporate.route.ts` | Corporate role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/countries` | `countries.route.ts` | Public read or handler-specific | 498 ms | 584 ms | 9,219 B | Needs investigation |
| GET | `/api/countries/:code/legal` | `legal-public.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/countries/:countryCode/doctors` | `country-scoped.route.ts` | Public read or handler-specific | 1,077 ms | 1,702 ms | 514,430 B | Critical (Ireland sample) |
| GET | `/api/countries/:countryCode/doctors/:slug` | `country-scoped.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/countries/:countryCode/health-tests` | `country-scoped.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/countries/:countryCode/page-content/:pageKey` | `page-content.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/countries/:countryCode/pages/:pageKey` | `pages.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/countries/:countryCode/plans` | `country-scoped.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/countries/:countryCode/services` | `country-scoped.route.ts` | Public read or handler-specific | 868 ms | 919 ms | 276,806 B | Slow (Ireland sample) |
| GET | `/api/countries/:countryCode/specialties` | `country-scoped.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/cron/abandoned-carts` | `cron-abandoned-cart.route.ts` | Internal secret/job | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/cron/corporate/daily` | `cron-corporate.route.ts` | Internal secret/job | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/cron/subscriptions` | `cron-subscriptions.route.ts` | Internal secret/job | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/cron/subscriptions/daily` | `cron-subscriptions.route.ts` | Internal secret/job | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/cron/trustpilot-invites` | `cron-trustpilot-invites.route.ts` | Internal secret/job | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments` | `doctor.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments` | `doctor-manual-booking.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/appointments/:id` | `doctor-actions.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/brazil-consent` | `brazil-consent.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/chat` | `consultation-chat.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/appointments/:id/chat` | `consultation-chat.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/chat` | `consultation-chat.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/chat/download/:messageId` | `consultation-chat.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/chat/upload` | `consultation-chat.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/consultation` | `consultations.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/appointments/:id/consultation` | `consultations.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/consultation/sign` | `consultations.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/cross-border-rx` | `cross-border-rx.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/cross-border-rx/more-info` | `cross-border-rx.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/cross-border-rx/more-info` | `cross-border-rx.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/cross-border-rx/options` | `cross-border-rx.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/documents` | `appointment-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/documents` | `appointment-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/documents/context` | `doctor-generated-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/documents/generate` | `doctor-generated-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/documents/generated` | `doctor-generated-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/documents/send` | `doctor-generated-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/documents/send-to-patient` | `appointment-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/exams` | `exam-results.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/exams` | `exam-results.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/finalize` | `doctor-actions.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/follow-up` | `doctor-actions.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/form-submissions` | `forms.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/form-submissions` | `forms.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/internal-messages` | `internal-messages.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/internal-messages` | `internal-messages.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/invoice` | `doctor-invoices.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/medical-notes` | `doctor-medical-notes.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/medical-notes` | `doctor-medical-notes.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/memed/document` | `doctor-generated-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/memed/session` | `doctor-generated-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/notify-ready` | `doctor-actions.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/appointments/:id/prescriptions` | `prescriptions.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/appointments/:id/prescriptions` | `prescriptions.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/availability` | `doctor-self-availability.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/availability` | `doctor-self-availability.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/doctor/availability/:availabilityId` | `doctor-self-availability.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/availability/:availabilityId` | `doctor-self-availability.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/booking-options` | `doctor-manual-booking.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/doctor/booking-pause` | `doctor-self-availability.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/booking-pause` | `doctor-self-availability.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/compliance-status` | `doctor-confidentiality.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/confidentiality-agreement` | `doctor-confidentiality.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/confidentiality-agreement` | `doctor-confidentiality.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/confidentiality-agreement/pdf` | `doctor-confidentiality.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/confidentiality-agreement/signed` | `doctor-confidentiality.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/confidentiality-agreement/signed` | `doctor-confidentiality.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/confidentiality-agreement/signed/download` | `doctor-confidentiality.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/doctor/consultation-services/:lineId` | `consultation-services.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/consultations/:consultationId/services` | `consultation-services.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/consultations/:consultationId/services` | `consultation-services.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/consultations/:consultationId/share-link` | `share-links.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/country-consultations` | `doctor-country-consultations.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/cross-border-rx` | `cross-border-rx.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/cross-border-rx/:requestId/decision` | `cross-border-rx.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/doctor/documents/:documentId` | `appointment-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/documents/:documentId/download` | `appointment-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/doctor/documents/generated/:id` | `doctor-generated-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/documents/generated/:id/finalize` | `doctor-generated-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/documents/generated/:id/pdf` | `doctor-generated-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/exam-types` | `doctor-exam-catalogue.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/doctor/exams/:examId` | `exam-results.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/exams/:examId` | `exam-results.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/form-submissions/:submissionId` | `forms.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/form-templates` | `forms.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/form-templates` | `forms.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/doctor/form-templates/:templateId` | `forms.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/form-templates/:templateId` | `forms.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/invoices` | `doctor-actions.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/me` | `doctor.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/me/permissions` | `doctor-permissions.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/medical-access-requests` | `medical-access-requests.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/medical-documents/:id/visibility` | `medical-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/message-threads` | `consultation-chat.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/messages/unread` | `consultation-chat.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/notifications` | `notifications.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/notifications/:id/read` | `notifications.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/notifications/read-all` | `notifications.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/patients` | `doctor.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/patients/:email` | `doctor-actions.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/patients/:email/alert-log` | `doctor-patient-profile.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/patients/:email/consultation-history` | `doctor-consultation-history.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/patients/:email/documents` | `doctor-patient-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/patients/:email/identity-verification` | `doctor-patient-profile.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/patients/:email/identity-verification/request` | `doctor-patient-profile.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/patients/:email/identity-verification/review` | `doctor-patient-profile.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/patients/:email/profile` | `doctor-patient-profile.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/patients/:email/profile` | `doctor-patient-profile.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/patients/:patientEmail/medical-documents` | `medical-documents.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/payout-invoices` | `doctor-payout-invoices.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/payout-invoices` | `doctor-payout-invoices.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/payout-invoices/download` | `doctor-payout-invoices.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/doctor/prescriptions/:prescriptionId` | `prescriptions.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/profile` | `doctor.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/profile/change-requests` | `doctor.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/profile/change-requests` | `doctor.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/doctor/profile/change-requests/:requestId` | `doctor.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/profile/markets/:countryId` | `doctor.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/doctor/profile/photo` | `doctor-photo.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/profile/photo` | `doctor-photo.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/profile/photo/position` | `doctor-photo.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/reports` | `doctor-reports.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/reports/export` | `doctor-report-exports.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/services` | `doctor.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/services` | `doctor.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/services/approval-required` | `doctor.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/doctor/share-links/:id` | `share-links.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/support/messages` | `doctor-support.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/support/messages/:messageId/download` | `doctor-support.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/support/messages/upload` | `doctor-support.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/support/thread` | `doctor-support.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctor/support/unread` | `doctor-support.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/time-slots` | `doctor-self-availability.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/doctor/time-slots/:slotId` | `doctor-self-availability.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/doctor/time-slots/:slotId` | `doctor-self-availability.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/time-slots/bulk` | `doctor-self-availability.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/doctor/time-slots/bulk-block` | `doctor-self-availability.route.ts` | Doctor/admin role; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctors` | `doctors.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctors/by-language` | `doctors.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/doctors/count` | `doctors.route.ts` | Public read or handler-specific | 527 ms | 608 ms | 31 B | Needs investigation |
| GET | `/api/health-tests` | `health-tests.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/health-tests/:slug` | `health-tests.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/internal/run-post-payment-reminders` | `post-payment-reminders.route.ts` | Internal secret/job | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/internal/run-pre-payment-reminders` | `pre-payment-reminders.route.ts` | Internal secret/job | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/internal/run-reminders` | `reminders.route.ts` | Internal secret/job | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/internal/send-review-invite` | `review-invites.route.ts` | Internal secret/job | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/benefit-options` | `me-benefit-options.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/cart-preview` | `me-cart-preview.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/corporate` | `me-corporate.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/corporate/beneficiaries` | `me-corporate.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/me/corporate/beneficiaries/:id` | `me-corporate.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/corporate/beneficiaries/:id/resend-invite` | `me-corporate.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/corporate/card.png` | `me-corporate.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/me/corporate/profile` | `me-corporate.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/corporate/services/:id` | `me-corporate.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/corporate/services/:id/book` | `me-corporate.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/credits` | `me-credits.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/invoices` | `me-invoices.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/memberships` | `me-membership.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/memberships/:id` | `me-membership.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/memberships/:id/card.png` | `me-membership.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/memberships/:id/dependents` | `me-membership.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/memberships/claim` | `me-membership.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/memberships/claim/confirm` | `me-membership.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| DELETE | `/api/me/memberships/dependents/:id` | `me-membership.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/notifications` | `me-notifications.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| PATCH | `/api/me/notifications/:id/read` | `me-notifications.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/notifications/read-all` | `me-notifications.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/redemptions` | `me-redemptions.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/redemptions` | `me-redemptions.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/subscription` | `me-subscription.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/subscription` | `me-subscription.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/subscription/cancel` | `me-subscription.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/subscription/cancel-change` | `me-subscription.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/subscription/change` | `me-subscription.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/subscription/dev-activate` | `me-subscription.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/me/subscription/portal` | `me-subscription.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/subscription/refund` | `me-subscription.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/me/subscription/sync` | `me-subscription.route.ts` | Session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/media/*` | `media-public.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/medical-access-requests` | `medical-access-requests.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/medical-access-requests` | `medical-access-requests.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/medical-access-requests/:id/respond` | `medical-access-requests.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/newsletter` | `newsletter.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/orders/:id/pay-url` | `orders.route.ts` | Guest/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/orders/:id/receipt` | `orders.route.ts` | Guest/session; private no-store | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/partner/v1/availability` | `partner-api.route.ts` | Partner API client | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/partner/v1/availability` | `partner-api.route.ts` | Partner API client | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/partner/v1/bookings` | `partner-api.route.ts` | Partner API client | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/partner/v1/countries` | `partner-api.route.ts` | Partner API client | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/partner/v1/countries/:countryCode/catalog` | `partner-api.route.ts` | Partner API client | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/payments/checkout-session` | `payments.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/payments/sync-order` | `payments.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/payments/webhook` | `payments.route.ts` | Stripe signature | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/brazil-consent` | `brazil-consent.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/public/brazil-consent/submit` | `brazil-consent.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/certificates/:id` | `certificate-verify.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/consultation-count` | `consultation-count.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/countries/:code/landing-pages` | `public-seo-landing.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/coverage-catalog` | `public-coverage-catalog.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/cross-border-rx-consent` | `cross-border-rx.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/public/cross-border-rx-consent` | `cross-border-rx.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/public/cross-border-rx-consent/revert` | `cross-border-rx.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/cross-border-rx/fees` | `public-cross-border-fees.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/public/gp-assign` | `public-gp-booking.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/gp-languages` | `public-gp-booking.route.ts` | Public or signed capability; route-specific | 496 ms | 650 ms | 179 B | Needs investigation |
| GET | `/api/public/invoices/:invoiceId` | `public-invoices.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/invoices/:invoiceId/pdf` | `public-invoices.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/medical-access-request` | `medical-access-requests.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/public/medical-access-request` | `medical-access-requests.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/orders/pay/:token` | `orders.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/patient-upload` | `patient-upload.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/public/patient-upload` | `patient-upload.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/public/reviews-config` | `reviews-config.route.ts` | Public or signed capability; route-specific | 485 ms | 547 ms | 219 B | Needs investigation |
| GET | `/api/public/reviews/rate` | `review-invites.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| POST | `/api/public/reviews/rate` | `review-invites.route.ts` | Public or signed capability; route-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/services` | `services.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/services/:countryCode/:serviceSlug/aggregated-availability` | `country-scoped.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/services/:countryCode/:serviceSlug/doctors/:doctorSlug/availability` | `country-scoped.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/services/:slug` | `services.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/services/:slug/faqs` | `services.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/share-links/:token` | `share-links.route.ts` | Signed capability | NM | NM | NM | NM—runtime coverage required |
| GET | `/api/specialties` | `services.route.ts` | Public read or handler-specific | NM | NM | NM | NM—runtime coverage required |
| GET | `/health` | `health.route.ts` | Operational public | 551 ms | 877 ms | 43 B | Slow |
| GET | `/live` | `health.route.ts` | Operational public | NM | NM | NM | NM—runtime coverage required |
| GET | `/ready` | `health.route.ts` | Operational public | NM | NM | NM | NM—runtime coverage required |
