# Schema.org / Structured Data Audit — myglobalhealth.online

Sample: 500-page crawl (`crawl.json`) + deep JSON-LD fetch of 7 representative
URLs (home, IE country home, IE service, ES doctor, IE blog article, IE
pricing, IE lab-tests). Zero JSON-LD parse errors across the sample.

## 1. Detection summary (500-page sample)

| Type | Pages | Notes |
|---|---|---|
| MedicalOrganization / WebSite / ImageObject / Country / ContactPoint / PostalAddress / PropertyValue | 500/500 | Site-wide org block, injected on every page |
| BreadcrumbList | 325/500 | **175 missing** — see §4.1 |
| FAQPage | 293/500 | No Google SERP benefit any more — see §4.2 |
| Organization | 255/500 | Regulator `memberOf`/`recognizedBy` nodes |
| ReserveAction | 196/500 | Nested in `MedicalProcedure.potentialAction`, not a distinct Google rich-result type — harmless, no SERP effect |
| Physician / EducationalOccupationalCredential | 176/500 | No dedicated Google rich result for Person/Physician; valuable for entity/E‑E‑A‑T, not SERP feature |
| MedicalProcedure | 172/500 | |
| MedicalClinic | 144/500 | **Type-mismatch risk** — see §4.3 |
| MedicalBusiness | 78/500 | Same family, see §4.3 |
| Service | 52/500 | Correct pattern for consultation offerings |
| Article | 50/500 | Blog posts |
| ItemList | 39/500 | |
| Offer | 34/500 | |
| QuantitativeValue | 28/500 | |
| Product / Brand / UnitPriceSpecification | 6/500 | **Wrong type for a subscription service** — see §4.4. Confirmed: only the `ireland/*/pricing` locale variants (6 URLs) |
| ContactPage | 1/500 | Correct, no issue |
| OpeningHoursSpecification | 1/500 | Under-used — see §5 |

## 2. Validation — block by block

### 2.1 Site-wide `MedicalOrganization` + `WebSite` (all 500 pages)
```json
{"@type":"MedicalOrganization","@id":"https://www.myglobalhealth.online/#organization", ...}
{"@type":"WebSite","@id":"https://www.myglobalhealth.online/#website", ...}
```
- PASS: `@context` = https, absolute URLs, ISO founding date, real `sameAs` (socials + Wikidata QID + 12+ national regulator/authority links), `logo` as ImageObject with width/height, `identifier` PropertyValues for two company registrations + NRPZS.
- PASS: stable `@id`s used for cross-block linking (`worksFor`, `publisher`, `recognizedBy` all reference `#organization`). Google's structured-data docs confirm multiple `<script type="application/ld+json">` blocks on one page are merged by `@id`, so this pattern is valid and does resolve — verify per-page in Rich Results Test if in doubt.
- FAIL (missing opportunity): `WebSite` has no `potentialAction` (`SearchAction`) → sitelinks-searchbox is not eligible. Add if the site has functioning internal search (see §5.1).
- INFO: `address` is CZ-only (Prague, legal HQ) — correct, this is the legal entity address, not a per-country clinic address; no accuracy issue since it's never duplicated as a false local address elsewhere.

### 2.2 IE country home (`/ireland/en`) — `MedicalBusiness`
- Missing `@id` → can't be tied to the site-wide `#organization` node or reconciled with the `MedicalClinic` node used on service pages for the conceptually same entity ("Global Health · Ireland").
- No `address`, `telephone`, or `geo` — for a `LocalBusiness` subtype (`MedicalBusiness` extends `LocalBusiness`) this means it is not eligible for any local-business rich result anyway, so the type choice buys nothing while creating an inconsistent type across the IE page family (see §4.3).

### 2.3 IE service page (`/ireland/en/services/acute-medical-consultation`) — `MedicalClinic`
- Same entity ("Global Health · Ireland") now typed `MedicalClinic` instead of `MedicalBusiness`, again no `@id`, no address/geo.
- `reviewedBy` on `MedicalClinic` — `reviewedBy` is not a defined schema.org property on `MedicalClinic` (only `Claim` has it in core vocabulary). Google will silently ignore unrecognized properties, so this is not a hard error, but it doesn't achieve the intended "clinically reviewed by a named physician" signal. Recommend the same fix used correctly elsewhere on the site — Article's `reviewedBy` (see §2.4) — or drop it and surface the physician via `employee`/`medicalSpecialty`.
- `MedicalProcedure.potentialAction.ReserveAction` — valid shape, but `ReserveAction` isn't in Google's supported rich-result list for this content type; it's inert/no-op for SERP purposes (harmless to keep for other consumers).

