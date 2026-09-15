# A2 live probe summary — 2026-09-15

## Counts by market x page_type x final_status (top 25)
- none / unknown / 404: 1269
- none / unknown / 200: 292
- Spain / service / 200: 144
- Ireland / service / 200: 138
- Portugal / service / 200: 138
- Ireland / doctor / 200: 132
- none / service / 404: 113
- Romania / service / 200: 102
- Czechia / service / 200: 90
- Portugal / doctor / 200: 90
- Ireland / unknown / 404: 85
- Ireland / test / 404: 84
- Spain / doctor / 200: 78
- none / consult / 404: 57
- Brazil / service / 200: 54
- Ireland / blog_post / 200: 54
- Portugal / blog_post / 200: 54
- Czechia / doctor / 200: 48
- Czechia / tool / 200: 48
- Ireland / tool / 200: 48
- Portugal / tool / 200: 48
- Romania / tool / 200: 48
- Spain / tool / 200: 48
- Czechia / legal / 200: 42
- Ireland / health_legacy / 200: 42

## Failing checks (16)
- T-001 [sitemap] sitemap URLs return non-200 final status: 84/2266
- T-004 [redirect] redirect chains >1 hop: 7/4672
- T-006 [redirect] redirects ending in 4xx/5xx: 223/620
- T-008 [canonical] canonical mismatch (points elsewhere): 684/3509
- T-010 [metadata] missing titles: 2/2829
- T-011 [metadata] duplicate titles within same language: 412/2829
- T-012 [metadata] missing meta descriptions: 2/2829
- T-013 [metadata] duplicate meta descriptions within same language: 769/2829
- T-016 [headings] missing H1: 4/2829
- T-021 [hreflang] hreflang cross market: 7416/24315
- T-025 [hreflang] hreflang alternate redirects: 2285/24315
- T-028 [structured_data] missing expected JSON-LD @type for page family: 404/1336
- T-030 [content_signals] soft 404s (200 status, not-found language or too-thin content): 29/2829
- T-033 [images] images missing alt: 2069/2829
- T-036 [content_signals] superlative claim hits (best/leading/world-class/#1/top-rated/unmatched/guaranteed + i18n): 910/2829
- T-039 [international] parameter/alternate URLs indexable (should generally canonicalize away): 1/1

## Top 25 anomalies (non-200 or flagged, first 25)
- U000001 https://www.myglobalhealth.online/?utm_source=google&utm_medium=wix_google_business_profile&utm_campaign=2542957205546960617,prt,0,1,0,14,yes,R2026-09-15-GSC-W,America/Los_Angeles,openseo_mcp:get_search_console_performance -> status=200 indexability=index soft404=no
- U000003 https://www.myglobalhealth.online/:country(ireland)/:lang(en|pt|es|cs|ro|de)/family-medicine-consultation -> status=404 indexability=gone soft404=no
- U000002 https://www.myglobalhealth.online/:country(ireland)/:lang(en|pt|es|cs|ro|de)/erectyle-dysfunction-consultation -> status=404 indexability=gone soft404=no
- U000005 https://www.myglobalhealth.online/:country(ireland)/:lang(en|pt|es|cs|ro|de)/pain-management-consultation -> status=404 indexability=gone soft404=no
- U000004 https://www.myglobalhealth.online/:country(ireland)/:lang(en|pt|es|cs|ro|de)/medical-consultation -> status=404 indexability=gone soft404=no
- U000009 https://www.myglobalhealth.online/:country(ireland)/:lang(en|pt|es|cs|ro|de)/treatment-refill -> status=404 indexability=gone soft404=no
- U000008 https://www.myglobalhealth.online/:country(ireland)/:lang(en|pt|es|cs|ro|de)/sick-leave -> status=404 indexability=gone soft404=no
- U000006 https://www.myglobalhealth.online/:country(ireland)/:lang(en|pt|es|cs|ro|de)/referral-consultation -> status=404 indexability=gone soft404=no
- U000007 https://www.myglobalhealth.online/:country(ireland)/:lang(en|pt|es|cs|ro|de)/self-referral -> status=404 indexability=gone soft404=no
- U000011 https://www.myglobalhealth.online/:country(ireland|portugal|spain|romania)/:lang(en|pt|es|cs|ro|de)/specialist-consultation -> status=404 indexability=gone soft404=no
- U000012 https://www.myglobalhealth.online/:country(ireland|romania)/:lang(en|pt|es|cs|ro|de)/tests -> status=404 indexability=gone soft404=no
- U000010 https://www.myglobalhealth.online/:country(ireland|portugal|spain|romania)/:lang(en|pt|es|cs|ro|de)/specialist-appointment -> status=404 indexability=gone soft404=no
- U000013 https://www.myglobalhealth.online/:country/:lang -> status=404 indexability=gone soft404=no
- U000014 https://www.myglobalhealth.online/:country/:lang(en|pt|es|cs|ro|de)/book-online -> status=404 indexability=gone soft404=no
- U000016 https://www.myglobalhealth.online/:country/:lang(en|pt|es|cs|ro|de)/gp-appointment -> status=404 indexability=gone soft404=no
- U000015 https://www.myglobalhealth.online/:country/:lang(en|pt|es|cs|ro|de)/general-consultation -> status=404 indexability=gone soft404=no
- U000017 https://www.myglobalhealth.online/:country/:lang(en|pt|es|cs|ro|de)/online-doctor-visit -> status=404 indexability=gone soft404=no
- U000019 https://www.myglobalhealth.online/:country/:lang(en|pt|es|cs|ro|de)/repeat-prescription -> status=404 indexability=gone soft404=no
- U000020 https://www.myglobalhealth.online/:country/:lang(en|pt|es|cs|ro|de)/respiractory-infections -> status=404 indexability=gone soft404=no
- U000018 https://www.myglobalhealth.online/:country/:lang(en|pt|es|cs|ro|de)/prescriptions -> status=404 indexability=gone soft404=no
- U000021 https://www.myglobalhealth.online/:country/:lang(en|pt|es|cs|ro|de)/services -> status=404 indexability=gone soft404=no
- U000022 https://www.myglobalhealth.online/:country/:lang/acute-medical-consultation -> status=404 indexability=gone soft404=no
- U000024 https://www.myglobalhealth.online/:country/:lang/chronic-disease-consultation -> status=404 indexability=gone soft404=no
- U000025 https://www.myglobalhealth.online/:country/:lang/gp-consultation-online -> status=404 indexability=gone soft404=no
- U000026 https://www.myglobalhealth.online/:country/:lang/lab-tests -> status=404 indexability=gone soft404=no

## Response time (ms) by market
- Brazil: n=190 p50=801ms p95=1516ms
- Czechia: n=418 p50=686ms p95=818ms
- Ireland: n=784 p50=682ms p95=795ms
- Portugal: n=556 p50=683ms p95=807ms
- Romania: n=403 p50=661ms p95=778ms
- Spain: n=499 p50=678ms p95=783ms
- none: n=1822 p50=584ms p95=703ms

## Next build id / deployment marker observed: 451b23e72f7076f53a06364e06f86da74113d568

## Run stats: {"requested": 4672, "fetched_this_run": 4666, "errors_this_run": 0, "seconds_this_run": 1324.0}