# Romania SEO planning brief

Prepared 2026-09-13. This is a dated scope and execution-design document, not a
second operational roadmap. Current status and next actions belong to
[`seo-control-state.md`](../../docs/plans/seo-control-state.md), section 55.

Later evidence on the same date: the [full baseline](01-baseline-audit.md) and
[completion matrix](page-by-page-completion-matrix.csv) supersede the initial
sample below. Native FAQ absence did not mean all visible FAQs were missing:
22 service variants contain embedded questions; 80 have true visible gaps.

## Confirmed scope

Review every existing public Romania page across ro, en, cs, de, es and pt,
including service FAQs and individual doctor FAQs. Prioritize active services
with available, assigned doctors. Cover hubs, profiles, services, blogs, tools,
pricing, FAQs and informational/legal pages; reviewing a page does not require
rewriting it. Booking and account routes receive indexability/CTA checks where
relevant, not commercial keyword targeting.

The owner requested natural writing using OpenSEO and deslop skills. Prepare
specific, source-supported answers without requiring another interview before
drafting. Never describe machine-generated text as human-authored or claim a
clinical approval that did not happen. Preserve medical facts and flag unresolved
claims individually rather than blocking unrelated drafting.

## Alignment with previous countries

| Existing precedent | Romania application |
| --- | --- |
| Ireland keyword master and URL ownership | One primary intent per existing URL; keyword variants support it rather than creating duplicate pages. |
| Portugal fact and clinical-review registers | Trace doctor languages, services, qualifications and operational claims to current evidence; retain exact approval provenance where applicable. |
| Czechia page-by-page completion matrix | Give every page and locale a disposition for metadata, H1, body, FAQs, links, CTA, canonical, hreflang, schema and indexability. |
| Guarded production updates | Preserve before/after content, source fingerprints, dry-run results and public readbacks; do not overwrite concurrent edits. |
| Global operational ledger | Keep decisions, publication state and measurement dates in the existing ledger, with detailed evidence here. |

Romania intentionally has broader locale coverage than Czechia's selected-language
batch. Page language, searcher location, doctor consultation language and clinical
market eligibility are separate fields. A German page does not prove German
consultations are available. A Romanian-speaking doctor does not automatically
establish eligibility to treat patients in another country.

## Fresh planning evidence and limits

OpenSEO project: GlobalHealthNew, `7804f362-5891-417e-9c3a-d9e8d4d7dc6b`.
Research explicitly used Romania location 2642 and language ro; the project
default remains Ireland. Account and project access were verified before research.
Project context's existing research log covered Ireland, not this Romania sample.

Search Console returned 701 query/page rows for `/romania/`, all searcher countries,
final data, **2026-08-12 through 2026-09-09**, with `hasMore=false`. The convenience
window returned these exact dates; use them rather than assuming a 28-day duration.
These are visible-query sums, not complete page totals: anonymized queries are absent.

| Page group | Query/page rows | Clicks | Impressions |
| --- | ---: | ---: | ---: |
| Tools | 307 | 31 | 2,824 |
| Blogs | 189 | 1 | 358 |
| Services | 9 | 0 | 12 |
| Other | 196 | 1 | 562 |

No doctor rows occurred in this extract; that does not establish zero total doctor
visibility. Small Romanian pediatric queries appeared on cs/es service URLs.
This is a locale-ownership check candidate, not proof of broken hreflang or a
reason to redirect pages. Full page totals and matched prior-period data remain
to be collected before ranking or growth conclusions.

Four live public service requests returned HTTP 200:

| Romanian service slug | FAQPage schema matches | HTML summary elements |
| --- | ---: | ---: |
| consultatie-pediatrie | 0 | 0 |
| consultatie-neurologie | 0 | 0 |
| a-doua-opinie-medicala | 0 | 0 |
| medic-online-romania | 0 | 0 |

The shared service template renders FAQSection and FAQ schema from `detail.faqs`
only when nonempty. These HTML checks support missing structured FAQ sections on
the sampled responses; they do not count every possible question in body copy
or establish the database cause. Reconcile source records, locale fallbacks and
rendered output before selecting an updater. The old August claim of nine FAQs
on medic-online-romania must not substitute for current verification.

The medic-online-romania title currently promises a same-day consultation.
Check it against real availability before retaining that promise.

| Keyword | Estimated monthly searches | Difficulty |
| --- | ---: | ---: |
| medic online | 390 | 31 |
| a doua opinie medicala | 90 | 0 |
| pediatru online | unavailable | 0 |
| neurolog online | unavailable | 40 |

Missing volume is not zero. Provider intent labels require SERP interpretation.
The four live Google samples returned ten result rows each, including SERP features;
they are not ten organic results each. Global Health did not appear in the returned
rows. Medic Chat, Regina Maria, MedLife and Ringdoc are candidate general-care
comparators. Getvig and Centrul de Pediatrie offer pediatric comparisons;
Neuroaxis and neurolog.doctor offer neurology comparisons. Second-opinion results
include Sanador, MedLife and publishers such as doc.ro. These are search-result
observations, not completed competitor-page audits or verified competitor claims.
Low difficulty alone does not overcome service mismatch or strong hospital results.

Saved source responses:
- [GSC query/page extract](raw/planning-gsc-query-page-2026-09-13.json)
- [Romania live search results](raw/planning-serps-2026-09-13.json)
- [Keyword metrics](raw/planning-keyword-metrics-2026-09-13.json)

Account balance moved from 11,565 to 11,537 during this focused sample: 28 credits
aggregate difference, not a per-call charge receipt. No saved keywords, trackers,
projects or scheduled checks were created.

## Execution sequence and acceptance criteria

### 1. Complete inventory and establish service reality

