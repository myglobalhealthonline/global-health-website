# Manual Browser Test Cases — ADMIN Role

> **Audience**: Browser-automation AI agent
> **Base URL**: Set `BASE_URL` (e.g., `http://localhost:3000`)
> **Admin credentials**: Use existing admin or seed one via DB
> **Scope**: 74 admin pages. Tests cover all CRUD + filtering + scoping.

## Pre-flight
- [ ] Admin account exists (`User.role = ADMIN`)
- [ ] Backend reachable
- [ ] At least 1 country, 1 doctor profile, 1 service, 1 health test seeded
- [ ] Stripe test mode (for invoice testing)
- [ ] SendGrid in dev/log mode
- [ ] S3 / object storage configured (for asset/document upload)

---

## TC-ADM-001 — Admin Login

**URL**: `BASE_URL/login`

**Steps**:
1. Navigate to `/login`
2. Enter admin email/password
3. Click "Sign in"
4. Verify redirect to `/admin`
5. Verify `gh_auth` cookie set with ADMIN role

**Expected**: Login works, admin lands on dashboard

---

## TC-ADM-002 — Dashboard

**URL**: `BASE_URL/admin`

**Steps**:
1. Verify **greeting**: "Good morning/afternoon/evening, {FirstName}"
2. Verify **scope indicator**: "Scope · All countries" OR specific country
3. Verify **5 stat cards** (responsive grid):
   - Active countries
   - Doctors live
   - Pages published (vs target 4 per country)
   - Services published
   - Bookings pending
4. Click each stat card → verify navigation to respective list
5. **Recent activity panel** (left, 1.4fr):
   - Up to 7 items (appointments + pages)
   - Each row: flag badge, primary text bold, verb, target bold, pill ("booking" / "page"), relative timestamp
   - "View all" → `/admin/appointments`
6. **Quick actions panel** (right, 1fr):
   - 4 links: Edit country home, Add a new doctor, Enable a new country, Review bookings
   - Each shows count if applicable
7. **Country health matrix** (if no country scoped):
   - Table: Country | Doctors | Services | Pages (X/4 color) | Pending | Open
   - Row click → scopes to country
8. **Header actions** top-right:
   - "View public site" → `/{slug}` in new tab
   - "New page" → `/admin/pages/new`

**Expected**: Dashboard renders with live stats

---

## TC-ADM-003 — Country Scope Picker

**Steps**:
1. From `/admin`, click country picker top-right (default "All countries")
2. Verify dropdown shows all active countries
3. Click "Ireland"
4. Verify scope indicator changes to "Scope · Ireland"
5. Verify country-scoped sidebar items become active (Country home, Pages, Services, Appointments)
6. Click "All countries" → resets scope
7. Verify country picker preference persists in cookie (`admin_country_preference`)

**Expected**: Scope cookie works across pages

---

## TC-ADM-004 — Sidebar Navigation

**Steps**:
1. Verify **Global section** (always shown):
   - Dashboard (LayoutDashboard) → `/admin`
   - Countries (Globe2) → `/admin/countries`
   - Categories (Tags) → `/admin/specialties`
   - Doctors (UserRound) → `/admin/doctors`
   - Assets (ImageIcon) → `/admin/assets`
   - Users (Users) → `/admin/users`
   - Newsletter (Mail) → `/admin/newsletter`
   - Audit log (Bell) → `/admin/audit-log`
   - Settings (Settings) → `/admin/settings`
2. **Country-scoped section** (dimmed if no country):
   - Country home → `/admin/country-home`
   - Country content → `/admin/country-content`
   - Pages → `/admin/pages`
   - Services (with nested: General, Specialist, Prescriptions, Health tests)
   - Appointments → `/admin/appointments`
3. Click each → verify navigation

**Expected**: All sidebar links resolve

---

## TC-ADM-005 — Countries List

**URL**: `BASE_URL/admin/countries`

