# Patient Portal — Route Inventory

Audit date: 2026-07-12 · Environment: local dev (`http://localhost:3000`) against dev backend (`:4000`) · Test account: patient role (credentials withheld per protocol)
Route source of truth: `frontend/app/(auth)/account/**/page.tsx` (Next.js App Router, route group `(auth)`), sidebar nav defined in `frontend/app/(auth)/account/layout.tsx:82-125`.

| # | Page | Route | Nav source | Auth | Direct access | Hidden/conditional | Component | Audit file | Status |
|---|------|-------|-----------|------|---------------|--------------------|-----------|-----------|--------|
| 01 | Dashboard / Overview | `/account` | Sidebar › Overview | Patient | Yes | — | `app/(auth)/account/page.tsx` | `pages/01-dashboard.md` | In progress |
| 02 | My bookings | `/account/bookings` | Sidebar › Care | Patient | Yes | — | `account/bookings/page.tsx` | `pages/02-bookings.md` | In progress |
| 03 | Reschedule booking | `/account/bookings/[id]/reschedule` | Booking card action | Patient | Via booking action | Needs booking id | `account/bookings/[id]/reschedule/page.tsx` | `pages/03-reschedule.md` | In progress |
| 04 | Book consultation (wizard) | `/[country]/[lang]/book` (e.g. `/ireland/en/book`) | Sidebar › Book consultation; dashboard CTA; empty states | Public route, used authenticated | Yes | Shared with public site | `app/(site)/[country]/[lang]/book/` | `pages/04-booking-flow.md` | In progress |
| 05 | Calendar | `/account/calendar` | Sidebar › Care | Patient | Yes | — | `account/calendar/page.tsx` | `pages/05-calendar.md` | In progress |
| 06 | Messages | `/account/messages` | Sidebar › Care (unread badge) | Patient | Yes | — | `account/messages/page.tsx` | `pages/06-messages.md` | In progress |
| 07 | Notifications | `/account/notifications` | Sidebar › Account (unread badge); topbar bell | Patient | Yes | — | `account/notifications/page.tsx` | `pages/07-notifications.md` | In progress |
| 08 | Prescriptions | `/account/prescriptions` | Sidebar › Care; dashboard quick action | Patient | Yes | — | `account/prescriptions/page.tsx` | `pages/08-prescriptions.md` | In progress |
| 09 | Medical files | `/account/medical-files` | Sidebar › Care | Patient | Yes | — | `account/medical-files/page.tsx` | `pages/09-medical-files.md` | In progress |
| 10 | Access history | `/account/access-history` | Sidebar › Account | Patient | Yes | — | `account/access-history/page.tsx` | `pages/10-access-history.md` | In progress |
| 11 | Membership | `/account/membership` | Sidebar › Membership; dashboard "Manage" | Patient | Yes | — | `account/membership/page.tsx` | `pages/11-membership.md` | Pending |
| 12 | Rewards | `/account/rewards` | Sidebar › Membership; dashboard "Redeem" | Patient | Yes | — | `account/rewards/page.tsx` | `pages/12-rewards.md` | Pending |
| 13 | Subscribe / plan checkout | `/account/subscribe` | NOT in sidebar — reached from membership/pricing CTAs | Patient | Yes (deep link) | Hidden behind action | `account/subscribe/page.tsx` | `pages/13-subscribe.md` | Pending |
| 14 | My orders | `/account/orders` | Sidebar › Billing | Patient | Yes | — | `account/orders/page.tsx` | `pages/14-orders.md` | Pending |
| 15 | Order details | `/account/orders/[id]` | Order list row | Patient | Via order link | Needs order id | `account/orders/[id]/page.tsx` | `pages/15-order-details.md` | Pending |
| 16 | Payments | `/account/payments` | Sidebar › Billing; dashboard quick action | Patient | Yes | — | `account/payments/page.tsx` | `pages/16-payments.md` | Pending |
| 17 | Profile | `/account/profile` | Sidebar › Account; account menu | Patient | Yes | — | `account/profile/page.tsx` | `pages/17-profile.md` | Pending |
| 18 | Family members | `/account/family` | Sidebar › Account | Patient | Yes | — | `account/family/page.tsx` | `pages/18-family.md` | Pending |
| 19 | Security | `/account/security` | Sidebar › Account; dashboard quick action | Patient | Yes | — | `account/security/page.tsx` | `pages/19-security.md` | Pending |
| 20 | Corporate | `/account/corporate` | Sidebar › Membership (conditional) | Patient w/ corporate link | Conditional | Only shown to corporate members (`layout.tsx:106`) | `account/corporate/page.tsx` | `pages/20-corporate.md` | Pending |

## Notes

- Portal shell (sidebar, topbar, notification bell menu, account menu, language switcher, mobile nav) is shared by all 20 routes via `account/layout.tsx` — audited once under `pages/01-dashboard.md`, shell issues carry `01-` IDs.
- Booking wizard (`/book`) is a public-site route also used by logged-in patients; any change is a shared-component risk against the public funnel (flagged in `05-shared-component-impact-map.md`).
- No standalone "booking details" route exists — details render in a drawer/panel on `/account/bookings` (covered in `pages/02-bookings.md`).
- Redirect behavior: unauthenticated hits on `/account/**` redirect to `/login?next=…`.
- Legacy/other candidates checked and excluded: `/pay`, `/print`, `/share` (non-portal utility routes), `(auth)/(public)` auth screens (login/register/reset — out of scope for this portal audit).
