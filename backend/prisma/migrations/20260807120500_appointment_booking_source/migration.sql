-- Appointment.bookingSource — same provenance icon as Order.bookingSource
-- (added in 20260807120000_order_booking_source), mirrored onto Appointment
-- so the admin dashboard "Recent activity" feed (which reads Appointment,
-- not Order) can show it too.
--
-- Hand-written and fully idempotent on purpose — see the prior migration's
-- header for why (live Railway DB, `migrate deploy` only, never `migrate dev`).

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "bookingSource" "BookingSource" NOT NULL DEFAULT 'WEBSITE';
