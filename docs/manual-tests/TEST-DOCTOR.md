# Manual Browser Test Cases — DOCTOR Role

> **Audience**: Browser-automation AI agent
> **Base URL**: Set `BASE_URL` (e.g., `http://localhost:3000`)
> **Doctor credentials**: Use existing or admin-invited doctor account
> **Test setup**: Doctor MUST be linked to a Doctor profile via `User.doctorId`. Use TC-ADM-DOC-* to invite first.

## Pre-flight
- [ ] Backend reachable
- [ ] Admin account exists
- [ ] Test doctor invited by admin (received invite email)
- [ ] Test patient has booking assigned to this doctor
- [ ] At least 1 form template available (or admin will create)
- [ ] S3 / object storage configured (for document + photo uploads)
- [ ] SendGrid in dev/log mode

---

## SETUP-DOC-001 — Doctor Onboarding (Admin Invites)

**Steps** (cross-role — admin action):
1. Admin signs in
2. Navigates to `/admin/doctors/{id}` for a doctor profile (no `loginUser` yet)
3. In **Account access** card, enters email + greeting name
4. Clicks "Send invitation" → email logged
5. Doctor clicks email link → `/reset-password?token=<token>&invite=1`
6. Doctor sets password → auto-redirects to `/doctor`

**Expected**: Doctor account created, linked to Doctor profile, auth working

---

## TC-DOC-001 — Login & First-Visit (No Profile Linked)

**Preconditions**: User has DOCTOR role but `doctorId` not yet set

**Steps**:
1. Navigate to `/login?next=/doctor`
2. Sign in with doctor email/password
3. Verify redirect to `/doctor`
4. Verify warning card: "Your account isn't linked to a doctor profile yet. Ask an admin to set it under `/admin/users`."

**Expected**: Doctor sees friendly error, not crash

---

## TC-DOC-002 — Doctor Dashboard (Linked Profile)

**Preconditions**: Doctor `loginUser.doctorId` set

**URL**: `BASE_URL/doctor`

**Steps**:
1. Sign in as doctor → land on `/doctor`
2. Verify **header**:
   - "WELCOME" label (uppercase, muted)
   - Doctor full name (h2)
   - Subtitle: title · primary country · additional countries (if linked)
3. Verify **3 stat tiles**:
   - Today: count + "Scheduled appointments"
   - This week: count + "Scheduled within 7 days"
   - Open: count + "Not cancelled or completed"
4. **Conditional alert** (if appointments within 24h have no meetingUrl):
   - Orange warning border
   - "{N} appointment(s) within 24h without a meeting link"
   - Up to 5 listed with "Add link →" CTA
5. Verify **Today's schedule** panel (left, 2/3 width):
   - Heading + description
   - Up to 8 rows: time · name | type · status | Join button (if URL) + Open button
   - Empty state if none today
6. Verify **Unread notifications** (right, 1/3 width):
   - Bell icon + heading
   - Up to 6 items with snippet + Open link
   - "See all →" footer link → `/doctor/notifications`
7. Verify **3 quick links** at bottom: My patients, Forms, Invoices

**Expected**: Dashboard renders with real data, stats accurate

---

## TC-DOC-003 — Sidebar Navigation

**Steps**:
1. From any doctor page (lg screen)
2. Verify left sidebar: dark background, logo at top
3. Verify 8 nav items: Overview, Appointments, Patients, Forms, Invoices, Reports, Notifications, Profile
4. Verify notification bell shows unread count badge (capped "99+")
5. Verify footer: doctor name/email, "Sign out →" button
6. Click each nav item → verify navigation:
   - Overview → `/doctor`
   - Appointments → `/doctor/appointments`
   - Patients → `/doctor/patients`
   - Forms → `/doctor/forms`
   - Invoices → `/doctor/invoices`
   - Reports → `/doctor/reports`
   - Notifications → `/doctor/notifications`
   - Profile → `/doctor/profile`
7. **Test mobile view (375px)**: sidebar collapses, header shows "Doctor portal" + user name

**Expected**: All navigation works, badges accurate

---

## TC-DOC-004 — Appointments List

**URL**: `BASE_URL/doctor/appointments`

