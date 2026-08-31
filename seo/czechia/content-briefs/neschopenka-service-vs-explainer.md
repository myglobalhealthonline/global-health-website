# Brief: Neschopenka service and eNeschopenka explainer

- Service URL: `/czechia/cs/services/neschopenka-online`
- Explainer URL: `/czechia/cs/blog/neschopenka-jak-funguje-eneschopenka`
- Rationale: the explainer has 682 impressions at position 9.91; the service has 43 at 16.74. Distinct intent must be explicit.
- Service primary: `online neschopenka`
- Explainer primary: `jak funguje eNeschopenka`
- Secondary: `neschopenka online`, `eNeschopenka`, `ČSSZ neschopenka`, `lékařská neschopenka online`
- Intent/funnel: service transactional; article informational/pre-consultation
- Priority: P0

## Service outline

1. A doctor can assess inability to work; issue is never automatic
2. Who should book and what to prepare
3. What can and cannot be assessed remotely
4. What happens after clinical assessment
5. Fees, booking and clinician discretion
6. Red flags and urgent/in-person care
7. CTA and short service FAQs

## Explainer outline

1. What eNeschopenka is
2. Employee, employer, doctor and ČSSZ roles
3. Start, continuation and end of incapacity
4. What the patient needs to communicate
5. Common administrative questions
6. When a medical consultation is appropriate
7. Official-source update note and service link

- Service title: `Online neschopenka | Posouzení lékařem`
- Explainer title: `Jak funguje eNeschopenka: postup zaměstnance a ČSSZ`
- Meta: service stresses assessment; article stresses official process
- H1s: `Online posouzení pracovní neschopnosti`; `Jak funguje eNeschopenka`
- Schema: service medical/service + breadcrumbs; article/medical webpage + reviewer/date; FAQ only if visible
- Internal linking: reciprocal, with intent-specific anchors; sick-pay article links to explainer, not booking-first language
- Sources: ČSSZ eNeschopenka hub, FAQs, employee/OSVČ guidance; NZIP urgent-care guidance
- E-E-A-T: Czech physician review on clinical claims; regulatory editor/date on process claims
- CTA: service booking only where symptoms require assessment
- Exclusions: no guaranteed neschopenka, backdating, duration, benefit amount, or eligibility outcome
- Measurement: query × page split for booking versus process modifiers; service booking event; article-assisted navigation

## Repository execution — 2026-09-01

- The service copy is prepared in `backend/src/content/czechia-seo-service-drafts.ts` and targets the existing service and all seven existing FAQ records in place.
- The final approval hash is `e181f41e9b632af577fff9be1302c7b80a44da3c47be4ab884eaa4901c538d65`.
- The full six-locale service and FAQ source is pinned to `880fd7d374b062af8df380b46b24d1a07c7187f570f2307aba679336203834cc`; the dry-run aborts if the record changes.
- The article was inspected but not rewritten. It already owns the informational process intent and links to the service. Its doctor relations need verification because the public API relation fields do not match the visible author/reviewer attribution.
- Status: local draft only. Czech physician approval and separate owner authorization are required before any production write.
