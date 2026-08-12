# SEO control state — canonical

**This file is the single source of truth for the SEO workstream.** It carries the
remediation ledger, the organic-growth roadmap, and the indexation watchlist. Every
other SEO document in this repository is historical evidence, not current status.

Rebaselined: **2026-08-12** (task `SEO-CONTROL-001`).
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

Extraction date **2026-08-12**, via `get_search_console_performance` (Search Console
Search Analytics). GSC lags ~3 days, so the most recent window ends 2026-08-09. Windows
are 29 days each so that the current and prior periods are directly comparable.

| Window | Dates | Clicks | Impressions | CTR | Avg position |
| --- | --- | ---: | ---: | ---: | ---: |
| Current 28d | 2026-07-12 → 2026-08-09 | **718** | **30,387** | **2.36%** | **18.8** |
| Prior 28d | 2026-06-13 → 2026-07-11 | 407 | 10,819 | 3.76% | 12.4 |
| Last 3 months | 2026-05-09 → 2026-08-09 | 1,583 | 51,091 | 3.10% | 16.0 |

**Read this correctly.** Clicks grew 76% period-over-period, which is real. Impressions
grew 181%, which is faster, so CTR fell and average position deepened. The impression
surge is concentrated in the final days of the window (2026-08-06: 1,477 · 08-07: 1,937 ·
08-08: 2,099 · 08-09: 2,723) and arrives at positions 18–26, i.e. deep-SERP impressions
rather than lost rankings. Nothing in the click series suggests a ranking loss. The
open question is what began serving roughly 20,000 additional deep impressions — see
roadmap item NEXT-2.

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
2026-07-12 → 2026-08-09; prior window 2026-06-13 → 2026-07-11.

| Country | Clicks | Impr | CTR | Avg pos | Trend | Strongest page type | Biggest opportunity |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| Ireland | 186 | 5,355 | 3.47% | 24.0 | clicks +81% (103), impr +297% (1,348), CTR down from 7.64%, pos from 14.4 | Doctor profiles (legacy `/ireland-doctors/*` still out-earning current-shape URLs) | The sick-cert cluster: the blog article holds 1,616 impressions at pos 15.8 / 0.68% CTR while the transactional service page sits far deeper |
| Portugal | 142 | 3,555 | 3.99% | 19.7 | clicks +43% (99), impr +157% (1,385), CTR from 7.15%, pos from 9.4 | Doctor profiles (`dr-telmo-coelho` at 20–22% CTR) and `/portugal/pt` | Driving-licence and atestado service pages rank 16–45 despite exact intent match |
| Czechia | 94 | 1,470 | 6.39% | 13.8 | clicks +45% (65), impr +222% (456), CTR from 14.25%, pos from 7.6 | Czech-language service pages (`muzske-zdravi-online` pos 2.0, 23.5% CTR) | Best CTR of any market on the smallest impression base — more Czech service coverage converts efficiently |
| Spain | 73 | 3,063 | 2.38% | 22.9 | clicks +115% (34), impr +454% (553), CTR from 6.15%, pos from 13.9 | Doctor profiles (`dr-tomas-ruiz-palacios` 50% CTR at pos 2.25) | Commercial pages underperform; cross-locale doctor cannibalization; a large zero-value calculator long tail inflating impressions |
| Brazil | 26 | 2,466 | 1.05% | 10.5 | clicks +189% (9), impr +191% (848), CTR flat, pos improved from 11.2 | Tools (`/brazil/pt/tools/calorie-calculator`, 803 impressions) | Good positions, almost no clicks — traffic is informational tool traffic with no commercial page behind it |
| Romania | 16 | 1,095 | 1.46% | 20.5 | clicks +433% (3), impr +1,017% (98), CTR from 3.06%, pos from 10.9 | Tools | Smallest market; no commercial page ranks yet |

Non-market traffic worth noting: the United Kingdom draws 2,777 impressions at position
34.8 for 22 clicks, and the United States 3,604 impressions at position 12.1 for 15
clicks. Neither is a served market. This is a meaningful share of the impression
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
| SEO-GROWTH-010 | Spain market audit | Market analysis | **CLOSED as an audit; findings promoted to the roadmap** | 2026-08-12 | n/a | n/a | See §7 NEXT-1 and NEXT-3. **No standalone Spain audit document exists in the repository** — the audit was conducted in-session; its conclusions are recorded in §6 and §7 |

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

Recheck cadence: **one `inspect_urls` pass every 2–3 weeks**, not per session. Next
recheck due **2026-09-01**. Escalate an item only if its crawl date has advanced past
its fix date and Google's verdict is still wrong.

---

## 7. Organic growth roadmap

### NOW — one batch

**SEO-GROWTH-011 — Spain doctor cross-locale ranking-fragmentation investigation.**

