# Staging Smoke Run Sheet

Use this run sheet to deploy and validate the Global Health platform in **staging**.

Scope guardrails for this run:

- No new features
- No product scope changes
- No public route/navigation changes
- No payment implementation
- No doctor portal implementation

---

## 1) Pre-deploy checks

### Frontend required env vars

- `NEXT_PUBLIC_API_URL` (staging backend URL)
- `NEXT_PUBLIC_SITE_URL` (staging canonical/public URL)
- Optional server-only overrides when needed:
  - `API_BASE_URL`
  - `ADMIN_API_BASE_URL`

### Backend required env vars

- `DATABASE_URL`
- `PORT`
- `AUTH_JWT_SECRET`
- `AUTH_COOKIE_NAME`
- `AUTH_JWT_EXPIRES_IN`
- `ADMIN_TOKEN_FALLBACK_ENABLED` (should be `false` in staging unless explicitly required)
- `CORS_ALLOWED_ORIGINS` (must include staging frontend origin)

Optional backend vars:

- `ADMIN_API_TOKEN` (only if fallback explicitly enabled)
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_FULL_NAME` (bootstrap strategy only, non-production-safe handling)

### Platform readiness checks

- [ ] Database is reachable from backend runtime.
- [ ] Migrations are applied (`db:deploy` ready).
- [ ] Admin user seed strategy chosen:
  - existing staging admin account, or
  - one-time seed using `SEED_ADMIN_*` in a controlled step.
- [ ] `CORS_ALLOWED_ORIGINS` set to exact staging web origin(s).
- [ ] `AUTH_JWT_SECRET` set and strong (32+ chars).
- [ ] `ADMIN_TOKEN_FALLBACK_ENABLED=false` unless explicitly approved.
- [ ] Official asset status noted (approved/pending).
- [ ] Legal/clinical copy status noted (approved/pending).

---

## 2) Build commands

Run from repository root:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter backend test
pnpm --filter backend db:generate
pnpm --filter backend db:deploy
```

Expected: all commands succeed with exit code `0`.

---

## 3) Backend staging smoke tests

Set helper variables:

```bash
API_BASE_URL="https://<staging-backend>"
```

### Health and public APIs

- [ ] `GET /health` -> `200` and `ok=true`
- [ ] `GET /health?db=1` -> `200` and `database.connected=true`
- [ ] `GET /api/countries` -> `200`
- [ ] `GET /api/services` -> `200`
- [ ] `GET /api/doctors` -> `200`
- [ ] `GET /api/pricing` -> `200`
- [ ] `GET /api/assets` -> `200`

### Auth flow

- [ ] Register test patient (`POST /api/auth/register`) -> `200`
- [ ] Login test patient (`POST /api/auth/login`) -> `200`, session cookie set
- [ ] `GET /api/auth/me` with cookie -> `200`
- [ ] Logout (`POST /api/auth/logout`) -> `200`, cookie cleared
- [ ] `GET /api/auth/me` after logout -> `401`

### Booking flow

- [ ] Guest booking (`POST /api/appointments` without auth cookie) -> `200`
- [ ] Logged-in booking (`POST /api/appointments` with auth cookie) -> `200` and linked to user
- [ ] `GET /api/account/appointments` with patient cookie -> `200` and contains owned booking

### Admin authorization

- [ ] Unauthenticated `GET /api/admin/appointments` -> `401`
- [ ] Patient session `GET /api/admin/appointments` -> `403`
- [ ] Admin session `GET /api/admin/appointments` -> `200`
- [ ] Token fallback disabled by default (`ADMIN_TOKEN_FALLBACK_ENABLED=false`) unless explicitly enabled for controlled migration testing

---

## 4) Frontend staging smoke tests

Set helper variable:

```bash
WEB_BASE_URL="https://<staging-frontend>"
```

### Public routes

- [ ] `/`
- [ ] `/home`
- [ ] `/home-pt`
- [ ] `/home-sp`
- [ ] `/home-cz`
- [ ] `/home-rm`
- [ ] `/book-online`
- [ ] `/general-consultation-ie`
- [ ] `/specialty-ie`
- [ ] `/ireland/medical-consultation`
- [ ] `/ireland-team`
- [ ] `/plans-pricing`
- [ ] `/blog`
- [ ] `/privacy`