**Steps**:
1. Navigate to page
2. Verify h2: "My appointments"
3. Verify **filter card** with 6 columns:
   - Search input (placeholder "Patient name or email")
   - Status dropdown: Any, Created, Sent, Contacted, Concluded, Cancelled
   - Type dropdown: Any, General, Specialist, Prescription, Health test, Follow-up
   - From date
   - To date
   - "Apply" + "Reset" buttons
4. Verify **table columns**: Patient | Type | Scheduled | Status | Payment | Action
5. Each row shows:
   - Patient: bold name, small email, optional phone
   - Type: capitalized
   - Scheduled: formatted datetime or "—"
   - Status: human label
   - Payment: status
   - Action: "Join" button (if meetingUrl, green with Video icon) + "Open" button
6. **Test filters**:
   - Set Status = Concluded → click Apply → only COMPLETED rows
   - Set search "test" → narrows
   - Click Reset → all rows return
7. Verify **pagination** (if > pageSize rows): "Page X of Y (Z total)"
8. Click "Open" on first appointment → navigates to detail

**Expected**: Filters work server-side, pagination correct

---

## TC-DOC-005 — Appointment Detail — Header & Layout

**URL**: `BASE_URL/doctor/appointments/<id>`

**Steps**:
1. Click into an appointment
2. Verify "← Back to appointments" link
3. Verify **header**:
   - "APPOINTMENT" label
   - Patient fullName (h2)
   - Subtitle: consultationType · scheduledAt · countryCode
   - Consultation mode badge (Online = blue with globe / In person = amber with pin)
   - Follow-up badge (if applicable, violet linking to original)
   - "Join call" button (if meetingUrl)
   - "Print summary" button → `/print/appointments/<id>` in new tab
4. Verify **main grid** 2fr/1fr split (left: workspace, right: aside)

**Expected**: Layout matches design

---

## TC-DOC-006 — Meeting & Status Section

**Steps**:
1. From appointment detail, locate **Meeting & status** card
2. Verify form fields:
   - **Slot** (datetime-local, calendar+clock icon)
   - **Delivery** dropdown: Online (video) / In person
   - **Meeting URL** (mono small font, placeholder changes by mode)
   - Helper text under URL
   - **Appointment status** dropdown: Created, Sent, Contacted, Concluded, Cancelled
3. **Test save flow**:
   - Set slot to tomorrow at 10:00
   - Mode = Online
   - URL = `https://meet.google.com/abc-defg-hij`
   - Status = Sent
   - Click "Save"
   - Verify success message
4. Click "Test link" → opens meet URL in new tab
5. **Test invalid URL host**:
   - URL = `https://evil.example.com/meeting`
   - Save → expect error (allowed hosts only)
6. **Test status transition rules**:
   - From COMPLETED, try to go back to UNDER_REVIEW → expect server reject (invalid transition)

**Expected**: All fields save, status transitions enforced

---

## TC-DOC-007 — Follow-up Appointment Creation

**Steps**:
1. From appointment detail, scroll to **Follow-up button** (below Meeting & Status)
2. Click "Book follow-up" → inline form opens
3. Verify fields:
   - When (datetime-local, defaults 1 week out at local 00:00)
   - Delivery dropdown
   - Notes textarea (max 2000)
4. Click "Cancel" → form closes
5. Open again, fill fields, click "Create follow-up"
6. Verify redirect to new follow-up appointment detail page
7. Verify new appointment has `followUpFromAppointmentId` pointing to original
8. Navigate back to original → verify it lists in "follow-ups" relation

**Expected**: Follow-up created, linked to original

---

## TC-DOC-008 — Consultation Note (SOAP) — Save Draft

**Steps**:
1. From appointment detail, locate **Consultation note** card
2. Verify status badge top-right: "Draft" (soft gray) initially
3. Verify 5 textareas:
   - Chief complaint (2 rows)
   - Subjective (5 rows, helper "What the patient reports — history, symptoms, context.")
   - Objective (5 rows, helper "Observable findings — vitals, exam, results reviewed.")
   - Assessment (4 rows, helper "Clinical impression / differential.")
   - Plan (5 rows, helper "Prescriptions, follow-up, referrals.")
