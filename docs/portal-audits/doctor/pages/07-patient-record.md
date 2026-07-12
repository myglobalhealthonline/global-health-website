# 07 — Patient Record (detail)

## 1. Page Identification
- **Name:** Patient record
- **Route:** `/doctor/patients/[email]` (email URL-encoded, e.g. `/doctor/patients/patient%40globalhealthonline.com`)
- **Entry points:** "Open"/"Open patient record" from `/doctor/patients` (page 06); "Back to patients" returns
- **Role:** DOCTOR
- **Workflow:** Doctor reviews a patient's booking history, prior consultation notes/documents, and maintains the shared clinical chart (allergies, medication, vitals) before/after a consultation
- **Frontend files:**
  - `frontend/app/(doctor)/doctor/patients/[email]/page.tsx` (server component)
  - `frontend/app/(doctor)/doctor/patients/[email]/loading.tsx`
  - `frontend/app/(doctor)/doctor/patients/[email]/_components/patient-profile-panel.tsx` (client — the editable chart)
  - `frontend/app/(doctor)/doctor/patients/[email]/_components/consultation-history-panel.tsx` (client — notes/documents/uploads)
  - `frontend/app/(doctor)/doctor/patients/[email]/_components/all-documents-card.tsx` (present in tree but **not imported by page.tsx** — dead code, see §22)
- **Shared components:** `PageHeader`, `AdminSummaryStrip`, `AdminEmptyState`, `Pill` (`components/portal-atoms.tsx`), `PortalMobileCard`, `ColumnPriorityTable`, `FormSection` (wraps `AdminCard` + `SectionHeader`)
- **APIs observed:**
  - `GET /api/doctor/patients/:email` (page-level, SSR) → backend `backend/src/routes/doctor-actions.route.ts:498`
  - `GET/PATCH /api/doctor/patients/:email/profile` (client, `PatientProfilePanel`)
  - `GET /api/doctor/patients/:email/consultation-history` (client, `ConsultationHistoryPanel`)
  - `POST /api/doctor/patients/:email/upload-link`
  - Document view links: `GET /api/doctor/documents/generated/:id/pdf`
- **Date:** 2026-07-12
- **Viewports tested:** all 7 (desktop, laptop, tabletl, tabletp, mobile, smobile, short) — browser-verified, plus a full-page scroll capture at laptop and desktop
- **States tested:** populated record with 11 appointments/documents (`patient@globalhealthonline.com`), populated record with 1 appointment (`arifnoman434@gmail.com`), field-edit-without-save + navigate-away (unsaved-changes guard test). Not triggered: API-error state, zero-appointment state, PATCH-failure state — **code-derived** below.

## 2. Page Purpose
The doctor's single clinical view of one patient: booking/consultation history plus an editable shared chart (vitals, allergies, chronic conditions, meds, alerts). This is the highest clinical-stakes page audited so far — it directly informs treatment decisions and is the only place allergies/chronic-disease data surfaces in the doctor portal.

## 3. Primary Doctor Tasks (priority order)
1. **See safety-critical facts before touching the patient** — allergies, chronic conditions, current medication, any doctor-set alert.
2. Review prior consultation notes and documents relevant to today's visit.
3. Open a specific past appointment's workspace.
4. Update the shared chart (vitals/allergies/history) or set a clinical alert.
5. Send a document-upload link to the patient.

## 4. Clinical/Operational Importance
**Critical.** This page holds allergy and chronic-disease data that changes what a doctor safely prescribes, and it's the only doctor-portal surface for cross-appointment record continuity (no allergy/medication data appears in the appointment workspace itself per this audit's evidence — it lives only here).

## 5. Current Page Structure (top-to-bottom)
1. "Back to patients" link
2. `PageHeader` — eyebrow "PATIENT RECORD", title = patient full name, description
3. `AdminSummaryStrip` — Country / Appointments / Signed consults (3 stat cards)
4. Two-column grid (collapses to 1 column below 1400px — see §19):
   - **Main column:** "Appointment history" table (all appointments with this doctor) → "Consultation history" (collapsible sections: medical notes, generated documents by type, uploaded files)
   - **Aside column:** "Patient chart" form (pharmacy, vitals, allergies, medical history, doctor-only alerts, save button, "Send upload link") → "Summary" (country/DOB/first seen/appointments/signed consults — duplicates 3 of the 5 stat-strip values)

