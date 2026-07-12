# 08 — My Services (Doctor Portal)

## 1. Page Identification
- **Name:** My Services
- **Route:** `/doctor/services`
- **Entry points:** Sidebar → Practice → "My Services"; no other deep links found in codebase.
- **Role:** DOCTOR only (`verifyDoctorAccess` on all backend routes).
- **Workflow position:** Onboarding/ongoing practice-management task — doctor declares which bookable services they want to offer; admin approves/rejects.
- **Frontend files:**
  - `frontend/app/(doctor)/doctor/services/page.tsx` (RSC, data fetch)
  - `frontend/app/(doctor)/doctor/services/loading.tsx` (skeleton)
  - `frontend/app/(doctor)/doctor/services/_components/service-selection-form.tsx` (client, all interactivity)
- **Shared components used:** `AdminCard`, `AdminSummaryStrip`, `PageHeader`, `Pill` (all `@/components/portal-atoms`), `PortalTabs` (`@/components/PortalTabs`).
- **APIs observed:**
  - `GET /api/doctor/services?locale=` — `backend/src/routes/doctor.route.ts:738`, service list + assignments, resolved via `listDoctorSelectableServices` (`backend/src/modules/doctor-services/doctor-services.service.ts:76`).
  - `GET /api/doctor/services/approval-required` — declared but not called from this page (page reads `approvalRequired` from the list payload instead).
  - `POST /api/doctor/services` — `backend/src/routes/doctor.route.ts:789`, body `{ serviceIds: string[] }`, calls `saveDoctorServiceSelections`.
- **Date audited:** 2026-07-12
- **Viewports tested:** desktop 1440×900, laptop 1280×720, tabletl 1024×768, tabletp 768×1024, mobile 390×844, smobile 375×667, short 1366×650 (screenshot matrix) — interaction testing done at laptop.
- **States tested:** default (populated, browser), dirty/unsaved-toggle (browser), admin-locked click-block (browser), multi-country tab switch (browser), keyboard focus (browser, partial), empty state (code-derived only, `grouped.length === 0` branch), error state (code-derived only, `!result.ok` branch), loading state (code-derived only, `FormSkeleton`).

## 2. Page Purpose
Lets a doctor declare which of the admin-defined, country-scoped services (GP / Specialist / Prescription kinds) they are qualified and willing to provide. Health-test services are admin-only and never appear here. The doctor's selection either becomes bookable immediately or goes to admin for approval, depending on a per-country `BookingSetting.doctorServiceSelectApproval` flag.

## 3. Primary Doctor Tasks (priority order)
1. See which services are currently active/bookable under their name, and their payout for each.
2. See which requests are pending admin approval.
3. Request a new service (self-select) they are qualified for.
4. Understand that admin-assigned services cannot be removed by the doctor.
5. Submit supporting qualification documents to admin (via email, not in-app).

## 4. Clinical/Operational Importance
Medium-high. This gates what a doctor can be booked for and what they get paid (`doctorAmountCents` is admin-set and read-only here). Wrong assumptions about "selected" vs "bookable" directly affect a doctor's income and workload, and — because approval is compliance-gated — errors here have downstream clinical-scope implications (a doctor appearing bookable for a service they are not credentialed for, or the reverse).

## 5. Current Page Structure (top-to-bottom)
1. Breadcrumb "Doctor › Services" + locale switcher + notification bell + account menu (portal shell, not page-specific)
2. Compliance reminder banner ("Complete your compliance setup" / 2FA), dismissible — portal-wide, not page-specific
3. `PageHeader`: eyebrow "PRACTICE", title "My services", description
4. `AdminSummaryStrip`: 4 stat cards — Selected / Bookable / Awaiting approval / Markets
5. Explainer paragraph (well/soft card) — approval-required copy branch
6. Inline success/error message (conditional, post-save)
7. Country tabs (only if doctor practices in 2+ countries) — Czechia / Ireland in test account
8. Kind tabs (GP / Specialist / Prescription), each with a badge showing selected-count
9. Service card grid (2-col on `sm:`, single column below) — one card per service
10. "After you save: contact admin team" note (approval-required branch only)
11. Form actions row: "Unsaved changes" label + "Save & submit request" button (right-aligned)

