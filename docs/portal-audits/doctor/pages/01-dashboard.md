# 01 — Doctor Overview (Dashboard)

## 1. Page Identification

- **Name**: Doctor Overview / Doctor Dashboard
- **Route**: `/doctor`
- **Entry points**: post-login redirect for DOCTOR role, sidebar "Overview", breadcrumb root, logo click
- **Role**: DOCTOR only (`layout.tsx` redirects ADMIN → `/admin`, CORPORATE_ADMIN → `/corporate`, anything else → `/unauthorized`)
- **Workflow position**: landing surface after login; the doctor's daily "what do I do next" screen
- **Frontend files**:
  - `frontend/app/(doctor)/doctor/page.tsx` (server component, page content, `dynamic = "force-dynamic"`)
  - `frontend/app/(doctor)/doctor/layout.tsx` (shell wiring, nav groups, compliance banner injection, auth gate)
  - `frontend/app/(doctor)/doctor/_components/compliance-banner.tsx` (client component, dismissible)
- **Shared components**: `PortalShell` (chrome), `CommandBand`, `StatCard`, `AdminCard`, `AdminEmptyState`, `SectionHeader`, `Btn` (all `frontend/components/portal-atoms.ts` → re-exported from `frontend/app/(admin)/admin/_components/atoms.tsx`)
- **APIs observed** (code-derived, server-side fetches in `page.tsx`/`layout.tsx`): `fetchDoctorMe`, `fetchDoctorAppointments` (today window), `fetchDoctorNotifications`, `fetchDoctorComplianceStatus`, `fetchDoctorUnreadMessageCount` — no client XHR on default view.
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)
- **States tested**: default (populated shell, zero appointments today — real account data), notification popover open, user menu open, compliance banner dismissed, keyboard focus order, mobile nav drawer, one transient server-error state (see 8, "Could not load doctor profile")

## 2. Page Purpose

Landing surface after login. Should tell the doctor, in under 5 seconds: is anything happening right now (live/next consult), what's on today's clock, and is anything blocking patient-record access (compliance). Secondary: quick paths into patients/forms/invoices.

## 3. Primary Doctor Tasks (priority order)

1. See if a consult is live or coming up today, and join it in one click
2. Confirm today's/this week's load at a glance
3. Resolve any compliance blocker (2FA, confidentiality agreement) before it hard-blocks patient-record access
4. Fix any appointment that's missing a meeting link before the patient arrives
5. Check unread notifications
6. Jump to My patients / Forms / Invoices

## 4. Clinical/Operational Importance

High. This is the doctor's daily control surface — if the compliance banner or the "missing meeting link" alert is missed, a patient can show up to a session that isn't joinable, or the doctor keeps working under relaxed (non-enforced) record protections indefinitely. The "no consults today, 12 open" pairing at audit time is itself telling: the dashboard's zero-state and the practice's actual backlog (12 open appointments, none today) are visually disconnected — see 10-001.

## 5. Current Page Structure (top-to-bottom)

1. Compliance banner (`AdminCard`-styled, conditional — only when confidentiality not accepted or 2FA not enabled), dismissible per browser session
2. `CommandBand` — dark hero: "Next consultation" context, patient name or "No consults today", specialty+countries chip, 3 metrics (Time / Today / This week), actions (Join if live, Calendar, Availability)
3. Row of 3 `StatCard`s — TODAY / THIS WEEK / OPEN (icon + number + hint)
4. Conditional pending-action banner (`AdminCard`, only if any appointment in next 24h has no meeting link) — not present at audit time (no appointments in next 24h)
5. Two-column grid: "Today's schedule" list (`AdminCard`, left, wider) + "Unread notifications" mini-list (`AdminCard`, right, narrower)
6. Row of 3 `QuickActionCard`s — My patients / Forms / Invoices

## 6. Current Container Hierarchy (indented tree)