## 6. Current Container Hierarchy
```
page
├─ PageHeader                                          [no card]
├─ AdminSummaryStrip (3× stat card)                     level 1
└─ grid (2-col ≥1400px, 1-col below)
   ├─ main column
   │  ├─ gh-card gh-doctor-patient-history-card (Appointment history)   level 1
   │  │  └─ table / PortalMobileCard                                    (no nested surface)
   │  └─ gh-card gh-doctor-patient-history-card (Consultation history)  level 1
   │     └─ HistorySection (border+bg, collapsible)                     level 2
   │        └─ DocTypeGroup (border-top only, no bg/shadow — not a "surface")
   │           └─ ColumnPriorityTable                                   (no nested surface)
   └─ aside
      ├─ FormSection → AdminCard (Patient chart)         level 1
      │  └─ <Section> (h4 + fields, no card)              (no nested surface)
      └─ gh-card gh-doctor-summary-card (Summary)         level 1
```
Verified via `page.evaluate` surface-crawl from the `allergies` input up to `<body>`: **depth 2** (`gh-input` itself + the `AdminCard`/`FormSection` wrapper) — reasonable, not excessive. The one real nesting issue is `HistorySection` (level 2, a colored header bar) containing multiple `DocTypeGroup`s each with their own table — visually a "card-in-card" only for the Consultation History block, not portal-wide over-nesting.

**Mixed primitive usage on one page:** the two main-column sections use raw `gh-card` classes directly in `page.tsx`, while the aside chart uses the newer `FormSection`/`AdminCard` component. Both render visually similar boxes but through two different code paths — worth consolidating (see §22).

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| "Back to patients" | link | click | → `/doctor/patients` | none (also used in unsaved-edit test, see 07-004) | 07-patient-record-laptop-after-navaway-01.png |
| Appointment row "Join" | link | click (not clicked — external meet URL) | opens Google Meet in new tab | none | — |
| Appointment row "Open" | link | click | → `/doctor/appointments/:id` workspace | none | — |
| "Generated documents" / group headers | button (disclosure) | click | expand/collapse | none, but no `aria-expanded` verified — see §20 | 07-patient-record-laptop-full-01.png |
| Medical-note row | row click | click | expands inline note content (`renderExpandedRow`) | Interaction exists in code (`consultation-history-panel.tsx:374-384`) but wasn't visually confirmed in this session — my test click landed on the Appointment-history table (no expand behavior there) rather than the async-loaded Consultation-history table; **not a bug**, just a test-targeting miss. Marking as code-derived only for the expand behavior itself. | 07-patient-record-laptop-note-expanded-01.png (shows the wrong table, kept for record) |
| Document "View" link | link | click (not clicked — opens PDF) | → `/api/doctor/documents/generated/:id/pdf` | none | — |
| Chart field inputs (allergies, chronic diseases, etc.) | text input | type | local form state only | No unsaved-change warning — see 07-004 | 07-patient-record-laptop-chart-edited-01.png |
| "Save chart" | submit button | click (not clicked — would mutate data) | PATCH profile | Single save commits **all** chart sections (pharmacy + vitals + history + alerts) at once — see 07-005 | — |
| "Send upload link" | button | click (not clicked — sends an email/notification) | POST upload-link | none observed in code beyond expected side effect | — |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Populated, 11 appointments | ✅ | — | renders correctly | 07-002 (sort order) |
| Populated, 1 appointment | ✅ | — | renders correctly | — |
| Chart pre-filled from a prior save (weight/height/BMI/blood type/allergies/etc.) | ✅ | — | fields correctly hydrated from `GET .../profile` | — |
| Edit field, don't save, navigate away | ✅ | — | edit silently discarded, no confirm dialog | 07-004 |
| Patient with 0 appointments | code-derived | `page.tsx:28-42` calls `fetchDoctorPatientDetail`; backend returns 404 when `rows.length === 0` (`doctor-actions.route.ts:533-535`) | page shows the generic error card ("Back to patients" + warning message), not a friendlier empty state | not browser-verified — would need a patient email with zero appointments for this doctor, not available in seed data |
| API/network error | code-derived | `page.tsx:28-42`, same branch as above | same generic warning card | not triggered |
| Chart PATCH failure | code-derived | `patient-profile-panel.tsx:213-219` | inline `saveMsg` text shows `json.message ?? copy.chartSaveFailed`, no toast/banner | not triggered (would require backend failure injection) |
| Loading (SSR) | code-derived | `loading.tsx` exists | route-level skeleton | not screenshotted |

