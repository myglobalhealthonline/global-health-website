# 11 — Doctor Notifications

## 1. Page Identification
- **Name**: Doctor Notifications
- **Route**: `/doctor/notifications`
- **Entry points**: Sidebar nav "Notifications" (Account group), header bell icon (`NotificationPopover`), deep links from other pages/emails to `/doctor/notifications`
- **Role**: DOCTOR
- **Workflow stage**: Ambient / reactive — doctor checks after being pinged by the header bell badge or sidebar count
- **Frontend files**:
  - `frontend/app/(doctor)/doctor/notifications/page.tsx` (server component, data fetch)
  - `frontend/app/(doctor)/doctor/notifications/_components/notification-list.tsx` (client, mark-read actions)
  - `frontend/app/(doctor)/doctor/notifications/loading.tsx`
- **Shared components**: `PageHeader`, `AdminSummaryStrip`, `AdminEmptyState` (`components/portal-atoms`), `PortalShell` header bell (`components/NotificationPopover.tsx`)
- **APIs observed**: `fetchDoctorNotifications()` → `GET /api/doctor/notifications` (page load); `PATCH /api/doctor/notifications/:id/read`; `POST /api/doctor/notifications/read-all`
- **Date audited**: 2026-07-12
- **Viewports tested**: desktop 1440×900, laptop 1280×720, tabletl 1024×768, tabletp 768×1024, mobile 390×844, smobile 375×667, short 1366×650 (matrix) + interaction shots at desktop
- **States tested (browser)**: default (1 unread / 2 total), mark-one-as-read (live click), keyboard-tab focus. **Code-derived only**: empty state (0 notifications), loading state, error state (fetch failure), mark-all-read.

## 2. Page Purpose
A flat activity feed of doctor-relevant events (appointment assignments, internal messages, signed consults, submitted forms, logged exams) with read/unread tracking and deep links back into the record that triggered the notification.

## 3. Primary Doctor Tasks (priority order)
1. See if anything needs attention (unread count)
2. Identify *what* happened and *to which patient/appointment*
3. Jump to the relevant appointment
4. Clear the item (mark read) once handled

## 4. Clinical/Operational Importance
Low-to-medium. Nothing on this page is itself clinical data — it's a routing/attention layer to the appointment record where the actual clinical action happens. Its only real job is to not lose or delay an "assigned to you" signal.

## 5. Current Page Structure (top-to-bottom)
1. Compliance banner (shared, dismissible, not page-specific)
2. Hero/eyebrow card: "ATTENTION QUEUE · Notifications" + description (`PageHeader`)
3. 3-stat `AdminSummaryStrip`: Unread / Total / Source
4. List card: toolbar ("Newest first" + "Mark all read") + notification rows
5. Footer hint linking to My appointments

