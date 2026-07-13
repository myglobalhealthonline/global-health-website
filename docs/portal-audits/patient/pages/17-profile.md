# Patient Portal Audit — Profile

## 1. Page Identification

- **Name**: Profile
- **Route**: `/account/profile`
- **Entry points**: Sidebar → Account → Profile; also linked from the "Needs verification" / "Incomplete" alerts on the portal Overview page and post-signup nudges.
- **Role**: Patient (authenticated, `(auth)` route group)
- **Related frontend files**:
  - `frontend/app/(auth)/account/profile/page.tsx` (server entry, loads i18n bundle)
  - `frontend/app/(auth)/account/profile/_components/profile-client.tsx` (page shell, tab state, "Personal" contact form)
  - `frontend/app/(auth)/account/profile/_components/patient-profile-section.tsx` ("Medical identity" form — identity numbers, address, pharmacy, health data — rendered inside the Personal tab, below the contact form)
  - `frontend/app/(auth)/account/profile/_components/insurance-tab.tsx`
  - `frontend/app/(auth)/account/profile/_components/verification-tab.tsx`
  - `frontend/app/(auth)/account/profile/_components/nationality-tab.tsx`
  - `frontend/app/(auth)/account/profile/_components/gdpr-tab.tsx`
  - `frontend/app/(auth)/account/profile/loading.tsx`
- **Shared components**: `PageHeader`, `AdminSummaryStrip`, `Btn` (`frontend/components/portal-atoms.ts` → re-exports from `app/(admin)/admin/_components/atoms.tsx`), `PortalTabs`/`PortalTabPanel` (`frontend/components/PortalTabs.tsx`), `FormSection` (`frontend/components/FormSection.tsx`), `PhoneField` (`frontend/components/forms/phone-field.tsx`)
- **APIs observed (code-derived)**: `GET/PATCH /api/account/profile` (contact fields + medical-identity fields — two different logical resources sharing one endpoint), `GET/PATCH /api/account/insurance` (via `lib/api/account-profile-api`), `GET /api/account/verification` + upload endpoints, `GET/POST/DELETE /api/account/nationality` + upload endpoints, `GET/PUT /api/account/consents`
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)

## 2. Page Purpose

Single hub for everything about the patient's own identity and compliance state: contact details, clinical baseline (weight/height/allergies/etc.), insurance, ID/insurance verification status, dual nationality documents, and GDPR consent preferences. It is the record the admin/doctor portals read from and the gate that unblocks booking (GHN, verification, insurance).

## 3. Primary User Tasks (priority order)

1. Verify/complete the identity data required to book (name, phone, DOB) and see why the account is flagged "Incomplete".
2. Update medical baseline (allergies, chronic conditions, medication) doctors rely on.
3. Add/verify insurance so claims/consultations can be billed correctly.
4. Upload a government ID for identity verification.
5. Manage dual-nationality documents (edge case, most patients never touch this).
6. Review/change GDPR consent preferences.

## 4. Current Page Structure (top-to-bottom)

1. `PageHeader` — eyebrow "ACCOUNT", title "Profile", subtitle, GHN badge (top-right, only once GHN exists)
2. Conditional amber "Action needed" banner (only if email unverified or GHN missing)
3. `AdminSummaryStrip` — 4 stat cards: Email / Phone / Patient ID / Profile (all status-only, non-interactive)
4. `PortalTabs` — 5 tabs: Personal · Insurance · Verification · Dual Nationality · Privacy (URL-synced via `?tab=`)
5. **Personal tab** (default, kept mounted):
   a. `FormSection` "Profile" card — Email (disabled) · Full name · Phone · Date of birth · own **"Save changes"** button
   b. A second, visually separate card, `PatientProfileSection` "Medical identity" — Identity numbers (National ID/Tax ID/Passport) · Address (5 fields) · Pharmacy · Health data (weight/height/BMI-auto + 4 comma-separated list fields) · own **"Save medical profile"** button
