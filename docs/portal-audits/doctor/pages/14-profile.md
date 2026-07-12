# 14 — My Profile (country picker) — `/doctor/profile`

## 1. Page Identification
- **Name:** My profile — country picker
- **Route:** `/doctor/profile`
- **Entry points:** breadcrumb "Profile" on any `/doctor/profile/[country]` page; `accountHref` on the account menu (`frontend/app/(doctor)/doctor/layout.tsx:171`). NOT in the sidebar for multi-country doctors — the sidebar renders one direct link per active market instead (`layout.tsx:106-113`).
- **Role:** DOCTOR (test account "Dr. Global Health", GP, markets: Czechia primary + Ireland active; Portugal listed but inactive)
- **Workflow:** choose which country's profile to edit (multi-market doctors only). Single-market doctors get the full editor inline on this route (code path, not testable with this account).
- **Frontend files:** `frontend/app/(doctor)/doctor/profile/page.tsx`, `frontend/app/(doctor)/doctor/profile/loading.tsx`, `frontend/app/(doctor)/doctor/profile/_components/profile-sections.tsx` (single-market branch)
- **Shared components:** `PageHeader` (portal-atoms), `FormSkeleton` (portal-skeletons)
- **APIs observed:** `fetchDoctorMe()` server-side (backend `/api/doctor/me` via proxy)
- **Date:** 2026-07-12. **Viewports tested:** all 7 (desktop/laptop/tabletl/tabletp/mobile/smobile/short). **States tested:** default (multi-market picker), error (code-derived), single-market (code-derived), loading (code-derived).

## 2. Page Purpose
Disambiguation step: a doctor listed in ≥2 countries picks which country profile (bio, registration, payout) to edit. Replaces a prior silent auto-redirect (comment at `page.tsx:27-30`).

## 3. Primary Doctor Tasks (priority order)
1. Pick the country profile to edit (only task).
2. Understand which market is primary vs additional.
3. (Latent) see per-country completeness — NOT currently supported (see 10).

## 4. Clinical/Operational Importance
Low-frequency administrative page. No clinical data. Wrong-country edits waste time but registration/payout are per-country and guarded downstream, so risk is low.

## 5. Current Page Structure (top-to-bottom)
1. Compliance reminder banner (portal-wide, dismissible)
2. PageHeader hero card ("DOCTOR / My profile" + picker description)
3. 2-col grid of country link cards (Czechia · Primary market, Ireland · Additional market)
4. Nothing else — ~60% of the desktop viewport is empty (14-profile-desktop-default-01.png)

## 6. Current Container Hierarchy
```
page main
├── compliance banner (card)
├── PageHeader (large hero card w/ gradient)
└── grid
    ├── gh-card link (Czechia)   [icon + 2 lines]
    └── gh-card link (Ireland)
```
No excess nesting — 2 surface levels. The hero PageHeader card is the heaviest element on a page with 2 links; visually top-heavy but consistent with portal-wide pattern.

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Czechia card | link | click | → `/doctor/profile/czechia` | — | 14-profile-desktop-default-01.png |
| Ireland card | link | click | → `/doctor/profile/ireland` | — | same |
| Dismiss compliance reminder | button | click | banner hides | portal-wide, not page-specific | same |
| Sidebar "Profile (Czechia/Ireland)" | links | click | bypass this page entirely | page redundancy, 14-001 | same |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Multi-market picker | ✅ | ✅ | 2 cards render | — |
| Single-market (inline editor) | — | ✅ `page.tsx:65-68` | renders ProfileSections directly | audited in 15 |
| fetchDoctorMe error | — | ✅ `page.tsx:15-23` | bare warning banner, no retry | 14-003 |
| Loading | — | ✅ `loading.tsx` | FormSkeleton ×3 sections | skeleton shape ≠ picker shape (cosmetic) |
| Empty (0 active markets) | — | ✅ | falls through to editor with `activeMarket=null` | edge, low |

## 9. Screenshots
| File | Viewport | State | Reason | Issues |
|---|---|---|---|---|
| 14-profile-desktop-default-01.png | 1440×900 | default | baseline | 14-001, 14-002 |
| 14-profile-laptop-default-01.png | 1280×720 | default | — | — |
| 14-profile-tabletl-default-01.png | 1024×768 | default | — | — |
| 14-profile-tabletp-default-01.png | 768×1024 | default | grid collapse | — |
| 14-profile-mobile-default-01.png | 390×844 | default | 1-col stack OK | — |
| 14-profile-smobile-default-01.png | 375×667 | default | — | — |
| 14-profile-short-default-01.png | 1366×650 | default | both cards above fold ✅ | — |

