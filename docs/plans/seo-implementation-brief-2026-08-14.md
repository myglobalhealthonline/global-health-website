# SEO implementation brief — 2026-08-14

Standalone handoff from the multi-market SEO audit run on 2026-08-13/14. Written
to be actioned without the audit conversation.

**Canonical ledger remains `docs/plans/seo-control-state.md`.** This brief is a
scoped work order, not a status document. When an item here lands, record it in
the ledger and strike it here.

Property: `https://www.myglobalhealth.online/` · GSC `sc-domain:myglobalhealth.online`
· OpenSEO project `7804f362-5891-417e-9c3a-d9e8d4d7dc6b`.

---

## 0. Methodology rules (read before re-running anything)

These exist because the audit got things wrong in ways that looked convincing.

1. **Any GSC pull must assert `hasMore: false` before a conclusion is drawn from
   row counts, or it must be re-pulled per segment.** The audit's most confident
   wrong finding — "Portugal is crawl-starved at 10% coverage" — came from a
   1,000-row global pull sorted by clicks descending, where Ireland's high-click
   pages consumed the quota and Portugal's zero-click pages fell past the cut. A
   caveat was flagged and then lost to a compelling pattern. The per-country
   re-pull returned `rowCount: 260, hasMore: false` and put Portugal at ~65%
   coverage. This failure mode will recur in the 90-day re-baseline and will look
   just as persuasive next time.
2. **Absence in GSC is not absence from the site.** Verify existence with the
   sitemap and a live fetch before concluding a page is missing. `inspect_urls`
   is free and gives Google's actual verdict.
3. **Czech, Spanish, Romanian and Portuguese keyword research must use
   diacritics.** `lekar online` returned zero competitors from DataForSEO Labs;
   `lékař online` returned a full field. The first result nearly produced a wrong
   market verdict for Czechia.
4. **`py`, never `python`** (see root `CLAUDE.md`).
5. **Manual Actions and Security Issues have no Search Console API.** They must
   be checked by a human in the GSC UI. No tooling in this repo can read them.
6. **Derive corpora from observed data. Never synthesise them.** Roster, sitemap,
   GSC export, live probe — those are observations. An API's default window, a
   transliterated keyword guess, a parsed formatting convention and a generated
   permutation set are all *constructions*, and a construction is internally
   consistent whether or not it corresponds to anything. **Where synthesis is
   unavoidable, the synthetic portion is reported as UNCOVERED, never as
   passing.**

   This is the single root of every wrong answer this workstream has produced.
   Four instances, one shape:

   | Incident | The rule that replaced reality | What it produced |
   | --- | --- | --- |
   | Truncated GSC pull (§0.1) | API default: 1,000 rows, clicks desc | "Portugal is crawl-starved at 10% coverage." Per-country re-pull: ~65% |
   | Diacritic-free keywords (§0.3) | Transliterate Czech to ASCII | `lekar online` returned zero competitors; `lékař online` a full field |
   | Ledger sweep, 2026-08-14 | "Every code in a row applies to every path in it" | 20 false disagreements, nearly a systematic-ledger-rot finding |
   | Honorific cross-product, 2026-08-14 | Generate every honorific × every live slug | 109 "failures", all URLs like `/ireland-doctors/mgr-grainne-ahern` that never existed |

   The fourth happened *inside the fix for the third*, which is the point: the
   shape is not obvious in the moment, because a constructed corpus fails
   convincingly. All four were caught by checking the instrument rather than the
   result — and none of them by re-reading the conclusion.

---

## 1. Open founder items — these gate §13 ONLY

Neither is technical. They gate the **off-page work in §13** and nothing else.

**Every dev item in §2 through §8 starts today, regardless of what Manual Actions
says.** The redirect fixes, the root-gate template, the build assertion, the
removal policy, the `/health/*` linking, the global-page language versions — none
of them touch the backlink profile and none of them wait. Do not let this section
read as a project-wide hold.

