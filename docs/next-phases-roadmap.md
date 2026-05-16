# Global Health · Next-Phases Roadmap

**Roadmap date:** 2026-05-16
**Status today:** Phase 1 shipped end-to-end. Phase 2 infrastructure (Resend + Stripe scaffolding) merged on `old_website` at commit `d2508ac`, both gated behind env keys so production keeps working without them.

This document has two halves. **Part A** is the production-handover checklist — every account, env var, DNS record, and migration you have to set up before flipping the public DNS. **Part B** is the phase plan — what to build next, in priority order, with effort estimates.

---

## Part A — Production handover checklist

Treat this as a literal checklist. Tick each box before announcing the launch.

### A.1 External accounts to create

| Service | Why | Plan |
|---|---|---|
| **Resend** | Transactional email (verify / reset / booking confirmation) | Free tier ok for testing; ~$20/mo at scale |
| **Stripe** | Payments | No fixed cost; ~1.5% + €0.25 / transaction EU |
| **Stripe CLI** | Local webhook testing | Free |
| **Railway** (or Vercel/Render/Fly) | Hosting for backend + Postgres | $5–20/mo for current scale |
| **Vercel** | Hosting for frontend (Next.js) | Free hobby tier, $20/mo Pro for production |
| **Domain registrar** | Already own `myglobalhealth.online` | n/a |
| **Cloudflare** *(optional)* | CDN + WAF + analytics | Free tier covers it |
| **Sentry** *(strongly recommended)* | Error tracking | Free tier ok |
| **Trustpilot Business** *(deferred)* | Review badge widget | Free for the basic widget |
| **Google Business Profile** *(deferred)* | Review badge + maps SEO | Free |
| **Plausible / GA4** *(optional)* | Analytics | Plausible €9/mo, GA4 free |
| **UptimeRobot** *(optional)* | Uptime alerts | Free tier (5 min checks) |

### A.2 DNS records to add at your domain registrar

Replace `myglobalhealth.online` with your actual zone if different.

| Type | Host | Value | Purpose |
|---|---|---|---|
| A / CNAME | `@` (root) | Vercel-provided IP / `cname.vercel-dns.com` | Frontend |
| CNAME | `www` | `cname.vercel-dns.com` | Frontend www → root |
| CNAME | `api` | Railway-provided host (or your backend host) | Backend |
| TXT | `@` | `v=spf1 include:_spf.resend.com ~all` (Resend will give you the exact value) | Email SPF |
| CNAME | `resend._domainkey` | (Resend provides) | Email DKIM |
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
| `RESEND_API_KEY` | `re_...` | Set AFTER you verify the sender domain |
| `EMAIL_FROM` | `noreply@myglobalhealth.online` | Must match a verified Resend domain |
| `STRIPE_SECRET_KEY` | `sk_live_...` *(or `sk_test_...` during pre-launch)* | Switch to live keys at go-live |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Stripe webhook config) | One per webhook endpoint |
| `ADMIN_API_TOKEN` | unset / empty | Disable the token fallback in prod; rely on session cookies only |
| `ADMIN_TOKEN_FALLBACK_ENABLED` | `false` | Belt + braces |

**Frontend** (Vercel)

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

### A.7 Resend — pre-launch checklist

- [ ] Resend account created
- [ ] Sender domain added (`myglobalhealth.online`)
- [ ] SPF + DKIM DNS records published and verified (green checkmarks in Resend UI)
- [ ] DMARC record set (optional but reduces spoofing)
- [ ] `RESEND_API_KEY`, `EMAIL_FROM`, `PUBLIC_SITE_URL` set in prod env
- [ ] Send-test email from Resend dashboard → arrives in inbox (not spam)
- [ ] Smoke test signup → verification email arrives + link works
- [ ] Smoke test forgot-password → reset email arrives + link works
- [ ] Smoke test booking submit → confirmation email arrives

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
- Backend log: `[email:resend]` errors? `Stripe signature verification failed`?
- Stripe dashboard: failed payments / disputes?
- DB connection pool exhaustion (Railway shows this on the metrics tab)?

---

## Part B — Phase plan (what to build next)

### Where we are right now

| | Status |
|---|---|
| **Phase 1** — country-first marketing site + super-admin portal | ✅ Done. 5 countries × home + doctors + general consult + specialist consult, plus prescriptions / tests / plans public pages. Admin CRUDs every editable surface. Image upload to S3. Rich-text editor with sanitizer + locale extensibility. |
| **Phase 2 infrastructure** — Resend + Stripe + Payment ledger | ✅ Scaffolded, gated on env keys. Drops in instantly when you set the keys. |
| **Phase 2 completion** — Patient Portal + Stripe flow + email gating | 🟡 Half done. Account dashboard + profile edit + bookings list + verify/reset pages all live. Stripe Checkout redirect from booking form not yet wired. |
| **Phase 3** — Doctor Dashboard | 🔴 Not started. Schema slot reserved (`Doctor.userId` FK to `User` planned). |
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

### Phase 3 — Doctor Dashboard (3–4 weeks)

Goal: doctors log into their own dashboard, manage availability, run consultations, write prescriptions.

| Item | Effort |
|---|---|
| Add `UserRole.DOCTOR` enum value + `Doctor.userId` nullable FK | 0.5 day |
| Doctor invitation flow — admin invites a Doctor row → email-based account creation | 1 day |
| `(doctor)` route group, layout, auth gate | 1 day |
| `/doctor/dashboard` — today's appointments, pending review, quick actions | 1 day |
| `/doctor/availability` — weekly recurring slots + one-off blocks | 2 days |
| `/doctor/appointments/[id]` — start consult, write notes, write prescription | 3 days |
| Backend: `Prescription` model + `POST /api/doctor/prescriptions` | 1 day |
| Email patient when prescription is issued | 0.5 day |
| Doctor profile public page already exists — connect to logged-in doctor's CMS row | 0.5 day |
| Doctor onboarding (registration number verification, photo upload, bio) | 1.5 days |
| Doctor payout model (optional; depends on contract model) | 2 days |
| Video consultation provider integration (Whereby? Daily.co? Zoom?) | 2–3 days, pick provider first |

**Total: ~15–20 working days.** Hire/contract a doctor early to alpha-test the consult flow.

---

### Phase 4 — Reviews + GEO + Conditions library (2–3 weeks)

#### 4a. Reviews integration

| Item | Effort |
|---|---|
| `Review` + `ReviewProvider` + `AggregateRating` Prisma models | 1 day |
| Admin Settings page where you paste Trustpilot business unit ID, Google Place ID, Doctify clinic ID | 0.5 day |
| Trustpilot TrustBox widget embed (per-country) | 0.5 day |
| Google Places API ratings fetcher with caching | 1 day |
| Doctify widget embed | 0.5 day |
| Combined `<ReviewBadge>` component picking best available source | 0.5 day |
| `AggregateRating` schema.org markup on country home + doctor profile | 0.5 day |

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
| GA4 or Plausible integration (cookie-consent gated) | 0.5 day |
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

- **As soon as you have Resend keys** → I'll smoke-test the email flow against a real inbox + tighten any spam-trigger language in the templates.
- **As soon as you have Stripe test keys** → I'll wire the booking form → Checkout redirect + payment-status column on /account/bookings (Phase 2 completion items 1–4 above).
- **When you're ready for Phase 3 (Doctor Dashboard)** → it's a clean greenfield; the schema slot is already reserved.
- **When you decide on Trustpilot vs Doctify vs Google** for the review provider → I'll wire the picked one in a single commit.
- **Production handover day** → I'll run the go-live runbook with you (deploy + smoke + DNS flip).
