# A3 Findings — Forms & Workflow Inventory (Admin/Doctor/Patient/Corporate)

Investigator: Sonnet agent A3 · 2026-07-12 · static source pass

## Inventory (16 forms/blocks read)

| # | Route | Component | Fields | Layout | Submit | Validation | State | Tabbed? |
|---|---|---|---|---|---|---|---|---|
|1|`/admin/appointments/new`|`manual-booking-form.tsx`|17 in 2 `AdminCard`s|Already grouped (Patient / Appointment)|Native `<form action={serverAction}>` w/ hidden `phone`/`timeSlotId`|Client `validateManualBooking` blocks+scrolls; server re-validates|17 controlled `useState`, one `<form>`|No|
|2|`/doctor/appointments/[id]` Consultation tab|`consultation-form.tsx` (SOAP)|5 textareas|Flat stack|`fetch PATCH` draft, `fetch POST` sign|None client; server locks on SIGNED|1 `useState<SoapState>`|Inside `AppointmentTabs`|
|3|…Forms tab|`form-fill.tsx`|Dynamic (template N)|Flat stack in bordered well|`fetch POST .../form-submissions`|Client required-field check|`Record<string,string>`|Inside `AppointmentTabs`|
|4|…Overview tab|`appointment-actions.tsx`+`finalize-checklist.tsx`+`follow-up-button.tsx`+docs+Brazil consent|~6 across 5 sub-blocks|All under one `FormSection` w/ `border-t` dividers|Independent `fetch` per block|Per-block|Independent `useState` per block|Inside `AppointmentTabs`|
|5|`/doctor/profile`|`edit-form.tsx`|Profile ~9+bio×N locales; Payout 3; Photo separate|2 stacked `<form>`s + `aside` photo card; bio has inner locale `PortalTabs` (mounted, `hidden`)|2 independent `fetch PATCH` (`/api/doctor/profile`, then chained `/markets/:id`)|Client BIC/IBAN regex; JSON-snapshot dirty tracking + `beforeunload` guard|~15 `useState`|Locale sub-tabs only|
|6|`/doctor/availability`|`availability-ui.tsx` add-window form|6|Sidebar `FormSection`, single column|`createAvailabilityWindow()`|Client: end>start, until>from|Controlled|No|
|7-9|`/account/profile`|`profile-client.tsx` + `insurance-tab.tsx` + `verification-tab.tsx`|4 / 2+upload / 1 select+2 uploads|Page is 5-tab `PortalTabs` (personal/insurance/verification/nationality/privacy); each tab card is single-column|`patchCurrentUser()`, `patchInsurance()`, `uploadIdDocument()`|Mostly HTML5-only|Each tab owns independent `useState`, fetches its own data on mount|**Top-level tabs unmount on switch** (`{activeTab==="x" && <Comp/>}`)|
|10|`/account/family`|`FamilyPanel.tsx`|5|Add-form card + inline edit-in-place rows|`addFamilyMember`/`updateFamilyMember`|fullName required only|Controlled|No|
|11|`/account/subscribe`|`SubscribeForm.tsx`|1 checkbox|Summary card + checkbox|`startSubscription()`→Stripe|Consent required|Controlled|No|
|12|`/account/security`|`security-client.tsx`|3 (password) + 4 action buttons|5 stacked `FormSection`s|`changeCurrentPassword()` + independent action calls|Match+length≥8|Controlled|No|
|13|`/doctor/confidentiality`|`confidentiality-form.tsx`|1 checkbox|Single card|`fetch POST`|Checkbox gate|Controlled|No|
|14|`/corporate/employees` bulk|`bulk-upload-form.tsx`|1 textarea+preview|Native `<details>` accordion|Server action w/ parsed rows|Row cap 500, per-row shape/email regex|Controlled|Already accordion|
|15|`/admin/appointments/new` country picker|inline|1 select|`AdminCard`|GET nav|HTML5 required|Uncontrolled|No|
|16|`/admin/appointments/[id]`|schedule/status edit blocks (`schedule-slot-input.tsx`, `schedule-tz-offset.tsx`)|Unknown|`AdminCard`s|3 server actions (`patchAdminAppointmentSchedule/Status/Update`)|Unknown|Unknown|**Not fully inventoried — flag for follow-up**|

