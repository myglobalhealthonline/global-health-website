# SEO master audit prompt (owner draft, reviewed 2026-09-15)

Owner-authored audit prompt, reviewed against the repository and against live
connection checks run on 2026-09-15. Paste everything below the horizontal rule
into a fresh Claude Code session opened in this repository with the session model
set to **Fable 5.1**. The starter workbook is
`seo/Global_Health_SEO_Tracker_Starter.xlsx`.

Before pasting, install the Python packages the workbook build needs:

```bash
python -m pip install openpyxl pandas requests lxml
```

---

GLOBAL HEALTH: FULL REPOSITORY, WEBSITE AND INTERNATIONAL SEO AUDIT

Act as a senior technical SEO auditor, multilingual content strategist,
Next.js engineer and analytics specialist.

Audit my existing Global Health repository and production website using
actual evidence, then deliver a populated Excel tracking system that
supports ongoing improvements.

This is an AUDIT, MEASUREMENT AND PLANNING phase.

Do not publish content, change production settings, rewrite the application,
modify the database, create backlinks, submit indexing requests or push
without separate authorization. Committing the audit outputs by explicit
path on the current branch is pre-authorized (see §15).

Do not stop at a generic checklist when the required data is accessible.


0. ORCHESTRATION, MODEL ROUTING AND TOKEN DISCIPLINE

You are running on Fable 5.1 and you are the orchestrator. Keep Fable for
reading the source-of-truth files, decisions, reconciliation between
sources, conflict resolution, QA and the final synthesis.

Push execution to subagents through the Agent tool with an explicit
`model`:

- `sonnet` for mechanical work: inventory building, HTTP probing, HTML
  parsing, data pulls, scanners, CSV/XLSX construction, refresh scripts.
- `opus` for judgment work: content review and copy proposals, keyword
  ownership and clustering, competitor and backlink analysis, programmatic
  evaluation, migration matching, final QA.

Every subagent writes its full output to disk under
`seo/tracking/raw/2026-09-15/<agent>/` and returns at most 30 lines: files
produced, row counts, blockers. It never pastes raw data into your context.
If it does, discard the reply and ask again.

Tasks that call OpenSEO tools must go to `general-purpose` subagents (or
run in the main session); the `claude-seo:*` specialist agents cannot call
MCP tools. Use `caveman:cavecrew-investigator` when a task is only "find
where X lives in the code".

Suggested plan (adjust if evidence demands, but keep the dependencies):

| Agent | Model | Job | Feeds sheets |
| --- | --- | --- | --- |
| A1 inventory | sonnet | URL and entity inventory from routes, sitemap, CMS, internal links, GSC, GA4, backlinks, legacy Wix URLs | 04, 02 |
| A2 live probe | sonnet | HTTP, redirect chains, canonical, robots, hreflang edges, metadata, headings, JSON-LD, word count, internal links, response time for every inventory URL, parsed with an HTML parser | 05, 07, 08 |
| A3 GSC | sonnet | Datasets A, B, C from §9, URL Inspection on the priority set | 26, 09, 10, 08 |
| A4 GA4 | sonnet | Landing-page, key-event and measurement-health reports for valid windows | 11, 03 |
| A5 locale data QA | sonnet | Per-combination isolation tests from §6 against rendered pages and public APIs | 06 |
| A6 content review | opus | Page usefulness, naturalness, localisation, factual safety; copy proposals | 16 |
| A7 market intelligence | opus | Keywords, competitors, backlinks per market with market location codes | 13, 14, 15 |
| A8 migration | opus | Wix URL recovery and old-to-new entity matching | 18 |
| A9 programmatic | opus | Template-family evaluation and pilot proposal | 17 |
| A10 workbook | sonnet | Populate the starter workbook per §13, recalculate through Excel | all |
| A11 QA | opus | Row-count and key checks, formula errors, 20 random live spot-checks, coverage statement inputs | 19, 22 |
| A12 country coupling | opus, with a sonnet locator first | The one-country code audit in §6A: locate every country-keyed branch and module, classify it, propose the generic mechanism | 27, 19 |

Run A1 first. Run A2, A3, A4, A5, A7, A8 and A12 in parallel once A1 is
on disk. Run A6 and A9 after A2, A3 and A5. Run A10 last, then A11. Batch
independent tool calls in one message.

Report per phase in five lines or fewer, then continue. Do not narrate.


1. BUSINESS CONTEXT AND KNOWN STARTING POINTS

Repository:
myglobalhealthonline/global-health-website
(verified: `origin` remote on this clone, 2026-09-15).

Website:
https://myglobalhealth.online and its www variant.

Verify the actual canonical host and redirects rather than assuming either
is correct. On 2026-09-15 `https://www.myglobalhealth.online/sitemap.xml`
returned HTTP 200, 3.1 MB, 2,265 `<loc>` entries, and `/robots.txt`
returned 200. Treat those as a starting observation, not the audit.

The six markets and inspected seed configurations are:

Ireland:
en, pt, es, cs, ro, de; default en.

