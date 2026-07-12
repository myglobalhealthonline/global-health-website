# Patient Portal Audit — 07 · Notifications

## 1. Page Identification

- **Name:** Notifications (account notification centre)
- **Route:** `/account/notifications`
- **Entry points:** Sidebar "N" bell icon in top header (unread dot); direct sidebar? (not present — only reachable via the header bell, confirmed via code: no `Notifications` sidebar nav item found in the portal nav config referenced by screenshots)
- **Role:** Patient (authenticated)
- **Frontend files:**
  - `frontend/app/(auth)/account/notifications/page.tsx` — server component
  - `frontend/app/(auth)/account/notifications/_components/patient-notification-list.tsx` — client list + mark-read logic
  - `frontend/app/(auth)/account/notifications/loading.tsx` — `ListPageSkeleton` loading state
- **Shared components:** `AdminSummaryStrip`, `PageHeader` (`@/components/portal-atoms`)
- **APIs observed:**
  - Server-side: `getServerNotifications()` (`@/lib/api/me-subscription-server`) — initial page load
  - Client: `markNotificationRead(id)` → `PATCH /me/notifications/:id/read`; `markAllNotificationsRead()` → `POST /me/notifications/read-all` (`frontend/lib/api/me-subscription.ts` lines 238-244)
- **Audit date:** 2026-07-12
- **Viewports tested:** desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)

## 2. Page Purpose

Central list of account-level alerts (appointment updates, payment/subscription events, wellness credits, redemptions) with read/unread state and deep links into the relevant record.

## 3. Primary User Tasks (priority order)

1. See at a glance how many notifications need attention (unread count).
2. Scan recent notifications and their content.
3. Open a notification to jump to the relevant page (order, rewards, membership, etc.) — this also marks it read.
4. Clear the "needs attention" state in bulk ("Mark all read").

## 4. Current Page Structure (top-to-bottom)

1. `PageHeader` — eyebrow "ACCOUNT", title "Notifications", description "X unread · Y total"
2. `AdminSummaryStrip` — 3 stat cards: Unread (count), Total (count), Status ("Review needed" / "Caught up")
3. "Mark all read" button (right-aligned, only rendered when `unread > 0`)
4. Notification list — single bordered/rounded card containing all rows, divided by hairlines

## 5. Current Container Hierarchy (indented tree; mark unnecessary levels)

```
.gh-patient-page.gh-patient-notifications-page
├─ PageHeader (gh2 hero panel)                                   [necessary]
├─ AdminSummaryStrip (mb-5)                                      [3 stat cards]
│  ├─ Card: Unread                                                [decorative icon chip inside each — repeated per-card treatment]
│  ├─ Card: Total
│  └─ Card: Status
├─ "Mark all read" button row (flex justify-end)                 [necessary — primary bulk action]
└─ PatientNotificationList
   └─ <ul class="gh-patient-notification-list gh-card divide-y">  [ONE card wrapping the whole list — correct, not per-row cards]
      └─ <li> per notification
         └─ <Link> or <button> (full row is the target)
            └─ dot indicator + title + body + relative time
```

No card-in-card stacking within the list itself — rows are plain `<li>` with dividers, which is the right pattern (not stat-card-style per-item cards). The 3-stat-card strip above it is the only "card overuse" candidate on this page (see §8).

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Notification row ("Redemption confirmed") | `<Link href="/account/orders">` | Click | Navigates to `/account/orders`; on return to `/account/notifications`, unread count dropped from 3 to 2 and the row shows read (dimmed) styling | — | `07-notifications-desktop-after-click-navigated-01.png`, `07-notifications-desktop-after-one-read-01.png` |
| "Mark all read" button | button | Click (2 unread remaining) | See 07-001 below — count/rows did not visibly update within ~2s; confirmed eventually consistent via a later fresh page load (unread reached 0, button disappeared) | 07-001 | `07-notifications-desktop-after-mark-all-01.png` |
| Notification rows 2 & 3 (never clicked) | `<Link>` | Not clicked (would navigate to `/account/rewards`, `/account/membership`) | Code-derived: both have valid `href` in payload | — | code-derived |
| Tab key navigation | keyboard | 5x Tab from page load | Focus moved through header controls into sidebar nav (`Messages` link), skipping past the stat cards (non-interactive, correct) and landing in the persistent sidebar rather than stepping through notification rows first — expected since stat cards/rows come after header/nav in DOM order for this layout | — | code+script verified |

