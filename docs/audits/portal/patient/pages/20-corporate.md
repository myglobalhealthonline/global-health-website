# 20 — Corporate Benefits

## 1. Page Identification

- **Name:** Corporate Benefits
- **Route:** `/account/corporate`
- **Entry points:** Sidebar "Membership" group → "Corporate" item, but ONLY rendered when `hasCorporateMembership` is true (`frontend/app/(auth)/account/layout.tsx:105-107`). The route itself has no server-side gate — any authenticated patient can navigate to it directly (confirmed live: test account has no corporate membership, sidebar item absent, but `/account/corporate` still resolved to the page's own empty state, not a 404/redirect).
- **Role:** Patient portal (all authenticated patients; content varies by `EMPLOYEE` vs beneficiary membership type)
- **Related frontend files:**
  - `frontend/app/(auth)/account/corporate/page.tsx` (page + 2 server actions: `addBeneficiaryAction`, `beneficiaryRowAction`)
  - `frontend/lib/corporate/corporate-api.ts` (`fetchMeCorporate`, `postMeCorporateBeneficiary`, `removeMeCorporateBeneficiary`, `resendMeCorporateBeneficiaryInvite`)
  - `frontend/app/(admin)/admin/corporate/_lib.ts` (`memberStatusLabel`, `memberStatusTone` — reused from admin, not portal-owned)
  - `frontend/locales/en/account.json` → `corporate` key (and cs/de/es/pt/ro equivalents)
- **Shared components:** `PageHeader`, `AdminCard`, `AdminEmptyState`, `Pill`, `SectionHeader`, `Btn` — all re-exported via `frontend/components/portal-atoms.ts` from `frontend/app/(admin)/admin/_components/atoms.tsx` (admin-owned primitives, not a portal-specific set; no `AppMenu`/`PortalDialog`/`ColumnPriorityTable` used — page needs none of them, all lists are short and static).
- **APIs observed:** `GET /api/me/corporate` (via `fetchMeCorporate`, `cache: "no-store"`). Populated-view-only, code-derived: `POST` add beneficiary, `POST` resend invite, `DELETE`/`POST` remove beneficiary — all routed through two `"use server"` actions that redirect back to `/account/corporate?success=`/`?error=` (no client-side fetch, no optimistic UI, full page reload per action).
- **Audit date:** 2026-07-12
- **Viewports tested:** desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650) — all captured for the reachable empty state.

## 2. Page Purpose

Show a corporate-linked patient (employee or their registered beneficiary) their employer-sponsored health plan status: onboarding progress, digital benefit card, company-issued consultation requests they need to book, and — for employees only — the family/beneficiary roster they can add to the plan.

## 3. Primary User Tasks (priority order)

1. Confirm membership is active / see what's blocking activation (onboarding checklist)
2. Complete outstanding onboarding steps (complete profile → book pre-assessment)
3. View/present the digital benefit card (verification use case, e.g. at a clinic)
4. Book any outstanding company-initiated consultation requests
5. (Employee only) Add/manage beneficiaries (spouse, children, parents) on the plan
6. (Non-corporate patient, actual state reached in testing) Understand why the page is empty and what to do about it

## 4. Current Page Structure (top-to-bottom)

**Empty state (verified live, test account has no corporate membership):**
1. `PageHeader` — eyebrow "Membership", title "Corporate benefits", no description, no actions
2. `AdminEmptyState` — badge-check icon, "No corporate membership", body copy directing user to ask their company admin

**Populated state (code-derived from `page.tsx:146-416`, not reachable with current test account):**
1. `PageHeader` — eyebrow, title, description = `"{companyName} · {planName}[ · beneficiary]"`, actions = status `Pill`
2. Conditional banners (stacked, all same visual weight): welcome banner → error banner → success banner → inactive-company-plan warning banner
3. `grid gap-4 lg:grid-cols-2` containing, in DOM order:
   a. Onboarding checklist (`AdminCard`, spans both columns) — only if employee AND not yet ACTIVE/SUSPENDED/REMOVED
   b. Digital benefit card (`AdminCard`, half-width) — gradient card visual with card number, validity, status
   c. Open consultation requests (`AdminCard`, half-width) — list or empty copy
   d. Beneficiaries (`AdminCard`, spans both columns, employee only) — list + collapsible `<details>` add-beneficiary form or "max reached" notice
