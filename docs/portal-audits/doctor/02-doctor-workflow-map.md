# Doctor Portal — Workflow Map

Date: 2026-07-12. Traces the doctor's real end-to-end paths across the 17 audited pages, citing the specific issue IDs that create friction at each step. Source: `pages/*.md`.

## 1. Login → next appointment

**Pages touched:** 01 (Overview) → 02 (Appointments) or 03 (Appointment Details) directly via hero "Join".

- Landing page correctly surfaces "next consultation" in the hero (`CommandBand`) with a one-click Join when live.
- **Gap (01-001, High):** when there is no consult today but the queue has open items (test account: 0 today, 12 open), the hero reads "No consults today" with no mention of the backlog — a doctor scanning only the hero concludes the day is empty. The OPEN stat card sits same-weight three tiles to the right with no warning tone or link.
- **Gap (01-002, Medium):** the compliance banner (2FA/confidentiality nudge) and the "missing meeting link" pending-action banner share identical visual language (soft-green `AdminCard` + left border) despite very different urgency.
- End-to-end gap: a doctor who trusts the hero literally has no reason to open Appointments on a light day, even though 12 items are waiting.

## 2. Appointment → consultation detail → notes → sign

**Pages touched:** 02 (Appointments) → 03 (Appointment Details).

- **02-001 (Critical):** the appointments list's filter panel cannot be collapsed on desktop/tablet (`sm:pointer-events-none` disables the toggle) — combined with the hero + 4-stat strip, **zero appointment rows are visible without scrolling** at 1366×650, a common laptop height. This is the single biggest friction point before a doctor even reaches a row.
- **02-004 (Medium):** rows without a meeting link (waiting-payment appointments) render only a muted caption + chevron, no visible affordance — a doctor may not realize the row itself is the entry point to create the link.
- Opening a row lands on 03 (Appointment Details), which is **one page, not a wizard** (Fable decision: consultation workspace stays a single page with sticky context header + primary column + supporting rail — no full tab split of clinical content).
- **03/UX-005 (High):** when there's no meeting link yet, the header shows **no CTA at all** in its place — the single most time-critical action on first load is invisible. Fable decision: header must always render a context-sensitive primary action (Join / Create link / Review payment).
- **03/UX-001 (Critical — data loss):** typing into the SOAP note (Chief Complaint etc.) and clicking "Back to appointments" (or any nav/tab click) navigates instantly with **zero warning**, discarding the note. Root cause: no dirty-check, only a `beforeunload` listener which Next.js client-side navigation never fires. This is the top P0 across the whole audit (see `08-prioritized-doctor-improvement-plan.md`).
- **03/UX-002 (Medium):** "Save & sign" uses a native `confirm()` instead of `PortalDialog`, for a medico-legally irreversible action (signing locks the note) — inconsistent with the prescription-delete dialog two components away.
- **03/UX-003 (Medium):** Finalize button doesn't disable while the checklist is unmet; it errors only after click.
- **03/IH-001 (High):** at short viewport (1366×650) the tab strip itself is clipped at the bottom edge — zero actionable content visible on load.
- End-to-end gap: a doctor can lose real clinical documentation with one misclick, and the page that should show "join the call" first instead shows nothing when it matters most.

## 3. Prescription / clinical documents / forms

**Pages touched:** 03 (Appointment Details → Clinical/Forms/Documents tabs) → 09 (Forms, template management, out-of-flow).

- Prescriptions/exam requests/certificates are issued inside 03's Clinical/Documents tabs — no friction specific to issuance flow found in this pass (this appointment had 0 documents/exams/prescriptions, so several states are code-derived only — see `09-open-questions-and-blockers.md`).
- 09 (Forms) is **template CRUD only**, not a fill/sign/send flow — the actual fill happens back in 03's Form-Fill panel. This split is intentional and correctly cross-linked (09's own docs note the link from Form-Fill when a doctor has 0 templates).
- **09-001 (Medium):** no unsaved-changes protection on the template builder — a doctor building a multi-field template who gets interrupted loses all work silently, same root cause as 03/UX-001 (no dirty-tracking + nav guard).
- **09-002/09-003 (Low):** native HTML5 `required` shadows the app's own translated validation copy, and makes the "no fields" validation branch unreachable via the UI (dead code, not a doctor-facing defect today, but confusing to maintain).
- Open question (09, unresolved): is this generic key/label/type/required builder meant to be the **only** way doctors create clinical documents, or is a more structured sick-cert/prescription/referral generator expected elsewhere? Not found in this audit's route inventory — flagged in `09-open-questions-and-blockers.md`.