## 7. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| `07-notifications-desktop-default-0{1..2}.png` | 1440×900 | Default, 3 unread | Baseline | 07-002 |
| `07-notifications-laptop-default-0{1..2}.png` | 1280×720 | Default | Baseline | — |
| `07-notifications-tabletl-default-0{1..2}.png` | 1024×768 | Default | Baseline | — |
| `07-notifications-tabletp-default-01.png` | 768×1024 | Default | Stat cards stack? (see §15) | — |
| `07-notifications-mobile-default-0{1..2}.png` | 390×844 | Default | Stat cards stack to single column | — |
| `07-notifications-smobile-default-0{1..2}.png` | 375×667 | Default | Smallest phone | — |
| `07-notifications-short-default-0{1..2}.png` | 1366×650 | Default | Short-height desktop | — |
| `07-notifications-desktop-focus-state-01.png` | 1440×900 | Fresh load, 3 unread, focus ring on sidebar "Messages" link after 5 tabs | Focus-visible check | — |
| `07-notifications-desktop-after-click-navigated-01.png` | 1440×900 | After clicking a notification link | Navigated to `/account/orders` | — |
| `07-notifications-desktop-after-one-read-01.png` | 1440×900 | Back on notifications page, 2 unread | Confirms single mark-as-read persisted | — |
| `07-notifications-desktop-after-mark-all-01.png` | 1440×900 | ~2s after clicking "Mark all read" | **Stale unread count/dots/button** — see 07-001 | 07-001 |
| `07-notifications-desktop-mark-all-4s-01.png` | 1440×900 | Re-run with all items already read (skipped — button not visible) | Confirms eventual-consistency | 07-001 |

## 8. UX Problems

### 07-001 — "Mark all read" gives no immediate, reliable feedback; observed stale for several seconds
- **Severity:** Medium
- **Category:** Forms / State feedback
- **Browser evidence:** `07-notifications-desktop-after-mark-all-01.png`, captured ~2s after clicking "Mark all read": the header still reads "2 unread · 3 total", the Unread stat card still shows "2", the "Mark all read" button is still visible (its render condition is `{unread > 0 ? <button>...</button> : null}` using **local component state**, so it should have vanished as soon as the optimistic update applied), and 2 of 3 rows still show the green unread dot. A follow-up script run afterward found the button no longer rendered (unread had reached 0), confirming the mutation eventually succeeded server-side.
- **User impact:** A patient who clicks "Mark all read" and looks at the screen sees no change — nothing dims, the counts don't move, the button stays there — so they may click it again (harmless here, but a poor trust signal) or conclude the action failed and abandon it.
- **Root cause:** `frontend/app/(auth)/account/notifications/_components/patient-notification-list.tsx` `markAll()` (lines 74-81) does perform a synchronous optimistic `setItems` before awaiting the API call, which should update the list dots and hide the button on the very next render — the observed delay does not match that code path and could not be root-caused further from the frontend alone (candidates: Next.js dev-mode Fast Refresh/compile latency during this audit session — a "Compiling…" indicator was visible in several other screenshots taken around the same time — vs. a genuine render/state issue). Separately, and confirmed by reading the code: `PageHeader`'s description text ("X unread · Y total") and the `AdminSummaryStrip` counts in `page.tsx` are computed **server-side** from `getServerNotifications()` and passed as static props; they are a **second, independent source of truth** from the client-side `items` state in `PatientNotificationList`, and only refresh once `router.refresh()` completes a full round trip. These two sources of truth can legitimately disagree for the duration of that round trip even under ideal conditions.
- **Recommended resolution:** (a) Re-verify this specific interaction outside of Next dev mode (production build) to rule out compile-latency as the sole cause. (b) Regardless, tighten the architecture: either derive the header/stat-card numbers from the same client state `PatientNotificationList` owns (lift `unread`/`total` into a client wrapper, or pass a callback up), or show a lightweight pending/disabled state on "Mark all read" for the duration of the request so the button visibly acknowledges the click even if the header text updates a beat later.

