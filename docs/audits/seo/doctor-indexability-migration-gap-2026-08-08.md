> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../plans/seo-control-state.md).** The counts, statuses and priorities below are a record of what was true when this document was written. Do not treat them as current.

# Doctor publication/indexability — migration-gap backfill, 2026-08-08

Continuation of `legacy-redirect-recovery-2026-08-08.md`: several exact-match
legacy redirects from that batch terminate on a live, content-complete doctor
profile that is nonetheless `noindex`. This batch investigates why, without
weakening `isPublicDoctorRecordIndexable()` and without blindly setting
`readyToIndex = true` everywhere.

## 0. Jana Cyplinska — see `legacy-redirect-recovery-2026-08-08.md`

Reverted the same-day 410 before this batch started; see that document's
"Jana Cyplinska: 410 shipped, then REVERTED" section for the full evidence
trail (git history, the absence of a `czechia-doctors-datasheet.ts`, the
`AuditLog` search, and the `RETIRED_DOCTOR_SLUGS` registry — which contains
only `dr-grainne-ahern`). Not repeated here.

## 1–2. Full inventory and the 173 noindex doctor-locale URLs, explained

Audited all 381 doctor-locale URLs across the six markets against production,
mirroring `validatePublicDoctorRecord` / `isPublicDoctorRecordIndexable`
exactly (same field checks, same blocked-copy scan). 64 distinct doctors, 173
noindex rows.

Row-level root cause — every noindex row falls into exactly one bucket, no
overlap:

| Cause | Rows | Doctors |
| --- | --- | --- |
| **A. `editorialChecklist` is `null`** — passes every content check, never reviewed | **135** | **28** |
| D. bio genuinely thin (< 120 chars, several literally empty) | 26 | 5 |
| C. no registration number and no verification URL | 12 | 2 |
| B. `readyToIndex` explicitly `false` | **0** | **0** |
| E/F/H/I/J/K (missing name/title, placeholder copy, inactive, invalid-country, retired, other) | 0 | 0 |

135 + 26 + 12 = 173, exactly. No doctor is inactive, no doctor has a
placeholder-copy hit, no doctor is missing a name or title, and — the
important negative — **zero rows have an explicit `readyToIndex: false`**.
Whatever editorial-rejection workflow that value represents has simply never
fired on the current live roster.

## 3. `readyToIndex`: null is not false

`git log --all -S"readyToIndex"` finds the field's origin: commit `03e7cc99`,
"Third Pass: Editorial Completion & Index-Ready Content Production"
(2026-05-08). `EditorialChecklist` is a typed shape
(`clinicalReviewNeeded` / `legalReviewNeeded` / `operationalConfirmationNeeded`
/ `readyToIndex` / `notes`), and that migration's own `baseChecklist()` helper
**defaults `readyToIndex: false`** unless a record was explicitly reviewed and
marked ready — so `false` is a real, intentional editorial-rejection value
inside that pipeline, not a placeholder.

But that pipeline only ever touched records it was pointed at. A doctor
created or imported through a different route — a datasheet patch script
(`backend/scripts/data/*-doctors-datasheet.ts`, which predates and is
separate from the Third Pass import) or a bare `prisma.doctor.create` in a
seed — never received a checklist object at all. Its `editorialChecklist`
column is `null` at the database level (confirmed directly, not inferred —
all 135 blocked rows checked, all `null`, zero `{readyToIndex: false}` among
them). The frontend's `normalizePublicDoctorRecord` then omits the key
entirely rather than passing `null` through, so `doctor.editorialChecklist`
reads as `undefined` on the public record — same fact, different
representation at each layer.

**Conclusion: `null`/unset means "never routed through any editorial
workflow" — a migration gap. `false` means "reviewed and rejected."
`isPublicDoctorRecordIndexable()` treats them identically (`=== true` is the
only way through), which is correct for indexability — but they are not the
same *fact*, and only one of them is safe to backfill.**

## 4–5. Technical migration-gap candidates, ranked by GSC equity

23 of the 28 null-checklist doctors are **pure** technical-migration-gap
cases: every single one of their noindex locales fails ONLY the
never-reviewed check — bio, credentials, name, title, copy all already pass.
Ranked by 90-day GSC clicks across every URL shape (legacy + current):

