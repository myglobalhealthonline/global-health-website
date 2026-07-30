# 11 — Membership (`/account/membership`)

## 1. Page Identification

- **Name**: Membership
- **Route**: `/account/membership`
- **Entry points**: Sidebar "Membership" nav item (under MEMBERSHIP section); `SubscriptionDashboard` plan card "Manage" link (from `/account` overview); pricing page "Switch to this plan" link (`?plan=<id>`); post-Stripe-checkout return (`?subscription=ok|cancelled`)
- **Role**: Patient (authenticated, active subscriber)
- **Related frontend files**:
  - `frontend/app/(auth)/account/membership/page.tsx` (server component, data fetch)
  - `frontend/app/(auth)/account/membership/_components/ManagePanel.tsx` (client — plan card, upgrade/downgrade, cancel, billing portal, dialogs)
  - `frontend/app/(auth)/account/membership/loading.tsx`
  - `frontend/app/(auth)/account/_components/SubscriptionDashboard.tsx` (rendered `embedded` — credits/wellness/perks/ledger)
- **Shared components**: `PageHeader`, `AdminSummaryStrip`, `AdminCard`, `Pill`, `Btn`, `AdminEmptyState` (from `@/components/portal-atoms` → `frontend/app/(admin)/admin/_components/atoms.tsx`); `PortalDialog` (`frontend/components/PortalDialog.tsx`)
- **APIs observed** (from code, `frontend/lib/api/me-subscription.ts` / `me-subscription-server.ts`): `GET /api/me/subscription` (server + poll), `POST /api/me/subscription/cancel`, `POST /api/me/subscription/change-plan`, `POST /api/me/subscription/cancel-change`, `POST /api/me/billing-portal`, `GET /api/me/credits`, `GET /api/me/redemptions`
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650) — full-page scroll captures at all 7; interaction states captured at desktop (1440×900) and mobile (390×844)

## 2. Page Purpose

Let an active subscriber see their current plan, billing/renewal status, and the full benefit ledger (consultation credits, wellness credits, perks, credit activity) in one place, and act on the membership: change plan (scheduled, non-charging), cancel (scheduled at period end), or jump to the Stripe billing portal.

## 3. Primary User Tasks (priority order)

1. Confirm membership is active and see the next billing date/amount (reassurance).
2. Check remaining consultation credits before booking.
3. Change plan (upgrade/downgrade).
4. Manage billing / payment method (Stripe portal).
5. Cancel membership.
6. Review perks and understand what's unlocked vs. locked.
7. Review credit activity history (trust/provenance).

## 4. Current Page Structure (top-to-bottom)

1. Page header: "Your membership" + "Manage your plan, billing and benefits."
2. 4-up stat strip: Plan / Status / Next billing / Price
3. Return/status banner (conditional — not present for a stable ACTIVE subscriber with no `?subscription=` param; verified via code, not reproduced live)
4. "Current plan" card: plan name, ACTIVE pill, monthly price, next billing date
5. Notice banner (conditional — post-action only)
6. "Upgrade or downgrade" card: helper copy + plan `<select>` + "Change plan" button
7. Action row: "Manage billing & payment method" (soft button), "Cancel membership" (danger button), "Change plan" (underlined text link — 3rd occurrence of the same action)
8. Consultation credits card (icon, count, used/remaining, progress bar)
9. Wellness credits card (icon, balance, progress copy, "Redeem" link to `/account/rewards`)
10. Member perks card (list of 3 perks, unlocked/locked state)
11. Recent credit activity card (ledger list, up to 8 entries)

## 5. Current Container Hierarchy (indented tree)

