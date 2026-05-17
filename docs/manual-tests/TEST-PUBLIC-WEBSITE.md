# Manual Browser Test Cases — PUBLIC WEBSITE (No Login)

> **Audience**: Browser-automation AI agent
> **Base URL**: Set `BASE_URL` to the deployed site (e.g., `http://localhost:3000` for local dev)
> **Browser**: Chrome / Firefox / Safari (test mobile widths too: 375px, 768px, 1280px)
> **Test data**: Use unique emails per run, e.g., `test+{timestamp}@example.com`

## Pre-flight
- [ ] Backend server reachable (HTTP 200 on `/api/health`)
- [ ] Database has at least 1 active country, 1 doctor, 1 service per country, 1 health test
- [ ] SendGrid configured OR backend running in dev mode (logs emails to console)
- [ ] No active session cookie (use incognito/private window)

---

## TC-PUB-001 — Homepage / Country Entry Gate

**URL**: `BASE_URL/`

**Steps**:
1. Navigate to homepage
2. Verify page loads with HTTP 200
3. Verify header shows "Global Health" logo + country/language switcher
4. Verify country grid is displayed
5. Count country cards — should match active countries in DB
6. Verify each country card shows: country name, doctor count
7. Click first country card

**Expected**:
- Redirects to `/{country-slug}` (e.g., `/ireland`)
- No console errors

---

## TC-PUB-002 — Country Home Page

**URL**: `BASE_URL/ireland` (and `BASE_URL/ireland/en`)

**Steps**:
1. Navigate to `/ireland`
2. Verify redirect to `/ireland/en` (default locale)
3. Verify hero section: title, subtitle, "Book consultation" CTA button
4. Scroll to **Doctor Wall** — up to 4 doctor cards visible
5. For each doctor card, verify: initials badge, name, title, languages, "Book with [Doctor]" button
6. Click "Book with [Doctor]" — should navigate to `/ireland/en/book-online?doctor=<slug>`
7. Go back, scroll to **Services Catalog** — grid of services
8. Each service card shows: name, type tag (General/Specialist), price, duration
9. Verify **Trust Ribbon** shows: licensed doctors count, countries count, GDPR badge
10. Verify **How It Works** section renders
11. Verify **Review Badge** renders if reviews configured
12. Verify Final CTA at bottom

**Expected**:
- All sections render
- All buttons clickable
- Currency symbol matches country (€ for IE/PT/SP, etc.)

---

## TC-PUB-003 — General Consultation Page

**URL**: `BASE_URL/ireland/en/general-consultation`

**Steps**:
1. Navigate to page
2. Verify hero: title "GP consultation", CTA "Book GP consultation"
3. Verify services grid — shows only `kind=GENERAL` services
4. Each card: name, description, duration, starting price
5. Click a service card → expect navigate to `/book-online?type=general&service=<slug>`
6. Go back, scroll to **Doctors** section (up to 12 GPs)
7. Click "View profile" on a doctor → expect `/doctors/<slug>`

**Expected**: All routing works, prices display correctly

---

## TC-PUB-004 — Specialist Consultation Page

**URL**: `BASE_URL/ireland/en/specialist-consultation`

**Steps**:
1. Navigate to page
2. Verify hero title and CTA
3. Verify **Specialties grid** lists categories (Cardiology, Dermatology, etc.)
4. Verify **Services grid** shows only `kind=SPECIALIST` services
5. Click a specialist service → expect `/book-online?type=specialist&service=<slug>`
6. Verify **Specialist doctors** section (max 12, only doctors with specialty links)

**Expected**: Specialty filtering correct, doctors filtered by specialty

---

## TC-PUB-005 — Doctors Listing Page

**URL**: `BASE_URL/ireland/en/doctors`

**Steps**:
1. Navigate to page
2. Verify grid of all active doctors for country
3. Verify each card: initials badge OR photo, name, title, specialties, languages, "Book with [Doctor]" button
4. Click doctor name or card → navigate to individual profile

**Expected**: All doctors shown, no inactive ones

---

## TC-PUB-006 — Individual Doctor Profile

**URL**: `BASE_URL/ireland/en/doctors/<doctor-slug>`

**Steps**:
1. Navigate to a doctor profile
2. Verify: full name, title/specialty, bio, languages, qualifications, profile image (or initials)
3. Verify "Book consultation" CTA button
4. Click CTA → navigate to `/book-online?doctor=<slug>`

**Expected**: Profile renders, booking deep-link preserves doctor selection

---

## TC-PUB-007 — Online Prescriptions Page

**URL**: `BASE_URL/ireland/en/prescriptions`

**Steps**:
1. Navigate to page
2. Verify hero: "Online prescriptions", CTA "Request a prescription"
3. Verify services grid (only `kind=PRESCRIPTION`)
4. Click a service → expect `/book-online?type=prescription&service=<slug>`