6. **Insurance tab**: card 1 = provider/policy form + own **"Save insurance details"** button; card 2 = document upload (separate action, no save button)
7. **Verification tab**: single card, a status list (email/phone/insurance/ID) with inline badges + conditional ID upload (2 buttons, auto-submits per file, no save)
8. **Dual Nationality tab**: up to 2 "SlotCard"s, each its own form with country/doc-type/doc-number/expiry + own **"Save"** button + own upload buttons
9. **Privacy tab**: list of consent cards (Accept/Decline per row, no per-row save) + one page-level **"Save preferences"** button at the bottom

## 5. Current Container Hierarchy (indented tree)

```
.gh-patient-page.gh-patient-profile-page
├─ PageHeader (gh-card-like header, unnecessary — could be a plain title row; kept for portal-wide consistency)
├─ [conditional] action-needed banner (bordered box)
├─ AdminSummaryStrip
│  └─ 4× stat card (own radius/shadow/border-left accent) — DECORATIVE: these are read-only status mirrors of fields two inches below; not real "metrics"
├─ PortalTabs (role=tablist, pill-style active tab)
└─ PortalTabPanel(s) — all 5 panels mounted, only 1 visible via [hidden]
   └─ Personal:
      ├─ FormSection ("Profile") → AdminCard(padding:0) → SectionHeader + .gh-form-section__grid → <form> (gh-card nested inside AdminCard — redundant card wrapper: AdminCard already renders the card chrome, FormSection's grid just houses inputs, no additional visual framing needed)
      └─ PatientProfileSection → <section> → <form class="gh-card p-6"> → 4× <fieldset> (Identity numbers / Address / Pharmacy / Health data) — a SECOND top-level card immediately below the first, same tab, same scroll, no divider/label separating "contact info" from "medical baseline" other than the section headers
   └─ Insurance: <section> → 2× <div class="gh-card p-6"> stacked (details card, document card) — two cards for what is one task ("get insurance verified")
   └─ Verification: <section> → 1× gh-card containing a divided list (good pattern, no extra nesting)
   └─ Dual Nationality: <section> → up to 2× <div class="gh-card p-5"> (SlotCard) — acceptable, these are genuinely two independent records
   └─ Privacy: <div> → N× <div class="gh-patient-consent-card gh-card p-4"> (one per consent type, 7 rows in DB) — card-per-row where a divided list (as Verification tab already does) would read better and shorten the page
```

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Full name input | text, required | Cleared, pressed Tab | No inline validation on blur (native `required` only fires on submit attempt) | 17-001 | 17-profile-desktop-validation-fullname-empty-01.png |
| "Save changes" button | submit | Clicked with Full name empty | Browser native validation bubble appears ("Please fill out this field."), form does not submit | — (expected behavior) | 17-profile-desktop-validation-save-attempt-02.png |
| Full name input (dirtied, unsaved) | text | Typed new value, then clicked sidebar "My bookings" link | Navigated away immediately, **no unsaved-changes warning**, edit silently lost | 17-002 | 17-profile-desktop-navaway-after-click-03.png |
| Tab strip | `role=tablist` | Clicked Insurance / Verification / Dual Nationality / Privacy | Each switches instantly, correct `aria-selected`, panel content swaps (kept-mounted pattern confirmed) | — | 17-profile-desktop-tab-insurance-01.png, -nationality-01.png, -privacy-01.png |
| Tab strip keyboard nav | `role=tab`, arrow keys | Focused "Personal" tab, pressed ArrowRight | Focus + active tab moved to "Insurance" (roving tabindex works) | — | 17-profile-desktop-keyboard-tab-focus-01.png |
| Tab strip at 390px | `role=tablist` | Loaded mobile viewport | Only 3 of 5 tab labels ("Personal", "Insurance", "Verification…") fit before the strip is clipped by the viewport edge; no visible scroll affordance in the screenshot | 17-003 | 17-profile-mobile-tabs-default-04.png |
| Insurance document upload | file input (sr-only, label-wrapped) | Not triggered (would require a real file + real upload to live DB) | N/A — code-derived: `accept=".pdf,.jpg,.jpeg,.png,.webp"`, auto-submits on file pick via `uploadInsuranceDocument`, no confirm step | code-derived | — |
| GDPR consent Accept/Decline buttons | button | Not clicked (would dirty consent state visibly but a save is still required — low risk, skipped to conserve scope) | N/A | code-derived | — |

