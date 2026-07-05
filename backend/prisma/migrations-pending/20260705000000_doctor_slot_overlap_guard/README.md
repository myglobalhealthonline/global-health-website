# SF7 — DoctorTimeSlot overlap exclusion constraint (blocked, not applied)

This migration is deliberately kept **outside** `prisma/migrations/` so
`prisma migrate deploy` never picks it up automatically. Moving it back in
once the conflict below is resolved is the only remaining step.

## Why it's blocked

The live DB had 464 overlapping `DoctorTimeSlot` pairs for one doctor
(`cmp5r0if3002kssjug743x0p6`). 473 of the underlying rows were orphaned
duplicates (OPEN, no `Appointment` pointed at them) from the lazy
slot-generation race this migration exists to prevent — those were deleted
directly against the live DB on 2026-07-05 as part of applying this fix.

**9 overlap pairs remain**, and every single one involves two *real*
`Appointment` rows (not orphans) — deleting either slot would desync or
orphan a booked appointment, so they were left untouched pending your review.

All 9 conflicts are on the same doctor and involve only two email addresses:

- `naumanarif432@gmail.com` ("nauman test")
- `bscs23060@itu.edu.pk` ("Muhammad Nauman Arif")

This has every hallmark of internal QA/dev testing rather than real patient
bookings, but that's an inference — appointment rows aren't something I'll
delete without you confirming it.

## Conflicting appointment pairs

| Doctor | Appt A | A window (UTC) | Appt B | B window (UTC) |
|---|---|---|---|---|
| cmp5r0if3002kssjug743x0p6 | cmqh4uppp005301p4lgjgxe1f | 06-17 03:28–03:42 | cmqh61v26000501o1t7vn6vo9 | 06-17 03:30–04:00 |
| cmp5r0if3002kssjug743x0p6 | cmqe9l2qj000h01nyvqk7a7qc | 06-22 03:00–03:25 | 2d1abec4-ad79-4eb7-9202-973f59ef9b9c | 06-22 03:15–03:30 |
| cmp5r0if3002kssjug743x0p6 | cmqeawmai000s01nyyr8b4fig | 06-22 03:25–03:50 | 2d1abec4-ad79-4eb7-9202-973f59ef9b9c | 06-22 03:15–03:30 |
| cmp5r0if3002kssjug743x0p6 | cmqeawmai000s01nyyr8b4fig | 06-22 03:25–03:50 | 618d4bf8-3e36-4fbc-84a6-1d474d8cb0a9 | 06-22 03:30–04:00 |
| cmp5r0if3002kssjug743x0p6 | cmqeawmai000s01nyyr8b4fig | 06-22 03:25–03:50 | ec7abcfb-675a-4d32-8f56-234d17c93dc0 | 06-22 03:45–04:00 |
| cmp5r0if3002kssjug743x0p6 | 618d4bf8-3e36-4fbc-84a6-1d474d8cb0a9 | 06-22 03:30–04:00 | ec7abcfb-675a-4d32-8f56-234d17c93dc0 | 06-22 03:45–04:00 |
| cmp5r0if3002kssjug743x0p6 | 2867d923-0239-434a-b472-5641a6b2a2b3 | 06-22 03:50–04:15 | 618d4bf8-3e36-4fbc-84a6-1d474d8cb0a9 | 06-22 03:30–04:00 |
| cmp5r0if3002kssjug743x0p6 | 2867d923-0239-434a-b472-5641a6b2a2b3 | 06-22 03:50–04:15 | ec7abcfb-675a-4d32-8f56-234d17c93dc0 | 06-22 03:45–04:00 |
| cmp5r0if3002kssjug743x0p6 | cmqh04m2b000401lnd37rh80y | 06-22 04:15–04:40 | cmqidsf60003901p62kysbiaq | 06-22 04:30–05:00 |

## To finish this fix

1. Decide what to do with these 9 appointments (delete if test data; cancel +
   notify + reschedule the loser of each pair if any turn out to be real).
2. Confirm zero overlapping non-BLOCKED slots remain:
   ```sql
   SELECT count(*) FROM "DoctorTimeSlot" a
   JOIN "DoctorTimeSlot" b
     ON a."doctorId" = b."doctorId" AND a.id < b.id
     AND a."startAt" < b."endAt" AND a."endAt" > b."startAt"
   WHERE a.status <> 'BLOCKED' AND b.status <> 'BLOCKED';
   -- must return 0
   ```
3. Move this folder's `migration.sql` into `prisma/migrations/` (drop this
   README, or move it too — Prisma ignores non-`.sql` files) and run
   `pnpm db:deploy`.
