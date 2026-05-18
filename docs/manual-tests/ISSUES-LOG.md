# Manual Test Issues Log

> Started: 2026-05-18  
> Env: `http://localhost:3000` + `http://localhost:4000`  
> Tester: browser automation

## Status legend

| Symbol | Meaning |
|--------|---------|
| 🔴 | Open — blocks tests |
| 🟡 | Open — workaround exists |
| 🟢 | Fixed |
| ⚪ | Won't fix / by design |

---

## Issues

| ID | Phase | TC | Severity | Summary | Status | Fix |
|----|-------|-----|----------|---------|--------|-----|
| ISS-001 | P3 | TC-PUB-001 | P0 | Country gate IE→EN → 404 `/ireland/services/en` | 🟢 | `CountryEntryGate`: `router.push(\`/${slug}/${lang}\`)` |
| ISS-002 | P1 | TC-ADM-002 | P2 | Admin dashboard blank ~3s after login (RSC slow) | 🟢 | Added `/admin/loading.tsx` route skeleton so dashboard no longer renders blank while server data loads |
| ISS-003 | dev | all | P3 | Next.js dev hydration overlay blocks clicks (bottom-left) | 🟡 | Collapse badge before submit |
| ISS-004 | dev | multiple | P3 | Hydration mismatches (login, CountryEntryGate, Toggle, RichText) | 🟢 | `suppressHydrationWarning` on `getFullYear()` in CountryEntryGate, SiteFooter, footer-column; Toggle/RichText remain P3 dev-only noise |
| ISS-005 | P1 | TC-ADM-010 | P0 | Doctor create → `Unexpected admin doctors error` (P2028 tx timeout + `pageSize=250` → 400) | 🟢 | `ADMIN_DOCTOR_TX_OPTIONS` 20s; `pageSize` max 250; P2028 → 503 message |
| ISS-006 | P1/P2 | TC-ADM-048, TC-DOC-034 | P1 | Doctor session on `/api/admin/*` → 503 not 403 (`resolveOptionalAuthUser` ignored DOCTOR) | 🟢 | `verifyAdminAccess` reads JWT role from cookie |
| ISS-007 | P1 | TC-ADM-024 | P2 | Appointment queue country filter hardcoded; Malta/Brazil missing | 🟢 | Options from `fetchAdminCountries()` |
| ISS-008 | P5 | TC-ADM-025 | P0 | `/admin/appointments/[id]` crash: server passed `fetchAdminMessages` into `ChatThread` client | 🟢 | `AdminAppointmentChat` client wrapper |
| ISS-009 | P3/P5 | Malta public | P1 | `/malta/en` 404 — `getCountryByCode` only checks seed, not admin countries | 🟢 | `getPublicCountryByCode` on country home |
| ISS-010 | P3 | TC-PUB-017 | P2 | Book-online consent: uncontrolled checkbox + `FormData` missed checked state in automation | 🟢 | Controlled `consentAccepted` state; server-passes `initialConsultationType` |
| ISS-011 | P4 | TC-PAT-009 | P1 | `window.confirm` on delete: MCP `browser_handle_dialog(accept:false)` did not cancel; main patient deleted once | 🟢 | `DeleteAccountButton` inline modal with explicit Cancel / Delete account |
| ISS-012 | P4 | TC-PAT-013 | P3 | `/account/bookings` hydration error when chat expands (`toLocaleString` / `Intl` TZ drift) | 🟢 | `format-datetime.ts` fixed `en-IE` + `Europe/Dublin` in bookings + chat |
| ISS-013 | P1 | TC-ADM-044 | P2 | Destructive admin deletes (countries, doctors, services, health-tests, assets, pages, availability) submit without `window.confirm` | 🟢 | New `ConfirmDeleteButton` client component; replaced 11 bare delete forms across country/asset/doctor/health-test/service/page/availability list+detail views. Pre-existing `DeleteCountryButton` kept on countries list |
| ISS-014 | P1 | TC-ADM-045 | P3 | Countries table shows `GripVertical` but no reorder implementation | 🟢 | Removed misleading drag handle from countries/services lists; `sortOrder` remains the explicit ordering control |
| ISS-015 | P4 | TC-PAT-014 | P2 | Consultation chat file upload needs paid appointment + S3 (`isMediaStorageConfigured`) | 🟢 | Upload path passes with a paid appointment; storage supports S3 or local dev fallback via `isMediaStorageConfigured()` |

---

## Phase progress

| Phase | Doc | Started | Finished | Notes |
|-------|-----|---------|----------|-------|
| 1 Admin | TEST-ADMIN.md | 2026-05-18 | partial | See `TEST-RESULTS.md` — core CRUD + queue ✅; many UI/destructive ⏭️ |
| 2 Doctor | TEST-DOCTOR.md | 2026-05-18 | partial | Dashboard + appointments list ✅; clinical flows need data ⏭️ |
| 3 Public | TEST-PUBLIC-WEBSITE.md | 2026-05-18 | partial | IE home + 404 ✅; booking/Stripe ⏭️ |
| 4 Patient | TEST-PATIENT.md | 2026-05-18 | partial | API auth + bookings ✅; account UI ⏭️ |
| 0 Admin smoke | TEST-EXECUTION-ORDER.md | 2026-05-18 | ~90% | 042 ✅; 034–035/044–045 open |
| 5 Cross-role | mixed | 2026-05-18 | ~85% | Full doctor workspace + admin schedule ✅ |
| 6 Cross-cutting | TEST-EXECUTION-ORDER.md | 2026-05-18 | ~40% | Audit ✅; mobile/Stripe/destructive open |
| 2 Doctor | TEST-DOCTOR.md | 2026-05-18 | ~75% | Portal UI ✅; DOC-040/033 partial |
| 3 Public | TEST-PUBLIC-WEBSITE.md | 2026-05-18 | ~70% | Core pages ✅; booking E2E open |
| 4 Patient | TEST-PATIENT.md | 2026-05-18 | ~90% | Session 4 complete; PAT-009 cancel manual only |
| 2 Doctor | TEST-DOCTOR.md | 2026-05-18 | ~90% | DOC-021/035/037 ✅; DOC-033 UI manual |
| 1 Admin | TEST-ADMIN.md | 2026-05-18 | ~88% | ADM-029/049 ✅; ADM-044/045 gaps logged |
| 6 Cross-cutting | TEST-EXECUTION-ORDER.md | 2026-05-18 | ~98% | ADM-055 ✅; PAT-009 cancel manual only |
| 4 Patient | TEST-PATIENT.md | 2026-05-18 | ~98% | PAT-010/014 upload ✅; PAT-009 manual cancel |
| 1 Admin | TEST-ADMIN.md | 2026-05-18 | ~98% | ADM-034/035/060 ✅ via API + webhook script |
