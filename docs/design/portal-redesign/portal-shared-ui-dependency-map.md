# Portal Shared UI Dependency Map

> **Purpose.** This is the master reference for any future theme / design
> redesign of the Admin, Doctor, and Patient (Account) portals. It maps
> which components and CSS affect which portal, what is hardcoded, and what
> to edit globally vs per-portal — so a future redesign is safer and more
> accurate.
>
> **Scope.** Documentation + dependency mapping only. No UI, theme, or
> component changes were made producing this file.
>
> **Verified against source** on branch `Dev-hassaan`. Every claim below was
> checked against actual files, not just the pre-existing audit docs.

Companion audits (reference, verify against source before trusting):
`admin-portal-audit.md`, `doctor-portal-audit.md`, `patient-portal-audit.md`,
`shared-components-audit.md` (114 component rows), `verification-results.md`.

> **STATUS (Phase 11 cleanup pass): the redesign this document was scoping
> has since shipped.** `DESIGN.md` in this directory is now the binding,
> current-state spec — treat it as authoritative over anything below that
> conflicts. This file is kept as a **historical pre-redesign snapshot**:
> useful for understanding what changed and why, not for what the code
> looks like today. §6 and §7 specifically describe a "before" state that
> no longer exists; each carries a resolved-status note pointing at what
> shipped instead of being rewritten inline.

---

## 1. Executive summary

- Admin, Doctor, and Patient portals have each received a UI pass. They are
  **not** on a final visual design — the full theme (color, type, cards,
  tables, forms, spacing, shadows, borders, backgrounds) may change later.
- **The three portals are not three design systems. They are one.** A single
  primitive library (`atoms.tsx`) and a single global stylesheet
  (`globals.css`) drive all three. Two shells (`admin-shell.tsx` for Admin,
  `portal-shell.tsx` for Doctor + Patient) share the same CSS classes.
- Consequence: **most visual edits are global by default.** Changing a token,
  an atom, or a `.gh-*` rule touches all three portals at once. Genuinely
  per-portal changes are the exception and live in each portal's route root.
- **Naming trap:** classes prefixed `gh-admin-*` are **not** admin-only. They
  are emitted by the shared atoms and by `.gh-admin-main` (which wraps the
  `<main>` of every portal). Editing a `.gh-admin-*` rule affects Doctor and
  Patient too. Treat the `admin` prefix as legacy, not as scope.
- This document tells you **what to edit globally, what to edit per portal,
  what is safe to redesign in place, and what needs a role-specific variant.**

**Path correction (important for future agents):** the Patient portal lives at
`frontend/app/(auth)/account/**`, **not** `frontend/app/(account)/account/**`.
There is no `(account)` route group. All Patient-portal references in older
prompts/docs that say `(account)/account` mean `(auth)/account`.

---

## 2. Portal roots and layout ownership

| Portal | Route root | Layout / shell files | Local shared components | Global shared components used | Notes |
|---|---|---|---|---|---|
| **Admin** | `frontend/app/(admin)/admin/**` | `admin/layout.tsx` → renders `admin/_components/admin-shell.tsx` (`AdminShell`) | `admin/_components/**` + per-feature `*/_components/**` (**56** `.ts(x)` files across 14 `_components` dirs). Canonical design system `admin/_components/atoms.tsx` lives here. | `globals.css`, `atoms.tsx` (own), `NotificationPopover`, `calendar/*`, `chat/ChatThread`, `chat/InternalMessagesThread`, `forms/phone-field` | Only portal with the country picker + Global/Country split nav. `<main>` = `gh-admin-main gh-portal-main`. Also mounts `sonner` `<Toaster>`. |
| **Doctor** | `frontend/app/(doctor)/doctor/**` | `doctor/layout.tsx` → renders `@/components/portal-shell.tsx` (`PortalShell`) | `doctor/**/_components/**` (**31** `.tsx` files) | `globals.css`, `portal-atoms` → `atoms.tsx`, `portal-shell`, `NotificationPopover`, `calendar/*`, `chat/ConsultationChat`, `chat/InternalMessagesThread`, `forms/phone-field`, `forms/LanguagePicker` | Single nav section (`sectionLabel="Global"`). No country picker. |
| **Patient / Account** | `frontend/app/(auth)/account/**` | `account/layout.tsx` → renders `@/components/portal-shell.tsx` (`PortalShell`) | `account/**/_components/**` (**12** `.tsx` files) | `globals.css`, `portal-atoms` → `atoms.tsx`, `portal-shell`, `NotificationPopover`, `calendar/*`, `chat/ChatThread`, `chat/ConsultationChat`, `payments/SyncOrderPaymentOnReturn`, `forms/phone-field` | i18n-driven nav labels (`loadLocaleBundle`). `logoHref` points at the country homepage, not `/account`. |

**Loading / error files.** Each portal root ships a `loading.tsx`
(`admin/loading.tsx`, `doctor/loading.tsx`, `account/loading.tsx`) plus
per-feature `loading.tsx` files (Admin has many; they render
`admin/_components/skeletons.tsx`). No dedicated `error.tsx` at the portal
roots at time of writing.