## 4. Patient-record review

**Pages touched:** 06 (My Patients) → 07 (Patient Record).

- **06-001 (High):** compliance banner + hero + 3-stat strip consume the entire first viewport on mobile/short screens, pushing the search box and patient list below the fold every session.
- Opening a record lands on 07, the **highest clinical-stakes page in the portal not counting the consult workspace itself** — it holds allergy/chronic-disease/medication data.
- **07-001 (Critical — data-handling violation):** the patient's email is rendered in plain text in the breadcrumb, directly contradicting explicit code comments elsewhere in the same feature stating the email "MUST NOT" be rendered as visible text per the GDPR plan. Shared-shell bug (`useBreadcrumbs` in `portal-shell.tsx`), likely reproduces on any route using an email as a path segment.
- **07-002 (High):** appointment history is sorted by `createdAt` (when the booking record was created) but displays `scheduledAt` (the actual visit date) — the "WHEN" column visibly out of order. A sibling endpoint (`doctor.route.ts:374`) already orders correctly; this is a one-line backend `orderBy` fix.
- **07-004 (High — clinical-safety gap):** the shared clinical chart (allergies, meds, alerts) has **no unsaved-changes guard** — a doctor interrupted mid-edit loses the update silently. For the page whose #1 job is surfacing safety-critical facts, this is more than UX polish.
- **Structural finding (Information Hierarchy):** the doctor's #1 priority task (see allergies/alerts before touching the patient) is placed **last** in the page flow — appointment history → consultation history → *then* the chart. Fable decision: pin a compact, read-only clinical-alerts/allergy strip above the fold, and add tabs for the long column (Appointment history / Consultation history / Patient chart).
- End-to-end gap: a doctor reviewing a new patient before a consult must scroll past two full history tables to find out if the patient has a life-threatening allergy.

## 5. Availability update

**Pages touched:** 04 (Calendar) and/or 05 (Availability) — **two pages write to the same `AvailabilityWindow` table via the same `createAvailabilityWindow` API**, with no cross-link or stated division of labor between them.

- **04/CAL-04-001 (Critical):** the month calendar grid — the primary tool on this page — is below the fold on every tested viewport and entirely hidden at short/laptop heights.
- **05-001 (Critical, shared `WeekCalendar`):** the week grid on Availability loses Thursday–Sunday entirely on mobile with **no scroll affordance** — root cause is a missing `min-w-0` on a CSS grid item, present on this page and needing verification on `/doctor/calendar` and the admin per-doctor availability editor (all 3 share `WeekCalendar`).
- **05-002 (High):** no overlap detection when adding a recurring window — the live test account already has 2 overlapping Monday windows and 3 overlapping Friday windows as a direct result.
- **05-004 (High):** the delete-confirmation dialog for a recurring window never restates *which* window (day/time) is being removed, despite up to 3 visually-identical rows existing in the same account.
- **CAL-04-002 (High):** validation errors on Calendar's add-availability/time-off forms render ~170px above the visible viewport with no scroll-into-view — reads as a silently broken Save button.
- Fable decision: **recommend merging** Calendar + Availability into one "Schedule" area with List/Calendar-style tabs, mirroring the already-shipped patient-portal pattern (Bookings List/Calendar tabs) — this is an **owner decision** (nav change), not auto-implementable.
- End-to-end gap: a doctor managing their schedule today must learn two different forms that write the same data, on two different nav items, with no indication either exists from the other.

## 6. Service management

**Pages touched:** 08 (My Services).

- **08-001 (Medium):** compliance banner + a redundant explainer card eat the fold; zero service cards visible without scrolling at short/mobile viewports.
- **08-002 (Medium):** the summary strip's counts are computed server-side across **all** countries, not the active country tab — switching to a second market shows stale "14 selected" numbers while every visible card actually reads "NOT REQUESTED".
- **08-005 (Medium):** no unsaved-changes guard when toggling service selections and navigating away.
- Fable decision: APPROVE stat strip scoped to the selected country tab (strip follows the tab, per-tab data already exists via badges).

## 7. Profile / verification

**Pages touched:** 14 (Profile country picker) → 15 (Profile country editor).

