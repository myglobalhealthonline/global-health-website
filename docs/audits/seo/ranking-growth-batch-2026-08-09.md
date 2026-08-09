# Ranking-growth batch — 2026-08-09

Continuation of the SEO workstream. Prior batch (`docs/plans/seo-indexation-plan-2026-07-28.md`
+ commit `0bd0637a`) fixed wrong-language legal-page indexation. This batch
shifts from indexation to ranking growth on pages Google already shows.

## 0. Prior-batch verification (0bd0637a)

Live-checked against production, all pass:

| Check | URL | Result |
| --- | --- | --- |
| Wrong-language legal fallback = 200 noindex,follow | `/ireland/pt/legal/cookie-policy` | 200, `robots: noindex, follow` |
| Absent from sitemap | same | confirmed absent (2.73MB sitemap fetched, string search) |
| Absent as hreflang target | same | hreflang set = `en-IE`, `x-default` only (no `pt`) |
| Exact-locale legal page stays indexable | `/ireland/en/legal/cookie-policy` | 200, `robots: index, follow` |
| Brazil locale scope unchanged | `/brazil/{pt,en,es}` 200; `/brazil/{cs,ro}` 308-redirect | confirmed (opaque redirect on manual fetch = redirect firing) |

No further indexation work performed this batch, per instruction.

## A. Opportunity-set size

GSC page-dimension pull, `last_3_months` (2026-05-06 → 2026-08-06), 1000 rows
(clicks-desc, more available via pagination — not needed, see below). Filtered
to **current canonical URLs only** (present in the live `sitemap.xml`, 1,906
URLs) — this dropped 128 of 210 raw position-4-to-25 candidates, which were
legacy pre-migration Wix-era URLs (`/home-pt`, `/product-page/...`,
`/ireland-doctors/...`, `/pt/about`, etc.) still indexed and still drawing
impressions on their own account. Those are a known, separate defect
(see §S) — out of scope per instruction ("do not return to legacy redirects").

**82 current, canonical URLs** in the position 4–25 / impressions ≥20 band.

## B/C/D. Top opportunities, queries, and classification

| URL | Impr (90d) | Clicks | Pos | Classification |
| --- | --- | --- | --- | --- |
| `/ireland/en/blog/sick-certificate-ireland-employee-rights` | 1,407 | 11 | 14.7 | Already treated 2026-08-04 (see §K) — verify only |
| `/portugal/pt/services/certificado-medico-carta-de-conducao` | 281 | 0 | ~35* | **INTERNAL-LINK GAP** — implemented |
| `/ireland/en/services/referral-and-investigations` | 320 | 3 | 17.8 | NO ACTION — thin/noisy long-tail, content already thorough |
| `/ireland/en/lab-tests` | 481 | 3 | 18.6 | AUTHORITY/QUERY-INTENT GAP — hub template, out of safe scope this batch |
| `/ireland/en/gp-consultation-online` | 284 | 2 | 18.5 | Not a single content page — rewrites to shared `/general-consultation` hub template; deferred, see §N |
| `/portugal/pt` , `/ireland/en` (country hubs) | 511 / 351 | 15 / 9 | 18.6 / 13.7 | BLOCKED — hub copy is legal-gated by design (prior decision, `project_country_page_consistency`) |
| `/portugal/en/blog/hand-foot-and-mouth-disease-signs-and-treatment` | 294 | 0 | 18.9 (page) vs 66–95 (every individual query) | **DISCARDED** — see §2 below, not a real opportunity |
| `/privacy` | 380 | 1 | 5.7 | NO ACTION — legal page, not a content-growth target |

*Page-level avg position (14.7-ish window) doesn't apply cleanly here — see
cannibalization note below; the 23 real PT queries for this URL average
position ~35, with only 2 of 23 breaking top 15.

## 2. CTR vs ranking — one page dropped for this reason

`/portugal/en/blog/hand-foot-and-mouth-disease-signs-and-treatment` looked
like a 0-click/294-impression opportunity at the page level. Query-level pull
(11 total queries, complete set) showed every individual query at position
66–95, off-topic/multilingual noise (Afrikaans "hand en mond siekte", generic
"mouth foot hand"). The page-level average doesn't reflect any real
striking-distance query. Correctly classified as noise, not implemented.
This is the exact trap instruction §2 warns about — flagging it explicitly
rather than silently dropping it.

