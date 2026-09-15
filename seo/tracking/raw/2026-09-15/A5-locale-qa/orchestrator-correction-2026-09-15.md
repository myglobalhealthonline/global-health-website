# Orchestrator correction to A5 findings (2026-09-15, verified with curl, no redirect following)

A5 reported two FAILs that are false positives caused by following redirects to a 200 page:

1. "/prescriptions ignores the online-prescriptions flag in 5/6 markets" — WRONG. Without following redirects:
   /czechia/cs/prescriptions -> 308 -> /czechia/cs/gp-consultation-online
   /brazil/pt/prescriptions  -> 308 -> /brazil/pt/gp-consultation-online
   /ireland/en/prescriptions -> 308 -> /ireland/en/gp-consultation-online (Ireland has the flag ON and still redirects: this is the deliberate SEO-RX-001 prescription-content retirement, a redirect rule, not a flag bypass).
   No market renders a prescriptions page. Verdict: PASS (deliberate redirect), not a cache defect. No sitemap entry contains /prescriptions (0 rows).

2. "Doctor profile pages have no country-ownership check" — WRONG. Without following redirects:
   /spain/es/doctors/beatriz-carvalho   -> 307 -> /spain/es/doctors  (interstitial body carries robots noindex,follow)
   /portugal/pt/doctors/dr-eszter-szilagyi -> 307 -> /portugal/pt/doctors (same)
   A foreign-market doctor slug is redirected to that market's directory; no other market's data is rendered. Verdict: PASS. Minor note: a 307 (temporary) is used for a permanent condition, and the interstitial HTML includes a self-canonical to the redirecting URL; harmless because it is noindex and 307, but a 308/404 would be cleaner.

Confirmed feature-route behaviour: /czechia/cs/see-a-specialist -> 404 with specialist-consultations off; /ireland/en/see-a-specialist -> 200. The lab-tests case (Ireland flag off, sitemap still lists) remains the one real feature/sitemap inconsistency (see A2-probe/incident-ireland-lab-tests-404-2026-09-15.md).

Net A5 result after correction: 33/33 combinations pass hreflang, data-filter, cache-isolation, fallback-language, currency/regulator and metadata checks; 0 cross-market data substitution found; feature-route matrix defects reduce to the Ireland lab-tests sitemap/page disagreement.