| Item | Why it gates |
| --- | --- |
| Check GSC → Security & Manual Actions | Decides whether the May 2026 link network is a remediation job or noise. Disavow has near-zero upside on a clean profile; the market leader carries worse spam and holds position 1. |
| Was an SEO or link-building vendor engaged April–May 2026? | Two legitimate pharmacy links (`coombecommunitypharmacy.ie` 05-13, `askspud.ie` 05-15) arrived in the same three-week window as ~179 spun-article links from zero-rank farms. That pattern reads as a paid retainer: two real placements as proof of work, the rest volume padding. If yes, it is a link scheme the site paid for and removal-then-disavow is the documented path. If no, ignore it. |

---

## 2. ~~P0 — Czech legacy redirects resolving to 404~~ — DONE 2026-08-14

> **Landed.** All three now 308 to `/czechia/{lang}/doctors` in one hop, both URL
> shapes, all six locales; `mudr-michael-nytra`'s two-hop chain collapsed in the
> same change. 410 was deliberately not used — see ledger `SEO-DOC-004`.
> Deviations from the acceptance text below: (a) the three unresolved clinicians
> land on the roster rather than a 410, because `GONE_DOCTORS` asserts confirmed
> removal and §14.8 of the ledger gates that on evidence none of them has; (b)
> the Czech slug convention is left mixed on purpose — renaming live, ranking
> slugs for cosmetic uniformity adds redirect hops and resets URL history for no
> ranking gain.

Three legacy Czech doctor URLs 308-redirect into pages that return 404. This is
in the highest-CTR market (Czechia, 7.48% CTR, average position 12.0).

| Legacy URL | Redirects to | Result | GSC, 90 days |
| --- | --- | --- | --- |
| `/czechia-doctors/mudr-jana-cyplinska` | `/czechia/cs/doctors/mudr-jana-cyplinska` | **404** | 48 clicks, 30% CTR, position 4.4 |
| `/czechia-doctors/mudr-libor-hlavaty` | `/czechia/cs/doctors/mudr-libor-hlavaty` | **404** | 2 clicks, 567 impressions |
| `/czechia-doctors/mudr-andrei-lavrov` | `/czechia/cs/doctors/mudr-andrei-lavrov` | **404** | 2 clicks |

Working for comparison: `mudr-nataliya-kharlamova` → 200; `mudr-ahmed-maklad` →
`dr-ahmed-maklad` → 200; `mudr-michael-nytra` → `mudr-…` → `dr-michael-nytra` →
200 (two hops, also worth collapsing).

`cyplinska` is documented in `frontend/lib/seo/gone-content.ts` as deliberately
unresolved pending human confirmation of CONFIRMED RETIRED vs LIVE UNDER ANOTHER
IDENTITY. **`hlavaty` and `lavrov` are not documented anywhere** — same broken
shape, silently.

**Acceptance:** every `/czechia-doctors/:slug` either resolves to a 200 in at most
one hop, or answers 410 with an entry in `GONE_DOCTORS` carrying a click cost and
a named approver (see §4). No redirect terminates in a 404. Czech slug convention
unified — the sitemap currently mixes `mudr-` (3), `dr-` (1) and bare (1).

---

## 3. ~~P1 — Root entry gate topology~~ — 3a DONE, 3b REJECTED (2026-08-14)

> **§3a landed** (`75eb1137`): `/` serves exactly 33 crawlable country×language
> anchors, verified in raw HTML from `curl` against the built page, and all 33
> targets return 200 on production.
>
> **§3b is rejected, by owner decision 2026-08-14.** It asks for exactly the
> markup `SEO-FOUNDATION-004` removed on 2026-08-13 with evidence — six pages
> each declaring `/` to be a different language while `/` declares itself
> `x-default`. §3b's own stated rationale ("leaves `/` outside the international
> graph it now links into") is a **link-equity** argument, and §3a's 33 anchors
> deliver that. hreflang is locale-selection, not link-equity, and `/` is not a
> language variant of any market home. The "do 3a and 3b in the same PR"
> instruction above is therefore superseded. See ledger §5b.