Czechia:
cs, en, pt, es, ro, de; default cs.

Portugal:
pt, en, es, cs, ro, de; default pt.

Spain:
es, en, pt, cs, ro, de; default es.

Romania:
ro, en, pt, es, cs, de; default ro.

Brazil:
pt, en, es; default pt.

These are 33 configured country/language combinations, NOT proof that every
possible page or translation is published.

Reconcile them with current runtime configuration, public CMS data and
publication rules. Do not enable additional locales or manufacture missing
pages.

Primary routes documented in the repository:

/ireland/en
/czechia/cs
/portugal/pt
/spain/es
/romania/ro
/brazil/pt

Discover all secondary locales and page families.

The current site launched on 21 July following Wix. Use 21 July 2026 as
the user-reported working date and verify the deployment record.

SEO implementation began in early August 2026. Establish exact changes
from evidence rather than inventing an August 1 start.

My goals are better qualified organic visibility, trustworthy and natural
content, correct country-specific data, and validated business outcomes.

Do not equate more pages, impressions or an arbitrary SEO score with success.


2. RECOVER EXISTING WORK BEFORE AUDITING

Read:

AGENTS.md
Relevant sections of CLAUDE.md
seo/README.md
docs/plans/seo-handover-codex.md
docs/plans/seo-control-state.md

The ledger is about 4,000 lines. Grep its section headings, read §0
(operating rules), the §27 heading block and §§48–50 in full, and open
other sections only when a task needs them. The next free ledger section
number is §51.

Follow the workspace links to relevant seo/<country>/ packages, original
audits, dated exports, completion matrices, keyword ownership maps, briefs,
publication receipts and performance reports. Reuse
`03-keyword-master.csv`, `05-url-keyword-map.csv`,
`08-backlink-opportunities.csv`, `page-by-page-completion-matrix.csv` and
`clinical-review-register.csv` where they exist; do not re-buy research
the country package already holds unless it is older than 30 days.

Use docs/audits/seo/google-access-review-2026-09-09.md as a historical
measurement checkpoint.

The canonical SEO ledger remains the operational source of truth.
Historical reports support evidence but do not silently reopen completed
fixes. Items in the ledger's CLOSED list and the "explicitly not doing"
list of docs/plans/seo-indexation-plan-2026-07-28.md §5 stay closed unless
you bring new evidence and say so. Preserve existing issue identifiers.

The workbook is an analytical view and proposed-action queue, not a
competing status ledger.

Pin the audited commit, identify the deployed revision when possible,
and distinguish code-complete, deployed, observed and verified.

In this repository the middleware convention is frontend/proxy.ts.
Check installed framework versions rather than assuming older conventions
(frontend/package.json declared Next 16.2.11 and React 19.2.8 on
2026-09-15; confirm).

Inspect relevant implementation files, including:

frontend/data/countries.ts
frontend/lib/seo/hreflang.ts
frontend/lib/seo/doctor-hreflang.ts
frontend/lib/content/publication-validation.ts
frontend/lib/content/publication-guard.ts
frontend/app/sitemap.ts
frontend/next.config.ts
frontend/lib/seo/gone-content.ts
frontend/tests/unit/seo-live-urls.test.ts
scripts/seo-ledger-sweep.py

Inspect actual dependencies and source paths. Do not invent missing files
or treat old documentation as current production behavior.

This clone is shared with other sessions. Run `git status` before any
staging, stage by explicit path only, never `git add -A` or `git add .`.


3. ESTABLISH ACTUAL ACCESS AND DATA INTEGRITY

Discover the tools available in this runtime.

Test the existing OpenSEO connection, GSC, GA4, public content APIs and
applicable performance tools with small read-only calls.

Known documented handles:

GSC: sc-domain:myglobalhealth.online
GA4 property: 547083375
Expected GA4 stream: G-SP48D9LJJ5

Confirm these against current production.

A browser login, installed plugin or old "connected" note does not
establish working API access.

State of access as checked on 2026-09-15 in this runtime. Re-verify every
row in step 0 of your run and update 03_Data_Access from your own result,
not from this list:

- OpenSEO claude.ai connector: connected. Account
  globalhealth@myglobalhealth.online, project "GlobalHealthNew", id
  7804f362-5891-417e-9c3a-d9e8d4d7dc6b, default market Ireland/English
  (locationCode 2372, languageCode en), balance about 10,700 credits.
  Tools were exposed as `mcp__5d8b8083-4ca6-4eb7-901c-dc53cac45319__<tool>`.
  A second, user-level `openseo` MCP entry reports `needs_auth`; it is a
  duplicate of the same server. Ignore it and do not ask the owner to
  authorize it.
- GSC through OpenSEO (`get_search_console_performance`, `inspect_urls`):
  working, free of credits. 1,000 rows per call with `startRow`
  pagination; 10 URLs per inspection call. Latest row on 2026-09-15 was
  2026-09-14 and partial. The `country` dimension returns lowercase ISO
  alpha-3 codes (irl, cze, prt, esp, rou, bra, deu, gbr, usa). Dates are
  Pacific Time.
