# Accessibility Summary — Patient Portal

Date: 2026-07-12. Method: accessibility-tree probes + keyboard tests via Playwright/browser pane + code inspection. Not a substitute for a full assistive-technology pass; contrast figures below are flagged suspicions, not measured ratios.

## What passes (keep, and use as reference)

- `PortalDialog` Escape-close and clean teardown verified on 02, 11, 18, 19; `AppSheet` day agenda Escape verified (05 addendum).
- `PortalTabs` keyboard model (roving tabindex, arrow keys, `role=tab*`) correct on 17 and in code on 09.
- Sidebar focus ring (3px lime) and reschedule day-pill focus rings verified visible (03, 20).
- Family page uses `role="alert"` for async feedback — the reference implementation for the gaps below.

## Failures by type (fix order within each group = shared root cause first)

### 1. Heading hierarchy — one shared root cause
`SectionHeader` and `AdminEmptyState` hardcode `<h3>` (`atoms.tsx`), producing H1→H3/H4 skips on 08, 09, 14, 15, 20; 12 renders kit names as `<p>`. Fix once via `as` prop + consumer migration (see impact map). 15-003 additionally concatenates an unreadable H1 accessible name ("€45cancelled").

### 2. Missing accessible names
- Calendar day cells: 35 bare `<button>` nodes, no day/content label (05, reviewer-confirmed).
- Chat attach button (06-006); beneficiary Remove/Resend buttons lack per-person names (20).
- Rewards redeem form: 6 inputs labeled only by placeholder (12, code-derived).
- Five identical "Open" buttons with identical names and identical destination (01-005) — name and behavior both wrong.

### 3. ARIA relationships
- Medical-files tabs point `aria-controls` at a non-existent panel id — `PortalTabPanel` exists but is unused there (09-004).

### 4. Status/live regions
- Profile and Security async save/error messages are plain `<p>` with no `role="status"`/`aria-live` (17, 19); prescriptions backend-unavailable banner same gap (08). Empty status pill announces nothing (16-001).

### 5. Keyboard paths
- Booking wizard: 15+ Tab stops through the public header before any booking content, every step (04-003). Portal-chrome variant (IA-1) or skip-link fixes this.
- Focus-order on Security inconclusive in dev (overlay interference) — re-test on prod build (19-002).

### 6. Contrast (suspected, unmeasured)
- Inactive step labels `text-white/45` on dark green (04); muted hint text (11); translucent popover bleeding text-through-text (01-001). Measure during implementation; the popover fix (opaque fill) resolves the third structurally.

### 7. Color-only status
- No violations found: status badges pair color with text throughout. Keep it that way when consolidating badges (Rule S5).

## Priority

1. P0 within a11y: heading `as` prop + migration; day-cell labels; live regions on save feedback (medical/financial forms).
2. P1: tab/panel ARIA on medical-files; icon-button names; booking-wizard keyboard path.
3. P2: contrast measurements + fixes; prod-build focus re-test; form label pass on rewards.
