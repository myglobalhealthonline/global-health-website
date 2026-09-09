# Global Health performance audit — 9 September 2026

Implementation follow-up: [remediation and verification status](REMEDIATION.md). The measurements below describe the original deployment, not the local fixes.

The slowness is real and has more than one cause. The largest measured problem is intermittent waiting for booking availability: one desktop click took **15.6 seconds**, and a separate request for the same step waited **11.2 seconds for its first byte**. Brazil's homepage failed three times with HTTP 500 after **8.4–9.0 seconds**. Mobile rendering also has avoidable JavaScript and date-formatting costs.

This is an audit and proposed remediation order. No application code, production settings, database records, or deployment was changed. It does not replace the canonical SEO operational ledger.

## Scope and measurement limits

- Audited shared public rendering, root layouts, navigation, booking, localization, animations, assets, API access, selected authenticated layouts, backend scheduling, availability calculations, caching, database pooling, and deployment configuration.
- Inventoried 212 page source files. Live HTTP coverage includes all six market homepages, the gateway, Ireland's doctor list, blog index, service detail, pricing, booking, lab catalogue, GP landing page, and login. Shared templates were inspected; this was not a crawl of every localized URL.
- Used anonymous Chromium and public GET requests. No patient records, authenticated portal sessions, checkout submissions, slot reservations, payment operations, production database queries, or load test.
- Source/deployed asset reference: `7ce893ffdbb2693463bc1bca7759385e156e0eb1`. Measurements were taken on 8 September UTC / 9 September Asia/Karachi. Requests reached Railway's `sin1` edge; that does not establish the origin or database region.
- Mobile simulation: 390 × 844 viewport, 4× CPU slowdown, 150 ms configured network latency, 200,000 bytes/s download. Desktop and the consent-enabled comparison were unthrottled. These are small laboratory samples, not visitor percentiles or an official INP assessment.
- Google PageSpeed/CrUX collection was blocked by automatic approval review because it required the stored Google API key. Permission was requested and remains pending. No Google credential was sent. Current field CWV and ranking causality remain unverified.

## What production did

### HTTP baseline

These are first-byte measurements from the workstation, including network overhead. HTML sizes are decoded bytes, not compressed transfer sizes.

| Page | Status | First byte | Decoded HTML |
|---|---:|---:|---:|
| Gateway `/` | 200 | 286–656 ms | 57 KB |
| Ireland `/ireland/en` | 200 | 296–309 ms | 728 KB |
| Czechia `/czechia/cs` | 200 | 297–301 ms | 510 KB |
| Portugal `/portugal/pt` | 200 | 309–322 ms | 666 KB |
| Spain `/spain/es` | 200 | 298–300 ms | 612 KB |
| Romania `/romania/ro` | 200 | 301–302 ms | 481 KB |
| Brazil `/brazil/pt` | **500** | **8,426–8,948 ms** | 72 KB error document |
| Ireland doctor list | 200 | 289–292 ms | 500 KB |
| Ireland blog index | 200 | 268–293 ms | 228 KB |
| Ireland booking landing | 200 | 281–282 ms | 307 KB |
| Ireland GP service detail | 200 | 275 ms | 283 KB |
| Ireland pricing | 200 | 274 ms | 208 KB |
| Booking with GP selected | 200 | **11,198 ms** | 383 KB |

Browser navigation varied more: Ireland's first browser request had a 3.35-second first byte; later browser samples were around 0.6 seconds. The cause of that individual outlier was not established.

Additional curl checks: `/login` returned 200 in 558 ms total; `/ireland/en/tests` redirected to `/ireland/en/lab-tests`, ending in 200 after 975 ms total; `/ireland/en/prescriptions` redirected to `/ireland/en/gp-consultation-online`, ending in 200 after 983 ms. `/ireland/en/services` redirected to the homepage. The exploratory `/ireland/en/health-tests` probe was an incorrect guessed URL, so its 404 is **not** classified as a broken site link.