4. Employee-only privacy note (plain text, below the grid)

## 5. Current Container Hierarchy (indented tree; mark unnecessary levels)

```
<> (fragment)
└─ PageHeader (gh-portal-page-header) [necessary — page banner]
   [empty state, verified:]
   └─ AdminEmptyState (gh-admin-empty-state) [necessary — only content on page]
      └─ icon badge
      └─ title
      └─ description

   [populated state, code-derived:]
   └─ banner <p> ×0-4 (welcome/error/success/inactive) [necessary but stack without separation — see §9]
   └─ div.grid.lg:grid-cols-2 [necessary — layout grid]
      ├─ AdminCard (checklist, col-span-2) [KEEP — semantic grouping]
      │  └─ SectionHeader [necessary]
      │  └─ ul.divide-y [necessary — 4 steps]
      │     └─ li × 4 → icon + label + optional Btn
      ├─ AdminCard (digital card) [KEEP]
      │  └─ SectionHeader [necessary]
      │  └─ div.border-t.p-5 [UNNECESSARY nesting level — border-t only re-states the divider SectionHeader already renders; the p-5 wrapper exists solely to pad the inner gradient card, could be a direct child of AdminCard's own padding]
      │     └─ div.rounded-2xl (gradient card visual) [necessary — the actual content]
      │        └─ decorative radial-gradient blob div [necessary, marked aria-hidden]
      ├─ AdminCard (open requests) [KEEP]
      │  └─ SectionHeader [necessary]
      │  └─ ul.divide-y OR empty <p> [necessary]
      └─ AdminCard (beneficiaries, col-span-2) [KEEP]
         └─ SectionHeader [necessary]
         └─ ul.divide-y (existing beneficiaries) [necessary]
         └─ details (add-beneficiary, collapsible) [necessary — progressive disclosure]
            └─ summary [necessary]
            └─ form.grid.sm:grid-cols-3 [necessary]
   └─ p.text-xs (privacy note) [necessary, but visually indistinguishable from a caption — see §9]
```

Verdict: no card-in-card nesting and no decorative-only wrapper except the single `div.border-t.p-5` inside the digital-card panel (code-derived — could not click into a populated card in the browser, but the structure is unambiguous from `page.tsx:213-268`). This page is one of the more restrained portal pages — 4 sibling `AdminCard`s in a 2-column grid is a reasonable, not excessive, card count for 4 genuinely distinct data types (checklist / card / requests / beneficiaries).

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| `/account/corporate` direct nav | Route load | Navigated directly (sidebar link absent for this account) | Renders `AdminEmptyState`, no redirect/404 | None — correct graceful handling of non-member access | `20-corporate-desktop-default-01.png` |
| Sidebar "Corporate" nav item | Link | Inspected via layout code | Not rendered for non-corporate patients (`hasCorporateMembership` gate) | None, working as designed | N/A — code-derived |
| Tab key, 8 presses from page load | Keyboard | Tabbed through skip-link → 7 sidebar nav items | Each link receives a visible `box-shadow: 0 0 0 3px rgba(143,176,33,.65)` focus ring | None — focus visibility is good | N/A (DOM state captured, no visual diff needed) |
| Heading structure | A11y probe | `h1..h6` query | `H1 "Corporate benefits"` → `H3 "No corporate membership"` (empty state) | **Heading level skips H2** | N/A — DOM query |
| "Add beneficiary" `<details>` disclosure | Disclosure widget | Not testable — beneficiaries section requires employee + populated membership | N/A | Code-derived only | N/A |
| Beneficiary "Resend invite" / "Remove" buttons | Form submit (server action) | Not testable — no beneficiary rows on this account; brief also prohibits driving destructive actions to completion | N/A | Code-derived only | N/A |
| "Complete profile" / "Book now" checklist CTAs | Link (`Btn href`) | Not testable — checklist only renders pre-ACTIVE employee state | N/A | Code-derived only | N/A |

