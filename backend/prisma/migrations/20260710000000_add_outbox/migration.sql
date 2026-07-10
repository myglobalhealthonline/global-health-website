-- Durable outbox for post-payment side effects (P-006/P-007). Rows are written
-- inside the same transaction that flips an order to PAID; the internal
-- scheduler drains them, decoupling provider latency from the webhook path.
-- Authored, NOT applied here — apply via `prisma migrate deploy` at rollout.
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Outbox_idempotencyKey_key" ON "Outbox"("idempotencyKey");

CREATE INDEX "Outbox_status_createdAt_idx" ON "Outbox"("status", "createdAt");