### Actual clicks and browser work

| Scenario | Home → booking | Select GP service → next step |
|---|---:|---:|
| Desktop, first pass | 957 ms | **15,636 ms** |
| Desktop, repeat | 809 ms | 927 ms |
| Simulated slow mobile, repeat | 2,391 ms | 3,533 ms |
| Unthrottled mobile, optional scripts enabled | 697 ms | 3,732 ms |

Service-step timings include a deliberate 400 ms settling wait, plus Playwright action/wait overhead; they are not pure network time. Direct HTTP independently confirms the slow server-side case. Home-to-book remained client navigation, with no document reload.

The initial mobile script selected the hidden desktop link and timed out. That was a test-selector error, corrected with a visible-link locator. Both records are retained; those timeouts are not product defects.

On slower mobile hardware, page-load long tasks reached **974 ms** on the repeat and **1,373 ms** on the first pass. The repeated click run recorded an individual event duration of 424 ms. This establishes blocking work in the lab, but does not establish field INP. No JavaScript page errors were captured on the four baseline browser routes. Several LCP observations were missing, so no aggregate LCP pass/fail is claimed; the successful slow-mobile repeats reported approximately 1.9–2.1 seconds for the hero image while later work still blocked interaction.

## Findings and fixes, in priority order

### P0 — Brazil's public homepage is currently failing

**Measured:** three HTTP 500 responses after 8.4–9.0 seconds. The error digest was `1545395240`; one Railway request ID was `PGzN_bl2QVqiSfItss7a6g`. The response still advertised `public, s-maxage=60, stale-while-revalidate=300` despite being an error.

**Source path:** `frontend/app/[country]/[lang]/page.tsx:223` waits for public content, country doctors, services, doctor count, trust data, and GP languages. `frontend/lib/content/public-content-source.ts:17` sets a 4-second runtime timeout; `frontend/lib/api/client.ts` permits one transient public-read retry. Collection failures can throw rather than publish incorrect empty content.

**Interpretation:** the duration is consistent with two timed-out reads and retry delay, but the failing upstream call is not established without logs. Do not treat this as proven database starvation.

**Action:** correlate the digest/request ID with frontend and backend logs; identify the slow or failing Brazil dependency; repair that dependency. Preserve the distinction between temporary failure and real 404. Verify error responses cannot enter a future shared cache. Gate deployment on all six homepages returning complete 200 responses.

### P1 — Booking blocks the next screen on uncached availability

**Measured:** 15.6-second click and 11.2-second direct first-byte wait; repeat requests sometimes completed quickly.

**Source:** `frontend/app/[country]/[lang]/book/page.tsx:180` first resolves country settings, then loads general services, specialist services, and doctors at line 187. The selected-service branch subsequently awaits aggregated availability at line 735. `frontend/lib/content/get-service-availability.ts:55` performs a `no-store` fetch with no explicit deadline; the GP availability fetcher has the same missing-deadline pattern.

**Action:** instrument each stage, parallelize genuinely independent work, and avoid fetching full unrelated catalogues on every selected-service step. Load the next screen's shell immediately and put the live slot read behind its own Suspense/loading boundary. Add a bounded timeout with an explicit retryable error state; do not disguise an upstream failure as “no appointments.” Keep real-time availability validation and transactional claim checks.

### P1 — Public booking clicks provide no immediate pending feedback

**Confirmed in source:** every `loading.tsx` found is inside the portal tree; there are none in the public country or global trees. `frontend/components/booking/BookNowButton.tsx:91` calls `router.push(href)` without a pending state or duplicate-click guard. This differs from `SameDayBooking`, which already uses a transition and spinner.

**Action:** reuse that transition approach for shared booking buttons, show an accessible pending state, and prevent duplicate clicks. Add appropriately placed public loading boundaries, particularly booking and consultation steps. For search-parameter changes within the same route, verify the actual boundary resets; a `loading.tsx` file alone is not a guarantee. Preserve the deliberate SEO treatment of parameterized wizard buttons.

