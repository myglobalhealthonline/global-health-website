# 01 — Dashboard (Patient Overview) + Portal Shell

## 1. Page Identification

- **Name**: Patient Dashboard / Account Overview
- **Route**: `/account`
- **Entry points**: post-login redirect, sidebar "Overview", logo click (from within portal), breadcrumb root
- **Role**: PATIENT only (ADMIN/DOCTOR/CORPORATE_ADMIN redirected away in layout)
- **Frontend files**:
  - `frontend/app/(auth)/account/page.tsx` (server component, page content)
  - `frontend/app/(auth)/account/layout.tsx` (shell wiring, nav groups, auth gate)
  - `frontend/app/(auth)/account/_components/SubscriptionDashboard.tsx` (membership block, renders nothing for non-subscribers)
- **Shared components**: `PortalShell`, `CommandBand`, `StatCard`, `AdminSummaryStrip`, `AdminCard`, `SectionHeader`, `Pill`, `Btn` (all `frontend/components/portal-atoms.ts` → re-export from `frontend/app/(admin)/admin/_components/atoms.tsx`); `NotificationPopover`, `PortalUserMenu`, `LanguageSwitcher`, `AppMenu` (shell chrome, `frontend/components/*.tsx`)
- **APIs observed** (code-derived, from `page.tsx`/`layout.tsx` imports): `fetchAccountAppointments`, `fetchAccountPayments`, `fetchTrustpilotReminder`, `fetchAccountGhn`, `resolveBookConsultationHref`, `fetchPatientUnreadMessageCount`, `getServerNotifications`, `fetchMeCorporate` — all server-side fetches, no client XHR observed for the default view.
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)

## 2. Page Purpose

Landing surface after login. Should orient the patient: what needs attention right now (unpaid invoice, unverified email, upcoming call), and one-tap paths into the rest of the portal (bookings, prescriptions, payments, profile). Secondary: membership/subscription status if subscribed.

## 3. Primary User Tasks (priority order)

1. See if there's an appointment coming up / join a call in progress
2. See if anything needs action (payment failed, email unverified)
3. Jump to "My bookings" to check on a pending request
4. Book a new consultation
5. Check subscription/membership state and credits
6. Navigate to a specific portal section (prescriptions, payments, profile, security)

## 4. Current Page Structure (top-to-bottom)

1. `CommandBand` — dark hero: "Welcome / {name}", GHN chip, one metric (Total, or Next+Open+ThisWeek when a call is scheduled), CTA (Join call / Book a consultation)
2. Row of 3 `StatCard`s — OPEN / THIS WEEK / TOTAL (icon + number + hint)
3. `AdminSummaryStrip` — 4 more cards: NEXT APPOINTMENT / PAYMENTS / RECORDS / QUICK PATH
4. Conditional: email-verification banner (`AdminCard`, only if `emailVerifiedAt` is null)
5. Conditional: Trustpilot review-reminder banner (`AdminCard`, only if `trustpilot.showCta`)
6. `SubscriptionDashboard` — membership plan card + consultation/wellness credit cards + perks list + recent credit activity table (renders nothing for non-subscribers)
7. Two-column grid: "Recent bookings" list (left, wider) + "Quick actions" nav (right, narrower)

## 5. Current Container Hierarchy (indented tree)

```
.gh-patient-page.gh-patient-overview
├─ CommandBand (AdminCard-styled dark hero) — necessary, primary orientation surface
├─ .gh-patient-stat-grid (grid, 3 cols)
│   ├─ StatCard × 3                                   — real stats, keep
├─ AdminSummaryStrip (grid, 4 cols)
│   ├─ "card" × 4 (Next appointment / Payments / Records / Quick path)  — NOT stats, decorative-only container reuse (see 8-001)
├─ [conditional] AdminCard > flex row (email verify banner) — single-purpose alert, card justified
├─ [conditional] AdminCard > flex row (Trustpilot banner)   — single-purpose alert, card justified
├─ SubscriptionDashboard
│   ├─ (not read in this pass — out of scope; visually: plan AdminCard + 2 stat AdminCards + perks AdminCard + activity-table AdminCard = 5 more cards stacked before the main grid)
├─ .gh-patient-overview-grid (grid, 2 cols on lg)
│   ├─ AdminCard (padding 0)
│   │   ├─ SectionHeader (title + "See all" link)        — unnecessary sub-level: header is visually identical to just a row title, no distinct chrome
│   │   └─ div.p-5 > ul (recent bookings, divide-y rows)  — correct: list, not card-per-item
│   └─ AdminCard (padding 0)
│       ├─ SectionHeader (title + description)
│       └─ div.p-5 > nav (5 QuickLink rows) + 1 highlighted CTA row
```

