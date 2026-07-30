# A1 Findings — Runtime & Layout Investigation

Investigator: Sonnet agent A1 · 2026-07-12 · runtime pass (Playwright, frontend :3000 + backend :4000)

**Method:** Logged into all three portals via Playwright. NOTE: local backend DB is the
Railway prod proxy — treat as read-only, never seed/mutate. Credentials from
`docs/testing/manual-tests/test-results.md` (`globalhealth@myglobalhealth.online` / `doctor@...` /
`patient@...`) plus appointment `9482a98c-1ad7-4c77-9c48-746806e322f4`. Tested 94
route×viewport combos across all 9 required viewports on `/admin/appointments/[id]`,
`/admin/services`, `/doctor/appointments/[id]`, `/doctor/appointments`, `/doctor/calendar`,
`/account`, `/account/bookings`, `/account/calendar`, `/account/profile`, `/account/family`
— measuring page-level `scrollWidth` vs `clientWidth`, automated bounding-box overlap scan
over tab/card/panel/rail elements, and screenshotting each. Screenshots:
`docs/plans/portal-implementation/screenshots/before/` (113 files).

## Confirmed root cause (bug #1 in TASK.md)

**No shared sticky-offset/z-index contract.** Three components each hardcode their own
numbers instead of deriving from the topbar's real height or `--z-header`:

- Topbar: `sticky top-0`, `h-16` (64px) — `frontend/components/portal-shell.tsx:276`
- Doctor tab strip: `sticky top-[58px] z-10` (6px short of header, z-10 ≪ `--z-header: 200`) — `frontend/app/(doctor)/doctor/appointments/[id]/_components/appointment-tabs.tsx:76`
- Patient context rail: `lg:sticky lg:top-4` (16px, **no z-index at all**) — `frontend/app/(doctor)/doctor/appointments/[id]/page.tsx:590`

Confirmed at runtime both programmatically (bounding-box overlap up to 2308px² between
`.gh-portal-tab` and `.gh-doctor-context-rail`/its `FormSection` card at 1024×600) and
visually via scrolled screenshot — the sticky Patient card and sticky tab strip land on the
same row with mismatched top edges. Reproduces at every short/wide viewport once scrolled
(1024×600, 1280×500, 1366×768, 1440×550).

Also: tab-strip wrapper hardcodes `bg-white/80`, breaking the dark Obsidian Ivory theme,
and duplicates chrome (edge-fade mask, border) that `.gh-portal-tabs`/
`components/PortalTabs.tsx` already provides — a second ad-hoc wrapper instead of a
sticky-aware primitive.

## Other findings

- **Missing tablet fallback (bug #1, part 2):** below `lg` (1024px) the rail just stacks
  under all six tab panels — no dedicated Patient tab/drawer/collapsible summary exists at
  any width.
- **Admin/doctor appointment-detail IA divergence (bug #2):** `/admin/appointments/[id]`
  has no tabs at all (flat two-card layout); `/doctor/appointments/[id]` has 6 tabs. No
  shared architecture unifies them.
- **Calendars already unified at code level**: admin/doctor/patient calendars all share
  `components/calendar/MonthCalendar.tsx`, `DayAgenda.tsx`, `EventDetailDialog.tsx`; only
  the doctor calendar's day view skips `AppSheet` where admin uses it.
- **No page-level horizontal overflow found anywhere** (all 94 samples); **no bare `100vh`**
  anywhere (grep-verified) — the height-clipping bug class is localized to the
  sticky-offset mismatch, not blanket.
- Other `PortalTabs` consumers (admin service/doctor/plan/health-test translation tabs,
  patient profile tabs) render inline, un-stickied, clean.

## Non-layout observations (flagged, not fixed)

- Doctor/patient login shows "Logged in… Redirecting…" but the client-side redirect stalls;
  hard nav to `/doctor` or `/account` after cookie set works — only the redirect hangs
  (`app/(auth)/(public)/login/ui.tsx`).
- Admin session dropped mid-run twice, requiring re-login — possible JWT/cookie expiry.
- One `networkidle` timeout at 390×844 on doctor appointment page, non-reproducible —
  likely chat websocket keeping the connection busy.

## Not covered in this pass

200% zoom, drawer/dropdown-open states, calendar popovers — re-run in Phase F once the
sticky-offset fix lands.
