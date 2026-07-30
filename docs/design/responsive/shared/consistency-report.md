# Consistency Report — Website vs Portal

Audit date: 2026-07-11 · Static analysis, file:line cited. Category tag for all items: `Website/portal inconsistency`.

## 1. Breakpoints & container thresholds

| Aspect | Website | Portal | Verdict |
|---|---|---|---|
| Responsive prefixes used | sm/lg dominate (repo-wide: sm 349, md 140, lg 235, xl 15, 2xl 5) | same skew | **Unify guidance**: md underused; xl only for header nav collapse |
| Header collapse | single cliff at `xl` (1280px) — SiteHeader.tsx:222,228 | sidebar drawer below `lg` | Keep, but website loses all nav 768–1279px (website audit W-05) |
| Table↔card switch | n/a | fixed `@media (max-width:760px)` (portal.css:911-942) vs forced table min-widths 720–1180px → 761–1023px gap | **Unify** on container-query threshold per list region |
| Container queries | none | none | Introduce shared thresholds (design-system plan §2.4) |

## 2. Typography, spacing, density

- Two spec'd scales: public fluid clamp tokens (globals.css:144-155, DESIGN.md §3) vs portal fixed-px (DESIGN2.md §6.1). **Intentional — KEEP** (marketing vs workstation density). Unify only role names + floors (design-system plan §2.2).
- Same semantic role renders at different absolute size per shell (eyebrow 13px public vs 11px portal; body fluid ~15-17px vs 14px) — acceptable divergence, documented.
- Card padding drifts freely p-3…p-8 in both scopes (p-4 portal-dominant, p-6 public-dominant) — **unify to per-scope token**, Phase 7.
- Button heights split across h-10/h-11/h-12 with no standard (13× h-8, 19× h-10, 18× h-11, 27× h-12) — **unify** to 2 sizes per scope.
- 9px micro text appears in BOTH scopes (`service-time-picker.tsx:185,189`, `slot-picker-step.tsx:188,192` public; `reschedule-picker.tsx:227` portal) — below both specs' floors. **Fix both.**

## 3. Buttons, inputs, pills, cards

- Public `gh2-btn-*`/`gh-btn` vs portal `Btn` atom (`portal-atoms`) — separate systems by design (CSS split rule). Keep; enforce 44px touch floor in both (`globals.css:2324-2326` precedent exists only for `[data-portal="patient"]`).
- Status pill: portal `.gh-pill` 11px (portal.css:2841-2847); public has no pill role. No conflict.
- Focus rings: global `:focus-visible` exists (globals.css:302); public dark sections hand-roll ring colors instead of using `gh-focus-on-dark` (globals.css:3144) — inconsistent within website itself; portal rich-text/messages inputs drop rings entirely (rich-text-html-field.tsx:249-349, MessagesInbox.tsx:125). **Unify on shared focus classes.**

## 4. Drawer / sheet / dialog / menu / popover / toast primitives

The largest divergence in the product. Current inventory:

| Primitive | Website | Portal | Count of implementations |
|---|---|---|---|
| Dropdown/menu | Radix (SectionNav.tsx:107, MobileNav) + hand-rolled (CountrySwitcher.tsx:114, LanguageSwitcher.tsx:109, SameDayBooking.tsx:300, DoctorFilters `<details>` :78) | Radix (country-picker.tsx:60) + hand-rolled (NotificationPopover.tsx:89, user-menu ×2) | **8+ implementations, 2 systems** |
| User-menu | n/a | duplicated verbatim: portal-shell.tsx:396-457 AND admin-shell.tsx:584-634 | copy-paste twin |
| Dialog/modal | Radix Dialog (MobileNav only) | PortalDialog (custom, not portalled, portal.css:5203) + consultation-documents-modal (createPortal:815) + delete-account modal (no trap, delete-account-button.tsx:99-150) | **3 modal systems** |
| Sheet/drawer | MobileNav full-screen Radix sheet | portal sidebar slide (translate-x) | no shared sheet primitive |
| Toast | none | sonner (admin-shell.tsx:670-680), z uncoordinated | portal-only |
| Outside-click/Escape logic | re-implemented per file | re-implemented per file | 4+ near-identical copies (CountrySwitcher.tsx:71-88, LanguageSwitcher.tsx:48-65, NotificationPopover.tsx:59-84, PortalDialog.tsx:40-70) |