**Shell relationship.** `admin-shell.tsx` and `portal-shell.tsx` are
deliberate mirrors — same sidebar geometry (272px, dark forest), same sticky
topbar, same breadcrumb logic, same user menu, same `NotificationPopover`.
`PortalShell` is `AdminShell` minus the country picker and minus the
Global/Country nav split. **A redesign of one shell must be mirrored in the
other** or Admin and Doctor/Patient will visually diverge.

---

## 3. Shared components impact matrix

Risk key: **High** = editing it visibly changes multiple portals heavily ·
**Medium** = affects a repeated component/workflow · **Low** = isolated /
role-scoped.

| File / Component | Admin | Doctor | Patient | What it controls | Redesign risk | Recommendation |
|---|:--:|:--:|:--:|---|:--:|---|
| `frontend/app/globals.css` | ✅ | ✅ | ✅ | Theme tokens (`:root`) + every `.gh-*` class: buttons, cards, tables, forms, badges, summary strip, empty state, mobile cards, sidebar, topbar, page header | **High** | Single source of truth for theme. Edit tokens first; edit `.gh-*` rules only knowing all 3 portals inherit them. |
| `app/(admin)/admin/_components/atoms.tsx` | ✅ | ✅ | ✅ | Canonical primitives: `PageHeader`, `SectionHeader`, `AdminCard`, `StatCard`, `AdminSummaryStrip`, `AdminEmptyState`, `Pill`, `AdminTable`/`Thead`/`Th`/`Td`/`Tr`, `IconBtn`, `Toggle`, `Btn`, `Eyebrow` | **High** | **The** shared design system. Re-exported by `portal-atoms.ts`. Safe to restyle globally; changing markup/props needs a sweep of all 3 portals. |
| `frontend/components/portal-atoms.ts` | ➖ | ✅ | ✅ | Thin re-export shim of `atoms.tsx` so non-admin routes import without crossing route groups | **High** (pass-through) | Do not fork. Keep it a pure re-export; restyle the source atoms, not this file. |
| `frontend/components/portal-shell.tsx` | ➖ | ✅ | ✅ | Doctor + Patient chrome: dark sidebar, sticky topbar, breadcrumb, user menu, notification bell | **High** | Restyle in lockstep with `admin-shell.tsx`. Shares CSS classes with it. |
| `app/(admin)/admin/_components/admin-shell.tsx` | ✅ | ➖ | ➖ | Admin chrome (mirror of `PortalShell` + country picker + Global/Country nav) | **High** | Mirror any shell restyle here. Country picker + nav partition are admin-only. |
| `frontend/components/NotificationPopover.tsx` | ✅ | ✅ | ✅ | Topbar bell dropdown + notification row styling in all three shells | **Medium** | Safe to redesign globally; single component, consistent across portals. |
| `frontend/components/calendar/**` (`MonthCalendar`, `DayAgenda`, `EventDetailDialog`, `TimezoneSelect`, `calendar-utils`, `calendar-types`) | ✅ | ✅ | ✅ | Month grid, day agenda, event dialog, timezone picker on each portal's `/calendar` (+ Patient bookings) | **High** | Shared calendar surface. Redesign once, verify all 3 calendars. `calendar-utils/-types` are logic — do not restyle. |
| `frontend/components/chat/**` (`ChatThread`, `ConsultationChat`, `InternalMessagesThread`) | ✅ (`ChatThread`, `InternalMessagesThread`) | ✅ (`ConsultationChat`, `InternalMessagesThread`) | ✅ (`ChatThread`, `ConsultationChat`) | Message bubbles, thread layout, composer for consult + internal messaging | **Medium** | Each chat component spans ≥2 portals. Redesign the bubble/thread system once; check every consumer. |
| `frontend/components/forms/phone-field.tsx` | ✅ | ✅ | ✅ | Country-code phone input (also used on public `(site)` booking/checkout) | **Medium** | Cross-portal **and** public. A restyle here escapes the portals — verify site too. |
| `frontend/components/forms/LanguagePicker.tsx` | ➖ | ✅ | ➖ | Language multiselect on Doctor profile edit | **Low** | Doctor-scoped in the portals. |
| `frontend/components/payments/SyncOrderPaymentOnReturn.tsx` | ➖ | ➖ | ✅ | Post-payment order sync on Patient bookings (also public checkout) | **Low** | Behavioral, minimal UI. Patient + site only. |
| `frontend/components/forms/ContactForm.tsx` | ➖ | ➖ | ➖ | Public contact form | **Low** | **Not** a portal component — `(site)` only. Listed to rule it out. |
| `frontend/components/booking/**` | — | — | — | **Does not exist.** Booking UI (`HeroBookingWizard`, `SameDayBooking`, `StickyBookingCTA`) lives in `components/sections/` and is public-site only | n/a | No portal dependency. Do not look for a `components/booking` dir. |

Legend: ✅ used · ➖ not used · — n/a.

---

## 4. Role-specific component map

These are the route-owned `_components`. They consume the shared atoms/CSS but
their **markup and composition** are owned by one portal.

