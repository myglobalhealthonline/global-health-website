# Responsive Overhaul — Full Handoff (for new sessions)

Written: 2026-07-12 · Branch: **Dev-hassaan** (NOT pushed) · Status: **all 8 implementation phases reported complete by Hassaan**. The work is exactly the **74 unpushed commits** `f1da22eb` (UI Plan Update) → `5bdf56b5` (Phase 8 purge); list them with `git log --oneline origin/Dev-hassaan..Dev-hassaan` before relying on any specific phase's output.

Read this file first. It contains the entire arc: what was assigned, what was audited, what was decided, what shipped, what's left, and the rules any future UI work must follow.

---

## 1. The assignment (what Hassaan asked for)

**Original task (2026-07-11):** a comprehensive dual-scope audit + implementation plan for the whole frontend — responsive UI, list/table architecture, drawer strategy, clipping & stacking (z-axis), accessibility, and design-system consistency. Two audits with ONE methodology: **Audit 1 = public website**, **Audit 2 = all four portals** (admin, doctor, patient/account, corporate). Audit-first: no production code changes until the plan was approved. Orchestration model: **Fable 5 = brain** (architecture decisions, pattern classification, synthesis), **Sonnet subagents = evidence** (file-by-file inspection, every finding needs file:line, no "probably").

**Added requirements (same day):**
- **Dual-axis responsiveness**: everything (type, buttons, inputs, images, cards, nav, modals, tables, spacing, section heights) responds to viewport **width AND height**. clamp() text, wrapping, readable floors. Components compress on short screens without becoming unusable. NEVER: global scale/zoom, clipping, hiding content, counteracting browser zoom. Reflow first; vertical scroll = final fallback.
- **Theme fidelity**: every new primitive (drawer, menus, dialogs…) must look native to the existing systems — portal = DESIGN2.md Obsidian Ivory · Liquid Lux; public = DESIGN.md gh2 forest/ivory glass. No generic/unstyled Radix defaults.

**Then:** phase-by-phase implementation, each phase assigned to a separate session via paste-ready prompts written by the orchestrator session. Hassaan confirmed **Phases 1–8 all completed**.

## 2. The audit (done first, evidence-grounded)

Executed via 8 parallel Sonnet evidence agents + Fable synthesis. **10 deliverable docs**, all still authoritative:

| Doc | Content |
|---|---|
| `website/WEBSITE_UI_AUDIT.md` | public-site findings G1–G9, route-by-route, runtime-confirmed section |
| `website/WEBSITE_SECTION_INVENTORY.md` | 30 sections (WS-01…WS-30) |
| `website/WEBSITE_OVERLAY_STACKING_INVENTORY.md` | 15 overlays (WO-01…WO-15), verdicts incl. runtime confirmations |
| `portal/PORTAL_UI_AUDIT.md` | portal findings P-01…P-16, root causes R1–R8 |
| `portal/LIST_AND_TABLE_INVENTORY.md` | 45 lists/tables (T-01…T-45) with Pattern A–E assignments |
| `portal/PORTAL_OVERLAY_STACKING_INVENTORY.md` | 17 overlay entries (PO-01…PO-17), Z-C1 conflict |
| `portal/DRAWER_ARCHITECTURE_PLAN.md` | 6 drawers (D-01…D-06) + rejected drawers + non-breaking migration rules |
| `shared/RESPONSIVE_DESIGN_SYSTEM_PLAN.md` | **§1 z-token scale, §2 type roles+floors, §3 primitives, §4 layout tokens, §4b HEIGHT AXIS, §4c THEME FIDELITY, §5 toolbars, §6 zoom contract** |
| `shared/CONSISTENCY_REPORT.md` | website-vs-portal divergences, what unifies, what intentionally stays split |
| `shared/RESPONSIVE_IMPLEMENTATION_PLAN.md` | Phases 0–8, per-phase files/risk/validation |

