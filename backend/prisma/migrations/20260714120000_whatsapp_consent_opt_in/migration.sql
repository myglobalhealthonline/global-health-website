-- GDPR: WhatsApp messaging consent must be an affirmative opt-in
-- (Art. 4(11), CJEU Planet49). Flip the column default back to false;
-- existing rows keep their stored value (past bookings collected under
-- the old opt-out flow are left untouched — data migration is a legal
-- decision, not a schema one).
ALTER TABLE "Appointment" ALTER COLUMN "whatsappConsent" SET DEFAULT false;
