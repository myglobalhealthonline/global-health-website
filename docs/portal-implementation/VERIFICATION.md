# Phase F — Verification report

Date: 2026-07-12 · Branch: Dev-hassaan · Verifies commits 4ca59296, 07d75ad2, 21b7dacd
against docs/portal-implementation/TASK.md §10 (matrix), §11 (automated regression), §17
(definition of done).

⚠️ Runtime checks in this phase ran read-only against the local backend (:4000), which
proxies the Railway **production** DB. No submit/save/mutate actions were taken.

## 1. Gates

| Gate | Command | Result |
|---|---|---|
| Lint | `pnpm lint` | **Pass** — 0 errors, 3 pre-existing warnings (unrelated files: `employees-table.tsx`, `PortalDialog.tsx:44`, `DoctifyReviewsLazy.tsx`, all pre-dating this task's commits) |
| Typecheck | `npx tsc --noEmit` | **Pass** — 0 errors |
| Unit tests | `pnpm test` (vitest) | **Pass** — 6 files, 67 tests |
| Build | `pnpm build` | **Pass** — `✓ Compiled successfully`; all portal routes render as `ƒ` (dynamic) — the feared `useSearchParams()` static-prerender crash (PortalTabs now calls it unconditionally) never materialized because every consumer route (`/doctor/appointments/[id]`, `/admin/appointments/[id]`, `/account/profile`, `/doctor/calendar`, etc.) is already force-dynamic (auth-gated, no `generateStaticParams`), so no Suspense boundary fix was needed |
| Playwright — new spec | `npx playwright test frontend/tests/e2e/portal-responsive-regression.spec.ts --workers=2` | **52 passed, 0 failed** (see §2) |
| Playwright — full `tests/e2e` (regression check) | same, whole directory | **88 passed, 1 failed, 33 skipped** — the 1 failure (`public-redesign.spec.ts` — "about page renders a hero image") is a pre-existing public-site image-timing issue unrelated to portal work or any file this task touched; not fixed here (out of scope, public marketing page) |

One lint error found and fixed during F1 (see §4).

## 2. Playwright regression suite (F2)

New spec: `frontend/tests/e2e/portal-responsive-regression.spec.ts`. Reused the existing
harness's overflow-check helper and `HSCROLL_ALLOWLIST` (kept in sync with
`docs/responsive-audit/INTENTIONAL_HORIZONTAL_SCROLL.md`) and the login pattern from
`responsive.spec.ts` / `responsive-matrix.spec.ts`. Env-gated: `test.skip` when
`E2E_*_EMAIL`/`PASSWORD` aren't set, falling back to the documented test creds
(`docs/manual-tests/TEST-RESULTS.md`) so it runs out of the box in this environment.

Coverage:
- No page-level h-scroll at 375×667 / 768×1024 / 1024×600 / 1440×550 / 1440×900 on
  `/doctor/appointments/[id]`, `/doctor/calendar`, `/doctor/appointments`,
  `/admin/appointments`, `/admin/services`, `/admin/calendar`, `/account/profile`,
  `/account/bookings`, `/account/family` (45 cases).
- Doctor appointment workspace: tab strip visible + clickable; zero bounding-box overlap
  between tab strip and patient rail at 3 scroll positions; patient context reachable
  (rail at ≥1024px, `#gh-tab-patient` below 1024px).
- Tab switching preserves typed SOAP text (fill → switch → switch back → value intact,
  no save).
