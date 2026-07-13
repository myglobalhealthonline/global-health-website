# Patient Portal Audit — Family

## 1. Page Identification

- **Name**: Family members
- **Route**: `/account/family`
- **Entry points**: Sidebar → Account → Profile-adjacent group (no dedicated "Family" nav group observed; sits under Account); referenced from subscription/benefits flows for family-eligible plans.
- **Role**: Patient (authenticated, `(auth)` route group)
- **Related frontend files**:
  - `frontend/app/(auth)/account/family/page.tsx` (server entry — fetches subscription + locale)
  - `frontend/app/(auth)/account/family/_components/FamilyPanel.tsx` (entire page: list, add form, edit form, remove dialog)
  - `frontend/app/(auth)/account/family/loading.tsx`
- **Shared components**: `PageHeader`, `Btn` (`frontend/components/portal-atoms.ts`), `PortalDialog` (`frontend/components/PortalDialog.tsx`)
- **APIs observed (code-derived)**: `GET /api/account/family` (`listFamilyMembers`), `POST /api/account/family` (`addFamilyMember`), `PATCH /api/account/family/:id` (`updateFamilyMember` — used for both full edits and the credits toggle), `DELETE /api/account/family/:id` (`removeFamilyMember`), all via `frontend/lib/api/family-client.ts`; page also reads `getServerSubscription()` server-side for `familyEligible`.
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)

## 2. Page Purpose

Lets a patient register dependents/family members they book consultations for, and control which of them may draw on the patient's plan credits/discounts.

## 3. Primary User Tasks (priority order)

1. See who's already registered and whether they can use plan benefits.
2. Add a new family member (name required; relationship/DOB/email optional).
3. Toggle "can use plan credits" per member.
4. Edit an existing member's details.
5. Remove a member.

## 4. Current Page Structure (top-to-bottom)

1. `PageHeader` — eyebrow "ACCOUNT", title "Family members" (with `Users` icon inline in the title), subtitle
2. Conditional amber tier-ineligibility banner (only if `familyEligible === false`)
3. 3-up metric row: Members / Plan benefits / Profiles (plain read-only stat tiles, not `AdminSummaryStrip` — a bespoke lighter component, `FamilyMetric`)
4. "Add a family member" card — one form, one **"Add member"** button
5. Error banner (conditional, `role=alert`)
6. Member list: loading skeleton → empty state → `<ul>` of `MemberRow`s, one `gh-card` per member, each row internally toggling between display mode and inline edit mode

## 5. Current Container Hierarchy (indented tree)

```
.gh-patient-page.gh-patient-family-page
├─ PageHeader
├─ [conditional] tier-ineligibility banner
├─ 3-up metric grid (sm:grid-cols-3)
│  └─ 3× FamilyMetric — bordered rounded div, NOT the shared AdminCard/StatCard atom (bespoke one-off, inconsistent with Profile page's AdminSummaryStrip for the same "status tiles" job)
├─ AddMemberForm → <form class="gh-patient-form-card gh-card p-6">  — single card, single form, correctly scoped
├─ [conditional] error <p role=alert>
└─ <ul class="gh-patient-family-list"> (only rendered once loaded + non-empty)
   └─ <li> per member
      └─ MemberRow → either:
         ├─ MemberDisplay: <div class="gh-patient-family-card gh-card p-4">
         │  ├─ header row (name/relationship/email + Edit/Remove icon buttons)
         │  ├─ credits-toggle row (border-top divider — good, avoids a 3rd nested card)
         │  ├─ [conditional] error <p role=alert>
         │  └─ PortalDialog (remove confirm) — portal-rendered, not part of layout flow
         └─ EditMemberForm: <form class="gh-patient-form-card gh-card space-y-4 p-4"> — REPLACES the display card in place (same list slot), so no extra nesting introduced, this is a clean pattern
```

