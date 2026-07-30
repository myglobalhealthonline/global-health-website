# Responsive Implementation Plan — Phased (Website + Portals)

Audit date: 2026-07-11 · Status: PROPOSAL — nothing here is implemented; awaiting explicit approval.
Inputs: website + portal audits, overlay inventories, list/table inventory, drawer plan, design-system plan, consistency report (all in `docs/design/responsive/`).

Conventions: complexity S/M/L/XL (no time estimates). No phase requires backend/API changes unless stated. Every phase = independently shippable commits; rollback = revert the commit(s) — no phase mutates data or contracts.

Build/verify commands (documented for implementers):
```
cd frontend && pnpm lint && pnpm tsc --noEmit && pnpm build
pnpm test            # existing suites
npx playwright test  # where browser assertions are added (Phase 0 harness)
```

---

## Phase 0 — Baseline & Reproduction

- Record current behavior: screenshot matrix at 320/390/768/1024/1440/1920 + **heights 568/667/720/800/900 (incl. landscape 667×375, 812×375, 896×414)** + 200% zoom for: homepage, /doctors, /pricing, cart+checkout, /book, login; /admin/orders, /admin/patients, /admin/audit-log, /corporate/employees, /doctor/calendar, /account/bookings, one PortalDialog open, NotificationPopover open.
- Run the pending runtime verifications from both overlay inventories (SameDayBooking listbox, DoctorFilters right-edge, Z-C1 popover/sidebar, sonner-vs-modal, delete-account Tab-escape, audit-log clip) — promote/demote Unverified findings accordingly.
- Add automated overflow assertion (page-level only, allow-listed intentional scrollers — slot strips, WeekCalendar, marquees, audit-log wrapper post-fix, PortalTabs):
  `document.documentElement.scrollWidth <= clientWidth`
- Add overlay-visibility assertion helper: open menu → every item center passes `document.elementFromPoint` hit test and bounding box ⊆ viewport.
- Confirm existing tests green (baseline, no regressions introduced by harness).
- Files: new `frontend/e2e/responsive/*` (or existing Playwright setup — repo has Playwright per project history). Deps: none. Risk: none (test-only). Complexity: **M**. Backend: no. Design approval: no.
- Validation: harness runs in CI; baseline screenshots stored.
- Rollback: delete harness.

## Phase 1 — Layering & Container Foundations (both scopes)

1. `--z-*` token scale in `globals.css` (design-system §1.2); map every existing z usage (§1.3 table) — mechanical class/value swap, no behavior change intended.
2. Fix confirmed overlay bugs:
   - SameDayBooking listbox clip (WO-05): scope `overflow-hidden` or portal listbox. **S**
   - audit-log wrapper `overflow-hidden` → `overflow-x-auto` (P-02). **S** (one line)
   - Z-C1: sidebar/popover split into `--z-header`/`--z-dropdown` bands. **S**
3. PortalDialog internals → `createPortal(document.body)` keeping API + a11y behavior (trap/restore verified after — Radix-parity checklist: focus trap, Escape, outside-click, scroll lock). **M**
4. Container fixes: availability grid `minmax(0,1fr)` (P-14); corporate requests `flex-wrap` (:149); remove corporate redundant nested scroll wrapper (:238). **S**
5. Portal table foundation (P-01): remove blanket 720px rule (portal.css:5066-5082); set per-table min-widths from real column budgets; orders forced 1180px (portal.css:2412-2414) reduced after D-01 column trim in Phase 3 — interim cap 960px with column priority `lg:table-cell` gating of Meet/Payment links. Raise/replace the 760px card switch: container query on the list region (`@container list (max-width: <table-budget>)` → card mode). **L** — this closes the 761–1023px gap product-wide.
6. Establish drawer layering tokens (no drawer yet).
7. **Height-axis foundations** (design-system §4b): extend `--space-section`/`--space-stack` with an `svh` component; migrate full-height `vh` → `svh`/`dvh` (PortalDialog `88vh` cap, chat panel `60vh`, any hero min-heights); add the two height tiers (`max-height:720px` compact, `max-height:568px` minimum) as shared rules in globals.css/portal.css. No global scaling; reflow + vertical scroll as final fallback; nothing clipped or hidden. **M**
- Files: globals.css, portal.css, PortalDialog.tsx, SameDayBooking.tsx, audit-log/page.tsx, availability-ui.tsx, requests/page.tsx, employees/page.tsx, ~15 tsx files for z class swaps.
- Deps: Phase 0 assertions to prove no regression. Risk: **Medium** (z remap touches everything visually — mitigated by mechanical mapping + screenshot diff). Backend: no. Design approval: no.
- Validation: full screenshot diff vs baseline; overlay assertions pass; Radix-parity checklist on PortalDialog.
- Rollback: per-commit (tokens / bugfixes / PortalDialog / table foundation are separate commits).

