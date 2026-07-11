# Responsive Design System Plan — Product-Wide Tokens, Primitives, Rules

Audit date: 2026-07-11 · Branch: Dev-hassaan · Status: PROPOSAL — awaiting approval, no production code changed.

Companion docs: [`CONSISTENCY_REPORT.md`](./CONSISTENCY_REPORT.md), [`RESPONSIVE_IMPLEMENTATION_PLAN.md`](./RESPONSIVE_IMPLEMENTATION_PLAN.md), website + portal audits in sibling folders.

Method note: all evidence is **static code analysis** (file:line cited). Items needing browser reproduction are marked *Unverified (runtime)* — the audit does not claim any screenshot/zoom test was performed.

---

## 0. Existing systems (ground truth — reuse, don't reinvent)

Two deliberate, spec-backed systems already exist. The plan below **extends** them; it does not replace either.

| | Public site | Portals |
|---|---|---|
| CSS file | `frontend/app/globals.css` | `frontend/app/portal.css` |
| Spec | `docs/DESIGN.md` §3 | `docs/portal-redesign/DESIGN2.md` §6 |
| Type scale | Fluid `clamp()` tokens `--text-display/h1/h2/h3/body-lg/body/eyebrow/meta` (globals.css:144–155) | Fixed-px per-selector (page title `clamp(24px,2vw,34px)`, body 14px, table cell 13.5px, table header 10.5–11px, micro-label 10px) — spec'd, not drift |
| Spacing | Fluid `--space-section`/`--space-stack` (globals.css:166–169) | Fixed per DESIGN2.md §6.2 |
| Tailwind | v4, config-in-CSS; default text-xs=12px/text-sm=14px untouched | same |
| Container queries | none anywhere | none anywhere |

Intentional divergence to KEEP: public = fluid marketing scale, portal = dense fixed workstation scale. What must be UNIFIED: the layering (z-index) model, overlay/portal primitives, breakpoints for the table↔card switch, minimum-size floors, and truncation rules.

---

## 1. Z-index layering token scale (product-wide)

### 1.1 Current state (census — see overlay inventories for full tables)

Ad-hoc Tailwind steps only; no arbitrary `z-[9999]` anywhere (good). Current effective layers:

| Value | Users |
|---|---|
| `z-[1]`/`z-10` | ServiceCatalog tile overlay link vs TileActions (`ServiceCatalog.tsx:344,300`) |
| `z-20` | portal topbar sticky (`portal-shell.tsx:289`, `admin-shell.tsx:476`); `.gh2-filter-panel` (globals.css:3111) |
| `z-30` | mobile-sidebar scrim; click-outside catchers; DoctorFilters wrapper |
| `z-40` | public header (`.gh-header-sticky` globals.css:672); portal **sidebar** (fixed); NotificationPopover content; user-menu content; StickyBookingCTA; MobileOrderTotalBar |
| `z-50` | Radix MobileNav Dialog; Radix dropdowns (SectionNav, country-picker); manual CountrySwitcher/LanguageSwitcher; PortalDialog overlay (portal.css:5203); CookieBanner |
| `z-index:1000` | `.gh-skip-link` (globals.css:319) |
| library | sonner Toaster (own internal z, unreconciled) |

Known conflicts (root causes named — none are "z too low"):
- **Z-C1** — portal sidebar `z-40` ties with NotificationPopover/user-menu `z-40` as **siblings inside the `isolation:isolate` shell stacking context** (`portal.css:4112`). Popover wins only by DOM order today. Root cause: two different layer roles sharing one number.
- **Z-C4** — sonner toast layer never reconciled against `z-50` modals. *Unverified (runtime)*.
- DoctorFilters panel `z-20` beneath its own sibling row wrapper `z-30` and non-portalled → viewport-edge overflow (root cause: manual `absolute left-0`, no collision handling — `globals.css:3111`, `DoctorFilters.tsx:78-100`).

### 1.2 Proposed token scale

Add to `globals.css` `:root` (shared — public consumers exist, per the CSS-split rule that shared tokens live in globals.css):

