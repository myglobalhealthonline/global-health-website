# Consolidated Root-Cause Map (Phase A gate)

Consolidated by Fable from findings-a1-runtime.md, findings-a2-components.md,
findings-a3-forms.md, findings-a4-a11y-overlays.md. 2026-07-12.

⚠️ **Environment caution for all implementation agents:** local backend proxies the
**Railway production DB**. Read-only at runtime — never seed, mutate, or delete data while
verifying. Test credentials in `docs/testing/manual-tests/test-results.md`; test appointment
`9482a98c-1ad7-4c77-9c48-746806e322f4`.

## Root causes (runtime-confirmed)

RC1 **No shared sticky-offset / z contract** — topbar `sticky top-0 h-16` (64px,
`portal-shell.tsx:276`), doctor tab strip `sticky top-[58px] z-10`
(`appointment-tabs.tsx:76` — 6px short, raw z, hardcoded `bg-white/80`, negative margins,
duplicated chrome, no glass fallback), patient rail `lg:sticky lg:top-4` no z
(`doctor/appointments/[id]/page.tsx:590`). Overlap confirmed at 1024×600, 1280×500,
1366×768, 1440×550 (up to 2308px² tab/rail overlap). THE bug #1.
Note: admin-shell.tsx duplicates the topbar and also hardcodes `h-16`.

RC2 **No sub-lg patient-context fallback** — rail stacks under all six tab panels below
1024px; no Patient tab/drawer at any width.

RC3 **PortalTabs feature gaps** — the shared system (`components/PortalTabs.tsx`, 20+
consumers, correct ARIA/roving tabindex) lacks: panels API, `?tab=` URL sync, sticky
variant. That's why appointment-tabs hand-rolled its own sticky wrapper.

RC4 **Two tab-mount patterns** — appointment-tabs keeps panels mounted+hidden (correct);
`account/profile/profile-client.tsx` conditional-renders (unmount on switch → re-fetch
every switch, wrong pattern to propagate).

RC5 **Overlay-guarantee gaps** (A4 matrix): `DeleteAccountModal`
(`account/security/_components/delete-account-button.tsx:99-134`) — not portaled, no focus
trap/restore/Esc/scroll-lock (P0, destructive action); `ConsultationDocumentsModal` — no
focus trap/restore (P1); mobile sidebar nav duplicated in `portal-shell.tsx:198-222` +
`admin-shell.tsx:352-357`, no Esc/trap/scroll-lock (P1); 3 hand-rolled typeahead dropdowns
raw z-20/z-50 no keyboard (`manual-booking-form.tsx:391`,
`book-slot-dialog.tsx:245`, `country-select.tsx:158`) (P2); safe-area insets absent from
portal.css overlays (P2); scroll-lock triplicated (P3).

RC6 **Admin appointment detail has no tabs** — 728-line flat two-card page
(`admin/appointments/[id]`), diverges from doctor IA; forms blocks there NOT yet
inventoried (A3 flag).

RC7 **Doctor calendar day view skips AppSheet** where admin uses it — only real calendar
divergence; primitives already shared (`components/calendar/*`); minor token gap
(`BOOKED_FILL #33505b` hardcoded, copy-pasted page headers).

RC8 **gh-chat-panel fixed `60svh/min 320px`** — main remaining short-height clip risk.

## What is already fine (don't rebuild)

- `PortalDialog` (reference modal, though hand-rolled focus trap uses stale NodeList),
  `AppSheet`/`RecordDetailsDrawer` (Radix; satisfy TASK §7 already), `AppMenu`.
- Calendar primitives unified across portals.
- Z token scale exists: `globals.css:180-191` (`--z-base`…`--z-skip-link`).
- No bare `100vh` anywhere; no page-level horizontal overflow found in 94 runtime samples.
- PortalTabs ARIA/keyboard already correct.

## Form constraints (from A3 — binding on Phases C/D/E)

- Doctor profile: keep panels mounted+hidden if tabbed — `beforeunload` dirty guard reads
  both forms' dirty state. Do NOT split the chained Profile→market PATCH into separate
  submits (API contract change — out of scope).
- Manual booking: hidden inputs `phone`/`timeSlotId` must stay DOM descendants of the one
  `<form>`; typeahead dropdown may clip at short heights.
- SOAP consultation form: highest-stakes (signed medical record); fields lifted to one
  state object — section regrouping safe, never conditionally drop fields.
- Doctor Overview tab: split divider block into titled FormSections — each block already
  posts independently, zero payload risk.

## Phase B work items (final scope)

B1 `--portal-topbar-h` (64px) + derived sticky offsets; both shells consume it; z tokens
   only (kill raw z-10/z-20/z-50 in portal chrome).
B2 PortalTabs: add sticky variant (uses B1 vars + proper themed background + glass
   fallback), `?tab=` URL sync, panels kept-mounted API.
B3 Overlay hardening: DeleteAccountModal → PortalDialog; ConsultationDocumentsModal →
   PortalDialog (or add trap+restore); PortalDialog focus-trap fix (stale NodeList);
   safe-area insets in portal.css overlay primitives; unify/harden mobile sidebar nav
   (Esc + scroll lock + trap) in both shells.
B4 (small) FormSection recipes already exist — only codify action-bar + 1→2 col rules.
B5 (small) Calendar: tokenize BOOKED_FILL, shared page-header, doctor day view → AppSheet
   (defer the AppSheet swap to C5).

## Non-layout flags (report only, don't fix here)

- Login redirect stall after "Logged in… Redirecting…" (`(auth)/(public)/login/ui.tsx`).
- Admin session drops mid-browse (possible JWT/cookie expiry).