**Unification plan:** one Radix-based `AppMenu` + one `AppDialog` (PortalDialog API, createPortal internals) + one `AppSheet` serving both scopes, styled by scope tokens. Design-system plan §3.2. PortalDialog's own doc comment (L11-13) already declares this migration intent — finish it.

## 5. Portal mounting & z-index

- Website: Radix overlays portalled; switchers/filters/SameDayBooking not.
- Portal: only `consultation-documents-modal.tsx:815` truly portalled; PortalDialog + all popovers in-tree.
- z values collide across roles (`z-40` = public header = portal sidebar = popovers = fixed bars; `z-50` = menus = modals = cookie banner). No shared scale. **Unify** on `--z-*` tokens (design-system plan §1.2-1.3) — resolves Z-C1 (sidebar/popover DOM-order tie inside `isolation:isolate` shell, portal.css:4112).

## 6. Color & semantic-state tokens

Public `gh/gh2` forest-ivory vs portal `lux` Obsidian Ivory — intentional brand split per DESIGN.md/DESIGN2.md. No unification proposed. Status colors (success/warning/danger) not audited for drift this pass — *Unverified*; add to Phase 7 checklist.

## 7. Loading / empty / error states

- Portal: `AdminEmptyState` + skeletons (`portal-skeletons.tsx`) reused incl. corporate. Consistent.
- Website: per-section ad hoc. Acceptable (marketing pages rarely have data states).
- Rule: new list primitives must ship ListEmptyState/ListErrorState/ListSkeleton variants matching final layout (skeleton/table mismatch not audited per-table — *Unverified*).

## 8. Duplicate components / utilities to unify

| Duplicate | Locations | Action |
|---|---|---|
| User-menu dropdown | portal-shell.tsx:396-457 = admin-shell.tsx:584-634 | extract shared component (Phase 2) |
| Rich-text field | rich-text-html-field.tsx ≈ doctor-bio-rich-text-field.tsx (same focus-ring bugs at :249/265/281 vs :130/144/161) | merge or share toolbar |
| Table markup | `AdminTable` atom vs 6 raw hand-rolled `<table>`s in admin (patients, users, invoices, newsletter, audit-log, automation) | migrate raw tables to primitive (Phase 4) |
| Desktop-table + mobile-card twin markup | ~20 routes duplicate field labels/formatting in both variants (doctor patients/invoices/documents, patient payments, all admin lists) | `ColumnPriorityTable` single-config render (Phase 2/4/5) |
| Mobile-card fallback missing | corporate employees/requests, admin specialties/corporate/country-features have table-only | bring to standard (Phase 3/5) |
| Outside-click/Escape hooks | 4+ copies (see §4) | dissolve into Radix primitives |

## 9. Intentional differences that REMAIN (with rationale)

1. Fluid public type scale vs fixed portal scale — different reading contexts (marketing vs dense data work); both spec'd.
2. Brand palettes (forest/ivory vs obsidian/lux) — separate DESIGN.md/DESIGN2.md authorities.
3. CSS file split (globals.css vs portal.css) — performance rule in root CLAUDE.md (public visitors never download portal css). All shared tokens (z-scale) go in globals.css, consistent with the existing "lux token block stays in globals" precedent.
4. Marquee `whitespace-nowrap`, booking slot-strip horizontal scroll — intentional horizontal-scroll cases, justified (see implementation plan Phase 8 register).
5. Corporate portal reusing admin atoms rather than doctor/patient card primitives — the *table* reuse stays; only the missing mobile fallback is fixed.

## 10. Prioritized unification order (no big-bang rewrite)

1. z-token scale + portal-mounting rules (small, unblocks everything; Phase 1).
2. `AppDialog` internals (createPortal) + migrate 2 trap-less modals (Phase 1/2).
3. `AppMenu` — replace hand-rolled dropdowns one at a time: SameDayBooking (active bug) → DoctorFilters → switchers → NotificationPopover → user-menu dedupe (Phases 1–3).
4. `ColumnPriorityTable` + drawer, migrate route-by-route (Phases 2–5).
5. Toolbar pattern adoption (Phases 3–6).
6. Type/density/touch-target consolidation last, once layouts stable (Phase 7).
