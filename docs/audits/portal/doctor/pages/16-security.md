# 16 — Doctor Security (`/doctor/security`)

## 1. Page Identification
- **Name:** Doctor Security / Two-Factor Authentication
- **Route:** `/doctor/security`
- **Entry points:** Sidebar nav (Account group → "Security"); dashboard/portal-wide compliance banner link "Enable two-factor authentication" (verified — routes to `/doctor/security`, browser-confirmed)
- **Role:** DOCTOR
- **Workflow position:** Account/compliance settings, not part of any clinical task flow
- **Frontend files:**
  - `frontend/app/(doctor)/doctor/security/page.tsx`
  - `frontend/app/(doctor)/doctor/security/_components/security-form.tsx`
- **Shared components used:** `PageHeader` (`frontend/app/(admin)/admin/_components/atoms.tsx`, re-exported via `components/portal-atoms.ts`), `PortalShell` (`frontend/components/portal-shell.tsx`), `ComplianceBanner` (`frontend/app/(doctor)/doctor/_components/compliance-banner.tsx`)
- **APIs observed (network-verified):**
  - `GET /api/auth/2fa/status` (via `fetchTwoFactorStatus`)
  - `POST /api/auth/2fa/setup` → 200, returns `{secret, qrUri, backupCodes}` (network-verified, body captured then discarded — see §7 safety note)
  - `POST /api/auth/2fa/confirm` (code-derived, not invoked — would enable 2FA)
  - `POST /api/auth/2fa/disable` (code-derived, not invoked)
- **Date:** 2026-07-12
- **Viewports tested:** desktop 1440×900, laptop 1280×720, tabletl 1024×768, tabletp 768×1024, mobile 390×844, smobile 375×667, short 1366×650 (all 7, browser-verified)
- **States tested:** default/not-enabled (browser), 2FA setup step-1 in progress (browser), partial code entry + navigate-away (browser), dashboard compliance-banner deep link (browser). Not tested (would mutate account): confirmed-2FA-enabled view, disable-2FA view — both **code-derived** from `security-form.tsx`.

## 2. Page Purpose
Lets a doctor enroll in TOTP-based two-factor authentication, required before the platform's "strict" medical-record access guard is enforced for that account (per `compliance-banner.tsx` comment: "shown while the medical-access guard runs relaxed"). This is a compliance/security gate, not general account settings.

## 3. Primary Doctor Tasks (priority order)
1. Enable 2FA (scan QR / enter setup key in an authenticator app, save backup codes, confirm with a 6-digit code + current password)
2. Disable 2FA (requires current password) — only visible once enabled
3. (Not present on this page — see §10) Change account password
4. (Not present on this page — see §10) View/revoke active sessions or sign out of other devices

## 4. Clinical/Operational Importance
High. Per the confidentiality agreement text itself (browser-verified, `/doctor/confidentiality`): "I will... use two-factor authentication where available." The platform gates "patient-record protections" on this being enabled (compliance banner + page copy, both browser-verified). Doctors who skip it keep full record access under a "relaxed" guard — a real security/compliance gap for a PHI-handling system, not just UX polish.

## 5. Current Page Structure (top-to-bottom)
1. `PageHeader`: eyebrow "Compliance", H1 "Two-factor authentication" (title string is literally "Two-factor authentication", not "Security" — see §21), description sentence
2. Single content card, one of four mutually-exclusive states:
   - Loading skeleton
   - Load error banner
   - **Enabled state** (code-derived): green confirmation banner + "Disable 2FA" form (current-password field only)
   - **Not-enabled state** (browser-verified, default for test account): explanatory paragraph + "Enable 2FA" button
   - **Setup-in-progress state** (browser-verified): step 1 (secret + otpauth URI, each in a copyable `<code>` field), step 2 (10 backup codes in a grid), step 3 (current-password + 6-digit code form)