- GA4 through OpenSEO: working, free of credits. Property timezone
  Europe/Dublin, currency EUR. One web stream, G-SP48D9LJJ5, created
  2026-07-25, so GA4 history cannot start before that day. Registered key
  events: purchase (2026-07-25), begin_booking (2026-08-24),
  booking_confirmed (2026-09-09). begin_checkout fires in code but is not
  registered. Event-scoped custom dimensions: market (booking market, not
  patient location) and service_category. Organic sessions 2026-09-09 to
  09-14: 259; 2026-09-03 to 09-08 returned no data. Available GA4 reports
  are fixed: organic overview, organic landing pages, page performance,
  traffic acquisition, audience breakdown, key events, ecommerce, site
  search, measurement health. There is no raw GA4 Data API access in this
  runtime. Where 11_GA4_Landing_Daily asks for a dimension those reports
  cannot return at daily grain, leave it blank with a data_quality note
  and record the limit in 03_Data_Access. Do not reconstruct it.
- Production GA4 tag: the live JavaScript bundle carries G-SP48D9LJJ5; the
  old G-4PPGECG12X is absent.
- OpenSEO paid research (DataForSEO-backed): working. A backlinks overview
  cost about 50 credits and reported 572 backlinks, 68 referring domains,
  15 broken. The only stored OpenSEO site audit (2026-09-09) crawled 50
  Ireland pages without Lighthouse. Pass `locationCode` and `languageCode`
  on every market-specific call: Ireland 2372/en, Czechia 2203/cs,
  Portugal 2620/pt, Spain 2724/es, Romania 2642/ro, Brazil 2076/pt. Read
  `get_project_context` and its research log first. Its sections
  current_goal, positioning, writing_preferences and competitors are empty.
- Google plugin scripts in
  ~/.claude/plugins/marketplaces/agricidaniel-claude-seo/scripts/ and the
  claude-seo:seo-google agent: no credentials on this machine since the
  Windows reinstall (`~/.config/claude-seo/` does not exist). Do not use
  them; everything they offered is covered by the OpenSEO connector except
  CrUX and PageSpeed.
- CrUX and PageSpeed Insights: no API key. A keyless PageSpeed call
  returned HTTP 429. If `GOOGLE_API_KEY` is unset in your run, field data
  is unknown; take lab scores only from an OpenSEO site audit with
  Lighthouse enabled, and say so.
- Python: 3.14.7 is installed and runs as `python`. The `py` launcher is
  not on PATH, so the "py, never python" note in CLAUDE.md predates the
  reinstall. openpyxl, pandas, requests and lxml must be importable; if an
  import fails, run `python -m pip install openpyxl pandas requests lxml`
  once and continue. Node 22 is available.
- Excel 16 is installed and COM automation recalculates formulas.
  LibreOffice is not installed, so the xlsx skill's `recalc.py` cannot run.
- Git remote reachable; branch Dev-hassaan level with origin on
  2026-09-15.

"CB Server" in my brief means the Claude Browser: the in-app browser
tools (`mcp__Claude_Browser__navigate`, `read_page`, `get_page_text`,
`find`, `computer`, `read_console_messages`, `read_network_requests`,
`resize_window`, `javascript_tool`). Use it for rendered-DOM checks,
JavaScript-rendering comparison against the raw HTML, mobile-viewport
rendering, console and network errors, consent and geo/cookie behaviour,
and the booking flow up to but never past a real submission. It is a
verification tool, not a crawler: probe every URL with the HTTP script,
then use the browser on representative pages per template and market and
on every page a probe result flags. Record it in 03_Data_Access as
"Claude Browser (in-app)". Research data behind OpenSEO comes from
DataForSEO; name the provider on every estimated metric.

The repository documents a GA4 interruption beginning 2 August 2026 and
restoration on 9 September 2026. The 9 September review also records no
GSC–GA4 product link. Recheck both.

Separate historical collection loss, present event delivery,
property-link status and key-event registration.

Never interpret an unmeasured period as zero demand or reconstruct missing
sessions by estimation.

For each source record:

Account/project.
Access result.
Timezone.
Available dates and latest complete date.
Scopes and dimensions.
Limits and quota/cost.
Returned rows.
Evidence location.

Keep all tokens and credentials out of responses and artifacts.

On missing access, record the exact failed check and minimum action
required, then continue independent work. Do not call a blocked section
complete.

Respect existing credit budgets. Estimate the credit cost of every OpenSEO
batch first, prefer the free GSC and GA4 tools wherever they answer the
question, and ask before any single planned batch over 2,000 credits.
Report credits spent at the end.


4. SAFETY AND SCOPE BOUNDARIES

Use public website content, approved repository/configuration data and
aggregate analytics.

Do not inspect or export patient records, medical histories, private
appointment details, identifiers, secrets or payment credentials.

Review analytics for sensitive-data leakage, including URLs, titles,
query strings, events and session recordings.

Do not improve measurement by sending health or identifying information
to a third party.

