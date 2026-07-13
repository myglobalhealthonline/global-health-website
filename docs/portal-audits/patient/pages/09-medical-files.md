# 09 — Medical Files

## 1. Page Identification

- **Name**: Medical Files
- **Route**: `/account/medical-files`
- **Entry points**: Patient sidebar → Care → "Medical files"; breadcrumb `Account > Medical Files`
- **Role**: Patient
- **Related frontend files**:
  - `frontend/app/(auth)/account/medical-files/page.tsx` (server shell, passes i18n strings)
  - `frontend/app/(auth)/account/medical-files/MedicalFilesClient.tsx` (all logic/UI, client component)
  - `frontend/app/(auth)/account/medical-files/loading.tsx`
  - `frontend/app/api/account/medical-documents/[...path]/route.ts` (Next.js API proxy to backend)
- **Shared components**: `AdminSummaryStrip`, `PageHeader` (from `portal-atoms`), `DocumentRow` (`frontend/components/DocumentRow.tsx`), `PortalTabs` (`frontend/components/PortalTabs.tsx`)
- **APIs observed** (via Playwright network capture):
  - `GET /api/account/medical-documents` → **404** (confirmed both on cold load and after explicit `waitForResponse`)
  - `POST /api/account/medical-documents` → not exercised (blocked by brief: no real uploads), but same routing bug applies (see 09-001)
  - `GET /api/account/medical-documents/{id}/download` → not exercised (no documents exist to download)
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop, laptop, tabletl, tabletp, mobile, smobile, short (all 7)
- **Account data state**: 0 documents in every one of the 5 tabs — **but this is not a genuine empty state**. It is a routing bug (see 09-001): the list/upload endpoint 404s for every request, so the account's real document count cannot be determined from this page. Marked accordingly throughout.

## 2. Page Purpose