Overall hierarchy is comparatively shallow and clean versus other portal pages — no decorative-only wrapper levels found. The one inconsistency is `FamilyMetric` reinventing what `AdminSummaryStrip`/`StatCard` already provide elsewhere in the portal (see §9).

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| "Add member" button | submit, disabled while `fullName` empty | Clicked with Full name empty | Native validation blocks submit ("Please fill out this field.") | 18-001 | 18-family-desktop-add-empty-validation-01.png |
| Add-member form | text/date/email/checkbox | Filled Full name = "Test Dummy Member", Relationship = "Sibling"; **did not submit** | Fields populate correctly, button becomes enabled | — | 18-family-desktop-add-filled-notsubmitted-02.png |
| Add-member form (dirtied, unsaved) | form | Navigated to "Profile" via sidebar with dummy data still in the form, not submitted | Navigated instantly, **no unsaved-changes warning**, dummy data discarded silently | 18-002 | — (dialog-fired check only; no visual artifact to capture beyond nav happening) |
| "Remove" icon button on existing member | button → `PortalDialog` | Clicked | Confirm dialog opens: "Remove Ayesha Hassaan" / body "Remove this family member?" / Cancel + Remove(danger) buttons | — | 18-family-desktop-remove-confirm-dialog-03.png |
| Remove confirm dialog | modal | Pressed Escape (did NOT click Remove) | Dialog closed, no mutation sent | — | 18-family-desktop-remove-dialog-after-escape-04.png |
| "Edit" icon button on existing member | button | Clicked | Row swaps in-place to `EditMemberForm`, pre-filled with the member's current values | — | 18-family-desktop-edit-member-form-05.png |
| Edit form "Cancel" button | button | Clicked (after opening edit, no changes submitted) | Row reverts to display mode, no mutation | — | (implicit in flow, no separate screenshot) |
| Credits toggle checkbox on existing member | checkbox | Not toggled (would fire a real `PATCH` mutating live data — out of scope per brief) | N/A | code-derived | — |

## 7. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| 18-family-desktop-default-01/02.png | desktop | default | Baseline | 18-003 |
| 18-family-laptop-default-01/02.png | laptop | default | Density check | — |
| 18-family-tabletl-default-01/02.png | tabletl | default | 1024px breakpoint | — |
| 18-family-tabletp-default-01.png | tabletp | default | Portrait tablet | — |
| 18-family-mobile-default-01/02.png | mobile | default | 390px baseline | — |
| 18-family-smobile-default-01..03.png | smobile | default | 375px baseline | — |
| 18-family-short-default-01/02.png | short | default (1366×650) | Short-height clipping check | — |
| 18-family-desktop-add-empty-validation-01.png | desktop | submit attempted, Full name empty | Validation timing | 18-001 |
| 18-family-desktop-add-filled-notsubmitted-02.png | desktop | dummy data filled, not submitted | Form-fill evidence, no mutation | — |
| 18-family-desktop-remove-confirm-dialog-03.png | desktop | remove-confirm modal open | Confirm-dialog UX evidence | — |
| 18-family-desktop-remove-dialog-after-escape-04.png | desktop | after Escape closes modal | Escape-to-close confirmed | — |
| 18-family-desktop-edit-member-form-05.png | desktop | inline edit form open | In-place edit pattern evidence | — |
| 18-family-mobile-default-06.png | mobile | reload at 390px | Mobile layout re-check | — |

## 8. UX Problems

**18-001 — No inline/on-blur validation on Add-member form**
Severity: Low
Category: Forms / Validation
Evidence: 18-family-desktop-add-empty-validation-01.png — clicking "Add member" with an empty Full name relies entirely on native browser validation; there's no earlier on-blur signal.
User impact: Same pattern as Profile page — user only learns of the missing required field at submit time.
Root cause: `AddMemberForm`'s `onSubmit` bails silently (`if (form.fullName.trim() === "") return;`) and additionally relies on the native `required` attribute; no on-blur handler.
Recommended resolution: Add on-blur required-field styling consistent with a shared pattern across the portal (see Profile 17-001 — same fix, same shared hook/utility could serve both pages).

