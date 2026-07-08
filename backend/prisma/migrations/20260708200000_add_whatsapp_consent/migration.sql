-- Per-booking WhatsApp-updates consent (GDPR). Patient WhatsApp sends are
-- gated on these flags; doctor sends and emails are unaffected.
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "whatsappConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "patientWhatsappConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "patientWhatsappConsent" BOOLEAN NOT NULL DEFAULT false;