Central repository for all medical-document exchange between patient and clinic: patient-uploaded reports, doctor-uploaded exam results, exam requests, prescriptions (as files, distinct from page 08's structured prescription data), and consult summaries — organized by category with per-document download.

## 3. Primary User Tasks (priority order)

1. Download a specific doctor-provided document (result, request, prescription file, summary).
2. Upload a personal report/test result for the doctor to see ahead of a consultation.
3. Browse/scan documents by category.
4. Bulk-download all documents in a category.

## 4. Current Page Structure (top-to-bottom)

1. `PageHeader` — eyebrow, H1 with `FileText` icon, description.
2. `AdminSummaryStrip` — 4 stat cards (Uploaded / Results / Requests / Prescriptions — note: 5 tabs exist but only 4 stat cards; "Consult Summaries" has no matching stat card).
3. `PortalTabs` — 5 tabs: My Reports, Doctor Results, Exam Requests, Prescriptions, Consult Summaries.
4. Conditional: `UploadForm` card — **only rendered on the "My Reports" tab**.
5. Document list area: loading skeleton → `AdminEmptyState`-style empty block → or list of `DocCard` rows with a "Download all" button above them.

## 5. Current Container Hierarchy (indented tree; mark unnecessary levels)

```
div.gh-patient-page.gh-patient-medical-files-page
├── header.gh-portal-page-header (PageHeader)                    [necessary]
├── section.gh-admin-summary-strip                               [necessary, but see §9 — 4 cards for 5 tabs]
│   └── div.gh-admin-summary-item × 4
├── div[role=tablist].gh-portal-tabs (PortalTabs)                [necessary]
├── div.mb-6  (conditional, "My Reports" tab only)                ← unnecessary single-purpose wrapper
│   └── form.gh-patient-form-card.gh-card  (UploadForm)          [necessary]
└── (loading | empty | list)
    ├── div.gh-patient-empty-state.gh-card  (loading skeleton)   [necessary while !loaded]
    ├── div.gh-patient-empty-state.gh-patient-medical-empty.gh-card  (empty state)
    │   └── img + text                                           [necessary]
    └── div.gh-patient-doc-list
        ├── div.flex.justify-end  ("Download all" button)        [necessary]
        └── div.gh-patient-doc-card.gh-card × N  (DocCard)
            └── DocumentRow (icon well + title/meta + actions)   [necessary]
```

- The `div.mb-6` wrapping `UploadForm` is a single-child, single-purpose spacing wrapper — not harmful but removable (the margin can live on the form itself).
- **Missing container, not extra**: `PortalTabs` sets `aria-controls="gh-tabpanel-{value}"` on each tab button, but no element in this tree has `id="gh-tabpanel-*"` or `role="tabpanel"` — `PortalTabPanel` exists in the shared component (`frontend/components/PortalTabs.tsx:144-168`) precisely to provide this, but `MedicalFilesClient` doesn't use it; it conditionally renders raw divs instead. This breaks the tab/panel ARIA relationship (see 09-004).

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Page load, list fetch | Network | `waitForResponse` on `/api/account/medical-documents` | **404** | Entire feature (list + upload) is broken — 09-001 | Network log (script output) |
| Tab: "Doctor Results" | Tab button | Clicked | Switched to empty state "No doctor results yet" (after proper fetch-settle wait) | Generic empty copy identical across all 5 tabs (09-005) | `09-medical-files-desktop-postfetch-doctor-results-02.png` |
| Tab: "Exam Requests" | Tab button | Clicked | Switched, empty state (same generic copy) | 09-005 | `09-medical-files-desktop-tab-exam-requests-01.png` |
| Tab: "Prescriptions" | Tab button | Clicked | Switched, empty state | 09-005 | (captured, not enumerated separately) |
| Tab: "Consult Summaries" | Tab button | Clicked | Switched, empty state | 09-005 | (captured, not enumerated separately) |
| Upload form: submit with empty required fields | Button click (`Upload`) | Clicked with no file/title | Browser-native required-field validation blocked submit (no request sent) | Works as expected — no issue | `09-medical-files-desktop-upload-empty-submit-01.png` |
| File input (`type="file"`) | Focus only, no file selected (per brief: do not upload) | Focused | Native OS picker affordance present; not opened (avoided per brief — clicking would open OS file dialog outside Playwright's control) | N/A | `09-medical-files-desktop-file-input-focus-01.png` |
| "Download all" button | Button, code-derived | Not clicked (0 documents present in every category due to 09-001) | N/A | Sequential per-file `fetch` + `URL.createObjectURL` + synthetic anchor click loop with a 300ms delay between downloads (`downloadDoc`, `MedicalFilesClient.tsx:66-78,289-296`) — reasonable ponytail-flagged approach for low file counts, but would 404 today given 09-001 | N/A — code-derived |
| Per-document "Download" button | Button, code-derived | Not reachable (0 documents) | N/A | Same `downloadDoc` path | N/A |
| Heading outline | A11y probe | Playwright `h1..h6` walk | `H1: Medical files`, `H4: Upload a report`, and empty-state title rendered as `<p className="font-semibold">` (NOT a heading at all) | Inconsistent — page 08's empty-state titles are `<h3>` via `AdminEmptyState`, but this page hand-rolls its own empty block with a `<p>` instead of a heading, and jumps H1→H4 with no H2/H3 | Console output |
| Tab strip keyboard nav | A11y probe | Code inspection of `PortalTabs.tsx:81-95` | Arrow-key/Home/End roving-tabindex implemented correctly | No issue | N/A — code-derived, correct |

## 7. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| `09-medical-files-desktop-default-01.png` | 1440×900 | Default, top | Header + stat strip + tabs + upload form | 09-002 |
| `09-medical-files-desktop-default-02.png` | 1440×900 | Default, scrolled | Empty "My Reports" list under the upload form | 09-005 |
| `09-medical-files-desktop-postfetch-01.png` | 1440×900 | After confirmed fetch settle | Baseline once the 404 has resolved and `loaded=true` | 09-001 |
| `09-medical-files-desktop-postfetch-doctor-results-02.png` | 1440×900 | Doctor Results tab, post-fetch | Confirms empty state (not a stuck skeleton) once timing is controlled | 09-001, 09-005 |
| `09-medical-files-desktop-tab-exam-requests-01.png` | 1440×900 | Exam Requests tab | Same generic empty copy | 09-005 |
| `09-medical-files-desktop-upload-empty-submit-01.png` | 1440×900 | Upload form, blocked submit | Native validation works | — |
| `09-medical-files-desktop-file-input-focus-01.png` | 1440×900 | File input focused | Focus ring visible | — |
| `09-medical-files-mobile-default-01.png` | 390×844 | Default, top | Stat strip stacks to 1 column; tab strip starts to clip | 09-003 |
| `09-medical-files-short-default-01.png` | 1366×650 | Short viewport | Upload form title row visible but form fields clipped below fold | 09-003 |

## 8. UX Problems

### 09-001 — Medical document list and upload are completely non-functional (API route can never match the base path)
- **Severity**: Critical
- **Category**: Functional bug (not a UX-polish item, but the root cause of every "empty" screenshot on this page)
- **Browser evidence**: `GET http://localhost:3000/api/account/medical-documents -> 404` observed via `page.on("response")` on cold load and again with an explicit `page.waitForResponse(...)` guard (ruling out a timing artifact) — see console output captured during audit; visually every tab and the "My Reports" list shows "No … yet" (`09-medical-files-desktop-postfetch-01.png`, `-doctor-results-02.png`).
- **Root cause (code-derived, high confidence)**: The proxy route lives at `frontend/app/api/account/medical-documents/[...path]/route.ts`. In Next.js App Router, a folder named `[...path]` is a **required** catch-all segment — it does not match the parent path with zero extra segments. The route's own logic anticipates a bare call: `isAllowed()` explicitly allows `GET` and `POST` with `segments.length === 0` for "base list" and "upload" (`route.ts:9-19`), and `MedicalFilesClient.tsx:260` fetches exactly `/api/account/medical-documents` (no trailing segment) for the list, and `:148` POSTs to the same bare path for upload. Because the folder is `[...path]` and not the optional catch-all `[[...path]]`, Next.js 404s the bare `/api/account/medical-documents` request before the route handler's own allow-list logic ever runs. Only sub-paths like `/api/account/medical-documents/{id}/download` (2 segments) actually reach the handler.
- **User impact**: No patient can ever see their uploaded/shared documents, and no patient can ever successfully upload a report — the entire feature is dead in production-equivalent code, not just "no data yet." Every empty state on this page is misleading (implies "you have no documents" when the real state is "the app can't reach your documents").
- **Recommended resolution**: Rename the route folder from `frontend/app/api/account/medical-documents/[...path]/` to `frontend/app/api/account/medical-documents/[[...path]]/` (optional catch-all) so the bare path resolves `params.path` to `undefined`/`[]` and reaches the existing, already-correct `isAllowed()`/`proxy()` logic. No other code changes needed — `GET(req, { params })` already does `(await params).path ?? []`, which already handles the `undefined` case correctly once the route can actually match.

### 09-002 — Stat strip has 4 cards for 5 tabs; "Consult Summaries" has no counter
- **Severity**: Medium
- **Category**: Information hierarchy / weak affordance
- **Browser evidence**: `09-medical-files-desktop-default-01.png` — visually compare the 4 stat cards (Uploaded/Results/Requests/Prescriptions) against the 5 tabs (My Reports/Doctor Results/Exam Requests/Prescriptions/Consult Summaries).
- **Root cause**: `MedicalFilesClient.tsx:321-329` — `AdminSummaryStrip` items array has 4 entries; `TABS` array (`:27-58`) has 5. `countFor("consult-summaries")` is never called.
- **User impact**: A patient scanning the stat strip has no at-a-glance count for consult summaries and may not realize that category exists until they click through every tab.
- **Recommended resolution**: Either add a 5th stat card for Consult Summaries, or (preferred, ties into §11/§14) remove the stat strip entirely and show per-tab counts as badges on the `PortalTabs` items instead (the primitive already supports a `badge` prop — `PortalTabs.tsx:9`).

### 09-003 — Upload form and category tabs compete for the same fold on short/mobile viewports
- **Severity**: Medium
- **Category**: Responsive / space misuse
- **Browser evidence**: `09-medical-files-short-default-01.png` (1366×650) — header, 4-card stat strip, and tab strip consume the entire viewport height; the upload form's "Title"/"Type" fields are the last visible row with "Description," "File," and the "Upload" button clipped below the fold, requiring a scroll before a patient can even see the full form they're about to fill in.
- **Root cause**: Same as 08-002's pattern — stat strip is a fixed vertical cost paid on every viewport regardless of value; on this page it's compounded by the tab strip below it.
- **Recommended resolution**: Collapse/remove the stat strip (see 09-002) to reclaim vertical space; consider making the upload form collapsed-by-default behind a "+ Upload" trigger (it's a secondary task per §3) rather than always-expanded above the list.

### 09-004 — Tabs are missing their ARIA tabpanel relationship
- **Severity**: Medium
- **Category**: Accessibility
- **Browser evidence**: Code-derived — `PortalTabs.tsx:109-112` sets `aria-controls="gh-tabpanel-{value}"` on every tab button, but `MedicalFilesClient.tsx:339-389` renders the panel content as plain conditional `<div>`s with no `id="gh-tabpanel-*"` and no `role="tabpanel"`. The shared `PortalTabPanel` component (`PortalTabs.tsx:144-168`) exists specifically to fill this gap and is not used here.
- **User impact**: Screen reader users get a tab whose `aria-controls` points at a non-existent element ID — the tab/panel relationship is broken, so AT cannot announce "you are now in the Doctor Results panel" the way it would with a correctly wired `role=tabpanel`.
- **Recommended resolution**: Wrap each conditional content block in `<PortalTabPanel value={tab.id} activeValue={activeTab}>`, matching the `id`s `PortalTabs` already expects.

### 09-005 — Identical generic empty-state copy across all 5 categories
- **Severity**: Low
- **Category**: Microcopy
- **Browser evidence**: `09-medical-files-desktop-postfetch-doctor-results-02.png` ("No doctor results yet" / "Uploaded reports, prescriptions, requests, and summaries will appear here.") vs `09-medical-files-desktop-tab-exam-requests-01.png` — description line is byte-identical regardless of active tab.
- **Root cause**: `MedicalFilesClient.tsx:367-369` — hardcoded generic sentence, only the title (`currentTabConfig?.label`) is tab-specific.
- **User impact**: Minor — the description gives no category-specific guidance (e.g. "Exam requests your doctor creates will appear here for you to complete" vs. the generic catch-all).
- **Recommended resolution**: Add a short per-tab description string to the `TABS` config array and render it instead of the shared sentence.

## 9. Visual Design Problems

- `DocCard` (populated-list row, code-derived — 0 rows exist due to 09-001) wraps a `DocumentRow` in its own `gh-card` panel per document (`MedicalFilesClient.tsx:90`) — same card-in-a-list pattern flagged on page 08 (08-001): every document gets a full bordered/shadowed card instead of a plain divided row, which will look heavy once real documents populate the list (5+ stacked cards, each with its own shadow).
- Stat-strip icon badges (`BarChart3` generic bar-chart glyph, same icon on every card per `atoms.tsx:203`) carry no semantic meaning per category — decorative only, adds visual noise without information.

## 10. Information Hierarchy Problems

- The upload form ("Upload a report") is the single largest, topmost piece of *content* on the page (bigger than any single document row would be) even though uploading is the secondary task (§3, priority 2) behind downloading existing documents (priority 1). A patient arriving to find a doctor's result sees a full form before any list.
- "Download all" sits in a plain `flex.justify-end` div with no visual separation from the document list below it — easy to miss as a distinct bulk action versus the first document's own download button directly beneath it.

## 11. Section Ordering Review

**Current order**: 1) Header 2) Stat strip 3) Tabs 4) Upload form (My Reports tab only) 5) Document list.