**18-002 — No unsaved-changes protection on Add-member or Edit-member forms**
Severity: High
Category: Forms / Data loss
Evidence: Playwright-confirmed — filled "Test Dummy Member" + "Sibling" into the Add form, clicked the "Profile" sidebar link without submitting; navigation happened immediately with `dialog` event never firing (console: `Family add-form nav-away dialog fired: false`).
User impact: Lower stakes than the Profile page (this is typically a short add flow, not a multi-field medical form) but still a real interruption — a patient who gets distracted mid-add (e.g. clicks a notification) loses everything typed.
Root cause: No dirty-state tracking or navigation guard in `AddMemberForm` or `EditMemberForm`.
Recommended resolution: Reuse the same shared unsaved-changes hook recommended for the Profile page (§17-002) — wire it to `AddMemberForm`'s and `EditMemberForm`'s local `form` state.

**18-003 — `FamilyMetric` reinvents the shared stat-tile component instead of reusing `AdminSummaryStrip`/`StatCard`**
Severity: Medium
Category: Code consistency / Card overuse
Evidence: 18-family-desktop-default-01.png shows 3 stat tiles ("Members / Plan benefits / Profiles") styled almost identically to the Profile page's `AdminSummaryStrip` cards but implemented as a bespoke local `FamilyMetric` function (`FamilyPanel.tsx` lines 143–159: `rounded-lg border ... bg-[var(--portal-surface-elevated)]/80`) rather than the shared `AdminSummaryStrip`/`StatCard` atoms used on Profile, Security, and admin pages.
User impact: Subtle visual drift (slightly different border/background token than the "official" stat card) — a user bouncing between Profile and Family tabs sees two near-but-not-quite-identical treatments for the same UI job.
Root cause: One-off component instead of reusing `frontend/components/portal-atoms.ts`'s exported `AdminSummaryStrip`.
Recommended resolution: Replace `FamilyMetric`/the 3-up grid with `<AdminSummaryStrip items={...} />`, matching the Profile and Security pages exactly. Pure refactor, no behavior change (see §18 Component Impact).

**18-004 — "Members" and "Profiles" metrics restate the same underlying count with different framing**
Severity: Low
Category: Information hierarchy
Evidence: 18-family-desktop-default-01.png — "Members: 1 / People you can book for" and "Profiles: Active / Add family before booking" both derive from `items.length` (`items.length > 0 ? t.profilesActive : t.profilesNotStarted`); with exactly 1 member, "Profiles: Active" and "Members: 1" say almost the same thing in two tiles.
User impact: Minor — dilutes the 3-tile row's information density; a user scanning quickly gets 1.5 distinct facts out of 3 tiles.
Root cause: `profilesMetric` was designed as a binary readiness flag ("have you added anyone yet") but visually competes with the literal count tile right next to it.
Recommended resolution: Low priority — could merge into 2 tiles ("Members" count + "Benefits-enabled" count) and drop "Profiles" as a separate tile, or reword "Profiles" to something genuinely distinct (e.g. surface whether any member still needs missing DOB/relationship data, if that's ever tracked). Flagging for product judgment, not prescribing a forced rewrite.

## 9. Visual Design Problems

- `FamilyMetric` tiles use a slightly different background opacity treatment (`bg-[var(--portal-surface-elevated)]/80`) than `AdminSummaryStrip`'s stat cards elsewhere in the portal — see 18-003; this is the only visual-design deviation found on this page, everything else (card radii, button styles, form field styles) matches the shared `gh-card`/`gh-input`/`gh-field-label` system used consistently across Profile and Security.
- The remove-confirmation `PortalDialog` uses a small red dot bullet before the modal title ("• Remove Ayesha Hassaan") — consistent with the delete-account dialog on Security (§19), a good example of a shared "destructive action" visual language already in place.

## 10. Information Hierarchy Problems

- The Add-member form is placed above the existing-members list. For a patient who already has several family members and returns to this page primarily to *check* or *edit* who's registered (the higher-frequency task per most user journeys — see §11), the add-form pushes the list below the fold on smaller viewports. See §11 for the reorder recommendation.
- No count/summary distinguishes "profiles with benefits enabled" visually from the raw member list below — the "Plan benefits: 1" metric tile is the only place that number appears; a user scanning the member list itself has to check each row's toggle individually to reconstruct that same number (minor, low severity, listed here rather than as a separate issue since it doesn't block any task).

