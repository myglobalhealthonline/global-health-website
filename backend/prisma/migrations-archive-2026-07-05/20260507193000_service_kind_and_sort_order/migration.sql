CREATE TYPE "ServiceKind" AS ENUM (
  'GENERAL',
  'SPECIALIST',
  'PRESCRIPTION',
  'HEALTH_TEST',
  'HOME_DELIVERY'
);

ALTER TABLE "Service"
ADD COLUMN "kind" "ServiceKind" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "Service"
SET "kind" = 'SPECIALIST'
WHERE
  ("legacyPath" IS NOT NULL AND "legacyPath" LIKE '/ireland-specialist-consultations/%')
  OR "specialtyId" IS NOT NULL;

UPDATE "Service"
SET
  "kind" = 'GENERAL',
  "specialtyId" = NULL
WHERE
  "legacyPath" IN (SELECT "generalConsultationPath" FROM "Country")
  OR (
    "legacyPath" IS NOT NULL
    AND "legacyPath" LIKE '/ireland/%'
    AND "legacyPath" NOT LIKE '/ireland-specialist-consultations/%'
  );
