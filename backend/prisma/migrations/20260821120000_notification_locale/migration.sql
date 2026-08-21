-- Notification language, chosen per booking rather than derived from the
-- country. Website checkouts store the site locale the patient actually booked
-- in; admin/doctor manual bookings store the operator's dropdown choice, which
-- defaults to the booking country's defaultLocale.
--
-- Deliberately NOT reusing Appointment.consultationLanguageCode: that is the
-- language the consultation is SPOKEN in (set by GP assignment) and a patient
-- can browse in one language and be seen in another.
--
-- Nullable with no backfill: null means "derive from countryCode at send time",
-- which is exactly what every existing row did before this column.
--
-- IF NOT EXISTS because this DB is live and has drifted from migration history
-- before; re-running must be a no-op.

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "notificationLocale" "LocaleCode";

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "notificationLocale" "LocaleCode";