- `?tab=` deep links: doctor appointment (`?tab=clinical`), admin appointment
  (`?tab=schedule` — admin's actual tab set is overview/schedule/messages, not doctor's),
  account/profile (dynamically resolves the second tab's id).
- Calendar day AppSheet at 1440×550: opens, fits viewport (top/bottom within bounds),
  Escape closes it and returns focus to the trigger.
- Keyboard: ArrowRight moves both `aria-selected` and DOM focus to the next tab.

**Result: 52/52 passed** (`E2E_NO_WEBSERVER=1 E2E_BASE_URL=http://localhost:3000 npx
playwright test frontend/tests/e2e/portal-responsive-regression.spec.ts --workers=2`).

Reliability notes (both fixed in the spec, not app bugs):
- UI-driven login stalls on the client "Logged in… Redirecting…" screen (documented in
  FINDINGS.md). Switched to API login (`page.request.post("/api/auth/login")`, which
  shares the cookie jar with `page`'s browser context) — faster and sidesteps the stall
  entirely.
- The 3 test accounts logging in once per test under full parallelism (8 workers)
  exhausted the backend's DB connection pool against the shared prod-DB-backed instance,
  surfacing as `503 "Authentication is temporarily unavailable"`. Fixed by caching the
  auth cookie per role per worker process (first test per role logs in for real, the rest
  reuse the cookie via `context.addCookies`) and running with `--workers=2`.
- Default 30s test timeout produced intermittent navigation-timeout flake under
  Turbopack's cold-compile + prod-DB latency; bumped to 60s file-wide via a top-level
  `beforeEach`.

## 3. Runtime matrix — Phase F additions (F3)

Screenshots written to `docs/portal-implementation/screenshots/after/` (throwaway
Playwright script, deleted after use — not a permanent spec).

| Route | Viewports checked | Result |
|---|---|---|
| `/doctor/calendar` (month grid) | 375×667, 768×1024, 1024×600, 1440×550, 1920×1080 | No overflow at any viewport |
| `/doctor/calendar` day AppSheet | same 5 | Opens, stays within viewport bounds (top/bottom check) at every size, including 1440×550 |
| `/doctor/appointments` (list) | same 5 | No overflow at any viewport |
| `/doctor/appointments/[id]` @ 200%-zoom-proxy (720×450, per TASK's halved-viewport equivalence) | 720×450 | No overflow; primary content reachable |
| `/account/profile` @ 200%-zoom-proxy | 720×450 | No overflow; primary content reachable |
| `/doctor/appointments/[id]` Messages tab | 1024×600 | Chat input visible, panel fits, no overflow |

Note: the doctor calendar component has no month/week/day view *toggle* (only a month
grid + day-agenda sheet — confirmed by reading `app/(doctor)/doctor/calendar/ui.tsx`),
so "week/day view" screenshots don't apply here; this matches the admin calendar's
actual feature set per RC7 in FINDINGS.md (the only calendar divergence was the day-sheet
swap, already fixed in 07d75ad2). `EventDetailDialog` (a consultation-event click, not
the day-agenda sheet) wasn't separately screenshotted — the current test data didn't
have a click-through consultation event in view; the component is unchanged by this
task's commits and was not flagged in FINDINGS.md.

## 4. Issues found in this phase and their fixes

1. **`react-hooks/refs` lint error — `frontend/components/use-portal-mobile-nav.ts:28`**
   (`onCloseRef.current = onClose` assigned during render). Introduced in commit
   4ca59296 (new mobile-nav a11y hook). Fixed by moving the assignment into a
   `useLayoutEffect` keyed on `onClose` — same "latest ref" pattern, correct lifecycle.

2. **AppSheet focus not restored to trigger on close** (real defect, confirmed by 4
   independent repros: `document.activeElement` after Escape was `<body>`, not the
   trigger). `components/AppSheet.tsx` uses vanilla `@radix-ui/react-dialog` without a
   `Dialog.Trigger`, and Radix's default close-focus-restore did not reliably return
   focus to an externally-managed trigger element in this setup. This violates TASK §7
   ("focus trap + restoration") and would have failed the calendar-day-sheet keyboard
   check. Fixed by adding an explicit `returnFocusRef` (captured on open) plus
   `onCloseAutoFocus` override — the same manual-restore pattern already used by
   `PortalDialog` and `usePortalMobileNavA11y` elsewhere in this codebase (consistent
   fix, not a new pattern). Verified via the new Playwright spec's day-sheet Escape/focus
   test (52/52 passing) and 4 standalone repro scripts before/after.

Both fixes are minimal diffs to files this task's Phase B/C already touched; no
suppressions, no architectural changes.

## 5. Remaining limitations

- **Real-device safe-area insets** (notch/home-indicator on physical iOS/Android) were
  not verified — only viewport-size emulation via Playwright/Chromium, per environment
  constraints (no physical device lab). `env(safe-area-inset-*)` CSS exists per FINDINGS
  RC5 but wasn't re-verified pixel-for-pixel on hardware.
- **200% zoom** used the halved-viewport proxy the task itself sanctions
  (`viewport 720×450 ≈ 1440×900 @ 200%`), not true browser-zoom emulation
  (`--force-device-scale-factor=2` + OS-level zoom). This catches layout clipping but not
  zoom-specific quirks like font hinting or raster-image scaling artifacts.
- **Doctor calendar week/day views**: not applicable — the component only has a month
  grid + day-agenda sheet (see §3 note). Not a gap introduced or missed by this task.
- **`EventDetailDialog`** (individual consultation-event click, distinct from the
  day-agenda AppSheet) was not screenshotted in this phase — no qualifying event was in
  the visible test data window, and the component wasn't touched by Phase B/C.
- **Admin calendar** was included in the overflow sweep (§2, 5 viewports) but not given
  the same dedicated day-AppSheet/zoom screenshot pass as the doctor calendar in §3 — it
  shares the exact same `AppSheet`/`MonthCalendar` primitives (already covered generically
  by the `AppSheet` focus-restore fix in §4), so this is a coverage gap in screenshots
  only, not in the underlying code path.
- Test suite runs against the **local dev server** (Turbopack, not the CI production
  build path in `playwright.config.ts`'s `CI` branch) proxying the **production DB** — a
  slower, shared, mutable environment. Timing-sensitive flake is mitigated (60s timeouts,
  `--workers=2`, cached auth) but a CI run against a fresh seeded DB would be the higher-
  confidence bar; that wasn't available here.
- The pre-existing `public-redesign.spec.ts` hero-image failure (§1) was observed but not
  investigated further — confirmed unrelated to this task's file set, left for its own
  fix.