### 2.4 ES doctor profile (`/spain/en/doctors/dr-syed-tahir`) — `Physician`
- PASS: `worksFor` @id-linked to org, `identifier` (CGCOM number), `hasCredential` → `EducationalOccupationalCredential.recognizedBy`, `memberOf` (regulator), `knowsLanguage`, `image` as ImageObject with caption.
- FAIL (recommended, not required): no `medicalSpecialty` enum value (only free-text `jobTitle`). Google/entity graph benefits from a structured `medicalSpecialty`.
- No rich-result feature exists for `Physician`/`Person` on Google today — this markup is E-E-A-T/Knowledge-Graph value only, correctly built but shouldn't be sold internally as "rich-result eligible."
- FAQPage on this page duplicates doctor bio content already in `description`/answers — legitimate curated business FAQ (not user-generated), so `QAPage` does **not** apply here; `FAQPage` is the structurally correct choice, just non-rewarding post-May-2026 (§4.2).

### 2.5 IE blog article (`/ireland/en/blog/diabetes-a-silent-disease`) — `Article`
- PASS required fields: `headline`, `image`, `datePublished`, `dateModified`, `author` (Physician, @id-linked worksFor), `publisher` (@id-linked to `#organization`).
- FAIL (recommended): `image` is a bare URL string, not an `ImageObject` with explicit `width`/`height`. Google's Article guidance wants ≥1200px-wide images in a supported aspect ratio (16x9/4x3/1x1); a string doesn't declare dimensions, so eligibility can't be confirmed from markup alone — convert to ImageObject.
- `publisher` has no inline `logo` (relies on cross-script `@id` merge back to `#organization`, which does carry a logo) — works today per Google's multi-block merge behavior, but is a single point of fragility if that block is ever split across pages inconsistently. Low priority; consider inlining `logo` directly on `publisher` for robustness.
- `about: {"@type":"Thing","name":"Endocrinology"}` — Endocrinology is a specialty, not the article's topic (diabetes). Weak entity signal; see §5.2.
- `reviewedBy` on Article — not a Google Article rich-result requirement, but is a widely used, harmless E-E-A-T convention; fine to keep.

### 2.6 IE pricing (`/ireland/en/pricing`) — `Product` × 3 + `Offer` + `Brand` + `UnitPriceSpecification`
**FAIL — wrong schema type.** Care plans are recurring healthcare *subscriptions*, not purchasable goods. Google's Product structured-data guidelines are scoped to tangible/purchasable merchant items and explicitly say not to use `Product` for services. Consequences:
- `itemCondition` is a **required** field for Product rich results/Merchant listings and is absent here — even under the current (wrong) typing, these blocks are not eligible for the Product snippet today.
- No `aggregateRating`/`review` (recommended for Product), reinforcing this isn't earning any SERP benefit as-is.
- The rest of the site correctly uses `Service`/`MedicalProcedure` (52/172 instances) for offerings — Product is inconsistent with that pattern and only appears on the 6 `ireland/*/pricing` locale variants; other countries' pricing pages have no Offer/Product markup at all (missing opportunity, §5.3).
- `Offer.availability = InStock` is semantically wrong for a subscription plan (no "stock" concept) — another symptom of the wrong parent type.

Corrected JSON-LD (drop-in replacement for the 3 Product blocks):
```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.myglobalhealth.online/ireland/en/pricing#comprehensive-care-plan",
  "name": "Comprehensive Care Plan",
  "description": "More monthly GP access for regular healthcare needs.",
  "url": "https://www.myglobalhealth.online/ireland/en/pricing",
  "serviceType": "Telehealth subscription plan",
  "provider": {
    "@type": "MedicalOrganization",
    "@id": "https://www.myglobalhealth.online/#organization"
  },
  "areaServed": { "@type": "Country", "name": "Ireland" },
  "offers": {
    "@type": "Offer",
    "price": "39.00",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "url": "https://www.myglobalhealth.online/ireland/en/pricing",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "39.00",
      "priceCurrency": "EUR",
      "unitCode": "MON",
      "billingDuration": 1,
      "billingIncrement": 1
    }
  }
}
```
Repeat per plan (`Essential Care Plan`, `Premium Wellness Care Plan`), each with its own `@id`. Drop `Brand`/`Product` entirely — a services provider doesn't need `Brand`; `provider` covers attribution.

### 2.7 IE lab-tests (`/ireland/en/lab-tests`)
- PASS: `BreadcrumbList`, `FAQPage`, `ItemList` (2 items, matches page content — no padding/spam).
- No `Product`/`Offer`/`MedicalTest` markup on the individual list items — missing opportunity, see §5.4.

## 3. Cross-page consistency

