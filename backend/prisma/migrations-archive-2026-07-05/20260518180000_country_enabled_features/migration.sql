-- AlterTable: per-country sidebar feature toggles.
-- Each entry is a slug from the admin country-scoped nav. Default
-- includes every feature so existing rows stay backward-compatible.
-- IF NOT EXISTS keeps this safe if a prior `prisma db push` already
-- created the column on this database.
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
