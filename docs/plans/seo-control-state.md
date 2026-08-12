# SEO control state — canonical

**This file is the single source of truth for the SEO workstream.** It carries the
remediation ledger, the organic-growth roadmap, and the indexation watchlist. Every
other SEO document in this repository is historical evidence, not current status.

Rebaselined: **2026-08-12** (task `SEO-CONTROL-001`, latest evidence pass
`SEO-GROWTH-013`) — this date is when the control-state document and its evidence were
last refreshed, **not** the latest date GSC has data for. GSC lags ~3 days; every GSC
window in this file ends on the most recent complete date available at extraction time
(2026-08-09 for the §1/§2 baseline), never on the rebaseline date itself.
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
08-08: 2,099 · 08-09: 2,723). Nothing in the click series suggests a ranking loss.

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
| SEO-GROWTH-010 | Spain market audit | Market analysis | **CLOSED as an audit; findings promoted to the roadmap** | 2026-08-12 | n/a | n/a | See SEO-GROWTH-013 (Spain commercial-service underperformance) and the closed SEO-GROWTH-011 doctor-locale investigation. **No standalone Spain audit document exists in the repository** — the audit was conducted in-session; its conclusions are recorded in §6 and §7 |
| SEO-GROWTH-013 | Spain commercial-service underperformance | Ranking | **CLOSED — INVESTIGATED / NO STRUCTURAL DEFECT** | 2026-08-12 | All 6 commercial URLs technically clean (200, index/follow, self-canonical, in sitemap, correctly linked from `/spain/es`). Not cannibalization — page roles are legitimately distinct (homepage brand+generic, `gp-consultation-online` = GP hub/catalog, `services/consulta-medica-online` = GP detail, `services/dermatologia-especialista-online` = specialist detail) | Bottleneck is SERP competitive wall (national insurers + Doctoralia/TopDoctors-scale aggregators dominate the generic cluster; boutique/solo practitioners dominate specialty clusters) plus a verified trust-presentation gap: Doctify reviews render on hub/team pages but not on service detail pages | See §7 SEO-GROWTH-013 for full findings and substantive conclusions. Next: SEO-GROWTH-014, a feasibility investigation only (not an implementation batch) — do not add Doctify UI/schema before that lands |
| SEO-GROWTH-011 | Spain doctor cross-locale ranking "fragmentation" (Alfredo del Valle) | Indexation / hreflang | **EXPECTED BEHAVIOR — CLOSED, no code change** | 2026-08-12 | All 5 locale URLs (`spain/{es,cs,en,pt,de}/doctors/dr-alfredo-del-valle`) are 200, self-canonical (each declares and Google accepts its own canonical — no consolidation attempted by either side), `index, follow`, in sitemap, carry distinct per-locale `<title>` (Dermatólogo/Dermatolog/Dermatologist/Dermatologista/Dermatologe — real translation, not a duplicate stub), and cross-link each other via the sibling-locale switcher. The one legacy URL in the cluster, `/pt/spain-doctors/dr-alfredo-del-valle`, is "Crawled – currently not indexed" (last crawl 2026-03-08) and draws 1 impression in 90 days — a dead stub, not a participant | Google serves each locale variant as its own PASS result; no `noindex`, no wrong-canonical, no stale-crawl divergence | None. See §7 for the full query×URL matrix and reasoning |
| SEO-GROWTH-012 | August impression-surge diagnosis | Indexation / discovery | **CLOSED — EXPECTED GOOGLE DISCOVERY / TOOL-INTENT MIX SHIFT** | 2026-08-12 | 4-day-window page pull (08-06→08-09) vs. the preceding 5-day window: 946 pages earned impressions vs. 584 before; **568 of those pages had zero impressions in the prior window.** These newly-surfacing pages account for 4,990 of the period's impression growth — existing pages' impressions were flat to slightly down (−257) over the same comparison. 75% of the new-page volume (3,726 impr) is `/tools/*` calculators (BMI, calorie, blood pressure, ovulation, ADHD test, due-date) across every market and locale; the rest spreads thinly across lab-tests, services, legal, blog, doctors, health. Spot-checked 4 representative URLs (`inspect_urls` + live Googlebot fetch): all PASS, `index,follow`, self-canonical, in sitemap, last-crawl clustered 2026-08-05→08-08 — Google (re)crawled them right at the surge, not a code deploy (the tool pages themselves shipped weeks earlier, see `244d629e` et al.) | Google evidently ran a discovery/recrawl pass across previously-unindexed locale×tool combinations in early August; timing lines up with — but is not proven to be caused by — the crawlability/discovery batches shipped 08-08/08-09 | None. See §7 for the full breakdown and the corrected NEXT-1 framing |

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

### NOW — one batch

**SEO-GROWTH-014 — Spain service-detail Doctify trust-signal feasibility
investigation.** Investigation only, no implementation. Confirm what powers the
existing Doctify integration, whether MGH has real retrievable review/rating data
through it, whether a service-detail page can legitimately show practice-level
reviews, and whether the shared service-detail template can carry the signal without a
special case for dermatology. See §7 SEO-GROWTH-013 for the target classification set.
Implementing a Doctify UI/schema change is explicitly **not** authorized by this
entry — it follows only after SEO-GROWTH-014 lands on READY TO IMPLEMENT or UI
POSSIBLE, SCHEMA NOT JUSTIFIED.

### NEXT — up to one, evidence-backed

1. **Homepage performance / query-mix investigation.** `/` draws 1,984 impressions /
   154 clicks / position 18.9 in the current window — by far the largest single earning
   page. Before calling anything a CTR issue, separate brand, generic "global health,"
   commercial, wrong-market, and legacy-derived traffic within that query mix. The
   2026-07-28 plan scheduled a CTR check on head terms from 2026-08-04 that was never
   carried out; it is now overdue, and the open product question behind it (is a
   country-selection interstitial the right destination for "global health clinic"?)
   is still unanswered.

This ranking is not fixed. If a future OpenSEO/GSC refresh surfaces something with
stronger evidence, it can outrank either of the two above — do not carry this order
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
| Answer the homepage-destination question | Product call, not an SEO one. See NEXT-1. |

### DEFERRED — low value or blocked

- **Calculator/tool long tail — now confirmed sitewide, not Spain-only** (see
  SEO-GROWTH-012). BMI, calorie, blood-pressure, ovulation, ADHD-test and due-date
  calculators draw thousands of impressions across every market and locale, roughly a
  third of them at genuinely good positions (top 10–20), but convert at 0.48% CTR
  because the intent is informational/free-tool, not medical-service. Real impressions,
  no commercial value, high effort to move against dedicated calculator sites. This is
  the largest single component of the CTR dilution in §1 and should be understood as
  such rather than optimised.
- **SEO-METADATA-005**, the CMS title inconsistency.
- `llms.txt` — optional and ignored by Google Search.
- Mass submission to the Indexing API — 200/day cap and officially JobPosting/
  BroadcastEvent-only. Abuse risks key revocation.

### CLOSED — do not reopen without new evidence

SEO-001 through SEO-008, SEO-METADATA-001 through 004, SEO-GROWTH-001 through 006,
SEO-GROWTH-008, SEO-GROWTH-009, SEO-GROWTH-010, SEO-GROWTH-011, SEO-GROWTH-012,
SEO-GROWTH-013, SEO-DOC-001, SEO-DOC-003. See §5 for each. (SEO-GROWTH-013 closed
INVESTIGATED / NO STRUCTURAL DEFECT — its one open thread continues as SEO-GROWTH-014,
a feasibility investigation, not an implementation batch; do not reopen SEO-GROWTH-013
itself without new evidence.)

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
