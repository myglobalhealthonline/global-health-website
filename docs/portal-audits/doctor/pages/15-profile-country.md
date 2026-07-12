# 15 — My Profile — country editor — `/doctor/profile/[country]`

## 1. Page Identification
- **Name:** My profile — per-country editor (audited: `/doctor/profile/czechia`, `/doctor/profile/ireland`)
- **Route:** `/doctor/profile/[country]` (also rendered inline at `/doctor/profile` for single-market doctors — same component tree)
- **Entry points:** sidebar "Profile (Czechia)" / "Profile (Ireland)" links; picker cards on `/doctor/profile`; breadcrumbs.
- **Role:** DOCTOR. Test account: Czechia primary (needs verification, payout missing), Ireland additional (verified, payout on file), Portugal in `additionalCountries` but market inactive.
- **Workflow:** edit public profile (name, bio ×6 locales, qualifications, languages, WhatsApp), country registration details, payout bank details, profile photo.
- **Frontend files:** `frontend/app/(doctor)/doctor/profile/[country]/page.tsx`, `_components/profile-sections.tsx`, `_components/edit-form.tsx`, `frontend/app/(doctor)/doctor/profile/loading.tsx`
- **Shared components:** `PageHeader`, `AdminSummaryStrip` (portal-atoms), `FormSection` (→ `AdminCard` + `SectionHeader`), `PortalTabs`, `RichTextHtmlField` (borrowed from admin: `app/(admin)/admin/_components/rich-text-html-field.tsx`), `PhoneField`, `LanguagePicker`
- **APIs observed:** `fetchDoctorMe()` (SSR); `PATCH /api/doctor/profile`; `PATCH /api/doctor/profile/markets/[countryId]` (registration + payout, proxy at `app/api/doctor/profile/markets/[countryId]/route.ts`); `POST/DELETE /api/doctor/profile/photo`
- **Date:** 2026-07-12. **Viewports:** all 7. **States tested:** default (CZ + IE), payout validation errors, dirty-then-navigate, bio locale tab switch, inactive-country 404, intermittent load failure (observed), loading/error/save-success (code-derived where noted). Per audit safety rules nothing was saved.

## 2. Page Purpose
Single place where a doctor maintains everything patient-facing (public profile per country) plus private payout details, with admin-managed items surfaced read-only.

## 3. Primary Doctor Tasks (priority order)
1. Edit bio/qualifications/languages that patients see.
2. Enter/maintain payout IBAN (blocking for getting paid — CZ currently **Missing**).
3. Maintain registration body/number (feeds admin verification).
4. Upload/replace profile photo.
5. Check what is admin-managed vs self-serve.

## 4. Clinical/Operational Importance
High operational: payout missing = doctor doesn't get paid; unverified registration = listing credibility. Public bio is the doctor's storefront. No direct clinical data, but WhatsApp number enables patient contact.

## 5. Current Page Structure (top-to-bottom, desktop)
1. Compliance banner
2. PageHeader hero ("My profile — Czechia")
3. **AdminSummaryStrip** — 4 stat cards: Primary country CZ · Markets **3** · Categories 0 · Languages 5
4. **"Practice context" card** — dl grid: primary country, also listed in (incl. Portugal), URL slug, categories, consultation types
5. Two-column grid:
   - Left: **ProfileInsight strip** (3 more stat tiles: Markets **2** / Verified 1/2 / Payout Missing) → **Public profile** FormSection (name, bio ×6 locale tabs with full rich-text editor each, qualifications, languages, WhatsApp, nested **Czechia registration** sub-card, Save changes) → **Payout details** FormSection (holder, IBAN, BIC, Save payout details)
   - Right aside: **Profile photo** card → **Admin-managed** note card

