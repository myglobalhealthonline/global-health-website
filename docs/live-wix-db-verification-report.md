Generated (UTC): 2026-05-08T06:50:02.085Z

## Executive summary

- **CMS hub rows:** `general-consultation`, `specialist-overview` excluded from Wix grid ↔ CMS menu comparisons.
- **DB matches Wix (IE menu title parity, hubs excluded):** No — see Wix-only / DB-only lists in matrix.
- **DB differs from Wix on numeric fields:** Yes — duration/price mismatches possible per row.
- **DB has extra records:** None flagged by title parser — export slugs to confirm.
- **Wix has items missing from DB:** Yes — see table Required Fix columns.
- **Records blocking indexing:** IE services 73/73; IE doctors 28/28.

## Evidence notes

- Wix URLs: https://www.myglobalhealth.online/general-consultation-ie , /specialty-ie , /online-prescription , /home-health-test , /ireland-team
- Parser limitations: Wix HTML changes may alter counts.
- `readyToIndex` is never modified by this script.

## Matrix

| Area | Wix/Production Value | DB Value | Match? | Risk | Required Fix |
|------|----------------------|----------|--------|------|--------------|
| 1. IE GENERAL grid rows vs CMS menu services | 18 | 18 | Yes | Excludes CMS hub slug `general-consultation`. Parser may miss rows. | Counts align — spot-check slug/copy/pricing per row. |
| 1b. IE SPECIALIST grid vs CMS (excl. `specialist-overview` hub) | 19 | 19 | Yes | Medium | Counts align. |
| 1c. IE PRESCRIPTION count | 19 | 19 | Yes | Medium | Confirm parity. |
| 1d. IE HEALTH_TEST count (parsed) | 15 | 15 | Partial | High | HTML heuristic may duplicate/skip tests — manual spot-check. |
| 2–4. IE GENERAL titles / durations / € | 18/18 titles; 17/18 durations; 18/18 prices | 18 DB GENERAL menu rows (hubs excluded) | Partial | Commercial + clinical | Wix-only: none. DB-only: none. |
| 2–4. IE SPECIALIST alignment | 19/19 title matches (strict key) | 19 DB SPECIALIST menu rows (hub excluded) | Yes | Medium | Wix-only samples: none. |
| 5. Currency | EUR on Wix menus | EUR | Yes | Low | Confirm commercial alignment. |
| 6. readyToIndex (IE services) | Not applicable on Wix | 0/73 rows true | N/A | Low (expected) | None enabled — correct until explicit ops release. |
| 7. Service publication mirror + readyToIndex (IE) | N/A | 73/73 remain non-indexable (validator fails OR !readyToIndex) | Yes (all gated) | High until content complete | Expand clinical body copy + boundaries; enable indexing only via deliberate checklist. |
| 8. Doctors IE — roster count | 84 doctors parsed (valid IMC=6, placeholder 0=4, placeholder N=4, missing=74) | 28 DB doctors (valid IMC=23, placeholder 0=2, placeholder N=0, missing=3) | No | Medium | Valid IMC overlap (Wix vs DB): 1. |
| 8b. Doctor publication mirror + readyToIndex | N/A | 28/28 profiles remain non-indexable | Yes (all gated) | High | Credential placeholders (IMC 0 / N) and/or missing verified details are blocking indexing. |
| 9. Blog Verification (3-source: Wix vs Postgres vs Replacement) | Wix /blog: 4 posts (details need browser) | DB BlogPost=9; replacement static slugs=0 | No | High | If Wix posts are approved, either wire DB BlogPost to public routes or migrate approved Wix posts into the replacement frontend source. |
| 10. ContentPage / countries | 5 markets on Wix strategy (manual) | 25 ContentPage rows; ie, pt, sp, cz, rm | N/A | Low | Sample keys: global-home, global-legal-footer, about-us, careers, blog, faq, egift-card, how-it-works, contact-us, cookies-policy, gdpr-compliance, online-prescriptions |
| 11. Legal routes vs CMS | Wix legal/footer (manual) | Many legal URLs are Next templates with robots noindex — see grep / plan | N/A | Legal | Counsel owns copy; CMS `global-legal-footer` is not full substitute. |
| 12. Sitemap / indexability | robots.txt allows crawl; 22 noindexStatic paths in sitemap.ts | Dynamic `/ireland/*`, `/post/*`, `/category/*` excluded from sitemap XML | N/A | Medium | Dynamic URLs still discoverable — metadata gates matter. |

## Blog Verification: Wix Live vs CMS vs Replacement Frontend

