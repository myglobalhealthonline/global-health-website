# Template Route Map

Status legend: `done` / `needs adapter` / `placeholder` / `needs content`

## CountryHomeTemplate

| route path | page file | template used | data source/adapter used | status |
| --- | --- | --- | --- | --- |
| `/` | `app/(site)/page.tsx` | `CountryHomeTemplate` (global entry composition) | `getSiteContext`, `getTemplatePageData`, `home-page-presenters` | done |
| `/home` | `app/(site)/home/page.tsx` | `CountryHomeTemplate` | `getTemplatePageData`, `home-page-presenters` | done |
| `/home-pt` | `app/(site)/home-pt/page.tsx` | `CountryHomeTemplate` | `getTemplatePageData`, `home-page-presenters` | done |
| `/home-sp` | `app/(site)/home-sp/page.tsx` | `CountryHomeTemplate` | `getTemplatePageData`, `home-page-presenters` | done |
| `/home-cz` | `app/(site)/home-cz/page.tsx` | `CountryHomeTemplate` | `getTemplatePageData`, `home-page-presenters` | done |
| `/home-rm` | `app/(site)/home-rm/page.tsx` | `CountryHomeTemplate` | `getTemplatePageData`, `home-page-presenters` | done |

## ConsultationListingTemplate

| route path | page file | template used | data source/adapter used | status |
| --- | --- | --- | --- | --- |
| `/general-consultation-ie` | `app/(site)/general-consultation-ie/page.tsx` | `ConsultationListingTemplate` | `getTemplatePageData().generalConsultation` | done |
| `/general-consultation-pt` | `app/(site)/general-consultation-pt/page.tsx` | `ConsultationListingTemplate` | `getTemplatePageData().generalConsultation` | done |
| `/general-consultation-sp` | `app/(site)/general-consultation-sp/page.tsx` | `ConsultationListingTemplate` | `getTemplatePageData().generalConsultation` | done |
| `/general-consultation-cz` | `app/(site)/general-consultation-cz/page.tsx` | `ConsultationListingTemplate` | `getTemplatePageData().generalConsultation` | done |
| `/general-consultation-rm` | `app/(site)/general-consultation-rm/page.tsx` | `ConsultationListingTemplate` | `getTemplatePageData().generalConsultation` | done |
| `/specialty-ie` | `app/(site)/specialty-ie/page.tsx` | `ConsultationListingTemplate` | `getTemplatePageData().specialistListing` | done |
| `/specialty-pt` | `app/(site)/specialty-pt/page.tsx` | `ConsultationListingTemplate` | `getTemplatePageData().specialistListing` | done |
| `/specialty-sp` | `app/(site)/specialty-sp/page.tsx` | `ConsultationListingTemplate` | `getTemplatePageData().specialistListing` | done |
| `/specialty-cz` | `app/(site)/specialty-cz/page.tsx` | `ConsultationListingTemplate` | `getTemplatePageData().specialistListing` | done |
| `/specialty-rm` | `app/(site)/specialty-rm/page.tsx` | `ConsultationListingTemplate` | `getTemplatePageData().specialistListing` | done |

## ServiceDetailTemplate

| route path | page file | template used | data source/adapter used | status |
| --- | --- | --- | --- | --- |
| `/ireland/[serviceSlug]` | `app/(site)/ireland/[serviceSlug]/page.tsx` | `ServiceDetailTemplate` | `routeInventory`, `buildServiceDetailCopy` | done |
| `/ireland-specialist-consultations/[serviceSlug]` | `app/(site)/ireland-specialist-consultations/[serviceSlug]/page.tsx` | `ServiceDetailTemplate` | `routeInventory`, `buildServiceDetailCopy` | done |
| `/service-page/[serviceSlug]` | `app/(site)/service-page/[serviceSlug]/page.tsx` | `ServiceDetailTemplate` | `buildServiceDetailCopy` | done |
| `/services/[serviceSlug]` | `app/(site)/services/[serviceSlug]/page.tsx` | `ServiceDetailTemplate` | `buildServiceDetailCopy` | done |
| `/home-health-tests/[testSlug]` | `app/(site)/home-health-tests/[testSlug]/page.tsx` | `ServiceDetailTemplate` | `buildServiceDetailCopy` | done |

## DoctorTeamTemplate