## 6. Current Container Hierarchy (indented tree)
```
page
└─ PageHeader (flat text block, no card)
└─ AdminSummaryStrip (row of 4 cards)              ← surface level 1
   └─ each stat card                                ← surface level 1 (siblings, not nested)
└─ gh-doctor-service-selection (grid, no visible chrome)
   ├─ gh-doctor-service-explainer (bordered/bg card) ← surface level 1
   ├─ message banner (bordered, conditional)         ← surface level 1
   ├─ PortalTabs (country) — pill row, not a card
   ├─ PortalTabs (kind) — pill row, not a card
   ├─ gh-doctor-service-grid (CSS grid, no chrome)
   │  └─ gh-doctor-service-card × N (bordered card)  ← surface level 1
   │     └─ status Pill (rounded chip)               ← surface level 2 (small, inline — acceptable)
   ├─ gh-doctor-service-next-step (bordered/bg card)  ← surface level 1
   └─ gh-doctor-form-actions (flat row, no card)
```
**Assessment:** flat and reasonable — max 2 visible surface levels (card → inline pill), no card-in-card. The 4-stat-strip is the one area worth a second look: at `short` (1366×650) the strip pushes the actual actionable content (tabs + cards) entirely below the fold (see §19). No nesting to flatten; the structure itself is not the problem, vertical space budget is (see §11/§18).

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Country tab (Czechia/Ireland) | `role=tab` button | Click | Switches `activeCountryId`, re-scopes `scopedItems`, resets active kind tab to first non-empty group | Selected/Bookable/Awaiting/Markets stat strip does NOT re-scope to the active country tab — see 08-002 | `08-services-laptop-ireland-tab-01.png` |
| Kind tab (GP/Specialist/Prescription) | `role=tab` button | Click | Filters grid to that kind, badge shows count of locally-selected services in that kind | None | `08-services-laptop-default-01.png` |
| Service card (doctor-selectable, unlocked) | `role=checkbox` button | Click | Toggles local `selected` set; card border turns primary-colored, checkmark fills in; `dirty` becomes true, "Unsaved changes" label + enabled Save button appear | Pill text still reads "NOT REQUESTED" post-toggle (correct — pill reflects saved state, not local) but nothing on the card itself communicates "this will be requested on save" beyond the checkmark — no distinct micro-copy | `08-services-laptop-selected-dirty-01.png` |
| Service card (admin-assigned, `status:"active"`) | `role=checkbox` button, `disabled` | Click (`force`) | No-op — `aria-checked` unchanged (`true`→`true`), verified via Playwright | Visually looks clickable (cursor still shows as card, only `opacity-90` + `cursor-not-allowed` differentiates; lock icon+"Admin-assigned" text is the only real signal) | — |
| "Save & submit request" | button | Click | **Not exercised** (would POST and mutate real assignment state — out of safety scope) | Button correctly `disabled` until `dirty` | — |
| Search / filter | — | — | **Not present on this page** | N/A | — |
| Keyboard Tab | keyboard | 2× Tab from load | Focus moves through sidebar → header controls → banner dismiss → tabs; visible focus ring present | Not exhaustively tabbed through all 14+ cards | `08-services-laptop-focus-01.png` |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Default populated (CZ, 14 admin-active + 1 unrequested) | ✅ | ✅ | Renders correctly | — |
| Multi-country (Ireland, all 15 unrequested) | ✅ | ✅ | Renders correctly, but see 08-002 (stat strip) | 08-002 |
| Dirty/unsaved toggle | ✅ | ✅ | Checkbox/border update instantly, Save enables, "Unsaved changes" label appears | — |
| Admin-locked click | ✅ | ✅ | Correctly blocked | — |
| Empty (`grouped.length === 0`, e.g. doctor with 0 countries or all kinds filtered out) | — | ✅ (`service-selection-form.tsx:189-204`) | Renders `gh-doctor-empty-state` card with icon + copy | Code-derived only — not reachable with this test account |
| Error (`!result.ok`) | — | ✅ (`page.tsx:14-32`) | Shows `AdminCard` with warning-styled message, no retry action | Code-derived only; no "Retry" button — 08-004 |
| Loading | — | ✅ (`loading.tsx` → `FormSkeleton sections={2}`) | Next.js RSC streaming skeleton | Code-derived only |
| Save success | — | ✅ (`service-selection-form.tsx:174-180`) | Green success banner, `router.refresh()` | Not triggered (would mutate data) |
| Save failure / network error | — | ✅ (`:167-183`) | Red warning banner with server message or generic "network error" copy | Not triggered |
| Navigate-away-with-unsaved-changes guard | — | ✅ (absent) | **No `beforeunload`/route-guard exists** — `dirty` state is purely visual | 08-005 |