## 9. Screenshots
All under `docs/portal-audits/doctor/screenshots/07-patient-record/`.
| File | Viewport | State | Reason | Issues shown |
|---|---|---|---|---|
| 07-patient-record-desktop-default-01.png | 1440×900 | default (2-col) | matrix | table column clipped at card edge (07-003) |
| 07-patient-record-laptop-default-01.png | 1280×720 | default (1-col, collapsed) | matrix | — |
| 07-patient-record-tabletl-default-01.png | 1024×768 | default | matrix | — |
| 07-patient-record-tabletp-default-01.png | 768×1024 | default | matrix | — |
| 07-patient-record-mobile-default-01.png | 390×844 | default (above fold) | matrix | 07-001 (breadcrumb truncated, not a leak at this width), fold pushed low |
| 07-patient-record-smobile-default-01.png | 375×667 | default | matrix | worst-case fold |
| 07-patient-record-short-default-01.png | 1366×650 | default | short-viewport fold check | zero clinical content visible without scrolling |
| 07-patient-record-laptop-breadcrumb-email-leak-01.png | 1280×720 | default | close-up of top bar | **07-001 — patient email rendered verbatim in breadcrumb** |
| 07-patient-record-laptop-full-01.png | 1280×720 | default, full page | complete top-to-bottom reference | 07-002 (unsorted dates), overall structure |
| 07-patient-record-laptop-chart-edited-01.png | 1280×720 | allergies field edited, unsaved | unsaved-edit evidence | 07-004 |
| 07-patient-record-laptop-after-navaway-01.png | 1280×720 | after clicking "Back to patients" post-edit | confirms silent discard | 07-004 |
| 07-patient-record-laptop-note-expanded-01.png | 1280×720 | attempted note-expand click | see interaction inventory note | — |

## 10. UX Problems

**07-001 — Critical.** The patient's email address is rendered in plain text in the top breadcrumb bar, on every viewport, despite explicit code comments elsewhere in the same feature stating the email "MUST NOT" be rendered as visible text.
- Evidence: `07-patient-record-laptop-breadcrumb-email-leak-01.png` shows the breadcrumb `Doctor › Patients › Patient%40globalhealthonline.Com`. Reproduced for a second patient in `07-patient-record-short-default-01.png` (`Arifnoman434%40Gmail.Com`).
- Doctor impact: none directly, but this is a **data-handling violation**, not a cosmetic bug — the product deliberately withholds patient email from the doctor UI (`lib/api/doctor-api.ts:190-193`: *"Frontend MUST NOT render this as visible text per GDPR plan"*; `page.tsx:206-208`: *"NOT rendered as visible text in the doctor UI"*), and the top-bar breadcrumb defeats that intent on the very page those comments describe. It's also readable by anyone glancing at a doctor's screen or in a screen-share/recording during a consult.
- Root cause: `useBreadcrumbs()` in `frontend/components/portal-shell.tsx:86-108` builds crumbs generically from URL path segments. It special-cases 25-char CUID segments (truncates to `xxxxxxxx…`) but has no case for an email/PII segment — anything else falls through to `humanizeSegment()` (`portal-shell.tsx:81-84`), which just title-cases the raw (URL-encoded) string and displays it.
- This is a **shared component** (`PortalShell`, used by admin/doctor/patient portal shells alike) — the same bug will reproduce on any route that uses an email as a path segment. `frontend/app/(admin)/admin/patients/[email]` and similar likely share the exposure; out of scope to verify here but worth flagging to Fable as a cross-portal issue, not page-07-only.
- Recommendation: in `useBreadcrumbs`, detect email-shaped segments (contains `%40`/`@` after decode, or simply: not a CUID and matches an email regex) and replace the crumb label with a safe placeholder — ideally the patient's `fullName` (already available to the page as `patient.fullName`, just not threaded into the shell) or a generic "Patient record" label, never the raw segment. Minimal fix: pass an optional `crumbLabelOverride` for the last segment down from the page via `PortalShell` props, defaulting to today's behavior for non-PII routes.