```
<main>
├─ ComplianceBanner (.gh-admin-card)                          — single alert, card justified
├─ CommandBand (.gh-command-band, dark hero)                   — necessary, primary orientation surface
├─ .gh-doctor-stat-grid (grid, 3 cols)
│   ├─ StatCard × 3 (.gh-stat-card, radius+shadow+icon badge)  — real stats, keep
├─ [conditional] AdminCard > flex row (missing-link alert)     — single-purpose alert, justified when present
├─ .gh-doctor-overview-grid (grid, 2 cols on lg)
│   ├─ AdminCard (padding 0)
│   │   ├─ SectionHeader (title + description)                 — unnecessary sub-level, see 12-001
│   │   └─ div.p-5 > ul (today's schedule, divide-y rows)       — correct: list, not card-per-item
│   └─ AdminCard (padding 0)
│       ├─ SectionHeader (icon + "Unread notifications")
│       └─ div.p-5 > ul (notification mini-list) + "See all" link
├─ .gh-doctor-quick-grid (grid, 3 cols on sm)
│   ├─ QuickActionCard × 3 (Link styled as a flat row, not a `.gh-admin-card`) — flattest surface on the page, good pattern
```

Unnecessary levels: none egregious on this page — this is the best-behaved page in the portal relative to the "floating boxes" complaint (see `02-appointments.md`). The one avoidable nesting is `AdminCard > SectionHeader > div.p-5 > ul` for both grid panels: `AdminCard`'s own top border/radius plus `SectionHeader`'s divider line double up visually as two "section start" cues stacked 2px apart (see 11-001).

## 7. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| "Enable two-factor authentication" (compliance banner) | Link | Present, not clicked (navigates to `/doctor/security`) | code-derived: correct href | — | 01-dashboard-desktop-default-01.png |
| Dismiss compliance banner (×) | Button | Click | Banner hides immediately (sessionStorage-only, reappears next session) | Silent dismiss, no confirmation of *what* was dismissed or that it'll return (10-004) | 01-dashboard-desktop-banner-dismissed-01.png |
| Notification bell | Popover trigger | Click | Opened once as expected in a fresh session; in a rapid multi-navigation run it instead surfaced a page-level "Could not load doctor profile" error (see 8) | Intermittent — flagged, not fully reproducible (08-001) | 01-dashboard-desktop-bell-open-01.png |
| User chip ("Dr. Global Health") | Popover trigger | Click | Opens menu: name/email, "DOCTOR" role pill, Account/Main site links, Sign out — solid white surface, no bleed-through | Works correctly | 01-dashboard-desktop-usermenu-open-01.png |
| Mobile hamburger | Toggle | Click at 390px | Opens sidebar drawer with overlay, full nav visible, "×" close control | Works correctly | 01-dashboard-mobile-navdrawer-open-01.png |
| Keyboard Tab (7 presses from load) | Keyboard | Tab × 7 | Focus lands on "Calendar" sidebar nav item with a visible lime focus ring | Focus ring visible and high-contrast — good | 01-dashboard-desktop-keyboard-focus-01.png |
| "Join" (hero action, when live/upcoming) | Link | Not clicked (no live/upcoming consult at audit time — button absent) | code-derived: `nextAppointment?.meetingUrl` gate, `page.tsx:143-154` | — | — |
| "My appointments" / "Add availability" (empty-schedule CTA) | Link | Not clicked (navigates away) | code-derived: correct hrefs into `/doctor/appointments` and `/doctor/availability` | — | 01-dashboard-desktop-default-01.png |
| "See all" (notifications panel) | Link | Not clicked | code-derived: `/doctor/notifications` | — | — |
| QuickActionCard × 3 (Patients/Forms/Invoices) | Link | Not clicked | code-derived: correct hrefs, static hint copy | Generic hint copy, not data-driven (21-001) | 01-dashboard-desktop-default-01.png |

## 8. Page States Tested

| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Default, zero appointments today, 12 open overall | Yes | — | Hero reads "No consults today", stat row shows 0/0, but OPEN=12 nowhere in the hero — a doctor glancing only at the hero would think the day/queue is genuinely empty | 10-001 |
| Compliance banner visible (2FA not enabled) | Yes | — | Renders correctly, link to `/doctor/security` | — |
| Compliance banner dismissed | Yes | — | Hides for session; code-derived that it returns next session (`sessionStorage`, `compliance-banner.tsx:7,41`) | 10-004 |
| Notification popover, populated (1 unread) | Yes | — | Renders "Appointment assigned" item with patient/type/date/payment summary | — |
| Notification popover / page load — transient error | Yes | — | One run (after 3 rapid successive server-fetch navigations) rendered `AdminCard` with "Could not load doctor profile" instead of the hero/stat grid; a fresh isolated load immediately after succeeded normally | 08-001 (code-derived root cause: `fetchDoctorMe()` failure path at `page.tsx:56-69`, likely a transient backend/dev-server hiccup under back-to-back requests rather than a UI bug) |
| Empty "Today's schedule" | Yes | — | `AdminEmptyState` with asset, title "No open appointments today", 2 CTAs — good pattern | — |
| Mobile nav drawer | Yes | — | Full nav accessible, overlay dims background | — |
| Missing-meeting-link pending banner | Code only | Yes | Not triggerable at audit time (no appointment within 24h); code at `page.tsx:193-238` renders correctly per review | Mark not-browser-verified |
| Loading state | Not tested | — | Server component with `force-dynamic`; no client-side skeleton observed. `CommandBand` accepts a `loading` prop (`atoms.tsx:293`) but `page.tsx` never passes it — first paint is either the full data or nothing (Suspense boundary not present in this file) | 12-001 |

