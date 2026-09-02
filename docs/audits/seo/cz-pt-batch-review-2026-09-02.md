# Czechia + Portugal SEO batch — independent review, 2026-09-02

> **Dated evidence, not current operational status.** `docs/plans/seo-control-state.md`
> owns current status, priorities and next actions.

**Scope reviewed:** all Czechia and Portugal SEO work committed between 2026-08-31 and
2026-09-02 (81 commits, `9a0ef9b9`..`50b950f7`, merged to `main`, working tree clean).

**Method:** independent live re-fetch of all 125 URLs in the two completion matrices
(cache-bypassed), Search Console page and query×page pulls for both markets, both
country validators re-run, a TypeScript/frontend code review of the 30 changed
frontend files, and a per-row copy-quality review of both matrices against the
Ireland package used as the reference pattern.

---

## 1. Verdict

The published work is technically sound and honestly recorded. The problems are in
three places: **the record-keeping**, **two unapproved-copy drifts sitting behind
review gates**, and **one governance control that was documented but then removed
from the code before publishing**.

Independent live verification of all 125 matrix URLs:

| Check | Result |
| --- | --- |
| HTTP 200 | 125 / 125 |
| Exactly one `<h1>` | 125 / 125 |
| Self-referencing canonical | 125 / 125 |
| Self-referencing hreflang | 125 / 125 |
| `index, follow` | 125 / 125 |
| Parseable JSON-LD | 125 / 125 |
| Published rows: live title matches the matrix | 76 / 76 |
| Published rows: live meta description matches the matrix | 76 / 76 |

No cross-market or cross-locale leakage. Ireland, Spain, Romania, Brazil,
`/czechia/en`, `/czechia/pt`, `/czechia/de`, `/portugal/en` and `/portugal/es` were
spot-checked live and all retain their own titles, H1s, `lang` and canonicals. Every
overlay is guarded on country **and** locale, and Brazil (`br`) never matches the
Portugal (`pt`) guard despite sharing the `pt` locale. `tsc --noEmit` is clean and
the focused suites pass 624/624.

Bookkeeping tallies reconcile exactly against their own claims. Czechia: 31 live, 14
pending, 3 measurement holds, 2 reviewed-no-change (50 rows); register 17 approved,
20 pending (37 rows). Portugal: 43 live, 28 reviewed-unchanged, 1 held, plus 3
single-status rows (75 rows); register 44 approved, 1 blocked (45 rows); doctor fact
register 15 verified, 1 pending.

Safety work is real and verified. The `1024` and `808 200 204` crisis contacts were
replaced with `1411` plus `112` in five live FAQ answers and the medical disclaimer.
The US-only "Aceitamos também Medicare" clause was carried on eleven live Portugal
service descriptions and is now gone from all of them. `/portugal/pt/gp-consultation-online`
was serving an English title and description on a `pt-PT` page and is now Portuguese.
One Czech doctor profile falsely claimed practice "v Irsku a Portugalsku"; the
replacement removes it. A scan of all 76 published rows for same-day, immediacy and
guarantee wording returns one hit, and that hit is a clinically correct urgency
statement on the blood-pressure tool.

---

## 2. Will it improve results?

Metadata rewrites move click-through rate, not position. The realistic upside is
therefore bounded by where these pages already sit.

Current 28-day Search Console baseline (2026-08-02 to 2026-08-30):

| Market | Clicks | Impressions | CTR |
| --- | ---: | ---: | ---: |
| Czechia `/czechia/cs` | 90 | 5,629 | 1.60% |
| Portugal `/portugal/pt` | 70 | 4,317 | 1.62% |

Impression coverage of the batch:

| Market | On pages the batch published | On pages left unchanged or held |
| --- | ---: | ---: |
| Czechia | 3,143 | 2,413 |
| Portugal | 2,267 | 1,843 |

So roughly 55% of each market's live impression volume now carries rewritten
metadata. Both markets sit far below a normal 3-5% CTR, and the rewrites are
grammatically and factually better than what they replaced, so a measurable CTR
improvement on the published half is plausible. It is not yet evidenced.

Three things temper the expected gain:

- **The largest single opportunity in each market was deliberately not touched.**
  Portugal's driving-certificate page carries 967 impressions in 28 days, more than
  any other Portugal page except the hub. It was reviewed and left unchanged on the
  documented authority-wall rationale. That call is defensible, because its
  impression mass sits at position 39 to 52 where CTR is structurally near zero, but
  it does mean the batch skipped the market's biggest page.