Inspect scripts before executing them.

Run safe checks locally or in a sandbox. Do not place real appointments,
send messages, charge cards, stress-test production or perform destructive
security tests. Read the live site through public HTTP only; do not open
database connections to production. Probe at a polite rate with a real
user agent.

Review security, accessibility and public user-flow risks as part of the
audit. Distinguish these checks from a complete penetration test or
legal certification.


5. DISCOVER EVERY RELEVANT URL AND ITS SOURCE

Build the inventory from the union of:

Route definitions.
Eligible public content records.
Sitemaps.
Internal links.
GSC pages.
GA4 landing pages.
Backlink targets.
Legacy Wix URLs.

Include pages with no measured traffic.

Keep separate states for current canonical pages, alternate/parameter
URLs, redirects, noindexed pages, retired pages, orphan candidates,
unpublished records and unsupported combinations.

Assign stable URL IDs and separate content-entity IDs. Keep the six
url_id values already seeded in 04_Page_Inventory.

Preserve raw observed URLs and a documented normalized mapping.
Do not strip meaningful parameters, merge translated URLs or collapse
old and new URLs without evidence.

For each URL capture:

Target country, language and locale tag.
Page family.
Entity/template/source file or content model.
Discovery source.
Publication/first-seen dates where known.
Expected indexability.
Actual status and canonical.
Sitemap state.
Title, description and H1.
Primary intent/keyword.
Owner and evidence date.