## 6. Current Container Hierarchy
```
main
├─ compliance banner (gh-card, shared)
├─ PageHeader hero (gh-card, green gradient)
├─ AdminSummaryStrip (gh-card × 3, in a row)
│   └─ each stat: icon chip (bordered, radius)
├─ gh-card (list container, p-0)
│   ├─ toolbar row (border-b)
│   └─ ul > li rows (divide-y, no per-row card — good, flattened)
│       └─ unread dot (rounded-full pill)
└─ footer <p> (no card — good)
```
Unnecessary levels: the 3-stat strip for a page whose entire dataset is 1–2 notifications is oversized relative to content below it (evaluate count: 6 bordered/radius/shadow surfaces in `main` for a page with 2 list rows). The **"SOURCE"** stat card is not a metric — it's a static label ("Consultation workflow") with a decorative icon, contributing a full card slot for zero variable information.

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| "Mark as read" (row) | icon button | click | row loses unread dot/button instantly (optimistic), `PATCH .../read` fires, `router.refresh()` called | Sidebar badge, header bell, and "UNREAD" stat tile do **not** update after the click (stay stale until a full navigation/reload) | `11-notifications-desktop-after-mark-read-02.png` |
| "Mark all read" | button | click (not committed — single item already read, button correctly `disabled` once 0 unread) | disables when nothing unread | none | `11-notifications-desktop-after-mark-read-02.png` |
| "Open appointment →" | link | click | navigates to `/doctor/appointments/:id` | good — direct deep link, no detour | — |
| "My appointments" (footer) | link | click | navigates to `/doctor/appointments` | fine, but duplicates the nav sidebar's own "Appointments" link with different copy ("My appointments" vs "Appointments") | — |
| Keyboard Tab | keyboard | tab through page | Reaches "Mark all read" with visible 2px solid outline (`rgb(29,75,54)` on white) | Fine — focus ring exists and is legible; no defect | `11-notifications-desktop-keyboard-focus-on-mark-read-04.png` |
| Header bell / sidebar nav badge | badge | (auto) | Shows unread count from `doctor/layout.tsx` server fetch | Stale immediately after mark-read (see above) | `11-notifications-desktop-after-mark-read-02.png` |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Default (1 unread/2 total) | Yes | — | Renders hero + 3 stats + 2-row list | — |
| After mark-one-read | Yes | — | List updates; summary/nav badges stale | 11-001 |
| Empty (0 notifications) | No | Yes — `notification-list.tsx:59-69` renders `AdminEmptyState` with `empty-notifications.svg` | Not triggerable safely (would need to consume all real notifications for the test account) | code-derived |
| Loading | No | Yes — `loading.tsx` exists (skeleton via Suspense boundary at route level) | not captured | code-derived |
| Error (fetch failure) | No | Yes — `page.tsx:22-29` renders a `gh-status-warning` card with `result.message` | not triggerable without breaking the backend | code-derived |
| Mark-all-read (2+ unread) | No | Yes — `markAll()` optimistically sets all `readAt`, then POSTs | test account only had 1 unread; not exercised at >1 | code-derived |

## 9. Screenshots
| File | Viewport | State | Reason | Issues |
|---|---|---|---|---|
| `11-notifications-default-desktop-default-01.png` | 1440×900 | default | matrix baseline | 11-002 |
| `11-notifications-default-laptop-default-01.png` | 1280×720 | default | matrix | — |
| `11-notifications-default-tabletl-default-01.png` | 1024×768 | default | matrix | — |
| `11-notifications-default-tabletp-default-01.png` | 768×1024 | default | matrix | — |
| `11-notifications-default-mobile-default-01.png` | 390×844 | default | matrix (recaptured with longer wait) | 11-003 |
| `11-notifications-default-smobile-default-01.png` | 375×667 | default | matrix | — |
| `11-notifications-default-short-default-01.png` | 1366×650 | default | fold check | 11-004 |
| `11-notifications-desktop-after-mark-read-02.png` | 1440×900 | after mark-one-read | interaction | 11-001 |
| `11-notifications-desktop-keyboard-focus-on-mark-read-04.png` | 1440×900 | keyboard focus | a11y check | none (focus ring OK) |