## Critical structural finding: two different tab-mount patterns exist

- **Doctor appointment workspace (`appointment-tabs.tsx`)** — correct pattern: renders every panel up front, toggles `hidden`, never unmounts. SOAP draft/form-fill state survives tab switches today.
- **Patient profile (`profile-client.tsx`)** — conditional-render (`{activeTab==="x" && <Comp/>}`), real unmount. Currently *not* a data-loss bug only because each tab self-fetches on mount with no cross-switch draft buffer — but it's the wrong pattern to copy forward, and it causes redundant re-fetches every switch.
- Doctor profile's bio-locale sub-tabs already use the safe mounted/hidden pattern — good reference implementation.

## Regrouping proposals (payload/action/validation confirmed preserved)

1. **Manual booking (#1)** — already well-grouped; no change needed. If split into steps, panels must stay in the same `<form>` (native `FormData` only picks up DOM descendants at submit) — do **not** extract the slot picker into a portal/dialog outside the form tree.
2. **Doctor Overview tab (#4)** — split the single divider-separated block into 5 titled `FormSection`s (Call & status / Finalize / Consultation documents / Brazil consent). Each already posts independently — zero payload risk.
3. **Doctor profile (#5)** — convert 2 stacked forms + aside into `PortalTabs`: "Public profile" | "Payout details" | "Country registration" (split out of the profile form's conditional block). **Must** keep all panels mounted-but-hidden (not conditional-render), because the `beforeunload` dirty guard reads `isProfileDirty || isPayoutDirty` from both simultaneously regardless of active tab.
4. **Patient profile (#7-9)** — top-level tabs already logically correct; recommend switching from unmount-on-switch to the `AppointmentTabs` mounted/hidden pattern for consistency and to stop redundant re-fetches. This is a pure mount-lifecycle change — zero payload/validation impact since each tab is self-contained.
5. **Family panel / security / availability** — already correctly scoped; no regrouping needed.
6. **Admin appointment `[id]` (#16)** — not fully read in this pass; needs a dedicated follow-up read before any regrouping proposal.

## Risk flags

- **Doctor profile chained submit**: Profile PATCH → market PATCH is *sequential in one submit* today (`onSubmitProfile`). If "Country registration" becomes a separately-submitted tab, that's an actual **API contract change** (1 chained call → 2 independent calls), not just a layout change — needs explicit sign-off, not silent regrouping.
- **Manual booking hidden inputs** (`phone`, `timeSlotId`): must remain descendants of the single `<form>` element through any redesign.
- **SOAP form**: no client validation exists; PATCH always sends all 5 fields together regardless of visual grouping, so accordion/section regrouping is safe as long as fields aren't conditionally unmounted in a way that drops them from the lifted `SoapState` object (they're already lifted, so this is low-risk, but flagging since it's the highest-stakes form — a signed medical record).

## Layout hazards spotted (static-only; need runtime confirmation)

- Manual-booking patient-email typeahead (`absolute … max-h-64 overflow-auto`) could clip under a scroll-constrained ancestor at short heights.
- `gh-admin-manual-booking-grid` column count at `sm` breakpoint wasn't verifiable from CSS classnames alone — worth a live check given TASK §5's "one column narrow" rule and this form's 9-field Patient block (national ID/tax ID/passport/address).
- Doctor profile: two independent Save buttons (one per stacked form) with no shared action bar — safe re: no sticky-footer risk, but easy to miss the second button on a long page.
- `bulk-upload-form.tsx` preview table already correctly uses the existing `gh-hscroll-fade` intentional-scroll pattern — no action needed.

## Not inventoried (flag for another pass)

Admin appointment `[id]` schedule/status edit blocks, `admin-appointment-chat.tsx`, `document-upload-form.tsx`, `documents-review-send-panel.tsx` — treat as unknown, not "clean," before any regrouping work touches them.
