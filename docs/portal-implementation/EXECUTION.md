# Portal UI/UX Implementation — Execution Plan

Model split: **Fable = orchestrator/reviewer** (consolidates findings, reviews every
diff, owns shared-file sequencing). **Sonnet = execution** (investigation, implementation,
testing agents via Agent tool, model: sonnet).

Working docs live in `docs/portal-implementation/`:
- `TASK.md` — scope + definition of done (this task's contract)
- `EXECUTION.md` — this file; phase status updated as work lands
- `FINDINGS.md` — Phase A consolidated root-cause map (written after investigation)
- `VERIFICATION.md` — Phase F matrix results + screenshot index

Screenshots: `docs/portal-implementation/screenshots/{before,after}/`.

## Phase A — Reproduce & document (4 parallel Sonnet investigators)

A1 Runtime/Layout Investigator — run dev server, reproduce doctor appointment detail
   breakage + admin tab issues at matrix viewports (esp. 1440×550, 1024×600, 768×1024);
   record route, viewport, exact failure, overflow ancestor, computed sticky offsets,
   stacking contexts. Before-screenshots.
A2 Theme/Component Investigator — static: source-of-truth components (PortalTabs,
   PortalDialog, AppMenu, AppSheet, RecordDetailsDrawer, ColumnPriorityTable, calendars);
   duplicated tab/drawer/calendar/form patterns across (admin)/(doctor)/(auth)/account/
   (corporate); which become shared.
A3 Forms/Workflow Investigator — inventory long forms (admin+doctor appointment, doctor
   profile/availability, patient profile/family/insurance/verification, booking,
   corporate); propose grouping; confirm regrouping preserves payloads/permissions.
A4 Accessibility/Overlay Investigator — focus traps, keyboard nav, z-index inventory,
   portal mounting, scroll locking, 100vh/overflow-hidden/negative-margin/hardcoded-
   offset sweep; short-height drawer/modal behaviour.

Gate: Fable consolidates into `FINDINGS.md` (root-cause map, shared vs route-specific).

## Phase B — Shared foundations (sequential; one agent per shared file cluster)

B1 Sticky offset + overlay z-index CSS variables (portal.css) — single source:
   `--portal-header-h`, `--portal-tabs-offset`, z-token scale.
B2 Shared portal tab system — one PortalTabs used by all three portals; ARIA, keyboard,
   `?tab=` deep links, mobile scroll affordance (edge fade), sticky via shared vars,
   hidden panels layout-inert.
B3 Shared themed drawer/sheet — refine AppSheet/RecordDetailsDrawer per TASK §7 (dvh,
   scroll owner = body, stable header/footer, focus trap/restore, dirty-form guard,
   z tokens, portal mount).
B4 Shared responsive form recipes — FormSection primitives: section headers, 1→2 column
   grid rules, action-bar placement, short-height behaviour.
B5 Shared calendar primitives — extract from best Admin calendar; header/nav/today/
   views/event cards/status colours/empty/loading/popovers/mobile.
B6 Shell audit — width/height scroll ownership, dvh, min-height:0 chain, sidebar states.

Gate: lint + tsc after each Bn; Fable reviews diffs before next Bn.

## Phase C — Doctor portal (order fixed)

C1 Appointment detail workspace rebuild (two-region desktop, Patient tab/drawer at
   tablet/mobile, sticky rules per TASK §1)
C2 Appointment tabs (shared system, IA reorg per TASK §4)
C3 Patient context behaviour
C4 Consultation + clinical forms (shared recipes)
C5 Doctor calendar (shared primitives)
C6 Appointment list
C7 Documents + messages layouts

## Phase D — Patient portal

D1 Appointments/bookings list · D2 Appointment detail · D3 Calendar/scheduling views ·
D4 Profile forms · D5 Insurance · D6 Verification · D7 Family members ·
D8 Payments + documents

## Phase E — Admin portal

E1 Remaining tab issues (all tabbed admin pages) · E2 Appointment detail ·
E3 Calendar consistency check · E4 Drawers on shared primitive · E5 Long forms ·
E6 Short-height clipping · E7 Shared component adoption sweep

## Phase F — Verification

F1 Full viewport matrix (runtime, per TASK) + after-screenshots
F2 Playwright regression suite (add/update per TASK §Automated regression)
F3 `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test` · `pnpm build` · `npx playwright test`
F4 Write `VERIFICATION.md` + final report per TASK format

## Rules of engagement

- No two agents edit the same shared file concurrently; shared foundations land before
  route-level fixes.
- Agents must not invent competing tab/drawer/calendar systems — consume Phase B output.
- Every diff reviewed by Fable before the next dependent phase starts.
- Route reported fixed only after runtime open at required viewports.

## Status

- [x] Phase A investigation (A1 runtime, A2 components, A3 forms, A4 a11y — done)
- [x] FINDINGS.md consolidated
- [x] Phase B shared foundations (commit 4ca59296)
- [x] Phase C doctor (commit 07d75ad2; calendar/list runtime matrix deferred to F)
- [x] Phase D patient (commit 21b7dacd)
- [x] Phase E admin (commit 21b7dacd)
- [x] Phase F verification + report (VERIFICATION.md; lint/tsc/test 67/67/build/playwright 52/52 green)