## 11. Section Ordering Review

**Current order**: Header → tier banner → 3-metric row → Add-member form → member list

**Recommended order**: Header → tier banner → 3-metric row → member list → Add-member form

Reasoning per change:
1. **Member list before Add-member form**: for any patient who already has 1+ members (the common case once the feature is adopted), checking/editing existing entries is the primary return visit — leading with an empty "Full name" input pushes that below the fold, adding a full form's worth of scroll before reaching the very thing they came back to check. Reordering list-before-form is a standard "existing items visible immediately, creation action secondary" pattern already used correctly on this portal's Verification tab and elsewhere.
2. **Add-member form stays fully present** (not hidden behind a button/drawer) since family lists are typically short (2–5 people) and the form is short (4 fields + 1 checkbox) — collapsing it into a modal/drawer would be over-engineering for this data volume; simple reordering is the lazy-correct fix here, not a bigger restructure.

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — this page's task set (view/add/edit/remove ~1-5 records) does not warrant tabs or steps; a single scrolling list + form is the right shape. No sectioning change beyond the reorder in §11.

## 13. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (unchanged)
2. Tier-ineligibility banner (unchanged, conditional)
3. `AdminSummaryStrip` (replacing bespoke `FamilyMetric` grid — same 3 items, shared component)
4. Member list (loading/empty/populated states unchanged)
5. "Add a family member" form (moved from position 4 to position 5)

## 14. Proposed Container Simplification

