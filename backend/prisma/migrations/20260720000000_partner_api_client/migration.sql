-- Partner booking API credentials (one row per external integrator).
-- Idempotent: this DB carries drift, so the migration must be safe to
-- re-apply via `prisma migrate deploy` against a database where the table
-- may already exist.

CREATE TABLE IF NOT EXISTS "PartnerApiClient" (
  "id"                  TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "keyPrefix"           TEXT NOT NULL,
  "keyHash"             TEXT NOT NULL,
  "allowedCountryCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive"            BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt"          TIMESTAMP(3),
  "revokedAt"           TIMESTAMP(3),
  "createdByUserId"     TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PartnerApiClient_pkey" PRIMARY KEY ("id")
);

-- The auth lookup index. UNIQUE so a duplicate key hash can never resolve to
-- two clients.
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerApiClient_keyHash_key"
  ON "PartnerApiClient" ("keyHash");

CREATE INDEX IF NOT EXISTS "PartnerApiClient_isActive_idx"
  ON "PartnerApiClient" ("isActive");

-- Audit actions for credential lifecycle. `ADD VALUE IF NOT EXISTS` is
-- idempotent; it is legal inside the migration's transaction because the new
-- labels are not referenced by any statement in this same migration.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PARTNER_API_CLIENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PARTNER_API_CLIENT_REVOKED';
