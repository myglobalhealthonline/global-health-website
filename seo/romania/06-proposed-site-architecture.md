# Romania URL ownership and internal links

Dated design: 13 September 2026. Keep existing country/locale routes and strengthen
their current intent. No new URL, redirect or location page is proposed by this package.

| Page family | Role and boundary |
| --- | --- |
| /romania/{locale} | Market/brand hub; preserve observed broad-query visibility. |
| gp-consultation-online | Explain general medical care and direct visitors to relevant services. |
| services/medic-online-romania | General consultation detail and booking decision; avoid duplicating the entire hub. |
| services/consultatie-pediatrie | Specialist pediatric appointment with Palaga. |
| services/medic-pediatru-online | General medical assessment for children; separate scope and clinician. |
| services/consultatie-neurologie | Neurology appointment with Bica. |
| Remaining staffed GENERAL services | Narrow problem/administrative intent; no implied additional specialist. |
| services/evaluare-durere | Operations hold; no assigned doctor. |
| doctors/{slug} | Clinician-name intent, verified current languages and links to assigned services. |
| blog and tools | Informational/calculation intent; contextual links to appropriate care, without presenting a calculator as diagnosis. |
| legal, contact, careers, press | Their actual support/institutional purpose, not service-keyword landing pages. |
| book | Transaction flow, not a duplicate commercial landing page. |

Every observed URL has a row in `05-url-keyword-map.csv`. Some primary labels are
editorial descriptions, not verified search phrases; the evidence column says so.
The master preserves observed homepage ownership for broad terms such as medic online.
Do not force those terms onto a service page simply because a rule first suggested it.

## Links to implement with the content batch

- General hub to staffed GENERAL services, using plain service names.
- Specialist hub to pediatrics and neurology and their assigned profiles.
- Services to the assigned clinician, booking and one relevant parent hub.
- Profiles to their actual assigned services; do not advertise all site specialties.
- Medical-letter article to the document/advice service where context supports it.
- Calorie/BMI tools to weight-management care only with a clear reason to seek review.

Correct the English medic-online-romania body's link to the 404 sick-note-romania
page. Remove the obsolete offer/link rather than redirecting it to an unrelated
service or suggesting state sick leave is available. The exact source text remains
in the API/HTML snapshots for a later guarded edit.

## Locale ownership

Preserve current self-canonicals and real alternates. Do not create missing FAQ or
legal translations solely to reach six alternates: nine existing legal variants
are intentionally noindexed. Page language does not change medical eligibility or
consultation language. Current doctors consult in Romanian/English, so all locale
drafts disclose that. Romanian pediatric queries found on CS/ES pages are monitored
against the Romanian specialist owner; the tiny sample is not a redirect mandate.

The final FAQ paragraph blocks must be removed atomically when adding native
ServiceFaq sets. Existing service/doctor page templates already provide rendering
and schema, so no new FAQ framework is needed.
