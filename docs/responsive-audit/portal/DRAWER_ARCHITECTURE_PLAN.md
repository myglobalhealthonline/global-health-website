# Drawer Architecture Plan — Portals

Audit date: 2026-07-11 · Status: PROPOSAL. Every drawer here is **additive**: no route, deep link, query param, API contract, permission, or existing action is removed or changed. Each migration is independently shippable and revertible (revert = remove the drawer trigger; underlying list/detail pages are untouched).

## 1. Shared drawer principles

- One primitive: **`RecordDetailsDrawer`** built on the shared `AppSheet` (Radix Dialog side-variant; see `../shared/RESPONSIVE_DESIGN_SYSTEM_PLAN.md` §3.2). Same primitive later serves website filter sheets — no parallel implementations.
- **Theme fidelity (design-system §4c)**: the drawer is styled to DESIGN2.md Obsidian Ivory · Liquid Lux — ivory panel, obsidian scrim, lux hairlines/radii/shadows, portal eyebrow/title typography, existing `portal-atoms` (Btn/Pill/IconBtn) for all controls, existing skeleton/empty-state components for its states. It must read as a native portal surface, not a generic sheet. Public-site filter-sheet variant uses gh2 forest/ivory glass per DESIGN.md and joins both backdrop-filter fallback blocks. Visual sign-off against the design docs before first route ships.
- **Height responsiveness (design-system §4b)**: panel `max-height: 100svh` mobile / `min(88svh, cap)` where inset; sticky header + footer, body scrolls internally; safe at 568px height and landscape phones; never clips content — scroll is the fallback.
- Layering: overlay `--z-drawer-overlay` (400), panel `--z-drawer` (410) — above sticky headers/dropdowns, below modals/toasts.
- Desktop: right-side panel, width variants sm 420 / md 520 / lg 640px; list stays visible; background inert (modal); focus moves in on open, returns to trigger row on close.
- Tablet: `min(80vw, lg)` — never leaves an unusable list sliver.
- Mobile: full-screen sheet (bottom-sheet for short content), sticky header w/ always-visible close, sticky action footer when actions exist, internal scroll only, body scroll locked, safe-area insets (`env(safe-area-inset-bottom)`).
- Keyboard: Escape closes; Tab cycles inside (Radix trap); unsaved-form guard = confirm-on-close when dirty.
- URL: drawers that show a record identity get a query param (`?drawer=<id>` or reuse existing params) via `router.replace` shallow — deep-linkable, back-button closes. Filter/action-only drawers: no URL change.
- Data: reuse the row's already-loaded data for instant open; fetch extended fields from the existing detail endpoint (no new API contracts). Loading = skeleton matching sections; error = inline retry keeping list interactive; empty = per-field em-dash, never blank sections.
- Permissions: drawer renders exactly the actions the list/detail page already gates; server actions unchanged. PHI: drawer for patient records goes through the same PHI access gates (phi-reason-gate) as the detail page — nothing sensitive enters the list payload that isn't already there.
- Destructive actions: allowed in drawer footer only with the same confirm dialog they have today (`ConfirmDeleteButton` semantics), styled danger, never the default-focused control.
- Rollback per route: drawer trigger is one column/button; removing it restores the exact pre-migration UI. Feature-flaggable per route if desired.
- Coexistence: during migration both paths live — row's existing "Open" link keeps navigating to the detail page; the new row-click/kebab "Quick view" opens the drawer. An action moves into the drawer only if it stays at least as discoverable (drawer footer + still in detail page).

## 2. Decision matrix

