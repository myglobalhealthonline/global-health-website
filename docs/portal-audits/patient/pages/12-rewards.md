# 12 — Rewards (`/account/rewards`)

## 1. Page Identification

- **Name**: Wellness rewards
- **Route**: `/account/rewards`
- **Entry points**: Sidebar "Rewards" nav item (under MEMBERSHIP section); "Redeem" link from the Wellness credits card on `/account/membership` and the overview `SubscriptionDashboard`
- **Role**: Patient (authenticated, active subscriber with at least one wellness kit defined for their plan)
- **Related frontend files**:
  - `frontend/app/(auth)/account/rewards/page.tsx` (server component)
  - `frontend/app/(auth)/account/rewards/_components/RewardsPanel.tsx` (client — kit cards, redeem form)
  - `frontend/app/(auth)/account/rewards/loading.tsx`
- **Shared components**: `PageHeader`, `AdminSummaryStrip`, `AdminEmptyState`, `AdminCard`, `Btn` (`@/components/portal-atoms`)
- **APIs observed** (code): `GET /api/me/subscription`, `GET /api/me/redemptions`, `GET /api/me/credits`, `GET /api/account/profile` (via `getServerAuthUser`), `POST /api/me/redeem` (`redeemKit` in `frontend/lib/api/me-subscription.ts`)
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop, laptop, tabletl, tabletp, mobile, smobile, short (all 7, full-page captures)

## 2. Page Purpose

Show the patient's wellness-credit balance and every reward kit their plan offers, with per-kit progress toward the credit threshold, and let them redeem an eligible kit (ships a home test kit, either free or via a small checkout for shipping).

## 3. Primary User Tasks (priority order)

1. Check wellness credit balance.
2. See which kit(s) are eligible now / how many credits remain to unlock one.
3. Redeem an eligible kit (enter shipping address, submit).
4. Understand why an ineligible kit isn't redeemable yet (insufficient credits / locked by tenure / out of stock).

## 4. Current Page Structure (top-to-bottom)

**Empty state** (no subscription or zero kits defined for the plan):
1. Header
2. Empty-state card: "No rewards available" + CTA back to `/account`

**Populated state** (this account — 1 kit, 0 credits):
1. Header: "Wellness rewards" + subtitle
2. 4-up stat strip: Wellness balance / Reward kits / Eligible now / Membership
3. Return/redemption banner (conditional — `?redemption=ok|cancelled`, not present by default)
4. One `AdminCard` per kit: icon, name, progress label ("0 of 6 wellness credits"), progress bar, eligible badge (if eligible) or lock note (if not) or inline redeem form (if opened and eligible)

## 5. Current Container Hierarchy (indented tree)

```
div.gh-patient-page.gh-patient-rewards-page
├─ header.gh-portal-page-header                       (PageHeader — necessary)
├─ section.gh-admin-summary-strip (grid, 4 cols)       (AdminSummaryStrip — necessary but see UX-002: duplicates data already on Membership page)
│   ├─ div.gh-admin-summary-item × 4
├─ div.gh-patient-rewards-panel (grid gap-5)            ← wrapper, DECORATIVE (pure grid gap holder, no visual identity — same pattern as membership's manage-panel)
│   ├─ [banner div, conditional]
│   └─ div.gh-admin-card.gh-patient-reward-card  (× kits.length — 1 in this account)
│       ├─ header row: icon badge, name, progress label, eligible badge
│       ├─ progress bar
│       └─ conditional: eligible→redeem button/inline form  |  not eligible→lock note
```

