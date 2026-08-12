# SEO control state — canonical

**This file is the single source of truth for the SEO workstream.** It carries the
remediation ledger, the organic-growth roadmap, and the indexation watchlist. Every
other SEO document in this repository is historical evidence, not current status.

Rebaselined: **2026-08-12** (task `SEO-RESET-001`, superseding the same-day
`SEO-CONTROL-001` pass; extended the same day by `SEO-FOUNDATION-001`, a
whole-site technical and shared-template completion audit — see §5 and §7) — this
date is when the control-state document and its evidence
were last refreshed, **not** the latest date GSC has data for. GSC lags ~3 days; every
GSC window in this file ends on the most recent date available at extraction time
(**2026-08-11** for the §1/§2 baseline, `dataState=all`), never on the rebaseline date
itself. The earlier `SEO-CONTROL-001` windows ended 2026-08-09; that two-day shift is
why §1 and §2 numbers differ slightly from the versions this document carried before.
Property: `sc-domain:myglobalhealth.online` · Site: `https://www.myglobalhealth.online`

---

## 0. Operating rules

> **Before beginning any new SEO remediation or growth batch, refresh the relevant
> OpenSEO/GSC data and verify live production behavior. Historical audit counts are
> context, not the current source of truth.**

> **After every implemented/deployed SEO batch, update the canonical remediation
> ledger and growth roadmap in this file before proceeding to the next batch.**

Supporting rules:

- **Do not rerun the full ~1,000-page crawl for every batch.** Reserve a full crawl for
  validating global technical architecture, establishing a periodic baseline, or
  following substantial sitewide change. For one page, one query cluster, one country,
  one redirect family, one metadata template, or one indexing question, use a focused
  OpenSEO/GSC pull plus a live production check.
- **Distinguish three states in every finding**: what production serves right now, what
  Google has stored from its last crawl, and what an older audit recorded. They diverge
  routinely, and conflating them is the main way stale work gets redone.
- **When old and new data disagree, new verified data wins.** Keep the old number only
  as labelled historical context.
- **An OpenSEO/MCP recommendation is a hypothesis.** Verify it against GSC, a live SERP,
  and the actual site architecture before it enters the roadmap.

---

## 1. Sitewide organic baseline

Re-extracted **2026-08-12** (`SEO-RESET-001`), via `get_search_console_performance`
(Search Console Search Analytics), `dataState=all`. **Last date with any GSC data:
2026-08-11.** Windows are 28 days each so that the current and prior periods are
directly comparable. Sitewide totals are summed from the `date` dimension; the 3-month
row is summed from the `device` dimension (3 rows) rather than 92 date rows — same
totals, and it yields the device split noted below. Average position is
impression-weighted from those rows.

| Window | Dates | Clicks | Impressions | CTR | Avg position |
| --- | --- | ---: | ---: | ---: | ---: |
| Current 28d | 2026-07-15 → 2026-08-11 | **719** | **33,579** | **2.14%** | **18.5** |
| Prior 28d | 2026-06-17 → 2026-07-14 | 414 | 10,860 | 3.81% | 13.1 |
| Last 3 months | 2026-05-12 → 2026-08-11 | 1,617 | 54,877 | 2.95% | 16.1 |

**Read this correctly.** Clicks grew 74% period-over-period, which is real. Impressions
grew 209%, which is faster, so CTR fell and average position deepened. Nothing in the
click series suggests a ranking loss — the mechanism was diagnosed and closed in
SEO-GROWTH-012 (see below).

**The surge has not reversed, and its worst CTR days have passed.** Daily impressions
peaked 2026-08-09 (2,723 impressions, 20 clicks, position 25.9) and have since settled
at 2,491 (08-10) and 2,029 (08-11) with clicks recovering to 35 and 28 and position
improving to 17.2 and 14.7. The two-day tail is the healthiest part of the window: the
same volume at materially better positions. Treat 08-10/08-11 as possibly incomplete
(`dataState=all`).

**Device split, last 3 months (new observation this pass).** Mobile: 1,102 clicks /
24,693 impressions / 4.46% CTR / position 10.5. Desktop: 501 clicks / 29,785
impressions / 1.68% CTR / position 20.7. Tablet: 14 / 399 / 3.51% / 15.2. Desktop draws
*more* impressions than mobile at half the CTR and twice the depth. This is recorded as
context, not as a work item — the same tool/non-market long tail that explains the
sitewide CTR fall is plausibly desktop-skewed, and no device-specific defect has been
investigated or established.

**Diagnosed and closed (SEO-GROWTH-012, §5/§7):** the surge is 568 pages that had zero
impressions the week before suddenly earning them — not existing pages ranking
differently. 75% of that volume is the `/tools/*` calculator cluster (BMI, calorie,
blood pressure, ovulation, ADHD test, due-date) newly ranking across markets and
locales; roughly a third of the new impressions land at genuinely good positions
(top 10–20), not uniformly "deep-SERP" as first assumed. It converts at 0.48% CTR
because the intent is free-tool, not medical-service — expected, not a defect.

Do not compare these figures against the 2026-07-28 plan's "514 clicks / 15,210
impressions / 3.38% CTR" baseline as if it were the same measurement; that was a
28-day window ending 2026-07-25 and is superseded.

### Off-site footprint (extracted 2026-08-11, `get_backlinks_overview`)

511 backlinks · 369 referring pages · **57 referring domains** · rank 43 · backlink spam
score 7 · target spam score 3. Referring domains have climbed steadily (26 in
2025-08 → 57 now), with the step change in 2026-05. The largest single referrer is
`wix.to` (195 backlinks) — residual equity from the Wix-era site, which is exactly why
legacy URLs must keep resolving through 308s rather than being blocked in robots.txt.

**Known false positive:** this API also reports `brokenPages: 666`. That figure comes
from a stale Wix-era crawl of the old site and has been re-confirmed as noise on
2026-08-12. Do not open work against it.

---

## 2. Country scoreboard

Search Console **searcher country**, not page language. Current window
2026-07-15 → 2026-08-11; prior window 2026-06-17 → 2026-07-14. Re-pulled
`SEO-RESET-001`, 2026-08-12.

| Country | Clicks | Impr | CTR | Avg pos | 28d trend | Strongest page type | Biggest credible opportunity |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| Ireland | 189 | 6,114 | 3.09% | 22.9 | clicks +78% (106), impr +342% (1,382), CTR down from 7.67%, pos from 15.0 | Doctor profiles; legacy `/ireland-doctors/*` still out-earning current-shape URLs *in GSC's attribution* (Google's own state now shows them correctly as "Page with redirect" — see §6) | **The at-home lab-test cluster** — `/ireland/en/lab-tests` + 16 detail pages, 1,041 impressions / 4 clicks / position 27.1, from **zero impressions** the prior window. Geo-modified queries already rank 11–16 live. See SEO-GROWTH-016 |
| Portugal | 134 | 3,745 | 3.58% | 19.4 | clicks +22% (110), impr +175% (1,361), CTR from 8.08%, pos from 9.8 | Doctor profiles (`dr-telmo-coelho`, 9.2% CTR at pos 4.9) and `/portugal/pt` | Driving-licence / atestado cluster: `/portugal/pt/services/certificado-medico-carta-de-conducao` holds 460 impressions at position 14.2, but every *visible* head query in it sits at 42–53. Feasibility looks poor — see §7 NEXT |
| Czechia | 90 | 1,891 | 4.76% | 14.1 | clicks +58% (57), impr +303% (469), CTR from 12.15%, pos from 7.9 | Czech-language service pages (`muzske-zdravi-online` pos 2.2, 22.2% CTR; `lekar-online-praha` pos 5.9, 12% CTR) | Still the best CTR of any market on the smallest base. The current query mix is brand plus informational Czech terms (`diabetes` 37 impr pos 38.9) — no commercial cluster large enough to be a batch yet |
| Spain | 78 | 3,614 | 2.16% | 23.9 | clicks +160% (30), impr +548% (558), CTR from 5.38%, pos from 13.4 | Doctor profiles (`dr-tomas-ruiz-palacios` 31.8% CTR at pos 3.1; `dr-luz-marina-zuluaga-rios` 25% at pos 1.9) | None new. SEO-GROWTH-013 closed this market as a SERP/business-model wall; `/spain/es` sits at 1,074 impressions / position 30.1. `/spain/en/services/consulta-medica-online` has grown to 518 impr / 7 clicks / pos 23.2 — still wrong-locale, still not the bottleneck |
| Brazil | 30 | 2,785 | 1.08% | 10.2 | clicks +233% (9), impr +228% (849), CTR flat, pos improved from 11.6 | Tools, plus `/brazil/en/blog/online-medical-certificate-brazil` (146 impr at position 3.6, 1 click) | Good positions, almost no clicks — informational tool/blog traffic with no commercial page behind it. Unchanged diagnosis |
| Romania | 19 | 1,240 | 1.53% | 21.2 | prior window ≤3 clicks (below the top-12 country cut) | Tools | Smallest market; no commercial page ranks yet. Unchanged |

Non-market traffic worth noting, current window: United Kingdom 2,928 impressions at
position 33.0 for 22 clicks; United States 3,878 impressions at position 11.9 for 14
clicks; Germany 745 / 8.5 / 12; India 534 / 14.6 / 13. **Pakistan is an outlier worth
one line:** 348 impressions at position 9.9 for 25 clicks (7.18% CTR) — the highest
CTR of any non-market country and more clicks than Romania. It is almost certainly
doctor-name navigational search for the Irish clinicians with Pakistani names, not
demand for a Pakistani market. Recorded, not actioned.

Taken together the non-market countries are a meaningful share of the impression
inflation described in §1 and should be treated as noise in CTR calculations, not as a
CTR problem.

---

## 3. Technical SEO state

Verified against production on 2026-08-12 unless noted.

| Area | State | Evidence |
| --- | --- | --- |
| Sitemap | **1,906 URLs**, live. Supersedes every earlier count (1,353 / 1,304 / 1,153 / 1,924 all appear in older docs). | `curl sitemap.xml \| grep -c '<loc>'`, 2026-08-12 |
| robots.txt | Correct. Site allowed; only `/admin`, `/account`, auth routes and `/api/` disallowed; per-agent blocks for AI crawlers. **No legacy-Wix Disallow** — deliberate, so Googlebot can reach the 308s. | live fetch 2026-08-12 |
| `lastmod` | Real per-row dates; hub pages derive from newest child, so the section-pages loop **must stay last** in `frontend/app/sitemap.ts`. Never use build time. | design decision, unchanged |
| Legacy redirects | 276 redirect rules in `frontend/next.config.ts`. Spot-checked families all 308 to correct current-shape targets. | live probes 2026-08-12 |
| Metadata in `<head>` | Fixed. `generateMetadata()` hreflang resolution parallelised; Googlebot kept out of `htmlLimitedBots`. | `217c7ba9`, `29c2a917` |
| Service-list crawlability | Fixed. Every page of a paginated service catalogue renders as real anchors; only visibility is toggled. | `de35d9e4` + e2e `service-catalog-crawlability.spec.ts` |
| Locale discovery | Fixed. Footer locale row and `<a>`-based switcher give every page real sibling-locale anchors. | `b8b96200`, re-verified 2026-08-03 |
| Orphan pages | 1 true orphan by inlink-graph measure (the earlier "306 orphans" figure was a measurement artefact and is withdrawn). | `internal-discovery-crawl-depth-2026-08-09.md` |
| Performance | Healthy at last measurement; no regression signal since. Not re-measured this pass. | `docs/audits/performance/` |
| Shared CSS/JS | No change required; closed. | prior investigation |
| Sitemap URL validity | **51-URL stratified sample (every 38th sitemap row) — 51/51 returned 200, `index, follow`, self-canonical.** No redirecting, noindexed or 404 URL in the sample. | live Googlebot-UA probes, `SEO-FOUNDATION-001`, 2026-08-12 |
| Host / slash / case canonicalisation | Correct. Apex → 301 → `www`; `http` → 301 → `https`; trailing slash → 308 → unslashed; `/Ireland/EN` → 404 (no case-variant duplicates); unknown country, unknown locale and unknown service slug all return real 404s, no soft-404s. | live probes 2026-08-12 |
| Query-parameter handling | Correct. `?utm_source=…&gclid=…` serves the clean self-canonical. | live probe 2026-08-12 |
| Utility/auth route indexability | Correct. `/login`, `/access-request`, `/patient-upload`, `/cart`, `/checkout`, `/cross-border-consent` all serve `noindex, nofollow` in addition to the robots.txt disallows. Blog pagination serves `noindex, follow`. Fallback-locale legal pages serve `noindex, follow` **and are excluded from their own hreflang cluster** (verified on `/ireland/pt/legal/cookie-policy`). | live probes 2026-08-12 |
| Preview-host / retired-URL guards | `proxy.ts` returns a real **410** with `x-robots-tag: noindex` for retired clinician paths, and stamps `X-Robots-Tag: noindex, nofollow, noarchive` on any `*.up.railway.app` host. | `frontend/proxy.ts:367`, `:556` |

---

## 4. Metadata state

**Crawler title/description length warnings are closed and must not be reopened without
new evidence.** The bulk of them were intentional, harmless, or the natural result of
translation expansion into Czech, Portuguese and Spanish, or of descriptive medical
titles. Physically truncating them was tried and reverted (`6011acf0`) because it broke
the strings rather than the layout.

Doctor metadata fixes, all shipped and verified in production:

| Fix | Commit |
| --- | --- |
| Market-specific SERP titles for cross-listed doctors | `1de4dd67` |
| OG description/image no longer names the wrong market | `4fac1e7b` |
| Visible content and `Physician` schema no longer name the wrong market | `3282f5cc` |
| Market-title dedup and language-list summary cap | `26dc7e6f` |
| Title/H1 language and truncation batch; root-cause fix for homepage ellipsis | `0291f6e6`, `6011acf0` |
| CTR-driven service-title cleanup | `dbb25af4` |

Spot check 2026-08-12 — four representative pages all serve a single correct
`<title>`, `robots: index, follow`, and a self-referential canonical:
`/portugal/pt/doctors/dr-telmo-coelho`, `/ireland/en/services/sick-certificate-ireland`,
`/spain/es/services/consulta-medica-online`, `/spain/es/doctors/dr-alfredo-del-valle`.

One CMS-sourced title inconsistency was noted in the 2026-08-10 batch. It is **not**
reproducible in the four pages checked above and has no measurable ranking cost in the
current GSC data; it is recorded as DEFERRED in the roadmap rather than closed.

---

## 5. Remediation ledger

Status vocabulary: `CLOSED` · `FALSE POSITIVE` · `EXPECTED BEHAVIOR` ·
`VERIFIED BY PRODUCTION CHECK` · `WAITING FOR GOOGLE` · `MANUAL ACTION REQUIRED` ·
`DEFERRED` · `INVESTIGATE` · `READY TO IMPLEMENT`.

### Global technical

| ID | Finding | Category | Current status | Evidence date | Production state | Google state | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-001 | Sitemap coverage gap | Indexation | **FALSE POSITIVE** | 2026-08-12 | 1,906 URLs live and well-formed | Sitemap read and processed | None |
| SEO-002 | Internal links pointing at 308 redirects | Crawl efficiency | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | Footer country links and service-page links point at canonical URLs (`f4e84104`, `05f471a7`); health-alias link leak closed (`532d9c8a`) | n/a | None |
| SEO-003 | Fallback-locale legal pages carry `noindex` | Indexation | **EXPECTED BEHAVIOR — CLOSED** | 2026-08-09 | `noindex, follow`, absent from sitemap, absent as hreflang target; exact-locale legal pages stay indexable | Consistent | None |
| SEO-004 | Booking-query canonical variants | Canonicalisation | **EXPECTED BEHAVIOR — CLOSED** | 2026-08-09 | Query-string variants canonicalise to the clean booking URL | Consistent | None |
| SEO-005 | Czech `/health/*` aliases | Duplication | **EXPECTED BEHAVIOR — CLOSED** | 2026-08-09 | Locale-integrity filter prevents fallback-locale `/health/` pages being indexed or hreflang'd (`db318dfe`) | Consistent | None |
| SEO-006 | Performance baseline | Performance | **CLOSED — healthy** | 2026-07-10 | No regression signal | n/a | Re-measure only after a substantial sitewide change |
| SEO-007 | Shared CSS/JS payload investigation | Performance | **CLOSED — no change required** | 2026-07 | n/a | n/a | None |
| SEO-008 | `brokenPages: 666` in the backlinks API | Data quality | **FALSE POSITIVE** | 2026-08-12 | Figure derives from a stale Wix-era crawl of the old site | n/a | Ignore permanently |

### Metadata

| ID | Finding | Category | Current status | Evidence date | Production state | Google state | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-METADATA-001 | Crawler title/description length warnings | Metadata | **FALSE POSITIVE — CLOSED** | 2026-08-09 | Lengths are intentional, harmless, or translation expansion; truncation attempt reverted | n/a | Do not reopen without new evidence |
| SEO-METADATA-002 | Doctor language-list summary | Metadata | **CLOSED** | 2026-08-10 | `26dc7e6f` | n/a | None |
| SEO-METADATA-003 | Localized country titles overwritten | Metadata | **CLOSED** | 2026-08-10 | `1de4dd67`, `3282f5cc` | n/a | None |
| SEO-METADATA-004 | Unicode country-name word-boundary bug | Metadata | **CLOSED** | 2026-08-10 | `26dc7e6f` | n/a | None |
| SEO-METADATA-005 | CMS-specific title inconsistency | Metadata | **DEFERRED** | 2026-08-12 | Not reproducible in a four-page production spot check; no measurable ranking cost in current GSC data | n/a | Re-check only if a title defect surfaces in GSC or a crawl |

### Growth and legacy routing

