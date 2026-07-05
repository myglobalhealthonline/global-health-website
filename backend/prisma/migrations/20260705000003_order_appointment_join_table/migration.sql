-- Suggestion 8 (code review 2026-07-05): Order.appointmentIds is a
-- denormalized String[] with no FK integrity — an id can survive deletion
-- of the appointment it names, and there's no join/index support beyond a
-- GIN array-contains scan. This table is the relational replacement; it is
-- dual-written alongside the array during the transition (see the
-- deprecation note on Order.appointmentIds in schema.prisma) and backfilled
-- from every existing order below.
CREATE TABLE "OrderAppointment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAppointment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderAppointment_orderId_appointmentId_key" ON "OrderAppointment"("orderId", "appointmentId");

CREATE INDEX "OrderAppointment_appointmentId_idx" ON "OrderAppointment"("appointmentId");

ALTER TABLE "OrderAppointment" ADD CONSTRAINT "OrderAppointment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderAppointment" ADD CONSTRAINT "OrderAppointment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one row per (order, appointment id) pair that currently exists
-- in the array, skipping any id that no longer resolves to a real
-- Appointment (exactly the drift this table exists to prevent going
-- forward — those stale ids are left in the array untouched, but can't be
-- backfilled into a relation that requires the FK to resolve).
INSERT INTO "OrderAppointment" ("id", "orderId", "appointmentId", "createdAt")
SELECT
  'oa_' || substr(md5(o.id || '|' || appt_id), 1, 24),
  o.id,
  appt_id,
  o."createdAt"
FROM "Order" o,
  LATERAL unnest(o."appointmentIds") AS appt_id
WHERE EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = appt_id)
ON CONFLICT DO NOTHING;