## 7. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| 17-profile-desktop-default-01/02/03.png | desktop | default, scrolled slices | Baseline top-to-bottom capture of Personal tab | 17-004 |
| 17-profile-laptop-default-01..04.png | laptop | default | Density at 1280×720 | 17-005 |
| 17-profile-tabletl-default-01..04.png | tabletl | default | 1024px breakpoint | — |
| 17-profile-tabletp-default-01..03.png | tabletp | default | Portrait tablet | — |
| 17-profile-mobile-default-01..02.png | mobile | default | 390px baseline | 17-003 |
| 17-profile-smobile-default-01..03.png | smobile | default | 375px baseline | 17-003 |
| 17-profile-short-default-01..02.png | short | default (1366×650) | Short-height clipping check | 17-006 |
| 17-profile-desktop-validation-fullname-empty-01.png | desktop | field cleared + blurred | Validation timing evidence | 17-001 |
| 17-profile-desktop-validation-save-attempt-02.png | desktop | submit attempted while invalid | Native validation bubble | — |
| 17-profile-desktop-navaway-after-click-03.png | desktop | after nav-away with dirty field | Unsaved-change loss | 17-002 |
| 17-profile-desktop-tab-insurance-01.png | desktop | Insurance tab active | Two-card save-pattern evidence | 17-007 |
| 17-profile-desktop-tab-verification-01.png | desktop | Verification tab active | Divided-list pattern (good) | — |
| 17-profile-desktop-tab-nationality-01.png | desktop | Dual Nationality tab active | Slot-card pattern | — |
| 17-profile-desktop-tab-privacy-01.png | desktop | Privacy tab active | Card-per-consent pattern | 17-008 |
| 17-profile-desktop-keyboard-tab-focus-01.png | desktop | keyboard focus on Insurance tab | Focus-visible check | — |
| 17-profile-mobile-tabs-default-04.png | mobile | reload at 390px | Tab strip clipping | 17-003 |
| 17-profile-mobile-tab-insurance-05.png | mobile | Insurance tab active on mobile | Mobile tab-switch confirmation | 17-003 |

## 8. UX Problems

**17-001 — No inline/on-blur field validation, only submit-time**
Severity: Low
Category: Forms / Validation
Evidence: 17-profile-desktop-validation-fullname-empty-01.png — clearing "Full name" and tabbing away shows no error state; the field just sits empty with no visual signal until Save is pressed.
User impact: Patient can leave the page thinking the field is fine; only discovers a problem when they hit Save (or not at all if they never save).
Root cause: Relies purely on native HTML5 `required` (no `onBlur` handler in `profile-client.tsx`).
Recommended resolution: Add a lightweight on-blur required-field check (red border + `gh-field-label` error text) consistent with the empty-state styling already used elsewhere on the page, so errors surface the moment the user leaves the field, not only on submit.

**17-002 — No unsaved-changes protection anywhere on the page (Critical)**
Severity: Critical
Category: Forms / Data loss
Evidence: 17-profile-desktop-navaway-after-click-03.png — typed a change into Full name, clicked "My bookings" in the sidebar; the app navigated instantly to `/account/bookings` with zero warning dialog or toast. Confirmed via Playwright: `dialog` event never fired.
User impact: Any of the 6 independent forms on this page (contact, medical identity, insurance, 2× nationality slot, privacy) can lose typed-but-unsaved input the instant the user clicks any sidebar link, browser back, or tab-close — with no signal it happened. For a medical-history form (allergies, chronic conditions) this is a real safety/trust problem, not just annoyance.
Root cause: None of the 6 forms track a `dirty` boolean or register a `beforeunload`/router-transition guard.
Recommended resolution: Add a shared `useUnsavedChanges(dirty)` hook (native `beforeunload` for tab-close/refresh + a lightweight confirm via `PortalDialog` intercepting in-app navigation) and wire it to each form's dirty state. This is the single highest-leverage fix on this page.