## Phase 2 — Shared Responsive Primitives

- **Theme fidelity gate (design-system §4c)**: every primitive below is styled to DESIGN.md (public, gh2 forest/ivory glass) or DESIGN2.md (portal, Obsidian Ivory lux) using existing atoms/tokens before its first route ships — visual sign-off required; no unstyled Radix defaults, no generic sheet look. Menus/panels cap height to `svh` remaining-viewport and scroll internally (§4b.6).
- `AppMenu` (Radix DropdownMenu/Popover wrapper, portalled, `--z-dropdown`, collision defaults). Migrate first consumers: NotificationPopover, user-menu (dedupe portal-shell/admin-shell copies), admin country-picker (token only). **M**
- `AppSheet` + `RecordDetailsDrawer` (drawer plan §5), incl. skeleton/error/empty slots, URL binding, dirty-guard. **L**
- `AppDialog`: PortalDialog rename/absorb; migrate delete-account modal (adds trap/restore — P-07) and consultation-documents-modal (fold createPortal one-off). **M**
- `ColumnPriorityTable`: extend AdminTable with `ResponsiveField` config (priority 1–4, drawer flag) rendering desktop table + PortalMobileCard from one config; container-query column hiding. Pilot on /admin/users (smallest B-pattern list). **L**
- `ResponsiveFilterBar`: extract appointments filter-grid pattern (portal.css:1247-1357) into reusable recipe + optional mobile filter AppSheet with active-count chip. **M**
- Shared pagination behavior + ListEmptyState/ListErrorState/ListSkeleton normalization (mostly exists — AdminEmptyState/portal-skeletons; wire into primitives). **S**
- Deps: Phase 1. Risk: Medium. Backend: no. Design approval: drawer visuals (lux system) — yes, light.
- Validation: pilot routes (users list, notification popover) pass overlay+overflow assertions, keyboard walkthrough, screenshot diff.
- Rollback: primitives additive; pilot routes revert individually.

## Phase 3 — Highest-Severity Screens

Order chosen by workflow criticality (healthcare/corporate/payments + broken menus):
1. Homepage SameDayBooking verified end-to-end (booking conversion path) — carried from Phase 1, full flow re-test. **S**
2. DoctorFilters → AppMenu panels + mobile filter sheet (WO-06, directory pages). **M**
3. /admin/orders → Pattern B: column trim + drawer D-01; drop forced width to real budget. **L**
4. Corporate employees + requests: PortalMobileCard fallbacks (T-40/41) + toolbar fixes; then drawer D-04. **L**
5. /admin/invoices drawer D-03 (payments workflow). **M**
6. /admin/users D-02 ships as the Phase 2 pilot (already done here if sequencing allows).
7. Website i18n text hazards: header CTA/StickyBookingCTA/SectionNav nowrap, PricingPlanCard clamp, HomeHero 13ch, ServiceCatalog CTAs. **S**
8. Height-axis pass on flagship screens: heroes/booking wizard/checkout at 568–720px heights — apply compact tier, `svh` media caps (WS-23 image band → `clamp(180px,30svh,280px)`), verify no clipped CTAs in landscape (667×375, 812×375). **M**
- Deps: Phase 2 primitives. Risk: Medium-High (flagship workflows) — per-route PRs, screenshot+assertion gates, drawer coexistence rules (drawer plan §6). Backend: no. Design approval: order/employee drawer content layout.
- Validation per route: action-parity checklist, deep-link/back-button, 320–1920 matrix, 200% zoom, keyboard-only pass.

## Phase 4 — Remaining Admin Lists