4. Fill all fields with sample text
5. Click "Save draft" (soft button)
6. Verify success message
7. Verify draft persists on page reload
8. Verify footer: "Drafts are visible to you and admin until signed."

**Expected**: Draft saved, editable

---

## TC-DOC-009 — Consultation Note — Sign

**Steps**:
1. From appointment detail with draft consultation
2. Click "Save & sign" (primary button)
3. Verify confirm dialog (if any)
4. Confirm → button shows pending state
5. Verify success: status badge changes to "Signed" (green)
6. All textareas become disabled (locked)
7. Buttons "Save draft" and "Save & sign" disabled
8. Footer shows: "Signed {date}"
9. Verify audit log entry created (CONSULT_SIGNED action)

**Expected**: Note locks on sign, cannot edit

---

## TC-DOC-010 — Services Rendered (Line Items)

**Preconditions**: Consultation row exists (saved at least once)

**Steps**:
1. From appointment detail, scroll to **Services rendered** subsection (under consultation note)
2. If empty: "No services logged for this consult."
3. Verify add form row:
   - Label input
   - Qty spinner (1-20)
   - Unit price (cents input)
   - Currency code (3 chars)
   - Add button
4. **Add a service**:
   - Label: "GP consultation"
   - Qty: 1
   - Unit price: 5000 (= €50.00)
   - Currency: EUR
   - Click Add
5. Verify table row added: Item | Qty | Unit | Line total | (delete)
6. Verify totals row sums correctly
7. Click delete (trash icon) → row removed
8. **Test on signed consultation**: Sign consultation → verify form hidden + delete buttons hidden (locked)

**Expected**: Line items add/remove, locks on sign

---

## TC-DOC-011 — Share with Colleague (Signed URL)

**Preconditions**: Consultation is SIGNED

**Steps**:
1. From appointment detail, scroll to **Share with a colleague** subsection
2. Verify description and "Share with colleague" button
3. Click button → POST to backend, generates share link
4. Verify readonly URL field appears with the share token
5. Click "Copy" button → URL copied to clipboard
6. Open the URL in incognito → verify share page shows consultation read-only (no portal access)
7. Verify token expires after 7 days (admin can revoke earlier)
8. **Test draft state**: Unsign / create new appointment without signed consult → button replaced with "Save a draft first."

**Expected**: Share link works, expires correctly

---

## TC-DOC-012 — Forms — Fill Patient Intake

**Preconditions**: At least 1 active form template exists

**Steps**:
1. From appointment detail, scroll to **Forms** section
2. Verify form template dropdown: "Pick a template…" + active templates list
3. (If no templates) verify empty state with link "/doctor/forms"
4. Select a template → rendered fields appear in light background box
5. Verify field types render correctly:
   - text input
   - longtext (textarea)
   - choice (select dropdown)
   - number input
   - date input
6. Verify required fields have red asterisk
7. **Test required validation**:
   - Submit empty → expect error
8. Fill all fields → click "Submit form"
9. Verify success → form appears in **Form submissions** section below
10. Verify submission shows: title | "Print" link | "submitted {date}" | definition list of answers

**Expected**: Forms render and submit

---

## TC-DOC-013 — Exam Results — Request

**Steps**:
1. From appointment detail, scroll to **Exam results** section
2. Verify form fields:
   - Test name (required, max 200)
   - State dropdown: Requested / Completed
   - Performed on (date, max today)
   - External link (URL, optional)
   - Interpretation / notes (textarea, max 8000)
3. **Test request flow**:
   - Test name: "Full Blood Count"
   - State: Requested
   - (leave others blank)
   - Click "Request exam"
4. Verify exam appears in list with amber "Pending" badge
5. Verify list row shows: Test name + status badge, date, logged date
6. Verify "Mark complete" button visible for REQUESTED exams

**Expected**: Exam request logged

---

## TC-DOC-014 — Exam Results — Log Completed

**Steps**:
1. From same section:
   - Test name: "MRI Shoulder"
   - State: Completed
   - Performed on: today
   - External link: `https://lab.example.com/report/123`
   - Interpretation: "Mild rotator cuff tendinopathy. No tear."
2. Click "Log result" (button label changes per state)
3. Verify exam in list with green "Completed" badge
4. Verify external link clickable, opens new tab
5. Verify notes display with line breaks preserved