- **Czechia's calculator pages are the market's impression engine and most are still
  gated.** The BMI, calorie, due-date, ovulation and blood-pressure tools account for
  3,202 of Czechia's 5,629 impressions. Three of them, worth 1,119 impressions, are
  held pending clinical review of copy that contains no clinical claim.
- **Portugal made the opposite call on the identical page type.** Six of seven
  Portugal tool pages are marked "reviewed; unchanged" while Czechia rewrote all
  seven. Portugal's tools carry roughly 1,115 impressions at positions 11 to 71 and
  keep English-style Title Case in Portuguese, and the osteoporosis tool title runs
  80 characters. Two markets, one page type, opposite decisions, no recorded
  rationale for the divergence.

---

## 3. Findings

### 3.1 No measurement gate was registered for either market — highest impact

Every Ireland section closes with an explicit gate, for example: *"Measurement gate:
compare page/query GSC windows after 28 complete days plus the normal final-data lag,
on or after 2026-09-28."* Neither Czechia §36, Portugal §37, nor any of the §27.x
Czechia/Portugal entries registers one. There is currently no scheduled check that
would ever tell anyone whether this work succeeded.

This is the single most consequential deviation from the Ireland pattern, because it
is what turns a batch into evidence.

### 3.2 The clinical approval gate was narrowed in the commit that published Portugal

`docs/plans/seo-control-state.md` §27.22 (§27.17 before the renumbering in §4 below)
states the writer requires *"three distinct dated clinical, compliance and content-owner
approvals"*. The register schema carries `compliance_reviewer_name`,
`compliance_reviewer_id`, `content_owner_name` and `content_owner_id` for exactly
that purpose.

Those four columns are **blank on all 45 rows**, and commit `934fb834`
("feat(seo): publish approved Portugal metadata") removed their enforcement from
`backend/src/content/portugal-clinical-approval.ts`:

```
-  requireValue(record, "compliance_reviewer_name");
-  requireValue(record, "compliance_reviewer_id");
-  requireValue(record, "content_owner_name");
-  requireValue(record, "content_owner_id");
-  const reviewerIds = [record.reviewer_doctor_id, record.compliance_reviewer_id, record.content_owner_id];
-    throw new Error(`Clinical, compliance and content approvals must have distinct reviewer IDs for ${record.asset}`);
-  assertReviewDate(record, "compliance_reviewed_at", now);
-  assertReviewDate(record, "content_owner_reviewed_at", now);
-  requireValue(record, "clinical_reviewer_specialty_id");
```

The implementation log is candid about why: production exposes only one eligible
operational reviewer, so three distinct approvers were not obtainable. The narrowing
may well be the right call, and the surviving gate is still strong — exact copy
hashes, source fingerprints, Serializable transactions, exact readback, official
source allowlisting. The defect is that the ledger still describes the three-approver
control in the present tense while the code no longer enforces it and the register
records none of it.

Either restore the requirement, or amend §27.22 to describe the control that actually
runs. Right now the document asserts a safeguard the system does not have.

The same section records that the approving clinician's official Ordem dos Médicos
entry reads `TIAGO MIGUEL FALEIRO FIGUEIRA` while the production identity omits
`Faleiro`, that this was logged as a blocker, and that publication then proceeded. His
sign-off is the only clinical approval behind all 44 approved rows, so this is worth
resolving before the next batch relies on it.

### 3.3 Two review-gated drafts contain different copy than the documents describe

Nothing wrong is published — both pages are on documented holds. But the approval
gate binds the SHA-256 of the **draft file**, while the matrix and the clinical
register are what a reviewer reads. They disagree, so the clinician would approve
text they were never shown.

`/czechia/cs/gp-consultation-online`, the market's P0 commercial page, held to
2026-09-08:

| Field | Matrix | `czechia-page-content-seo-drafts.ts` (`gpSafetyCs`) |
| --- | --- | --- |
| Title | `Praktický lékař online \| Video konzultace v Česku` | `Praktický lékař online \| Konzultace v Česku` |
| Description | `Objednejte se na online konzultaci s praktickým lékařem. Jasný postup, cena, možnosti i situace, kdy je nutné osobní nebo akutní vyšetření.` | `Online konzultace s praktickým lékařem. Lékař posoudí potíže a další postup; recepty, dokumenty a doporučení nejsou automatické.` |
| H1 | `Praktický lékař online` | `Online konzultace s praktickým lékařem v Česku` (unchanged from the current live H1) |

`/czechia/cs/services/cestovni-medicina-praha`, held on travel recrawl, disagrees on
the primary keyword itself:

