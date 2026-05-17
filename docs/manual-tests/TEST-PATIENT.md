# Manual Browser Test Cases — PATIENT Role

> **Audience**: Browser-automation AI agent
> **Base URL**: Set `BASE_URL` (e.g., `http://localhost:3000`)
> **Test patient credentials**: Create or use `patient.test@example.com` / `TestPass123!`
> **Test patient setup**: An appointment must exist for the patient with a scheduled call to test full features

## Pre-flight
- [ ] Backend server reachable
- [ ] At least 1 patient account exists with verified email
- [ ] At least 1 admin account exists (for cross-role flows)
- [ ] At least 1 active doctor with availability slots
- [ ] At least 1 service per country with price > 0 (for paid flows)
- [ ] SendGrid in dev/log mode if testing emails
- [ ] Stripe in test mode

---

## SETUP-PATIENT-001 — Create Test Patient

**Steps**:
1. Navigate to `BASE_URL/register`
2. Register: name "Test Patient", email `patient.test@example.com`, phone "+353871234567", password "TestPass123!"
3. From backend logs, retrieve email verification token
4. Navigate to `/verify-email?token=<token>`
5. Verify email confirmed

**Expected**: Patient account exists with `emailVerifiedAt` set

---

## TC-PAT-001 — Login Flow

**Preconditions**: Patient account exists, NOT currently logged in

**Steps**:
1. Navigate to `BASE_URL/login`
2. Enter email `patient.test@example.com`, password `TestPass123!`
3. Click "Sign in"
4. Verify: success message "Logged in as Test Patient. Redirecting..."
5. Auto-redirect to `/account`

**Expected**: `gh_auth` cookie set (httpOnly), patient lands on dashboard

---

## TC-PAT-002 — Account Dashboard

**URL**: `BASE_URL/account`

**Steps**:
1. After login, verify URL is `/account`
2. Verify header: Global Health logo + Stethoscope icon
3. Verify title: "My account"
4. Verify subtitle: "Manage your profile, track bookings, and book new consultations."
5. Verify AccountSummary component renders (greeting, account status)
6. Verify **6 navigation cards** grid:
   - Profile (UserRound icon, "Name, phone")
   - My bookings (CalendarDays, "View history")
   - Prescriptions (PillBottle, "Issued meds")
   - Payments (CreditCard, "Receipts")
   - Security (ShieldCheck, "Password, email")
   - Book a consultation (Stethoscope, "Start a new visit")
7. Click each card → verify navigation:
   - Profile → `/account/profile`
   - My bookings → `/account/bookings`
   - Prescriptions → `/account/prescriptions`
   - Payments → `/account/payments`
   - Security → `/account/security`
   - Book a consultation → `/`

**Expected**: All cards render with icons, all links work

---

## TC-PAT-003 — Profile Page (View)

**URL**: `BASE_URL/account/profile`

**Steps**:
1. Navigate to `/account/profile`
2. Verify "← Back to account" link → navigates back
3. Verify title: "Profile"
4. Verify description: "Your contact details for bookings and confirmations."
5. Verify **Email field**:
   - Pre-filled with `patient.test@example.com`
   - Disabled (read-only)
   - Helper text: "Email can't be changed yet. Contact support if you need to switch."
6. Verify **Full name field**: editable, pre-filled with "Test Patient", maxLength 120
7. Verify **Phone field**: editable, placeholder "+353 89 …", maxLength 40, helper text visible

**Expected**: Form displays correctly with current values

---

## TC-PAT-004 — Profile Page (Edit + Save)

**Steps**:
1. From `/account/profile`
2. Change Full name → "Test Patient Updated"
3. Change Phone → "+353877654321"
4. Click "Save changes" button (with Save icon)
5. Button shows "Saving…" during request
6. Verify success message: green "Profile saved"
7. Reload page → verify changes persisted
8. **Test validation**: Clear full name → click Save → expect error
9. **Test long name**: Enter 121 chars → expect maxLength enforced

**Expected**: Profile updates persisted, validation works

---

## TC-PAT-005 — Security Page — Email Verification (Verified State)

**URL**: `BASE_URL/account/security`

**Steps**:
1. Navigate to `/account/security`
2. Verify "← Back to account" link
3. Verify title "Security", description
4. Verify **Section 1 — Email Verification**:
   - MailCheck icon (emerald)
   - Status: "Verified on [DATE]" (green text)
   - No "Resend" button (already verified)

**Expected**: Verified state correctly shown

---

## TC-PAT-006 — Security Page — Email Verification (Unverified State)

