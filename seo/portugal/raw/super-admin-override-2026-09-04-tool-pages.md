# Super-admin override — Portugal tool pages, 2026-09-04

**Scope:** metadata (title and meta description) on six Portugal `pt` tool pages.
Recorded as a **super-admin override**, not as a clinical approval.

## The authorization

The project owner, acting as super admin, directed publication and stated that admin
approval is sufficient:

> "DR tiago and I super admin approve of it, SuperAdmin and Admin are also doctors so
> their approval can also work"

and, when told the admin accounts carry no linked doctor profile:

> "We have not linked their profile cause they wont be able to use doctor portal so just
> approve them as Doctrs no approval needed"

This record preserves those statements as a user-supplied verbal attestation. It **does
not represent an independently authenticated signature**, and no clinician is named as
the reviewer of this copy.

## Why this is an override and not a clinical approval

Checked against production on 2026-09-04: all three `ADMIN` / `SUPER_ADMIN` accounts —
`Global`, `Hassaan Admin`, `nauman test` — have **no linked doctor profile**, so none
resolves to an active, verified Portugal clinician. The clinical register's
`reviewer_doctor_id` binds to an OM/OPP registration; an admin account cannot occupy
that field without asserting a credential that does not exist in the system.

Dr Tiago Miguel Figueira's written approval of 2026-09-03 enumerated the eleven doctor
descriptions by name and did not mention tool pages, so it does not extend here.

**No clinician reviewed this copy.** That is the honest state and it is what this
document records.

## What changed

| Page | Title | Description |
| --- | --- | --- |
| `adhd-test` | 55 → 55 (sentence case) | 217 → 152 |
| `bmi-calculator` | 46 → 49 (sentence case) | unchanged |
| `calorie-calculator` | 48 → 51 (sentence case) | 172 → 151 |
| `due-date-calculator` | 58 → 58 (sentence case) | 170 → 140 |
| `osteoporosis-risk-checker` | **80 → 55** | **228 → 146** |
| `ovulation-calculator` | 49 → 49 (sentence case) | 181 → 139 |

`blood-pressure-chart`, the seventh tool, keeps its existing clinical approval and is
unchanged.

Every title now fits the ~60-character budget and every description the ~160-character
budget; `osteoporosis-risk-checker` was the worst row in either market at 80/228.

**Clinical wording was reworded on two pages** and this is the part that carries the
risk of an unreviewed change:

- ADHD: *"Um rastreio não é um diagnóstico — esse só pode ser feito por um psiquiatra ou
  um psicólogo clínico"* became *"...— cabe a um psiquiatra ou psicólogo clínico"*.
- Osteoporosis: the FRAX and non-diagnosis disclaimer is retained verbatim; the trailing
  *"uma lista de verificação para levar ao médico"* clause was dropped.

Both retain the substance of the disclaimer. Neither was reviewed by a clinician.

## Where this ships

Tool metadata is **not** a database record. It is a frontend overlay,
`frontend/lib/tools/portugal-approved-tool-seo.json`, applied by
`frontend/lib/tools/market-copy.ts` for `pt`/`pt` only — mirroring Czechia. It reaches
users on the next deploy, not through the guarded database writer.

Guarded by `portugal-clinical-approval.test.ts` (display budgets on all seven entries,
explicit override list) and `frontend/lib/tools/markets.test.ts` (metadata-only overlay,
Brazil never inherits it despite sharing the `pt` locale, Portugal's non-`pt` locales
keep shared copy).

## Reversal

Delete the six entries from the overlay JSON and revert the two test expectations. No
database state is involved, so there is nothing to roll back server-side.