**Recommended order**: 1) Header 2) Tabs (with per-tab count badges replacing the stat strip) 3) Document list 4) Upload form, collapsed behind a trigger, only on "My Reports" tab.

**Reasoning**:
- Stat strip removed from top position and folded into tab badges — same reasoning as page 08 (§11 there): it duplicates counts visible one section below and costs significant vertical space for low information value (09-002, 09-003).
- Document list moved above the upload form: downloading/reviewing existing documents is the primary task (§3 priority 1); uploading is priority 2. The list should not require scrolling past a full form first.
- Upload form collapsed by default: keeps the primary task (reviewing) uncluttered while still making upload one click away (a "+ Upload a report" button that expands the existing form in place).

## 12. Tabs, Steps, or Sectioning Recommendation

Keep `PortalTabs` as the sectioning mechanism (correct choice for 5 mutually-exclusive document categories) but:
- Default tab: keep "My Reports" as default — matches the current behavior and is the tab a returning patient most likely wants (their own uploads).
- Wire each tab's `badge` prop with the live count (already supported by the primitive, currently unused here) instead of the separate 4-card stat strip.
- Wrap panel content in `PortalTabPanel` for correct ARIA wiring (09-004).

## 13. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (unchanged).
2. `PortalTabs` — 5 tabs, each with a live count `badge`.
3. `PortalTabPanel` per tab, containing:
   - Document list (`divide-y` rows, not per-row cards — see §14) or empty state, with tab-specific empty copy (09-005).
   - "Download all" button, right-aligned, only rendered when the list is non-empty.