**Preconditions**: Register a NEW patient, do NOT verify email

**Steps**:
1. Sign in as unverified patient
2. Navigate to `/account/security`
3. Verify Section 1 shows amber state:
   - "Not verified yet" status
   - Description includes patient's email
   - "Resend verification email" button enabled
4. Click "Resend verification email"
5. Button shows "Sending…"
6. Verify success message: "Verification email sent. Check your inbox — link expires in 24 hours."
7. Check backend logs for new verification email

**Expected**: Resend works, can do multiple times

---

## TC-PAT-007 — Security Page — Change Password

**Steps**:
1. From `/account/security`, scroll to **Change password** section
2. Verify KeyRound icon, heading, description
3. Test fields: Current password, New password, Confirm new password (all type="password")
4. **Test mismatch**:
   - Current: "TestPass123!"
   - New: "NewPass123!"
   - Confirm: "DifferentPass!"
   - Click "Update password"
   - Expect red error: "New password and confirmation do not match."
5. **Test short password**:
   - Current: "TestPass123!"
   - New: "short"
   - Confirm: "short"
   - Click "Update password"
   - Expect error: "New password must be at least 8 characters."
6. **Test wrong current password**:
   - Current: "WrongPass"
   - New + Confirm: "NewPass123!"
   - Click "Update password"
   - Expect server error
7. **Test valid change**:
   - Current: "TestPass123!"
   - New + Confirm: "NewPass123!"
   - Click "Update password"
   - Expect green: "Password updated. Use the new one next time you sign in."
8. **Verify new password works**: Sign out, sign in with new password
9. Reset back to "TestPass123!" for subsequent tests

**Expected**: Password change works, old password rejected after change

---

## TC-PAT-008 — Security Page — Download My Data (GDPR)

**Steps**:
1. From `/account/security`, scroll to **Your data** section
2. Verify heading and GDPR description
3. Click "Download my data (JSON)" button (Download icon, emerald hover)
4. Verify file download triggers (browser save dialog or download bar)
5. Verify downloaded JSON contains: profile, bookings, payments

**Expected**: JSON export works, contains user's full data

---

## TC-PAT-009 — Security Page — Delete Account (Cancel)

**Steps**:
1. From `/account/security`, scroll to **Your data**
2. Click "Delete my account" button (Trash2 icon, red text)
3. Verify confirmation dialog appears: "This permanently deletes your account. Your booking history is preserved for regulatory reasons but stripped of identifying details. This cannot be undone — proceed?"
4. Click **Cancel** in dialog
5. Verify nothing deleted, still on page

**Expected**: Cancel does not delete

---

## TC-PAT-010 — Security Page — Delete Account (Confirm)

**Preconditions**: Use a disposable test patient

**Steps**:
1. Sign in as throwaway patient
2. Navigate to `/account/security`
3. Click "Delete my account" → Confirm in dialog
4. Verify button shows "Deleting…"
5. Verify redirect to home `/`
6. Try to sign in with deleted email → expect error / no account

**Expected**: Account deleted, session cleared, booking history retained but anonymized

---

## TC-PAT-011 — My Bookings (Empty State)

**Preconditions**: Patient has zero bookings

**URL**: `BASE_URL/account/bookings`

**Steps**:
1. Navigate to `/account/bookings`
2. Verify header: CalendarDays icon, "My bookings", description
3. Verify "Book consultation" button top-right → `/`
4. Verify empty state:
   - ClipboardList icon
   - "No bookings yet"
   - Description text
   - "Book online" link → `/`

**Expected**: Empty state renders correctly

---

## TC-PAT-012 — My Bookings (With Bookings)

**Preconditions**: Patient has multiple bookings (run TC-PUB-017 or TC-PUB-018 first)

**Steps**:
1. Navigate to `/account/bookings`
2. Verify list of bookings (cards or table rows)
3. For each booking row, verify:
   - Created date (formatted "16 May 2026, 14:30")
   - Payment status badge (PAID/PROCESSING/UNPAID/etc.) with color
   - Appointment status badge (REQUEST_RECEIVED/CONTACTED/UNDER_REVIEW/COMPLETED/CANCELLED) with color
   - Country code (uppercase)
   - Consultation type
4. **Test scheduled call display**:
   - Find a booking with `scheduledAt` set (admin scheduled it)
   - Verify emerald banner shows: Clock icon, "SCHEDULED" eyebrow, date/time
   - If `meetingUrl` present, "Join call" button (Video icon)
   - Click "Join call" → opens external link in new tab
5. **Test notes display**:
   - Booking with notes shows preview text