**Expected**: Completed exam logged with all details

---

## TC-DOC-015 — Exam Results — Mark Complete + Delete

**Steps**:
1. For a REQUESTED exam, click "Mark complete" button
2. Verify badge changes to green "Completed"
3. Click delete (trash icon) on any exam
4. Verify confirmation prompt
5. Confirm → exam removed
6. Verify audit log entries: EXAM_LOGGED, EXAM_DELETED

**Expected**: Status transition + delete works

---

## TC-DOC-016 — Documents — Upload

**Steps**:
1. From appointment detail, scroll to **Documents** section
2. Verify description about clinical document storage
3. **Upload form**:
   - Label input (optional, max 200, placeholder "e.g. Lab report, X-ray scan, Referral letter")
   - "Upload document" button (soft style)
4. Click button → file picker opens
5. Select a PDF (e.g., `test-lab-report.pdf`)
6. Verify uploaded → appears in document list
7. **Document list row** shows:
   - File icon
   - Label (or filename if blank)
   - mimetype · file size · upload date
   - "Open" button (downloads)
   - Delete button
8. Click "Open" → file downloads or opens in browser
9. **Test file types**: try JPG, PNG, WebP, AVIF → all should work
10. **Test forbidden type**: try .exe or .zip → expect 415 error
11. **Test size limit**: file > 10MB → expect 413 error

**Expected**: Uploads work, validation enforced

---

## TC-DOC-017 — Documents — Delete

**Steps**:
1. Click delete button (trash) on a document
2. Verify confirmation prompt
3. Confirm → document removed from list + S3
4. Verify audit log: DOCUMENT_DELETED

**Expected**: Delete works, S3 file removed

---

## TC-DOC-018 — Invoice Card (Read-Only)

**Preconditions**: Booking has paymentStatus + amount + line items

**Steps**:
1. From appointment detail aside (right column), locate **Invoice** card
2. Verify fields:
   - Status: paymentStatus
   - Booked amount: formatted money or "—"
   - Line total: formatted by currency (multiple if mixed)
   - Paid: paidAt timestamp or "—"
3. Click "Print invoice" → opens `/print/invoices/<appointment-id>` in new tab
4. Verify print view is read-only, print-optimized

**Expected**: Invoice read-only, print works

---

## TC-DOC-019 — Patient Info Card

**Steps**:
1. From appointment detail aside, locate **Patient** card
2. Verify fields:
   - Email
   - Phone or "—"
   - Date of birth (formatted) or "—"
   - Status (appointment status)
   - Booked (createdAt ISO)
3. **If booking has notes**: light background box with "BOOKING NOTES" label and pre-wrap text

**Expected**: Patient details accurate

---

## TC-DOC-020 — Internal Notes (Doctor↔Admin)

**Steps**:
1. From appointment detail aside, locate **Internal notes** card
2. Verify description: "Not patient-visible. Use for handoff context."
3. Verify InternalMessagesThread renders with existing messages
4. Compose new message: "Need admin to verify insurance code"
5. Send → verify message appears
6. Have admin reply via admin appointment detail → verify polling updates within ~10s
7. Verify patient does NOT see these (cross-check by patient login)

**Expected**: Internal-only thread works, patient isolation maintained

---

## TC-DOC-021 — Patient Chat (NEW — Consultation Chat)

**Steps**:
1. From appointment detail aside, locate **Patient chat** card
2. Verify description: "Direct channel with the patient. Chat auto-locks 24h after the appointment completes — you can re-open it here."
3. Verify ConsultationChat component renders with header "Patient chat"
4. Verify lock/unlock toggle button visible top-right of chat
5. **Send a message**:
   - Type "Hello — I've reviewed your notes"
   - Click Send → message appears right-aligned
6. **Upload a file**:
   - Click Paperclip → select PDF
   - Click "Upload" → verify file message in thread
7. **Verify patient sees it**: Sign in as patient on another browser → check chat → message + file visible
8. **Toggle lock**:
   - Click Lock button (lock icon)
   - Verify state changes to "Re-open" (unlock icon)
   - Verify patient sees lock banner + cannot send (cross-check)