## 7. Screenshots

All under `docs/audits/portal/patient/screenshots/20-corporate/`, empty state only (only state reachable with the test account):

| File | Viewport | State | Reason | Related issues |
|---|---|---|---|---|
| `20-corporate-desktop-default-01/02.png` | 1440×900 | Empty | Baseline capture | 20-002 |
| `20-corporate-laptop-default-01/02.png` | 1280×720 | Empty | Baseline capture | — |
| `20-corporate-tabletl-default-01/02.png` | 1024×768 | Empty | Baseline capture | — |
| `20-corporate-tabletp-default-01.png` | 768×1024 | Empty | Baseline capture | — |
| `20-corporate-mobile-default-01/02.png` | 390×844 | Empty | Baseline capture | — |
| `20-corporate-smobile-default-01/02.png` | 375×667 | Empty | Baseline capture | — |
| `20-corporate-short-default-01/02.png` | 1366×650 | Empty | Short-viewport check | — |

## 8. UX Problems

### 20-001 — No server-side gate; route is reachable by every patient regardless of membership
- **Severity:** Low
- **Category:** Information architecture / access consistency
- **Browser evidence:** Direct navigation to `/account/corporate` succeeded and rendered a full empty state despite the sidebar never linking to it for this account.
- **Screenshot:** `20-corporate-desktop-default-01.png`
- **User impact:** Minor — non-corporate patients who guess/bookmark the URL see a page explaining a benefit they don't have, which is informative rather than harmful, but it does mean the page has no "not applicable to you" redirect and instead spends a full page load + empty-state illustration on a dead end.
- **Root cause:** `page.tsx:110-121` intentionally handles `!membership` with its own `AdminEmptyState` rather than redirecting to `/account/membership`.
- **Recommended resolution:** Acceptable as-is; if product wants tighter IA, redirect non-members to `/account/membership` instead of rendering a dedicated empty page. Not a bug — flagging for product judgment only.

### 20-002 — Heading level skipped (H1 → H3), no H2 on the page
- **Severity:** Low
- **Category:** Accessibility
- **Browser evidence:** `document.querySelectorAll('h1,h2,h3,h4,h5,h6')` returned `[H1 "Corporate benefits", H3 "No corporate membership"]`.
- **Screenshot:** `20-corporate-desktop-default-01.png`
- **User impact:** Screen-reader users navigating by heading level get a confusing jump; WCAG 2.1 §1.3.1 best practice is sequential heading levels.
- **Root cause:** `AdminEmptyState` (`frontend/app/(admin)/admin/_components/atoms.tsx:214+`) hardcodes its title as an `h3`; there is no `h2` between the page's `h1` (from `PageHeader`) and it. This is a shared-component issue, not page-specific — it will reproduce on every portal page whose only content is an `AdminEmptyState` directly under `PageHeader`.
- **Recommended resolution:** Either bump `AdminEmptyState`'s title to `h2` (check other pages don't rely on `h3` for a two-level scheme first) or wrap page sections' `SectionHeader`s consistently at `h2` so `AdminEmptyState` at `h3` is contextually correct nested content. Low priority, shared-component fix — do not patch only this page.

### 20-003 (code-derived) — Four stacked status banners have identical visual weight and no dismiss/hierarchy
- **Severity:** Medium
- **Category:** Weak hierarchy
- **Browser evidence:** N/A — code-derived, not reachable (`page.tsx:161-177`); the account used for testing has no membership so `welcome`/`error`/`success`/`inactiveNotice` never render simultaneously in this session.
- **Screenshot:** N/A — code-derived
- **User impact:** In the code path where a user lands with `?welcome=1` right after a `?success=` server-action redirect (e.g., adding a beneficiary immediately after onboarding), up to two banners could stack (welcome + success, or error + inactive-notice) with no visual differentiation beyond color — all four use the same `rounded-md border px-4 py-3 text-sm` shape and only swap `gh-status-success`/`gh-status-warning` tone classes. There's no way to distinguish "your action just succeeded" from "your company's plan has been paused" at a glance beyond reading the text.
- **Root cause:** `page.tsx:161-177` renders 4 independent conditional `<p>` blocks with no icon, no distinct layout, and no priority order — `welcome` is checked first but `inactiveNotice` (arguably higher priority — it explains why nothing else on the page works) renders last.
- **Recommended resolution:** Reorder so `inactiveNotice` (company-wide, most consequential) renders above the transient `success`/`error`/`welcome` messages; add a small leading icon per tone (already have `gh-status-success`/`gh-status-warning` classes — check if they carry icon support elsewhere in the codebase) so the four states are scannable without reading full sentences.

