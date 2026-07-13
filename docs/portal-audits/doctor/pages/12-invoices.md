# 12 — Doctor Invoices

## 1. Page Identification
- **Name**: Doctor Invoices and payments
- **Route**: `/doctor/invoices`
- **Entry points**: Sidebar nav "Invoices" (Finance group)
- **Role**: DOCTOR
- **Workflow stage**: Monthly/periodic billing admin — download payout statement → raise own invoice → upload it → track per-consultation payment status
- **Frontend files**:
  - `frontend/app/(doctor)/doctor/invoices/page.tsx` (server component: filters, sort, table)
  - `frontend/app/(doctor)/doctor/invoices/_components/payout-invoice-panel.tsx` (client: statement download, invoice upload, uploaded-list)
  - `frontend/app/(doctor)/doctor/invoices/loading.tsx`
- **Shared components**: `PageHeader`, `AdminSummaryStrip`, `AdminEmptyState`, `Pill` (`components/portal-atoms`), `ColumnPriorityTable` (`components/ColumnPriorityTable`)
- **APIs observed**: `fetchDoctorInvoicesList()` → `GET /api/doctor/invoices` (list, filters, sort, pagination); `GET /api/doctor/payout-invoices` (uploaded list); `POST /api/doctor/payout-invoices` (upload, multipart); `GET /api/doctor/payout-invoices/download?key=`; `GET /api/doctor/reports/export?dataset=payout&format=` (statement download — **shared endpoint with the Reports page**, see 12-006)
- **Date audited**: 2026-07-12
- **Viewports tested**: desktop, laptop, tabletl, tabletp, mobile, smobile, short (matrix) + interaction shots at desktop
- **States tested (browser)**: default (12 invoices), filtered-to-empty (`?status=REFUNDED`), sorted-by-amount, upload-with-no-file validation error. **Code-derived only**: upload success, upload server-error, loading, list fetch error.

## 2. Page Purpose
Gives the doctor visibility into what they're owed (admin-set per-service payout, not the patient's gross price) per consultation, a way to download a monthly statement to build their own invoice, a way to upload that invoice for admin processing, and payment-status tracking per consultation.

## 3. Primary Doctor Tasks (priority order)
1. Download this month's/last month's payout statement
2. Upload the invoice they raised against it
3. Check payment status of individual consultations (paid/pending/unpaid/failed)
4. Filter/sort the consultation list by date range or status

## 4. Clinical/Operational Importance
Medium — this is real money to the doctor (their pay), so accuracy and clarity outrank polish. No PHI beyond patient name/email tied to a consultation, which is already visible elsewhere (appointments).

## 5. Current Page Structure (top-to-bottom)
1. Compliance banner (shared)
2. Hero card: "BILLING VISIBILITY · Invoices and payments"
3. **`PayoutInvoicePanel`** — one big card with 3 internal steps (1. download statement, 2. upload invoice, 3. uploaded-invoices list)
4. 4-stat `AdminSummaryStrip`: Visible invoices / Visible value / Paid / Needs attention
5. Filter card (status, from, to, Apply/Reset)
6. Table (`ColumnPriorityTable`): Patient, When, Type, Amount, Payment, Status, Open

