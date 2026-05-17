# Global Health · Next-Phases Roadmap

**Roadmap date:** 2026-05-16
**Status today:** Phase 1 + Phase 2 + most of Phase 3 shipped. Live on `sendgrid-verification`:
- SendGrid + Stripe scaffolding (env-gated)
- 3-provider review badge (Trustpilot / Google / Doctify) with admin Settings + JSON-LD AggregateRating
- Patient portal: profile, bookings, payments, security (change pwd + email verify + GDPR controls)
- Google Meet flow: admin schedules → patient gets email + Join-call button
- 24h reminder cron endpoint (`POST /api/internal/run-reminders` gated by `CRON_SECRET`)
- GDPR: cookie banner + privacy notice + account-delete + data-export
- GEO: `/llms.txt` + `MedicalProcedure` JSON-LD on consultation pages

Doctor dashboard MVP (overview, appointments, patients, self-edit profile) shipped this round. Expansion to the full 14-section clinical suite is Phase 4 — see below.

---

## Known gap — patient-picked doctor + time slot

Today's booking flow captures country, consultation type, patient
contact, optional Service catalogue link → admin then schedules a Google
Meet manually. The patient cannot pick a specific doctor or an exact
time slot at booking — that's deferred.

What needs to ship for real slot booking:
- Schema: `DoctorAvailability` (recurring weekly windows per doctor) +
  `DoctorTimeSlot` (concrete slots derived/booked); `Appointment.doctorId`
  + `Appointment.timeSlotId`.
- Backend: list-availability endpoint per doctor + atomic slot-claim on
  booking submit (transactional `UPDATE … WHERE status='OPEN'` to avoid
  double-booking).
- Booking form: when arriving from a doctor profile / specialist-services
  card, surface a calendar picker for that doctor's open slots, link the
  appointment to the chosen slot, charge via Stripe if the service is
  priced.
- Admin: schedule action becomes "confirm the patient-picked slot" + add
  Meet URL, instead of typing both fields from scratch.

Effort estimate: 1 week of focused work. Not blocking the current
testing phase — admin can keep scheduling manually via the existing
Practicing-in flow.

---

## Other known gaps (from the 16-May audit)

These are real architectural / scope items that didn't ship in the
audit follow-up commit. Pick them up one at a time when the relevant
slice of the product needs them.

### Admin-added countries don't surface on the public site

`countries.ts`, `country-slug.ts`, `frontend/proxy.ts`, and
`backend/src/validations/shared.schema.ts` all hardcode the five
existing country codes (`ie | pt | sp | cz | rm`). Admin can create a
new Country row, but:
- `countryCodeSchema` rejects its code in booking submits + admin
  filters
- The country picker on `/` only renders the five hardcoded entries
- Sitemap + proxy redirects ignore it
- Public country routes (`/[country]/[lang]/...`) won't resolve

Fix path: turn `data/countries.ts` into a server-only fetch from
`/api/countries`, swap `countryCodeSchema` for a runtime-loaded set,
and rewrite the sitemap to enumerate live countries. Effort: 1–2 days.

### Health-test Appointment link

Booking form now accepts `?type=health-test` and the price flows via
`?service=<slug>`, but `Appointment` has no `healthTestId` column.
The picked test is captured as free text in `notes` / consultation
type. Admin sees "health-test" intent + the priced row but no
structural link back to the HealthTest row. Fix path: add
`Appointment.healthTestId` FK + select it when listing admin
appointments. Effort: half-day. Same shape as
`Appointment.serviceId`.

### Admin Pages doesn't cover prescriptions / tests / pages

`PageKey` enum is HOME / DOCTORS_INDEX / GENERAL_CONSULTATION /
SPECIALIST_CONSULTATION. The prescriptions and tests public pages
render hardcoded copy + SEO. Operator can't edit hero / SEO / body
copy for those pages without a code change. Fix path: add
`PRESCRIPTIONS` + `HEALTH_TESTS` to the `PageKey` enum, surface in
`/admin/pages`, and read those rows on the public pages with a
fallback to the current static text. Effort: 1 day.

### Admin patient / user management