### 07-002 — Three-card stat strip for two numbers and one derived label
- **Severity:** Low
- **Category:** Card overuse
- **Browser evidence:** `07-notifications-desktop-default-01.png` — "Unread: 3", "Total: 3", "Status: Review needed" each get a full stat card (icon chip, label, value, hint) even though Unread and Total are the same number here, and Status is entirely derived from Unread (`unread > 0 ? "Review needed" : "Caught up"`, `page.tsx` lines 32-35).
- **User impact:** Three cards for what is effectively one piece of information ("N unread") adds visual weight and scanning cost above a list that is often just 3 items long; the redundant "3 / 3" reads oddly on first glance (why show the same number twice?).
- **Root cause:** Reuse of the generic `AdminSummaryStrip` primitive without tailoring it to a page whose data rarely has more than a handful of items — the PageHeader description already states "3 unread · 3 total" one line above, duplicating the same two numbers a second time in card form.
- **Recommended resolution:** Drop the stat strip on this page (the `PageHeader` description already communicates unread/total) and keep the "Mark all read" action as the sole control above the list, or collapse the 3 cards to a single inline pill row (no card chrome) if the visual anchor is still wanted.

## 9. Visual Design Problems

- Stat-card icon chips (small dark rounded squares with a bar-chart glyph) are decorative and identical across all three cards regardless of what they represent (Unread/Total/Status) — the icon carries no distinguishing meaning, adds visual noise without information value. Code-derived: `AdminSummaryStrip` renders the same icon for every `item` passed in `page.tsx` lines 28-36 (no per-item icon prop used here).
- Unread dot indicator (green circle, `--portal-signal`) is a subtle 8px dot to the left of the title — sufficiently visible in these screenshots but relies entirely on color (no shape/weight difference) to convey unread vs. read; bold vs. semibold title weight is also used (`isUnread ? "font-bold" : "font-semibold"`) which is a reasonable secondary signal, so this is not flagged as a hard accessibility failure, just worth noting as color-dependent.

## 10. Information Hierarchy Problems

- See 07-002 — the stat strip out-ranks the actual notification content in visual weight (three full-width cards above a list that may only have 3 rows total), which is disproportionate for a page whose entire job is "show me the list."

## 11. Section Ordering Review

Current order:
1. PageHeader
2. Stat strip
3. Mark-all-read button
4. List

Recommended order (if 07-002 is implemented):
1. PageHeader (keep — already states unread/total)
2. Mark-all-read button (promote above/beside the list, keep as-is positionally)
3. List