| Location | Current | Action |
|---|---|---|
| 3-metric row | Bespoke `FamilyMetric` component | **Replace** with `AdminSummaryStrip` (remove ~18 lines of duplicate styling, gain visual consistency with Profile/Security) |
| Add-member form card | `gh-patient-form-card gh-card p-6` | **Keep** — single card, single form, correctly scoped, no change needed |
| Member row cards | `gh-patient-family-card gh-card p-4` per member | **Keep** — genuinely distinct records, card-per-item is appropriate here (unlike the Privacy tab's consent-per-card antipattern on the Profile page) |
| Credits-toggle row inside member card | `border-top` divider row, no extra card | **Keep** — correct pattern, avoids nested cards |

## 15. Responsive Findings

- **Desktop/laptop/tabletl**: 3-metric row stays 3-across down to 1024px (`sm:grid-cols-3` breakpoint is Tailwind's `sm` ≈640px, so it holds well past tabletl).
- **tabletp (768px, portrait)**: Not independently interaction-tested beyond default capture; layout appears to hold single-column form/list stacking correctly based on the default screenshot.
- **mobile/smobile (390/375px)**: Add-member form fields stack correctly (Relationship/DOB become 1-column per `sm:grid-cols-2` Tailwind breakpoint); no clipping observed in 18-family-mobile-default-01/02.png.
- **short (1366×650)**: Default capture (18-family-short-default-01.png) shows the page rendering normally without clipping — this page has notably less vertical content than Profile/Security, so short-viewport scrolling is not a concern here.

## 16. Accessibility Findings

- Icon-only Edit/Remove buttons have explicit `aria-label` values (`` `${t.edit} ${member.fullName}` ``, `` `${t.remove} ${member.fullName}` ``) — correctly labeled, no fix needed (`FamilyPanel.tsx` lines 386–397).
- `PortalDialog` (remove-confirm) closed cleanly via Escape key during testing — confirms baseline modal keyboard-dismissal works.
- Error messages use `role="alert"` consistently (`FamilyPanel.tsx` lines 105–112, 262–266, 422–426) — better than the Profile page's plain `<p>` save-messages; this page already does the accessible-announcement pattern correctly and should be the reference implementation when fixing Profile's 16-gap.
- **Gap**: the credits-toggle checkbox's accessible name comes from a `<span>` sibling inside the same `<label>` wrapping both — functionally correct (native label association) but the visible label text ("Uses plan credits" / "Doesn't use plan credits", i.e. `t.benefitsOn`/`t.benefitsOff`) changes based on state while the underlying checkbox's role stays "checkbox" — screen readers will announce the current state correctly via the checkbox's own checked/unchecked state, so this is not a functional issue, just noting the pattern for consistency awareness.

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| "Add member" (submit button) | Keep — already task-specific | Not generic, no change needed |
| "Edit" / "Remove" (icon button `aria-label`s, visually icon-only) | Keep — labels are already specific via `aria-label` including the member's name | Good pattern already |
| Confirm-dialog body: "Remove this family member?" | "Remove {name} from your family members? They'll no longer be bookable and will lose access to shared plan credits." | Brief flags vague confirm copy — current text doesn't state the consequence (loses booking access / benefit access); a destructive-action confirm should state what's actually lost. Not medical/legal wording, safe to rewrite. |
| "Profiles: Active / Not started" metric | See §8/18-004 — reword or merge, product call | Ambiguous relative to "Members" count |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Replace `FamilyMetric` with `AdminSummaryStrip` | `FamilyPanel.tsx` | Swap 3-up bespoke grid for `<AdminSummaryStrip items={[...]} />`, delete `FamilyMetric` function | Page-specific (consumes shared component) | Low | Low |
| Reorder list before form | `FamilyPanel.tsx` | Move `<AddMemberForm>` JSX block below the member-list block | Page-specific | Low | Low |
| Unsaved-changes guard | Shared hook (same as Profile §18) | Wire into `AddMemberForm` and `EditMemberForm` local state | Shared | Medium | Medium |
| Confirm-dialog copy | `FamilyPanel.tsx` (`t.confirmRemove`) + i18n bundle | Update copy to state consequence | Page-specific (+ i18n keys, all locales) | Low | Low |

## 19. Recommended Implementation Order

1. Unsaved-changes guard (18-002) — bundle with the Profile page fix since it's the same shared hook.
2. `FamilyMetric` → `AdminSummaryStrip` swap (18-003) — trivial, no behavior change, ship independently anytime.
3. Reorder list-before-form (§11) — low risk, high day-to-day usability payoff for repeat visitors.
4. Confirm-dialog copy update (§17) — requires i18n bundle changes across all locales, coordinate with translation owner.
5. On-blur validation polish (18-001) — lowest priority, bundle with Profile's equivalent fix.

## 20. Acceptance Criteria (measurable)

- Typing into the Add-member form and clicking any sidebar nav link triggers a confirm dialog; canceling preserves the typed values.
- The 3-metric row renders via `AdminSummaryStrip` (verified by matching DOM class names to the Profile page's equivalent strip).
- Existing member list appears above the Add-member form on page load, for both empty and populated states.
- Remove-confirm dialog body text names the specific consequence (booking/benefit access loss), not just "Remove this family member?".

## 21. Open Questions

- Whether "Profiles" as a 3rd metric tile should be removed, reworded, or repurposed (§8/18-004) — needs a product decision, not something browser/code inspection alone can resolve since it depends on what "profile completeness" is meant to signal long-term.
- Whether family-ineligible-tier patients (banner shown) should see the Add-member form at all, or have it disabled/hidden — current behavior (code-derived) is the form stays fully interactive regardless of `familyEligible`; unclear if that's intentional (soft paywall — let them try, block server-side) or an oversight. Not verifiable without a non-eligible test account, which wasn't available in this session.