**Top confirmed findings** (all now fixed per phase completion):
1. `portal.css` blanket `min-width:720px` on every table + fixed 760px card-switch → **761–1023px tablet band** where ~16 portal lists h-scrolled despite working card layouts existing. Orders table forced 1180px (h-scroll even on laptops).
2. SameDayBooking homepage language listbox clipped by its own card's `overflow-hidden` — **runtime-confirmed**: 42px clipped, "Urdu" unclickable at 390×844.
3. DoctorFilters native `<details>` panels: no outside-click dismiss, multi-open, no collision handling — runtime-confirmed (dismiss/multi-open); right-edge overflow data-dependent.
4. audit-log wrapper `overflow-hidden` (every sibling uses `overflow-x-auto`) silently clipped data.
5. Corporate portal: zero mobile-card fallback (table-only on phones).
6. No overlay portal-mounting: PortalDialog `fixed`-not-portalled (latent containing-block trap, 51 backdrop-filter uses repo-wide); 8+ hand-rolled dropdown implementations; sidebar/popovers tied at z-40 inside `isolation:isolate` shell (paint order by DOM order — Z-C1).
7. ~20 lists duplicated desktop-table + mobile-card markup by hand.
8. Two spec'd-but-diverging type systems (public fluid clamp / portal fixed-px — KEPT intentionally); 147 files with sub-12px arbitrary sizes, five 9px sites; zero container queries.
9. A11y: delete-account modal no focus trap; 32px icon buttons + 24–28px calendar day taps; focus rings stripped in rich-text toolbars/messages search.

## 3. What each phase shipped (assignments; Hassaan reports all complete)