**07-002 — High.** Appointment history is not sorted chronologically by the date shown in the "When" column.
- Evidence: `07-patient-record-laptop-full-01.png` — the "WHEN" column reads (top to bottom) 05/06, 05/06, 25/05 ×5, 30/05, 01/06, 29/05, 01/06, 25/05 — visibly out of order.
- Doctor impact: the doctor's natural expectation ("most recent visit at top") is violated; finding "what happened last time" requires scanning the whole table instead of reading the first row.
- Root cause: `backend/src/routes/doctor-actions.route.ts:513` orders the query by `orderBy: { createdAt: "desc" }` (when the booking record was created), while the UI displays `a.scheduledAt` (the actual appointment date/time) in the "When" column (`page.tsx:125-127`). These two timestamps diverge whenever a patient books out of order or reschedules — exactly what the seed data shows. Note the *sibling* endpoint used for the appointments list (`doctor.route.ts:374`) already orders by `[{ scheduledAt: "asc" }, { createdAt: "desc" }]` — the correct pattern already exists elsewhere in the codebase, just not applied here.
- Recommendation: change `doctor-actions.route.ts:513` to `orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }]` to match what's displayed. (Descending here since this is a history view, most-recent-first.)

**07-003 — Medium.** Appointment-history table overflows its card at 1440px desktop width with no visible scroll affordance; the rightmost "CONSULT"/action column is clipped mid-word.
- Evidence: `07-patient-record-desktop-default-01.png` shows "Jc" where "Join"/"Open" should read in full.
- Root cause: `.gh-doctor-table-wrap table { min-width: 760px }` (`app/portal.css:2922-2924`) inside a main column that gets `minmax(0, 1.62fr)` of a grid whose sidebar reserves `minmax(300px, 0.88fr)` — at 1440px the main column lands under 760px, and while the wrapper does have `overflow-x-auto` (`page.tsx:109`), there's no scrollbar-visibility cue in the screenshot, so a doctor may not realize the row continues.
- Recommendation: either drop non-essential columns (Payment) at this breakpoint via `ColumnPriorityTable`-style priority hiding, or add a persistent scroll-shadow/fade affordance to `.gh-doctor-table-wrap`.

**07-004 — High.** No unsaved-changes protection on the patient chart form.
- Evidence: `07-patient-record-laptop-chart-edited-01.png` (allergies field edited to `TEST-UNSAVED-EDIT-DO-NOT-PERSIST`, not saved) → clicked "Back to patients" → `07-patient-record-laptop-after-navaway-01.png` confirms navigation completed instantly to `/doctor/patients` with no confirmation dialog, and re-navigating back would reload the original unedited value from the server (edit is gone).
- Doctor impact: a doctor who updates an allergy or medication note and is interrupted (patient calls, next appointment) before clicking "Save chart" loses the edit silently — for a page whose #1 job (§3) is surfacing safety-critical data, silent loss of an allergy update is a real clinical-safety gap, not just a UX nicety.
- Root cause: `patient-profile-panel.tsx` has no dirty-state tracking and the page performs a plain client-side navigation (`<Link href="/doctor/patients">` in `page.tsx:48-53`) with no `beforeunload`/router-guard hook.
- Recommendation: track a `dirty` boolean (form `onChange` vs. last-saved snapshot) and wire `useBeforeUnload` + intercept the "Back to patients" `Link` (confirm-dialog via existing `PortalDialog` primitive) when dirty. Do not build a custom modal — reuse `PortalDialog` per the shared-primitives rule in the repo's CLAUDE.md.

