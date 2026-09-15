# A4 GA4 audit — frontend tracking code review (read-only)

Scope: `frontend/lib/analytics/*`, `frontend/components/analytics/*`,
`frontend/components/compliance/GoogleAnalytics.tsx`, and callers of
`trackAnalyticsEvent`/`trackBookingEvent`. No files modified.

## 1. Events fired, with parameters

Closed union in `lib/analytics/track.ts` (`AnalyticsEventName`) — nothing
outside this union can be sent; the comment there explicitly frames this as a
guard against free-text symptom/appointment data reaching GA4:

| Event | Fired from | Parameters sent |
|---|---|---|
| `book_appointment_click` | `lib/analytics/booking.ts` `trackBookingClick()`, called from booking CTAs (`SameDayBooking.tsx`, `HeroBookingWizard.tsx`, slot pickers) | `service_category` (gp/specialist_care/healthcare, closed enum), `market` (country slug), plus overridden `page_location`/`page_path`/`page_title="Appointment booking"`/`page_referrer=""` |
| `select_time_slot` | same path, when the target URL has `slot`/`at` query params | same shape as above |
| `begin_booking` | GA4 **key event** per `measurement_health` (custom, `ONCE_PER_SESSION`, created 2026-08-24) | same shape as above |
| `booking_confirmed` | `components/analytics/BookingConfirmedTracker.tsx`, mounted on the order-confirmation view | GA4 **key event** (custom, `ONCE_PER_EVENT`, created 2026-09-09, `defaultValue` 1 USD). Same market/service_category shape; deduped via `sessionStorage` key `gh_booking_confirmed:<orderId>` and a `gh-ga-ready` retry listener for the gtag-not-yet-loaded case |
| `add_to_cart` | `components/cart/CartContext.tsx` | not inspected line-by-line this pass; present in the closed union |
| `begin_checkout` | `app/[country]/[lang]/cart/_components/CartPageClient.tsx` `goToCheckout()` | `value` (major units), `currency`, `items` (item **count**, not an array) |
| `select_service` | present in union; caller not traced this pass | — |
| `purchase` | `components/analytics/PurchaseTracker.tsx`, mounted only on the confirmed-paid branch of checkout success | GA4 **key event** (`ONCE_PER_EVENT`). `transaction_id`, `value` (major units), `currency` — **deliberately no `items` array**, per an inline comment: `SafeAnalyticsValue` forbids nested values and an items array would put service names (what the patient bought) into GA4. Deduped by `sessionStorage` key `gh_purchase_sent:<orderId>`, not a React ref, because the success page reloads itself while polling the payment webhook |
| `web_vital` | `components/analytics/WebVitals.tsx` | `metric_name`, `value`, `metric_rating`, `route_template`, plus templated `page_path`/`page_location`/`page_title="Public page performance"` |
| `page_view` | `components/compliance/GoogleAnalytics.tsx`, manual (see §3) | `page_path`, `page_location`, `page_title` — all through `sanitizePagePath()` |

**Confirmed finding: `begin_checkout` is fired in code but is NOT a
registered GA4 key event.** `measurement_health` (`ga4_measurement_health.json`)
lists exactly three key events: `purchase`, `begin_booking`,
`booking_confirmed`. `begin_checkout` and `add_to_cart` are standard GA4
e-commerce events but were never marked as key events in GA4 Admin, so mid-funnel
drop-off between "added to cart" and "confirmed booking" is invisible to any
key-event/conversion report even though the client-side instrumentation exists.

## 2. Consent gating

- Single choke point: `trackAnalyticsEvent()` (`track.ts`) reads
  `readConsent()?.analytics !== true` at **call time** (not via a React hook),
  specifically so it works from event handlers/providers and reflects a
  same-tab withdrawal immediately. Every custom event (`booking.ts`,
  `PurchaseTracker.tsx`, `CartPageClient.tsx`) routes through this.
- `GoogleAnalytics.tsx` additionally gates the tag mount itself
  (`granted = ANALYTICS_ENABLED && GA_MEASUREMENT_ID !== "" && consent?.analytics === true`)
  and implements Google Consent Mode v2: all four signals default `denied` in
  the inline bootstrap, then `analytics_storage` alone flips to `granted` once
  `granted` is true. `ad_storage`/`ad_user_data`/`ad_personalization` stay
  `denied` unconditionally — GA4 never gets ad-signal consent on this
  property.
- Withdrawal teardown is more than a consent-mode update: it also sets
  `window['ga-disable-<ID>']=true` (gtag.js's documented hard kill switch,
  because Enhanced Measurement listeners are already attached and keep firing
  cookieless pings otherwise) and calls `purgeGaCookies()`
  (`lib/analytics/cookies.ts`) to delete `_ga`, `_ga_<container>`, `_gid`,
  `_gat`, `_gcl_au` across the bare host and every parent domain suffix
  (needed because GA writes these with `cookie_domain:'auto'` i.e.
  `.myglobalhealth.online`, which a host-scoped delete cannot match).