| Field | Matrix | `czechia-seo-service-drafts.ts` |
| --- | --- | --- |
| Primary keyword | `cestovní medicína` | `cestovní medicína Praha` |
| Title | `Cestovní medicína online \| Konzultace před cestou` | `Cestovní medicína Praha \| Online konzultace` |
| H1 | `Cestovní medicína online: příprava před cestou` | `Cestovní medicína: online konzultace` |

Every other draft matches: 14/14 Czech static overlay keys, 4/4 tool JSON entries,
13/13 profile/blog/tool drafts and 15/16 service drafts are byte-identical to their
matrix rows. Portugal cannot drift at all, because its draft modules parse the
matrix CSVs at runtime rather than duplicating them, which is the better design.

### 3.4 Eleven live Portugal doctor descriptions exceed the snippet budget

The eleven doctor-market descriptions published on 2026-09-02 run 191 to 220
characters. Google truncates near 155 to 160, so between a quarter and a third of
each is never displayed. The matrix records them at those lengths, so this passed
every gate unnoticed.

The pattern is consistent: a useful opening clause followed by a credential list that
gets cut mid-word.

```
Agende uma videoconsulta com Dr. Rui Diogo Rodrigues — médico registado na OM
(nº 74473). Nova Medical School Lisboa · Telemedicina · IA na saúde · Mestrad|o
Transformação Digital · Português e inglês.
```

Across the whole Portugal matrix, 24 of 75 descriptions and 9 of 75 titles exceed the
display budget. The worst are `/tools/osteoporosis-risk-checker` (80-character title,
228-character description) and `/blog/diabetes-a-doenca-silenciosa` (75 and 273).
Most of those are pre-existing rows marked "reviewed; unchanged" rather than damage
done by this batch, but they were reviewed and passed over.

### 3.5 Neither matrix records the title the site actually serves

`frontend/lib/seo/page-seo.ts` appends ` · Global Health` when the result still fits
in 60 characters, and drops it when it does not. Forty of the 125 live pages
therefore serve a title that is 16 characters longer than the matrix records.

The site behaviour is correct and well documented in the code. The matrices are the
problem: they record the pre-template value with no column saying so, which makes
every future live-versus-matrix comparison show forty false mismatches. The Portugal
validator already compensates for this internally, so the knowledge exists but is not
written down where a human reads it.

### 3.6 Ledger integrity

- **Five duplicated section numbers.** `### 27.10`, `### 27.11`, `### 27.12`,
  `### 27.13` and `### 27.17` each appear twice, once in the forward-status block at
  the top and once in the historical block from line 301. Two live cross-references
  are now ambiguous: line 167 points at "§27.17" meaning the Czechia entry, and line
  6993 points at "§27.17" meaning the Portugal entry. **Corrected in this pass:** renumbered to 27.14–27.22, and both cross-references now resolve.
- **The market table in `seo/README.md` is stale.** Czechia is listed as
  "§§10–17" and Portugal as "§§19 and 35"; the new §36 and §37 are missing.
- **The roadmap's NOW block is three weeks stale.** It still records the branch state
  as of 2026-08-12 — "`Dev-hassaan` is one commit ahead of `origin/Dev-hassaan`",
  "`origin/main` and `origin/Dev-hassaan` are both at `8d28b85e`". Both statements are
  now false; everything is pushed and `main` is at `50b950f7`.
- **A watchlist deadline lapsed silently.** §6 states "Next recheck due 2026-09-01".
  The batch was running URL inspections on 2026-09-01 and 2026-09-02 for its own
  purposes and did not perform the scheduled watchlist pass.
- **One Portugal matrix row is stale.** `/portugal/pt/pricing` still reads
  "production promotion pending", but the implementation log records the hold as
  closed and live verification confirms it: the page serves the empty-state H1 and no
  plan CTA.
- **`seo/czechia/11-page-by-page-optimization.md` is one batch behind.** Written
  2026-09-01, it says eleven approved services; the Prague approval on 2026-09-02
  makes it twelve. Unlike the README it carries no "historical, see the ledger"
  disclaimer, and it is linked directly from the README.

### 3.7 The Portugal validator does not run in this repository's default shell

`seo/portugal/reconcile-artifacts.ps1` calls `Import-Csv` and `Get-Content -Raw`
with no `-Encoding` argument. Windows PowerShell 5.1, which is what this machine has,
defaults to the ANSI code page and mangles every accented character in the Portuguese
CSVs. The script throws on the first suffixed row:

```
Rendered production title drift for https://www.myglobalhealth.online/portugal/pt/services/consulta-do-viajante
```

The stored evidence is correct; only the reader is wrong. The script passes under
PowerShell 7, which is not installed here and is not documented as a requirement.
Czechia avoided this by writing its validator in Node, which runs clean.