## 6. Current Container Hierarchy
```
page main
├── compliance banner (card)
├── PageHeader (hero card)
├── AdminSummaryStrip (4 × stat card)                 ← surface level 2
├── Practice context (gh-card)                        ← duplicates strip content
└── grid
    ├── column
    │   ├── gh-card p-4
    │   │   └── 3 × ProfileInsight tile (border+bg+radius)   ← card-in-card, duplicates strip again
    │   ├── FormSection (AdminCard L3)
    │   │   ├── fields…
    │   │   ├── bio tabs → 6 × RichTextHtmlField (each its own bordered toolbar surface)
    │   │   └── registration sub-card (border+bg well)        ← card-in-card (justified: distinct verification scope)
    │   └── FormSection (AdminCard L3) payout
    └── aside
        ├── Profile photo (gh-card)
        └── Admin-managed (gh-card)
```
4 visible surface levels in the ProfileInsight block (page > card > tile > pill/badge). Max should be 3. The unnecessary levels are: the ProfileInsight wrapper card (15-002) and the duplication between strip / practice-context / insight tiles.

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Bio locale tabs (6) | PortalTabs | click "English" | tabpanel swaps, editor shows fallback/blank | roving tabindex ✅ | 15-profile-country-ie-desktop-bio-english-tab-01.png |
| Rich-text toolbar | buttons/selects | inspect | 6 buttons with empty accessible name (color swatches) | 15-008 | cz-desktop-scrolled-mid-01.png |
| Full name input | text | edit, then SPA-nav to Overview | **navigated, edits silently lost** | 15-003 | cz-desktop-dirty-nav-result-01.png |
| Save changes | submit | not clicked (mutation) | sends 2 PATCHes (profile + market) | scope note 15-006 | — |
| IBAN field | text | fill "BADIBAN" + BIC "123", submit | client-side errors, no request fired | validation ✅ | cz-desktop-payout-validation-01.png |
| Save payout details | submit | blocked by validation | inline red errors under both fields | ✅ | same |
| Replace/Remove photo | buttons | not clicked (mutation) | remove uses native `confirm()` | 15-011 | — |
| Language picker | combobox+chips | inspected | Remove-{lang} buttons labelled ✅ | — | — |
| WhatsApp PhoneField | select+tel | inspected | default country Ireland (+353) on CZ page | 15-015 | cz-desktop-scrolled-bottom-01.png |
| `/doctor/profile/portugal` | URL | goto | 404 Page not found | 15-001 context | 15-profile-country-pt-desktop-notfound-01.png |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Default CZ | ✅ | ✅ | full render, 0 console errors | — |
| Default IE | ✅ | ✅ | per-market values swap correctly (reg no. 542074, EN default bio) | — |
| Payout validation error | ✅ | `edit-form.tsx:109-124` | inline errors, submit blocked | — |
| Dirty + SPA nav | ✅ | `edit-form.tsx:257-264` | no guard, edits lost | 15-003 |
| Dirty + hard nav/close | — | ✅ beforeunload | browser prompt | bio excluded, 15-004 |
| Save success | — | ✅ `edit-form.tsx:455-464` | banner + router.refresh re-baselines snapshots | banner not aria-live, 15-009 |
| Load failure | ✅ (intermittent, mobile matrix run) | `[country]/page.tsx:18-26` | "Could not load doctor profile", no retry | 15-012 |
| Inactive market slug | ✅ | `[country]/page.tsx:31` notFound() | generic 404 | 15-001 |
| Loading | — | ✅ loading.tsx | FormSkeleton ×3 | — |
| Photo upload >5MB | — | ✅ `edit-form.tsx:345-348` | client-side size error | — |

## 9. Screenshots
Dir: `docs/portal-audits/doctor/screenshots/15-profile-country/`
| File | Viewport | State | Reason | Issues |
|---|---|---|---|---|
| 15-profile-country-cz-desktop-default-01.png | desktop | default top | baseline; shows Markets **3** strip | 15-001, 15-002 |
| 15-profile-country-cz-desktop-scrolled-mid-01.png | desktop | mid-scroll | bio editor, insight tiles, toolbar | 15-002, 15-008 |
| 15-profile-country-cz-desktop-scrolled-bottom-01.png | desktop | bottom | registration card, payout, IE placeholders | 15-005, 15-015 |
| 15-profile-country-cz-desktop-payout-validation-01.png | desktop | validation error | IBAN/BIC inline errors | — (pass) |
| 15-profile-country-cz-desktop-dirty-fullname-01.png | desktop | dirty form | name edited pre-nav | 15-003 |
| 15-profile-country-cz-desktop-dirty-nav-result-01.png | desktop | after SPA nav | landed on /doctor, no warning | 15-003 |
| 15-profile-country-ie-desktop-default-01.png | desktop | IE default | practice context identical to CZ | 15-007 |
| 15-profile-country-ie-desktop-bio-english-tab-01.png | desktop | tab switched | locale tab behavior | — |
| 15-profile-country-pt-desktop-notfound-01.png | desktop | 404 | inactive market dead end | 15-001 |
| 15-profile-country-cz-{laptop,tabletl,tabletp,mobile,smobile,short}-default-01.png | 6 viewports | default | responsive matrix | 15-012 (mobile frame caught load-failure), 15-013 (short) |
| 15-profile-country-cz-mobile-retest-01.png | mobile | default retest | confirms mobile renders fine on reload | 15-012 |