The query "alfredo del valle moreno montañez" returns roughly **five** MGH URLs for
the same doctor — `/spain/{cs,en,es,pt}/doctors/dr-alfredo-del-valle` plus
`/spain/es/see-a-specialist` — for 24+ combined impressions and **zero clicks**, best
position ~6.3. The same doctor converts at 60–67% CTR when a single URL ranks
("moreno montañez dermatologo": 3 clicks / 5 impressions). The prior Spain audit
diagnosed this as a CTR anomaly; that diagnosis is **superseded pending investigation**
— the fresh query×page pull suggests ranking fragmentation or cross-locale duplication
instead, but this is not yet confirmed cannibalization.

This is an **investigation, not a fix**. Before any code change, establish: exact URLs
receiving impressions, their locales, the query distribution across them, canonical
state, hreflang state, sitemap eligibility, indexability, current internal links,
whether each URL carries legitimate localized doctor content, and whether Google is
alternating which URL it serves for the same query. Only once that evidence exists does
this become a scoped fix (possibly the same defect class as the `/health/` locale
integrity fix, `db318dfe` — but that is a hypothesis to test, not a conclusion to act
on). Then audit the other five markets' doctor clusters for the same pattern.

Evidence: GSC query×page pull, 2026-08-12. Effort: investigation, low. Confidence:
medium — real signal, root cause not yet established.

### NEXT — up to three, evidence-backed

1. **Diagnose the impression surge.** Roughly 20,000 additional impressions appeared
   from 2026-08-06 onward at positions 18–26, with no matching click growth. Determine
   whether this is newly-indexed calculator/tool pages, out-of-market UK/US traffic, or
   a genuine new ranking surface, and decide whether any of it is worth pursuing.
   Investigation only, no code, before it can be prioritised.
2. **Spain commercial-page underperformance.** "consulta medica online" and its variants
   split across `/spain/en/services/consulta-medica-online` (504 impr, pos 23.2),
   `/spain/es/services/consulta-medica-online`, and the legacy-shaped
   `/spain/es/gp-consultation-online`. Consolidate internal links onto the ES-locale
   service page. Related: `/spain/es` itself draws 898 impressions at position 29.5 for
   5 clicks.
3. **The homepage `/`.** 1,984 impressions / 154 clicks / position 18.9 in the current
   window — by far the largest single earning page. The 2026-07-28 plan scheduled a CTR
   check on head terms from 2026-08-04 that was never carried out. It is now overdue,
   and the open product question behind it (is a country-selection interstitial the
   right destination for "global health clinic"?) is still unanswered.

This ranking is not fixed. If a future OpenSEO/GSC refresh surfaces something with
stronger evidence, it can outrank any of the three above — do not carry this order
forward by default.

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
- Czechia's CTR advantage (6.39%, the best of any market) on the smallest impression
  base — watch whether new Czech service coverage sustains it.

### MANUAL — needs a business or operator decision

| Item | Why it is manual |
| --- | --- |
| Publish the Google OAuth consent screen | It is still in Testing, which caps refresh tokens at 7 days. The stated expiry (~2026-08-10) has passed, so the local `claude-seo` scripts may already be dead. OpenSEO MCP authenticates separately and is unaffected — all GSC data in this file came through it. |
| Write real bios for 5 doctors (26 `noindex` URLs) | Clinical/editorial content, correctly gated. See SEO-DOC-002. |
| Legacy Wix referrer outreach | `wix.to` alone holds 195 backlinks to old URLs. Ask high-value external referrers to point at current URLs. **Do not buy or build links for a medical site.** |
| Answer the homepage-destination question | Product call, not an SEO one. See NEXT-4. |

### DEFERRED — low value or blocked

- **Spain calculator/tool long tail.** BMI, calorie, ovulation and due-date calculators
  rank at positions 40–65 across dozens of Spanish queries with essentially zero clicks.
  Real impressions, no commercial value, high effort to move. This is a meaningful part
  of the CTR dilution in §1 and should be understood as such rather than optimised.
- **SEO-METADATA-005**, the CMS title inconsistency.
- `llms.txt` — optional and ignored by Google Search.
- Mass submission to the Indexing API — 200/day cap and officially JobPosting/
  BroadcastEvent-only. Abuse risks key revocation.

### CLOSED — do not reopen without new evidence

SEO-001 through SEO-008, SEO-METADATA-001 through 004, SEO-GROWTH-001 through 006,
SEO-GROWTH-009, SEO-GROWTH-010, SEO-DOC-001, SEO-DOC-003. See §5 for each.

---

## 8. Data limitations

- **GSC lags ~3 days.** No window in this file extends past 2026-08-09.
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
- **No full crawl was run this pass**, deliberately. Technical state in §3 comes from
  targeted live checks plus the 2026-08-09 crawl records. A full crawl is due only on
  the trigger conditions in §0.
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
