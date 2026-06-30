# Render Accessibility Check

Checked with the local Next dev server on `http://localhost:3000` after Batch 5A.

## Result

Portal routes are not render-accessible in this local session because the shared portal layouts require a backend-authenticated `gh_auth` cookie and role-specific user data from `getServerAuthUser()`.

Evidence from HTTP checks with redirects disabled:

| Route | Result |
|---|---|
| `/admin` | `307` to `/login?next=%2Fadmin` |
| `/admin/services` | `307` to `/login?next=%2Fadmin%2Fservices` |
| `/doctor` | `307` to `/login?next=%2Fdoctor` |
| `/doctor/calendar` | `307` to `/login?next=%2Fdoctor%2Fcalendar` |
| `/account` | `307` to `/login?next=%2Faccount` |
| `/account/bookings` | `307` to `/login?next=%2Faccount%2Fbookings` |
| `/account/profile` | `307` to `/login?next=%2Faccount%2Fprofile` |
| `/account/payments` | `307` to `/login?next=%2Faccount%2Fpayments` |

## Source Evidence

- `frontend/app/(admin)/admin/layout.tsx` redirects missing users to `/login?next=/admin` and non-admin users away from admin.
- `frontend/app/(doctor)/doctor/layout.tsx` redirects missing users to `/login?next=/doctor` and non-doctors away from doctor.
- `frontend/app/(auth)/account/layout.tsx` redirects missing users to `/login?next=/account` and role-mismatched users to their own portals.
- `frontend/lib/api/server-auth.ts` resolves auth by forwarding cookies to the backend `/api/auth/me`; without a valid backend `gh_auth` cookie it returns `null`.

## Browser Sample Evidence

docs/portal-redesign/sample-render-check.json records 50 sampled browser checks across admin, doctor, and patient/account routes at 320, 390, 768, 1280, and 1920px. Every sampled check redirected to the login surface instead of rendering the protected portal route.

## Screenshot Impact

Screenshots are not claimed as completed. The current screenshot checklist marks route screenshots as inaccessible in this unauthenticated local session. A final visual pass still requires valid admin, doctor, and patient sessions or seeded test auth cookies.