Reconcile current sitemap URLs, public links and read-only content records. Record
redirects and non-indexable routes separately. Count actual URLs per locale; do not
multiply the Romanian count by six or synthesize translated blog slugs.

For each service, verify active publication, active doctor assignment, eligibility,
consultation languages and current booking availability. Include primary and linked
Romania doctors. An active doctor or recurring schedule alone is not proof of an
available appointment. Distinguish temporarily full calendars from unstaffed services.
Record zero-supply pages for operations; do not promote them as bookable.

Acceptance: every discovered public URL has a row and every commercial priority has
an evidence-backed doctor/service/language relationship. All services and profiles
have FAQ source counts, locale/fallback status and rendered counts.

### 2. Research demand and competitors

Refresh page totals, query/page rows and matched prior-period GSC data, separating
all Romania URLs from the Romanian-language subset and Romania-resident searchers.
Paginate until complete. Keep tools, informational pages and commercial pages
separate. Inspect selected priority URLs only when stored Google state matters.

Expand keywords around verified service supply, then inspect actual competitor pages
for scope, doctor evidence, language support, appointment flow, pricing presentation,
FAQ topics and internal links. Use the current SERP URLs as starting candidates.
Separate commercial providers, directories, publishers and free advice services.

Research all six locales for the Romania market where provider support permits.
Use actual local-language demand, GSC evidence and Romania/expat intent rather than
borrowing Ireland or Czech domestic volumes. Record unsupported market-language
combinations and missing metrics. No automatic overseas expansion is implied.

Acceptance: a cleaned keyword master and URL map with source, date, market, locale,
intent, volume/KD when available, service fit, priority and exclusion reasons.
The full-country programme should use bounded research batches; obtain a spending
decision before a planned batch over 2,000 credits. Do not buy exhaustive competitor
portfolios or backlinks before the shortlist is justified.

### 3. Page briefs and exact FAQ drafts

Rank verified staffed services first, then their assigned doctor profiles and hubs,
then supporting pages. Pediatrics, neurology and GP care are provisional inventory
candidates, not a final ordered rollout based on the historical roster.

Service FAQs answer practical questions about suitability, remote-care limitations,
preparation, documents, consultation language, appointment process and follow-up
where supported. Doctor FAQs address that clinician's actual scope, languages and
booking arrangements. Avoid copying the whole service FAQ onto every doctor page.
Use the number of questions needed for the page; do not pad to a fixed SEO quota.

For each locale, write direct answers using normal patient vocabulary and accurate
Romanian market context. Remove stock introductions, repeated keyword phrases,
superlatives and unsupported instant/same-day or guaranteed-prescription promises.
Do not add credentials, services, testimonials or local offices from inference.
Source clinical/legal claims; narrow or hold claims that cannot be verified.
Run deslop on every changed text field, preserving meaning and useful detail.

Acceptance: exact before/after field drafts and FAQs, evidence references,
fact-preservation checks and explicit unchanged/held reasons. Review flags remain
truthful: skills can review prose but do not constitute a named clinician's approval.
Prepare drafts autonomously under the owner's instruction; resolve any actual
publication-system gate against the concrete batch rather than inventing approval.

### 4. Implement and verify the selected batch

This turn authorizes planning, not a production write. Reuse the existing content
models and guarded update patterns after the source/renderer trace. Preserve URLs,
doctor facts, prices, service assignments and booking logic unless a separately
verified issue requires an explicitly scoped change. Prefer strengthening existing
pages; new pages or redirects require demonstrated intent and service fit.

Before application, capture source fingerprints and a dry-run diff. After any
authorized write, verify exact public text, visible FAQs and matching schema,
locale isolation, canonical/hreflang, links, CTA and booking-language accuracy.
Run per-package checks only for affected code and focused data/content checks for
content updates. Preserve rollback data and avoid overwriting concurrent changes.

Acceptance: no matrix row is marked live until public readback succeeds. A page can
be reviewed and deliberately retained without being marked rewritten. FAQ schema
is consistency metadata, not a promise of Google rich results or higher rankings.

### 5. Measure by deployed batch

Register baseline and deployment dates in the global ledger. Compare matched
28-day windows once enough post-publication data exists; review 30/60/90-day trends
by locale and page group. Track non-brand commercial impressions, clicks, query
ownership and valid booking conversions where measurement is verified. Keep
calculator traffic separate. Preserve the existing global indexation-watch cadence;
planning does not close or restart old watch items.

## Artifact contract

Create these only when their evidence exists, using prior-country naming:

| Artifact | Purpose |
| --- | --- |
| 01-baseline-audit.md; target-page-inventory.csv | Current public/source/GSC baseline |
| 02-competitor-landscape.md; competitor-page-inventory.csv | Verified competitor comparisons |
| 03-keyword-master.csv; 04-content-gap.csv | Cleaned demand, scope and exclusions |
| 05-url-keyword-map.csv; 06-proposed-site-architecture.md | Existing intent owners and linking plan |
| 07-technical-audit.md | Focused verified technical exceptions |
| 08-backlink-opportunities.csv | Only after relevant prospects are researched |
| page-by-page-completion-matrix.csv | One row per URL/locale with field-level dispositions |
| doctor-profile-fact-register.csv; clinical-review-register.csv | Sources, facts and actual review provenance |
| content-briefs/; raw/ | Exact drafts, original exports and later write/readback receipts |

Reuse the Portugal/Czechia completion columns, adding locale, source model,
consultation languages, assigned active doctors, availability checked at,
FAQ count before/after, FAQ source/fallback, evidence URL and source fingerprint.
Use explicit unavailable/not applicable values. Do not create empty numbered
documents or duplicate the ledger's roadmap merely to imitate directory size.
