> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../plans/seo-control-state.md).** The counts, statuses and priorities below are a record of what was true when this document was written. Do not treat them as current.

# Legacy redirect recovery — batch 1 (certain mappings only)

Date: 2026-08-08 · Data: 90-day GSC page export (`sc-domain:myglobalhealth.online`)
+ live production probing + the public roster API.

## Method

1. Exported every page with impressions in GSC over 90 days (1,408 URLs) and
   split them by path shape: `current` = `/{country}/{locale}/…`, everything
   else = `legacy`.
2. Followed the full redirect chain of all 478 legacy-shaped URLs on production
   with a Googlebot UA, recording every hop, the terminal status, the terminal
   `robots` meta and the terminal canonical.
3. For each URL terminating in a 404, resolved the target slug against the live
   public roster for that market, then against every other market's roster.

Legacy-shaped URLs carry **935 clicks / 30,027 impressions** — 3.6x the clicks
of all current-shaped URLs combined (256). This is the equity at stake.

## Chain audit result (478 legacy URLs)

| Outcome | URLs | Clicks | Impressions |
| --- | --- | --- | --- |
| Terminal 200 | 449 | — | — |
| **Terminal 404** | **29** | **186** | **1,540** |
| — of which now 410 (retired) | 1 | 69 | 489 |
| Terminal 5xx | 0 | — | — |
| Multi-hop (>1 redirect) | 33 | 122 | 1,262 |
| Terminal is `noindex` | 81 | 413 | 4,841 |
| Terminal not self-canonical | 7 | — | — |

All 82 **static** redirect rules in `next.config.ts` were probed separately:
82/82 resolve in one hop to a 200 that is `index, follow` and self-canonical.
No static rule is broken.

Every one of the 29 terminal-404s is a **doctor** URL. The broad
`/{country}-doctors/:slug` rules rewrite the slug unchanged, so any doctor whose
slug changed — or who left — lands on a 404 while still returning a healthy 308.
Silent equity loss.

## Implemented this batch — 2 mappings, HIGH confidence only

Both are the same clinician under a corrected slug. Both targets were verified
live: HTTP 200, `index, follow`, self-canonical, same market.

