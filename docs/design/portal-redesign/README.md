# Portal Redesign Audit

## Goal

Create complete coverage for the admin, doctor, and patient/account portals before continuing the redesign. The redesign must cover real route pages, nested dynamic routes, route-local components, shared shells, forms, tables, cards, tabs, modals, calendars, appointment workflows, payment/invoice areas, medical record areas, verification/profile sections, loading states, and error states.

## Consistency Rules

- Every portal page must use the same page width, horizontal padding, vertical rhythm, section spacing, and card/table density.
- Shell, sidebar, topbar, mobile drawer, and main content wrappers must align across admin, doctor, and patient/account portals.
- Shared atoms and route-local components must not fight each other. If a route has custom controls, they must follow the shared portal system.
- Page-specific files and nested `_components` must be inspected and updated. Global CSS and shell-only changes are not enough.

## Responsiveness Rules

- Review mobile, tablet, laptop, desktop, and ultra-wide layouts.
- Required widths: 320, 360, 390, 430, 640, 768, 1024, 1280, 1440, 1536, 1920, and 2560.
- Fix horizontal overflow, clipped content, inconsistent padding, narrow centered pages, stretched pages, oversized cards, giant buttons, awkward wrapping, broken tables, bad mobile tabs, modal overflow, dropdown overflow, and forms that do not stack properly.

## Definition Of Done

- Every portal page appears in the audit markdown.
- Every reusable or route-local portal component appears in the shared component audit.
- Every row has a final status of `Completed` or `Inaccessible — reason documented` before the redesign is considered done.
- Every actual route page and component file has been inspected.
- The redesign touches actual route pages and route-local components, not only `frontend/app/globals.css`, shell files, or atom files.
- Responsive review and screenshot review are documented.
- Build, lint, and typecheck results are reported.

## Status Labels

Use only: `Not started`, `In progress`, `Needs review`, `Completed`, `Inaccessible — reason documented`.
