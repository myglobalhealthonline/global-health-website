# Cross-Portal Design-System Findings — Doctor Portal Audit

Date: 2026-07-12 · Evidence: 17 page audits (`pages/*.md`), ~108 issues. Scope note: most primitives here are shared with the admin/patient portals — every rule below must be regression-checked there before shipping (see `05-shared-component-impact-map.md`). Owner rulings from `FABLE_DECISIONS.md` are embedded verbatim where they override what a page audit alone would recommend.

## 1. The fold-stacking disease (observed on 9+ of 17 pages: 01, 02, 03, 04, 05, 06, 08, 12, 13, 15)

Every doctor page stacks, in this exact order, before any task content: **compliance banner (conditional) → PageHeader hero card → AdminSummaryStrip (3-5 stat cards) → [filter/explainer card] → content**. At `short` (1366×650 — a common real-world laptop-with-browser-chrome height) this pattern produces **zero rows/grid/tabs visible on load** on at least 6 pages (02, 03, 04, 06, 12, 13), and severely reduced content on 3 more (05, 08, 15).

**Owner ruling (Fable decision, binding):** stat strips are **kept** — the owner previously reversed a strip-removal recommendation on the patient-portal audit (patient Rule S3 reversal) and accepted the fold tradeoff. **Do not recommend strip removal anywhere in the doctor portal.** Fixes must come from:
(a) **compliance-banner persistence** — dismiss state currently lives in `sessionStorage` and returns every session regardless of whether the underlying compliance item resolved; make the dismiss persist properly once resolved, and consider collapsing it to a slim single-line banner once dismissed-but-outstanding rather than reappearing at full size.
(b) **a compact `PageHeader` variant** for list/tool pages — several pages already independently recommend dropping the `description` paragraph on this page only (`04-calendar.md` §18, `08-services.md` §14 merges it into the header instead of a separate explainer card, `06-patients.md` §17).
(c) **page-specific structural fixes** — appointments' filter panel becomes collapsible (02-001, see below), calendar promotes the grid above the stat strip (CAL-04-001).
Any residual short-viewport shortfall after (a)-(c) is an **accepted tradeoff**, not a new bug, unless the owner says otherwise (see `09-open-questions-and-blockers.md`).

Evidence table (severity as tagged in the source page):

| Page | Fold issue ID | Severity | What's invisible at 1366×650 |
|---|---|---|---|
| 02 Appointments | 02-001 | Critical | Every appointment row |
| 03 Appointment Details | IH-001 | High | Entire tab strip |
| 04 Calendar | CAL-04-001 | Critical | Entire month grid |
| 05 Availability | (§19 note) | — | Sidebar list needs internal scroll sooner (vertical, not horizontal, constraint) |
| 06 Patients | 06-001 | High | Search box + patient list |
| 08 Services | 08-001 | Medium | Country/kind tabs + all service cards |
| 12 Invoices | 12-003 | Medium | Entire consultation table |
| 13 Reports | 13-003 | Medium | 5-tile stat row + both breakdown tables |
| 15 Profile (country editor) | 15-013 | Medium | Any editable field (largely fixed by resolving 15-002) |

## 2. Max-3-surface-levels rule + shadow overuse evidence

**Owner ruling (Fable decision, binding):** design-system rule — **max 3 visible surface levels: page / primary surface / interactive control.** Shadows are permitted only on level-2 surfaces and overlays, never on level-3+ children (badges, pills, dots, time chips).