| Old URL | Clicks | Impr | Target | Target status | Robots | Canonical | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/ireland-doctors/dr-miraim-faiz` | 9 | 227 | `/ireland/en/doctors/dr-mariam-faiz` | 200 | index, follow | self | HIGH — transposed vowels, same person ("Dr Mariam Faiz") |
| `/ireland-doctors/silvia-alexandra-raminhos-fernandes` | 0 | 40 | `/ireland/en/doctors/silvia-alexandre-fernandes` | 200 | index, follow | self | HIGH — same person ("Silvia Alexandre Fernandes"), shortened slug |

Locale-prefixed variants (`/{cs|es|pt|ro}/ireland-doctors/…`) were added for both.
They carry no GSC impressions of their own, but the existing locale-prefixed
broad rules match them and would send them into the same 404 — so covering them
flattens a known-bad chain rather than inventing a new mapping.

Recovered: **9 clicks / 267 impressions**.

## Retired — Dr Gráinne Ahern, 410 Gone

Confirmed departed by the owner on 2026-08-08. Removed from the ambiguous
bucket: this is not a redirect decision, it is intentionally retired content.
No profile restored, no redirect to another clinician, no redirect to the
`/doctors` listing.

**14 URL shapes now answer 410 Gone in one hop** — the 4 that carried traffic
plus every locale variant of both URL shapes:

| URL | Clicks | Impr | Before | After |
| --- | --- | --- | --- | --- |
| `/ireland-doctors/dr-grainne-ahern` | 69 | 489 | 308 → dead URL → 404 | **410, 0 hops** |
| `/ireland/en/doctors/dr-grainne-ahern` | 5 | 101 | 404 | **410** |
| `/ireland/cs/doctors/dr-grainne-ahern` | 0 | 6 | 404 | **410** |
| `/ireland/ro/doctors/dr-grainne-ahern` | 0 | 4 | 404 | **410** |
| `/{en,pt,es,cs,ro,de}/ireland-doctors/dr-grainne-ahern` | — | — | 308 → dead URL → 404 | **410, 0 hops** |
| `/ireland/{pt,es,de}/doctors/dr-grainne-ahern` | — | — | 404 | **410** |

Trailing-slash forms of each are covered.

Absence verified: **not in the live roster API for any of the 6 markets**, **not
in the production XML sitemap** (0 matches), not referenced anywhere in the
frontend, so not in any doctor listing, internal link, hreflang set, structured
data block or related-doctor reference. No redirect rule names her.

### Implementation note — why this needed two changes, not one

Middleware alone was not enough. **Next evaluates `redirects()` BEFORE
middleware**, so with only the 410 handler in place the broad
`/ireland-doctors/:slug` rule still won and the legacy URL answered 308 onto a
URL that then answered 410 — the exact two-hop shape the removal was meant to
eliminate. Verified live, not assumed.

So the broad Ireland rules now exclude removed slugs via
`slugMatcherExcludingGone()`, and `lib/seo/gone-content.ts` is the single list
both halves read. Two further details were also found live rather than reasoned
out, both documented at the call site: the slug matcher must be `[^/]+` (not
`.*`, which spans `/`) and the exclusion must anchor on `/?$` (not `$`, because
path-to-regexp compiles non-strict and the trailing-slash form slipped through).

### One residual risk

`backend/scripts/data/ireland-doctors-datasheet.ts` still carries her full
profile — bio, SEO copy, FAQs, IMC 408777. It is consumed by
`backend/scripts/applied/patch-ireland-doctors-datasheet.ts`, an already-run
one-off, so nothing republishes her automatically. **But re-running that script
would restore the profile.** Left in place deliberately: removing clinical
content from a datasheet is a content decision, not part of legacy-redirect
work. Flagging it as the single republication vector.

## NEEDS HUMAN DECISION — 13 doctors, 26 legacy URLs, 108 clicks, 784 impressions

None of these slugs resolves to any doctor on any live market roster. They are
either departed clinicians or profiles that are unpublished. **No redirect has
been invented for them and they still 404.**

Deciding requires two things I cannot determine from outside: whether the person
is genuinely gone (vs. merely unpublished, which is a publication-flag question
this batch is barred from touching), and whether sending a patient searching for
a named doctor to a listing page satisfies their intent or annoys them.

| Old URL (highest-traffic variant) | Other variants | Clicks | Impr | Market | Historical entity |
| --- | --- | --- | --- | --- | --- |
| `/es/czechia-doctors/mudr-jana-cyplinska` | +4 | 48 | 225 | czechia | MUDr. Jana Cyplinska |
| `/pt/portugal-doctors/dr-vitor-pais` | +1 | 40 | 242 | portugal | Dr Vitor Pais |
| `/ireland-doctors/dr-mirza-aun-mohammad` | +2 | 8 | 132 | ireland | Dr Mirza Aun Mohammad |
| `/pt/ireland-doctors/dr-julieta-janik` | +1 | 3 | 48 | ireland | Dr Julieta Janik |
| `/es/spain-doctors/irene-galve-moros` | +2 | 3 | 9 | spain | Irene Galve Moros |
| `/czechia-doctors/mudr-andrei-lavrov` | — | 2 | 17 | czechia | MUDr. Andrei Lavrov |
| `/pt/portugal-doctors/dra-ana-jerónimo` | +1 | 2 | 16 | portugal | Dra. Ana Jerónimo |
| `/pt/spain-doctors/dr-pablo-esteban-martinez` | — | 2 | 5 | spain | Dr Pablo Esteban Martinez |
| `/ireland-doctors/dr-mala-vili-rajan` | +1 | 0 | 55 | ireland | Dr Mala Vili Rajan |
| `/ro/ireland-doctors/dr-andra-cristea` | — | 0 | 16 | ireland | Dr Andra Cristea |
| `/portugal-doctors/dr-luis-infante` | +1 | 0 | 11 | portugal | Dr Luis Infante |
| `/pt/spain-doctors/dr-yliana-muñoz-bravo` | — | 0 | 7 | spain | Dr Yliana Muñoz Bravo |
| `/pt/spain-doctors/dr-daniela-stefani-` | — | 0 | 1 | spain | Dr Daniela Stefani (trailing hyphen — truncated Wix slug) |

Closest current destination for every row is that market's `/doctors` listing,
which is live and indexable. Whether that satisfies intent is the open question:
a query for a named clinician is navigational, and a listing page answers "this
person is not here" only implicitly. The top two rows are 88 of the 108
clicks — decide those first.

One row worth separating out when the decision is made:

- **`dr-daniela-stefani-`** has a trailing hyphen; it may be a truncated Wix
  slug rather than a real profile. Verify the entity exists at all.

## Explicitly out of scope for this batch

- **81 legacy URLs terminate on a `noindex` page** (413 clicks / 4,841
  impressions). Larger than everything above combined. Separate batch.
- **33 legacy URLs are multi-hop** (122 clicks / 1,262 impressions). None of
  them are the two mappings implemented here, so no chain was flattened beyond
  the ones this batch touched.
- **7 legacy URLs terminate on a page that is not self-canonical.**
- The 160 generic-hub mappings, ambiguous discontinued content, and anything
  requiring an editorial or product decision.

## Batch 2 — re-run + implementation (same day)

Re-pulled the GSC page export via the OpenSEO MCP (90 days, 2026-05-05 →
2026-08-05, 1,419 page rows total) rather than assuming batch 1's counts still
held. **490 legacy-shaped URLs this time** (1,329 clicks / 36,560 impressions)
— both counts higher than batch 1's, consistent with the wider/more recent
window, not a regression.

| Outcome | URLs | Clicks | Impr |
| --- | --- | --- | --- |
| Clean one-hop | 391 | 520 | 24,196 |
| Multi-hop | 15 | 55 | 528 |
| Terminal 404 | 29 | 119 | 837 |
| Terminal 410 (Gráinne, batch 1) | 1 | 74 | 519 |
| Terminal noindex | 48 | 201 | 3,387 |
| Live global pages (`/`, `/about`, `/blog`, …) — not a defect | 6 | 360 | 7,093 |

**Terminal-noindex fell from 81 → 48** — not this batch's work; the doctor/
service indexability alignment done earlier the same day
(`isPublicDoctorRecordIndexable` / `isPublicServiceRecordIndexable`) already
recovered part of this bucket as a side effect.

### Jana Cyplinska: 410 shipped, then REVERTED same day — insufficient evidence

Batch 2 originally shipped a 410 on database-absence evidence alone (all 8
Czechia doctor rows checked, active or not, zero match). That commit reached
`origin/main`. Before deploying, re-examined the decision per an explicit
instruction that absence-from-the-database is not by itself sufficient
evidence of permanent removal — Gráinne's 410 had an owner statement behind
it; Jana's had only an inference.

Widened the search: git history (`git log --all -S"cyplinska"` across every
branch — only this project's own audit-doc commits reference her, nothing
external), historical datasheets (`backend/scripts/data/*-doctors-datasheet.ts`
exists for Ireland, Portugal and Spain — **no `czechia-doctors-datasheet.ts`
was ever authored**, so the Czechia roster may never have gone through the
same migration mechanism the other three markets did, meaning she may simply
never have been re-entered on this platform rather than having been removed
from it), and the `AuditLog` table (860 Doctor-entity rows exist, so it is
populated and not a stub — zero of them mention her name in `metadata`).

Three independent negatives, still no positive confirmation of retirement,
and one plausible alternative explanation (migration gap, not departure) that
Gráinne's case never had. Conclusion: **UNKNOWN / NO CURRENT MATCH**, not
CONFIRMED RETIRED. Reverted — `mudr-jana-cyplinska` removed from
`GONE_DOCTORS`. Her URLs are back to the pre-batch-2 state: 404 (via the
unexcluded broad `/czechia-doctors/:slug` rule → the doctor page's own
`missingConfirmed` 404), not redirected to another clinician or to
`/doctors`, pending a human decision.

### Implemented — Vitor Pais: redirect to the live profile

`dr-vitor-pais` (legacy) → `dr-vitor-hugo-de-matos-pais` (live): same OM
registration pattern of Wix truncating to first+last name that produced the
Mariam Faiz and Silvia Fernandes corrections in batch 1. Confirmed via the
country-scoped API: same market (Portugal), same specialty (General
Practice), long-form bio present, registration 64505. 3 URL shapes (41 clicks
/ 245 impressions) now 301 in one hop.

**The target page is currently `noindex`** — same root cause found across 15
other doctors below, not a redirect defect. The redirect fix is complete and
correct; the clicks will not actually return until that flag is addressed
(out of scope here, see below).

### Implemented — 5 collapsed 2-hop chains

Each already resolved correctly in 2 hops (broad `/{country}-doctors/:slug`
rule → the doctor page's own de-accented/alias-slug redirect). Same person,
same market, both hops individually correct — flattened to 1 per the
"collapse rather than retain" rule. 55 clicks / 528 impressions moved from
2-hop to 1-hop; no equity was being lost, this is pure efficiency.

| Old slug | Live slug | Market |
| --- | --- | --- |
| `dr.-mohamed-fadzly-mustafar` | `dr-mohamed-fadzly-bin-mohamed` | Ireland |
| `dr-khoiamul-islam` | `khoiamul-islam` | Ireland |
| `dr-maristela-ferro-nepomuceno` | `maristela-ferro-nepomuceno` | Ireland |
| `mudr-ahmed-maklad` | `dr-ahmed-maklad` | Czechia |
| `javier-villarte-betancor` | `dr-javier-villarte-betancor` | Spain |

(`tomás-ruiz-palacios` → `dr-tomas-ruiz-palacios`, 1 click, was evaluated but
not implemented — see below.)

### Found, not implemented — root cause of most of the noindex-terminal bucket

Ran a database check across the 22 doctors behind the noindex-terminal rows.
**15 of them have complete public content — 2,400–4,700-character bios,
registration numbers, active — held back by nothing except
`editorialChecklist.readyToIndex` never being set to `true`.** 119 clicks /
2,269 impressions. Vitor Pais above makes 16.

This is `B. technical publication bug`, not `C. incomplete editorial
content` — but "the content is obviously fine" is not the same permission as
"flip the flag", and the batch instructions are explicit: do not set
`readyToIndex` to recover traffic. Reported, not touched.

The remaining 6 noindex-terminal doctors (82 clicks / 871 impressions) have
`bio` genuinely empty — `C. incomplete editorial content`, real, no fix
attempted (would require inventing clinical copy).

The 3 noindex-terminal rows with 0 clicks / 247 impressions pointing at
`consulta-online-medicina-estetica` and `consulta-salud-vascular-circulatoria`
are two of the four Spain services this same session correctly noindexed
earlier (empty `detailBody`) — the redirect is correct, the noindex is
correct, nothing to do here.

### Investigated, left unresolved — 10 more doctors, precisely classified this time

Full database dump (all rows, any active state, for ie/pt/es/cz) instead of
the active-only public API used in batch 1:

**Exact slug already exists, `active: false`** — a publication-flag decision
only, zero redirect ambiguity if/when reactivated. Not touched (same
restriction as `readyToIndex` — this batch does not flip publication state):

| Old slug | Existing row | Country | Clicks/Impr |
| --- | --- | --- | --- |
| `dr-mirza-aun-mohammad` | `dr-mirza-aun-mohammad` (exact) | Ireland | 8 / 134 |
| `dr-andra-cristea` | `dr-andra-cristea` (exact) | Ireland | 0 / 16 |
| `irene-galve-moros` | `dr-irene-galve-moros` | Spain | 3 / 9 |

**No matching row anywhere** — same evidentiary tier as Jana, but not named
in this batch's instructions for individual deep-dive treatment, so left in
the reporting bucket rather than auto-implementing more 410s beyond what was
asked:

| Old slug | Country | Clicks/Impr |
| --- | --- | --- |
| `dr-julieta-janik` | Ireland | 3 / 49 |
| `dra-ana-jerónimo` | Portugal | 4 / 20 |
| `dr-ariana-gonzalvez-garcia` (new this batch, not in the original 13) | Spain | 3 / 13 |
| `mudr-andrei-lavrov` | Czechia | 2 / 17 |
| `dr-pablo-esteban-martinez` | Spain | 2 / 5 |
| `dr-mala-vili-rajan` | Ireland | 0 / 61 |
| `dr-luis-infante` | Portugal | 0 / 13 |
| `dr-yliana-muñoz-bravo` | Spain | 0 / 7 |
| `dr-daniela-stefani-` (trailing hyphen — confirmed truncated Wix slug, no entity) | Spain | 0 / 2 |

`tomás-ruiz-palacios` (1 click) was not added to the collapsed-chain list:
the accented literal in a `next.config.ts` `source` has no precedent in this
file and the existing 2-hop alias redirect already lands correctly, so this
was judged not worth the encoding risk for 1 click.

### Tests

`tests/unit/gone-paths.test.ts` and `tests/unit/legacy-doctor-redirects.test.ts`
extended with the same rule-order harness batch 1 established — every new
mapping proven to win over its broad sibling, resolve in one hop, and survive
reordering back to the broken state. 86 tests in the two files, all passing.