**Card count**: 4 stat cards + 1 card per kit (1 in this account, would scale to N in accounts with more kits). Lower card-nesting than Membership — no card-in-card here, and no unnecessary intermediate wrapper beyond the one grid holder shared with the Membership page's pattern.

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Kit card ("Full Blood Count") | card | Read-only (0/6 credits, not eligible) | Shows lock icon + "Collect 6 more wellness credits to redeem this kit." | — | `12-rewards-desktop-default-01.png` |
| "Redeem" button + inline shipping form | button/form | **Not reachable live** — this account has 0 wellness credits and the only kit requires 6, so `kit.eligible` is `false` and the redeem control never renders (`RewardsPanel.tsx` lines 151-188 gate the button entirely behind `kit.eligible`) | Code-derived only | — | N/A — code-derived |
| Headings | a11y probe | `document.querySelectorAll('h1..h6')` | Exactly one `<h1>` ("Wellness rewards"), no other heading levels used on the page (kit name is a styled `<p>`, not a heading) | Kit name not marked up as a heading — see A11Y-001 | — |
| Icon-only buttons | a11y probe | DOM scan for `<button>` with no text and no `aria-label` | None found | — | — |

## 7. Screenshots

| File | Viewport | State | Reason | Related issues |
|---|---|---|---|---|
| `12-rewards-desktop-default-01.png` | 1440×900 | Default | Full page — stat strip + single kit card, large empty space below | UX-001, UX-002 |
| `12-rewards-short-default-01.png` | 1366×650 | Default | Confirms whole page fits without scrolling in this account's data state | — |
| `12-rewards-mobile-default-01.png` / `-02.png` | 390×844 | Default, scrolled | Mobile stacking | — |
| `12-rewards-smobile-default-01.png` / `-02.png` | 375×667 | Default, scrolled | Small-mobile stacking | — |
| `12-rewards-tabletl-default-01.png` / `-02.png` | 1024×768 | Default | Tablet landscape | — |
| `12-rewards-tabletp-default-01.png` | 768×1024 | Default | Tablet portrait | — |
| `12-rewards-laptop-default-01.png` / `-02.png` | 1280×720 | Default | Laptop | — |

## 8. UX Problems

### 12-001 — Large unused whitespace below a single non-eligible kit card
- **Severity**: Low
- **Category**: Space misuse
- **Browser evidence**: `12-rewards-desktop-default-01.png` — roughly 55% of the 1440×900 viewport below the fold is empty background; the page content (header, stats, one card) occupies well under half the visible area, and there is no fallback content (tips, "how wellness credits work" explainer, related kits from other plans) to fill or acknowledge the empty space.
- **User impact**: Reads as an unfinished or broken page on first load for any patient whose plan offers few kits and who hasn't accumulated credits yet — a very common state for new subscribers (this account is 1 paid month in).
- **Root cause**: `RewardsPanel.tsx` renders exactly one `AdminCard` per kit with no minimum-height or explainer content; layout has no "empty capacity" affordance.
- **Recommended resolution**: Add a lightweight explainer block under the kit list (or before it) — "How wellness credits work" — reusing the existing `t` copy bundle if such a string exists, or add one; this both fills the space intentionally and answers task #4 proactively instead of only reactively (via the lock note) per kit.

### 12-002 — "Membership" stat card duplicates data already owned by the Membership page
- **Severity**: Low
- **Category**: Redundancy / information architecture
- **Browser evidence**: `12-rewards-desktop-default-01.png` — 4th stat card shows "active" / "Premium Wellness Care Plan," identical to the top of `/account/membership`'s own stat strip and plan card.
- **User impact**: Minor — the Rewards page's job is wellness credits and kits, not plan status; the "Membership" stat card adds visual weight without adding a task-relevant fact class (a rewards page consumer already knows they're a member — they navigated from the membership area).
- **Root cause**: `page.tsx` lines 67-75, `AdminSummaryStrip` items array includes a `Membership` entry mirroring `sub.status`/`sub.plan.name`, unrelated to the page's own subject (kits/credits).
- **Recommended resolution**: Drop the "Membership" stat card; keep "Wellness balance," "Reward kits," "Eligible now" (all page-relevant). Consider replacing the freed slot with a genuinely new, page-relevant metric (e.g., "Credits to next kit") if a 3-up strip reads awkwardly — or reduce to 3 cards.

