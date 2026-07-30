# 17 — Doctor Confidentiality Agreement (`/doctor/confidentiality`)

## 1. Page Identification
- **Name:** Doctor Confidentiality & Data Protection Agreement
- **Route:** `/doctor/confidentiality`
- **Entry points:** Sidebar nav (Account group → "Confidentiality"); dashboard/portal-wide compliance banner ("Accept confidentiality agreement" bullet, only shown when not yet accepted — not exercisable for the browser-verified test account, which had already accepted; confirmed via code in `compliance-banner.tsx` line 76)
- **Role:** DOCTOR
- **Workflow position:** One-time (per agreement version) compliance step, alongside 2FA (see `16-security.md`)
- **Frontend files:**
  - `frontend/app/(doctor)/doctor/confidentiality/page.tsx`
  - `frontend/app/(doctor)/doctor/confidentiality/_components/confidentiality-form.tsx`
- **Shared components used:** `PageHeader`, `PortalShell`, `ComplianceBanner`
- **APIs observed:**
  - `fetchDoctorConfidentialityAgreement()` (server-side, `lib/api/doctor-api.ts`) — returns `{accepted, acceptedAt, agreementText, currentVersion}`, browser-verified via rendered content ("Version 1.0.0", accepted 9 Jul 2026)
  - `POST /api/doctor/confidentiality-agreement` (code-derived — the accept action; not invoked, this account had already accepted so the unchecked/accept-button state could not be re-triggered without an irreversible-adjacent mutation, and this is a legal-agreement acceptance record, which the safety rules treat as data not to mutate for audit purposes)
