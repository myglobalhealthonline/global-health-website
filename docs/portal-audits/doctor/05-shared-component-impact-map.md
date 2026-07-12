# Shared-Component Impact Map — Doctor Portal Audit

Date: 2026-07-12. Every component below is used by more than one portal (or more than one route within the doctor portal). Consumer lists were **grep-verified against the live repo** on 2026-07-12 (`frontend/` tree), not copied from page-file assertions alone — commands are noted per row so they can be re-run. Regression risk and migration notes reconcile every page audit that touches the same component.

## 1. `portal-shell.tsx` — breadcrumbs, mobile truncation, skip link

**File:** `frontend/components/portal-shell.tsx` (`useBreadcrumbs()` at lines 86-108, `humanizeSegment()` at 81-84)
**Consumers (grep: `grep -rl "PortalShell" app components`):** `app/(auth)/account/layout.tsx`, `app/(corporate)/corporate/layout.tsx`, `app/(doctor)/doctor/layout.tsx`, `components/IdleLogout.tsx` — i.e. **all three portals** (patient/`account`, corporate, doctor) render their shell through this one component.

| Issue driving change | Exact change | Other portals affected | Regression risk | Migration note |
|---|---|---|---|---|
| **07-001 (Critical)** — patient email rendered verbatim in the breadcrumb on `/doctor/patients/[email]`, directly contradicting an explicit "MUST NOT render as visible text" code comment in the same feature (GDPR plan) | Detect email-shaped path segments (regex or explicit override) in `useBreadcrumbs`/`humanizeSegment`; replace with a safe label (patient `fullName` threaded down, or a generic "Patient record" fallback) | **High** — any route using an email as a path segment reproduces this; `app/(admin)/admin/patients/[email]` was flagged as a likely sibling instance but not verified in this audit pass | High — shell-wide, touches every portal's breadcrumb rendering | Ship as its own P0 ticket; verify admin patient routes in the same pass even though this audit didn't test them |
| **06-003 / 02/19-003 / 09/19 / 11-004 / 12-005 / 13-004 / 16-002 / 17 mobile** — breadcrumb truncates mid-word at 390px/375px on at least 8 doctor pages ("Doctor › A", "Doctor › Pa…", "Doctor › Se", "Doctor › In…") | Hide the trailing breadcrumb segment below a width threshold, or truncate with a proper ellipsis, instead of a hard character cut | Same shell — affects patient/admin breadcrumbs at the same width if they share the truncation CSS (not independently verified) | Low | Batch fix — one CSS/logic change resolves 8+ page-local findings simultaneously |
| **CAL-04-003 / 16-005** — no "Skip to main content" link anywhere in the shell; keyboard users tab through 14-19 sidebar links before reaching page content on every page load | Add a visually-hidden-until-focused skip link as the first focusable element, targeting `<main id="main-content">` | **High** — shell-wide, benefits doctor **and** admin/patient portals identically since they share this component | Low | Single highest-leverage a11y fix in the whole audit; independent of every other fix, ship first |

## 2. `PortalTabs` — overflow, ARIA

**File:** `frontend/components/PortalTabs.tsx`
**Consumers (grep: `grep -rl "PortalTabs" app --include=*.tsx`):** 23 files across admin (`plan-edit-tabs`, `plan-translation-tabs`, `appointment-tabs`, `corporate/[id]/page`, `_disclaimer-translation-tabs`, `country-profile-tabs`, `doctor-translation-tabs`, `faq-language-tabs`, `health-test-faq-panel`, `health-test-translation-tabs`, `service-faq-panel`, `service-links-panel`, `service-translation-tabs`, `specialty-translation-tabs`), patient/`account` (`BookingsTabsClient`, `MedicalFilesClient`, `MembershipTabsClient`, `profile-client`, `security-client`), and doctor (`appointment-tabs.tsx`, `consultation-documents-modal.tsx`, `edit-form.tsx`, `service-selection-form.tsx`).

