-- Doctor ↔ support (admin team) chat — one standing thread per doctor.
--
-- Hand-written and fully idempotent on purpose. This project applies migrations
-- with `prisma migrate deploy` against a live Railway database that carries
-- pre-existing drift; `migrate dev` is never run, so every statement here must
-- be safe to re-apply and must not depend on a shadow database.
--
-- Read state is asymmetric by design: the doctor is a single reader (boolean on
-- the message row) while the admin team is N readers (a per-admin lastReadAt
-- cursor in SupportThreadRead).

-- ─── Enums ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportMessageAuthorRole') THEN
    CREATE TYPE "SupportMessageAuthorRole" AS ENUM ('DOCTOR', 'ADMIN');
  END IF;
END
$$;

-- New enum values. `ADD VALUE IF NOT EXISTS` is safe inside the transaction
-- migrate deploy wraps around this file because none of the new values is
-- *used* here — only declared.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUPPORT_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUPPORT_REPLY';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUPPORT_MESSAGE_POSTED';

-- ─── SupportThread ───────────────────────────────────────────────────────────
-- `updatedAt` carries a DEFAULT that Prisma's own generator would omit, so the
-- table stays insertable from raw SQL.
CREATE TABLE IF NOT EXISTS "SupportThread" (
  "id"               TEXT NOT NULL,
  "doctorId"         TEXT NOT NULL,
  "lastMessageAt"    TIMESTAMP(3),
  "lastMessageRole"  "SupportMessageAuthorRole",
  "lastAdminEmailAt" TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportThread_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SupportThread_doctorId_key"
  ON "SupportThread"("doctorId");
CREATE INDEX IF NOT EXISTS "SupportThread_lastMessageAt_idx"
  ON "SupportThread"("lastMessageAt");

-- ─── SupportMessage ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id"           TEXT NOT NULL,
  "threadId"     TEXT NOT NULL,
  "authorRole"   "SupportMessageAuthorRole" NOT NULL,
  "authorUserId" TEXT,
  "body"         TEXT,
  "storageKey"   TEXT,
  "fileName"     TEXT,
  "mimeType"     TEXT,
  "byteSize"     INTEGER,
  "readByDoctor" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupportMessage_threadId_createdAt_idx"
  ON "SupportMessage"("threadId", "createdAt");
-- Serves the doctor unread-badge count (authorRole = ADMIN AND NOT readByDoctor).
CREATE INDEX IF NOT EXISTS "SupportMessage_threadId_authorRole_readByDoctor_idx"
  ON "SupportMessage"("threadId", "authorRole", "readByDoctor");

-- ─── SupportThreadRead ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SupportThreadRead" (
  "id"          TEXT NOT NULL,
  "threadId"    TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "lastReadAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportThreadRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SupportThreadRead_threadId_adminUserId_key"
  ON "SupportThreadRead"("threadId", "adminUserId");
CREATE INDEX IF NOT EXISTS "SupportThreadRead_adminUserId_idx"
  ON "SupportThreadRead"("adminUserId");

-- ─── Foreign keys ────────────────────────────────────────────────────────────
-- Guarded individually: ALTER TABLE ... ADD CONSTRAINT has no IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupportThread_doctorId_fkey') THEN
    ALTER TABLE "SupportThread" ADD CONSTRAINT "SupportThread_doctorId_fkey"
      FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupportMessage_threadId_fkey') THEN
    ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_threadId_fkey"
      FOREIGN KEY ("threadId") REFERENCES "SupportThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- SET NULL, not CASCADE: deleting an admin account must not erase the
  -- messages they wrote. The bubble falls back to the generic support label.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupportMessage_authorUserId_fkey') THEN
    ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorUserId_fkey"
      FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupportThreadRead_threadId_fkey') THEN
    ALTER TABLE "SupportThreadRead" ADD CONSTRAINT "SupportThreadRead_threadId_fkey"
      FOREIGN KEY ("threadId") REFERENCES "SupportThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupportThreadRead_adminUserId_fkey') THEN
    ALTER TABLE "SupportThreadRead" ADD CONSTRAINT "SupportThreadRead_adminUserId_fkey"
      FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