## 9. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| 01-dashboard-desktop-default-01.png | 1440×900 | default, top | Hero + 3 stat cards + today's schedule + notifications | 10-001, 11-001 |
| 01-dashboard-laptop-default-01.png | 1280×720 | default | Laptop breakpoint check | — |
| 01-dashboard-tabletl-default-01.png | 1024×768 | default | Tablet-landscape breakpoint check | — |
| 01-dashboard-tabletp-default-01.png | 768×1024 | default | Tablet-portrait breakpoint check | — |
| 01-dashboard-mobile-default-01.png | 390×844 | default | Mobile stacking | 19-001 |
| 01-dashboard-smobile-default-01.png | 375×667 | default | Smallest supported width | 19-001 |
| 01-dashboard-short-default-01.png | 1366×650 | default | Short-viewport fold check | 19-002 |
| 01-dashboard-desktop-bell-open-01.png | 1440×900 | transient error state (see 8) | Notification-click run surfaced "Could not load doctor profile" instead of the popover | 08-001 |
| 01-dashboard-desktop-usermenu-open-01.png | 1440×900 | user menu open (same transient error state underneath) | Confirms user menu itself renders correctly (solid surface) even while the page body is in an error state | — |
| 01-dashboard-desktop-banner-dismissed-01.png | 1440×900 | compliance banner dismissed | Confirms dismiss control works | 10-004 |
| 01-dashboard-desktop-keyboard-focus-01.png | 1440×900 | 7 Tab presses from load | Confirms visible focus ring on sidebar nav | — |
| 01-dashboard-mobile-navdrawer-open-01.png | 390×844 | mobile nav drawer open | Confirms full nav accessible on mobile | — |

## 10. UX Problems

### 01-001 — Hero and stat row bury the real backlog: "No consults today" reads as "nothing to do" while 12 appointments sit OPEN (High, Clinical Hierarchy)
**Browser evidence**: `01-dashboard-desktop-default-01.png` — hero title "No consults today", TIME/TODAY/THIS WEEK metrics all "—"/0/0; the OPEN=12 stat card sits visually equal-weight three cards to the right, easy to skim past.
**Doctor impact**: a doctor scanning only the hero (the highest-contrast, first-read element) concludes the queue is empty. The actual signal — 12 open appointments needing attention, just none scheduled for today — is demoted to a same-size stat tile with no distinguishing treatment (no warning tone, no CTA).
**Root cause**: `page.tsx:125-190` — hero metrics are Time/Today/This week only; `stats.totalActive` (the OPEN count) is not surfaced in the `CommandBand` at all, and the `StatCard` for OPEN uses `tone={undefined}` (neutral) regardless of value (`page.tsx:184-189` — no `tone="warning"` when `stats.totalActive > 0`, unlike the equivalent appointments-page treatment which does tone the OPEN CONSULTS card, `appointments/page.tsx:134`).
**Recommended resolution**: when `stats.totalActive > 0` and today's count is 0, change the hero context line from "No consults today" to something backlog-aware, e.g. "No consults today · 12 open in your queue" with the OPEN stat card promoted to `tone="warning"` and linked (`href="/doctor/appointments"`) like `StatCard` already supports (`atoms.tsx:379-381`).