### 12-003 — Kit name rendered as styled text, not a heading — no landmark for multiple kits
- **Severity**: Low
- **Category**: Accessibility / semantic structure
- **Browser evidence**: Code-derived — `RewardsPanel.tsx` line 117: `<p className="font-bold …">{kit.name}</p>`; confirmed via `h1..h6` DOM scan returning only the page's single `<h1>`.
- **User impact**: With only 1 kit in this account it's a non-issue today, but with multiple kits (a screen-reader user navigating by heading) there's no way to jump between kit cards by heading — every kit is announced generically as part of the same flat body text flow.
- **Root cause**: Kit title uses `<p>` instead of `<h2>`/`<h3>` inside each `AdminCard`.
- **Recommended resolution**: Change the kit-name element to `<h2>` (or `<h3>` if nested under a page-level `<h2>` "Reward kits" section heading) so a heading-based screen-reader nav can jump kit-to-kit.

## 9. Visual Design Problems

- Same repeated generic bar-chart icon badge across all 4 stat cards as observed on Membership (11-001-adjacent finding, shared component `AdminSummaryStrip`) — not re-filed here as a separate issue since it's the same shared-component root cause documented in `11-membership.md` §9.
- Progress bar at 0% (this account's only kit, 0/6 credits) is visually indistinguishable from "no progress bar rendered at all" against the `--portal-well` track color — confirmed present in DOM (`role="progressbar"` with `aria-valuenow=0`) but not visually perceivable in `12-rewards-desktop-default-01.png`. Not filed as a numbered issue (matches the system's own progress-bar recipe, DESIGN.md §5.21, working as designed at 0%) but worth noting for a 0-state visual affordance (e.g., a faint outline on the track) in a future pass.

## 10. Information Hierarchy Problems

- The "Eligible now" stat (0) and the per-kit "not eligible" lock note both communicate the same fact (nothing redeemable yet) with no differentiation in prominence — the stat card is glanceable but static, the lock note is the only place that explains *why* (credits needed) and *how many more* are needed. A patient scanning only the stat strip gets no actionable next step; they must read into the card body for that. Not a defect per se, but the "why" is buried one level below the "what," reversed from ideal (lead with the actionable "6 more to go," not just "0 eligible").

## 11. Section Ordering Review

**Current order:**
1. Header
2. Stat strip (Balance / Kits / Eligible now / Membership)
3. Kit card(s)

**Recommended order + reasoning:**
1. Header — unchanged.
2. Stat strip, reduced to 3 relevant cards (Balance / Kits / Eligible now) per UX-002 — kept near the top since balance-checking is task #1.
3. Kit card(s) — unchanged position.
4. **New**: lightweight "How wellness credits work" explainer, placed after the kit list, addressing UX-001's whitespace and task #4 proactively.

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — single list of kit cards, no tabs/steps warranted. If a future account has many kits, consider grouping eligible-now kits above not-yet-eligible kits (sort order) rather than tabs, since the list is short and scannable as a flat list.

## 13. Proposed Page Structure (exact top-to-bottom)

1. Header ("Wellness rewards")
2. Stat strip: Wellness balance, Reward kits, Eligible now (3 cards, "Membership" removed)
3. Kit cards, sorted eligible-first
4. "How wellness credits work" explainer block (new)

## 14. Proposed Container Simplification

| Container | Action | Detail |
|---|---|---|
| `AdminSummaryStrip` (4 cards) | **Reduce to 3** | Remove "Membership" card (UX-002). |
| `div.gh-patient-rewards-panel` wrapper | **Keep** | Legitimate grid-gap holder for banner + kit list; no change needed. |
| Kit card (`AdminCard.gh-patient-reward-card`) | **Keep** | Already a single, non-nested card per kit — no simplification needed. |
| Kit name `<p>` | **Change tag** | `<p>` → `<h2>`/`<h3>` per A11Y finding 12-003; no visual change required (style via className, not tag). |

## 15. Responsive Findings