Unnecessary levels: the `AdminSummaryStrip` 4-card row is a card wrapper around content that is not numeric/statistical (a status string, a CTA label) — it borrows `StatCard`'s "chart icon in a green pill" visual for non-stat data. The two `AdminCard > SectionHeader > div.p-5` wrappers in the main grid are fine (real content containers) but stack a third nesting level (`AdminCard` → `SectionHeader`/`div.p-5` → `ul`/`nav`) purely to reproduce the card frame; a plain `<section>` with a top rule would read identically.

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| "Book a consultation" (hero) | Link/Btn | Present, not clicked (would navigate off-page) | Renders correctly, resolves per-country href | — | 01-dashboard-desktop-default-01.png |
| Notification bell | Popover trigger | Click | Opens `NotificationPopover` with 3 unread items + "View all" | Panel translucent, page content bleeds through (01-001) | 01-dashboard-desktop-bell-open-01.png |
| User chip ("Syed Muhammad H…") | Popover trigger | Click | Opens `PortalUserMenu`: name/email, role pill, Account/Main site links, Sign out | Same translucency bleed-through as bell (01-001) | 01-dashboard-desktop-usermenu-open-01.png |
| Language switcher ("EN") | Popover trigger | Click | Opens locale list (EN/PT/ES/CS/RO/DE), checkmark on active | Works correctly, no issues | 01-dashboard-desktop-langswitcher-open-01.png |
| Mobile hamburger | Toggle | Click at 390px | Opens sidebar drawer with overlay, full nav visible | Works correctly | 01-dashboard-mobile-navdrawer-open-01.png |
| "See all" (Recent bookings) | Link | Not clicked (navigates to /account/bookings, out of scope) | code-derived: correct href | — | — |
| QuickLink rows (5) | Link | Not clicked (navigate away) | code-derived: correct hrefs | Generic hint copy on 2 of 5, see 01-006 | 01-dashboard-desktop-default-02.png |
| "Open" button per booking row | Link | Not clicked | code-derived: all 5 rows link to the same `/account/bookings` list, not the specific booking | Vague/misleading — "Open" implies opening *that* booking (01-005) | 01-dashboard-desktop-default-02.png |
| Recent Credit Activity table (in SubscriptionDashboard) | Static table | Viewed | 8 rows, all dated "9 Jul 2026", several rows read "0" with no delta | Confusing zero-value rows (01-007, code-derived beyond visual) | 01-dashboard-desktop-default-02.png |

## 7. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| 01-dashboard-desktop-default-01.png | 1440×900 | default, top | Hero + stat row + summary strip | 01-001, 01-002, 01-003 |
| 01-dashboard-desktop-default-02.png | 1440×900 | default, scrolled mid | Perks/credit activity + Recent bookings + Quick actions | 01-004, 01-005, 01-007 |
| 01-dashboard-desktop-default-03.png | 1440×900 | default, scrolled bottom | Recent bookings tail + Quick actions tail | 01-005 |
| 01-dashboard-mobile-default-01.png | 390×844 | default, top | Hero + 3 stat cards start | 01-002, 01-003 |
| 01-dashboard-mobile-default-02.png | 390×844 | default, scrolled | 3 of the 4 summary cards + membership | 01-002 |
| 01-dashboard-short-default-01.png | 1366×650 | default, top | Short-viewport check | 01-008 |
| 01-dashboard-desktop-bell-open-01.png | 1440×900 | notification popover open | Bell menu content + bleed-through | 01-001 |
| 01-dashboard-desktop-usermenu-open-01.png | 1440×900 | user menu open | Account menu content + bleed-through | 01-001 |
| 01-dashboard-desktop-langswitcher-open-01.png | 1440×900 | language switcher open | Confirms 6 locales render correctly | — |
| 01-dashboard-mobile-navdrawer-open-01.png | 390×844 | mobile nav drawer open | Confirms full nav accessible on mobile | — |

## 8. UX Problems