4. On "My Reports" only: collapsed "+ Upload a report" trigger below the list, expanding the existing form in place.

## 14. Proposed Container Simplification

- `AdminSummaryStrip` (4 cards): **remove**; replace with `PortalTabs` `badge` counts (5-way, fixes 09-002 for free).
- `DocCard`'s `gh-card` wrapper per document: **flatten** to a `divide-y` row (same fix pattern as 08-001) — keep `DocumentRow` internals, drop the outer per-row card.
- `div.mb-6` single-purpose wrapper around `UploadForm`: **remove**; apply spacing directly to the form.
- Missing `PortalTabPanel`: **add** — wraps each tab's content, fixes 09-004.

## 15. Responsive Findings

- **desktop/laptop/tabletl**: Stat strip 4-up, tabs wrap acceptably, upload form 2-column grid collapses correctly per `sm:grid-cols-2` in `UploadForm`. No layout breakage found.
- **tabletp (768)**: Holds; tabs remain on one row.
- **mobile (390) / smobile (375)**: Stat strip → 1 column (`09-medical-files-mobile-default-01.png`); tab strip's 5 items start to horizontally overflow/clip at the right edge ("Exam" visibly truncated at the viewport edge in the mobile screenshot) — `PortalTabs` has no visible scroll affordance (no fade/arrow) to indicate more tabs exist off-screen.
- **short (1366×650)**: Upload form clipped below the fold on first paint (09-003).

