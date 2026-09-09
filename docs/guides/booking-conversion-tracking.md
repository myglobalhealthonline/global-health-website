# Booking conversion tracking — 9 September 2026

Tracking commit `1051c552` is deployed to both production services. Live GA4 Realtime has received `book_appointment_click` and `select_time_slot`; the slot event has `market=ireland` and `service_category=gp`. Confirmation and joint DebugView validation remain pending; do not mark this complete yet.

## Live verification — 10 September 2026

- Railway Backend: ACTIVE, deployment successful, `f7e46cbb-9540-4e8d-91aa-68aa36618bd7`, booking-tracking commit.
- Railway Frontend: ACTIVE, `c754fb97-6a91-43de-ae17-83adf40804cd`, booking-tracking commit; live assets identify `1051c552499c5f28acc5e3d8ea248cd1d803b52c`.
- `https://api.myglobalhealth.online/ready`: `ok=true`, `database.connected=true`.
- GA4 Realtime received both first-step events. A live event also inherited `page_path`; a follow-up fix now overrides that field alongside location/title/referrer. This follow-up is not yet deployed.
- A paid test order/confirmation URL has been requested to verify actual receipt evidence, `booking_confirmed` delivery and reload deduplication. No patient order was reused and no production appointment or payment was created for the check.

## GA4 configuration applied

Property **547083375**, measurement ID **G-SP48D9LJJ5**:

- Registered `booking_confirmed` as a key event, once per event, with no default monetary value.
- Added event-scoped custom dimensions `Service category` → `service_category` and `Market` → `market`.
- Existing `begin_booking` and `purchase` key events were retained. Existing explorations were not changed.

The site already uses direct `gtag.js`, not a GTM container. These events reuse its consent-gated transport. Do not add duplicate GTM event tags alongside it. A GTM migration would need to transfer ownership of the Google tag, consent initialization and event dispatch together.

## Event definitions

| Event | Trigger |
| --- | --- |
| `book_appointment_click` | Enabled public booking CTA; excludes navigation between `/book` steps. |
| `select_time_slot` | Doctor-first or service-first calendar time selection, homepage quick-book selection, or a public CTA selecting a concrete slot. Day navigation and automatic preselection do not count. |
| `booking_confirmed` | Success-page receipt API response contains a paid, real, non-cancelled consultation appointment. PAID alone is insufficient: allocation failures must not count. |

Confirmation counts once per order per browser session, including free/covered orders fulfilled through the same backend path. Product-only orders, pending insurance, missing receipts and unsuccessful allocation do not count. Multiple categories in one order use `healthcare`. No new events are added to authenticated portals or Meta.

`service_category` is `gp`, `specialist_care` or `healthcare`. All specialties, including mental health and oncology, use `specialist_care`. Unknown doctor-only selections use `healthcare`; available service kind takes precedence over GP slug recognition. `market` is restricted to the six named markets.

The three events never receive patient/contact/order/doctor/slot IDs, times, exact specialty names or free text. They override page location, title and referrer with generic booking context so GA4's automatic context cannot attach a specialty URL or booking query string to them. The receipt order ID is used only in local session storage for deduplication, not sent in these events. Existing purchase events retain their existing transaction-ID behavior.

## Consent and advertising review

- Basic Consent Mode v2: Google is loaded only after analytics opt-in. All four consent signals default to denied; only analytics storage is granted. Advertising signals remain denied regardless of the marketing checkbox.
- Re-accepting analytics now explicitly restores `analytics_storage`. Withdrawal resets queued calls, sets Google's hard-disable flag and purges GA cookies.
- Google Signals and ad personalization were already disabled **sitewide**, including psychiatry, oncology and mental-health pages. Regular consented analytics remains active.
- Meta CAPI's explicit payload contains hashed email/phone and matching data, with **only currency/value in `custom_data`**. No specialty, product name or service data is sent with it. Hashing is not anonymization.
- Browser purchase/checkout events now allow only value/currency. Automatic Pixel configuration is disabled. Pixel withdrawal now revokes consent and clears queued events; lazy initialization rechecks current consent before sending PageView.
- This is a source-level audit of the installed integration, not verification of Meta Events Manager's remote configuration or every live network payload. Check automatic advanced matching and any separately configured automatic events there during validation.

## Deployment and joint validation

Deploy backend first, then frontend. The receipt field is additive and the frontend fails closed while it is absent. No database migration is required. Do not deploy this shared checkout wholesale: other sessions have unrelated changes here.

Use Tag Assistant/debug tooling, or a test build with `NEXT_PUBLIC_ANALYTICS_DEBUG=true` and the correct measurement ID. The debug build flag also enables GA4 `debug_mode`; keep it out of normal production builds. Do not send real patient details for testing.

1. Reject cookies: no custom events and no Google collection. Opt into analytics only: Google events work; Meta stays off.
2. Click a service/doctor booking CTA, select a time, and verify the two named events with broad category and correct market. Check all outgoing parameters, including page context.
3. Complete an authorized test booking and confirm one `booking_confirmed` after backend appointment fulfilment. Refresh the receipt: no second event. Verify pending/failed payment, lost slot, cancelled appointment and product-only orders do not produce it.
4. Withdraw analytics then re-accept without a reload. Verify collection stops and resumes with v2 signals correct. Repeat marketing withdrawal with a pending lazy Pixel load.
5. Inspect Meta browser/server test events: no specialty/name/contact combination; CAPI custom data remains value/currency only.
6. After joint validation, build the exploration with `book_appointment_click` → `select_time_slot` → `booking_confirmed`, allowing indirect steps. Consider an open funnel for homepage quick-book users who start at slot selection. Break down by Market and Service category after custom dimensions populate.

## Local proof

- 85 focused frontend tests passed, including privacy, early-loader buffering, consent rejection, receipt deduplication and route sanitization.
- 7 backend tests passed for appointment evidence and Meta CAPI payload shape/hashing.
- Frontend TypeScript check passed.
- Backend TypeScript check reported unrelated concurrent coupon errors (`birthday-email.test.ts`, `birthday-offers.service.ts`, `birthday-unsubscribe.test.ts`); no tracking-file errors were reported.
- Production event delivery and DebugView are **not yet validated**.