- Route-level gating is separate from consent and layered on top: `GoogleAnalytics`
  itself only mounts from the two **public** root layouts (never the portal
  layouts — see repo CLAUDE.md's portal CSS split for the analogous pattern),
  and `analytics-routes.ts` sanitizes every path GA sees regardless of consent
  state (§4).

## 3. SPA `page_view` handling — duplicate risk

- `send_page_view: false` is set in the inline gtag bootstrap; `page_view` is
  fired manually from a `useEffect` keyed on `[granted, pathname]` in
  `GoogleAnalytics.tsx`.
- Dedup guard: `lastSentPath` ref only re-fires when the **sanitized path**
  actually changes (`if (lastSentPath.current === path) return`), and the
  effect depends on the boolean `granted`, not the `ConsentRecord` object
  identity, so a `useConsent()` re-render with the same consent state does not
  re-fire. The inline comment states this is specifically to make React
  StrictMode's dev mount→unmount→mount cycle a no-op on the second run instead
  of double-counting.
- **No duplicate-`page_view` risk observed** in this code path under normal
  operation. The one path not exercised in this review: whether a full
  document navigation between two public routes (not a client-side SPA
  transition) could double-fire before `lastSentPath` resets — not verified
  live.
- `page_view`'s `page_path`/`page_location` values are never the raw
  `usePathname()` — both are pushed through `sanitizePagePath()` first
  (`analytics-routes.ts`), and the same sanitization is applied globally via
  `gtag('set', …)` **before** the event fires, specifically so GA4 Enhanced
  Measurement's own auto-generated hits (scroll, click, form_start,
  user_engagement — which stamp `page_location` from the raw browser URL on
  their own) inherit the sanitized value too, not just the manual `page_view`.

## 4. Could any parameter carry health or identifying data?

- `track.ts`'s `isSafe()` runtime tripwire drops any string parameter that is
  `>100` chars or contains `"@"` before it reaches `gtag()` — a backstop, not
  the primary control (the primary control is the closed `AnalyticsEventName`
  union plus each call site hand-building its parameter object rather than
  forwarding arbitrary data).
- `booking.ts` explicitly overrides `page_location`/`page_path`/`page_title`/
  `page_referrer` on every booking event so the specialty/service URL, page
  title and referrer never leak through the automatic event-context fields —
  only a closed `market` enum (6 country slugs) and `service_category`
  (`gp`/`specialist_care`/`healthcare`, collapsed from whatever specific
  service was booked) go out.
- `analytics-routes.ts` (`sanitizePagePath` / `isOpaqueSegment` /
  `NAMED_REDACTIONS`) is the general-purpose guard for every path value GA can
  see: emails, UUIDs, numeric ids (4+ digits), cuids, and long
  base64url/nanoid-shaped tokens are all replaced with `:id`; named routes
  (`/card-verify/:code`, `/verify/certificate/:id`, `/share/consults/:token`,
  `/corporate-invite/:token`, `/pay/:orderId`, `/admin|doctor/patients/:email`,
  `/print/:doc/:id`) are redacted by pattern first. This is exactly why the
  `ga4_page_performance_window2_all.json` / `ga4_ecommerce_landing_page_*`
  pulls show literal `/verify/certificate/:id`, `/so/tr/:id/c`,
  `/api/account/invoices/:id/pdf` as page paths — those are the sanitizer's
  literal output, not unredacted real ids (see `ga4_pii_scan.csv`).
- Content slugs (doctor names, blog post slugs) are **deliberately not**
  redacted — the code comment frames these as published/crawlable content
  identifiers, not person identifiers, and redacting them would collapse
  content-marketing reporting to a single `/blog/:slug` row.
- Query strings and hash are always dropped by `sanitizePagePath` regardless
  of caller.
- No parameter observed anywhere in this review carries a diagnosis, symptom,
  free-text reason-for-visit, date of birth, or national ID — the design
  intent stated in comments across `track.ts`/`booking.ts`/`PurchaseTracker.tsx`
  is specifically to keep this class of data out of GA4, and the mechanisms
  (closed enums, parameter overrides, `isSafe()`, `sanitizePagePath`) are
  consistent with that intent everywhere this review looked.

## 5. Old tag `G-4PPGECG12X`

Not present anywhere under `frontend/` (checked via grep across the whole
`frontend` tree). The only remaining references in the repository are
historical, in `docs/plans/` and `docs/audits/` markdown/JSON files that
predate the 2026-07-25 property recreation — none of it is live code or
config. `frontend/.env.example` documents only the current
`G-SP48D9LJJ5` (commented out). `lib/analytics/config.ts` validates
`NEXT_PUBLIC_GA_MEASUREMENT_ID` against `/^G-[A-Z0-9]{4,20}$/i` and falls back
to `""` (tag does not render) for anything malformed — there is no hardcoded
fallback ID anywhere in the code that could reintroduce the old tag.

## Files read

`lib/analytics/track.ts`, `gtag.ts`, `booking.ts`, `config.ts`,
`analytics-routes.ts`, `cookies.ts`; `components/compliance/GoogleAnalytics.tsx`;
`components/analytics/BookingConfirmedTracker.tsx`, `PurchaseTracker.tsx`,
`WebVitals.tsx`; `app/[country]/[lang]/cart/_components/CartPageClient.tsx`
(begin_checkout call site only, lines ~246-271); `.env.example` (GA var line).
Not read line-by-line this pass: `lib/analytics/meta.ts`, `attribution.ts`,
`types.ts`, `performance-route.ts`, `components/cart/CartContext.tsx`
(add_to_cart call site), `booking.test.ts` / `BookingConfirmedTracker.test.tsx`
/ `analytics-routes.test.ts` / `meta.test.ts`.