- **Date:** 2026-07-12
- **Viewports tested:** desktop, laptop, tabletl, tabletp, mobile, smobile, short (all 7, browser-verified, accepted state only)
- **States tested:** Accepted (browser-verified, test account's actual state). Not-yet-accepted / checkbox-gated state: **code-derived only** from `confidentiality-form.tsx` (see §8).

## 2. Page Purpose
Displays the versioned doctor confidentiality/data-protection agreement text and records the doctor's acceptance. It is a **legal-consent record**, not a settings page — closer in kind to a terms-of-service acceptance than to "security" controls.

## 3. Primary Doctor Tasks (priority order)
1. Read the agreement text
2. Check "I have read and agree..."
3. Click "Accept agreement"
4. (Post-acceptance) Nothing further — the page becomes a read-only receipt showing when it was accepted

## 4. Clinical/Operational Importance
High but one-time. Per the compliance banner, patient-record protections are only enforced once this AND 2FA are both done. The agreement text itself (browser-verified full text) covers PHI confidentiality, need-to-know access, audit logging, account security (mentions 2FA), data handling, breach notification, and GDPR/regulatory compliance — this is a legally-meaningful document, not filler copy.

## 5. Current Page Structure (top-to-bottom)
1. Compliance banner (shell-level, conditional — only when something's outstanding)
2. `PageHeader`: eyebrow "Compliance", H1 "Confidentiality agreement", description "Version {N}. Accepting this agreement is required before patient-record protections are enforced." — **static wording regardless of accepted state** (see §21)
3. Content card:
   - If accepted: green receipt banner ("You accepted the current confidentiality agreement on {date}. No further action is needed.")
   - Full agreement text, in a fixed-height (`max-h-[26rem]`) scrollable box, shown in **both** accepted and not-accepted states
   - If not accepted (code-derived): checkbox + "Accept agreement" button (disabled until checked)

## 6. Current Container Hierarchy
```
main
└─ PageHeader (gh-portal-page-header)                    [surface 1]
└─ .gh-card                                               [surface 1]
   └─ accepted-receipt banner (bg-emerald-50)              [surface 2]
   └─ agreement-text box (bordered, --portal-well bg)       [surface 2]
   └─ (not-accepted) checkbox + button — no extra wrapper
```
Flat — 2 surface levels, same pattern as the security page. No unnecessary nesting.

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Agreement text box | scroll container | scroll | Independently scrollable at `max-h-[26rem]` (~416px) regardless of viewport height | See §10 (17-002) | `17-confidentiality-laptop-default-01.png` |
| Sidebar "Confidentiality" nav link | link | click (via matrix/dump) | Navigates correctly, matches URL | None | — |
| Checkbox + "Accept agreement" button | form | not exercised (account already accepted; safety rules bar re-testing an already-recorded legal acceptance flow to avoid altering the acceptance timestamp/version-linkage) | — | Code-derived only | — |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Accepted (receipt view) | ✓ | ✓ | Matches code exactly — green banner + full text, no checkbox/button | None |
| Not accepted (checkbox-gated) | — | ✓ | Checkbox unchecked → "Accept agreement" disabled (`disabled={!checked || submitting}`) — standard gate pattern | Not browser-verified; recommend a one-time verification via a fresh/reset test doctor account outside this audit |
| Submitting | — | ✓ | Button label → "Recording…" | Not browser-verified |
| Error | — | ✓ | Rose-styled inline message, `backendUnavailable` on fetch throw, `defaultError` on non-ok response | Not browser-verified |

## 9. Screenshots
| Filename | Viewport | State | Reason | Issues shown |
|---|---|---|---|---|
| `17-confidentiality-desktop-default-01.png` | 1440×900 | accepted | Matrix baseline | — |
| `17-confidentiality-laptop-default-01.png` | 1280×720 | accepted | Matrix baseline | Static "required" copy despite already-accepted state (17-001) |
| `17-confidentiality-tabletl-default-01.png` | 1024×768 | accepted | Matrix baseline | — |
| `17-confidentiality-tabletp-default-01.png` | 768×1024 | accepted | Matrix baseline | — |
| `17-confidentiality-mobile-default-01.png` | 390×844 | accepted | Matrix baseline | Breadcrumb truncates "Co…" (mirrors 16-002) |
| `17-confidentiality-smobile-default-01.png` | 375×667 | accepted | Matrix baseline | Same |
| `17-confidentiality-short-default-01.png` | 1366×650 | accepted | Fold check | Fits without scrolling the outer page (inner agreement box has its own scroll) |

## 10. UX Problems
**17-001 (Low, browser-verified).** Header description text is static and says the agreement is "required" even when the doctor has already accepted it and the receipt banner directly below says "No further action is needed." Mildly contradictory on first read (`descriptionVersion` string is not conditioned on `accepted`, `frontend/app/(doctor)/doctor/confidentiality/page.tsx` line 33).
- Recommendation: branch the description — accepted: "You're compliant with the current version." / not accepted: current "required" copy.

**17-002 (Low, code-derived, doctor-impact minor).** The agreement text lives in a short fixed-height scroll box (`max-h-[26rem]` ≈ 416px) even on tall viewports (e.g. 1440×900 has ~700px of vertical room below the header) — browser-verified in `17-confidentiality-desktop-default-01.png`, where the text box shows only ~6 lines before requiring an inner scroll despite significant unused page height beneath the card. For a first-time reader being asked to actually read and agree to a legal document, an artificially short scroll box is friction, not fewer choices.
- Root cause: fixed Tailwind `max-h-[26rem]` in `confidentiality-form.tsx` line 66, not viewport-relative.
- Recommendation: change to a viewport-relative max-height (e.g. `max-h-[min(60vh,32rem)]`) so taller screens show more of the agreement without scrolling.

**17-003 (Medium, IA question, not a bug — see final message for Fable review).** "Confidentiality" and "Security" (2FA) are two separate top-level nav items under Account, each essentially a single compliance checkbox with its own page, header, and card. Both exist purely to satisfy the same "compliance gate" mentioned in the shared banner. This is a legitimate question about whether they should be:
   (a) kept separate (current — clean separation of "legal consent" vs "auth/security control", arguably correct since they're different *kinds* of thing), or
   (b) merged into one "Compliance" page with two sections/tabs (would reduce nav-item count and put the compliance banner's two bullets on one destination instead of two).
- This audit's read: **keep separate** (option a). A confidentiality *agreement* is a legal artifact (versioned, timestamped, immutable once accepted) fundamentally different from a *security control* (togglable, revocable). Merging them would blur that distinction and complicate the Security page's proposed tab structure (16-security.md §15) by cramming an unrelated legal-consent flow into a "Password/2FA/Sessions" tab set. Flagging for Fable review per brief since it's a nav/IA-shape decision, not a clear-cut fix.

## 11. Visual Design Problems
None specific to this page. Consistent with portal styling.

## 12. Information Hierarchy Problems
None — for a one-shot consent page, "what needs agreeing to, and did I already agree" is immediately visible with no scroll (aside from 17-002's cramped text box).

## 13. Current Section Order
1. Compliance banner (shell-level)
2. PageHeader
3. Content card (receipt + agreement text [+ checkbox/button if not accepted])

## 14. Recommended Section Order (+ reasons)
No reordering needed — the order is already correct for a consent flow (status first, evidence/text second, action last). Only the description copy (17-001) and scroll-box sizing (17-002) need fixing, not the structure.

## 15. Tabs/Steps/Sectioning Recommendation
None needed. This is correctly a single, short, single-purpose page — do NOT add tabs here, and (per 17-003) do NOT merge it into the Security page's tab set.

## 16. Save & Finalization Recommendation
Current pattern (checkbox must be checked, single "Accept agreement" button, immediately becomes a read-only receipt) is correct and matches expectations for a one-time legal-consent action. No changes recommended.

## 17. Proposed Page Structure (exact top-to-bottom)
Unchanged from current, with two copy/style fixes:
1. Compliance banner (unchanged)
2. PageHeader — description now conditional on `accepted` (17-001)
3. Content card — agreement text box uses viewport-relative max-height (17-002)

## 18. Proposed Container Simplification
No structural change — already flat (2 surfaces). Keep as-is.

## 19. Responsive Findings (per viewport)
- **desktop/laptop:** Text box under-uses available vertical space (17-002).
- **tabletl/tabletp:** Proportionally similar, less pronounced since less vertical room to spare anyway.
- **mobile/smobile:** Breadcrumb truncation (shared with 16-002), otherwise fine — text box scrolling works normally via touch.
- **short (1366×650):** No fold issue — everything fits; the short outer viewport actually matches this page's fixed-height text box reasonably well (unlike taller viewports where it looks stingy).

## 20. Accessibility Findings
- Heading order: single H1 ("Confidentiality agreement"), no skipped levels (browser-verified, no H2s present on this page's content).
- Agreement text box: plain `<div>` with `overflow-y-auto`, not a `<textarea>`/`role="document"` region — scrollable via mouse wheel and (code-inspection) focusable-by-click-then-arrow-keys is NOT guaranteed since the div has no `tabIndex`. **17-004 (Low, code-derived):** keyboard-only users cannot Tab directly into the scrollable text region to scroll it with arrow keys; they'd need to use Page Down on the whole page instead, which works but is not obviously discoverable. Recommend adding `tabIndex={0}` and `role="region"` with an `aria-label` (e.g. "Confidentiality agreement text") to the scroll container.
- Checkbox: has an associated `<label>` wrapping both input and text — correctly labeled (code-verified).
- Status not color-only: accepted state uses icon (`CheckCircle2`) + text, not color alone — good.
- Skip link: none (shell-wide issue, see 16-005 in the security-page audit — same fix covers this page).

## 21. Content & Microcopy Findings
| Current | Recommended | Reason |
|---|---|---|
| Description static regardless of accepted state | Branch by `accepted` (17-001) | Avoid contradicting the receipt banner directly below |
| "No further action is needed." | Keep | Clear, reassuring |
| "Accept agreement" | Keep | Clear, unambiguous (avoids brief's flagged "vague Submit/Save" pattern) |

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| `page.tsx` | `frontend/app/(doctor)/doctor/confidentiality/page.tsx` | Branch description string on `result.data.accepted` | No | Low | Trivial |
| `ConfidentialityForm` | `frontend/app/(doctor)/doctor/confidentiality/_components/confidentiality-form.tsx` | Change `max-h-[26rem]` to viewport-relative; add `tabIndex`/`role`/`aria-label` to scroll div | No | Low | Trivial |
| `locales/*/doctor.json` (`confidentiality.descriptionVersion` + new `descriptionAccepted` key) | 6 locale files | Add one new key per locale | N/A | Low | Low |

## 23. Backend or Business-Logic Impact
Frontend-only for all three findings (17-001, 17-002, 17-004). No API or schema change needed — `accepted`/`currentVersion` are already returned by `fetchDoctorConfidentialityAgreement()`.

## 24. Recommended Implementation Order
1. 17-002 (scroll-box height) — trivial, isolated
2. 17-004 (keyboard scroll region) — trivial, isolated
3. 17-001 (conditional description) — trivial, needs 1 new locale key × 6 files
4. 17-003 IA question — resolve via Fable review before touching nav structure; this audit's recommendation is "keep separate, no change"

## 25. Acceptance Criteria (measurable)
- Header description differs between accepted and not-accepted states.
- Agreement text box shows materially more content without scrolling on ≥900px-tall viewports (measured: at least 10 lines visible vs. current ~6).
- Agreement text region is reachable via Tab and scrollable via arrow keys once focused.
- No change to the accept-button gating logic (checkbox required, disabled until checked) — regression check only.

## 26. Open Questions
- 17-003: confirm with Fable whether Confidentiality should stay a standalone nav item (this audit's recommendation) or be folded into a merged "Compliance" page alongside 2FA.
- Not browser-verifiable in this session: the not-accepted/checkbox-gated state and the accept-submission flow, since the test doctor account had already accepted the current agreement version and re-testing acceptance would mutate a legal-consent record outside this audit's read-mostly discipline. Recommend a follow-up pass with a fresh/unaccepted test account if pixel-exact verification of that state is needed.

---

## Doctor Portal Shell Inventory (shared across all pages — recorded here per brief instruction)

Source: `frontend/components/portal-shell.tsx` + `frontend/app/(doctor)/doctor/layout.tsx`, browser-verified via matrix screenshots on both audited pages.

- **Sidebar** (dark, `gh-admin-sidebar`-family styling): logo + "DOCTOR PORTAL" wordmark at top, "MEDICINE ANYTIME ANYWHERE" tagline pinned at bottom. Grouped nav, exact groups/order (browser-verified):
  - **OVERVIEW:** Overview
  - **SCHEDULE:** Appointments, Messages, Calendar, Availability
  - **PRACTICE:** Patients, My Services, Forms
  - **FINANCE:** Invoices, Reports
  - **ACCOUNT:** Notifications (badge count), Profile (single item, or one per active market when doctor practices in 2+ countries — browser-verified: this test doctor showed "Profile (Czechia)" + "Profile (Ireland)" as two separate items), Security, Confidentiality
- **Header** (light, sticky): breadcrumb ("Doctor › {page}") — truncates awkwardly on mobile (16-002/shared); language switcher button ("EN" with globe-ish icon, dropdown — not deep-tested this pass); notification bell with unread-count dot, opens a popover (not opened this pass, out of scope for these two pages); user menu button ("DG" avatar initials + "Dr. Global Health" name, dropdown for profile/sign-out).
- **Compliance banner** (conditional, shell-injected via `layout.tsx`'s `banner` prop): amber-accented card between header and page content, shows only outstanding items (confidentiality/2FA), each item a direct link to its page, dismissible per-session via `sessionStorage` (reappears next session if still outstanding — intentional per code comment, not a bug).
- **Mobile nav:** sidebar collapses behind a hamburger icon at narrow widths (browser-verified in mobile/smobile screenshots — hamburger icon visible top-left, sidebar itself not expanded/tested open in this pass since it's a shell-wide component already covered by other page audits).
- **No skip-to-content link** anywhere in the shell (16-005) — the single highest-leverage a11y fix available, since it's one shell-level change that benefits every page in the doctor (and likely admin/patient) portal.