There's no `/admin/users` route, no backend admin-users endpoint,
no sidebar entry. The seeded admin account exists in the DB but
there's no surface to:
- Search patient accounts
- Reset another user's password
- Suspend / re-activate a patient
- Promote a patient to admin

Fix path: new `/admin/users` listing + detail page (filter by role,
search by email/name), `backend/src/routes/admin-users.route.ts` with
auth-gated GET / PATCH, audit-log entries for every write. Effort:
1.5 days.

### Dead admin fields with no public render

A handful of admin-editable fields don't surface anywhere on the
public site:
- `Service.heroTitle / heroDescription / ctaLabel / detailBody /
  legacyPath` — leftovers from a service-detail page that never
  shipped.
- `HealthTest` gallery / detailIntro / `whatThisTestCovers` /
  `whyGetTested` / `extraSections` / SEO — no public detail route.

Either ship the service-detail + health-test detail pages, or trim
these columns out of the admin forms and schema. Effort: 1 day to
ship the public pages OR 0.5 day to trim. The fields are useless
clutter in the admin until one of those happens.

### Public booking form date-of-birth field

`BookingSetting.requireDateOfBirth` is now wired in the admin UI and
the backend reads it, but the public booking form has no DOB input.
Flipping the toggle on today would reject every booking with
"date-of-birth required." Public form gains a DOB field when this
toggle is meant to be live. Effort: 0.5 day (add DOB input,
bookingSchema field, backend enforcement).
**Hosting:** Railway hosts all three services in this project — frontend (Next.js), backend (Fastify), Postgres. No Vercel split; promote each via the Railway dashboard.

This document has two halves. **Part A** is the production-handover checklist — every account, env var, DNS record, and migration you have to set up before flipping the public DNS. **Part B** is the phase plan — what to build next, in priority order, with effort estimates.

---

## Part A — Production handover checklist

Treat this as a literal checklist. Tick each box before announcing the launch.

### A.1 External accounts to create

| Service | Why | Plan |
|---|---|---|
| **SendGrid** | Transactional email (verify / reset / booking confirmation) | Free tier: 100 emails/day forever. Essentials: $19.95/mo for 50k/mo. |
| **Stripe** | Payments | No fixed cost; ~1.5% + €0.25 / transaction EU |
| **Stripe CLI** | Local webhook testing | Free |
| **Railway** | Hosting for frontend + backend + Postgres (current setup, all three services) | $5–20/mo for current scale, scales linearly |
| **Domain registrar** | Already own `myglobalhealth.online` | n/a |
| **Cloudflare** *(optional)* | CDN + WAF + analytics | Free tier covers it |
| **Sentry** *(strongly recommended)* | Error tracking | Free tier ok |
| **Trustpilot Business** | Review badge + TrustBox widget. Paste the **Business Unit ID** into `/admin/settings`. | Free for the basic widget |
| **Google Business Profile** | Review badge + maps SEO. Paste the **Place ID** into `/admin/settings`. | Free |
| **Doctify** | Clinic review badge. Paste the **clinic slug** into `/admin/settings`. | Free for the basic embed |
| **UptimeRobot** *(optional)* | Uptime alerts | Free tier (5 min checks) |

### A.2 DNS records to add at your domain registrar

Replace `myglobalhealth.online` with your actual zone if different.