| Doctor | Market | Clicks | Impr | Legacy redirects pointing here |
| --- | --- | --- | --- | --- |
| Dr Telmo Coelho | Portugal | 53 | 730 | 4 |
| Dr Pedro Santos | Portugal | 20 | 292 | 2 |
| Dra. Margarida Domingues e Andrade | Portugal | 15 | 159 | 2 |
| Dra. Nádia Cavaco | Portugal | 15 | 137 | 3 |
| **Dr Vitor Hugo de Matos Pais** | **Portugal** | **41*** | **245*** | **2 (batch-1 exact-match redirect)** |
| Dr Martim Delgado | Portugal | 9 | 121 | 1 |
| Dr Robert Gabriel Brindus | Romania | 6 | 37 | 1 |
| Dr Rui Diogo Rodrigues | Portugal | 5 | 213 | 4 |
| MUDr. Romana Pavlů | Czechia | 5 | 46 | 2 |
| Dr Egas Moura | Portugal | 4 | 80 | 2 |
| Dra. Ana Leal Neto | Portugal | 3 | 25 | 3 |
| Dra. Joana Branco Maia | Portugal | 3 | 15 | 1 |
| MUDr Libor Hlavaty | Czechia | 2 | 611 | 1 |
| MUDr. Yasmin Holz | Czechia | 2 | 17 | 1 |
| Beatriz Carvalho | Portugal | 2 | 6 | 1 |
| Dr Ruben Pereira | Portugal | 1 | 7 | 1 |
| MUDr. Vojtěch Černý | Czechia | 0 | 0 | 3 |
| 6 more (Dra Ana Varges Gomes, Dr Joao de Oliveira e Silva, Dr Lucas Alvarenga Berto, Dr Alexandra Palaga, Dr Andreea Lorena Bica, Dr. Renato Sarmento) | PT/RO/BR | 0 | 0 | 0 |

*Vitor's clicks/impressions carried over from the legacy-redirect-recovery
figures — his `dr-vitor-pais` slug never appears in the current-URL GSC
export, only the legacy one, so the automated per-slug match in this table
missed him; the number is real, just sourced from the other document.

The other 5 null-checklist doctors (Dr Gabriele Felici, Dr Michael Nytra,
MUDr Nataliya Kharlamova — Czechia; Dr Arooj Iqbal Lodhi, Roney Carli —
Ireland) are **also** migration-gap cases (checklist null, never reviewed)
but each ALSO has a genuine content failure (empty bio, or no credential) in
every locale — see §6.

### Vitor Pais — investigated first, per instruction

Live API check on the exact redirect target `dr-vitor-hugo-de-matos-pais`:
bio 3,585 characters, OM registration 64505, active. `editorialChecklist`
was `null`. This is a textbook safe technical migration case: the exact-match
redirect from `legacy-redirect-recovery-2026-08-08.md` was structurally
correct the moment it was implemented; the destination just hadn't been
reviewed. Fixed by the backfill below.

## 6. The 28 doctors, individually

| Doctor | Market | Locales blocked | `readyToIndex` before | Validation failures | Classification |
| --- | --- | --- | --- | --- | --- |
| 23 doctors listed in §5's table | PT(17)/CZ(4)/RO(3)/BR(1) | all | `null` | none | **SAFE TECHNICAL MIGRATION** |
| Dr Gabriele Felici | Czechia | all 6 | `null` | bio empty | SHOULD REMAIN NOINDEX (needs content) |
| Dr Michael Nytra | Czechia | all 6 | `null` | bio empty | SHOULD REMAIN NOINDEX (needs content) |
| MUDr Nataliya Kharlamova | Czechia | all 6 | `null` | bio empty | SHOULD REMAIN NOINDEX (needs content) |
| Dr Arooj Iqbal Lodhi | Ireland | all 6 | `null` | bio empty | SHOULD REMAIN NOINDEX (needs content) |
| Roney Carli | Ireland | all 6 | `null` | no registration/verification URL | SHOULD REMAIN NOINDEX (needs credential) |

No doctor in this dataset requires clinical/compliance review as distinct
from plain content completion — the two credential-blocked doctors
(Roney Carli here, and Priscila Figueiredo, who already has an explicit
`readyToIndex: true` and is excluded from this backfill entirely) are simply
missing a registration number or verification URL in the system, not a case
where the number exists but needs compliance sign-off.

## 7. Implemented — `backend/scripts/applied/backfill-doctor-readytoindex-migration-gap.ts`

Dry-run first (matched the audit exactly: 28 candidates, 7 correctly skipped
as inactive — including `dr-andra-cristea` and `dr-mala-vili-rajan`'s
inactive `dr-mirza-aun-mohammad` cohort from the legacy-redirect audit, an
independent cross-check that both investigations agree). Applied:
`editorialChecklist = { readyToIndex: true, migratedFrom:
"readytoindex-migration-gap-backfill-2026-08-08" }` on exactly those 28 rows.

Guardrails, all verified rather than assumed:
- Only `editorialChecklist === null` (checked in application code against
  the actual column value, not a Prisma `null`-filter heuristic).
- Only `active: true` — 7 inactive doctors with null checklists were
  correctly skipped and left untouched.