### 01-002 — Compliance banner and pending-action banner share one visual language (green-tinted `AdminCard` + left border) with different urgency (Medium, Visual Design)
**Browser evidence**: `01-dashboard-desktop-default-01.png` — compliance banner uses `--portal-warning` left border in the same soft-green wash as the rest of the page chrome.
**Doctor impact**: a required, blocking-eventually compliance action ("takes about 5 minutes... before patient-record protections are enforced") reads with the same visual weight as an FYI notice; nothing about its color separates it from a benign informational card.
**Root cause**: `compliance-banner.tsx:58-66` sets `borderLeft: 3px solid var(--portal-warning)` and text color `--portal-warning-text`, but the card background itself is the default `.gh-admin-card` neutral surface, not a warning-tinted background.
**Recommended resolution**: give the compliance banner a warning-tinted background (not just border) to match its actual severity, consistent with how `StatCard`/`AdminSummaryStrip` already use `tone="warning"` backgrounds elsewhere in the same portal.

### 01-003 — "Today's schedule" and "Unread notifications" panels have mismatched information density with no shared "why is this here" logic (Low, Information Hierarchy)
**Browser evidence**: `01-dashboard-desktop-default-01.png` — left panel lists full appointment rows (time, name, type, status, Join/Open); right panel lists only notification type + snippet, no timestamp, no read/unread visual distinction beyond the section being scoped to unread-only.
**Doctor impact**: minor — the notifications panel can't answer "when did this happen" without opening `/doctor/notifications`.
**Root cause**: `page.tsx:329-350` maps `unreadNotifs` without a timestamp render.
**Recommended resolution**: add a relative timestamp ("2h ago") per row — data (`n.createdAt` equivalent) is already fetched, just not rendered here.

### 01-004 — Compliance banner dismiss is silent and unexplained (Low, Microcopy/Trust)
**Browser evidence**: `01-dashboard-desktop-banner-dismissed-01.png` — banner vanishes with no toast/confirmation.
**Doctor impact**: a doctor who dismisses it may believe the compliance item is resolved, not merely hidden for the session; code confirms it reappears next session regardless of whether 2FA/confidentiality got resolved (`compliance-banner.tsx:7,36-45`).
**Root cause**: `dismiss()` (`compliance-banner.tsx:49-56`) has no accompanying copy change.
**Recommended resolution**: the dismiss `aria-label` already says "Dismiss compliance reminder" (fine for a11y) — add a one-line microcopy note near the action items themselves, e.g. a small "(dismissed reminders return next session until complete)" caption, so the behavior isn't a surprise.

## 11. Visual Design Problems

- **11-001**: Both `AdminCard > SectionHeader > div.p-5` panels ("Today's schedule", "Unread notifications") stack the card's own top edge and `SectionHeader`'s own divider within a few pixels of each other — two "this is a new section" cues doing the same job. A single header row with a bottom rule (no separate `AdminCard` chrome layer) would read identically with one fewer visual seam. This is the same pattern flagged on the patient dashboard audit (01-dashboard.md §8, issue 01-007) — worth fixing once in `SectionHeader`/`AdminCard` composition rather than per-portal.
- Repeated icon-badge treatment: the same rounded-square icon chip (`.gh-portal-icon-badge`) appears on all 3 `StatCard`s and both panel `SectionHeader`s — consistent, not a problem on this page specifically, but reduces the "signal" value of the icon (every card looks equally important).
- `QuickActionCard` (bottom row) is the flattest, best surface on the page — a plain link row with an icon tile, no card chrome, no shadow. Worth using as the template for flattening card-per-item patterns elsewhere in the portal (see `02-appointments.md`).

## 12. Information Hierarchy Problems

