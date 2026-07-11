# Intentional Horizontal Scroll Register

Phase 8 register of every element that is ALLOWED to scroll horizontally.
Everything not on this list that overflows the viewport horizontally is a bug.

This list is the allow-list for the Playwright page-level overflow test
(`frontend/tests/e2e/responsive.spec.ts` → `HSCROLL_ALLOWLIST`). **Keep the two
in sync**: adding an entry here means adding its selector there, and vice versa.

Justification standard: the content is either genuinely two-dimensional (a
grid whose columns are a time axis / data columns) or deliberately linear (a
strip meant to be swiped), AND the element carries a visible affordance
signalling off-screen content.

| # | Element | File | Why justified | Affordance |
|---|---------|------|---------------|------------|
| 1 | Booking time-slot strip (service-first flow) | `frontend/app/(site)/[country]/[lang]/book/_components/service-time-picker.tsx:112` | Deliberately linear: a same-day time strip is a 1-D swipe rail; wrapping it into a grid buries the earliest slots below the fold and breaks the "pick the next slot" scan. | `gh2-scroll-fade` edge-fade mask + thin scrollbar (`[scrollbar-width:thin]`). |
| 2 | Booking time-slot strip (consult flow) | `frontend/app/(site)/[country]/[lang]/consult/[serviceSlug]/_components/slot-picker-step.tsx:115` | Same as #1 — identical slot-rail pattern. | `gh2-scroll-fade` edge-fade mask + thin scrollbar. |
| 3 | WeekCalendar 720px grid | `frontend/components/calendar/WeekCalendar.tsx:261` | Genuinely 2-D: 7 day columns × time rows. Columns ARE the time axis; collapsing them destroys the week view. 720px min grid scrolls inside its own wrapper. | Native scrollbar on the wrapper (`overflow-x-auto`); grid lines make the cut-off column visibly partial. |
| 4 | Marquees (TrustMarquee / CountryMarquee / MarqueeTrack) | `frontend/components/sections/TrustMarquee.tsx`, `CountryMarquee.tsx`, `MarqueeTrack.tsx` | Deliberately linear: infinite auto-scrolling brand/country strip. Motion is the content; it never captures user scroll (overflow hidden, transform animation). | Continuous animation itself signals the strip extends off-screen. |
| 5 | PortalTabs strip | `frontend/components/PortalTabs.tsx:52` + `frontend/app/portal.css` `.gh-portal-tabs` | Deliberately linear: single-row tab strip; wrapping tabs to two rows breaks the tablist pattern and eats vertical space in portal headers. | Edge-fade `mask-image` on both ends (portal.css `.gh-portal-tabs` rule); `overflow-y: hidden` keeps the strip one row. |
| 6 | Admin audit-log wide table | `frontend/app/(admin)/admin/audit-log/page.tsx:324` | Genuinely 2-D: forensic log where every column (actor, action, entity, IP, timestamp, diff) is load-bearing; column-priority hiding would hide evidence. Scrolls inside its own `gh-cpt-table-wrap`, never the page. | Wrapper border + native scrollbar; card mode below the 760px cpt band. |
| 7 | Corporate bulk-upload CSV preview | `frontend/app/(corporate)/corporate/employees/bulk-upload-form.tsx:158` | Genuinely 2-D: mirrors the user's own CSV columns 1:1; reflowing columns would misrepresent the file being validated. | `gh-hscroll-fade` edge-fade mask + native scrollbar. |
| 8 | Admin invoices table (`.gh-admin-ops-table-wrap`) | `frontend/app/(admin)/admin/invoices/_components/admin-invoices-table.tsx` | Same ColumnPriorityTable card-switch pattern as #6 — shares the ops table-wrap class with audit-log. | Wrapper border + native scrollbar; card mode below the 760px cpt band. |
| 9 | Doctor patient detail raw table (`.gh-doctor-table-wrap`) | `frontend/app/(doctor)/doctor/patients/[email]/page.tsx` | One remaining hand-rolled `<table>` not yet on ColumnPriorityTable (Phase 5 scope note); real column budget exceeds the card-switch band. | 760px min-width wrapper + native scrollbar; scoped to this route only. |

Note: `WeekCalendar` (#3) and any future bare `overflow-x-auto` wrapper don't need a named entry in `HSCROLL_ALLOWLIST` — the overflow test's generic ancestor-clip check (any ancestor with `overflow-x: auto/scroll/hidden/clip`) already exempts them structurally. Named allowlist entries are only needed for affordance classes (`gh2-scroll-fade`, `gh-hscroll-fade`, `gh-portal-tabs`, `gh-marquee-track`) and CPT-family table-wraps (`gh-cpt-table-wrap`, `gh-doctor-table-wrap`, `gh-admin-ops-table-wrap`) plus the generic `[role="tablist"]` hook for admin-main tablists sharing the `gh-portal-tabs` rule.

Rules for future additions:

1. The scroll container must be an inner wrapper — the **page body must never
   scroll horizontally** at any viewport in the test matrix.
2. Every new entry needs an affordance (`gh-hscroll-fade` / `gh2-scroll-fade`
   edge mask, or an equally visible cue) — bare `overflow-x-auto` is not enough.
3. Add the entry here AND to `HSCROLL_ALLOWLIST` in `responsive.spec.ts` in the
   same commit.