### 4.1 Admin shared components (`app/(admin)/admin/_components/**` + feature `_components`)

56 files. The reusable core of the Admin portal:

| Component | Used by | Controls | Admin-only? | Promote to global later? | Notes |
|---|---|---|:--:|:--:|---|
| `atoms.tsx` | **All 3 portals** (via `portal-atoms`) | Entire primitive set | ❌ already shared | — | Physically lives under admin but is the global system. Consider moving to `components/` in a future refactor so the ownership matches reality. |
| `admin-shell.tsx` | Admin only | Admin chrome | ✅ | keep admin-only (country picker) | Mirror of `PortalShell`. |
| `country-picker.tsx` / `country-picker-constants.ts` / `flag-badge.tsx` / `scope-banner.tsx` | Admin | Country scoping UI | ✅ | keep admin-only | No Doctor/Patient equivalent. |
| `skeletons.tsx` | Admin `loading.tsx` files | List/table loading states | ✅ | **yes** — Doctor/Patient loading could reuse | Currently admin-local; good global-skeleton candidate. |
| `confirm-delete-button.tsx` | Admin CRUD pages | Destructive-action confirm | ✅ | maybe | Pattern overlaps Patient `delete-account-button`, Country `delete-country-button`. |
| `managed-image-field.tsx`, `multi-image-field.tsx` | Admin content forms | Image upload fields | ✅ | maybe | Content-management-specific. |
| `plan-*`, `*-translation-tabs`, `rich-text-html-field`, `subscriber-ledger`, `subscription-health-panel` | Admin | Plans, i18n tabs, rich text, subscription ops | ✅ | keep admin-only | CMS/ops surfaces. `rich-text-html-field` is also imported by Doctor profile edit — semi-shared. |

Redesign note: Admin has by far the largest surface (tables, CRUD forms, tabs,
CMS). Most Admin `_components` are **compositions of the shared atoms** — they
inherit a token/atom restyle for free. Only their layout/wrapping is Admin-owned.

### 4.2 Doctor shared components (`app/(doctor)/doctor/**/_components`)

31 files. Clinical-workflow surfaces:

| Component | Used by | Controls | Doctor-specific? | Overlaps Admin/Patient? | Notes |
|---|---|---|:--:|---|---|
| `_components/doctor-document-tables.tsx` | Multiple appointment tabs | Medical document tables | ✅ | Pattern overlaps Admin tables + Patient `medical-files` | Prime candidate for a shared "document table" abstraction. |
| `appointments/[id]/_components/*` (consultation-form, appointment-tabs, documents-*, prescriptions-list, exam-results-list, finalize-checklist, brazil-consent-panel, consultation-chat-section, …) | Doctor appointment detail | Consultation workflow, doc review/send, tabs, chat mount | ✅ | Chat + tabs patterns overlap Admin/Patient | Deeply clinical; keep Doctor-owned. Tabs/cards inherit shared atoms. |
| `availability/_components/availability-ui.tsx` | Doctor availability | Weekly availability editor | ✅ | Admin has doctor-availability page too | Two availability editors exist (Admin + Doctor) — reconcile styling if redesigning. |
| `profile/_components/edit-form.tsx`, `profile-sections.tsx` | Doctor profile | Profile edit | ✅ | Uses shared `phone-field`, `LanguagePicker`, `rich-text-html-field` | — |
| `patients/[email]/_components/*`, `forms/_components/templates.tsx`, `reports/_components/csv-button.tsx`, `notifications/_components/notification-list.tsx` | Doctor | Patient view, form templates, reports, notifications | ✅ | `notification-list` mirrors Patient `patient-notification-list` | Two near-identical notification lists — unify later. |

### 4.3 Patient / Account shared components (`app/(auth)/account/**/_components`)

12 files. Consumer-facing account surfaces:

| Component | Used by | Controls | Patient-specific? | Overlaps Admin/Doctor? | Notes |
|---|---|---|:--:|---|---|
| `_components/SubscriptionDashboard.tsx` | `account/page.tsx`, `membership/page.tsx` | Subscription/plan dashboard cards | ✅ | Admin has `subscription-health-panel` / `subscriber-ledger` (ops side) | Consumer vs ops framing — keep separate but share tokens. |
| `membership/_components/ManagePanel.tsx` | SubscriptionDashboard, membership | Plan manage actions | ✅ | — | — |
| `notifications/_components/patient-notification-list.tsx` | `account/notifications` | Notification list | ✅ | Mirrors Doctor `notification-list` | Unify into one shared list later. |
| `profile/_components/*-tab.tsx` (gdpr, insurance, nationality, verification, patient-profile-section) | `account/profile` | Profile tabs + verification/GDPR | ✅ | Tabs pattern overlaps Admin/Doctor | Uses shared `phone-field`. |
| `rewards/_components/RewardsPanel.tsx`, `payments/_components/receipt-button.tsx`, `security/_components/delete-account-button.tsx`, `subscribe/_components/SubscribeForm.tsx` | Respective account pages | Rewards, receipts, account deletion, subscribe flow | ✅ | `delete-account-button` overlaps Admin confirm-delete pattern | — |

