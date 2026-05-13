# Launch Readiness Checklist (Phase 7)

Use this checklist before promoting to staging/production.

## Environment

- [ ] `NEXT_PUBLIC_API_URL` points to deployed backend API.
- [ ] `NEXT_PUBLIC_SITE_URL` points to canonical public site origin.
- [ ] Optional server overrides (`API_BASE_URL`, `ADMIN_API_BASE_URL`) are set correctly if frontend and backend are on different hosts.
- [ ] No secrets are present in frontend `NEXT_PUBLIC_*` variables.

## Public Route QA

Test each route at breakpoints **320 / 390 / 768 / 1024 / 1440**:

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

## Patient Auth/Account QA

- [ ] `/register` creates account with safe UX states.
- [ ] `/login` authenticates and redirects correctly.
- [ ] `/account` requires auth and renders account summary.
- [ ] `/account/bookings` requires auth and renders history/empty state.
- [ ] Guest booking still works on `/book-online` without login.
- [ ] Logged-in booking links request to account history.

## Admin QA

- [ ] `/admin` requires authenticated `ADMIN` session.
- [ ] `/admin/appointments` accessible for `ADMIN`.
- [ ] `/admin/countries` accessible for `ADMIN`.
- [ ] `/admin/services` accessible for `ADMIN`.
- [ ] `/admin/doctors` accessible for `ADMIN`.
- [ ] `/admin/pricing` accessible for `ADMIN`.
- [ ] `/admin/assets` accessible for `ADMIN`.
- [ ] `/admin/blog-posts` accessible for `ADMIN`.
- [ ] `/admin/faqs` accessible for `ADMIN`.
- [ ] `/admin/content-pages` accessible for `ADMIN`.
- [ ] `PATIENT` access to `/admin/*` is denied/redirected.

## Fallback and Availability

- [ ] Public pages render when backend is online.
- [ ] Public pages render with backend offline fallback behavior.
- [ ] Account/admin protected routes enforce auth instead of silently exposing content.

## SEO Readiness

- [ ] `sitemap.xml` is generated from canonical public routes.
- [ ] `robots.txt` is generated and blocks auth/admin surfaces.
- [ ] Metadata base URL and Open Graph defaults resolve to production site URL.
- [ ] Legacy alias canonical behavior is documented and unchanged.