| Route | Record type | Primary fields kept in list | Fields moved to drawer | Existing detail page | Drawer recommended | Reason |
|-------|-------------|------------------------------|------------------------|----------------------|--------------------|--------|
| /admin/orders | Order | Order #, Customer, Total, Status, Created | Country, Items breakdown, Meet link, Payment link, Invoice link/state, timestamps | /admin/orders/[id] ✔ | **Yes (D-01)** | 10 cols → 1180px forced width; links are P3 |
| /admin/users | User | Email, Name, Role, Status | Verified date, Created, secondary metadata; safe actions (resend verification, activate/deactivate if existing) | /admin/users/[id] ✔ | **Yes (D-02)** | classic B-pattern; proving ground (no PHI) |
| /admin/invoices | Invoice | Invoice #, Patient, Amount, Status/Emailed | Type, Order ref, Country, Generated date, delivery state, download | row-actions only | **Yes (D-03)** | 860px table; delivery metadata is P3 |
| /corporate/employees | Employee | Name, Email, Status, Beneficiaries | Department, invite timestamps, beneficiary summary, action cluster (resend/reactivate/suspend/remove) | /corporate/employees/[id] ✔ | **Yes (D-04)** | 5 action forms per row today; drawer declutters after card fallback ships |
| /admin/patients | Patient | Name, GHN, Country, Verification status | Email, Phone, ID, Joined, insurance/address summary | /admin/patients/[email] ✔ | **Yes, last (D-05)** | PHI — same gates as detail page; migrate after pattern proven |
| /admin/subscriptions | Subscription | Subscriber, Plan, Status | Credits detail/history, admin repair actions | none | Yes (light, D-06) | only list without any detail surface |
| /admin/doctors | Doctor | Doctor, Practicing in, Account, Status | (columns hide via priority instead) | /admin/doctors/[id] ✔ rich (availability/services subroutes) | **No** — Pattern C | detail page is the right home; drawer would duplicate it |
| /admin/appointments | Appointment | (card fields) | — | [id] ✔ rich workspace | **No** — Pattern E | card list already thin; medical context needs full page |
| /corporate/requests | Request | Employee, Type, Status, Booked | Created/Expires → expand-row or drawer-lite | none | Optional (expand-row preferred) | only 2 P3 fields — drawer overkill |
| /doctor/patients | Patient | 5 cols fine | — | [email] ✔ | **No** | list already lean |
| /doctor/* workspace tables | Notes/docs/services | — | — | inline expand exists | **No** | expand-row pattern already correct |
| /account/* patient lists | bookings/orders/etc. | — | — | detail routes exist | **No** | Pattern A card lists already fit |
| /admin/audit-log | Audit event | When, Action, Actor, Entity | (metadata already expand-row) | none | **No** | auditing screen: wide table + h-scroll is the intentional, justified UX |
| /admin/blog, /admin/pages, /admin/assets, /admin/countries, /admin/plans, /admin/health-tests, /admin/services | CMS/config | — | column priority handles it | edit routes ✔ | **No** | edit pages are the workflow; drawers add nothing |

## 3. Route drawer specs (the 6 recommended)

Template answers common to all six (per §1): loading skeleton per section; error inline retry; empty per-field dash; mobile full sheet; Escape/Tab/restore per AppSheet; close = X + Escape + scrim + back-button when URL-bound; unsaved-guard only where forms exist (D-04 none — forms are POST actions; D-02/D-06 only if inline edit added later); rollback = remove trigger; coexists with detail links.

### D-01 /admin/orders — "Order quick view"
1. Trigger: row click + "View" icon (existing Open link to [id] page stays).
2. Title: `Order #<number>` · 3. Summary top: customer, total, status pill, created.
4. Sections: Items (lines/qty/price); Payment (status, payment link + copy); Meeting (meet link + copy); Invoice (state, download); Timestamps.
5. Footer: Open full order (→ [id]); copy actions. Destructive: none.
6-8. URL `?order=<id>` (replace, shallow), deep-linkable; complements detail page.
9. Permissions: same admin gates as list. 19. Tabs: no. 20. Full page remains for refunds/edits.

### D-02 /admin/users — "User quick view"
Trigger: row click (Open link stays). Title: user name/email. Summary: role, status pills. Sections: Account (email, verified date, created); Profile metadata. Footer: Open full profile; resend verification; activate/deactivate (existing actions only, same server actions). URL `?user=<id>`. Tabs: no.

### D-03 /admin/invoices — "Invoice details"
Trigger: row click. Title: invoice #. Summary: patient, amount, status. Sections: Billing (type, order ref, country); Delivery (generated, emailed state); Files (download). Footer: download; resend email (existing action). URL `?invoice=<id>`. Destructive: none.

### D-04 /corporate/employees — "Employee management"
Trigger: row click + kebab replacing today's 5-button cell **on narrow widths only** (desktop keeps inline buttons until proven). Title: employee name. Summary: email, status, plan. Sections: Invitation (sent/accepted timestamps, status); Beneficiaries (count + names summary); Department. Footer: Resend invite / Reactivate / Suspend (existing forms, identical POSTs); Remove = danger w/ existing confirm. URL `?employee=<id>`. Deep link complements /corporate/employees/[id] (which stays the full history view). Tabs: no. Unsaved-guard: n/a (action buttons only).

### D-05 /admin/patients — "Patient summary" (LAST, PHI)
Trigger: row click (detail link stays). Title: patient name + GHN. Summary: country, verification status. Sections: Contact (email, phone — PHI-gated identically to detail page incl. reason prompt if ADMIN_PHI_REQUIRE_REASON active); Account (joined, ID); Recent bookings count. Footer: Open full record. No destructive actions. URL `?patient=<ghn>` (never email in URL — privacy rule: no personal data in query strings → use GHN/id). Access-log: drawer reads route through the same audited endpoints as the detail page.

### D-06 /admin/subscriptions — "Subscription details"
Trigger: row click. Title: subscriber. Summary: plan, status. Sections: Credits (balances, history); Billing linkage; Repair actions (existing admin repair endpoints). Footer: existing actions only. URL `?sub=<id>`. Tabs: only if credits history grows (start without).

## 4. Drawers NOT to create (and why)
Listed "No" rows in §2 — reasons inline. General rule applied: a drawer is rejected when (a) an edit/detail page is the actual workflow (CMS lists), (b) the list is already lean (Pattern A), (c) expand-row already solves it (doctor history, audit-log), or (d) content is medically complex (appointment workspace → Pattern E only).

## 5. Recommended primitives
`AppSheet` (base) → `RecordDetailsDrawer` (record header/sections/footer slots + URL binding + dirty-guard) → per-route content components. Shared with website filter sheets. Skeleton/empty/error slots ship with the primitive (ListSkeleton/ListErrorState reuse).

## 6. Non-breaking migration & rollback (per route)
Order of shipping: D-02 (no PHI, has detail page — safest proving ground) → D-01 → D-03 → D-04 → D-06 → D-05 (PHI last).
Each ship = one PR: add trigger + drawer content; zero changes to page.tsx data fetching, filters, pagination, or server actions. Verification per route: keyboard cycle, 320px sheet, deep-link open, back-button close, action parity checklist against pre-migration screenshot. Rollback: revert the single PR; list returns to exact prior state (triggers are the only list diff).