---

## 5. Global CSS and theme dependency map

Source: `frontend/app/globals.css` (**6232 lines**). The `:root` block (lines
**31–162**) holds the tokens; the **portal system** starts at the comment
`/* Portal redesign: admin, doctor, and patient share one compact work
surface. */` (**line 1514**) and runs through the mobile-card / responsive
rules (~line 3050). `.gh-dark-scroll` (scrollbar) is defined at the very top
(lines 3–27).

| CSS selector / group | Used by | Portal impact | Controls | Hardcoded theme values | Redesign recommendation |
|---|---|:--:|---|---|---|
| `:root { --color-*, --shadow-*, --radius-*, --font-*, --space-*, --text-* }` | Everything | **All 3 + public site** | The entire palette, type scale, spacing, radius, shadow system | Yes — all brand hex live here (`#1D4B36`, `#8FB021`, `#B0F122`, backgrounds, status colors) | **Edit here first for any theme change.** This is the one true token source. |
| `.gh-portal-shell` (+ `::before`/`::after`) | Both shells | All 3 | Portal page background + ambient texture overlay | `#f4f6ef`; `url(/images/portal/portal-ambient-texture.png)`; `rgba(246,248,241,0.84)` | Texture PNGs are hardcoded, not tokenized. Tokenize or swap deliberately. |
| `.gh-portal-sidebar` (+ `::before`) | Both shells | All 3 | Dark forest sidebar bg, border, shadow, texture | `rgba(18,54,39,0.96)`, `rgba(255,255,255,0.08)`, sidebar texture PNG | Sidebar color is **hardcoded rgba, not a token.** High-value tokenization target. |
| `.gh-portal-topbar` | Both shells | All 3 | Frosted sticky header | `rgba(250,251,247,0.86)`, `blur(16px)` | Tokenize glass recipe. |
| `.gh-portal-main` | Both shells | All 3 | Content max-width + centering | `max-width:1380px` | Layout token. |
| `.gh-portal-page-header` (+ `.gh-admin-area-hero`, `.gh-portal-eyebrow-dot`, `.gh-portal-section-*`) | `PageHeader`/`SectionHeader` atoms | All 3 | Page hero panel + eyebrow dot + in-card section headers | `rgba(255,255,255,0.9)`, `clinical-panel-wash.png`, mint dot `var(--color-brand-mint)` | Header wash is a hardcoded PNG. |
| `.gh-admin-card` | `AdminCard`/`StatCard` atoms | All 3 | Card surface, radius, shadow, tint overlay | `border-radius:8px !important`, `rgba(255,255,255,0.88) !important`, `portal-card-tint.png` | `!important` + PNG overlay make this rigid. Untangle before restyle. |
| `.gh-stat-card` (+ `:hover`, `.gh-stat-accent`, `.gh-stat-decor`) | `StatCard` atom | All 3 | Dashboard stat tiles, hover lift, accent reveal | tile fg `#B0F122`/`#143B30` (in atom), radial-gradient decor | Decorative gradients hardcoded in both CSS and atom inline styles. |
| `.gh-admin-summary-strip` / `.gh-admin-summary-item(--brand/--success/--warning)` | `AdminSummaryStrip` atom | All 3 | 3-up metric strip above lists | `repeat(3,…)`, gradient fills, `rgba(29,75,54,0.1)` borders, tone border colors | Tone colors hardcoded, not status tokens. |
| `.gh-admin-empty-state(__asset/__icon/__action)` | `AdminEmptyState` atom | All 3 | Composed empty states | radius, muted text | Safe global restyle. |
| `.gh-admin-mobile-card` / `.gh-admin-appointment-mobile-card` | Responsive table→card fallback | All 3 (mostly Admin/Doctor lists) | Mobile card rendering of tables under `@media (max-width:760px)` | spacing/radius | Restyle with the table system. |
| `.gh-admin-main table / thead / th / td / tbody tr:hover` | `<main>` of **every** portal | **All 3** | Global table styling (header caps, row hover, borders) | `var(--color-*)` mostly | Despite `admin` name, styles Doctor + Patient tables. |
| `.gh-admin-main :where(button…, a.gh-btn…)` overrides | `<main>` of every portal | All 3 | Button normalization inside portals | inline in rules | Broad descendant selectors — audit before changing. |
| `.gh-btn(-primary/-outline/-accent/-soft/-danger/-ghost-dark)` | `Btn` atom + raw buttons | All 3 + site | Button variants | `var(--color-*)` | Token-backed; safe global restyle. |
| `.gh-pill`, `.gh-badge(-error/-success/-warning/-info/-neutral)`, `.gh-kicker` | `Pill` atom + status labels | All 3 | Status badges/pills | **Pill tones carry hardcoded hex in `atoms.tsx`** (`#FEF3C7`, `#DCFCE7`, `#FEE2E2`, …) | Status palette is split between CSS badges and atom Pill map — unify into tokens. |
| `.gh-admin-toggle` / `.gh-admin-status-toggle` | `Toggle` atom | All 3 | On/off switches | `var(--color-brand-primary)`, `var(--color-border-strong)` | Token-backed. |
| `.gh-icon-btn` | `IconBtn` atom | All 3 | 32×32 row-action buttons | `var(--color-*)` | Safe global restyle. |
| `.gh-eyebrow` / `.gh-eyebrow-on-dark` | `Eyebrow`/`PageHeader` | All 3 + site | Signature all-caps taxonomy label | brand color, `+0.06em` tracking | Brand signature — change deliberately. |
| `.gh-dark-scroll` | Sidebars | All 3 | Dark scrollbar for sidebar nav | `rgba(255,255,255,…)` | Minor. |