## 16. Accessibility Findings

- 09-004: broken `aria-controls` → non-existent `id` relationship between tabs and panels.
- Empty-state title uses `<p className="font-semibold">` rather than a heading (`MedicalFilesClient.tsx:364`) — inconsistent with page 08's `AdminEmptyState` (`<h3>`) and with normal document outline expectations; screen-reader users can't jump to "empty state" via heading navigation on this page the way they could on page 08.
- Heading outline: `H1` → `H4` ("Upload a report", `UploadForm.tsx:172`) — skips H2/H3 entirely.
- File input has an associated `<label>` wrapping it (`<label className="block sm:col-span-2"><span>File *</span><input type="file".../></label>`, `MedicalFilesClient.tsx:206-216`) — correctly associated, no issue.
- Tab overflow on mobile (§15) has no keyboard/AT-visible indication that additional tabs exist beyond the visible row.

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| "Uploaded reports, prescriptions, requests, and summaries will appear here." (identical on every tab) | Tab-specific sentence, e.g. "Exam requests your doctor creates will appear here." | See 09-005. |
| "No my reports yet" (title, awkward grammar — "my" from the tab label "My Reports" concatenated with "yet") | "No reports uploaded yet" | Current phrasing reads oddly ("No my reports yet") because it's built by lower-casing the tab label directly; needs its own string. |
| "Download all" | Keep, but disambiguate visually from the per-row "Download" (currently both use the same button style/icon at different scales) | Reduce risk of accidental bulk download when a single-file download was intended. |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| API route folder | `frontend/app/api/account/medical-documents/[...path]/route.ts` | Rename directory to `[[...path]]` | Page-specific (this feature only) | **High priority, low technical risk** — single rename, but unblocks a Critical functional bug | Trivial |
| `DocCard` row treatment | `frontend/app/(auth)/account/medical-files/MedicalFilesClient.tsx` | Remove per-row `gh-card`, use `divide-y` | Page-specific | Low | Small |
| Tab badges + stat strip removal | `frontend/app/(auth)/account/medical-files/MedicalFilesClient.tsx` | Wire `PortalTabItem.badge`, delete `AdminSummaryStrip` block | Page-specific | Low | Small |
| `PortalTabPanel` wiring | `frontend/app/(auth)/account/medical-files/MedicalFilesClient.tsx` | Wrap tab content in `PortalTabPanel` | Page-specific (uses existing shared primitive) | Low | Small |
| Per-tab empty copy | `frontend/app/(auth)/account/medical-files/MedicalFilesClient.tsx`, `TABS` config | Add `emptyDescription` per tab | Page-specific | Low | Trivial |