| Source | Count | Example Titles | Publicly Exposed? | Reviewer Data Present? | Risk | Required Fix |
|---|---:|---|---|---|---|---|
| Wix live `/blog` | 4 | sciatica-understanding-the-signs-and-how-to-manage; mounjaro-vs-ozempic-differences-benefits-and-when-to-use; omeprazole-uses-benefits-side-effects-and-when-to-take-it-safely | Yes | Unknown | Risk: Blog migration/public exposure gap. Replacing Wix with the new frontend would hide or lose currently visible Wix blog content unless DB blog routing or static blog migration is completed. | Decide whether to migrate Wix posts into CMS, wire DB `BlogPost` to public routes, or intentionally keep blog noindex/unpublished until editorial review. |
| PostgreSQL `BlogPost` | 9 | Preparing for an Online Medical Consultation; How Online Sick Notes Work; When to Choose a Specialist Consultation | No (public routes use replacement frontend source) | No | Risk: Blog migration/public exposure gap. Replacing Wix with the new frontend would hide or lose currently visible Wix blog content unless DB blog routing or static blog migration is completed. | Decide whether to migrate Wix posts into CMS, wire DB `BlogPost` to public routes, or intentionally keep blog noindex/unpublished until editorial review. |
| Replacement frontend static blog | 0 | (empty) | No | No (empty source) | Risk: Blog migration/public exposure gap. Replacing Wix with the new frontend would hide or lose currently visible Wix blog content unless DB blog routing or static blog migration is completed. | Decide whether to migrate Wix posts into CMS, wire DB `BlogPost` to public routes, or intentionally keep blog noindex/unpublished until editorial review. |

## Doctor Credential Verification

| Source | Doctors Found | Valid IMC Count | Placeholder `0` Count | Placeholder `N` Count | Missing Count | Risk |
|---|---:|---:|---:|---:|---:|---|
| Wix live `/ireland-team` | 84 | 6 | 4 | 4 | 74 | Risk: Visible placeholder credential marker. Not valid for public trust or indexing. |
| PostgreSQL doctors (IE) | 28 | 23 | 2 | 0 | 3 | Risk: Visible placeholder credential marker. Not valid for public trust or indexing. |

| Doctor | Wix Credential Marker | Wix Credential Status | DB Credential | DB Credential Status | Match? | Index Blocker? | Required Fix |
|---|---|---|---|---|---|---|---|
| Dr Abdelrahman Mustafa | — | missing | 431361 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Ahmed Maklad | — | missing | 523450 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Andra Cristea | — | missing | 508372 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Arooj Iqbal Lodhi | — | missing | 434132 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Emmanuel Dabup | — | missing | 409877 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Fahad Farooq | — | missing | 421252 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Fatima Ali | — | missing | 505231 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Grainne Ahern | — | missing | 408777 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Mala Vili Rajan | — | missing | 512862 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Mariam Faiz | — | missing | — | missing | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr MariamFaiz | — | missing | 429554 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Maristela Ferro Nepomuceno | — | missing | 13655 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Mirza Aun Mohammad | — | missing | — | missing | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Mirza Aun Muhammad | — | missing | 429743 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Mohamed Fadzly Mustafar | — | missing | 505886 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Mohammed Omar | — | missing | 412532 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Muhammad Mataro | — | missing | 425239 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Muhammad Tahir Arain | — | missing | 509406 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Muhammad Usman Yoosuf | — | missing | 502797 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Raafat Ibrahim | — | missing | 19801 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Raza Khan | — | missing | 520164 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Saadia Irfan | — | missing | 419347 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Tiago Miguel Figueira | — | missing | 523449 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr Yousif Mohamed | — | missing | 424103 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Dr. Khoiamul Islam | — | missing | 542074 | valid_visible_imc | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Physiotherapeut Priscila Figueiredo | 0 + N | placeholder_n | 0 | placeholder_zero | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Priscila Figueiredo | — | missing | — | missing | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |
| Silvia Alexandra Raminhos Fernandes | 0 + N | placeholder_n | 0 | placeholder_zero | No | Yes | Provide verified registration number or primary-source verification URL before `readyToIndex` can be true. |

## Three-Source Exposure Summary