| Type | Host | Value | Purpose |
|---|---|---|---|
| CNAME | `@` (root) *(via flattening / ALIAS at registrar)* | Railway-provided host for the frontend service (`*.up.railway.app`) | Frontend |
| CNAME | `www` | Same Railway frontend host (or alias to `@`) | Frontend www → root |
| CNAME | `api` | Railway-provided host for the backend service | Backend |
| CNAME × 3 | `s1._domainkey`, `s2._domainkey`, `em…` | (SendGrid provides exact hosts in **Sender Authentication → Authenticate Your Domain**) | Email DKIM + return-path |
| TXT | `@` (only if no other SPF) | `v=spf1 include:sendgrid.net ~all` | Email SPF (SendGrid's domain auth flow usually handles this for you via the CNAMEs) |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@myglobalhealth.online` | Email DMARC (optional but recommended) |
| MX | `@` *(if you want inbound email)* | Your inbox provider | Receiving email |

Wait 24h for DNS to propagate before assuming it's broken.

### A.3 Environment variables — production

These all go into your hosting provider's environment-variables UI. Never commit any of them.

**Backend** (Railway / Render / Fly / etc.)

| Key | Production value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables CORS strict mode + cookie Secure flag |
| `DATABASE_URL` | `postgresql://...?sslmode=require` | Production Postgres |
| `AUTH_JWT_SECRET` | `openssl rand -base64 48` output | Rotate before launch — never reuse dev value |
| `AUTH_JWT_EXPIRES_IN` | `7d` | Session length |
| `AUTH_COOKIE_NAME` | `gh_auth` | Keep matching frontend |
| `AUTH_COOKIE_DOMAIN` | `.myglobalhealth.online` | So cookie works on both `www` and `api` subdomains |
| `PORT` | (provider-set, usually `3000` or `8080`) | |
| `CORS_ALLOWED_ORIGINS` | `https://myglobalhealth.online,https://www.myglobalhealth.online` | Comma-separated |
| `PUBLIC_SITE_URL` | `https://myglobalhealth.online` | No trailing slash — used in email links |
| `PUBLIC_MEDIA_ORIGIN` | `https://api.myglobalhealth.online` | Used in upload responses |
| `S3_BUCKET` | (from Railway bucket or AWS) | |
| `S3_ENDPOINT` | e.g. `https://t3.storageapi.dev` | |
| `S3_REGION` | `auto` (Railway) or `eu-west-1` (AWS) | |
| `S3_ACCESS_KEY_ID` | (from bucket creds) | |
| `S3_SECRET_ACCESS_KEY` | (from bucket creds) | |
| `SENDGRID_API_KEY` | `re_...` | Set AFTER you verify the sender domain |
| `EMAIL_FROM` | `noreply@myglobalhealth.online` | Must match a verified SendGrid Domain Authentication |
| `STRIPE_SECRET_KEY` | `sk_live_...` *(or `sk_test_...` during pre-launch)* | Switch to live keys at go-live |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Stripe webhook config) | One per webhook endpoint |
| `ADMIN_API_TOKEN` | unset / empty | Disable the token fallback in prod; rely on session cookies only |
| `ADMIN_TOKEN_FALLBACK_ENABLED` | `false` | Belt + braces |

**Frontend** (Railway — separate service from backend)

| Key | Production value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.myglobalhealth.online` | Backend origin |
| `API_BASE_URL` | `https://api.myglobalhealth.online` | Same; used by SSR fetches |
| `AUTH_COOKIE_NAME` | `gh_auth` | Match backend |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Set when going live |
| `NEXT_PUBLIC_MEDIA_ALLOWED_HOSTS` | `api.myglobalhealth.online` *(plus any CDN host)* | Comma-separated; used by `resolveTrustedAssetUrl` |
| `NEXT_PUBLIC_SITE_URL` *(if added later)* | `https://myglobalhealth.online` | |

### A.4 Database — first deploy

```
# from the backend project, with production DATABASE_URL exported
pnpm prisma migrate deploy    # applies tracked migrations
pnpm prisma db seed           # seeds countries, currencies, initial admin
```

Then change the initial admin password immediately via the password-reset flow (or update directly in the DB).

**Backups:** enable point-in-time recovery on your DB provider (Railway / Neon / Supabase all have a checkbox).

### A.5 File storage — first deploy

S3-compatible bucket (Railway bucket, AWS S3, Cloudflare R2, Backblaze B2 — any). One bucket per environment.

- Region: pick **EU** for GDPR
- Public-read for `/media/*` keys (or front with your API which already proxies them — current setup uses the API proxy, simpler)
- CORS allowlist (only the frontend origin needs to GET):
  - Allowed origins: `https://myglobalhealth.online`, `https://www.myglobalhealth.online`
  - Allowed methods: `GET`
- Lifecycle rule (optional): expire test uploads after 30 days

### A.6 Stripe — pre-launch checklist

While in **Test Mode** (current state):

- [ ] Stripe account created
- [ ] Test API keys in dev env vars
- [ ] `stripe listen` running locally + `STRIPE_WEBHOOK_SECRET` in `.env`
- [ ] One end-to-end purchase tested with card `4242 4242 4242 4242`
- [ ] Refund flow tested (Stripe dashboard → Refund → webhook hits → Appointment.paymentStatus → REFUNDED)
- [ ] Failed-payment flow tested with card `4000 0000 0000 9995`