- **Phase 0** — Playwright baseline: screenshot matrix (widths 320→1920, heights 568→900, landscape, 200% zoom), page-overflow assertion with intentional-scroll allow-list, overlay-visibility assertion (elementFromPoint hit tests).
- **Phase 1** — Foundations: `--z-*` token scale in globals.css (base 0/raised 10/sticky 100/header 200/fixed-bar 250/dropdown 300/drawer 400·410/modal 500·510/toast 600/skip-link 700) + every existing z mapped; PortalDialog → real `createPortal`; SameDayBooking card clip + audit-log overflow + Z-C1 band split + container fixes; table-width foundation (blanket 720px removed, per-table budgets, container-query card switch → closed the tablet band); height-axis foundations (svh space tokens, vh→svh/dvh, compact ≤720px + minimum ≤568px tiers). Known commits: `e502b0b6`, `4b6d7fba`, `d5cf4eed`, `ce79dd6a`, `ed34c81a`.
- **Phase 2** — Shared primitives, all Radix-based, lux/gh2-styled: **AppMenu** (portalled dropdown/popover, collision-aware; absorbed NotificationPopover + deduped user-menu → `PortalUserMenu.tsx`), **AppDialog** (PortalDialog API; absorbed delete-account modal [gained focus trap] + consultation-documents-modal), **AppSheet/RecordDetailsDrawer** (sm 420/md 520/lg 640, mobile full sheet, URL-bound, ≤88svh), **ColumnPriorityTable** (one `ResponsiveField` config → desktop table + PortalMobileCard; priority 1–4; container-query column hiding), **ResponsiveFilterBar** (grid-collapse pattern extracted from appointments filter). Pilot: /admin/users + drawer D-02.
- **Phase 3** — Flagship screens: DoctorFilters → AppMenu + mobile filter sheet; /admin/orders Pattern B (5 columns + D-01 drawer `?order=`); corporate employees/requests card fallbacks + D-04 drawer (action forms into drawer footer on narrow); /admin/invoices D-03 drawer; website i18n text hazards (header CTA/StickyBookingCTA/SectionNav nowrap, PricingPlanCard line-clamp, HomeHero 13ch, ServiceCatalog CTAs); height pass on /book, /cart, /checkout.
- **Phase 4** — All remaining admin lists onto ColumnPriorityTable, 3 families: CMS/config (services+3 forcedKind wrappers, health-tests, blog, pages, assets, countries, plans; specialties/country-features → Pattern A; blog+pages toolbars → ResponsiveFilterBar) → ops (newsletter, automation, audit-log column priority [wide scroll stays, intentional], reports uploaded-invoices card fallback, subscriptions + D-06 drawer, doctors Pattern C no-drawer) → **PHI last**: patients Pattern B + D-05 drawer (same PHI gates as detail page, GHN-not-email in URL, access-log parity).
- **Phase 5** — Doctor/patient/corporate lists: doctor invoices (formalized lg:table-cell priorities), doctor patients, document tables, consultation-history (kept expand-rows), workspace tables, documents-panel 6-button cluster → AppMenu overflow; patient payments both tables single-config, FamilyPanel email title; corporate parity. Pattern-A lists (bookings/orders/prescriptions/notifications/access-history/medical-files) intentionally untouched — audited as model implementations.
- **Phase 6** — Non-list: CountrySwitcher/LanguageSwitcher → AppMenu; header tablet tier (per Hassaan's decision); StickyBookingCTA segment-match; FAQTabs edge-fade; detail-hero media band svh clamp; doctor filter grids sm:2/lg:N; 44px touch hit-areas on pointer:coarse (32px visual kept per DESIGN.md §5.8); VerifiedProfessionals → i18n keys; modal sweep 320×500 + zoom.
- **Phase 7** — Type/density consolidation: 9px killed (5 sites), arbitrary text-[...] → role tokens per directory (public fluid / portal fixed scales BOTH KEPT — spec'd divergence), card-padding/button-height outliers, truncation title-attr sweep, focus-ring fixes, status-color drift check.
- **Phase 8** — Cleanup + lock-in: dead CSS/component purge (grep-zero proof standard), Playwright assertions CI-stable, `shared/INTENTIONAL_HORIZONTAL_SCROLL.md` register (slot strips, WeekCalendar, marquees, PortalTabs, audit-log, CSV preview) synced with the overflow-test allow-list, `shared/FINAL_VERIFICATION.md` full-matrix report, docs status sync + CLAUDE.md guidance line.

## 4. Out-of-band fixes (done directly in the orchestrator session, verified in browser)

These were user-reported bugs fixed live, overlapping/extending Phase 1–3 work:

1. **Hero height axis** (home + country home "one word fills the fold" at short viewports):
   - `lib/text/fit-heading-size.ts` — preferred clamp term now `min(<vw-term>, 11svh)` (svhCap param, default 11). All 4 hero callers benefit. Desktop byte-identical (verified 88.6px pre/post at 1440×900).
   - `globals.css` — `.gh-home-hero-title` matching cap + `@media (max-height:720px)` compact tier (grid padding/gap, `.gh-home-hero-left` hook class added in HomeHero.tsx).
   - `CountryEntryGate.module.css` — heroTitle svh cap + width-agnostic ≤720px tier + ≤568px minimum tier.
   - Verified: 667×375, 1280×620 (headline+booking card in fold), no regressions 390×844 / 1440×900.
2. **Country gate panel clipping** (selection container cut at bottom): root cause = `.countryScroller` sized by independent dvh caps that didn't compose with `.selectPanel`'s `max-height` + `overflow:hidden` → 184px of countries unreachable at 360×640. Fix: `.panelBody` → flex column `flex:1 min-height:0`; scroller `flex:1 min-height:96px` (sizes to REMAINING panel space); phones: panel `max-height:none` (page scrolls); ≤720px: offset 168→120 + globe shrink + **panel `overflow-y:auto` fallback**; ≤568px: globe `display:none` (decoration dies first). Verified: 360×640, 1280×620, **1920×500 (wide+short — the case that exposed the fallback need)**, 1366×768 no regression.
3. **SameDayBooking dropdown under fixed Book bar**: card clip was fixed in Phase 1, but static `max-h-[240px]` listbox ran under the sticky bottom CTA ("Urdu" hit-test failed). Fix in `SameDayBooking.tsx`: on open, measure `innerHeight − trigger.bottom − 96px reserve`; cap list height (floor 120); flip above when below-space <160px and above larger. Verified: 360×640 all 11 options clickable, flip works; width-independent by construction.

**Degradation order codified (§4b):** spacing compresses → decoration shrinks → decoration collapses → panel scrolls internally → page scrolls. Content is NEVER clipped at any width×height combo.

## 5. What's left (post-Phase-8 backlog)

**Phase 8 status (2026-07-12): done.** `shared/FINAL_VERIFICATION.md` has the
full report — 480/480 matrix checks clean (public+admin+doctor+patient, zero
overflow, zero non-200s). Dead-CSS purge landed in 6 grep-verified commits
(globals.css + portal.css, ~830 lines / ~7% removed); `.gh-glass-card`/
`.gh-liquid*`/`animate-float`/`animate-pulse-glow` deliberately KEPT despite
zero consumers — they're comma-grouped inside the two protected backdrop-
filter fallback blocks, out of this phase's risk budget. Dead-component purge
found nothing to delete (the AppMenu/AppDialog/ColumnPriorityTable migration
was already clean — Explore-agent investigation, no orphaned pre-Radix
implementations left). Test harness (`responsive.spec.ts` +
`responsive-matrix.spec.ts`) promoted and hardened (networkidle→
domcontentloaded hang fix). `INTENTIONAL_HORIZONTAL_SCROLL.md` synced with
`HSCROLL_ALLOWLIST`. Two real bugs surfaced and fixed as separate commits: a
login-form (+12 more auth/account forms) GET-fallback credential leak.

Remaining, explicitly out of this session's reach:

1. **Corporate portal**: never verified — no dev credentials available this session.
2. **Unassigned small fixes**: dual-`<h1>` pages (brazil/consent :85+:100, corporate-invite, reviews/rate); axe/Lighthouse contrast pass on glass sections (`text-white/4x` heroes, `--portal-muted`) — static-flagged, never runtime-measured.
3. **Translations**: VerifiedProfessionals i18n keys need human cs/es/ro content (Phase 6 flags, doesn't machine-write).
4. **Real-device pass**: Android (pointer:coarse backdrop-filter fallback path — the old matrix-glitch fix), iOS safe-areas, real touch.
5. **Data-dependent re-checks**: DoctorFilters on markets with more filter groups than IE; SameDayBooking with longest language lists.
6. **Production-build flake check**: local verification ran against `next dev` (dev-mode compile contention caused transient, root-caused, non-product test failures — see FINAL_VERIFICATION.md #4); recommend one clean `pnpm build && pnpm start` + `npx playwright test` pass before merge.
7. **Ship**: everything on Dev-hassaan, **unpushed**. Review → push → merge main + Dev-nauman (3-branch flow). Frontend-only: no migrations, no env vars. Post-deploy smoke: 6 flagship routes mobile + one wide-short window; network-tab check that portal.css never loads on public routes (CSS-split guarantee).

## 6. Standing rules for ALL future UI work (the guardrails)

1. **CSS split**: public/shared → `frontend/app/globals.css`; portal-only (`.gh-admin-*`, `.gh-doctor-*`, `.gh-portal-*`, `.lux-*`) → `frontend/app/portal.css`. A selector lives in exactly ONE file. New glass/backdrop-filter classes join BOTH fallback blocks (`@media (pointer:coarse)` + `@supports not (backdrop-filter)`) in their file.
2. **Overlays**: never hand-roll. Dropdown/popover → AppMenu; modal → AppDialog; drawer/sheet → AppSheet/RecordDetailsDrawer. All portalled, all on `--z-*` tokens (never raw z numbers, never z-[9999]).
3. **Lists**: new list pages → ColumnPriorityTable config (priority 1–4 fields, drawer flag) — never hand-written twin table/card markup. Filters → ResponsiveFilterBar pattern.
4. **Dual axis**: svh/dvh not vh; panels ≤88svh + internal scroll; height tiers ≤720px compact / ≤568px minimum; no global scale/zoom, no clipping/hiding, vertical scroll = final fallback; test wide+short (1920×500) not just narrow.
5. **Type**: two scales stay (public fluid clamp per DESIGN.md §3; portal fixed-px per DESIGN2.md §6.1). Floors: 12px body/label, 10px uppercase-micro. Truncated data values need a title attr or drawer/expand access path. No `whitespace-nowrap` on translatable CTA/label text (6 locales; cs/ro run long).
6. **Theme**: portal = Obsidian Ivory lux (DESIGN2.md authoritative); public = gh2 forest/ivory (DESIGN.md). Compose from existing atoms (Btn/Pill/IconBtn/portal-atoms). No template look.
7. **Non-breaking bar**: routes, deep links, GET params, permissions, server actions untouched by UI migrations; drawers additive; one commit per route = surgical rollback.
8. **PHI**: never in URLs (GHN/id only), no new PHI fields in list payloads, drawer access through the same gates + access-logging as detail pages.
9. **Verification bar**: lint + typecheck + build green AND browser-verified (screenshots/hit-tests) before "done" — never ask Hassaan to check manually. CI: page-overflow assertion (allow-list = INTENTIONAL_HORIZONTAL_SCROLL.md) + overlay-visibility assertions.

## 7. Orientation for a new session

- This file → then `shared/RESPONSIVE_DESIGN_SYSTEM_PLAN.md` (rules) → then the specific audit/inventory doc for whatever you're touching.
- Verify claimed state: `git log --oneline -60` on Dev-hassaan; `git status` (watch for uncommitted WIP from parallel sessions — has happened).
- Dev server: `.claude/launch.json` → `frontend` (pnpm dev:frontend, port 3000). Checks: `cd frontend && pnpm lint && pnpm typecheck && pnpm build`. Playwright harness from Phase 0/8.
- Portal verification needs logged-in sessions per role — get dev credentials from Hassaan first; don't skip verification silently.
- Working style: token-saver skill (direct output, root-cause fixes, grep all callers, verify yourself, scope literally). Fable orchestrates / Sonnet executes for big fan-out work.
