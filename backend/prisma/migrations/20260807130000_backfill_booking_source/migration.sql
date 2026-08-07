-- Backfill Order.bookingSource / Appointment.bookingSource for rows created
-- before the column existed (20260807120000 / 20260807120500) — they all
-- defaulted to WEBSITE, which is wrong for appointments actually booked by
-- an admin or the AI phone agent.
--
-- AI_CALL is recovered from the audit trail: manual-booking.service.ts always
-- writes an APPOINTMENT_CREATED AuditLog row with metadata.source set to
-- "partner_api" for partner-API (AI call) bookings, "admin_manual" otherwise.
-- Everything else with Appointment.manualEntry = true (and not already
-- flagged AI_CALL above) is a plain admin manual booking.
--
-- Hand-written and fully idempotent on purpose — see the two prior
-- migrations' headers for why (live Railway DB, `migrate deploy` only).

UPDATE "Appointment" a
SET "bookingSource" = 'AI_CALL'
FROM "AuditLog" al
WHERE al."entityType" = 'Appointment'
  AND al."action" = 'APPOINTMENT_CREATED'
  AND al."entityId" = a."id"
  AND al."metadata"->>'source' = 'partner_api'
  AND a."bookingSource" = 'WEBSITE';

UPDATE "Appointment"
SET "bookingSource" = 'MANUAL'
WHERE "manualEntry" = true
  AND "bookingSource" = 'WEBSITE';

-- Propagate onto the linked Order via the relational join table — every
-- manual/AI booking's Order was created in lockstep with its Appointment in
-- the same manual-booking.service.ts call, so the two always agree.
UPDATE "Order" o
SET "bookingSource" = a."bookingSource"
FROM "OrderAppointment" oa
JOIN "Appointment" a ON a."id" = oa."appointmentId"
WHERE oa."orderId" = o."id"
  AND a."bookingSource" IN ('MANUAL', 'AI_CALL')
  AND o."bookingSource" = 'WEBSITE';