## 6. Current Container Hierarchy
```
main
├─ compliance banner (gh-card)
├─ PageHeader hero (gh-card)
├─ PayoutInvoicePanel (gh-card, p-6)
│   ├─ step 1 block (border-t on steps 2/3, not its own card — good, flattened)
│   ├─ step 2 block (form)
│   └─ step 3 block (ul rows, no per-row card — good)
├─ AdminSummaryStrip (gh-card × 4, in a row)
├─ filter card (gh-card, form grid)
└─ table card (gh-card, p-0)
    └─ ColumnPriorityTable rows (Pill badges + Open button per row)
```
`page.evaluate` surface count in `main`: **104** bordered/radius/shadow elements — dominated by per-row `Pill` status badges and "Open" buttons (12 rows × ~2-3 bordered elements each + table chrome), not by deep nesting. Real nesting depth (page > card > row) is shallow and fine; the count is a symptom of row-level pill+button repetition, not a structural problem.

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Statement "Month" input | `<input type=month>` | pick month | value updates, `max` capped at current month | none | `12-invoices-default-desktop-default-01.png` |
| "Excel" / "PDF" (statement) | button | click | calls `fetchDownload` → `GET /api/doctor/reports/export?dataset=payout&format=...` | Not clicked to avoid a real download in this pass; code-reviewed only | — |
| Upload "File" input | `<input type=file>` | (not selected) | — | — | — |
| "Upload" button | submit | click with no file | client-side validation: red text "Choose a file to upload." | Correct, no network call — good guard | `12-invoices-desktop-upload-validation-error-06.png` |
| Status filter select | `<select>` | change to `REFUNDED` + Apply | navigates to `?status=REFUNDED`, table replaced by empty state "No invoices match these filters" + "Clear filters" link | Good empty state, but screenshot framing missed it (below fold) — verified via DOM text dump instead | `12-invoices-desktop-filtered-empty-05.png` (dump-verified, not visually captured) |
| "WHEN" / "AMOUNT" column headers | link (sort toggle) | click AMOUNT | navigates to `?sortBy=amount&sortOrder=desc`, chevron icon updates | Works, but **every row shows "Not set"** for Amount (`doctorAmountCents == null` for all 12 rows in this account) — sorting by a column that's entirely "Not set" is a no-op with no visible feedback that nothing changed | `12-invoices-desktop-sorted-by-amount-07.png` |
| "Open" link (row) | link | click | → `/doctor/appointments/:id` | fine | — |
| "Reset" (filters) | link | click | → `/doctor/invoices` (clears all params) | fine | — |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Default, 12 invoices | Yes | — | All render, all "Not set" amount | 12-001 |
| Filtered to 0 results | Yes | — | Correct empty state with "Clear filters" CTA | — |
| Upload, no file | Yes | — | Inline red validation, no network call | — |
| Sort by amount | Yes | — | URL updates, chevron flips, no visible row reorder (all ties/nulls) | — |
| Upload success | No | `payout-invoice-panel.tsx:142-147` — resets file input, calls `refresh()` | not exercised (would create a real upload) | code-derived |
| Upload server error | No | `:142-144` shows `json.message ?? strings.uploadFailedPeriod` in red text | not triggerable safely | code-derived |
| "Your uploaded invoices" loading | No | `:227` shows "Loading…" text (no skeleton) | not captured (resolves too fast) | code-derived |
| List fetch error (`result.ok === false`) | No | `page.tsx:273-278` shows `gh-status-warning` card | not triggerable | code-derived |

## 9. Screenshots
| File | Viewport | State | Reason | Issues |
|---|---|---|---|---|
| `12-invoices-default-desktop-default-01.png` | 1440×900 | default | baseline | 12-002 |
| `12-invoices-default-laptop-default-01.png` | 1280×720 | default | matrix | — |
| `12-invoices-default-tabletl-default-01.png` | 1024×768 | default | matrix | — |
| `12-invoices-default-tabletp-default-01.png` | 768×1024 | default | matrix | — |
| `12-invoices-default-mobile-default-01.png` | 390×844 | default | matrix | 12-005 (breadcrumb truncation) |
| `12-invoices-default-smobile-default-01.png` | 375×667 | default | matrix | — |
| `12-invoices-default-short-default-01.png` | 1366×650 | default | fold check | 12-003 |
| `12-invoices-desktop-filtered-empty-05.png` | 1440×900 | filtered, 0 results | empty state (framing missed the below-fold empty block; DOM text confirms correct copy) | — |
| `12-invoices-desktop-upload-validation-error-06.png` | 1440×900 | upload validation | error state | — |
| `12-invoices-desktop-sorted-by-amount-07.png` | 1440×900 | sorted by amount | sort interaction | 12-001 |