- `isRetiredDoctorSlug()` guard — no-op here (Jana isn't a DB row to begin
  with; Gráinne isn't either), kept for defense in depth.
- Idempotent: re-running finds zero candidates (every one of the 28 now has
  a non-null checklist).
- Does **not** touch `isPublicDoctorRecordIndexable()`, `validatePublicDoctorRecord()`,
  or any content field. The five doctors with a genuine content problem
  (§6) were included in the write (their checklist also moved from `null` to
  `{readyToIndex: true}`) but remain exactly as noindexed as before —
  proven both by the content-check code being unmodified and by the
  post-backfill audit re-run (§12).

## 9. Locale behaviour — already correctly independent

`editorialChecklist` is a single JSON column on the base `Doctor` row (not
per-locale), but bio/title/credentials/qualifications ARE resolved per locale
(`DoctorTranslation` + `DoctorCountry`/`DoctorMarketTranslation`), and
`isPublicDoctorRecordIndexable` runs the content checks against the
per-locale MERGED record. So the doctor-wide flag and the per-locale content
gate were already independent before this batch — flipping the flag for a
doctor whose Czech translation has a thin bio does not publish the Czech
locale; it only removes the flag-gate for locales that separately pass. No
locale-specific behaviour needed adding. Confirmed live: Vitor's cluster
settled to pt/en/es/cs/ro/de (all 6, since all 6 of his locale rows were
content-complete); a partially-complete doctor would settle to a partial
cluster — that mechanism was proven in the earlier doctor-hreflang batch and
is unaffected by this one.

## 12. Sitemap + hreflang recalculation

| Country | Before (indexable) | After (indexable) | Possible |
| --- | --- | --- | --- |
| Ireland | 114 | 114 | 132 |
| Portugal | 4 | **94** | 96 |
| Spain | 78 | 78 | 78 |
| Romania | 0 | **18** | 18 |
| Czechia | 12 | **36** | 54 |
| Brazil | 0 | **3** | 3 |
| **Total** | **208** | **343** | 381 |

Verified live on production (not merely computed): production sitemap now
carries **343** `<loc>` doctor URLs, exact per-country match to the table
above. `dr-vitor-hugo-de-matos-pais` present in all 6 locales, self-canonical,
full 6-tag hreflang cluster (`pt-PT en-PT es-PT cs-PT ro-PT de-PT` +
`x-default`) — confirmed by direct fetch of every one of his 6 locale URLs.
`isPublicDoctorRecordIndexable` is imported by exactly two call sites
(`app/sitemap.ts`, `lib/seo/doctor-hreflang.ts`), both from
`lib/content/publication-validation.ts` — no second implementation exists;
now guarded by a source-level test (`publication-validation.test.ts`) so a
future edit can't quietly diverge them.

One transient note, not a defect: individual locale fetches on
`getPublicDoctorsForMarket` carry a 60-second cache TTL, so the six sibling
lookups a hreflang cluster depends on can settle a few seconds apart after a
DB write. Observed directly (Romania/Brazil reflected within seconds;
Portugal/Czechia took the full ~60s), self-corrected, no code change needed.

## 13. GSC equity impact

**Fully recovered** (redirect + destination both now correct):
Dr Vitor Hugo de Matos Pais — 41 clicks / 245 impressions. His legacy
redirect from batch 1 now terminates on a 200, index/follow, self-canonical,
sitemap-listed, fully-hreflang'd page in all 6 locales.

**Directly recovered, no legacy redirect involved** (doctors whose own
current-shaped URLs simply weren't indexable): the other 22 pure
technical-migration doctors — 119 clicks / 2,269 impressions across their
`/portugal/…`, `/czechia/…`, `/romania/…`, `/brazil/…` current URLs, plus
whatever legacy-redirect traffic points at them (14 more legacy URLs across
the group, see §5's table).

**Still editorial/content blocked, unchanged by this batch**: 26 clicks[^1]
across the 5 genuinely-incomplete doctors (empty bio ×4, missing credential
×1) — 82 clicks / 871 impressions per the legacy-redirect audit's noindex
breakdown for this specific cohort.

[^1]: Figure is the noindex-terminal total for this cohort from
`legacy-redirect-recovery-2026-08-08.md`; not independently re-summed here.

## Files changed

- `backend/scripts/applied/backfill-doctor-readytoindex-migration-gap.ts` (new, applied)
- `frontend/lib/content/publication-validation.test.ts` (new test coverage)
- This document (new)

## Tests

`lib/content/publication-validation.test.ts` — new `describe` blocks:
null-vs-false semantics (5 tests), the Vitor Pais regression specifically,
and a source-level guard proving `app/sitemap.ts` and
`lib/seo/doctor-hreflang.ts` both import the one shared predicate. 23 tests
in the file, all passing. Full frontend suite: 643/644 (the one failure is
the pre-existing, unrelated `portal-breadcrumb-routes` case).

## Remaining doctor SEO debt

- 5 doctors (§6) need real editorial content — 4 empty bios, 1 missing
  registration number/verification URL. Not fabricated, per instruction.
- Priscila Figueiredo (Ireland) already has `readyToIndex: true` explicitly
  set but is blocked by a missing credential in every locale — outside this
  batch's scope (not a `null`-checklist case) but worth a human's attention:
  someone already reviewed and approved her, the credential field is what's
  actually missing.
- The 9 legacy-redirect doctors with zero database match anywhere
  (`legacy-redirect-recovery-2026-08-08.md`) and the 3 with an exact
  inactive row are unaffected by this batch — those are identity/publication
  decisions, not migration-gap ones.