9. **Toggle re-open**:
   - Click "Re-open" button
   - Verify chat unlocks for patient

**Expected**: Doctor can always send. Lock toggle controls patient access.

---

## TC-DOC-022 — Patient List Page

**URL**: `BASE_URL/doctor/patients`

**Steps**:
1. Navigate to page
2. Verify h2: "My patients", description
3. Verify search field placeholder "Name, email, or phone"
4. Verify table columns: Patient | Email | Phone | Country | First seen | Bookings | Open
5. Verify deduplication by email
6. **Test search**: type patient name → filters
7. Click "Apply" → server filters
8. Click "Reset" → clears
9. Click "Open" on a patient → navigates to detail
10. Empty state: "No patients yet" (or "No patients match that search.")

**Expected**: Patient list works with search

---

## TC-DOC-023 — Patient Detail Page

**URL**: `BASE_URL/doctor/patients/<email>`

**Steps**:
1. Click into a patient
2. Verify "← Back to patients" link
3. Verify header: "PATIENT" label, name (h2), email · phone · country
4. **Left column — Appointment history**:
   - Table: When | Type | Status | Payment | Consult | Open
   - When = scheduledAt (full datetime) or createdAt (date)
   - Consult: "Signed" / "Draft" / "—"
   - Open: "Join" (if URL) + "Open →"
5. **Right aside — Summary**:
   - Email, Phone, Country, Date of birth
   - First seen, Total appointments, Signed consults
6. Click "Open" on an appointment → navigates back to appointment workspace

**Expected**: Patient history accurate

---

## TC-DOC-024 — Forms — Manage Templates

**URL**: `BASE_URL/doctor/forms`

**Steps**:
1. Navigate to page
2. Verify h2: "Forms", description
3. **Left side — Your templates**:
   - Empty state: "No templates yet. Use the form on the right."
   - If templates exist: cards with title, description, "{N} fields · updated {date}", delete trash icon (if owned), shared badge (if not)
4. **Right side — New template form**:
   - Title input (max 200, required)
   - Description textarea
   - Fields repeater:
     - Field {N} label
     - Label input
     - Type dropdown (text, longtext, choice, number, date)
     - Options textarea (if choice)
     - Required checkbox
     - Helper input
     - Remove button (if >1 field)
   - "Add field" link
   - "Create template" button
5. **Create test template**:
   - Title: "Pre-consult intake"
   - Description: "Quick history before the call"
   - Field 1: Label "How long have you had symptoms?", Type text, Required ON
   - Field 2: Label "Pain level (0-10)", Type number, Required OFF
   - Add field 3: Label "Allergies?", Type longtext, Helper "List all known allergies"
   - Submit
6. Verify new template in left list
7. Click delete on owned template → confirm → removed
8. Verify shared templates show "(shared)" badge and no delete

**Expected**: Templates CRUD works for owned

---

## TC-DOC-025 — Invoices Page (List + Filters)

**URL**: `BASE_URL/doctor/invoices`

**Steps**:
1. Navigate to page
2. Verify h2: "Invoices & payments", description
3. Verify filter card 5 columns:
   - Status (Any, Unpaid, Pending, Paid, Refunded, Failed)
   - From date
   - To date
   - Apply button
   - Reset button
4. Verify table columns: Patient | When | Type | Amount | Payment | Status | Open
5. Payment badges color-coded:
   - PAID emerald
   - PENDING amber
   - UNPAID rose
   - REFUNDED slate
   - FAILED rose
6. Amount in font-mono
7. **Test filter**: Status=Unpaid → only UNPAID rows
8. Click "Open" → navigates to appointment

**Expected**: Filters work, read-only view

---

## TC-DOC-026 — Reports Page

**URL**: `BASE_URL/doctor/reports`

**Steps**:
1. Navigate to page
2. Verify h2: "Reports", description "Defaults to the last 30 days"
3. Verify filter form 5 columns: From, To, Type, Appt status, Payment + Apply button
4. Verify CSV Export button (if data present)
5. **Summary tiles** (5 cols): Appointments, Signed consults, Follow-ups, Distinct patients, Revenue (paid)
6. Revenue formatted with currency or "—"
7. **Breakdown tables** (2 cols):
   - "By status": status | count
   - "By consultation type": type | count
