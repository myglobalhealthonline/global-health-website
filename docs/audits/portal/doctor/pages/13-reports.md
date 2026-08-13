# 13 — Doctor Reports

## 1. Page Identification
- **Name**: Doctor Reports
- **Route**: `/doctor/reports`
- **Entry points**: Sidebar nav "Reports" (Finance group)
- **Role**: DOCTOR
- **Workflow stage**: Periodic self-review / export for external accounting — "how much did I do / earn in period X"
- **Frontend files**:
  - `frontend/app/(doctor)/doctor/reports/page.tsx` (server component: filters, aggregate tiles, breakdown tables)
  - `frontend/app/(doctor)/doctor/reports/_components/report-exports.tsx` (client: dataset dropdown + Excel/PDF export)
  - `frontend/app/(doctor)/doctor/reports/_components/csv-button.tsx` (client: CSV of the on-screen aggregates)
  - `frontend/app/(doctor)/doctor/reports/error.tsx`, `loading.tsx`
- **Shared components**: `PageHeader`, `AdminEmptyState`, `SectionHeader` (`components/portal-atoms`)
- **APIs observed**: `fetchDoctorReports()` → `GET /api/doctor/reports` (aggregates: appointments total, signed consults, follow-ups, distinct patients, revenue by currency, by-status/by-type breakdowns); `GET /api/doctor/reports/export?dataset=payout|services|patients|appointments&format=excel|pdf` — **same endpoint the Invoices page uses for the payout statement**, see 13-005.
- **Date audited**: 2026-07-12
- **Viewports tested**: desktop, laptop, tabletl, tabletp, mobile, smobile, short (matrix) + interaction shots at desktop
- **States tested (browser)**: default (30-day window, 1 appointment), filtered to an out-of-range date (0 results), dataset dropdown switched to "Patients". **Code-derived only**: `error.tsx` boundary, loading skeleton, export failure.

## 2. Page Purpose
Aggregate practice-analytics dashboard (appointment counts, signed consults, follow-ups, distinct patients, paid revenue) for a filterable date range, plus a raw-row export tool (Excel/PDF/CSV) for external accounting.

## 3. Primary Doctor Tasks (priority order)
1. Check aggregate activity for a period (how many appointments, how many patients)
2. Check paid revenue for a period
3. Export the underlying rows for accounting/tax purposes
4. Break down by status or consultation type

## 4. Clinical/Operational Importance
Low. Purely retrospective, non-actionable analytics — nothing here changes what the doctor does next. Its only operational value is as a source-of-truth export for the doctor's own bookkeeping.

## 5. Current Page Structure (top-to-bottom)
1. Compliance banner (shared)
2. Hero card: "PRACTICE ANALYTICS · Reports" + "Export CSV" button inline in the header
3. Filter card (From/To dates, Type, Appt status, Payment, Apply)
4. "Download lists" card (dataset dropdown: Payout statement / Services / Patients / Appointments + Excel/PDF)
5. 5-tile stat row: Appointments / Signed consults / Follow-ups / Distinct patients / Revenue (paid)
6. 2-column breakdown: "By status" table, "By consultation type" table

