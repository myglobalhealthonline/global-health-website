# Performance remediation — 9 September 2026

Implementation batch for `Dev-hassaan`. No production deployment or production database writes were performed by this task. The original README remains the historical baseline.

## Implemented

| Audit finding | Change |
| --- | --- |
| Brazil failure / diagnostics | Added fixed-label slow/error timing spans for each homepage dependency. Removed unconditional shared document-cache headers so a render error cannot inherit them. Preserved temporary errors versus real 404s. |
| Blocking booking availability | Keyed Suspense boundary for the selected-service step; eight-second live-read deadlines; explicit retryable errors, including malformed upstream payloads. One service catalogue request replaces two. |
| Missing click feedback | Transition spinner and disabled state on parameterized booking buttons; pending feedback on clean booking links; localized loading/error boundaries for booking and consultation routes. Retry refreshes the server response. |
| Scheduler contention | Separate capped advisory-lock pool; queue limits jobs to two, coalesces repeated ticks, and cancels pending work on stop. Distributed locks remain. API route-template and pool counters plus job-duration telemetry were added. |
| Marketing invokes scheduling | Opt-in marketing mode for public doctor/service collections and GP language configuration. Homepages use this mode; UNKNOWN means availability has not been checked, not that appointments are absent. The same-day panel reads live slots separately. Other consumers retain live mode by default. |
| Mobile slot work | Bounded formatter cache; clinic-calendar two-day horizon; stale/unmounted request cancellation and retryable deadlines. Timezone/DST output checks added. |
| Common dictionaries | Cookie banner receives active-language messages from its server parent. Review-message imports are narrowed separately so that client dependency does not retain the full common dictionaries. |
| Large card trees | Only the selected service-card page renders. A compact, native details/list index preserves all service detail links in initial server HTML. Regression fixture: 17 service links with five image cards. |
| Hero animation | Critical headline, copy and primary actions render immediately. Decorative effects remain. |
| Optional voice scripts | Voice embed loads only after a consented visitor clicks its launcher. Existing tracker consent gates remain. |
| Cold invalidation / overlapping slots | In-flight readers detect invalidated generations; overlapping inventory retries use batches of 32 before falling back only within conflicting batches. Exclusion constraints remain authoritative. |
| Sequential admin reads | Notifications begin while countries resolve; independent approval feeds run together after country scope is known. |
| JSON delivery | Same-origin availability responses support gzip negotiation, including q=0, while preserving no-store. |
| Visitor measurement | Consent-gated Web Vitals use the existing GA integration, with public route templates and no metric attribution objects, patient identifiers, or booking queries. |

## Verification and limits

- Final full frontend suite: **132 files passed; 1,593 tests passed; five skipped**. This includes review SSR and exact canonical copy in all six languages.
- Queue, scheduler-lock and marketing-contract checks: **nine passed**. Queue behavior covers two-permit enforcement, active/queued coalescing, rejection recovery, finite drain and cancellation of queued work.
- Final frontend and backend package typechecks passed; locale keys passed for six locales across 16 namespaces. No production DB tests were run.
- Public smoke gate: **12/12 complete HTTP 200 documents** (two sequential passes over all six markets) on the existing deployment. Brazil also returned 200 on earlier repeat GETs. These observations do not prove the intermittent fault is fixed or constitute cold-cache/load testing.
- Reusable read-only gate: `node scripts/check-public-performance.mjs`. `PERFORMANCE_ORIGIN` can point at a staging deployment. It checks status, complete HTML and streamed error markers; it does not prove every CMS record is present.
- Webpack production analyzer failed from Node heap exhaustion at both approximately 2 GB and 4 GB. See `remediation-build.log`. No production build, byte reduction, browser interaction target, or field CWV improvement is claimed.
- Semgrep was not available locally. Existing CI security gates and deployment checks still apply.

## Still requires production/CI work

1. Authenticate Railway log access and correlate Brazil digest `1545395240` / request ID `PGzN_bl2QVqiSfItss7a6g`. The current deployment recovered without these local edits; the exact original upstream failure remains unproven.
2. Build on a runner with sufficient memory, inspect its bundle report, and validate responsive browser navigation/back/retry with both consent choices. CSS route splitting and further client-tree reductions remain measurement-led follow-up work; no broad CSS move was made across the public/portal boundary.
3. Deploy backend marketing-mode support before or together with the frontend. Run the six-market smoke gate afterward, plus genuine cold-cache checks and booking latency measurements.
4. Budget total Postgres connections across workers/replicas: request pool plus `SCHEDULER_LOCK_POOL_MAX` (default two) per worker. Job Prisma queries still use the shared workload pool; the bounded queue limits demand but is not full workload isolation. Correlate waiting counters, job durations and API latency before changing capacity.
5. Global cache invalidation remains conservative. Doctor/service/country-scoped invalidation and moving all routine inventory generation to background jobs require a separately validated dependency map. Live booking reads still materialize missing inventory; marketing homepage reads no longer do so.
6. Verify delivery-layer cache behavior for RSC variants, cookies, errors and authenticated pages. Unconditional document caching was removed; content Data Cache and asset caching remain. Do not reintroduce public cache headers without final-status-aware handling.
7. Correct the already-recorded GA build-variable/property mismatch and collect the rolling field data. No Google credential was read or used here. Tracker removal decisions, origin/DB region and platform sizing remain operational work.

These remaining items prevent calling the entire audit closed.