**Steps**:
1. Navigate to page
2. Verify header: eyebrow "Global", h1 "Countries", description
3. Verify "Add country" button (primary, Plus icon) → `/admin/countries/new`
4. Verify toolbar: "{N} countries · {M} active"
5. Verify table columns: drag handle, Country (flag+name), Code, Locale, Currency, Status, Key routes, Actions
6. Verify Actions: View (Eye), Edit (Edit3), Delete (Trash2 red)
7. **Test drag-to-reorder**: drag row up/down → verify backend persists
8. Click View → `/admin/countries/<id>`
9. Click Edit → `/admin/countries/<id>/edit`

**Expected**: List renders, reordering works

---

## TC-ADM-006 — Create Country

**URL**: `BASE_URL/admin/countries/new`

**Steps**:
1. Navigate to page
2. Verify form sections: Identifiers, Currency, Domain routing, Domains, Booking settings, Active
3. Fill required fields:
   - Name: "Test Country"
   - Code: "TC"
   - Slug: "test-country"
   - Default locale: "en-TC"
   - Supported locales: ["EN"]
   - Currency: select EUR
4. Domain paths auto-fill from slug (verify)
5. **Test invalid code**: enter 4 chars → expect validation error
6. **Test duplicate slug**: use existing slug → expect server error
7. Click "Create country"
8. Verify redirect to `/admin/countries` with success alert
9. New country appears in list

**Expected**: CRUD works, validation enforced

---

## TC-ADM-007 — Country Detail + Edit

**URL**: `BASE_URL/admin/countries/<id>`

**Steps**:
1. Click into a country
2. Verify "Back to countries" breadcrumb
3. Verify header: eyebrow with flag, h1 country name, status pill, "Edit" button
4. Verify cards: Identifiers, Public routes, Domains
5. Verify sidebar: Visibility (Deactivate/Active), Stats (Doctors, Services, Categories), Danger zone (Delete)
6. **Test deactivate**: click "Deactivate country" → confirm → status changes
7. **Test reactivate via Edit**: navigate to edit, toggle Active checkbox, Save
8. Edit page: verify all fields editable, same form as create

**Expected**: Detail view + edit work

---

## TC-ADM-008 — Country Delete