| route path | page file | template used | data source/adapter used | status |
| --- | --- | --- | --- | --- |
| `/ireland-team` | `app/(site)/ireland-team/page.tsx` | `DoctorTeamTemplate` | `getTemplatePageData().doctors` | done |
| `/portugal-team` | `app/(site)/portugal-team/page.tsx` | `DoctorTeamTemplate` | `getTemplatePageData().doctors` | done |
| `/spain-team` | `app/(site)/spain-team/page.tsx` | `DoctorTeamTemplate` | `getTemplatePageData().doctors` | done |
| `/czechia-team` | `app/(site)/czechia-team/page.tsx` | `DoctorTeamTemplate` | `getTemplatePageData().doctors` | done |
| `/romania-team` | `app/(site)/romania-team/page.tsx` | `DoctorTeamTemplate` | `getTemplatePageData().doctors` | done |

## Blog Templates

| route path | page file | template used | data source/adapter used | status |
| --- | --- | --- | --- | --- |
| `/blog` | `app/(site)/blog/page.tsx` | `BlogIndexTemplate` | `getTemplatePageData().blogPosts` | done |
| `/post/[slug]` | `app/(site)/post/[slug]/page.tsx` | `BlogArticleTemplate` | `routeInventory.blogPosts` | done |

## LegalPageTemplate

| route path | page file | template used | data source/adapter used | status |
| --- | --- | --- | --- | --- |
| `/legal-notices` | `app/(site)/legal-notices/page.tsx` | `LegalPageTemplate` | `buildLegalCopy` | done |
| `/term-and-conditions` | `app/(site)/term-and-conditions/page.tsx` | `LegalPageTemplate` | `buildLegalCopy` | done |
| `/privacy` | `app/(site)/privacy/page.tsx` | `LegalPageTemplate` | `buildLegalCopy` | done |
| `/return-and-refund-policy` | `app/(site)/return-and-refund-policy/page.tsx` | `LegalPageTemplate` | `buildLegalCopy` | done |
| `/cookies-policy` | `app/(site)/cookies-policy/page.tsx` | `LegalPageTemplate` | `buildLegalCopy` | done |

## BookingFormTemplate

| route path | page file | template used | data source/adapter used | status |
| --- | --- | --- | --- | --- |
| `/book-online` | `app/(site)/book-online/page.tsx` | `BookingFormTemplate` | `getBookingPageData` | done |

## StaticMarketingTemplate

| route path | page file | template used | data source/adapter used | status |
| --- | --- | --- | --- | --- |
| `/about` | `app/(site)/about/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/about")` | done |
| `/careers` | `app/(site)/careers/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/careers")` | done |
| `/gift-card` | `app/(site)/gift-card/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/gift-card")` | done |
| `/plans-pricing` | `app/(site)/plans-pricing/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/plans-pricing")` | done |
| `/pricing-plans/list` | `app/(site)/pricing-plans/list/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/pricing-plans/list")` | done |
| `/online-prescription` | `app/(site)/online-prescription/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/online-prescription")` | done |
| `/home-delivery` | `app/(site)/home-delivery/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/home-delivery")` | done |
| `/home-health-test` | `app/(site)/home-health-test/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/home-health-test")` | done |
| `/partner-clinics` | `app/(site)/partner-clinics/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/partner-clinics")` | done |
| `/corporate-plans` | `app/(site)/corporate-plans/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/corporate-plans")` | done |
| `/frequent-asked-questions` | `app/(site)/frequent-asked-questions/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/frequent-asked-questions")` | done |
| `/terms-and-conditions` | `app/(site)/terms-and-conditions/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/terms-and-conditions")` | done |
| `/privacy-policy` | `app/(site)/privacy-policy/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/privacy-policy")` | done |
| `/refund-policy` | `app/(site)/refund-policy/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/refund-policy")` | done |
| `/gdpr-compliance` | `app/(site)/gdpr-compliance/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/gdpr-compliance")` | done |
| `/copy-of-privacy-policy` | `app/(site)/copy-of-privacy-policy/page.tsx` | `StaticMarketingTemplate` | `getMarketingPageData("/copy-of-privacy-policy")` | done |
| `/category/[slug]` | `app/(site)/category/[slug]/page.tsx` | `StaticMarketingTemplate` | `routeInventory.categories` + in-route adapter mapping | done |
| `/ireland-doctors/[doctorSlug]` | `app/(site)/ireland-doctors/[doctorSlug]/page.tsx` | `StaticMarketingTemplate` | in-route slug adapter mapping | done |

## Notes

- All `app/(site)` routes now render shared templates and keep route files thin adapters.
- Dashboard readiness is preserved: route-level content is sourced from adapter files (`template-page-data.ts`, `booking-page-data.ts`, `marketing-page-data.ts`) and can be replaced by backend/admin data later without template rewrites.