8. **Test filter**: Set date range = last 7 days, Type = General → click Apply
9. Verify counts update
10. Click "CSV Export" → file downloads (CSV with rows)

**Expected**: Reports aggregate correctly, export works

---

## TC-DOC-027 — Notifications Page

**URL**: `BASE_URL/doctor/notifications`

**Steps**:
1. Navigate to page
2. Verify header: "Notifications", "{unreadCount} unread · {totalCount} total"
3. Verify list header bar: "Newest first" left, "Mark all read" button right (with checkmark icon)
4. Verify list items:
   - Unread dot (blue) for unread
   - Type label + actor name
   - Timestamp right
   - Snippet (clamped 2 lines)
   - "Open appointment →" link if applicable
   - "Mark as read" button (blue checkmark) if unread
5. **Test mark single as read**: Click "Mark as read" on one → indicator removed
6. **Test mark all as read**: Click "Mark all read" → all unread cleared, button disabled
7. Verify sidebar badge updates to 0
8. Empty state: "Nothing here yet."

**Expected**: Notifications work, mark-as-read persists

---

## TC-DOC-028 — Doctor Profile Page (View + Edit Public Profile)

**URL**: `BASE_URL/doctor/profile`

**Steps**:
1. Navigate to page
2. Verify header: "My profile", description
3. Verify **Practice context card** (read-only):
   - Primary country: name (code)
   - Also listed in: countries or "—"
   - URL slug
   - Categories: specialty names
   - Consultation types: "General · Specialist · Prescription · Follow-up"
4. Verify **Public profile form** (left side):
   - Full name (max 200, required)
   - Bio (10 rows, max 12000)
   - Qualifications (8 rows)
   - Languages (text, comma-separated)
   - WhatsApp number (max 32)
5. **Edit profile**:
   - Change bio: "Dr. X has 15 years of experience..."
   - Qualifications: "MB BCh BAO\nMRCPI"
   - Languages: "English, Portuguese"
   - WhatsApp: "+353871234567"
   - Click "Save changes"
6. Verify success message
7. Reload → changes persisted
8. Visit public profile page (`/ireland/en/doctors/<slug>`) → verify changes visible

**Expected**: Profile edits propagate to public site

---

## TC-DOC-029 — Doctor Profile Photo — Upload

**Steps**:
1. From `/doctor/profile`, locate **Profile photo** card (right aside)
2. Verify avatar shows either uploaded image OR gradient initials (first 2 letters)
3. Click "Upload photo" button
4. Select an image (JPG/PNG/WebP/AVIF, < 5MB)
5. Verify image updates immediately
6. Reload page → image persists
7. Visit public doctor profile → verify image visible
8. **Test invalid file**: upload PDF → expect error
9. **Test oversize**: upload > 5MB → expect error
10. **Replace**: Click "Replace photo" → upload different image → updates

**Expected**: Photo upload + replace work

---

## TC-DOC-030 — Doctor Profile Photo — Remove

**Steps**:
1. From profile, with photo uploaded
2. Click "Remove" button
3. Verify confirm dialog
4. Confirm → photo cleared, gradient initials show again
5. Reload → still removed

**Expected**: Remove clears photo

---

## TC-DOC-031 — Doctor Availability (Admin-Managed, Doctor Views Only?)

**Note**: Doctor availability is currently managed at `/admin/doctors/<id>/availability`. Doctor's profile shows "Admin-managed" notice. Skip this for doctor role if not available.

---

## TC-DOC-032 — Print Views

**Steps**:
1. From appointment detail, click "Print summary" → opens `/print/appointments/<id>` in new tab
2. Verify print-optimized layout (no nav, no buttons, just data)
3. Print preview (Ctrl+P) → no UI chrome, fits page
4. Similar for:
   - `/print/consults/<id>` — consultation note
   - `/print/forms/<id>` — form submission
   - `/print/invoices/<id>` — invoice
5. Verify all print views require auth (try in incognito → 401)

**Expected**: Print views render correctly + auth-gated

---

## TC-DOC-033 — Sign Out