**Structural takeaway:** the `.gh-admin-*` family is the shared portal system
under a misleading name. The `.gh-portal-*` family is the newer, correctly
named shell layer. A future refactor should rename `.gh-admin-*` →
`.gh-portal-*` (or introduce `.gh-portal-card` etc.) so scope is obvious, but
that is a mechanical rename to plan carefully, not a redesign.

---

## 6. Color and theme audit

> **RESOLVED.** Every "Tokenize?" row below shipped as a `--portal-*`
> token in `globals.css` `:root` (DESIGN.md §4). Sidebar fill is
> `--portal-chrome`/`--portal-chrome-solid`; active nav item uses
> `--portal-signal`/`--portal-accent` (role-scoped via `[data-portal]`),
> not an inline `#D9F99D`; `Pill`'s `PILL_TONES` map (`atoms.tsx`) reads
> `var(--portal-success-soft)`/`-warning-soft`/`-danger-soft`/`-primary-soft`
> etc., the same tokens `.gh-badge-*` reads — the "two status palettes"
> problem is closed. The legacy texture PNGs referenced in the table below
> were deleted in the Phase 9/11 cleanup (superseded by CSS-only chrome
> recipes and, where a photographic wash is still wanted, DESIGN.md §9's
> asset list). Table kept as historical record of what was hardcoded
> before.

Where portal color/theme actually comes from.

| File | Color / theme usage | Portal affected | Purpose | Tokenize? | Notes |
|---|---|:--:|---|:--:|---|
| `globals.css` `:root` (31–162) | All brand hex + status + shadow + radius + type + spacing tokens | All 3 + site | Master token set | already tokens | `#1D4B36` forest, `#8FB021` mint, `#B0F122` lime, `#F6F8F1`/`#EDF2E2` bg, `#E4E7DD`/`#C3CCB5` borders, `#6D6D6D` muted |
| `globals.css` `.gh-portal-sidebar` | `rgba(18,54,39,0.96)` sidebar fill + `rgba(255,255,255,0.08)` borders | All 3 | Dark sidebar | **yes** | Not derived from a token — a hidden second "brand dark". |
| `globals.css` `.gh-portal-shell` / `-page-header` / `-card` | `#f4f6ef`, `rgba(255,255,255,0.84–0.9)`, 3 texture PNGs | All 3 | Portal bg + panel washes | **yes** | Texture PNGs under `/public/images/portal/`. |
| `atoms.tsx` `PILL_TONES` | Per-tone hex: `#FEF3C7`/`#92400E` (pending), `#DCFCE7`/`#166534` (active), `#FEE2E2`/`#991B1B` (inactive), draft greys | All 3 | Status pills | **yes** | Parallel status palette to CSS `--color-status-*`. Two sources of truth. |
| `atoms.tsx` `BTN_VARIANTS` / `StatCard` tones | `#fff`, `#143B30`, `#B0F122`, `#991B1B`/`#FEE2E2`/`#FCA5A5` (danger) | All 3 | Button + stat tile fills | partial | Mostly tokens; danger + tile-fg hardcoded. |
| `admin-shell.tsx` / `portal-shell.tsx` | Sidebar active `#D9F99D`, badge `#D9F99D`/`#0a1f14`, `rgba(255,255,255,…)` nav text, `var(--color-brand-mint)` rules | Admin / Doctor+Patient | Sidebar nav item states | **yes** | Active-item lime `#D9F99D` is inline in both shells — not a token. |
| `globals.css` `.gh-badge-*` | Status bg/text/border via `--color-status-*` | All 3 + site | Inline status badges | already tokens | Keep; align Pill map to these. |
| `globals.css` `--gh-chrome*` | Glass recipe `rgba(4,32,24,0.78)` + lime hairline | Site nav/footer (not portals) | Public chrome | already tokens | Listed to distinguish from portal chrome. |

### Recommended future token structure (documentation only — do not implement now)

A portal-scoped token layer that maps onto today's hardcoded values:

