# Patient Portal Audit — Security

## 1. Page Identification

- **Name**: Security
- **Route**: `/account/security`
- **Entry points**: Sidebar → Account → Security; linked from "Needs verification" alerts elsewhere in the portal (resend-verification action lives here).
- **Role**: Patient (authenticated, `(auth)` route group)
- **Related frontend files**:
  - `frontend/app/(auth)/account/security/page.tsx` (server entry)
  - `frontend/app/(auth)/account/security/_components/security-client.tsx` (entire page: verification, GDPR data/delete, sign-out-all, change-password)
  - `frontend/app/(auth)/account/security/_components/delete-account-button.tsx` (delete-account confirm flow)
  - `frontend/app/(auth)/account/security/loading.tsx`
- **Shared components**: `PageHeader`, `AdminSummaryStrip` (`frontend/components/portal-atoms.ts`), `FormSection` (`frontend/components/FormSection.tsx`), `PortalDialog` (`frontend/components/PortalDialog.tsx`)
- **APIs observed (code-derived, via `frontend/lib/api/auth-api.ts`)**: `GET /api/auth/me` (`fetchCurrentUser`), `POST /api/auth/password` (`changeCurrentPassword`), `POST /api/auth/resend-verification` (`resendVerificationEmail`), `GET /api/auth/export` (`downloadOwnDataUrl`, plain `<a href>` download), `POST /api/auth/delete` (`deleteOwnAccount`), `POST /api/auth/cancel-deletion` (`cancelAccountDeletion`), `POST /api/auth/sign-out-all` (`signOutAllDevices`, then client-side redirects to `/login`)
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)

## 2. Page Purpose

Central account-security and GDPR-rights page: email verification status/resend, data export, account deletion (grace-period, 30-day), sign-out-everywhere, and password change. No 2FA feature exists on this page or elsewhere in the codebase for the patient portal (confirmed by code inspection — no TOTP/2FA UI, state, or API call anywhere in `security-client.tsx`).

## 3. Primary User Tasks (priority order)

1. Change password (the single highest-frequency security action).
2. Verify email if unverified (blocks other portal features).
3. Sign out of all devices (incident-response action).
4. Download own data / delete account (GDPR rights, low frequency but high stakes).

## 4. Current Page Structure (top-to-bottom)

1. `PageHeader` — eyebrow "ACCOUNT", title "Security" (with `ShieldCheck` icon), subtitle
2. Conditional deletion-scheduled banner (only if a 30-day grace-period deletion is pending) + "Cancel deletion" inline action
3. `AdminSummaryStrip` — 4 stat cards: Email / Data export / Password / Account (status mirrors, non-interactive, availability-flavored rather than actionable)
4. `FormSection` "Email verification" — status text + conditional "Resend verification" button
5. `FormSection` "Your data" — "Download my data (JSON)" link + `DeleteAccountButton` (danger)
6. `FormSection` "Sign out of all devices" — single danger-styled button
7. `FormSection` "Change password" — 3 password fields (current/new/confirm) + own **"Update password"** button

## 5. Current Container Hierarchy (indented tree)

```
.gh-patient-page.gh-patient-security-page
├─ PageHeader
├─ [conditional] deletion-scheduled banner (own bordered box, not a FormSection — inconsistent container type vs. everything below it)
├─ [conditional] deletion-result message <p>
├─ AdminSummaryStrip
│  └─ 4× stat card — mostly decorative/non-actionable ("Password: Protected", "Account: Patient" convey close to zero information; "Data export: Available" and "Email: Verified" at least mirror real state)
└─ 4× FormSection, each → AdminCard(padding:0) → SectionHeader + .gh-form-section__grid → task content
   1. Email verification: icon + status text + conditional button — clean, no extra nesting
   2. Your data: 2 actions (download link + delete button) side-by-side via flex — clean, correctly groups 2 related GDPR actions in ONE FormSection (better pattern than Profile page's tab-per-form split)
   3. Sign out of all devices: single button — could arguably live inside "Your data" or a combined "Account controls" section rather than its own full FormSection for one button, but not miscategorized
   4. Change password: icon + <form> with 3 fields + submit — correctly self-contained, single save button, single task
```