## 6. Current Container Hierarchy
```
main
├─ compliance banner (gh-card)
├─ PageHeader hero (gh-card, Export CSV button inline)
├─ filter card (gh-card, form grid)
├─ download-lists card (gh-card)
├─ 5× Tile (gh-card each, in a row)
└─ 2× breakdown card (gh-card, each containing a plain <table>, no per-row cards — good)
```
`page.evaluate` surface count in `main`: **23** — consistent with 1 hero + 1 filter + 1 download card + 5 tiles + 2 breakdown cards + internal chrome (selects, buttons). No pathological nesting; the 5-tile row is the main "excessive cards" candidate (§10).

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| "Export CSV" (hero) | button | click (not clicked to avoid file download; code-reviewed) | Builds CSV client-side from already-fetched aggregate JSON, no network call | Naming collision with "Excel"/"PDF" buttons lower on the page — three different export affordances on one page (CSV of aggregates, Excel/PDF of raw rows) with no visual grouping distinguishing "summary export" from "raw-row export" | — |
| From/To date inputs | `<input type=date>` | set `2020-01-01`–`2020-01-02`, Apply | Reloads with `?from=&to=`, all tiles show 0, breakdown tables show `AdminEmptyState` | Good empty-range handling | `13-reports-desktop-empty-range-05.png` |
| Type / Appt status / Payment selects | `<select>` | (not exercised beyond default) | GET param filters | — | — |
| "Report" dataset dropdown | `<select>` | change to "Patients" | Updates local state, no page reload, changes `activeNote` text below | Fine — client-only, correctly scoped | `13-reports-desktop-dataset-patients-06.png` |
| Excel/PDF (download lists) | button | not clicked (real download) | code-reviewed | Same endpoint pattern duplicated with Invoices page — see 13-005 | — |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Default (last 30 days) | Yes | — | 1 appointment, 1 distinct patient, revenue "—" | — |
| Out-of-range filter (0 results) | Yes | — | All tiles 0, breakdown tables render `AdminEmptyState` twice (once per breakdown card) | 13-001 |
| Dataset dropdown switch | Yes | — | `activeNote` text updates correctly | — |
| `error.tsx` boundary | No | File exists (`reports/error.tsx`) — not triggered | code-derived |
| `loading.tsx` | No | File exists — not captured (resolves fast) | code-derived |
| Export failure (network error) | No | `report-exports.tsx:58-60` sets `error` state, shown as red text | code-derived |

## 9. Screenshots
| File | Viewport | State | Reason | Issues |
|---|---|---|---|---|
| `13-reports-default-desktop-default-01.png` | 1440×900 | default | baseline | 13-002 |
| `13-reports-default-laptop-default-01.png` | 1280×720 | default | matrix | — |
| `13-reports-default-tabletl-default-01.png` | 1024×768 | default | matrix | — |
| `13-reports-default-tabletp-default-01.png` | 768×1024 | default | matrix | — |
| `13-reports-default-mobile-default-01.png` | 390×844 | default | matrix | 13-004 (breadcrumb truncation) |
| `13-reports-default-smobile-default-01.png` | 375×667 | default | matrix | — |
| `13-reports-default-short-default-01.png` | 1366×650 | default | fold check | 13-003 |
| `13-reports-desktop-empty-range-05.png` | 1440×900 | out-of-range filter | empty-state check | — |
| `13-reports-desktop-dataset-patients-06.png` | 1440×900 | dataset switched to Patients | interaction check | — |

## 10. UX Problems
- **13-001 (Low)** — Out-of-range filter correctly zeroes all 5 tiles and shows an `AdminEmptyState` in *each* of the two breakdown cards independently — two near-identical empty-state blocks stacked side by side saying effectively the same thing ("no data for this range") twice. Could collapse to a single empty-state spanning both columns when the whole dataset is empty, rather than duplicating it per breakdown card. `page.tsx:236-245` (`BreakdownTable`) renders the empty state per-instance with no shared "whole page is empty" check.
- **13-002 (Medium)** — Filter card + "Download lists" card + 5-tile row = 3 more stacked full-width cards before the actual breakdown data, on top of the hero. Same chrome-before-content pattern as Invoices (12-002).
- **13-003 (Medium)** — At `short` (1366×650), the 5-tile stat row and both breakdown tables are entirely below the fold on load.
- **13-004 (Low)** — Mobile breadcrumb truncation, shared issue (see 11-004/12-005).
- **13-005 (Medium, structural — flag for Fable review)** — "Payout statement (last month)" is one of four options in this page's "Download lists" dataset dropdown, hitting the identical `dataset=payout` export the Invoices page already offers as a dedicated, better-contextualized step ("1 · Download your payout statement", with month picker defaulting sensibly and copy explaining it's the invoice basis). Here it's just one anonymous option in a 4-item dropdown ("Services provided" / "Patients" / "Appointments" / "Payout statement (last month)") with a generic Excel/PDF pair — no month picker at all, it's hardcoded to "last month" per the dropdown label. A doctor who wants last month's statement has two different UIs to get it, one clearly better than the other. See `12-invoices.md` §10 12-006 for the mirrored finding and recommendation.
- **13-006 (Low)** — "Export CSV" (hero, exports the on-screen aggregate summary) vs. "Excel"/"PDF" (download-lists card, exports raw underlying rows) are both labeled generically enough that the distinction ("totals" vs "rows") isn't obvious without reading the small print under the dataset dropdown ("Export the full underlying rows — not just the totals above"). A doctor scanning for "give me a spreadsheet" has 3 buttons with unclear differentiation.

