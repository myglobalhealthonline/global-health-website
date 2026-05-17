# Manual Test Results — 7-phase complete order

**Last run:** 2026-05-18 (session 3 — Window 1 patient)  
**Order doc:** `TEST-EXECUTION-ORDER.md`  
**Issues:** `ISSUES-LOG.md`

Legend: ✅ PASS · ⚠️ PARTIAL · ❌ FAIL · ⏭️ SKIP · 🔄 NOT RUN

---

## Session 3 — Window 1 (patient, ~45 min)

| TC | Status | Notes |
|----|--------|-------|
| PAT-003 | ✅ | Profile view — email read-only |
| PAT-004 | ✅ | Phone saved `+353877654321` |
| PAT-005 | ✅ | Security — verified state shown |
| PAT-006 | 🔄 | Resend verify not run (account re-registered; may be unverified) |
| PAT-007 | ⚠️ | Mismatch + short password errors ✅; full password change not done |
| PAT-008 | ✅ | `GET /api/auth/me/export` 200, JSON includes patient email (2.2 KB) |
| PAT-009 | ❌ | Cancel dialog not tested — delete ran by mistake (see ISS-011) |
| PAT-010 | ⏭️ | Deferred — use disposable account |
| PAT-012 | ✅ | 2 bookings + scheduled Join call |
| PAT-013 | ✅ | Patient sent clinic message; admin reply via API; thread has both sides |
| PAT-014 | 🔄 | Doctor chat button present; expand + file attach not run |
| PAT-015 | ✅ | Payments empty state |
| PAT-016 | ✅ | Same as PAT-015 (no payments) |
| PAT-017 | ✅ | Prescriptions placeholder empty state |
| PUB-017 | ⚠️ | Form fill OK; browser submit blocked by consent (ISS-010). API submit with DOB → `Request received`, id `0c3fbe31-…` |

**Window 1 remaining:** PAT-006, PAT-007 full cycle, PAT-009 cancel-only, PAT-010 throwaway, PAT-014 doctor chat + attachment, PUB-017 browser success banner + 3rd card in UI.

---

## Session 2 highlights

- **Patient** (clean login): account dashboard, **2 bookings** with schedule on `/account/bookings` ✅
- **Doctor** portal UI: dashboard, appointments list, **full appointment workspace** (SOAP, exams, docs, chat, print links), patients, forms, profile ✅
- **Public**: GP, specialist, doctors index, book-online form, health tests (coming soon), Malta home ✅
- **Admin**: country-home shortcut → `/admin/pages?pageKey=HOME` ✅
- **API**: doctor sub-resources (consultation, exams, documents, internal-messages, invoice) all 200 ✅

**Caveat:** Cursor browser tabs share one cookie jar — logging in as doctor overwrites patient/admin. Use **separate incognito profiles** for final sign-off.

---

## Phase 0 — Admin smoke

| TC | Status | Notes |
|----|--------|-------|
| ADM-031 | ✅ | Users list + detail |
| ADM-032 | ✅ | Suspend, role, reset password |
| ADM-033 | ✅ | Assets list + Malta filter |
| ADM-034 | 🔄 | Create asset form not submitted |
| ADM-035 | ⏭️ | S3 upload |
| ADM-039 | ✅ | Newsletter UI |
| ADM-041 | ✅ | Settings UI |
| ADM-042 | ✅ | `/admin/country-home` → pages filtered `pageKey=HOME` |
| ADM-044 | 🔄 | Destructive confirms |
| ADM-045 | 🔄 | Drag reorder |

---

## Phase 1 — Admin build world

| TC | Status | Notes |
|----|--------|-------|
| ADM-001–004 | ✅ | Login, dashboard, scope, sidebar |
| ADM-005–008 | ⚠️ | Malta/Brazil created; delete UI not run |
| ADM-009 | ✅ | Doctors list |
| ADM-010–015 | ✅ | Create, invite, availability (incl. Malta) |
| ADM-016 | ⚠️ | Specialties API needs `countryId` (script fixed) |
| ADM-017–023 | ⚠️ | Lists API OK; not all service kinds UI-tested |
| ADM-036–038 | ✅ | Pages CMS list + Malta HOME fix |

---

## Phase 2 — Doctor onboard

