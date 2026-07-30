# 13 — Subscribe / Confirm membership (`/account/subscribe`)

## 1. Page Identification

- **Name**: Confirm membership (subscribe checkout confirmation)
- **Route**: `/account/subscribe?plan=<id>&country=<code>&lang=<locale>&returnTo=<path>`
- **Entry points**: Not in the portal sidebar (by design — reached only via a "Subscribe"/"Switch to this plan" CTA from the public pricing page or cart, carrying `plan`/`country`/`lang` query params)
- **Role**: Patient (authenticated, **no active/past-due subscription** — this account does not qualify, see §6)
- **Related frontend files**:
  - `frontend/app/(auth)/account/subscribe/page.tsx` (server component — plan resolution + guard redirect)
  - `frontend/app/(auth)/account/subscribe/_components/SubscribeForm.tsx` (client — plan summary, consent checkbox, submit → Stripe Checkout)
  - `frontend/app/(auth)/account/subscribe/loading.tsx`
- **Shared components**: `PageHeader` (`@/components/portal-atoms`)
- **APIs observed** (code): `GET /api/me/subscription` (guard check), `POST /api/me/subscription/start` (`startSubscription`), `POST /api/me/subscription/dev-activate` (`devActivateSubscription`, dev/fake-billing only)
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop, laptop, tabletl, tabletp, mobile, smobile, short — all 7 attempted; **all 7 resulted in a server-side redirect to `/account/membership`** for this account (see §6)

## 2. Page Purpose

Final confirmation/consent step before starting a new paid subscription: show the chosen plan's price and benefits, require an explicit consent checkbox (recurring-charge mandate), then hand off to Stripe Checkout (or, in dev/fake-billing, activate directly).

## 3. Primary User Tasks (priority order)

1. Confirm the plan and price they're about to commit to.
2. Review what's included (credits, wellness, perks, unlock timing).
3. Read/accept the subscription terms (consent gate).
4. Submit and proceed to payment.

## 4. Current Page Structure (top-to-bottom) — from code, since not visually reachable

1. Header: "Confirm membership" + subtitle
2. Plan summary card: plan name, price/month, "billed monthly" note, "What you get" feature list (credits, secure-line/booking/specialist lines, wellness credits + redeem line, data-driven benefit-unlock note)
3. Consent block: checkbox + label + link to subscription terms (opens in new tab)
4. Inline error (conditional)
5. Submit button ("Subscribe"/`t.submit`) + secure-note microcopy

## 5. Current Container Hierarchy (indented tree) — from code

```
div.gh-patient-page.gh-patient-subscribe-page
├─ header.gh-portal-page-header                        (PageHeader — necessary)
└─ form.gh-patient-subscribe-form (grid gap-6)
    ├─ div.gh-patient-form-card.gh-card (p-6)            (plan summary — necessary, single card)
    │   ├─ plan name / price row
    │   ├─ divider
    │   └─ "What you get" feature list (ul > li, plain rows — good, not cards)
    ├─ label (consent block, own bordered/shadowed surface — a second "card-like" container immediately below the plan card)
    ├─ [error p, conditional]
    └─ div (submit button + secure note)
```

Two bordered/shadowed surfaces stacked directly (plan card, then the consent `<label>` styled with its own border+shadow+radius) — a minor version of the same "everything is a card" pattern seen on Membership/Rewards, though here it's only 2 surfaces total, not egregious.

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| `/account/subscribe` (no query params) | navigation | Direct visit | **Server-side redirect to `/account/membership`** before any page content renders | See UX-001 (Critical) | `13-subscribe-desktop-default-01.png` (loading splash mid-redirect) |
| `/account/subscribe?plan=abc&country=ie&lang=en` (with query params, non-existent plan id) | navigation | Direct visit via network-trace script | **Still redirects to `/account/membership`** — final URL confirmed `http://localhost:3000/account/membership` | Confirms the redirect fires unconditionally for this account, before plan resolution ever runs | — (network trace, not screenshot) |
| Plan summary card, consent checkbox, submit button | all | **Not reachable** — page never renders for this account | Code-derived only | — | N/A |