## 6. Current Container Hierarchy
```
main
└─ PageHeader (gh-portal-page-header) — card-styled, shared component     [surface 1]
└─ .gh-card (content card)                                                [surface 1]
   └─ (not-enabled state) button "Enable 2FA"
   └─ (setup state) 3× inline `<h2>` sub-sections, no extra card wrappers
      └─ CopyableField: <code> pill (bordered, `--portal-well` bg)        [surface 2]
      └─ backup-codes grid: bordered/well-bg container                    [surface 2]
```
Browser-verified via `page.evaluate` surface-detection scan on the not-enabled state: only **2 surface levels** detected (PageHeader card + content card) — the page itself is flat, no card-in-card stacking. The `gh-portal-page-header` "card" look is the shared PageHeader treatment used on every portal page, not a page-specific redundant card — do not flag it for removal in isolation.
**Unnecessary levels:** none on this page. This is one of the leaner pages in the portal.

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Compliance-banner link "Enable two-factor authentication" (dashboard) | link | click | Navigates to `/doctor/security` | Works correctly — deep link verified | `16-security-laptop-dashboard-banner-01.png`, `16-security-laptop-deeplink-landed-01.png` |
| "Enable 2FA" button | button | click | Calls `POST /api/auth/2fa/setup`, renders 3-step setup UI | None functionally; see §10 for the unsaved-changes gap | `16-security-laptop-setup-step1-redacted-01.png` (secret/backup codes redacted post-capture per safety rules — never persisted un-redacted) |
| 6-digit code field, partially filled ("123456") then hard-navigate to `/doctor/appointments` | input + nav | fill + `page.goto` | Navigation succeeds immediately, **no confirm dialog**, setup state silently discarded | **Issue 16-004** — no unsaved-change guard | n/a (behavioral, no dialog to capture) |
| Copy buttons on secret/otpauth fields | button | click | Copies to clipboard, button label flips to "Copied" for 1.5s | None observed | not captured (would require exposing secret) |
| "Disable 2FA" form / button | form | — | Not exercised (would need 2FA enabled first, which requires completing setup — explicitly out of scope per safety rules) | Code-derived only | — |
| Keyboard Tab from page load | keyboard | 15× Tab | Focus walks entire sidebar (15 links: logo → Overview → … → Security) before reaching any page content | **Issue 16-005** — no skip-to-content link (shell-wide) | — |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Loading | — | ✓ | Skeleton with `sr-only` status text | None |
| Load error | — | ✓ | Warning-styled message box | None |
| Not enabled (default) | ✓ | ✓ | Matches code | None |
| Setup step 1–3 | ✓ | ✓ | Renders correctly; secret/QR/backup codes generated fresh per attempt (server doesn't persist until confirm) | None functionally, but see §10 re: guard |
| Enabled | — | ✓ | Green confirmation + disable form (not triggered, avoided mutating account) | Not browser-verified |
| Disabled-just-now | — | ✓ | Success message via `disabledSuccess` string | Not browser-verified |

## 9. Screenshots
| Filename | Viewport | State | Reason | Issues shown |
|---|---|---|---|---|
| `16-security-desktop-default-01.png` | 1440×900 | default (not enabled) | Matrix baseline | 3-card vertical stack, generous whitespace |
| `16-security-laptop-default-01.png` | 1280×720 | default | Matrix baseline | Same |
| `16-security-tabletl-default-01.png` | 1024×768 | default | Matrix baseline | — |
| `16-security-tabletp-default-01.png` | 768×1024 | default | Matrix baseline | — |
| `16-security-mobile-default-01.png` | 390×844 | default | Matrix baseline | Breadcrumb truncates to "Se" (16-002) |
| `16-security-smobile-default-01.png` | 375×667 | default | Matrix baseline | Same truncation |
| `16-security-short-default-01.png` | 1366×650 | default | Fold check | All 3 blocks (banner, header, card) fit above the fold with room to spare — no fold issue on this page |
| `16-security-laptop-dashboard-banner-01.png` | 1280×720 | dashboard, compliance banner visible | Verify banner + deep link source | Banner correctly lists only outstanding items |
| `16-security-laptop-deeplink-landed-01.png` | 1280×720 | landed on `/doctor/security` via banner link | Confirm deep link target | Landed correctly, URL matches |
| `16-security-laptop-setup-step1-redacted-01.png` | 1280×720 | 2FA setup step 1–3, secrets redacted | Show setup flow structure | `<code>` values replaced with "REDACTED" client-side before capture — secret/backup codes never written to disk |

## 10. UX Problems
**16-001 (High, browser+code-verified).** No password-change and no session-management ("sign out of other devices" / individual session list) on this page, despite the nav label being "Security" and the brief expecting them here. The patient-facing equivalent (`/account/security`, `frontend/app/(auth)/account/security/_components/security-client.tsx`) has three tabs — Password, Access (email verify + sign-out-all), Data (GDPR export/delete) — built on `changeCurrentPassword` / `signOutAllDevices` from `lib/api/auth-api.ts`. Both API functions exist and are exported; the doctor page simply never imports them. A doctor account is a higher-value target (PHI access) than a patient account, and currently has a *narrower* security surface than the patient portal.
- Root cause: `frontend/app/(doctor)/doctor/security/_components/security-form.tsx` only imports 2FA endpoints (`fetchTwoFactorStatus`, `setupTwoFactor`, `confirmTwoFactor`, `disableTwoFactor`); never imports `changeCurrentPassword` or `signOutAllDevices`.
- Recommendation: Add a "Password" tab and an "Access" tab to the doctor security page using the same `PortalTabs` + `FormSection` pattern already built for `/account/security` — this is largely a copy/adapt job, not new design work. Reuse `changeCurrentPassword`/`signOutAllDevices` from `lib/api/auth-api.ts` unchanged (they're role-agnostic auth endpoints). See §15/§17 for exact proposed structure.

**16-002 (Low, browser-verified).** Header breadcrumb truncates to "Se" on mobile (390px) and smobile (375px) — `16-security-mobile-default-01.png`. Cosmetic but reads as broken.
- Root cause: breadcrumb component has no responsive abbreviation logic for `rootBreadcrumb`/current-page label pairing at narrow widths; likely shared `PortalShell` breadcrumb behavior (shell-wide, not page-specific).
- Recommendation: hide the breadcrumb trail below ~420px and show only the current page label ("Security"), or truncate with an ellipsis instead of a mid-word cut.

**16-003 (Medium, code-derived).** Page H1 reads "Two-factor authentication" while the sidebar nav item and breadcrumb both say "Security" (`d.nav.security` = "Security" vs `d.securityPage.title` = "Two-factor authentication" — `locales/en/doctor.json`). Combined with 16-001, this mislabeling makes sense today (the page genuinely is 2FA-only) but will become actively misleading once password-change/sessions are added under the "Security" umbrella, since the H1 would then describe only one of several sub-sections.
- Recommendation: change H1 to "Security" and demote "Two-factor authentication" to a section/tab heading — do this in the same pass as 16-001 so the IA and copy land together.

**16-004 (Medium, browser-verified).** No unsaved-change guard during 2FA setup. Filled the 6-digit code field with a value, then hard-navigated to `/doctor/appointments` via `page.goto` (simulating a doctor clicking a sidebar link mid-setup) — no native `beforeunload`/router-level confirm dialog appeared (`dialogSeen: false` in test harness), and the in-progress setup (freshly generated secret + 10 backup codes, none saved yet) is silently discarded. Compare to `/account/security`'s `useUnsavedChanges(Boolean(currentPassword || newPassword || confirmPassword))` hook (`frontend/lib/hooks/use-unsaved-changes.ts`), which the doctor security page never calls despite the setup flow having equivalent(-or-higher) stakes — a discarded backup-codes set means re-doing 2FA setup from scratch.
- Recommendation: call `useUnsavedChanges(Boolean(setup))` (or `Boolean(code || confirmPassword)`) in `security-form.tsx`, mirroring the existing hook usage in the patient security page.

**16-005 (Medium, browser-verified, shell-wide — not specific to this page).** No skip-to-content link. Tab order from page load walks all ~15–19 sidebar nav links before reaching any page-content control (verified via 15-step keyboard Tab trace). Every doctor-portal page inherits this from `PortalShell`.
- Recommendation: add a visually-hidden "Skip to main content" link as the first focusable element in `frontend/components/portal-shell.tsx`, landing on the `<main>` region. One shared fix covers all doctor/admin/patient pages.

## 11. Visual Design Problems
None specific to this page beyond 16-002. Card styling, spacing, and color use are consistent with the rest of the portal (Obsidian Ivory / lux tokens).

## 12. Information Hierarchy Problems
The "who/when/status/action" framing (per brief §3) applies loosely here since this is a settings page, not a record list — but the *status* (2FA on/off) and the *action* (enable/disable) are both immediately visible with no scrolling, which is correct. The gap is scope, not hierarchy (see 16-001).

## 13. Current Section Order
1. Compliance banner (shell-level, conditional)
2. PageHeader (eyebrow/title/description)
3. 2FA card (status + action)

## 14. Recommended Section Order (+ reasons)
1. Compliance banner (unchanged — shell-level)
2. PageHeader, retitled "Security" (16-003) — sets correct scope expectation
3. Tabs: **Password** | **Two-factor authentication** | **Sessions** — default tab = whichever is incomplete/most urgent (mirrors patient page's `activeTab` default logic, adapted to prioritize the compliance-relevant tab, i.e. default to "Two-factor authentication" if not yet enabled, else "Password")
   - Reasoning: groups all identity/credential controls under one page (matches nav label), avoids a 4th top-level nav item, and reuses an already-built tab pattern (`PortalTabs`) instead of inventing new IA.

## 15. Tabs/Steps/Sectioning Recommendation
Exact structure (adapting the already-built `/account/security` pattern 1:1, since the same `PortalTabs`/`FormSection`/`AdminSummaryStrip` primitives already exist and are portal-shared):
```
PageHeader ("Security")
AdminSummaryStrip (optional — 2FA status / password-last-changed / active-sessions count)
PortalTabs (syncParam="tab")
  ├─ tab="password"  → FormSection "Change password" (current/new/confirm fields, uses changeCurrentPassword)
  ├─ tab="2fa"        → existing DoctorSecurityForm content, unchanged
  └─ tab="access"     → FormSection "Sign out of other devices" (uses signOutAllDevices)
```
Do NOT fold in email-verification or GDPR data-export/delete tabs from the patient page — those are patient-account-specific (a doctor's email is typically set by admin onboarding, not self-verified; GDPR self-delete for a doctor account has clinical/records implications and needs its own legal review, not a copy-paste). Flag this scope boundary for Fable review (see final message).

## 16. Save & Finalization Recommendation
No change needed to the existing 2FA save semantics (setup → confirm is already a clear two-step commit with password re-entry, matching security best practice). If a Password tab is added, follow the exact pattern already in `/account/security`'s `onChangePassword` (client-side match + length check before hitting the API) — do not invent a new validation scheme.

## 17. Proposed Page Structure (exact top-to-bottom)
1. Compliance banner (unchanged)
2. PageHeader — eyebrow "Security", title "Security", description "Manage your password, two-factor authentication, and active sessions."
3. `PortalTabs` (Password / Two-factor authentication / Sessions)
4. Active tab panel content (existing 2FA card reused verbatim for that tab; new Password/Sessions panels built from the patient-page pattern)

## 18. Proposed Container Simplification
- **Keep:** PageHeader card, 2FA content card (already flat, no changes needed)
- **Add:** `PortalTabs` wrapper (one new shared-pattern element, not a new card style)
- **No flattening needed** — this page was already lean; the fix here is scope (add tabs), not de-nesting.

## 19. Responsive Findings (per viewport)
- **desktop/laptop/tabletl/tabletp:** No issues. Card widths cap sensibly, no overflow.
- **mobile/smobile:** Breadcrumb truncation (16-002); otherwise fully usable, buttons full-width where appropriate (backup-codes grid drops to `grid-cols-2` per Tailwind `sm:grid-cols-5`, browser-consistent with code).
- **short (1366×650):** No fold problem — this page's content is short enough that even the "Complete your compliance setup" banner + header + card all fit without scrolling. Contrast with longer doctor pages where this viewport is more likely to be an issue.

## 20. Accessibility Findings
- Heading order: single H1 present, no skipped levels on this page (`16-security-laptop-*` dumps show one `H1: Two-factor authentication`, no H2s in the not-enabled state; setup state adds `<h2>` step headers correctly nested — code-verified in `security-form.tsx` lines 212–233).
- Focus visibility: not specifically spot-checked with a contrast tool here; standard portal focus rings apply (shared CSS, not page-specific).
- Keyboard nav: works but is inefficient — 15+ Tab presses to reach page content (16-005, shell-wide).
- Icon-only buttons: none on this page (all buttons have visible text labels — "Enable 2FA", "Copy", "Disable 2FA").
- Status not color-only: the enabled/not-enabled state is conveyed via icon (`ShieldCheck`/`ShieldOff`) + text, not color alone — good.
- Modal focus trap: N/A, no modal on this page (setup flow is inline, not a dialog).
- Touch targets: "Enable 2FA" and copy buttons are comfortably sized (`px-5 py-2.5` / `px-2.5 py-2`) — no issue observed at mobile viewports.
- No skip link (16-005).

## 21. Content & Microcopy Findings
| Current | Recommended | Reason |
|---|---|---|
| H1 "Two-factor authentication" (nav says "Security") | "Security" | 16-003 — scope mismatch once password/sessions are added |
| "Enable 2FA" (button, also used as compliance-banner link text: "Enable two-factor authentication") | Keep as-is | Clear, action-oriented, no issue |
| "Preparing…" (setup-start loading label) | Keep | Clear |
| Date format via `formatAppDate` (e.g. "9 Jul 2026") | Keep | Consistent with rest of portal |

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| `DoctorSecurityForm` | `frontend/app/(doctor)/doctor/security/_components/security-form.tsx` | Wrap existing content in a "2FA" tab panel; add Password + Sessions panels | No (doctor-only) | Low — additive, existing 2FA logic untouched | Medium |
| `PortalTabs` | `frontend/components/PortalTabs.tsx` | Reuse, no change | Yes (already used by patient security page, admin pages) | None | Trivial |
| `useUnsavedChanges` | `frontend/lib/hooks/use-unsaved-changes.ts` | Reuse, no change (16-004 fix just calls it) | Yes | None | Trivial |
| `auth-api.ts` (`changeCurrentPassword`, `signOutAllDevices`) | `frontend/lib/api/auth-api.ts` | Reuse, no change | Yes (role-agnostic) | None | Trivial |
| `locales/*/doctor.json` (`securityPage`) | `frontend/locales/{en,cs,de,es,pt,ro}/doctor.json` | Add new keys for Password/Sessions tab copy + retitle `title` | N/A | Low | Medium (6 locale files) |
| `PortalShell` | `frontend/components/portal-shell.tsx` | Add skip-to-content link (16-005) | Yes (all portals) | Low | Low |

## 23. Backend or Business-Logic Impact
- 16-001/tabs proposal: **frontend-only** — `changeCurrentPassword` and `signOutAllDevices` endpoints already exist and are already used by the patient portal against the same underlying auth system (`lib/api/auth-api.ts` is role-agnostic, calls `/api/auth/*`). No backend change needed to add these to the doctor page.
- 16-004 (unsaved-change guard): frontend-only, client-side hook.
- 16-005 (skip link): frontend-only.
- No clinical/legal review needed for the Password/Sessions tabs (identical to already-shipped patient functionality). If a GDPR data-export/delete tab is ever considered for doctors (explicitly NOT recommended in §15), that would need legal review — flagged, not proposed here.

## 24. Recommended Implementation Order
1. 16-005 skip-link (shell-wide, unblocks nothing else, ship independently)
2. 16-004 unsaved-changes guard (small, isolated fix to `security-form.tsx`)
3. 16-002 breadcrumb truncation (shell-wide fix, independent)
4. 16-001 + 16-003 together (add Password/Sessions tabs + retitle H1 — one coordinated change since retitling before the tabs exist would be premature)

## 25. Acceptance Criteria (measurable)
- Doctor can change their password from `/doctor/security` without navigating elsewhere; success/error messaging matches the pattern already used on `/account/security`.
- Doctor can sign out of all other devices from `/doctor/security`.
- Starting 2FA setup, filling any field, then navigating away triggers a confirm dialog (verified via the same `page.on("dialog")` harness used in this audit).
- Page H1 reads "Security"; "Two-factor authentication" appears as a tab label/sub-heading only.
- Skip-to-content link is the first Tab stop on every doctor-portal page and lands focus on `<main>`.

## 26. Open Questions
- Should "Sessions" show a literal list of active sessions (device/IP/last-active, individually revocable) or just a single "sign out everywhere" action like the patient portal currently has? The patient portal itself only has the blunt sign-out-all — building a real per-session list would be new work for both portals, not a copy job. Recommend scoping the doctor page to match patient parity first (sign-out-all only), then revisit per-session listing as a separate, larger feature for both portals if wanted.
- Should the 2FA "required before patient-record protections are enforced" language be enforced anywhere yet (i.e., is the "strict" guard mode actually wired up), or is it still aspirational copy? Not verifiable from the frontend alone — needs backend/access-guard code check, out of scope for this page audit.
