# SEO production status — what is live, what is not

**Written 2026-09-04.** Every line here was verified against live production or the
working tree immediately before it was written. Current operational status stays in
[`docs/plans/seo-control-state.md`](seo-control-state.md); this file exists to answer
one question directly: *what has been applied to production, and what has not.*

---

## 1. Applied to production

### 1.1 Portugal — 11 doctor meta descriptions, published 2026-09-03

Approved by Dr Tiago Miguel Figueira (OM 77986) on 2026-09-03, written to the Railway
production database in eleven guarded transactions, each verified in-transaction and
then confirmed by cache-bypassed public readback.

| Doctor | Was | Now |
| --- | ---: | ---: |
| Dra. Ana Leal Neto | 220 | 145 |
| Dra. Margarida Andrade | 207 | 146 |
| Dr. João de Oliveira e Silva | 194 | 142 |
| Dr. Egas Moura | 192 | 140 |
| Dr. Pedro Santos | 191 | 137 |
| Dra. Ana Varges Gomes | 195 | 137 |
| Dr. Lucas Alvarenga Berto | 208 | 136 |
| Dra. Nádia Cavaco | 192 | 133 |
| Dra. Joana Branco Maia | 195 | 128 |
| Dr. Rúben Pereira | 201 | 128 |
| Dr. Rui Diogo Rodrigues | 200 | 124 |

Scope was the PT meta description only. Names, biographies, qualifications,
credentials, registrations, specialties, prices, booking and every non-PT locale were
untouched and verified unchanged inside each transaction. Evidence:
`seo/portugal/raw/snippet-trim-production-readback-2026-09-03.csv`.

### 1.2 Everything published before this session

Czechia 48 pages and Portugal 43, published 2026-08-31 → 09-02 and independently
re-verified: 125/125 live on HTTP 200, single `<h1>`, self-canonical, self-hreflang,
`index, follow` and parseable JSON-LD. The Week 2 editorial batch is fully live — 30
blog posts, 0 drafts. The Ireland lab hub's "€89 / 10 days" price error was corrected
on 2026-09-02.

---

## 2. NOT applied to production

### 2.1 Written but blocked

| Item | Count | Blocked by |
| --- | ---: | --- |
| Portugal tool-page titles and descriptions | 11 fields, 6 pages | **Code, not approval.** `assertPortugalSeoApplyAuthorized` rejects `targetKind === "tool"` — they are managed in a static runtime source with no publication route. Clinical approval does not unblock them. |
| `beatriz-carvalho` title and description | 2 fields | **Identity conflict.** See §3. |

Both live in `seo/portugal/raw/snippet-trim-drafts-2026-09-03.csv`.

### 2.2 Written but not deployed

Two commits fix English country names on non-English `/legal` and `/book` pages —
`/spain/es/legal` still serves "· Spain ·", `/romania/ro/legal` still serves
"· Romania ·". Both sit unpushed on `Dev-hassaan` and take effect only after push and
deploy. **They must deploy together**; shipping one alone makes `/brazil/pt/legal` read
"Brasil" while `/brazil/pt/legal/refund-policy` reads "Brazil".

### 2.3 Not written at all — no payload exists

- **Czechia, 3 register rows.** Two eNeschopenka/sick-pay articles and the site-wide
  forms/analytics privacy scope. No publishable payload was ever produced.
- **Czechia, 3 rows of `live_unreviewed_debt`.** `/czechia/cs/gp-consultation-online`,
  the 24/7 article and `cestovni-medicina-praha` are **live now** but were never
  clinically reviewed. Outstanding debt on published pages, not pending work.
- **Ireland, 12 content briefs.** Specifications, not copy. Nothing to publish.
- **Romania, 17 service pages with no FAQ.** Content that needs authoring plus a
  Romanian clinician's approval.
- **Spain, Romania, Brazil.** No matrix, no register, no briefs, no drafts.

### 2.4 Content that exists but is switched off

90 specialist service pages are built and translated but `isActive=false`:

| Market | Off | Priced | Unpriced |
| --- | ---: | ---: | ---: |
| Czechia | 19 | 19 | 0 |
| Portugal | 16 | 16 | 0 |
| Brazil | 16 | 0 | 16 |
| Romania | 15 | 0 | 15 |
| Spain | 13 | 1 | 12 |
| Ireland | 11 | 11 | 0 |

**46 are fully priced (CZ/PT/IE) — one flag flips them live.** The other 43 need a
pricing decision first. Two Portugal rows are retired Wix leftovers and should stay off.

Also off: `PRESCRIPTIONS` page content in all six markets and `HEALTH_TESTS` in five
(deliberate — prescriptions are hidden for Google Ads compliance), and one Ireland
health test.

Re-check any time, read-only:
`node --env-file=.env --import tsx scripts/report-unpublished-content.ts`

---

## 3. Needs a decision or an answer

**`beatriz-carvalho` — CLOSED TO INVESTIGATION, OPEN ON ONE INPUT. Do not re-derive this.**
The OPP directory has been queried three times (2026-09-02, 09-03, 09-04) with the same
result: cédula **31618** returns **Beatriz Sousa**, Porto, no speciality recorded. A name
search for Beatriz Sousa returns Ana Beatriz Sousa 27210 and Beatriz Sousa Fernandes
32649 among others, none containing Carvalho — so 31618 is not a shortened form of the
profile name. Separate Beatriz Carvalho registrations exist at 26164 (Cascais, clinical
psychology), 24832, and Maria Beatriz Carvalho 3137.

**The only thing that moves this** is her OPP card or member page showing name and
cédula, or her stating the number. Then: set `verification_status` to `verified`, record
any name variance in the fact-register note as the FALEIRO case did, unblock the row.
No further directory searching is useful — it has been exhausted.

Why it stays blocked meanwhile: the live profile tells patients *"Pode verificar este
registo em ordemdospsicologos.pt"*, and that lookup currently resolves to a different
person. This is a regulatory exposure question, not an SEO one.

**Spain, Romania and Brazil have no clinical-approval gate.** Only Portugal and Czechia
have one. Those three markets have already published doctor biographies, credentials
and registration numbers with nothing in front of them. Roughly 150–250 lines plus
tests per market, and it should land before any content batch for them — Romania's FAQ
work depends on it.

**Nothing has been measured yet.** Both measurement gates sit at a **2026-09-30** floor.
Until then every rewrite in this programme is a hypothesis, including the eleven
published above.

---

## 4. Suggested order

1. Push and deploy the two country-name commits, then re-verify `/spain/es/legal` and
   `/romania/ro/legal`. Written, verified, cheapest win.
2. Ask Beatriz which cédula is hers; verify it against the OPP directory.
3. Build the ES/RO/BR clinical-approval gates.
4. Then Romania FAQ authoring, which depends on step 3.
5. Decide on the 46 priced-but-inactive CZ/PT/IE service pages — the largest piece of
   dark commercial surface on the site.
6. Read the measurement gates on or after 2026-09-30. Do not rewrite an unchanged page
   before then.
