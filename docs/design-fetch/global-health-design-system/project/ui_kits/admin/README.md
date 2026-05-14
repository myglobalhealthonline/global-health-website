# Admin Portal · UI Kit

A click-through recreation of the **Global Health super-admin portal**,
built from the spec in `uploads/PLAN.md` §7 and aligned with the design
system in this project (`colors_and_type.css`, `assets/logo/`).

Replaces the unbranded wireframes in `uploads/admin-wireframes-branded.html`
which were generated before the design system existed.

## Run it

Open `index.html`. Top bar buttons jump between the 9 screens, or sign
in via the login screen and the dashboard becomes the entry point.

## Screens (mapped to PLAN.md §7.4)

| # | Screen | Path | Notes |
| - | --- | --- | --- |
| 1 | Login | `/login` | Forest split-screen with brand mark |
| 2 | Dashboard | `/` | Stats, recent activity from audit log |
| 3 | Countries list | `/countries` | Drag-reorder table, active toggle |
| 4 | Country edit | `/countries/[id]` | Metadata + hero + contact + danger zone |
| 5 | Categories matrix | `/categories` | Rows × countries × toggle |
| 6 | Doctors list | `/doctors` | Country chips, country filter |
| 7 | Doctor edit | `/doctors/[id]` | Form + M:N country assignment sidebar |
| 8 | Services list | `/[country]/general` | One table per service type |
| 9 | Service edit | `/[country]/general/[id]` | Unified form, conditional category |

## Design

- **Sidebar**: Forest-night (`--surface-dark` = `#0F2E25`), white text,
  mint accent on active item. Logo at top.
- **Topbar**: White with bottom border, country picker right-aligned,
  user menu far right.
- **Content**: White cards on cream (`--surface-soft`), 20px radius,
  forest-tinted shadows.
- **Buttons**: Pill (`--r-button` = 999px), 48px tall, primary forest,
  secondary outline.
- **Status pills**: Brand green for "Published", neutral for "Draft",
  amber for "Pending review".
- **Forms**: 48px inputs, 12px radius, focus ring is alpha-forest.

All values come from `colors_and_type.css` — no magic numbers.

## Components

| File | What's in it |
| --- | --- |
| `Atoms.jsx` | `Btn`, `Eyebrow`, `Chip`, `Stat`, `FlagBadge`, `Toggle`, `Field`, `Section`, plus all Lucide icons |
| `Shell.jsx` | `Sidebar`, `Topbar`, `CountryPicker`, `PageHeader` |
| `Screens.jsx` | All 9 screen components |
| `App.jsx` | Top-level router with `useState` |
| `index.html` | Boots React + Babel and stitches it all together |

## Faithfulness

- Country axis pattern (PLAN.md §4.2) — sidebar splits into Global and
  Country-scoped sections; country picker rewrites the active scope.
- Service unification (§5.1) — same edit form for all four service
  types, sidebar entries preset `type`.
- Doctor ↔ Country M:N (§5.1) — visualized in Doctor edit as a side
  panel where each country row can be toggled active/inactive with its
  own sort order.
- Categories global with per-country enablement (§7.4 #5) — matrix
  layout with cells as toggles.
- Publish workflow (§5.4) — Draft/Published badges, Save/Publish split
  CTA on edit forms.

## Known gaps

- Drag-to-reorder is shown as static rows with grip icons (no actual
  drag).
- Image upload is a static placeholder (no actual Railway presign).
- All data is hardcoded in `Screens.jsx`.
- Admin Users and Audit Log screens not yet built — sidebar entries
  show "Coming soon" toasts.