**17-003 — Tab strip clips at mobile widths with no visible scroll cue**
Severity: Medium
Category: Responsive / Navigation
Evidence: 17-profile-mobile-tabs-default-04.png — at 390px only "Personal / Insurance / Verification…" are visible; "Dual Nationality" and "Privacy" are off-screen with no arrow, gradient fade, or scrollbar hint.
User impact: Mobile patients may not discover the Privacy or Dual Nationality tabs exist unless they think to swipe.
Root cause: `PortalTabs` (`frontend/components/PortalTabs.tsx`) renders a flex row (`.gh-portal-tabs`) with no explicit mobile affordance; overflow behavior is defined in `portal.css` but there's no edge-fade/scroll-shadow.
Recommended resolution: Either (a) add a horizontal-scroll edge-fade (CSS mask-image, no JS) to `.gh-portal-tabs` in `portal.css`'s mobile block, or (b) convert to icon-only compact tabs below 400px so all 5 fit without scrolling.

**17-004 — Two independently-saved forms stacked in one tab with no visual break (the "multiple save buttons" disease, confirmed)**
Severity: High
Category: Forms / Section ownership
Evidence: 17-profile-desktop-default-02.png (address/pharmacy/health-data fields, part of `PatientProfileSection`) directly below 17-profile-desktop-default-01.png (contact form with its own Save). Both are full-width `gh-card`s in the same "Personal" panel.
User impact: A patient who fills in phone + full name AND allergies + weight and clicks the top "Save changes" button believes everything saved — the medical-identity data (allergies, medication, address) is silently NOT sent, because it's owned by a second, separately-submitted `<form>`. This is a real data-loss trap, not just a cosmetic issue.
Root cause: `profile-client.tsx` renders its own `<form onSubmit={onSubmit}>` for contact fields, then unconditionally renders `<PatientProfileSection>` which owns a second independent `<form>` — both inside the same "Personal" tab panel with no scroll break, wizard step, or "you have 2 sections to save" affordance.
Recommended resolution: See §12 — split into two sub-tabs ("Contact" / "Medical details") or merge into one form with one Save that PATCHes both endpoints, whichever is architecturally cheaper (merging endpoints is out of scope here — sub-tab split is the safe frontend-only fix, see §12/§18).

