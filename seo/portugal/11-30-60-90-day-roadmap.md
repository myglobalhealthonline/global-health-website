# Portugal 30/60/90-day roadmap

No ranking guarantee. Dates start after the localization fix and any separately approved CMS corrections deploy.

## Days 0–30: correctness, measurement, quick wins

1. Deploy the shared DoctorCard localization fix; rendered-QA `/portugal/pt` and one credentialed clinician.
2. Review and correct the Portugal CMS hero CTA, clinician roles, image metadata and registration divisions. Use a dry-run manifest and clinical/content owner approval.
3. Re-inspect Pedro Santos after Google recrawls. Do not add another robots change unless a fresh crawl still sees `noindex`.
4. Validate GA4 `begin_booking` and completed booking attribution with a privacy-safe test; document why current reports were empty.
5. Verify the Portugal homepage in the deployed sitemap and route-contained crawl.
6. Fix locale ownership for Portuguese certificate queries only if rendered hreflang/internal-link evidence identifies a reproducible defect.
7. Implement P0 content improvements on the existing general-consultation, medical-certificates and blood-pressure-tool owners after clinical review.
8. Build a manual outreach shortlist for Ordem/ERS/Doctify entity citations and two Portuguese health-media pitches.
9. Establish the 28-day baseline dashboard from `10-measurement-plan.md`.
10. Do not change the driving-certificate title/H1 during this period.

Deliverable gate: localized live cards, approved CMS corrections, analytics evidence, URL Inspection log and before/after hashes.

## Days 31–60: service-page depth and internal ownership

- Update existing P1 owners in this order:
  1. `/services/consulta-medica` — online doctor/teleconsulta intent and service limitations.
  2. `/services/consulta-do-viajante` — preparation, online scope and in-person vaccine limitations.
  3. `/services/baixa-medica` — eligibility/process accuracy and no-guarantee language.
  4. staffed specialty pages with real clinician supply.
- Review `consulta-de-pediatria` vs `pediatria-geral`; decide retain/distinguish/consolidate only with booking and GSC ownership evidence.
- Clarify `saude-mental` hub links to psychology and psychiatry without duplicating discipline intent.
- Add one legitimate parent/child internal-link path per updated page.
- Publish no medication/prescription copy before clinical and compliance sign-off.
- Pitch one original, anonymised Portugal access-to-care story to validated media prospects.
- Measure first deployed cohort only after its maturity date.

Deliverable gate: page-specific QA, clinical approvals, internal-link map and no new thin URLs.

## Days 61–90: authority and evidence-led iteration

- Compare complete 28-day post-recrawl windows by cluster, brand status, device and locale owner.
- Retain or iterate only pages with mature evidence.
- Run a route-contained Portugal crawl and compare canonical, hreflang, sitemap, status, response and schema.
- Recheck referring domains/new/lost links at row level.
- For driving certificates, decide whether to fund a legitimate authority campaign; on-page rewriting remains blocked without a new hypothesis.
- Expand one supporting patient-information resource only if a P2 cluster has service fit, unique clinical value, an existing URL owner or an approved architecture slot, and named reviewers.
- Validate English-in-Portugal demand against actual English-speaking clinician supply; do not create Lisbon/Porto pages that imply clinics.
- Review inactive services and remove them from recommendations if supply changes; never activate from keyword demand alone.

Deliverable gate: measured decision log, updated clinical register, quality-link evidence, and next-quarter prioritized backlog.

## Stop conditions

Pause publication if service scope, clinician registration, price, availability, regulatory process or medical accuracy cannot be verified. Pause scaling if analytics cannot distinguish organic booking outcomes or if locale ownership remains unresolved.
