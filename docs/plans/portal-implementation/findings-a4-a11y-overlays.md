# A4 Findings — Accessibility & Overlays (Admin/Doctor/Patient)

Investigator: Sonnet agent A4 · 2026-07-12 · static source pass

## Root cause of reported bug #1 (patient info renders above/over appointment tabs)

`frontend/app/(doctor)/doctor/appointments/[id]/page.tsx:590` — the
`<aside className="gh-doctor-context-rail ... lg:sticky lg:top-4">` patient rail is a grid
sibling *after* the tabs column in DOM order and carries **no z-index**. The tabs' own
sticky wrapper (`frontend/app/(doctor)/doctor/appointments/[id]/_components/appointment-tabs.tsx:76`,
`sticky top-[58px] z-10`) uses a hardcoded offset and a raw (non-token) z-index. Both are
independent `position: sticky` boxes; with no explicit stacking differentiation the
later-DOM aside paints over the tabs bar whenever their sticky boxes overlap. Real and
reproducible, not a false positive.

## Component matrix (portal-mounted / focus trap / restore / Esc / scroll lock / dvh-safe / z source)

- `PortalDialog` (`frontend/components/PortalDialog.tsx`): Yes/Yes/Yes/Yes/Yes/Yes/Token — solid, the reference implementation.
- `AppSheet` + `RecordDetailsDrawer` (`frontend/components/AppSheet.tsx`, `RecordDetailsDrawer.tsx`): all Yes via Radix — solid.
- `AppMenu`/`PortalUserMenu` (`frontend/components/AppMenu.tsx`): Radix-backed — solid.
- `ConsultationDocumentsModal` (`frontend/app/(doctor)/doctor/appointments/[id]/_components/consultation-documents-modal.tsx:444-815`): portals + Esc + scroll-lock + dvh-safe present, but **no focus trap, no focus restoration**.
- `DeleteAccountModal` (`frontend/app/(auth)/account/security/_components/delete-account-button.tsx:99-134`): **not portaled, no focus trap, no focus restore, no Esc handler, no scroll lock.** Only `role="dialog"`/`aria-modal` and a `max-h`. Destructive account-deletion action has none of the real modal guarantees.
- Mobile sidebar nav, duplicated in `frontend/components/portal-shell.tsx:198-222` and `frontend/app/(admin)/admin/_components/admin-shell.tsx:352-357`: scrim + slide transform only; **no Esc, no focus trap, no scroll lock** in either copy.
- `PortalTabs` (`frontend/components/PortalTabs.tsx`): full roving-tabindex, `role=tablist/tab/tabpanel`, `aria-selected`/`aria-controls`, Arrow/Home/End keyboard nav — correctly used by every admin translation-tab file and the doctor appointment tabs. ARIA/keyboard part of the spec already satisfied.

## Z-index

Real token scale exists (`frontend/app/globals.css:180-191`, `--z-base` … `--z-skip-link`)
and is used correctly by nearly everything portaled. Bypasses found:
- `appointment-tabs.tsx:76` (`z-10`, hardcoded — root cause above)
- Three hand-rolled typeahead dropdowns, raw `z-20`/`z-50`, no keyboard support:
  - `frontend/app/(admin)/admin/appointments/_components/manual-booking-form.tsx:391`
  - `frontend/app/(admin)/admin/doctors/[id]/availability/_components/book-slot-dialog.tsx:245`
  - `frontend/app/(admin)/admin/countries/_components/country-select.tsx:158`

## Portal mounting

`PortalDialog`, `AppSheet`/Radix stack, `ConsultationDocumentsModal` all `createPortal` to
`document.body` (comment in `PortalDialog.tsx:40-42` documents why — lux glass cards'
`backdrop-filter` create stacking contexts that would trap an in-place fixed overlay).
`DeleteAccountModal` renders in-place — currently safe only because its ancestor chain has
no transform/filter wrapper; latent risk.

## Scroll lock

`PortalDialog` and `ConsultationDocumentsModal` each independently reimplement save/restore
of `body.style.overflow` (correct but duplicated). Radix (`AppSheet`) manages its own. No
live double-lock found, but no lock at all in `DeleteAccountModal` or the sidebar navs —
background scrolls under an ostensibly modal dialog.

## Short-height / dvh

All primitive overlays are `svh`-based with `min-height:0` flex bodies (no bare `100vh`
anywhere in `portal.css`) — good. `DeleteAccountModal` uses a single scroll region instead
of the header/body/footer split, so its action buttons aren't guaranteed reachable if
content grows.

## Safe areas

Only one `env(safe-area-inset-*)` in the whole split (`AppSheet.__footer`,
`globals.css:2683`). **Zero** in `portal.css` — `PortalDialog`,
`ConsultationDocumentsModal`, `DeleteAccountModal`, sidebar navs have no
notch/home-indicator handling.

## Reduced motion

Respected on shared overlay primitives (8 `prefers-reduced-motion: reduce` blocks in
`portal.css`, plus `globals.css:2699-2705` for `AppSheet`).

## Prioritized fix list

1. **P0** — z-index/stacking collision, doctor tabs vs patient rail (`appointment-tabs.tsx:76` + `page.tsx:590`) — root cause of bug #1.
2. **P0** — `DeleteAccountModal` missing every modal guarantee; migrate to `PortalDialog`.
3. **P1** — `ConsultationDocumentsModal` missing focus trap + restore; migrate onto `PortalDialog`, drop ~70 duplicated lines.
4. **P1** — duplicated, guarantee-less mobile sidebar nav in `portal-shell.tsx` and `admin-shell.tsx`; unify and add Esc/scroll-lock (or wrap in Radix/`AppSheet`).
5. **P2** — token-ize the three raw `z-20`/`z-50` typeahead dropdowns; consider migrating onto `AppMenu` for keyboard nav.
6. **P2** — add `env(safe-area-inset-*)` to `portal.css` overlay primitives, mirroring the `AppSheet` pattern.
7. **P3** — centralize scroll-lock logic (3 independent implementations: `PortalDialog`, `ConsultationDocumentsModal`, Radix); add a Playwright guard case.