```
div.gh-patient-page.gh-patient-membership-page
├─ header.gh-portal-page-header                          (PageHeader — necessary)
├─ section.gh-admin-summary-strip (grid, 4 cols)          (AdminSummaryStrip — necessary, single stat row)
│   ├─ div.gh-admin-summary-item × 4                      (each: label / icon-badge / value / hint)
├─ div.gh-patient-manage-panel (grid gap-5)                ← wrapper, no visual identity, DECORATIVE (pure grid gap holder)
│   ├─ [banner div]                                        (conditional, own surface — OK, semantic)
│   ├─ div.gh-admin-card ("Current plan")                  (AdminCard, radius+shadow+border — necessary)
│   │   ├─ header row (chrome dark bg, p-5)
│   │   ├─ body (p-5): dl grid × 2, conditional cancel/pending-change notices
│   ├─ [notice p, conditional]
│   ├─ div.gh-admin-card ("Upgrade or downgrade")          (necessary — but see §8 nesting concern: select+button inside ANOTHER card, directly below the plan card, both are "plan" containers)
│   ├─ div.gh-patient-form-actions (flex row)               ← wrapper, DECORATIVE (just a flex row, could be a plain <div className="flex gap-3">, doesn't need its own class identity)
│   │   ├─ Btn "Manage billing & payment method"
│   │   ├─ Btn "Cancel membership"
│   │   └─ Link "Change plan"                              ← 3rd instance of the same action (see UX-002)
│   ├─ PortalDialog × 2 (cancel confirm, change confirm)   (necessary, portal-rendered)
├─ section.gh-patient-subscription-dashboard (embedded)     (SubscriptionDashboard — necessary section wrapper)
│   ├─ div.gh-patient-subscription-grid (grid, 2 cols)      ← wrapper, DECORATIVE (only holds 2 AdminCards, could be the direct grid without an extra semantic name)
│   │   ├─ div.gh-admin-card (Consultation credits)
│   │   └─ div.gh-admin-card (Wellness credits)
│   ├─ div.gh-admin-card (Member perks)
│   │   └─ ul → li × 3 (perk rows, plain rows inside a well-tinted div — reasonable, not cards)
│   └─ div.gh-admin-card (Recent credit activity)
│       └─ ul → li × up to 8 (plain bordered rows — reasonable, not cards)
```

**Card count on this page: 8 distinct `AdminCard`/summary surfaces** (4 stat cards + plan card + upgrade card + 2 dashboard benefit cards) **+ 2 more cards below the fold** (perks, activity) **= 10 total bordered/shadowed surfaces** before any list content. Two levels (`gh-patient-manage-panel`, `gh-patient-subscription-grid`) are pure layout wrappers with no visual treatment — not harmful individually, but they signal the page was assembled from independently-styled chunks rather than one coherent surface.

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Plan `<select>` (Upgrade/downgrade) | select | Selected 2nd option (index 1) | Value updates, "Change plan" button enables | — | `11-membership-desktop-plan-selected-01.png` |
| "Change plan" button | button | Click with plan selected | Opens `PortalDialog` "Change plan" confirmation | Dialog styled as **danger** (red confirm button) for a non-destructive, reversible, non-charging action | `11-membership-desktop-change-confirm-dialog-01.png` — see UX-001 |
| Change-plan dialog | dialog | `Escape` key | Closes dialog, returns focus to page | — | `11-membership-desktop-change-dialog-closed-esc-01.png` |
| "Cancel membership" button | button | Click | Opens `PortalDialog` "Cancel membership" confirmation (danger, correctly) | — | `11-membership-desktop-cancel-confirm-dialog-01.png` |
| Cancel dialog | dialog | "Back" click | Closes without action, no side effect | — | `11-membership-desktop-cancel-dialog-dismissed-01.png` |
| Cancel dialog (mobile) | dialog | Open at 390×844 | Renders as bottom sheet, fully visible, "Cancel membership" reachable | — | `11-membership-mobile-cancel-confirm-dialog-01.png` |
| "Manage billing & payment method" | button | Not clicked (calls live `POST /api/me/billing-portal` → `window.location.assign` to a real/dev Stripe portal URL, an outbound navigation) | Code-derived only | — | N/A — code-derived |
| Keyboard Tab order (15 tabs from load) | keyboard | Tab × 15 | Focus walks the left sidebar nav links (Overview → Family members) before reaching main content — page content (stat cards, plan card, action buttons) is **not** the first focusable region on the page load; sidebar nav dominates the tab sequence | Sidebar nav is naturally first in DOM order; not specific to this page — noted, not a page-specific defect | — |
| Credit activity ledger | list | Read-only | "Used for consultation" rows show delta `0`, immediately following a `Reserved −1` row for the same action | Confusing to a patient scanning deltas (see UX-004) | `11-membership-desktop-default-02.png` |

## 7. Screenshots

