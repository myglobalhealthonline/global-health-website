# Doctor Portal — Information Architecture

Date: 2026-07-12. Source: `pages/*.md` §14/§15/§17/§26 of each page, reconciled by `FABLE_DECISIONS.md`.

## Current nav tree

```
OVERVIEW
  Overview                          /doctor
SCHEDULE
  Appointments                      /doctor/appointments
  Messages                          /doctor/messages
  Calendar                          /doctor/calendar
  Availability                      /doctor/availability
PRACTICE
  Patients                          /doctor/patients
  My Services                       /doctor/services
  Forms                             /doctor/forms
FINANCE
  Invoices                          /doctor/invoices
  Reports                           /doctor/reports
ACCOUNT
  Notifications                     /doctor/notifications
  Profile (Czechia) / Profile (Ireland)   /doctor/profile/[country]  — one link per active market
  Security                          /doctor/security
  Confidentiality                   /doctor/confidentiality
```

## Problems with the current IA

1. **Calendar and Availability are two pages doing one job.** Both write to the same `AvailabilityWindow` table via the identical `createAvailabilityWindow` API (confirmed in code by both `04-calendar.md` §23 and `05-availability.md` §23). Calendar owns month/day view + booked-consultation inspection + ad-hoc bounded-range availability + time-off; Availability owns recurring weekly rules + a week-grid preview. Neither page cross-links to the other, and a new doctor has no way to discover that a second page edits the same underlying data.
2. **Invoices and Reports both offer the payout-statement download**, hitting the identical `GET /api/doctor/reports/export?dataset=payout&format=...` endpoint — Invoices' version has a proper month picker with context copy, Reports' version is a bare dropdown entry hardcoded to "last month" (`12-invoices.md` §10 12-006, `13-reports.md` §10 13-005, mirrored findings).
3. **Two single-purpose compliance pages (Security's 2FA, Confidentiality) sit as separate top-level nav items**, each essentially one checkbox with its own page/header/card, both existing only to satisfy the same compliance-banner gate.
4. **Security is mislabeled relative to its own content.** The nav item and breadcrumb say "Security"; the page H1 says "Two-factor authentication" because that's genuinely the only thing on the page — no password change, no session management, despite both existing as reusable, role-agnostic API functions (`changeCurrentPassword`, `signOutAllDevices` in `lib/api/auth-api.ts`) already shipped for the patient portal's `/account/security`.
5. **Profile is two pages for what is functionally one editable record**, and the picker page (14) is a redundant hop for the majority of doctors who arrive via the sidebar's direct per-country links rather than the picker itself.
6. **Reports' nav slot is a legitimate open question**, not a clear defect: it's read-only analytics + raw-row export vs Invoices' actionable billing workflow — genuinely different intents, both correctly under "FINANCE."

## Recommended target IA

```
OVERVIEW
  Overview                          /doctor                         (unchanged)
SCHEDULE
  Appointments                      /doctor/appointments             (unchanged)
  Messages                          /doctor/messages                 (unchanged)
  Schedule  [MERGED — OWNER DECISION REQUIRED]
    tab: Calendar                   /doctor/calendar   (month/day view, booked consults, time-off)
    tab: Weekly hours                /doctor/availability (recurring windows, week-grid preview)
PRACTICE
  Patients                          /doctor/patients                 (unchanged)
  My Services                       /doctor/services                 (unchanged)
  Forms                             /doctor/forms                    (unchanged)
FINANCE
  Invoices  [tab split — APPROVED]
    tab: Consultations               (default — filters + payment-status table)
    tab: Monthly statement           (existing 3-step download/upload panel, owns the payout-statement export exclusively)
  Reports                           /doctor/reports  (KEEPS its nav slot — analytics vs billing-action distinction; drops the "Payout statement" dataset option, replaced by a one-line cross-link to Invoices)
ACCOUNT
  Notifications                     /doctor/notifications            (unchanged)
  Profile (Czechia) / Profile (Ireland)   /doctor/profile/[country]  (unchanged — sidebar direct links stay; picker page 14 kept as deep-link target only, per-country status chips added)
  Security  [tabs — APPROVED]
    tab: Password
    tab: Two-factor authentication   (default when 2FA incomplete)
    tab: Sessions
  Confidentiality                   /doctor/confidentiality  (STAYS STANDALONE — legal-consent artifact, not a setting)
```

## Per-recommendation detail

| Recommendation | Current location | Proposed | Doctor benefit | Dependencies | Migration risk | Status |
|---|---|---|---|---|---|---|
| Merge Calendar + Availability into "Schedule" tabs | Two separate nav items, `/doctor/calendar` + `/doctor/availability` | One nav item, `PortalTabs` (Calendar / Weekly hours) | One place to manage all schedule data; ends the two-forms-one-table confusion (`05-availability.md` §15/§23) | Both already share `createAvailabilityWindow`; shares `WeekCalendar` component (needs the `min-w-0` fix applied once, not twice) | Nav-structure change — **OWNER DECISION REQUIRED** per `FABLE_DECISIONS.md` §"Per-area decisions" | Recommended, not approved |
| Invoices tab split (Consultations / Monthly statement) | One long-scroll page, `/doctor/invoices` | `PortalTabs`, Consultations default | Fixes the chrome-before-content fold problem (12-002/12-003) by frequency-tiering daily vs monthly tasks | `PortalTabs` (existing shared primitive) | Low — page-local, no shared-component change beyond reusing `PortalTabs` | **Approved** (Fable decision) |
| Drop "Payout statement" from Reports' export dropdown, add cross-link to Invoices | Reports' "Download lists" 4-item dropdown | 3-item dropdown (Services/Patients/Appointments) + "Need your payout statement? → Invoices" | Removes the worse of two duplicate download UIs (no month picker on the Reports version) | Backend endpoint unchanged, still needed by Invoices | Low | **Approved** (Fable decision, mirrored in 12-006/13-005) |
| Reports keeps its nav slot | — | — | Analytics (read-only, retrospective) is conceptually distinct from Invoices' actionable billing workflow; both already correctly grouped under FINANCE | None | None | **Approved — recommended yes** |
| Security tabs (Password / Two-factor / Sessions) | 2FA-only page, mislabeled H1 | `PortalTabs`, default tab = whichever is incomplete/most urgent | Doctor account (PHI access) currently has a *narrower* security surface than the patient portal despite being higher-value — closes that gap using already-shipped, role-agnostic auth endpoints | `changeCurrentPassword`, `signOutAllDevices` (already exist, already used by patient portal) | Low — additive, existing 2FA logic untouched; do NOT copy patient's email-verification/GDPR-export tabs (doctor-inappropriate, would need separate legal review) | **Approved** (Fable decision) |
| Confidentiality stays standalone | — | — | A legal-consent artifact (versioned, timestamped, immutable once accepted) is a fundamentally different *kind* of thing from a togglable/revocable security control; merging would blur that distinction and complicate Security's new tab set | None | None | **Approved — keep separate** (17-confidentiality.md §10 17-003, Fable-reviewed) |
| Profile picker (14) stays as deep-link target, gains status chips | Redundant interstitial for sidebar-arriving doctors | Same page, richer cards (verification + payout status per country) | Doctors landing via breadcrumb/account-menu (the only path that still uses this page) get decision-relevant info instead of a bare choice | Data (`isVerified`, `bank.ibanSet`) already in `fetchDoctorMe()` payload | Low | Recommended (14-001/14-002) — account-menu deep-link target is a separate **owner call** |
| Payout-statement export dedup | See Invoices tab split row | See above | — | — | — | **Approved** (Fable decision) |

## Explicitly out of scope for this synthesis

- Any *implementation* of the Schedule merge — this document records the recommendation and its status only.
- The account-menu `accountHref` target (primary-market editor vs picker page) — flagged as owner/nav-IA call in `14-profile.md` §26, not resolved here.