## 10. UX Problems
- **12-001 (High)** — Every visible invoice row shows Amount = "Not set" (`row.doctorAmountCents == null` for all 12 rows, `page.tsx:166`). The "Amount" column, the "AMOUNT" sort control, and the "VISIBLE VALUE" summary tile (`€0.00`/`US$0.00`) are all rendered as if payouts are routinely populated, but for this doctor **none** are. This isn't a bug in this page's code — the payout amount is admin-set elsewhere — but the page gives no explanation *why* every row is unset, no CTA, and lets you sort by a column that's uniformly empty. A doctor seeing 12 "Not set" rows and a €0.00 total has no way to tell from this page whether that's expected (admin hasn't processed yet) or broken. **Recommendation**: when `attentionCount` includes "unset payout" rows (already computed at `page.tsx:129-133`), surface a one-line explanatory note near the summary strip, e.g. "X consultations are awaiting an admin-set payout amount" — reuse the existing `attentionCount` value instead of just showing it as a bare number.
- **12-002 (Medium)** — Five stacked full-width cards (compliance banner, hero, payout panel, 4-stat strip, filter card) before the table — a doctor has to scroll past ~1400px of chrome on a 900px-tall viewport to see a single row of actual billing data. See `12-invoices-default-desktop-default-01.png`.
- **12-003 (Medium)** — At `short` (1366×650) the table is entirely below the fold; on load a doctor sees hero + payout panel + summary strip only, no billing rows at all without scrolling.
- **12-005 (Low)** — Mobile breadcrumb "Doctor › In…" truncates the current page name (shared `PortalShell` header issue, same as 11-004/13-004 — fix once, applies to all three audited pages and likely portal-wide).
- **12-006 (Medium, structural — flag for Fable review)** — The "Download your payout statement" step inside `PayoutInvoicePanel` (Invoices page) and the "Payout statement (last month)" option in `DoctorReportExports`'s "Download lists" dropdown (Reports page) hit the **exact same** dataset/endpoint (`GET /api/doctor/reports/export?dataset=payout&format=...`) with the same Excel/PDF outputs. A doctor can download their payout statement from two different pages in two different nav groups (Finance › Invoices, Finance › Reports) with no cross-link between them. See `13-reports.md` §10 for the mirrored finding.

## 11. Visual Design Problems
- `PayoutInvoicePanel` mixes three distinct actions (download / upload / list-of-uploads) inside one card separated only by thin top borders and numbered labels ("1 ·", "2 ·", "3 ·") — functions, but reads as a single dense form rather than three genuinely different actions.
- 4-stat `AdminSummaryStrip` includes "VISIBLE VALUE" showing a currency total that is always €0.00/US$0.00 for this account because no payouts are set (see 12-001) — a large, prominent zero-money number is visually alarming for a "how much am I owed" page.

## 12. Information Hierarchy Problems
- The doctor's most time-sensitive question — "did I get paid for X" — lives in the table's "Payment" column (Pill: PAID/UNPAID/PENDING/FAILED), which is column 5 of 7 and appears only after scrolling past the entire payout panel and stat strip. Payment status should be near the top of the visual hierarchy for a page literally named "Invoices and payments."

## 13. Current Section Order
1. Compliance banner
2. Hero
3. Payout/upload panel
4. Stat strip
5. Filters
6. Table

## 14. Recommended Section Order (+ reasons)
1. Hero (kept, condensed)
2. Stat strip (kept, but drop "VISIBLE VALUE" if it's routinely zero for most doctors — replace with "Awaiting payout" count, which is actionable; see 12-001)
3. Filters + Table (moved up) — the consultation-level payment status is the highest-frequency check; statement download/upload is a monthly task, not a daily one
4. Payout/upload panel (moved down, or collapsed behind a "Monthly statement" disclosure) — infrequent action doesn't need permanent top-of-page real estate

## 15. Tabs/Steps/Sectioning Recommendation
Convert the page into two tabs: **"Consultations"** (filters + table — default, daily-use) and **"Monthly statement"** (the existing 3-step download/upload panel — monthly-use). This directly addresses 12-002/12-003 (chrome-before-content) without deleting any functionality, and matches the frequency mismatch between the two tasks living on one page. Use `PortalTabs` (shared primitive per CLAUDE.md UI-primitives rule) — do not hand-roll.

## 16. Save & Finalization Recommendation
No true "save" on this page — upload is a single fire-and-forget POST, filters are GET params (no unsaved-state risk). No changes needed.

## 17. Proposed Page Structure (exact top-to-bottom)
1. `PageHeader` — condensed hero
2. `AdminSummaryStrip` — Paid / Needs attention / Awaiting payout (drop raw €0.00 total unless nonzero)
3. `PortalTabs`: **Consultations** (default) | **Monthly statement**
   - Consultations tab: filter card + table (current default view, unchanged)
   - Monthly statement tab: existing 3-step `PayoutInvoicePanel`, unchanged internals

## 18. Proposed Container Simplification
- **Keep**: filter card, table, `PayoutInvoicePanel`'s 3-step internal layout (already flattened, no change needed there)
- **Move**: `PayoutInvoicePanel` behind a tab (§15/§17)
- **Flatten**: none further needed at the row level — table pill/button count is inherent to a payment-status table, not excess wrapping
- **Max visible surface levels after change**: 2 (tab content + card), same as today minus the "5 cards before content" stacking

## 19. Responsive Findings
| Viewport | Finding |
|---|---|
| desktop/laptop | Table degrades to `ColumnPriorityTable`'s card view correctly at narrower widths (not directly observed here but confirmed via shared component contract) |
| tabletl/tabletp | Filter grid re-flows to 2-col correctly (`sm:grid-cols-2`) |
| mobile/smobile | Renders correctly; breadcrumb truncation (12-005) |
| short (1366×650) | Table entirely below fold on load (12-003) |

## 20. Accessibility Findings
- Sort links (`WHEN`/`AMOUNT`) are real `<a>` elements with visible chevron state — keyboard/AT accessible, good.
- Upload validation error is a plain red `<p>`, not associated with the file input via `aria-describedby` — a screen-reader user tabbing back to the file input after the error won't hear it announced contextually. Low-cost fix: add `aria-describedby` pointing at the error `<p>`'s id, and/or `role="alert"` on the error text so it's announced on appearance.
- Status Pills (`PAID`/`UNPAID`/etc.) use `withDot` — verified not color-only (text label always present alongside the tone dot).

## 21. Content & Microcopy Findings
| Current | Recommended | Why |
|---|---|---|
| "Not set" (amount) | Keep text, but add the explanatory note from 12-001 near the summary strip | Reduces "is this broken?" doubt |
| "VISIBLE INVOICES" / "VISIBLE VALUE" | Consider "This page" instead of "Visible" | "Visible" is vague — visible to whom, on what filter state? Current filtered-page context is a good hint but buried in the tiny "hint" subtext under each tile |
| "Open" (row button label) | Keep | Fine, consistent with other portal tables |

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| `invoices/page.tsx` | `frontend/app/(doctor)/doctor/invoices/page.tsx` | Wrap in `PortalTabs`, reorder sections, add attention-count explainer | No | Medium | Medium |
| `payout-invoice-panel.tsx` | `frontend/app/(doctor)/doctor/invoices/_components/payout-invoice-panel.tsx` | Move into "Monthly statement" tab content, no internal change | No | Low | Low |
| `PortalTabs` | `frontend/components/*` | Reused, no change expected | **Yes** | Low (read-only use) | Low |
| Upload error `<p>` | `payout-invoice-panel.tsx:221` | Add `role="alert"` / `aria-describedby` | No | Low | Low |

## 23. Backend or Business-Logic Impact
Frontend-only reorganization. The "why is amount unset" explainer is frontend-only using data already returned by the existing endpoint (`attentionCount` computed client-side from `doctorAmountCents == null`). No migration, no clinical/legal review — payout figures are financial, not PHI, and no computation changes, only presentation.

## 24. Recommended Implementation Order
1. Upload-error `aria-describedby`/`role="alert"` (Low, isolated)
2. "Awaiting payout" explainer near summary strip (Medium, addresses 12-001)
3. Tab split (Consultations / Monthly statement) — coordinate with Reports page (12-006) so the Fable review below covers both at once
4. Shared breadcrumb truncation fix (batch with 11-004/13-004)

## 25. Acceptance Criteria (measurable)
- Table content visible without scrolling at 1366×650 (short viewport) after the tab split.
- A doctor with 0 set payout amounts sees an explicit explanation, not a silent "Not set" × N.
- Upload validation error is announced to screen readers on appearance (verified via `role="alert"` presence).

## 26. Open Questions — needs Fable review
- **12-006 duplication**: should the "Download your payout statement" action live only on Invoices (remove from Reports' dataset dropdown) or only on Reports (remove from Invoices step 1)? Recommend keeping it on Invoices (closer to the upload step it feeds) and removing "Payout statement" as an option from Reports' generic dataset dropdown, replacing it with a one-line cross-link ("Need your payout statement? → Invoices"). This is an IA/page-merge-adjacent decision — flagging per brief §"structural/IA recommendation needing Fable review."
- Is "amount not set for all rows" the *normal* state for most doctors, or a data/workflow gap (admin not setting payouts promptly)? If normal, the explainer copy in 12-001 should say so plainly rather than sound like an error.