| File | Viewport | State | Reason | Related issues |
|---|---|---|---|---|
| `11-membership-desktop-default-01.png` | 1440×900 | Default, top | Page header + stat strip + plan card + upgrade card + actions | UX-001, UX-002, UX-003 |
| `11-membership-desktop-default-02.png` | 1440×900 | Default, scrolled | Credits, wellness, perks, activity | UX-004, UX-005 |
| `11-membership-short-default-01.png` | 1366×650 | Default, top | Short-viewport clipping check | UX-006 |
| `11-membership-smobile-default-01.png` / `-02.png` | 375×667 | Default, scrolled | Mobile stacking, duplication | UX-003 |
| `11-membership-desktop-plan-selected-01.png` | 1440×900 | `<select>` value set | Confirms change enabled state | — |
| `11-membership-desktop-change-confirm-dialog-01.png` | 1440×900 | Change-plan dialog open | Danger-styled non-destructive dialog | UX-001 |
| `11-membership-desktop-change-dialog-closed-esc-01.png` | 1440×900 | Post-Escape | Confirms Escape closes dialog | — |
| `11-membership-desktop-cancel-confirm-dialog-01.png` | 1440×900 | Cancel dialog open | Visual identical styling to change dialog | UX-001 |
| `11-membership-desktop-cancel-dialog-dismissed-01.png` | 1440×900 | Post-"Back" | Confirms non-destructive dismissal | — |
| `11-membership-mobile-cancel-confirm-dialog-01.png` | 390×844 | Cancel dialog, mobile | Bottom-sheet layout check | — |

## 8. UX Problems

### 11-001 — "Change plan" confirmation styled as a destructive/danger action
- **Severity**: Medium
- **Category**: Visual hierarchy / interaction design
- **Browser evidence**: `11-membership-desktop-change-confirm-dialog-01.png` vs `11-membership-desktop-cancel-confirm-dialog-01.png` — both dialogs use an identical red-bordered, red-text confirm button ("Change plan" and "Cancel membership" are visually indistinguishable in severity).
- **User impact**: A plan change is reversible, doesn't charge today, and is explicitly explained as low-risk in the dialog's own copy ("You'll stay on your current plan until then and won't be charged today") — yet the button reads as a warning/destructive action, which can make users hesitate on a routine upgrade.
- **Root cause**: `frontend/app/(auth)/account/membership/_components/ManagePanel.tsx` line 409-424 passes `danger` to the `confirmChangeOpen` `PortalDialog` — the same prop used for the actual cancel dialog (line 388-407).
- **Recommended resolution**: Remove `danger` from the change-plan `PortalDialog`; use the default/primary confirm styling. Reserve `danger` exclusively for `confirmCancelOpen`.

### 11-002 — "Change plan" action is offered three times on one screen
- **Severity**: Low
- **Category**: Redundant controls / information architecture
- **Browser evidence**: `11-membership-desktop-default-01.png` — (1) the `<select>` + "Change plan" button pair inside the "Upgrade or downgrade" card, and (2) an underlined "Change plan" text link in the action row directly below it, doing the same job differently (the link routes to the public pricing page via `pricingHref`, the button submits the in-place dropdown selection) — two controls with the same label perform two different actions.
- **User impact**: Ambiguous — a user who already used the dropdown may click the link expecting it to submit, and instead gets routed off-portal to the marketing pricing page.
- **Root cause**: `ManagePanel.tsx` lines 352-359 (dropdown+button) and lines 383-385 (`<Link href={props.pricingHref}>{t.change}</Link>`) share the same copy key `t.change`.
- **Recommended resolution**: Relabel the pricing-page link distinctly, e.g. "Browse all plans" / "Compare plans", and keep "Change plan" exclusively for the in-place dropdown action.

### 11-003 — Plan name and status repeated three times before any new information appears
- **Severity**: Low
- **Category**: Information hierarchy / redundancy
- **Browser evidence**: `11-membership-desktop-default-01.png` — "Premium Wellness Care Plan" appears in the "Plan" stat card, then again as the H2 inside the "Current plan" card immediately below, with "active"/ACTIVE status repeated in both the "Status" stat card and the plan-card pill.
- **User impact**: On mobile especially (`11-membership-smobile-default-01.png`) this pushes the first genuinely new information (billing date, price) below 2+ full screens of repeated plan name/status.
- **Root cause**: `AdminSummaryStrip` (page.tsx lines 74-82) and the "Current plan" `AdminCard` (`ManagePanel.tsx` lines 262-314) are populated from the same `sub.plan.name` / `sub.status` with no de-duplication.
- **Recommended resolution**: Drop the 4-up stat strip on this page (it exists for admin/doctor list-density scanning, not a single-record detail page) and fold "Next billing" + "Price" into the plan card's existing `<dl>` (which already has slots for both). See §14.

