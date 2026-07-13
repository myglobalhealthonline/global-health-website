# Doctor Portal Audit — Index

Audit date: 2026-07-12 · Local dev `http://localhost:3000` · Doctor test account "Dr. Global Health" (GP, Czechia primary + Ireland active, Portugal inactive) — credentials never recorded in any audit artifact.
Method: real-browser audit (Playwright headless, 7-viewport matrix — 1440×900, 1280×720, 1024×768, 768×1024, 390×844, 375×667, 1366×650) + source inspection, one Sonnet page-agent per route, followed by a Fable structural review pass (`FABLE_DECISIONS.md`) that reconciled cross-page recommendations, flagged owner-decision items, and flagged clinical/legal-review items. This index and docs 01–09 are the Fable-reviewed synthesis of that review; the individual page files below are the source of truth for every issue ID cited.

## Documents

| File | Purpose | Status |
|---|---|---|
| `01-route-inventory.md` | All doctor-accessible routes | Done |
| `02-doctor-workflow-map.md` | End-to-end workflows, friction, gaps | Done |
| `03-doctor-information-architecture.md` | Nav tree + IA recommendation | Done |
| `04-cross-portal-design-system-findings.md` | Portal-wide surface/spacing/status rules | Done |
| `05-shared-component-impact-map.md` | Shared-component risk map (grep-verified) | Done |
| `06-accessibility-summary.md` | Cross-page a11y summary | Done |
| `07-responsive-summary.md` | Cross-page responsive summary | Done |
| `08-prioritized-doctor-improvement-plan.md` | P0–P3 plan | Done |
| `09-open-questions-and-blockers.md` | Owner decisions, clinical/legal review, untestable states | Done |

## Page audits

| # | Page | Route | File | Critical | High | Medium | Low | Status |
|---|---|---|---|---|---|---|---|---|
| 01 | Overview (Dashboard) | `/doctor` | `pages/01-dashboard.md` | 0 | 1 | 1 | 2 | Done |
| 02 | My Appointments | `/doctor/appointments` | `pages/02-appointments.md` | 1 | 2 | 2 | 3 | Done |
| 03 | Appointment Details | `/doctor/appointments/[id]` | `pages/03-appointment-details.md` | 1 | 2 | 5 | 2 | Done |
| 04 | Calendar | `/doctor/calendar` | `pages/04-calendar.md` | 1 | 1 | 3 | 4 | Done |
| 05 | Availability | `/doctor/availability` | `pages/05-availability.md` | 1 | 2 | 5 | 1 | Done |
| 06 | My Patients | `/doctor/patients` | `pages/06-patients.md` | 0 | 1 | 0 | 2 | Done |
| 07 | Patient Record | `/doctor/patients/[email]` | `pages/07-patient-record.md` | 1 | 2 | 2 | 1 | Done |
| 08 | My Services | `/doctor/services` | `pages/08-services.md` | 0 | 0 | 3 | 3 | Done |
| 09 | Forms | `/doctor/forms` | `pages/09-forms.md` | 0 | 0 | 1 | 6 | Done |
| 10 | Patient Messages | `/doctor/messages` | `pages/10-messages.md` | 0 | 0 | 3 | 1 | Done |
| 11 | Notifications | `/doctor/notifications` | `pages/11-notifications.md` | 0 | 1 | 0 | 3 | Done |
| 12 | Invoices | `/doctor/invoices` | `pages/12-invoices.md` | 0 | 1 | 3 | 1 | Done |
| 13 | Reports | `/doctor/reports` | `pages/13-reports.md` | 0 | 0 | 3 | 3 | Done |
| 14 | Profile (country picker) | `/doctor/profile` | `pages/14-profile.md` | 0 | 0 | 2 | 2 | Done |
| 15 | Profile (country editor) | `/doctor/profile/[country]` | `pages/15-profile-country.md` | 0 | 4 | 6 | 4 | Done |
| 16 | Security (2FA) | `/doctor/security` | `pages/16-security.md` | 0 | 1 | 3 | 1 | Done |
| 17 | Confidentiality Agreement | `/doctor/confidentiality` | `pages/17-confidentiality.md` | 0 | 0 | 1 | 3 | Done |
| **Total** | 17 pages | | | **5** | **18** | **43** | **42** | **108** |

Counting method / caveat: severities were pulled verbatim from each page file's UX/Visual/a11y problem sections. Page files use **two different ID conventions** — page-prefixed (`05-001`) and section-number-prefixed (`UX-001`/`CAL-04-001`/`IH-001`) — and one dashboard issue (01-dashboard.md §11 "11-001") reuses the section-number scheme in a way that visually collides with page-11's own IDs. This is a real inconsistency, not a synthesis artifact — see the final message / `09-open-questions-and-blockers.md` for the full list of ID collisions found. Totals above are best-effort de-duplicated per page.

## Screenshots

211 audit screenshots were captured locally (7-viewport matrix + interaction states per page) and are **not committed** to the repo (size). Naming convention: `{page-slug}-{viewport}-{state}-{seq}.png`, e.g. `02-appointments-desktop-filter-cancelled-01.png`, `03-appointment-details-laptop-sign-dialog-04.png`. Filenames are referenced inline in each page file's §9 Screenshots table; regenerate with the project's Playwright audit helper (7-viewport matrix, GPU flags) if needed for re-verification.

## Scope guard

Doctor Portal only. Corporate portal not started. Admin portal not started. No implementation performed as part of this audit — recommendations only, awaiting owner approval per `FABLE_DECISIONS.md`. Test account credentials were used but never written to any audit artifact.