Switching to **Live Mode**:

1. Stripe dashboard → activate your account (provide business info, bank account, ID)
2. Toggle Test Mode off → grab live keys
3. **Developers → Webhooks → Add endpoint** → URL `https://api.myglobalhealth.online/api/payments/webhook`, select these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `charge.refunded`
4. Copy the new `whsec_...` into prod `STRIPE_WEBHOOK_SECRET`
5. Update `STRIPE_SECRET_KEY` to the live key (backend)
6. Update `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to live key (frontend)
7. Redeploy

### A.7 SendGrid — pre-launch checklist

- [ ] SendGrid account created (free tier: 100 emails/day forever)
- [ ] **Settings → Sender Authentication → Authenticate Your Domain** completed
      for `myglobalhealth.online`
- [ ] Three CNAME records published at your DNS registrar (SendGrid shows the
      exact host + target values during the wizard) and verified green in
      the SendGrid UI
- [ ] DMARC record set: `v=DMARC1; p=quarantine; rua=mailto:dmarc@…` (optional
      but reduces spoofing, lifts deliverability)
- [ ] API key created at **Settings → API Keys** with `Mail Send → Full Access`
      (Restricted Access scope — never use Full Access for the live key)
- [ ] `SENDGRID_API_KEY`, `EMAIL_FROM`, `PUBLIC_SITE_URL` set in prod env
- [ ] Send-test from SendGrid Email API tester → arrives in inbox (not spam)
- [ ] Smoke test signup → verification email arrives + link works
- [ ] Smoke test forgot-password → reset email arrives + link works
- [ ] Smoke test booking submit → confirmation email arrives
- [ ] (Optional) Set up **Event Webhook** at Settings → Mail Settings →
      Event Webhook pointing at `https://api.myglobalhealth.online/api/email/webhook`
      so we record bounces / spam reports / opens (not yet wired —
      add when needed)

If emails land in spam, the SPF/DKIM/DMARC trio usually fixes it after 24–48h of warming.

### A.8 Security checklist (must-do before public launch)