Separately, the script's unsupported-claim regex is
`mesmo dia|no mesmo dia|garantid[oa]|disponibilidade imediata`, which misses
`próprio dia`, `hoje mesmo`, `de imediato` and `imediatamente`. Scanning all 76
published rows for those variants returns one hit, and it is legitimate clinical
urgency copy, so nothing leaked. The gap is in the checker, not the content.

### 3.8 Smaller copy issues

- **`/portugal/pt` sends split signals.** The title now leads with the brand
  ("Global Health Portugal | Cuidados médicos online") while the H1 still reads
  "Cuidados médicos online em Portugal". The reassignment itself is evidence-backed:
  the hub's only converting queries are brand terms at 21.8% CTR, its generic
  consultation impressions sit at positions 51 to 62, and the keyword master already
  routes that intent to `/services/consulta-medica`. But the H1 was left expressing
  the old intent, and Portugal is now the only market home page not leading with the
  head term, which Brazil, Spain, Romania and Czechia all still do.
- **`/czechia/cs/tools/blood-pressure-chart` moved away from its largest cluster.**
  The H1 changed from "Normální krevní tlak Česko" to "Kalkulačka a tabulka krevního
  tlaku". The chosen primary keyword is worth 720 searches a month; the "normální"
  family the page is assigned to own is worth about 4,580. The page does not
  currently rank for those terms, so nothing was lost, but this is the market's
  highest-impression page and the decision is worth revisiting.
- **`/czechia/cs/contact` H1 is a title tag.** `Kontakt | Global Health Česko`, pipe
  included, is the only H1 in either market using that pattern.
- **`/portugal/pt/services/consulta-de-psicologia`** owns "psicólogo online" but is
  titled "Psicóloga Online". Deliberate, matching the clinician's gender, but it
  costs the higher-volume masculine form.
- **Templated descriptions.** Eleven of fifteen Czech service descriptions open with
  the same "Online konzultace [X]. Lékař posoudí…" skeleton and close on a legal
  hedge; four Portugal service descriptions end on near-identical "depende da decisão
  clínica" clauses. Compliance-correct, but they read as a row of identical
  disclaimers in a results page.

### 3.9 Two code follow-ups from the frontend review

- `frontend/lib/content/get-country-plans.ts` now invalidates the **entire** plan
  catalogue if any single plan, perk or kit row fails validation, and
  `pricing/page.tsx` does not catch the resulting error. One malformed row from the
  backend would 500 the whole pricing route for a market with a live catalogue,
  where previously it dropped that one row. This matches the site's established
  fail-closed pattern, so it is a deliberate choice, but it is a new failure mode on
  a revenue page.
- `frontend/lib/content/get-page-content.ts` (commit `50b950f7`) now suppresses
  individual fields backfilled from another locale. That is the right fix for
  mixed-language rendering, but any page with a genuinely partial CMS translation
  will now render fewer sections. Worth a production spot-check on the partially
  translated locales.

---

## 4. Recommended actions

**Documentation, no production risk. Applied in this pass:**

1. Renumber the five duplicated ledger sections and disambiguate the two ambiguous
   cross-references.
2. Update the `seo/README.md` market table for §36 and §37.
3. Register measurement gates for Czechia and Portugal, matching the Ireland pattern.
4. Refresh the stale branch-state paragraph in the roadmap NOW block.
5. Correct the stale `/portugal/pt/pricing` matrix row.
6. Add the historical disclaimer and the corrected approval count to
   `seo/czechia/11-page-by-page-optimization.md`.
7. Add `-Encoding utf8` to the Portugal validator and widen its claim regex.
8. Record the brand-suffix template in both matrices so future comparisons are not
   forty false mismatches.

**Needs a decision before the 2026-09-08 gate:**

9. Reconcile the `gpSafetyCs` and `cestovni-medicina-praha` drafts with their matrix
   rows, in whichever direction is correct, so the approving clinician reviews the
   text that will actually publish.
10. Decide whether to restore the compliance and content-owner approval requirements
    or amend §27.22 to describe the single-clinician gate that actually runs.

**Content, needs clinical re-approval by the existing process:**

11. Trim the eleven live Portugal doctor descriptions to about 155 characters,
    keeping the opening clause and the registration number, dropping the credential
    tail.
12. Give the Portugal tool pages the same treatment Czechia gave its own, starting
    with the 80-character osteoporosis title.
13. Resolve the `FALEIRO` name discrepancy on the approving clinician's record.
14. Align the `/portugal/pt` H1 with its new brand-led title, or record why it
    deliberately differs.

**Watchlist:**

15. Run the §6 indexation recheck that was due 2026-09-01.