`/` is the site's highest-authority page: 5,440 impressions, 357 clicks over 90
days, and the entry point for essentially all 58 referring domains.

Its server-rendered HTML contains **exactly six `<a href>` links**. Not a
JavaScript switcher — real crawlable anchors, but six in total:

```
/ireland/en  /portugal/pt  /spain/es  /brazil/pt  /romania/ro  /czechia/cs
```

Two problems, one template.

### 3a. Six links, and all six are *default* locales

The 27 non-default country×language combos receive nothing from the site's
strongest page. That includes `/ireland/pt`, `/ireland/ro`, `/ireland/cs` and
`/ireland/es` — Portuguese-, Romanian-, Czech- and Spanish-language consultations
for the communities those languages serve in Ireland.

That is the strategic product. A direct competitor (`webdoctor.ie`, 459 referring
domains) earned Irish national press coverage — `extra.ie`, 2025-07-10 — for
adding video consultations in *two* languages. This site runs six, with verified
full-length translated content (4,224–4,712 words per Ireland locale), and has
zero coverage. The topology starves precisely the differentiator.

**Scope: 33 anchors, not 6.** Six country homes plus their language alternates.
Still a small footer.

### 3b. `/` has no hreflang and no `x-default`

`/` is one of seven global pages with no hreflang at all — the others are
`/about`, `/blog`, `/faq`, `/contact`, `/privacy`, `/terms`. Across the other
1,893 sitemap URLs, hreflang is clean: zero non-reciprocal pairs, zero malformed
`lang-REGION` codes, zero targets outside the sitemap.

`/` should carry `x-default` and alternates to the six country homes.

**Do 3a and 3b in the same PR.** Same template, same file, and the two reinforce
each other — adding the anchors without the hreflang leaves `/` outside the
international graph it now links into.

**Acceptance:** `/` serves 33 crawlable country×language anchors and a complete
hreflang block including `x-default`. Verify by fetching `/` with `curl` and
counting `<a href>` matches in the raw HTML, not the rendered DOM.

---

## 4. ~~P1 — Build-time assertion (retires a class of defect)~~ — DONE 2026-08-14

> **Landed.** `frontend/tests/unit/seo-live-urls.test.ts` + the `seo-live-urls`
> CI job. All three bullets asserted; the three Czech URLs are fixtures, and the
> check currently *fails* on them against production because the §2 fix is not
> deployed — which is the acceptance criterion demonstrated rather than claimed.
> Taken before §3 on the evidence that a `CLOSED — VERIFIED BY PRODUCTION CHECK`
> ledger row was wrong. See ledger `SEO-DOC-005` for the coverage ceiling
> (99 of 364 rules probed) and why this is not a pull-request gate.

The Czech 404s and the `gone-content.ts` policy are the same failure: a redirect
map and a removal list that nothing validates against the live doctor set. The
team catches these when something surfaces them — `cyplinska` was 410'd and
reverted the same day on evidence review — but nothing surfaces them.

Add a build- or CI-time check:

- Every `next.config.ts` redirect target resolves to a 200 (or an intentional,
  listed 410). No redirect terminates in a 404.
- Every sitemap entry returns 200.
- Every `GONE_DOCTORS` entry carries a documented click cost and a named approver.

**Acceptance:** the check fails CI on a redirect pointing at a dead slug. Add the
three Czech URLs from §2 as fixtures.

---

## 5. P1 — `gone-content.ts` 410 policy

`GONE_DOCTORS` currently holds **one** entry: `dr-grainne-ahern`, whose own file
header records the cost — *"74 clicks / 600 impressions over 90 days across 4 URL
variants, average position 3.8."* Both the legacy and current-shape URLs answer
410.

The file's reasoning optimises for index hygiene and discounts a measured traffic
loss. A patient searching an Irish GP's name is live commercial demand, not a
navigational curiosity. The header's stated objection to redirecting — that a
listing page "never names them" — is solved by the destination page, not by
serving 410.

