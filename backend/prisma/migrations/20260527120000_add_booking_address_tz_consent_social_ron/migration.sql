-- AlterTable: Doctor social links
ALTER TABLE "Doctor"
  ADD COLUMN "instagramUrl" TEXT,
  ADD COLUMN "facebookUrl"  TEXT,
  ADD COLUMN "linkedinUrl"  TEXT;

-- AlterTable: Appointment timezone, address snapshot, dual GDPR consent
ALTER TABLE "Appointment"
  ADD COLUMN "patientTimezone"      TEXT,
  ADD COLUMN "addressLine1"         TEXT,
  ADD COLUMN "addressLine2"         TEXT,
  ADD COLUMN "addressCity"          TEXT,
  ADD COLUMN "addressPostalCode"    TEXT,
  ADD COLUMN "addressCountryCode"   TEXT,
  ADD COLUMN "gdprConsentClinic"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "gdprConsentPlatform"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "gdprConsentedAt"      TIMESTAMP(3);

-- AlterTable: BookingSetting per-country address requirement
ALTER TABLE "BookingSetting"
  ADD COLUMN "requireAddress" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: CartItem patient snapshot for new booking fields
ALTER TABLE "CartItem"
  ADD COLUMN "patientNationalIdNumber"   TEXT,
  ADD COLUMN "patientTimezone"           TEXT,
  ADD COLUMN "patientAddressLine1"       TEXT,
  ADD COLUMN "patientAddressLine2"       TEXT,
  ADD COLUMN "patientAddressCity"        TEXT,
  ADD COLUMN "patientAddressPostalCode"  TEXT,
  ADD COLUMN "patientAddressCountryCode" TEXT,
  ADD COLUMN "patientGdprConsentClinic"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "patientGdprConsentPlatform" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "patientGdprConsentedAt"     TIMESTAMP(3);

-- AlterTable: OrderItem mirror of CartItem snapshot for the payment webhook
ALTER TABLE "OrderItem"
  ADD COLUMN "patientNationalIdNumber"   TEXT,
  ADD COLUMN "patientTimezone"           TEXT,
  ADD COLUMN "patientAddressLine1"       TEXT,
  ADD COLUMN "patientAddressLine2"       TEXT,
  ADD COLUMN "patientAddressCity"        TEXT,
  ADD COLUMN "patientAddressPostalCode"  TEXT,
  ADD COLUMN "patientAddressCountryCode" TEXT,
  ADD COLUMN "patientGdprConsentClinic"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "patientGdprConsentPlatform" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "patientGdprConsentedAt"     TIMESTAMP(3);

-- Data: Romanian leu currency
INSERT INTO "Currency" ("id", "code", "symbol", "decimals", "createdAt", "updatedAt")
VALUES (
  'cur_seed_ron_lei',
  'RON',
  'lei',
  2,
  NOW(),
  NOW()
)
ON CONFLICT ("code") DO NOTHING;

-- Data: Repoint existing Romania country to RON if it currently points at EUR
UPDATE "Country"
   SET "currencyId" = (SELECT "id" FROM "Currency" WHERE "code" = 'RON')
 WHERE "code" = 'rm'
   AND "currencyId" = (SELECT "id" FROM "Currency" WHERE "code" = 'EUR');

-- Data: Enforce national ID on Romania bookings
UPDATE "BookingSetting"
   SET "requireNationalId" = true,
       "timezone" = 'Europe/Bucharest'
 WHERE "countryId" = (SELECT "id" FROM "Country" WHERE "code" = 'rm');