This page's hierarchy is the cleanest of the three audited — no card-in-card nesting, no decorative-only wrapper levels beyond the standard `FormSection`→`AdminCard` chrome shared portal-wide. The one structural inconsistency is the deletion-scheduled banner using a different container type (raw bordered div) than the `FormSection` pattern used for every task below it.

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Password fields (current/new/confirm) | password inputs | Filled dummy current password + mismatched new/confirm, clicked "Update password" | Client-side guard fires BEFORE any network call: "New password and confirmation do not match." — confirmed no `changeCurrentPassword` API call is reachable on mismatch (code: early `return` before `setSavingPwd(true)`) | — | 19-security-desktop-password-mismatch-validation-01.png |
| Password fields | password inputs | New/confirm both set to "short1" (7 chars), clicked "Update password" | Client-side guard: "Password must be at least 8 characters." (length check also short-circuits before any API call) | — | 19-security-desktop-password-tooshort-validation-02.png |
| Password fields (dirtied, unsaved) | password inputs | Typed into "New password" only, did not submit, clicked "Profile" sidebar link | Navigated away instantly, **no unsaved-changes warning** | 19-001 | — |
| "Delete my account" button | button → `PortalDialog` | Clicked | Confirm dialog opens: "Delete your account?" / grace-period explanation / Cancel + "Schedule deletion" (danger) | — | 19-security-desktop-delete-account-dialog-03.png |
| Delete-account confirm dialog | modal | Pressed Escape (did NOT click "Schedule deletion") | Dialog closed, no mutation sent | — | 19-security-desktop-delete-dialog-after-escape-04.png |
| Keyboard Tab traversal from page top | keyboard | Pressed Tab ×6 | Focus landed inside the framework's dev-tools portal element in this local environment (`<nextjs-portal>`), not a meaningful in-page focus target — inconclusive for real focus-order verification in this dev build | 19-002 | 19-security-desktop-focus-visible-05.png |
| "Download my data (JSON)" link | `<a href>` | Not clicked (would trigger a real download from the live backend, and per brief file downloads require explicit user permission) | N/A | code-derived | — |
| "Sign out of all devices" button | button | Not clicked (would end the current session, explicitly listed as a destructive action to avoid in the brief) | N/A | code-derived | — |

## 7. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| 19-security-desktop-default-01/02.png | desktop | default | Baseline | 19-003 |
| 19-security-laptop-default-01/02.png | laptop | default | Density check | — |
| 19-security-tabletl-default-01/02.png | tabletl | default | 1024px breakpoint | — |
| 19-security-tabletp-default-01/02.png | tabletp | default | Portrait tablet | — |
| 19-security-mobile-default-01..03.png | mobile | default | 390px baseline | — |
| 19-security-smobile-default-01/02.png | smobile | default | 375px baseline | — |
| 19-security-short-default-01/02.png | short | default (1366×650) | Short-height clipping check | 19-004 |
| 19-security-desktop-password-mismatch-validation-01.png | desktop | mismatch submitted | Client-side validation, no live mutation | — |
| 19-security-desktop-password-tooshort-validation-02.png | desktop | too-short submitted | Client-side validation, no live mutation | — |
| 19-security-desktop-delete-account-dialog-03.png | desktop | delete-confirm modal open | Destructive-action confirm evidence | — |
| 19-security-desktop-delete-dialog-after-escape-04.png | desktop | after Escape closes modal | Escape-to-close confirmed | — |
| 19-security-desktop-focus-visible-05.png | desktop | after 6 Tab presses | Focus-order probe (inconclusive, see 19-002) | 19-002 |
| 19-security-mobile-default-06.png | mobile | reload at 390px | Mobile layout re-check | — |

## 8. UX Problems

**19-001 — No unsaved-changes protection on the Change-password form**
Severity: Medium
Category: Forms / Data loss
Evidence: Playwright-confirmed — typed "DirtyUnsavedPass1" into "New password", clicked "Profile" sidebar link without submitting; navigation happened instantly with the `dialog` event never firing.
User impact: Lower severity than losing medical data (Profile page), but still a real annoyance — a user who gets interrupted mid-password-change (e.g., needs to check email for a code first, clicks away) loses all 3 typed fields silently. Password fields are also uniquely painful to lose since they're invisible-by-default (masked), so users can't glance-recover what they typed.
Root cause: No dirty-state tracking on `currentPassword`/`newPassword`/`confirmPassword` in `security-client.tsx`.
Recommended resolution: Reuse the same shared unsaved-changes hook proposed for Profile (§17-002) and Family (§18-002) — wire it to this form's 3 password fields.

