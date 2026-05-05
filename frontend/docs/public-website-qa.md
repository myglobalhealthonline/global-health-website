# Public Website QA - Pass 1

Audit date: 2026-05-05

| Route | Desktop Status | Mobile Status | CTA Status | Content Status | Language Label Status | Issues | Fix Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | pass | pass | clear | good | ready | None observed in QA pass. | no |
| `/home` | pass | pass | clear | improved | ready | Service and doctor cards previously showed TODO text. | fixed |
| `/book-online` | pass | pass | clear | good | ready | Needed clearer post-submit expectation copy. | fixed |
| `/general-consultation-ie` | pass | pass | clear | good | ready | None blocking after adapter copy cleanup. | no |
| `/specialty-ie` | pass | pass | clear | good | ready | Explanation text contained TODO. | fixed |
| `/ireland/medical-consultation` | pass | pass | clear | improved | ready | Service detail body showed placeholder/TODO text. | fixed |
| `/ireland-team` | pass | pass | clear | good | ready | None blocking. | no |
| `/plans-pricing` | pass | pass | clear | improved | ready | Needed stronger practical patient guidance and feature content. | fixed |
| `/online-prescription` | pass | pass | clear | improved | ready | Needed non-placeholder process explanation. | fixed |
| `/home-delivery` | pass | pass | clear | improved | ready | Needed non-placeholder logistics guidance copy. | fixed |
| `/home-health-test` | pass | pass | clear | improved | ready | Needed non-placeholder testing-pathway copy. | fixed |
| `/frequent-asked-questions` | pass | pass | clear | improved | ready | Needed clearer intro context for patient intent. | fixed |
| `/privacy` | pass | pass | clear | acceptable | ready | Legal structure is in place; still generic legal prose pending legal source import. | later |
| `/home-pt` | pass | pass | clear | improved | ready | Visible TODO copy in country template cards. | fixed |
| `/home-sp` | pass | pass | clear | improved | ready | Visible TODO copy in country template cards. | fixed |
| `/home-cz` | pass | pass | clear | improved | ready | Visible TODO copy in country template cards. | fixed |
| `/home-rm` | pass | pass | clear | improved | ready | Visible TODO copy in country template cards. | fixed |
| `/general-consultation-pt` | pass | pass | clear | improved | ready | Multiple TODO strings in explanations/pricing/services. | fixed |
| `/general-consultation-sp` | pass | pass | clear | improved | ready | Multiple TODO strings in explanations/pricing/services. | fixed |
| `/general-consultation-cz` | pass | pass | clear | improved | ready | Multiple TODO strings in explanations/pricing/services. | fixed |
| `/general-consultation-rm` | pass | pass | clear | improved | ready | Multiple TODO strings in explanations/pricing/services. | fixed |
| `/ireland/diabetes-consultation` | pass | pass | clear | improved | ready | Used generic service placeholder text previously. | fixed |
| `/ireland/weight-loss-consultation` | pass | pass | clear | improved | ready | Used generic service placeholder text previously. | fixed |
| `/ireland-specialist-consultations/cardiology-consultation` | pass | pass | clear | improved | ready | Used generic service placeholder text previously. | fixed |
| `/ireland-specialist-consultations/dermatology-consultation` | pass | pass | clear | improved | ready | Used generic service placeholder text previously. | fixed |
| `/ireland-doctors/dr-mirza-aun-mohammad` | pass | pass | clear | improved | ready | Route previously placeholder-only with static marketing template. | fixed |
| `/category/all-products` | pass | pass | clear | improved | ready | Category route lacked meaningful adapter content. | fixed |
| `/blog` | pass | pass | clear | acceptable | ready | Listing works; excerpts remain generic but usable. | later |
| `/post/how-online-medical-consultations-work` | pass | pass | clear | improved | ready | Article lead/body showed TODO placeholders. | fixed |

## QA Findings Summary

- Most issues were **content-quality regressions** (visible TODO text), not layout breakages.
- Header/footer/navigation remained structurally consistent on tested pages.
- No route-level architecture regressions detected; thin-adapter/template pattern preserved.
- Language route labels remain fallback-safe (locale -> English -> registry default) without localized URL breakage.

## Remaining Gaps

- Legal pages still use generalized placeholder legal prose until approved legal content is integrated.
- Blog listing/article content is now non-placeholder, but editorial depth remains limited pending CMS-backed copy.
