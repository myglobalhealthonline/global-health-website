# Portal UI/UX Implementation — Task Definition

Date: 2026-07-12 · Branch: Dev-hassaan · Orchestrator: Fable (brains) · Execution: Sonnet agents (hands)

## Objective

Complete runtime inspection + implementation pass across Admin, Doctor, and Patient/Account
portals. Fix every layout, responsiveness (width AND height), alignment, clipping, tab,
drawer, form, and calendar issue in scope. This is an implementation task — not an audit.
Prior responsive work (Phases 2–8 in docs/responsive-audit/) did NOT sufficiently fix the
Doctor and Patient portals; do not assume any plan item was actually implemented.

## Critical reported problems

1. **Doctor appointment workspace misaligned** — patient info renders above/over the
   appointment tabs, overlaps content, sections crowd/clip at short heights, calendar
   doesn't match Admin calendar, forms scattered.
   Required structure:
   - Large desktop: two-region layout — main workspace left, patient context rail right.
     Rail sticky only with sufficient vertical space; never overlaps header/tabs/footer/
     dialogs. Both columns `min-width: 0`; no page-level horizontal overflow.
   - Tablet/small laptop: NO squeezed two-column. Patient context becomes a dedicated
     Patient tab, OR a "Patient details" button opening the shared themed drawer, OR a
     collapsible in-flow summary. Never a floating card above the tabs.
   - Mobile: one column; patient info via Patient tab or drawer/sheet. No horizontal scroll.

2. **Admin portal tab issues** — audit every tabbed interface: content above tab strip,
   cards overlapping tabs, sticky-header cover, wrong sticky offsets, z-index competition,
   content escaping containers, negative margins, clipping, inaccessible labels on narrow
   screens, wrong active indicators, hidden horizontal scroll, overlays beneath tabs,
   tabs shifting on content load. One shared tab architecture across all three portals.

3. **Height-based responsiveness** — 1440×550, 1024×600, 1280×500 etc. must not clip.
   Principles: `min-height` over fixed height; `100dvh` not bare `100vh`; `min-height: 0`
   / `min-width: 0` on nested flex/grid children; explicit scroll owner; no accidental
   nested scroll regions; no `overflow: hidden` to hide defects; reflow before shrinking
   type; sticky headers relaxed/disabled at short heights; safe areas verified.

4. **Appointment tabs / IA** — reorganise Doctor appointment workspace into a clinical
   workflow (e.g. Overview · Consultation · Clinical · Forms · Documents · Messages ·
   Patient — final structure per actual data). Tab requirements: no overlap with patient
   context, readable labels/badges, obvious active tab, unsaved form state preserved on
   switch, hidden panels don't affect layout, `?tab=`/hash deep links work, back/forward
   sensible, ARIA tablist/tab/tabpanel, keyboard navigation, mobile scroll affordance
   (edge fade), consistent content start position, sticky offsets from shared CSS vars
   (no hardcoded numbers), z-index from design tokens.

5. **Forms reorganised** — inventory long forms in admin/doctor appointment workflows,
   doctor profile/availability, patient profile/family/insurance/verification, booking,
   corporate (shared components). Group into tabs/sections/steps/accordions/drawers.
   One column narrow, two columns only with adequate width. Preserve payloads, server
   actions, validation. Preserve entered state on tab switch. Action area reachable on
   short heights; no sticky footer covering final fields.

6. **Calendar consistency** — Doctor and Patient calendars must match the Admin calendar
   system (header, nav, today, month/week/day, typography, event cards, status colours,
   empty/loading states, timezone, legends, popovers, mobile, keyboard/SR). Extract
   shared primitives; role permissions differ, design language doesn't. Month cells
   usable on phones; intentional internal horizontal scroll only; overlays above calendar
   within viewport.

7. **Drawer/sheet redesign** — one shared themed drawer primitive matching Global Health
   portal theme (lux tokens). Desktop/tablet side drawer, mobile near-full-height sheet,
   `100dvh`, scrollable body, stable header, optional footer, safe areas, Esc, close btn,
   focus trap + restoration, scroll lock, accessible labelling, click-outside, dirty-form
   protection, loading/empty/error states, portal to document.body, z tokens. Body never
   extends beneath footer; no fixed-height clipping on short displays.

8. **Theme consistency** — reuse existing tokens/primitives (portal.css lux system,
   PortalTabs/PortalDialog/AppMenu/AppSheet/ColumnPriorityTable/PortalMobileCard).
   No hardcoded colours, no generic shadcn look, no new palettes, no per-portal drift.

## Constraints

- No backend changes unless truly necessary and justified first.
- Preserve: role permissions, PHI gates, audit logging, server actions, API contracts,
  route params, deep links, query filters, i18n, timezone formatting, validation,
  draft/signed consultation states. No extra PHI in list payloads for drawers.
- CSS split rule: portal-only → `frontend/app/portal.css`; public/shared →
  `frontend/app/globals.css`; never both. New glass classes join both mobile fallback
  blocks in their file.
- No blanket ESLint/TS suppressions.

## Runtime testing matrix (mandatory)

Mobile: 320×568, 360×640, 375×667, 390×844, 430×932
Tablet: 768×1024, 820×1180, 1024×768
Short/wide (primary failure zone): 1024×600, 1180×600, 1280×500, 1280×600, 1366×600,
1366×768, 1440×550, 1440×700
Desktop: 1440×900, 1536×864, 1920×1080
Plus: 125/150/200% zoom, sidebar open/collapsed, long names/labels, empty/large data,
validation errors, drawer/dropdown/calendar-popover open, each appointment tab active.
Before/after screenshots for main broken pages.

## Automated regression (Playwright)

No page-level horizontal overflow (allow-list intentional components only); tabs visible
and clickable; patient context never overlaps tabs; patient info accessible at every
breakpoint; drawer fits viewport, body scrolls short-height, footer reachable; overlays
not clipped; forms operable mobile + short-height; tab switch preserves state; calendars
share structure; keyboard tab nav + dialog close; focus restoration; nothing hidden
behind shell header; no unreachable primary action.

## Definition of done

- Patient info never over/above doctor appointment tabs.
- Admin tab issues fixed; tab behaviour consistent across portals.
- Doctor + Patient calendars match Admin calendar design system.
- Long forms logically organised; drawers themed + short-height safe.
- Every main page responds to width AND height; no clipped primary content; no
  accidental horizontal scroll; mobile + short-wide usable; 200% zoom functional.
- Overlays layer correctly; focus/keyboard works; permissions/data unchanged.
- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build`, `npx playwright test` pass.
- Before/after screenshots for principal routes.

## Final report format

1. Root causes found · 2. Shared components changed · 3. Routes fixed (per portal) ·
4. Files changed · 5. Responsive verification · 6. Accessibility verification ·
7. Test results · 8. Remaining limitations.