**19-002 — Focus-order verification inconclusive due to dev-tools overlay interference**
Severity: Low
Category: Accessibility (testing limitation, not a confirmed bug)
Evidence: 19-security-desktop-focus-visible-05.png — after 6 Tab presses from page load, `document.activeElement` resolved to the Next.js dev-tools portal element (`<nextjs-portal>`), not a real page control. This is very likely an artifact of the local dev server's dev-tools overlay intercepting early tab-stops, not a production behavior.
User impact: Unconfirmed — cannot assert a real focus-order defect from this evidence.
Root cause: Dev-only overlay in this environment.
Recommended resolution: N/A — re-test focus order against a production build (no dev overlay) before treating this as an accessibility issue. Flagged as an open question (§21), not filed as a real bug.

**19-003 — 4-stat `AdminSummaryStrip` mostly restates non-actionable/near-constant state**
Severity: Low
Category: Information hierarchy
Evidence: 19-security-desktop-default-01.png — "Password: Protected / Update credentials anytime" and "Account: Patient / Security controls" convey close to zero decision-relevant information (every patient's password is always "Protected" by definition, and "Account: Patient" is a static role label, not a security signal). Only "Email: Verified/Needs verification" and "Data export: Available" carry real state.
User impact: Minor — 2 of 4 stat tiles are filler, diluting the strip's usefulness as an at-a-glance status check (same "everything looks like a stat card" fatigue noted on the Profile page, §9 there).
Root cause: `AdminSummaryStrip` was populated with 4 items to match the visual rhythm of other portal pages (all `AdminSummaryStrip` usages across the audited pages show exactly 4 tiles) rather than 4 genuinely meaningful signals.
Recommended resolution: Replace "Password" and "Account" tiles with something state-bearing if available (e.g., "Password last changed: {date}" if that timestamp exists server-side, or "Active sessions: {count}" tied to the sign-out-all feature) — or reduce to a 2-tile strip and accept an asymmetric row rather than padding with filler. Flagging for product/data-availability input rather than prescribing a specific replacement metric (see §21).

**19-004 — Short-height viewport (1366×650): default screenshot captured mid-skeleton**
Severity: Low
Category: Responsive
Evidence: 19-security-short-default-01.png shows the loading skeleton (grey placeholder bars) rather than hydrated content, matching the same pattern seen on the Profile page's short-viewport capture (17-006) — likely a shared screenshot-timing artifact rather than a real per-page bug, since it reproduces identically on both pages using unrelated component trees.
User impact: Unconfirmed — flag only.
Root cause: Unknown, likely screenshot-helper timing rather than a UI defect.
Recommended resolution: N/A — Open Question (§21); if this reproduces on a manual re-check with a longer wait, it would suggest a shared root cause (e.g. slower i18n bundle hydration) worth investigating across the whole portal rather than per-page.

**19-005 — Deletion-scheduled banner uses a different container pattern than the rest of the page**
Severity: Low
Category: Container consistency
Evidence: Code-derived (`security-client.tsx` lines 148–166) — the conditional deletion banner is a raw `<div>` with its own border/background styling (`.gh-status-warning`), not a `FormSection`, while every other content block on the page (Email verification, Your data, Sign out, Change password) uses the shared `FormSection` wrapper.
User impact: Minor visual inconsistency only visible to the small subset of users with a pending deletion; not independently screenshotted since it requires a live deletion-scheduled account state, which wasn't available in this session — filed as code-derived.
Root cause: Banner was likely built as a one-off alert rather than routed through `FormSection`.
Recommended resolution: Low priority — leave as-is; a full-bleed alert banner is arguably the *correct* pattern for a time-sensitive account-level warning (distinct from routine settings sections), so this may not need to change. Noting for completeness per the brief's "document nesting/consistency" requirement, not recommending a forced fix.

## 9. Visual Design Problems

- Consistent with Family page: no card-in-card nesting found. `FormSection`'s single-level `AdminCard` wrapper is used correctly and uniformly across all 4 task sections.
- The danger-styled buttons (Delete account, Sign out of all devices) both use the same rose/red outline treatment, correctly differentiating destructive actions from the primary emerald "Update password" / outline emerald "Resend verification" / "Download my data" — good, consistent color-coding for action severity across the page.
- The deletion-scheduled banner's "Cancel deletion" button sits inline within the banner using `border-color: currentColor` matching the warning tone — small nice touch, no issue.

## 10. Information Hierarchy Problems

- "Data export" and "Password" stat tiles sit adjacent to each other in the 4-stat strip but represent very different levels of user concern (routine housekeeping vs. GDPR right) — see §8/19-003, the strip doesn't currently distinguish "informational" from "actionable" tiles visually.
- Section order (see §11) currently puts "Email verification" first even for already-verified users, where it becomes a no-action confirmation ("Verified on {date}") — for the common case (already verified), this is the least useful section to lead with; Change password (the actual highest-frequency task, per §3) is currently placed last, requiring a full page scroll to reach.

## 11. Section Ordering Review

**Current order**: Email verification → Your data (export/delete) → Sign out of all devices → Change password

**Recommended order**: Change password → Email verification → Sign out of all devices → Your data (export/delete)

Reasoning per position:
1. **Change password** promoted to first — it's the highest-frequency, lowest-stakes-to-attempt task (§3); currently buried last, requiring a full-page scroll past 3 other sections to reach the most commonly needed control.
2. **Email verification** moves to second — still important (blocks other portal features when unverified) but is a no-action confirmation for the majority of already-verified users; doesn't need to be first.
3. **Sign out of all devices** stays third — an incident-response action, correctly mid-priority (rare, but time-sensitive when needed; shouldn't be buried last next to GDPR housekeeping).
4. **Your data (export/delete)** moves to last — genuinely the lowest-frequency task set (GDPR rights are typically exercised once, if ever) and includes the single most destructive action on the page (delete account); placing it last matches the existing convention seen on the Profile page (Privacy/GDPR tab is also last) and reduces the chance of an accidental scroll-and-misclick near a destructive control.

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — 4 sections of this size (1 form + 3 button-driven actions) are comfortably scannable as a single scrolling page; converting to tabs would add navigation overhead for a page whose sections are mostly single-action, not multi-field forms warranting isolation. Keep the current `FormSection`-per-task pattern, just reordered per §11.

## 13. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (unchanged)
2. Deletion-scheduled banner (unchanged, conditional)
3. `AdminSummaryStrip` — revised to 2–4 genuinely state-bearing tiles (§8/19-003, pending data availability)
4. `FormSection` "Change password" (moved from 4th to 1st)
5. `FormSection` "Email verification" (moved from 1st to 2nd)
6. `FormSection` "Sign out of all devices" (unchanged, 3rd)
7. `FormSection` "Your data" (moved from 2nd to 4th/last)

## 14. Proposed Container Simplification

| Location | Current | Action |
|---|---|---|
| 4× `FormSection` task blocks | Single-level `AdminCard` wrapper each | **Keep** — no nesting issue found, this page is already the cleanest of the three audited |
| Deletion-scheduled banner | Raw bordered `<div>`, different pattern than `FormSection` | **Keep as-is** — appropriate pattern for a time-sensitive alert distinct from routine settings (§8/19-005) |
| "Sign out of all devices" as its own full `FormSection` for one button | Full `FormSection` (header + description + 1 button) | **Keep** — arguably could merge into "Your data" as a 3rd action, but sign-out-all is conceptually distinct (session security, not GDPR data rights) enough to warrant its own section; not recommending a forced merge |

## 15. Responsive Findings

- **Desktop/laptop/tabletl**: 4-stat strip stays 4-across; all `FormSection`s render as a 2-col internal grid collapsing to 1-col per the shared `gh-form-section__grid` breakpoint (900px, per `FormSection` component doc comment) — consistent with the rest of the portal.
- **tabletp (768px)**: Not independently interaction-tested beyond default capture.
- **mobile/smobile (390/375px)**: Buttons correctly go full-width (`w-full sm:w-auto` classes throughout) — good mobile-first button sizing already in place; no clipping observed.
- **short (1366×650)**: Default capture shows loading skeleton, not hydrated content (19-004) — same caveat as Profile page, inconclusive without a re-check.

## 16. Accessibility Findings

- Danger buttons (Delete account, Sign out of all devices) are text+icon, not icon-only — correctly labeled, no `aria-label` needed since visible text already describes the action.
- `PortalDialog` (delete-account confirm) closed cleanly via Escape during testing.
- **Gap**: identical to the Profile page — save/error messages (`pwdMsg`, `verifyMsg`, `deletionMsg`, `signOutMsg`) are plain `<p>` tags with no `role="status"`/`aria-live` (code-derived, `security-client.tsx` throughout) — a screen-reader user submitting the password-change form gets no announcement of "New password and confirmation do not match" or eventual success/failure.
- **Gap**: password fields correctly use `autoComplete="current-password"`/`"new-password"` (good — enables password-manager integration) but have no visible "show password" toggle; not a violation, just noting it's the plain masked-only pattern (acceptable, not flagging as an issue).
- Focus-order Tab-traversal test was inconclusive due to a dev-only overlay intercepting early tab stops (§19-002) — needs re-verification against a production build before any real finding can be filed.

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| "Update password" (submit button) | Keep — already task-specific | Good as-is |
| Delete-confirm dialog title "Delete your account?" + body explaining the 30-day grace period | Keep verbatim — this reads clearly and already states the consequence (unlike Family's remove-confirm, §18/17 there) | Already a strong example of destructive-action copy; no legal/medical flag needed but noting it as the "right" pattern other confirm dialogs on this portal should match |
| "Password: Protected" stat tile | Reword or replace per §8/19-003 | Vague/non-actionable as currently framed |
| "Account: Patient" stat tile | Reword or replace per §8/19-003 | Static role label, not security-relevant information |
| Sign-out description: "This ends every signed-in session, including this one — you'll need to log in again." | Keep verbatim | Already specific and consequence-stating, good example |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Unsaved-changes guard | Shared hook (same as Profile/Family) | Wire into `currentPassword`/`newPassword`/`confirmPassword` state | Shared | Medium | Medium |
| Section reorder | `security-client.tsx` | Move JSX block order: Change password → Email verification → Sign out → Your data | Page-specific | Low — purely presentational reorder | Low |
| Live-region save feedback | `security-client.tsx` | Add `role="status"`/`aria-live="polite"` to `pwdMsg`/`verifyMsg`/`deletionMsg`/`signOutMsg` paragraphs | Page-specific (same repeated pattern as Profile — candidate for the same shared `<SaveMessage>` atom noted there) | Low | Low |
| Stat-tile content revision | `security-client.tsx` (`AdminSummaryStrip items`) + possibly backend for new data (e.g. password-changed timestamp) | Replace "Password"/"Account" tiles with state-bearing equivalents, if data exists | Page-specific | Low (frontend) / Medium (if new backend field needed) | Low–Medium |

## 19. Recommended Implementation Order

1. Unsaved-changes guard (19-001) — bundle with Profile/Family fixes as one shared-hook rollout.
2. Live-region save feedback (accessibility gap) — cheap, bundle with Profile's equivalent fix.
3. Section reorder (§11) — low risk, immediate usability win (password change reachable without scrolling).
4. Focus-order re-verification against a production build (19-002) — needed before deciding whether any real accessibility fix is required here.
5. Stat-tile content revision (19-003) — depends on data availability; lowest priority, needs a product/data-availability check first.

## 20. Acceptance Criteria (measurable)

- Typing into any password field and clicking a sidebar nav link triggers a confirm dialog; canceling preserves the typed values.
- "Change password" is the first `FormSection` on the page, reachable without scrolling past Email verification/Your data/Sign out.
- Password-change validation errors (mismatch, too-short) are announced to screen readers without requiring focus to move (verified via `aria-live` region inspection).
- Re-running the Tab-traversal focus-order test against a production build (`next build && next start`, no dev overlay) resolves a real activeElement inside the page content, not a dev-tools portal node.

## 21. Open Questions

- Whether 19-004 (short-viewport skeleton capture, matching 17-006 on the Profile page) indicates a genuine shared hydration-timing issue across the portal — worth a dedicated investigation if it reproduces on manual re-check, since it appeared identically on 2 of the 3 audited pages.
- Whether any state-bearing replacement data exists for the "Password" and "Account" stat tiles (e.g., last-password-changed timestamp, active-session count) — not verifiable from frontend code alone; needs a backend/data-model check.
- Real focus-order behavior (19-002) needs re-testing outside the local dev environment before filing as an accessibility issue — current evidence is inconclusive due to Next.js dev-tools overlay interference.
- Whether 2FA is planned/roadmapped for the patient portal — confirmed absent in current code, but out of scope to speculate on product roadmap from this audit; noting only that the brief's "2FA if present" instruction found nothing to test.
