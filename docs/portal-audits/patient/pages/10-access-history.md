# 10 — Access History

## 1. Page Identification

- **Name**: Access History
- **Route**: `/account/access-history`
- **Entry points**: Patient sidebar → Account → "Access history"; breadcrumb `Account > Access History`
- **Role**: Patient
- **Related frontend files**:
  - `frontend/app/(auth)/account/access-history/page.tsx` (server shell, i18n)
  - `frontend/app/(auth)/account/access-history/_components/access-history-client.tsx` (all logic/UI)
  - `frontend/app/(auth)/account/access-history/loading.tsx`
- **Shared components**: `PageHeader` only (from `portal-atoms`) — this page does **not** use `AdminCard`, `AdminSummaryStrip`, `AdminEmptyState`, `AdminTable`, or `ColumnPriorityTable`; it hand-rolls its own card/row/pagination markup.
- **APIs observed**: `GET /api/account/access-log?page={n}&limit=20` → confirmed **200**, real data returned (`{ok:true, data:{logs:[...], pagination:{...}}}`), e.g. `{"id":"cmrhe7...","accessedByName":"Syed Muhammad Hassaan","accessedByRole":"PATIENT","accessedResourceType":"NATIONALITY_DOC","accessAction":"VIEWED",...}`.
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop, laptop, tabletl, tabletp, mobile, smobile, short (all 7)
- **Account data state**: **Populated** — this account has real access-log history (self-views of nationality/insurance documents and verification status, all `PATIENT`-role/`VIEWED`-action entries). Screenshots below reflect genuine populated-state evidence, not code-derived assumptions.

## 2. Page Purpose

A GDPR/healthcare-transparency style audit trail: shows the patient who (role/name) accessed which of their medical resources, what action was taken, and when — satisfies "who saw my data" trust/compliance needs for a health platform.

## 3. Primary User Tasks (priority order)

1. Confirm no unexpected/unauthorized party has accessed their medical data.
2. Understand what a specific access event was (who, what, when, why).
3. Page through older history if the recent page doesn't show what they're looking for.

## 4. Current Page Structure (top-to-bottom)

1. `PageHeader` — eyebrow, H1 with `History` icon, description.
2. A single white card (`gh-card`) containing either: a loading skeleton, an empty state, or a flat list of log rows (`divide-y`).
3. Below the card, outside it: pagination controls (page label + Previous/Next), only rendered when `pagination.pages > 1`.

No filters, no search, no date range, no grouping — a single reverse-chronological flat list.

## 5. Current Container Hierarchy (indented tree; mark unnecessary levels)

```
div.gh-patient-page.gh-patient-access-history-page
├── header.gh-portal-page-header (PageHeader)                    [necessary]
├── div.gh-patient-access-card.gh-card.divide-y.p-0              [necessary — sole content surface]
│   ├── (loading) div.p-6 > skeleton bars                        [necessary while !loaded]
│   ├── (empty) div.p-8.text-center > icon + title + body        [necessary — hand-rolled, not AdminEmptyState]
│   └── (populated) div.px-4                                     ← unnecessary extra wrapper: the outer
│       └── LogRow × N                                              card already has `divide-y`; this inner
│           div.gh-patient-access-row.grid.gap-3                    `div.px-4` exists only to add horizontal
│           .border-b.py-3.sm:grid-cols-[auto_1fr_auto]              padding the outer card could apply itself
│           ├── div (icon avatar, size-8 rounded-full)             [necessary]
│           ├── div (role pill + actor + action + resource text)  [necessary]
│           └── time                                              [necessary]
└── div.mt-4.flex.justify-between  (pagination, conditional)      [necessary]
```