| ID | Finding | Category | Current status | Evidence date | Production state | Google state | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-GROWTH-001 | Footer links pointing at legacy aliases | Internal linking | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | `f4e84104`, deployed to all three branches | n/a | None |
| SEO-GROWTH-002 | Hlavatý historical URL | Legacy routing | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | `/czechia-doctors/mudr-libor-hlavaty` → 308 → `/czechia/cs/doctors/mudr-libor-hlavaty`, which returns 200 `index, follow` | Legacy URL still holds the ranking: 573 impressions / 2 clicks / pos 11.0 over 90d | Consolidation is Google's to do — see watchlist |
| SEO-GROWTH-003 | Portugal atestado alias consolidation | Legacy routing | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | `/portugal/{pt,es}/health/atestado-medico-online` → 308 → `/portugal/{lang}/services/baixa-medica` (`532d9c8a`) | PT alias still indexed, last crawl 2026-07-25 (pre-fix) | Watchlist only |
| SEO-GROWTH-004 | `/home-br` missing redirect | Legacy routing | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | 308 → `/brazil/pt` (`4c60bb33`) | URL unknown to Google | No action; nothing to consolidate |
| SEO-GROWTH-005 | Bare Brazil legacy families | Legacy routing | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | `4a5f0fad`; probes 308 correctly | n/a | None. `/brazil-doctors/*` 404s but has **zero** GSC impressions in 90 days — not a defect |
| SEO-GROWTH-006 | Locale-prefixed Brazil legacy families | Legacy routing | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | `798c7282`; `/pt/home-br`, `/es/home-br`, `/cs/home-br` all 308 to the right locale | n/a | None |
| SEO-GROWTH-007 | Telmo Coelho indexation | Indexation | **WAITING FOR GOOGLE** | 2026-08-12 | `/portugal/pt/doctors/dr-telmo-coelho` serves `index, follow`, self-canonical, in sitemap | **Stale**: coverage "Excluded by ‘noindex’ tag", last crawl 2026-07-26 — 13 days before the fix | Watchlist. Do not re-investigate before the crawl date advances |
| SEO-GROWTH-008 | Ireland sick-cert consolidation | Legacy routing + ranking | **CLOSED — MONITOR** | 2026-08-12 | Redirects live (`/ireland/sick-leave`, `/ireland/es/health/sick-cert-online` both 308 to current-shape, indexable targets); intent investigation = SUPPORTIVE CLUSTER, no cannibalization; 4 blog→service links live; service title/meta reviewed vs. 6 competitors, no rewrite needed (SEO-GROWTH-008D); 3-step "How it works" block live (SEO-GROWTH-008E, verified) | Two legacy URLs still show "Submitted and indexed" (crawls 2026-07-05 and 2026-07-25, both pre-fix) | None — see §7 MONITOR. Do not reopen without a new specific on-page defect |
| SEO-GROWTH-009 | Retired `/post/[slug]` route | Legacy routing | **CLOSED — VERIFIED BY PRODUCTION CHECK** | 2026-08-12 | Route deleted 2026-05-14/17; `/post/*` is now a `next.config.ts` redirect only. `/post/<unknown>` → 308 → `/ireland/en/blog` | n/a | None. Two audit docs already carry the correction header |
| SEO-GROWTH-010 | Spain market audit | Market analysis | **CLOSED as an audit; findings promoted to the roadmap** | 2026-08-12 | n/a | n/a | See SEO-GROWTH-013 (Spain commercial-service underperformance) and the closed SEO-GROWTH-011 doctor-locale investigation. **No standalone Spain audit document exists in the repository** — the audit was conducted in-session; its conclusions are recorded in §6 and §7 |
| SEO-GROWTH-013 | Spain commercial-service underperformance | Ranking | **CLOSED — INVESTIGATED / NO STRUCTURAL DEFECT** | 2026-08-12 | All 6 commercial URLs technically clean (200, index/follow, self-canonical, in sitemap, correctly linked from `/spain/es`). Not cannibalization — page roles are legitimately distinct (homepage brand+generic, `gp-consultation-online` = GP hub/catalog, `services/consulta-medica-online` = GP detail, `services/dermatologia-especialista-online` = specialist detail) | Bottleneck is SERP competitive wall (national insurers + Doctoralia/TopDoctors-scale aggregators dominate the generic cluster; boutique/solo practitioners dominate specialty clusters) plus a verified trust-presentation gap: Doctify reviews render on hub/team pages but not on service detail pages | See §7 SEO-GROWTH-013 for full findings and substantive conclusions. Next: SEO-GROWTH-014, a feasibility investigation only (not an implementation batch) — do not add Doctify UI/schema before that lands |
| SEO-GROWTH-014 | Spain service-detail Doctify trust-signal feasibility | Trust presentation / data provenance | **CLOSED — GLOBAL DOCTIFY APPROACH CONFIRMED** | 2026-08-12 | `DoctifyWidget` (`variant="horizontal"`) already renders on every service-detail page (`services/[serviceSlug]/page.tsx:870`) — the widget was never missing. It uses one real Doctify practice (`tenant=athena-ie`, `slugs=global-health-ireland`, `profileType=practice`) | `review.doctify.clinicId` / `review.doctify.aggregate` and every other `review.*` Setting key are **unset in production** (direct read-only DB check, 2026-08-12: zero rows) — confirmed still true, unaffected by SEO-GROWTH-015 | Original finding stands (no per-market Doctify profile exists; the manual `review.*` aggregate system is empty and untouched). The business decision on what to do about it is now made, not deferred: treat the one existing Doctify practice as the site's single **global** MyGlobalHealth review profile and show it everywhere, rather than wait for market-by-market Doctify registrations. See SEO-GROWTH-015 |
| SEO-GROWTH-015 | Global Doctify trust integration (revised from an Ireland-only gate) | Trust presentation / implementation | **IMPLEMENTED — VERIFIED, NOT DEPLOYED (uncommitted)** | 2026-08-12 | First pass added a per-market gate (`isDoctifyConfiguredForMarket`, Ireland-only) — **reverted** on explicit direction: the Doctify profile is the site's one global review profile, shown on every market's pages, same as before any of this ticket's work, with two real fixes kept: `language` now flows through to Doctify's widget URLs (was hardcoded `"en"`), and the homepage's manually-entered `review.doctify.aggregate` stat (a second, driftable copy of Doctify's number) was removed — the live widget is the UI's only source of truth for the rating/count now | `AggregateRating` JSON-LD explicitly **not** populated from Doctify — Google's review-snippet policy prohibits aggregating another site's reviews into your own markup; schema stays exactly as SEO-GROWTH-014 found it (fail-closed, empty) | See §7 SEO-GROWTH-015 for the full file list and verification. Also fixed the "45.000 consultas/Valorado en Doctify" pairing on the GP and specialist hero stat strips (implied the volume number was a Doctify rating) — volume claim kept, Doctify/rating wording dropped. Awaiting explicit commit authorization |
| SEO-GROWTH-011 | Spain doctor cross-locale ranking "fragmentation" (Alfredo del Valle) | Indexation / hreflang | **EXPECTED BEHAVIOR — CLOSED, no code change** | 2026-08-12 | All 5 locale URLs (`spain/{es,cs,en,pt,de}/doctors/dr-alfredo-del-valle`) are 200, self-canonical (each declares and Google accepts its own canonical — no consolidation attempted by either side), `index, follow`, in sitemap, carry distinct per-locale `<title>` (Dermatólogo/Dermatolog/Dermatologist/Dermatologista/Dermatologe — real translation, not a duplicate stub), and cross-link each other via the sibling-locale switcher. The one legacy URL in the cluster, `/pt/spain-doctors/dr-alfredo-del-valle`, is "Crawled – currently not indexed" (last crawl 2026-03-08) and draws 1 impression in 90 days — a dead stub, not a participant | Google serves each locale variant as its own PASS result; no `noindex`, no wrong-canonical, no stale-crawl divergence | None. See §7 for the full query×URL matrix and reasoning |
| SEO-GROWTH-012 | August impression-surge diagnosis | Indexation / discovery | **CLOSED — EXPECTED GOOGLE DISCOVERY / TOOL-INTENT MIX SHIFT** | 2026-08-12 | 4-day-window page pull (08-06→08-09) vs. the preceding 5-day window: 946 pages earned impressions vs. 584 before; **568 of those pages had zero impressions in the prior window.** These newly-surfacing pages account for 4,990 of the period's impression growth — existing pages' impressions were flat to slightly down (−257) over the same comparison. 75% of the new-page volume (3,726 impr) is `/tools/*` calculators (BMI, calorie, blood pressure, ovulation, ADHD test, due-date) across every market and locale; the rest spreads thinly across lab-tests, services, legal, blog, doctors, health. Spot-checked 4 representative URLs (`inspect_urls` + live Googlebot fetch): all PASS, `index,follow`, self-canonical, in sitemap, last-crawl clustered 2026-08-05→08-08 — Google (re)crawled them right at the surge, not a code deploy (the tool pages themselves shipped weeks earlier, see `244d629e` et al.) | Google evidently ran a discovery/recrawl pass across previously-unindexed locale×tool combinations in early August; timing lines up with — but is not proven to be caused by — the crawlability/discovery batches shipped 08-08/08-09 | None. See §7 for the full breakdown and the corrected NEXT-1 framing |
| SEO-GROWTH-016 | Ireland at-home lab-test cluster: 1,041 impressions, 4 clicks, position 27.1, from a zero base | Ranking / content-intent | **INVESTIGATED — BOTTLENECK = INDEXING RAMP. No content, schema, linking or metadata work justified yet** | 2026-08-12 | `/ireland/en/lab-tests` + 16 detail pages all 200, `index, follow`, self-canonical, in sitemap, `richResults` PASS. Hub serves **14 real anchors**. Copy is **independently written, not Randox-duplicated**. Page format already matches what the SERP rewards. No cannibalization. `Product`/`Offer` schema absent but data exists. Hub meta carries a **stale €89 price** (real entry price €57) and a wrong "up to 10 days" turnaround | Detail pages first crawled 2026-08-01 → 08-08 and earned **100% of their 28-day impressions in the final 7 days**, while the hub dropped from ~479 to 11 — a hub→detail hand-off completed inside the measurement window. Cluster position improved 37.5 → 26.3 → 20.3 over 08-09/08-10/08-11 | **WAIT / MEASURE, re-measure 2026-09-08.** Full findings and early-exit triggers in §7 SEO-GROWTH-016 |
| SEO-GROWTH-017 | `/service-page/ie-medical-consultation` (legacy Wix) still self-canonical and indexed in Google | Legacy routing | **WAITING FOR GOOGLE** | 2026-08-12 | 308 → `/ireland/en/see-a-specialist` (live probe, Googlebot UA) | "Submitted and indexed", **self-canonical**, last crawl **2026-07-08** — predates nothing in particular; Google simply has not recrawled. Referring URLs include `/home` and `booking-services-sitemap.xml`, both Wix-era artefacts | Watchlist only (§6). 147 impressions / 3 clicks / position 24.1 in the current window |

### Global foundation audit (`SEO-FOUNDATION-001`, 2026-08-12)

Investigation-only pass across the shared SEO machinery. **No systemic defect with
demonstrated current search impact was found.** The five rows below are latent risks,
structured-data polish and a missing regression net — none of them is producing a
measurable loss today, and none should be dressed up as one. Full reasoning in §7.

| ID | Finding | Category | Current status | Evidence date | Production state | Google state | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-FOUNDATION-001-A | Lab-test template is the only CMS content family with **no locale-publication gate** | Indexation (latent) | **PARTIAL — LATENT RISK, no current defect** | 2026-08-12 | `tests/[testSlug]/page.tsx` never passes `noindex`; it and `tests/page.tsx` call the unfiltered `hreflangAlternates`, and `app/sitemap.ts` pushes every country locale with no eligibility filter — services, doctors, legal, `/health/*` and blog all gate. Backend `mergeHealthTestTranslation` falls back field-by-field to the English base row and does not expose `resolvedLocale` on the public payload, so the frontend *cannot* gate. **All 14 tests verified genuinely translated in cs/de/ro on production, so nothing is wrong today.** | 84 lab-test URLs indexed normally; no wrong-language page exists to be penalised | **Still open — latent.** Deliberately excluded from `SEO-FOUNDATION-002` (2026-08-13), which shipped regression coverage only. Lab-test indexability, sitemap filtering, hreflang and internal linking stay frozen until the `SEO-GROWTH-016` re-measure on ~2026-09-08 |
| SEO-FOUNDATION-001-B | `BreadcrumbList` names hardcoded in English on ~10 templates | Structured data | **PARTIAL — CONFIRMED, low severity** | 2026-08-12 | Live JSON-LD: `/czechia/cs` → `Home / Czechia`; `/czechia/cs/doctors` → `… / Doctors`; `/czechia/cs/gp-consultation-online` → `… / Online GP consultation`; `/ireland/cs/lab-tests/general-health-test` → `Home / Ireland / Lab tests / Všeobecný zdravotní test`. Country node uses the English `config.name`, not the localized name. Blog-post trails omit the country node entirely (`Home / Blog / post`), so the trail does not match the URL path. Services, doctors, tools, `/health/*`, contact, about, pricing and legal-index **are** localized | Breadcrumb trails may render English labels in non-English SERPs; no CTR effect isolated | Ranked #2 in §7; not the recommended batch |
| SEO-FOUNDATION-001-C | `/` ↔ country-home hreflang cluster declares a content-negotiated selector as five different languages | Hreflang | **CLOSED IN CODE — IMPLEMENTED, VERIFIED LOCALLY** by `SEO-FOUNDATION-004`, 2026-08-13. Classified **C — semantic/architecture defect** by `SEO-FOUNDATION-003`; no demonstrated ranking impact. Not production-verified — not deployed | 2026-08-13 | `/` declares `x-default` → `/` plus six region-tagged country homes. Each country's **default-locale** home declares its own six-locale cluster, `x-default` → itself, plus a bare `{lang}` → `/` (`app/[country]/[lang]/page.tsx`, deliberate return link). Result: two `x-default` claims across an overlapping set, the six country homes never name each other, and **`/portugal/pt` and `/brazil/pt` both claim `pt` → `/`**. 7 URLs | No indexing damage: all 7 pages `PASS` / "Submitted and indexed", `googleCanonical == userCanonical` on every one (URL Inspection, 2026-08-13). `/` remains the site's top page — 154 clicks / 1,984 impressions / 7.76% CTR / pos 18.9, queries ~entirely brand | **Done in code** (§7 `SEO-FOUNDATION-004`): `/` emits no alternates; every market keeps its own cluster and its own `x-default`; no country home points at `/`. Awaiting deploy, then a production re-check of the same seven pages |
| SEO-FOUNDATION-001-D | `app/sitemap.ts` and `app/robots.ts` have **zero** regression tests | Regression coverage | **CLOSED — IMPLEMENTED, VERIFIED LOCALLY** by `SEO-FOUNDATION-002`, 2026-08-13 | 2026-08-12 | No test file in the repo references either module. `sitemap.ts` alone decides all 1,906 submitted URLs, carries a load-bearing ordering rule (section-pages loop must stay last) and documents **four** past regressions in its own comments: 24 empty Spain URLs, 79 unsubmitted legal locale variants, 16 redirecting blog URLs, 14 withheld Ireland doctors. Everything downstream of it *is* tested (hreflang builders, doctor/service indexability predicates, blog-pagination robots, 5 legacy-redirect families, 410 gone-paths, `aggregateRating` fail-closed guard) | n/a | **Done.** `tests/unit/seo/sitemap.test.ts` (22 tests) + `tests/unit/seo/robots.test.ts` (7 tests), 2026-08-13. All four documented past regressions now have a named test. `-A` was **not** bundled — see `SEO-FOUNDATION-002` in §7 |
| SEO-FOUNDATION-001-F | Lab-test detail pages carry no sibling-test or service internal links | Internal linking | **PARTIAL — CONFIRMED, blocked until 2026-09-08** | 2026-08-12 | `/ireland/en/lab-tests/general-health-test` renders 40 unique internal links — header, footer, the 7 tool links and 2 to the `/lab-tests` hub — and **zero** to the other 13 tests and zero to any service. A service detail page renders 8 sibling service links from the same shell | Cluster is mid-ramp; no attribution possible yet | **Do not act before the SEO-GROWTH-016 re-measure.** Recorded so the option exists if the cluster stalls |
| SEO-FOUNDATION-001-E | Dead route-SEO catalogue in `lib/seo/page-seo.ts` | Maintenance trap | **DEAD CODE — no search impact** | 2026-08-12 | `ROUTE_SEO`, `pageMetadata`, `getRouteSeo` and `resolveBrandTitle` (~230 lines of route titles/descriptions) have **no consumer anywhere in the repo** — a repo-wide grep returns only the file itself and its own test. Only `buildPublicMetadata` is live. The dead copy is also stale (says "five countries", has no `/brazil` row) | 0 URLs affected | Delete when convenient. Editing it does **not** change any served title — record that before anyone tries |

### Doctor indexability

| ID | Finding | Category | Current status | Evidence date | Production state | Google state | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-DOC-001 | 135 doctor-locale URLs `noindex` because `editorialChecklist` was `null` | Indexation | **CLOSED (28 doctors backfilled)** | 2026-08-08 | `52c42d1a` | Recrawl pending | Watchlist |
| SEO-DOC-002 | 26 doctor-locale URLs `noindex` on genuinely thin bios (5 doctors) | Content | **MANUAL ACTION REQUIRED** | 2026-08-08 | Correctly `noindex`; the guard is working as designed | n/a | Clinical/editorial team must write real bios; do not weaken `isPublicDoctorRecordIndexable()` |
| SEO-DOC-003 | Jana Cyplinska 410 | Legacy routing | **CLOSED — reverted, insufficient evidence of retirement** | 2026-08-08 | `36bbd5e5` | n/a | None |

---

## 6. Indexation watchlist

Code is correct in production; Google's stored state is behind. **Do not rerun ranking
investigations on these until the last-crawl date advances past the fix date.**

| URL | Production state (verified 2026-08-12) | Google's stored state | Last crawl | Fix date | Status |
| --- | --- | --- | --- | --- | --- |
| `/portugal/pt/doctors/dr-telmo-coelho` | 200, `index, follow`, self-canonical, in sitemap | Excluded by `noindex` | **2026-07-26** | 2026-08-08 | WAIT FOR GOOGLE |
| `/pt/portugal-doctors/dr-telmo-coelho` (legacy PT) | 308 → the canonical above | Submitted and indexed, self-canonical | **2026-07-16** | — | WAIT FOR GOOGLE |
| `/ireland/sick-leave` | 308 → `/ireland/en/services/sick-certificate-ireland` | Submitted and indexed, self-canonical | **2026-07-05** | 2026-07-30 | WAIT FOR GOOGLE |
| `/ireland/es/health/sick-cert-online` | 308 → the ES service page | Submitted and indexed, self-canonical | **2026-07-25** | 2026-08-09 | WAIT FOR GOOGLE |
| `/portugal/pt/health/atestado-medico-online` | 308 → `/portugal/pt/services/baixa-medica` | Submitted and indexed, self-canonical | **2026-07-25** | 2026-08-10 | WAIT FOR GOOGLE |
| `/portugal/es/health/atestado-medico-online` | 308 → `/portugal/es/services/baixa-medica` | Indexed (legacy ES family, last observed crawl 2026-06-04) | **2026-06-04** | 2026-08-10 | WAIT FOR GOOGLE |
| `/czechia-doctors/mudr-libor-hlavaty` | 308 → `/czechia/cs/doctors/mudr-libor-hlavaty` (200, indexable) | Legacy URL still carries the ranking (573 impr / pos 11.0, 90d) | — | — | WAIT FOR GOOGLE |
| 28 doctors backfilled to `readyToIndex` | 200, indexable | Recrawl pending | — | 2026-08-08 | WAIT FOR GOOGLE |
| `/service-page/ie-medical-consultation` (legacy Wix) | 308 → `/ireland/en/see-a-specialist` | **Submitted and indexed, self-canonical** | **2026-07-08** | — | WAIT FOR GOOGLE (added 2026-08-12, SEO-GROWTH-017) |
| `/pt/about` (legacy) | 308 → `/about` | Still earning 781 impr / 8 clicks / position 8.7 | — | — | WAIT FOR GOOGLE (added 2026-08-12). Query mix is brand and **brand-collision** terms for unrelated entities ("clinic global health", "help global") — no commercial value, do not optimise |

