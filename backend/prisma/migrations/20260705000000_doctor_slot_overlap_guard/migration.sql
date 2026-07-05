-- SF7 (code review 2026-07-05): concurrent lazy slot generation for the same
-- doctor across different services (e.g. 30-min GENERAL vs 60-min SPECIALIST)
-- can each pass the in-process overlap check before either write lands,
-- producing two overlapping bookable OPEN slots. The per-row OPEN->BOOKED
-- claim in claimDoctorSlot prevents double-booking a single row, but not
-- two distinct overlapping rows. This constraint is the real guard.
--
-- BLOCKED slots are admin holds, not bookable — excluded so an admin block
-- doesn't collide with a real slot in the same window.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- startAt/endAt are TIMESTAMP(3) (no timezone) — tstzrange() would need an
-- implicit STABLE timezone() cast, which Postgres rejects in an index
-- expression ("functions in index expression must be marked IMMUTABLE").
-- tsrange() operates on plain timestamps and needs no such cast.
ALTER TABLE "DoctorTimeSlot"
  ADD CONSTRAINT "no_overlapping_doctor_slots"
  EXCLUDE USING gist (
    "doctorId" WITH =,
    tsrange("startAt", "endAt") WITH &&
  )
  WHERE ("status" <> 'BLOCKED');
