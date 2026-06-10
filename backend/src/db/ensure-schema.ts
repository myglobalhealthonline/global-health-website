import { Pool } from "pg";

/**
 * Lightweight, idempotent schema patches that run once at boot.
 *
 * The project doesn't have a clean prisma migrate history in production
 * (drift from past `prisma db push` runs), so adding a new migration file
 * and relying on `prisma migrate deploy` is risky — it could refuse to
 * run if it can't reconcile the `_prisma_migrations` table. Instead, we
 * apply additive, idempotent DDL here on every server start.
 *
 * Rules for adding to this file:
 *   - Every statement MUST be idempotent (`IF NOT EXISTS` or equivalent).
 *   - Additive only — never drop or rename columns from this hook.
 *   - Keep the list short; long DDL on every boot slows cold starts.
 *
 * Once we sort out the migration history properly, statements here can
 * move into proper migrations and this file can be retired.
 */
const PATCHES: { name: string; sql: string }[] = [
  {
    name: "Country.enabledFeatures",
    sql: `
      ALTER TABLE "Country"
        ADD COLUMN IF NOT EXISTS "enabledFeatures" TEXT[] NOT NULL DEFAULT ARRAY[
          'country-home',
          'country-content',
          'pages',
          'services',
          'general-consultations',
          'specialist-consultations',
          'online-prescriptions',
          'health-tests',
          'appointments'
        ]::TEXT[];
    `,
  },
  {
    name: "Service.galleryImagePaths",
    sql: `
      ALTER TABLE "Service"
        ADD COLUMN IF NOT EXISTS "galleryImagePaths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
    `,
  },
  {
    name: "Service.shippingCents",
    sql: `
      ALTER TABLE "Service"
        ADD COLUMN IF NOT EXISTS "shippingCents" INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    name: "HealthTest.shippingCents",
    sql: `
      ALTER TABLE "HealthTest"
        ADD COLUMN IF NOT EXISTS "shippingCents" INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    name: "CartItem.shippingCents",
    sql: `
      ALTER TABLE "CartItem"
        ADD COLUMN IF NOT EXISTS "shippingCents" INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    name: "User.dateOfBirth",
    sql: `
      ALTER TABLE "User"
        ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
    `,
  },
  {
    name: "CartItem.patientFields",
    sql: `
      ALTER TABLE "CartItem"
        ADD COLUMN IF NOT EXISTS "patientFullName"          TEXT,
        ADD COLUMN IF NOT EXISTS "patientEmail"             TEXT,
        ADD COLUMN IF NOT EXISTS "patientPhone"             TEXT,
        ADD COLUMN IF NOT EXISTS "patientDateOfBirth"       TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "patientNotes"             TEXT,
        ADD COLUMN IF NOT EXISTS "patientConsentAcceptedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "bookingForOther"          BOOLEAN NOT NULL DEFAULT FALSE;
    `,
  },
  {
    name: "OrderItem.patientFields",
    sql: `
      ALTER TABLE "OrderItem"
        ADD COLUMN IF NOT EXISTS "patientFullName"          TEXT,
        ADD COLUMN IF NOT EXISTS "patientEmail"             TEXT,
        ADD COLUMN IF NOT EXISTS "patientPhone"             TEXT,
        ADD COLUMN IF NOT EXISTS "patientDateOfBirth"       TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "patientNotes"             TEXT,
        ADD COLUMN IF NOT EXISTS "patientConsentAcceptedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "bookingForOther"          BOOLEAN NOT NULL DEFAULT FALSE;
    `,
  },
  {
    name: "ServiceDoctor table + indexes",
    sql: `
      CREATE TABLE IF NOT EXISTS "ServiceDoctor" (
        "id"         TEXT NOT NULL PRIMARY KEY,
        "serviceId"  TEXT NOT NULL,
        "doctorId"   TEXT NOT NULL,
        "isActive"   BOOLEAN NOT NULL DEFAULT true,
        "sortOrder"  INTEGER NOT NULL DEFAULT 0,
        "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ServiceDoctor_service_fk"
          FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE,
        CONSTRAINT "ServiceDoctor_doctor_fk"
          FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "ServiceDoctor_serviceId_doctorId_key"
        ON "ServiceDoctor"("serviceId", "doctorId");
      CREATE INDEX IF NOT EXISTS "ServiceDoctor_doctorId_isActive_idx"
        ON "ServiceDoctor"("doctorId", "isActive");
      CREATE INDEX IF NOT EXISTS "ServiceDoctor_serviceId_isActive_sortOrder_idx"
        ON "ServiceDoctor"("serviceId", "isActive", "sortOrder");
    `,
  },
  {
    name: "Order.meetingUrl",
    sql: `
      ALTER TABLE "Order"
        ADD COLUMN IF NOT EXISTS "meetingUrl" TEXT;
    `,
  },
  {
    name: "AuditAction.MEET_LINK_GENERATED",
    sql: `
      DO $$ BEGIN
        ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEET_LINK_GENERATED';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `,
  },
  {
    name: "performance-indexes-2026-06",
    sql: `
      -- Appointment is the hottest table; every query path filters on one
      -- of these columns. Without indexes they are sequential scans that
      -- get slower with every booking.
      CREATE INDEX IF NOT EXISTS "Appointment_userId_idx"
        ON "Appointment"("userId");
      CREATE INDEX IF NOT EXISTS "Appointment_email_idx"
        ON "Appointment"("email");
      CREATE INDEX IF NOT EXISTS "Appointment_doctorId_idx"
        ON "Appointment"("doctorId");
      CREATE INDEX IF NOT EXISTS "Appointment_status_createdAt_idx"
        ON "Appointment"("status", "createdAt");
      -- Order.appointmentIds is an array filtered with array-overlap in the
      -- consultation-history load — needs a GIN index to avoid a seq scan.
      CREATE INDEX IF NOT EXISTS "Order_appointmentIds_gin_idx"
        ON "Order" USING GIN ("appointmentIds");
      -- Bulk token expiry on account delete / admin reset scans by userId.
      CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx"
        ON "PasswordResetToken"("userId");
      -- Public blog + FAQ listings filter by country/locale/status.
      CREATE INDEX IF NOT EXISTS "BlogPost_countryId_status_locale_idx"
        ON "BlogPost"("countryId", "status", "locale");
      CREATE INDEX IF NOT EXISTS "Faq_countryId_locale_isActive_idx"
        ON "Faq"("countryId", "locale", "isActive");
      -- Junction tables: index the non-leading FK so reverse lookups
      -- (doctors-for-specialty, countries-for-doctor) don't seq scan.
      CREATE INDEX IF NOT EXISTS "DoctorSpecialty_specialtyId_idx"
        ON "DoctorSpecialty"("specialtyId");
      CREATE INDEX IF NOT EXISTS "DoctorCountry_doctorId_idx"
        ON "DoctorCountry"("doctorId");
    `,
  },
  {
    name: "AuditAction.userAndProfileEvents",
    sql: `
      DO $$ BEGIN
        ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_UPDATED';
        ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_ROLE_CHANGED';
        ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_PASSWORD_RESET';
        ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PATIENT_PROFILE_UPDATED';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `,
  },
  {
    name: "MedicalNote.createdByDoctorId.fk",
    sql: `
      DO $$ BEGIN
        ALTER TABLE "MedicalNote"
          ADD CONSTRAINT "MedicalNote_createdByDoctorId_fkey"
          FOREIGN KEY ("createdByDoctorId") REFERENCES "Doctor"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `,
  },
  {
    name: "MedicalNote.table",
    sql: `
      CREATE TABLE IF NOT EXISTS "MedicalNote" (
        "id" TEXT NOT NULL,
        "appointmentId" TEXT NOT NULL,
        "patientEmail" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "consultationType" TEXT,
        "createdByDoctorId" TEXT NOT NULL,
        "createdByName" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MedicalNote_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "MedicalNote_patientEmail_createdAt_idx"
        ON "MedicalNote"("patientEmail", "createdAt");
      CREATE INDEX IF NOT EXISTS "MedicalNote_appointmentId_idx"
        ON "MedicalNote"("appointmentId");
      DO $$ BEGIN
        ALTER TABLE "MedicalNote"
          ADD CONSTRAINT "MedicalNote_appointmentId_fkey"
          FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `,
  },
];

export async function ensureSchema(log: {
  info: (msg: string) => void;
  error: (msg: string) => void;
}): Promise<void> {
  if (!process.env.DATABASE_URL) {
    log.info("[ensure-schema] DATABASE_URL not set — skipping idempotent patches");
    return;
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  try {
    // Tracking table — records which patches have already run on this
    // database, so subsequent boots skip the (still idempotent but
    // wasteful) DDL roundtrip. Each patch runs at most once; the
    // existing `IF NOT EXISTS` clauses inside the SQL stay as belt-
    // and-braces in case the tracking row is missing or wiped.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "_EnsureSchemaPatches" (
        "name"      TEXT PRIMARY KEY,
        "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const applied = new Set<string>();
    try {
      const res = await pool.query<{ name: string }>(
        `SELECT "name" FROM "_EnsureSchemaPatches"`,
      );
      for (const row of res.rows) applied.add(row.name);
    } catch (err) {
      log.error(
        `[ensure-schema] could not read patch ledger — running all patches anyway — ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    let ran = 0;
    let skipped = 0;
    for (const patch of PATCHES) {
      if (applied.has(patch.name)) {
        skipped += 1;
        continue;
      }
      try {
        await pool.query(patch.sql);
        await pool.query(
          `INSERT INTO "_EnsureSchemaPatches" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING`,
          [patch.name],
        );
        log.info(`[ensure-schema] applied: ${patch.name}`);
        ran += 1;
      } catch (error) {
        // Log the failure but don't crash the server — the offending
        // query path can fail loudly later, and at least the rest of
        // the app comes up. We deliberately DON'T record the patch as
        // applied so the next boot retries.
        log.error(
          `[ensure-schema] failed: ${patch.name} — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    log.info(`[ensure-schema] done — applied=${ran} skipped=${skipped}`);
  } finally {
    await pool.end();
  }
}