**Expected**: Correct service filtering

---

## TC-PUB-008 — Health Tests Page

**URL**: `BASE_URL/ireland/en/tests`

**Steps**:
1. Navigate to page
2. Verify hero
3. Verify health tests grid
4. Each card: title, description, sample type badge (e.g., "Blood"), results timeline, price
5. Click a test → expect `/book-online?type=health-test&service=<slug>`

**Expected**: All health tests displayed with correct currency

---

## TC-PUB-009 — Blog Listing Page

**URL**: `BASE_URL/blog`

**Steps**:
1. Navigate to `/blog`
2. Verify page title: "Health guides & articles"
3. Verify description paragraph
4. Verify **5 blog cards** in grid (responsive 1/2/3 cols by viewport)
5. Each card: category eyebrow ("Health guide"), title, excerpt, "Read article" link
6. Click first card

**Expected**: Navigate to `/blog/<slug>` with full article

---

## TC-PUB-010 — Blog Article Detail

**URL**: `BASE_URL/blog/what-is-telemedicine`

**Steps**:
1. Navigate directly to article
2. Verify "All articles" back link at top
3. Verify category eyebrow
4. Verify title (h1)
5. Verify metadata row: author name, publish date (formatted), reading time
6. Verify excerpt paragraph
7. Verify article body renders HTML (headings h2/h3, paragraphs, lists)
8. Verify CTA box at bottom: "Ready to speak with a doctor?" + "Book consultation" button
9. Click "Book consultation" → navigate to `/book-online`
10. Test all 5 article slugs:
    - `/blog/what-is-telemedicine`
    - `/blog/prepare-first-online-consultation`
    - `/blog/online-prescriptions-europe`
    - `/blog/benefits-remote-health-monitoring`
    - `/blog/how-to-request-health-test-online`
11. Verify 404 for non-existent slug: `/blog/does-not-exist`

**Expected**: All 5 articles render, 404 for unknown

---

## TC-PUB-011 — Contact Page (Form Submission)

**URL**: `BASE_URL/contact`

**Steps**:
1. Navigate to `/contact`
2. Verify left panel: "Contact us" heading, description, email link `info@myglobalhealth.online`, response time "Within 24 hours on working days", emergency callout
3. Verify form fields present: Full name, Email, Subject, Message
4. **Test client-side validation — submit empty form**:
   - Click "Send message"
   - Expect HTML5 required validation errors on each field
5. **Test field-level errors — submit invalid data**:
   - Name: "A" (less than 2 chars)
   - Email: "not-an-email"
   - Subject: "Hi" (less than 5 chars)
   - Message: "short" (less than 20 chars)
   - Click "Send message"
   - Expect inline red error messages under each field
6. **Test valid submission**:
   - Name: "Test User"
   - Email: `test+{timestamp}@example.com`
   - Subject: "Test contact form"
   - Message: "This is a test message to verify the contact form works correctly."
   - Click "Send message"
   - Wait for response (button shows spinner + "Sending…")
7. **Verify success state**:
   - Form replaced by green success panel with CheckCircle icon
   - Message: "Message sent! Thank you for reaching out. Our team will get back to you within 24 hours."
8. **Verify rate limit**: Submit 6 valid forms in a row from same IP. 6th should return 429 error.

**Expected**:
- Validation works client + server side
- Email sent to admin (check SendGrid logs or backend console)
- Rate limit triggers after 5 submissions/hour

---

## TC-PUB-012 — Login Page

**URL**: `BASE_URL/login`

**Steps**:
1. Navigate to `/login`
2. Verify left dark panel: logo "g" badge + "Global Health", eyebrow "SUPER ADMIN PORTAL", headline, footer "v1.0 · Medicine without borders"
3. Verify right panel: "Welcome back" heading, subheading
4. Verify form fields: Email (placeholder "you@example.com"), Password (placeholder "Your password")
5. Verify "Forgot password?" link top-right of password field
6. **Test show/hide password**: Type "secret123" → click eye icon → text becomes visible → click again → masked
7. **Test invalid login**:
   - Email: `nonexistent@example.com`
   - Password: `wrong`
   - Click "Sign in"
   - Expect error message (e.g., "Invalid credentials")
8. **Test forgot password link**: Click → navigate to `/forgot-password`

**Expected**: Form validation, error handling, navigation work

---

## TC-PUB-013 — Register Page (New Patient Signup)

**URL**: `BASE_URL/register`