### 01-001 — Dropdown/popover panels let page content bleed through (Medium, Visual/Accessibility, Shell-wide)
**Browser evidence**: `01-dashboard-desktop-bell-open-01.png` shows a ghosted "27" numeral (the TOTAL stat card behind it) rendered directly under the "Redemption confirmed" notification text; `01-dashboard-desktop-usermenu-open-01.png` shows "Book a consultation" ghosted text overlapping the "Account" menu link.
**User impact**: reduces legibility of menu text, looks unfinished/buggy, and is a contrast risk for low-vision users (WCAG 1.4.3 territory if the ghosted text meaningfully lowers foreground/background contrast in places).
**Root cause**: `.gh-portal-menu-content` (`frontend/app/portal.css:5659`) fills with `--lux-modal-fill: linear-gradient(180deg, rgba(255,255,255,.92), rgba(255,255,255,.86))` — a semi-transparent white, not a solid surface, and has no `backdrop-filter: blur(...)` to obscure what's behind it.
**Recommended resolution**: either raise the fill to fully opaque (`rgba(255,255,255,1)` fallback to `--portal-surface-elevated`) or add `backdrop-filter: blur(12px)` alongside the existing translucency so the "glass" effect blurs rather than merely dims the content underneath. Same fix applies everywhere `gh-portal-menu-content` is used (all 3 portals) — file the CSS fix once in `portal.css`, not per-caller.

### 01-002 — 4-card "summary strip" duplicates the icon and dresses up non-statistics as stat cards (Medium, Information Hierarchy / Card overuse)
**Browser evidence**: `01-dashboard-desktop-default-01.png` — NEXT APPOINTMENT, PAYMENTS, RECORDS, QUICK PATH cards all show the identical green bar-chart glyph, regardless of content. QUICK PATH's "value" is the string "Book care" — not a statistic, a mislabeled CTA.
**User impact**: the repeated chart icon signals "these are numbers" but only 2 of 4 actually vary numerically (Payments, arguably Records); users scanning for the real "what needs my attention" item have to read every card's body text since the icon gives no differentiating signal. QUICK PATH duplicates the hero's own "Book a consultation" CTA and the Quick Actions panel's identical link three ways on one page.
**Root cause**: `page.tsx:184-208` passes 4 items into `AdminSummaryStrip`, a component designed for numeric summaries, but the `items` here are a mix of a date string, a status string, a badge value, and a CTA label. `AdminSummaryStrip`'s icon appears to be a fixed decorative glyph, not per-item.
**Recommended resolution**: per the dashboard-review "needs attention" model — replace this strip with a single conditional alert row that only renders when something is actionable (e.g. "1 payment needs action → Review"), drop RECORDS (duplicate of the GHN chip already in the hero) and QUICK PATH (duplicate CTA) entirely. NEXT APPOINTMENT is already shown in the hero metrics when a call exists; when it doesn't, folding that single fact into the hero's own metric slot (already done for "Not scheduled") removes the whole 4-card row.

### 01-003 — 3 stat cards (OPEN/THIS WEEK/TOTAL) don't answer "what should I do" (Medium, Information Hierarchy)
**Browser evidence**: `01-dashboard-desktop-default-01.png` — OPEN=23, THIS WEEK=0, TOTAL=27.
**User impact**: "23 open" with no breakdown of *why* (23 request-received bookings sitting unactioned, per the Recent Bookings list below, all status "REQUEST_RECEIVED") reads as noise, not a task. A patient dashboard's job per the dashboard-review brief is task-oriented, not a stats readout — "23" alone doesn't tell the patient anything actionable.
**Root cause**: `page.tsx:68-75` computes raw counts with no distinction between "waiting on you" vs "waiting on the clinic."
**Recommended resolution**: keep at most one number here — "Open requests" — and make it a link directly into the filtered bookings view (`/account/bookings?status=open`), not a static tile. Drop "This week" (redundant with hero's Next-call metric) and "Total" (vanity metric, already available on `/account/bookings` and in Quick Actions' "27 total" hint).