- **14-001 (Medium):** the picker is a redundant interstitial for the common path — the sidebar already has one direct link per active market, so the picker only fires for the breadcrumb/account-menu path and then asks a doctor to re-make a choice the sidebar already made cheaper.
- **15-001 (High):** two contradictory market counts appear on one screen ("Markets 3" in the top strip vs "Markets 2" in a lower insight tile) plus a phantom Portugal listing that 404s when clicked.
- **15-002 (High):** three stacked summary surfaces (AdminSummaryStrip → Practice context card → ProfileInsight tile strip) restate the same facts before any editable field appears — first input is ~1500px down the page at desktop.
- **15-003 (High — data loss):** editing any field and clicking a sidebar link navigates instantly with edits silently discarded — same missing-guard root cause as 03/UX-001, 07-004, 08-005, 09-001. Bio-editor edits are additionally excluded from dirty tracking entirely (15-004), so even a working `beforeunload` guard wouldn't catch the highest-effort field.
- **15-006 (High — P0, correctness bug not just UX):** the "Public profile" FormSection is headed "Patients see this on your **Czechia** doctor card... saved per country," but 4 of its fields (name, qualifications, languages, WhatsApp) actually PATCH the **global** profile endpoint and silently change all of a doctor's countries at once. A doctor "fixing their name for Czechia" renames themselves everywhere.
- Fable decision: APPROVE splitting global-scope vs country-scope fields into clearly labeled FormSections; fix the market-count contradiction and Portugal 404; this is a structural, multi-locale-file change flagged for review.
- End-to-end gap: profile verification/payout setup is scattered across two pages, three redundant summaries, and a save button whose scope doesn't match its own heading — the exact combination most likely to produce a wrong cross-country edit.

## 8. Invoices / payout

**Pages touched:** 12 (Invoices) and 13 (Reports) — **same duplication pattern as Calendar/Availability**: both pages offer a "download payout statement" action against the identical `dataset=payout` export endpoint, in two different nav groups, with no cross-link.

- **12-001 (High):** every invoice row in the test account shows Amount = "Not set" with no explanation of whether that's expected (admin hasn't processed payout yet) or broken — the page gives a doctor no way to tell.
- **12-002/12-003 (Medium):** 5 stacked full-width cards before the table; table entirely below the fold at short viewport.
- **12-006 / 13-005 (Medium, structural — Fable review, mirrored in both files):** Invoices' step-1 "Download your payout statement" (with a proper month picker) and Reports' "Payout statement (last month)" dropdown option (hardcoded to last month, no picker) hit the exact same endpoint. Recommendation: keep the download on Invoices only, replace the Reports option with a one-line cross-link.
- Fable decision: APPROVE Invoices splitting into two tabs (Consultations / Monthly statement); the payout-statement export lives only on Invoices; Reports keeps its nav slot (analytics vs billing-action separation is a real distinction) but cross-links instead of duplicating the export.

## 9. Messages

**Pages touched:** 10 (Patient Messages) — plus the embedded chat inside 03 (Appointment Details' Messages tab), both driven by the shared `ConsultationChat`/`MessagesInbox` components.

- **10-001 (Medium, shared `ConsultationChat`):** no loading indicator in the embedded chat pane while a thread's messages fetch (1–2.5s observed blank box) — root cause: the loading spinner is coupled to a header that this page's `variant="embedded"` configuration never renders.
- **10-002 (Medium, missing prop wiring):** the Messages inbox never passes `onToggleLock` to `ConsultationChat`, so a doctor cannot lock/re-open a chat from the page whose own description promises "reply in place" — they must find the same appointment via 03 instead, defeating the promise for that one action.
- **10-003 (Medium, shared `MessagesInbox`):** threads with no resolvable `orderNumber` render no way to jump to the full appointment record at all — the link is gated on the display label existing, not on navigability.
- Fable decision: APPROVE both the lock/loading decoupling fix and the null-orderNumber fallback — both are shared across 3 portals and require a cross-portal visual regression check before merge.

## Cross-workflow summary

The single recurring root cause across workflows 2, 4, 5, 6, and 7 is **the missing portal-wide unsaved-changes guard** (03/UX-001, 07-004, 08-005, 09-001, 15-003/15-004) — five independent forms, five independent silent-data-loss bugs, one shared primitive (`UnsavedChangesGuard`/`useUnsavedChanges`) that already exists and ships in the **patient** portal but is **not currently used anywhere in the doctor portal** (verified via `grep -rl "UnsavedChanges" "app/(doctor)"` → zero matches — this contradicts a claim in `pages/03-appointment-details.md` that it is "already used on other doctor pages," which does not hold up under grep; see `09-open-questions-and-blockers.md`). This is P0-2 in the improvement plan.

The second recurring pattern is **duplicate-destination confusion**: Calendar/Availability (workflow 5) and Invoices/Reports (workflow 8) both put the same underlying action on two nav items with no cross-link, both flagged for Fable/owner review rather than auto-resolved.