**Steps**:
1. Navigate to `/register`
2. Verify desktop layout: left form, right trust panel
3. Verify trust panel: "PATIENT ACCESS" eyebrow, "Healthcare made simple" heading, 2 trust items (Private & secure, Fast response)
4. Verify form fields: Full name, Email, Phone (optional), Password (with show/hide)
5. Verify helper text under password: "Use at least 8 characters with a mix of letters and numbers."
6. **Test password too short**:
   - Full name: "Test Patient"
   - Email: `patient+{timestamp}@example.com`
   - Phone: "+353871234567"
   - Password: "short" (5 chars)
   - Click "Create account"
   - Expect minLength validation error
7. **Test valid registration**:
   - Same fields, password: "TestPass123!"
   - Click "Create account"
   - Expect success → may auto-login + redirect to `/account` OR redirect to login
8. Verify "Already have an account? Sign in" link → navigates to `/login`

**Expected**: Account created in DB, welcome email sent (check console)

---

## TC-PUB-014 — Forgot Password Page

**URL**: `BASE_URL/forgot-password`

**Steps**:
1. Navigate to `/forgot-password`
2. Verify "Back to login" link with ArrowLeft icon
3. Verify heading "Reset your password" and description
4. Enter valid email (registered patient): `patient+1@example.com`
5. Click "Send reset link" button
6. Verify success message
7. Check backend logs for reset email
8. Test invalid email format → expect error
9. Test non-registered email → should still show generic success (anti-enumeration)

**Expected**: Reset link sent, no email enumeration leak

---

## TC-PUB-015 — Reset Password Page (from email link)

**URL**: `BASE_URL/reset-password?token=<valid-token>`

**Steps**:
1. Copy reset token from backend logs (after TC-PUB-014)
2. Navigate with `?token=<token>`
3. Verify new password + confirm password fields
4. Test mismatched passwords → expect error
5. Test password < 8 chars → expect error
6. Submit valid match → expect success → redirect to login
7. Verify reused token returns "expired" error on second use

**Expected**: Token single-use, validation enforced

---

## TC-PUB-016 — Verify Email Page

**URL**: `BASE_URL/verify-email?token=<valid-token>`

**Steps**:
1. Register new patient (TC-PUB-013)
2. Copy verification token from backend logs
3. Navigate with token
4. Verify success message
5. Visit again with same token → expect "already used" or success without re-verifying
6. Navigate with invalid token → expect error
7. Navigate without token → expect error/redirect

**Expected**: Email verification works, idempotent

---

## TC-PUB-017 — Booking Flow (Guest, Free Consultation)

**URL**: `BASE_URL/ireland/en/book-online`

**Steps**:
1. Navigate to page
2. Verify hero: eyebrow "BOOK ONLINE" with Stethoscope icon, title, description
3. Click "Scroll to booking form" CTA → page scrolls to form
4. **Test empty submit**:
   - Click "Request consultation" without filling
   - Expect required field errors
5. **Fill valid form**:
   - Country: "Ireland"
   - Consultation type: "General"
   - Patient's full name: "Test Patient"
   - Email: `patient+{timestamp}@example.com`
   - Phone: "+353871234567"
   - Notes: "Test booking notes — sample symptoms"
   - Tick consent checkbox
6. Click "Request consultation"
7. Expect success message: "Request received. Our team will follow up shortly."
8. Verify booking appears in admin queue (admin must confirm via TEST-ADMIN.md)

**Expected**: Booking created with status REQUEST_RECEIVED, confirmation email sent

---

## TC-PUB-018 — Booking Flow (Guest, Paid Service via Stripe)

**URL**: `BASE_URL/ireland/en/book-online?service=<priced-service-slug>`

**Steps**:
1. Navigate with `?service=<slug>` (a service with price > 0)
2. Verify service pre-selected, type pre-filled
3. Fill all fields validly
4. Tick consent
5. Click "Request consultation"
6. Expect: "Redirecting to secure payment…" message
7. Verify redirect to `checkout.stripe.com`
8. Use Stripe test card: `4242 4242 4242 4242`, any future date, any CVC
9. Complete payment
10. Verify redirect back to site
11. Verify booking with paymentStatus = PAID in admin

**Expected**: Stripe Checkout integration works end-to-end

---

## TC-PUB-019 — Booking Flow (Doctor Pre-selected, Slot Picker)

**URL**: `BASE_URL/ireland/en/book-online?doctor=<doctor-slug>`

**Steps**:
1. Navigate with doctor slug param
2. Verify doctor card visible at top of form
3. Verify time slot picker visible (next 14 days)
4. Verify slots display with date + time range
5. Submit without picking slot → expect required error
6. Select a slot → fill form → submit
7. Verify booking includes `timeSlotId`
8. **Concurrency test**: Open 2 tabs, both select same slot, both submit
9. Verify only 1 succeeds, the other gets "Slot already taken" error

**Expected**: Slot booking is atomic (race-safe)

---

## TC-PUB-020 — Booking Field Pre-fill (Signed-in Patient)