```css
--z-base: 0;          /* in-flow content */
--z-raised: 10;       /* card hover layers, tile action rows, in-card overlays */
--z-sticky: 100;      /* sticky table headers, in-page section toolbars */
--z-header: 200;      /* public .gh-header-sticky, portal topbar, portal sidebar */
--z-fixed-bar: 250;   /* StickyBookingCTA, MobileOrderTotalBar, cookie banner */
--z-dropdown: 300;    /* menus, selects, popovers, tooltips, filter panels */
--z-drawer-overlay: 400;
--z-drawer: 410;      /* RecordDetailsDrawer / mobile nav sheets */
--z-modal-overlay: 500;
--z-modal: 510;       /* PortalDialog, Radix Dialog, documents modal */
--z-toast: 600;       /* sonner — pass z via <Toaster style> or toastOptions */
--z-skip-link: 700;   /* .gh-skip-link */
```

### 1.3 Mapping of every existing value

| Current | File:line | New token | Note |
|---|---|---|---|
| `.gh-skip-link` 1000 | globals.css:319 | `--z-skip-link` | keep top |
| `.gh-header-sticky` 40 | globals.css:672 | `--z-header` | |
| Portal topbar `z-20` | portal-shell.tsx:289, admin-shell.tsx:476 | `--z-header` | topbar + sidebar same band, DOM order irrelevant once dropdowns are above |
| Portal sidebar `z-40` | portal-shell.tsx:232, admin-shell.tsx:371 | `--z-header` | resolves Z-C1: popovers move to `--z-dropdown` (300) > header band (200) |
| Scrims/catchers `z-30` | portal-shell.tsx:224,402; NotificationPopover.tsx:121 | one step below their overlay (`--z-dropdown - 1` via calc or paired token) | catchers should ideally die with portalling (see §3) |
| NotificationPopover/user-menu `z-40` | NotificationPopover.tsx:125; portal-shell.tsx:405; admin-shell.tsx:593 | `--z-dropdown` | |
| Radix dropdown/dialog `z-50` | SectionNav.tsx:113, country-picker.tsx:64, MobileNav.tsx:165 | dropdowns → `--z-dropdown`; MobileNav sheet → `--z-drawer` | |
| CountrySwitcher/LanguageSwitcher `z-50` | CountrySwitcher.tsx:117, LanguageSwitcher.tsx:112 | `--z-dropdown` | |
| `.gh2-filter-panel` `z-20` | globals.css:3111 | `--z-dropdown` + portal/collision fix (see website audit W-01) | |
| PortalDialog overlay 50 | portal.css:5203 | `--z-modal-overlay`/`--z-modal` | plus true `createPortal` (see §3) |
| StickyBookingCTA/MobileOrderTotalBar `z-40` | StickyBookingCTA.tsx:25, MobileOrderTotalBar.tsx:49 | `--z-fixed-bar` | |
| CookieBanner `z-50` | CookieBanner.tsx:64 | `--z-fixed-bar` (kept below dropdowns/modals; offset from CTA bar retained) | |
| ServiceCatalog `z-[1]`/`z-10` | ServiceCatalog.tsx:344,300 | `--z-base`/`--z-raised` | in-card micro-layering, unchanged semantics |
| decorative `z-index:-1/0/1/2` | globals.css hero/pattern layers | keep as-is | intra-component decoration, not part of the app scale |
| sonner | admin-shell.tsx:670-680 | `--z-toast` via `<Toaster style={{zIndex:'var(--z-toast)'}}>` | *Unverified (runtime)* until tested with modal open |

### 1.4 Portal-mounting rules

