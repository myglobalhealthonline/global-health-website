# Google access and measurement review — 2026-09-09

Scope: read-only browser review after the owner signed in following a Windows
reinstall. Both existing properties are accessible. No settings, integration links,
key-event flags, permissions or indexation submissions were changed. Current actions
remain in [the canonical ledger](../../plans/seo-control-state.md), §49.

## Google Analytics

Account `402286490`, property `547083375`, displayed name `myglobalhealth.online`.

- Home's last-seven-days chart covered **September 2–8** and showed zero active
  users/events/key events. That window predates the September 9 collection repair
  recorded in ledger §47; it is not evidence that today's collection is broken.
- Realtime showed **2 active users in the last 30 minutes**, **1 in the last five**.
  The event table showed `web_vital` 20, `page_view` 6, `scroll` 2,
  `session_start` 1 and `user_engagement` 1. These are a changing realtime snapshot,
  not a daily total or an organic-only audience. Internal/test traffic was not excluded.
- Realtime showed no key events in that snapshot. This does not prove a broken funnel.
- Admin → Events → Key events showed exactly **two** entries: `begin_booking`
  (Website stream active) and `purchase` (No stream data detected).
  **`begin_checkout` is not registered as a key event.** Registration and actual
  event delivery are different checks; no booking or payment flow was exercised.
- Admin → Product links → Search Console links explicitly showed **“No links yet.”**
  GSC and GA4 are accessible separately but have no integration link on this property.

Sources: [Home](https://analytics.google.com/analytics/web/#/a402286490p547083375/reports/intelligenthome),
[Realtime](https://analytics.google.com/analytics/web/#/a402286490p547083375/realtime/overview),
[Events](https://analytics.google.com/analytics/web/#/a402286490p547083375/admin/events/hub),
[Search Console links](https://analytics.google.com/analytics/web/#/a402286490p547083375/admin/integrations/search-console).

## Search Console

Domain property `sc-domain:myglobalhealth.online` is accessible.

| Report | Window / freshness shown | Reading |
| --- | --- | --- |
| Performance, Web, 28 days | August 10–September 6; last update 9 hours ago | **918 clicks, 61.3K impressions, 1.5% CTR**; impressions rounded by UI |
| Performance, Web, 3 months | June 7–September 6 | 2.12K clicks, 105K impressions, 2% CTR; rounded by UI |
| Page indexing, all known pages | Last update September 4 | Overview: **2,098 indexed; 1,744 not indexed** |
| Core Web Vitals overview | Observed September 9; underlying report window not opened | 103 good URLs for mobile and 103 for desktop; zero needs-improvement/poor shown |
| Breadcrumbs overview | Observed September 9 | 102 valid; zero invalid shown |

Examples from the 28-day query table: `calculator calorii` 15 clicks / 887
impressions; `krevní tlak kalkulačka` 14 / 470. These are query examples, not country
totals. No market-level or conversion conclusion is drawn from them.

Visible indexing reasons included 392 redirects, 166 not found, 308 crawled/currently
not indexed, 311 alternate canonical pages and 294 excluded by noindex. The table
showed rows 1–10 of 11; this is not a complete reason export. These are Google's
stored categories across all known URLs, not 1,744 newly broken canonical pages.
Intentional removals, redirects and canonical alternates must be reconciled with the
ledger and live URLs before any fix or validation request.

The earlier 861-click baseline covers August 5–September 1. It overlaps this new
window and is **not** a valid preceding-period comparison. Blended position is not
used to grade SEO progress while indexation expands.

Sources: [Performance](https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Amyglobalhealth.online&num_of_days=28),
[Indexing](https://search.google.com/search-console/index?resource_id=sc-domain%3Amyglobalhealth.online),
[Overview](https://search.google.com/search-console?resource_id=sc-domain%3Amyglobalhealth.online).

Browser access does not restore the absent local OAuth files or establish an
OpenSEO/API connection. This review preserves observed aggregate results only;
it contains no authentication secrets or user-level exports.