**One watchlist item resolved this pass.** `/ireland-doctors/dr-mohammed-omar`, the
representative of the legacy Irish doctor family, was re-inspected 2026-08-12: Google
now reports `coverageState: "Page with redirect"`, verdict NEUTRAL, **last crawl
2026-08-11**, and `googleCanonical` = `/ireland/en/doctors/dr-mohammed-omar`. Google has
accepted the consolidation. GSC's *reporting* still attributes clicks to the legacy URL
(17 clicks vs. 3 on the current-shape URL in the current window), which is attribution
lag, not a live routing defect. The equivalent Czech row (`mudr-libor-hlavaty`) stays on
the list until it shows the same verdict.

Recheck cadence: **one `inspect_urls` pass every 2–3 weeks**, not per session. Next
recheck due **2026-09-01**. Escalate an item only if its crawl date has advanced past
its fix date and Google's verdict is still wrong.

---

## 7. Organic growth roadmap

### SEO-GROWTH-011 — investigated and closed, 2026-08-12

**Query×URL matrix** (28d, `query` × `page`, `contains: montañez` — broader than
"alfredo" alone, which missed the "moreno montañez" variants):

| Query | URL | Locale | Impr | Clicks | Pos |
| --- | --- | --- | ---: | ---: | ---: |
| alfredo del valle moreno montañez | `/spain/es/doctors/dr-alfredo-del-valle` | es | 10 | 0 | 6.3 |
| alfredo del valle moreno montañez | `/spain/cs/doctors/dr-alfredo-del-valle` | cs | 11 | 0 | 9.6 |
| alfredo del valle moreno montañez | `/spain/en/doctors/dr-alfredo-del-valle` | en | 2 | 0 | 9.0 |
| alfredo del valle moreno montañez | `/spain/pt/doctors/dr-alfredo-del-valle` | pt | 2 | 0 | 11.0 |
| alfredo del valle moreno montañez | `/spain/es/see-a-specialist` | es (hub) | 4 | 0 | 9.5 |
| **moreno montañez dermatologo** | `/spain/es/doctors/dr-alfredo-del-valle` | es | 4 | **3** | 5.5 |
| doctor moreno montañez | `/spain/es/see-a-specialist` | es | 4 | 1 | 4.75 |
| derma dr moreno montañez | `/spain/{de,es,pt}/*` (3 URLs) | mixed | 9 | 0 | 9.5–12 |
| doctor moreno montañez dermatologo | `/spain/es/doctors/dr-alfredo-del-valle` | es | 1 | 0 | 3.0 |
| dr moreno montañez(‑dermatologo) | `/spain/es/*` (3 URLs) | es | 12 | 0 | 7–12.7 |
| 90d only: alfredo del valle moreno montañez | `/pt/spain-doctors/dr-alfredo-del-valle` | legacy | 1 | 0 | 11.0 |

**Per-URL technical audit** (`inspect_urls` + live Googlebot-UA fetch, 2026-08-12), the
five current-shape locale URLs plus the one legacy stub:

| URL | HTTP | Robots | Self-canonical? | Google's canonical | In sitemap | hreflang cluster | `<title>` (per-locale, real translation) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/spain/es/doctors/dr-alfredo-del-valle` | 200 | index,follow | yes | matches (no consolidation) | yes | 6 locales + x-default(es) | "Dermatólogo" |
| `/spain/cs/doctors/dr-alfredo-del-valle` | 200 | index,follow | yes | matches | yes | same cluster | "Dermatolog" |
| `/spain/en/doctors/dr-alfredo-del-valle` | 200 | index,follow | yes | matches | yes | same cluster | "Dermatologist" |
| `/spain/pt/doctors/dr-alfredo-del-valle` | 200 | index,follow | yes | matches | yes | same cluster | "Dermatologista" |
| `/spain/de/doctors/dr-alfredo-del-valle` | 200 | index,follow | yes | matches | yes | same cluster | "Dermatologe" |
| `/pt/spain-doctors/dr-alfredo-del-valle` (legacy) | — | — | — | — | — | not in cluster | "Crawled – currently not indexed", last crawl 2026-03-08 |

All five current-shape URLs render at 196–202 KB with distinct real per-locale
`<title>` strings — not a thin duplicate or an untranslated fallback. They cross-link
each other through the sibling-locale switcher (the same mechanism `b8b96200` made
crawlable sitewide). The legacy `/pt/spain-doctors/...` stub sits outside the hreflang
cluster entirely, is not indexed, and drew 1 impression in 90 days — it is not a
participant in the split.

**Classification: LEGITIMATE LOCALE DISTRIBUTION. Not cannibalization, not a
wrong-locale ranking, not stale legacy residue, not a technical defect.** Canonical,
hreflang, indexability, sitemap eligibility and content completeness are all correct
on every URL Google is choosing between. Google is not confused about which URL is
canonical — it accepts each URL's own self-declared canonical, meaning it has
deliberately decided these are five distinct, valid documents, not duplicates to fold
together.

**The mechanism, evidenced by the matrix itself:** "alfredo del valle moreno montañez"
is a bare proper name — it carries no language signal, so Google has nothing to key a
locale choice on and shows impressions across several of the six alternates (2–11
impressions each, zero clicks on any of them individually). The moment the query
carries a language-bearing word, Google confidently serves exactly one URL: "moreno
montañez dermatologo" (Spanish "dermatologo") ranks only on the `es` page, position
5.5, **75% CTR**; "doctor moreno montañez" ranks only on the `es` hub page, 25% CTR.
This is the hreflang architecture working as intended, not fragmenting authority — the
zero-click impressions are Google testing locale variants against a query that gives it
no basis to pick one, which is expected and not something a canonical/hreflang change
can fix (collapsing the cluster to one canonical would break the five real, distinct
translations this doctor already has).

**No code change made or needed.** The prior Spain audit's "CTR anomaly" framing was
imprecise — CTR is fine wherever the query has language signal — but its underlying
observation (Alfredo del Valle name-search impressions look scattered) was itself
correct; this investigation just supplies the mechanism instead of leaving it a
mystery. Not repeating this check for the other five markets' doctor clusters — the
mechanism is now understood, and no other doctor's name+specialty query in the current
data showed the same zero-CTR bare-name pattern to investigate.

### SEO-GROWTH-012 — investigated and closed, 2026-08-12

**Method.** Pulled the page-dimension GSC report for the 5 days immediately before the
surge (2026-08-01→08-05, 584 pages earning impressions) and the 4 days of the surge
itself (2026-08-06→08-09, 946 pages), then diffed the two page sets.

**Finding: this is not existing pages ranking better — it is 568 pages that had zero
impressions the week before suddenly earning them.** Those newly-surfacing pages
account for 4,990 impressions of the period's growth; impressions on pages present in
*both* windows actually fell slightly (−257, unnormalized). The surge is additive, not
a lift.

**What those pages are:**

| Page type | New-page impressions | Clicks | Distinct pages |
| --- | ---: | ---: | ---: |
| `/tools/*` (calculators) | **3,726 (75%)** | 18 | 171 |
| `/lab-tests/*` | 419 | 1 | 76 |
| other (mixed, thin) | 351 | 3 | 106 |
| `/services/*` | 183 | 1 | 100 |
| `/legal/*` | 136 | 0 | 45 |
| `/blog/*` | 74 | 0 | 18 |
| `/doctors/*` | 57 | 1 | 37 |
| `/health/*` | 44 | 0 | 15 |

Three-quarters of it is the BMI/calorie/blood-pressure/ovulation/ADHD-test/due-date
calculator cluster, newly ranking across markets and locales it wasn't ranking in
before — Romanian "calculator calorii" (38 impr, pos 11), Spanish "calculadora de
calorías" family (dozens of 1–7 impr rows, pos 30–70), Portuguese, Irish English
("calorie deficit calculator ireland", 17 impr, pos 9.1), and a long non-market tail
(France, Indonesia, India, Germany, Poland, Honduras, Peru, Chile, Venezuela, Israel,
Saudi Arabia, Korea — 1 impression each). Real, diverse, human-shaped queries, not a
bot or scraper pattern.

**Position quality is better than the earlier hypothesis assumed.** The original
NEXT-1 framing ("positions 18–26") was a guess made before this data existed. The
actual new-page distribution: 1,643 impressions (33%) at position 1–10, 1,388 (28%) at
11–20, 673 (13%) at 21–30, 517 (10%) at 31–50, 769 (15%) at 51+. Six in ten of the new
impressions are top-20. They just aren't converting: 24 clicks on 4,990 impressions
(0.48% CTR) even where the position is good — expected for free-calculator queries,
which compete against dedicated tools (Omni Calculator, calculator.net) and carry no
booking intent.

**Not a code deploy.** The tool pages themselves shipped weeks earlier
(`244d629e` "free BMI calculator for every market and locale" and the following tools
commits, all pre-August). Spot-checking 4 representative surging URLs
(`inspect_urls` + live Googlebot fetch) found no defect: all PASS, `index,follow`,
self-canonical, in sitemap — and their `lastCrawlTime` clusters tightly at
2026-08-05→08-08, i.e. Google (re)crawled and started ranking them right when the
surge starts. This is consistent with — though not proven to be caused by — the
crawlability/discovery fixes shipped in the 08-08/08-09 SEO batches (sibling-locale
links, metadata-in-`<head>`, service-catalog crawlability) finally letting Google find
locale×tool combinations it hadn't reached before.

**Answering the original question list:** queries = diverse global-language calculator
terms, not brand, not AI-attributable (no evidence found either way); pages = `/tools/*`
dominant; countries = a mix of real markets (RO, ES, PT, IE) and a long non-market tail,
consistent with generic worldwide calculator demand rather than market targeting; the
sitewide average-position decline in §1 is this cluster diluting the mix, not a ranking
loss on any existing page; commercial value is minimal — these are informational,
non-transactional pages; no wrong-page/wrong-locale/legacy behavior was found in the
sample checked.

**Classification: EXPECTED, NOT A DEFECT.** No code change. This generalizes and
supersedes the Spain-only framing of the pre-existing DEFERRED "calculator/tool long
tail" entry below — it is now confirmed sitewide, not Spain-specific.

### SEO-GROWTH-013 — investigated, 2026-08-12

**Method.** Fresh `get_search_console_performance` pull, `query`×`page`, current 28d
(2026-07-12→08-09), filtered `country=esp`, cross-checked against the prior 28d window,
`inspect_urls` on the six material Spain commercial URLs, four live `get_serp_results`
pulls (`consulta medica online`, `medico online`, `dermatologia online`, `psiquiatra
online`, es-ES/Spain), and three `get_domain_overview` pulls (MGH, one generic-cluster
competitor, one specialty-cluster competitor). Live page checks on MGH's GP and
dermatology detail pages and one top-ranking competitor page.

**Baseline (commercial queries only — tools, doctor-name searches, and AI-Overview-style
long conversational strings excluded).** 292 query×page rows, 1,034 impressions, 2
clicks, weighted position ~30 across the current window. By page:

| Page | Impr | Clicks | Weighted pos | Read |
| --- | ---: | ---: | ---: | --- |
| `/spain/es` (homepage) | 493 | 1 | 28.0 | Mix of brand ("global health", 55 impr, pos 6.9) and generic commercial terms |
| `/spain/en/services/consulta-medica-online` | 194 | 0 | 40.4 | **Wrong-locale**: ranks for Spanish-language queries, no internal referrers found by Google |
| `/spain/es/services/dermatologia-especialista-online` | 93 | 0 | 42.9 | Specialty detail page |
| `/spain/es/gp-consultation-online` | 87 | 0 | 32.6 | GP **hub** (multi-service catalog, "45.000 consultas en 2025" trust bar) |
| `/spain/es/services/consulta-medica-online` | 54 | 0 | 22.1 | GP **detail** page — best-positioned page in the whole cluster |
| `/spain/es/see-a-specialist` | 29 | 1 | 26.7 | Specialist hub |

**Prior 28d window (2026-06-13→07-11) had zero impressions on any of these six URLs** —
the query×page rows in that window are almost entirely brand/navigational terms against
legacy `/es/home*` pages. `inspect_urls` shows first crawl dates of 2026-07-17→07-20 for
the three service-detail pages — meaning the commercial cluster is genuinely new to
Google's Spain rankings this window, not a page that has been stuck at position 30 for
months. Positions 20–40 partly reflect normal post-indexing ramp, not a ceiling.

**Query×URL matrix, flagship term "consulta medica online" and its generic variants
(medico online, doctor online, online consultation, …):** splits across four pages —
homepage (pos ~29, brand+generic mixed), `gp-consultation-online` hub (pos ~21–35,
literally titled "Consulta Médica Online en España"), `services/consulta-medica-online`
detail (pos ~17–40, the strongest of the three Spanish pages), and the English detail
page (pos 12–93, erratic, zero internal referrers). Classification: **SUPPORTIVE
CLUSTER** for hub vs. detail (legitimately different formats: catalog+trust-stats vs.
single-service FAQ page — not duplicate content) with a **minor INTENT SPLIT** on the
single highest-value bare query, since hub and detail both target it head-on; the
English page is **WRONG LOCALE**, weakly linked, and not a meaningful contributor.

**Live SERPs (4 queries, Spain/es).** Neither MGH page appears in the top 20 for
`consulta medica online`, `medico online`, `dermatologia online`, or `psiquiatra
online`. Generic cluster ("consulta/medico online") top 20 is dominated by **national
insurers with built-in telehealth** (Sanitas, DKV, Caser, SegurCaixa Adeslas, Aegon,
Generali, Línea Directa) plus platform-scale aggregators (Doctoralia, TopDoctors) and
dedicated telehealth brands (SaludOnNet, ZAVA, mediQuo, Virtual Clínica) — a real
authority **and** business-model wall (insurers bundle the service free with a policy).
Specialty clusters (dermatología, psiquiatría) are dominated instead by **boutique/solo
practitioners** (dermatologia-bagazgoitia.com, madriderma.com, several named
psychiatrists) plus the same two aggregators — a substantially lower wall.

**Authority spot-check** (`get_domain_overview`, ES market): MGH 5 organic
traffic/4 keywords · a small generic-cluster competitor (virtualclinica.com) 997/236 ·
the top specialty competitor (dermatologia-bagazgoitia.com, solo practitioner since
2015) 21,882/1,751. Classification: **PRIMARY** for the generic cluster, **CONTRIBUTING**
for specialty — the specialty wall is lower but still real (a decade of content and
backlinks beats a page that's three weeks old in Google's index).

