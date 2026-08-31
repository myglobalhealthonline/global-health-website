# Ireland technical SEO audit

> **Dated evidence, not current operational status.** Status and recommended-fix
> columns are the 2026-08-25 audit snapshot. The canonical global ledger at
> `docs/plans/seo-control-state.md` owns current status and actions.

**Audited:** 2026-08-25
**Inputs:** repository inspection, canonical SEO ledger, OpenSEO 100-page audit and focused production/competitor checks.

| Finding | Evidence | Affected surface | SEO impact | User impact | Severity | Recommended fix | Status | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| No critical crawl defect in current OpenSEO sample | Completed audit; 100/100 pages; zero critical issues | Sitewide sample | Positive | Positive | Pass | None | Verified | OpenSEO audit status/issues |
| Root reported thin | 92 words on global selector root | `/` | Low; intent is route selection | Low | Low | Do not expand solely for word count; verify rendered selector usefulness | No change | Repository and audit |
| Length heuristics | 93 long descriptions; 68 long titles | Multilingual sample | Potential snippet truncation, not automatic ranking issue | Low | Info | Review only pages with GSC CTR/intent evidence | Deferred | OpenSEO issues |
| English Ireland services healthy | 17/17 returned 200, indexable, sitemap-included | `/ireland/en/services/*` | Positive | Positive | Pass | None | Verified | OpenSEO pages |
| Canonical host centralised | `site-url.ts` | Public pages | Prevents host duplication | Positive | Pass | Preserve | Verified | Code inspection |
| Sitemap publication gating | `app/sitemap.ts` uses record indexability and real child dates | Public pages | Positive | Positive | Pass | Preserve | Verified | Code/tests |
| Robots private-route controls | `app/robots.ts` blocks admin/account/API with narrow public exceptions | Private/public surfaces | Positive | Positive | Pass | Preserve | Verified | Code/tests |
| Preview host control | `proxy.ts` emits noindex/noarchive on Railway hosts | Staging hosts | Positive | None | Pass | Preserve | Verified | Code inspection |
| Hreflang filtered by indexability | service/doctor/fallback-locale helpers | Six Ireland locales | Prevents false alternates | Positive | Pass | Preserve | Verified | Code/tests |
| Public lab URL differs from route folder | rewrites expose `/lab-tests`; code folder is `tests` | Ireland labs | Neutral when preserved | Positive URL clarity | Pass | Do not “fix” based on file-path crawls | Verified | `next.config.ts` |
| Historical GSC legacy attribution | `/ireland/sick-leave` and retired variants remain in 90-day rows | Sick-cert cluster | Can mislead audits | None | Monitor | Use live HTTP/Google-selected canonical before diagnosing duplicates | Existing fix; recrawl pending | GSC + ledger |
| Lab index-ramp | Multiple lab URLs now receive impressions | Lab hub/details | Opportunity, not defect | None | Gate | Re-measure ~2026-09-08 | Frozen | Ledger + GSC |
| Analytics reconciliation gap | GSC 7,283 IE impressions vs GA4 24 organic sessions; many joined rows are `gsc_only` | Measurement | Weakens conversion decisions | None | Medium | Audit GA4 tag coverage, consent rates and key events without PHI | Open | OpenSEO GSC/GA4 |
| Frontend baseline build dependency | Build compiled/typechecked but prerender failed when backend was unavailable | Build system | Verification fragility | None | Medium | Run with healthy backend or explicitly approved degraded mode | Pre-existing | Baseline build |
| Existing sick-cert redirect test mismatch | Test expects clean alias while current rule resolves to service path | Redirect suite | Test confidence gap | None | Medium | Reconcile test with canonical redirect policy in a separate code batch | Pre-existing | Frontend test |
| Existing lint failures | Two unused imports in backend | Backend | None directly | None | Low | Fix in owning workstream | Pre-existing | `pnpm lint` |
| Backend tests require local DB | Numerous failures at 127.0.0.1:5433 plus unrelated auth assertions | Backend suite | None directly | None | Medium | Start isolated test DB before interpreting suite | Pre-existing | Backend test |
| GP hub roster was not service-assignment scoped | GP page used the first six country doctors, while the specialist hub already required reciprocal active-service assignments | GP hub | Mixed clinician entities under GP-oriented content weakened semantic and trust alignment | Users could see clinicians who were not bookable for an active GP service | Medium | Reuse the reciprocal service-assignment selector and retain the six-card cap | Implemented in repository; not deployed | Selector unit tests, typecheck, lint, independent review |
| Specialist JSON-LD could differ from visible authored content | FAQ schema always used fallback hub FAQs; service schema used fallback overview even when authored hero copy was visible | Specialist hub | Hidden/stale schema and page mismatch | Search engines could receive answers different from those shown to users | Medium | Resolve visible authored/fallback content once and use it for schema and UI; fall back when authored FAQ is empty | Implemented in repository; not deployed | Helper tests including empty FAQ, typecheck, lint, independent review |

## Structured data review

The target already emits organisation/site, service/medical, breadcrumb, article and verified clinician structures from typed helpers. The audit found no reason to add broad new schema.

Future lab `Product`/`Offer` markup is allowed only when visible price, currency and availability come from maintained runtime data. Do not add ratings, hidden FAQs, placeholder reviewers or a physical clinic type for online-only care.

## Performance, mobile and accessibility

No fresh Lighthouse run was started because the canonical ledger already records strong performance and the OpenSEO audit did not include Lighthouse. The current batch made no frontend changes. Performance and accessibility should be retested when a user-facing component changes, not used as a reason for speculative rewrites.

## Implementation decision

The initial broad audit did not justify a rewrite. The focused GP/specialist follow-up proved and corrected two code defects: GP roster eligibility and specialist visible-content/schema alignment. The patch does not change CMS content, clinical claims, booking behavior, prices, credentials, routes or metadata. Deployment and post-deploy rendered verification remain outstanding.