1. Any overlay that must escape a card, table wrapper, or scroll container **must render through a portal** (Radix `Portal` or `createPortal(…, document.body)`). Applies to: dropdown menus, selects, comboboxes, popovers, tooltips, date pickers, dialogs, drawers, toasts.
2. Full-viewport `position:fixed` overlays that are NOT portalled (today: `PortalDialog`, portal.css:5200-5203) are **fragile**: any ancestor with `transform`, `filter`, `backdrop-filter`, or `will-change` becomes their containing block. Currently latent, not active (verified: no such ancestor between call sites and body — overlay audit O-09) — but this codebase is glass-heavy (38 `backdrop-filter` uses in globals.css, 13 in portal.css), so the landmine is one refactor away. Rule: migrate `PortalDialog` to `createPortal` (the pattern already proven in `consultation-documents-modal.tsx:815`, the repo's only true portal).
3. Click-outside "catcher" divs (`fixed inset-0 z-30`) are an artifact of non-portalled menus; portalled Radix menus get outside-click + Escape + focus management for free. Prefer Radix.
4. `overflow: hidden` is allowed on cards/wrappers **only if** every floating element triggered inside them is portalled. `.gh-admin-table-wrap { overflow: hidden }` (portal.css:4153-4156) is currently safe because row actions are inline buttons, not menus — this rule keeps it safe when kebab menus are introduced.
5. Verify after each migration that Radix focus management, dismiss-on-outside-click, and scroll locking still work (checklist in the implementation plan Phase 1 validation).

### 1.5 Overflow rules around overlay triggers

- Prefer `overflow: clip` over `overflow: hidden` where clipping is decorative — `.gh-medical-pattern` (globals.css:2564-2571) already documents why (`hidden` broke `position:sticky` descendants). Follow that precedent.
- Never pair `overflow-x-auto` alone on a strip containing menu triggers (portal.css:20-25 documents the `overflow-y` auto-computation gotcha).
- `overflow-hidden` on `audit-log` table wrap (`audit-log/page.tsx:324`) is a bug, not a rule violation to preserve — see portal audit P-02.

---

## 2. Typography tokens

### 2.1 Principle

Two scales stay (public fluid / portal dense) — that split is spec'd in DESIGN.md §3 and DESIGN2.md §6.1 and is an **intentional divergence**. What gets unified: token *names/roles*, minimum floors, and the rule that no route hand-rolls sizes outside its scale.

### 2.2 Role tokens (shared vocabulary, per-scope values)

| Role token | Public value (existing) | Portal value (existing spec) | Min floor | Notes |
|---|---|---|---|---|
| `display` | `--text-display` clamp(2.5rem,7vw+1rem,6rem) | n/a | — | hero only; `text-wrap: balance` on ≤3-line heads |
| `page-title` | `--text-h1` clamp(2.25rem,5vw+0.5rem,4.25rem) | clamp(24px,2vw,34px) | 24px | |
| `section-title` | `--text-h2` | 16px | 16px | |
| `card-title` | `--text-h3` | 14–15px | 14px | |
| `body` | `--text-body` clamp(0.95rem→1.05rem) | 14px | 14px | |
| `body-compact` | — (new: 0.875rem) | 13px | 13px | drawer/secondary prose |
| `label` | `--text-meta` 14px | 12.5px | 12px | form labels |
| `metadata` | `--text-eyebrow` 13px | 12px | 12px | |
| `table-header` | n/a (no public tables) | 10.5–11px caps + tracking | 10.5px | uppercase + letter-spacing compensates size |
| `table-cell` | n/a | 13.5px | 13px | |
| `caption`/`micro` | — | 10px | **10px hard floor** | uppercase micro-badges only |

Line heights, weights, letter-spacing per existing DESIGN.md/DESIGN2.md values — unchanged.

### 2.3 Violations of the floor (fix list)

Five `text-[9px]` occurrences below even the portal's own 10px micro floor:
- `service-time-picker.tsx:185,189` (public /book)
- `slot-picker-step.tsx:188,192` (public /consult)
- `reschedule-picker.tsx:227` (account)

Fix: raise to 10px token (or 11px given these are on the public site where the floor should be 12px for anything non-uppercase-badge). 147 files carry sub-12px arbitrary `text-[...]` — most map to spec'd portal roles; migration is Phase 7 (consolidation), not a per-file emergency.

### 2.4 Container-responsive typography — where and how

Rules (also the zoom contract, §6):
- NEVER JavaScript zoom detection, `zoom:` CSS, or `transform:scale()` to shrink sections. (Census: none exist today — keep it that way.)
- Fluid sizing only via `clamp()` with rem bounds (public already does this).
- Container queries (`@container` + `cqi`) introduced ONLY where a component's available width diverges from viewport width. Concretely justified spots (evidence: portal sidebar is 260–272px fixed, `--portal-sidebar-w` portal.css:4275, so main-content width ≠ viewport; and zero `@container` exists today):
  1. Portal list/table region (drives table↔card switch — replaces the broken fixed 760px media query, portal audit P-01).
  2. Dashboard summary-card strips.
  3. Drawer body content (forms inside a 480–640px drawer).
  4. `MessagesInbox` two-pane (`MessagesInbox.tsx:111`).
- Everything else stays viewport-breakpoint based. Do not blanket-migrate.

### 2.5 Long-text handling rules

- Long unbroken values (emails, IDs, URLs): `overflow-wrap: anywhere` in cards/drawers; `truncate` allowed in table cells **only with an access path** — `title` attr minimum, drawer/expanded row preferred.
  - Known violations: `FamilyPanel.tsx:374` (truncated email, no title), `admin-shell.tsx:611` (sidebar email), majority of the 38 `truncate` files lack `title` (typography census E).
- `text-wrap: balance` for hero/section headings ≤3 lines.
- `whitespace-nowrap` allowed on: marquee tracks (intentional), table headers (`portal.css:4026`), short numeric cells. NOT on translatable CTA/button labels — violations: `SiteHeader.tsx:252`, `StickyBookingCTA.tsx:30`, `SectionNav.tsx:31` (nav pills). This site ships 6+ locales; CS/RO strings run long.
- `line-clamp` on card descriptions needs paired full-content access (detail page/drawer).

---

## 3. Overlay & drawer primitives (one system, both scopes)

### 3.1 Current fragmentation (evidence)

- Radix used in exactly 3 files (`MobileNav`, `SectionNav`, admin `country-picker`).
- 4+ hand-rolled dropdown implementations, each re-implementing Escape/outside-click/focus (CountrySwitcher.tsx:48-88, LanguageSwitcher.tsx:48-65, NotificationPopover.tsx:59-84, user-menu duplicated verbatim in portal-shell.tsx:396-457 AND admin-shell.tsx:584-634).
- 3 modal systems: `PortalDialog` (custom, good a11y, NOT portalled), `consultation-documents-modal` (createPortal, separate impl), Radix Dialog (MobileNav only). Plus two un-migrated modals without focus traps (`delete-account-button.tsx:99-150`; consultation-documents-modal trap *Unverified*).
- Native `<details>` dropdowns with zero dismiss/collision logic (`DoctorFilters.tsx:78-100`).

### 3.2 Proposed primitives

| Primitive | Base | Serves | Replaces |
|---|---|---|---|
| `OverlayLayer` conventions | Radix Portal + `--z-*` tokens | everything floating | ad-hoc z classes |
| `AppMenu` (dropdown/popover) | Radix DropdownMenu/Popover, styled by scope tokens | CountrySwitcher, LanguageSwitcher, NotificationPopover, user-menu (dedupe the 2 copies), DoctorFilters panels, future row kebab menus | 6 hand-rolled impls |
| `AppDialog` | PortalDialog API kept, internals → `createPortal` + `--z-modal` | all current PortalDialog consumers + migrate delete-account + documents-modal | 3 modal systems → 1 |
| `AppSheet` / `RecordDetailsDrawer` | Radix Dialog side/bottom variant; desktop right drawer (`max-w` sm 420 / md 520 / lg 640px), tablet ~80vw, mobile full-screen bottom sheet w/ safe-area insets, sticky header/footer, internal scroll, body scroll lock | portal record drawers (see `DRAWER_ARCHITECTURE_PLAN.md`), website filter sheets, MobileNav (eventually) | — new |
| `ListToolbar`/`ResponsiveFilterBar` | pattern extracted from `.gh-admin-appointment-filter-grid` (portal.css:1247-1357 — the proven CSS-grid collapse pattern) | all list filter bars | hardcoded `min-w-[180px]` inputs (blog/pages), non-wrapping corporate form |
| `ColumnPriorityTable` (extend `AdminTable`) | field config w/ priority 1–4 + drawer flag; renders desktop table + `PortalMobileCard` list from ONE config | the 20+ dual-markup table/card pairs | duplicate markup per route |

Config model (conceptual, to be adapted):

```ts
type ResponsiveField<T> = {
  key: string; label: string;
  priority: 1 | 2 | 3 | 4;
  render: (r: T) => ReactNode;
  drawer?: boolean; sortable?: boolean; width?: string;
};
```

Constraints honored: server components/pagination/permissions/query params preserved — the config renders inside the existing server-rendered pages; no data-fetch changes.

### 3.3 Shared vs scope-only (explicit)

- **Shared product-wide:** `--z-*` scale, `AppMenu`, `AppDialog`, `AppSheet`, focus/touch-target/truncation rules, breakpoint set.
- **Portal-only:** `ColumnPriorityTable`, `RecordDetailsDrawer` content patterns, dense type scale, `PortalMobileCard`. Justification: public site has no data tables.
- **Website-only:** fluid display type, marquee/hero patterns, `StickyBookingCTA`. Justification: marketing surface, no workstation density needs.

---

## 4. Layout & sizing tokens

- **Shell widths:** portal sidebar `--portal-sidebar-w: 272px` (existing, keep); portal main `max-width: 1380px` (portal.css:4129-4133, keep); public content widths per DESIGN.md (keep).
- **Content padding:** standardize portal main horizontal padding to one token (`--portal-pad-x`, values 16/24/32 at breakpoints) — currently per-page ad hoc.
- **Card padding:** portal `p-4`(16)/dense, public `p-6`(24) — codify as `--card-pad` per scope; current free mixing of p-3..p-8 (density census C) is Phase 7 cleanup.
- **Grid rule:** every grid with a fixed track (`lg:grid-cols-[1fr_360px]`) must use `minmax(0,1fr)` for the flexible track. Violation: `availability-ui.tsx:205` vs correct siblings `doctor/calendar/ui.tsx:338`, `account/calendar/ui.tsx:45`.
- **Flex rule:** any flex child that can contain a table/truncating text gets `min-w-0` (already correct in shells: admin-shell.tsx:474,667; keep enforcing).
- **Table min-widths:** replace the blanket `.gh-admin-main :where(...) table { min-width: 720px }` (portal.css:5066-5082) with per-table values derived from Priority-1/2 column budgets; hard rule: no table forces > ~960px (today: orders forces 1180px, portal.css:2412-2414).
- **Breakpoints:** keep Tailwind sm/md/lg/xl/2xl; the portal table↔card switch moves off the fixed 760px media query (portal.css:911-942) to a container query on the list region (threshold ≈ table's real min width). Container-query thresholds: list region 640/880/1080px; summary strips 480/720px; drawer body 420/560px.
- **Touch targets:** 44px minimum for primary interactive elements on touch surfaces (precedent already in repo: `.gh-btn` patient override `min-height:44px !important`, globals.css:2324-2326). Icon-only `.gh-icon-btn` 32px (globals.css:1758-1771, DESIGN.md §5.8) may stay 32px **visual** but must gain ≥44px hit area (padding/pseudo-element) on `pointer:coarse`. Calendar day targets `size-6`/`size-7` (MonthCalendar.tsx:126, WeekCalendar.tsx:260) same treatment.
- **Drawer/modal size variants:** `sm 420px / md 520px / lg 640px` desktop; tablet `min(80vw, lg)`; mobile full-width sheet. Modal `max-h calc(100dvh - 2rem)` + internal scroll (pattern already correct in delete-account-button.tsx:123).

---

## 5. Filter-toolbar behavior at narrow widths

Canonical pattern = `.gh-admin-appointment-filter-grid` (portal.css:1247-1357): CSS grid `repeat(4,minmax(0,1fr))` → 2 → 1 column collapse. Rules:
1. Search stays full-width first row on narrow.
2. >4 secondary controls → collapse behind "Filters" trigger (AppSheet on mobile) with active-count badge and visible active-filter chips.
3. No fixed-px widths on filter inputs (violations: blog/page.tsx:81-117, pages/page.tsx:101-146 `min-w-[140..180px]`; corporate employees `w-56` search employees/page.tsx:202).
4. Every filter form wraps (violation: corporate requests/page.tsx:149 missing `flex-wrap`).
5. Export/bulk actions → overflow menu below `lg`; primary page action always visible.

---

## 6. Zoom & accessibility contract

- Browser zoom is never counteracted: no zoom detection, no shrink-on-zoom, no `transform:scale` shells (verified absent today; codified as a rule).
- At 200% zoom the layout reflows via the same container/breakpoint logic (narrower effective viewport → card modes, stacked toolbars). *Unverified (runtime)* — Phase 0 baseline captures this.
- Focus: global `:focus-visible` ring exists (globals.css:302); rule — `outline-none` only with a replacement ring. Violations to fix: MessagesInbox.tsx:125, rich-text-html-field.tsx:249,265,281,349, doctor-bio-rich-text-field.tsx:130-241, country-picker.tsx:84.
- Reduced motion: already comprehensive (globals.css:3286-3290 + ~15 targeted rules + RevealOnScroll JS bail) — no changes.
- Dialogs: all modals get PortalDialog-grade trap/restore (delete-account modal currently lacks it — delete-account-button.tsx:99-150).

---

## 7. Migration guidance

Per-token migration path lives in `RESPONSIVE_IMPLEMENTATION_PLAN.md` phases: z-tokens + portal rules (Phase 1), primitives (Phase 2), per-route (Phases 3–6), type/density consolidation (Phase 7), cleanup (Phase 8). Every step additive + independently revertible; no selector moves between globals.css/portal.css that violate the CSS-split rule in root CLAUDE.md.