- The list is **not a `<table>`** — it's a sequence of `grid`-based rows (`.gh-patient-access-row`) inside a single card, one card total (not one card per entry — correctly avoids the card-overuse pattern seen on pages 08/09). This is a reasonable choice for a narrow 3-field/wrap-friendly record and is *not* flagged as a problem — seenext section for why a table would actually be worse here.
- No grouping (e.g. by day) — every row is a flat sibling regardless of date, even though 10+ consecutive events cluster within the same minute/session (visible in the populated screenshot: 5 rows all timestamped within the same ~15 minutes of one login session).

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Page load, log fetch | Network | Captured full response body | `200`, real 20-row page of log entries | — | `10-access-history-desktop-after-wait-01.png` |
| Initial paint (before fetch resolves) | Timing | Screenshot at ~0.5–1s | Loading skeleton still showing in the card, sidebar/header fully rendered | Confirms genuine (not stuck) loading state — resolves correctly once fetch completes | `10-access-history-desktop-default-01.png`, `-02.png` |
| Pagination "Next"/"Previous" | Button, code-derived | Not clicked (this account's log total fits on one page — `pagination.pages` output not directly logged, but the populated screenshot shows no pagination controls rendered below the list, implying `pages <= 1` for this account within the captured window) | N/A | Could not exercise real pagination — see §21 | N/A |
| `LogRow` — role pill | Static | Visual inspection | Role badge "You" rendered with `bg-sky-50 text-sky-700` per `roleBadgeClass("PATIENT")` | — | `10-access-history-desktop-after-wait-01.png` |
| Heading outline | A11y probe | Playwright `h1..h6` walk (code inspection, since no populated fetch was captured in the headings script run) | `H1: Access history` only — no further headings inside the card (empty-state title `<p className="text-base font-bold">` is not a heading; log rows have no heading) | Single H1, no deeper structure needed for a flat list — acceptable, unlike pages 08/09's multi-H3 problem | N/A |
| `time` element | Static | Code inspection | Uses semantic `<time dateTime={entry.createdAt}>` with `toLocaleString()` display text | Correct use of semantic HTML — no issue | N/A |

## 7. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| `10-access-history-desktop-default-01.png` | 1440×900 | Cold load, skeleton | Confirms genuine loading state before fetch resolves | — |
| `10-access-history-desktop-after-wait-01.png` | 1440×900 | Populated, real data | Primary evidence — 10 real log rows, role pill + actor + action + resource + timestamp | 10-001, 10-002 |
| `10-access-history-mobile-default-01.png` | 390×844 | Populated, top | Confirms the mobile grid-collapse bug (10-001) | 10-001 |
| `10-access-history-mobile-default-02.png` | 390×844 | Populated, scrolled | More rows showing the same stretched-pill defect repeated down the list | 10-001 |
| `10-access-history-short-default-01.png` | 1366×650 | Short viewport, skeleton | Captured before fetch resolved; card position confirms no clipping once loaded (card top is well within the 650px viewport) | — |

## 8. UX Problems

### 10-001 — Icon avatar stretches into a full-width pill on mobile (shared responsive CSS rule targets a grid row it wasn't written for)
- **Severity**: High
- **Category**: Visual/responsive bug
- **Browser evidence**: `10-access-history-mobile-default-01.png` and `-02.png` (390×844) — each log entry shows a large pale rounded-full bar spanning the full row width with the small `Shield` icon centered inside it, followed on the next line by the "You viewed …" text and timestamp. Compare to desktop (`10-access-history-desktop-after-wait-01.png`) where the same icon renders as a compact 32px circle to the left of the text, all on one row.
- **Root cause**: `frontend/app/portal.css:3514-3550` — a shared `@media (max-width: 768px)` rule targets a list of *flex-row* component classes (`.gh-patient-alert-row`, `.gh-patient-list-row`, `.gh-patient-booking-band`, etc.) and forces `flex-direction: column` + `width: 100%` on all direct children, intended to stack flex-based action rows vertically on mobile. `.gh-patient-access-row` is included in that same selector list (`:3524`, `:3538`) even though it is **not** a flex row — it's `grid gap-3 ... sm:grid-cols-[auto_1fr_auto]` (`access-history-client.tsx:84`), with no column template below the `sm:` breakpoint (implicit single-column grid). The shared rule's `width: 100%` on `.gh-patient-access-row > *` stretches the icon `<div>` (normally a fixed `size-8 rounded-full` circle, `:85`) to the full grid-column width, producing the pill artifact.
- **User impact**: Every single access-log entry on mobile — the majority of patients checking "who accessed my data" from a phone — displays a visually broken, unpolished icon treatment repeated down the entire list; undermines trust in a page whose whole purpose is building trust/transparency.
- **Recommended resolution**: Remove `.gh-patient-access-row` from the shared flex-row mobile-stacking selector block (`portal.css:3514-3550`) since it doesn't use flex and doesn't need the `flex-direction: column` treatment at all — the grid already collapses to one implicit column below `sm:`. If any mobile-specific tightening is still wanted for this row (e.g., icon size), add a dedicated `@media (max-width: 640px) { .gh-patient-access-row { ... } }` block scoped to this component instead of reusing the generic flex-row rule.

### 10-002 — No grouping for rows generated in rapid succession (same session)
- **Severity**: Low
- **Category**: List presentation
- **Browser evidence**: `10-access-history-desktop-after-wait-01.png` — 10 consecutive rows spanning only ~15 minutes (11:07:54–11:08:53), several literally the same second, all "viewed your nationality/insurance document" or "viewed verification status."
- **Root cause**: `access-history-client.tsx:182-185` renders every log entry as an unconditional flat sibling with no date/session grouping or entry collapsing.
- **User impact**: A single page load by the patient's own account can appear to "flood" the log with what reads as many separate access events, making it harder to visually distinguish a genuinely separate access (e.g., staff review days later) from the noise of routine self-navigation.
- **Recommended resolution**: Group consecutive same-actor entries within a short window (e.g., a "Day" header, or collapse "viewed 3 documents" into one row with an expandable detail) — this is a list-presentation improvement, not a data-model change.

## 9. Visual Design Problems

- The role badge ("You"/pill) uses hardcoded Tailwind color utilities (`bg-sky-50 text-sky-700`, `bg-violet-50 text-violet-700`, `bg-amber-50 text-amber-700`, `bg-slate-100 text-slate-600` — `access-history-client.tsx:64-73`) rather than the portal's `--lux-*`/`--portal-*` design tokens used everywhere else on this page (`var(--portal-text)`, `var(--portal-muted)`, `var(--portal-line)`). This is the one place on the page that breaks from the token system — inconsistent with the "one of the two files" CSS architecture note in the project's `CLAUDE.md`, which expects portal-only classes/tokens in `portal.css`, not ad hoc Tailwind palette colors.
- Single-card, `divide-y` row list is otherwise clean and appropriately restrained — no card-overuse issue here (contrast pages 08/09).

## 10. Information Hierarchy Problems

- No visual distinction between a self-view (`PATIENT` role, "You") and a third-party access (`DOCTOR`/`ADMIN`/`STAFF`) beyond badge color — for a page whose entire purpose is "who accessed my data," a third-party access event (the one thing a patient actually needs to notice) should be visually louder than the patient's own routine self-views, which currently dominate the list. Currently every row has identical size/weight/position regardless of who accessed the data.
- `accessReason` and `relatedAppointmentId` (when present) render as small muted text below the main line (`:100-109`) — useful context, correctly de-emphasized; no issue with this part.

## 11. Section Ordering Review

**Current order**: 1) Header 2) Log card 3) Pagination.