| Area | Wix Live | PostgreSQL CMS | Replacement Frontend Exposure | Match? | Risk | Required Fix |
|---|---|---|---|---|---|---|
| General services (IE menu grid) | Wix=18 | CMS=18 | Replacement=18 | Yes | Risk: Commercial or booking inconsistency. Requires operations confirmation before indexing. | Confirm against live booking/commercial source of truth. Do not auto-sync from Wix. |
| Specialist services (IE menu grid) | Wix=19 | CMS=19 | Replacement=19 | Yes | Risk: Commercial or booking inconsistency. Requires operations confirmation before indexing. | Confirm against live booking/commercial source of truth. Do not auto-sync from Wix. |
| Prescriptions (IE) | Wix=19 | CMS=19 | Replacement=19 | Yes | Risk: Commercial or booking inconsistency. Requires operations confirmation before indexing. | Confirm against live booking/commercial source of truth. Do not auto-sync from Wix. |
| Health tests (IE) | Wix=15 | CMS=15 | Replacement=15 | Yes | Route detail is currently noindexed by metadata; confirm desired SEO policy | Manual policy decision; keep noindex until allowed. |
| Doctors (IE) | Wix=84 | CMS=28 | Replacement=28 | Partial | Risk: Visible placeholder credential marker. Not valid for public trust or indexing. | Replace placeholders (IMC 0/N) with verified reg/URL before indexing |
| Blog | Wix=4 | CMS=9 | Replacement static=0 | No | Risk: Blog migration/public exposure gap. Replacing Wix with the new frontend would hide or lose currently visible Wix blog content unless DB blog routing or static blog migration is completed. | Decide whether to migrate Wix posts into CMS, wire DB `BlogPost` to public routes, or intentionally keep blog noindex/unpublished until editorial review. |
| Legal pages | Wix=N/A (manual) | CMS contentPages=7 | Replacement routes=noindex templates | N/A | Legal counsel sign-off required | Update legal route content/robots only after counsel approval |
| Country pages | Wix=manual | CMS countries=5 | Replacement hubs vary by locale/noindex | N/A | Country hub indexing policy must be intentional | Confirm each locale hub’s robots/noindex and ensure roster/pricing/workflow parity |

## IE services — publication mirror sample (first 12 blocking slugs)

- **aesthetic-medicine-online-consultation** (GENERAL): ok; readyToIndex=false
- **diabetes-consultation** (GENERAL): ok; readyToIndex=false
- **driving-license-medical-certificate** (GENERAL): ok; readyToIndex=false
- **general-consultation** (GENERAL): detailBody/summary body too short; durationMinutes missing; pricing missing; emergency wording missing; limitations wording missing; boundary wording missing; readyToIndex=false
- **general-practice-family-medicine-consultation** (GENERAL): detailBody/summary body too short; emergency wording missing; limitations wording missing; boundary wording missing; readyToIndex=false
- **hypertension-consultation** (GENERAL): ok; readyToIndex=false
- **medical-consultation** (GENERAL): ok; readyToIndex=false
- **mental-health-assessment-consultation** (GENERAL): ok; readyToIndex=false
- **migraine-consultation** (GENERAL): ok; readyToIndex=false
- **online-sexual-health-and-sexology-consultation** (GENERAL): detailBody/summary body too short; emergency wording missing; limitations wording missing; boundary wording missing; readyToIndex=false
- **paediatric-primary-care-consultation** (GENERAL): ok; readyToIndex=false
- **pain-management-consultation** (GENERAL): ok; readyToIndex=false

## Appendix — service counts all countries × kind

- **ie**: GENERAL=19, SPECIALIST=20, PRESCRIPTION=19, HEALTH_TEST=15, HOME_DELIVERY=0
- **pt**: GENERAL=2, SPECIALIST=1, PRESCRIPTION=0, HEALTH_TEST=0, HOME_DELIVERY=0
- **sp**: GENERAL=2, SPECIALIST=1, PRESCRIPTION=0, HEALTH_TEST=0, HOME_DELIVERY=0
- **cz**: GENERAL=2, SPECIALIST=1, PRESCRIPTION=0, HEALTH_TEST=0, HOME_DELIVERY=0
- **rm**: GENERAL=2, SPECIALIST=1, PRESCRIPTION=0, HEALTH_TEST=0, HOME_DELIVERY=0

# Verification Accuracy Update

| Question | Answer |
|---|---|
| Does verifier now parse or browser-confirm Wix blog? | Yes (details: see Browser Mode evidence if needed) |
| Does verifier separate Wix blog from replacement frontend static blog? | Yes |
| Does verifier compare Wix live, DB CMS, and replacement frontend exposure separately? | Yes |
| Does verifier classify IMC `0` as placeholder/invalid? | Yes |
| Does verifier classify `N` as placeholder/invalid? | Yes |
| Are any pages made indexable automatically? | No |
| Is human sign-off still required? | Yes |