Preserve what the file gets right: *"Absence is not evidence of removal on its
own."* That standard is correct and the `cyplinska` revert applied it properly.

**Proposed policy:** a departed clinician gets a page that states they no longer
practise on the platform and lists clinicians in the same specialty and language.
It captures the intent without implying availability. 410 is reserved for entities
with no successor intent at all.

Catch this at n=1, before it becomes a repeated pattern.

---

## 6. P1 — `/health/*` reachability

`/ireland/en/health/hypertension` is **"Discovered – currently not indexed"** with
no `lastCrawlTime`, no `pageFetchState`, no `crawledAs`. It has never been
fetched. Its only `referringUrls` are its own Czech and Spanish translations.

The five sibling translations are all "Submitted and indexed", crawled
2026-07-23/25. English queries in Ireland (`blood pressure medication online`,
`can i get blood pressure meds online`) are consequently served by the `cs`, `es`
and `pt` pages at positions 39–94, because those are the only versions Google has.

Root cause: the `/health/*` family is reachable only via the locale switcher.
Nothing in the English site links into it. §3 addresses the origin; this item
addresses the family.

**Note the scope limit.** An earlier version of this finding claimed Portugal,
Spain and Romania were crawl-starved market-wide. That was a truncation artefact
(see §0.1) and is **withdrawn** — Portugal sits at roughly 65% coverage and its
pages are crawled and indexed. What stands is this per-page verdict, verified
directly by `inspect_urls`.

**Acceptance:** `/health/*` pages carry inbound links from country homes, related
service pages and blog articles in the same language. Re-run `inspect_urls` on a
sample after deployment and confirm `lastCrawlTime` becomes non-null.

---

## 7. P1 — Six global pages need language versions

`/about`, `/faq` and `/blog` are English-only on a six-language site. `/pt/about`
308-redirects a Portuguese searcher into English at position 19.4. `/about` draws
1,323 impressions, `/blog` 127.

**Scope deliberately narrow: six *language* versions, not 33.** The country
dimension adds nothing to an About page. All seven global pages (including `/`,
per §3b) get self-referencing hreflang plus `x-default`.

---

## 8. P2 — Metadata length budget

- 140 meta descriptions over 160 characters (median 205, max 252)
- 101 titles over 60 characters (max 80)

Distribution is even across all six languages — pt 24, es 24, ro 24, cs 23,
de 23, en 22 — which is the signature of one length budget written for English
and never re-tuned for the 15–25% expansion of RO/ES/CS/DE.

**Fix once at the generator with per-language budgets.** Do not edit 241 pages.

Also `/brazil/pt` `<title>` reads "Clínicos e Especialistas **Registados**" —
European Portuguese in the SERP-visible string while the description correctly
uses "registrado". One word.

---

## 9. P2 — Tool pages are miscast

Roughly 60 Irish and 35 Brazilian queries resolve to `/tools/*` at positions
44–96 with **zero clicks**. `/brazil/pt/tools/calorie-calculator`: 905
impressions, 3 clicks. The pattern is sitewide, not market-specific.

`webdoctor.ie/bmi-calculator/` earns links from **ucd.ie**, `layahealthcare.ie`
(insurer) and `corksports.ie`. Same asset class, opposite use: theirs earns
authority, yours chases rankings it will not win at 58 referring domains.

**Recast tools as link assets.** Give them a links-earned target, not a position
target. Report them as a separate GSC segment from commercial pages (see §11).

---

## 10. P2/P3 — Remaining technical items