Reasoning: removing the redundant stat strip lets the list start much higher on the page, which matters most on short viewports (07-notifications-short-default screenshots show the list starting well below the fold on 650px-tall screens purely because of the stat strip's vertical footprint).

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — a flat list with a single bulk action is the correct structure for this data volume; no tabs/steps warranted. If notification volume grows significantly, a "read/unread" filter toggle above the list would be the next reasonable addition (not currently present — see Open Questions).

## 13. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (unchanged)
2. "Mark all read" button, right-aligned (unchanged position, promoted up one level once stat strip is removed)
3. Notification list (unchanged)

## 14. Proposed Container Simplification

| Level | Current | Proposed |
|---|---|---|
| Stat strip (3 cards) | `AdminSummaryStrip` with 3 full stat cards | Remove, or replace with a single inline text row (no card chrome) — see 07-002 |
| Notification list | Single `gh-card` wrapping all rows | Keep — correct pattern, no change |
| Per-row structure | Plain `<li>`/divider, no per-row card | Keep — correct pattern, no change |

## 15. Responsive Findings

- **Desktop/laptop/tabletl:** stat strip renders as 3 columns, list full width below — no issues.
- **tabletp (768):** stat strip layout not fully captured in a single screenshot slice (page content taller than one screen); based on the `AdminSummaryStrip` grid classes this is expected to reflow to fewer columns, but this was not directly confirmed by an explicit interaction script for this page — flagged in Open Questions.
- **mobile/smobile (390/375):** stat cards stack to a single column, each still full card chrome — compounds the "too many cards" issue from 07-002 (3 full-height cards stacked vertically push the actual notification list below the fold on a 390×844 screen, confirmed in `07-notifications-mobile-default-01.png`/`02.png`).
- **short (1366×650):** list content is pushed down by the stat strip; first notification row is only barely visible without scrolling in `07-notifications-short-default-01.png` — reinforces 07-002's recommendation.

## 16. Accessibility Findings

- Heading outline: single `<h1>` "Notifications" — correct.
- Notification rows: correctly implemented as real `<a>`/`<button>` elements (not `<div onClick>`), each wraps its full content so the entire row is the hit target and accessible name — good.
- Unread indicator is color-only supplemented by font-weight (bold vs semibold) — acceptable, not flagged as a failure, but a screen-reader user gets no explicit "unread" announcement (no `aria-label` or visually-hidden text stating read state) — could add `<span className="sr-only">Unread</span>` for parity with sighted users who see the dot.
- "Mark all read" button: has visible text + icon (icon marked `aria-hidden`) — correctly labeled, no gap.
- Focus order: Tab progresses logically from header controls into the persistent sidebar; no keyboard trap observed.

## 17. Content and Microcopy Findings

| Current | Recommended | Notes |
|---|---|---|
| "Review needed" / "Caught up" (Status stat card) | N/A if 07-002 removes the card; otherwise keep — both are specific, not vague | — |
| "3 unread · 3 total" | Keep — clear, numeric, task-specific | — |
| "Mark all read" | Keep — clear, specific action verb | — |
| Notification titles ("Redemption confirmed", "Wellness credit earned", "Welcome to Premium Wellness Care Plan") | Keep — all specific, no generic "Notification" fallback text was encountered in this account's live data (fallback title "Notification" exists in code for `payload` being null, not observed here) | — |

No vague "Open"/"Manage"/"Submit" labels found on this page.

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Stat strip | `frontend/app/(auth)/account/notifications/page.tsx` | Remove or replace `AdminSummaryStrip` usage (07-002) | Page-specific usage of a shared component (`AdminSummaryStrip` itself is shared, but the decision to use it here is page-specific) | Low — purely additive/subtractive JSX | Small |
| Mark-all feedback | `frontend/app/(auth)/account/notifications/_components/patient-notification-list.tsx` | Investigate/fix update latency (07-001); consider disabled/pending visual state during the request | Page-specific component | Medium — touches state management and possibly the server/client data-flow boundary | Medium |
| Unread dot a11y | `patient-notification-list.tsx` | Add `sr-only` "Unread" text alongside the dot | Page-specific | Low | Trivial |

## 19. Recommended Implementation Order

1. 07-001 — re-verify in a production build first (cheap diagnostic step); if confirmed real, add pending-state UI as the low-risk fix before attempting any state-architecture change.
2. 07-002 — remove/simplify the stat strip; directly improves the short-viewport and mobile findings in §15 as a side effect.
3. Unread dot `sr-only` label — trivial, bundle with 07-002.

## 20. Acceptance Criteria (measurable)

- 07-001: Clicking "Mark all read" causes the unread stat/count and all row dots to update within one animation frame of the click in a production build (no dev-mode compile noise); if network latency is unavoidable, the button visibly enters a disabled/pending state immediately on click.
- 07-002: Page renders with at most one summary element above the list (either the existing `PageHeader` description alone, or one simplified strip), verified by no duplicate "unread/total" numeral pair appearing twice on screen at once.
- 15: At 390×844, the first notification row is visible without scrolling past the header.

## 21. Open Questions

- Exact root cause of the 07-001 latency (dev-mode Fast Refresh artifact vs. genuine state/render issue) could not be conclusively isolated from the frontend alone within this audit's tooling — recommend a targeted production-build re-test.
- `AdminSummaryStrip` responsive column behavior at the 768px (tabletp) breakpoint specifically was not directly interaction-tested (only default-state screenshots captured, and the strip may render below the first viewport slice) — recommend a dedicated capture if this component's tablet behavior is being audited elsewhere.
- Whether a read/unread filter or pagination is planned for this page once notification volume grows beyond a handful of items is a product question, not something the current code or browser evidence can answer — flagged as N/A/out of scope for this audit rather than a defect (current data volume, 3 items, needs neither).