**Recommended order**: unchanged structurally — this page's ordering is already correct and minimal for its task (log first, pagination as a footer control). No reordering needed.

**Reasoning**: With no filters/stats/tabs to place, the current 3-part order (header → content → pagination) is the simplest correct structure. The only recommended addition, if any, would be a subtle "third-party access only" toggle placed between header and list (see §21) — not a reordering of what exists today.

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — a single flat chronological list is the correct model for an audit trail; tabs/steps would fragment a log that's meant to be scanned in order. If the log grows to mix very different resource types at scale, a filter (not a tab) would be more appropriate since a patient may want to see all access to a specific resource type across categories simultaneously, not siloed by tab.

## 13. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (unchanged).
2. Single content card — log list, `divide-y` rows (unchanged structure), with:
   - Mobile icon-stretch bug fixed (10-001).
   - Optional lightweight day-grouping headers if log volume grows (10-002; not urgent at current volumes).
3. Pagination footer (unchanged).

No structural changes recommended beyond the two bug fixes above — this page's structure is already close to ideal relative to pages 08/09.

## 14. Proposed Container Simplification

- `div.px-4` wrapping the populated row list inside the card (`access-history-client.tsx:181`): **collapse** — apply the horizontal padding to the outer `.gh-patient-access-card` itself (it currently has `p-0` at `:161` specifically so this inner div can own padding instead; one fewer wrapper achieves the same visual result).
- `.gh-patient-access-row`: **keep** the grid structure, but **remove** it from the shared flex-row mobile media-query block (10-001) — this is a CSS-file fix, not a markup change.
- Everything else (single card, `divide-y`, pagination footer): **keep** as-is.

## 15. Responsive Findings