- [ ] `NODE_ENV=production` everywhere — flips cookie Secure flag, hardens CORS
- [ ] `AUTH_JWT_SECRET` rotated from dev value to a fresh ≥48-byte secret
- [ ] `ADMIN_API_TOKEN_FALLBACK_ENABLED=false` (or the env var unset) — disables the token-only admin bypass
- [ ] `CORS_ALLOWED_ORIGINS` strictly set to your production frontend origins only
- [ ] Stripe webhook secret matches the webhook endpoint
- [ ] Initial seeded admin password changed
- [ ] DB has automated daily backup enabled
- [ ] Sentry error tracking wired (add `@sentry/nextjs` + `@sentry/node` packages with `SENTRY_DSN` env) — not yet built; ~2h work
- [ ] Rate limiting in front of `/api/auth/*` and `/api/appointments` — not yet built; either Fastify `@fastify/rate-limit` plugin or Cloudflare WAF rule (~30 min)
- [ ] HTTPS enforced (provider handles this for you — confirm cert)
- [ ] Security headers (CSP, X-Frame-Options, X-Content-Type-Options) — Next.js sets reasonable defaults; verify with [securityheaders.com](https://securityheaders.com)

### A.9 Cookie banner / GDPR

Phase 1 doesn't ship a cookie consent banner yet. Before launch in EU, you legally need one if you add Google Analytics or any non-essential cookies. Options:
- **CookieYes** ($10/mo) — drop-in widget
- **Cookiebot** ($14/mo) — same
- **Build it** — small effort if you have <5 cookie categories

The site's own cookies (`gh_auth`, `gh_admin_country`, `gh_locale`) are **strictly necessary** and don't need consent.

### A.10 Go-live day runbook

1. **Freeze admin edits** for 30 min to avoid mid-deploy state surprises
2. Deploy backend with prod env vars → confirm `/health` 200, `/api/countries` 200
3. Deploy frontend with prod env vars → confirm `/` renders
4. Run smoke tests:
   - Sign up → verification email → verify → sign in works
   - Forgot password → reset email → reset → sign in works
   - Submit a booking → admin inbox receives it + confirmation email goes out
   - If Stripe live: do one real test charge for €1 and refund it
5. Update DNS A/CNAME records → switch traffic
6. Watch error logs for 30 min
7. Announce

### A.11 Post-launch monitoring

- Sentry: spike in error rate?
- Backend log: `[email:sendgrid]` errors? `Stripe signature verification failed`?
- Stripe dashboard: failed payments / disputes?
- DB connection pool exhaustion (Railway shows this on the metrics tab)?

---

## Part B — Phase plan (what to build next)

### Where we are right now

| | Status |
|---|---|
| **Phase 1** — country-first marketing site + super-admin portal | ✅ Done. 5 countries × home + doctors + general consult + specialist consult, plus prescriptions / tests / plans public pages. Admin CRUDs every editable surface. Image upload to S3. Rich-text editor with sanitizer + locale extensibility. |
| **Phase 2 infrastructure** — SendGrid + Stripe + Payment ledger | ✅ Scaffolded, gated on env keys. Drops in instantly when you set the keys. |
| **Phase 2 completion** — Patient Portal + Stripe flow + email gating | 🟡 Half done. Account dashboard + profile edit + bookings list + verify/reset pages all live. Stripe Checkout redirect from booking form not yet wired. |
| **Phase 3** — Doctor Dashboard | 🟡 MVP shipped (auth + overview + my-appointments + patients + self-edit profile). Phase 4 dashboard expansion (consult notes, forms, exams, invoices, reports, messaging, etc.) listed below. |
| **Phase 4** — Reviews + GEO + Conditions library | 🔴 Not started. |
| **Phase 5** — Ops + scale | 🔴 Not started. |

---

### Phase 2 — Patient Portal completion (1–2 weeks)

Goal: every patient-facing action a logged-in user might take is wired.

| Item | Effort | Notes |
|---|---|---|
| Wire booking form → Stripe Checkout redirect when service has a price + Stripe is configured | 1 day | Modify `BookingFormTemplate` to call `/api/payments/checkout-session` after `/api/appointments`, then `window.location` to the returned `url`. Falls back to admin-inbox flow if Stripe disabled. |
| Booking confirmation page (`/[country]/[lang]/book-online/confirmed?session_id=…`) | 0.5 day | Reads Stripe session, shows receipt link, marks the booking as user's in `/account/bookings` |
| Email verification gate — block booking unless verified? | 0.5 day | Decision call — recommend: warn but allow first booking, hard-block second |
| Update `/account/bookings` to show payment status pill (UNPAID / PENDING / PAID / REFUNDED) | 0.5 day | Already have the data, just rendering work |
| Receipts page `/account/payments` reads from `Payment` ledger | 1 day | Replace the empty state with a real table |
| Patient profile: add language preferences + emergency contact | 1 day | Schema bump + form fields |
| Account-level password change (separate from forgot-password flow) | 0.5 day | New `POST /api/auth/change-password` endpoint requiring current password |

**Total: ~5 working days once you have Resend + Stripe keys in dev.**

---

### Phase 3 — Doctor Dashboard MVP — ✅ shipped

Goal: doctors log into their own dashboard, see what's on their plate
today, and keep their public profile up to date. The MVP unblocks
alpha-testing without trying to bite off the whole 14-module clinical
suite in one pass.

| Item | Status |
|---|---|
| `UserRole.DOCTOR` enum value + `User.doctorId` nullable FK | ✅ shipped |
| `Appointment.doctorId` FK so a doctor's appointments are queryable | ✅ shipped |
| Admin `/admin/users/[id]` linking — set role=DOCTOR + paste Doctor profile id | ✅ shipped |
| `verifyDoctorAccess` middleware — session → role → User.doctorId required | ✅ shipped |
| `(doctor)` route group + dark portal layout + double-layered auth gate (proxy + server) | ✅ shipped |
| `/doctor` overview — today / this week / open appointment counts | ✅ shipped |
| `/doctor/appointments` — paginated, status + search filters, Join-meeting button when scheduled | ✅ shipped |
| `/doctor/patients` — distinct patients deduped by email with appointment counts | ✅ shipped |
| `/doctor/profile` — self-edit fullName, bio, qualifications, languages, WhatsApp | ✅ shipped |
| Login routing: DOCTOR role lands on `/doctor` (not `/account` or `/admin`) | ✅ shipped |
| Proxy gating: PATIENT → `/account`, DOCTOR → `/doctor`, ADMIN can see both | ✅ shipped |

**Operator handoff (no code):**
1. Admin creates a User account for the doctor (or asks them to register).
2. Admin opens `/admin/users/[id]`, sets role=DOCTOR, pastes the Doctor profile id from `/admin/doctors`.
3. Doctor signs in at `/login` → lands on `/doctor`.

Country, slug, IMC registration, profile photo, and the specialty list stay
admin-managed on purpose — those affect public routing and verification copy.

---

### Phase 4 — Doctor Dashboard expansion — ✅ all 9 modules shipped

The full 14-section clinical spec landed across two rounds. Status per module:

| # | Module | Status | Surfaces |
|---|---|---|---|
| 1 | **Consultations workspace** | ✅ shipped | `Consultation` model (SOAP) + `ConsultationStatus`; `/doctor/appointments/[id]` workspace; save-draft + sign-and-lock; print view |
| 2 | **Forms management** | ✅ shipped | `FormTemplate` + `FormSubmission`; `/doctor/forms` builder; submissions render inline on the appointment workspace |
| 3 | **Exam results** | ✅ shipped | `ExamResult` model (text + lab-portal-link MVP); inline list + create form on the workspace |
| 4 | **Services-used tracking** | ✅ shipped | `ConsultationService` line items per consult, with totals; locked when the parent consult is signed |
| 5 | **Invoice visibility (doctor side)** | ✅ shipped | Read-only Invoice card on the workspace; composes `Payment` ledger + line items |
| 6 | **Reports** | ✅ shipped | `/doctor/reports` with date-range filter, tiles (appts / signed consults / patients / revenue), client-side CSV export |
| 7 | **Notifications** | ✅ shipped | `Notification` model + `NotificationType` enum; bell badge on the doctor portal nav; `/doctor/notifications` list; mark-one / mark-all; auto-fanout on internal messages |
| 8 | **Internal messaging** | ✅ shipped (in earlier commit) | `InternalMessage` model; doctor ↔ admin per-appointment thread surfaced on both sides |
| 9 | **Print / share / export** | ✅ shipped | `/print/consults/[id]` print view (auth-gated, white-paper render); 7-day `ShareLink` token + public `/share/consults/[token]` page; copy-to-clipboard button on the workspace. PDF generator (Playwright / @react-pdf) still deferred — print view is the MVP. |

**Cross-cutting work (do once, not per module):**

| Item | Status | Notes |
|---|---|---|
| Audit log writes for every clinical mutation | ✅ shipped | `AuditLog` model + `AuditAction` enum live; `recordAudit` helper wired into consult save/sign, exam create/delete, internal message post, share-link create/revoke, form submission, services-used add/remove. Admin reader at `/admin/audit-log` with action/entity/actor filters. |
| Doctor self-uploads profile photo | ✅ shipped | `POST/DELETE /api/doctor/profile/photo` reuses the S3 object-storage flow; same-origin proxy buffers multipart bytes; UI tile on `/doctor/profile` with avatar fallback. |
| Access control hardening — every new query scoped by `doctorId = self` (or `ADMIN`) | ✅ rolling | Every doctor route goes through `verifyDoctorAccess`; no callsite reads `request.user.id` directly. |
| Doctor availability + slot booking | ✅ shipped | See top of doc. |
| Multilingual UI strings in the doctor portal | ⏳ deferred | Today EN only. The site already has a `LocaleCode` switch in `gh_locale`; mirror inside `(doctor)`. ~1 day when the second-language doctor lands. |
| Doctor onboarding wizard — verification, registration number, first-slot setup | ⏳ deferred | Only matters once self-serve doctor sign-up opens. Admins onboard manually today via `/admin/users/[id]` + `/admin/doctors`. |
| Video consultation provider integration | ⏳ deferred | Doctors paste a Meet URL via the admin schedule action today. Migrate to first-party (Daily.co or Whereby) when consult volume justifies it (2–3 days). |
| Doctor payouts | ⏳ deferred | Stripe Connect Express. Only relevant if the contract model becomes "platform takes a cut" instead of "platform pays salary." |
| PDF generator for print view | ⏳ deferred | Print page exists at `/print/consults/[id]`; Cmd-P → PDF works today. Native PDF via Playwright / `@react-pdf/renderer` is a follow-up if email-attachment workflows demand it. |

**Total Phase 4 eng effort:** ~18 working days for the 9 modules + ~5 days
of cross-cutting = roughly 5 weeks of focused work. Ship the most
demanded module first (likely **Consultations workspace** + **Exam
results**, in that order) so doctors stop running notes in a Word doc.

---

### Phase 4 — Reviews + GEO + Conditions library (2–3 weeks)

#### 4a. Reviews integration — ✅ scaffold shipped, awaiting provider IDs

The 3-provider system is wired end-to-end. To go live you just paste the IDs at `/admin/settings` and Save:

| Item | Status |
|---|---|
| `Review` + `Setting` + `ReviewProvider` Prisma models | ✅ shipped |
| Admin Settings page — Trustpilot business unit ID, Google Place ID, Doctify clinic slug + aggregate per provider | ✅ shipped at `/admin/settings` |
| `GET /api/public/reviews-config` (5-min revalidate, `reviews-config` tag) + admin invalidation on save | ✅ shipped |
| `<ReviewBadge>` server component on country home + general-consultation + specialist-consultation | ✅ shipped |
| `AggregateRating` schema.org JSON-LD using `primaryProvider` (or first available) | ✅ shipped |
| Trustpilot TrustBox widget loader (auto-injected when `businessUnitId` set) | ✅ shipped |
| Doctify embed widget when clinic slug set | ⏳ static badge today; widget swap is a 0.5-day follow-up |
| Google Places API live-rating fetcher (instead of admin-entered aggregate) | ⏳ optional — admin re-enters the count weekly today |

**Operator handoff:** create the three accounts, copy the IDs, paste them at `/admin/settings`. Aggregates can be left blank if you want the badge hidden until you have real data. Setting `primaryProvider` controls which one feeds the `schema.org` `AggregateRating` (Google preferred for SEO).

#### 4b. GEO / AI search

| Item | Effort |
|---|---|
| `/llms.txt` at root (curated content links for AI crawlers) | 0.5 day |
| Citable-passage formatting on service + condition pages | 1 day |
| `MedicalProcedure` / `MedicalTherapy` / `Drug` / `MedicalTest` JSON-LD per page type | 1.5 days |
| `Organization` JSON-LD with sameAs links to social + Trustpilot + regulator pages | 0.5 day |

#### 4c. Conditions library

| Item | Effort |
|---|---|
| `Condition` + `ConditionSpecialty` + `ConditionService` schema | 1 day |
| Admin CRUD for conditions (similar to existing Service form) | 1 day |
| Public `/conditions` index + `/conditions/[slug]` detail pages | 1 day |
| First 20 condition pages (editorial — needs medical reviewer) | 2 weeks of editorial time, parallel to engineering |
| Internal linking: each Specialty page lists conditions; each Condition page links to relevant services per country | 0.5 day |

**Eng total: ~10–12 working days. Editorial total: 2–4 weeks running in parallel.**

---

### Phase 5 — Operations + scale (1–2 weeks, mostly admin)

| Item | Effort |
|---|---|
| `AuditLog` model + tracking on every admin write | 1 day |
| Admin Users management page (invite, change role, deactivate) | 1 day |
| Sentry error-tracking integration (frontend + backend) | 0.5 day |
| Rate limiting (`@fastify/rate-limit`) on auth + bookings + media-upload | 0.5 day |
| Country-domain split: `myglobalhealth.ie` / `.pt` / `.es` / `.cz` / `.ro` *(decision needed)* | 2 days *(once decided)* |
| Status page (BetterStack / Atlassian Statuspage) | 0.5 day setup |
| Cookie consent banner (CookieYes / Cookiebot embed OR custom) | 0.5–1.5 days |
| Newsletter capture form on footer + admin export | 0.5 day |

---

### Phase 6 — Compliance + content polish (rolling)

| Item | Effort |
|---|---|
| GDPR data-processor agreement + sub-processor list pages | 0.5 day eng + legal review |
| Trust & Safety hub (regulator lookups per country, complaints, DPO contact) | 1.5 days eng + content |
| Per-country FAQ population (target 80+ Q&A) | 1 week editorial |
| Editorial blog with named reviewers (the `BlogPost.reviewerDisplayName` field is ready) | rolling editorial |
| Press / media kit page | 0.5 day |
| Per-country location pages (city-level SEO) | 1 week eng + content per country |

---

## Recommended sequencing

If I had to pick the path with the biggest revenue + trust impact per week:

```
Week 1–2:   Production handover (Part A above) — get the live site up
Week 3:     Phase 2 completion — Stripe wired into booking form + payment status on /account/bookings
Week 4–5:   Reviews integration (Phase 4a) — re-add the rating badge with real data;
             biggest visible trust boost
Week 5:     Sentry + rate limiting (Phase 5 ops) — required to sleep at night
Week 6–9:   Doctor Dashboard (Phase 3) — unblocks operational scaling beyond manual booking
Week 10–12: Conditions library + GEO (Phase 4b/c) — SEO compounding starts paying off month 4+
Week 13+:   Editorial cadence + per-country FAQ + blog (Phase 6) — rolling
```

Stripe + Resend can be configured the same day you create the accounts; everything else is already wired to consume those env vars.

---

## When to ping me back

- **As soon as you have SendGrid keys** → I'll smoke-test the email flow against a real inbox + tighten any spam-trigger language in the templates.
- **As soon as you have Stripe test keys** → I'll wire the booking form → Checkout redirect + payment-status column on /account/bookings (Phase 2 completion items 1–4 above).
- **When you're ready for Phase 4 (Doctor Dashboard expansion)** → MVP is live at `/doctor`; the 9 remaining modules are documented under Phase 4 above. Pick the first one to ship and pass the spec back.
- **Reviews:** all three providers (Trustpilot + Google + Doctify) are wired. Paste the IDs at `/admin/settings`.
- **Production handover day** → I'll run the go-live runbook with you (deploy + smoke + DNS flip).

---

## Phase 3 — what's left after current commits

### Operator handoff (no code; you do these)
- `pnpm --filter backend prisma db push` against Railway DB — adds `Appointment.scheduledAt`, `Appointment.meetingUrl`, `Appointment.reminderSentAt`. All nullable; no downtime.
- Set `CRON_SECRET` env on Railway (`openssl rand -base64 32`).
- Add a cron job (Railway scheduled task / EasyCron / GitHub Actions) hitting `POST https://api.myglobalhealth.online/api/internal/run-reminders` hourly with header `x-cron-secret: <CRON_SECRET>`. The endpoint scans the next 23–25h window and emails the 24h reminder.
- Optional: install + wire Sentry. `pnpm --filter backend add @sentry/node` then add `Sentry.init({ dsn: env.SENTRY_DSN })` at the top of `backend/src/server.ts`. Frontend is `pnpm --filter frontend add @sentry/nextjs` + run `npx @sentry/wizard@latest -i nextjs`.

### Code still pending (lower-priority, not in this commit)
- **Real-time chat (patient ↔ admin pre-consult)** — deferred. Needs a WebSocket layer (Pusher Channels or Soketi self-hosted ~$10/mo on Railway). Patient inbox panel + admin chat sidebar. Scope: ~1 week. Not blocking launch — patients can email/WhatsApp until chat ships. Recommended only once daily booking volume justifies it (~50+/day).
- **i18n content translation** — copy in `ContentPage` rows is EN-only today. Operator work: clone HOME / GENERAL_CONSULTATION / SPECIALIST_CONSULTATION rows per `(country, locale)` pair and have a translator fill them. The schema + UI are ready.
- **Stripe go-live** — currently scaffolded behind `STRIPE_SECRET_KEY`. The booking form does not yet route to Checkout — Phase 2 completion item still on the list.
- **Rate limiting** — none yet. Easy add: `@fastify/rate-limit` on `/api/auth/login`, `/api/auth/forgot-password`, `/api/appointments`, `/api/payments/checkout-session`. 0.5 day.