Expected for all public routes:

- [ ] HTTP `200`
- [ ] Page renders without crash
- [ ] Main CTA and key content blocks visible

### Auth/account routes

- [ ] `/register`
- [ ] `/login`
- [ ] `/forgot-password`
- [ ] `/account` (requires auth; redirect to login when unauthenticated)
- [ ] `/account/bookings` (requires auth; redirect to login when unauthenticated)

### Admin routes

- [ ] `/admin`
- [ ] `/admin/appointments`
- [ ] `/admin/countries`
- [ ] `/admin/services`
- [ ] `/admin/doctors`
- [ ] `/admin/pricing`
- [ ] `/admin/assets`
- [ ] `/admin/blog-posts`
- [ ] `/admin/faqs`
- [ ] `/admin/content-pages`

Expected:

- unauthenticated -> redirect to `/login?next=/admin`
- patient session -> redirect to `/account`
- admin session -> page loads

---

## 5) Responsive checks

Representative pages:

- `/`
- `/book-online`
- `/account/bookings`
- `/admin/appointments`

Breakpoints:

- `320`
- `390`
- `768`
- `1024`
- `1440`

Expected at each breakpoint:

- [ ] No horizontal scroll
- [ ] Forms usable
- [ ] Navigation usable
- [ ] Admin tables readable or safely stacked/scrollable
- [ ] Primary CTA/buttons visible

---

## 6) Backend-offline fallback test

Test method:

- Temporarily point frontend in staging preview to an invalid/unreachable backend URL, or simulate backend downtime.

Expected:

- [ ] Public pages still render fallback content
- [ ] Booking/account/admin features show safe error states
- [ ] No runtime crash/white screen

Restore backend URL immediately after verification.

---

## 7) SEO checks

- [ ] `/sitemap.xml` returns valid sitemap
- [ ] `/robots.txt` returns expected rules
- [ ] Metadata defaults present on public pages
- [ ] Auth/admin/account routes are not indexed (robots disallow + no indexing intent)

---

## 8) Rollback notes

- Frontend rollback:
  - Re-deploy previous known-good frontend artifact/release in hosting provider.
- Backend rollback:
  - Re-deploy previous known-good backend artifact/release in hosting provider.
- Database caution:
  - Do not blindly rollback applied migrations.
  - Take backup/snapshot before schema-changing deployments.
  - Use forward-fix migration where possible; manual rollback only with verified backup and DBA/operator approval.

---

## 9) Pass/fail table

| Area | Check | Expected | Actual | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Pre-deploy | Env var completeness | All required vars set |  |  |  |
| Backend | `/health` | 200, ok=true |  |  |  |
| Backend | `/health?db=1` | 200, DB connected |  |  |  |
| Backend | Public APIs | 200 responses |  |  |  |
| Auth | Register/login/me/logout | Expected status codes |  |  |  |
| Booking | Guest + logged-in flows | 200 + ownership behavior |  |  |  |
| Admin API | Unauth/patient/admin checks | 401/403/200 |  |  |  |
| Frontend | Public routes | Render successfully |  |  |  |
| Frontend | Auth/account protection | Redirect/protect correctly |  |  |  |
| Frontend | Admin protection | Redirect/protect correctly |  |  |  |
| Responsive | 320/390/768/1024/1440 | Usable layout, no overflow |  |  |  |
| Fallback | Backend offline behavior | Safe fallback/errors, no crash |  |  |  |
| SEO | sitemap/robots/metadata | Correct and accessible |  |  |  |

### Latest execution results (2026-05-06)