```
--portal-bg              /* today: #f4f6ef / --color-background-soft */
--portal-surface         /* today: rgba(255,255,255,0.88) card fill */
--portal-surface-muted   /* today: --color-background-soft / panel washes */
--portal-border          /* today: --color-border / rgba(29,75,54,0.1) */
--portal-text            /* today: --color-text-primary */
--portal-text-muted      /* today: --color-text-muted */
--portal-primary         /* today: --color-brand-primary #1D4B36 */
--portal-primary-soft    /* today: mint-soft / accent-soft */
--portal-accent          /* today: --color-accent #B0F122 */
--portal-sidebar-bg      /* today: rgba(18,54,39,0.96) — currently untokenized */
--portal-sidebar-active  /* today: #D9F99D — currently inline in both shells */
--portal-success         /* today: --color-status-success-* + Pill active */
--portal-warning         /* today: --color-status-warning-* + Pill pending */
--portal-danger          /* today: --color-status-error-* + Pill inactive + Btn danger */
--portal-info            /* today: --color-status-info-* */
--portal-card-shadow     /* today: 0 10px 32px rgba(29,75,54,0.07) */
--portal-radius-card     /* today: 8px (card) — note --radius-card is 20px, unused by portals */
--portal-radius-button   /* today: 999px */
```

Note the mismatch: `--radius-card` is `20px` but portal cards force
`border-radius:8px !important`. A token layer would resolve that drift.

---

## 7. Shared UI patterns that should be standardized later

> **RESOLVED.** Every row whose "suggested future shared abstraction" names
> a `Portal*` component has shipped: `PortalMobileCard`
> (`components/PortalMobileCard.tsx`, 21 consumers), `FormSection`
> (`components/FormSection.tsx`, 14 consumers), `PortalTabs`
> (`components/PortalTabs.tsx`, 14 consumers), `PortalDialog`
> (`components/PortalDialog.tsx`), `CommandBand` (`atoms.tsx`, dashboard
> hero across all 3 portals), and skeletons were promoted to
> `components/portal-skeletons.tsx` (with a re-export shim at the old
> `admin/_components/skeletons.tsx` path so pre-existing imports still
> resolve). The chat row (`ChatThread`/`ConsultationChat`/
> `InternalMessagesThread`) got its shared bubble/composer core restyled in
> place per DESIGN.md §5.17 rather than merged into one component — 3
> components remain by design (different auth/lock/attachment semantics
> per consumer), but they render from the same tokenized bubble CSS. Rows
> not yet promoted to a shared component (`PortalFilterBar`,
> `PortalSummaryStrip` generalization, unified order/payment card, unified
> document card, unified appointment card) are genuinely still open —
> treat those as real backlog, not resolved.

| Pattern | Current files / components | Portals using it | Current inconsistency | Suggested future shared abstraction |
|---|---|:--:|---|---|
| Page hero / header | `atoms.PageHeader` + `.gh-portal-page-header` | All 3 | Consistent | Keep; already shared. |
| Section header (in-card) | `atoms.SectionHeader` + `.gh-portal-section-*` | All 3 | Consistent | Keep. |
| Summary strip | `atoms.AdminSummaryStrip` + `.gh-admin-summary-*` | All 3 | Hardcoded to 3 columns | `PortalSummaryStrip` with configurable columns + tokenized tones. |
| Stat cards | `atoms.StatCard` + `.gh-stat-card` | All 3 | Decorative gradients duplicated in CSS + inline | Consolidate decor into CSS only. |
| Empty state | `atoms.AdminEmptyState` + `.gh-admin-empty-state` | All 3 | Consistent | Keep; rename off `admin`. |
| Loading skeleton | `admin/_components/skeletons.tsx`; portal `loading.tsx` | Admin (rich); Doctor/Patient (basic) | Admin-only skeleton library | Promote skeletons to `components/portal-skeletons`. |
| Table wrapper | `atoms.AdminTable`/`Thead`/`Th`/`Td`/`Tr` + `.gh-admin-main table` | All 3 | Two mechanisms: atom table **and** global `.gh-admin-main` descendant styling | Pick one; document which wins. |
| Mobile cards | `.gh-admin-mobile-card`, `.gh-admin-appointment-mobile-card` | Admin/Doctor lists | Appointment card is a special-case | Generalize `PortalMobileCard`. |
| Status badges | `atoms.Pill` (hex map) + `.gh-badge-*` (tokens) | All 3 | **Two status palettes** | Single tokenized status system feeding both. |
| Action buttons | `atoms.Btn` + `.gh-btn-*` + `.gh-admin-main button` overrides | All 3 + site | Descendant overrides can fight atom styles | Reduce global button overrides; trust the atom. |
| Filter / search bar | `admin/_components/scope-banner.tsx`; ad hoc per list | Admin (scope); others ad hoc | No shared filter bar | `PortalFilterBar`. |
| Form section card | `AdminCard` + per-portal `*-fields` / `*-tab` | All 3 | Field grouping re-implemented per feature | Shared `FormSection`. |
| Detail side panel | `orders/[id]/_components/update-appointment-panel`, doctor doc panels | Admin/Doctor | Per-feature | Shared side-panel shell. |
| Tabs | `*-translation-tabs`, `appointment-tabs`, profile `*-tab` | All 3 | Multiple independent tab implementations | One `PortalTabs`. |
| Modals / dialogs | `confirm-delete-button`, `consultation-documents-modal`, `delete-account-button`, `EventDetailDialog` | All 3 | Several dialog implementations | Shared `PortalDialog`. |
| Notification list | `NotificationPopover` (shared) + `notification-list` (Doctor) + `patient-notification-list` (Patient) | All 3 | Popover shared, full-page lists duplicated | Unify full-page list. |
| Chat thread | `chat/ChatThread`, `ConsultationChat`, `InternalMessagesThread` | All 3 | 3 chat components | Shared bubble/thread core. |
| Calendar event card | `calendar/*` (`DayAgenda`, `EventDetailDialog`) | All 3 | Consistent | Keep; already shared. |
| Payment / order card | Admin `admin-orders-table`, Patient `orders/*`, `receipt-button` | Admin/Patient | Framed differently | Shared order/payment card. |
| Document card | Doctor `doctor-document-tables`, Patient `medical-files` | Doctor/Patient | Independent | Shared `DocumentTable`. |
| Appointment card | Admin/Doctor appointment lists + mobile cards | Admin/Doctor | Special-cased | Shared `AppointmentCard`. |