**Steps**:
1. From any doctor page, click "Sign out →" in sidebar footer
2. Verify redirect to `/login?next=/doctor`
3. Verify `gh_auth` cookie cleared
4. Attempt direct navigation to `/doctor` → redirected to login

**Expected**: Logout clears session

---

## TC-DOC-034 — Auth Guard — Doctor Cannot Access Admin

**Steps**:
1. Sign in as doctor
2. Try direct URL `/admin`
3. Expect redirect to login OR 403

**Expected**: Doctor cannot access admin portal

---

## TC-DOC-035 — Cross-Doctor Scoping (Cannot See Other Doctor's Appointments)

**Preconditions**: Two doctors exist, each with appointments

**Steps**:
1. Sign in as Doctor A
2. Note Doctor B's appointment IDs
3. Try direct URL `/doctor/appointments/<doctor-B-appt-id>`
4. Expect 404 or 403

**Expected**: Strict scoping by `doctorId`

---

## TC-DOC-036 — Audit Log Verification

**Steps** (cross-role with admin):
1. As doctor, perform these actions:
   - Save consultation (CONSULT_SAVED)
   - Sign consultation (CONSULT_SIGNED)
   - Log exam (EXAM_LOGGED)
   - Delete exam (EXAM_DELETED)
   - Post internal message (INTERNAL_MESSAGE_POSTED)
   - Create share link (SHARE_LINK_CREATED)
   - Upload document (DOCUMENT_UPLOADED)
   - Delete document (DOCUMENT_DELETED)
2. Sign out, sign in as admin
3. Navigate to `/admin/audit-log`
4. Filter by entityId = appointment ID
5. Verify all actions present with doctor as actor

**Expected**: Full audit trail captured

---

## TC-DOC-037 — Concurrent Edits (Optimistic UI)

**Steps**:
1. Open same appointment in 2 doctor browser tabs
2. In tab 1: edit consultation note → save draft
3. In tab 2: refresh → see updated content
4. In tab 2: edit + save → tab 1 stale until refresh
5. **Sign in tab 1 first, then sign in tab 2**: should be locked
6. Verify backend rejects edits to SIGNED consultations

**Expected**: Last-write-wins for drafts, sign locks all edits

---

## TC-DOC-038 — Notifications Auto-Update

**Steps**:
1. Open `/doctor` dashboard
2. Have admin/system trigger event that creates notification (e.g., admin assigns new appointment to doctor)
3. Within reasonable time (or refresh), badge count updates
4. Notification appears in "Unread notifications" panel

**Expected**: Notifications fan-out from system events

---

## TC-DOC-039 — Mobile Responsive

**Steps**:
1. Resize to 375px
2. Verify:
   - Sidebar collapses
   - Header shows "Doctor portal" + name
   - Appointment detail: 2-column grid stacks vertically
   - Forms full-width, scrollable
   - Tables horizontal scroll

**Expected**: Mobile UX functional

---

## TC-DOC-040 — Chat Lock 24h Auto-Trigger (Time-Sensitive)

**Setup**:
- Patient has booking, doctor sets to COMPLETED
- Verify `consultationCompletedAt` set in DB (now)

**Steps**:
1. Immediately after marking COMPLETED:
   - Patient can still send messages in chat (within 24h window)
2. **Simulate 24h passing** (manual: update `consultationCompletedAt` in DB to 25 hours ago):
   - Patient tries to send → expect 403 "Chat window closed"
   - Patient sees lock banner
3. **Doctor re-opens**: clicks "Re-open" toggle
4. **Verify**: `chatReopenedByDoctor = true` in DB
5. Patient refreshes → can send again

**Expected**: 24h lock auto-applies, doctor toggle works

---

## Exit Checklist

- [ ] TC-DOC-001 through TC-DOC-040 executed
- [ ] All SOAP fields save + lock on sign
- [ ] Services rendered work + lock on sign
- [ ] Documents upload/download/delete OK
- [ ] Exams request + complete + delete OK
- [ ] Forms create + fill + submit OK
- [ ] Patient chat (text + file) works
- [ ] Chat lock + re-open works
- [ ] Internal messages thread works
- [ ] Share links work + expire
- [ ] Audit log captures all mutations
- [ ] No data leakage between doctors
- [ ] Test data marked or cleaned up
