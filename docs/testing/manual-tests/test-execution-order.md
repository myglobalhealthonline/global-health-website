# Manual Test Execution Order (complete coverage)

All **155** cases from `TEST-ADMIN.md`, `TEST-DOCTOR.md`, `TEST-PATIENT.md`, `TEST-PUBLIC-WEBSITE.md` are assigned below.

| Phase | Focus | Admin | Doctor | Public | Patient |
|-------|--------|-------|--------|--------|---------|
| **0** | Admin smoke (not booking-tied) | 031–035, 039, 041–042, 044–045 | — | — | — |
| **1** | Admin build world | 001–023, 036–038, **009** | — | — | — |
| **2** | Doctor onboard | — | SETUP + 001–003, 024, 028–030, **033–034** | — | — |
| **3** | Public browse + book | — | — | 001–029, **023** | — |
| **4** | Patient account | — | — | — | SETUP + 001–026 |
| **5** | Appointment flow | 024–030 | 004–023, **032**, **040** | — | — |
| **6** | Cross-cutting | 040, 043, 046–060, **047** | 035–039 | — | — |

**Credentials:** `*@globalhealthonline.com` / `GHAdmin2026X7qL9!`

**Tips:** Use separate incognito per role; collapse Next.js dev overlay before clicks; after rate-limit hits, restart backend or wait 15m (dev limit: 200 logins / 15m).

Results: `TEST-RESULTS.md` · Issues: `ISSUES-LOG.md`