---

## 8. What to edit later for a full theme redesign

### Global theme changes (touch all 3 portals)

| To change… | Edit |
|---|---|
| Full color theme | `globals.css` `:root` tokens **first** |
| Typography | `:root` `--font-*`, `--text-*`; `.gh-eyebrow`; atom inline `fontFamily: var(--font-display)` |
| Card styling | `.gh-admin-card` (globals) + `AdminCard`/`StatCard` inline styles (atoms) |
| Button styling | `.gh-btn-*` (globals) + `BTN_VARIANTS`/`BTN_SIZES` (atoms) + `.gh-admin-main button` overrides |
| Border radius | `:root` `--radius-*` + hardcoded `border-radius:8px` in `.gh-admin-card`/summary/header |
| Shadows | `:root` `--shadow-*` + hardcoded card shadows in `.gh-admin-card`/`.gh-portal-*` |
| Backgrounds | `.gh-portal-shell/-topbar/-page-header` + texture PNGs in `/public/images/portal/` |
| Table styling | `atoms` table primitives + `.gh-admin-main table/thead/th/td` |
| Empty states | `AdminEmptyState` + `.gh-admin-empty-state` |
| Loading skeletons | `admin/_components/skeletons.tsx` + portal `loading.tsx` |
| Status badges | `atoms.Pill` `PILL_TONES` + `.gh-badge-*` + `--color-status-*` |
| Sidebar | `.gh-portal-sidebar` (globals) + `admin-shell.tsx` **and** `portal-shell.tsx` inline styles |

### Admin-only visual changes

Edit under `app/(admin)/admin/`: `admin-shell.tsx` (chrome, country picker,
nav split), `_components/country-picker*`, `flag-badge`, `scope-banner`,
`skeletons`, and feature `_components` (CRUD forms, plans, translation tabs,
CMS). **Do not** edit `atoms.tsx` for an admin-only change — it is shared.

### Doctor-only visual changes

Edit under `app/(doctor)/doctor/_components/**` (consultation workflow,
document tables, availability UI, profile, reports, notifications). Avoid
`portal-shell.tsx`, `portal-atoms`, `calendar/*`, `chat/*` unless you
intentionally want Patient affected too.

### Patient-only visual changes

Edit under `app/(auth)/account/**/_components` (SubscriptionDashboard,
ManagePanel, profile tabs, rewards, subscribe/receipt/delete). Avoid
`portal-shell.tsx`, `portal-atoms`, `calendar/*`, `chat/*`,
`payments/SyncOrderPaymentOnReturn`.

### High-risk files (edit carefully — multi-portal blast radius)

1. `frontend/app/globals.css` — all 3 portals + public site.
2. `app/(admin)/admin/_components/atoms.tsx` — all 3 portals.
3. `frontend/components/portal-atoms.ts` — pass-through to atoms (all 3).
4. `frontend/components/portal-shell.tsx` — Doctor + Patient chrome.
5. `app/(admin)/admin/_components/admin-shell.tsx` — Admin chrome (mirror).
6. `frontend/components/NotificationPopover.tsx` — all 3 shells.
7. `frontend/components/calendar/**` — all 3 calendars.
8. `frontend/components/chat/**` — spans all 3.
9. `frontend/components/forms/phone-field.tsx` — all 3 **+ public site**.

---

## 9. Import / dependency evidence

Summarized from `rg` import scans across `frontend/app` and `frontend/components`.

### `app/(admin)/admin/_components/atoms.tsx` (via `components/portal-atoms.ts`)
Used by (sample of many): Admin — `orders/*`, `invoices`, `calendar`,
`appointments/[id]`, most list pages. Doctor — `page.tsx`, `services`,
`calendar`, `availability`, `notifications`, `forms`, `reports`, `invoices`,
`patients`, `profile`, `appointments`. Patient — `page.tsx`, `orders`,
`prescriptions`, `payments`, `bookings`, `notifications`, `security`,
`profile`, `rewards`, `subscribe`, `SubscriptionDashboard`.
**Impact:** restyling any atom (card/button/badge/table/stat/summary/empty)
changes all three portals simultaneously.