**17-005 — Six separate Save buttons total across the page (portal-wide known disease, confirmed at page scope)**
Severity: High
Category: Forms
Evidence: Save-button count per tab observed in screenshots/code: Personal = 2 ("Save changes", "Save medical profile"), Insurance = 1 ("Save insurance details"), Verification = 0 (auto-submit uploads), Dual Nationality = up to 2 ("Save" ×2 slot cards), Privacy = 1 ("Save preferences"). Total: up to 6 independent save actions reachable from one page.
User impact: No single "did everything save" moment; a patient editing across tabs before leaving has no way to know if all edits persisted.
Root cause: Each tab component owns independent local state + its own submit handler, with no page-level save orchestration.
Recommended resolution: Not proposing a single mega-save (data genuinely belongs to different backend resources) — instead, standardize on **one visible Save per tab, always** (Verification tab is the exception and should stay auto-upload since there's no text to lose) and add a shared "unsaved changes" indicator per tab in the tab strip itself (small dot on the tab, matching the existing `badgeAlert` prop already supported by `PortalTabs`) so users can see at a glance which tabs have pending edits before navigating away.

**17-006 — Short-height viewport (1366×650): default screenshot captured mid-skeleton**
Severity: Low
Category: Responsive
Evidence: 17-profile-short-default-01.png shows the Personal tab still in its loading-skeleton state (grey bars) rather than hydrated content — likely a timing artifact of the screenshot helper rather than a real bug, but worth a manual re-check since a genuinely slow hydration at 650px height (more layout work above the fold) could reproduce user-visible flicker.
User impact: Unconfirmed — flag only.
Root cause: Unknown — could be screenshot timing, not a UI bug.
Recommended resolution: N/A — Open Question (see §21).

**17-007 — Insurance tab: form + upload split into two cards for one task**
Severity: Medium
Category: Card overuse
Evidence: 17-profile-desktop-tab-insurance-01.png — "Insurance details" card (provider/policy, own Save) sits directly above a second "Insurance document" card (upload only). Both serve the single task "get my insurance verified."
User impact: Visually reads as two unrelated settings blocks; patient has to scan two cards to find out this is one connected task, and it's unclear whether saving the top form is required before uploading (it isn't, per code, but the UI doesn't say so).
Root cause: `InsuranceTab` renders provider form and upload block as two `gh-card p-6` siblings instead of one card with an internal divider.
Recommended resolution: Merge into a single `FormSection`/card with an internal `<hr>`-style divider between "policy details" and "document" — matches the divided-list pattern already used well in the Verification tab.

**17-008 — Privacy tab: 7 near-identical consent cards instead of a divided list**
Severity: Medium
Category: Card overuse / List presentation
Evidence: 17-profile-desktop-tab-privacy-01.png — each of the 7 consent rows (Store medical records, Share with doctor, Marketing, Third-party labs, Notifications, Follow-up, + 3 Phase-2 medical-access scopes) renders as its own bordered/shadowed `gh-patient-consent-card`.
User impact: Page becomes a long vertical stack of visually loud, self-shadowing boxes for what is structurally a settings list (label + status + two buttons per row) — exactly the pattern the Verification tab already solves correctly with a `divide-y` list.
Root cause: `GdprPreferencesTab` (`gdpr-tab.tsx`) wraps each row in its own `gh-card`.
Recommended resolution: Replace the `gh-card`-per-row list with a single `gh-card` containing a `divide-y` row list (same component pattern as `VerificationTab`'s divided rows), keeping Accept/Decline buttons per row.

## 9. Visual Design Problems

- Repeated card/pill/radius treatment: `AdminSummaryStrip` stat cards, `FormSection`/`AdminCard`, `gh-patient-form-card`, `gh-patient-consent-card` all use the same rounded-card-with-border-left-accent look — by the time a user reaches Privacy tab there have been 4+ visually distinct "card" species competing for the same "this is a distinct group" signal, diluting all of them.
- The GHN badge (top-right of `PageHeader`) only appears once GHN is issued — its absence during onboarding (the exact moment the status strip says "Patient ID: Pending") leaves a visible empty gap in the header's action slot on desktop; not a functional bug, but an unpolished first-run state (code-derived, `profile-client.tsx` lines 148–157, ternary renders `undefined` with no placeholder).
- Health-data numeric inputs (Weight/Height/BMI) sit in a 3-column grid with the read-only "BMI (auto)" field styled identically to editable inputs except for a background tint (`bg-[var(--portal-well)]`) — the disabled/derived state is legible but easy to miss at a glance (17-profile-desktop-default-02.png).

## 10. Information Hierarchy Problems

- The 4-stat `AdminSummaryStrip` (Email/Phone/Patient ID/Profile) restates information that's about to be re-shown, field-by-field, one scroll below in the same tab (email again, phone again). It functions as a dashboard summary but sits directly on top of the form that edits the same fields — redundant at this proximity.
- Inside "Personal", the medical-identity form's own header ("Medical identity" + subtitle) is visually similar in weight to the tab's page-level content but is NOT part of what the top status strip describes (the "Profile" stat card literally says "Personal and medical details" — implying they're one thing — while the two are actually two separately-owned forms). The hierarchy signal (one page → one story) doesn't match the actual data ownership (two independent resources).
- On the Insurance tab, "Save insurance details" and "Upload document" are equally weighted buttons with no indication that the document eventually needs the saved provider/policy context — nothing tells the user an order-of-operations exists (there isn't one, per code, but the UI doesn't confirm that either).

## 11. Section Ordering Review

**Current order** (tabs, left to right): Personal → Insurance → Verification → Dual Nationality → Privacy

**Recommended order**: Personal (Contact) → Personal (Medical) [split into own tab] → Verification → Insurance → Dual Nationality → Privacy

Reasoning per position:
1. **Contact** stays first — it's the highest-frequency edit (phone/DOB) and gates booking.
2. **Medical details** promoted to its own tab immediately after Contact (was buried as a second form under Contact) — it's the second-most-referenced data (doctors read it every consult) and currently has no dedicated navigation entry at all, making it effectively hidden from the tab strip.
3. **Verification** moves up (was 3rd, stays conceptually 3rd) — it's the actionable "what do I need to do to get booking-ready" status page; ordering it right after the two data-entry tabs matches the natural task flow (enter data → verify data).
4. **Insurance** moves down one slot — lower frequency than verification once verification is understood as "the status dashboard."
5. **Dual Nationality** stays 5th — genuinely a minority-use feature (most patients have zero dual-nationality documents); no reason to promote it.
6. **Privacy** stays last — set-once-and-forget consent management; correct as the final, lowest-frequency tab.

## 12. Tabs, Steps, or Sectioning Recommendation

Keep the tabbed structure (it already fits the "no page reflow, deep-linkable via `?tab=`" requirement) but change from 5 to 6 tabs by splitting "Personal":

- **Tab 1 — Contact** (default): Email (disabled) · Full name · Phone · Date of birth. One form, one "Save changes" button, sticky at the bottom of the tab panel on scroll (`position: sticky; bottom: 0` inside the panel) so the save action is always reachable without scrolling back up — this doubles as a lightweight "you have work to do" cue if paired with a dirty-state highlight.
- **Tab 2 — Medical details**: Identity numbers · Address · Pharmacy · Health data (current `PatientProfileSection` content, unchanged internals). Own "Save medical profile" button, same sticky pattern.
- **Tab 3 — Verification** (unchanged internals, divided-list pattern is already correct)
- **Tab 4 — Insurance** (merge the two cards per §8/17-007 into one, divider-separated)
- **Tab 5 — Dual Nationality** (unchanged)
- **Tab 6 — Privacy** (convert card-stack to divided list per §8/17-008)

Default tab: **Contact** (current "Personal" default is correct to keep).
Save pattern: **one Save button per tab, always visible** (sticky within the panel on tabs with a single form; Dual Nationality keeps its 2 independent slot-saves since those are genuinely 2 records). Add a small unsaved-edit dot on the tab button itself (`PortalTabItem.badge`/`badgeAlert`, already supported by `PortalTabs` — no new component needed) whenever that tab's form is dirty.

## 13. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (unchanged)
2. Action-needed banner (unchanged, conditional)
3. `AdminSummaryStrip` (unchanged — 4 stat cards; consider trimming to 3 by folding "Profile: Incomplete" into the Medical-details tab's own header once that tab exists, but not required)
4. `PortalTabs` — 6 tabs: Contact · Medical details · Verification · Insurance · Dual Nationality · Privacy
5. Active tab panel, single form, sticky Save button, unsaved-edit dot on the tab when dirty

## 14. Proposed Container Simplification

| Location | Current | Action |
|---|---|---|
| Personal tab | 2 stacked `gh-card`s (contact form + medical form) | **Split into 2 tabs** (§12) — removes the false "one section" grouping |
| Insurance tab | 2 stacked `gh-card`s (details + upload) | **Flatten into 1 card** with internal `<hr>` divider |
| Privacy tab | 7 stacked `gh-patient-consent-card`s | **Flatten into 1 `divide-y` list** inside 1 `gh-card`, matching Verification tab's existing pattern |
| `AdminSummaryStrip` on this page | 4 stat cards, decorative-only (no click action) | **Keep** — legitimate at-a-glance status, but remove once cross-referenced fields (Email/Phone) are visually adjacent post-split, to avoid literal restating within 1 scroll |
| `PageHeader` wrapper | Full gradient card treatment | **Keep** — portal-wide convention, out of scope to change per-page |

## 15. Responsive Findings

- **Desktop/laptop (1440/1280)**: Full layout works; 4-stat strip and 5-tab (soon 6-tab) strip both fit on one row without wrapping.
- **tabletl (1024×768)**: Stat strip still 4-across, comfortable. Tab strip fits.
- **tabletp (768×1024, portrait)**: Stat strip likely wraps to 2×2 (not directly confirmed in a dedicated screenshot beyond the default capture) — worth a follow-up check once the 6th tab is added, since tab-strip width grows.
- **mobile (390×844) / smobile (375×667)**: Tab strip clips after ~3 labels with no scroll affordance — see 17-003. Stat cards stack correctly to 1-column (17-profile-mobile-default-01.png).
- **short (1366×650)**: Default screenshot captured a loading skeleton rather than hydrated content (17-006) — inconclusive, needs a manual re-check with a longer wait, but no layout clipping observed in the (unhydrated) capture that was taken.

## 16. Accessibility Findings

- `PortalTabs` correctly implements `role=tablist`/`role=tab`/`aria-selected`/`aria-controls` and roving-tabindex arrow-key navigation (confirmed: ArrowRight from "Personal" moved focus+selection to "Insurance") — genuinely good baseline, no fix needed.
- `PortalTabPanel` keeps all 5 panels mounted and toggles `hidden` — correct pattern for not losing off-screen tab state, and avoids the "tab content vanishes" trap common elsewhere in the portal.
- Icon-only buttons observed elsewhere on the page follow the file's convention of `aria-hidden` on the icon + a text label alongside (e.g. "Save changes", "Save insurance details") — no unlabeled icon-only controls found in this page's code.
- **Gap**: the amber "Action needed" banner and the green/red save-result messages (`msg` state, e.g. "Profile updated") are plain `<p>` tags with no `role="status"`/`aria-live` — a screen-reader user who submits the Contact or Medical form gets no announcement that save succeeded or failed (code-derived: `profile-client.tsx` lines 267–278, `patient-profile-section.tsx` lines 389–399 — neither wraps `msg` in a live region, unlike the Family and error paths elsewhere which do use `role="alert"`).
- **Gap**: Native-only required-field validation (§17-001) also means screen-reader users get no proactive error announcement until they attempt submit — consistent with the sighted-user gap already flagged.

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| "Save changes" (Contact form) / "Save medical profile" (Medical form) — both currently in the same tab | Keep both labels once split into separate tabs (§12) — they're already task-specific, the problem was co-location, not wording | Already-good microcopy, structural fix suffices |
| Stat card "Profile: Incomplete / Started" | "Medical details: Not started / In progress / Complete" once split into its own tab | Current label conflates "profile" (the whole page) with the specific medical-identity form it's actually tracking |
| Nationality tab "Save" (bare, no object) | "Save Nationality 1" / "Save Nationality 2" | Brief flags generic "Save"/"Submit" labels — this one has no object noun at all where two near-identical forms are visible on screen simultaneously once both slots are shown |
| GDPR intro: "Control how your medical data is used. Changes are logged for compliance." | Keep verbatim — flagged as legal/compliance wording, not to be rewritten without legal signoff | Per brief: flag, don't rewrite, medical/legal copy |
| Delete/deletion-adjacent copy on Security page cross-links here indirectly via "Your data" | N/A on this page | — |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Unsaved-changes guard | New hook, e.g. `frontend/lib/hooks/use-unsaved-changes.ts` | Add `beforeunload` + in-app nav intercept, wire into all 6 form components on this page (and reusable for Security page's password form, Family's add/edit forms) | Shared (portal-wide) | Medium — touches router navigation; must not break existing links | Medium |
| Split "Personal" tab | `profile-client.tsx`, `patient-profile-section.tsx` | Change `Tab` union to include `"contact" \| "medical"`, add a 6th `PortalTabItem`, move `PatientProfileSection` render out of the "personal" panel into its own panel | Page-specific | Low — purely presentational re-routing, no API change | Low |
| Insurance tab card merge | `insurance-tab.tsx` | Merge two `gh-card` blocks into one with a divider | Page-specific | Low | Low |
| Privacy tab list flatten | `gdpr-tab.tsx` | Replace per-row `gh-card` with `divide-y` rows inside one card | Page-specific | Low | Low |
| Mobile tab-strip overflow fix | `frontend/components/PortalTabs.tsx` + `portal.css` mobile block | Add scroll edge-fade or compact icon-only mode < 400px | Shared (all 3 portals use `PortalTabs`) | Medium — must not regress other pages already using `PortalTabs` with fewer tabs | Low–Medium |
| Live-region save feedback | `profile-client.tsx`, `patient-profile-section.tsx`, `insurance-tab.tsx`, `nationality-tab.tsx`, `gdpr-tab.tsx` | Add `role="status"`/`aria-live="polite"` to the existing `msg` paragraphs | Page-specific (repeated pattern, could be extracted to a shared `<SaveMessage>` atom) | Low | Low |

## 19. Recommended Implementation Order

1. Unsaved-changes guard (17-002) — highest severity, portal-wide reusable, unblocks the biggest trust issue.
2. Live-region save feedback (16, accessibility) — cheap, no layout risk, ships alongside #1 since both touch the same form files.
3. Split Personal → Contact/Medical tabs (17-004, §12) — structural fix for the worst card-stacking issue.
4. Insurance card merge + Privacy list flatten (17-007, 17-008) — cosmetic-only, low risk, can ship independently.
5. Mobile tab-strip overflow fix (17-003) — shared component change, needs a quick regression pass on Family/Security/other `PortalTabs` consumers before shipping.
6. On-blur validation polish (17-001) — lowest severity, nice-to-have.

## 20. Acceptance Criteria (measurable)

- Typing into any of the 6 forms on this page and clicking a sidebar nav link triggers a confirm dialog before navigating away; canceling keeps the user on the page with the typed value intact.
- Tab strip at 375–390px width either scrolls smoothly with a visible edge-fade, or all 6 tabs are reachable via a compact/icon-only layout — verified by reaching the "Privacy" tab via touch/swipe or a visible control, not by chance.
- "Personal" tab is replaced by 2 tabs ("Contact", "Medical details"), each with exactly one Save button; no tab shows 2 stacked cards each with its own Save.
- Insurance tab renders as 1 card; Privacy tab renders as 1 card with a divided row list (row count unchanged, 7 rows visible without card borders between them).
- Screen reader (or `aria-live` inspection) confirms save-success/failure text is announced without requiring focus to move to the message.

## 21. Open Questions

- Whether 17-006 (short-viewport skeleton capture) reflects a genuine slow-hydration issue at 1366×650 or is purely a screenshot-timing artifact — needs a manual re-run with a longer wait before filing as a real bug.
- Whether merging the Contact and Medical-identity forms into a single PATCH call (rather than splitting into 2 tabs with 2 saves) is preferred by backend/product — that would remove the 2-save problem entirely but requires a backend contract change (`/api/account/profile` currently seems to serve both `AuthUser` fields and `PatientProfile` fields already in one PATCH per code review — see `patient-profile-section.tsx`'s payload-trimming comment — so a single merged form may actually be a *smaller* change than a tab split; flagging both options for product/eng decision rather than picking one unilaterally, since the fetch/PATCH wiring differs (`fetchCurrentUser`/`patchCurrentUser` vs. raw `fetch("/api/account/profile")`) and needs an owner's call).
- tabletp (768×1024) tab-strip wrap behavior once a 6th tab is added — not independently screenshotted at that specific state, only inferred from the 5-tab default capture.
