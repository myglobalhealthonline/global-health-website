# Doctor Portal — Route Inventory

Audit date: 2026-07-12 · Environment: local dev (`http://localhost:3000`) against dev backend (`:4000`) · Test account: DOCTOR role, "Dr. Global Health" (credentials withheld per protocol)
Route source of truth: `frontend/app/(doctor)/doctor/**/page.tsx` (Next.js App Router, route group `(doctor)`), sidebar nav defined in `frontend/app/(doctor)/doctor/layout.tsx`.

## Sidebar structure

The sidebar groups routes into **4 named groups** plus an implicit Overview slot (per `17-confidentiality.md`'s shell inventory, browser-verified across the matrix):

- **OVERVIEW** — Overview
- **SCHEDULE** — Appointments, Messages, Calendar, Availability
- **PRACTICE** — Patients, My Services, Forms
- **FINANCE** — Invoices, Reports
- **ACCOUNT** — Notifications (badge), Profile (one item per active market for multi-country doctors — this test account showed "Profile (Czechia)" + "Profile (Ireland)" as two separate sidebar entries), Security, Confidentiality

Per-country profile links: `frontend/app/(doctor)/doctor/layout.tsx:106-113` renders one sidebar link per entry in `doctor.markets[]` where the market is active, each pointing at `/doctor/profile/[countrySlug]`. Single-market doctors get one "Profile" link instead of a country picker.

## Routes

| # | Page | Route | Nav source | Auth | Direct access | Hidden/conditional | Component | Audit file | Status |
|---|---|---|---|---|---|---|---|---|---|
| 01 | Overview (Dashboard) | `/doctor` | Sidebar › Overview; post-login redirect for DOCTOR role; logo click | DOCTOR | Yes | — | `app/(doctor)/doctor/page.tsx` | `pages/01-dashboard.md` | Done |
| 02 | My Appointments | `/doctor/appointments` | Sidebar › Schedule; dashboard "My appointments"/schedule-row links; notification deep-links | DOCTOR | Yes | — | `app/(doctor)/doctor/appointments/page.tsx` | `pages/02-appointments.md` | Done |
| 03 | Appointment Details (consultation workspace) | `/doctor/appointments/[id]` | Appointments list row click; notification bell deep-link (`?tab=`); follow-up chain link; `#patient-chat` hash | DOCTOR | Via row/link | Needs appointment id | `app/(doctor)/doctor/appointments/[id]/page.tsx` | `pages/03-appointment-details.md` | Done |
| 04 | Calendar | `/doctor/calendar` | Sidebar › Schedule; Overview quick links | DOCTOR | Yes | — | `app/(doctor)/doctor/calendar/page.tsx` | `pages/04-calendar.md` | Done |
| 05 | Availability | `/doctor/availability` | Sidebar › Schedule (persistent item) | DOCTOR | Yes | — | `app/(doctor)/doctor/availability/page.tsx` | `pages/05-availability.md` | Done |
| 06 | My Patients | `/doctor/patients` | Sidebar › Practice | DOCTOR | Yes | — | `app/(doctor)/doctor/patients/page.tsx` | `pages/06-patients.md` | Done |
| 07 | Patient Record | `/doctor/patients/[email]` | "Open"/"Open patient record" from My Patients (06) | DOCTOR | Via row link | Needs patient email (URL-encoded) | `app/(doctor)/doctor/patients/[email]/page.tsx` | `pages/07-patient-record.md` | Done |
| 08 | My Services | `/doctor/services` | Sidebar › Practice | DOCTOR | Yes | — | `app/(doctor)/doctor/services/page.tsx` | `pages/08-services.md` | Done |
| 09 | Forms (clinical templates) | `/doctor/forms` | Sidebar › Practice; linked from appointment workspace's Form-Fill panel when doctor has 0 active templates | DOCTOR | Yes | — | `app/(doctor)/doctor/forms/page.tsx` | `pages/09-forms.md` | Done |
| 10 | Patient Messages | `/doctor/messages` | Sidebar › Schedule; optional `?open=<appointmentId>` deep-link | DOCTOR | Yes | — | `app/(doctor)/doctor/messages/page.tsx` | `pages/10-messages.md` | Done |
| 11 | Notifications | `/doctor/notifications` | Sidebar › Account (badge); header bell popover; deep links | DOCTOR | Yes | — | `app/(doctor)/doctor/notifications/page.tsx` | `pages/11-notifications.md` | Done |
| 12 | Invoices | `/doctor/invoices` | Sidebar › Finance | DOCTOR | Yes | — | `app/(doctor)/doctor/invoices/page.tsx` | `pages/12-invoices.md` | Done |
| 13 | Reports | `/doctor/reports` | Sidebar › Finance | DOCTOR | Yes | — | `app/(doctor)/doctor/reports/page.tsx` | `pages/13-reports.md` | Done |
| 14 | Profile (country picker) | `/doctor/profile` | Breadcrumb "Profile" from any `/doctor/profile/[country]` page; account-menu `accountHref`; NOT in sidebar for multi-country doctors (sidebar links to countries directly) | DOCTOR | Yes | Renders inline single-market editor instead of a picker when doctor has exactly 1 active market | `app/(doctor)/doctor/profile/page.tsx` | `pages/14-profile.md` | Done |
| 15 | Profile (country editor) | `/doctor/profile/[country]` | Sidebar › Account, one link per active market; picker cards on 14; breadcrumb | DOCTOR | Yes (per-country slug) | 404s for inactive/unlisted country slugs (e.g. `/doctor/profile/portugal` — Portugal is listed in `additionalCountries` but has no active market) | `app/(doctor)/doctor/profile/[country]/page.tsx` | `pages/15-profile-country.md` | Done |
| 16 | Security (2FA) | `/doctor/security` | Sidebar › Account; dashboard/portal-wide compliance-banner link "Enable two-factor authentication" | DOCTOR | Yes | — | `app/(doctor)/doctor/security/page.tsx` | `pages/16-security.md` | Done |
| 17 | Confidentiality Agreement | `/doctor/confidentiality` | Sidebar › Account; compliance-banner "Accept confidentiality agreement" bullet (only when not yet accepted) | DOCTOR | Yes | — | `app/(doctor)/doctor/confidentiality/page.tsx` | `pages/17-confidentiality.md` | Done |

## Notes

- Portal shell (sidebar, header breadcrumb, notification bell popover, user menu, language switcher, mobile nav drawer, compliance banner) is shared by all 17 routes via `frontend/app/(doctor)/doctor/layout.tsx` + `frontend/components/portal-shell.tsx` — shell issues (breadcrumb PII/truncation, skip-link, compliance-banner placement) carry the ID of whichever page first documented them and are cross-referenced from every other page (see `04-cross-portal-design-system-findings.md`).
- `layout.tsx` redirects non-DOCTOR roles: ADMIN → `/admin`, CORPORATE_ADMIN → `/corporate`, anything else → `/unauthorized` (confirmed in `01-dashboard.md` §1).
- Compliance banner (2FA + confidentiality-agreement nudge) is injected by the layout above every page's content when either compliance item is outstanding; dismissible per `sessionStorage` (reappears next session by design, not a bug).
- No standalone "appointment details" route exists outside `/doctor/appointments/[id]` — this single route is also the doctor's entire clinical documentation workspace (SOAP note, sign, finalize, documents, forms, messages), unlike the patient portal's `/account/bookings` which renders details in a drawer.
- Route redirect behavior: unauthenticated hits on `/doctor/**` redirect to login; authenticated non-doctor roles are redirected per the layout gate above, not 404'd.