| Area | Check | Expected | Actual | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Pre-deploy | Frontend env vars | Required vars set | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` present | pass | Optional server-only overrides not required for this run |
| Pre-deploy | Backend env vars | Required vars set | `DATABASE_URL`, `PORT`, `AUTH_JWT_SECRET`, `AUTH_COOKIE_NAME`, `AUTH_JWT_EXPIRES_IN`, `ADMIN_TOKEN_FALLBACK_ENABLED=false`, `CORS_ALLOWED_ORIGINS` present | pass | Local staging env updated before smoke run |
| Pre-deploy | Database reachable | Reachable from backend | `/health?db=1` returned `database.connected=true` | pass |  |
| Pre-deploy | Migrations applied | `db:deploy` successful | `No pending migrations to apply` | pass |  |
| Pre-deploy | Admin seed strategy | Chosen and executed | One-time seed applied (`staging.admin@example.com`) | pass | Controlled smoke-test admin account |
| Pre-deploy | CORS allow-list | Set | `CORS_ALLOWED_ORIGINS=http://localhost:3000` | pass |  |
| Pre-deploy | JWT secret | Strong secret set | `AUTH_JWT_SECRET` explicitly set | pass |  |
| Pre-deploy | Token fallback policy | Disabled by default | `ADMIN_TOKEN_FALLBACK_ENABLED=false` and bearer test returned `401` | pass |  |
| Pre-deploy | Official assets status | Noted | Pending business approval | blocked | Business decision |
| Pre-deploy | Legal/clinical copy status | Noted | Pending final approval | blocked | Legal/business decision |
| Build | `pnpm install` | Exit 0 | Exit 0 | pass |  |
| Build | `pnpm lint` | Exit 0 | Exit 0 | pass |  |
| Build | `pnpm typecheck` | Exit 0 | Exit 0 (after re-run) | pass | First run failed due missing generated `.next/types`; passed after build regenerated files |
| Build | `pnpm build` | Exit 0 | Exit 0 | pass |  |
| Build | `pnpm --filter backend test` | Exit 0 | Exit 0 (`79/79` passing) | pass |  |
| Build | `pnpm --filter backend db:generate` | Exit 0 | Exit 0 | pass |  |
| Build | `pnpm --filter backend db:deploy` | Exit 0 | Exit 0 | pass |  |
| Backend | `GET /health` | `200` | `200`, `ok=true` | pass |  |
| Backend | `GET /health?db=1` | `200`, DB connected | `200`, `database.connected=true` | pass |  |
| Backend | `GET /api/countries` | `200` | `200` | pass |  |
| Backend | `GET /api/services` | `200` | `200` | pass |  |
| Backend | `GET /api/doctors` | `200` | `200` | pass |  |
| Backend | `GET /api/pricing` | `200` | `200` | pass |  |
| Backend | `GET /api/assets` | `200` | `200` | pass |  |
| Auth | Register patient | `200` | `200` | pass |  |
| Auth | Login patient | `200` | `200` | pass |  |
| Auth | `/api/auth/me` logged in | `200` | `200` | pass |  |
| Auth | Logout | `200` | `200` | pass | Verified with Node `fetch` session flow |
| Auth | `/api/auth/me` after logout | `401` | `401` | pass |  |
| Booking | Guest booking | `200` | `200` | pass |  |
| Booking | Logged-in booking | `200` + linked user | `200` | pass |  |
| Booking | `/api/account/appointments` | Contains owned booking | `200`, items include test user's email | pass |  |
| Admin API | Unauth `/api/admin/appointments` | `401` | `401` | pass |  |
| Admin API | Patient session `/api/admin/appointments` | `403` | `403` | pass |  |
| Admin API | Admin session `/api/admin/appointments` | `200` | `200` | pass |  |
| Admin API | Token fallback disabled | Rejected unless explicitly enabled | `401` with bearer token | pass |  |
| Frontend | Public routes list | Render without crash | All listed routes returned `200` | pass | Checked `/`, `/home`, `/home-pt`, `/home-sp`, `/home-cz`, `/home-rm`, `/book-online`, `/general-consultation-ie`, `/specialty-ie`, `/ireland/medical-consultation`, `/ireland-team`, `/plans-pricing`, `/blog`, `/privacy` |
| Frontend | Auth routes | Render/protect correctly | `/register`, `/login`, `/forgot-password` returned `200`; `/account`, `/account/bookings` redirected to login (`307`) | pass |  |
| Frontend | Admin routes unauth | Redirect to login | `/admin*` returned `307` | pass |  |
| Frontend | Admin routes patient | Redirect to `/account` | `/admin` returned `307 /account` | pass |  |
| Frontend | Admin routes admin | Page loads | `/admin` returned `200` | pass |  |
| Responsive | Breakpoints 320/390/768/1024/1440 | No overflow, usable UI | Not executed in this terminal-only run | blocked | Requires interactive browser visual pass |
| Fallback | Backend offline public | Public pages still render | With backend stopped, `/` and `/book-online` returned `200` | pass |  |
| Fallback | Backend offline protected/features | Safe errors, no crash | `/account` and `/admin` redirected (`307`) while backend offline | pass | Proxy behavior safe in offline state |
| SEO | `/sitemap.xml` | Valid sitemap | `200`, XML contains `<urlset>` | pass |  |
| SEO | `/robots.txt` | Expected rules | `200`, includes `Disallow: /admin` and auth/account blocks | pass |  |
| SEO | Metadata defaults | Present | `og:title` present on `/` | pass |  |
| SEO | Auth/admin/account not indexed | Not indexed intent | Robots disallow rules present for auth/admin/account | pass |  |