## 10. UX Problems
- **11-001 (High)** — Stale unread indicators after marking read. Browser-verified: clicking "Mark as read" updates the list row instantly but the `AdminSummaryStrip` "UNREAD" tile, the header bell badge, and the sidebar "Notifications" nav badge all keep showing the pre-action count (screenshot `...after-mark-read-02.png` shows list with 0 unread rows next to a tile still reading "UNREAD 1" and a nav badge still reading "1"). A hard reload shows the corrected value (verified separately), so the data is right — only the UI sync is broken. **Root cause**: `notification-list.tsx:44-46` calls `router.refresh()`, which re-renders the *page* segment, but the unread count feeding the sidebar/bell badge is fetched independently in `frontend/app/(doctor)/doctor/layout.tsx:60-86` (`unreadCount`) and passed into `PortalShell`/`NotificationPopover`. Whether `router.refresh()` reliably invalidates a parent layout's own data fetch on this Next.js version is exactly the kind of thing that silently regresses; behavior observed here is stale-until-full-navigation. **Fix**: after `markOne`/`markAll` succeed, either (a) confirm `router.refresh()` is actually re-running `layout.tsx`'s fetch (check Next cache config on `fetchDoctorNotifications` / `doctorRequest` — add `cache: "no-store"` if missing), or (b) lift unread count into a small shared client store (e.g. a context set by `PortalShell` and updated optimistically by `notification-list.tsx` on mark actions) so the badge/tile update in the same tick as the row, independent of the RSC refresh timing.
- **11-002 (Low)** — "SOURCE" stat tile carries no variable data (static "Consultation workflow" label + bell icon), taking a full stat-card slot next to two tiles that do carry real numbers. Doesn't meet the bar for a kept `AdminSummaryStrip` item since it never changes. `frontend/app/(doctor)/doctor/notifications/page.tsx:55-60`.
- **11-003 (Low, code-derived+partially observed)** — On mobile the page briefly rendered only the loading splash before content painted, requiring a longer wait (`2500ms` beyond the standard `1200ms`) to capture real content; on a slower phone this reads as a stuck/blank page for a notifications list backed by a single already-fetched RSC payload — see `loading.tsx`. No action needed unless real users report blank flashes; noting as a perf watch-item, not a functional bug.
- **11-004 (Low)** — Breadcrumb "Doctor › Notifications" is fine at 1366×650 (short) and desktop, but at 390px mobile the breadcrumb truncates to "Doctor › N…" (see `11-invoices`/`11-reports` mobile shots for the same defect, shared header component) — losing the current-page label exactly where users most need in-page orientation. Portal-wide, not notifications-specific; shared `PortalShell` breadcrumb, flag once, fix once.

## 11. Visual Design Problems
- Hero card ("ATTENTION QUEUE") + 3-stat strip + list card = 3 stacked full-width green/white cards before any actual notification content is visible on a 900px-tall viewport — for a page whose real content is 1-2 rows. On `short` (650px height) this pushes the list below the fold entirely (see `11-notifications-default-short-default-01.png`).
- Unread dot indicator (`size-2` green dot) is the *only* non-text signal of unread state on the row; icon-only "Mark as read" checkmark button has no visible label (has `aria-label`, good) but is easy to miss against the muted-gray default state — low visual weight for the primary action on the row.

## 12. Information Hierarchy Problems
- "Newest first" and "Mark all read" sit in a thin toolbar above the list — correct ordering — but the actual signal a doctor needs first (who/what/when) is buried under 3 stat cards + 2 hero blocks. For a notifications page, the list itself should be the dominant visual element, not 40%+ of the viewport spent on chrome.

## 13. Current Section Order
1. Compliance banner
2. Hero (PageHeader)
3. Stat strip (Unread/Total/Source)
4. List
5. Footer link

## 14. Recommended Section Order (+ reasons)
1. Hero (kept, but shorter — see §17) — orientation
2. List (moved up, immediately after hero) — this *is* the page; nothing should separate the user from it
3. Stat strip reduced to 2 tiles (Unread, Total) inline in the list toolbar instead of a separate card row — saves a full vertical section for numbers that are also shown by the unread dot / row count
4. Footer link (kept)

Reasoning: notifications is a "check and act" page; every extra section between load and the list is friction. The compliance banner is global and out of scope for this page's own audit.

## 15. Tabs/Steps/Sectioning Recommendation
Not needed. Page is short and single-purpose. Do not add tabs — would be over-structuring a 1-list page. If notification volume grows meaningfully (e.g. 50+/day), consider a lightweight filter (unread/all, type) inline in the toolbar rather than tabs.

## 16. Save & Finalization Recommendation
No save/finalize concept on this page (mark-read is fire-and-forget, correctly). No changes needed here beyond fixing 11-001's sync bug.

## 17. Proposed Page Structure (exact top-to-bottom)
1. `PageHeader` — eyebrow "Attention queue", title "Notifications", **inline** unread count next to title (e.g. "Notifications · 1 unread") instead of a separate stat card
2. List card — toolbar (unread/total inline, sort is already newest-first only) + rows (unchanged, this part works)
3. Footer hint link (unchanged)

