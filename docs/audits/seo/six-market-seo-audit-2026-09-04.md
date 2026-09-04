# Six-market SEO audit and execution plan — 2026-09-04

**Mode: read-only investigation.** No SEO change was implemented, no content was
published, no production or CMS record was modified, no country artifact was created,
and no ledger entry was written. Every recommendation below is a proposal.

**Canonical operational source remains** [`docs/plans/seo-control-state.md`](../../plans/seo-control-state.md).
This file is historical audit evidence under the `seo/README.md` contract. Where it
disagrees with the ledger, §7 and §12 name the exact ledger correction to make; nothing
here rewrites history.

Evidence classes are labelled throughout: **[LIVE]** production observation today,
**[REPO]** repository/code, **[GIT]** commit history, **[GSC]** Search Console
first-party, **[GA4]** Analytics first-party, **[EST]** provider estimate,
**[HIST]** dated historical evidence, **[INF]** inference.

---

## 1. Executive summary

The six-market **technical** SEO program is genuinely finished and holding. A
410-page crawl of every primary-locale sitemap URL across all six markets returned
**410/410 HTTP 200, `index, follow`, self-referential canonical, exactly one `<h1>`,
and an `og:image`** — zero exceptions. **[LIVE]** The `seo-live-urls` production CI
gate is green on `main`. **[REPO]** The ledger's "COMPLETE / MONITOR EXCEPTIONS"
verdict for technical work is correct and should not be reopened.

What is not finished is everything downstream of it, and the gap is not evenly
distributed. Ireland, Czechia and Portugal have research packages, keyword masters,
completion matrices, clinical-review registers, approval gates and registered
measurement dates. Spain, Romania and Brazil have README stubs, legacy ledger
evidence, and **no governance layer of any kind** — while already publishing doctor
biographies, registration numbers and credentials.

Three findings change the plan.

**The measurement program has been measuring nothing since 2026-08-02.** Production
serves GA4 measurement ID `G-4PPGECG12X` **[LIVE, from the deployed client bundle]**.
The GA4 property this programme reads — `547083375`, named in `CLAUDE.md`, the handover
and every measurement plan — has one web stream, `G-SP48D9LJJ5` **[GA4]**. Those are
different properties, and git says exactly how they diverged: `7f553148` (2026-07-25)
hardcoded the correct id, `80bae092` (2026-07-28) moved it to an environment variable
and left a *different* id in the `.env.example` comment, and the Railway build variable
was set from that comment. Property `547083375` has organic data in exactly two ISO
weeks — 24 sessions total — and **nothing after 2026-08-02** **[GA4]**, in a period
where Search Console recorded 861 organic clicks in the last 28 days alone **[GSC]**.
Every 90-day gate in §27.4 is unreadable. The "sparse GA4 coverage" the Ireland and
Czechia packages both recorded was not a sample of a working property; it was that
property's entire lifetime.

**The recrawl the 09-04 and 09-06 gates depend on has not happened.** Brazil's
Sarmento gate falls due today: last crawl **2026-08-04**, still `Excluded by 'noindex'`,
still pre-fix **[GSC URL Inspection, today]**. Romania's trio: 2026-08-03, 2026-08-01
and **2026-07-20** — Bica is 46 days stale. Spain's dermatología gate (2026-09-08) is
unreadable for the same reason: last crawl 2026-07-19, before the 2026-08-12 fix it is
meant to measure. These are extensions, not escalations — but this is the **second**
consecutive extension of the doctor cohort, and the ledger's own rule makes a third a
crawl-budget finding rather than a doctor-indexability one.

**The ES/RO/BR gap is now quantifiable, not impressionistic.** On the commercial
surface (service + doctor pages), meta descriptions exceeding the ~160-character
display budget: **Spain 37 of 37, Romania 20 of 20, Brazil 19 of 19 — versus Ireland 4
of 44, Portugal 4 of 39, Czechia 3 of 20** **[LIVE]**. Romania has **17 of 17** service
pages with no FAQ content and therefore no `FAQPage` schema, where every other market
has near-full coverage **[LIVE]**. That is one metadata batch and one FAQ batch, not a
research programme.

There is also genuine new upside the ledger does not yet record. The Week-1/Week-2
editorial cohort produced the first real ES/RO/BR organic clicks:
`/spain/es/blog/baja-laboral-por-ansiedad-como-funciona` (671 impressions, 9 clicks,
position 13.4) and `/romania/ro/blog/scrisoare-medicala-cine-o-elibereaza` (235
impressions, 9 clicks, **position 4.5**) **[GSC]**. Both are technically flawless and
both are correctly linked to and from their owning service pages, so the commercial
path already exists — a claim this audit got wrong once and corrected the same day
(SMA-08, withdrawn).

**Recommendation: no content batch next. Fix measurement first, then governance.**
Section 13 sequences it.

---

## 2. Definition of "complete" for this SEO program

"Complete" has been used to mean three different things in this repository, which is
why a market can be simultaneously "complete" and "not started". This audit uses a
16-dimension definition; a market is complete only when every dimension is either
satisfied or carries a dated, named deferral.

| # | Dimension | Completion test |
| --- | --- | --- |
| 1 | Technical SEO remediation | Market's URLs pass the global technical contract: 200, self-canonical, correct robots, correct hreflang cluster, in sitemap, in `seo-live-urls` |
| 2 | Baseline market audit | A dated inventory of every indexable URL with measured HTTP/canonical/hreflang/metadata/schema state |
| 3 | Keyword research | A market-language keyword master with source log, exclusions and a documented scoring method |
| 4 | Competitor / SERP research | Live SERPs pulled in the market's own locale, competitors inventoried, walls classified |
| 5 | Target-page inventory | Every priority URL with live metadata, H1, schema, links and conversion fields |
| 6 | Content-gap analysis | Gaps AND exclusions recorded with reasons |
| 7 | URL-to-keyword ownership | One primary intent per URL, no duplicate owners |
| 8 | Proposed information architecture | Keep-first hub-and-spoke decision, recorded |
| 9 | Internal-linking strategy | Named commercial paths from informational assets |
| 10 | Backlink / authority research | Prospect list with relevance and spam review |
| 11 | Clinical review & publication gates | A code-enforced gate + a register with named clinician and real timestamp |
| 12 | Content briefs and drafts | Briefs bound to evidence; drafts hash-bound to what a reviewer saw |
| 13 | Implementation | Production writes with dry-run, receipt and readback |
| 14 | Production verification | Independent cache-bypassed re-fetch |
| 15 | GSC + GA4 measurement | A property that actually receives the site's data, with the funnel events registered |
| 16 | 30/60/90-day evaluation | Absolute dates registered before the change ships |

**Dimension 1 is complete for all six markets.** Dimensions 2–14 are complete for
Ireland, Portugal and Czechia and absent for Spain, Romania and Brazil. **Dimension 15
is currently failing for all six markets.** Dimension 16 is registered for IE/CZ/PT and
absent for the three deployments of the last 48 hours.

A market is **not** incomplete merely because its folder is sparse — Spain, Romania and
Brazil carry substantial dated evidence in ledger §§19–21. A market is **not** complete
merely because global technical work covered it.

---

## 3. Six-country status matrix

Columns are the 16 dimensions of §2. `C` complete · `P` partial · `L` legacy evidence
only, in the global ledger · `M` missing and required · `N` missing, not currently
justified · `D` deferred by explicit decision · `B` blocked · `F` failing.

| # | Dimension | IE | CZ | PT | ES | RO | BR |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: |
| 1 | Technical remediation | C | C | C | C | C | C |
| 2 | Baseline audit | C | C | C | L | L | L |
| 3 | Keyword research | C | C | C | L | L | L |
| 4 | Competitor / SERP | C | C | C | L | L | L |
| 5 | Target-page inventory | C | C | C | M | M | M |
| 6 | Content-gap analysis | C | C | C | L | L | L |
| 7 | URL↔keyword ownership | C | C | C | M | M | M |
| 8 | Proposed IA | C | C | C | L | L | N |
| 9 | Internal-linking strategy | C | C | C | M | M | N |
| 10 | Backlink / authority | C | C | C | M | M | N |
| 11 | Clinical gate + register | P | C | C | **M** | **M** | **M** |
| 12 | Briefs / drafts | C | P | P | M | M | D |
| 13 | Implementation | C | C | C | N | B | D |
| 14 | Production verification | C | C | C | n/a | n/a | n/a |
| 15 | GSC + GA4 measurement | **F** | **F** | **F** | **F** | **F** | **F** |
| 16 | 30/60/90 evaluation | P | C | C | M | M | M |

Notes on the non-obvious cells:

- **IE-11 = P.** Ireland has a `clinical-review-register.csv` but no code-enforced
  approval gate; the two gates in the repository are Portugal's and Czechia's.
  **[REPO]** `find . -name '*clinical-approval*'` returns only
  `backend/src/content/portugal-clinical-approval.ts` and
  `backend/scripts/lib/czechia-clinical-approval.ts`.
- **IE-16 = P.** §§31–33 carry a 2026-09-28 gate; the lab cluster carries 2026-09-08.
  Neither the Portugal snippet trims (2026-09-03) nor the tool pages (2026-09-04) nor
  the country-name fix (2026-09-04) carries any gate.
- **RO-13 = B.** Romania's next implementation (17 FAQ payloads) is blocked on RO-11.
- **BR-12/13 = D.** Brazil deferral is explicit in `editorial-plan-2026-08-19.md` §7.3
  — "Brazil remains deferred until clinical capacity and non-brand search demand
  improve" — and is supported by a one-doctor roster **[LIVE: one profile at
  `/brazil/pt/doctors/dr-renato-sarmento`]**.
- **All of row 15 = F.** See SMA-01.

---

## 4. Country-artifact completeness matrix

Against the `seo/README.md` package contract.