## 19. Recommended Implementation Order

1. **09-001 (route rename)** — Critical, ship immediately and in isolation; unblocks all real-data testing for this page. This should not be bundled with any visual changes so it can be verified/deployed on its own.
2. 09-004 (`PortalTabPanel` wiring) — small, fixes real a11y break.
3. 09-002/09-003 (stat strip → tab badges) — do after 09-001 so counts are real when tested.
4. Row flattening (matches §14) and 09-005 copy — cosmetic, can batch together.

## 20. Acceptance Criteria

- [ ] `GET /api/account/medical-documents` (no trailing segment) returns 200 with the patient's real documents, not 404.
- [ ] `POST /api/account/medical-documents` (upload) reaches the backend and returns a real success/error response, not 404.
- [ ] Every tab's `aria-controls` target ID exists in the DOM with `role="tabpanel"`.
- [ ] Document rows render as divided list rows, not individually-carded panels.
- [ ] Each tab shows a live count (badge or equivalent) matching its actual document count.
- [ ] Empty-state copy differs per category (not the identical sentence in all 5 tabs).
- [ ] On a 1366×650 viewport, the document list (or its empty state) is reachable within one scroll.

## 21. Open Questions

- Once 09-001 is fixed, does the backend actually return data for this account, or is the account genuinely empty? Could not verify — the frontend bug masked the true backend state throughout this audit.
- Is "Consult Summaries" intentionally excluded from the stat strip, or was it added to `TABS` after the stat strip was last touched? Could not determine from git history within audit scope.
- Does product intend "Download all" to eventually use a real zip/archive endpoint (the code has a `ponytail:` comment at `MedicalFilesClient.tsx:284-288` explicitly deferring this)? Flagging for roadmap awareness, not a defect.