Direct evidence for the rule (`02-appointments.md` §6, the audit's shadow probe): a `page.evaluate` computed-style walk on the Appointments page found **5 nested shadow+radius surfaces on a single row** — table-card → appointment-card → status pill → the pill's inner status dot, down to a **4px bare `<span>` computing a non-`none` box-shadow**. This is almost certainly a global CSS utility/reset applying `box-shadow` broadly rather than an intentional per-element choice (`02-003`, Medium) — needs a `portal.css` audit to find and scope the source selector before removing it from `.gh-appointment-card__time`, `.gh-pill`, and pill-internal spans.

Depth measurements across pages (via the same `getComputedStyle`/`page.evaluate` surface-crawl technique, run independently per page):

| Page | Measured max depth | Verdict |
|---|---|---|
| 01 Dashboard | 2 (`AdminCard > SectionHeader > div.p-5`) | Best-behaved page in the portal — no card-in-card beyond the header/divider double-edge (11-001) |
| 02 Appointments | 5 | **Worst offender** — fix target: 3 |
| 03 Appointment Details | 3 (`page > FormSection card > inner widget card`) | One avoidable level — `AppointmentActions`/`FinalizeChecklist` each self-wrap in a second bordered card inside an already-carded `FormSection` |
| 04 Calendar | 2 (excluding portal-wide header/stat-badge nesting) | Close to target already |
| 05 Availability | 4 (`AdminCard > gh-calendar-panel > header divider > legend dot`) | Acceptable — the one true card-in-card (AdminCard wrapping the week-grid's own chrome) is a reasonable single nesting level, not flagged for flattening |
| 06 Patients | 1 | Flat — nothing to fix |
| 07 Patient Record | 2 (verified from an input up to `<body>`) | Reasonable; the one real issue is `HistorySection` containing multiple `DocTypeGroup`s each with their own table (card-in-card, but justified — genuinely different datasets) |
| 08 Services | 2 (card → inline pill) | Flat; the fold problem here is vertical space budget, not nesting |
| 09 Forms | 2 (card → row/field-block) | Within range, nothing to flatten |
| 10 Messages | 2 (pane → chat bubble) | **Positive reference example** — flat thread rows, no per-row card, no redundant stat strip |
| 12 Invoices | shallow (row-level pill/button repetition inflates the raw element count to 104, not the nesting depth) | Not a structural problem — table pill/button count is inherent to a payment-status table |
| 13 Reports | shallow (23 surface elements, no pathological nesting) | 5-tile stat row is the main "excessive cards" candidate, not depth |
| 14 Profile picker | 2 | Flat |
| 15 Profile (country editor) | **4** (`page > card > tile > pill/badge` inside the ProfileInsight block) | One level over target — fix is deletion of the whole ProfileInsight strip (15-002), not flattening |
| 16 Security | 2 | One of the leanest pages in the portal |
| 17 Confidentiality | 2 | Flat, same pattern as Security |

**Rule derived from the evidence:** a card is justified only when its content is genuinely heterogeneous from its siblings (the registration sub-card on Patient Record, the generated-docs history section on Appointment Details) or independently actionable. Homogeneous repeats (appointment rows, template rows, invoice rows) get dividers/typography, never a second card layer — this already holds correctly on pages 06, 09, 10, and should be the template applied when flattening 02, 03, and 15.

## 3. Status vocabulary inconsistent — lexicon table

**Owner ruling (Fable decision, binding):** single status lexicon table needed, P1. Evidence of actual divergence, collected from the page files:

| Concept | List-page label | Detail-page / other-page label | Where observed |
|---|---|---|---|
| Booking/appointment state | "BOOKED – WAITING PAYMENT", "BOOKING CONFIRMED", "CANCELLED", "CONCLUDED" | "Created", "Sent", "Contacted", "Concluded", "Cancelled" (same enum, different label set in the status `<select>` and rail) | Appointments list (02) vs Appointment Details (03) — the same `REQUEST_RECEIVED` enum value renders as "BOOKED – WAITING PAYMENT" on one page and "Created" on the other |
| Consultation status badge (day-agenda row) | — | "Request Received" truncates to "Request Recei…" with no ellipsis, clipped by a fixed `max-w-[92px]` fighting a sibling `Video` icon | Calendar day agenda (CAL-04-006) |
| Verb for reopening a blocked slot | "Reopen day" (day-agenda sheet button) | "Re-open" (Time-off form button) / `reopenSlotTitle` tooltip (no hyphen vs hyphen, inconsistent across 3 call sites) | Calendar (CAL-04-009 §21) |
| "Selected" vs "Bookable" service counts | Both show identical numbers when no request is pending/rejected | — | My Services (08-006) — not a mislabel, but a redundant-looking pair that reads as broken data when they coincide |
| Payout amount | "Not set" (table cell, sortable column) | — | Invoices (12-001) — accurate but unexplained; a doctor cannot tell "not set" from "broken" |

**Recommendation for the lexicon table itself (not yet built):** one shared label map (doctor-portal locale bundle) consumed by both the Appointments list and the Appointment Details rail/select, replacing the two independently-maintained string sets found in `page.tsx:69-75` (detail) vs the list's `doctorAppointmentView`/`doctorAppointmentViewTone` mapping (`lib/api/appointment-status-labels.ts:68-99`).

## 4. Pill / border / radius findings

- **Status pills** are the one thing done consistently right across the portal: every page audited pairs color with a text label or icon (never color-only) — Appointments (02), Availability legend (05), Invoices (12), Forms "Shared" badge (09), Security enabled/disabled state (16), Confidentiality accepted state (17). No fix needed on this dimension.
- **Icon badges** (`.gh-portal-icon-badge`) repeat the identical rounded-square treatment on every `StatCard`/`SectionHeader` across the portal — not wrong, but the same generic bar-chart glyph regardless of what the tile represents (dashboard's 3 stat cards, Patients' 3 stat cards, Patient Record's 3 stat cards) reduces the icon's signal value to zero. Low-priority, portal-wide, batch-fixable by giving `AdminSummaryStrip` a per-metric icon prop.
- **Toolbar swatch buttons** in `RichTextHtmlField` (shared with admin) are unnamed icon-only controls at ~24px, below the 44px touch-target guideline (15-008) — a shared-component a11y fix, not doctor-portal-local.
- **Hardcoded Tailwind palette leak:** the profile-editor verification badge uses `border-emerald-200 bg-emerald-50 text-emerald-700` directly instead of the portal's `gh-status-*` tokens (15-016, Low) — a theme-fidelity violation per `RESPONSIVE_DESIGN_SYSTEM_PLAN`.

## 5. Standard patterns already correct, worth reusing as the template

| Pattern | Reference page | Why it's the template |
|---|---|---|
| Flat list rows (no card-per-item) | Messages (10) thread list, Patients (06) table, Dashboard (01) today's-schedule/notifications panels | Divided `<li>` rows with a border-top only; no per-row shadow/radius |
| Quick-action row | Dashboard (01) bottom "Patients / Forms / Invoices" row | Plain link row with an icon tile, no card chrome at all — the flattest, best surface in the portal; recommended as the template for flattening card-per-item patterns elsewhere |
| Two-pane list+detail | Messages (10) `MessagesInbox` | Correct shape for a triage inbox, no tabs/steps needed |
| Native `<input type=date/month>` for filters | Invoices (12), Reports (13) | Correct use of native controls over a custom picker — no keyboard-trap risk |
| Save/finalize semantics | Appointment Details (03) three-tier model (Save draft / Save & sign / Finalize) | Clear scope per button; the recommended fix here is dialog-styling and button-disable state, never the underlying model |

## 6. Mobile transformation

No new glass/backdrop-filter classes were introduced by any doctor-portal recommendation in this audit — the portal-wide `@media (pointer: coarse)` and `@supports not (backdrop-filter)` fallback-block obligation from `CLAUDE.md` therefore does not apply to any change proposed here. The one CSS-correctness bug with mobile-transformation impact is the shared `WeekCalendar` `min-w-0` clipping bug (05-001), which is a flex/grid-shrink fix, not a new glass class.

## 7. Empty states, loading, feedback

- `AdminEmptyState` is used consistently and correctly across list pages (Appointments 02, Patients 06, Forms 09, Notifications 11) — no complaint on the empty-state *pattern* itself.
- Loading-skeleton shape mismatches were found on 2 pages: Dashboard's `CommandBand` accepts a `loading` prop that `page.tsx` never passes (01, §12 12-001), and Forms' `loading.tsx` renders a generic 4-column table skeleton for a page that is actually a 2-card grid (09-005) — both produce a layout jump on first paint, not a missing state.
- Save/error banners are inconsistently announced to assistive tech: Patient Record's status/clinic alert banners correctly use `role="alert"`/`role="status"` (07, confirmed pass); Profile's `MessageBanner` is a plain `<p>` with no live-region role (15-009); Invoices' upload-validation error has no `aria-describedby` back to the file input (12, §20).