## 9. Screenshots
| Filename | Viewport | State | Reason | Issues |
|---|---|---|---|---|
| `08-services-desktop-default-01.png` | 1440×900 | default | matrix | — |
| `08-services-laptop-default-01.png` | 1280×720 | default | matrix / primary reference | 08-002, 08-006 |
| `08-services-tabletl-default-01.png` | 1024×768 | default | matrix | — |
| `08-services-tabletp-default-01.png` | 768×1024 | default | matrix | — |
| `08-services-mobile-default-01.png` | 390×844 | default | matrix | 08-001 (fold) |
| `08-services-smobile-default-01.png` | 375×667 | default | matrix | 08-001 |
| `08-services-short-default-01.png` | 1366×650 | default | matrix, fold check | 08-001 (severe — 0 service cards visible) |
| `08-services-laptop-ireland-tab-01.png` | 1280×720 | Ireland country tab active | interaction | 08-002 |
| `08-services-laptop-selected-dirty-01.png` | 1280×720 | one service toggled locally, unsaved | interaction | confirms dirty-state design works |
| `08-services-laptop-focus-01.png` | 1280×720 | after 2× Tab keypress | a11y spot check | — |

## 10. UX Problems

**08-001 — Compliance banner + explainer eat the entire fold; zero service cards visible without scrolling on `short` (1366×650) and both mobile viewports.**
- Severity: Medium
- Evidence: Browser — `08-services-short-default-01.png` shows only the header, compliance banner, and 4 stat cards; the actual actionable content (tabs + service grid) is entirely below the fold. Same on `08-services-mobile-default-01.png` (only reaches the 4th stat card).
- Doctor impact: A doctor landing on this page for the first time to actually pick services has to scroll past two "throat-clearing" surfaces before reaching the task.
- Root cause: The compliance banner is portal-wide (rendered above `PageHeader` in every doctor page, not this page's doing) but combines with this page's own explainer card + 4-stat strip to push content down. `service-selection-form.tsx:209-230` (explainer) duplicates copy already present in `PageHeader`'s `description` prop (`d.services.description`) and the strip.
- Recommendation: Merge the explainer paragraph into the `PageHeader` description (one is redundant with the other — see §14) and drop it as a separate bordered card. This alone recovers ~70px of vertical space at every breakpoint. See §17/§18 for the full restructure.

**08-002 — Summary strip counts are portal-wide (all countries), not scoped to the active country tab, and this is not communicated.**
- Severity: Medium
- Evidence: Browser — on the Ireland tab (`08-services-laptop-ireland-tab-01.png`), every one of the 15 Irish services shows "NOT REQUESTED", yet the stat strip above still reads "Selected: 14 / Bookable: 14" (both are Czechia's numbers, unchanged from the Czechia tab). Code — `page.tsx:33-36` computes `active`/`pending`/`selected`/`countries` over `result.data.items` (all countries) once, server-side, before the client-side country tab exists.
- Doctor impact: A doctor scanning Ireland's tab with the strip still saying "14 selected" can reasonably conclude some Irish services are already selected, when in fact all 14 are Czech. For a doctor practicing in more markets this gets worse.
- Root cause: Stat strip is computed server-side from the full multi-country list; country scoping happens entirely client-side in `service-selection-form.tsx:120-123`. The two aren't wired together.
- Recommendation: Either (a) move the stat computation into the client component and recompute it from `scopedItems` when `activeCountryId` changes, or (b) if per-country totals are 4 more numbers than the page needs, add small per-tab badges only (already present — see country tab `badge` in `service-selection-form.tsx:258`) and remove the global strip's implication of being "the current view" by adding "(all markets)" to each stat's `hint`. (a) is the correct fix since the badges already prove the per-country data is available client-side.

**08-003 — Service names/descriptions render in the country's local language (Czech) even though the doctor's UI chrome is set to "EN".**
- Severity: Low (likely intentional, but undocumented)
- Evidence: Browser — CZ tab shows "Cestovní medicína", "Duševní zdraví online" etc. fully in Czech while every surrounding UI string (labels, buttons, pill text) is English. Code — `doctor-api.ts:621-627`: `fetchDoctorServices` threads the `gh_locale` cookie (portal UI language), defaulting to the country's default locale server-side if unset; `doctor-services.service.ts` resolves service translations via `resolveTranslation` against that locale, which for CZ falls back to the base (Czech) record if no EN translation row exists for that service.
- Doctor impact: A doctor working in EN UI but assigned to Czechia sees mixed-language content; harmless if the doctor reads Czech (plausible for a CZ-licensed doctor) but confusing for a portal that otherwise commits to EN.
- Root cause: Service translations are per-country-completeness-dependent; Czech-market services may simply lack EN translation rows, so `resolveTranslation` falls back to the base language.
- Recommendation: Not a code bug — flag as a content/translation-completeness gap (add EN translation rows for CZ services in the CMS) rather than a frontend fix. Mark for Fable/content-ops review only if cross-language consistency is a stated goal.

**08-004 — Error state has no retry action.**
- Severity: Low
- Evidence: Code — `page.tsx:14-32`, on `!result.ok` renders a static warning message with no button to retry the fetch.
- Doctor impact: A transient network/API failure strands the doctor with no in-page recovery; they must manually reload.
- Recommendation: Add a "Try again" button that calls `router.refresh()`, consistent with the pattern already used after successful save (`service-selection-form.tsx:180`).

**08-005 — No unsaved-changes navigation guard.**
- Severity: Medium
- Evidence: Code — `dirty` (`service-selection-form.tsx:138-142`) drives only a text label and button `disabled` state; no `beforeunload` listener, no route-change interception (e.g. via a shared "confirm navigation" primitive).
- Doctor impact: A doctor who toggles several services, then clicks a sidebar link before saving, silently loses their selections with no warning.
- Recommendation: Add a `beforeunload` handler when `dirty` is true (covers tab-close/refresh) and, if a shared "leave-with-unsaved-changes" primitive exists elsewhere in the portal (worth checking — not found in this page's imports), reuse it for in-app navigation too.

**08-006 — "Selected" and "Bookable" show the same number (14/14) with no visual distinction of what differs, which can read as a redundant stat.**
- Severity: Low
- Evidence: Browser — `08-services-laptop-default-01.png`, both cards show "14". Code — `page.tsx:33-35`: `selected` = has any assignment (pending, active, or rejected all count via `!= null`), `active` = status === "active" only.
- Doctor impact: When all selections happen to be active (the common steady state), two of the four stat cards are numerically redundant, wasting scan time and the fold-space flagged in 08-001.
- Recommendation: Keep both (they diverge meaningfully once a request is pending/rejected) but consider collapsing to 3 cards by merging "Selected" into a caption under "Bookable" (e.g. "14 bookable · 14 requested total") when `pending === 0`, or simply accept the redundancy as intentional given DESIGN system's explicit "keep stat strips" instruction — no strong recommendation to remove.

## 11. Visual Design Problems
- Explainer card (§209-230) and `PageHeader` description are two separate green-tinted/plain-text blocks saying overlapping things back-to-back — reads as a doubled intro. See 08-001/§14.
- Card grid uses `sm:grid-cols-2` only — no 3-column layout even on very wide desktop (1440px+), leaving significant unused horizontal space with 14+ cards to scan. Not flagged as a defect (2-col keeps card copy readable) but worth reconsidering for `xl:` breakpoints given the long list length.
- Status pill vocabulary ("ACTIVE", "AWAITING APPROVAL"/pending shown as "statusAwaiting", "NOT REQUESTED") is otherwise consistent and color-coded, no complaint there.

## 12. Information Hierarchy Problems
- Per 08-002, the top-of-page stat strip currently outranks (in trust) the tab-scoped reality below it — a doctor's first read of "what do I have" is wrong once they're on a 2nd/3rd country tab.
- Within each card, admin lock state ("Admin-assigned" + lock icon) is the least prominent element (bottom-right, small text) despite being the single most important thing that differentiates an editable card from a read-only one. Consider promoting it near the status pill (top-right) instead of the footer meta row.

## 13. Current Section Order
1. Compliance banner (portal-wide)
2. PageHeader (eyebrow/title/description)
3. Stat strip (4 cards)
4. Explainer paragraph
5. Message banner (conditional)
6. Country tabs (conditional)
7. Kind tabs
8. Service card grid
9. Next-steps note (conditional)
10. Form actions

## 14. Recommended Section Order (+ reasons)
1. PageHeader (title + single, merged description — folds in the explainer copy from §4)
2. Stat strip (re-scoped to active country per 08-002; keep — owner directive to keep stat strips)
3. Country tabs (if multi-country) — promote above kind tabs since it's the higher-level scope
4. Kind tabs
5. Message banner (only when present — should slide in above the grid, not push stats down)
6. Service card grid
7. Next-steps note (conditional)
8. Form actions

Reasoning: removing the standalone explainer card (merged into PageHeader) and moving the compliance banner's effective footprint doesn't change since it's shell-level — the concrete win is one fewer full-width bordered block before the task content, addressing 08-001 directly without restructuring anything else.

## 15. Tabs/Steps/Sectioning Recommendation
No new tab/step system needed — the page already uses two tab layers (country, kind) appropriately for a doctor with multiple markets/kinds. Do not add a third tier. The one structural change worth making: when a doctor is single-country, the empty country-tab row currently just doesn't render (`multiCountry` check) — verified correct, no action needed.

## 16. Save & Finalization Recommendation
- Single save button, single scope (all locally-toggled changes across whatever tab is active — the entire `selected` set, not just the visible tab) — this is correct and already implemented as one flat `Set<string>` shared across tabs, verified by code (`service-selection-form.tsx:103`, `157-185`) and the multi-country toggle test.
- Gap: add the `beforeunload` guard from 08-005.
- Gap: add retry-on-error from 08-004.
- No multiple-save-buttons issue — this page passes that check cleanly.

## 17. Proposed Page Structure (exact top-to-bottom)
1. Compliance banner (unchanged, portal shell)
2. PageHeader — title "My services", single merged description combining current `description` + explainer copy (approval-required branch keeps its conditional sentence)
3. Stat strip — 4 cards, values recomputed from `scopedItems` (active country) with a `hint` line clarifying "in {country name}" when multi-country
4. Country tabs (conditional)
5. Kind tabs
6. Inline message banner (save result) — appears directly above grid, not below stats
7. Service card grid
8. Next-steps note (approval-required only)
9. Form actions (unsaved-changes label + Save button, right-aligned — already correct per portal-wide standing rule)

## 18. Proposed Container Simplification
- **Remove:** the standalone `gh-doctor-service-explainer` card (`service-selection-form.tsx:209-230`) — merge its text into `PageHeader`'s `description`.
- **Keep:** stat strip (per owner directive), service cards (justified — each card carries 5+ independent data points: name, summary, duration, base price, doctor fee, status, lock state; a table would need to either scroll horizontally or drop fields).
- **Keep:** next-steps note and message banner as-is — both are single-purpose, appropriately lightweight.
- **No flattening needed** — hierarchy is already shallow (see §6); the fix here is section removal/merge, not de-nesting.

## 19. Responsive Findings (per viewport)
- **Desktop 1440×900 / Laptop 1280×720:** Fine. 2-col grid, all stats visible without scroll.
- **Tabletl 1024×768 / Tabletp 768×1024:** Fine, cards remain 2-col via `sm:` breakpoint (768px+), readable.
- **Mobile 390×844 / Smobile 375×667:** Cards correctly collapse to 1-col (grid default below `sm:`). Confirmed 08-001 — stat strip pushed below fold; user must scroll past compliance banner + header + 3 of 4 stat cards before any task content.
- **Short 1366×650:** Worst case of 08-001 — literally zero service cards or tabs visible on load; the entire viewport is consumed by chrome + explainer + stats.

## 20. Accessibility Findings
- Service cards use `role="checkbox"` + `aria-checked` on a `<button>` — correct ARIA pattern, verified via Playwright `aria-checked` toggling true/false and staying `true` when locked.
- Focus-visible ring present on tab/interactive elements (spot-checked via `08-services-laptop-focus-01.png`, not exhaustively tabbed through all 15 cards in this pass — recommend a full keyboard-only pass before shipping any changes).
- Icon-only elements: none identified as icon-only actionable controls on this page (lock icon is decorative, paired with "Admin-assigned" text — good).
- Status is not color-only: pill uses text label ("ACTIVE"/"AWAITING APPROVAL"/etc.) alongside color, correct.
- Not tested: full contrast spot-check via `page.evaluate` (not run this pass — recommend follow-up given the light-green explainer/well backgrounds against muted text).

## 21. Content & Microcopy Findings
| Current | Recommended | Reason |
|---|---|---|
| "Selected" / "Bookable" / "Awaiting approval" / "Markets" | Keep — clear, standard portal vocabulary | — |
| "Admin-assigned" (footer tag) | Consider "Assigned by admin — cannot be changed here" as a tooltip/title (currently only `title` isn't set on the badge itself, just implied by the lock icon) | Clarify *why* it's locked, not just that it is |
| "After you save: contact admin team" / "Email your supporting documents..." | Keep, but consider a mailto: link or a "Contact admin" button here given the page already has no other next-action | Currently pure prose with no actionable element |
| Explainer sentence duplicating PageHeader description | Merge (see §14) | Redundant copy |

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| `DoctorServicesPage` | `frontend/app/(doctor)/doctor/services/page.tsx` | Merge explainer copy into `PageHeader.description`; add retry button on error branch | No (page-local) | Low | Small |
| `DoctorServiceSelectionForm` | `frontend/app/(doctor)/doctor/services/_components/service-selection-form.tsx` | Remove standalone explainer block; recompute stat strip from `scopedItems`; add `beforeunload` guard on `dirty` | No (page-local) | Low-Medium (stat recompute touches existing tested logic) | Medium |
| `AdminSummaryStrip` | `frontend/components/portal-atoms` (exact file not opened this pass) | No change needed — consumer-side recompute is sufficient | Yes (shared across portals) | — | — |
| `PortalTabs` | `frontend/components/PortalTabs` | No change needed | Yes | — | — |

## 23. Backend or Business-Logic Impact
- Frontend-only for all recommendations in this file — no backend/API changes required. Stat re-scoping (08-002) is purely a client-side recompute of data already delivered in one payload (`fetchDoctorServices` returns all countries' items in one call; no new endpoint needed).
- 08-003 (Czech content in EN UI) is a content/translation-data issue, not a code change — needs CMS/content-ops action, not frontend engineering.

## 24. Recommended Implementation Order
1. 08-002 (stat strip re-scope) — highest doctor-facing confusion risk, pure client-side fix.
2. 08-001/§14/§17 (merge explainer into header) — quick win, frees vertical space.
3. 08-005 (unsaved-changes guard) — data-loss prevention, moderate effort.
4. 08-004 (retry on error) — small polish.
5. 08-003 — hand off to content-ops, not an implementation task for this codebase.

## 25. Acceptance Criteria (measurable)
- Switching country tabs updates all 4 stat-strip values within the same render (no stale numbers from a different country).
- On `short` (1366×650), at least the country/kind tab row is visible without scrolling after the merge in §17 (full grid still requires scroll — acceptable, task-entry point must be visible).
- Attempting to navigate away (in-app link click or tab close) with `dirty === true` triggers a confirmation prompt.
- Error state includes an actionable retry control that re-fetches without a full page reload.
- No change to admin-lock behavior, save payload shape, or approval workflow (regression check — `POST /api/doctor/services` body/contract unchanged).

## 26. Open Questions
- Is Czech-only content for CZ services (08-003) intentional (doctor is expected to read Czech) or a translation-completeness gap that content-ops should close? Needs a product decision, not a code fix either way.
- Should the stat strip show country-scoped or global totals by default — is "how many services am I offering across ALL my countries" ever a question a doctor asks, in which case a "(all markets)" toggle might be better than pure re-scoping? Flagged for Fable/product review — this is a UX-model decision, not a bug.
- Does any other portal page already implement a reusable "unsaved changes" navigation guard that 08-005 should reuse instead of inventing a page-local one? Not found in this page's import graph — worth a portal-wide grep before implementing.
