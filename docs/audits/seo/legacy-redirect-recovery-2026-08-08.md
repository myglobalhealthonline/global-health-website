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
