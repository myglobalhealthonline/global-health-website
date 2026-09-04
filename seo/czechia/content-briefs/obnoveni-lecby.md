# Brief: Treatment and prescription renewal

- URL: `/czechia/cs/services/obnoveni-lecby`
- Rationale: early commercial winner at 5 clicks / 56 impressions / position 6.82.
- Primary keyword: `obnovení receptu online`
- Secondary: `obnova léčby online`, `eRecept online`, `online konzultace kvůli receptu`
- Intent/funnel: transactional; clinician review of established treatment
- Priority: P0

## Outline

1. What treatment renewal means
2. Who may be suitable and what records are needed
3. Clinical review and identity process
4. Medicines/situations that require another pathway
5. What happens if renewal is not appropriate
6. Price, timing and booking CTA from live systems
7. Urgent and in-person escalation
8. FAQs

- Title: `Obnovení receptu online | Posouzení léčby lékařem`
- Description: `Online konzultace k pokračování zavedené léčby. Lékař posoudí dokumentaci, bezpečnost a vhodný další postup; vystavení receptu není automatické.`
- H1: `Obnovení léčby a receptu online`
- Schema: visible medical/service data, breadcrumbs, approved FAQs
- Internal links: GP, published doctor profiles, ePreskripce official resource, emergency guidance
- Sources: ePreskripce; NCeZ telemedicine rules
- E-E-A-T: named Czech physician, reviewed date, medicine/exclusion policy owner
- CTA: `Objednat posouzení léčby`
- Clinical reviewer: Czech prescribing physician
- Exclusions: no guaranteed eRecept, controlled-drug availability, diagnosis, or turnaround
- Measurement: GSC renewal cluster; service CTR; validated organic booking/consultation event

## Repository execution — 2026-09-01

- The service copy is prepared in `backend/src/content/czechia-seo-service-drafts.ts` and targets the existing service and all six existing FAQ records in place.
- The current proposed approval hash is `a02d12a3e9aada7f106233841bc55ec6b268805561660020734306e054ff5106`.
- The full six-locale service and FAQ source is pinned to `8bd648915a8dce6651a6be34a161f3948b9d2861c39e41a305a4ed4805e74ad8`; the dry-run aborts if the record changes.
- The draft removes the unsupported same-day/eRecept guarantee language, keeps clinical discretion explicit and links to the official ePreskripce resource.
- Status: local draft only. Czech prescribing-physician approval and separate owner authorization are required before any production write.