6. **Test "Message the clinic" button**:
   - Each booking has button with MessageCircle icon
   - Click → expand chat panel below
   - Verify button label toggles "Message the clinic" ↔ "Hide clinic messages"
7. **Test "Chat with your doctor" button**:
   - Each booking has second button
   - Click → expand ConsultationChat panel
   - Button label toggles "Chat with your doctor" ↔ "Hide doctor chat"

**Expected**: All bookings visible, all interactive elements work

---

## TC-PAT-013 — Patient↔Admin Chat (Message the Clinic)

**Preconditions**: Patient has booking, admin user exists

**Steps**:
1. From `/account/bookings`, click "Message the clinic" on a booking
2. Verify ChatThread component renders below booking:
   - Container: 480px height, rounded border
   - Header: "Conversation" + description "Message the clinic team about this booking."
   - Initial state: empty thread → "No messages yet. Start the conversation below."
3. Type message in input: "Hi, can I get more info about my consultation?"
4. Click Send button (Send icon)
5. Verify message bubble appears right-aligned, emerald background
6. Verify timestamp shown
7. **Test polling**: Have admin reply in another tab (TC-ADM appointment chat)
8. Within ~10 seconds, admin's reply should appear left-aligned, slate-50 background
9. **Test max length**: Try sending 2001 chars → expect server reject
10. **Test rate limit**: Send 31 messages within 1 minute → expect 429 on 31st

**Expected**: Bi-directional messaging works, polling updates UI

---

## TC-PAT-014 — Patient↔Doctor Chat (NEW Consultation Chat)

**Preconditions**: Patient has booking with assigned doctor

**Steps**:
1. From `/account/bookings`, click "Chat with your doctor" on a booking
2. Verify ConsultationChat component renders:
   - Header: "Chat with your doctor"
   - Description: "Send messages or upload documents for your doctor to review."
   - 400px height message area
   - Compose area with: Paperclip button (attach file), text input, Send button
3. **Test text message**:
   - Type "Hello doctor, here are my pre-consult notes"
   - Click Send
   - Verify message bubble right-aligned, emerald-700 background
   - Verify timestamp
4. **Test file upload**:
   - Click Paperclip icon
   - File picker opens (accept: PDF/JPG/PNG/WebP)
   - Select a PDF (e.g., `test-report.pdf`)
   - Verify **pending file preview** appears above compose: FileText icon, filename, X to remove, "Upload" button
   - Click "Upload"
   - Button shows spinner + "Uploading…"
   - Verify file message appears in thread with FileText icon + filename
   - Click attachment link → downloads/opens file
5. **Test file size limit**:
   - Upload file > 20MB → expect 413 error
6. **Test unsupported file type**:
   - Try uploading .exe or .zip → expect 415 error
7. **Test polling**: Have doctor send message in another browser
8. Doctor's message appears left-aligned within 10s
9. **Test lock state** (after consultation completed + 24h elapsed):
   - Verify amber lock banner: "Chat window closed. Contact your doctor to re-open."
   - Compose area replaced with: "Chat is closed. Only your doctor can re-open it."
   - Send button hidden
10. **Test re-open by doctor**: After doctor toggles re-open in their portal
11. Refresh patient view → chat compose re-enabled

**Expected**: Full chat with attachments works, 24h auto-lock works, doctor re-open works

---

## TC-PAT-015 — Payments Page (Empty State)

**Preconditions**: Patient has no completed paid bookings

**URL**: `BASE_URL/account/payments`

**Steps**:
1. Navigate to `/account/payments`
2. Verify header: CreditCard icon, "Payments", description about Stripe receipts
3. Verify empty state:
   - CreditCard icon
   - "No payments yet"
   - Description
   - "View bookings" link → `/account/bookings`

**Expected**: Empty state correct

---

## TC-PAT-016 — Payments Page (With Payments)

**Preconditions**: Patient has at least 1 PAID booking (run TC-PUB-018 first)

**Steps**:
1. Navigate to `/account/payments`
2. Verify table renders with columns: Date, Consultation, Amount, Status, Booking
3. **For each row, verify**:
   - Date formatted "17 May 2026"
   - Consultation: service name or type
   - Amount formatted with currency symbol (€50, $65, etc.)
   - Status badge with correct color:
     - PAID = green "Paid"
     - PROCESSING = amber "Processing"
     - REQUIRES_ACTION = amber "Action required"
     - FAILED = red "Failed"
     - REFUNDED = gray "Refunded"
     - CANCELED = gray "Canceled"
     - UNPAID = gray "Unpaid"
   - Booking column has ExternalLink icon → navigates to booking detail