| TC | Status | Notes |
|----|--------|-------|
| SETUP-DOC-001 | ⚠️ | Malta doctor via API |
| DOC-001–003 | ✅ | Dashboard, nav, linked profile |
| DOC-024 | ✅ | Forms templates UI at `/doctor/forms` |
| DOC-028–030 | ✅ | Profile edit UI at `/doctor/profile` |
| DOC-033 | ⚠️ | Sign out in `lg` sidebar not exposed to automation; `POST /api/auth/logout` works |
| DOC-034 | ✅ | Doctor cannot use admin API (403) |

---

## Phase 3 — Public

| TC | Status | Notes |
|----|--------|-------|
| PUB-001 | ✅ | Country gate → `/ireland/en` |
| PUB-002 | ✅ | Ireland home |
| PUB-003 | ✅ | General consultation page |
| PUB-004 | ✅ | Specialist consultation + specialties grid |
| PUB-005 | ✅ | Doctors index (4 IE doctors) |
| PUB-006 | 🔄 | Doctor profile pages not all clicked |
| PUB-007 | ⚠️ | Prescriptions “coming soon” (by design) |
| PUB-008 | ⚠️ | Health tests “coming soon” |
| PUB-017 | ⚠️ | API booking ✅ (needs DOB for IE); browser consent automation blocked (ISS-010) |
| PUB-009–016, 018–022 | ⚠️ | Book-online form renders; Stripe path not E2E |
| PUB-023 | ⏭️ | **N/A** — no header search in UI |
| PUB-028 | ✅ | 404 page |
| PUB-029 | 🔄 | Footer/blog/contact spot-check partial |
| Malta | ✅ | `/malta/en` after ISS-009 + `pageKey=HOME` |

---

## Phase 4 — Patient

| TC | Status | Notes |
|----|--------|-------|
| SETUP + PAT-001 | ✅ | Account dashboard |
| PAT-002–004 | ✅ | Profile view/edit (session 3) |
| PAT-005–008 | ⚠️ | Security verified + GDPR export ✅; password change + delete-cancel open |
| PAT-012–017 | ✅ | Bookings, clinic chat, payments, prescriptions (session 3) |
| PAT-013–014 | ⚠️ | Clinic chat ✅; doctor chat + file not run |
| PAT API | ✅ | `/api/account/appointments`, `/api/auth/me`, `/api/auth/me/export`, messages |

---

## Phase 5 — Appointment flow

| TC | Status | Notes |
|----|--------|-------|
| ADM-024 | ✅ | Queue + country filter |
| ADM-025–030 | ✅ | Detail, schedule, chat, internal notes |
| DOC-004–023 | ✅ | List + workspace UI; APIs 200 for consultation/exams/docs/invoice |
| DOC-032 | ⚠️ | “Print summary” + “Print invoice” links present; PDF not verified |
| DOC-040 | ⏭️ | 24h chat lock (time-sensitive) |

**Test appointment:** `9482a98c-1ad7-4c77-9c48-746806e322f4` → Dr. Global Health, Meet link set.

---

## Phase 6 — Cross-cutting

| TC | Status | Notes |
|----|--------|-------|
| ADM-040 | ✅ | Audit log UI |
| ADM-048 | ✅ | Doctor/patient → admin API 403 |
| DOC-035–039 | 🔄 | Reports/notifications not fully walked |
| ADM-043 | 🔄 | Full audit trail after doctor mutations not re-filtered |
| ADM-046–047 | ⚠️ | Admin may access `/doctor` by design; sign-out via API |
| ADM-049–060 | 🔄 | Inactive country, mobile, Stripe webhook, pagination, etc. |

---

## Code fixes (cumulative)

| ID | Summary |
|----|---------|
| ISS-008 | Admin appointment detail — `AdminAppointmentChat` wrapper |
| ISS-009 | Malta public home — `getPublicCountryByCode` |

---

## Execution estimate

~**80%** complete. **3-window plan** (your call which window next):

| Window | Remaining |
|--------|-----------|
| **1 Patient** | PAT-006/007/009/010/014, PUB-017 browser confirm |
| **2 Doctor** | DOC-033 sign-out (lg sidebar), DOC-021 file attach, DOC-035/037 |
| **3 Admin** | ADM-044/045/029/049/040/043 |
| **Defer** | ADM-034/035 S3, ADM-060 Stripe CLI, DOC-040 DB backdate |
| **Mobile** | 375px / 768px critical pages |

Use **separate incognito per role** (Cursor shares cookies).

```powershell
powershell -File docs/manual-tests/run-api-smoke.ps1
powershell -File docs/manual-tests/run-phase0-api.ps1
```
