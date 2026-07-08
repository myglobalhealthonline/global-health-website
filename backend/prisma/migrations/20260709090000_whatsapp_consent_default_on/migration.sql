-- WhatsApp updates become default-ON / opt-OUT (feature shipped <24h earlier
-- as opt-in; owner wants all existing bookings messaged, hence the UPDATEs).
ALTER TABLE "Appointment" ALTER COLUMN "whatsappConsent" SET DEFAULT true;
ALTER TABLE "CartItem" ALTER COLUMN "patientWhatsappConsent" SET DEFAULT true;
ALTER TABLE "OrderItem" ALTER COLUMN "patientWhatsappConsent" SET DEFAULT true;

UPDATE "Appointment" SET "whatsappConsent" = true;
UPDATE "CartItem" SET "patientWhatsappConsent" = true;
UPDATE "OrderItem" SET "patientWhatsappConsent" = true;