### 20-004 (code-derived) — Digital benefit card has an extra non-semantic wrapper div
- **Severity:** Low
- **Category:** Nesting / space misuse
- **Browser evidence:** N/A — code-derived (`page.tsx:213-268`), card content requires an ACTIVE-or-otherwise membership to render.
- **Screenshot:** N/A — code-derived
- **User impact:** None visible to users — purely a maintenance/consistency note.
- **Root cause:** `<div className="border-t border-[var(--color-border)] p-5">` at `page.tsx:215` wraps the gradient card. The `border-t` duplicates the divider `SectionHeader` already renders via `gh-portal-section-header`'s own bottom treatment (same pattern every other card in this grid uses without a duplicate top border, e.g. `beneficiaries` card's `ul.divide-y.border-t` at line 319 is a list separator, not a repeat of the section divider). The `p-5` exists only to inset the gradient visual — could be a padding prop on `AdminCard` (`padding={20}`) directly around the card content instead of a manually re-declared wrapper.
- **Recommended resolution:** Drop the extra `div.border-t.p-5`; give the gradient-card `div` itself `m-5` or pass `padding={20}` at the `AdminCard` level consistent with how `checklist`/`open requests` cards handle their own internal spacing.

## 9. Visual Design Problems

- **(Code-derived)** The digital benefit card's inline gradient (`page.tsx:222-223`, `linear-gradient(135deg, #101713 0%, #16241c 55%, #0d3a28 100%)`) and radial glow (`#b0f122`) are hardcoded hex values rather than `--lux-*`/`--portal-*` tokens used everywhere else on this page (`var(--color-border)`, `var(--color-text-muted)`, `var(--portal-text)`). This is the one spot on the page that bypasses the token system — flag for design-system consistency, not a bug today, but a drift risk if the palette shifts.
- **(Verified)** Empty state (`20-corporate-desktop-default-01.png`) leaves roughly 700px of unused vertical space below the icon/text block on desktop — expected for a single-message empty state and consistent with other empty states across the portal (not a page-specific defect).

## 10. Information Hierarchy Problems

- **(Code-derived)** In the populated grid, "Digital benefit card" and "Open consultation requests" sit side-by-side with equal visual weight, but per the priority order in §3 the checklist (task 2) and requests (task 4, action-required) are more urgent than the card (task 3, reference/passive). Currently: checklist (if shown) → card → requests → beneficiaries. When the checklist is NOT shown (i.e., membership already active — the common steady state), the very first thing an active member sees is the passive reference card, before the action-required "open requests" list. See §11 for reordering.

## 11. Section Ordering Review

**Current order (code-derived, steady-state/no-checklist case — the common case since checklist only shows during onboarding):**
1. Digital benefit card
2. Open consultation requests
3. Beneficiaries (employee only)

**Recommended order:**
1. Open consultation requests — if non-empty, this is the only item requiring the user to act; should lead. If empty, the section is a single line of "No open requests right now" and costs little to lead with anyway.
2. Digital benefit card — reference material, second.
3. Beneficiaries (employee only) — management task, least frequent.

