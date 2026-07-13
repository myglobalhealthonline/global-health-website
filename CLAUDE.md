# Global Health Website — agent notes

## CSS architecture (two files — know which one to edit)

Since 2026-07-08 the hand-authored CSS is split in two:

- `frontend/app/globals.css` — tokens, resets, PUBLIC site (`gh-*`, `gh2-*`) and
  anything shared. Imported once in the root layout → ships on every route.
- `frontend/app/portal.css` — authenticated-portal-only rules: `.gh-admin-*`,
  `.gh-doctor-*`, `.gh-portal-*`, `.lux-*` / `--lux-*` (Obsidian Ivory system).
  Imported ONLY by the `(admin)`, `(doctor)`, `(auth)` route-group layouts, so
  public visitors never download it.

Rules:
- Adding/editing a portal-only style → `portal.css`. Public or shared → `globals.css`.
- A selector must live in exactly ONE of the two files — never both.
- New glass/backdrop-filter classes must join the mobile fallback blocks
  (`@media (pointer: coarse)` and `@supports not (backdrop-filter)`) in the SAME
  file the class lives in — both files carry their own copy of those blocks.
- `@keyframes` used by both files stay in `globals.css`.

## UI primitives (Phase 2, responsive overhaul)

New dropdowns/popovers/dialogs/drawers — never hand-roll: use `AppMenu`
(dropdown/popover), `PortalDialog` (modal), `AppSheet`/`RecordDetailsDrawer`
(drawer/sheet). New list/table pages — never hand-write twin table+card
markup: use a `ColumnPriorityTable` config (`ResponsiveField` priority 1-4 +
drawer flag), which renders both the desktop table and the `PortalMobileCard`
fallback from one source. See `docs/responsive-audit/HANDOFF.md` for the full
migration history and `shared/RESPONSIVE_DESIGN_SYSTEM_PLAN.md` for the rules
(z-token scale, height-axis tiers, theme fidelity).

## Dependency overrides

`pnpm.overrides` are NOT inherited by the deployed services (each builds
standalone with `--ignore-workspace`). Mirror every security pin into root,
`frontend/`, and `backend/` package.json. CI gate: `scripts/check-override-drift.mjs`.
See `docs/dependency-overrides.md`.