**07-005 — Medium.** One "Save chart" button commits five unrelated sections at once (pharmacy, vitals, allergies/medical history, doctor-only alerts) with no per-section save or diff indicator.
- Evidence: code — `patient-profile-panel.tsx:148-220`, a single `<form onSubmit={save}>` wraps `Section`s for Plan & Pharmacy, Vitals, Medical History, and Clinical Alerts; one PATCH payload for all of them.
- Doctor impact: low-risk today (all fields are always visible, nothing hidden behind tabs), but it means an accidental edit to "Preferred pharmacy" gets saved together with an intentional allergy update with no way to save just one — and there's no visual diff/confirmation of *what* changed before commit.
- Recommendation: not urgent given the page is short enough to review in full before saving; if the chart grows further, split into independently-saved sections. Flagging as Medium, not High, specifically because 07-004 (losing an edit) is the more pressing problem than 07-005 (all-or-nothing save).

**07-006 — Low.** "Summary" card (aside, bottom) duplicates 3 of the 5 fields already shown at the top in `AdminSummaryStrip` (Country, Appointments, Signed consults), adding only DOB and First seen.
- Evidence: `07-patient-record-laptop-full-01.png` — compare the top stat strip to the bottom "Summary" `<dl>`.
- Doctor impact: minor — an extra ~150px card that mostly repeats numbers already stated above, with the 2 net-new fields (DOB, First seen) buried at the very bottom of the page.
- Recommendation: fold DOB into the `PageHeader` description or as a 4th `AdminSummaryStrip` tile, and delete the "Summary" card entirely.

