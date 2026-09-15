# P0 incident note — Ireland lab-tests cluster returns 404 (observed 2026-09-15)

Observed (public HTTP GET, audit UA, 2026-09-15 ~05:30 UTC):
- /ireland/en/lab-tests -> 404; /ireland/en/lab-tests/general-health-test -> 404; /ireland/en/lab-tests/vitamin-d-test -> 404; /ireland/en/book-a-test -> 404.
- /ireland/en/tests -> 308 -> /ireland/en/lab-tests (-> 404). /romania/ro/lab-tests -> 200 (control).
- frontend/tests/unit/seo-live-urls.test.ts with SEO_CHECK_BASE=https://www.myglobalhealth.online: 2 failed / 7 passed. "every sitemap entry returns 200 and is indexable" lists 84 /ireland/{en,pt,es,cs,ro,de}/lab-tests/* URLs at 404; "no redirect terminates in a 404" lists 40 legacy Wix redirects (/product-page/*, /home-health-tests/*, /home-health-tests-1/*, /home-delivery, /home-health-test) whose destination is now 404. Log: seo-live-urls-test-2026-09-15.txt.
- Sitemap (2026-09-15) still lists 90 lab-tests URLs with lastmod 2026-09-14.
- GSC: pages containing /lab-tests still earned 101-182 impressions/day 2026-09-07..09-13 (stale index). URL Inspection 2026-09-15: hub "Submitted and indexed", last crawl 2026-09-07T14:45Z, fetch SUCCESSFUL; detail page last crawl 2026-08-08.

Root cause (code + API evidence, not a guess):
- frontend/app/[country]/[lang]/tests/page.tsx:98 `if (!isCountryFeatureEnabled(overlay, "health-tests")) notFound();`
- https://api.myglobalhealth.online/api/countries (saved A0-access/api/countries-2026-09-15.json): Ireland enabledFeatures = [country-home, country-content, pages, footer, services, general-consultations, specialist-consultations, online-prescriptions, appointments, subscriptions] — `health-tests` ABSENT. Romania's list includes `health-tests`.
- https://api.myglobalhealth.online/api/countries/ie/health-tests?locale=EN still returns all 14 test records (data intact).
- frontend/app/sitemap.ts:194-197 pushes /lab-tests/<slug> from getCountryHealthTests WITHOUT the feature gate -> sitemap and page disagree (template-level defect: one gate, two consumers).
- frontend/lib/content/country-features.ts: "empty = all enabled" fallback only applies when the array is empty/undefined; Ireland's array is populated, so the missing key is authoritative.

Window: after 2026-09-07T14:45Z (Google fetched the hub successfully) and before 2026-09-15T05:20Z (probe). The flag is admin-managed (/admin/country-features, DB), so git history cannot date the change; commits 8ab44479 (2026-09-09, test-bookings) and 8b9f1487 (2026-09-10, case-insensitive country code lookups) sit inside the window and touch adjacent code — correlation only.

Impact: 84 indexed sitemap URLs + hub + 6 book-a-test routes + 40 legacy redirects now dead; the SEO-GROWTH-016 lab cluster (embargoed measurement window, NEXT-4 Product/Offer schema) cannot be measured; commercial product line unreachable for Irish buyers.

Smallest safe fix (needs owner decision — not applied by this audit): re-enable `health-tests` for Ireland in /admin/country-features (one data change, no deploy) if the product line is still sold; otherwise remove lab tests from the sitemap and serve 410/redirect deliberately. Template fix: sitemap.ts must apply the same `isCountryFeatureEnabled(country, "health-tests")` gate as the page (one shared predicate), and the seo-live-urls test should run in CI against production on a schedule so a flag flip is caught within a day.

Prior record: old ledger §58 (docs/plans/seo-control-state.md line ~10088, dated 13 September 2026) already noted "/ireland/en/lab-tests 404 is the country health-tests feature toggle being off ... Missing fact: whether operations intends Irish lab ordering to be available." So the 404 was present by 2026-09-13; window narrows to 2026-09-07T14:45Z .. 2026-09-13. The question was left open there; this audit escalates it to a P0 owner decision because 84 sitemapped, indexed URLs and 40 legacy redirects now terminate in 404 and the sitemap still advertises them.