- **All viewports**: With this account's single non-eligible kit, the page is short enough that no viewport shows clipping or overlap — including 1366×650 (`12-rewards-short-default-01.png` shows the entire page without scrolling). This is a data-state artifact (1 kit); a plan with several kits and an open redeem form (address fields) was not reachable to test at short-viewport height — flagged as an **untested state** below.
- **mobile/smobile**: Stat cards stack full-width; kit card stacks below with no overlap or truncation observed.

## 16. Accessibility Findings

- Single `<h1>` present, correctly used for the page title.
- Kit name not marked up as a heading (12-003, above).
- No unlabeled icon-only buttons found in DOM scan.
- Progress bar carries correct `role="progressbar"` + `aria-valuenow/min/max` attributes (matches the pattern verified on Membership).
- Redeem form fields (code-derived, `RewardsPanel.tsx` lines 161-166): all inputs use bare `placeholder` text as the only label (`placeholder="Full name"`, `placeholder="Address line 1"`, etc.) with **no associated `<label>` element and no `aria-label`**. This is a real accessibility gap — placeholder text disappears on input and isn't reliably announced as a label by all screen readers. **Code-derived** (form not reachable live in this account's data state — see §21).
- Cancel button inside the (code-only) redeem form is icon-free "×" text with `aria-label="Cancel redemption"` (`RewardsPanel.tsx` line 176) — correctly labeled, good practice, confirmed via code.

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| "Collect 6 more wellness credits to redeem this kit." | Keep — specific, task-oriented, good example of the microcopy bar this audit asks for elsewhere. | Already good. |
| Stat card "Reward kits — Available to review" | "Available to review" is vague for a count of kit *types offered*, not "in review" (which implies a pending state) | Consider "Kit types offered" or similar to avoid implying a review/approval workflow that doesn't exist here. |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Remove "Membership" stat card | `frontend/app/(auth)/account/rewards/page.tsx` (lines 67-75) | Drop one item from the `AdminSummaryStrip` `items` array | Page-specific | Low | Trivial |
| Kit name heading tag | `frontend/app/(auth)/account/rewards/_components/RewardsPanel.tsx` (line 117) | `<p>` → `<h2>`/`<h3>`, keep existing className | Page-specific | Low | Trivial |
| Redeem form labels | `RewardsPanel.tsx` (lines 161-166) | Add `<label>` (visually-hidden or visible) per input, or `aria-label` at minimum | Page-specific | Low | Small (6 fields) |
| "How wellness credits work" explainer | `RewardsPanel.tsx` or `page.tsx` | New static/i18n content block | Page-specific | Low | Small — needs new i18n copy across locales |

## 19. Recommended Implementation Order

1. A11Y form-label fix (12-003 form fields) — accessibility gap, low risk, ship first.
2. Kit-name heading tag fix — trivial, ship alongside.
3. Remove "Membership" stat card — trivial.
4. Add "How wellness credits work" explainer — needs copy/i18n sign-off, do last.

## 20. Acceptance Criteria (measurable)

- Stat strip shows exactly 3 cards (Balance, Kits, Eligible now); no "Membership" card present.
- Kit name element is an `<h2>` or `<h3>` (screen-reader heading nav can reach each kit by heading).
- All redeem-form inputs have a programmatically associated label (`<label for>` or `aria-label`), verifiable via `accessible name` in devtools/axe.
- Below-the-fold empty space on a 1-kit, 0-credit account is reduced by the explainer block occupying meaningful vertical space rather than blank background.

## 21. Open Questions

- **Redeem flow (address form, submit, checkout redirect) could not be tested live** — this account has 0 wellness credits against a 6-credit kit requirement, and per the audit brief redemption must not be triggered even if it were reachable (it mutates live data / can trigger a real Stripe checkout for shipping). All redeem-form findings in this file are **code-derived** from `RewardsPanel.tsx` lines 151-188, not screenshot-verified. A follow-up pass with a test account carrying ≥6 wellness credits is needed to visually verify the inline form, its validation states, and the "instant confirm" vs. "checkout redirect" branching (lines 65-76).
- Whether kits should sort eligible-first when a plan has multiple kits is a product decision not answerable from this single-kit account's data.