## 11. Visual Design Problems
- Same generic bar-chart icon on all 3 `AdminSummaryStrip` tiles as on page 06 — low priority, same fix scope.
- `PATIENT RECORD` hero card (green gradient, `PageHeader`) is large (≈150px tall) relative to the single line of information it conveys (name + 2 lines of static description text that doesn't change per patient) — on short viewports (07-patient-record-short-default-01.png) this alone consumes roughly a quarter of the visible height before any clinical content appears.

## 12. Information Hierarchy Problems
**This is the page's core structural problem.** The doctor's #1 priority task (§3: see allergies/alerts before touching the patient) is placed **last** in the main content flow: Appointment history → Consultation history → *then* Patient chart (allergies/alerts) → Summary. A doctor scanning top-to-bottom on any viewport under 1400px width (which collapses the 2-column layout to 1 column — see §19) must scroll past two full history tables before reaching the allergy field.
- Evidence: `07-patient-record-laptop-full-01.png` — "Allergies (comma-separated)" doesn't appear until roughly 1150px down a 3900px-tall page.
- The only safety signal that *is* surfaced early is the doctor-set "Status alert"/"Clinic alert" banner (`patient-profile-panel.tsx:245-260`) — but only if a doctor has previously typed one in; there's no equivalent early surfacing of the *raw* allergy/chronic-disease fields, which is what a doctor needs on a first-ever visit with this patient.
- Recommendation: see §14.

## 13. Current Section Order
1. Back link
2. Header (name)
3. Stat strip
4. Appointment history
5. Consultation history
6. *(aside, only visible alongside at ≥1400px)* Patient chart
7. *(aside)* Summary

## 14. Recommended Section Order
1. Back link
2. Header (name)
3. **Clinical alerts banner** (status/clinic alert) + **Allergies / chronic diseases / current medication** — promoted to a compact, always-visible "at a glance" strip immediately under the header, *before* the stat strip. This is the single highest-value change on this page: it's read-only display (not the full editable chart) and takes ~2 lines.
4. Stat strip (Country/Appointments/Signed consults + DOB per 07-006)
5. Appointment history
6. Consultation history
7. Patient chart (full editable form — vitals, pharmacy, history, alerts) — remains the place to *edit*, just no longer the only place to *see* allergies
8. *(Summary card removed — folded into stat strip, 07-006)*

Reasoning: matches the priority order in §3 — safety data first, then operational history, then the editable form last (editing is a secondary task to reviewing).

## 15. Tabs/Steps/Sectioning Recommendation
The page is a long single scroll on any viewport <1400px (which is most of the tested matrix). Given the volume of content (appointment table + consultation history with 3 sub-groups + a 5-section chart form), recommend converting the main column to **tabs**: `Overview` (new — clinical-alerts strip + recent-appointment summary), `Appointment history`, `Consultation history`, `Patient chart`. Keep the compact clinical-alerts strip visible above the tabs on every tab (not tab-gated) since it must never require an extra click to see. This is a structural change — **flag for Fable review** per the audit brief (tab systems affect IA).

## 16. Save & Finalization Recommendation
Keep single "Save chart" for now (07-005 is Low priority) but add the dirty-tracking + navigation guard from 07-004 regardless of whether sectioned-save is adopted later — that fix stands on its own.

## 17. Proposed Page Structure (exact top-to-bottom)
1. Back link
2. Header
3. Clinical-alerts + allergy/chronic-disease/medication summary strip (read-only, compact)
4. Stat strip (Country / Appointments / Signed consults / DOB)
5. Tabs: Appointment history | Consultation history | Patient chart
6. (Patient chart tab retains today's full form + Save chart + Send upload link)

## 18. Proposed Container Simplification
- **Keep:** Appointment-history card, Consultation-history card, Patient-chart `FormSection`.
- **Remove:** "Summary" card (fold into stat strip, 07-006).
- **Flatten:** none of the existing surfaces are over-nested (verified depth-2 max, §6); no card-in-card to flatten.
- **New:** one lightweight (non-card, banner-style) "alerts + allergies" strip — should reuse the existing red/amber alert banner styling already in `patient-profile-panel.tsx:245-260` rather than inventing a new visual treatment.
- **Tabs:** introduce `PortalTabs` (per repo's shared-primitives list) instead of hand-rolling tab state — do not build a custom tab bar.

## 19. Responsive Findings
| Viewport | Finding |
|---|---|
| desktop 1440 | 2-column layout active; 07-003 table clipping |
| laptop 1280 | **1-column** — grid collapses below 1400px (`portal.css:3050-3063`, intentional per code comment to avoid the 760px-min table fighting a 300px sidebar); means the aside (chart) drops to the very bottom of the page even on a "large" 1280px laptop |
| tabletl 1024 | 1-column, same as laptop |
| tabletp 768 | 1-column, table switches toward card mode inside `ColumnPriorityTable` |
| mobile 390 | 1-column; breadcrumb truncated to "Doctor › Pa…" (not the PII leak at this width — cut off before reaching the email segment) |
| smobile 375 | Same as mobile, more scroll |
| short 1366×650 | Confirmed **zero clinical content visible without scrolling** — banner + hero + 3 stat cards alone exceed 650px height (`07-patient-record-short-default-01.png`) |

The 1400px collapse breakpoint is unusually high — most real "laptop" screens (1280–1366px) fall below it and get the 1-column stack, making the aside-position problem (§12) the common case, not an edge case.

## 20. Accessibility Findings
- Collapsible section headers (`HistorySection`, `DocTypeGroup` in `consultation-history-panel.tsx`) are real `<button>` elements with visible chevron icons — good semantics — but neither sets `aria-expanded`; a screen-reader user gets no announced state change on toggle. Code-derived (not verified with a screen reader this session).
- Chart form fields all use proper `<label>` wraps (verified by reading the JSX directly — every input in `patient-profile-panel.tsx` is inside a `<label>` with visible text, no bare placeholder-only fields).
- Status/clinic alert banners correctly use `role="alert"` / `role="status"` respectively (`patient-profile-panel.tsx:247,254`) — appropriate urgency semantics, no fix needed.
- Icon-only elements: none found on this page (all buttons carry visible text alongside icons).
- Breadcrumb PII issue (07-001) is also an accessibility/privacy overlap concern — screen readers will read the email aloud.

## 21. Content & Microcopy Findings
| Current | Recommended | Reason |
|---|---|---|
| "Allergies (comma-separated)" | Keep field but consider chip/tag input instead of raw comma-separated text (out of scope for a copy-only pass — implementation change, flagged not required) | Free-text comma parsing is fragile ("Penicillin , pollen" vs "Penicillin, Pollen" are both valid but inconsistent) — Low priority, code-derived observation only |
| "Save chart" | Keep | Clear, unambiguous scope label already |
| Breadcrumb showing raw email | Patient's name or "Patient record" | See 07-001 |
| "Signed consults" (stat + summary duplicate) | Keep label, remove duplicate card (07-006) | — |

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| `useBreadcrumbs` | `components/portal-shell.tsx:86-108` | Detect + mask PII-shaped segments (email regex or explicit override prop) | Yes — all portal shells | **High** — touches every portal route's breadcrumb | Small–Medium |
| Doctor patients detail route | `backend/src/routes/doctor-actions.route.ts:513` | Change `orderBy` to `[{ scheduledAt: "desc" }, { createdAt: "desc" }]` | No (single endpoint) | Low | Trivial |
| `page.tsx` | `app/(doctor)/doctor/patients/[email]/page.tsx` | Add clinical-alerts/allergy summary strip above stat strip; remove Summary card; fold DOB into stat strip | No | Low | Small |
| `PatientProfilePanel` | `.../_components/patient-profile-panel.tsx` | Add dirty-state tracking + navigation-guard dialog (reuse `PortalDialog`) | No | Medium (form-state logic) | Medium |
| Consultation/appointment history sections | `page.tsx` + `consultation-history-panel.tsx` | Wrap in `PortalTabs` if the tab recommendation (§15) is adopted | No | Medium | Medium |
| `all-documents-card.tsx` | `.../_components/all-documents-card.tsx` | **Dead file** — not imported anywhere in `page.tsx` (documents are intentionally shown via `ConsultationHistoryPanel` instead, per the code comment at `page.tsx:237-240`). Confirm and delete, or confirm it's mid-migration and leave a TODO. | No | Low | Trivial — worth a follow-up task, not part of this audit's scope |

## 23. Backend or Business-Logic Impact
- 07-002 requires a backend `orderBy` change (`doctor-actions.route.ts:513`) — frontend-only elsewhere.
- 07-001 fix is frontend-only (breadcrumb logic) but should be reviewed against the GDPR plan referenced in the code comments — this is a privacy-adjacent fix, recommend a quick legal/compliance sanity check given the explicit prior intent to hide this data, even though the fix itself needs no schema/API change.
- No other finding needs backend or clinical/legal review.

## 24. Recommended Implementation Order
1. **07-001** (Critical, PII leak) — fix `useBreadcrumbs`, ship independently and fast.
2. **07-002** (High, data-integrity-adjacent) — one-line backend `orderBy` fix.
3. **07-004** (High, clinical-safety-adjacent data loss) — dirty-state + nav guard.
4. **07-006** (Low, quick win) — delete duplicate Summary card, fold DOB into stat strip.
5. **07-003** (Medium, responsive polish) — table column priority/scroll affordance.
6. Larger IA change (§14/§15 — promote allergies, add tabs) — batch as one reviewed change since it touches page structure; **send to Fable** before implementing (per audit brief: page merges/splits, tab systems).
7. **07-005** (Medium, defer) — only if the chart grows.

## 25. Acceptance Criteria (measurable)
- Breadcrumb on any `/doctor/patients/[email]` route never renders the raw email string (verify by navigating to 2+ different patient emails and reading the breadcrumb DOM text).
- Appointment-history "WHEN" column is monotonically non-increasing top-to-bottom for a patient with ≥3 appointments spanning different scheduled dates.
- Editing any chart field and clicking "Back to patients" (or closing the tab) triggers a confirmation prompt; confirming discards, cancelling stays on the page with the edit intact.
- Allergies/chronic-disease/medication values are visible within the first 600px of scroll on a 1280×720 viewport (currently ~1150px down the page).
- No visual regression on desktop 2-column layout (screenshot diff against `07-patient-record-desktop-default-01.png`).

## 26. Open Questions
- Should the breadcrumb fix use the patient's `fullName` (nicer, but requires threading page data into the shared shell component) or a generic non-identifying label like "Patient record" (simpler, no data threading)? Recommend the generic label as the safe minimal fix, name-based as a follow-up polish.
- Is `all-documents-card.tsx` genuinely dead code or a leftover from an in-progress migration? Needs a quick grep-across-branches check before deleting (not done here — out of this audit's scope).
- Confirm with product/legal whether DOB is safe to show in the stat strip (currently already shown in the "Summary" card being removed, so no new exposure — just relocating within the same page).