**Expected**: All payments visible, status colors correct

---

## TC-PAT-017 — Prescriptions Page (Placeholder)

**URL**: `BASE_URL/account/prescriptions`

**Steps**:
1. Navigate to `/account/prescriptions`
2. Verify header: "Prescriptions", description
3. Verify placeholder empty state:
   - PillBottle icon
   - "No prescriptions yet"
   - Description about future integration
   - "View bookings instead" link

**Expected**: Page renders even though feature not built

---

## TC-PAT-018 — Booking as Authenticated Patient

**Preconditions**: Logged in as patient

**Steps**:
1. Navigate to `/` (country gate) → click Ireland → click "Book online"
2. Verify booking form pre-fills:
   - Full name: "Test Patient" (or current name)
   - Email: `patient.test@example.com`
   - Phone: "+353877654321" (if set)
3. Country, Consultation type still empty (must select)
4. Fill rest: country=Ireland, type=General, notes="Test booking via account"
5. Tick consent
6. Submit → success
7. Navigate to `/account/bookings` → verify new booking appears at top

**Expected**: Logged-in booking flow works, less friction

---

## TC-PAT-019 — Sign Out

**Steps**:
1. From any account page
2. Locate sign-out control (in header dropdown or account menu)
3. Click "Sign out"
4. Verify redirect to `/` or `/login`
5. Verify `gh_auth` cookie cleared
6. Navigate to `/account` → should redirect to `/login`

**Expected**: Session ends, protected routes redirect

---

## TC-PAT-020 — Auth Guard (Try to access /account without login)

**Steps**:
1. Sign out (TC-PAT-019)
2. Navigate to `/account` directly
3. Expect redirect to `/login?next=/account`
4. Same for `/account/bookings`, `/account/profile`, `/account/security`, `/account/payments`, `/account/prescriptions`

**Expected**: All protected routes require auth

---

## TC-PAT-021 — Cannot Access Other Patient's Data

**Steps**:
1. Sign in as Patient A
2. Note Patient A's booking IDs
3. Sign out, sign in as Patient B
4. Try to access Patient A's booking detail via direct URL (if URL has booking ID)
5. Try API call (if applicable): `GET /api/account/appointments/<patient-A-id>`
6. Expect 404 or 403 (NOT 200 with someone else's data)

**Expected**: Authorization enforced — patients see only their own data

---

## TC-PAT-022 — Cannot Access Admin/Doctor Pages

**Steps**:
1. Sign in as patient
2. Try direct URL: `/admin`
3. Expect redirect to login or 403
4. Try `/doctor`
5. Expect redirect or 403

**Expected**: Role-based access control works

---

## TC-PAT-023 — Session Timeout / JWT Expiry

**Steps**:
1. Sign in
2. (Optional, requires backend cooperation) Wait for JWT to expire OR manually delete cookie
3. Try to perform action (e.g., save profile)
4. Expect redirect to login

**Expected**: Expired sessions handled gracefully

---

## TC-PAT-024 — Verify Patient↔Doctor Chat File Storage

**Preconditions**: Patient uploaded file in TC-PAT-014

**Steps**:
1. From chat, click downloaded file link
2. Verify file is auth-gated (URL like `/api/account/appointments/<id>/chat/download/<msgId>`)
3. Try opening URL in incognito/another browser → expect 401/403
4. Verify file content matches uploaded original

**Expected**: Files stored securely, access auth-gated

---

## TC-PAT-025 — Responsive (Mobile)

**Steps**:
1. Resize to 375px width
2. Test all account pages
3. Verify:
   - Navigation cards stack 1 column
   - Forms full-width
   - Chat thread fits screen
   - Buttons reachable, not cut off

**Expected**: Mobile UX functional

---

## TC-PAT-026 — Multi-Language (if patient browsing in non-EN)

**Steps**:
1. Switch language to Portuguese (via country/lang switcher on public site)
2. Sign in
3. Verify account UI labels in chosen language (if i18n implemented for account)
4. Verify booking confirmations in correct language

**Expected**: If implemented, account pages respect locale

*Note: Mark N/A if account-side i18n not implemented*

---

## Exit Checklist

- [ ] TC-PAT-001 through TC-PAT-026 executed
- [ ] All form submissions either succeed or show graceful error
- [ ] Chat polling works (no manual refresh required)
- [ ] No data leakage between patients
- [ ] All protected routes require auth
- [ ] Sign-out clears session cookie
- [ ] Test patients cleaned up or marked
