# Manual Test Results — 7-phase complete order

**Last run:** 2026-05-18 (session 5 — finish remaining TCs)  
**Order doc:** `TEST-EXECUTION-ORDER.md`  
**Issues:** `ISSUES-LOG.md`  
**Scripts:** `docs/manual-tests/run-api-smoke.ps1`, `docs/manual-tests/run-remaining-window-tests.ps1`

Legend: ✅ PASS · ⚠️ PARTIAL · ❌ FAIL · ⏭️ SKIP · 🔄 NOT RUN

---

## Session 5 — Remaining TCs (mobile, DOC-040, ADM-043/044)

### Completed this session

| TC | Status | Notes |
|----|--------|-------|
| **PUB-026** | ✅ | 375px: hamburger + stacked hero on `/ireland/en`; book-online form single-column at 375px |
| **DOC-039** | ✅ | 375px `/doctor`: sidebar hidden; header shows “Doctor portal” + doctor name |
| **ADM-055** | ⚠️ | 768px layout not verified in browser — shared session stayed on doctor (`/admin` redirects). Admin shell uses responsive `lg:` nav (code review). Re-test in incognito as `admin@globalhealthonline.com` |
| **DOC-040** | ✅ | SQL backdate `consultationCompletedAt` −25h → patient POST 403 “Chat window closed”; doctor PATCH reopen → patient can send; DB reset |
| **ADM-043** | ✅ | Filter `entityType=Consultation` + `entityId=cmpadbcyn00063gju9vj9vtcb` → **6** audit events (appointment id filter returns 0) |
| **ADM-044** | ✅ | `DeleteCountryButton` adds `window.confirm` before country delete (ISS-013) |
| **ADM-045** | ⏭️ | N/A — `GripVertical` only, no DnD (ISS-014) |
| **DOC-033** | ⚠️ | API logout ✅; UI “Sign out →” in `lg` sidebar not exposed in automation tree (viewport/sidebar not in snapshot at 1280–1440) |
| **PAT-009** | ⚠️ | `security/page.tsx` returns early when `confirm()` is false — correct. Cursor browser defaults `confirm` to accept unless `browser_handle_dialog(accept:false)` is registered **before** click (ISS-011). **Manual:** incognito → Cancel on delete dialog |
| **PAT-010** | ⚠️ | API delete verified in session 4; register endpoint **429** (5/hr) blocks new throwaway this session |

**API smoke:** 24/24 passed (`run-api-smoke.ps1`).

**Test data:** Appointment `9482a98c-1ad7-4c77-9c48-746806e322f4` — `paymentStatus=PAID` for chat; `consultationCompletedAt` reset to `NULL` after DOC-040.

---

## Session 4 — Remaining windows (Steps 2–5)

### Code fixes (session 4)

| ID | Fix |
|----|-----|
| ISS-010 | Controlled consent checkbox + server `initialConsultationType` |
| ISS-012 | `format-datetime.ts` — stable `en-IE` / `Europe/Dublin` for bookings + chat |

### Window 1 — Patient (finished)

| TC | Status | Notes |
|----|--------|-------|
| PAT-003/004 | ✅ | Profile view/edit |
| PAT-005 | ⚠️ | Main patient unverified after re-seed; amber state + resend works in UI |
| PAT-006 | ✅ | Browser: “Verification email sent…” on `/account/security` |
| PAT-007 | ✅ | API: change password cycle (wrong current → 400, new pass works); re-seeded to `GHAdmin2026X7qL9!` |
| PAT-008 | ✅ | `GET /api/auth/me/export` 200 |
| PAT-009 | ⚠️ | See session 5 — manual cancel in incognito |
| PAT-010 | ⚠️ | API OK when register not rate-limited |
| PAT-012–013 | ✅ | Bookings + clinic chat (admin reply) |
| PAT-014 | ✅ | API: patient/doctor text, lock/unlock; file upload ⏭️ (415 / S3) |
| PAT-015–017 | ✅ | Payments empty, prescriptions placeholder |
| PUB-017 | ✅ | Browser submit after ISS-010; 5 bookings on patient account |

### Window 2 — Doctor

| TC | Status | Notes |
|----|--------|-------|
| DOC-021 | ✅ | API: doctor message, lock, re-open; patient receives |
| DOC-033 | ⚠️ | API logout ✅; UI sign out — see session 5 |
| DOC-035 | ✅ | API: foreign appointment → 404 |
| DOC-037 | ✅ | API: consecutive PATCH consultation drafts; last write wins |
| DOC-040 | ✅ | See session 5 |

### Window 3 — Admin

| TC | Status | Notes |
|----|--------|-------|
| ADM-029 | ✅ | API admin message on appointment |
| ADM-040 | ✅ | Audit log list loads (11+ events) |
| ADM-043 | ✅ | See session 5 — use Consultation `entityId` |
| ADM-044 | ✅ | See session 5 — country delete confirm |
| ADM-045 | ⏭️ | N/A — no drag-and-drop |
| ADM-049 | ✅ | API: inactive Malta excluded from `GET /api/countries`; reactivated after |

### Deferred (infra)

| TC | Status |
|----|--------|
| ADM-034/035 | ⏭️ S3 |
| ADM-060 | ⏭️ Stripe CLI webhook |
| PAT-014 file upload | ⏭️ S3 / multipart |

---

## Session 3 — Window 1 (patient, partial)

See git history; superseded by session 4–5 tables above.

---

## Session 2 highlights

- **Patient:** account dashboard, **2+ bookings** with schedule on `/account/bookings` ✅
- **Doctor** portal UI: dashboard, appointments list, **full appointment workspace** ✅
- **Public:** GP, specialist, doctors index, book-online, Malta home ✅
- **Admin:** country-home shortcut → `/admin/pages?pageKey=HOME` ✅
- **API:** doctor sub-resources all 200 ✅

**Caveat:** Cursor browser tabs share one cookie jar — use **separate incognito profiles** per role.

---

## Phase summary (cumulative)

| Phase | Coverage |
|-------|----------|
| 0 Admin smoke | ~95% |
| 1 Admin build | ~92% |
| 2 Doctor | ~95% (DOC-033 UI sign out manual) |
| 3 Public | ~90% (PUB-026 ✅) |
| 4 Patient | ~92% (PAT-009/010 caveats) |
| 5 Appointment flow | ~90% |
| 6 Cross-cutting | ~85% (ADM-055 admin tablet needs incognito) |

**Overall ~94%** of planned manual tests complete.

```powershell
powershell -File docs/manual-tests/run-api-smoke.ps1
powershell -File docs/manual-tests/run-remaining-window-tests.ps1
```

---

## Code fixes (cumulative)

| ID | Summary |
|----|---------|
| ISS-001–009 | See `ISSUES-LOG.md` |
| ISS-010 | Book-online consent controlled state |
| ISS-011 | PAT delete automation — register dialog before click |
| ISS-012 | Bookings/chat hydration dates |
| ISS-013 | Country delete `window.confirm` on admin countries list |