- `@id` scheme is used correctly and consistently for the site-wide org/website nodes. It is **not** used at all for country-level or per-page entities (IE `MedicalBusiness`/`MedicalClinic`, doctor `Physician` nodes lack `@id` even though the same doctor/entity recurs across profile, blog author, and service `reviewedBy`). Add stable `@id`s (e.g. `.../doctors/dr-tiago-miguel-figueira#person`) so Google/consumers can dedupe the same physician appearing on 3+ pages instead of treating each inline copy as a separate entity.
- `sameAs` on the site-wide org is excellent and country-appropriate on nested blocks (ES page swaps in `cgcom.es`/`aepd.es` instead of the Irish regulator list) — correctly localized, no copy-paste leakage found in the sample.

## 4. Priority findings

### 4.1 BreadcrumbList coverage gap — Medium
175/500 pages lack `BreadcrumbList`. Most are legitimately top-level/legal
pages (`/faq`, `/terms`, `/privacy`, `/contact`, `/ireland/en/legal/*`) where
a breadcrumb isn't expected. But the sample also shows **localized service
pages missing it while the English equivalent has it**:
`portugal/en/services/baixa-medica`, `czechia/en/services/obnoveni-lecby`,
`spain/en/services/pediatria-online`, etc. vs. `ireland/en/services/acute-medical-consultation`
(which correctly has one). Fix: extend the breadcrumb generator to all
non-English/non-Ireland locale service routes.

### 4.2 FAQPage — Info (policy change, not a bug)
Google retired FAQ rich results for all sites 2026-05-07. The 293 pages
carrying `FAQPage` are schema-valid and well-written (contextual, not
duplicated across countries) but earn zero SERP feature today; any AI/GEO
value is unconfirmed. No action required — flagging per policy so it isn't
mistaken for a rich-result opportunity in future SEO planning. Do not expand
FAQPage further on that basis; if adding new Q&A content, evaluate on
content merit alone.

### 4.3 MedicalBusiness vs MedicalClinic type conflict — Medium
Same real-world entity ("Global Health · Ireland") is typed `MedicalBusiness`
on the country hub and `MedicalClinic` on service pages, with neither
carrying `address`, `geo`, `telephone`, or a shared `@id`. Both are
`LocalBusiness` subtypes intended for a genuine physical/local presence —
Global Health is a virtual-only telehealth provider, so neither type is
earning a local-business rich result (which requires address) and the
inconsistent typing muddies the entity graph. Recommend: drop the
`LocalBusiness`-family types on these pages and reuse the already-correct
`MedicalOrganization` (with a country-scoped `@id`, e.g.
`#organization-ireland`), or if a genuine consulting-room address exists per
country, add real `address`+`geo` and standardize on one type
(`MedicalClinic`) everywhere.

### 4.4 Product/Brand on pricing — High
Care-plan subscriptions modeled as `Product` (see §2.6). Not eligible for
Merchant/Product rich results today (missing `itemCondition`), and the wrong
parent type for a recurring service. Fix: `Service` + `Offer` as shown
above, matching the pattern already used correctly for 52 other Service
instances site-wide.

## 5. Missing schema opportunities (telemedicine-specific)

1. **`WebSite.potentialAction` (SearchAction)** for sitelinks searchbox, if internal search exists — currently absent site-wide.
2. **`MedicalCondition`/`MedicalSpecialty` entity typing on blog `about`** — e.g. diabetes article's `about` should reference a `MedicalCondition` ("Diabetes mellitus") rather than the specialty ("Endocrinology"), which is a stronger topical/entity signal for health content.
3. **Offer/Service markup on non-Ireland pricing pages** — only the 6 `ireland/*/pricing` locale URLs carry pricing schema; Spain/Portugal/Czechia/Romania/Brazil pricing pages have none in the sample.
4. **Per-test `MedicalTest`/`Offer` on lab-tests** — `/ireland/en/lab-tests` lists tests only via `ItemList`; individual test detail pages should carry `MedicalTest` (schema.org type covering sample type, normal range, `usedToDiagnose`) + `Offer` for price, giving stronger topical + commerce signals than a generic ItemList.
5. **AggregateRating/Review** — no `Review`/`AggregateRating` type appears anywhere in the 500-page sample despite Doctify review widgets being live on the site (per prior audit). Sourcing genuine aggregate ratings into `Physician`/`Service` markup is the single highest-value addition available — it's the one remaining Google-supported rich-result surface this site isn't using at all. Only add if the aggregate figures are real and match what's displayed on-page (Google review-snippet policy requires visible, verifiable ratings).
6. **`OpeningHoursSpecification`/`hoursAvailable`** — used on only 1/500 pages; for a 24/7 (or defined-hours) virtual service, add `Service.hoursAvailable` consistently instead of a single one-off instance.

## 6. What NOT to add
- No `HowTo` (deprecated Sept 2023), no `SpecialAnnouncement` (deprecated Jul 2025), no `CourseInfo`/`EstimatedSalary`/`LearningVideo` (retired Jun 2025) — none present, none recommended.
- Do not expand `FAQPage` further as an SEO play (§4.2).