Trace each page to the actual fields that generate its body, metadata,
images, structured data and booking links. Content comes from at least
four places: code copy in frontend/lib/content/*.ts, locale JSON in
frontend/locales/<lang>/*.json, CMS page-content records served by the
backend page-content module, and doctor/service records.

Distinguish UI translations, clinical consultation languages and
country-specific commercial content.

Report discovered/tested/blocked/excluded URL counts by market,
language and template.

Explain exclusions and pagination/crawl limits.

Never claim "every page audited" when only representative pages
were tested.


6. AUDIT REPOSITORY ARCHITECTURE AND COUNTRY-SPECIFIC DATA

Trace country and locale selection end to end:

Routing.
Proxy logic.
Server rendering.
Public APIs/database filters.
Translation fallback.
Component props.
Metadata generation.
Cache keys.
Revalidation.
Hydration.

Test that country + locale + entity + publication state survive through
the full data path.

Look for stale data and cache collisions between countries or languages.

Check local service availability, doctor eligibility, verified registration
links, prices, currency, booking timezone, feature flags, empty catalogues,
partner information and contact/legal details.

Verify errors do not silently substitute another country's data or
English content.

Review how content changes propagate to body, title, schema, sitemap
and alternate-language links.

Record the smallest shared-template fix when one defect affects
many pages.

Review responsive rendering, loading/error states, navigation, forms
and booking context, plus current dependency/build/CI risks relevant
to public reliability.

Do not rewrite working architecture simply because an alternative
pattern exists.


6A. AUDIT ONE-COUNTRY CODE INSIDE SHARED TEMPLATES

The site is built on shared templates that every market renders through
(`frontend/app/[country]/[lang]/...`). A new market is planned within
three months, so the cost of adding a country today is a first-class
finding, not a side note.

Problem I see as the owner, in my words: some lines and some files are
directed at one country only. Example pattern from a shared template:

```ts
code === "br"
  ? (loadLocaleBundle(lang, country).common.countryNames?.[code] ?? config.name)
  : config.name
```

Brazil gets a localized country name; the other five markets get the
config name. Observed on 2026-09-15 (verify, do not trust): 24 inline
country-code comparisons across `frontend/app/[country]`, `frontend/lib`,
`frontend/components` and `backend/src`, for example
`preferIrelandExtras = code === "ie"` and `code === "br" && ...` in
`frontend/app/[country]/[lang]/page.tsx`, six branches in
`frontend/lib/i18n/load-locale.ts` that swap locale bundles for Romania,
Spain and Brazil only, `isBrazil`/`isCzech` in the consultation booking
form; per-country copy modules `frontend/lib/content/ireland-static-page-seo.ts`,
`czechia-static-page-seo.ts`, `portugal-static-page-seo.ts`,
`czechia-approved-doctor-faqs.ts`, `frontend/lib/i18n/{romania,spain,brazil}-editorial-copy.json`,
`frontend/lib/tools/{czechia,portugal,romania}-*.json`, each gated by a
line such as `countryCode === "cz" && locale === "cs"`; 43 country-named
draft and patch modules in `backend/src/content/`; and about 140
country-named one-off scripts under `backend/scripts/`.

Do this:

1. Locate (Sonnet, then Opus judges). Grep every file outside tests for
   country codes (`ie`, `cz`, `pt`, `es`, `ro`, `br`), country slugs and
   country names used in a condition, a cache key, an import path, a file
   name or a default. Include `frontend/app`, `frontend/lib`,
   `frontend/components`, `frontend/proxy.ts`, `frontend/next.config.ts`,
   `backend/src` and `backend/scripts`. Record file, line, the exact
   expression, the template or route it affects and the markets it
   excludes.

2. Classify every hit into exactly one of:
   - Legitimate market rule: law, regulator, tax, consent, identity
     document, currency or clinical scope that really differs by country.
     Keep, but it should be a flag or value on the Country record or a
     per-country config, not an inline literal.
   - Content that only one market received: SEO copy, FAQs, tool copy,
     editorial overrides, media, localized names. Every other market is
     silently on the generic path.
   - Cache, loader or routing special case: bundle swaps, cache keys,
     slug-versus-code comparisons, fallbacks that only fire for one
     market.
   - Applied one-off script or draft module: no runtime effect, but ships
     in the build or confuses future agents.
   - Test-only or dead code.

3. For each hit answer: what does the other five markets' path render
   today (verify on production for at least one page per hit that touches
   public output), is that output wrong or merely generic, and what is the
   smallest generic mechanism that removes the branch (a Country field, a
   CMS record type, a per-country config file loaded by one shared
   loader, a locale-bundle override convention that works for every
   market)?

4. Recommend the target model with evidence. I have not decided between
   "CMS/database, admin-editable" and "code, one config file per country
   with one shared loader". Weigh: who edits it (owner or developer),
   deploy needed per change, clinical-approval gating, translation
   workflow, cache and revalidation behaviour, and the effort for the
   next country. Give one recommendation, the effort in days, the
   migration order, and what a new-country checklist looks like under
   that model (data rows, locale JSON, images, redirects, sitemap,
   hreflang, analytics dimensions, admin settings).

5. For the applied scripts and draft modules: list and classify only.
   Verify whether each is referenced from runtime code, whether its
   change is visible in production, and whether it is in
   `backend/scripts/applied/` already. Produce a cleanup queue. Do not
   delete or move anything in this run.

6. Output: a new sheet `27_Country_Coupling` in the workbook with one
   row per hit (coupling_id, file, line, expression, kind, markets
   served, markets excluded, public output affected, production evidence,
   smallest generic fix, effort_1_5, blocks_new_country yes/no, status)
   and its fields added to 23_Data_Dictionary; one Issues row per
   template-level fix (not per line), with the coupling ids it closes;
   the target-model recommendation and the new-country checklist in the
   executive report; and a 30-day roadmap entry under "critical
   technical/data issues" because the next market is due within three
   months.

Do not refactor anything in this run. Do not label a legitimate market
rule as a defect just because it names a country; the defect is when the
rule is an inline literal instead of data, or when content exists for
one market and the template has no way to carry it for the others.


7. AUDIT LIVE TECHNICAL AND INTERNATIONAL SEO

Check server responses and rendered output, not just source-code intent.

Cover:

HTTP status and redirect chains.
Soft 404s.
Robots.txt and robots headers.
Canonical targets.
Host/HTTPS/slash consistency.
Sitemap coverage and meaningful lastmod.
Internal links and orphan pages.
Pagination/search/facet URLs.
JavaScript rendering.
Metadata and headings.
Applicable structured data.
Mobile usability and accessibility.
Field and lab performance.

For international SEO verify:

Visible language and HTML language.
Equivalent-page switching.
Valid region/language tags.
Self-reference and reciprocal hreflang.
x-default policy.
Target indexability.
Canonical consistency.

Inspect generated markup with an HTML parser rather than a
case-sensitive substring search. The alternates are emitted as camelCase
`hrefLang`; a grep for `hreflang` returns zero.

Respect the existing eligibility-gated alternate builders.

Do not add unpublished/noindexed translations to clusters or
automatically canonicalize every locale to English.

Do not add cross-market alternates merely because two pages share
a template. Confirm meaningful equivalence.

Specifically distinguish Portugal Portuguese from Brazilian Portuguese,
and page languages from languages offered by clinicians.

Test whether geo/cookie behavior obstructs crawlers or user choice.

Separate Google's stored URL Inspection result, a current live fetch,
rendered-DOM behavior and a dated crawl.

Use inspection quotas proportionately and record uninspected URLs. The
quota is about 2,000 URLs per day at roughly 7.5 seconds each, 10 per
call. Inspect the primary-locale sitemap pages and every blog URL first,
then legacy redirect targets; queue the remainder for the next day and
list it.

Separate CrUX field evidence from Lighthouse lab scores, device
classes and measurement windows.

Missing field data is unknown, not failure.

Run existing SEO regression checks where safe (the seo-live-urls unit test
only issues GET requests). Preserve intentional removals and approved
410 behavior.

Run the OpenSEO site audit at most once, with Lighthouse enabled and a
page budget that covers every market, after estimating its credit cost.
Your own probe (A2) is the URL-complete technical dataset; the OpenSEO
audit supplies lab performance and a second opinion.


8. RECONSTRUCT THE WIX MIGRATION AND MEASUREMENT TIMELINE

Recover old URL lists from existing exports, repository redirects
(frontend/next.config.ts holds about 276 rules), historical GSC and
backlink targets (wix.to alone carries 195 backlinks, 13 broken).

Match old and new content by entity/intent, not just similar slug text.

Test high-value former landing pages first, then complete the
migration mapping.

Check direct permanent redirects, relevance of destinations, chains,
loops, obsolete internal links and intentional retirements.

Do not redirect everything to a homepage or demand that valid legacy
redirects become indexed pages.

Collect the earliest available history, including the Wix period
when retained. GSC allows 16 months of lookback; pull the property-level
daily series (dataset A) for the full 16 months and page-level monthly
totals for the Wix period, but keep page/query daily grain (datasets B
and C) from 2026-07-21 onward.

Mark launch, URL moves, tracking interruption/repair, deployments,
content batches and major sitewide changes separately.

Use equal-length, non-overlapping comparison windows where appropriate.

Do not compare overlapping 28-day snapshots as "before versus after."

Distinguish correlation from causation. Never blame the previous SEO
provider without evidence.


9. RETRIEVE AND RECONCILE PERFORMANCE DATA

Create separate datasets. Preserve exact requested grain and
extraction metadata.

GSC datasets:

A. Property/day/search-type totals for reconciliation.

B. Page/day/searcher-country/device/search-type rows.

C. Query/page/day/searcher-country/device/search-type rows
   for intent analysis.

Keep search-appearance reports separate when their aggregation
would overlap.

Retrieve clicks, impressions, CTR and average position.

Use page market/language mappings separately from searcher country.
Retain raw URL attribution and canonical mappings. Store searcher country
as the GSC alpha-3 code in its own column; never merge it with page market.

Paginate correctly and log source limits, omitted/anonymized queries,
partial days and sampled/limited exports where applicable. Treat the
latest three days as incomplete and record the latest complete day you
actually received in 25_Config.

"All available returned rows" is not "every query Google has ever seen."

Never derive total page/site traffic solely from query rows.

GA4 datasets:

Use compatible session-scoped organic landing-page reports.

Preserve source/medium, channel, device, visitor country,
property timezone and currency where the available reports return them.

Distinguish all organic search from Google organic before
reconciling with GSC.

Retrieve sessions, engaged sessions, validated key events,
booking starts, booking confirmations, purchases and revenue only where
measurement is trustworthy. Valid GA4 windows are 2026-07-25 to
2026-08-01 and 2026-09-09 onward; every cell outside them stays blank
with a data_quality note, never zero.

Query users and session key-event rates at the required aggregate
grain. Do not sum distinct users or average daily rates.

Check page_view, begin_booking, booking_confirmed, begin_checkout and
purchase in code (frontend/lib/analytics/track.ts) and actual safe event
delivery.

Record key-event flags separately.

Do not assume a booking-start event is a completed appointment
or automatically register every event as a key event.

Review consent behavior, duplicate SPA page views, source/referral
pollution, cross-domain handoffs, internal/test traffic and purchase
deduplication without changing settings.

Do not force GSC clicks to equal GA4 sessions.

Explain attribution, consent, timezone and collection differences.
Document thresholds, sampling, other-row loss, nulls and reporting
identity where relevant.

Compare latest complete 7-day and 28-day windows, complete calendar
months and same-age page cohorts when justified.

Exclude incomplete or broken-measurement periods from conversion
conclusions.

Flag low sample sizes and query-mix changes.


10. AUDIT AND IMPROVE CONTENT QUALITY

Review each page's usefulness, intent alignment, specificity,
factual accuracy, local applicability, natural language and
evidence of genuine expertise.

Identify generic intros, repetitive templates, unsupported
superlatives, awkward translations, redundant FAQs, overused
phrases, excessive punctuation and unnatural calls to action.

Em dashes may be edited for style. Do not treat punctuation
or an AI-detector score as a ranking factor. Czech, Spanish, Portuguese
and Romanian have legitimate typographic dash uses; judge by locale.
Calibration counts from the source tree on 2026-09-15: 393 em dashes in
frontend/locales/en/*.json, 65 locale JSON files containing them, 252
lines in frontend/lib/content/*.ts, 42 in backend/src/content/*.ts.

Measure the whole site with a rule-based scanner over rendered main
content (Sonnet), then apply human-style judgment (Opus) to the ten
highest-impression pages per market plus every page the scanner flags
strongly. Record scanner counts and analyst ratings in separate columns.

Preserve correct clinical meaning, safety qualifications,
actual prices, service limitations and valid credentials.

Never invent a clinical reviewer, review date, regulatory status,
testimonial or evidence.

Follow the current publication contract, including the
owner-approved single verified in-market clinician approval
where applicable (ledger decision of 2026-09-03).

Do not reinstate obsolete three-approver rules or bypass
existing clinical/native-language gates. Flag on every proposal whether a
clinical-approval gate applies.

One preparation-stage observation to recheck:

The Ireland English homepage showed 13 consultation languages
while its FAQ listed six.

Trace the relevant data/content sources and verify whether
their scopes differ before proposing corrected copy.

Classify every reviewed page:

Protect.
Improve.
Consolidate.
Translate/localize.
Create supporting content.
Consider retirement.

Give a reason, evidence, owner and expected user benefit.

Provide exact current-versus-proposed title, description, H1
and selected body/FAQ improvements for at least two priority
pages per market when access permits.

These are proposed edits, not approved publication.

Prioritize by evidence, not equal-volume rewriting.


11. RESEARCH KEYWORDS, COMPETITORS AND BACKLINKS

Use existing OpenSEO or other authenticated tools with explicit
market, language, location, device and observation date.

Preserve provider names and units for estimated volume,
difficulty, rank and authority metrics.

Build intent-based keyword clusters and assign ownership to
existing URLs before suggesting new pages.

Separate branded/non-branded demand with a documented,
versioned classification.

Identify real local SERP competitors by topic, plus business
competitors where relevant.

Record ranking URLs, useful content gaps, trust differences,
local relevance and achievable opportunities.

For backlinks record referring/source URLs, targets, anchors,
rel attributes, first/last seen, link status, relevance and
provider estimates.

Separate existing links from prospects and broken-link reclamation.

Recommend relevant earned references, legitimate partnerships
and useful resources.

Do not buy ranking links, create spam, automate outreach or
treat third-party authority scores as Google metrics.


12. EVALUATE PROGRAMMATIC SEO CAUTIOUSLY

Start from verified demand and existing inventory.

Do not mass-generate every country × city × service ×
condition combination.

For each candidate family establish:

Unique useful data.
Genuine local service applicability.
Distinct intent.
Reliable source ownership.
Medical-review requirements.
Internal-link placement.
Indexing/canonical policy.
A measurable purpose.

Check duplication and cannibalization before launch.

Propose a small evidence-backed pilot, publication gates,
rollback criteria and post-indexation measurement windows.

Never produce thin doorway pages or falsify local presence.

Prefer improving valuable existing pages when that is more
useful than expanding inventory.

Keep proposed pages separate from live pages in the workbook.


13. DELIVER THE POPULATED EXCEL OPERATING WORKBOOK

Use seo/Global_Health_SEO_Tracker_Starter.xlsx. Copy it to
seo/tracking/Global_Health_SEO_Tracker.xlsx and populate the copy; leave
the starter untouched as the template.

Starter facts, verified 2026-09-15: 27 sheets named 00_README through
26_GSC_Property_Daily; every data sheet is an Excel table (for example
T04PageInventory, T09GSCPageDaily, T19Issues) whose header sits on row 5
with a title on row 1 and a scope note on row 2; 01_Dashboard has no
table; 23_Data_Dictionary holds 344 field definitions and is the column
contract; 25_Config carries the report controls
(gsc_last_complete_date, ga4_last_complete_date, reporting_currency and
others are deliberately blank until verified); 04_Page_Inventory seeds six
home routes and 19_Issues seeds four issues; 03_Data_Access still says
sitemap/robots retrieval failed, which is no longer true.

Preserve stable IDs, manual owners/notes and evidence.
Extend columns where necessary and add each new column to
23_Data_Dictionary. Resize table ranges to cover appended rows; a row
outside the table is invisible to every filter and formula.

Build with openpyxl through `python`, then recalculate and save through
Excel, then reopen with openpyxl `data_only=True` and scan every formula
cell for error values. If openpyxl damages tables, validation lists or
formatting, rebuild that step through Excel COM instead:

```powershell
$x = New-Object -ComObject Excel.Application; $x.Visible = $false; $x.DisplayAlerts = $false
$wb = $x.Workbooks.Open((Resolve-Path 'seo/tracking/Global_Health_SEO_Tracker.xlsx').Path)
$x.CalculateFull(); $wb.Save(); $wb.Close($false); $x.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($x) | Out-Null
```

Do not mistake its six seeded home routes or historical
metrics for the full audit.

Required sheets or equivalent normalized tables:

README
Dashboard
Markets_Locales
Data_Access
Page_Inventory
Technical_QA
Locale_Data_QA
Hreflang
Crawl_History
GSC_Page_Daily
GSC_Query_Daily
GA4_Landing_Daily
Monthly_Summary
Keyword_Map
Competitors
Backlinks
Content_Review
pSEO_Plan
Migration
Issues
Change_Log
Historical_Baselines
Refresh_Log
Data_Dictionary
Sources
Config
GSC_Property_Daily
Country_Coupling (new, see §6A)

Maintain one master fact table per grain, filterable by
market and language.

Do not scatter duplicated raw metrics across six unrelated
spreadsheets.

Keep the workbook openable: the daily GSC tables hold full grain from
2026-07-21 onward; anything older or larger stays in the CSV exports
under seo/tracking/data/ and is summarized in Historical_Baselines.

Dashboard and summary views must expose data freshness,
coverage, indexing eligibility, organic visibility,
validated outcomes, top gains/declines and prioritized work.

Keep unknown metrics visibly unavailable, not zero.

Page-level reporting must show current versus previous
comparable performance, absolute/percentage changes where valid,
primary query/intent, technical/content status, recommendation
and next measurement date.

Do not divide by zero or label a new page's growth "infinite."

Use formulas for CTR, compatible weighted position,
engagement rate, percentage changes, overdue flags and
issue prioritization.

P0, patient-safety and privacy blockers override the
numerical score.

Distinguish observed values, estimates and analyst judgments.

Issue records need:

ID and canonical-ledger reference.
Affected URL/entity/template.
Country/language.
Evidence and root cause.
Severity, confidence and effort.
Proposed fix.
Owner and status.
Approval needs.
Acceptance test.
Follow-up date.

Preserve historical baselines and append crawl, inspection
and change history.

Do not overwrite evidence or average incompatible rates.
Treat mixed currencies and approximate UI figures explicitly.

Add tables, filters, frozen headers, readable formatting,
validation lists, appropriate number/date formats and a
complete data dictionary.

Prevent CSV/XLSX formula injection from imported text: any imported
value starting with =, +, -, @, tab or carriage return is written as a
quoted string, never as a formula.

Validate formulas, joins, unique keys and summary totals.


14. MAKE REFRESHES REPEATABLE WITHOUT SILENTLY ACTIVATING THEM

Provide runnable local refresh instructions or scripts
using the runtime's existing authentication. Scripts live in
seo/tracking/scripts/ and run with `python`; pulls that need the OpenSEO
connector are written as documented Claude Code prompts, because the
connector is only callable from inside a session.

No embedded tokens, assumed future access or silent
scheduled deployments.

Export raw responses and normalized data with manifests:

Source.
Query parameters.
Grain.
Date range.
Timezone.
Extraction time.
Completeness.
Schema version.
Row counts.

Store large raw datasets outside Excel where necessary.

Upsert stable natural keys using a rolling backfill window.
Prevent duplicate rows on rerun.

Preserve user-entered notes and owners.

Archive dated snapshots and record failures without
erasing last-good data.

Daily:
Refresh available complete data, backfill recent changes,
check extraction health and material anomalies, and
inspect affected URLs. (Sonnet, zero credits.)

Weekly:
Review country/locale opportunities, priority queries,
content work, measurement health and recrawl watchlists. (Sonnet.)

Monthly:
Close and archive a complete month, refresh suitable
competitor/backlink evidence, compare eligible periods
and adjust the roadmap. (Fable orchestrating, Opus judgment.)

A full audit may justify an initial comprehensive crawl.
Small subsequent batches should use focused verification.

Do not recrawl the entire site daily.

Deliver proposed schedules and alert thresholds, but
do not activate a job, GitHub workflow or notification
without separate approval.


15. PRIORITIZE EXECUTION AND PROVE COMPLETION

Produce a 30/60/90-day roadmap separating:

Measurement repairs.
Critical technical/data issues (including the §6A template
decoupling, because a new market launches within three months).
Content improvements.
Authority work.
Programmatic pilots.

Reconcile with the ledger's current market priorities,
rather than silently replacing them.

For every recommendation provide exact evidence,
affected scope, source file/content field where known,
smallest safe change, approval boundary, acceptance test,
rollback approach and follow-up measurement window.

Write outputs to these locations:

seo/tracking/Global_Health_SEO_Tracker.xlsx
seo/tracking/data/            normalized CSV exports and manifests
seo/tracking/raw/2026-09-15/  raw responses per agent
seo/tracking/scripts/         refresh scripts and refresh prompts
docs/audits/seo/seo-master-audit-2026-09-15.md   executive report
docs/plans/seo-control-state.md   append §51 in the working tree:
  dated, concise, "audit recorded, no implementation", linking the
  report, workbook and raw folder; do not edit older sections
seo/README.md   one row pointing at the tracker

Commit policy: run `git status` first, stage only the paths listed above
plus the raw and data folders by explicit path, never `git add -A` or
`git add .`, and never include another session's modified files. Commit on
the current branch with a conventional message ending in the Claude
attribution line this session requires. Do not push. Finish with the
commit hash and `git show --stat`.

Return:

1. Executive summary of verified findings, strengths,
   risks and unknowns.

2. Populated XLSX, normalized data exports and
   extraction manifests.

3. URL coverage report and complete issue register.

4. Native-market keyword ownership and
   competitor/backlink opportunity records.

5. Prioritized copy proposals and evidence-gated
   programmatic plan.

6. Repeatable refresh instructions/scripts and
   proposed cadence.

7. A concise decision queue for blocked access or
   genuinely required approvals.

Finish with a coverage statement:

Total known URLs.
How many were live-tested.
How many were rendered.
How many received URL Inspection.
How many were content-reviewed.
Actual data windows retrieved.
Unresolved access limits.
Checks not run.
OpenSEO credits spent.
Row count per workbook sheet and the QA discrepancy count.

Distinguish completed work from proposals.

A successful file write is not proof of a successful audit.

Start by reading the existing source-of-truth files and
verifying live connections, then execute the audit.

Do not respond with only a plan when the work can be performed.
