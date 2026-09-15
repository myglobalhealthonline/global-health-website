# A5 locale data QA — findings (2026-09-15)

Combinations tested: 33. Home-page FAILs: 0. Feature-route FAILs: 5/24. Probe FAILs: 2/12. Doctor-sample FAILs: 0/16.

## Per-combination FAILs (shared-template root cause noted once)
None.

## Feature route matrix FAILs
- cz/online-prescriptions: https://www.myglobalhealth.online/czechia/cs/prescriptions -> status=200 in_sitemap=no :: FAIL: enabledFeatures says off but status=200
- pt/online-prescriptions: https://www.myglobalhealth.online/portugal/pt/prescriptions -> status=200 in_sitemap=no :: FAIL: enabledFeatures says off but status=200
- es/online-prescriptions: https://www.myglobalhealth.online/spain/es/prescriptions -> status=200 in_sitemap=no :: FAIL: enabledFeatures says off but status=200
- ro/online-prescriptions: https://www.myglobalhealth.online/romania/ro/prescriptions -> status=200 in_sitemap=no :: FAIL: enabledFeatures says off but status=200
- br/online-prescriptions: https://www.myglobalhealth.online/brazil/pt/prescriptions -> status=200 in_sitemap=no :: FAIL: enabledFeatures says off but status=200

## Cache-isolation / error-substitution probes (FAILs only; full log in run.log)
- [error-substitution:doctor-cross-country] PT doctor 'beatriz-carvalho' under /spain/es/doctors/ -> status=200 :: FAIL rendered a page
- [error-substitution:doctor-cross-country] ES doctor 'dr-eszter-szilagyi' under /portugal/pt/doctors/ -> status=200 :: FAIL rendered a page

## Doctor noindex-vs-readyToIndex sample (FAILs only)
None — robots meta matched readyToIndex for every sampled doctor.

## Root cause / smallest shared fix
1. **`/prescriptions` ignores the `online-prescriptions` flag in prod (5/6 markets).** `frontend/app/[country]/[lang]/prescriptions/page.tsx:97` DOES call `isCountryFeatureEnabled(overlay, "online-prescriptions")` with `overlay = await getPublicCountryByCode(code)` — the gate exists and reads the merged live config, same pattern `/lab-tests` and `/see-a-specialist` use (both passed this audit). Live `/api/countries` confirms cz/pt/es/ro/br all omit `online-prescriptions` from `enabledFeatures`, yet all 5 rendered 200 with real page content; the page response itself is `Cache-Control: private, no-store` (not a CDN/browser cache hit), which points at a stale Next.js **Data Cache** read of the tagged `fetchCountries()` call (`revalidate: 120`, tag `countries` — `frontend/lib/api/site-content-api.ts`) rather than a missing gate. Smallest fix: confirm `/admin/country-features` calls `revalidateTag(SITE_CACHE_TAGS.countries())` on save; if it already does, the 120s window itself is the bug (fetches from other pages in the same render aren't forcing revalidation) and needs a live re-check with a longer gap between requests before spending an implementation batch on it.
2. **Doctor profile renders under another market's URL — no country ownership check.** Both directions reproduce: a Portugal doctor slug under `/spain/es/doctors/` and a Spain doctor slug under `/portugal/pt/doctors/` both return 200 with that doctor's real profile (see probes above). Services correctly 404 cross-market (`/spain/es/services/<ie-slug>` -> 404), so the doctor detail route is missing the equivalent `doctor.countryCode === urlCountry` check the service route already has. This is the highest-severity finding: duplicate/wrong-market indexable content today, and a template bug — fix once in the doctor profile page's data lookup, not per market.