| Issue driving change | Exact change | Other portals affected | Regression risk | Migration note |
|---|---|---|---|---|
| **03/IH-001 (High)** — Appointment Details' 6-tab strip clips at the bottom edge on short viewports, and gets recommended for adoption on Patient Record (07, §15) and a new Security tab set (16) and a new Invoices tab set (12) | Fix `PortalTabs` overflow behavior at short/narrow viewports (approved cross-portal, per `FABLE_DECISIONS.md`) | **High** — 22 other consumers, spanning all 3 portals | Medium | This is the shared change every new doctor-portal tab adoption (Patient Record, Security, Invoices, possibly Schedule merge) depends on — land it before those page-local tab-splits, not after |
| **15, PortalTabs bio-locale usage** — roving tabindex + arrow keys already correct; recommend `aria-labelledby` wiring tabpanel→tab is missing (code-derived, consumers don't pass ids) | Add `aria-labelledby` support/enforcement in the component contract | Same 22 consumers | Low (additive) | Bundle with the overflow fix since both touch the same component pass |

## 3. `AdminSummaryStrip` — href/onClick per tile, per-tab scoping, compact/inline mode

**File:** `frontend/components/portal-atoms.tsx` (re-exported from `app/(admin)/admin/_components/atoms.tsx`)
**Consumers (grep: `grep -rl "AdminSummaryStrip" app --include=*.tsx`):** **40 files** — the most widely-consumed shared primitive touched by this audit, spanning admin, doctor, and patient portals.

| Issue driving change | Exact change | Other portals affected | Regression risk | Migration note |
|---|---|---|---|---|
| **02-002 (High)** — Appointments' 4-card strip has no `href`/onClick support at all (`atoms.tsx:180-217`, items render as plain `<div>`s); 2 of 4 cards (OPEN CONSULTS, NOT FINALIZED) should become one-click filter shortcuts | Add optional `href`/`onClick` per-tile prop, additive only | **Yes — 40 consumers.** APPROVED by Fable as additive/backward-compatible (existing `StatCard` sibling component already supports `href`; `AdminSummaryStrip` does not) | Medium — regression check required on every existing consumer even though the prop is optional | Cut nothing from the strip without owner sign-off (Fable ruling) |
| **08-002 (Medium)** — My Services' strip is computed server-side across all countries, doesn't re-scope when a doctor switches the country tab | APPROVED: scope the strip to the selected country tab (data already available client-side via existing per-tab badges) | Doctor-portal-local computation change; component itself unchanged | Low | Page-local fix, not a component-contract change |
| **06-001, 07 (Info Hierarchy), 12-002, 13-002, 04/CAL-04-001** — strip contributes to fold-stacking on 5+ pages | NOT strip removal (owner ruling) — compact/inline rendering mode for narrow or short viewports | **Yes — shared** | Medium — must not change other consumers' default look | Must ship as an additive variant/prop, never a default-behavior change |
| **11-002, 09-006, 15-002** — individual tiles carrying no variable data ("SOURCE: Consultation workflow", "Workflow: Reusable", duplicate Market-count tiles) | Page-local: drop or replace the dead tile with real data | Doctor-portal-local | Low | Not a component change — just don't populate a tile with a static string |

## 4. `EventDetailDialog` — viewerRole-aware field suppression

**File:** `frontend/components/calendar/EventDetailDialog.tsx`
**Consumers (grep: `grep -rl "EventDetailDialog" app components --include=*.tsx`):** `app/(admin)/admin/calendar/ui.tsx`, `app/(admin)/admin/doctors/[id]/availability/_components/availability-week.tsx`, `app/(auth)/account/bookings/ui.tsx`, `app/(auth)/account/calendar/ui.tsx`, `app/(doctor)/doctor/availability/_components/availability-week-view.tsx`, `app/(doctor)/doctor/calendar/ui.tsx` — used by **admin (2 routes), patient (2 routes), and doctor (2 routes)**.

| Issue driving change | Exact change | Other portals affected | Regression risk | Migration note |
|---|---|---|---|---|
| **CAL-04-007 (Low)** — the "Doctor" field always renders "—" on the doctor's own calendar because `meta.doctorName` is structurally never populated for a doctor viewing their own consultations | Extend the existing `isPatientView` self-suppression pattern to also accept `viewerRole="doctor"` and hide the dead "Doctor" row | **Yes — 6 consumers across 3 portals.** Additive conditional; default behavior for `admin`/undefined role is unchanged | Low-Medium | Verify against patient-portal and admin-portal calendar/appointment views (screenshot diff) before merge — flagged for Fable/shared-component review per both source pages |

## 5. `WeekCalendar` / availability-week-view — `min-w-0` grid-shrink fix

**File:** `frontend/components/calendar/WeekCalendar.tsx`
**Consumers (grep: `grep -rl "WeekCalendar" app components --include=*.tsx`):** `app/(admin)/admin/doctors/[id]/availability/_components/availability-week.tsx`, `app/(doctor)/doctor/availability/_components/availability-week-view.tsx` — used by **admin's per-doctor availability editor and the doctor's own Availability page**. (Doctor's `/doctor/calendar` uses `MonthCalendar`, a sibling component, not `WeekCalendar` — confirmed by the separate grep result for `MonthCalendar` consumers in `04-calendar.md`, which lists only `components/calendar/MonthCalendar.tsx` itself plus the doctor/admin/patient calendar UIs that render it.)

| Issue driving change | Exact change | Other portals affected | Regression risk | Migration note |
|---|---|---|---|---|
| **05-001 (Critical)** — week grid loses Thursday–Sunday on mobile with zero scroll affordance; root cause is a missing `min-w-0` on a CSS grid item ancestor of the `overflow-x-auto` wrapper, in `availability-week-view.tsx:112`, not in `WeekCalendar` itself | Add `min-w-0` to the page-local grid wrapper; **audit the same ancestor-chain bug on the admin per-doctor availability editor**, which reuses the identical wrapper pattern | **Yes — the admin editor was not tested in this audit pass and must be verified for the same bug before/alongside the doctor-side fix** | Medium — touches 2 known consumers, ancestor-chain check needed on a 3rd (admin) | This is the audit's #3 P0 (see `08-prioritized-doctor-improvement-plan.md`) — CSS-only, low implementation risk, but the shared-component blast radius means it must be verified on the admin editor in the same PR, not deferred |
| **05-008 (Medium, a11y)** — slot status (Open/Booked/Blocked) conveyed by fill color only inside grid cells; sidebar legend provides text but cells don't | Add a small icon/pattern per status inside `WeekCalendar`'s own slot rendering | Yes — benefits `/doctor/calendar` (via `MonthCalendar`'s sibling day-count treatment, separately) and the admin editor | Low (additive) | Shared fix, bundle with the `min-w-0` pass |

## 6. `ConsultationChat`

**File:** `frontend/components/chat/ConsultationChat.tsx`
**Consumers (grep: `grep -rl "ConsultationChat" app components --include=*.tsx` excluding the API/route files):** `app/(auth)/account/bookings/ui.tsx`, `app/(auth)/account/messages/ui.tsx`, `app/(doctor)/doctor/appointments/[id]/page.tsx`, `app/(doctor)/doctor/appointments/[id]/_components/consultation-chat-section.tsx`, `app/(doctor)/doctor/messages/inbox.tsx` — used by **patient portal (2 routes) and doctor portal (2 routes)**.

| Issue driving change | Exact change | Other portals affected | Regression risk | Migration note |
|---|---|---|---|---|
| **10-001 (Medium)** — no loading indicator in the `variant="embedded"` configuration because the spinner is coupled to a header that only renders when `onToggleLock`/`lockToggle` is non-null | Decouple the loading spinner from header/`lockToggle` presence; render it in the message-list area regardless of variant | **Yes — patient portal's `bookings/ui.tsx` and `messages/ui.tsx`, plus doctor's own appointment-detail page, all consume the same component** | Medium | Verify the other 3 consumers (patient bookings, patient messages, doctor appointment-detail) visually after the change — APPROVED by Fable, requires cross-portal visual regression pass before merge |
| **10-002 (Medium)** — Messages inbox never wires `onToggleLock`, unlike the appointment-detail page's `consultation-chat-section.tsx`, which does pass it against the same component | Import/wire the same `toggleDoctorChatLock` action into `inbox.tsx` | Doctor-portal-local prop wiring; `ConsultationChat` itself unchanged | Low | Naturally reintroduces the header (fixing 10-001's root symptom) once wired |

## 7. `MessagesInbox`

**File:** `frontend/components/messages/MessagesInbox.tsx`
**Consumers (grep: `grep -rl "MessagesInbox" app components --include=*.tsx`):** `app/(admin)/admin/messages/inbox.tsx`, `app/(admin)/admin/messages/page.tsx`, `app/(auth)/account/messages/ui.tsx`, `app/(doctor)/doctor/messages/inbox.tsx`, `app/(doctor)/doctor/messages/page.tsx` — used by **all 3 portals**.

| Issue driving change | Exact change | Other portals affected | Regression risk | Migration note |
|---|---|---|---|---|
| **10-003 (Medium)** — threads with a null `orderNumber` render no order-number link/badge at all (both list-row and open-pane header gate on `orderNumber` being truthy, `MessagesInbox.tsx:148-155,231-240`), even though the underlying `orderHref` is always constructible from `appointmentId` | Always render the link with a fallback label ("Open appointment") when `orderNumber` is null | **Yes — check admin's message-threads and patient's equivalent for the same null-orderNumber scenario before changing shared behavior** | Medium | APPROVED by Fable — requires checking whether admin/patient threads can also have a null `orderNumber` (not verified in this audit pass) |

## 8. `RichTextHtmlField`

**File:** `frontend/app/(admin)/admin/_components/rich-text-html-field.tsx` (+ `-lazy.tsx` wrapper)
**Consumers (grep: `grep -rl "RichTextHtmlField\|rich-text-html-field" app components --include=*.tsx`):** `app/(admin)/admin/doctors/_components/country-profile-tabs.tsx`, `app/(admin)/admin/doctors/_components/doctor-translation-tabs.tsx`, `app/(admin)/admin/pages/_components/page-fields.tsx`, `app/(admin)/admin/services/_components/service-translation-tabs.tsx`, `app/(doctor)/doctor/profile/_components/edit-form.tsx` — **admin-owned component, doctor portal is its only non-admin consumer**.

| Issue driving change | Exact change | Other portals affected | Regression risk | Migration note |
|---|---|---|---|---|
| **15-008 (Medium, a11y)** — 6 unnamed icon-only toolbar buttons (color swatches), no `aria-label`, ~24px hit area (below touch-target minimum) | Add `aria-label` per swatch (e.g. "Text color: green") and increase target size | **Yes — admin portal's 4 consumers use the same toolbar** | Medium | Explicitly flagged in `15-profile-country.md` §26 for coordination with an admin portal audit, to avoid double-edits on the same file |
| **15-004 (Medium)** — the field is uncontrolled/read-on-submit and structurally excluded from any consumer's dirty-state tracking, so a doctor's bio edits don't trip even a working unsaved-changes guard | Add an `onDirty` callback (or expose an innerHTML-diff hook) that consumers can OR into their own dirty state | Same 5 consumers | Medium | Needed before the SPA-nav dirty guard (item 9 below) can protect bio content specifically |

## 9. `UnsavedChangesGuard` / `useUnsavedChanges` — portal-wide adoption

**Files:** `frontend/components/UnsavedChangesGuard.tsx`, `frontend/lib/hooks/use-unsaved-changes.ts`
**Consumers (grep: `grep -rl "UnsavedChangesGuard\|useUnsavedChanges" app components lib --include=*.tsx --include=*.ts`):** `app/(auth)/account/family/_components/FamilyPanel.tsx`, `app/(auth)/account/layout.tsx`, `app/(auth)/account/profile/_components/{gdpr-tab,insurance-tab,nationality-tab,patient-profile-section,profile-client}.tsx`, `app/(auth)/account/security/_components/security-client.tsx` — **all 7 consumers are patient-portal (`account/`) files**.

**Correction to a page-audit claim:** `pages/03-appointment-details.md` §10 UX-001 states the primitive is "already used on other doctor pages (`doctor/profile/_components/edit-form.tsx`, `doctor/services/_components/service-selection-form.tsx`)." A targeted grep (`grep -rl "UnsavedChanges" "app/(doctor)"`) returns **zero matches** — this claim does not hold. The doctor portal currently has **no** unsaved-changes guard adoption anywhere, despite 6+ independent silent-data-loss findings across 5 pages that all cite this exact primitive as the intended fix (03/UX-001 Critical, 07-004 High, 08-005 Medium, 09-001 Medium, 15-003/15-004 High).

| Issue driving change | Exact change | Other portals affected | Regression risk | Migration note |
|---|---|---|---|---|
| **03/UX-001 (Critical)**, **07-004 (High)**, **08-005 (Medium)**, **09-001 (Medium)**, **15-003/15-004 (High)** — six independent forms across five doctor pages silently discard unsaved input on in-app navigation | Wire `<UnsavedChangesGuard when={dirty} />` (or the `useUnsavedChanges` hook) into each of: `consultation-form.tsx` (03), `patient-profile-panel.tsx` (07), `service-selection-form.tsx` (08), `templates.tsx` (09), `edit-form.tsx` (15) | **The primitive itself is shared with the patient portal (7 existing consumers) — reusing it, not modifying it, is the doctor-portal task.** No changes to the primitive are required unless it needs a new capability (e.g. bio-field dirty callback, see item 8) | Low per-page (each wiring is isolated); the primitive itself carries no regression risk since it's reuse, not modification | **P0-2** in the improvement plan — one ticket, portal-wide rollout, per-page wiring listed under it (Fable decision, `FABLE_DECISIONS.md` §1) |

## 10. `portal.css` shadow rules

**File:** `frontend/app/portal.css` (119 `box-shadow` declarations found via `grep -n "box-shadow" app/portal.css`)

| Issue driving change | Exact change | Other portals affected | Regression risk | Migration note |
|---|---|---|---|---|
| **02-003 (Medium)** — shadow computed on bare `<span>` elements down to a 4px status-pill dot, root cause not isolated to a single selector in this audit pass | Audit `portal.css`'s 119 `box-shadow` declarations to find what's applying shadow to `.gh-appointment-card__time`, `.gh-pill`, and pill-internal spans; scope it to actual card-level containers only | Portal-wide if the source is a global utility/reset class rather than a `.gh-appointment-card`-scoped rule | Medium — shared CSS, needs the selector isolated before the fix can be scoped confidently | Do this pass after the Appointments page's other fixes land (per `02-appointments.md` §24) to avoid rebasing markup changes against a CSS investigation still in progress |

## Summary — components requiring cross-portal verification before any doctor-portal fix ships

`portal-shell.tsx` (breadcrumbs/skip-link), `PortalTabs`, `AdminSummaryStrip`, `EventDetailDialog`, `WeekCalendar`, `ConsultationChat`, `MessagesInbox`, `RichTextHtmlField` — **8 of the 10 components in this map are multi-portal shared code.** Only `UnsavedChangesGuard`/`useUnsavedChanges` (reuse, not modification) and the `portal.css` shadow audit (isolated investigation) carry lower cross-portal risk. Every fix touching the other 8 needs a screenshot pass on the non-doctor consumer(s) listed above before merge, per the standing rule in `FABLE_DECISIONS.md`.