**Reasoning:** Action-required content should precede reference content per standard task-priority conventions (also consistent with brief §8's "primary task first" rule). This reorder is a one-line JSX swap (`page.tsx`: move the "Open requests" `AdminCard` block before the "Digital benefit card" block) with no data dependency change, low risk.

Onboarding-checklist case is unaffected — it already correctly leads (`lg:col-span-2`, first in DOM) since it's the highest-priority blocking task.

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — page content is short (max 4 sections) and doesn't warrant tabs/steps. Current single-scroll layout with section-per-card is appropriate at this content volume. No change recommended.

## 13. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (unchanged)
2. Status banners, reordered: inactive-notice (if any) → welcome (if any) → error (if any) → success (if any)
3. Onboarding checklist (if applicable) — unchanged, full-width, first
4. Open consultation requests — moved up
5. Digital benefit card — moved down
6. Beneficiaries (employee only) — unchanged position
7. Privacy note — unchanged

## 14. Proposed Container Simplification

| Container | Action | Detail |
|---|---|---|
| `div.border-t.p-5` wrapping digital card (`page.tsx:215`) | Remove, replace with padding prop | Pass `padding={20}` (or similar) directly to the enclosing `AdminCard`, drop the manual `border-t` (redundant with `SectionHeader`'s own divider) |
| 4 status banner `<p>` blocks | Keep as separate elements but reorder | No new container needed — reorder JSX per §11/§13 |
| 4 `AdminCard` panels in grid | Keep | Genuinely distinct data domains; not over-carded |
| `<details>` add-beneficiary disclosure | Keep | Correct progressive-disclosure pattern for a rarely-used form |

## 15. Responsive Findings

- **Desktop/laptop/tabletl (1440/1280/1024):** Empty state centers cleanly, no layout issues (`20-corporate-desktop-default-01.png`, `20-corporate-laptop-default-01.png`, `20-corporate-tabletl-default-01.png`).
- **Tabletp (768×1024):** No issues observed (`20-corporate-tabletp-default-01.png`).
- **Mobile/smobile (390/375):** Sidebar collapses to hamburger + condensed header, empty-state card reflows to full width with comfortable margins, text wraps cleanly (`20-corporate-mobile-default-01.png`, `20-corporate-smobile-default-01.png`).
- **Short (1366×650):** No clipping; empty state is short enough to fit without scroll (`20-corporate-short-default-01.png`).
- **(Code-derived)** `lg:grid-cols-2` in the populated view collapses to a single column below `lg` (1024px Tailwind breakpoint) — at `tabletl` (1024px, exactly the breakpoint) this could go either way depending on Tailwind's exact `lg` value (1024px = `lg` inclusive, so tabletl should already be 2-column-eligible); not verifiable without a populated account. Flagging as an open question in §21.

## 16. Accessibility Findings

- **Heading skip (H1→H3):** see issue 20-002.
- **Focus visibility:** confirmed good — all tested sidebar links produce a `3px` lime box-shadow ring on `Tab` focus (see §6 interaction inventory). No fix needed.
- **Empty-state icon:** `AdminEmptyState`'s icon prop passed as `<BadgeCheck aria-hidden />` (`page.tsx:115`) — correctly hidden from assistive tech, decorative only. Good.
- **(Code-derived) Beneficiary remove/resend forms:** each is a bare `<form action={beneficiaryRowAction}>` with a submit `Btn` labeled only "Resend invite" / "Remove" (`page.tsx:334-348`) — with multiple beneficiaries, screen-reader users tabbing through get a list of identically-labeled "Remove" buttons with no accessible name tying each to the specific beneficiary (e.g., "Remove Jane Doe"). Cannot verify severity without a populated list, but the pattern (bare `{t.remove}` text with no `aria-label` including the person's name) is visible directly in the code and is a real finding.
- **(Code-derived) Add-beneficiary form:** all fields correctly use `<label>` wrapping `<span className="gh-field-label">` + `<input>`/`<select>` (proper label association) — no issue found.

## 17. Content and Microcopy Findings

| Current | Recommended | Note |
|---|---|---|
| "No corporate membership" / "If your employer offers a corporate health plan, ask your company admin for an invitation." | Keep — already specific and actionable, not vague. No change needed. | Verified live |
| "Resend invite" / "Remove" (beneficiary row buttons) | "Resend invite to {firstName}" / "Remove {firstName}" (or keep visual label short but add `aria-label` with the name) | Code-derived; ties to 16 above — this is an accessibility-driven microcopy fix, not a clarity one (visible label is fine for sighted users since it's in a row with the name already) |
| "Book now" (used identically for onboarding pre-assessment AND for company-requested consultations) | Distinguish: "Book pre-assessment" vs "Book requested consultation" | Code-derived (`t.bookNow` reused at `page.tsx:140` and `page.tsx:298`) — same string in two different task contexts on the same page risks ambiguity if both sections are visible together (checklist + open requests can co-occur) |
| "Digital benefit card" / body copy is fine, verbatim and factual | No change | — |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Digital card wrapper div | `frontend/app/(auth)/account/corporate/page.tsx:213-268` | Remove redundant `div.border-t.p-5`, use `AdminCard` padding prop | Page-specific | Low | Trivial |
| Section order | `frontend/app/(auth)/account/corporate/page.tsx:179-410` | Reorder JSX blocks (requests before card) | Page-specific | Low | Trivial |
| Status banner order | `frontend/app/(auth)/account/corporate/page.tsx:161-177` | Reorder conditional renders | Page-specific | Low | Trivial |
| `AdminEmptyState` heading level | `frontend/app/(admin)/admin/_components/atoms.tsx:214+` | Change title tag from `h3` to `h2` (or audit full heading scheme) | **Shared** — affects every portal page using this empty state | Medium (must check all consumers) | Small |
| Beneficiary row buttons | `frontend/app/(auth)/account/corporate/page.tsx:337-347` | Add `aria-label` including beneficiary name | Page-specific | Low | Trivial |
| "Book now" string reuse | `frontend/locales/*/account.json` (`corporate.bookNow`) | Split into two distinct keys for onboarding vs company-request contexts | Page-specific (locale file, 6 languages) | Low | Small |

## 19. Recommended Implementation Order

1. Digital card wrapper simplification (20-004) — trivial, isolated
2. Section reorder: requests before card, banner priority reorder (20-003, §11) — trivial, isolated, no data dependency
3. Beneficiary button `aria-label`s — trivial, isolated
4. "Book now" string split across 6 locale files — small, mechanical
5. `AdminEmptyState` heading-level fix (20-002) — defer until an audit of all pages using this shared component confirms no `h3`-dependent styling/testing elsewhere

## 20. Acceptance Criteria (measurable)

- Direct nav to `/account/corporate` with no membership still renders the empty state with no console errors (already true — verified).
- Digital card markup has exactly one wrapping `div` between `AdminCard` and the gradient-card `div` (currently two).
- With `?welcome=1` and an inactive company plan, the inactive-notice banner renders visually above the welcome banner in DOM order.
- Beneficiary "Remove"/"Resend invite" buttons expose an accessible name containing the beneficiary's first + last name (verify via `aria-label` or `axe` scan).
- Heading query on any page rendering only `PageHeader` + `AdminEmptyState` returns sequential levels (h1 → h2, no skip) — cross-page check once shared component is patched.

## 21. Open Questions

- Whether `lg:grid-cols-2` genuinely renders 2-up at exactly 1024px (tabletl) in the populated state — could not verify without a corporate-linked test account; Tailwind's `lg` breakpoint is `min-width: 1024px` so it should apply, but unconfirmed visually.
- Whether the welcome/error/success/inactive banners can realistically co-occur in production (e.g., does `?welcome=1` ever coexist with `?error=`) — only answerable by tracing all redirect call sites into this route, out of scope for a single-page audit.
- Whether other pages consuming `AdminEmptyState` rely on its title being exactly `h3` (e.g., snapshot tests, other heading-level assumptions) — requires a repo-wide grep before changing the shared component.
- Actual populated-state screenshots (checklist, digital card with real data, requests list, beneficiary list/form) could not be captured — the seeded test patient account has no corporate membership and the brief prohibits creating one via mutating actions. All populated-state findings in this file are marked code-derived and should be re-verified against a real corporate-member account screenshot pass if one becomes available.