## 10. UX Problems
- **14-001 · Medium · Redundant interstitial for the common path.** Browser evidence: sidebar already carries "Profile (Czechia)" and "Profile (Ireland)" direct links (`layout.tsx:106-113`), so this page is only reached via the breadcrumb "Profile" or account menu — and then it asks the doctor to make a choice the sidebar already made one click cheaper. Doctor impact: extra click, mild confusion about which entry point is canonical. Root cause: picker added to fix silent auto-redirect, but sidebar per-country links shipped too. Resolution: keep the page (deep-link target) but make the account-menu `accountHref` point at the primary market's editor, and/or remember last-edited country (cookie) and offer "Continue editing Czechia" as the first card.
- **14-002 · Medium · Picker cards carry no decision-relevant status.** Browser evidence: cards show only country name + Primary/Additional (14-profile-desktop-default-01.png), yet the editor reveals per-country differences that would drive the choice: Ireland is verified with payout data, Czechia is "Needs verification" with payout **Missing**. Doctor impact: cannot see which profile needs attention without opening each. Root cause: `page.tsx:41-59` renders only `country.name` + market label; `doctor.markets[]` already contains `isVerified` and `bank.ibanSet`. Resolution: add two status chips per card ("Verified/Needs verification", "Payout on file/missing") from data already fetched — frontend-only.
- **14-003 · Low · Error state is a dead end.** Code evidence: `page.tsx:15-23` renders the API message in a warning banner with no retry/refresh affordance. Resolution: add a "Try again" button (router.refresh) — shared fix with page 15.

## 11. Visual Design Problems
- **14-004 · Low · Top-heavy composition.** The gradient hero card is ~3× the visual weight of the actual content (two 72px cards) and the lower 60% of the desktop viewport is empty. Acceptable under portal-wide PageHeader convention; fixing 14-002 (richer cards) rebalances it without new patterns.

## 12. Information Hierarchy Problems
Who/what first is fine (country name → market role). Missing layer: per-country status (14-002). No competing surfaces.

## 13. Current Section Order
1. Compliance banner → 2. PageHeader → 3. Country cards

## 14. Recommended Section Order
Same order. Only change is card content (14-002) and optional "last edited" affordance (14-001). No reordering justified for a 2-element page.

## 15. Tabs/Steps/Sectioning Recommendation
None. Page is a fork, not a flow. Do not tab-ify.

## 16. Save & Finalization Recommendation
N/A — no mutations on this page.

## 17. Proposed Page Structure
1. PageHeader (unchanged)
2. Country cards, each with: country name · Primary/Additional · verification chip · payout chip · (optional) "Last edited" hint

## 18. Proposed Container Simplification
Keep both cards; no flattening needed (2 levels). No removals.

## 19. Responsive Findings
| Viewport | Result |
|---|---|
| desktop 1440×900 | OK; large empty region below cards |
| laptop 1280×720 | OK |
| tabletl 1024×768 | OK, 2-col holds |
| tabletp 768×1024 | 2-col holds at `sm:grid-cols-2` |
| mobile 390×844 | 1-col stack, full-width tap targets ≥56px ✅ |
| smobile 375×667 | OK |
| short 1366×650 | all content above fold ✅ |

## 20. Accessibility Findings
- Cards are real `<Link>`s with visible text — good.
- `Globe2` icon `aria-hidden` ✅.
- Heading order: single H1 ✅.
- Focus: `gh-card` links rely on default focus ring; keyboard Tab reaches both cards (browser-verified via dump control order). No issues found.
- Hover state changes background only (`hover:bg-[var(--portal-well)]`) — add the same treatment on `:focus-visible` if not inherited from `gh-card` (code-derived, verify in css).

## 21. Content & Microcopy Findings
| Current | Recommended | Why |
|---|---|---|
| "Primary market" / "Additional market" | keep, add status chips | market role alone doesn't inform choice |
| Picker description "…registration, bio, and payout details are saved per country." | keep | accurate, sets the mental model |

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| DoctorProfilePage | `frontend/app/(doctor)/doctor/profile/page.tsx` | status chips on cards (14-002); retry in error branch (14-003) | no | low | S |
| Doctor layout | `frontend/app/(doctor)/doctor/layout.tsx:171` | point accountHref at primary market editor (14-001, optional) | doctor portal chrome | low | XS |

## 23. Backend or Business-Logic Impact
None. All data (`isVerified`, `bank.ibanSet`) already in `fetchDoctorMe()` payload. Frontend-only.

## 24. Recommended Implementation Order
1. 14-002 status chips (biggest value, S)
2. 14-003 retry button (shared with page 15)
3. 14-001 accountHref/last-edited (optional)

## 25. Acceptance Criteria
- Each country card shows verification + payout status sourced from `doctor.markets[]`; matches the editor page's badges exactly.
- Error state renders a working "Try again" control.
- No layout shift at any of the 7 audit viewports; cards remain ≥44px touch targets.

## 26. Open Questions
- Should the account menu deep-link to the primary market instead of this picker? (Fable/owner call — nav IA.)
- Portugal appears in "Also listed in" downstream but has no active market (404 at `/doctor/profile/portugal`) — is an inactive listing supposed to be visible to the doctor anywhere? (see 15-001, same root data.)