## 3/K. Sick-cert article — status

The article already received the exact treatment this batch would have
proposed, five days prior (commit `9e258fa1`, 2026-08-04, prior session):
CTA retargeted from homepage to the service page, inline "sick note online"
synonym link, a "medical chit" FAQ, and a synonym sentence on the service
page's `detailBody`. Read the live article in full (22-section, ~2,400-word
guide: statutory entitlement, eligibility, when a cert is legally required,
**Statutory Sick Leave vs Illness Benefit** distinction, employer disputes,
how online certs work, 7 FAQs including the medical-chit synonym, correct
internal links to the service page and to the sibling "Illness Benefit"
article). Content-wise this is **NO ACTION — ALREADY GOOD**.

Query-level pull surfaced a real, separate structural defect: the head terms
in this cluster ("sick cert ireland", "sick cert online", "sick cert for
work") are split across **five** URLs — the two current ones
(`/ireland/en/blog/sick-certificate-ireland-employee-rights`,
`/ireland/en/services/sick-certificate-ireland`) plus **three legacy/ghost
URLs not in the sitemap** (`/ireland/sick-leave`,
`/ireland/es/health/sick-cert-online`, `/ireland/ro/health/sick-cert-online`)
still indexed from a pre-migration crawl, all averaging position 30–70 with
zero clicks. This is very likely the real reason the head terms don't rank —
but fixing indexed legacy URLs is explicitly the "legacy redirects" territory
this batch was told not to re-enter. Flagged in §S, not touched. The
`ireland:sick-cert-online` health-page variant already has a canonical tag
pointing at the service page (2026-08-03 decision) — Google is just slow to
drop it from the index; that's a pre-existing, already-made call, not
re-litigated here.

## 8/11. Cannibalization check

Only genuine cannibalization signal found (sick-cert cluster, above) traces
to out-of-scope legacy URLs, not to the two current pages — the blog article
(informational) and service page (transactional) are correctly complementary
by design, per instruction §12, and already cross-link correctly.

No other query showed multiple *current* URLs competing.

## E/F/G/H. What was actually changed

**`/portugal/pt/services/certificado-medico-carta-de-conducao`**
(PT primary locale, mirrored to EN) — content audit first: 5,679-char
`detailBody`, 8 FAQs, IMT-sourced (categorias, exame psicotécnico, Grupo 1/2),
already thorough. **Not a content gap.** Real defect: zero inbound internal
links — its own hub page didn't link to it.

- `certificados-medicos` (the "Atestados Médicos" hub — the *only* other
  outbound link it had was a REFERRAL to the complementary-exams service; it
  never linked to one of its own six certificate sub-types) → added a
  COMPLEMENTARY `ServiceLink` box, priority 1, PT+EN copy, anchor "Atestado
  Médico para Carta de Condução" / "Medical Certificate for Driving Licence".
- `baixa-medica` (sibling certificate type — work-absence note, not driving
  fitness; genuinely adjacent, not the same intent) → added a COMPLEMENTARY
  `ServiceLink` box, priority 3 (4th of 4 — within the render cap), PT+EN
  copy cross-selling the correct certificate type.

Both within the "max 4 boxes per source page" render cap
(`resolveServiceLinksForPage`, `backend/src/modules/service-links/service-links.service.ts`).
Verified live at the API layer and rendered on both source pages, PT and EN
locale, after the 60s ISR cache window rolled (screenshots not needed —
`querySelector` confirmed the anchor + href on all four page/locale
combinations checked).

No blog/article copy was rewritten. No titles, H1s, meta descriptions,
canonicals, or schema were touched anywhere this batch.

## I. Internal links added FROM opportunity pages

None — the opportunity page's own content and outbound link
(`REFERRAL → consulta-de-referenciacao`) were already correct and untouched.

## J. Cannibalization findings

See §8/11 and §K — confined to out-of-scope legacy URLs.

## M. Pages deliberately left unchanged

- `/ireland/en/services/referral-and-investigations` — content already
  exhaustive (8.6k-char detailBody, 8 FAQs, 10 inbound links already);
  traffic is thin, scattered long-tail (many 1–2 impression rows, several
  literally AI-crawler probe strings — `"context: location: ireland..."` —
  not human search volume). No confident action available.
- `/ireland/en/lab-tests`, `/ireland/en/gp-consultation-online` — both
  resolve to shared hub/category templates (`HEALTH_TEST` / `GENERAL` kind
  listings, not single-service detail pages), used across every country.
  Editing them changes every market at once — higher blast radius than this
  batch's safe-change bar. Deferred to §N.
- `/portugal/pt`, `/ireland/en` country hubs — copy is legal-gated by prior
  decision (`project_country_page_consistency`), not re-opened here.
- `/privacy` — legal page, not a ranking-growth content target.

## N. New-content opportunities discovered but not built

- Country-hub and service-hub template copy (lab-tests, gp-consultation-online)
  would need a scoped content pass of their own — template-level, multi-country
  blast radius, needs its own review rather than folding into this batch.
- A separate, already-scoped 12-article blog initiative exists
  (`backend/scripts/content/blog-seo-2026-08/`, its own keyword research
  already done) — largely already applied to production despite its
  `HANDOFF.md` claiming "nothing applied yet" (stale doc; `illness-benefit`,
  `neschopenka`/`baixa-medica` articles are live in the sitemap in all
  locales they target). Not touched or extended this batch — it's a separate,
  already-in-flight initiative, not this batch's mandate.

## O. Files/DB rows changed

- `backend/scripts/patch-pt-driving-cert-internal-links.ts` — new, idempotent,
  dry-run-by-default script (uncommitted).
- 2 `ServiceLink` rows created in production (`certificados-medicos` →
  `certificado-medico-carta-de-conducao`, `baixa-medica` →
  `certificado-medico-carta-de-conducao`), each with PT + EN
  `ServiceLinkTranslation` rows.

## P. Targeted technical verification (changed surfaces only)

- Both source pages 200, both PT+EN locales checked live.
- New links resolve to the correct canonical target URL, correct anchor text.
- No canonical, indexability, title, or schema changes — none of those
  surfaces were touched.
- Idempotency verified: re-running the script after `--apply` reports both
  edits as `[already]`, zero further writes.
- `tsc --noEmit` clean on the new script.

## Q. Tests

None added. The change is two data rows through an existing, already-tested
resolver (`resolveServiceLinksForPage`, capped/sorted/locale-merged logic is
existing, covered code) — no new reusable logic was introduced to test.

## R. 14-day / 28-day measurement baseline

Captured 2026-08-09, window 2026-05-06→2026-08-06 (last_3_months):

| URL | Impr | Clicks | CTR | Pos |
| --- | --- | --- | --- | --- |
| `/portugal/pt/services/certificado-medico-carta-de-conducao` | 281 | 0 | 0.0% | ~35 (query-avg) |
| Top query: `exame medico carta condução` | 20 | 0 | 0.0% | 45.1 |
| `atestado medico para carta de condução` | 9 | 0 | 0.0% | 44.9 |
| `atestado médico para carta de condução online` | 2 | 0 | 0.0% | 11.0 |

Re-check 2026-08-23 (14d) and 2026-09-06 (28d). No traffic/ranking claim made
today — internal links were only added minutes ago; nothing has had time to
be crawled, let alone re-ranked.

## S. Remaining ranking-growth SEO debt

1. **Legacy ghost-URL cannibalization on the sick-cert cluster** — three
   pre-migration URLs (`/ireland/sick-leave`,
   `/ireland/{es,ro}/health/sick-cert-online`) still indexed, still drawing
   impressions at position 30–70, diluting the head-term signal for the two
   current pages. Root-caused, not fixed — explicitly "legacy redirects"
   territory, out of scope this batch.
2. **Hub/template pages** (`lab-tests`, `general-consultation`, country
   hubs) carry real impression volume at weak positions but need a
   template-level content review, not a single-page patch — flagged, not
   built.
3. **`referral-and-investigations`** — traffic is real but too thin/scattered
   to action confidently this batch.
