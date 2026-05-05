# Public Website QA - Pass 1

Audit date: 2026-05-05 (rerun after runtime country/locale cleanup)

| Route | Desktop Status | Mobile Status | CTA Status | Content Status | Country/Locale Status | Language Label Status | Issues | Fix Needed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/home` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/book-online` | pass | pass | clear | meaningful | pass | ready | Backend submit is intentionally deferred (frontend-safe flow). | no |
| `/general-consultation-ie` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/specialty-ie` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/ireland/medical-consultation` | pass | pass | clear | meaningful | pass | ready | Generic service detail copy (safe but not service-specific depth). | no |
| `/ireland-team` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/plans-pricing` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/online-prescription` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/home-delivery` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/home-health-test` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/frequent-asked-questions` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/privacy` | pass | pass | clear | acceptable | pass | ready | Legal prose still generalized pending approved legal source text. | later |
| `/home-pt` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/home-sp` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/home-cz` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/home-rm` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/general-consultation-pt` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/general-consultation-sp` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/general-consultation-cz` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/general-consultation-rm` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/ireland/diabetes-consultation` | pass | pass | clear | meaningful | pass | ready | Generic service detail copy (safe placeholder depth). | no |
| `/ireland/weight-loss-consultation` | pass | pass | clear | meaningful | pass | ready | Generic service detail copy (safe placeholder depth). | no |
| `/ireland-specialist-consultations/cardiology-consultation` | pass | pass | clear | meaningful | pass | ready | Generic specialist detail copy (safe placeholder depth). | no |
| `/ireland-specialist-consultations/dermatology-consultation` | pass | pass | clear | meaningful | pass | ready | Generic specialist detail copy (safe placeholder depth). | no |
| `/ireland-doctors/dr-mirza-aun-mohammad` | pass | pass | clear | meaningful | pass | ready | Profile is adapter-driven with safe generic credential placeholders. | no |
| `/category/all-products` | pass | pass | clear | meaningful | pass | ready | None observed. | no |
| `/blog` | pass | pass | clear | acceptable | pass | ready | Blog cards are usable but excerpt copy remains generic. | later |
| `/post/how-online-medical-consultations-work` | pass | pass | clear | meaningful | pass | ready | Article is readable; still not final editorial copy. | later |

## QA Findings Summary

- Priority routes load correctly with one clear H1 and consistent CTA hierarchy.
- No horizontal-scroll or overflow regressions were observed in spot checks at `320`, `390`, and `1024`/`1440`.
- Country/locale runtime plumbing now behaves as intended in code path:
  - layout no longer forces `en`
  - locale resolution follows explicit -> header -> cookie -> accept-language -> country default -> `en`.
- Route-label coverage for key public routes is present across all locale label files.

## Remaining Gaps

- Legal pages remain structurally correct but still use generalized legal text until approved legal content is imported.
- Service-detail and blog routes are usable, but content depth is still intentionally generic pending editorial/admin data.