| Item | Detail |
| --- | --- |
| `/ireland/en` LCP 3.6 s | PSI mobile 89, CLS 0, TBT 90 ms, server response 20 ms. 705 KB raw HTML is 80.8 KB compressed. Composition: 221 KB RSC flight (31.3%), 104 KB inline SVG (14.7%), 29.8 KB visible text (4.2%). Externalise repeated SVG first. |
| `neschopenka-online` slow | `/czechia/{cs,en}/services/neschopenka-online` at 1,796 / 1,816 ms. |
| Prune | `romania/es` (42 URLs, zero clicks and zero impressions) and `czechia/{es,pt,de}` (126 URLs, impressions only). 168 URLs, ~9% of the country×language surface. **Tidy, not a fix** — do not let it be mistaken for one. Keep serving for locale switching; `noindex` only. |
| HTTP/1.1 | No `alt-svc`, no h2/h3. Edge config. |
| `<html lang="pt">` | Identical on `/brazil/pt` and `/portugal/pt`. hreflang distinguishes them correctly; the lang attribute does not. |
| Schema gaps | `MedicalWebPage` and `Service` absent. `llms.txt` lists 2 articles against a much larger blog. |

Verified healthy, do not re-audit: hreflang graph (1,893 URLs clean), geo-IP (no
redirects; Googlebot and all `Accept-Language` variants receive 200 on `/`),
security headers (CSP, HSTS preload, permissions-policy, referrer-policy), AI
crawler access (12 UAs allowed, serving parity confirmed byte-for-byte across
GPTBot / ClaudeBot / PerplexityBot / browser), E-E-A-T markup (`Article` with
`author`, `reviewedBy`, `lastReviewed`; `Physician` with `hasCredential`,
`knowsLanguage`; emergency numbers 999/112 present).

---

## 11. Measurement

**Segment GSC reporting.** Ireland's 20.1 average position is dominated by ~60
tool-page queries at 44–96. A blended target is hittable by deindexing calculators
and teaches nothing.

| Segment | Filter | Target |
| --- | --- | --- |
| Commercial | page contains `/services/`, `/doctors/`, `/gp-consultation-online`, `/see-a-specialist`, `/lab-tests/`, country homes | −3 positions at 90 days, −6 at 180 |
| Tools / informational | `/tools/`, `/health/`, `/blog/` | Report only. Links-earned target, no position target. |

### Commercial baseline — measured 2026-08-14

`/services/` pages only, 2026-05-10 → 08-10. `rowCount: 494, hasMore: false`
(rule §0.1 satisfied). Position is impressions-weighted.

| Market | Pages | Clicks | Impressions | CTR | Avg position |
| --- | --- | --- | --- | --- | --- |
| **All `/services/`** | **494** | **103** | **6,408** | **1.61%** | **21.7** |
| Czechia | 60 | 34 | 624 | 5.45% | **13.0** |
| Spain | 89 | 28 | 1,387 | 2.02% | 22.5 |
| Portugal | 113 | 14 | 1,607 | 0.87% | 20.3 |
| Ireland | 94 | 14 | 1,810 | 0.77% | **28.4** |
| Brazil | 69 | 9 | 588 | 1.53% | 10.3 |
| Romania | 69 | 4 | 392 | 1.02% | 24.2 |

**90-day target: 21.7 → 18.7 sitewide commercial. 180-day: → 15.7.**

Two things this baseline shows that the blended numbers hid:

- **Ireland's commercial pages are the worst-positioned of any market (28.4)**
  while Ireland's blended average is 20.1. The blended figure was flattered by
  brand and legacy doctor URLs. Ireland's *service* pages are further from page
  one than Romania's.
- **Czechia's commercial segment is genuinely strong** — position 13.0 at 5.45%
  CTR, the best of any market on 60 pages. That is not a rounding artefact of a
  small base; it is the `muzske-zdravi` / `lekar-online-praha` pattern working,
  and it is the template to copy.

Extend the baseline to `/doctors/`, `/lab-tests/` and the country homes before
the re-baseline if a fuller commercial figure is wanted; `/services/` alone is a
valid and stable comparison basis on its own.