- **12-001**: No loading/skeleton state wired up (`CommandBand`'s `loading` prop is unused, see §8) — on a slow network the doctor sees a blank body until the whole server-rendered page resolves, no progressive reveal.
- OPEN stat (12) is the most actionable number on the page but is visually identical in weight/tone to TODAY (0) and THIS WEEK (0) — see 10-001.

## 13. Current Section Order

1. Compliance banner (conditional)
2. Hero (CommandBand)
3. Stat row (Today/This week/Open)
4. Pending-action banner (conditional)
5. Today's schedule + Unread notifications (2-col)
6. Quick actions (Patients/Forms/Invoices)

## 14. Recommended Section Order (+ reasons)

1. Compliance banner (unchanged — must-see, blocking, keep at top)
2. Hero (CommandBand) — but rebalance copy per 10-001 so OPEN backlog is visible here when TODAY is 0
3. Pending-action banner (conditional) — promote above the stat row when present; it's a "do this now" item and currently sits *below* three static stat tiles that carry no action
4. Stat row (Today/This week/Open) — unchanged position otherwise
5. Today's schedule + Unread notifications (2-col) — unchanged, correct pairing (queue + inbox)
6. Quick actions — unchanged, correct as a footer-level nav aid

Reasoning: the only structural change needed is promoting the pending-action (missing meeting link) banner above the static stat row when it's present, since it's the one section on this page that demands an action versus reporting a number — and fixing the hero copy so "no consults today" doesn't read as "no work to do."

## 15. Tabs/Steps/Sectioning Recommendation

Not needed. This page is short (6 sections, no scroll past ~1100px on desktop) and each section is already single-purpose. No tab/step restructuring recommended — this is the one dashboard-shaped page in the portal that doesn't need it.

## 16. Save & Finalization Recommendation

N/A — no forms, no save actions on this page. All controls are either read-only display or navigation.

## 17. Proposed Page Structure (exact top-to-bottom)

1. Compliance banner (conditional, background tinted per 10-002)
2. Hero (CommandBand) — context line backlog-aware per 10-001
3. Pending-action banner (conditional, when present, promoted above stat row)
4. Stat row — OPEN card gets `tone="warning"` + `href="/doctor/appointments"` when `> 0`
5. Today's schedule + Unread notifications (2-col, notifications gain relative timestamps per 10-003)
6. Quick actions row

## 18. Proposed Container Simplification

- **Keep**: `CommandBand` hero, 3 `StatCard`s, both list panels, `QuickActionCard` row — all are real content, none are decorative card-wrapping.
- **Flatten**: `AdminCard > SectionHeader > div.p-5` → single `<section>` with one header row + bottom rule, removing the double-edge effect (11-001). Applies to both "Today's schedule" and "Unread notifications" panels.
- **No removals**: unlike `/account` (patient dashboard) or `/doctor/appointments`, this page has no purely-decorative stat cards or duplicate CTAs to cut — the 3 stat cards are all real distinct counts, and there's no `AdminSummaryStrip` misuse here.

## 19. Responsive Findings (per viewport)

- **Desktop (1440)** — as designed, no issues.
- **Laptop (1280)** — no issues, `01-dashboard-laptop-default-01.png` matches desktop proportionally.
- **Tabletl (1024)** — no issues.
- **Tabletp (768)** — stat row and 2-col grid both stack cleanly.
- **19-001 Mobile (390) / Smobile (375)** — page stacks correctly, no overflow; a floating black circular "N" badge (support/help widget, fixed-position, bottom-left) sits directly over the sidebar footer branding text ("MEDICINE ANYTIME ANYWHERE" is clipped behind it) — same widget/branding overlap present on `02-appointments`, likely a shell-wide z-index issue, not page-specific. See `02-appointments.md` 19-001 for the fuller repro (it also covers stat-card content there).
- **19-002 Short (1366×650)** — `01-dashboard-short-default-01.png`: hero + start of stat row visible above the fold, rest requires scroll; no sticky element traps the view, scroll behaves normally. Low severity, noted for completeness.

## 20. Accessibility Findings

- Heading order: H2 "No consults today" (hero title, inside `CommandBand`) appears before any H1 — the page has no visible H1; `PortalShell`'s own chrome may supply one outside the dump window. Worth confirming a single H1 exists per page (code-check recommended, not fully verified this pass).
- Focus visibility: confirmed good — Tab order lands on sidebar nav items with a clear lime focus ring (`01-dashboard-desktop-keyboard-focus-01.png`).
- Icon-only controls: notification bell and user-menu triggers both carry accessible text ("1 unread notifications", "Dr. Global Health" name) — not icon-only, good.
- Status not color-only: compliance banner and pending-action banner both pair icon + text with color, not color alone — good.
- Contrast: not spot-checked with a computed-contrast script this pass; visually the warning-text-on-tinted-background combinations read as adequate at normal size. Flag for a dedicated contrast pass if this page is revised (ties to 10-002's background-tint change, which would need its own contrast check).
- Modal/popover focus trap: user menu and notification popover were not tested for `Escape`-to-close reliability under keyboard-only navigation (mouse-driven this pass) — mark not-fully-verified.

## 21. Content & Microcopy Findings

| Current | Recommended | Reason |
|---|---|---|
| "No consults today" (hero, when OPEN > 0) | "No consults today · 12 open in your queue" | See 10-001 — avoids reading as "nothing to do" |
| QuickActionCard hints: "Search + history", "Intake / pre-consult / follow-up", "Payment status + history" | Keep — these are already specific, not generic ("Open"/"View") | No change needed; flagged only as a positive contrast to the patient-dashboard audit's equivalent finding |
| Compliance banner: "Complete your compliance setup" / "takes about 5 minutes" | Keep — specific and time-boxed, good pattern | — |

## 22. Component & Code Impact

| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| Hero copy + OPEN stat tone | `frontend/app/(doctor)/doctor/page.tsx:125-190` | Backlog-aware context string + conditional `tone`/`href` on OPEN `StatCard` | No (page-local) | Low | Small |
| Compliance banner background | `frontend/app/(doctor)/doctor/_components/compliance-banner.tsx:58-66` | Add warning-tinted background, not just border | No (doctor-only) | Low | Small |
| Panel header flattening | `frontend/app/(doctor)/doctor/page.tsx:242-359`, possibly `AdminCard`/`SectionHeader` in `frontend/app/(admin)/admin/_components/atoms.tsx` | Reduce `AdminCard > SectionHeader` double-edge | Yes — shared atom, changing it affects admin/patient portals too | Medium (shared-component change needs cross-portal check) | Medium |
| Notification timestamps | `frontend/app/(doctor)/doctor/page.tsx:329-350` | Render relative time per notification row | No | Low | Small |
| Loading skeleton | `frontend/app/(doctor)/doctor/page.tsx` | Wire a `Suspense` boundary or pass `CommandBand`'s existing `loading` prop | No | Low-Medium (needs a fallback data shape) | Medium |

## 23. Backend or Business-Logic Impact

- Frontend-only for 10-001 (copy/tone), 10-002 (banner background), 10-003 (timestamp render — data already fetched), 10-004 (dismiss copy).
- 08-001 (transient "Could not load doctor profile") is backend/infra: needs investigation on whether `fetchDoctorMe()`/`GET /api/doctor/me` has a rate-limit or connection-pool ceiling that a doctor could hit in normal rapid navigation (e.g. tabbing between Overview and Appointments quickly). Flag for backend review — not confirmed reproducible in this pass, but the code path that renders it (`page.tsx:56-69`) is real and would show this exact error to a doctor if the backend call fails for any reason.
- 12-001 (loading skeleton) is frontend-only but would benefit from confirming the underlying `fetchDoctorMe`/`fetchDoctorAppointments`/`fetchDoctorNotifications` calls' typical latency in production, not just dev.

## 24. Recommended Implementation Order

1. 01-001 (hero/stat backlog visibility) — highest clinical-hierarchy impact, small diff
2. 01-002 (compliance banner background) — small diff, correctness of visual urgency
3. 01-003 (notification timestamps) — small diff
4. 01-004 (dismiss microcopy) — trivial copy addition
5. 11-001 (panel header flattening) — defer until coordinated with the shared-atom owner (affects admin/patient too)
6. 12-001 (loading skeleton) — defer, needs latency data first

## 25. Acceptance Criteria (measurable)

- When `stats.totalActive > 0` and today's count is 0, the hero context string includes the open count and the OPEN `StatCard` renders with `tone="warning"` and is a clickable link to `/doctor/appointments`.
- Compliance banner background is visually distinguishable (not just border) from a neutral `AdminCard` at a glance (manual visual QA, no numeric target needed given no existing contrast-ratio regression risk).
- Each unread-notification row shows a relative or absolute timestamp.
- Dismiss button area includes a one-line caption about session-only dismissal, visible without additional interaction.

## 26. Open Questions

- Should the pending-action (missing meeting link) banner's threshold stay at 24h, or should a near-real-time doctor portal use a tighter window (e.g. 4h) so it doesn't compete for attention with genuinely same-day urgency? Not evaluated this pass — no missing-link appointments existed in the test account's next-24h window.
- Is the "Could not load doctor profile" error path (08-001) actually reachable by a doctor in production, or was it an artifact of this session's rapid automated navigation? Needs backend-side rate-limit/log review, not answerable from the frontend alone.
- Should `/doctor` show an H1 at the page-content level (not just inside `PortalShell`'s chrome)? Not fully verified this pass which element carries H1 semantics.