| Artifact | Ireland | Czechia | Portugal | Spain | Romania | Brazil |
| --- | --- | --- | --- | --- | --- | --- |
| `README.md` | Complete and current | Complete and current | Complete and current | Complete (stub, by design) | Complete (stub) | Complete (stub) |
| `01-baseline-audit.md` | Complete and current | Complete and current | Complete and current | Legacy in ledger §§19.2/19.4 | Legacy in §§20.5/21.2 | Legacy in §20.4 |
| `02-competitor-landscape.md` | Complete (WebDoctor-named) | Complete and current | Complete and current | Legacy §§19.5–19.6 | Legacy §§20.8/20.10 | Legacy §20.8 |
| `03-keyword-master.csv` | Complete and current | Complete and current | Complete and current | **Missing and required** | **Missing and required** | Missing but not currently justified |
| `04-content-gap.csv` | Complete and current | Complete and current | Complete and current | Missing and required | Missing and required | Missing but not justified |
| `content-briefs/` | Complete (12 briefs, none written up) | Complete (9 briefs) | Complete (24 briefs) | Missing and required | Missing and required | Deferred by explicit decision |
| `05-url-keyword-map.csv` | Complete and current | Complete and current | Complete and current | **Missing and required** | **Missing and required** | Missing but not justified |
| `06-proposed-site-architecture.md` | Complete | Complete | Complete | Legacy §19.13 | Legacy §20.10 | Missing but not justified |
| `07-technical-audit.md` | Complete but stale (2026-08-25) | Complete and current | Complete and current | Legacy §§19.5/19.9/19.11 | Legacy §§20.7/21.2/21.7 | Legacy §20.6 |
| `08-backlink-opportunities.csv` | Complete | Complete (207 prospects) | Complete | Missing and required | Missing and required | Missing but not justified |
| `raw/` | Complete (call log) | Complete (extensive) | Complete (extensive) | Missing and required | Missing and required | Missing but not justified |
| `clinical-review-register.csv` | Complete (10 rows) | Complete (37 rows) | Complete (45 rows) | **Missing and required** | **Missing and required** | **Missing and required** |
| Completion matrix | Complete (via §31 CSV) | Complete (50 URLs) | Complete (75 URLs) | Missing and required | Missing and required | Missing but not justified |
| Implementation log | Complete | Complete | Complete | Blocked by dependency | Blocked by dependency | Deferred |
| Measurement plan | Complete but stale (GA4 half invalid) | Complete but stale (same) | Complete but stale (same) | Missing and required | Missing and required | Missing and required |
| 30/60/90 roadmap | Complete | Complete | Complete | Missing and required | Missing and required | Missing but not justified |
| `validate-artifacts.mjs` | Missing but not justified | Complete | Missing but not justified | n/a | n/a | n/a |

**No empty artifact was created by this audit**, and none should be. The Spain, Romania
and Brazil "Missing and required" cells become creatable only after the research pass
that fills them; a placeholder file gives the next agent false confidence, which the
workspace contract explicitly warns against.

**Brazil's "not currently justified" cells are the deferral, not an oversight.** One
clinician, 18 GENERAL services, 16 unstaffed specialist services, a SERP containing the
medical regulator's own certificate platform, and brand-collision traffic. Re-test the
deferral at the registered 2026-11-13 wall recheck.

---

## 5. Code and template parity matrix

Measured across every primary-locale sitemap URL: Ireland 107, Czechia 50, Portugal 89,
Spain 67, Romania 51, Brazil 46 = **410 pages, live Googlebot-UA fetch, 2026-09-04**.

| Mechanism | IE | CZ | PT | ES | RO | BR | Verdict |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | --- |
| HTTP 200 on every sitemap URL | 107/107 | 50/50 | 89/89 | 67/67 | 51/51 | 46/46 | **Parity — clean** |
| `robots: index, follow` | 100% | 100% | 100% | 100% | 100% | 100% | **Parity — clean** |
| Self-referential canonical | 100% | 100% | 100% | 100% | 100% | 100% | **Parity — clean** |
| Exactly one `<h1>` | 100% | 100% | 100% | 100% | 100% | 100% | **Parity — clean** |
| `og:image` present | 100% | 100% | 100% | 100% | 100% | 100% | **Parity — clean** |
| `<html lang>` matches locale | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Parity — clean** |
| `og:locale` market-regionalised | en_IE | cs_CZ | pt_PT | es_ES | ro_RO | pt_BR | **Parity — clean** |
| hreflang cluster size | 7 | 7 | 7 | 7 | 7 | 4 | **By design** — Brazil is a 3-locale market (`frontend/data/countries.ts:125`) |
| hreflang emitted as `hrefLang` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Grepping served HTML for `hreflang` returns zero; the `CLAUDE.md` trap still holds |
| Locale-eligibility gating of hreflang | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Working** — partial clusters land exactly on the gated FAQ, legal and medical-disclaimer URLs |
| BreadcrumbList on content pages | 101/107 | 45/50 | 84/89 | 62/67 | 46/51 | 41/46 | Gap is legal sub-pages only — **uniform, global** (SMA-16) |
| `FAQPage` bound to visible FAQ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Correct by construction** — `page.tsx:475` emits schema only when `detail.faqs.length > 0`; no fabricated schema |
| Service pages with FAQ content | 23/23 | 15/15 | 23/23 | 20/24 | **0/17** | 18/18 | **Romania gap confirmed** (SMA-04); Spain's four are the ex-gated vascular/aesthetic set |
| Doctor `Person` + credential schema | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Parity — clean** |
| Service `MedicalWebPage`/`Offer`/`ReserveAction` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Parity — clean** |
| Title ≤ 60 served chars | 90/107 | 35/50 | 72/89 | 26/67 | 31/51 | 34/46 | Not a defect per the 2026-08-09 no-truncation decision; it is a **batch-coverage signal** |
| Description ≤ 160 chars, services + doctors | 40/44 | 17/20 | 35/39 | **0/37** | **0/20** | **0/19** | **Sharpest parity gap** (SMA-05) |
| Redirect rules (`permanent:`) | — | — | — | — | — | — | 276 in `next.config.ts` **[REPO]** — matches ledger §3; the handover's "364" is stale (SMA-20) |
| Retired-locale redirects | n/a | n/a | n/a | n/a | n/a | ✓ | `/brazil/{cs,de,ro}/*` → one-hop 308 → `/brazil/pt/*` **[LIVE]** |
| `proxy.ts` 410 + preview-host noindex | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Unchanged, per ledger §3 |
| Country-name localisation, `/legal` + `/book` | ✓ | ✓ | ✓ | **España** | **România** | **Brasil** | **Deployed and verified live today** — ledger §41.1 defect 1 is closed (SMA-12) |
| Consent-gated GA4 component | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Code correct; **property wrong** (SMA-01) |
| `begin_booking`/`begin_checkout`/`purchase` in code | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `lib/analytics/track.ts:15,17,24` **[REPO]** |
| Registered as GA4 key events | — | — | — | — | — | — | Only `purchase` and `begin_booking`; **`begin_checkout` is not** (SMA-02) |
| Core-page SEO unit test | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | Only `ireland-` and `czechia-core-page-seo.test.ts` exist (SMA-15) |
| Clinical-approval gate in code | ✗ | ✓ | ✓ | **✗** | **✗** | **✗** | SMA-03 |
| `seo-live-urls` production CI gate | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Green on `main`** — job "SEO live URL assertions (production)" = success |