### 01-004 — "Recent Credit Activity" table shows misleading zero-delta rows (Medium, Content/Microcopy — code-derived)
**Browser evidence**: `01-dashboard-desktop-default-02.png` — rows "Used for consultation … 0", "Redeemed for kit … 0" sit alongside rows with real deltas ("Reserved … −1", "Reserved … −6"), all dated the same day.
**User impact**: a "0" delta on a ledger row reads as a bug ("did this charge me or not?") rather than as "this event didn't change your balance." Out of full scope (SubscriptionDashboard not in this page's file list) but visible on this page and worth flagging.
**Root cause**: code-derived, not inspected this pass — `SubscriptionDashboard.tsx` is out of the assigned scope for 01-dashboard; flagging for the component's own audit page.
**Recommended resolution**: N/A here — cross-reference to whichever audit page covers `/account/membership` or the SubscriptionDashboard component.

### 01-005 — Every "Open" button on Recent Bookings rows points to the same list, not the specific booking (Medium, Microcopy/IA — code-derived)
**Browser evidence**: `01-dashboard-desktop-default-02.png`/`03.png` — 5 rows all say "Open"; `page.tsx:343-347` sets `href="/account/bookings"` (static) inside the `.map()`, not `` `/account/bookings/${b.id}` ``.
**User impact**: clicking "Open" on any of the 5 recent bookings lands the user on the generic bookings list, not the booking they clicked — they now have to re-find it. Feels broken once discovered.
**Root cause**: `frontend/app/(auth)/account/page.tsx:343` — `href` is hardcoded to the list route inside the per-row `Btn`, ignoring `b.id`.
**Recommended resolution**: if `/account/bookings/[id]` exists, deep-link there; if bookings only support inline expansion within the list, change the label from "Open" to "View all bookings" (singular, once, outside the loop) rather than repeating a false-affordance action per row.

### 01-006 — Weak/generic QuickLink hint copy (Low, Microcopy)
**Browser evidence**: `01-dashboard-desktop-default-03.png` — "Profile → Name, phone", "Security → Password, email" are fine and specific; but the pattern is inconsistent — "Prescriptions → {prescriptionsHint}" and "Payments → {n} receipts" mix count-based and category-based hints with no shared logic.
**User impact**: minor — inconsistent information density across an otherwise clean list.
**Root cause**: hints are ad-hoc per link (`page.tsx:369-394`), not a systematic "why click this" rule.
**Recommended resolution**: standardize each hint to "what's new/pending" where data exists (e.g. Prescriptions → "2 active" instead of a static string) — low priority, cosmetic consistency only.

### 01-007 — Membership section has no heading hierarchy relationship to the page (Low, Information Hierarchy)
**Browser evidence**: `01-dashboard-desktop-default-01.png` — "MEMBERSHIP" eyebrow label sits directly above the plan card with no `SectionHeader`/rule matching the "Recent bookings"/"Quick actions" section treatment below it.
**User impact**: minor inconsistency — two different section-heading treatments on one page (eyebrow-only vs `SectionHeader` component) makes the page feel assembled from different templates.
**Root cause**: `SubscriptionDashboard` (out of scope file) evidently uses a plain eyebrow div instead of the shared `SectionHeader` atom used elsewhere on this page.
**Recommended resolution**: standardize on `SectionHeader` for every top-level section on the dashboard.

### 01-008 — Short viewport (1366×650) has no dashboard-specific clipping beyond normal scroll (Low, Responsive)
**Browser evidence**: `01-dashboard-short-default-01.png` — hero + 3 stat cards + start of summary strip fit; rest requires scroll, which works normally (no sticky element traps the view).
**User impact**: none beyond expected scrolling; noted for completeness per brief requirement 9.
**Root cause**: N/A
**Recommended resolution**: N/A — no fix needed.

## 9. Visual Design Problems

- Repeated pill/badge/rounded-full treatment: the green accent bar (`—`) prefix appears on every `StatCard` and `AdminSummaryStrip` label; combined with the green circular icon chip, the same 2 visual devices repeat 7 times above the fold (3 StatCards + 4 summary cards) before any content differentiates itself — visual monotony that competes with the one place it should draw the eye (an actual actionable item, if one exists).
- The hero (`CommandBand`) uses a dark forest-green gradient with a diagonal light sweep graphic; none of the 7 cards below echo that treatment, so the page reads as "1 premium hero + 7 identical generic tiles," reinforcing the card-overuse issue in 01-002/01-003 rather than a deliberate visual hierarchy.

## 10. Information Hierarchy Problems

Per the dashboard-review "needs attention" model: the single most useful piece of information on this page — "1 needs action" under Payments — is visually identical in weight to "GHN active" (a static, rarely-changing fact) and "Book care" (a CTA mislabeled as a stat). A patient scanning top-to-bottom has no visual cue that the Payments card is the one worth clicking. See 01-002.

## 11. Section Ordering Review

**Current order:**
1. Hero (CommandBand)
2. 3 stat cards
3. 4 summary cards
4. Email-verify banner (conditional)
5. Trustpilot banner (conditional)
6. Subscription dashboard (membership, credits, perks, activity)
7. Recent bookings + Quick actions (2-col grid)

**Recommended order:**
1. Hero (unchanged — sets identity + one clear metric/CTA)
2. **Needs-attention row** (conditional, collapses to nothing when clean) — merges email-verify banner, Trustpilot banner, and "payment needs action" into one consistent alert-row pattern, replacing steps 2–5 above. *Reasoning: these four current items (2 stat rows + 2 banners) are all really the same job — "is anything wrong" — and should share one visual pattern instead of 4 different card treatments stacked vertically.*
3. Recent bookings + Quick actions (2-col grid) — *Reasoning: this is the actual task list (see what I have, jump to where I need to go); it's currently buried below membership content that most non-subscribers never see at all (SubscriptionDashboard renders nothing for them), meaning free-tier patients scroll past dead space... no, it renders nothing, so no dead space, but for subscribers it still delays the task-relevant content unnecessarily.*
4. Subscription dashboard (membership/credits/perks/activity) — *Reasoning: valuable but secondary to "what do I need to do today"; moving it after Recent Bookings means the primary task list isn't pushed down by an unrelated billing summary.*

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — this is a single-scroll overview dashboard by design; introducing tabs would hide the "needs attention" signal that must be visible on load. No structural sectioning beyond the reordering in §11 is needed.

## 13. Proposed Page Structure (exact top-to-bottom)

1. Hero (`CommandBand`, unchanged)
2. Needs-attention row (conditional; email verify / payment action / Trustpilot request — as a single stacked alert list, not cards)
3. Recent bookings + Quick actions (2-col grid, unchanged internals)
4. Subscription dashboard (membership/credits/perks/activity)

## 14. Proposed Container Simplification

| Element | Action | Detail |
|---|---|---|
| 3 `StatCard`s (OPEN/THIS WEEK/TOTAL) | Reduce to 1 | Keep "Open requests" as a linked stat; drop This Week and Total (available elsewhere) |
| `AdminSummaryStrip` 4-card row | Remove, replace | Fold into the new needs-attention alert row; only render when actionable |
| Email-verify `AdminCard` | Keep, restyle | Merge visual treatment with new alert row (left-accent-bar pattern, not full card) |
| Trustpilot `AdminCard` | Keep, restyle | Same — merge into alert row pattern |
| "Recent bookings" `AdminCard` → `SectionHeader` → `div.p-5` → `ul` | Flatten one level | Drop the `AdminCard` wrapper's redundant padding-0 shell; render `SectionHeader` + list directly in a plain `<section>` with a top hairline, since the two-column grid already provides visual separation from "Quick actions" |
| "Quick actions" `AdminCard` → `SectionHeader` → `div.p-5` → `nav` | Flatten one level | Same as above |
| Membership "MEMBERSHIP" eyebrow | Keep, standardize | Replace ad-hoc eyebrow with the shared `SectionHeader` atom for consistency |

## 15. Responsive Findings

- **Desktop/laptop (1440/1280)**: layout as designed, 3-col stat grid + 4-col summary grid + 2-col main grid all fit without wrapping issues.
- **Tabletl (1024)**: not deep-inspected beyond capture; grid classes are Tailwind responsive (`lg:grid-cols-[...]`) so 1024 likely still renders desktop-like columns since `lg` breakpoint is 1024px — borderline, worth a follow-up pass at 1023px to confirm no awkward wrap.
- **Mobile (390) / smobile (375)**: stat cards and summary cards stack to 1 column (`01-dashboard-mobile-default-01/02.png`) — readable, no clipping. Icon-in-pill repetition (01-002) is more pronounced on mobile since cards are full-width and stacked, making the identical icon repeat 7 times in a single vertical scroll.
- **Short (1366×650)**: no dashboard-specific clipping; content scrolls normally (01-008).

## 16. Accessibility Findings

- Notification bell button has `aria-label="Notifications"` and a `sr-only` unread-count span — correctly labeled (`NotificationPopover.tsx:50,56`).
- Mobile hamburger has proper `aria-label`/`aria-expanded` toggling between Open/Close navigation (`portal-shell.tsx:290-291`) — verified via `01-dashboard-mobile-navdrawer-open-01.png`.
- Popover bleed-through (01-001) is a potential text-contrast issue where ghosted background text overlaps foreground menu text — flagged as suspected failure, not measured to exact ratio per brief.
- `AdminSummaryStrip` items use a generic bar-chart SVG icon with `aria-hidden` presumably (not verified this pass) for 4 semantically different pieces of information — screen reader users get no icon-based signal either way (equivalent access), but sighted users lose a differentiation cue that a screen reader user never had — this is an equalizing issue, not a screen-reader-specific bug.
- Recent bookings "Open" buttons (01-005) all have identical accessible names ("Open") for 5 different destinations that are — per code — actually all the *same* destination; if a future fix deep-links them, ensure the accessible name becomes something unique per row (e.g. "Open booking, general · IE, booked 9 Jul") for screen-reader users navigating by link list.

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| "Open" (per-row booking button) | "View all bookings" (once, outside the per-row loop) OR unique per-booking label once deep-linked | Current copy implies opening the specific row; it doesn't (01-005) |
| "QUICK PATH — Book care" | Remove entirely | Redundant with hero CTA + Quick Actions "Book a consultation" row — 3rd copy of the same action on one page |
| "RECORDS — GHN active" | Remove from summary strip; already shown as the `GH-2026-000022` chip in the hero | Duplicate information |
| "MEMBERSHIP" eyebrow | Use shared `SectionHeader` title styling | Consistency with rest of page |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| `.gh-portal-menu-content` | `frontend/app/portal.css:5659` | Opaque fill or add `backdrop-filter: blur()` | Shared (all 3 portals) | Low (CSS-only, visual) | S |
| Dashboard stat/summary rows | `frontend/app/(auth)/account/page.tsx:157-208` | Replace 7-card stack with 1 stat + conditional alert row | Page-specific | Medium (touches layout + copy + conditionals) | M |
| Recent booking row `href` | `frontend/app/(auth)/account/page.tsx:343-350` | Deep-link to `/account/bookings/${b.id}` if route exists, else change label | Page-specific | Low–Medium (depends on whether detail route exists) | S |
| `AdminCard`/`SectionHeader` nesting in main grid | `frontend/app/(auth)/account/page.tsx:288-408` | Flatten to `<section>` + hairline | Page-specific (pattern is shared but change is local) | Low | S |
| Membership eyebrow → `SectionHeader` | `SubscriptionDashboard.tsx` (out of scope, flag only) | Swap ad-hoc eyebrow for shared atom | Cross-page (SubscriptionDashboard also renders on `/account/membership`) | Low | S |

## 19. Recommended Implementation Order

1. 01-001 (popover opacity fix) — single CSS change, shared across all 3 portals, highest leverage
2. 01-005 (booking row href/label mismatch) — cheap, removes a broken-feeling interaction
3. 01-002/01-003 (stat card consolidation) — bigger visual/IA change, needs design sign-off given DESIGN2.md governs portal visuals
4. 01-006/01-007/17 (microcopy + heading consistency) — polish pass, can ride along with #3

## 20. Acceptance Criteria

- Notification and user-menu popovers render with no page content visible through the panel background at any scroll position (manual check across 3+ scroll depths).
- Dashboard shows at most 2 stat/summary tiles above the fold in the default (nothing-needs-attention) state, down from 7.
- Every "Open" button on Recent Bookings either navigates to a booking-specific URL or is relabeled to accurately describe its destination.
- `SectionHeader` (or equivalent) used consistently for all 3 major sections (Recent bookings, Quick actions, Membership) — no more mixed eyebrow-only vs `SectionHeader` styles on one page.

## 21. Open Questions

- Does a `/account/bookings/[id]` detail route exist? Not found in the file listing for `account/**`; `bookings/page.tsx` and `bookings/ui.tsx` exist but a `[id]` dynamic segment was not observed — needs confirmation before implementing the 01-005 fix as a deep link vs a relabel.
- Is the "needs attention" consolidation (§11 recommended order) acceptable given DESIGN2.md is the "TOP authority" spec per project memory — recommend design review before implementation, not a blocking code question but a process one.