Expected effect: immediate acknowledgement and visible progress. It will not remove the underlying 11-second availability wait. [Next.js navigation guidance](https://nextjs.org/docs/app/getting-started/linking-and-navigating) supports streaming/loading boundaries for server-dependent navigation.

### P1 — Background jobs compete with requests for database connections

**Source-evidenced risk, not a measured production incident:** `backend/src/lib/internal-scheduler.ts:106` checks out a connection from the shared request pool, holds it throughout `await fn()` at line 140, and releases afterward. Job bodies acquire additional connections through Prisma. Thirteen jobs are launched at startup around lines 548–571, while `backend/src/db/prisma.ts:30` defaults to ten connections with a five-second acquisition timeout. Some job bodies include slow serial external delivery.

**Action:** measure pool `waitingCount`, acquisition time, job duration, and API latency together. Bound job concurrency and isolate advisory-lock connections and job workload from request-serving capacity. Preserve distributed locking. Do not simply increase workers or pool size without a Postgres connection budget.

### P1 — Marketing card APIs depend on live scheduling calculations

**Confirmed mechanism:** country doctor lists await overall and per-service bookability (`backend/src/modules/doctors/doctors.service.ts:53`, `:764`). Service lists do likewise (`backend/src/modules/services/services.service.ts:637`). Bookability uses a default 90-day horizon (`backend/src/modules/bookability/bookability.service.ts:28`) and can generate missing slot inventory before returning (`backend/src/modules/doctor-availability/doctor-availability.service.ts:1150`). Thus even rendering a marketing card may trigger scheduling work on a cold path.

**Action:** separate stable doctor/service content from live status; use safe precomputed summaries or a separate status request, with final booking validation unchanged. Move routine inventory materialization outside public reads. Review existing reverts `e3c3ce0f` and `40788181` before designing another large rewrite.

Existing safeguards matter: the code already has short-lived caches, in-flight slot-inventory deduplication, and expired-hold-sweep deduplication. This is not a recommendation to add a duplicate cache or to assume a complete DB scan for every service.

### P1 — Homepage slot processing wastes hundreds of milliseconds on mobile

**Measured/source combination:** `frontend/components/sections/SameDayBooking.tsx:169` fetches seven days of slots, but line 223 onward retains only today and tomorrow. The response was 91,476 decoded bytes and had no `Content-Encoding`, unlike the compressed page documents. The benchmark response contained 663 slots.

Every slot calls `formatAppDate`; `frontend/lib/format-datetime.ts:60` constructs a new `Intl.DateTimeFormat` each time. An isolated 4×-CPU Chromium benchmark on those same public dates measured **409–581 ms** constructing a formatter per slot, versus **4.4–7.4 ms** reusing one. All three runs produced identical strings. This is a loop benchmark, not a claim of a 60× page-speed improvement or exact attribution of every long task.

**Action:** request only the clinic-local days displayed, reuse formatters by locale/timezone/options with bounded caching, and return compact slot data. Verify timezone and DST boundaries. Investigate compression of JSON/RSC responses at the delivery layer while retaining `no-store` for live availability. Cancel superseded language requests or ignore stale responses to avoid redundant work and races.

### P2 — The cookie banner ships every language's common dictionary

**Confirmed in code and deployed bundle:** `frontend/components/compliance/CookieBanner.tsx:5` imports `getCommonLocale`; `frontend/lib/i18n/get-common-locale.ts:3` eagerly imports all six common dictionaries. Source JSON totals about 313 KB. A shared production chunk was 274,269 decoded bytes / 86,477 transferred bytes and contained Czech, English, German, and Romanian cookie text even on Ireland's English page.

**Action:** pass the active locale's small cookie/a11y messages from the server or use a narrowly scoped cookie dictionary. Preserve cross-locale consent text and locale switching. Inspect the production bundle afterward; not all bytes in the measured chunk are necessarily dictionaries.

### P2 — Large HTML, client trees, and CSS amplify mobile work

**Measured:** Ireland's initial document was 728 KB decoded but about 111 KB compressed. The observation window loaded 17 scripts totaling roughly **1.08 MB decoded / 335 KB transferred**, before accepting optional trackers. The DOM had about 3,163 elements. Shared CSS files measured about 263 KB and 58 KB decoded.

**Source:** `frontend/components/sections/ServiceCatalog.tsx:271` renders every page of the catalogue and hides inactive groups, preserving crawler-visible links. `LazyHydrate` defers client mounting but still sends the full SSR content and child payload; it is not a network code-splitting solution. The public CSS is shared across routes, and Tailwind output contributes alongside hand-authored rules.

**Action:** use real server-rendered category/detail pagination or a compact crawlable service index while rendering fewer full cards; retain content discovery and accessibility. Split expensive client behavior from static markup, use dynamic imports where they actually reduce initial downloads, and narrow CSS at the component/route level within the repository's public/portal split. Use a production bundle analyzer before setting byte-reduction claims. Images already use Next optimization and the hero already has high priority; blindly compressing every image is not the primary remedy.

### P2 — Entry animation intentionally delays usable content

**Source:** `frontend/components/sections/HomeHero.tsx:230` onward fades copy, CTAs, and panels in with delays up to 430 ms. `frontend/components/motion/HeroReveal.tsx` waits until client layout effects and two animation frames; `frontend/app/globals.css:4531` hides pending content and uses a 700 ms transition.

**Action:** show critical hero copy and booking actions immediately. Reserve short movement/fades for decoration or content below the fold. The headline already uses `fade={false}` and reduced-motion fallbacks exist; preserve those protections. Do not classify the entire LCP delay as animation.

### P2 — Optional third-party scripts add work after consent

**Measured:** accepted-consent mobile loaded 51 resources versus 35 in the unthrottled anonymous mobile baseline. Reported resource transfer rose from about 552 KB to 748 KB; cross-origin entries without timing permission appear as zero, so totals undercount actual traffic. Facebook's script/config alone reported about 692 KB decoded. GA4, Clarity, Meta, and ElevenLabs were observed.

**Source:** `frontend/components/layout/SiteChrome.tsx:155` mounts the voice widget on all public routes; `frontend/components/integrations/ElevenLabsConvai.tsx:29` loads it after third-party consent using `lazyOnload`, without requiring the visitor to open it.

**Action:** load the voice widget on explicit launcher interaction; assess whether all trackers are needed on booking steps; retain consent gates and exclude personal booking data. Measure with both consent choices. The observed GA4 tag is still `G-4PPGECG12X`; the ledger already flags its property mismatch. That measurement issue is separate from page speed, and the intended property was not re-queried here.

### P2 — Availability invalidation and overlap fallback can make cold spikes worse

**Source-evidenced:** `backend/src/modules/doctor-availability/availability-cache-bus.ts:27` invalidates all registered availability caches after inventory writes; `backend/src/modules/bookability/bookability.service.ts:36` clears its in-flight map. A single overlap violation can switch batch slot creation into serial single-row inserts (`backend/src/modules/doctor-availability/doctor-availability.service.ts:1009`).

**Action:** scope invalidation by affected doctor/service/country, handle in-flight generations explicitly, and remove overlapping candidates before insertion or use bounded batches preserving exclusion constraints. Measure invalidation frequency and query counts before assigning a production latency contribution.

### P2 — Admin shell has avoidable sequential requests

**Source only; authenticated UX not measured:** `frontend/app/(portal)/(admin)/admin/layout.tsx:143`, `:183`, `:204`, and `:228` await countries, notifications, pending service approvals, and pending profile approvals sequentially. Approval requests depend on the selected country; notifications do not depend on the approval results. Account and doctor layouts already parallelize many reads.

**Action:** parallelize independent badge/feed reads after resolving country scope, isolate nonessential shell content behind streaming boundaries, and reuse existing auth/request deduplication. Layouts persist during ordinary client navigation, so this affects initial entry/refresh and invalidation, not necessarily every admin click. This cannot directly explain public rankings.

## Delivery and caching observations

Localized marketing responses advertise 60-second shared caching with stale-while-revalidate. The sampled responses had no `Age` or cache-hit header, so these headers alone do not prove edge hits. Anonymous responses also emitted `Set-Cookie`, including deletion of an absent auth-hint cookie. That can prevent shared caching depending on the delivery layer.

Before introducing a CDN, verify actual cache behavior for HTML, RSC variants, immutable assets, cookies, signed-in sessions, errors, and query strings. Do not cache private account or booking availability responses publicly. Country/global/portal root-layout transitions and language/country switchers can intentionally perform full document loads; optimize the new document without breaking locale or authentication boundaries. Origin capacity, DB region, Railway CPU/RAM, replica topology, and cold-start behavior require deployment telemetry; repository comments are not proof of current settings.

## Recommended sequence and acceptance criteria

1. **Restore reliable responses:** diagnose Brazil's error; trace booking's slow upstream span and scheduler/pool contention. Acceptance: all six homepages consistently return complete 200 responses, including cold-cache checks; no known temporary errors are misreported as 404 or empty appointments.
2. **Make clicks respond immediately:** shared booking pending state and a streaming slot step; enforce explicit request deadlines with retryable failure UI. Acceptance: visible feedback within 100 ms, correct back navigation, no duplicate submit/navigation effects.
3. **Remove verified mobile waste:** date formatter reuse, two-day slot query, small cookie dictionary, immediate primary CTAs. Acceptance: equivalent localized/timezone output and a new identical-condition browser baseline with the long tasks reduced; investigate remaining tasks over 200 ms.
4. **Separate marketing from scheduling work:** precomputed or separately delivered bookability, scoped invalidation, bounded background work. Acceptance: cold and warm card/availability endpoints measured separately; target booking-step p95 below two seconds as an initial engineering objective, then refine from regional data.
5. **Reduce delivery weight:** smaller card trees, route-specific client loading, widget-on-demand, verified caching/compression. Acceptance: compare production transfer, parsed JS, hydration, and click timings with consent on/off and the same device/network settings.
6. **Measure actual visitors:** collect privacy-conscious Web Vitals, route timing, API span timing, and pool metrics. Use public route templates, never patient identifiers or booking query strings. Recheck mobile field data after the rolling reporting window catches up.

For Google CWV, aim for field p75 LCP ≤2.5 seconds, INP ≤200 ms, and CLS ≤0.1. These targets need real-user verification. Google uses Core Web Vitals in ranking systems, but speed alone does not establish why rankings changed or guarantee higher positions. See [Google's page-experience guidance](https://developers.google.com/search/docs/appearance/page-experience).

## Evidence and reproducibility

- `baseline.json` and `probe.cjs`: two HTTP samples per baseline route, four browser routes, resource timings, DOM inventory, screenshots.
- `focused.json` and `focused.cjs`: repeated Brazil failure, selected-service first-byte measurement, public bundle locale markers, response compression headers.
- `interactions-first-pass.json`, `interactions.json`, and `interactions.cjs`: initial intermittent slow click, corrected mobile locator, repeat timings, consent-enabled network observations. Do not confuse the first-pass selector timeout with a site error.
- `format-benchmark.json` and `format-benchmark.cjs`: isolated formatter comparison, identical output in three runs.
- `google-probe.cjs`: prepared but not executed; stored-credential access awaits explicit approval. No PageSpeed/CrUX result is claimed.

Verification: browser runs completed with no captured page errors on tested successful routes; raw evidence records the Brazil 500s and timing variability. Changes are confined to this audit directory. Application build/typecheck/tests were not run because application code was not changed; authenticated flows and production tracing remain the stated limits.