**Steps**:
1. Sign in as patient (TC-PUB-012)
2. Navigate to `/ireland/en/book-online`
3. Verify Full name, Email, Phone are pre-filled from account
4. Email should be read-only or pre-filled but editable

**Expected**: Logged-in patients have less friction

---

## TC-PUB-021 — Newsletter Signup (Footer)

**Steps**:
1. Navigate to any public page
2. Scroll to footer
3. Locate **Newsletter signup** form
4. Enter email: `newsletter+{timestamp}@example.com`
5. Click "Subscribe" button
6. Verify success message
7. Submit same email again → expect "Already subscribed" message OR success (idempotent)
8. Submit invalid email → expect error

**Expected**: Subscriber added to NewsletterSubscriber table

---

## TC-PUB-022 — Country / Language Switcher (Header)

**Steps**:
1. Navigate to `/ireland/en`
2. Click country selector in header
3. Verify dropdown shows all public countries
4. Each country lists supported languages
5. Click Portugal → expect navigate to `/portugal` or `/portugal/pt`
6. Click language switcher → verify languages for current country (EN, PT, etc.)
7. Click PT (Portuguese) → expect URL changes to `/portugal/pt` and content in Portuguese
8. **Test fallback**: Manually navigate to `/portugal/zz` (invalid locale)
9. Expect redirect to default locale `/portugal/pt`

**Expected**: All locales work, invalid falls back gracefully

---

## TC-PUB-023 — Header Search

**Steps**:
1. Navigate to any country page
2. Locate search input in header
3. Type "cardiology" → verify autocomplete dropdown or search results
4. Type doctor name → expect doctor in results
5. Click a result → navigate to relevant page

**Expected**: Search returns relevant content

*Note: If search not implemented, mark as N/A*

---

## TC-PUB-024 — Footer Links

**Steps**:
1. Scroll to footer on any page
2. Verify columns: Care, Clinics, Account, Company
3. **Care links**: Book consultation, GP consultation, Specialist consultation, Our doctors — verify each clicks to correct URL (country-scoped if on country page, else `/`)
4. **Clinics**: All active countries listed → verify each link works
5. **Account**: Sign in, Create account, Forgot password?, My account → verify URLs
6. **Company**: Blog → `/blog`, Contact us → `/contact`, About → `/about`
7. Verify email link `info@myglobalhealth.online` → opens mailto
8. Verify bottom: Privacy link → `/privacy`, copyright, GDPR text

**Expected**: All footer links resolve to live pages

---

## TC-PUB-025 — Privacy Notice Page

**URL**: `BASE_URL/privacy`

**Steps**:
1. Navigate to `/privacy`
2. Verify h1: "Privacy notice"
3. Verify "Last updated" date
4. Verify 6 sections render: Who we are, What we collect, Cookies, Your rights, Retention, Sub-processors
5. Verify GDPR links: `/account/security` (Download my data, Delete account)
6. Verify mailto link: `privacy@myglobalhealth.online`

**Expected**: Full GDPR content visible

---

## TC-PUB-026 — Responsive Behavior

**Steps**:
1. Resize browser to **mobile (375px)**:
   - Header collapses to hamburger menu
   - Footer columns stack vertically
   - Blog cards: 1 column
   - Country grid: 1 column
2. Resize to **tablet (768px)**:
   - Blog cards: 2 columns
   - Footer: 2 columns
3. Resize to **desktop (1280px)**:
   - All grids show full columns
   - Sidebar layouts horizontal

**Expected**: No horizontal scroll, no overlapping elements

---

## TC-PUB-027 — Accessibility Smoke Test

**Steps**:
1. Run Lighthouse Accessibility audit on `/`, `/blog`, `/contact`
2. Tab through `/contact` form using keyboard only — verify focus visible
3. Verify all icons have `aria-label` or visible text
4. Verify color contrast on emerald-700 buttons + white text (should be ≥ 4.5:1)

**Expected**: No critical a11y violations

---

## TC-PUB-028 — 404 Page

**Steps**:
1. Navigate to `BASE_URL/this-does-not-exist`
2. Verify 404 page renders
3. Verify navigation back home available

**Expected**: Custom 404, no server error

---

## TC-PUB-029 — Print Pages Refusal (unauth)

**Steps**:
1. As unauthenticated user, navigate to `/print/invoices/some-id`
2. Expect redirect to `/login` or 401/403 page

**Expected**: Print pages auth-gated

---

## Exit checklist

- [ ] All TC-PUB-001 to TC-PUB-029 executed
- [ ] No HTTP 500 errors observed
- [ ] No JavaScript console errors on any page (warnings OK)
- [ ] No broken images (404 on `/api/media/...`)
- [ ] All form submissions either succeed or show graceful error
- [ ] Stripe test mode active (no real charges)
- [ ] Test artifacts (test patients, bookings, subscribers) cleaned up or marked as test