**Conclusion on parity:** the *shared code* is at parity across all six markets. Every
gap in this matrix is either a deliberate market difference (Brazil's locale count), a
uniform global template gap (legal sub-page breadcrumbs), or **content and governance
that has been produced for three markets and not the other three**. There is no
six-market code defect to fix.

---

## 6. Measurement-gate register

Deployment dates are **[GIT]**/**[LIVE]**; windows follow the ledger's own "28 complete
days plus final-data lag" convention. Maturity is judged against today, **2026-09-04**.
GSC's latest date with data is **2026-09-01** **[GSC]**.

| # | Market | Change / experiment | Deployed | Baseline window | 30d review | 60d review | 90d review | Data source | Metric | Maturity today | Confounders | Next allowed action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G1 | Global | Country FAQ pages, 11 indexable of 33 (`SEO-GLOBAL-LANG-003`) | 2026-08-15 | pre-08-15 | **2026-09-30** | 2026-10-30 | 2026-11-29 | GSC | Indexation, query ownership, impressions | **Not mature** (16d short) | Editorial cohort published into the same window | Read on/after 2026-09-30 |
| G2 | Global | Legacy-URL consolidation share (§22.3) | ongoing | 48% at 2026-08-15 | **2026-09-30** | — | — | GSC | Share of clicks entering via a 308 source | **Not mature** | Recrawl backlog | Read on/after 2026-09-30; **threshold: under 30% or it becomes a crawl-rate finding** |
| G3 | Ireland | 16 GENERAL services, six locales (§31) | 2026-08-25 | 28d to 2026-08-25 | **2026-09-28** | 2026-10-28 | 2026-11-27 | GSC | Impressions, clicks, CTR, ownership per changed URL | **Not mature** | §§32–34 shipped 08-26 → 08-30 | Read on/after 2026-09-28 |
| G4 | Ireland | Profiles + 7 specialists + intent-led FAQs (§§32–33) | 2026-08-26 | 28d to 2026-08-26 | **2026-09-28** | 2026-10-28 | 2026-11-27 | GSC | Same | **Not mature** | Overlaps G3 | Read on/after 2026-09-28 |
| G5 | Ireland | Lab-test cluster (frozen) | — | — | **2026-09-08** | — | — | GSC | Position and impressions on `/ireland/en/lab-tests` + 15 detail pages | **Not mature** (4d short) | Price-error correction 2026-09-02 landed inside the window | Read on/after 2026-09-08; **no content or linking change before then** (§27.5) |
| G6 | Czechia | 31 published URLs (§§27.19/27.21/36) | 2026-09-01/02 | 28d to 2026-08-30: **90 clicks / 5,629 impr / 1.60%** | **2026-09-30** | 2026-10-30 | 2026-11-29 | GSC | Page and query×page for the 31 URLs | **Not mature** (3d elapsed) | Dermatology publication 09-02; non-Czech safety corrections 09-02 | Read on/after 2026-09-30 |
| G7 | Czechia | GP ranking ramp (`CZ-SEO-001`) | — | §11 baseline | **2026-09-08** | — | — | GSC | Position on the `praktický lékař online` family | **Not mature** | 31-URL batch landed 09-01/02 inside the window | Read on/after 2026-09-08 |
| G8 | Portugal | 43 published URLs (§§27.22/35/37) | 2026-09-01/02 | 28d to 2026-08-30: **70 clicks / 4,317 impr / 1.62%** | **2026-09-30** | 2026-10-30 | 2026-11-29 | GSC | Page and query×page for the 43 URLs | **Not mature** (3d elapsed) | Snippet trims 09-03; tool pages 09-04 | Read on/after 2026-09-30 |
| G9 | Portugal | Doctor recrawl trio (Telmo, Vitor Pais, Pedro Santos) | fix 2026-08-08 | — | 2026-09-01 | — | — | GSC URL Inspection | `coverageState` | **PASSED** — Telmo indexed (crawl 09-02), Vitor Pais indexed (crawl 08-30) **[HIST, 2026-09-03 pass]** | — | Close; keep Pedro Santos listed (crawl 2026-08-06, pre-fix) |
| G10 | Spain | Dermatología trust fix (`SEO-GROWTH-015`, `770ee012`) | 2026-08-12 | 93 impr / pos 42.9 | **2026-09-08** | — | — | GSC | Position and CTR on `dermatologia-especialista-online` | **CANNOT BE READ** — last crawl **2026-07-19**, before the fix **[GSC, today]** | Google has never crawled the fixed page | **Do not judge on 09-08.** Re-inspect; re-arm to 28d after the crawl date passes 2026-08-12 |
| G11 | Brazil | Sarmento `readyToIndex` backfill (`52c42d1a`) | 2026-08-08 | 0 branded impr | **2026-09-04 (today)** | — | — | GSC URL Inspection | `coverageState`, branded impressions | **NOT RE-EVALUATED** — last crawl **2026-08-04**, still `Excluded by 'noindex'` **[GSC, today]** | — | **Extend, do not escalate.** Extension **2** of the permitted 3; a third makes it a crawl-budget finding |
| G12 | Romania | Doctor trio backfill (Palaga, Bica, Brînduș) | 2026-08-08 | 0 branded impr | **2026-09-06** | — | — | GSC URL Inspection | Same | **NOT RE-EVALUATED** — crawls 2026-08-03 / **2026-07-20** / 2026-08-01, all pre-fix **[GSC, today, read two days early; judgement deferred to 09-06]** | Bica 46 days stale | Extend on 09-06; fold into the crawl-budget question if it extends again |
| G13 | Romania | `a-doua-opinie-medicala` Romanian-query signal | — | 5 impr / pos 9.6 | **2026-09-06** | — | — | GSC | Romanian-language commercial volume | **Not mature** | — | Reopen only above single-impression noise |
| G14 | BR + RO | Generic commercial SERP-wall recheck | — | 2026-08-13 SERPs | — | — | **2026-11-13** | Live SERP + GSC | Top-20 entry, SERP composition | **Not mature** (70d out) | — | Hold |
| G15 | Global | §6 indexation watchlist `inspect_urls` pass | — | — | **2026-09-24** | — | — | GSC URL Inspection | Crawl date vs fix date | **Not mature** | The 2026-09-01 pass ran late, on 09-03 | Run on/after 2026-09-24 |
| G16 | Global | `SEO-DOC-006` doctor cohort (117 URLs / 25 doctors) | fix 2026-08-08 | — | **2026-09-24** | — | — | GSC URL Inspection | Crawl date advancing past the fix date | **Extension 1 used** (2026-09-03) | — | On 09-24 a second PARTIAL is the **last** permitted extension |
| G17 | Global | Editorial Week 1 + Week 2 (30 posts) | 2026-08-15 → 08-29 | pre-publication zero | ~**2026-09-30** | ~**2026-10-30** | ~**2026-11-29** | GSC + GA4 | The §27.4 ladder | **Not mature**; **the 90d leg is unreadable** (SMA-01) | Six parents still flag `clinicalReview: required` | Read the GSC half on 09-30; **the GA4 half is blocked on SMA-01** |
| G18 | Portugal | 11 doctor meta-description trims | **2026-09-03** | descriptions 191–220 chars | **2026-10-08** | 2026-11-07 | 2026-12-07 | GSC | CTR at held position | **NO GATE REGISTERED** | Tool pages shipped one day later | **Register this gate** |
| G19 | Portugal | 6 tool-page title/description rewrites | **2026-09-04** | 80-char title, 228-char description | **2026-10-09** | 2026-11-08 | 2026-12-08 | GSC | CTR on the tool cluster | **NO GATE REGISTERED** | Super-admin override; no clinician reviewed the copy | **Register this gate** |
| G20 | Global | Localised country names on `/legal` and `/book` | **2026-09-04** | English country names | **2026-10-09** | — | — | GSC | CTR on legal routes in non-EN locales | **NO GATE REGISTERED** | Low volume (41–49 impr/90d per page) | **Register a light gate**; low priority |

**Nothing in this register is judged failed for want of time.** G10 is the one entry
whose stated date is *wrong* rather than merely early: the change it measures has never
been crawled, so 2026-09-08 would measure the pre-fix page.

---

## 7. Verified global findings

Finding format: ID · scope · status · severity · evidence · affected URLs and files ·
root cause · impact · action · dependency · validation · evidence destination · whether
the ledger needs an update.

### SMA-01 — GA4 measures a property the site does not send data to
- **Scope:** Global · **Status:** Open, new · **Severity: P0**
- **Evidence [LIVE]:** every `/_next/static/chunks/*.js` served by `/ireland/en`
  contains exactly one GA4 id: `G-4PPGECG12X`.
  **[GA4]** property `547083375` has one web stream, `streamId 15322239584`,
  `measurementId` **`G-SP48D9LJJ5`**.
  **[GA4]** `traffic_acquisition`, `channel_group`, 2026-08-05 → 2026-09-01:
  `rowCount: 0`. `organic_landing_pages`: `rowCount: 0`. `key_events`: `rowCount: 0`.
  **[GSC]** same window: 861 clicks, 60,058 impressions.
- **Affected:** `frontend/.env.example:46`, the Railway frontend build environment, and
  every `seo/*/10-measurement-plan.md`.
- **Root cause — established from git, not inferred [GIT]:**
  - `7f553148` (2026-07-25) shipped GA4 with the id hardcoded:
    `const GA_MEASUREMENT_ID = "G-SP48D9LJJ5"`. GA4 property `547083375`'s web stream
    was created the same day, 2026-07-25T10:06Z, and began receiving data.
  - `80bae092` (2026-07-28) moved the id onto `NEXT_PUBLIC_GA_MEASUREMENT_ID`. Its own
    message says *"the hardcoded G-SP48D9LJJ5 is gone"* — and the `.env.example` line it
    added in the same diff reads `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-4PPGECG12X`, a
    different property. Whoever set the Railway build variable took the example value.
  - **[GA4]** property `547083375` has organic data in exactly two ISO weeks —
    2026-W30 (6 sessions) and 2026-W31 (18 sessions) — and **nothing after 2026-08-02**,
    across a 2026-03-01 → 2026-09-01 pull. That is the ~8-day window between the tag
    shipping and the id being swapped.
  - `0e1c2ff7` (2026-08-03) then fixed the Docker build so the ids reach the build
    environment — which locked the wrong id in rather than the right one.
- **Impact:** every 90-day conversion gate (§27.4) is unreadable, and has been since
  2026-08-02. The "24 sessions" that the Ireland package and the Czechia package both
  recorded as *sparse GA4 coverage* is not a sample of a working property — it is the
  entire lifetime of a property that stopped collecting a month ago. Blog-lead ROI
  cannot be evaluated at all, and the conversion instrumentation verified in production
  on 2026-08-25 has been reporting into a property nobody is reading.
- **Action, two parts:**
  1. **In-repo, done in this pass:** `frontend/.env.example` now documents
     `G-SP48D9LJJ5` with the incident recorded inline, so the wrong id stops
     propagating from the example file.
  2. **Owner, not resolvable from this repository:** set
     `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-SP48D9LJJ5` on the Railway **frontend** service —
     it is a *build* variable, inlined by Next at build time, so a redeploy is required,
     not a restart. Before doing so, check in GA4 admin whether a property exists behind
     `G-4PPGECG12X`: if it does, a month of real traffic is sitting in it and is worth
     exporting before the switch.
- **Dependency:** Railway service variables and GA4 admin — owner access.
- **Validation:** after the fix, `get_google_analytics_traffic_acquisition` returns
  non-zero sessions for a 7-day window and `get_google_analytics_key_events` returns
  `begin_booking` rows.
- **Destination:** global — `docs/plans/seo-control-state.md` §5 and §27.4.
- **Ledger update:** **yes, urgent.** §27.4 and the `CLAUDE.md` analytics table both
  assert a working funnel.

### SMA-02 — `begin_checkout` is not a registered GA4 key event
- **Scope:** Global · **Status:** Open, new · **Severity: P1**
- **Evidence [GA4]:** `measurement_health` lists exactly two key events: `purchase`
  (created 2026-07-25) and `begin_booking` (created 2026-08-24). **[REPO]**
  `frontend/lib/analytics/track.ts:15` defines `begin_checkout` and it is emitted.
- **Root cause:** the 2026-08-24 key-event registration covered `begin_booking` only.
- **Impact:** the middle of the funnel stays invisible even once SMA-01 is fixed.
- **Action:** register `begin_checkout` as a key event on whichever property wins
  SMA-01. One admin click.
- **Validation:** it appears in `measurement_health` and produces rows.
- **Ledger update:** yes — `CLAUDE.md` and `seo-handover-codex.md` §2.3 both claim all
  three are registered.

### SMA-03 — Spain, Romania and Brazil have no clinical-approval gate
- **Scope:** ES/RO/BR · **Status:** Open, confirmed (ledger §41.1 defect 4) ·
  **Severity: P1**
- **Evidence [REPO]:** `find . -name '*clinical-approval*'` returns only Portugal's
  (`backend/src/content/portugal-clinical-approval.ts`) and Czechia's
  (`backend/scripts/lib/czechia-clinical-approval.ts`), plus their tests and Portugal's
  compiled `dist` copy. **[LIVE]** the three markets nonetheless publish 13 Spain, 3
  Romania and 1 Brazil doctor profiles carrying registration numbers, specialties and
  biographies.
- **Impact:** any ES/RO/BR content batch would write clinical copy with no named
  reviewer, no hash binding and no readback — the exposure the Portugal and Czechia
  gates exist to prevent. It also means the *already published* profiles never passed
  one.
- **Action:** build one gate per market, mirroring Portugal's surviving controls —
  source fingerprint, exact approved-copy SHA-256, per-record confirmation token,
  credential-free database identity confirmation, official-source allowlist, an active
  verified in-market clinician with a matching professional body, and exact readback
  inside a Serializable transaction. ~150–250 lines plus tests each.
- **Dependency:** confirm each market has an eligible reviewer. Romania has three
  registered doctors, Spain thirteen; **Brazil has one**, itself a reason to keep Brazil
  deferred.
- **Validation:** the market's gate test suite, plus a dry run that refuses an
  unapproved hash.
- **Destination:** code; a concise ledger row.
- **Ledger update:** no — §41.1 defect 4 already records it. Confirm it is still open.

### SMA-04 — Romania: 17 of 17 service pages carry no FAQ
- **Scope:** Romania · **Status:** Open, confirmed and quantified · **Severity: P1**
- **Evidence [LIVE]:** 0 of 17 `/romania/ro/services/*` pages emit a `FAQPage` block;
  Ireland 23/23, Portugal 23/23, Brazil 18/18, Czechia 15/15, Spain 20/24.
- **Root cause [REPO]:** not a code defect —
  `app/[country]/[lang]/services/[serviceSlug]/page.tsx:475` emits the schema only when
  `detail.faqs.length > 0`, and the Romanian `ServiceTranslation` rows have no FAQ
  content. The binding of visible FAQ to FAQ schema is correct and must not be loosened.
- **Impact:** Romanian service pages answer fewer queries and carry less depth than
  every sibling market. Romanian service body copy already runs ~700–900 characters
  against ~7,600–13,800 on the EN equivalent **[HIST §20.5]**.
- **Action:** author 17 RO FAQ sets in the Czech style. **Blocked by SMA-03.**
- **Note:** `FAQPage` schema no longer produces FAQ rich results for non-government,
  non-health-authority sites — GSC's rich-results check on the Romanian blog post
  detects only `Breadcrumbs` **[GSC]**. Author the FAQs for the content, not the rich
  result.
- **Validation:** re-run the harvest; assert 17/17 emit `FAQPage`.
- **Destination:** `seo/romania/` once that package exists.
- **Ledger update:** no — §41.1 defect 2. Update its count to the verified 0 of 17.

### SMA-05 — The metadata batch that ran for IE/PT/CZ never ran for ES/RO/BR
- **Scope:** ES/RO/BR · **Status:** Open, new (quantified) · **Severity: P1**
- **Evidence [LIVE]**, meta descriptions over 160 characters on service and doctor
  pages:

  | Market | Over budget | Total | Share | Longest |
  | --- | ---: | ---: | ---: | ---: |
  | Spain | **37** | 37 | **100%** | 285 |
  | Romania | **20** | 20 | **100%** | 275 |
  | Brazil | **19** | 19 | **100%** | 239 |
  | Czechia | 3 | 20 | 15% | 173 |
  | Portugal | 4 | 39 | 10% | 291 |
  | Ireland | 4 | 44 | 9% | 213 |

- **Root cause:** Portugal ran an explicit snippet-trim batch (191–220 → 124–146
  characters, live 2026-09-03); Czechia and Ireland ran metadata batches in
  §§27.19/31/32. No equivalent batch exists for ES/RO/BR.
- **Impact:** Spain's two best-converting pages — `dr-alfredo-del-valle` (12 clicks,
  13.6% CTR, position 4.7) and `dr-tomas-ruiz-palacios` (11 clicks, 29.7% CTR, position
  3.1) **[GSC]** — serve 253- and 265-character descriptions that Google truncates. This
  is the highest-value, lowest-risk lever in the three markets.
- **Action:** one metadata batch per market. **Blocked by SMA-03** for doctor rows
  (clinical copy); service `seoDescription` is lower-risk but should use the same gate
  once it exists.
- **Validation:** re-run the 410-page harvest; assert zero service or doctor
  descriptions over 160.
- **Destination:** `seo/{spain,romania,brazil}/07-technical-audit.md` when those
  packages exist; a concise ledger row now.
- **Ledger update:** **yes** — new, quantified finding.

### SMA-06 — Deep-page recrawl has stalled across ES/RO/BR
- **Scope:** ES/RO/BR (global mechanism) · **Status:** Open · **Severity: P1**
- **Evidence [GSC URL Inspection, 2026-09-04]:**

  | URL | Coverage | Last crawl | Days stale | Fix date |
  | --- | --- | --- | ---: | --- |
  | `/brazil/pt/doctors/dr-renato-sarmento` | Excluded by `noindex` | 2026-08-04 | 31 | 2026-08-08 |
  | `/romania/ro/doctors/dr-alexandra-palaga` | Excluded by `noindex` | 2026-08-03 | 32 | 2026-08-08 |
  | `/romania/ro/doctors/dr-andreea-lorena-bica` | Excluded by `noindex` | **2026-07-20** | **46** | 2026-08-08 |
  | `/romania/ro/doctors/dr-robert-gabriel-brindus` | Excluded by `noindex` | 2026-08-01 | 34 | 2026-08-08 |
  | `/spain/es/doctors/dr-silvina-irale` | Excluded by `noindex` | 2026-08-04 | 31 | 2026-08-08 |
  | `/spain/es/services/dermatologia-especialista-online` | **PASS, indexed** | 2026-07-19 | 47 | 2026-08-12 |

- **Root cause [INF]:** crawl budget, not on-page state. Every one of these pages is
  live, 200, `index, follow`, self-canonical and sitemapped **[LIVE]**. Portugal's trio
  did flip to indexed once recrawled, which proves the backfill works.
- **Impact:** three registered gates (G10, G11, G12) fall due within four days and none
  can be read.
- **Action:** **extend, do not escalate.** At G16 on 2026-09-24, treat a second PARTIAL
  as the trigger to open the crawl-budget question the ledger has pre-registered. A
  supporting observation worth carrying: Google's recorded referring URL for the
  Romanian doctors is the legacy `https://www.myglobalhealth.online/home-rm`, which
  today 308s to `/romania/ro` **[LIVE]** — their discovery path is a stale one.
- **Validation:** the next `inspect_urls` pass on 2026-09-24.
- **Ledger update:** **yes** — record the 2026-09-04 readings against G11/G12 and note
  that G10's date is unreadable as stated.

### SMA-07 — Spain's 2026-09-08 dermatología gate would measure the pre-fix page
- **Scope:** Spain · **Status:** Open, new · **Severity: P1**
- **Evidence:** as SMA-06, row 6. Fix `770ee012` landed 2026-08-12; last crawl
  2026-07-19.
- **Impact:** reading the gate on 09-08 would produce "no movement", which §19.16 says
  to interpret as *confirming the SERP wall*. That would close a live opportunity on
  evidence that never tested it.
- **Action:** re-arm G10 to 28 complete days after the crawl date first advances past
  2026-08-12, and record the reason.
- **Validation:** `inspect_urls` shows a crawl date after 2026-08-12.
- **Ledger update:** **yes** — amend §19.16 and the §21.10 calendar's 09-08 row.

### SMA-08 — WITHDRAWN 2026-09-04, same day. The internal linking is complete
- **Scope:** ES/RO/BR · **Status:** **WITHDRAWN — the premise was wrong** ·
  **Severity: none**
- **What was claimed:** that the editorial cohort's best pages had no internal
  commercial path, on the evidence that `referringUrls` in GSC URL Inspection listed
  only `sitemap.xml` for `/romania/ro/blog/scrisoare-medicala-cine-o-elibereaza` and
  only the sibling locales plus the sitemap for
  `/spain/es/blog/baja-laboral-por-ansiedad-como-funciona`.
- **Why it is wrong [LIVE]:** the linking is present, live and reciprocal in all three
  markets:

  | Article | Article → service | Service → article | Blog index → article |
  | --- | --- | --- | --- |
  | `/romania/ro/blog/scrisoare-medicala-cine-o-elibereaza` | `/romania/ro/services/trimiteri-si-investigatii` | ✓ | ✓ |
  | `/spain/es/blog/baja-laboral-por-ansiedad-como-funciona` | `/spain/es/services/justificante-medico-online` | ✓ | ✓ |
  | `/brazil/pt/blog/solicitacao-de-exames-laboratoriais-online` | `/brazil/pt/services/solicitacao-exames-online` | ✓ | ✓ |

  The mechanism is `post.ctaService` in `frontend/lib/content/blog-post-page.tsx:245`,
  which builds `/{country}/{locale}/services/{slug}` and renders it as the article CTA.
  It is set on all three posts.
- **The instrument error:** `referringUrls` is a *sample* of link sources Google has
  recorded, not an internal-link inventory, and for a recently discovered page it
  commonly returns only the sitemap. Reading it as a complete graph is the eighth
  instance of the corpus-assembly failure the handover catalogues — an instrument run
  correctly over a corpus assembled by assumption rather than observation. The check
  that caught it took one `curl` per page.
- **What survives:** nothing actionable. Do not run an internal-linking pass on the
  published cohort; there is nothing to add.
- **Ledger update:** none. This finding never reached the ledger.

### SMA-09 — Spain's best new page went to zero impressions for four days
- **Scope:** Spain · **Status:** Open, new · **Severity: P1 (watch)**
- **Evidence [GSC, daily series]:**
  `/spain/es/blog/baja-laboral-por-ansiedad-como-funciona` first impression 2026-08-14;
  28–82 impressions/day through 2026-08-28; then **0 / 0 / 0 / 0** on 08-29, 08-30,
  08-31 and 09-01. Sitewide impressions on those days were 1,524 / 1,750 / 2,588 /
  2,998, so this is page-specific, not sitewide.
- **Verified not a technical defect [LIVE + GSC]:** the page serves 200,
  `index, follow`, self-canonical, `Article` + `FAQPage` + `MedicalWebPage` + `Person`
  schema, and GSC reports `PASS / Submitted and indexed`.
- **Root cause [INF]:** a ranking or SERP-composition event, not deindexing.
- **Commercial note, which matters more than the drop:** the page's named queries are
  entirely Spanish **state** sick-leave intent — `baja por ansiedad`, `baja mental`,
  `mi médico no me da la baja por ansiedad` (position 8.8, 33 impressions). That is the
  public-system instrument the FAQ programme explicitly states is *not ours to issue*.
  Spain's best-performing page attracts demand the business cannot serve.
- **Action:** re-check the daily series on 2026-09-11. If impressions have not returned,
  run one live `es-ES` SERP on the head query. **Do not rewrite the page**, and do not
  scale this topic cluster without first answering what Global Health sells to that
  searcher.
- **Ledger update:** **yes** — add to §6 as a dated watch row.

### SMA-10 — Three deployments in 48 hours carry no measurement gate
- **Scope:** Global · **Status:** Open · **Severity: P2**
- **Evidence:** G18, G19 and G20 in §6. The 2026-09-02 batch review already raised this
  as "§3.1 No measurement gate was registered for either market — highest impact"; it
  was fixed for Czechia and Portugal (§38, 2026-09-30 gates) and the pattern has
  recurred.
- **Action:** register G18/G19/G20 with the dates in §6 before the next batch.
- **Ledger update:** **yes.**

### SMA-11 — The production status sheet understates what is live
- **Scope:** Global docs · **Status:** Open · **Severity: P2**
- **Evidence [GIT]:** `git merge-base --is-ancestor 82a054d0 origin/main` succeeds;
  `origin/main` is `4067d8d6`. **[LIVE]** every page serves
  `data-dpl-id="4067d8d6ac857b0a6df3e5e5314e2526f9d6646a"`, and
  `/portugal/pt/tools/osteoporosis-risk-checker` serves the new 57-character title
  `Risco de osteoporose Portugal | Verificação orientativa`.
- **Root cause:** `docs/plans/seo-production-status-2026-09-04.md` §2.1 was written
  before the merge and says "not yet on `main`, so not deployed"; §4 item 1 still lists
  "merge and deploy" as the top action.
- **Action:** correct §2.1 and §4, and move the six tool pages into §1.
- **Ledger update:** the status sheet, not the ledger.

### SMA-12 — Two §41.1 defect rows are closed but still recorded open
- **Scope:** Global docs · **Status:** Resolved in production, stale in the ledger ·
  **Severity: P2**
- **Evidence [LIVE]:** `/spain/es/legal` → `Información legal. · España · Global Health`;
  `/romania/ro/legal` → `· România ·`; `/brazil/pt/legal/refund-policy` →
  `Política de Reembolso · Brasil · Global Health`. **[LIVE]** live sitemap
  `grep -c '<loc>'` = **2,146**, and ledger §3 already carries 2,146.
- **Action:** mark §41.1 defects 1 and 3 closed with today's date. Defects 2 and 4
  remain genuinely open.
- **Ledger update:** **yes.**

### SMA-13 — Brazil homepage title uses European Portuguese
- **Scope:** Brazil · **Status:** Open, new · **Severity: P2**
- **Evidence [LIVE]:** `/brazil/pt` `<title>` =
  `Médico Online Brasil | Clínicos e Especialistas Registados`. Brazilian Portuguese is
  **Registrados**; *Registados* is the pt-PT form. `og:locale` is correctly `pt_BR`,
  which makes the mismatch more conspicuous, not less.
- **Impact:** a Brazilian searcher reads the SERP snippet as foreign. Small, but it is
  the market's highest-impression page family.
- **Action:** one-word correction, through whatever gate SMA-03 produces. Sweep the rest
  of the pt-BR corpus for pt-PT forms in the same pass; do not fix only the page found
  here.
- **Ledger update:** yes, one line.

### SMA-14 — Spain has an uninventoried striking-distance set
- **Scope:** Spain · **Status:** Open, new · **Severity: P2**
- **Evidence [GSC, 2026-08-05 → 09-01]:** `derivaciones-pruebas-online` position 6.2,
  `psiquiatra-online` 6.9, `medicina-viaje-online` 7.5, `consulta-medica-online` 18.6 —
  all with 8–28 impressions and **zero clicks**;
  `/spain/es/blog/tension-alta-sintomas-cuando-urgencias` position 6.5, 63 impressions,
  zero clicks.
- **Root cause [INF]:** page-one positions with no clicks and 100%-over-budget
  descriptions (SMA-05) is a snippet problem before it is a ranking problem.
- **Action:** fold into the Spain metadata batch. This is the evidence that makes that
  batch worth running rather than a cosmetic tidy.
- **Ledger update:** yes — genuinely new since §19.13.

### SMA-15 — No core-page SEO test for Portugal, Spain, Romania or Brazil
- **Scope:** Global · **Status:** Open, new · **Severity: P2**
- **Evidence [REPO]:** `frontend/tests/unit/` contains `ireland-core-page-seo.test.ts`
  and `czechia-core-page-seo.test.ts` and no equivalent for the other four markets.
- **Impact:** the localisation regression behind §41.1 defect 1 (English country names
  on `/legal` and `/book`) is exactly the class a per-market core-page test catches, and
  it reached production in four markets.
- **Action:** generalise the Czechia test into a table-driven test over all six markets
  rather than adding four copies.
- **Ledger update:** no; a repo-quality item.

### SMA-16 — Legal document sub-pages emit no BreadcrumbList, all six markets
- **Scope:** Global · **Status:** Open, new · **Severity: P3**
- **Evidence [LIVE]:** 31 sitemapped legal sub-pages across the six markets return
  `BreadcrumbList` = 0; their `/legal` index pages return 1.
- **Impact:** small. `/portugal/es/legal/complaints-procedure` carries 49 impressions in
  90 days, `/brazil/en/legal/refund-policy` 43.
- **Action:** add the breadcrumb to `legal/[type]/page.tsx`. One change, six markets.
- **Ledger update:** no; a §5 backlog row at most.

### SMA-17 — 24 careers pages are indexable with no hreflang cluster
- **Scope:** IE/PT/CZ · **Status:** Open, new · **Severity: P3**
- **Evidence [LIVE]:** 8 Ireland, 14 Portugal and 2 Czechia `careers/*` URLs are in the
  sitemap, serve 200 `index, follow`, and emit **zero** `<link rel="alternate">` tags —
  not even `x-default`.
- **Assessment:** defensible. A job advert genuinely exists in one language.
- **Action:** decide once and record the decision so the next audit does not re-find it.
  If single-locale is intended, a self-referential `x-default` would make the intent
  explicit.
- **Ledger update:** one line in §5 as `EXPECTED BEHAVIOR` or `DEFERRED`.

### SMA-18 — §19.5.1 and §19.13 still describe live Spain pages as noindexed
- **Scope:** Ledger hygiene · **Status:** Open · **Severity: P3**
- **Evidence [LIVE]:** `consulta-diagnotico-vascular`,
  `consulta-flebologia-y-linfologia`, `consulta-online-medicina-estetica` and
  `consulta-salud-vascular-circulatoria` all serve 200, `index, follow`,
  self-canonical, are in the sitemap, and carry ~9,000 rendered characters. Two already
  draw GSC impressions (3 and 4). **[GIT]** `3fde5466 content(seo): author the four
  empty Spain service bodies`, 2026-08-19, on `main`.
- **This is not a ledger error.** §5 `SEO-SVC-001` correctly records it as
  **CLOSED — VERIFIED BY PRODUCTION CHECK, 2026-08-19**, and §5 is the ledger while §19
  is legacy evidence. The problem is that §19.13's table cell reads "correctly
  noindexed / Not indexed" and a fresh reader lands there first.
- **Action:** add a one-line superseded-by pointer at §19.5.1 and in the §19.13 row. Do
  not rewrite the historical finding.
- **Ledger update:** **yes**, pointer only.

### SMA-19 — Ledger §3 overstates the robots.txt disallow set
- **Scope:** Ledger hygiene · **Status:** Open · **Severity: P3**
- **Evidence [LIVE]:** robots.txt disallows `/admin`, `/admin/*`, `/account/*` and
  `/api/`. §3 says "only `/admin`, `/account`, auth routes and `/api/`". There is no
  auth-route disallow; `/login`, `/cart` and `/checkout` are handled by `noindex`
  instead — which §3 separately and correctly records.
- **Action:** correct the §3 sentence.

### SMA-20 — The handover's redirect count is stale
- **Scope:** Docs · **Status:** Open · **Severity: P3**
- **Evidence [REPO]:** `frontend/next.config.ts` contains **276** `permanent:` entries,
  matching ledger §3. `seo-handover-codex.md` §3 says "all 364 rules".
- **Action:** correct the handover to 276, or drop the number.

### SMA-21 — Trailing period inside composed titles
- **Scope:** Global · **Status:** Open, new · **Severity: P3**
- **Evidence [LIVE]:** `Información legal. · España · Global Health`;
  `Informații legale. · România · Global Health`.
- **Action:** strip a trailing `.` before composing the ` · Country · Global Health`
  suffix in `page-seo.ts`. Cosmetic.

### SMA-22 — FAQPage schema no longer earns FAQ rich results
- **Scope:** Global · **Status:** Informational · **Severity: P3**
- **Evidence [GSC]:** `richResultsResult` on all three inspected blog URLs detects only
  `Breadcrumbs`, despite valid `FAQPage` and `Article` JSON-LD in the served HTML.
- **Assessment:** consistent with Google's 2023 restriction of FAQ rich results to
  government and health-authority sites. **Keep the schema** — it remains a correct
  machine-readable description and feeds AI surfaces — but do not count FAQ coverage as
  a rich-result win in any measurement plan.

### Verified clean — record these so they are not re-audited
- 410/410 primary-locale sitemap URLs: 200, `index, follow`, self-canonical, one `<h1>`,
  `og:image` **[LIVE]**.
- Sitemap 2,146 URLs; ledger §3 already correct **[LIVE]**.
- hreflang eligibility gating behaves exactly as designed: partial clusters appear only
  on locale-gated FAQ, legal and medical-disclaimer URLs **[LIVE]**.
- Brazil's 3-locale configuration is intentional (`frontend/data/countries.ts:125`) and
  its retired `cs`/`de`/`ro` locales one-hop 308 to `pt` **[LIVE, REPO]**.
- FAQ schema is bound to visible FAQ content; no fabricated structured data **[REPO]**.
- `seo-live-urls` CI job green on `main`. Five other CI jobs are red (Semgrep, Backend
  Tests, Typecheck & Lint, OSV-Scanner, Trivy) — outside SEO scope, but they are red.

---

## 8. Spain — audit and readiness assessment

### Baseline [LIVE + GSC]

| Dimension | State |
| --- | --- |
| Sitemap URLs | 374 across six locales; **67 in `es`** |
| Primary-locale page types | 24 services, 13 doctor profiles plus hub, 7 tools, 5 blog posts, 6 legal, plus home, about, contact, faq, pricing, book, careers, press, see-a-specialist |
| HTTP status | 67/67 → 200 |
| Canonical | 67/67 self-referential |
| Indexability | 67/67 `index, follow` |
| hreflang | 7-tag cluster on 54; 2-tag on the four ex-gated vascular/aesthetic services (es only) and on the locale-gated legal/FAQ pages |
| H1 | exactly one on every page |
| Structured data | `MedicalOrganization`, `BreadcrumbList`, `FAQPage`, `Person`, `MedicalWebPage`, `Offer`, `ReserveAction` — full parity |
| Meta descriptions | **50 of 67 over 160 chars; 37 of 37 on services and doctors** |
| Titles over 60 served chars | 41 of 67 |
| Internal links | homepage → services/doctors verified live; the blog cohort links to and from `justificante-medico-online`, verified live |
| Conversion path | `/spain/es/book` live; booking CTAs present on service pages |
| GSC footprint | **105 clicks / 7,801 impressions / 1.35% / position 22.9** (searcher-country cut, 2026-08-05 → 09-01) — 4th by clicks, 3rd by impressions |
| GA4 coverage | **Zero** (SMA-01) |
| Backlinks | Not separately measured; the property-wide figure is 57 referring domains **[HIST 2026-08-11]** |
| Technical defects | None market-specific. Global: SMA-05, SMA-14, SMA-16, SMA-21 |

### Search opportunity [GSC + HIST]

Spain's demand has more than doubled since the §19 wave (78 → 105 clicks; 3,614 → 7,801
impressions). The structure of that demand:

- **Doctor-name navigational** — the market's only reliable converter.
  `dr-alfredo-del-valle` 12 clicks at 13.6% CTR / position 4.7;
  `dr-tomas-ruiz-palacios` 11 clicks at 29.7% CTR / position 3.1. Both truncated.
- **Informational blog** — `baja-laboral-por-ansiedad` 671 impressions / 9 clicks /
  position 13.4, now Spain's largest non-homepage surface. **New since §19.8, which
  recorded Spain as having one ES post with zero impressions.**
- **Homepage as an absorber** — `/spain/es` 2,239 impressions at position 32.3 for 10
  clicks. Largest surface, worst efficiency.
- **Striking distance, zero clicks** — SMA-14.
- **The head commercial term remains walled.** §19.6's live `es-ES` SERP for
  `medico online` (insurers, aggregators, an AI Overview) has not been retested and
  there is no reason to expect it moved. **[HIST]**

**Language and market settings for any future research:** Google Spain, Spanish,
`es-ES`, DataForSEO location **2724** (Spain). Ireland's package used 2372, Portugal's
2620, Czechia's 2203; **2724 must be verified against `research_keywords` before a paid
batch**, not assumed from the pattern.

### Content and URL ownership

- **Improve before creating.** Every intent Spain currently earns already has an owner:
  doctor profiles own branded demand, the four ex-gated services own their niches, and
  `baja-laboral-por-ansiedad` owns the anxiety sick-leave family. **Zero new pages are
  justified today.**
- **Justified gaps:** none proven. The §19.13 map's MONITOR verdicts still stand for the
  head clusters.
- **Would compete:** any new "médico online España" page — the homepage, the GP hub and
  `consulta-medica-online` already form a supportive cluster (§19.7) and a fourth page
  would split it.
- **Must be excluded:** the public-system sick-leave family the anxiety post already
  attracts. Global Health does not issue the Spanish state *baja*. Content implying
  otherwise is a patient-safety and regulatory problem, not an SEO opportunity.

### Governance

- **Reviewer available:** yes — 13 active Spain doctors, several with CGCOM
  registrations visible on their live profiles.
- **Publication gate:** **none** (SMA-03). This is the binding constraint.
- **Doctor identity evidence:** not audited to Portugal's fact-register standard. Spain
  has no fact register. Portugal's register found one unresolvable identity in 16; Spain
  has 13 unaudited.
- **Capacity:** adequate — 13 clinicians, 24 active services, a live booking path.

**Readiness verdict: READY, once SMA-03 lands.** Spain is the strongest of the three
remaining markets — real growing demand, real clinician supply, an identified low-risk
high-value first batch (metadata), and a measurable striking-distance set. It should be
first.

---

## 9. Romania — audit and readiness assessment

### Baseline [LIVE + GSC]

| Dimension | State |
| --- | --- |
| Sitemap URLs | 299 across six locales; **51 in `ro`** |
| Primary-locale page types | 17 services, 3 doctor profiles plus hub, 7 tools, 5 blog posts, 6 legal, 1 lab-tests hub with no detail pages, plus the standard static set |
| HTTP status | 51/51 → 200 |
| Canonical | 51/51 self-referential |
| Indexability | 51/51 `index, follow` |
| hreflang | 7-tag cluster on 42; gated partials on FAQ and legal |
| H1 | exactly one on every page |
| Structured data | Full parity **except FAQ** — 0 of 17 services (SMA-04) |
| Meta descriptions | **37 of 51 over 160; 20 of 20 on services and doctors** |
| Internal links | homepage → services/doctors verified live **[HIST §20.11]**; `scrisoare-medicala` links to and from `trimiteri-si-investigatii`, verified live |
| GSC footprint | **42 clicks / 3,642 impressions / 1.15% / position 20.4** (searcher-country cut) — up from 19 / 1,240 |
| Primary-locale cut | 31 clicks / ~2,842 impressions on `/romania/ro/*` — up from 7 / 807 **[HIST §20.2]** |
| GA4 coverage | **Zero** (SMA-01) |
| Technical defects | SMA-04 (market-specific), SMA-05, SMA-06 |

### Search opportunity [GSC + HIST]

- **`scrisoare-medicala-cine-o-elibereaza` is the finding of this market.** 235
  impressions, 9 clicks, **position 4.5**, 3.8% CTR — the best position-and-click
  combination anywhere in ES/RO/BR. The medical-letter intent is administrative,
  clinically low-risk, and directly adjacent to a bookable consultation. The editorial
  plan §7.3 already names "improve the existing Romania medical-letter" as a candidate;
  this is the evidence for it.
- **Tools dominate volume, as recorded.** `calorie-calculator` 959 impressions / 10
  clicks / position 9.3; `blood-pressure-chart` 278 / 0; `due-date-calculator` 261 / 1.
  Real Romanian queries, no commercial intent. **[Consistent with HIST §20.3]**
- **Services rank well on almost no volume.** `medic-online-romania` position 3.7 (7
  impressions), `boli-cronice-online` 5.0, `medicina-calatoriei` 5.9,
  `consultatie-neurologie` 9.4. Positions are not the constraint; demand and depth are.
- **Blog pages at good positions with zero clicks:**
  `ce-scade-tensiunea-arteriala-rapid-sigur` position 8.4 / 55 impressions / 0 clicks;
  `boli-cronice-programe-nationale-de-sanatate` 6.3 / 17 / 0.
- **The head terms remain walled.** §20.8's `ro-RO` SERPs for `medic online` and
  `a doua opinie medicala` — a mature dedicated telehealth sector plus MedLife and
  Regina Maria. Not retested; recheck registered for 2026-11-13. **[HIST]**

**Settings for future research:** Google Romania, Romanian, `ro-RO`, DataForSEO location
**2642** (Romania) — **verify before spending credits.**

### Content and URL ownership

- **Improve before creating, emphatically.** Romania's 17 service pages have RO bodies
  of ~700–900 characters against ~7,600–13,800 on their EN siblings **[HIST §20.5]**,
  and zero FAQs. Depth on existing URLs beats any new page.
- **Highest-value single action:** the 17 FAQ sets (SMA-04) plus internal links from
  `scrisoare-medicala` into `medic-online-romania` and `trimiteri-si-investigatii`.
- **Would compete:** a new "medic online România" article. `medic-online-romania` owns
  it at position 3.7 already.
- **Must be excluded:** anything implying Global Health issues the Romanian *concediu
  medical* / state sick note. `sick-note-romania` is inactive with zero 16-month demand
  **[HIST §20.10]** and should stay that way. Also exclude `evaluare-durere` from any
  content push — it is active and indexed with **zero assigned doctors**, a product gap
  content cannot fix.

### Governance

- **Reviewer available:** yes — three CMR-registered doctors, all active with real
  availability: Palaga (pediatrics), Bica (neurology), Brînduș (GP). A GP reviewer for
  17 general-service FAQs is a genuine single-reviewer concentration, matching the
  Portugal precedent — acceptable, but record it as a provisioning limit rather than a
  design choice, exactly as §27.22's amendment does.
- **Publication gate:** **none** (SMA-03). Blocks the FAQ work.
- **Capacity:** thin. Three clinicians against 17 active and 17 unstaffed services. A
  content push cannot create clinical capacity.

**Readiness verdict: READY FOR A NARROW BATCH, once SMA-03 lands.** Scope it to (a) 17
FAQ sets, (b) the metadata trim, (c) internal linking from the medical-letter post. Do
not open a keyword-research programme for a market whose head terms are a confirmed wall
and whose supply is three doctors.

---

## 10. Brazil — audit and readiness assessment

### Baseline [LIVE + GSC]

| Dimension | State |
| --- | --- |
| Sitemap URLs | 136 across **three locales** (`pt`, `en`, `es` — by design); **46 in `pt`** |
| Primary-locale page types | 18 services, **1 doctor profile** plus hub, 7 tools, 3 blog posts, 6 legal, plus the standard static set. No `see-a-specialist`, no `health` guides, no `lab-tests` |
| HTTP status | 46/46 → 200 |
| Canonical | 46/46 self-referential |
| Indexability | 46/46 `index, follow` |
| hreflang | 4 tags (en-BR, pt-BR, es-BR, x-default) — correct for a 3-locale market |
| H1 | exactly one on every page |
| Structured data | Full parity; FAQ 18/18 on services |
| Meta descriptions | **28 of 46 over 160; 19 of 19 on services and the doctor** |
| Retired locales | `/brazil/{cs,de,ro}/*` → one-hop 308 → `/brazil/pt/*`, verified live |
| GSC footprint | **37 clicks / 5,975 impressions / 0.62% / position 12.7** (searcher-country cut) |
| GA4 coverage | **Zero** (SMA-01) |
| Technical defects | SMA-05, SMA-06, SMA-13 |

### Search opportunity [GSC + HIST]

- **A real cluster has emerged that the ledger does not record: laboratory test
  requests.** `/brazil/pt/services/solicitacao-exames-online` 95 impressions / 2 clicks /
  position 5.5; `/brazil/pt/blog/solicitacao-de-exames-laboratoriais-online` 204 / 2 /
  7.8; `/brazil/en/blog/laboratory-test-request-brazil` 193 / 1 / 4.4;
  `/brazil/en/services/solicitacao-exames-online` 5 / 2 / 5.6 at 40% CTR. Positions 4–8
  across four URLs on one intent. §20.9 recorded only the atestado and consulta médica
  walls plus tools; this is different and better.
- **Tools still dominate raw volume**, unchanged: `calorie-calculator` 2,607 impressions
  / 8 clicks; `due-date-calculator` 652 / 2.
- **`/brazil/en/blog/online-medical-certificate-brazil`** 383 impressions / 2 clicks /
  position 3.8 — §20.11 classified this as low-data fragment noise. It has grown but the
  classification still looks right; it is not owning real Portuguese head terms.
- **The head terms remain walled.** §20.8's `pt-BR` SERPs include the CFM's own
  `atestacfm.org.br`, dr.consulta, Einstein, Doctoralia and Bradesco. Denser than any
  other market. Recheck registered for 2026-11-13. **[HIST]**
- **GSC rows for `/brazil/{cs,de}/services/*`** are redirect-source attribution lag from
  the locale retirement, not live duplicates — verified 308 today. This is exactly the
  handover's "redirected URLs cannot compete with their targets" rule; do not read them
  as a duplication finding.

**Settings for future research:** Google Brazil, Brazilian Portuguese, `pt-BR`,
DataForSEO location **2076** (Brazil) — **verify before spending credits.**

### Content and URL ownership

- **One intent is worth owning: `solicitação de exames`.** Four URLs at positions 4–8, a
  real service behind it, administratively low-risk. The correct action is
  **consolidation and internal linking, not a new page** — decide whether the PT service
  page or the PT blog post owns the intent and link the other to it.
- **Everything else: improve or leave.** All 18 service pages have FAQ and real bodies.
- **Must be excluded:** the *atestado médico* head cluster while the CFM's own platform
  occupies the SERP; anything implying Global Health can substitute for a CFM-issued
  certificate; and the 16 unstaffed specialist services, which cannot be sold.

### Governance

- **Reviewer available: one clinician.** Dr Renato Sarmento, GP, assigned to all 18
  active services. A single-reviewer market with no gate is the weakest governance
  position of the six.
- **Publication gate:** **none** (SMA-03).
- **Capacity:** structurally capped. One doctor cannot absorb SEO-driven demand.
- **Brand collision:** persists — `/pt/about` still draws impressions for "clinic global
  health" and "help global", unrelated entities **[HIST §6]**.

**Readiness verdict: DEFERRAL CONFIRMED, with one narrow exception.** The
`editorial-plan-2026-08-19.md` §7.3 deferral ("until clinical capacity and non-brand
search demand improve") is correct, and this audit re-affirms it on fresh evidence: one
clinician, the densest SERP wall of the six markets, 0.62% CTR. **The exception** is the
lab-test cluster, which needs no new content — only a consolidation decision and two
internal links — plus the pt-PT wording fix (SMA-13). Do not build a Brazil keyword
package. Re-test the deferral at 2026-11-13 against two conditions: a second clinician,
or non-brand Portuguese commercial impressions above noise.

---

## 11. Cross-market standardisation recommendations

What the mature packages contain that should become **global standard**:

1. **The `01`–`08` plus `raw/` numbering.** It works; keep it exactly.
2. **The evidence-class vocabulary** (Observed / OpenSEO / GSC / GA4 / Inference, with
   blanks never meaning zero). Ireland's `README.md` states it best; promote that
   wording verbatim into `seo/README.md`.
3. **The ` · Global Health` title-comparison rule.** Czechia and Portugal both carry it
   after it produced 40 false mismatches. It belongs in `seo/README.md` once, not in
   each country README.
4. **The completion matrix with measured HTTP, canonical, hreflang, robots, JSON-LD and
   CTA columns.** This is the artifact that makes a batch auditable.
5. **Hash-bound approval.** Portugal's surviving controls — source fingerprint, exact
   copy SHA-256, per-record token, credential-free DB identity confirmation,
   official-source allowlist, active in-market clinician, Serializable readback — are
   the standard. **With one correction the batch review already identified:** the gate
   binds the SHA of the *draft file*, and two Czech drafts diverged from what the matrix
   showed a reviewer. Bind the hash to the copy the reviewer is shown.
6. **`validate-artifacts.mjs`.** Czechia has it; Ireland and Portugal do not. Promote it
   to `seo/validate-artifacts.mjs` with a country argument.
7. **Registering the measurement gate in the same commit that ships the change.** This
   has now been missed twice — the 2026-09-02 batch review's §3.1, and G18/G19/G20.

What is genuinely **market-specific** and must not be copied:

- Keyword corpus size and method. Portugal retained 8,106 raw rows; Czechia 10,051.
  Romania and Brazil have head terms behind confirmed walls and three and one clinicians
  — a corpus that size would be waste, not rigour.
- Competitor depth. Ireland needed a 282-URL WebDoctor inventory because it has one
  dominant competitor. Romania has a dozen; Brazil has the medical regulator itself.
- Reviewer topology. Portugal's single-reviewer standard was a provisioning limit
  (§27.22 amendment). Spain has 13 clinicians and could support genuine multi-reviewer
  separation; Brazil cannot.
- Locale matrix. Brazil is three locales; the rest are six.
- New-page appetite. Portugal's package recommended **zero** new pages across 24 briefs.
  That restraint, not the artifact count, is what should be copied.

**Do not copy cross-market findings into six folders.** SMA-01, SMA-02, SMA-05, SMA-15,
SMA-16, SMA-21 and SMA-22 are global and belong in the ledger and `docs/audits/seo/`
only.

---

## 12. Prioritised backlog

| ID | P | Scope | Item | Depends on | Effort |
| --- | :-: | --- | --- | --- | --- |
| **SMA-01** | **P0** | Global | Resolve the GA4 property / measurement-ID mismatch | Owner GA4 admin access | Minutes once decided |
| **SMA-02** | P1 | Global | Register `begin_checkout` as a key event | SMA-01 | Minutes |
| LEDGER-01 | P1 | Ledger | Record the 2026-09-04 URL-Inspection readings against G11/G12; extend, do not escalate | — | 15 min |
| **SMA-07** | P1 | Spain | Re-arm the dermatología gate to 28d after the crawl date passes 2026-08-12 | — | 15 min |
| **SMA-03** | P1 | ES/RO/BR | Build the three clinical-approval gates | An eligible reviewer per market | ~150–250 lines plus tests each |
| **SMA-09** | P1 | Spain | Re-check the `baja-laboral` daily series on 2026-09-11 | — | 10 min |
| **SMA-05** | P1 | ES/RO/BR | Metadata batch — 76 descriptions over budget on the commercial surface | SMA-03 for doctor rows | One batch per market |
| **SMA-04** | P1 | Romania | Author 17 RO service FAQ sets | SMA-03 | Content plus review cycle |
| LEDGER-02 | P2 | Ledger | Close §41.1 defects 1 and 3 with today's evidence | — | 10 min |
| LEDGER-03 | P2 | Docs | Correct `seo-production-status-2026-09-04.md` §2.1 and §4 | — | 10 min |
| **SMA-10** | P2 | Ledger | Register gates G18, G19 and G20 | — | 20 min |
| **SMA-14** | P2 | Spain | Inventory the striking-distance set; fold into SMA-05 | SMA-05 | Included |
| **SMA-13** | P2 | Brazil | pt-PT → pt-BR wording sweep, starting with the homepage title | SMA-03 | 1–2 h |
| BR-LAB | P2 | Brazil | Decide the owner of `solicitação de exames` across four URLs; link the rest to it | — | 1 h |
| **SMA-15** | P2 | Global | Table-drive the core-page SEO test across all six markets | — | Half a day |
| **SMA-16** | P3 | Global | BreadcrumbList on legal document sub-pages | — | 1 h |
| **SMA-18** | P3 | Ledger | Superseded-by pointers at §19.5.1 and §19.13 | — | 10 min |
| **SMA-19** | P3 | Ledger | Correct the §3 robots.txt sentence | — | 5 min |
| **SMA-20** | P3 | Docs | Correct the handover's redirect count to 276 | — | 5 min |
| **SMA-17** | P3 | IE/PT/CZ | Decide and record the careers-page hreflang position | — | 20 min |
| **SMA-21** | P3 | Global | Strip the trailing `.` before the title suffix | — | 30 min |
| **SMA-22** | P3 | Docs | Note in the measurement plans that FAQ rich results are gone | — | 10 min |

---

## 13. Recommended execution sequence

**Batch A — measurement, before anything else (1–2 days, mostly owner time).**
SMA-01, then SMA-02. Nothing downstream is worth doing while the conversion half of
every gate reads zero. This also removes the risk of judging G6, G8 and G17 on
2026-09-30 with only half the instrument working.

**Batch B — reconcile the record (half a day, no production change).**
LEDGER-01, LEDGER-02, LEDGER-03, SMA-07, SMA-10, SMA-18, SMA-19, SMA-20. Cheap, and it
stops the next agent re-finding closed work and mis-reading G10.

**Batch C — withdrawn.** This was an internal-linking pass on the published editorial
cohort. Verification found the links already present and reciprocal in all three
markets, so there is no work here; see SMA-08. Batch D moves up.

**Batch D — governance (the substantial one).**
SMA-03, Spain first, then Romania. Skip Brazil until its deferral is re-tested — a gate
for a one-clinician market that is not publishing is premature. Land with tests and a
dry run that refuses an unapproved hash.

**Batch E — Spain's first content batch.**
SMA-05 (Spain) plus SMA-14 in one pass: 37 descriptions and the striking-distance
titles, through the new gate, dry-run first, with a gate registered at 28 days.

**Batch F — Romania's narrow batch.**
SMA-04 (17 FAQ sets) plus SMA-05 (Romania), through the gate, with a registered date.

**Batch G — Brazil exception only.**
BR-LAB consolidation plus SMA-13 wording. No package, no keyword corpus.

**Batch H — global template cleanups.**
SMA-15, SMA-16, SMA-17, SMA-21, SMA-22. Batch them; each alone is not worth a deploy.

**Throughout — the dated gates, unchanged:** 2026-09-06 (G12/G13, extend), 2026-09-08
(G5/G7 read; **G10 do not read**), 2026-09-11 (SMA-09 re-check), 2026-09-24 (G15/G16),
2026-09-28 (G3/G4), 2026-09-30 (G1/G2/G6/G8 and G17's GSC half), 2026-11-13 (G14).

**Only after** Batches A–D does research — keyword master, competitor landscape, content
gap, URL ownership — become worth paying for, and even then only for Spain and Romania,
scoped to what an existing page can own.

---

## 14. Risks, blockers and approval dependencies

| Risk / blocker | Severity | Who resolves it |
| --- | --- | --- |
| **GA4 property mismatch** — every 90-day gate is unreadable, and three prior sessions already mis-read it as "sparse coverage" | **P0** | Owner, in GA4 admin. Not resolvable from this repo |
| **No ES/RO/BR approval gate** — blocks every content batch in three markets, and the already-published profiles never passed one | **P1** | Engineering, then a named clinician per market |
| **Recrawl stall** — three gates fall due within four days and none can be read; second consecutive extension for the doctor cohort | **P1** | Google. Escalate to a crawl-budget finding at G16 (2026-09-24) if it extends again |
| **Reading G10 on 2026-09-08** would record "no movement" as confirming the Spain SERP wall, on a page Google has never crawled since the fix | **P1** | Whoever runs the 09-08 pass — re-arm it first |
| **Spain's best page attracts public-system sick-leave intent** the business cannot serve | **P1** | Commercial and clinical decision, not SEO |
| **Single-reviewer concentration** — Portugal's 44 approvals all held by one clinician; Romania would repeat it; Brazil has one clinician total | **P1** | Owner. Record as a provisioning limit, per §27.22's amendment |
| **Three Czechia pages live and never clinically reviewed** (`live_unreviewed_debt`) | **P1** | A named Czech clinician; carried from §40, unresolved |
| **`beatriz-carvalho` OPP identity conflict** — a live page publishes a registration number that resolves to another person | **P1** | Beatriz, one message. Directory searching is exhausted; do not re-investigate |
| **Six Week-2 parents are `PUBLISHED` while their checklists still say review required** | **P1** | Clinical, native and legal reconciliation, per §27.24 |
| **Brazil clinical capacity** — one doctor for a whole market | **P2** | Hiring decision |
| **Portugal clicks fell 134 → 109** across the two country-scoreboard windows while impressions rose 49% — the only market with declining clicks | **P2** | Watch. The 09-01/02 batch landed after most of this window, so it is pre-batch. Do not act before G8 |
| **Five red CI jobs on `main`** (Semgrep, Backend Tests, Typecheck & Lint, OSV, Trivy) | P2, out of SEO scope | Engineering. `seo-live-urls` is green |
| **Shared clone** — another session's uncommitted work can appear without warning | Standing | Stage by explicit path; never `git add -A` |

---

## 15. Commands, tools, dates and evidence reviewed

**Date of audit:** 2026-09-04. **GSC latest date with data:** 2026-09-01.
**Deployed commit observed live:** `4067d8d6` (from `data-dpl-id` on every page).
**Branch:** `Dev-hassaan`, identical to `origin/main` and `Dev-nauman` at `4067d8d6`.
**Working tree:** clean at the start of this audit.

**Documents read in full:** `AGENTS.md`, `CLAUDE.md`, `seo/README.md`,
`docs/plans/seo-handover-codex.md`, `docs/plans/seo-production-status-2026-09-04.md`,
all six `seo/*/README.md`, `docs/plans/editorial-plan-2026-08-19.md` §7, and
`docs/plans/seo-control-state.md` §§0–7, 19–22, 27.4, 27.22–27.24, 36–41.
`docs/plans/seo-indexation-plan-2026-07-28.md` treated as superseded on status; its §2
and §5 rules were honoured — no new locale-variant `noindex`, no blanket rewrite, no
`/consult/*` redirect proposed.

**Live production probes [LIVE]:**
- `robots.txt`; `sitemap.xml` (2,146 `<loc>`, 2.87 MB)
- A 410-URL Googlebot-UA harvest of every primary-locale sitemap URL, capturing status,
  title length, description length, `<html lang>`, robots, canonical self-reference,
  `<link rel="alternate">` count, `FAQPage` count, `BreadcrumbList` count, `<h1>` count
  and `og:image` presence
- Targeted probes: `/spain/es/legal`, `/romania/ro/legal`,
  `/brazil/pt/legal/refund-policy`, `/portugal/pt/tools/osteoporosis-risk-checker`, the
  four Spain vascular/aesthetic services, the `/brazil/{cs,de,ro}` redirect chains,
  `/home-rm`, and the two top ES/RO blog posts
- A deployed client-bundle scan of 19 `/_next/static/chunks/*.js` for a GA4 measurement
  id

**OpenSEO and Google APIs (read-only, zero credits consumed — balance 12,496 unchanged):**
- `whoami`, `list_projects` → project `7804f362-5891-417e-9c3a-d9e8d4d7dc6b`
- `inspect_urls` × 3 calls, 9 URLs (Sarmento; Palaga, Bica, Brînduș; Irale; Spain
  dermatología; and the three top blog posts). Read from
  `indexStatusResult.coverageState`, never a top-level `verdict`
- `get_search_console_performance` × 7: sitewide by date; by country; by page for
  `/spain/es`, `/romania/ro` and `/brazil/`; by date and by query (paginated) for the
  Spain anxiety post
- `get_google_analytics_measurement_health`, `..._key_events`,
  `..._organic_landing_pages`, `..._traffic_acquisition`

**Repository and git [REPO/GIT]:** `git log`, `git branch -vv`,
`git merge-base --is-ancestor` for `82a054d0`, `30b239ae`, `e5dbdfc1`, `38089b2d`,
`1bddd990`, `3fde5466`, `f6bae862`; `git log -S 'consulta-diagnotico-vascular'`;
`frontend/lib/seo/*`, `frontend/lib/analytics/*`,
`frontend/components/compliance/GoogleAnalytics.tsx`,
`frontend/app/[country]/[lang]/services/[serviceSlug]/page.tsx`,
`frontend/data/countries.ts`, `frontend/next.config.ts`, `frontend/tests/unit/`,
`.github/workflows/ci.yml`, `find . -name '*clinical-approval*'`.
`gh run list` and `gh run view` for CI job status on `main`.

**Deliberately not run:** the ~1,000-page global crawl (`run_site_audit`) — no sitewide
change or global baseline justified it; and no paid keyword, SERP or backlink call — the
existing corpora answer this phase's questions, and a paid batch belongs after the
governance gates exist, not before.

---

## 16. Explicitly excluded or deferred work

**Excluded by the binding rules of `seo-indexation-plan-2026-07-28.md` §5 and ledger
§27.5, and not reconsidered here:** blanket title or description rewrites; mass
`noindex` of locale variants; tool-CTA rebuilds without page-level evidence;
prescription content while the Google Ads trade-off holds; rewriting historical audit
counts to look current; redirects to `/consult/*`; blocking legacy Wix URLs in
`robots.txt`.

**Excluded by evidence, this pass:**
- Reopening any closed technical finding. 410/410 pages pass the technical contract.
- Title-length "fixes". Search titles do not truncate past 60 by an explicit 2026-08-09
  decision, after truncation shipped 352 broken titles and was reverted (`6011acf0`).
- The `brokenPages: 666` backlink figure — re-confirmed noise from a stale Wix crawl.
- The `/brazil/{cs,de}` GSC rows — redirect-source attribution lag, verified 308 today.
- A Brazil keyword or competitor package. The deferral is re-affirmed on fresh evidence.
- New pages in any of the three markets. Every earned intent already has an owner.

**Deferred with a date:** everything in §6's register. Specifically, no conclusion is
drawn about G1, G2, G5, G6, G7, G8, G13, G14 or G17 — their windows have not matured,
and immaturity is not failure.

**Deferred pending a human, not an agent:** the GA4 property decision (SMA-01); the
Brazil FAQ integration question; `beatriz-carvalho`'s registration; Hlavatý's
disposition; the 46 priced-but-dark CZ/PT/IE service pages; the 43 unpriced ones; and
whether Global Health has any commercial answer for the Spanish state-*baja* searcher
its best-performing Spanish page now attracts.

---

## Next approved work batch — recommendation

**Batch A, then Batch B — and nothing else.**

1. **SMA-01** — the owner opens GA4 admin and establishes whether a property exists for
   `G-4PPGECG12X`. Everything about the 30/60/90 programme is downstream of that one
   answer, and no amount of content changes it.
2. **SMA-02** — register `begin_checkout` on whichever property wins.
3. **Batch B** — the ledger and status-sheet reconciliations, including re-arming the
   Spain dermatología gate so 2026-09-08 does not close a live opportunity on evidence
   that never tested it.
**Do not start Batch D (the ES/RO/BR approval gates) in the same session.** It is
150–250 lines plus tests per market and deserves its own scope and review. It is the
right *next* implementation batch — but it should begin only once the measurement it
will eventually be judged by actually works.

**This audit implements none of the above.**
