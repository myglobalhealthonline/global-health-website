# A2 — Theme & Component Investigation (static source audit)

Date: 2026-07-12 · Branch: Dev-hassaan · Scope: frontend portal component landscape per TASK.md.
All paths relative to `frontend/` unless absolute. Line numbers as of this commit.

---

## 1. Tab implementations

### 1.1 `PortalTabs` — the shared primitive (KEEP)

`components/PortalTabs.tsx` (85 lines)

- API: `items: {value, label, badge?, badgeAlert?}[]`, `value`, `onChange`, `ariaLabel`, `className`. Controlled-only; no URL binding of its own.
- ARIA: correct `role="tablist"` / `role="tab"`, `aria-selected`, `aria-controls="gh-tabpanel-<v>"`, `id="gh-tab-<v>"`, roving tabindex.
- Keyboard: ArrowLeft/Right + Home/End with focus-follow (PortalTabs.tsx:35-49). Correct.
- Skin: `.gh-portal-tabs` / `.gh-portal-tab` in **portal.css:4668-4761** — underline indicator, `overflow-x: auto` + `overflow-y: hidden` (spec-bug guard documented in-file), edge-fade mask for mobile scroll affordance, badge styling, focus ring via `--portal-focus`. No sticky mechanism and no z-index of its own — sticky/offset is (incorrectly) left to each consumer.
- Panels are NOT part of the primitive — every consumer renders its own `role="tabpanel"` (or doesn't).

**Adoption is already near-total.** All of these are PortalTabs consumers (verified by import):
service/doctor/specialty/health-test/plan/disclaimer translation tabs, `country-profile-tabs`, `faq-language-tabs`, `plan-edit-tabs`, service/health-test FAQ panels, `(auth)/account/profile/_components/profile-client.tsx:172`, `(auth)/account/medical-files/MedicalFilesClient.tsx:331`, `(doctor)/doctor/profile/_components/edit-form.tsx:579`, `(doctor)/doctor/services/_components/service-selection-form.tsx:244,264`, `consultation-documents-modal.tsx:479`, and the doctor `AppointmentTabs` wrapper (below).

### 1.2 `AppointmentTabs` — doctor workspace wrapper (the problem child)

`app/(doctor)/doctor/appointments/[id]/_components/appointment-tabs.tsx`

- Wraps PortalTabs; renders ALL panels up-front with `hidden` (state preserved on switch — the good pattern). Reads `?tab=` deep link + hash scroll (`#patient-chat`), plus a custom window event to jump to Documents.
- **Line 76 is the single worst line in the tab landscape:**
  `className="sticky top-[58px] z-10 -mx-4 mb-4 bg-white/80 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6"`
  - Hardcoded sticky offset `58px` — the portal topbar is `h-16` = **64px** (`components/portal-shell.tsx:276`, `admin-shell.tsx:462`), so the strip tucks 6px under the topbar; no shared CSS var exists for the offset.
  - Raw `z-10` (not `--z-sticky`), hardcoded `bg-white/80` (not a lux/portal token; breaks theme fidelity), negative margins `-mx-4/-mx-6` coupled to the page padding, `backdrop-blur-md` not in the pointer:coarse fallback blocks.
  - Never relaxed at short viewport heights (TASK §3).
- The patient-context rail (page.tsx:590 `aside.gh-doctor-context-rail ... lg:sticky lg:top-4`) is a sticky sibling with `top-4` (16px) — a different offset than both the topbar (64px) and the tab strip (58px), and no z-token; this is the mechanical root of "patient info over/above the tabs" at lg widths. Below lg the grid (`lg:grid-cols-[minmax(0,1fr)_320px]`, page.tsx:257) stacks the rail BELOW the tabs (DOM order), so tablet gets a giant scroll instead of a Patient tab/drawer (TASK §1 tablet requirement unmet).

### 1.3 Hand-rolled / divergent tab strips (to migrate or normalise)

| Location | Pattern | Issues |
|---|---|---|
| `app/(admin)/admin/corporate/[id]/page.tsx:280-295` | Server-rendered `<Link href="?tab=...">` pill nav, `aria-current` | Uses **public** `--color-*` tokens not `--portal-*`; pill style diverges from underline PortalTabs; wraps (`flex-wrap`) instead of scroll+fade; only ?tab= driven tab UI in admin, per-tab data fetch on server (state loss acceptable here) |
| `app/(admin)/admin/services/page.tsx:246-262` | `gh-admin-service-kind-tabs` Link pills | Inline `style={{padding:4, background:'var(--color-background-soft)', borderRadius:12}}` + public tokens; CSS skin portal.css:111-130 full of `!important` |
| `app/(admin)/admin/services/_components/service-links-panel.tsx:168-186` | `gh-admin-service-tablist` buttons + `aria-pressed` | Not a tablist role; active style inline `background: var(--color-brand-primary)` hardcoded `#fff` text |
| `app/(doctor)/doctor/appointments/[id]/_components/consultation-documents-modal.tsx:478` | PortalTabs inside `gh-doctor-doc-modal-tabs` wrapper | Wrapper hardcodes `bg-white` |
| `app/(admin)/admin/appointments/[id]/page.tsx` (728 lines) | **No tabs at all** — long single-scroll stack of ~12 AdminCards | Divergent sibling of the doctor workspace; same domain, different IA |

### 1.4 State preservation inconsistency

- AppointmentTabs: renders all panels, `hidden` toggling → state preserved. OK
- `profile-client.tsx` (patient profile): `{activeTab === "personal" && (...)}` conditional render → **panels unmount on switch, form state lost** (violates TASK §4/§5). Same conditional-render pattern in most translation-tab components (acceptable there — they keep state in a parent map — but not audited per-file).

### 1.5 Verdict

`PortalTabs` is the single shared tab system — keep it. What it lacks (build once, in the primitive or a thin wrapper):
1. Optional panels API (render-all + `hidden`) so state preservation is the default, not per-consumer discipline.
2. Optional `?tab=` URL sync (only AppointmentTabs and corporate detail do it today, differently).
3. A sanctioned sticky variant using shared CSS vars (`--portal-topbar-h`, `--z-sticky`) instead of consumer-hardcoded `top-[58px] z-10 bg-white/80`.
4. Short-height relaxation (`@media (max-height: ...)` un-stick).

---

## 2. Drawer / sheet / dialog landscape

| Component | Mount | Focus trap/restore | Scroll lock | Height units | Scroll owner | Footer | z | Theming |
|---|---|---|---|---|---|---|---|---|
| `AppSheet` (components/AppSheet.tsx) | Radix Dialog.Portal → body | Radix (correct) | Radix | `100svh` / `min(88svh,640px)`; mobile full-screen (globals.css:2619-2701) | `__body` flex-1 min-h-0 overflow-y-auto, overscroll-contain | sticky `__footer` + `env(safe-area-inset-bottom)` | `--z-drawer-overlay`/`--z-drawer` | `theme="portal"` (lux skin portal.css:4897-4941) or `"public"` (gh2 glass globals.css:2712+) |
| `RecordDetailsDrawer` (components/RecordDetailsDrawer.tsx) | wraps AppSheet | inherited | inherited | inherited | inherited | prop | inherited | adds record header/sections/fields, loading skeleton, error+retry, dirty-close confirm (`window.confirm`), `?param=` URL close-binding |
| `PortalDialog` (components/PortalDialog.tsx) | manual `createPortal(document.body)` | **hand-rolled**: first-focusable focus, Tab loop over a snapshot NodeList (stale if content changes), Esc, return focus | `body.style.overflow` save/restore | `min(88svh,720px)` (portal.css:4783), mobile bottom-sheet ≤640px | `__body` overflow-y-auto | static `__footer` | `--z-modal-overlay`/`--z-modal` | lux tokens throughout (portal.css:4762-4891) |
| `AppMenu` (components/AppMenu.tsx) | Radix DropdownMenu.Portal | Radix | n/a | collision-handled | n/a | n/a | `z-[var(--z-dropdown)]` | skin via `contentClassName` (needs `gh-portal-menu-content` per Phase-5 memory) |

Hand-rolled overlays that bypass all of the above (absolute-positioned, not portalled — clip inside `overflow:hidden` ancestors, arbitrary z):

- `app/(admin)/admin/countries/_components/country-select.tsx:158` — `absolute z-50 ... bg-white shadow-lg` (hardcoded white).
- `app/(admin)/admin/appointments/_components/manual-booking-form.tsx:391` — patient lookup menu, `absolute ... z-20`.
- `app/(admin)/admin/doctors/[id]/availability/_components/book-slot-dialog.tsx:245` — same pattern, `z-20`.

**Verdict:** `AppSheet` (+`RecordDetailsDrawer` for record views) IS the TASK §7 shared themed drawer. Gaps to close:
1. `PortalDialog`'s hand-rolled trap has real defects (stale focusable snapshot; no `inert`/aria-hidden on background) — either rebase it on Radix Dialog like AppSheet, or accept and document.
2. Dirty-form protection exists only in RecordDetailsDrawer (window.confirm) — not in AppSheet/PortalDialog.
3. Three hand-rolled admin dropdown menus should move to AppMenu (or a combobox variant of it).
4. AppSheet mobile is full-screen `100svh` — TASK asks `100dvh`-behaved near-full sheet; svh is the *smallest* viewport → never clipped, acceptable; no change strictly required.
5. No loading/empty/error states in AppSheet itself (RecordDetailsDrawer has them) — fine, keep them at the RecordDetailsDrawer layer.

---

## 3. Calendars

Already unified — one primitive set in `components/calendar/`:
`MonthCalendar.tsx`, `WeekCalendar.tsx`, `DayAgenda.tsx`, `EventDetailDialog.tsx` (wraps RecordDetailsDrawer), `TimezoneSelect.tsx`, `calendar-utils.ts`.

Consumers (all shared primitives, verified imports):
- Admin `/admin/calendar/ui.tsx` — MonthCalendar + DayAgenda **inside an AppSheet day drawer** + EventDetailDialog with `?event=` URL binding + doctor/type/country filters + TimezoneSelect. **Best current implementation.**
- Doctor `/doctor/calendar/ui.tsx` — MonthCalendar + inline DayAgenda (FormSection card, not a drawer) + EventDetailDialog; adds availability/block forms.
- Patient `/account/calendar/ui.tsx` — MonthCalendar + inline DayAgenda + EventDetailDialog (thinnest).
- Week view: doctor `/doctor/availability/_components/availability-week-view.tsx:130` and admin `/admin/doctors/[id]/availability/_components/availability-week.tsx:76` both use shared `WeekCalendar`.

Consistency notes:
- Header structure (`Today` pill + IconBtn chevrons + label) is IDENTICAL across Month and Week — but copy-pasted markup inside each calendar component with inline `style={{border:'1px solid var(--portal-line-strong)'}}` etc. (MonthCalendar.tsx:54-85, WeekCalendar.tsx:228-259). Extract a `CalendarHeader` if touched, else leave.
- Status colours all from `--portal-success/info/danger/warning` tokens, except **WeekCalendar.tsx:66 `BOOKED_FILL = "#33505b"` hardcoded hex** (deliberate, commented) and `color:"#fff"` in `solidTone()` (WeekCalendar.tsx:53-62) and today-circle `#fff` (WeekCalendar.tsx:290).
- Internal z-indexes 2/3/4 raw (WeekCalendar solidTone zIndex:2; portal.css:5473 `.gh-week-header-row z-index:3`; :5487 now-line z-index:4) — self-contained stacking inside the panel, low risk.
- Mobile: Month cells `min-h-[68px]` + `pointer:coarse` 44px tap floor (portal.css:5461); Week is intentional horizontal scroll `minWidth:720` (documented, allow-listed).
- Empty/loading: DayAgenda has empty label; MonthCalendar has no loading state (server-rendered data, fine).
- Difference that matters for TASK §6: admin opens the day in a **drawer**, doctor/patient render it inline — either is defensible, but per "match Admin", the AppSheet day-drawer pattern is the target on mobile at minimum.

**Verdict:** No new calendar work needed on primitives; convergence work is per-consumer layout only (doctor page's surrounding forms, patient thin view). The "doctor calendar doesn't match admin" complaint is about the page composition (forms + inline agenda + FormSection wrapping), not the calendar widgets.

---

## 4. Theme tokens (portal.css / globals.css)

- **Base portal tokens** — `--portal-*` (text/surface/line/muted/well/hover, success/warning/danger/info + `-soft`/`-text` pairs, accent, signal, mint, primary, radius scale `--portal-radius-sm/-/lg/-xl/-pill`, shadows) defined in **portal.css ~3750-3830**; per-role accent overrides in globals.css:1731-1746 (`data-portal` variants). Layout vars: `--portal-sidebar-w: 272px`, `--portal-main-max`, `--portal-pad-x/y`, `--portal-section-gap` (portal.css:3827-3833).
- **Lux material tokens** — `--lux-*` block **portal.css:3840-3929**: canvas/card/modal/chrome fills+borders, elevations `--lux-elev-1/2/chrome/modal/press`, blurs `--lux-blur-card/chrome/overlay`, asset pack `--lux-asset-*` (webp urls + veils + mask), status edges, scrollbar, selection. (Note: root CLAUDE.md/memory says lux tokens live in globals.css — **they actually live in portal.css now**; globals.css only consumes them, e.g. globals.css:1804-1809, 2059-2064. Public consumers of `--lux-*` in globals.css resolve to nothing on public routes unless a portal shell provides them — worth a follow-up check, out of A2 scope.)
- **Z-scale** — globals.css:180-191: `--z-base 0, --z-raised 10, --z-sticky 100, --z-header 200, --z-fixed-bar 250, --z-dropdown 300, --z-drawer-overlay 400, --z-drawer 410, --z-modal-overlay 500, --z-modal 510, --z-toast 600, --z-skip-link 700`. Well designed, already used by all shared primitives.
- **Sticky offset vars — NONE EXIST.** `--header-height: 88px/72px` (globals.css:176,278) is the PUBLIC header. The portal topbar height (h-16 = 64px in both shells) has **no CSS variable** — this is why `top-[58px]` got hardcoded. Primary token to add: `--portal-topbar-h` (consume in both shells + sticky consumers).
- **Glass fallback blocks** — portal.css has its own `@media (pointer: coarse)` at 5333 and 5461 and `@supports not (backdrop-filter)` sections; new glass classes must join them (CLAUDE.md rule). `AppointmentTabs`' inline `backdrop-blur-md` bypasses this entirely.
- Existing helpers worth reusing: `.gh-portal-sticky-actions` (portal.css:2651-2661 — mobile sticky Save/Cancel bar, ≤640px only), `.gh-hscroll-fade` (portal.css:4663), `.gh-form-section__grid`/`__span-2` (globals.css:2243-2254, 2-col ≥900px).

### Hardcoded-value offenders (portal components)

| File:line | Offence |
|---|---|
| `(doctor)/.../appointment-tabs.tsx:76` | `top-[58px]`, `z-10`, `bg-white/80`, `-mx-4/-mx-6`, un-fallbacked blur |
| `(doctor)/.../[id]/page.tsx:590` | rail `lg:top-4` hardcoded, no z token |
| `(admin)/admin/corporate/[id]/page.tsx:286-290` | public `--color-*` tokens in portal UI |
| `(admin)/admin/services/page.tsx:247-252` | inline style padding/background/borderRadius |
| `(admin)/.../service-links-panel.tsx:176-180` | inline brand bg + `#fff` |
| `(admin)/.../country-select.tsx:158` | `z-50`, `bg-white` |
| `(admin)/.../manual-booking-form.tsx:391`, `book-slot-dialog.tsx:245` | raw `z-20` non-portalled menus |
| `components/calendar/WeekCalendar.tsx:66,58,290` | `#33505b`, `#fff` (commented/intentional) |
| `consultation-documents-modal.tsx:478` | `bg-white` tab wrapper |
| portal.css:84-101 | `rgba(29,75,54,...)`, `rgba(241,245,235,...)`, `rgba(255,255,255,0.9)` literals in admin-service skins (several more of this vintage throughout batch-3 sections) |

---

## 5. Form primitives

- `FormSection` (components/FormSection.tsx) = AdminCard + SectionHeader + `.gh-form-section__grid` (2-col ≥900px, 1-col below); `__span-2` full-width escape. Used heavily in doctor workspace and doctor calendar.
- `portal-atoms.ts` — shim re-exporting the canonical atoms from `app/(admin)/admin/_components/atoms.tsx`: `PageHeader, Eyebrow, SectionHeader, AdminCard, AdminEmptyState, AdminSummaryStrip, StatCard, Pill, AdminTable/Thead/Th/Td/Tr, IconBtn, Toggle, Btn (7 variants x 3 sizes), CommandBand`.
- Inputs: `.gh-input`, `.gh-select`, `.gh-field-label`, `.gh-btn*` classes (globals.css, shared with public).
- Action bars: `.gh-portal-sticky-actions` exists for mobile sticky Save/Cancel (portal.css:2651). No desktop action-bar primitive; no step/accordion primitive exists (TASK §5 will need composition from FormSection + PortalTabs, not new systems).
- List pages: `ColumnPriorityTable` (22 consumer files) + `PortalMobileCard`; `ResponsiveFilterBar` (2 consumers).

---

## 6. Duplicates / divergences

1. **Two portal shells**: `app/(admin)/admin/_components/admin-shell.tsx` vs `components/portal-shell.tsx` (doctor/patient/corporate layouts). Near-identical topbar (both `sticky top-0 z-[var(--z-header)] h-16`), breadcrumb markup literally identical (admin-shell:485 == portal-shell:303). Any topbar-height/sticky-var fix must be applied to BOTH.
2. **Admin vs doctor appointment detail**: admin `admin/appointments/[id]/page.tsx` = 728-line untabbed card stack (own `#patient-chat` + `scroll-mt-24`); doctor = tabbed workspace. Same domain objects, two IAs.
3. **Chat components**: `components/chat/ChatThread.tsx`, `ConsultationChat.tsx`, `InternalMessagesThread.tsx` + `.gh-chat-panel` fixed `height: 60svh; max-height:560px; min-height:320px` (portal.css:2262) — the 320px floor can clip at 500px-tall viewports inside tab panels (TASK §3 matrix).
4. **Availability week wrappers**: `availability-week-view.tsx` (doctor) vs `availability-week.tsx` (admin) — thin parallel wrappers over WeekCalendar; acceptable but candidates for merging props.
5. **Legacy tab skins**: `gh-admin-service-tablist` / `gh-admin-service-kind-tabs` (portal.css:111-160, `!important`-laden) parallel to `.gh-portal-tabs`.
6. **Day-agenda hosting**: admin (AppSheet drawer) vs doctor/patient (inline card) — see §3.

---

## 7. Hazard sweep (file:line)

**Bare `100vh`:** none found in frontend tsx/css. `min-h-screen` (=100vh min-height, benign) at `app/unauthorized/page.tsx:15`, `components/portal-shell.tsx:199,273`, `admin-shell.tsx:341,460`. All drawer/dialog primitives already use svh/dvh (globals.css:2623,2640,2694-2699; portal.css:1828,2262,3137,4783-4805,4868).

**Fixed heights risky at short viewports:** `.gh-chat-panel`/`-embedded` `height:60svh; min-height:320px` portal.css:2262.

**`overflow: hidden` on layout containers (portal.css, non-truncation):** `.gh-portal-sidebar`:3977, `.gh-admin-table-wrap`:3701, `.gh-chat-panel`:2268, `.gh-portal-dialog`:4784 (intentional — body owns scroll), `.gh-admin-country-picker-menu`:805, `.gh-admin-mobile-card`:5288. tsx: `MonthCalendar.tsx:52,104` (panel + grid, intentional clip), `admin-shell.tsx:485`/`portal-shell.tsx:303` (breadcrumb truncate). Nothing page-level hiding defects found statically.

**Arbitrary z-index in portal routes (tsx):** `appointment-tabs.tsx:76` z-10 · `manual-booking-form.tsx:391` z-20 · `book-slot-dialog.tsx:245` z-20 · `country-select.tsx:158` z-50. CSS raw values: portal.css 510 (z:1), 2655 (z:5 sticky actions), 3268 (z:1), 5473 (z:3), 5487 (z:4) — all low, self-contained.

**Negative margins on tab/header structures:** `appointment-tabs.tsx:76` `-mx-4 sm:-mx-6` (the only structural one). Others are cosmetic: `manual-booking-form.tsx:754 -mx-1`, `reschedule-picker.tsx:158 -mx-1`, `specialties` pages `-mt-2`, `appointments/[id]` pages `scroll-mt-24` (fine).

**Hardcoded sticky offsets:** `appointment-tabs.tsx:76 top-[58px]` (only hardcoded px sticky offset in all portal code) · doctor rail `page.tsx:590 lg:top-4` · both shells `sticky top-0 h-16` with no height var · `scroll-mt-24` (96px, not aligned with 64px topbar + 58px tabs) at doctor page.tsx:559 and admin page.tsx:528.

---

## Recommended shared foundations

1. **Tabs → `PortalTabs` (existing), extended.** Add: (a) optional panels slot rendering all panels with `hidden` (state preservation by default); (b) optional `syncParam="tab"` shallow-URL binding (absorb AppointmentTabs' and corporate detail's divergent implementations); (c) a `sticky` variant styled in portal.css using new `--portal-topbar-h` + `--z-sticky`, with a `@media (max-height: 560px)` un-stick, replacing appointment-tabs.tsx:76 wholesale. Migrate: corporate `[id]` pill nav (keep Links, restyle with portal tokens or a `PortalTabs asLinks` mode), services kind-tabs, service-links-panel locale strip. Retire `gh-admin-service-tablist/kind-tabs` skins after migration.
2. **Drawer → `AppSheet` + `RecordDetailsDrawer` (existing).** They already meet TASK §7 (Radix portal/trap, svh, sticky header/footer, safe-area, z tokens, lux skin, dirty-confirm, loading/error). Work: migrate the 3 hand-rolled admin dropdown/lookup menus to AppMenu/portalled comboboxes; optionally rebase `PortalDialog` onto Radix Dialog to kill its stale-NodeList focus trap; keep PortalDialog for centered modals, AppSheet for drawers — do NOT create a third primitive.
3. **Calendar → `components/calendar/*` (existing, already shared).** No new primitive. Convergence = page-composition only: give doctor/patient day-agenda the admin AppSheet-drawer treatment on mobile; optionally extract the copy-pasted `CalendarHeader` (Today+chevrons) if files are touched anyway; tokenise `BOOKED_FILL`.
4. **Forms → `FormSection` + `portal-atoms` + `.gh-portal-sticky-actions` (existing).** Missing piece is only the doctor-workspace/tablet IA (Patient tab or drawer via RecordDetailsDrawer), not a new form system. Fix `profile-client.tsx` conditional-render state loss by moving to the extended PortalTabs panels API.
5. **New tokens (portal.css, single place):** `--portal-topbar-h: 64px` consumed by both shells and every sticky offset; nothing else — z-scale and radius/spacing tokens already exist and suffice.
6. **Consumers that must migrate** (priority order): `appointment-tabs.tsx` sticky strip → tokenised sticky variant; doctor `[id]/page.tsx` rail → Patient tab/drawer at <lg + tokenised sticky offsets at lg; `profile-client.tsx` → panels API; corporate `[id]` + services kind/locale strips → PortalTabs styles; `country-select`/`manual-booking-form`/`book-slot-dialog` menus → AppMenu/portalled; `.gh-chat-panel` height → `min(60svh, ...)` with lower floor or flex-fill inside tab panel.