| Metric | Baseline (2026-05-10 → 08-10) | 90 days | 180 days |
| --- | --- | --- | --- |
| Referring domains | 58 | 70 | 110 |
| — national health / media / community | 2 | 4 | 20 |
| Ireland clicks | 452 | 600 | 850 |
| Portugal clicks | 369 | 450 | 600 |
| Czechia clicks | 198 | 280 | 400 |
| CrUX field data | none (below traffic threshold) | any record | LCP p75 < 2.5 s |

Re-run for the next review — all free except backlinks (~200 credits):
`get_search_console_performance` (country, then page **per country**, asserting
`hasMore: false`) · `get_backlinks_overview` · re-parse `sitemap.xml` for hreflang
reciprocity · PSI on `/ireland/en` · `inspect_urls` on a `/health/*` sample.

Credits remaining at handoff: ~700. Nothing worth buying before the re-baseline.

---

## 12. Market verdicts — final, nothing retires on winnability

| Market | 90d clicks / impressions | SERP structure | Verdict |
| --- | --- | --- | --- |
| **Ireland** | 452 / 8,555 — but see §12a: **commercial pages sit at position 28.4**, the worst of any market | No HSE anywhere. Nine commercial `.ie` operators, several with ETV under 15. Leader `webdoctor.ie` (459 referring domains). | **Winnable, and priority — but on openness and the community-language product, not on current traction.** The 452 clicks are brand queries and doctor-name pages. Organic revenue contribution from commercial pages is close to zero today. Hold the priority knowingly; do not infer it from the blended 20.1, which brand traffic was propping up. |
| **Portugal** | 369 / 6,395 | `sns24.gov.pt` positions 1–2, Ordem dos Médicos, CUF, Hospital da Luz. Three established commercial specialists below. | Head terms walled. Long-tail service pages only — `certificado-medico-carta-de-conducao` already at position 14.8. |
| **Czechia** | 198 / 2,647 | `online lékař`: commercial `konzultacelekare.cz` at 1, insurers at 2 and 6. `telemedicína`: institutional. `neschopenka` terms: no competitive field (ČSSZ owns it). | **Split.** Commercial head is enterable. Do not run a `neschopenka` campaign — `/czechia/cs/services/neschopenka-online` sits at 16.6 against the state system. Build more `muzske-zdravi-online` (position 2.2) and `lekar-online-praha` (5.9) shaped pages. |
| **Romania** ⚠️ **DO NOT RETIRE — the low click count is the argument FOR investing, not against** | 22 / 1,240 | `medic online`: `medic.chat` at 1, Regina Maria and MedLife at 2–3, then nine commercial sites. **No state service, no regulator, no institutional presence anywhere in the top 14 — the only market in the audit with a completely unobstructed SERP.** | **Fully open and starved of authority.** 22 clicks in an unobstructed field measures referring-domain count, not market viability. Every other market has something structural in the way; Romania has nothing but our own weakness. Retiring it would cut the one market where authority converts directly to position. |
| **Spain** | 148 / 4,552 | Five insurers in the top 30 (Sanitas, Caser, Asisa, Aegon, Generali), three in the top 10. Online consultation is a bundled insurance benefit. | Confirms `SEO-GROWTH-013` independently. Correctly deprioritised. |
| **Brazil** | 49 / 4,358 | Not measured. GSC shows no commercial queries at all — impressions are entirely calculator tools at positions 40–78. Content localisation is genuine (BR verb forms, R$, correct `pt-BR` cluster). | **Not an SEO question.** Whether consultations can legally be delivered in Brazil is a legal matter requiring qualified counsel. That answer decides whether Brazil stays in the matrix. |

---

## 12a. First move on content — port the Czech pattern to Ireland, but test it

**This is the audit's conclusion, and it is not the one it started with.** The
opening assumption was that Ireland is the priority market and should compete for
Irish head terms. The segmented baseline in §11 says otherwise.

### What the numbers actually say

| | Commercial position | Commercial CTR | Blended position |
| --- | --- | --- | --- |
| Ireland | **28.4** | 0.77% | 20.1 |
| Czechia | **13.0** | 5.45% | 12.0 |

