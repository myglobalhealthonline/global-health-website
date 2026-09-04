# SEO production status — what is live, what is not

**Updated 2026-09-04, second pass.** Every line was verified against live production or
the working tree immediately before it was written. Current operational status stays in
[`docs/plans/seo-control-state.md`](seo-control-state.md); this file answers one
question directly: *what has been applied to production, and what has not.*

---

## 1. Live in production

### 1.1 Portugal — 11 doctor meta descriptions (2026-09-03)

Approved by Dr Tiago Miguel Figueira (OM 77986), written in eleven guarded
transactions, confirmed by cache-bypassed public readback 11/11.

| Doctor | Was | Now | | Doctor | Was | Now |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| Ana Leal Neto | 220 | 145 | | Nádia Cavaco | 192 | 133 |
| Margarida Andrade | 207 | 146 | | Joana Branco Maia | 195 | 128 |
| João de Oliveira e Silva | 194 | 142 | | Rúben Pereira | 201 | 128 |
| Egas Moura | 192 | 140 | | Rui Diogo Rodrigues | 200 | 124 |
| Pedro Santos | 191 | 137 | | Lucas Alvarenga Berto | 208 | 136 |
| Ana Varges Gomes | 195 | 137 | | | | |

PT meta description only. Names, biographies, credentials, registrations, prices and
all non-PT locales verified unchanged. Evidence:
`seo/portugal/raw/snippet-trim-production-readback-2026-09-03.csv`.

### 1.2 Localized country names on `/legal` and `/book` (2026-09-04)

Deployed and verified live: `/spain/es/legal` serves **España**, `/romania/ro/legal`
serves **România**, `/brazil/pt/legal/refund-policy` serves **Brasil**. Both the index
and the document sub-pages shipped together, so there is no split spelling.

### 1.3 Six Portugal tool pages — LIVE (2026-09-04)

**Corrected later the same day.** `82a054d0` is on `origin/main` (`git merge-base
--is-ancestor` passes) and deployed: every page serves
`data-dpl-id="4067d8d6…"`, and `/portugal/pt/tools/osteoporosis-risk-checker` now
serves the 57-character title `Risco de osteoporose Portugal | Verificação orientativa`.
The section below records what shipped.

| Page | Title | Description |
| --- | --- | --- |
| `osteoporosis-risk-checker` | **80 → 55** | **228 → 146** |
| `adhd-test` | sentence case | 217 → 152 |
| `calorie-calculator` | sentence case | 172 → 151 |
| `due-date-calculator` | sentence case | 170 → 140 |
| `ovulation-calculator` | sentence case | 181 → 139 |
| `bmi-calculator` | sentence case | unchanged |

Ships as a frontend overlay on deploy, not through the database. Recorded as a
**super-admin override** — no clinician reviewed this copy; see
`seo/portugal/raw/super-admin-override-2026-09-04-tool-pages.md`.

**Shipped.** Verified live 2026-09-04. No measurement gate was registered for this
change; one is proposed as G19 in `docs/audits/seo/six-market-seo-audit-2026-09-04.md`.

### 1.4 Earlier batches

Czechia 48 pages and Portugal 43, published 2026-08-31 → 09-02, independently
re-verified 125/125. Week 2 editorial fully live — 30 blog posts, 0 drafts. Ireland lab
hub "€89 / 10 days" price error corrected 2026-09-02.

---

## 2. NOT live yet

### 2.1 Blocked on one input — `beatriz-carvalho`

Her page publishes OPP **31618** and tells patients to verify at
ordemdospsicologos.pt; that number returns **Beatriz Sousa** (Porto, no speciality).
Separate Beatriz Carvalho registrations exist at 26164, 24832 and 3137.

**Needs a correction, not an approval:** her actual cédula, or proof she is registered
under a different name. Directory searching is exhausted — do not re-investigate. See
§3 of the fact register note.

### 2.2 Not written — no payload exists

- **Czechia, 3 register rows** — two eNeschopenka/sick-pay articles, site-wide
  forms/analytics privacy scope. Nothing was ever drafted.
- **Czechia, 3 `live_unreviewed_debt` rows** — `gp-consultation-online`, the 24/7
  article, `cestovni-medicina-praha`. **Live now, never clinically reviewed.** Debt on
  published pages.
- **Ireland, 12 content briefs** — specifications, not copy.
- **Romania, 17 service pages with no FAQ** — verified live, zero `FAQPage` blocks.
- **Spain, Romania, Brazil** — no matrix, no register, no drafts.

### 2.3 Built but switched off — 90 specialist service pages

| Market | Off | Priced | Unpriced |
| --- | ---: | ---: | ---: |
| Czechia | 19 | 19 | 0 |
| Portugal | 16 | 16 | 0 |
| Brazil | 16 | 0 | 16 |
| Romania | 15 | 0 | 15 |
| Spain | 13 | 1 | 12 |
| Ireland | 11 | 11 | 0 |

**46 in CZ/PT/IE are fully priced — one flag from live.** The other 43 need pricing
decisions. Two Portugal rows are retired Wix leftovers and should stay off.

Also off by design: `PRESCRIPTIONS` in all six markets (Google Ads compliance),
`HEALTH_TESTS` in five, one Ireland health test.

Re-check read-only:
`node --env-file=.env --import tsx scripts/report-unpublished-content.ts`

---

## 3. Open risks

**Spain, Romania and Brazil have no clinical-approval gate.** Only Portugal and Czechia
do. Those markets have already published doctor biographies, credentials and
registration numbers with nothing in front of them. ~150–250 lines plus tests per
market. **Blocks Romania FAQ work** — authoring 17 clinical payloads with no approval
mechanism just recreates the problem.

**Three Czechia pages are live and unreviewed** (§2.2). Larger governance exposure than
anything in the drafts.

**Nothing has been measured.** Both gates sit at a **2026-09-30** floor. Every rewrite
in this programme is a hypothesis until then, including everything in §1.

**GA4 has recorded nothing since 2026-08-02, and the cause is a wrong build variable.**
Production is tagged `G-4PPGECG12X`; the property the tooling reads (`547083375`)
streams `G-SP48D9LJJ5`. So the 2026-09-30 floor above buys only the Search Console half
of each gate — `begin_booking`, `begin_checkout` and `purchase` will still have no data
on that date unless the fix in §4.1 ships first, and even then the window starts from
the redeploy, not from the change being measured. Ledger §42.1.

---

## 4. Next

**Revised 2026-09-04 after the six-market audit** —
`docs/audits/seo/six-market-seo-audit-2026-09-04.md`.

1. **Fix the GA4 measurement id.** Production is tagged `G-4PPGECG12X`; the property
   the SEO tooling reads (`547083375`) streams `G-SP48D9LJJ5` and has received no data
   since 2026-08-02. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-SP48D9LJJ5` as a Railway
   frontend **build** variable and redeploy. Register `begin_checkout` as a key event.
   Every conversion number in this programme is unreadable until this lands.
2. **Ask Beatriz for her cédula.** One message; unblocks a live unverifiable
   registration.
3. **Build the ES/RO/BR approval gate.** Biggest exposure, and it gates step 4.
4. **Romania FAQ authoring** — depends on 3.
5. **Decide on the 46 priced-but-dark CZ/PT/IE service pages** — largest commercial
   surface currently unlit.
6. **Read the measurement gates on or after 2026-09-30.** Do not rewrite an unchanged
   page before then.