**Competitor page-format comparison** (MGH dermatología detail vs.
dermatologia-bagazgoitia.com, the #2 specialty result). MGH's page is not thin —
condition list, FAQ, pricing, doctor card with collegiate registration number, GDPR/
Stripe security copy — arguably deeper clinically than the competitor's. The one
material, verified difference: the competitor displays **4.9/5, 140+ Google reviews,
with named testimonials inline**; MGH's service detail pages show none. MGH does run
Doctify (confirmed live: `Doctify` appears in the page's cookie-consent copy — "Doctify
para mostrar reseñas de pacientes" — and the GP hub page separately shows "45.000
consultas en 2025 · Valorado en Doctify") but that trust bar does **not** render on the
service **detail** pages that carry most of the commercial-cluster impressions. This is
a verified, specific gap — not a copy-the-competitor cosmetic ask.

**Internal linking** (`inspect_urls` referrers): homepage links directly to the
dermatología and GP detail pages; the GP hub is linked from homepage and other-locale
hubs. Only the English detail page shows no discovered internal referrers — consistent
with it being an unintended wrong-locale ranking rather than a linking defect. No new
internal-link problem found; SEO-GROWTH-010's "structurally healthy" finding holds.

**CTR.** Two clicks on 1,034 impressions, essentially all at position 20+. Per the
project's own CTR rule, this is not a CTR question — ranking/visibility comes first.

**Bottleneck (Step 13).** Generic cluster: **SERP COMPETITIVE WALL / AUTHORITY**
(primary) plus a minor **PAGE-ROLE** overlap between homepage, hub and detail on the
single bare head term, plus the verified **TRUST PRESENTATION** gap. Specialty cluster
(dermatología, psiquiatría): **TRUST PRESENTATION** is the most concrete, fixable,
differentiating gap — content depth and price are already competitive; authority is
CONTRIBUTING, not primary, because the specialty wall is lower and the MGH pages are
still early in their indexing ramp.

**Ranked opportunities (2 credible, not forced to 5):**

| Rank | Cluster | Page | Impr | Pos | Bottleneck | Next action |
| --- | --- | --- | ---: | ---: | --- | --- |
| 1 | Dermatología especialista | `/spain/es/services/dermatologia-especialista-online` | 93 (+dermatología-cluster total 95) | 42.9 | Trust presentation (verified gap) + minor authority | Surface the existing Doctify review signal on the service detail page template |
| 2 | Médico general / consulta online | `/spain/es/services/consulta-medica-online` | 54 direct (637 cluster-wide) | 22.1 | Authority/business-model wall (insurers) + minor page-role overlap with hub/homepage | No fix recommended now — the wall is structural; monitor only |

Psiquiatría/salud mental (34 impr, pos 62) shows the same boutique-competitor dynamic as
dermatología but the impression base is too small to justify a standalone batch —
folded into the dermatología follow-up if that action proves out.

**Classification: CLOSED — INVESTIGATED / NO STRUCTURAL DEFECT.** Substantive
conclusions:

- Generic Spain commercial cluster ("consulta/medico online") → primarily an
  authority/business-model wall (national insurers bundle telehealth free with a
  policy; platform-scale aggregators dominate the rest). Not something a page-level fix
  moves quickly.
- Homepage / GP hub / GP detail → **supportive roles**, genuinely different formats
  (brand+generic landing / catalog+trust-stats / single-service FAQ). No consolidation
  case.
- `/spain/en/services/consulta-medica-online` ranking Spanish-language queries →
  wrong-locale behavior confirmed, but minor (194 impr, zero clicks, no internal
  referrers) — not the commercial bottleneck.
- Dermatología → trust presentation (Doctify reviews rendering on hub pages but not
  service-detail pages) is the clearest fixable gap; content depth and price are
  already competitive.
- CTR → not actionable; positions are 20+ almost throughout, and the project's own rule
  says ranking comes before CTR at that depth.
- Internal linking → healthy; homepage and hubs link directly to the material pages.
- Pages are newly indexed for Spain commercial queries (first crawl 07-17→07-20, zero
  impressions the prior 28d window) — some of the ranking depth is normal post-index
  ramp-up, not a ceiling.

**Recommended next batch (ONE, not a bundle — investigation only, this task did not
implement anything):** `SEO-GROWTH-014` — a feasibility investigation into the Doctify
trust-signal gap, not an implementation batch. Starting point
`/spain/es/services/dermatologia-especialista-online`, but scoped to the shared
service-detail template/architecture, not special-cased to dermatology. Open questions
to resolve before any UI or schema change: what powers the existing Doctify
integration; whether MGH has real retrievable review/rating data through it, or the
hub's "Valorado en Doctify" line is CMS copy with no backing data; whether a
service-detail page can legitimately show practice-level (not service-level) reviews,
and whether repeating the same practice-level rating on every service page would be
accurate; whether a reusable component exists or the shared template needs to change;
locale/consent-loading implications; and whether visible-UI-only is justified where
`AggregateRating` schema would not be. Target classification: one of READY TO
IMPLEMENT — EXISTING VERIFIED REVIEW DATA / UI POSSIBLE, SCHEMA NOT JUSTIFIED / MANUAL
DOCTIFY CONFIGURATION REQUIRED / PRACTICE-LEVEL REVIEWS NOT APPROPRIATE FOR SERVICE
PAGES / NO ACTION. Implementation, if any, follows only after that classification.

### SEO-GROWTH-014 — investigated, 2026-08-12

**Method.** Static-code investigation only (no GSC/OpenSEO calls needed) — traced the
Doctify integration end to end: `frontend/components/sections/DoctifyReviews.tsx` +
`DoctifyReviewsLazy.tsx` (the widget), `frontend/lib/api/reviews-config.ts` +
`backend/src/modules/settings/settings.service.ts` +
`backend/src/routes/admin-settings.route.ts` + `backend/src/validations/
admin-settings.schema.ts` (the separate schema.org config path), `frontend/lib/seo/
structured-data.ts` (the `AggregateRating` emitter and its guard test), the two root
layouts that wire it in, and every call site of the widget components. Then a
**direct, read-only** query of the production `Setting` table for all seven `review.*`
keys (deleted immediately after) to check what, if anything, is actually configured —
no write, no schema change.

**1. What powers the integration, where it renders.** `DoctifyWidget` /
`DoctifyReviewsSection` / `DoctifyInlineRating` / `DoctifySocialProof` inject a live
`<script>`/`<iframe>` straight from `doctify.com`'s public widget API — real,
third-party-hosted data, not fabricated. Module-level constants hardcode
`TENANT = "athena-ie"` and `SLUG = "global-health-ireland"` (`DoctifyReviews.tsx:31-32`)
— there is exactly **one** practice profile wired into the whole codebase, and it is
Ireland's. `DoctifyWidgetLazy` (`variant="horizontal"`) already renders on **every**
service-detail page, including the Spain dermatología page investigated in
SEO-GROWTH-013 (`services/[serviceSlug]/page.tsx:870`) — the widget was never missing
from that page. It is also on doctor-profile pages, every country homepage,
`CountryTrustBar`, about/contact/pricing/tests/FAQ pages. SEO-GROWTH-013's live check
didn't surface it only because it's mounted client-side, near-viewport-lazy, and (see
below) usually shows a consent placeholder instead of content.

**2. Is "Valorado en Doctify" backed by live data or stored copy.** Confirmed **stored
copy only**. `"stat2Title": "45.000 consultas en 2025"` / `"stat2Subtitle": "Valorado en
Doctify."` are static translated strings in `frontend/locales/{locale}/common.json`
(the `CountryTrustBar` stat block) — a marketing claim with no live number behind it,
disconnected from both the widget and the schema-config system.

**3. Real public Doctify practice identity.** Yes for Ireland — `athena-ie` /
`global-health-ireland` is a real, live, working Doctify tenant/practice slug (the
widget calls it directly; there'd be no fallback content to see otherwise). No
Spain-specific (or any other market's) Doctify practice is configured anywhere in the
codebase — `TENANT`/`SLUG` are constants, not parameters, so no per-country profile
could be selected even if one existed today.

**4-5. Practice-level vs. service/doctor-level accuracy.** The widget is
`profileType=practice` — one aggregate for the whole practice, shown identically across
every service and every country page (when it renders at all). Practice-level review
badges shared across multiple service pages are normal in this vertical (Doctoralia and
TopDoctors both aggregate at clinic/practice level too), so practice-level itself is
**not** the problem — the problem is that the one practice wired in is Ireland's, being
shown (or, per point 7, mostly *not* shown) uniformly on Spain, Portugal and Czechia
pages alike. That is a pre-existing sitewide market-attribution issue, not something
SEO-GROWTH-013 introduced or something scoped to dermatología — flagged here for the
record, out of scope to fix under this ticket.

**6. Dynamic vs. manual data.** Two separate, disconnected systems exist:
- The **widget** (`DoctifyReviews.tsx`) is genuinely dynamic — it fetches live from
  doctify.com on every page load. No CMS entry involved, but also no way to change
  which practice it shows without a code change.
- The **schema.org path** (`reviews-config.ts` → `settings.service.ts` →
  `structured-data.ts`) is **100% manual**: an admin types a rating and count into
  `/admin/settings/reviews`, which upserts a JSON blob (`review.doctify.aggregate`,
  etc.) into a generic key/value `Setting` table. Nothing fetches or refreshes it
  automatically — confirmed by reading `admin-settings.route.ts` end to end (a plain
  Prisma upsert of exactly what the form submits, no external API call anywhere in the
  path).

**Verified current production state (direct read-only DB check, 2026-08-12):** all
seven `review.*` Setting keys — `trustpilot.businessUnitId/aggregate`,
`google.placeId/aggregate`, `doctify.clinicId/aggregate`, `primaryProvider` — return
**zero rows**. Nothing is configured for any provider, in any market. The schema path
is not "not justified for Spain" — it is not activated at all, anywhere on the site.

**7. Consent/cookie gating and crawlability.** `useDoctifyAllowed()` requires the
`thirdParty` consent category to be explicitly granted; unresolved or refused consent
renders `DoctifyPlaceholder` (a "load reviews" prompt) instead of content
(`DoctifyReviews.tsx:64-124`). Independently, `DoctifyReviewsLazy.tsx` wraps every
export with `dynamic(..., { ssr: false })` — the widget is **never** part of
server-rendered HTML, consent or no consent. Combined effect: Googlebot's rendered DOM
and any non-consenting visitor see the placeholder, not review content; a
consent-granted visitor sees Ireland's practice, in English, on a Spanish page (see
point 3's language pin — `WIDGET_LANGUAGE` is hardcoded `"en"` because Doctify returns
an empty widget for any other language on this practice).

**8. Reusable component.** Yes, fully — `DoctifyWidget`, `DoctifyReviewsSection`,
`DoctifyInlineRating`, `DoctifySocialProof`, all consent- and lazy-load-aware, already
used across the site. No new component would be needed for a UI change; only the
tenant/slug scoping would need to become configurable instead of hardcoded.

**9. All service pages vs. safely scoped.** Currently sitewide and uniform — every
service-detail page gets the identical Ireland-practice widget instance. Making it
market-accurate (Spain pages show Spain data, if it existed) is an architecture change
— `TENANT`/`SLUG` would need to move from module constants to a per-country
configuration source. Not a per-page/per-service decision; a per-market one.

**10. Is `Review`/`AggregateRating` schema justified by the data.** No — and the code
already enforces this correctly. `aggregateRatingJsonLd()` fails closed by design
(`structured-data.ts:50-58`, with its own guard test) specifically to avoid "a
fabricated or defaulted `AggregateRating` on a medical site" risking a Google
structured-data manual action. With zero `review.*` rows configured, it emits nothing
site-wide today — correct, current behavior, not a bug.

**Classification: CLOSED — MANUAL DOCTIFY CONFIGURATION REQUIRED.** Every path to a
legitimate Spain trust signal — fixing the widget's market scope or activating the
schema aggregate — is blocked on the same fact: **no one has obtained or entered a
real, attributable Spain-market rating anywhere in the stack.** This is not a code
task. A human needs to either register/verify a Spain-market Doctify practice profile
(then a small code change makes `TENANT`/`SLUG` configurable per country) or obtain a
verified aggregate rating from any provider and enter it via
`/admin/settings/reviews` (which the schema path already supports today, fully
built, currently just empty). No UI or schema change is recommended until one of those
happens. Also worth the business's attention, separately: the Ireland-practice widget
currently displays (to consenting visitors) on every market's pages uniformly — a
pre-existing minor market-attribution issue, unrelated to Spain specifically, not
actioned here.

### SEO-GROWTH-015 — implemented (revised), 2026-08-12

**Direction change, same day.** The first pass (see git history / prior session
transcript) added a per-market gate — `isDoctifyConfiguredForMarket()`, Ireland-only —
that blocked the widget on every non-Ireland market. On review, that was the wrong
fix: the business decision is to treat the single existing Doctify practice as the
site's **global** MyGlobalHealth review profile, not an Ireland-exclusive one, and
show it everywhere. The gate was **reverted** in full; this entry describes the final,
revised state, not the intermediate gated one.

**Root cause (unchanged from the original framing).** The widget always showed one
real practice (`tenant=athena-ie`, `slug=global-health-ireland`) on every page
regardless of market — that is now the *intended* behavior, not a defect, so nothing
about the widget's sitewide presence needed fixing. What did need fixing: the language
sent to Doctify was hardcoded regardless of page locale, and a second, manually-typed
copy of "the current Doctify rating/count" existed on the homepage with no mechanism
to keep it in sync with Doctify's real number.

**Existing Doctify configuration.** Unchanged — still exactly one real practice,
`tenant=athena-ie` / `slug=global-health-ireland`. Kept exactly as-is, per instruction
not to invent new identifiers; if the practice is renamed/reconfigured on Doctify's
side, that is a Doctify-dashboard action, not a code change.

**Files changed** (uncommitted):

| File | Change |
| --- | --- |
| `frontend/components/sections/DoctifyReviews.tsx` | Removed `isDoctifyConfiguredForMarket()`, the `DOCTIFY_CONFIGURED_MARKETS` set, and the `country` prop from every export — full revert of the market gate. Replaced the hardcoded `WIDGET_LANGUAGE = "en"` constant: every `language=` query param on a doctify.com URL now interpolates the actual `language` prop instead. Updated the file-level doc comment to describe the practice as the site's global review profile |
| `frontend/components/sections/CountryTrustBar.tsx` | Reverted the `country={trust.country.code}` prop addition (prop no longer exists). Its own pre-existing `trust.country.code.toLowerCase() === "ie"` wrapper is **untouched** — flagging this below, it is now the one place still gating Doctify to Ireland only, which is inconsistent with the "global profile, shown everywhere" direction; left alone because it predates this ticket and wasn't named in scope |
| `frontend/app/[country]/[lang]/{services/[serviceSlug],pricing,tests,specialist-consultation,general-consultation,doctors,prescriptions,page}.tsx`, `frontend/lib/content/doctor-profile-page.tsx` | Reverted the `country={code}` prop addition on each — 9 files, one line each |
| `frontend/app/[country]/[lang]/page.tsx` (country homepage) | Removed the `fetchPublicReviewConfig()` call and the `doctifyAggregate`-derived `★ rating / N Doctify reviews` marquee stat entirely. That stat sourced from the manually-entered `review.doctify.aggregate` Setting — exactly the "second review count that can drift from Doctify" this revision was told to stop maintaining as UI source of truth. The live `DoctifyReviewsSection` widget lower on the same page is now the only Doctify rating/count shown there |
| `frontend/locales/{en,es,pt,cs,ro,de}/common.json` | Changed `stat2Subtitle` under `gpConsultationPage.hero` and `specialistPage.hero` (2 of 3 occurrences per file — the `testsPage`/lab-results occurrence, unrelated to Doctify, was left alone) from "Reviewed on Doctify."-style text to a Doctify-free description of the same volume metric (e.g. EN: "Completed across our clinician network."). See Static trust-copy review, below |
| `frontend/app/[country]/[lang]/general-consultation/page.tsx` | Swapped the `Star` icon (rating-shaped) on that same stat to `Users` — `specialist-consultation/page.tsx`'s equivalent stat already used a neutral `Stethoscope` icon and needed no icon change |
| `frontend/components/sections/DoctifyReviews.test.ts` | Deleted — tested the now-reverted predicate |
| `frontend/components/sections/DoctifyReviews.render.test.tsx` | Rewritten: proves the widget renders with no country context on every market (nothing left gating it), proves the source no longer contains the predicate/market-set/hardcoded-`"en"` pattern, proves every `language=` URL param interpolates the `language` prop, and proves `TENANT`/`SLUG` are unchanged |

**Market-scoping behavior (revised):**

| Market | Behavior |
| --- | --- |
| Ireland | Renders — unchanged from before any of this ticket's work |
| Spain | Renders — same global profile, `language={lang}` now passed through as the page's actual locale |
| Portugal | Renders, same as Spain |
| Czechia | Renders, same as Spain |
| Romania | Renders, same as Spain |
| Brazil | Renders, same as Spain |

Whether Doctify actually has translated review content for a given `language` value is
Doctify's own data availability, not something this codebase controls or can verify
without a live check against Doctify — a non-English request may still come back
empty on Doctify's side. That would show as a lightly-populated/empty carousel, not a
missing/broken section, and is a genuinely separate question from market-scoping.

**Static trust-copy review.** Two distinct things, per the instruction to only
edit wording that pretends to be the review count:
- **Generic organization-level statement** (`frontend/locales/{locale}/{about,
  contact,tests,home}.json` — "Independent, verified reviews collected by Doctify
  from patients treated by our clinicians") — does not claim a specific number,
  **not touched**.
- **The misleading pairing** — `gpConsultationPage.hero`/`specialistPage.hero`
  `stat2Title`/`stat2Subtitle`: "45,000 consultations in 2025" paired with "Reviewed
  on Doctify." under (on the GP page) a star icon. Read together, this reads as "our
  Doctify rating is backed by 45,000 reviews," which is false — 45,000 is a
  consultation-volume claim, not a review count, and nothing in the codebase ties that
  number to Doctify's actual review total. **Fixed**: the volume claim itself stays
  (a verified company metric per the instruction's own carve-out; not re-verified in
  this pass, unchanged from before), the Doctify/rating wording is removed from that
  specific stat, and the GP page's star icon (the rating-implying part of the visual)
  was swapped to a neutral one. `CountryTrustBar`'s separate `reviewsText` ("Recomendado
  por pacientes en Doctify" etc.) is a short label directly above the live widget
  itself, not a number, so it isn't the same "pretending to be the review count"
  pattern — left alone.

**Schema.** Confirmed unchanged, and confirmed **not** to be done going forward:
`AggregateRating` JSON-LD is deliberately never populated from Doctify's data, even
though the live rating/count is now readily visible in the UI. Google's
review-snippet structured-data guidance prohibits aggregating another site's reviews
into your own site's markup, and separately restricts self-serving `Organization`/
`LocalBusiness` review markup — copying Doctify's number into `aggregateRatingJsonLd()`
would violate that regardless of how accurate the number is. No edits to
`structured-data.ts`, `reviews-config.ts`, `settings.service.ts`,
`admin-settings.route.ts`, or `admin-settings.schema.ts`; the guard test suite is
untouched and still passes. The generic 3-provider admin review-settings feature
itself is not being deprecated by this ticket — it remains available for a provider
whose data is legitimately hand-verified — only its former role as the Doctify
homepage stat's source was removed.

**Consent behavior.** Unchanged and unaffected by this revision — the market gate that
used to sit in front of the consent check is gone, so behavior for every market is
now exactly the pre-SEO-GROWTH-015 Ireland behavior: `useConsent()`, the same
placeholder copy, the same "load reviews" grant flow.

**Locale behavior.** This is the one thing actually fixed here: `language` now flows
into every doctify.com URL (`DoctifyRatingStrip`, `DoctifyWidget`,
`DoctifyInlineRating`) instead of a hardcoded `"en"`. Whether Doctify returns
populated, translated content for a given language is outside this codebase's
control — see Market-scoping behavior, above.

**Tests.** `DoctifyReviews.render.test.tsx`, rewritten, 4 tests: renders normally with
no country context (any market); source no longer contains the predicate, the market
set, or a `marketOk` reference; every `language=` URL param interpolates `${language}`
(none hardcoded); `TENANT`/`SLUG` unchanged.

**Validation:**
- `pnpm vitest run components/sections/DoctifyReviews.render.test.tsx` — 4/4 pass.
- `pnpm vitest run` (full frontend suite) — 803/805 pass; the same 2 pre-existing,
  unrelated failures as every prior pass in this workstream
  (`lib/content/booking-address-copy.test.ts`, `tests/unit/
  portal-breadcrumb-routes.test.ts`).
- `pnpm tsc --noEmit` — clean.
- `pnpm eslint` on every changed file — clean.
- `node -e "JSON.parse(...)"` on all 6 edited locale files — valid JSON.

**Flagged, not resolved in this pass (business/product decisions, not code):**
- `CountryTrustBar.tsx`'s pre-existing Ireland-only badge is now inconsistent with the
  "global profile, shown everywhere" direction. Left alone because it predates this
  ticket and wasn't named in scope — worth an explicit call on whether it should show
  on every market too.
- Whether Doctify actually returns non-English review content once `language` is
  passed through is unverified — would need a live check against Doctify with
  consent granted, which this session's headless Browser pane could not composite
  frames to observe (`visibilityState: hidden`, confirmed in the prior session's
  verification attempt).
- No `AggregateRating`/`Review` schema was added, and per the explicit direction above,
  none should be — this is a standing rule for this integration, not a TODO.

### TRUST-METRIC-001 — implemented, 2026-08-12 (boundary revised same day)

**Scope.** Replace every static "45,000 consultations" claim with a live figure: **45,000
historical consultations through 2025-12-31; live platform consultations counted from
2026-01-01 onward.** Follow-up to SEO-GROWTH-015 — same principle (one live source of
truth instead of a manually-maintained number that drifts), applied to the
consultation-volume claim instead of the Doctify rating.

**Boundary revision.** First implemented with a 2026-07-01 cutover (guessed from the
deploy date of this work, not the actual meaning of the 45,000 figure). Corrected same
day: 45,000 is the total *through end of 2025*, so the live count must start
2026-01-01 — otherwise every completed January–June 2026 consultation would be counted
in neither the historical base nor the live query and silently disappear from the
public figure. `HISTORICAL_BASE` (45,000) is unchanged; `CUTOVER_AT`/
`completedSinceCutoverWhere` renamed to `LIVE_COUNT_START`/`completedSinceLiveStartWhere`
throughout code, tests, and this document — no more "cutover" language anywhere in this
feature.

**Query design.** `backend/src/modules/appointments/consultation-count.service.ts`:
counts `Appointment` rows where `status: "COMPLETED"` AND `paymentStatus: { not:
"REFUNDED" }` AND `consultationCompletedAt: { gte: 2026-01-01T00:00:00.000Z UTC }`.
`consultationCompletedAt` (not `createdAt`, not `scheduledAt`) is set exactly when an
appointment moves to `COMPLETED` — confirmed by reading every write site
(`appointments.service.ts`, `doctor-appointments.service.ts`,
`cross-border-rx.service.ts`, all three set both fields in the same update) — so a
booking made for a future slot, or any appointment still pending, doesn't count until
it has actually happened. No explicit no-show status exists in this schema; an
unattended appointment is never marked `COMPLETED`, so it's excluded the same way. The
where-clause logic is pulled into its own pure, exported function
(`completedSinceLiveStartWhere`) specifically so it's unit-testable without a
database — 5 tests cover the status filter, the refund exclusion, the date field
choice, the exact UTC boundary instant, and an override hook for verification.

**Production verification (direct read-only query, re-run 2026-08-12 against the
2026-01-01 boundary, per the "don't deploy until verified against real statuses"
instruction):**

| Check | Result |
| --- | --- |
| `completedSinceLiveStart` (the live query, 2026-01-01 boundary) | **56** |
| `displayTotal` | **45,056** |
| Completed, non-refunded appointments dated *before* 2026-01-01 (would be uncounted by either the base or the live query) | **0** |
| Earliest `consultationCompletedAt` recorded on this platform, any status | **2026-05-23** |
| `COMPLETED` since 2026-01-01 with `paymentStatus: REFUNDED` (excluded) | 0 |

**The user's explicit double-count/gap check.** Whether the 45,000 figure itself
already includes any 2026 consultations is an external fact about the *previous*
platform's export — nothing in this database can confirm or refute it; that
confirmation has to come from whoever produced the 45,000 number. What this
database *can* confirm, and does: this platform has **zero** completed, non-refunded
consultations dated before 2026-01-01 (the earliest is 2026-05-23), so from this
platform's side there is no live-query row that could be double-counted against a
45,000 figure ending anywhere in 2025, and no January–May 2026 data quietly missing
from the count either — the two figures don't overlap in practice today regardless of
exactly where in 2025 the historical export was cut. That said, the assumption stated
by the business (45,000 = through 2025, not into 2026) is the one thing this task
cannot verify computationally and is taken as given per instruction.

**One anomaly found earlier and still flagged, not actioned** (unaffected by the
boundary change): 19 appointments currently in `REQUEST_RECEIVED` status have a
non-null `consultationCompletedAt` — status was very likely moved to `COMPLETED` and
back at some point without clearing the timestamp. The query correctly excludes them
(it filters on current `status`, not just the timestamp), so this doesn't affect the
count's correctness, but it's a data-integrity oddity worth someone's attention
separately. Historical `COMPLETED`-with-null-`consultationCompletedAt` rows (1,170 of
1,226 all-time) are expected — they predate the field being populated and are already
reflected in the 45,000 historical base.

**API + caching.** New route `GET /api/public/consultation-count` (`backend/src/
routes/consultation-count.route.ts`), `Cache-Control: max-age=3600` (1h) at the edge,
same pattern as the existing `/api/public/reviews-config`. Frontend fetcher
(`frontend/lib/api/consultation-count.ts`) uses Next's data cache with
`revalidate: 3600` + a shared `consultation-count` tag, so every page reads one cached
value instead of issuing its own DB hit. Both `PUBLIC_READ_PREFIXES` allowlists
(frontend `client.ts` / backend `rate-limit-trust.ts`) updated in lockstep, matching
the existing `reviews-config` entry's documented reasoning.

**Every static claim found and replaced** (repo-wide grep for `45,000` / `45.000` /
`45 000` after the edits returns zero matches):
- `general-consultation`, `specialist-consultation`, `tests` hero stat strips — the
  locale `stat2Title` template changed from a year-stamped static number (e.g.
  "45,000 consultations in 2025") to a `{count}+ consultations`-style template (6
  locales), filled server-side with the live total formatted in the page's own
  locale.
- `(global)/about` page's "Consultations" company fact — was a static English string;
  now built from the live total at request time, spliced into the otherwise-static
  `COMPANY_FACTS` list.
- `lib/content/country-doctors-copy.ts`'s per-country `trustCard2Subtitle` overrides
  (Ireland, Romania, Brazil, Portugal, and Spain's `es:es` — ~25 entries across 6
  locales) — same `{count}+ [word]` templating, filled in on the doctors listing page.
  The **title** half of that same trust card ("Reviewed on Doctify" etc.) is untouched
  — it's a claim, not a number, out of scope here.

**Not touched, flagged instead:**
- `frontend/components/sections/DoctorsHero.tsx` has its own hardcoded fallback —
  `"4.9 patient rating"` / `"From 2,000+ reviews"` — used only if a caller passes no
  `trustCard2Title`/`trustCard2Subtitle` at all. This is exactly the kind of
  fabricated, unverifiable rating claim the `country-doctors-copy.ts` comments
  explicitly say must never appear (EU Omnibus). It appears this fallback is
  currently unreachable in production (every call site that was traced always passes
  at least the base locale bundle's values, which are always defined), but that
  wasn't exhaustively verified against every caller, and the fallback text itself is a
  real liability sitting in the codebase regardless of whether it's currently
  reachable. Out of scope for TRUST-METRIC-001 — flagged for a separate look.
- `CountryTrustBar.tsx`'s pre-existing Ireland-only Doctify gate — unchanged, still an
  open decision from SEO-GROWTH-015.

(An unrelated `gh2-glass-forest` restyle of `DoctorProfileTemplate.tsx`, initially
flagged as an unexplained stray diff, turned out to already be its own committed
change (`94c75229`) landed between sessions — not stray, not part of this work, no
action needed.)

**Validation:** backend `node --test` on the pure-logic suite (renamed with the
boundary fix, still 6/6) — pass, no DB required. `pnpm tsc --noEmit` clean (both
frontend and backend — 7 pre-existing, unrelated backend errors on
`patientPassportNumber` in cross-border-rx/orders/cart predate this work and don't
touch any changed file). `pnpm eslint` clean on every changed file. Frontend `pnpm
vitest run` — 803/805 (the same 2 pre-existing, unrelated failures as every prior pass
this session). All 6 locale JSON files valid. Direct read-only production query,
above, re-run against the corrected 2026-01-01 boundary.

### SEO-GROWTH-016 (a) — selection brief, 2026-08-12 (`SEO-RESET-001`)

*Kept as written. This is the evidence that justified opening the batch; the answers are
in **SEO-GROWTH-016 (b)** below, and where the two disagree, (b) wins — notably on the
"striking-distance" query band, which (b) shows is substantially supplier-brand search.*

**Issue.** Ireland's at-home lab-test cluster — `/ireland/en/lab-tests` plus 16
test-detail pages — earned **1,041 impressions and 4 clicks (0.38% CTR) at an
impression-weighted position of 27.1** in 2026-07-15 → 08-11, from **exactly zero
impressions** in the prior 28 days. After the sick-cert blog article (closed, monitor
only) and the brand-driven homepage, this is the largest non-tool, non-brand cluster on
the site, and it is the only large one that has never been investigated.

**Per-page evidence** (GSC, current window, `page contains /ireland/en/lab-tests`):

| Page | Impr | Clicks | Pos |
| --- | ---: | ---: | ---: |
| `/ireland/en/lab-tests` (hub) | 490 | 3 | 18.5 |
| `…/gut-microbiome-test` | 107 | 1 | 22.2 |
| `…/full-blood-count` | 76 | 0 | 53.9 |
| `…/thyroid-function-test` | 66 | 0 | 57.3 |
| `…/vitamin-d-test` | 58 | 0 | 23.4 |
| `…/vitamin-b12-test` | 44 | 0 | 22.4 |
| `…/heart-health-cholesterol-test` | 38 | 0 | 32.5 |
| `…/amh-fertility-test` | 32 | 0 | 28.9 |
| `…/female-hormone-test` | 32 | 0 | 33.7 |
| `…/genetic-lactose-intolerance-test` | 21 | 0 | 14.9 |
| `…/genetic-coeliac-disease-test` | 19 | 0 | 16.8 |
| `…/genetic-haemochromatosis-test`, `…/psa-prostate-test` | 18 each | 0 | 48.4 / 58.6 |
| `…/general-health-test`, `…/nutrition-lifestyle-dna-test`, `…/fracture-risk-assessment-test`, `…/male-hormone-test` | 11 / 8 / 2 / 1 | 0 | 31.7 / 28.0 / 75.5 / 22.0 |

**The single clearest pattern in the query data: geo-modified queries rank, head terms
do not.** Ireland-country query×page rows, current window —

| Rank band | Example queries (impr, position) |
| --- | --- |
| Position 4–20 (striking distance) | `gut testing ireland` (2, 6.0) · `at home b12 test` (1, 8.0) · `haemochromatosis test cost ireland` (2, 9.5) · `at home lactose intolerance test` (1, 10.0) · `heart health test at home` (1, 11.0) · `gut microbiome test ireland` (4, 11.3) · `at home coeliac test` (1, 12.0) · `gut health test ireland` (1, 12.0) · `cholesterol home test kit ireland` (5, 13.0) · `b12 test at home` (3, 14.0) · `home blood tests ireland` (5, 14.2) · `home cholesterol test ireland` (3, 14.7) · `gut microbiome testing kit` (5, 15.8) · `b12 test kit` (7, 18.3) · `gut microbiome test kit` (3, 18.7) · `at home vitamin d test kit` (2, 19.0) · `at home vitamin d test` (5, 19.8) |
| Position 40–95 (not actionable) | `blood count test` (7, 81.7) · `full blood count` (5, 66.8) · `full blood count test` (7, 51.0) · `fbc blood test` (7, 58.6) · `cholesterol test` (3, 70.7) · `haemochromatosis gene test` (4, 70.5) · `blood test to check thyroid` (1, 95.0) |

**Live SERP verification** (`get_serp_results`, location 2372 Ireland / `en`,
2026-08-12, 5 keywords) — this is not a GSC-only recommendation:

| Query | MGH live rank | Who owns the top of the SERP |
| --- | --- | --- |
| `gut microbiome test ireland` | **#14** — title "Gut Microbiome Test Ireland — Home Stool Test", real snippet | easyDNA.ie (2), thehealthlab.ie (3), dublincfm.com (4), randoxhealth.com (8) — boutique clinics and functional-medicine practices |
| `cholesterol home test kit ireland` | **#16** — title "Cholesterol Home Test Ireland — Heart Health Blood Test" | webdoctor.ie (1), thenutritionstore.ie (3), letsgetchecked.ie (4), inhealth.ie (5), mccauley.ie (7), randoxhealth.com (8) — telehealth plus pharmacy retail |
| `home blood tests ireland` | not in top 20 | letsgetchecked.ie (1), randoxhealth.com (2), bloodworks.ie (3), webdoctor.ie (6), thehealthlab.ie (7) |
| `at home vitamin d test` | not in top 20 | randoxhealth.com holds the **featured snippet**; then letsgetchecked.ie, Boots, pharmacy chains |
| `b12 test kit` | not in top 20 | Boots, randoxhealth.com, Superdrug, Amazon, Medichecks — UK retail-dominated |

**Why this matters.** These are paid physical products with a real basket value, not
informational traffic — the exact opposite of the `/tools/*` calculator long tail that
DEFERRED below correctly refuses to optimise. Two pages are already on page 2 of a live
Irish SERP for exact commercial intent.

**Why it is feasible.** The competitor set on the geo-modified queries is boutique
clinics, nutrition practices and pharmacy retail — not the national-insurer/aggregator
wall that made Spain (SEO-GROWTH-013) structurally hard. The pages are technically
clean (see the ledger row) and the cluster is in an *active indexing ramp*: zero
impressions four weeks ago, position 11–16 now. Depth is partly post-index ramp, not a
ceiling — the same pattern SEO-GROWTH-013 identified for Spain's service pages.

**The one constraint to take seriously.** MGH resells **Randox** kits, and
`randoxhealth.com` ranks page-1 (and holds a featured snippet) on several of the same
queries — including position 8 for `gut microbiome test ireland`, where MGH is 14. The
supplier is the competitor. MGH's own SERP snippet reads "Order a Randox gut microbiome
home test in Ireland", so product copy overlap is a live risk, not a theoretical one.

**What must be investigated next** (investigation only — nothing below is authorized to
implement):

1. Real search volume behind the geo-modified variants (`get_keyword_metrics` /
   `research_keywords`) — the GSC impressions per query are 1–7, so the cluster's size
   is currently inferred from breadth, not from any single query.
2. Page-format match: the ranking competitors are e-commerce product pages with price,
   stock and turnaround above the fold. Compare MGH's detail-page format against two of
   them (`thehealthlab.ie`, `webdoctor.ie`) rather than assuming a content gap.
3. Whether `Product`/`Offer` schema is present and legitimately justified (real prices
   exist, so this is a genuine question, unlike the `AggregateRating` case closed in
   SEO-GROWTH-015 — **that closure stands and must not be reopened by this work**).
4. Duplicate/near-duplicate product copy against `randoxhealth.com`'s own IE product
   pages.
5. Hub vs. detail page roles: does the hub target `home blood tests ireland` while
   details take single-test terms, or do they collide? (SEO-GROWTH-013's
   hub-vs-detail framework applies directly.)
6. Internal linking from `/ireland/en`: the Ireland homepage did **not** appear in
   Google's referring-URL sample for the lab-tests hub, whereas it did for
   `/ireland/en/services/referral-and-investigations`. GSC referring URLs are a sample,
   so this is a lead to verify against the rendered homepage, **not** a finding — and
   the hub itself demonstrably links out correctly (14 anchors).
7. The SERP snippets carry a "5 days ago" / "4 days ago" datestamp on commercial
   product pages. Worth understanding where Google is sourcing a date from, but
   classify before acting.

Target classification for the follow-up: one of CONTENT / INTENT · PAGE FORMAT ·
INTERNAL LINKING · CTR / SNIPPET · AUTHORITY · BUSINESS / SERP WALL · NO ACTION.

### SEO-GROWTH-016 (b) — investigated and classified, 2026-08-12

Investigation carried out the same day the batch was selected. **No code changed.** The
selection-time framing above stands as the brief; this section is the answer.

**Method.** Fresh GSC `query`×`page` for `country=irl, page contains lab-tests` (160
rows across two pages of results), per-page 28-day and last-7-day pulls, an 18-day daily
series, 12 live `get_serp_results` pulls (location 2372 / `en`, 2026-08-12 — 5 from the
selection pass plus 7 new), 3 `get_domain_overview` pulls scoped to the IE market, raw
Googlebot-UA fetches of the hub and three detail pages plus the Ireland homepage, a
browser render of two Randox product pages (their own pages are a client-rendered SPA
shell, so raw HTML carries no product copy), and the live `sitemap.xml`.

#### 1. The finding that reframes everything: the cluster changed state mid-window

Last 7 days (2026-08-05 → 08-11) vs. the full 28 days:

| Page | 28d impr | **Last 7d impr** | Share earned in the last 7 days |
| --- | ---: | ---: | ---: |
| `/ireland/en/lab-tests` (hub) | 490 | **11** | 2% |
| `…/gut-microbiome-test` | 107 | 107 | **100%** |
| `…/vitamin-d-test` | 58 | 58 | **100%** |
| `…/vitamin-b12-test` | 44 | 44 | **100%** |
| `…/heart-health-cholesterol-test` | 38 | 38 | **100%** |
| `…/amh-fertility-test`, `…/female-hormone-test` | 32 each | 32 each | **100%** |
| `…/genetic-lactose-intolerance-test` | 21 | 21 | **100%** |
| `…/genetic-coeliac-disease-test` | 19 | 19 | **100%** |
| `…/thyroid-function-test` | 66 | 33 | 50% |
| `…/full-blood-count` | 76 | 27 | 36% |

**The hub earned ~479 of its 490 impressions in the first three weeks and then stopped;
the detail pages earned essentially all of theirs in the final week.** This is not a
decline — it is Google handing specific-test queries from the catalogue page to the
newly-indexed detail pages, exactly as those pages entered the index (first crawls
2026-08-01 → 08-08). The detail pages have **one week** of ranking history each.

Daily series for the cluster (all countries) confirms it: 08-04 recorded **zero**
impressions, 08-05 → 08-07 were 6/10/3 at positions 38–63, then 08-08 47, 08-09 194,
08-10 121, 08-11 99 — with position improving on each of the last three days
(37.5 → 26.3 → **20.3**). Nothing here has settled.

#### 2. Query clusters (Ireland searchers, current 28d)

| Cluster | Impr | Clicks | Wtd pos | Main URL | Intent class | IE modifier |
| --- | ---: | ---: | ---: | --- | --- | --- |
| **Supplier brand ("randox …")** | ~57 | 0 | ~9 | hub (mostly) | **NON-IRELAND / SUPPLIER-BRAND NOISE** | mixed |
| Gut microbiome / stool | ~75 | 0 | ~26 | `gut-microbiome-test` | HIGH-INTENT PRODUCT | often |
| Cholesterol / heart | ~25 | 0 | ~40 | `heart-health-cholesterol-test` | HIGH-INTENT PRODUCT | sometimes |
| Vitamin D | ~20 | 0 | ~22 | `vitamin-d-test` | HIGH-INTENT PRODUCT | rarely |
| B12 | ~19 | 0 | ~23 | `vitamin-b12-test` | HIGH-INTENT PRODUCT | rarely |
| Full blood count / FBC | ~22 | 0 | ~62 | `full-blood-count` | GENERIC INFORMATIONAL | no |
| Thyroid | ~9 | 0 | ~52 | `thyroid-function-test` | GENERIC INFORMATIONAL | no |
| PSA / prostate | ~10 | 0 | ~84 | `psa-prostate-test` | GENERIC INFORMATIONAL | rarely |
| Haemochromatosis | ~11 | 0 | ~70 | `genetic-haemochromatosis-test` | COMMERCIAL RESEARCH | sometimes |
| Coeliac / lactose (genetic) | ~7 | 0 | ~25 | genetic detail pages | HIGH-INTENT PRODUCT | no |
| Fertility / hormone (AMH, female) | ~15 | 0 | ~36 | `amh-fertility-test`, `female-hormone-test` | COMMERCIAL RESEARCH | sometimes |
| Generic "home blood tests" | ~15 | 0 | ~30 | hub | HIGH-INTENT PRODUCT | often |
| **Public-phlebotomy booking** (`swiftqueue blood test appointments` pos 5.5, `mater hospital blood test` pos 6, `how to book blood test appointment online` pos 5) | ~5 | 0 | ~5 | hub | **WRONG INTENT — HSE/hospital appointment booking, not kits** | yes |

**The supplier-brand cluster is the single most important correction to the selection-time
read.** Roughly a quarter of the cluster's Ireland impressions and most of the
"striking-distance" band are people searching **Randox by name**: `randox home test kit`
(8 impr, pos 6), `randox blood test` (4, 8), `randox blood test ireland` (4, 8.3),
`randox thyroid test` (5, 10.6), `randox at home blood test` (3, 7), plus ~20 more,
**every one of them zero-click**. Ranking sixth for someone who typed the supplier's
name and will click the supplier is expected, not an opportunity. The selection-time
"~60 impressions at positions 4–20 with zero clicks" figure was real but is now known to
be substantially supplier-brand and hospital-booking intent, not unmet product demand.

#### 3. Hub vs. detail role mapping

| Query | Currently ranks | Correct page type | Match |
| --- | --- | --- | --- |
| `home blood tests ireland` (pos 14.2) | hub | hub | **HUB CORRECT** |
| `randox home test kit` and family | hub | (no MGH page can satisfy it) | **WRONG INTENT — supplier brand** |
| `gut microbiome test ireland` (11.3) | `gut-microbiome-test` | detail | **DETAIL CORRECT** |
| `cholesterol home test kit ireland` (13.0) | `heart-health-cholesterol-test` | detail | **DETAIL CORRECT** |
| `stool testing ireland` (17.0) | `gut-microbiome-test` | detail | **DETAIL CORRECT** |
| `lactose intolerance test at home` (13.0) | `genetic-lactose-intolerance-test` | detail | **DETAIL CORRECT** |
| `swiftqueue blood test appointments` (5.5), `mater hospital blood test` (6) | hub | none — HSE/hospital booking | **WRONG INTENT** |
| `accredited medical testing labs` (36.2), `home blood test` (49.8) | hub | hub | HUB CORRECT, just deep |

**No cannibalization.** Not one query was found where the hub outranks its own relevant
detail page, or where both compete for the same specific-test intent. The hand-off in §1
is the opposite of cannibalization — it is Google resolving the roles correctly and
unaided.

#### 4. Live SERPs — 12 queries, Ireland/`en`, 2026-08-12

MGH appears in the top 20 for **4 of 12**:

| Query | MGH live rank | Page-1 owners |
| --- | --- | --- |
| `gut microbiome test ireland` | **#14** | easyDNA (€149), thehealthlab, dublincfm, Randox #8 (€231) |
| `microbiome test ireland` | **#15** | same set |
| `cholesterol home test kit ireland` | **#16** | webdoctor (€89), thenutritionstore, letsgetchecked, mccauley, Randox |
| `home cholesterol test ireland` | **#18** | thenutritionstore (€19.99), webdoctor (€89), letsgetchecked, pharmacies |
| `home blood tests ireland` | absent | letsgetchecked #1, Randox #2, bloodworks, webdoctor |
| `stool testing ireland` | absent | btsireland, HSE bowel screening, GastroLife, **3-result local pack** |
| `haemochromatosis test cost ireland` | absent | Randox #2 (€91), thehealthlab (€130), genetrack (€300), bloodwise (€150) |
| `at home coeliac test` | absent | pharmacy self-tests (SELFCheck ~€13–20) hold the featured snippet and #3/#8 |
| `lactose intolerance test at home` | absent | Randox #6, easyDNA, genetrack, Amazon |
| `randox home test kit` | absent | **Randox owns 4 of the top 8** |
| `at home vitamin d test` | absent | Randox featured snippet, letsgetchecked, Boots |
| `b12 test kit` | absent | Boots, Randox, Superdrug, Medichecks |

GSC's page-1 positions for the `randox …` queries are **not reproducible live** — they
are averages over 1–8 impressions with high variance. Treat them as noise, not as
rankings.

#### 5. Winning page format

Two distinct formats win, by query type. Specific-test queries (gut microbiome,
haemochromatosis, lactose) go to **e-commerce product pages** — Randox, easyDNA,
genetrack, thehealthlab — with price, sample type and turnaround above the fold.
Category queries (`home blood tests ireland`) go to **catalogue/brand landing pages**
(letsgetchecked, Randox "Health at Home"). Generic non-geo consumer queries (`at home
coeliac test`, `b12 test kit`) go to **pharmacy retail product pages** (Boots, McCauley,
Hickey's, thenutritionstore) at €10–25 price points. `stool testing ireland` additionally
returns a **local pack** — physical Irish clinics — which MGH structurally cannot enter.

MGH's detail pages already are the first format: price, sample type, turnaround and a
marker list above the fold. **Page format is not the gap.**

#### 6. Randox supplier-overlap analysis — the mandatory check

Compared MGH's `gut-microbiome-test` and `vitamin-d-test` against Randox's own product
pages, rendered.

| Dimension | Randox | MGH |
| --- | --- | --- |
| Opening copy | "Understanding your health starts with your gut. The trillions of bacteria living in your gut influence everything from digestion & immunity to mood, skin and even sleep…" | "Your gut microbiome influences digestion, immunity and mood. This kit sequences the organisms present in a stool sample you collect at home and returns a profile of your microbial composition with insights you can act on. **It is a wellbeing profile, not a diagnostic test for gut disease.**" |
| Marker list | 3 collapsed groups (Archaeal / Bacterial / Viral Composition) | 11 named markers broken out (F/B ratio, butyric-acid producers, oxalate-degrading bacteria, pathogenic bacteria…) |
| Framing | Sales-led ("Better gut health can lead to more energy, stronger immunity, clearer skin…") | Clinically hedged, plus an explicit "will this diagnose IBS or coeliac disease? **No.**" FAQ |
| Ireland-specific content | none | IMC registration, GDPR/DPC, HSE/HIQA alignment, 112 emergency guidance |

**Classification: SUPPLIER-DERIVED BUT VALUE-ADDED.** What is shared is *product fact*
— marker names, 4–6 week turnaround, stool sample, activate-and-post flow — which is
unavoidable and not duplication. The prose is independently written and, on the clinical
honesty axis, better than the supplier's. **There is no near-duplicate risk and no copy
rewrite is warranted.** This closes the largest open question from the selection pass.

#### 7. Commercial differentiation — where the real constraint is

**SEO/content differentiation is fine. The business offer is the problem, and only on
some products.**

| Product | MGH | Randox direct | Others on the SERP |
| --- | ---: | ---: | --- |
| Gut Microbiome | **€254** | **€231** | easyDNA €149 |
| Genetic Haemochromatosis | **€129** | **€91** | thehealthlab €130, bloodwise €150, genetrack €300 |
| Vitamin D | €57 | from €40 (QuickDraw total €52) | Boots/pharmacy rapid tests ~€15–25 |
| Genetic Coeliac | €129 | — | pharmacy antibody self-tests ~€13–20 (different test class) |
| General Health | **€57** | **€91** | — |
| Heart Health (Cholesterol) | **€57** | — | webdoctor €89, careoncall €89, strips €19.99 |

MGH is **cheaper** than Randox on the General Health panel and cheaper than the telehealth
competitors on cholesterol — but **more expensive than its own supplier** on the two
highest-impression specialist kits (gut microbiome +€23, haemochromatosis +€38), and the
gut page is the single most expensive result on its SERP. Compounding it, MGH's own page
states plainly: *"Your results are delivered to you directly by Randox."* The clinician
value-add — an IMC-registered doctor to interpret results — is **not included**; it is
"optional, from €45", making the full MGH proposition €299 against Randox's €231 for the
identical kit.

This is a **BUSINESS / OFFER** finding, not an SEO one, and it caps what any content or
schema work can achieve on the gut and haemochromatosis pages specifically. It does not
apply to General Health or Heart Health, where MGH is price-competitive.

#### 8. Structured data

Every lab page emits `BreadcrumbList`, `FAQPage`, `MedicalOrganization`, `WebSite`,
`ImageObject`, `ContactPoint`, `PropertyValue`; the hub adds `ItemList` with 17
`ListItem`s. **No `Product`, no `Offer`, no `AggregateOffer` anywhere** — while real
prices (€57 / €79 / €100 / €129 / €243 / €254), currency, availability, sample type and
turnaround are all present as visible page content.

**Classification: DATA AVAILABLE BUT NOT EXPOSED.** Genuinely missing and genuinely
justified by real commercial data — unlike the `AggregateRating` case, which stays closed
per SEO-GROWTH-015 and must not be revisited by this workstream. Not added in this task;
see the NOW decision for why it is not the first move either.

#### 9. Metadata and snippet — one verified defect, on the hub

The hub is the only page in the cluster ranking shallow enough to qualify under the
project's own CTR rule (position 14.7 in the last 7 days). It has two factual errors:

- `<meta name="description">`: *"Order a Randox home blood test kit … **from €89** …
  Results in **up to 10 days**."* The catalogue's actual entry price is **€57**, and the
  gut microbiome and DNA tests take **4–6 weeks**, not 10 days.
- The on-page FAQ repeats the stale figure: *"Is the doctor consultation included in the
  **€89**? No. The €89 covers the Randox test kit…"* — no product in the catalogue costs
  €89.

So the SERP snippet **understates MGH's own entry price by 36%** on a SERP where
competitors advertise price directly (webdoctor "€89", thenutritionstore "€19.99"). This
is a correctness defect first and an SEO defect second. Detail-page titles and
descriptions were checked and are accurate, intent-clear and Ireland-explicit — no issue
there. No metadata recommendation is made for anything ranking 40–90.

#### 10. Content completeness

Checked against the ranking competitors on all twelve of the review's criteria. MGH's
detail pages state what the test measures, who it is for, the sample type, the process,
turnaround, what is included, what happens after purchase, how results are delivered, that
clinical interpretation exists (and that it costs extra), that it is at-home, and that it
ships anywhere in Ireland. They additionally state **who the test is *not* for** — the
"not a diagnostic test" framing — which none of the ranking competitors do. **No content
completeness gap found.**

#### 11. Internal linking

Hub → detail: **14 real anchors**, descriptive ("Learn more : Gut Microbiome Test"),
direct to canonical URLs. No defect.

Into the hub: the Ireland homepage carries **exactly one** link to `/ireland/en/lab-tests`,
in the nav/footer structure, anchored **"Lab Test Booking"** — a phrase matching no query
in the cluster. No in-body contextual link from `/ireland/en`, and no homepage link to any
detail page. Google's referring-URL sample for the hub lists `/online-prescription`,
sibling-locale hubs and one doctor profile — not the Ireland homepage. For the detail
pages the sample lists sibling locales and the sitemap only.

**Real but minor, and explicitly not the bottleneck** — the pages are indexed and
ranking, so discovery is not blocked. Flagged for the follow-up, per the review's own
rule that an internal-link problem only counts if the commercially strongest pages are
genuinely under-supported.

#### 12. Authority

`get_domain_overview`, IE market (2372/`en`), 2026-08-12:

| Domain | Organic traffic | Organic keywords |
| --- | ---: | ---: |
| easydna.ie (ranks #2 for `microbiome test ireland`) | 5,249 | 508 |
| thehealthlab.ie (ranks #3–4) | 3,464 | 523 |
| **myglobalhealth.online** | **26** | **38** |

The two boutiques beating MGH are **133× and 202×** its Irish organic footprint —
they are not "modest-authority sites outranking MGH". Randox and LetsGetChecked are
larger again. This is a genuine **AUTHORITY** gap, though the fact that MGH reached #14
within one week of indexing shows it is not an absolute wall on the specific-test long
tail. No outreach recommended or started.

#### 13. The "5 days ago" SERP datestamp — resolved

Not from the page. Ruled out by direct inspection: no `dateModified`/`datePublished` in
any JSON-LD block, no visible date anywhere in the rendered text, no `Last-Modified`
HTTP header. Sitemap `lastmod` is also ruled out — every lab URL shares a bulk timestamp
seconds apart (`2026-08-06T01:56:40Z` … `01:57:00Z`), which would produce the *same*
displayed date on every page.

The dates match **Google's own last-crawl times exactly**: gut-microbiome crawled
2026-08-07 → shown "5 days ago"; heart-health crawled 2026-08-08 → shown "4 days ago";
SERP pulled 2026-08-12.

**Classification: LEGITIMATE FRESHNESS SIGNAL / HARMLESS.** It is Google's normal
treatment of recently-first-indexed URLs and should fade as the pages age. **Nothing to
remove** — there is no date on the page to remove.

#### 14. Bottleneck

**Primary: INDEXING RAMP.** The detail pages carry the entire cluster and have exactly
one week of ranking history; the hub→detail hand-off happened inside the measurement
window; cluster position improved 37.5 → 26.3 → 20.3 across the last three days. No
conclusion about a "ceiling" is available yet.

**Secondary, confirmed: SNIPPET / CTR — hub only.** The €89 / "10 days" errors, §9.

**Structural constraints, real but not fixable by this workstream:**
**AUTHORITY** (§12) and **BUSINESS / OFFER** (§7 — supplier undercuts MGH on the two
biggest kits and delivers the results itself).

**Also true, deliberately not prioritised now:** PRODUCT STRUCTURED DATA is genuinely
missing (§8); INTERNAL LINKING into the hub is thin (§11).

**Explicitly ruled out:** SUPPLIER COPY OVERLAP (§6 — independently written), PAGE
FORMAT (§5 — already the winning format), HUB / DETAIL INTENT and cannibalization
(§3 — resolving correctly on its own), CONTENT COMPLETENESS (§10).

#### 15. Ranked opportunities

| Rank | Test / query | Page | Impr (28d) | Pos | Bottleneck | Feasibility | Recommended action |
| ---: | --- | --- | ---: | ---: | --- | --- | --- |
| 1 | Gut microbiome / stool, Ireland | `…/gut-microbiome-test` | 107 | 22.2 | Indexing ramp, then BUSINESS/OFFER (€254 vs Randox €231, easyDNA €149) | Medium | Measure; the price question is the business's, not SEO's |
| 2 | `home blood tests ireland` and category terms | hub | 490 (11 in last 7d) | 14.7 (last 7d) | Snippet (€89 / "10 days" both wrong) | High | Correct the two factual errors — see the NOW note |
| 3 | Cholesterol / heart, Ireland | `…/heart-health-cholesterol-test` | 38 | 32.5 | Indexing ramp | Medium | Measure. MGH is price-competitive here (€57 vs webdoctor €89) |
| 4 | Vitamin D + B12 | `…/vitamin-d-test`, `…/vitamin-b12-test` | 102 | ~23 | Indexing ramp + retail wall on non-geo terms | Low–medium | Measure only |
| 5 | Product/Offer schema across the cluster | all 17 pages | 1,041 | — | Structured data absent, data available | High effort-to-value once ranks settle | Queue behind the re-measure |

Coeliac, lactose, haemochromatosis, PSA, thyroid and full-blood-count are **not** listed:
each is either priced against a different product class (pharmacy antibody strips at
€13–20 vs MGH's €129 genetic test), undercut by the supplier, or sitting at position
50–90 on generic non-Irish terms.

### SEO-FOUNDATION-001 — whole-site technical and shared-template audit, 2026-08-12

Investigation only. No code changed, nothing deployed. Scope was the **shared SEO
machinery**, not any market's copy: crawling/indexation, sitemap, canonicals, hreflang,
legacy routing, the metadata system, the doctor/service/country/blog/lab templates,
structured data, internal linking, images and automated regression coverage.

**Headline: the shared infrastructure is in good shape and no systemic defect with
demonstrated current search impact exists.** Eleven of fifteen audited systems pass on
current production evidence. The four that do not are latent risks and polish, not
losses — they are listed in §5 as `SEO-FOUNDATION-001-A` … `-E` and ranked below.

#### Completion matrix

| System | Status | Classification | Scope | Search/indexation impact |
| --- | --- | --- | --- | --- |
| Robots / indexing directives | **PASS** | NO MATERIAL DEFECT | global | Served robots.txt matches `app/robots.ts` exactly; portal/auth/API disallowed and additionally `noindex, nofollow` in-page; AI crawlers explicitly allowed; no legacy-Wix disallow (deliberate) |
| Sitemap | **PASS** | NO MATERIAL DEFECT | 1,906 URLs | 51/51 sampled URLs are 200 / `index, follow` / self-canonical. Per-locale eligibility filters in place for services, doctors, legal, `/health/*` and blog; retired and canonicalised-away slugs excluded |
| Canonicals | **PASS** | NO MATERIAL DEFECT | all templates | Self-canonical everywhere sampled, including non-default locales; query strings, trailing slashes, apex/`http` hosts and case variants all resolve to one form |
| Hreflang | **PARTIAL** | TECHNICAL | 7 URLs | `SEO-FOUNDATION-001-C`. Within-market clusters are complete and reciprocal (verified on services, doctors, lab tests, legal and the 33-URL cross-market tool cluster); only the `/` ↔ country-home seam is inconsistent |
| Legacy routing | **PASS** | NO MATERIAL DEFECT | 276 rules | Every legacy family still drawing impressions was re-probed and 308s in **one hop** to a 200 indexable target: `/online-prescriptions/*` (491 impr), `/cs/ireland-partner-clinic/*` (166), `/portugal/medical-certificate-for-driving-license` (132), `/post/*` (309), `/es/home-sp`, `/es/home`, `/home-pt`, `/cs/home-cz`, `/home-rm`, `/ireland-team`, `/home-delivery`, `/blog/{cs-slug}`, `/pt`, `/pt/about` |
| Metadata system | **PASS** | NO MATERIAL DEFECT | all templates | One correct `<title>`, description, OG and Twitter card per page in every locale sampled (en/cs/de/ro/es/pt). Length behaviour is deliberate and already closed (`SEO-METADATA-001`). Separate dead-code note: `SEO-FOUNDATION-001-E` |
| Doctor template | **PASS** | NO MATERIAL DEFECT | 343 URLs | Indexability predicate shared by page, hreflang cluster and sitemap; `Physician` schema carries council registration via `hasCredential`/`memberOf` and **only** where a real registration number exists; localized breadcrumbs; market-correct titles |
| Service templates | **PASS** | NO MATERIAL DEFECT | 642 detail + 57 hub URLs | Own `indexableServiceAlternates` cluster, `noindex, follow` for editorially incomplete rows, `Service`+`Offer`+`MedicalProcedure` schema, localized breadcrumbs, paginated catalogue crawlable (`service-catalog-crawlability.spec.ts`) |
| Country templates | **PASS** | NO MATERIAL DEFECT | 33 URLs | Localized titles/descriptions per market and locale, `MedicalOrganization` with a country-scoped `@id`, `FAQPage`, 85 unique internal links from the Ireland home |
| Blog framework | **PASS** | NO MATERIAL DEFECT | 53 + 1 URLs | One canonical per post; bare `/blog/{slug}` 308s to the country canonical; non-authored locale variants canonicalise to the real-content URL and carry `noindex`; per-locale native slugs drive the hreflang map; `Article` schema with `author`/`reviewedBy` Physician; pagination `noindex, follow`; 1–4 commercial links per post across all six markets |
| Lab/product template | **PARTIAL** | INDEXATION (latent) + STRUCTURED DATA | 84 + 12 URLs | `SEO-FOUNDATION-001-A` (no locale gate) and the already-recorded absent `Product`/`Offer` schema. Content itself is fine — all 14 tests verified genuinely translated |
| Structured data | **PASS** | NO MATERIAL DEFECT | all templates | Disciplined and fail-closed: `AggregateRating` emits nothing unless a real, positive, non-stale first-party snapshot exists; `LocalBusiness`/`MedicalClinic` deliberately **not** used for a virtual provider; specialty wrapped as a named node rather than asserted as an enum; addresses omitted for markets with no premises. Gaps are `Product`/`Offer` on lab pages and the breadcrumb-language item below |
| Internal linking | **PARTIAL** | INTERNAL LINKING | 84 URLs | `SEO-FOUNDATION-001-F`: lab-test detail pages ship **zero** sibling-test and zero service links (40 internal links, all nav/footer plus 2 to the hub), where service detail pages ship 8 sibling links. Separately, visible breadcrumb navigation exists only on `/tools/*` although `BreadcrumbList` JSON-LD is emitted on ~14 templates |
| Images | **PASS** | NO MATERIAL DEFECT | — | Template-level `alt` present on clinician, service and product imagery; decorative layers correctly `alt=""`/`aria-hidden`. No material accessibility or image-search defect found; no cosmetic audit run, by instruction |
| SEO regression tests | **GAP** | REGRESSION COVERAGE | the 1,906-URL artefact | `SEO-FOUNDATION-001-D`. Downstream helpers are well covered; the sitemap and robots route modules themselves are not covered at all |

#### Ranked findings

| Rank | Finding | Indexation risk | Scale | Likely search impact | Confidence | Effort | Regression risk |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `-A` lab-test locale gate + `-D` sitemap regression test | High if it fires, zero today | 84 URLs now, unbounded as tests/markets are added | Low today, high if a untranslated test ships | High | Small | Low |
| 2 | `-B` breadcrumb language | None | ~470 URLs carry an English node, ~390 of them non-English locales | Low | High | Medium (10 call sites) | Low |
| 3 | `-C` `/` ↔ country-home hreflang seam | Low | 7 URLs | None demonstrated | High on the flaw, low on the impact | Small | Medium — touches the site's two highest-value page families |
| 4 | `-F` lab-test sibling/service internal links | None | 84 URLs | Unmeasured | High on the gap | Small | Low, but **blocked** until the 2026-09-08 re-measure |
| 5 | `-E` dead `ROUTE_SEO` catalogue | None | 0 URLs | None | High | Trivial | None |

#### Recommended `SEO-FOUNDATION-002` — smallest high-confidence batch

The audit proposed pairing the lab-test locale-publication gate (`-A`) with the missing
sitemap/robots regression net (`-D`). **On authorization the batch was narrowed to `-D`
only** — see the delivered scope below. The lab-test gate was not implemented and remains
an open latent finding.

### SEO-FOUNDATION-002 — implemented, 2026-08-13

**Status: IMPLEMENTED · VERIFIED LOCALLY.** Not verified by a production check — this
batch has nothing to check in production, because it changed no production SEO behaviour.

**Scope delivered.** Regression coverage for the two shared SEO route artefacts, and
nothing else:

| File | Content |
| --- | --- |
| `frontend/tests/unit/seo/sitemap.test.ts` | 22 tests over `app/sitemap.ts`, driven entirely by fixtures — no backend or DB |
| `frontend/tests/unit/seo/robots.test.ts` | 7 tests over `app/robots.ts` |

**No production SEO behaviour changed.** `app/sitemap.ts`, `app/robots.ts` and every
helper they call are byte-identical; the batch adds two test files and nothing else. No
refactor or extraction was needed to make either module testable. Only the data fetchers
are mocked, so the real decision helpers (`publication-validation`,
`landing-locale-eligibility`, `health-service-canonical`, `exactLocalesForLegalType`,
`country-features`, `hreflang`, `newest-timestamp`) execute under test.

All four regressions `sitemap.ts` documents in its own comments now have a named test
rather than a happy-path URL count:

- **24 empty Spain service URLs** — a locale whose merged record fell back to the market
  default with an empty body is not submitted, while its real locale is.
- **79 unsubmitted legal locale variants** — every legal locale with its own exact-locale
  row *is* submitted; a locale that would serve the fallback body is not.
- **16 redirecting blog URLs** — a country-assigned post is absent from the bare
  `/blog/{slug}` and present under its country/locale canonicals.
- **14 withheld Ireland doctors** — doctors are read from the per-market endpoint, and a
  doctor whose editorial checklist is not ready is excluded.

Also pinned: production origin on every URL, bare-origin root with no trailing slash, no
duplicate URLs, self-referencing hreflang clusters, country-root exclusion, retired and
canonical-alias `/health/` exclusion, landing-page locale eligibility, feature-gated hub
routes, and the load-bearing `lastmod` rule — **no emitted `lastModified` may be build
time**, hubs date from their own children, and code-resident pages stay undated.

Deliberately **not** asserted: a fixed total URL count. Content totals change
legitimately; the audit's 1,906 is a snapshot, not an invariant.

**Validation.** New files 29/29 pass. Full frontend unit suite 835/837; the two failures
are pre-existing and unrelated (`lib/content/booking-address-copy.test.ts`,
`tests/unit/portal-breadcrumb-routes.test.ts`) — they fail identically without this
batch, which touches no source file. `tsc --noEmit` clean, `eslint` clean. Mutation-
checked: reverting the blog country-assignment filter and the retired-`/health/` filter
in `sitemap.ts` fails exactly the two tests that cover them.

**Policy question raised, not decided.** `app/robots.ts` disallows `/api/`, which also
covers `/api/og` — the OG image endpoint (`lib/seo/og-image.ts`). Crawlers that honour
robots.txt for image fetches (Twitterbot, facebookexternalhit) may therefore skip social
preview images. The tests pin the current policy as-is; changing it is a separate
decision, not part of this batch.

**Still open after this batch:** `-A` lab-test locale-publication gate (latent, frozen
with the rest of the lab cluster until ~2026-09-08), `-F` lab-test internal links
(frozen to the same date), `-B` breadcrumb localization, `-C` root/country hreflang seam,
`-E` dead `ROUTE_SEO` cleanup.

### SEO-FOUNDATION-003 — root ↔ country-home hreflang architecture, investigated 2026-08-13

**Investigation only. No hreflang output changed, nothing deployed.** Scope: `/` and the
six default-locale country homes. Advances `SEO-FOUNDATION-001-C`; closes nothing else.

**What `/` actually is.** A country/language entry gate at ONE URL, content-negotiated
server-side (`getSelectedLocale`: signed-in preference → `gh_locale` cookie / `x-gh-locale`
→ `Accept-Language` → `en`). Verified live: the same URL returns `<html lang>` and a
translated `<title>` for `en`, `pt`, `cs`, `ro`, `es` **and `de`**, falling back to English
for anything else (`fr` → English). It is not a market landing page: 45 KB against
645–708 KB, 14 internal links against 121–134, no `FAQPage`, no `Organization`, no service
or price content. Its GSC queries are ~entirely brand ("global health ireland", "global
health online", "my global health"). It is a **selector / navigation gateway with
brand-level global content** — not an alternate version of any country homepage.

**Live graph (Googlebot UA, 2026-08-13).** `/` emits six `{defaultLang}-{REGION}` rows,
one per market, plus `x-default → /`. Every default-locale country home emits its own
within-market cluster (`{lang}-{REGION}` for each supported locale), `x-default → itself`,
**plus one language-only row pointing back at `/`** — `en → /`, `cs → /`, `es → /`,
`ro → /`, and `pt → /` from **both** `/portugal/pt` and `/brazil/pt`. Non-default locale
variants (`/ireland/cs`, `/czechia/de`, …) emit no return link, all 200, self-canonical,
`index, follow`.

**Findings.**

1. **One URL declared as five languages.** Six pages each tag `/` with a different
   language-only code, while `/` tags itself `x-default`. A single URL cannot be the
   `en`, `cs`, `pt`, `es` and `ro` version simultaneously, so at most one of those five
   claims can be true and the annotation set is internally inconsistent. How Google
   resolves an inconsistent set is not documented precisely and is not asserted here —
   the defect is that the site is making claims it cannot all mean. This, not the
   duplicate `pt`, is the core finding.

   Note for the record: Google's documented model **does** permit a language-selector
   page to act as `x-default`. Nothing here says otherwise. The fix chosen below is
   driven by MyGlobalHealth's actual page architecture — six coherent market-specific
   locale clusters that are worth preserving — not by any claim that a selector page is
   ineligible for that role.
2. **Duplicate generic `pt`.** `/portugal/pt` and `/brazil/pt` both claim `pt → /`. Two
   pages in two different clusters assert the same tag for the same target.
3. **Semantically wrong alternate.** Because `/` is a selector rather than a market
   homepage, the country homes and `/` are not alternate versions of one another. The
   relationship should not exist, so the fix is removal, not repair.
4. **x-default overlap.** `/`'s return links transitively merge the six per-market
   clusters into one graph carrying **seven** `x-default` claims.
5. **Reciprocity is NOT the problem.** All six `/` ↔ default-home pairs are bidirectional
   today. Nothing is missing; the wrong things are present.
6. **Portuguese.** `pt-PT → /portugal/pt` and `pt-BR → /brazil/pt` are correct and should
   stay. Generic `pt` has no defensible target: `/` serves identical Portuguese copy to
   PT and BR visitors and is market-neutral, so it is not "the Portuguese version" of
   either market. `pt-PT` + `pt-BR` already cover the language; generic `pt` should not
   exist at all. The same reasoning voids generic `en`/`cs`/`es`/`ro`. Note the
   asymmetry that exposes the rule: `/` also serves German, yet no page claims `de → /`,
   because no market's default locale is German.

**Google evidence (GSC, latest complete date 2026-08-09; URL Inspection 2026-08-13).**
All seven pages `PASS` / "Submitted and indexed", `googleCanonical == userCanonical`,
crawled within the last three days. **No canonical divergence, no indexing damage, no
wrong-language homepage indexed.** `/` draws impressions from IE (110, pos 4.4), BR (78),
AE (71), RO (32), CZ (12), PT (7) — healthy multi-market brand demand, not
cannibalization. The one fragmentation signal is "global health ireland" (12 clicks,
pos 3.7, 54% CTR) served by `/` rather than `/ireland/en`, which is a brand query landing
on the brand root and not a loss.

**Classification: C — SEMANTIC / ARCHITECTURE DEFECT.** The tags parse; what they assert
is untrue. Not A (five conflicting language claims on one URL is a real defect, not merely
unconventional). Not D (code plus live behaviour fully determine what `/` is — no business
decision is required to remove a false claim).

### SEO-FOUNDATION-004 — implemented, 2026-08-13

**Status: IMPLEMENTED · VERIFIED LOCALLY.** Not production-verified — the change is
live nowhere yet. This is an architecture-correctness fix, **not** a response to any
demonstrated ranking loss: `SEO-FOUNDATION-003` found no indexing damage and `/` remains
the site's top page.

**What changed.** The global entry gate is decoupled from the market hreflang clusters.

| File | Change |
| --- | --- |
| `frontend/app/(global)/page.tsx` | `generateMetadata` no longer builds or passes `alternates.languages`; the per-market row loop and its `getPublicCountriesMerged` call are gone |
| `frontend/app/[country]/[lang]/page.tsx` | the default-locale-only `languages[defaultLocale] = "/"` return link is removed (it was the only emitter of it repo-wide) |
| `frontend/tests/unit/seo/home-hreflang.test.ts` | new, 10 tests |
| `frontend/tests/unit/seo/sitemap.test.ts` | untouched |
| `frontend/vitest.config.ts` + `frontend/tests/stubs/server-only.ts` | alias `server-only` to an empty module so a unit test can import a server page module |

`lib/seo/hreflang.ts` is unchanged — the whole fix sits at the two emitters.

**Before → after (verified on a local server against the production API):**

- `/` — was `x-default → /` plus six `{defaultLang}-{REGION}` market rows; now emits **no
  hreflang alternates at all**.
- `/portugal/pt` — was `pt → /` plus its Portugal cluster; now the Portugal cluster only
  (`pt-PT`, `cs-PT`, `de-PT`, `en-PT`, `es-PT`, `ro-PT`, `x-default → /portugal/pt`).
- `/ireland/en` — was `en → /` plus its Ireland cluster; now the Ireland cluster only.
- Same removal on `/czechia/cs` (`cs`), `/spain/es` (`es`), `/romania/ro` (`ro`),
  `/brazil/pt` (`pt`).
- `/ireland/cs` and every other non-default locale variant: unchanged, as they never
  carried the return link.

**Unchanged and re-verified:** every canonical (`/` still the bare origin with no trailing
slash), `index, follow` on all eight pages checked, locale negotiation on `/`, and the
gate's body navigation — all six market links still render.

**Validation.** New file 10/10; the SEO suite 39/39; full frontend unit suite 845/847 with
the same two pre-existing unrelated failures (`booking-address-copy`,
`portal-breadcrumb-routes`). `tsc --noEmit` clean, `eslint` clean. Mutation-checked:
restoring the return link fails 5 of the 10 new tests. Rendered metadata inspected on a
local Next server for `/`, `/ireland/en`, `/ireland/cs`, `/portugal/pt`, `/brazil/pt`,
`/czechia/cs`, `/spain/es`, `/romania/ro`.

**Deliberately not enforced by the tests:** any rule that a URL may never carry the same
hreflang value in more than one cluster. `pt-IE`, `pt-CZ`, `pt-PT` and `pt-BR` are all
legitimate and all distinct. Only the invariants this architecture actually requires are
pinned.

#### Original proposal (kept for the record)

Smallest change that removes every finding above:

- **`/`** — emit no `alternates.languages` at all. It belongs to no cluster because it is
  an alternate of nothing. Its six market links stay in the page body, where they already
  are.
- **Country homes** — delete the language-only return link. Each market keeps exactly the
  cluster it has today: `{lang}-{REGION}` for its supported locales, `x-default` → its own
  default-locale home. Six clean, fully reciprocal, non-overlapping clusters.
- **Unchanged:** `pt-PT`/`pt-BR` separation, every non-home route, `lib/seo/hreflang.ts`.

Code: `frontend/app/[country]/[lang]/page.tsx:120` (the only emitter of the return link,
repo-wide) and `frontend/app/(global)/page.tsx:30-37`. Tests: extend
`frontend/tests/unit/seo/` — no country-home cluster may contain a language-only key; no
two pages may claim the same hreflang tag for the same URL; exactly one `x-default` per
cluster, pointing inside that cluster.

Before: `/portugal/pt` → `pt → /`; `/brazil/pt` → `pt → /`; `/ireland/en` → `en → /`;
`/` → `x-default → /` + six market rows.
After: no page emits a language-only row; `/` emits no alternates; `/portugal/pt` keeps
`pt-PT → /portugal/pt` … `x-default → /portugal/pt`.

**Alternative requiring a product decision (not recommended now):** make `/` the single
global `x-default` in the textbook selector pattern. That is only fully reciprocal as the
complete 34-URL country × locale cross-product, all 34 pages emitting the same 35-row map,
and it removes each market's own `x-default`. Bigger diff, and it changes what an unmatched
visitor falls back to (the gate instead of the market home). Raise it only if the business
wants `/` to be the universal fallback in search as well as in navigation.

#### Explicitly ruled out this pass (false positives / expected behaviour)

- Soft-404s, crawl traps, indexable auth/account/admin routes, case-variant or
  trailing-slash duplicates, apex/`http` host duplication — none exist.
- Redirect chains — every probed legacy family is a single 308.
- Fallback-locale indexation leakage — legal and blog fallbacks are `noindex` **and**
  removed from their own hreflang clusters.
- Missing/duplicate H1 — one `<h1>` per page on every template sampled.
- Title/description length — closed (`SEO-METADATA-001`), not reopened.
- Missing translations — services, doctors, lab tests, blog, about and contact all serve
  genuine per-locale copy, not English fallback, on every locale sampled.
- `FAQPage` emitted broadly — eligible and useful for AI-search citation; not a policy
  violation and not a defect.

### NOW — one batch

**GLOBAL FOUNDATION. `SEO-FOUNDATION-001` is complete (this document).
`SEO-FOUNDATION-002` is implemented, verified locally and pushed to `origin/Dev-hassaan`
(`9c213b71`) — regression coverage only, no production SEO behaviour changed, not deployed.
`SEO-FOUNDATION-003` (investigation of `-C`) is complete: classification **C**.
`SEO-FOUNDATION-004` is implemented and verified locally — the global gate is decoupled
from the market hreflang clusters, canonicals/indexability/navigation unchanged — but is
**not pushed and not deployed**, so `-C` is closed in code only. Next steps: deploy `-004`,
then re-check the same seven pages in production. `-A` and `-F` stay frozen until the
2026-09-08 re-measure; `-B` and `-E` remain unscheduled.**

The old roadmap of isolated `SEO-GROWTH-*` tickets is superseded. The programme is:
**NOW** global foundation → **NEXT** only the systemic defects this audit confirmed →
**AFTER** the country waves below → **MONITOR** everything waiting on Google.

**Still running underneath it: WAIT / MEASURE — SEO-GROWTH-016 re-measure, due
2026-09-08.** That item is now a MONITOR row, not the NOW batch, but its embargo is
unchanged: do not rewrite, re-title or re-structure the Ireland lab-test cluster before
the re-measure. The indexing ramp is the dominant explanation and the cluster changed state seven days
ago. Every detail page has one week of ranking history; the hub→detail hand-off is still
in progress; cluster position improved on each of the last three days. Rewriting,
re-titling or re-structuring anything now would destroy the only clean measurement
window this cluster will ever have, and would be optimising against positions that are
still moving.

Re-measure on **2026-09-08**, which gives a full 28-day window (2026-08-12 → 09-08) in
which every detail page has been indexed throughout. Pull the same per-page and
`query`×`page` reports, then compare against the tables in §1–§2 above.

Act early only on these triggers:

| Trigger | Then |
| --- | --- |
| A detail page stabilises at position 8–15 on an Ireland-modified query with real impressions and still zero clicks | Snippet/CTR work on that one page |
| The gut or cholesterol page stalls at position 20–30 for two consecutive weeks | Re-open with the format/schema questions, not with a copy rewrite |
| Impressions collapse or pages fall out of the index | Technical, treat as an incident |
| Nothing changes materially | `Product`/`Offer` schema becomes the candidate batch (§8) — it is the only confirmed-missing, data-backed asset |

**Flagged separately, deliberately not bundled into this batch: the hub's €89 price is
wrong.** Its meta description advertises "from €89" and its FAQ answers a question about
"the €89" when the real entry price is €57 and no product costs €89; the same description
claims "results in up to 10 days" while the catalogue contains 4–6 week tests. This is a
customer-facing factual error about price and turnaround, not an SEO optimisation, and it
should be judged on those grounds. It needs explicit authorization as its own small
correctness fix; it is **not** the recommended SEO batch and should not be used as a
pretext to re-open the cluster's content.

Branch state (re-checked 2026-08-12 during `SEO-FOUNDATION-001`): `Dev-hassaan` is
**one commit ahead of `origin/Dev-hassaan`** — `26d5028c`, the `SEO-RESET-001` /
`SEO-GROWTH-016` rebaseline of this file, is committed locally and **not pushed**.
`origin/main` and `origin/Dev-hassaan` are both at `8d28b85e` and identical.
SEO-GROWTH-015 and TRUST-METRIC-001 landed in `013a198f`/`edcfe868` and are pushed.
The working tree also holds unrelated in-progress blog-UI work by a concurrent session
(`BlogCard.tsx`, `blog-index-page.tsx`, `blog-post-page.tsx`, `scope-blog-html.ts` and
its test, plus two untracked `backend/scripts/` probes) — **left untouched.**

### NEXT — up to four, evidence-backed

1. **`/ireland/en/services/referral-and-investigations` — intent-match investigation.**
   345 impressions / 3 clicks / 0.87% CTR / position 17.2, and it ranks **positions
   1–14** for a long list of exact-intent private-referral queries: `how to get a gp
   referral for private treatment` (pos 1), `cardiologist dublin` (3), `diagnostic
   appointment meaning` (6), `gp referrals to specialists` (8), `how long is a doctor
   referral letter valid for` (8), `how to ask for a referral from a doctor` (9),
   `can my gp refer me to a private specialist` (11), `doctor referral letter` (11),
   `gp referral letter ireland` (12), `referral letter online` (14, the page's 1 click).
   The open question is the reverse of the usual one: most of those queries are
   *informational*, and they are landing on a *transactional* service page. Verified
   clean technically (200, `index, follow`, self-canonical, sensible title/meta). Per-
   query impressions are 1–4, so size is unproven — that is the first thing to check.
2. **Portugal driving-licence / atestado cluster — feasibility check before any work.**
   `/portugal/pt/services/certificado-medico-carta-de-conducao` holds 460 impressions
   at position 14.2, but every head query visible in GSC sits deep: `exame medico carta
   condução` (27 impr, pos 44.6), `atestado medico` (20, 52.3), `atestado médico` (22,
   52.8), `atestado médico para carta de condução` (8, 42.3). Only the long tail is
   shallow (`atestado médico para carta de condução online`, pos 11). In Portugal this
   certificate is a regulated, in-person IMT process — **check for a BUSINESS / SERP
   WALL before assuming a content fix exists.**
3. **Czechia coverage.** Best CTR of any market (4.76%) on the smallest base, and the
   two Czech service pages that rank convert hard (`muzske-zdravi-online` 22.2% at pos
   2.2). No single cluster is yet big enough to be a batch; revisit if Czech commercial
   impressions grow.
4. **`Product` / `Offer` schema for the Ireland lab-test cluster** — promoted into NEXT
   by SEO-GROWTH-016 §8. Seventeen pages carry real prices, currency, availability,
   sample type and turnaround as visible content and expose none of it as structured
   data. Held behind the 2026-09-08 re-measure so it is not implemented against
   still-moving rankings. **Distinct from `AggregateRating`, which stays permanently
   closed** (SEO-GROWTH-015) — this is MGH's own first-party commercial data, not
   another site's reviews.

Dropped from NEXT this pass: *"Ireland lab-test cluster, other locales."* Only the `en`
cluster earns impressions, and SEO-GROWTH-016 found the `en` bottleneck to be the
indexing ramp — replicating anything into five more locales before the `en` pages have
settled would multiply an unmeasured guess.

**Removed from NEXT this pass — the homepage query-mix investigation.** It was NEXT-1
and is now demoted on fresh evidence, not deferred for lack of time. `/` draws 1,962
impressions / 146 clicks / 7.44% CTR / position 18.4 — the highest CTR of any material
page on the site. Its query mix, pulled directly (`page equals /`, current window), is
essentially all brand and brand-collision: `global health ireland` (12 clicks, 54.5%
CTR), `global health online` (8, 12.1%), `my global health` (7, 12.5%), `global health`
(5 clicks, 137 impr, pos 26.4), plus a zero-click tail of other organisations' names
(`global health care` 64 impr pos 45.0, `clinic global health ms clinic /#/ auth login`
59 impr pos 7.1, `centre for online health`, `doctors for global health`). There is no
commercial query cluster on the homepage to optimise, and the 7.44% CTR is not a CTR
problem. The **product** question the old entry bundled in — whether a country-selection
interstitial is the right destination for brand search — is unchanged and stays in
MANUAL. See DEFERRED.

This ranking is not fixed. If a future OpenSEO/GSC refresh surfaces something with
stronger evidence, it can outrank any of the above — do not carry this order forward by
default.

### AFTER GLOBAL FOUNDATION — country waves

Country-by-country optimisation starts only once the global foundation work above is
closed or explicitly waived. Wave order is set by current organic base, evidence quality
and the presence of a real commercial cluster, not by market size.

| Wave | Markets | Why this pairing | Entry condition |
| --- | --- | --- | --- |
| **COUNTRY-WAVE-001** | **Ireland + Czechia** | Ireland is the largest base (189 clicks / 6,114 impr) with the most page-level evidence already gathered; Czechia has the best CTR of any market (4.76%) on the smallest base, so incremental coverage converts hardest there | Global foundation closed **and** the SEO-GROWTH-016 re-measure done (2026-09-08). Ireland's lab cluster stays embargoed until then |
| **COUNTRY-WAVE-002** | **Portugal + Spain** | Portugal has a real but feasibility-doubtful cluster (atestado/carta de condução — head terms at 42–53, regulated in-person IMT process); Spain is a confirmed SERP/business wall (SEO-GROWTH-013). Both need a feasibility gate **before** any content work | Wave 1 measured. Run the Portugal feasibility check (NEXT-2) as the wave's first task, not after committing to it |
| **COUNTRY-WAVE-003** | **Brazil + Romania** | Smallest bases, good positions, almost no clicks — informational tool/blog traffic with no commercial page behind it in either market. Needs a commercial-page decision before an SEO batch is meaningful | Wave 2 measured, and a commercial page exists to rank |

Do not start a wave by re-running the full crawl. Each wave opens with a focused
OpenSEO/GSC pull for its two markets plus live production checks, per §0.

### MONITOR — waiting on Google or on data

Everything in §6, on the 2–3 week cadence stated there. Plus:

- **Ireland sick-cert cluster — MONITOR / MEASURE, not a work item.** Reconciled
  2026-08-12 against the completed SEO-GROWTH-008 series; do not reopen without a new
  specific defect. Current state, each point production-verified this pass:
  - Redirects corrected (SEO-GROWTH-008, live-checked in §6).
  - Intent investigation concluded **SUPPORTIVE CLUSTER** — the blog article and the
    service page serve different intent; no genuine current-page cannibalization was
    confirmed. Not an open problem.
  - Blog → service internal linking is **already in place**: the live article contains
    four links to `/ireland/en/services/sick-certificate-ireland` (three relative,
    one absolute), including contextual in-body linking — verified live 2026-08-12.
    The original audit undercounted this.
  - Service title/meta reviewed against six recurring page-1 competitors
    (SEO-GROWTH-008D): intent-clear, names Ireland explicitly, states IMC
    registration, same-day service, employer/college usage and €45 price — judged at
    least as informative as the competition. **No title/meta rewrite recommended.**
  - The confirmed format gap — a missing visible numbered process — was fixed
    (SEO-GROWTH-008E): a three-step "How it works" block is live.
    **VERIFIED BY PRODUCTION CHECK**, 2026-08-12 (three "How It Works"/step-heading
    matches in raw HTML of `/ireland/en/services/sick-certificate-ireland`).
  - Authority/housekeeping manual actions remain (see §7 MANUAL).
  - The blog's 1,616-impression / 0.68% CTR result is useful monitoring data, not
    on its own justification for another rewrite — no new on-page defect has been
    established. Do not reopen this cluster until fresh query-level evidence
    identifies a specific new problem.
- Czechia's CTR advantage (**4.76%** in the current window, down from 6.39% but still
  the best of any market) on the smallest impression base — watch whether new Czech
  service coverage sustains it.
- **Sitewide CTR and average position** (2.14% / 18.5, from 3.81% / 13.1). Confirmed
  again this pass as the tool/discovery mix shift of SEO-GROWTH-012, not a ranking
  loss; 2026-08-10 and 08-11 already show the same impression volume at positions 17.2
  and 14.7. Do not open metadata work against this number.
- **Desktop vs. mobile divergence** (desktop: more impressions than mobile, 1.68% CTR,
  position 20.7). New observation, no investigation run. Watch whether it persists once
  the tool long tail stabilises before treating it as anything.
- **Ireland lab-test cluster — INDEXING RAMP / WAIT-MEASURE.** Demoted from NOW to
  MONITOR on 2026-08-12 when `SEO-FOUNDATION-001` took the NOW slot; the classification
  and the embargo are unchanged. Re-measure **2026-09-08** with the early-exit
  triggers in §7 SEO-GROWTH-016. Track per-page position and whether the hub→detail
  hand-off completes. Do not rewrite, re-title or re-link anything in the meantime —
  that includes `SEO-FOUNDATION-001-F` (the missing sibling/service links), which is
  recorded but deliberately blocked until this re-measure.
- **Randox as both supplier and competitor.** ~57 Ireland impressions in the current
  window are supplier-brand searches (`randox home test kit`, `randox blood test
  ireland`, …) that MGH ranks for at GSC positions 6–13 with **zero clicks** and which
  are not reproducible on the live SERP. Expected, not an opportunity. Watch only for
  whether Randox's own IE presence displaces MGH on non-brand product terms too.
- **`/spain/en/services/consulta-medica-online`** — the known wrong-locale page has
  grown from 194 impressions / 0 clicks to **518 / 7** at position 23.2. Still not the
  Spain bottleneck (SEO-GROWTH-013 stands), but it is no longer negligible; if it keeps
  growing it becomes a real WRONG LOCALE item rather than a footnote.

### MANUAL — needs a business or operator decision

| Item | Why it is manual |
| --- | --- |
| Publish the Google OAuth consent screen | It is still in Testing, which caps refresh tokens at 7 days. The stated expiry (~2026-08-10) has passed, so the local `claude-seo` scripts may already be dead. OpenSEO MCP authenticates separately and is unaffected — all GSC data in this file came through it. |
| Write real bios for 5 doctors (26 `noindex` URLs) | Clinical/editorial content, correctly gated. See SEO-DOC-002. |
| Legacy Wix referrer outreach | `wix.to` alone holds 195 backlinks to old URLs. Ask high-value external referrers to point at current URLs. **Do not buy or build links for a medical site.** |
| Answer the homepage-destination question | Product call, not an SEO one. The SEO half of the old NEXT-1 is now closed on evidence (see NEXT, "Removed from NEXT this pass"); what remains is purely the product question of whether a country-selection interstitial is the right landing experience for brand search. |
| Decide the lab-kit pricing position against Randox | SEO-GROWTH-016 §7: MGH sells the **same Randox kits** at €254 (gut microbiome) and €129 (genetic haemochromatosis) where Randox sells them direct at €231 and €91, on SERPs where Randox itself ranks — and MGH's own page states results are delivered by Randox. MGH is cheaper on General Health (€57 vs €91) and on cholesterol vs telehealth rivals, so this is product-specific, not blanket. Whether to reprice, bundle the €45 clinician interpretation into the kit price, or accept the position is a commercial call. No SEO work can offset it. |
| Fix the hub's stale €89 price and "up to 10 days" turnaround | SEO-GROWTH-016 §9. Customer-facing factual error (real entry price €57; catalogue includes 4–6 week tests), appearing in both the SERP snippet and an on-page FAQ. Small, but it is a correctness decision rather than an SEO optimisation, and it was deliberately **not** bundled into the NOW batch. Needs explicit authorization. |
| Decide whether `CountryTrustBar`'s Ireland-only Doctify badge should show on every market | SEO-GROWTH-015 made the widget global everywhere else on the site; this one pre-existing `=== "ie"` gate is now the only inconsistency. Product/business call, not a code task — see §7 SEO-GROWTH-015. |

### DEFERRED — low value or blocked

- **Calculator/tool long tail — now confirmed sitewide, not Spain-only** (see
  SEO-GROWTH-012). BMI, calorie, blood-pressure, ovulation, ADHD-test and due-date
  calculators draw thousands of impressions across every market and locale, roughly a
  third of them at genuinely good positions (top 10–20), but convert at 0.48% CTR
  because the intent is informational/free-tool, not medical-service. Real impressions,
  no commercial value, high effort to move against dedicated calculator sites. This is
  the largest single component of the CTR dilution in §1 and should be understood as
  such rather than optimised.
- **Homepage query-mix / CTR investigation** — demoted from NEXT-1 on 2026-08-12 with
  the evidence recorded in §7 NEXT. The homepage's traffic is brand plus other
  organisations' brand collisions; its 7.44% CTR is the site's best. Nothing to
  optimise. Reopen only if a commercial (non-brand) query cluster appears on `/`.
- **Brand-collision queries** (`clinic global health`, `clinic.globalhealth`, `help
  global`, `global health care`) — several hundred impressions across `/`, `/pt/about`
  and `/about` at positions 7–9 with near-zero CTR. These are navigational searches for
  *other* organisations. Impressions are real; intent is not ours. Not a CTR defect,
  not addressable.
- **Ireland lab-test copy rewrite / supplier-differentiation rewrite** — investigated
  and rejected on evidence (SEO-GROWTH-016 §6). MGH's product copy is independently
  written and clinically more careful than Randox's own. There is no duplication to fix.
  Do not reopen without a specific new duplication finding.
- **Non-geo consumer test terms** (`b12 test kit`, `at home vitamin d test`, `at home
  coeliac test`, `cholesterol test`, `full blood count`) — MGH is absent from the top 20
  live and sits at positions 40–90 in GSC. These SERPs are owned by pharmacy retail at
  €13–25 price points against MGH's €57–129 lab kits. Different product class, not a
  ranking problem.
- **`stool testing ireland` and other local-pack queries** — the SERP returns a
  three-result local pack of physical Irish clinics. A remote service cannot enter it.
- **SEO-METADATA-005**, the CMS title inconsistency.
- `llms.txt` — optional and ignored by Google Search.
- Mass submission to the Indexing API — 200/day cap and officially JobPosting/
  BroadcastEvent-only. Abuse risks key revocation.

### CLOSED — do not reopen without new evidence

SEO-001 through SEO-008, SEO-METADATA-001 through 004, SEO-GROWTH-001 through 006,
SEO-GROWTH-008, SEO-GROWTH-009, SEO-GROWTH-010, SEO-GROWTH-011, SEO-GROWTH-012,
SEO-GROWTH-013, SEO-GROWTH-014, SEO-DOC-001, SEO-DOC-003. See §5 for each.
(SEO-GROWTH-013 closed INVESTIGATED / NO STRUCTURAL DEFECT. SEO-GROWTH-014 closed
GLOBAL DOCTIFY APPROACH CONFIRMED — its finding (no per-market Doctify profile exists)
stands; the follow-up decision was to use the one existing profile globally, carried
out in SEO-GROWTH-015, not to wait for per-market configuration. Do not reopen either
investigation without new evidence.)

---

## 8. Data limitations

- **GSC lags ~3 days.** As of the 2026-08-12 `SEO-RESET-001` pull the last date with
  any data is **2026-08-11**; no window in this file extends past it. 2026-08-10 and
  2026-08-11 were pulled with `dataState=all` and may still be incomplete — the
  position improvement on those two days should be re-read next pass before being
  relied on.
- **Adding dimensions to a GSC query changes the totals.** Observed directly this pass:
  `/portugal/en/services/baixa-medica` returns 196 impressions under `dimensions:
  ["page"]` but only 21 under `["page","country"]` for the identical window and filter.
  Single-dimension pulls are the trustworthy ones; treat any multi-dimension row as a
  lower bound on volume and never mix the two in the same comparison. Query-dimension
  pulls additionally omit anonymised rare queries, which is why per-page query lists
  sum to far less than the page's own impression total.
- **GA4 is not connected to the OpenSEO project.** `get_search_opportunities`, which
  joins GSC positions to GA4 business outcomes, is therefore unavailable. Every
  opportunity here is scored on GSC evidence alone, with no conversion data behind it.
  Separately, the GA4 property (`547083375`) has a consent-gated tag with a known data
  gap; treat its history as unreliable.
- **Google's index state is not production state.** Six of the eight watchlist rows have
  last-crawl dates that precede their fix date by 2–5 weeks. Any conclusion drawn from
  those rows about the *site* rather than about *Google* is invalid.
- **Backlink figures are DataForSEO estimates**, not Search Console link data, and carry
  at least one confirmed artefact (`brokenPages: 666`).
- **`SEO-FOUNDATION-001` ran no new full crawl either.** It used the live sitemap
  (1,906 URLs) as the URL inventory, a 51-URL stratified sample of it for status /
  robots / canonical verification, ~35 further targeted Googlebot-UA probes across every
  template family and legacy family with impressions, one GSC `["page"]` pull, and
  direct source inspection of the frontend and backend. That is deliberately **not** a
  crawl: the sitemap is the artefact under audit, so anything it omits would also be
  omitted from this sample. A full crawl remains the right instrument for discovering
  URLs the sitemap does not know about — it was judged unnecessary here because no
  finding pointed at one.
- **No full crawl was run this pass**, deliberately. Technical state in §3 comes from
  targeted live checks plus the 2026-08-09 crawl records. A full crawl is due only on
  the trigger conditions in §0. `SEO-RESET-001` added targeted live Googlebot-UA probes
  of six URLs and `inspect_urls` on seven; nothing in either suggested a global
  technical problem, which is why no crawl was triggered.
- **GSC `referringUrls` is a sample, not an inventory.** Three lab-test detail pages
  omit their own hub from that list while the hub demonstrably links to all 14 of them
  in raw HTML. Never conclude "not internally linked" from `inspect_urls` alone.
- **Country windows are searcher country.** Language is not market; a Portuguese-language
  page can serve a Brazilian or a Portuguese searcher.

---

## 9. Document map

| File | Purpose | Last meaningful update | Authoritative? |
| --- | --- | --- | --- |
| `docs/plans/seo-control-state.md` | **This file** — ledger, roadmap, watchlist, baseline | 2026-08-12 | **CURRENT — canonical** |
| `docs/plans/seo-indexation-plan-2026-07-28.md` | GSC indexation audit and carry-out plan | 2026-08-03 | PARTIALLY STALE — design decisions in §2 and the "explicitly not doing" list in §5 remain binding; all counts and scheduled checks superseded |
| `docs/audits/seo/commercial-opportunity-matrix-2026-08-10.md` | Commercial-query opportunity matrix | 2026-08-10 | HISTORICAL — findings promoted into §7 |
| `docs/audits/seo/ranking-growth-batch-2026-08-10.md` | Structural fixes + legacy-URL consolidation report | 2026-08-10 | HISTORICAL — implementation record |
| `docs/audits/seo/ranking-growth-batch-2026-08-09.md` | First ranking-growth batch | 2026-08-09 | HISTORICAL |
| `docs/audits/seo/health-landing-locale-integrity-2026-08-09.md` | `/health/*` locale integrity, doctor→service links | 2026-08-09 | HISTORICAL — implementation record |
| `docs/audits/seo/internal-discovery-crawl-depth-2026-08-09.md` | Recursive production crawl, orphan recovery | 2026-08-09 | HISTORICAL — note its own mid-analysis correction (1 orphan, not 306) |
| `docs/audits/seo/screaming-frog-technical-indexation-2026-08-09.md` | Screaming Frog technical defects | 2026-08-09 | HISTORICAL — the 33-URL head cluster is fixed |
| `docs/audits/seo/sick-cert-signal-consolidation-2026-08-09.md` | Sick-cert ghost-URL resolution | 2026-08-09 | HISTORICAL — redirects shipped; ranking half is the NOW batch |
| `docs/audits/seo/legacy-redirect-recovery-2026-08-08.md` | 478-URL legacy redirect chain audit | 2026-08-08 | HISTORICAL |
| `docs/audits/seo/doctor-indexability-migration-gap-2026-08-08.md` | Doctor `noindex` root-cause inventory | 2026-08-08 | HISTORICAL — 28 backfilled, 5 remain manual |
| `docs/audits/seo/site-audit-2026-07/` | Full site audit, July 2026 | 2026-07 | HISTORICAL |
| `myglobalhealth.online-audit/` | Original full audit and action plan | 2026-07 or earlier | OBSOLETE as status; keep as evidence |
| `docs/plans/ireland-internal-linking-seo.md` | Ireland internal-linking plan | 2026-07 | PARTIALLY STALE |
| `frontend/docs/template-route-map.md`, `frontend/docs/public-pages-completeness-audit.md` | Route inventories | 2026-08 | CURRENT for routes; both already carry the `/post/[slug]` correction |

No SEO document has been deleted. Historical files carry a header pointing here.