## 10. UX Problems
- **15-001 · High · Two contradictory market counts on one screen, plus a phantom market.** Browser evidence: AdminSummaryStrip says "MARKETS 3 · Active country listings" while the ProfileInsight tile 500px below says "MARKETS 2" (cz-desktop-default-01.png vs scrolled-mid). "Also listed in: Portugal (PT), Ireland (IE)" names Portugal, but Portugal's market is inactive — `/doctor/profile/portugal` 404s and the sidebar/picker only show 2 countries. Root cause: `profile-sections.tsx:56` computes `1 + additional.length` from `doctor.additionalCountries` (includes inactive Portugal); `edit-form.tsx:530` uses `initial.markets.length` (active-market rows). Doctor impact: cannot trust the page's own numbers; may believe they're listed in Portugal when patients can't see them there (or vice versa — either way the truth is invisible). Resolution: compute both from one source — active markets — and render Portugal in "Also listed in" only with an explicit "(inactive)" qualifier, or drop it. Frontend-only.
- **15-002 · High · Three stacked summary surfaces repeat the same facts before any editable field.** Browser evidence: AdminSummaryStrip (4 cards) → Practice context card → ProfileInsight tile strip (3 tiles) all restate country/markets/status; first input (Full name) appears ~1500px down at desktop. Owner keeps AdminSummaryStrip strips per audit brief — the genuinely useless layer is the **ProfileInsight strip** (`edit-form.tsx:525-550, 918-943`): "Markets 2" duplicates the strip, "Editing Czechia" duplicates the H1, "Payout Missing" is the only new fact. Root cause: three components added at different times, none removed. Resolution: delete the ProfileInsight card; move the one valuable signal (payout status, verification) into the AdminSummaryStrip (replace the low-value "Languages 5" card) and keep Practice context as the single detail surface. Cuts one full surface level and ~180px of scroll.
- **15-003 · High · Unsaved edits are silently destroyed by in-app navigation.** Browser evidence: edited Full name, clicked sidebar "Overview" — navigated instantly, no prompt, edits gone (dirty-nav-result-01.png). Code evidence: `edit-form.tsx:257-264` registers only `beforeunload`, which Next.js App Router client-side navigation never fires. Dirty tracking already exists (`isProfileDirty`/`isPayoutDirty`). Doctor impact: a doctor who painstakingly edits a 6-locale bio and taps any sidebar item loses everything. Resolution: intercept SPA nav while dirty — Next lacks a built-in router guard, so use the established pattern (block via `PortalDialog` confirm on link clicks within the portal shell, or a small `useUnsavedChangesGuard` hook that patches `router.push` / listens on link clicks). This is a **shared-primitive candidate** — same gap likely exists on other portal forms; needs Fable review before building.
- **15-004 · Medium (code-derived) · Bio edits are invisible to dirty tracking.** `edit-form.tsx:206-211` comment admits RichTextHtmlField is uncontrolled/read-on-submit and excluded from the snapshot. So even the `beforeunload` guard doesn't fire for the highest-effort field on the page. Resolution: have RichTextHtmlField expose an `onDirty` callback (or compare innerHTML on demand) and OR it into `isProfileDirty`.
- **15-005 · Medium · Irish example data as placeholders on every country's payout form.** Browser evidence: on the **Czechia** page, IBAN placeholder is "IE29 AIBK 9311 5212 3456 78" and BIC "AIBKIE2D" (cz-desktop-scrolled-bottom-01.png); the account-holder placeholder pattern also risks doctors reading grey placeholder text as an already-saved value (payout is actually **Missing** here). Root cause: single hardcoded locale strings `doctor.json:445,449`. Resolution: per-country example IBANs keyed off `activeMarket.country.code` (CZ: "CZ65 0800 0000 1920 0014 5399"), or a neutral "Enter IBAN, e.g. CZ65 …" format hint.
- **15-006 · High · Save scope is misrepresented: global fields live inside a country-scoped form.** Browser evidence: the "Public profile" section header says "Patients see this on your **Czechia** doctor card… saved per country", yet Full name, qualifications, languages, WhatsApp inside it PATCH the **global** `/api/doctor/profile` (`edit-form.tsx:419-433`) and change all countries at once; only bio translations + registration go to the per-country endpoint. Doctor impact: a doctor "fixing their name for Czechia" silently renames themselves in Ireland; conversely they may re-enter identical qualifications per country expecting isolation. Root cause: one FormSection mixes two save scopes under a country-labeled heading. Resolution (frontend-only): split "Public profile" into "Identity & contact — applies to all countries" (name, qualifications, languages, WhatsApp) and "Czechia listing" (bio locales + registration); one Save per scope; description strings per scope. Structural change → Fable review.
- **15-012 · Medium · Intermittent load failure with a dead-end error state.** Browser evidence: mobile matrix capture caught "Could not load doctor profile" (cz-mobile-default-01.png); immediate retest rendered fine (cz-mobile-retest-01.png) — transient `fetchDoctorMe` failure under parallel load. Code evidence: `[country]/page.tsx:18-26` bare banner, no retry. Resolution: add retry affordance (shared with 14-003); optionally one server-side retry on fetch failure.
- **15-013 · Medium · Short-viewport fold buries the doctor's actual tasks.** Browser evidence (short 1366×650, cz-short-default-01.png): fold shows banner + hero + stat strip; Practice context is cut off and no editable field or the "Payout Missing" alert is visible. Fixing 15-002 largely fixes this.