## 11. Visual Design Problems
- 5 stat tiles in one row (`grid-cols-5` at `lg`) is the widest stat-strip in the audited doctor portal — on `laptop` (1280px) and `tabletl` (1024px) these compress to fit, cramming labels like "DISTINCT PATIENTS" into a ~200px tile.
- "REVENUE (PAID)" tile shows "—" (em dash) when there's no revenue in range — consistent with the rest of the portal's "no value" convention, no issue.

## 12. Information Hierarchy Problems
- Filters sit above both the aggregate tiles and the raw-row export card, meaning a doctor must set the same date range twice mentally (once understanding it drives the tiles below, a second time realizing the "Download lists" export uses the *same* filter state — this isn't obvious from the layout since the download card is visually a separate section, not connected to the filter card above it). Recommend a visible "Exporting: [date range] · [filters]" summary line on the download card so it's clear the export respects the filter state above it (`report-exports.tsx` does pass `filters` through, confirmed in code at `page.tsx:135`).

## 13. Current Section Order
1. Compliance banner
2. Hero (+ Export CSV)
3. Filter card
4. Download-lists card
5. 5-tile stat row
6. Breakdown tables (by status / by type)

## 14. Recommended Section Order (+ reasons)
1. Hero (kept)
2. Filter card (kept, first — it drives everything below)
3. 5-tile stat row (moved up, directly under filters) — the aggregate numbers are the primary "read" of this page; exports are secondary
4. Breakdown tables (kept below tiles — natural drill-down order: totals → breakdowns)
5. Download-lists card (moved to bottom, or merged into a page-level "Export" affordance near the hero) — exporting is the least-frequent action relative to just reading the numbers

## 15. Tabs/Steps/Sectioning Recommendation
Not needed as tabs — the page is a single coherent read (filter → numbers → breakdown), unlike Invoices' two-frequency-tier problem. The one structural change worth making is the export consolidation in 13-005/13-006.

## 16. Save & Finalization Recommendation
No save concept — filters are GET params, exports are stateless downloads. No changes needed.

## 17. Proposed Page Structure (exact top-to-bottom)
1. `PageHeader` (hero, keep Export CSV here as the "quick totals" export)
2. Filter card (unchanged)
3. 5-tile stat row (moved up)
4. Breakdown tables ×2 (unchanged, but single shared empty-state when the whole range is empty — 13-001)
5. "Export full data" card (renamed from "Download lists", dataset dropdown **drops** "Payout statement" per 13-005's resolution, keeps Services/Patients/Appointments) — moved to bottom

## 18. Proposed Container Simplification
- **Remove**: duplicate `AdminEmptyState` when both breakdown tables are empty simultaneously → single spanning empty-state
- **Move**: download-lists card to bottom (§14/§17)
- **Trim**: "Payout statement" option from the dataset dropdown per Fable-reviewed 13-005/12-006 resolution
- **Keep**: 5-tile row (owner explicitly keeps stat-strips per brief; these carry real, distinct numbers — no removal recommended), breakdown table structure (already flat, no per-row cards)
- **Max visible surface levels after change**: 2 (card + table/tile), unchanged from today — this page's nesting was never the problem, ordering and dedup were

## 19. Responsive Findings
| Viewport | Finding |
|---|---|
| desktop | Fine |
| laptop/tabletl | 5-tile row compresses labels (§11), still readable |
| tabletp | Tiles wrap to 2-up via `sm:grid-cols-2`, fine |
| mobile/smobile | Renders correctly, breadcrumb truncation (13-004) |
| short (1366×650) | Tiles + breakdowns below fold (13-003) |

## 20. Accessibility Findings
- Headings: `H1: Reports`, `H3: By status`, `H3: By consultation type` — correct order, no skipped levels (no H2 in between, but H1→H3 skip is a minor structural nit; `SectionHeader` likely renders H3 by convention across the portal, not reports-specific — not flagging as a one-off fix).
- Date inputs use native `<input type=date>` — good, no custom picker to test for keyboard traps.
- `BreakdownTable` rows are plain `<table><tr><td>` — correct semantic table, no ARIA needed.
- Dataset `<select>` has an associated `<label>` via `gh-field-label` — verified in DOM (`Report` label wraps the select).

## 21. Content & Microcopy Findings
| Current | Recommended | Why |
|---|---|---|
| "Export CSV" | "Export summary (CSV)" | Distinguish from raw-row Excel/PDF exports (13-006) |
| "Download lists" | "Export full data" | "Lists" is vague; doctors think in terms of rows/records, not "lists" |
| "Payout statement (last month)" (dropdown option) | Remove per 13-005, or if kept, add explicit month picker matching Invoices' UI | Hardcoded "last month" with no way to pick a different month is a functional gap versus the Invoices version which has a month picker |

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| `reports/page.tsx` | `frontend/app/(doctor)/doctor/reports/page.tsx` | Reorder sections, single shared empty-state, remove payout dataset option | No | Low | Low |
| `report-exports.tsx` | `frontend/app/(doctor)/doctor/reports/_components/report-exports.tsx` | Drop "payout" from `DATASETS` array (line 34-39) pending 13-005 resolution | No | Low | Low |
| `csv-button.tsx` | `frontend/app/(doctor)/doctor/reports/_components/csv-button.tsx` | Rename button label only | No | Low | Low |

## 23. Backend or Business-Logic Impact
Frontend-only. Removing "payout" from the client-side `DATASETS` dropdown doesn't touch the backend `dataset=payout` export endpoint (still needed by Invoices). No migration, no clinical/legal review.

## 24. Recommended Implementation Order
1. Section reorder (tiles above download card) — Low, isolated
2. Single shared empty-state for breakdowns — Low
3. Export-naming clarification (CSV vs Excel/PDF wording) — Low
4. Payout-dataset dedup with Invoices (13-005) — coordinate via Fable review, touches two pages
5. Shared breadcrumb fix — batch with 11-004/12-005

## 25. Acceptance Criteria (measurable)
- Breakdown section shows exactly one empty-state block (not two) when the filtered range has zero appointments.
- Stat tiles visible without scrolling at 1366×650 after reorder... [if not fully achievable given 5-tile row height, at minimum the first 2-3 tiles are visible on load].
- "Payout statement" download is reachable from exactly one page after the Fable-reviewed resolution of 13-005.

## 26. Open Questions — needs Fable review
- **Does this page earn its own nav slot, or should it merge into Invoices?** Per the brief's ask (#3 "whether the page earns its nav slot or belongs elsewhere"): Reports is pure read-only analytics + raw-data export; Invoices is the actionable billing workflow (upload, payment status). They're conceptually distinct (analytics vs. billing-actions) and both live under "FINANCE" in the sidebar already — recommend **keeping them as separate pages** but resolving the payout-statement duplication (13-005/12-006) so they stop overlapping in function. A full merge would bury Reports' aggregate/breakdown view (its unique value) under Invoices' row-level table.
- Same duplication-resolution question as raised in `12-invoices.md` §26 — which page keeps the payout-statement download, and does the other get a cross-link or nothing.