## 7. Screenshots

| File | Viewport | State | Reason | Related issues |
|---|---|---|---|---|
| `13-subscribe-desktop-default-01.png` | 1440×900 | Mid-redirect loading splash | Captured before the target page (`/account/membership`) finished compiling | UX-001 |
| `13-subscribe-tabletl-default-01/02/03.png` | 1024×768 | Post-redirect content | Shows the **Membership** page's breadcrumb ("Account › Membership") and content rendering at the `/account/subscribe` request — direct proof of the redirect | UX-001 |
| `13-subscribe-laptop-default-01.png`, `-tabletp-default-01.png`, `-mobile-default-01.png`, `-smobile-default-01.png`, `-short-default-01.png` | various | Same mid-redirect/post-redirect states | Corroborating evidence across viewports | UX-001 |

## 8. UX Problems

### 13-001 — Page is completely unreachable for any patient with an active or past-due subscription, including via direct link with valid-looking query params
- **Severity**: Critical
- **Category**: Navigation / dead-end (browser-verified)
- **Browser evidence**: Direct navigation to `http://localhost:3000/account/subscribe` (all 7 viewport captures) and to `http://localhost:3000/account/subscribe?plan=abc&country=ie&lang=en` (network-trace script) both terminate at `http://localhost:3000/account/membership`, confirmed by the rendered breadcrumb "Account › Membership" in `13-subscribe-tabletl-default-03.png` and by the final page URL in the network trace.
- **User impact**: If a currently-subscribed patient clicks any stale "Subscribe"/"Switch to this plan" link (e.g., from a bookmarked pricing page, an old email, a shared link, or a race where they subscribed in another tab), they are silently bounced to Membership with **no explanation** of why — no toast, no message, nothing indicating "you're already subscribed." They may assume the link is broken.
- **Root cause**: `frontend/app/(auth)/account/subscribe/page.tsx` lines 34-39 — the `existing.status === "ACTIVE" || existing.status === "PAST_DUE"` guard runs `redirect("/account/membership")` **before** any query-param or plan resolution, so it fires even for a syntactically-valid `?plan=&country=&lang=` request. This is very likely intentional product behavior (one active subscription per user, §6c per the code comment) — the defect is the **silence** of the redirect, not necessarily the redirect itself.
- **Recommended resolution**: Preserve the guard (correct business rule — prevent a second active subscription), but land on `/account/membership` with a query param (e.g., `?subscription=already-active`) that `ManagePanel.tsx`'s existing banner system (it already has an `info`/`ok`/`warn` banner pattern — `ManagePanel.tsx` lines 130-141) can surface as a one-line explanatory banner: "You already have an active membership — manage it below." This reuses the exact banner mechanism already built for `returnState`, so the fix is additive, not a new pattern.

## 9. Visual Design Problems

N/A — page content was never visually reachable in this account's state to review margins/padding/hierarchy directly; the plan-summary-card and consent-label styling was reviewed via code only (§4/§5) and appears consistent with the rest of the portal's card system (`gh-card`, `--portal-*` tokens), no code-visible anomalies found.

## 10. Information Hierarchy Problems

N/A — see §9; not visually testable in this account's data state. Code review of `SubscribeForm.tsx` shows a reasonable single-column priority order (plan/price → what's included → consent → submit), consistent with a standard checkout-confirmation pattern.

## 11. Section Ordering Review

N/A — page structure (§4) reads as already well-ordered from code (plan summary → benefits → consent → submit, a standard top-to-bottom checkout flow); no reordering recommended based on available evidence.

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — single-screen confirmation step, no tabs/steps warranted; current single-card + consent + submit structure is appropriate for a one-step confirmation (it is deliberately the *last* step after plan selection happens elsewhere).

## 13. Proposed Page Structure (exact top-to-bottom)

Unchanged from current (§4) — no structural issues identified. Only change recommended is the redirect-target banner described in UX-001.