**Steps**:
1. From country detail, scroll to **Danger zone**
2. Click "Delete permanently"
3. Verify confirm dialog
4. Confirm → country + all dependent content removed
5. Verify list no longer shows it
6. **Test cascading**: ensure dependent doctors/services/pages also removed (or null'd)

**Expected**: Delete cascades correctly, no orphans

---

## TC-ADM-009 — Doctors List

**URL**: `BASE_URL/admin/doctors`

**Steps**:
1. Navigate to page
2. Verify header + "Add doctor" button
3. Verify **filter card** 4 cols: Country, Category (disabled until country), Status, Search
4. Verify "Apply" + "Clear" buttons, result count
5. Verify **table columns**: Doctor (avatar+name+slug), Title, Practicing in (flags), Languages, Categories, Account (pill: No account / Pending / Active), Status (Published / Suspended), Actions
6. **Test filter**:
   - Country = Ireland → filters
   - Category select enabled now → pick specialty → narrows
   - Status = Inactive → filters
   - Search = "Smith" → narrows
   - Apply → server-side filter
   - Clear → resets
7. Verify pagination if > pageSize
8. Click View/Edit/Delete on a row

**Expected**: All filters + pagination work

---

## TC-ADM-010 — Create Doctor (Stage 1: Country Selection)

**URL**: `BASE_URL/admin/doctors/create`

**Steps**:
1. Navigate to page
2. Without `?countryId`, verify country picker shown
3. Select country → click "Continue"
4. URL changes to `/admin/doctors/create?countryId=<id>` (or similar)

**Expected**: Stage 1 gates the form

---

## TC-ADM-011 — Create Doctor (Stage 2: Full Form)

**Steps**:
1. After country selection, verify form sections:
   - Basic info: Full name, Title, Slug, Bio (rich text)
   - Credentials: IMC registration, Medical reg URL, Qualifications (repeater)
   - Contact: WhatsApp, Languages
   - Categories: specialty checkboxes
   - Countries: primary (locked) + additional (M:N)
   - Publication: Active checkbox
   - SEO: title, description
   - Profile image: uploader
2. Fill minimum required:
   - Name: "Dr. Test Doctor"
   - Title: "General Practitioner"
   - Slug: "dr-test-doctor"
3. Click "Create profile"
4. Verify redirect to detail page with success alert
5. **Test duplicate slug per country**: try same slug, same country → expect error

**Expected**: Doctor created, slug uniqueness enforced

---

## TC-ADM-012 — Doctor Detail — Account Access (Invite)

**Preconditions**: Doctor profile created, no `loginUser`

**Steps**:
1. Navigate to doctor detail
2. Verify "Back to doctors" breadcrumb
3. Verify header + main cards: Identifiers, Qualifications, Bio
4. Verify sidebar **Account access card**:
   - "No login user" state
   - Email input (required)
   - Greeting name (optional)
   - "Send invitation" button (Mail icon)
5. Enter email + greeting, click "Send invitation"
6. Verify success message
7. Backend logs show invite email with `?invite=1` token
8. Doctor record now has `loginUser` linked
9. Verify card now shows: email, verification status, active state, "Resend invite" button
10. Link to `/admin/users/<loginUserId>` works
11. Click "Resend invite" → verify new email sent

**Expected**: Invite flow works end-to-end

---

## TC-ADM-013 — Doctor Detail — Visibility + Danger Zone

**Steps**:
1. From doctor detail
2. **Visibility card**:
   - If active: "Deactivate profile" button (danger) → confirms → marks inactive
   - If inactive: text "This profile is inactive. Re-enable from Edit."
3. **Danger zone**: "Delete permanently" → removes profile + assets
4. Verify deactivated doctor doesn't appear on public site

**Expected**: Soft-delete (deactivate) and hard-delete both work

---

## TC-ADM-014 — Edit Doctor — Multi-Country Listing

**URL**: `BASE_URL/admin/doctors/<id>/edit`

**Steps**:
1. Navigate to edit
2. Verify all fields editable
3. **Profile photo aside**: replace/remove drag-drop uploader
4. **Practicing in card**:
   - Primary country checked + locked
   - Other countries unchecked
   - Tick another country → verify badge "Linked listing" appears
   - Save
5. Verify doctor now appears on second country's public listing
6. Untick → doctor removed from that country's listing

**Expected**: M:N linking works via `DoctorCountry` join

---

## TC-ADM-015 — Doctor Availability (Add Weekly Window)

**URL**: `BASE_URL/admin/doctors/<id>/availability`

**Steps**:
1. Navigate to availability page
2. Verify h1 with doctor name
3. Verify description about UTC storage
4. Verify **Weekly windows card** (left):
   - Empty state: "No availability windows yet..."
   - Or table with: Day, From, To, Slot, Status, Remove
5. **Add window form** (right):
   - Day: dropdown Sun-Sat
   - From time: input time, default "09:00"
   - To time: input time, default "17:00"
   - Slot duration: select 15/20/30/45/60 min
   - "Add window" button
6. Add: Monday 09:00–17:00, 30-min slots → click Add
7. Verify table row added with "Active" status
8. **Test concrete slots**: from public site (`/[country]/[lang]/book-online?doctor=<slug>`), verify slot picker shows Monday slots for next 14 days
9. Remove window: click Remove (trash) → confirm → row deleted
10. Verify slots no longer appear on public

**Expected**: Recurring windows + slot generation work

---

## TC-ADM-016 — Specialties / Categories Matrix

**URL**: `BASE_URL/admin/specialties`

**Steps**:
1. Navigate to page
2. Verify h1: "Categories", description, "New category" button
3. Verify **matrix table**:
   - Columns: Category (icon + name + slug), Type (pill), [one col per country], In use (X/Y), Actions
   - Rows: one per unique category slug
4. Verify **toggle switches** in country cells:
   - On = category enabled in country
   - Off = category disabled
5. **Test toggle**: click off-state → switch on → backend creates row → verify badge updates
6. **Test toggle off**: click on-state → off → soft-deletes
7. Click "New category" → form: Name, Slug, Type (General/Specialist), Country (or multi), Active
8. Save → verify new row in matrix
9. Verify "Categories without a service yet won't appear on the public site" footer note

**Expected**: Matrix view + toggles + create work

---

## TC-ADM-017 — Services List (All Kinds)

**URL**: `BASE_URL/admin/services`

**Steps**:
1. Navigate to page
2. Verify header
3. Verify **kind tabs** (segmented): General, Specialist, Prescriptions, Health tests
4. Click each tab → URL changes (or filter applies)
5. Verify filter card: Country, Category (if SPECIALIST), Status, Search
6. Verify table columns vary by kind (Specialist has Category column, others don't)
7. Verify Actions: View, Edit, Delete

**Expected**: Tabs filter correctly

---

## TC-ADM-018 — Create Service

**Steps**:
1. From services list, click "Add service"
2. Fill: Name, Slug, Country, Category (if SPECIALIST), Base price (cents), Currency (auto), Duration (min), Summary, Description (rich), Active, SEO, Sort order
3. Save → redirect to list with success
4. Verify service appears in DB + public site

**Expected**: Service CRUD works

---

## TC-ADM-019 — Specialist Consultations

**URL**: `BASE_URL/admin/specialist-consultations`

**Steps**:
1. Navigate → verify forced kind = SPECIALIST
2. Same structure as services list, kind locked
3. Test create + edit

**Expected**: Filter forced, all fields work

---

## TC-ADM-020 — General Consultations

**URL**: `BASE_URL/admin/general-consultations`

**Steps**: Same as above, kind locked to GENERAL

---

## TC-ADM-021 — Online Prescriptions

**URL**: `BASE_URL/admin/online-prescriptions`

**Steps**: Same, kind locked to PRESCRIPTION

---

## TC-ADM-022 — Health Tests List

**URL**: `BASE_URL/admin/health-tests`

**Steps**:
1. Navigate to page
2. Verify h1: "Health tests"
3. Filter: Country, Status, Search ("Title, slug, sample type")
4. Table: Title, Slug, Country, Price, Sample/results ("Blood · 5-7 days"), Status, Actions
5. Click "Add health test" → form

**Expected**: List + filter works

---

## TC-ADM-023 — Create Health Test

**Steps**:
1. From health tests list, "Add health test"
2. Verify form sections:
   - Basic info: Title, Slug, Country
   - Pricing: Price (cents), Currency, Sample type, Results timeline, Preparation
   - Content: What's measured (repeater), Coverage (repeater), Included tests (list)
   - Publication: Active
   - Media: Hero image uploader
   - SEO
3. Fill all → save
4. Verify on public `/[country]/[lang]/tests` page

**Expected**: Health test CRUD complete

---

## TC-ADM-024 — Appointments Queue

**URL**: `BASE_URL/admin/appointments`

**Steps**:
1. Navigate to page
2. Verify scope banner (if scoped)
3. Verify h1: "Appointment queue", description
4. Verify **filter card** 4 cols: Status, Country, Consultation type, Search
5. Status options: All, Request received, Under review, Contacted, Cancelled, Completed
6. Country: All + list
7. Type: All, General, Specialist, Follow-up
8. Verify table cols: Patient, Contact (email+phone), Country, Consultation, Status, Created, Notes preview, Detail (ExternalLink icon)
9. **Test filters + pagination**
10. Click detail icon → `/admin/appointments/<id>`

**Expected**: Queue + filters work

---

## TC-ADM-025 — Appointment Detail — Patient Info

**URL**: `BASE_URL/admin/appointments/<id>`

**Steps**:
1. Navigate to detail
2. Verify "Back to queue" breadcrumb
3. Verify header: flag + code eyebrow, patient name h1, type + date, status pill
4. **Main column — Patient details card**:
   - Full name, Email, Phone, Country, Type, Payment, Scheduled, Meeting URL, Created, Updated
5. **Notes card**: preformatted plaintext or "No notes provided"
6. **Sidebar**:
   - Status card (move status dropdown + "Save status")
   - Patient chat card
   - Internal notes card
   - Schedule call card

**Expected**: All info visible

---

## TC-ADM-026 — Move Appointment Status

**Steps**:
1. From appointment detail sidebar, **Status card**
2. Verify dropdown shows allowed next statuses (based on transition rules)
3. Select "Contacted" → click "Save status"
4. Verify success message + status badge updates
5. **Test invalid transition**: try going COMPLETED → REQUEST_RECEIVED → server reject
6. **Test terminal states**: COMPLETED / CANCELLED → "This booking request is closed. Status updates are disabled."

**Expected**: Status transitions enforced

---

## TC-ADM-027 — Schedule Call

**Steps**:
1. From appointment detail sidebar, **Schedule call card**
2. Verify hidden timezone offset input (browser-side conversion)
3. Slot input: datetime-local
4. Meeting URL: text input
5. Helper text: "Allowed hosts: meet.google.com, zoom.us, teams.microsoft.com, whereby.com, daily.co"
6. **Test valid save**:
   - Slot: tomorrow 10:00
   - URL: `https://meet.google.com/abc-defg-hij`
   - Click "Save schedule"
   - Verify success
   - Backend sends `appointment.scheduled` email to patient
7. **Test invalid host**: URL `https://evil.com/meet` → expect error
8. Verify patient sees the scheduled call in their `/account/bookings`

**Expected**: Schedule + email flow works

---

## TC-ADM-028 — Assign Doctor to Appointment

**Steps**:
1. From appointment detail (look for doctor dropdown — may be in schedule card or separate)
2. Assign a doctor
3. Save
4. Verify backend creates `Notification` for doctor (type `APPOINTMENT_ASSIGNED`)
5. Doctor sees in their notifications + dashboard alert (if within 24h)

**Expected**: Assignment fans out notifications

---

## TC-ADM-029 — Patient Chat (Admin Side)

**Steps**:
1. From appointment detail sidebar, **Patient chat card**
2. Verify ChatThread renders messages from patient↔admin
3. **Send a message**:
   - Type "Hi, can you confirm your symptom timeline?"
   - Click Send
4. Verify message appears right-aligned (admin), emerald background
5. Verify patient sees it in their `/account/bookings` chat (polling)
6. **Test rate limit**: send 61 messages in 1 minute → expect 429

**Expected**: Bi-directional chat works

---

## TC-ADM-030 — Internal Notes (Admin Side)

**Steps**:
1. From appointment detail sidebar, **Internal notes card**
2. Verify InternalMessagesThread with doctor↔admin messages
3. Post note: "Patient prefers afternoon slots — coordinate with Dr. X"
4. Doctor sees it in their appointment detail
5. Patient does NOT see internal notes (verify by patient login)

**Expected**: Internal notes isolated from patient

---

## TC-ADM-031 — Users List

**URL**: `BASE_URL/admin/users`

**Steps**:
1. Navigate to page
2. Verify h1 "Users", description
3. Filter: Search (Name/email), Role (Any/PATIENT/ADMIN), Status (Any/Active/Suspended)
4. Table: Email, Name, Role pill, Status pill, Verified date, Created date, Open
5. Pagination: "Page X of Y, Z users total"
6. Click "Open →" on a user

**Expected**: List + filter work

---

## TC-ADM-032 — User Detail (View + Manage)

**URL**: `BASE_URL/admin/users/<id>`

**Steps**:
1. Verify user info: email, verification status, name, role, active state, created date
2. **Linked doctor profile** (if applicable): link to doctor detail
3. **Test suspend**: click suspend → user can't login → status pill updates
4. **Test reactivate**: click activate → user can login again
5. **Test link/unlink doctor**: for ADMIN-role user without doctorId, set doctorId → user becomes effective doctor login

**Expected**: User management works

---

## TC-ADM-033 — Assets List

**URL**: `BASE_URL/admin/assets`

**Steps**:
1. Navigate to page
2. Verify h1 "Assets", description, "Add asset" button
3. Filter: Country, Kind (IMAGE/ICON/LOGO/BADGE/SOCIAL), Status, Search
4. Table: Preview (thumbnail), Key (mono), Kind (uppercase), Country, Alt, Usage, Status, Actions
5. Click "Add asset" → form

**Expected**: List + filter work

---

## TC-ADM-034 — Create Asset

**URL**: `BASE_URL/admin/assets/new`

**Steps**:
1. Fill: Key, Kind (select), Country (optional), Path/URL, Alt text, Usage note, Active
2. Save
3. Verify in list with thumbnail preview

**Expected**: Asset CRUD works

---

## TC-ADM-035 — Media Upload

**Steps**:
1. From asset create form OR asset edit, locate uploader
2. Upload image file (JPG/PNG/WebP/AVIF, < 5MB)
3. Verify upload succeeds → S3 path returned
4. Verify Path field auto-populated
5. **Test invalid file**: PDF → expect error
6. **Test oversize**: > 5MB → expect 413

**Expected**: Multipart upload to S3 works

---

## TC-ADM-036 — Pages List (CMS)

**URL**: `BASE_URL/admin/pages`

**Steps**:
1. Navigate to page
2. Verify scope banner
3. Verify "New page" button
4. Filter: Country, Page type (HOME/DOCTORS_INDEX/GENERAL_CONSULTATION/SPECIALIST_CONSULTATION/PRESCRIPTIONS/HEALTH_TESTS), Locale (EN/PT/ES/CS/RO/DE), Status (PUBLISHED/DRAFT)
5. Table: Country, Page type, Locale, Title (clamped), Status, Actions (Edit)
6. **Test filters**

**Expected**: Page list + filter work

---

## TC-ADM-037 — Create Page (CMS)

**URL**: `BASE_URL/admin/pages/new`

**Steps**:
1. Fill: Country, Page type, Locale, Title, Slug (auto), Meta description
2. Hero section: Headline, Subheadline, CTA text, CTA URL, Hero image
3. Content blocks: add via repeater (heading/text/image/CTA)
4. Status: DRAFT (initial)
5. Save → redirect with success
6. **Publish**: edit → set Status PUBLISHED → save
7. Verify on public site (`/[country]/[lang]/[page-type-route]`)

**Expected**: CMS works, draft/publish lifecycle correct

---

## TC-ADM-038 — Edit Page

**URL**: `BASE_URL/admin/pages/<id>/edit`

**Steps**:
1. Open existing page → verify form pre-populated
2. Edit content → save
3. Verify changes reflected on public site (may need cache bust)

**Expected**: Edits propagate

---

## TC-ADM-039 — Newsletter Subscribers

**URL**: `BASE_URL/admin/newsletter`

**Steps**:
1. Navigate to page
2. Verify h1 "Newsletter subscribers", description, "Download CSV" button
3. Verify table: Email, Country, Locale, Source, Signed up date, Status (Active green / Unsubscribed red)
4. Click "Download CSV" → file downloads
5. Verify CSV contents match subscribers
6. Empty state: "No subscribers yet..."

**Expected**: List + CSV export work

---

## TC-ADM-040 — Audit Log

**URL**: `BASE_URL/admin/audit-log`

**Steps**:
1. Navigate to page
2. Verify h1 "Audit log", description
3. Filter form 4 cols: Action (dropdown with all actions), Entity type (text), Entity id (text mono), Actor user id (text mono)
4. Click "Apply"
5. Table: When (timestamp), Action (pill with tone), Actor (name+email+role or "System"), Entity (mono type+id), Metadata (preformatted JSON)
6. Pagination: "Page X of Y, Z events total"
7. **Test filter by action**: select CONSULT_SIGNED → only those events
8. **Test entity filter**: paste an appointment ID → narrows
9. Verify all event kinds present (CONSULT_SAVED, CONSULT_SIGNED, EXAM_LOGGED, etc.)

**Expected**: Full audit trail visible + filterable

---

## TC-ADM-041 — Settings Page

**URL**: `BASE_URL/admin/settings`

**Steps**:
1. Navigate to page
2. Verify h1 "Settings", description
3. Verify **4 sections**:
   - Trustpilot: Business Unit ID, Rating (0-5), Review count
   - Google Reviews: Place ID, Rating, Review count
   - Doctify: Clinic ID, Rating, Review count
   - Primary provider: dropdown (Auto, Trustpilot, Google, Doctify)
4. **Test save**:
   - Trustpilot Business Unit ID: "4f1a8a1c0000ff000abc1234"
   - Trustpilot rating: 4.94
   - Review count: 2000
   - Primary provider: Trustpilot
   - Click "Save settings"
5. Verify success
6. Verify public site `AggregateRating` JSON-LD uses Trustpilot values

**Expected**: Settings persist, propagate to public schema

---

## TC-ADM-042 — Country Home (Shortcut)

**URL**: `BASE_URL/admin/country-home`

**Steps**:
1. With country scoped (e.g., Ireland)
2. Navigate to `/admin/country-home`
3. Verify redirect to `/admin/pages?countryId=<id>&pageKey=HOME`
4. Filtered pages list (HOME for Ireland only)
5. Click Edit → goes to page edit

**Expected**: Shortcut works

---

## TC-ADM-043 — Audit Trail Across All Doctor Actions

**Steps**:
1. Have doctor perform: save consult, sign consult, log exam, post internal message, share link, upload doc, delete doc
2. Have admin update appointment status, schedule call, post chat message, assign doctor
3. Navigate to `/admin/audit-log`
4. Filter by appointmentId → verify all events present with correct actorRole
5. Test all action filters

**Expected**: Complete audit trail

---

## TC-ADM-044 — Destructive Actions Confirmation

**Steps**:
1. Test delete on: country, doctor, service, health test, asset, specialty
2. Verify each shows confirm dialog with "This cannot be undone" type wording
3. Cancel → no delete
4. Confirm → row removed, cascade verified

**Expected**: All destructive actions guarded

---

## TC-ADM-045 — Sort/Reorder (Drag-and-Drop)

**Steps**:
1. From countries list, drag a row up
2. Verify backend persists new sortOrder
3. Reload → order maintained
4. Similar for services list

**Expected**: Drag-to-reorder works

---

## TC-ADM-046 — Cross-Role: Admin Can Read Doctor Workspace

**Steps**:
1. As admin, navigate directly to `/doctor` (with doctor middleware allowing ADMIN)
2. Verify admin sees doctor portal (read access for support)
3. Or alternative: admin views via `/admin/appointments/<id>` which mirrors much info

**Expected**: Admin has shoulder-surf access (verify in `verifyClinicalReadAccess`)

---

## TC-ADM-047 — Sign Out

**Steps**:
1. Click admin logout
2. Verify cookie cleared + redirect to login
3. Try `/admin` directly → redirect

**Expected**: Logout works

---

## TC-ADM-048 — Non-Admin Cannot Access

**Steps**:
1. Sign in as patient or doctor
2. Try `/admin/*` URLs → expect redirect/403

**Expected**: Role-based access enforced

---

## TC-ADM-049 — Country Inactive Doesn't Appear Publicly

**Steps**:
1. Deactivate Ireland (TC-ADM-007)
2. From public site, try `/ireland` → expect 404 or redirect
3. Country gate at `/` → Ireland no longer in list
4. Reactivate → appears again

**Expected**: Active flag respected on public site

---

## TC-ADM-050 — Doctor Photo Upload (Admin Side, Edit)

**Steps**:
1. From doctor edit page, profile photo aside
2. Click uploader → select image
3. Verify uploaded → preview updates
4. Click Remove → clears
5. Same as doctor self-upload from `/doctor/profile`

**Expected**: Admin can manage doctor photos

---

## TC-ADM-051 — Service Sort Order

**Steps**:
1. From services list, edit a service → set sort order = 1 → save
2. Edit another → sort order = 2 → save
3. Verify on public services grid: ordered by sortOrder ascending

**Expected**: Sort order respected

---

## TC-ADM-052 — Search Acceleration

**Steps**:
1. From any list with search: doctors, appointments, users, assets
2. Type partial name → verify server-side ILIKE/full-text matches
3. Empty result → empty state shown

**Expected**: Search performant + accurate

---

## TC-ADM-053 — Pagination Boundaries

**Steps**:
1. Navigate to a list with > 1 page (e.g., appointments)
2. Verify pagination shows Page 1 of N
3. Click Next → page 2 loads
4. On last page, Next disabled
5. On first page, Prev disabled

**Expected**: Pagination correct

---

## TC-ADM-054 — Currency Formatting

**Steps**:
1. From services list, verify prices show correct symbol:
   - EUR → €
   - GBP → £
   - USD → $
   - CZK → Kč
   - RON → lei
2. From appointments list, verify same

**Expected**: Currency rendering correct

---

## TC-ADM-055 — Mobile Responsive (Admin)

**Steps**:
1. Resize to 768px (tablet)
2. Verify sidebar collapses or stays visible
3. Tables scroll horizontally
4. Forms stack 1 column
5. Resize to 375px (mobile)
6. Verify usable but may not be optimized

**Expected**: Admin usable on tablet at minimum

---

## TC-ADM-056 — Empty States Across All Lists

**Steps**:
1. With no records, verify each empty state:
   - Countries: "No countries yet"
   - Doctors: "No doctor profiles match these filters"
   - Services: "No records match these filters"
   - Health tests: "No health tests match these filters"
   - Specialties: "No categories yet"
   - Pages: "No pages match these filters"
   - Newsletter: "No subscribers yet"
   - Audit log: "No audit events match those filters"
   - Users: "No users match those filters"
   - Assets: "No assets match these filters"
   - Appointments: "Nothing in this view yet"

**Expected**: Friendly empty states

---

## TC-ADM-057 — Success / Error Alert Banners

**Steps**:
1. After any save/create/delete, verify alert at top:
   - Success: green border + bg
   - Error: red border + bg
2. URL has `?success=` or `?error=` query param
3. Alert dismissable or auto-clears on navigation

**Expected**: Feedback visible

---

## TC-ADM-058 — Cookie Scope Cookie

**Steps**:
1. Select Ireland in country picker
2. Open browser DevTools → Application → Cookies
3. Verify `admin_country_preference` cookie set to country ID
4. Navigate to other pages → scope persists
5. Click "All countries" → cookie cleared

**Expected**: Cookie-based scope state

---

## TC-ADM-059 — Audit Trail Tampering Resistance

**Steps**:
1. Try direct DB access (manual): cannot delete audit log rows from admin UI
2. Verify audit log is append-only (no UPDATE/DELETE buttons)

**Expected**: Audit log immutable from UI

---

## TC-ADM-060 — Stripe Webhook + Payment State

**Steps**:
1. As patient, complete a paid booking (Stripe test card)
2. Wait for webhook (or simulate manually)
3. As admin, view appointment → verify paymentStatus = PAID, amountCents + currency set
4. Verify Payment row created in DB (visible via Audit log or directly)

**Expected**: Webhook updates appointment payment

---

## Exit Checklist

- [ ] TC-ADM-001 through TC-ADM-060 executed
- [ ] All CRUD operations work for: countries, doctors, services, health tests, specialties, assets, pages, users
- [ ] All filters server-side, pagination correct
- [ ] Drag-to-reorder works (countries, services)
- [ ] Destructive actions guarded with confirm
- [ ] Audit log captures all mutations
- [ ] Status transitions enforced (appointments)
- [ ] Schedule call + email + chat all work
- [ ] Stripe webhook integration verified
- [ ] Country scope cookie persists
- [ ] Sign out clears session
- [ ] Non-admins cannot access admin URLs
- [ ] Test data cleaned up or marked