Ireland's blended 20.1 is brand queries (`global health`, `global health ireland`)
and doctor-name pages (`dr grainne ahern galway` at position 1.9). Strip those and
the pages that convert sit at 28.4 — **further from page one than Romania's**.
Ireland has been contesting `online gp ireland` against a leader with 459
referring domains from a base of 58, and losing at 28.4.

Czechia is the only working commercial pattern in the audit, and its shape is
legible:

- `muzske-zdravi-online` — **position 2.2, 22.2% CTR** — niche-clinical
- `lekar-online-praha` — **position 5.9, 12% CTR** — city-local

Neither is a head term. Both are specific enough that a low-authority site can
rank.

### The move

Build the Irish equivalents — specialty-plus-city and niche-clinical, not head
terms:

- `online-doctor-dublin`, `online-doctor-cork`, `online-doctor-galway`
- `mens-health-online-ireland`, `womens-health-online-ireland`
- specialty-plus-city combinations where the SERP is thin

Let `online gp ireland` come later, once referring domains support it. The §13
community-language angle compounds here: `portuguese-speaking-doctor-dublin` is
both a thin SERP and the differentiator no competitor has.

### Caution — do not port this wholesale

**Some of Czechia's 13.0 is market structure, not page strategy.** The Czech field
is smaller and less contested than Ireland's; `find_serp_competitors` returned a
thinner competitor set for `online lékař` than for `online gp ireland`. The
pattern is a hypothesis with strong supporting evidence, not a proven transfer.

**Test on three or four Irish pages and check position at 60 days before
committing the content budget.** If the test pages reach the teens, scale. If they
stall in the 20s, the 13.0 was Czech market structure and Ireland needs the
authority work in §13 first.

Record the test pages and their day-0 positions in the ledger when they ship, or
the 60-day read has no baseline — the same failure §11 was written to prevent.

---

## 13. Off-page — the channel, once §1 clears

58 referring domains against the Irish leader's 459. 38% of backlinks come from
`wix.to` (migration residue). Two legitimate health links, both `.ie`. Five
markets at zero.

`webdoctor.ie`'s profile shows the mechanism, and it is mostly unpaid:

- **Irish national media** — irishtimes, irishmirror, rsvplive, joe, extra, image,
  businessplus, fm104, q102, boards, rollercoaster. All trace to one thing: a
  named clinician giving quotable commentary (`Dr Ahmeda Ali` is the anchor or
  subject on several).
- **Pharmacy referral partnerships** — mccabespharmacy, pharmhealth, both deep
  "Book an Appointment" links. This is the same vein as Coombe and askspud.
- **Universities and insurers** — ucd.ie, dcu.ie, layahealthcare.ie, several
  pointing at their BMI calculator (see §9).

**Start with migrant community media, national association sites and
community-support directories in Ireland.** Same editorial channel as the national
press at a fraction of the difficulty, and it maps one-to-one onto the six
languages already served. Chasing irishtimes.com from 58 domains is a multi-year
game; a Portuguese- or Romanian-language Irish community site linking to a GP
service that consults in that language is an easier and more relevant ask.

This is outreach. It does not queue behind the dev work — but it does wait on §1.

---

## 14. Not measured

1. **Manual Actions / Security Issues** — no API exists. Human check required.
2. **CWV field data** — CrUX has no record at URL or origin level, either form
   factor. All performance numbers in §10 are lab-only.
3. **Local SEO** — deliberately out of scope. A telemedicine service with no
   consulting rooms has no local pack to win, and manufacturing local presence on
   a medical brand is a suspension risk. Record the local dimension as **N/A —
   service-area model**, not "unmeasured".
4. **SERP composition** — no AI Overview, PAA, local pack or featured snippet
   data. Competitor positions come from DataForSEO Labs comparison, not live
   SERPs.
5. **Brazil competitor field** — not measured.
6. **Link vendor question** — internal, see §1.
