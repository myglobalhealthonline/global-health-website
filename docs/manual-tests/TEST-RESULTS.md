# Manual Test Results — 7-phase complete order

**Last run:** 2026-05-18 (session 7 — last 2%)  
**Order doc:** `TEST-EXECUTION-ORDER.md`  
**Issues:** `ISSUES-LOG.md`  
**Scripts:** `run-api-smoke.ps1`, `run-remaining-window-tests.ps1`, `run-final-remaining-tests.ps1`, `run-last-2-percent.ps1`

Legend: ✅ PASS · ⚠️ PARTIAL · ❌ FAIL · ⏭️ SKIP · 🔄 NOT RUN

---

## Session 7 — Last 2% (PAT-008/009/013/021/007, DOC-033)

### API (automated)

| TC | Status | Notes |
|----|--------|-------|
| **PAT-008** | ✅ | `GET /api/auth/me/export` JSON includes appointments |
| **PAT-013** | ✅ | Clinic messages API on paid appointment |
| **PAT-021** | ✅ | Cross-patient message access denied |
| **PAT-007-full** | ✅ | Password change on throwaway patient |

### Browser (session 7)

| TC | Status | Notes |
|----|--------|-------|
| **PAT-009** | ✅ | Inline modal: Delete my account → **Cancel** → stays on `/account/security`; account intact |
| **DOC-033** | ✅ | Header **Sign out** → `/login?next=/doctor` |

### Code (session 7)

- `DeleteAccountButton` modal replaces `window.confirm` (ISS-011)
- `DoctorHeaderLogout` in doctor header (DOC-033 at all breakpoints)
- `login/ui.tsx` LoginFormFallback: removed invalid `motion.*` tags (login crash fix)

---

## Session 6 — Final remaining tests

### API / infra (automated)

| TC | Status | Notes |
|----|--------|-------|
| **PAT-010** | ✅ | DB-seeded throwaway → `DELETE /api/auth/me` → login blocked (`create-throwaway-patient.ts`) |
| **PAT-014 upload** | ✅ | PDF upload 200 to S3; chat thread has file attachments; `.exe` → 415 when not rate-limited |
| **ADM-034** | ✅ | `POST /api/admin/assets` after media upload |
| **ADM-035** | ✅ | `POST /api/admin/media/upload` PNG 200; PDF 415 |
| **ADM-060** | ✅ | `simulate-stripe-webhook.mjs` → appointment `PAID` + Payment row |
| **API smoke** | ✅ | 24/24 |

### Browser (session 6)

| TC | Status | Notes |
|----|--------|-------|
| **ADM-055** | ✅ | 768px: hamburger + “Open navigation” drawer with full admin links |
| **DOC-033** | ✅ | Superseded by session 7 header Sign out |
| **PAT-009** | ✅ | Superseded by session 7 modal Cancel |

### Still N/A / manual only

| TC | Status | Notes |
|----|--------|-------|
| **ADM-045** | ⏭️ | No drag-and-drop (ISS-014 by design) |

---

## Session 5 — Mobile + DOC-040 + ADM-043/044

| TC | Status | Notes |
|----|--------|-------|
| PUB-026 | ✅ | 375px Ireland home + book-online |
| DOC-039 | ✅ | 375px doctor mobile header |
| DOC-040 | ✅ | 24h lock + doctor re-open (API + SQL) |
| ADM-043 | ✅ | Audit filter by `Consultation` entityId |
| ADM-044 | ✅ | Country delete `window.confirm` (ISS-013) |

---

## Cumulative phase coverage

| Phase | Coverage |
|-------|----------|
| 0 Admin smoke | ~98% |
| 1 Admin build | ~98% |
| 2 Doctor | ~99% |
| 3 Public | ~92% |
| 4 Patient | ~99% |
| 5 Appointment flow | ~95% |
| 6 Cross-cutting | ~99% |

**Overall ~99%** of planned manual tests complete (remaining gaps: public booking E2E, optional UI-only PAT flows).

### Test accounts (after re-seed)

- `patient@globalhealthonline.com` / `GHAdmin2026X7qL9!`
- `doctor@globalhealthonline.com` / `GHAdmin2026X7qL9!`
- `admin@globalhealthonline.com` / `GHAdmin2026X7qL9!`
- Appointment: `9482a98c-1ad7-4c77-9c48-746806e322f4` (`paymentStatus=PAID`)

```powershell
powershell -File docs/manual-tests/run-api-smoke.ps1
powershell -File docs/manual-tests/run-remaining-window-tests.ps1
powershell -File docs/manual-tests/run-final-remaining-tests.ps1
powershell -File docs/manual-tests/run-last-2-percent.ps1
cd backend && pnpm exec tsx scripts/seed-test-accounts.ts   # if patient deleted
cd backend && node scripts/simulate-stripe-webhook.mjs <appointmentId>
```

---

## Code fixes (cumulative)

| ID | Summary |
|----|---------|
| ISS-001–013 | See `ISSUES-LOG.md` |
| ISS-011 | PAT-009 uses inline modal (Cancel safe for automation) |