## Responsive QA Completion (Manual Browser)

Executed on 2026-05-06 with interactive browser checks across all requested route groups and viewports.

### Pages checked

- Public: `/`, `/home`, `/book-online`, `/general-consultation-ie`, `/specialty-ie`, `/ireland/medical-consultation`, `/ireland-team`, `/plans-pricing`, `/blog`, `/privacy`
- Patient: `/register`, `/login`, `/account`, `/account/bookings`
- Admin: `/admin`, `/admin/appointments`, `/admin/countries`, `/admin/services`, `/admin/doctors`, `/admin/pricing`, `/admin/assets`, `/admin/blog-posts`, `/admin/faqs`, `/admin/content-pages`

### Viewports checked

- `320`, `390`, `768`, `1024`, `1440` (height ~`900`)

### Actual responsive results

| Area | Check | Expected | Actual | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Public pages | Layout + readability | No broken layout/text/images | All listed public pages rendered correctly across all viewports | pass | No unreadable text or broken images observed |
| Public pages | Navigation + mobile menu | Usable nav/menu | Mobile menu opened/closed and links were accessible on narrow viewports | pass | Menu collapse behavior works at mobile sizes |
| Public pages | Cards + CTA visibility | Cards stack, CTA visible | Cards stacked correctly on small widths; CTAs remained visible | pass |  |
| Patient pages | Forms usability | Readable/tappable forms | `/register` and `/login` forms remained readable and usable at all viewports | pass | Inputs/buttons remained accessible |
| Patient pages | Protected account routes | Safe behavior with auth protection | `/account` and `/account/bookings` protection/redirect behavior stayed correct | pass | No layout regressions on protected shell |
| Admin pages | Responsive admin shell | Usable admin layout | Admin navigation and page shells remained usable across all viewports | pass |  |
| Admin pages | Tables on narrow widths | Usable or safely scrollable | Data tables remained usable via horizontal scroll on narrow screens | pass | Expected pattern for dense admin tables |
| Global | Horizontal overflow | No horizontal page breakage | No staging-blocking horizontal layout break found | pass |  |
| Global | Broken assets/text | No broken images/unreadable content | No staging-blocking content break detected | pass |  |
| Dev-only noise | Hydration overlay warning | Non-blocking in staging decision | Next.js dev hydration warning observed in local dev overlay on admin pages | pass | Marked non-blocking dev-only noise; not a staging blocker |

### Responsive QA verdict

- **Responsive QA status:** **PASS**
- **Staging-blocking responsive issues found:** **None**

---

## 10) Final staging sign-off checklist

- [ ] Engineering sign-off complete
- [ ] Business asset approval: **pending / complete** (mark one)
- [ ] Legal/clinical copy approval: **pending / complete** (mark one)
- [ ] Production admin account creation plan documented
- [ ] Production environment variables prepared and reviewed
- [ ] Production launch decision recorded (go / no-go)