### `frontend/components/portal-shell.tsx`
Used by: `app/(doctor)/doctor/layout.tsx`, `app/(auth)/account/layout.tsx`.
**Impact:** Doctor + Patient chrome. Not used by Admin (Admin has `AdminShell`).

### `app/(admin)/admin/_components/admin-shell.tsx`
Used by: `app/(admin)/admin/layout.tsx` only. **Impact:** Admin chrome.

### `frontend/components/NotificationPopover.tsx`
Used by: `admin-shell.tsx`, `portal-shell.tsx`, plus `admin/layout.tsx` &
`account/layout.tsx` (type import). **Impact:** all 3 topbar bells.

### `frontend/components/calendar/**`
Used by: `admin/calendar/{ui,page}.tsx`, `doctor/calendar/{ui,page}.tsx`,
`account/calendar/{ui,page}.tsx`. **Impact:** all 3 calendars.

### `frontend/components/chat/**`
`ChatThread` → `admin/appointments/_components/admin-appointment-chat`,
`account/bookings/ui`. `ConsultationChat` →
`doctor/appointments/[id]/_components/consultation-chat-section`,
`account/bookings/ui`. `InternalMessagesThread` → `admin/appointments/[id]`,
`doctor/appointments/[id]`. **Impact:** each spans ≥2 portals.

### `frontend/components/forms/phone-field.tsx`
Used by: Admin (`doctor-fields`, `footer-editor`, `patient-profile-editor`,
`countries/[id]/legal`), Doctor (`profile/edit-form`), Patient
(`profile/page`), and public `(site)` checkout/consult/brazil-consent.
**Impact:** all 3 portals + public site.

### `frontend/components/payments/SyncOrderPaymentOnReturn.tsx`
Used by: `account/bookings/page`, plus public `(site)` checkout success.
**Impact:** Patient + site.

---

# Future redesign instructions for AI agents

1. **Read this dependency map first**, before touching any portal UI.
2. **Classify the change** as global, portal-specific, or component-specific:
   - Global → a token, an atom, a `.gh-*` rule, a shell, or a shared
     `components/*` file. Assume all 3 portals + possibly the public site.
   - Portal-specific → lives under one route root's `_components`.
   - Component-specific → a single leaf component with one consumer.
3. **Do not edit shared components blindly.** `atoms.tsx`, `portal-atoms.ts`,
   both shells, `globals.css`, `NotificationPopover`, `calendar/*`, `chat/*`,
   and `forms/phone-field` all have multi-portal (or portal + site) reach.
4. **Check the §3 impact matrix and §8 high-risk list before changing any
   color or class.** Remember `.gh-admin-*` is **not** admin-only.
5. **For a global theme change, edit in this order:** (a) `:root` tokens in
   `globals.css`; (b) the `.gh-*` rules and remove/relocate hardcoded hex and
   PNG textures; (c) the shared atoms (`atoms.tsx`) inline styles that still
   carry raw hex (Pill map, StatCard tones, Btn danger); (d) both shells in
   lockstep; (e) role-specific `_components` last. Verify all three portals.
6. **Admin-only change:** stay under `app/(admin)/admin/` and never edit
   `atoms.tsx` (it is shared) for an admin-only visual tweak — fork or add a
   variant instead.
7. **Doctor-only change:** stay under `app/(doctor)/doctor/_components`; do
   not touch `portal-shell`, `portal-atoms`, `calendar/*`, `chat/*` unless a
   shared variant is truly intended (then update this map).
8. **Patient-only change:** stay under `app/(auth)/account/**/_components`;
   same avoidance list as Doctor, plus `payments/SyncOrderPaymentOnReturn`.
9. **If a component needs to differ per role, add a role-specific variant**
   (prop or wrapper) rather than mutating the shared primitive — the shells
   already model this (PortalShell = AdminShell minus country picker).
10. **Preserve behavior and data logic.** These are documentation-mapped UI
    surfaces; server actions, fetchers, auth gating, and i18n wiring must not
    change during a restyle.
11. **After any shared change, run typecheck / build / lint** and manually
    confirm all three portals still render (Admin, Doctor, Patient).
12. **Document any changed shared dependency** — update §3 and §9 of this file
    so the map stays accurate.

---

## Coverage counters

- **Shared components mapped:** 13 in the §3 matrix (globals.css, atoms.tsx,
  portal-atoms, portal-shell, admin-shell, NotificationPopover, calendar,
  chat, phone-field, LanguagePicker, SyncOrderPaymentOnReturn, ContactForm
  [ruled out], booking [confirmed absent]); plus role-owned component groups
  in §4 (Admin 56 files, Doctor 31, Patient 12) and 114 rows in the companion
  `shared-components-audit.md`.
- **CSS selector groups mapped:** ~19 in §5 (`:root`, portal shell/sidebar/
  topbar/main, page-header/section, card, stat-card, summary-strip,
  empty-state, mobile-card, table, button overrides, `.gh-btn-*`, pills/
  badges/kicker, toggle, icon-btn, eyebrow, dark-scroll).
- **High-risk shared files:** 9 (see §8).