## 18. Proposed Container Simplification
- **Remove**: "SOURCE" stat tile entirely (dead weight, §10 11-002)
- **Flatten**: "UNREAD"/"TOTAL" stat cards → inline text in the `PageHeader`/toolbar (no separate `AdminSummaryStrip` row) — this page's list already visually conveys unread state via the dot, a full stat-card row is redundant
- **Keep**: list card, row structure, empty state, hero eyebrow line
- **Max visible surface levels after change**: 2 (hero+list card, list rows flattened with dividers — already correct)

## 19. Responsive Findings
| Viewport | Finding |
|---|---|
| desktop/laptop | Fine, no overflow |
| tabletl/tabletp | Fine, stat strip wraps to 2-up cleanly |
| mobile/smobile | Content correct after paint; breadcrumb truncates (11-004, shared) |
| short (1366×650) | List pushed below the fold by hero+stats; scroll required immediately on load — see §11 |

## 20. Accessibility Findings
- Focus ring present and legible (2px solid, sufficient contrast) — verified via `getComputedStyle` on tabbed-to "Mark all read" button.
- "Mark as read" icon button has `aria-label` — good.
- Unread state communicated by color dot + button presence (not color-only, the button itself is the secondary signal) — acceptable, but the dot alone is decorative (`aria-hidden`) so unread rows are distinguished from read rows only by presence/absence of the "Mark as read" button in the DOM (screen reader detects this structurally, fine) — no explicit "unread" text/label on the row itself for AT users beyond that. Minor: consider `aria-label="Unread notification"` on the dot's parent or a visually-hidden "(unread)" suffix in the row title for clarity to screen-reader users.
- Heading order: single `H1: Notifications` — correct, no skipped levels.

## 21. Content & Microcopy Findings
| Current | Recommended | Why |
|---|---|---|
| "SOURCE / Consultation workflow" | Remove | Not a metric, see 11-002 |
| "My appointments" (footer link) | "Appointments" | Match sidebar nav label exactly; "My appointments" reads as a different destination |
| Notification type labels ("Appointment assigned") | Keep | Clear and specific, good example for the portal |

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| `notification-list.tsx` | `frontend/app/(doctor)/doctor/notifications/_components/notification-list.tsx` | Fix stale-badge sync (11-001); optionally lift unread count to context | No (doctor-only) but touches shared `PortalShell` contract | Medium | Medium |
| `PortalShell` / `NotificationPopover` | `frontend/components/portal-shell.tsx`, `frontend/components/NotificationPopover.tsx` | If fixing via shared context instead of refresh timing | **Yes** — shared across doctor/admin/account portals | High (blast radius) | Medium |
| `page.tsx` | `frontend/app/(doctor)/doctor/notifications/page.tsx` | Remove SOURCE tile, inline unread/total into header | No | Low | Low |

## 23. Backend or Business-Logic Impact
Frontend-only for the stat-tile simplification. The stale-badge fix (11-001) is frontend-only if solved via client state; if the root cause turns out to be a caching header on `doctorRequest`/`fetchDoctorNotifications`, that's a one-line `cache: "no-store"` fix, still frontend. No clinical/legal review needed — this page has no clinical data.

## 24. Recommended Implementation Order
1. 11-001 stale badge fix (High, isolated, verify with the same reload test used here)
2. Remove SOURCE tile + inline Unread/Total (Low, cosmetic)
3. Footer link label fix ("Appointments")
4. Shared breadcrumb truncation fix (11-004) — batch with other pages, not notifications-specific

## 25. Acceptance Criteria (measurable)
- Marking a notification read updates the sidebar nav badge and header bell badge within the same render pass as the row update (no full reload needed) — verified by automated check reading `document.activeElement`-independent DOM text immediately after click.
- Notifications page ships with ≤2 stat tiles, both carrying variable data.
- Footer link text matches sidebar nav label verbatim.

## 26. Open Questions
- Is the stale-badge bug (11-001) present portal-wide (admin/account notifications too) or doctor-specific? Same `PortalShell`/`NotificationPopover` components are shared — worth a quick check on `(admin)` and `(auth)/account` before scoping the fix, since the shared-component risk in §22 depends on it.
- Product: is "Notifications" meant to stay a flat feed forever, or will read/unread filtering be needed once volume grows past the current 1-2/week for this test account? Affects whether §15's "no tabs" call holds.