## 11. Visual Design Problems
- **15-016 · Low · Hardcoded Tailwind palette on verification badge.** `edit-form.tsx:654-658` uses `border-emerald-200 bg-emerald-50 text-emerald-700` instead of portal `gh-status-*` tokens (theme fidelity per RESPONSIVE_DESIGN_SYSTEM_PLAN). Swap to `gh-status-success` / neutral token classes.
- Inline `style={{ fontFamily, fontSize: 16, fontWeight: 800 }}` headings repeated 3× (`edit-form.tsx:811-818, 899-906`, `profile-sections.tsx:82-87`) — extract to the existing card-title class. Low, rolled into 15-002 work.
- Pill/border density inside ProfileInsight tiles (border+bg+radius on tile inside bordered card) — resolved by deleting the strip (15-002).

## 12. Information Hierarchy Problems
What a doctor must see first: (1) anything blocking — payout missing / needs verification; (2) what patients currently see; (3) edit affordances. Currently blocking facts are buried in the third summary strip below two decorative summaries (15-002), and the page-level primary action is ambiguous between two Save buttons a full viewport apart. The most actionable datum on the whole page — "Payout: Missing" — has no link/anchor to the payout form.

## 13. Current Section Order
1. Hero → 2. Summary strip → 3. Practice context → 4. Insight tiles → 5. Public profile form (with registration nested) → 6. Payout form → aside: 7. Photo → 8. Admin-managed note

## 14. Recommended Section Order
1. Hero (keep)
2. Summary strip (keep, re-purposed cards: Country · Verification · Payout status [anchor-links to payout form] · Markets)
3. **Identity & contact (global scope)** form
4. **Country listing (bio + registration, per-country scope)** form
5. **Payout details** form
6. Aside: Photo (photo is identity — keep top of aside), Practice context (demoted: read-only reference), Admin-managed note
Reasons: blocking status first with a path to fix it; edit surfaces before read-only reference; scope-honest grouping (15-006); one summary surface instead of three.

## 15. Tabs/Steps/Sectioning Recommendation
Do **not** tab the page: payout + bio are visited in the same session rarely enough that a long scroll with 3 clearly-headed FormSections beats hidden tabs, and the aside pattern matches the rest of the portal. Keep the existing bio **locale** tabs (PortalTabs) exactly as-is — right pattern. If Fable wants tighter structure later: tabs "Profile / Payout" is the only defensible split, but it hides the Payout-missing task — recommend against.

