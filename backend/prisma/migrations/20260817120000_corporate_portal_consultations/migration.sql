-- Corporate consultations leave the Service catalogue.
--
-- Before: the three corporate consultations (pre-assessment, illness benefit,
-- fit-for-work) were Service rows carrying ServiceVisibility.CORPORATE_ONLY /
-- CORPORATE_REQUEST_ONLY, bookable through the public funnel behind a
-- server-side eligibility gate.
--
-- After: CorporatePlanService is self-contained — a named, free, portal-only
-- consultation with one assigned doctor, booked from /account/corporate against
-- that doctor's ordinary availability. No price, no slug, no Order, so it never
-- reaches checkout, commission, doctor payout or invoicing.
--
-- Hand-written and fully idempotent: this repo deploys with `migrate deploy`
-- against a live database that carries drift, so every statement here has to be
-- safe to re-run and must never assume the object is absent.
--
-- DESTRUCTIVE. It deletes the corporate Service rows and rebuilds
-- CorporatePlanService. Existing CorporatePlanService rows cannot be carried
-- over: they pointed at a Service and carried neither a name nor an assigned
-- doctor, and no default doctor can be invented here. After deploying, re-add
-- each plan's consultations on /admin/corporate.

-- ---------------------------------------------------------------------------
-- 1. Drop the old plan↔Service link table (rebuilt below with a new shape).
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS "CorporatePlanService";

-- ---------------------------------------------------------------------------
-- 2. Rebuild CorporatePlanService as a standalone consultation.
-- ---------------------------------------------------------------------------
-- The role enum predates this migration; recreate only when absent.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CorporatePlanServiceRole') THEN
        CREATE TYPE "CorporatePlanServiceRole" AS ENUM ('INCLUDED', 'PRE_ASSESSMENT', 'ILLNESS_BENEFIT', 'FIT_FOR_WORK');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CorporatePlanService" (
    "id" TEXT NOT NULL,
    "corporatePlanId" TEXT NOT NULL,
    "countryCode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "doctorId" TEXT NOT NULL,
    "role" "CorporatePlanServiceRole" NOT NULL DEFAULT 'INCLUDED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CorporatePlanService_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CorporatePlanService_corporatePlanId_isActive_sortOrder_idx"
    ON "CorporatePlanService"("corporatePlanId", "isActive", "sortOrder");
CREATE INDEX IF NOT EXISTS "CorporatePlanService_countryCode_idx"
    ON "CorporatePlanService"("countryCode");
CREATE INDEX IF NOT EXISTS "CorporatePlanService_doctorId_idx"
    ON "CorporatePlanService"("doctorId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CorporatePlanService_corporatePlanId_fkey'
    ) THEN
        ALTER TABLE "CorporatePlanService"
            ADD CONSTRAINT "CorporatePlanService_corporatePlanId_fkey"
            FOREIGN KEY ("corporatePlanId") REFERENCES "CorporatePlan"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CorporatePlanService_doctorId_fkey'
    ) THEN
        -- RESTRICT, not CASCADE: deleting a doctor must not silently strip a
        -- plan of a benefit its members can still see.
        ALTER TABLE "CorporatePlanService"
            ADD CONSTRAINT "CorporatePlanService_doctorId_fkey"
            FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. CorporateServiceRequest: serviceId → corporateServiceId.
-- ---------------------------------------------------------------------------
-- Every request pointed at a Service row that is about to be deleted and has no
-- corporate consultation to move to, so the table is cleared rather than left
-- dangling. HR raises them again against the new rows. (Verified empty in
-- production before this shipped, so no live request is being discarded.)
DELETE FROM "CorporateServiceRequest";

ALTER TABLE "CorporateServiceRequest" DROP CONSTRAINT IF EXISTS "CorporateServiceRequest_serviceId_fkey";
ALTER TABLE "CorporateServiceRequest" DROP COLUMN IF EXISTS "serviceId";
ALTER TABLE "CorporateServiceRequest" ADD COLUMN IF NOT EXISTS "corporateServiceId" TEXT;

-- The table is empty after the DELETE above, so NOT NULL is safe to enforce.
ALTER TABLE "CorporateServiceRequest" ALTER COLUMN "corporateServiceId" SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CorporateServiceRequest_corporateServiceId_fkey'
    ) THEN
        ALTER TABLE "CorporateServiceRequest"
            ADD CONSTRAINT "CorporateServiceRequest_corporateServiceId_fkey"
            FOREIGN KEY ("corporateServiceId") REFERENCES "CorporatePlanService"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Appointment.corporateServiceId — how a portal-booked corporate
--    consultation carries its name and duration without a Service row.
-- ---------------------------------------------------------------------------
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "corporateServiceId" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_corporateServiceId_fkey'
    ) THEN
        ALTER TABLE "Appointment"
            ADD CONSTRAINT "Appointment_corporateServiceId_fkey"
            FOREIGN KEY ("corporateServiceId") REFERENCES "CorporatePlanService"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Retire the corporate Service rows and the corporate ServiceVisibility
--    values.
-- ---------------------------------------------------------------------------
-- Historical appointments keep their history: Appointment.serviceId is
-- ON DELETE SET NULL, so a past corporate booking survives with a null service
-- rather than being deleted. Every other dependent row (translations, FAQs,
-- ServiceDoctor, assets) cascades with the service.
DELETE FROM "Service"
 WHERE "visibility" IN ('CORPORATE_ONLY', 'CORPORATE_REQUEST_ONLY');

-- Postgres cannot drop a value from an enum in place; swap the type. Anything
-- still holding a corporate value would fail the cast, which is why the DELETE
-- above runs first.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'ServiceVisibility' AND e.enumlabel = 'CORPORATE_ONLY'
    ) THEN
        CREATE TYPE "ServiceVisibility_new" AS ENUM ('PUBLIC', 'ADMIN_ONLY');
        ALTER TABLE "Service" ALTER COLUMN "visibility" DROP DEFAULT;
        ALTER TABLE "Service" ALTER COLUMN "visibility"
            TYPE "ServiceVisibility_new" USING ("visibility"::text::"ServiceVisibility_new");
        ALTER TABLE "Service" ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';
        DROP TYPE "ServiceVisibility";
        ALTER TYPE "ServiceVisibility_new" RENAME TO "ServiceVisibility";
    END IF;
END $$;