## 14. Proposed Container Simplification

| Container | Action | Detail |
|---|---|---|
| Plan summary card (`gh-patient-form-card.gh-card`) | **Keep** | Single card, appropriately used. |
| Consent `<label>` (bordered/shadowed) | **Keep**, consider **divider instead of a second card** | It's visually a second "card" directly below the plan card with no content between them — could be a plain bordered block or integrated as a footer region of the plan card with a divider, matching the "reduce card-in-card stacking" recommendation made on Membership/Rewards. Low priority since it's only 2 surfaces, not a chain. |

## 15. Responsive Findings

Not testable — page redirects before rendering at every viewport for this account. **Untested state**, not a "no defects found" result — see §21.

## 16. Accessibility Findings

Not testable live. Code review of `SubscribeForm.tsx`:
- Consent checkbox: `aria-describedby="subscribe-terms-link"` correctly links the checkbox to the adjacent terms link (line 135) — good practice.
- Submit button: `aria-disabled` mirrors the `disabled` state correctly (line 164) — good practice, though note `aria-disabled` + native `disabled` together is slightly redundant (native `disabled` already removes it from the tab order and announces as disabled); not a defect, just a minor redundancy.
- Terms link opens in a new tab (`target="_blank"`) without a visible "(opens in new tab)" affordance or `rel` announcement beyond `rel="noopener noreferrer"` (line 145) — screen-reader users are not warned before the context switch. Minor, code-derived finding.

## 17. Content and Microcopy Findings

Not visually reviewable; code-derived copy keys (`t.title`, `t.subtitle`, `t.missingPlan`, `t.submit`, etc.) are all sourced from the `subscription.subscribe` i18n bundle and appear task-specific in the source (e.g., `t.consentRequired`, `t.secureNote`) — no vague-label issues spotted in the prop wiring itself; actual rendered strings not verified.

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Redirect with explanatory state | `frontend/app/(auth)/account/subscribe/page.tsx` (lines 34-39) | Change `redirect("/account/membership")` to `redirect("/account/membership?subscription=already-active")` | Page-specific (subscribe) | Low | Trivial (one-line change) |
| Banner copy for the new state | `frontend/app/(auth)/account/membership/_components/ManagePanel.tsx` (banner logic, lines 130-141) + i18n `subscription.manage.return.*` | Add one new banner branch (`props.returnState === "already-active"`) + one new copy key across locales | **Shared** (Membership page, reused banner mechanism) | Low | Small — mirrors an existing pattern exactly |

## 19. Recommended Implementation Order

1. Add the `?subscription=already-active` redirect param (trivial, one file).
2. Add the corresponding banner branch + i18n copy key on Membership (small, reuses existing pattern).

## 20. Acceptance Criteria (measurable)

- Visiting `/account/subscribe` (with or without query params) while subscribed ACTIVE/PAST_DUE lands on `/account/membership` with a visible one-line banner explaining why, verifiable by screenshot showing banner text and by URL containing `?subscription=already-active`.
- No new page state is reachable that bypasses the one-active-subscription business rule.

## 21. Open Questions

- **This entire page's actual UI (plan card, consent flow, submit/error states, responsive behavior at all 7 viewports) could not be browser-verified** because the only available test account already has an ACTIVE subscription, and the page's own guard (line 37) redirects away before rendering regardless of query params. Every finding in §4/§5/§9/§10/§15/§16/§17 is **code-derived**, not screenshot-verified.
- A full visual/responsive/accessibility audit of this page requires either (a) a test account with **no** active subscription, or (b) temporarily disabling the guard in a non-production environment — both out of scope for this pass (would require account state mutation, which the audit brief prohibits).
- Whether `?plan=` pointing at a genuinely valid plan ID (rather than the placeholder `abc` used in the network-trace test) changes anything is moot — the guard redirect happens before plan resolution runs (confirmed by code, line order in `page.tsx`), so no plan ID value can reach the render path for a subscribed account.