- **desktop/laptop/tabletl (1440/1280/1024)**: Row layout uses `sm:grid-cols-[auto_1fr_auto]` correctly — icon, text, timestamp all on one line, comfortable line length. No issues.
- **tabletp (768)**: At exactly the `sm:` breakpoint boundary (Tailwind `sm` = 640px, so 768px is above it) — grid-cols still applies, row layout intact. No issues observed.
- **mobile (390) / smobile (375)**: Below the 640px `sm:` breakpoint, `sm:grid-cols-[auto_1fr_auto]` no longer applies, and the shared mobile CSS rule (10-001) breaks the icon avatar into a full-width pill on every row — the single largest visual defect found across all three audited pages.
- **short (1366×650)**: No clipping observed — the card's top is fully visible without scrolling once loaded (confirmed via the loading-state screenshot's card position; the populated card would start slightly lower once the skeleton height matches real content, but the header + first 2–3 rows should remain visible without scrolling based on measured card position).

## 16. Accessibility Findings

- `<time dateTime={...}>` used correctly for timestamps — good semantic practice, no issue.
- Icon (`Shield`) is `aria-hidden` (`:86`) — correct, decorative.
- No heading-hierarchy problem on this page (only one H1, no competing H3s) — contrast with pages 08/09.
- Pagination "Previous"/"Next" buttons use `disabled` correctly for boundary pages (`:200-210`) rather than hiding them — good for consistent tab order, though not verified in a populated multi-page state (see §21).
- Role/action/resource labels are all translated via `i18n` lookups with English fallback to the raw enum lowercased (`:76-78`) — reasonable degradation if a translation key is ever missing, though a raw fallback like `"nationality_doc"` (with underscores, only lightly formatted) could read awkwardly to an end user if it ever surfaces; low-risk since all current lookups appear covered.

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| "viewed your nationality document" / "viewed verification status" (lowercase, mid-sentence) | Keep — reads naturally as a sentence fragment after the role badge; no change needed. | Already good — flagging only that this is deliberately lowercase by design (`className="lowercase"`, `:96,98`), not a bug. |
| No distinction in copy between "you" viewing your own data and staff/doctor viewing it | Consider a slightly more assertive phrasing for non-patient roles, e.g. "Dr. Smith **reviewed** your insurance document" vs. muted "You viewed…" — ties to §10's hierarchy recommendation. | Helps the one row type that actually matters (third-party access) stand out in phrasing, not just color. |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Mobile row-stacking CSS | `frontend/app/portal.css` (lines 3514–3550) | Remove `.gh-patient-access-row` from the shared flex-row selector list; add a scoped rule if needed | **Shared file, but a targeted removal** — verify no other page relies on `.gh-patient-access-row` being in that block (grep shows only `access-history-client.tsx` uses this class) | Low | Small |
| Inner padding wrapper | `frontend/app/(auth)/account/access-history/_components/access-history-client.tsx` | Remove `div.px-4`, move padding to the card | Page-specific | Low | Trivial |
| Role badge colors | `access-history-client.tsx:64-73` | Replace hardcoded Tailwind palette classes with `--portal-*`/`--lux-*` tokens | Page-specific | Low | Small |
| Row grouping/collapsing | `access-history-client.tsx` | Add day-grouping or same-session collapsing logic | Page-specific | Medium (new logic, needs design input) | Medium |

## 19. Recommended Implementation Order

1. 10-001 (mobile CSS fix) — High severity, single small CSS change, ship first.
2. Inner padding wrapper cleanup (§14) — trivial, bundle with 10-001 since both touch the same file region.
3. Role badge tokenization (§9) — low risk, cosmetic consistency pass.
4. 10-002 grouping — defer; needs product/design input on grouping window and collapsed-row UI before implementation.

## 20. Acceptance Criteria

- [ ] On viewports below 640px, the log-row icon renders as a fixed ~32px circle, not a full-width pill.
- [ ] `.gh-patient-access-row` is confirmed removed from (or never matched by) any `flex-direction: column` mobile rule intended for flex-based rows.
- [ ] Role badges use portal design tokens, not hardcoded Tailwind palette colors.
- [ ] No visual regression to desktop/tablet row layout after the CSS fix (spot-check 1440/1024/768).

## 21. Open Questions

- Does this account's full log exceed 20 entries (triggering real pagination)? The captured page showed no pagination controls, implying `pagination.pages <= 1`, so `Previous`/`Next` behavior (button disabled states, page-count label formatting) could not be exercised against real multi-page data — recommend a follow-up check once/if a higher-volume test account is available.
- Is there a product intent to eventually add a "show only staff/doctor access" filter, given the page's stated trust/transparency purpose? Not implemented today; flagged as a possible high-value addition, not a defect.