## 16. Save & Finalization Recommendation
- Keep independent forms (bank validation must never block a bio save — the code comment's rationale at `edit-form.tsx:16-25` is correct).
- Move from 2 to 3 saves only if 15-006 split is adopted; label each button with its scope: "Save identity (all countries)", "Save Czechia listing", "Save payout details".
- Add SPA-nav dirty guard (15-003) covering all forms including bio (15-004).
- Success/error banners get `role="status"` (`aria-live="polite"`) (15-009).
- Photo remove: replace native `confirm()` with `PortalDialog` (15-011) — portal primitive rule.

## 17. Proposed Page Structure (exact top-to-bottom)
1. PageHeader "My profile — Czechia"
2. AdminSummaryStrip: `CZ Czechia` · `Verification: Needs verification` · `Payout: Missing → #payout` · `Markets: 2`
3. FormSection "Identity & contact — applies to all your countries": full name, qualifications, languages, WhatsApp, [Save identity]
4. FormSection "Czechia listing": bio locale tabs (6), registration sub-card w/ verification badge, [Save Czechia listing]
5. FormSection "Payout details (Czechia)" `id=payout`: holder, IBAN, BIC, [Save payout details]
6. Aside: Profile photo card → Practice context (compact dl) → Admin-managed note

## 18. Proposed Container Simplification
- **Remove:** ProfileInsight wrapper card + 3 tiles (`edit-form.tsx:525-550`, `ProfileInsight` fn 918-943) — facts merge into summary strip.
- **Keep:** AdminSummaryStrip (owner keeps strips); FormSection cards; registration sub-card (distinct verification scope justifies the one card-in-card); photo card.
- **Flatten/move:** Practice context card → compact `dl` in the aside (rows, no grid-of-grids); drop its duplicated "Primary country" (already in strip) and "Categories" (already in strip) rows — keep URL slug, also-listed-in (with active/inactive truth), consultation types.
- **Dividers over cards:** inside Practice context use plain dt/dd rows, no sub-surfaces.
- Net surface levels: 4 → 3.

## 19. Responsive Findings
| Viewport | Result |
|---|---|
| desktop 1440×900 | OK; 15-002 scroll cost |
| laptop 1280×720 | OK, 2-col holds |
| tabletl 1024×768 | OK |
| tabletp 768×1024 | aside stacks below forms — photo lands very deep (post-15-002 reorder mitigates); registration grid `sm:grid-cols-3` gets cramped ~230px/field, acceptable |
| mobile 390×844 | renders fine on retest (cz-mobile-retest-01.png); rich-text toolbar wraps to 2 rows, usable; no horizontal overflow observed |
| smobile 375×667 | as mobile |
| short 1366×650 | 15-013: no editable field above fold |
Sticky elements: none covering content on this page ✅. Console errors: none at any viewport.

## 20. Accessibility Findings
- **15-008 · Medium · 6 unnamed icon-only toolbar buttons** (color swatches in RichTextHtmlField, browser dump shows `text: ""`). Fix in `app/(admin)/admin/_components/rich-text-html-field.tsx` (shared with admin) — `aria-label="Text color: green"` etc.
- **15-009 · Medium (code-derived) · Save/error banners not announced.** `MessageBanner` (`edit-form.tsx:84-94`) is a plain `<p>`; screen-reader users get no feedback after Save. Add `role="status"`.
- **15-010 · Low · Heading order skips H2** (H1 → H3 "Practice context…"; browser-verified heading dump). Demote-proof fix: make card titles H2, or keep H3s but add visually-hidden H2s per region.
- Bio tabs: PortalTabs has roving tabindex + arrow keys ✅; tabpanels use `hidden` correctly; recommend `aria-labelledby` wiring tabpanel→tab (code-derived, PortalTabs consumers don't pass ids).
- Focus visibility on inputs: `gh-input` token focus ring present (spot-checked visually) ✅.
- Status not color-only: "Needs verification" badge has text ✅; validation errors are text + color ✅.
- Native `confirm()` for photo removal is keyboard-accessible but unstyled/untranslated-chrome (15-011).
- Touch targets: Save buttons and photo buttons ≥44px ✅; toolbar swatches ~24px — below target (same fix vehicle as 15-008).

## 21. Content & Microcopy Findings
| Current | Recommended | Why |
|---|---|---|
| "Patients see this on your Czechia doctor card… saved per country." (over global fields) | Split copy per scope: "Applies to all your countries" vs "Shown only on your Czechia listing" | 15-006 — currently false for 4 of the fields |
| IBAN placeholder "IE29 AIBK 9311 5212 3456 78" on CZ page | country-matched example or "e.g. CZ65 …" | 15-005 |
| "MARKETS 3 · Active country listings" | "Markets 2" from active markets everywhere; "Also listed in Portugal (PT) — inactive" | 15-001 |
| "Save changes" | "Save Czechia listing" / "Save identity (all countries)" | scope clarity |
| Hero: "…ping support if anything there needs to change." | "…contact support…" | "ping" too casual for a clinical product, and it's the string doctors in 6 locales get |
| "Payout — Missing" tile | keep wording, make it a link to #payout | actionability |
| "Admin-managed" aside title | "Managed by Global Health admins" | plainer |

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| ProfileSections | `frontend/app/(doctor)/doctor/profile/_components/profile-sections.tsx` | single market-count source (15-001); strip re-purpose; practice-context demotion (18) | no | low | S |
| DoctorProfileEditForm | `frontend/app/(doctor)/doctor/profile/_components/edit-form.tsx` | delete ProfileInsight (15-002); scope split (15-006); banner role=status (15-009); PortalDialog for photo remove (15-011); token badge (15-016); dirty guard hookup (15-003/004) | no | med (largest file on page) | M |
| RichTextHtmlField | `frontend/app/(admin)/admin/_components/rich-text-html-field.tsx` | aria-labels + target size on swatches (15-008); onDirty callback (15-004) | **yes — admin portal uses it** | med | S |
| Unsaved-changes guard | new hook or portal-shell extension | SPA-nav dirty prompt (15-003) | **yes — portal-wide primitive** | med | M |
| doctor.json ×6 locales | `frontend/locales/*/doctor.json` | placeholder/scope/microcopy strings (15-005, 21) | doctor portal | low | S |
| Picker/editor error state | both profile pages | retry button (15-012, 14-003) | no | low | XS |

## 23. Backend or Business-Logic Impact
- All High findings are frontend-only; endpoints already separate global vs market scope correctly — the UI just mislabels them (15-006).
- Per-country IBAN examples: static strings, no backend.
- Optional (not required): backend could expose `marketsActiveCount` to prevent future double-derivation; not needed if frontend derives from `markets[].active` once.
- No clinical/legal review needed; payout copy already states encryption + privacy correctly.

## 24. Recommended Implementation Order
1. 15-001 single market-count source + inactive-market truth (XS, kills a trust bug)
2. 15-002 delete ProfileInsight strip, enrich summary strip (S; also fixes 15-013)
3. 15-003/15-004 dirty guard incl. bio (M, needs the shared hook — Fable sign-off)
4. 15-006 scope split + button labels + locale strings (M, structural — Fable sign-off)
5. 15-008/15-009/15-010 a11y batch (S)
6. 15-005/15-015/15-016/15-011/21 polish batch (S)
7. 15-012/14-003 retry states (XS)

## 25. Acceptance Criteria
- Exactly one market count appears on the page and equals `doctor.markets.filter(m => m.active).length`; inactive countries are either hidden or explicitly marked inactive.
- First editable field visible within one viewport at 1366×650 after the summary strip.
- Editing any field (including bio rich text) then triggering in-app navigation shows a confirm dialog; choosing "Stay" preserves all entered values; hard-refresh still fires beforeunload.
- Global fields and per-country fields live in visually separate FormSections whose descriptions state their scope; screen reader announces save results (`role="status"`).
- Every toolbar control in the bio editor has a non-empty accessible name and ≥44px hit area.
- CZ page shows a CZ-format IBAN example; IE page an IE-format one.
- Zero console errors across the 7-viewport matrix (baseline already clean — must stay clean).

## 26. Open Questions
1. 15-006 split ("Identity & contact" vs country listing) changes the page's form structure and all 6 locale files — Fable/owner approval needed.
2. SPA dirty-guard: build as a portal-wide primitive (patched-router hook vs link-click interceptor in portal-shell)? Affects all three portals — Fable review.
3. Is Portugal supposed to be doctor-visible while inactive ("coming soon" state) or is the `additionalCountries` row stale data that admin should clean?
4. Should the account-menu Profile link target the primary market editor directly (ties to 14-001)?
5. RichTextHtmlField is admin-owned — coordinate a11y changes with admin portal audit to avoid double edits.
