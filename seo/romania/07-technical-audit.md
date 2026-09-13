# Focused Romania technical/content findings

13 September 2026. This is a Romania public-surface check, not a rerun of the global
technical programme. All live responses and source projections are saved.

| Priority | Finding | Evidence | Disposition |
| --- | --- | --- | --- |
| P1 | True service FAQ gaps | 80 variants lack both embedded and native FAQs. | Exact staffed-service drafts prepared; pain service held. |
| P1 | Existing FAQs embedded in rich text | 22 variants / 187 questions; no native ServiceFaq rows. | Replace exact old block with translated native set, atomically. |
| P1 | Spanish consultation claim disagrees with roster | Brindus booking FAQ in all six languages vs languages=[Romanian, English]. | Six exact booking-answer corrections prepared. |
| P1 | Pediatric emergency offering language | Palaga existing scope FAQ. | Six narrower scope answers drafted with emergency direction. |
| P1 | Unstaffed pain specialist service | NO_APPROVED_DOCTOR, empty assignment, while English copy promises same-day care. | Operations hold on all six variants; no booking promotion. |
| P1 | Broken service link | English medic-online-romania links to sick-note-romania; target is 404. | Remove obsolete link/offer with exact source preflight. |
| P2 | Palaga name typo | Paga in five non-RO stored SEO titles. | Exact title corrections drafted. |
| P2 | Brindus specialty disagreement | RO family-doctor title vs anesthetist titles elsewhere. | Hold harmonization until authoritative specialty evidence; service-level wording used. |
| P2 | Long snippets | 21 sitemap titles >65 characters; 196 descriptions >160. | Editorial cues, not Google errors. Staffed service candidates shorten/clarify copy; do not truncate legal claims mechanically. |
| Verify only | Booking HTML shell lacks H1 | Six /book routes; visible HTML body is minimal. | Browser/client rendering must determine UX; no broken-flow claim or new heading inserted. |
| Retain | Noindex legal translations | Nine linked variants return 200/noindex outside sitemap. | Preserve policy; no speculative indexation expansion. |
| Retain | Limited alternate clusters | FAQ, medical-disclaimer and cookie-policy have only actual published locales. | Do not invent hreflang targets. |

No errors were found in the 317 sitemap URL status/self-canonical/title/description
presence checks. Schema counts on doctor FAQ pages match actual visible questions.
Service FAQ schema is absent because there are no native FAQ records; embedded body
questions do not currently feed that schema. Search-rich-result eligibility is not
promised by adding FAQPage.

Doctor `registrationVerified` is a stored status, not proof of every training,
publication or specialist claim in a biography. All sampled doctor/service
lastReviewedAt fields are null. The fact/review registers preserve that uncertainty.

## Source ownership

ServiceFaq / ServiceFaqTranslation are shared per service. Public FAQs resolve using
the service's resolved locale. DoctorFaq is keyed by doctor+locale, not country;
check cross-country effects before writes. Current returned doctor associations are
Romania-only, but that is not a permanent guarantee. A country-specific overlay has
an existing Czechia precedent if later scope requires it.

Binding implementation references: backend/src/services/service-faq.service.ts,
backend/src/modules/services/services.service.ts,
backend/src/modules/doctors/doctors.service.ts,
backend/scripts/patch-czechia-seo-service-drafts.ts,
frontend/lib/content/czechia-approved-doctor-faqs.ts.

Tests: collector parser fixture, all-source/render FAQ comparison, embedded-block
assertions, unique URL coverage and draft integrity checks. Product code was not changed.