### 11-004 — Credit-ledger entries show a `0` delta for "Used for consultation," reading as "nothing happened"
- **Severity**: Low
- **Category**: Microcopy / data clarity
- **Browser evidence**: `11-membership-desktop-default-02.png` — three "Used for consultation … 0" rows sit beside "Reserved … −1" rows for the same underlying credit.
- **User impact**: A patient scanning the ledger for "where did my credit go" sees a `0` next to "Used for consultation," which looks like a no-op or bug, when the actual deduction already happened at the "Reserved" step.
- **Root cause**: Two-step ledger semantics (`RESERVED` deducts, `USED`/consumption confirms with `deltaCredits: 0`) are surfaced with `formatCreditDelta()` (`frontend/lib/subscription/format.ts` line 67-71) verbatim, with no indication that "Used for consultation" is a *confirmation* of an already-applied reservation rather than a new deduction.
- **Recommended resolution**: Either merge `RESERVED`+`USED` into one ledger line when they represent the same consultation, or relabel the `USED` reason copy to something like "Consultation completed" so a `0` delta reads as expected rather than as a null event.

### 11-005 — "Member perks" 3-item list breaks the 2-column grid asymmetrically
- **Severity**: Low
- **Category**: Visual design
- **Browser evidence**: `11-membership-desktop-default-02.png` — "Home test-kit redemption" (3rd perk) sits alone in the left column with a large empty gap to its right, because `perks.map` renders into a plain `sm:grid-cols-2` with no `sm:col-span` handling for odd counts.
- **User impact**: Minor visual imbalance; reads as unfinished layout at desktop widths.
- **Root cause**: `SubscriptionDashboard.tsx` line 278 (`<ul className="mt-4 grid gap-3 sm:grid-cols-2">`) has no odd-item handling.
- **Recommended resolution**: Either switch to a single-column list (perks aren't naturally paired data, a list reads fine at one-per-row) or add `sm:col-span-2` to the last item when `perks.length` is odd.

### 11-006 — Short-viewport (1366×650) pushes all primary actions below the fold
- **Severity**: Medium
- **Category**: Responsive / space misuse
- **Browser evidence**: `11-membership-short-default-01.png` — at 650px height, only the stat strip and the top of the "Current plan" card are visible; "Manage billing," "Cancel membership," and the entire benefits section require scrolling with no sticky affordance.
- **User impact**: On common laptop viewport heights (1366×650 is a real, common Windows laptop resolution), a user has to scroll before reaching any actionable control.
- **Root cause**: Combination of UX-003 (redundant stat strip + plan card both showing plan/status) consuming ~340px of vertical space before the first action button.
- **Recommended resolution**: Collapsing the stat strip (see UX-003 fix) reclaims roughly one stat-card-row's height (~140px including margin) and brings "Manage billing/Cancel" into view without scrolling on most 650px-tall viewports.

## 9. Visual Design Problems

- **Icon badges on stat cards are decorative and identical**: all 4 `AdminSummaryStrip` items render the same generic bar-chart icon (`gh-portal-icon-badge`) regardless of what the stat represents (Plan/Status/Next billing/Price) — see `11-membership-desktop-default-01.png`. A per-metric icon (calendar for billing date, currency symbol for price) would carry actual information; a repeated icon carries none. Code: `frontend/app/(admin)/admin/_components/atoms.tsx` `AdminSummaryStrip` doesn't accept a per-item custom icon from this call site (`page.tsx` lines 76-81 passes no `icon` field).
- **Padding inconsistency across stacked cards**: `AdminCard` defaults to `padding=24` (`atoms.tsx` line 153), the plan-card header/body explicitly use Tailwind `p-5` (20px, `ManagePanel.tsx` lines 121, 135), and `AdminSummaryStrip` items use a separate `gh-admin-summary-item` class (own CSS, `portal.css` line 419+, not the same padding scale). Three different padding values (24px / 20px / CSS-defined) sit in the same visual column with no visible reason for the difference.

## 10. Information Hierarchy Problems

- The page opens with 4 stat cards that restate the same 2 facts (plan name, status) already shown with more detail one card lower ("Current plan"). The genuinely new facts in the stat strip — next billing date and price — are exactly the two fields the "Current plan" card's own `<dl>` already has empty capacity for (see §14). Nothing on this page currently establishes "credits remaining" (the #1 task per §3) as more prominent than "your plan is active" (already known/expected).

## 11. Section Ordering Review

**Current order:**
1. Header
2. Stat strip (Plan/Status/Next billing/Price)
3. Current plan card
4. Upgrade/downgrade card
5. Action row (billing/cancel/change-link)
6. Consultation credits + Wellness credits (2-col)
7. Member perks
8. Recent credit activity

**Recommended order + reasoning:**
1. Header — unchanged.
2. **Current plan card** (merged with stat-strip data — see §14) — the single source of truth for plan/status/price/billing-date, first because it answers "am I still a member and what am I paying" in one glance.
3. **Consultation credits + Wellness credits** — promoted above the management controls because "how many credits do I have" (task #2) is checked far more often than "change my plan" (task #3); today it's buried below two management cards and an action row.
4. **Upgrade/downgrade + action row** (billing/cancel) — management actions grouped together, now third rather than second, since they're used far less frequently than balance-checking.
5. **Member perks** — unchanged position, supporting detail.
6. **Recent credit activity** — unchanged, least time-critical, naturally last as a historical log.

## 12. Tabs, Steps, or Sectioning Recommendation

No tabs/steps needed — this is a single-record detail view with a natural read-then-act flow, not a multi-mode form. Recommend keeping it a single scroll but reordering per §11 and collapsing the stat strip (§14) to shorten the scroll distance to first action.

## 13. Proposed Page Structure (exact top-to-bottom)

1. Header ("Your membership")
2. Plan card (name, ACTIVE pill, price, next billing date, cancel/pending-change notices — unchanged content, now the only plan-identity surface)
3. Benefits row: Consultation credits card, Wellness credits card (unchanged content, moved up)
4. Management row: Upgrade/downgrade control + action buttons (Manage billing, Cancel) — combine into one card instead of two stacked cards
5. Member perks
6. Recent credit activity

## 14. Proposed Container Simplification

| Container | Action | Detail |
|---|---|---|
| `AdminSummaryStrip` (4 stat cards) | **Remove** | Fold "Next billing" and "Price" into the existing empty `<dl>` slots in the plan `AdminCard` (`ManagePanel.tsx` lines 277-288 already has a 2-col `<dl>` with room for more `<div>` entries) — eliminates 4 redundant cards entirely. |
| `div.gh-patient-manage-panel` wrapper | **Keep** | Structural grid gap holder; fine as-is, just reorder children per §11. |
| "Current plan" card + "Upgrade/downgrade" card | **Merge into one card** | Both concern "my plan" — one `AdminCard` with the plan summary at top, a divider (`<hr>`/border-top), then the change-plan control below. Removes one full card-level nesting. |
| Action row (`gh-patient-form-actions`) | **Keep as flex row**, but move inside the merged plan card as its footer rather than a separate sibling block. | Removes one top-level container. |
| `div.gh-patient-subscription-grid` (2-col wrapper for credits) | **Keep** | Legitimate 2-up grid for two genuinely parallel stats; no change. |
| Member perks / Recent credit activity cards | **Keep as-is** | Already list-based inside a single card, not card-in-card. |

Net effect: 10 bordered surfaces → 6 (plan+management merged card, 2 benefit cards, perks card, activity card, no stat strip).

## 15. Responsive Findings

- **Desktop/laptop (1440/1280)**: No clipping. Odd-perk-count grid gap (UX-005) visible.
- **tabletl (1024×768)**: Layout holds; 2-col grids collapse correctly at `sm:` breakpoint boundaries — no overlap observed.
- **tabletp (768×1024)**: Portrait tablet, single column throughout; no defects observed beyond the shared redundancy issues (UX-003).
- **mobile (390×844) / smobile (375×667)**: Full vertical stack of 4 stat cards + plan card + upgrade card before any action is reachable — worst expression of UX-003; ~2 screens of scroll to "Cancel membership" (`11-membership-smobile-default-01.png` → `-02.png`).
- **short (1366×650)**: See UX-006 — primary actions below the fold.

## 16. Accessibility Findings

- **Dialogs**: `PortalDialog` correctly traps and closes on `Escape` (verified: dialog count 1 → 0 after `Escape` press); role="dialog" present (verified via `page.locator('[role="dialog"]')` count).
- **Focus order**: Tab order from page load walks the entire left sidebar (15 links: Overview → Family members) before any main-content control is reachable — this is a shared portal-shell pattern (not page-specific) but worth flagging for a future portal-wide "skip to content" link; none was found in the tab trail on this page.
- **Progress bars**: Consultation-credit and wellness progress bars use `role="progressbar"` with `aria-valuenow/min/max` correctly (`SubscriptionDashboard.tsx` lines 199-203; `ManagePanel.tsx` N/A — dashboard only). Good.
- **Icon-only controls**: No unlabeled icon-only `<button>` elements found on this page via DOM scan (all interactive buttons carry visible text).
- **Color contrast**: Not measured precisely; the muted gray hint text (`var(--portal-muted)`) under stat-card values and perk conditions is visually low-contrast against the off-white card background in screenshots — flagged as a suspected contrast concern, not confirmed via ratio calculation. Code-derived: `--portal-muted` token value not inspected against WCAG AA in this pass.

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| "Change plan" (dropdown button) AND "Change plan" (bottom link, different action) | Keep dropdown button as "Change plan"; relabel bottom link "Browse all plans" | Two controls, one label — see UX-002 |
| "Manage billing & payment method" | Keep — this one is specific and good. | — |
| Ledger reason "Used for consultation" showing `0` | "Consultation completed" or merge with the Reserved line | See UX-004 |
| Confirm-dialog copy for change-plan is already good ("You'll stay on your current plan until then and won't be charged today") | Keep copy, fix only the button *color* (UX-001) | Copy already communicates low risk; the visual styling contradicts it |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Confirm-change dialog styling | `frontend/app/(auth)/account/membership/_components/ManagePanel.tsx` (line ~413) | Remove `danger` prop from the change-plan `PortalDialog` | Page-specific | Low | Trivial (remove one prop) |
| Stat strip removal + plan-card `<dl>` extension | `frontend/app/(auth)/account/membership/page.tsx` + `ManagePanel.tsx` | Delete `AdminSummaryStrip` call; add price/status fields already computed in `page.tsx` into `ManagePanel`'s existing `<dl>` | Page-specific | Low | Small — data already computed server-side, just re-routed |
| Merge "Current plan" + "Upgrade/downgrade" cards | `ManagePanel.tsx` | Combine two `AdminCard` blocks into one with an internal divider | Page-specific | Low | Small |
| Perk grid odd-count fix | `frontend/app/(auth)/account/_components/SubscriptionDashboard.tsx` (line 278) | Add conditional `sm:col-span-2` on last item when odd, or switch to single-column list | **Shared** (also renders on `/account` overview dashboard) | Low | Trivial |
| Ledger reason copy / merge | `SubscriptionDashboard.tsx` + i18n bundle (`subscription.dashboard.reason_*` keys) + backend ledger emission (out of frontend scope) | Relabel or merge RESERVED+USED display rows | **Shared** | Medium (i18n across 6 locales, backend semantics review) | Medium |
| Section reorder | `page.tsx` (JSX order) | Move `SubscriptionDashboard` credits section above `ManagePanel`'s management controls, or reorder within `ManagePanel` | Page-specific | Low | Small |

## 19. Recommended Implementation Order

1. UX-001 (remove `danger` from change dialog) — one-line fix, immediate correctness win.
2. UX-005 (perk grid odd-count) — trivial, shared component, low risk.
3. UX-002 (relabel duplicate "Change plan" link) — copy-only, low risk.
4. UX-003 + UX-006 (stat strip removal, merge plan/upgrade cards, reorder) — larger structural change, do together since they touch the same files.
5. UX-004 (ledger copy/merge) — do last; needs i18n + possible backend semantics confirmation.

## 20. Acceptance Criteria (measurable)

- Change-plan confirmation dialog renders with the default/primary button treatment (not red/danger); cancel dialog remains red/danger. Verified via screenshot diff of both dialogs.
- Exactly one control on the page is labeled "Change plan"; the pricing-page link uses distinct copy.
- Perk list at `sm:grid-cols-2` shows no orphaned single item with an empty cell beside it when perk count is odd.
- Time-to-first-action-button (scroll distance to "Cancel membership"/"Manage billing") on 1366×650 is reduced to ≤1 viewport height (currently >1, per `11-membership-short-default-01.png`).
- Plan name/status string appears at most twice on initial page load (currently 3×: stat strip label + stat strip value repetition + plan card).

## 21. Open Questions

- Whether "Used for consultation" / "Reserved" ledger rows should be merged is a product/backend decision (ledger is emitted by the API in two steps) — flagged as Open Question, not resolvable from frontend code alone.
- Whether the 4-stat-strip pattern is intentionally kept for visual consistency with admin/doctor list pages (shared `AdminSummaryStrip` component) is a design-system tradeoff the team should confirm before removing it here — this audit recommends removal on this specific single-record page only, not the component itself.