Migrate route-by-route to ColumnPriorityTable + priority classification (inventory patterns): doctors (C), patients (B — **PHI: drawer D-05 last in this phase, gates identical to detail page**), subscriptions (B-light D-06), services/health-tests/blog/pages/assets/countries/plans (C), newsletter/automation (C), specialties/country-features (A — drop forced widths), reports uploaded-invoices (D). Also migrate the 6 raw hand-rolled tables onto the primitive; blog/pages toolbars onto ResponsiveFilterBar.
- Risk: Medium; verification after each route family (CMS group, ops group, PHI group). Complexity: **XL** total, S–M per route. Backend: no.
- Validation: per-family screenshot+assertion gates; PHI group additionally: access-log parity, no new PHI in list payloads/URLs.

## Phase 5 — Doctor, Patient & Corporate Lists

- Doctor: invoices/patients/document tables → single-config (formalize existing lg:table-cell priorities); documents-review-send overflow menu (AppMenu); appointment-workspace tables config-migrated. **M**
- Patient: payments dual tables → config; family email `title`/wrap; keep model Pattern A lists untouched. **S-M**
- Corporate: complete D-pattern parity; keep admin-atom reuse (intentional). **S**
- Preserve role-specific permissions/workflows (server actions untouched throughout).
- Risk: Medium (doctor mobile usage real). Backend: no.

## Phase 6 — Website Sections, Forms, Tabs, Calendars & Modals (non-list)

- Header intermediate `lg` layout (G4) — **needs design approval**. **M**
- CountrySwitcher/LanguageSwitcher → AppMenu (WO-03/04). **S**
- FAQTabs edge-fade affordance (reuse PortalTabs mask pattern). **S**
- Service/test detail 240px band → clamp(). **S**
- StickyBookingCTA segment matching. **S**
- Calendar tap targets ≥44px hit area on pointer:coarse (Month/Week day cells); `.gh-icon-btn` hit-area padding on coarse. **M** — **needs design approval** (DESIGN.md §5.8 says 32px).
- VerifiedProfessionals copy → i18n system (content task, coordinate translations). **S**
- Modals at 320px/zoom sweep (PortalDialog consumers) with assertions. **S**
- Height-axis sweep, remaining routes: portals + secondary website pages at 568/667/720/800px — compact/minimum tiers applied, all modals/drawers ≤ `88svh` with internal scroll, header compresses below 720px height, no content clipped or hidden anywhere, vertical scroll as final fallback. **M**
- Doctor filter grids `sm:grid-cols-5/6` → `sm:grid-cols-2 lg:grid-cols-N` (P-12). **S**
- Risk: Low-Medium. Backend: no.

## Phase 7 — Typography & Density Consolidation

- Kill 9px occurrences (5 sites) → 10px+ tokens. **S**
- Map arbitrary `text-[...]` (147 files) onto role tokens per scope — mechanical, batched by directory; no visual size change where value already equals spec. **XL** (spread out)
- Card padding/button height tokens per scope; truncate-without-title sweep (add `title` or drawer access). **L**
- Focus-ring violations fixed (MessagesInbox, rich-text ×2, country-picker) + `gh-focus-on-dark` adoption on dark CTAs. **S**
- Status-color drift check (consistency report §6 open item). **S**
- Risk: Low (after layouts stable). Design approval: only where a size actually changes.

## Phase 8 — Regression Testing & Cleanup

- Remove obsolete CSS: retired per-table forced widths, dead z classes, duplicate outside-click hooks, absorbed modal implementations, replaced dual mobile markup.
- Update/extend tests; full matrix re-run; final screenshot baseline refresh.
- Document the **intentional horizontal-scroll register**: booking slot strips (service-time-picker/slot-picker), WeekCalendar (720px grid), marquees, PortalTabs strip (mask affordance), audit-log wide table (post overflow fix), bulk-upload CSV preview. Each justified: genuinely 2-dimensional or deliberately linear content.
- Risk: Low. Complexity: **M**.

---

## Cross-phase notes

- **Dependencies chain**: 0 → 1 → 2 → {3,4,5,6 parallelizable per-route} → 7 → 8.
- **Backend/API changes**: none anywhere. Drawer data uses existing endpoints.
- **Design approvals needed**: drawer visuals (P2), header tablet layout (P6), touch-target sizes vs DESIGN.md §5.8 (P6), any Phase 7 visible size change.
- **CSS-split rule** honored: shared tokens → globals.css; portal-only selectors → portal.css; new glass classes (if any) join both fallback blocks in their file.
- **Server rendering / params / permissions / deep links preserved** in every phase — primitives render inside existing server pages; filters/pagination remain GET-param driven.
